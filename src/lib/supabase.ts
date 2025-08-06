import { createClient } from '@supabase/supabase-js'
import type { 
  ContentSet, 
  Passage, 
  VocabularyTerm, 
  VocabularyQuestion, 
  ParagraphQuestionDB,
  ComprehensiveQuestionDB, 
  AIGenerationLog, 
  SystemPrompt,
  SystemPromptLegacy,
  CurriculumData 
} from '../types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 프롬프트 초기화 함수
export async function initializeSystemPrompts(forceReset: boolean = false) {
  try {
    console.log('🚀 프롬프트 초기화 시작...')
    
    // 기존 프롬프트 데이터 가져오기
    const { DEFAULT_PROMPTS_V2 } = await import('./promptsV2')
    const defaultPrompts = DEFAULT_PROMPTS_V2
    
    console.log(`📚 ${defaultPrompts.length}개의 기본 프롬프트를 발견했습니다.`)
    
    // 기존 데이터가 있는지 확인
    const { data: existingPrompts, error: checkError } = await supabase
      .from('system_prompts_v3')
      .select('prompt_id')
      .limit(1)
    
    if (checkError) {
      console.error('기존 프롬프트 확인 실패:', checkError)
      throw checkError
    }
    
    if (existingPrompts && existingPrompts.length > 0 && !forceReset) {
      return {
        success: false,
        message: '이미 프롬프트 데이터가 존재합니다. 초기화를 건너뜁니다.',
        count: 0
      }
    }
    
    // 강제 리셋 모드인 경우 기존 데이터 삭제
    if (forceReset && existingPrompts && existingPrompts.length > 0) {
      console.log('🗑️ 기존 프롬프트 데이터를 삭제합니다...')
      const { error: deleteError } = await supabase
        .from('system_prompts_v3')
        .delete()
        .neq('prompt_id', 'dummy') // 모든 데이터 삭제
        
      if (deleteError) {
        console.error('기존 데이터 삭제 실패:', deleteError)
        throw deleteError
      }
      console.log('✅ 기존 데이터가 삭제되었습니다.')
    }
    
    // DB에 삽입할 데이터 형식으로 변환
    const promptsToInsert = defaultPrompts.map(prompt => ({
      prompt_id: prompt.promptId,
      category: prompt.category,
      sub_category: prompt.subCategory,
      name: prompt.name,
      key: prompt.key,
      prompt_text: prompt.promptText,
      description: prompt.description || '',
      is_active: true,
      is_default: true,
      version: 1,
      created_by: 'system',
      updated_by: 'system'
    }))
    
    // 디버깅: promptId 확인
    console.log('🔍 생성된 promptId들:')
    promptsToInsert.slice(0, 10).forEach(p => {
      console.log(`  - ${p.prompt_id} (${p.name})`)
    })
    
    // 중복 확인
    const duplicateIds = promptsToInsert.map(p => p.prompt_id).filter((id, index, arr) => arr.indexOf(id) !== index)
    if (duplicateIds.length > 0) {
      console.error('🚨 중복된 promptId 발견:', duplicateIds)
      throw new Error(`중복된 promptId가 있습니다: ${duplicateIds.join(', ')}`)
    }
    
    console.log('💾 프롬프트 데이터를 Supabase에 삽입 중...')
    
    // 배치로 삽입 (너무 많으면 나누어서 처리)
    const batchSize = 50
    let insertedCount = 0
    
    for (let i = 0; i < promptsToInsert.length; i += batchSize) {
      const batch = promptsToInsert.slice(i, i + batchSize)
      
      const { error: insertError } = await supabase
        .from('system_prompts_v3')
        .insert(batch)
      
      if (insertError) {
        console.error(`배치 ${Math.floor(i / batchSize) + 1} 삽입 실패:`, insertError)
        throw insertError
      }
      
      insertedCount += batch.length
      console.log(`✅ 배치 ${Math.floor(i / batchSize) + 1} 완료 (${insertedCount}/${promptsToInsert.length})`)
    }
    
    console.log(`🎉 프롬프트 초기화 완료! ${insertedCount}개의 프롬프트가 생성되었습니다.`)
    
    return {
      success: true,
      message: `프롬프트 초기화가 완료되었습니다. ${insertedCount}개의 프롬프트가 생성되었습니다.`,
      count: insertedCount
    }
  } catch (error) {
    console.error('프롬프트 초기화 실패:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      fullError: error
    })
    return {
      success: false,
      message: `프롬프트 초기화 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
      count: 0
    }
  }
}

// Database helper functions
export const db = {
  // Content Sets
  async createContentSet(data: Omit<ContentSet, 'id' | 'created_at' | 'updated_at'>) {
    const { data: result, error } = await supabase
      .from('content_sets')
      .insert(data)
      .select()
      .single()
    
    if (error) throw error
    return result as ContentSet
  },

  async getContentSets(filters: { grade?: string; subject?: string; area?: string } = {}) {
    let query = supabase.from('content_sets').select(`
      id,
      user_id,
      division,
      grade,
      subject,
      area,
      main_topic,
      sub_topic,
      keywords,
      title,
      total_passages,
      total_vocabulary_terms,
      total_vocabulary_questions,
      total_paragraph_questions,
      total_comprehensive_questions,
      status,
      created_at,
      updated_at
    `)
    
    if (filters.grade) query = query.eq('grade', filters.grade)
    if (filters.subject) query = query.eq('subject', filters.subject)
    if (filters.area) query = query.eq('area', filters.area)
    
    query = query.order('created_at', { ascending: false })
    
    const { data, error } = await query
    if (error) throw error
    return data as ContentSet[]
  },

  async getContentSetById(id: string) {
    const { data, error } = await supabase
      .from('content_sets')
      .select(`
        *,
        passages(*),
        vocabulary_terms(*),
        vocabulary_questions(*),
        paragraph_questions(*),
        comprehensive_questions(*)
      `)
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  },

  async updateContentSet(id: string, data: Partial<ContentSet>) {
    const { data: result, error } = await supabase
      .from('content_sets')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return result as ContentSet
  },

  async deleteContentSet(id: string) {
    const { error } = await supabase
      .from('content_sets')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // Passages
  async createPassage(data: Omit<Passage, 'id' | 'created_at'>) {
    const { data: result, error } = await supabase
      .from('passages')
      .insert(data)
      .select()
      .single()
    
    if (error) throw error
    return result as Passage
  },

  async getPassagesByContentSetId(contentSetId: string) {
    const { data, error } = await supabase
      .from('passages')
      .select('*')
      .eq('content_set_id', contentSetId)
      .order('passage_number')
    
    if (error) throw error
    return data as Passage[]
  },

  async updatePassage(id: string, data: Partial<Passage>) {
    const { data: result, error } = await supabase
      .from('passages')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return result as Passage
  },

  async deletePassage(id: string) {
    const { error } = await supabase
      .from('passages')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // Vocabulary Terms
  async createVocabularyTerms(terms: Omit<VocabularyTerm, 'id' | 'created_at'>[]) {
    const { data, error } = await supabase
      .from('vocabulary_terms')
      .insert(terms)
      .select()
    
    if (error) throw error
    return data as VocabularyTerm[]
  },

  async getVocabularyTermsByContentSetId(contentSetId: string) {
    const { data, error } = await supabase
      .from('vocabulary_terms')
      .select('*')
      .eq('content_set_id', contentSetId)
      .order('created_at')
    
    if (error) throw error
    return data as VocabularyTerm[]
  },

  async deleteVocabularyTermsByContentSetId(contentSetId: string) {
    const { error } = await supabase
      .from('vocabulary_terms')
      .delete()
      .eq('content_set_id', contentSetId)
    
    if (error) throw error
  },

  // Vocabulary Questions
  async createVocabularyQuestions(questions: Omit<VocabularyQuestion, 'id' | 'created_at'>[]) {
    const { data, error } = await supabase
      .from('vocabulary_questions')
      .insert(questions)
      .select()
    
    if (error) throw error
    return data as VocabularyQuestion[]
  },

  async getVocabularyQuestionsByContentSetId(contentSetId: string) {
    const { data, error } = await supabase
      .from('vocabulary_questions')
      .select('*')
      .eq('content_set_id', contentSetId)
      .order('question_number')
    
    if (error) throw error
    return data as VocabularyQuestion[]
  },

  async updateVocabularyQuestion(id: string, data: Partial<VocabularyQuestion>) {
    const { data: result, error } = await supabase
      .from('vocabulary_questions')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return result as VocabularyQuestion
  },

  async deleteVocabularyQuestion(id: string) {
    const { error } = await supabase
      .from('vocabulary_questions')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // Paragraph Questions
  async createParagraphQuestions(questions: Omit<ParagraphQuestionDB, 'id' | 'created_at'>[]) {
    const { data, error } = await supabase
      .from('paragraph_questions')
      .insert(questions)
      .select()
    
    if (error) throw error
    return data as ParagraphQuestionDB[]
  },

  async getParagraphQuestionsByContentSetId(contentSetId: string) {
    const { data, error } = await supabase
      .from('paragraph_questions')
      .select('*')
      .eq('content_set_id', contentSetId)
      .order('question_number')
    
    if (error) throw error
    return data as ParagraphQuestionDB[]
  },

  async updateParagraphQuestion(id: string, data: Partial<ParagraphQuestionDB>) {
    const { data: result, error } = await supabase
      .from('paragraph_questions')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return result as ParagraphQuestionDB
  },

  async deleteParagraphQuestion(id: string) {
    const { error } = await supabase
      .from('paragraph_questions')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // Comprehensive Questions
  async createComprehensiveQuestions(questions: Omit<ComprehensiveQuestionDB, 'id' | 'created_at'>[]) {
    const { data, error } = await supabase
      .from('comprehensive_questions')
      .insert(questions)
      .select()
    
    if (error) throw error
    return data as ComprehensiveQuestionDB[]
  },

  async getComprehensiveQuestionsByContentSetId(contentSetId: string) {
    const { data, error } = await supabase
      .from('comprehensive_questions')
      .select('*')
      .eq('content_set_id', contentSetId)
      .order('question_number')
    
    if (error) throw error
    return data as ComprehensiveQuestionDB[]
  },

  async updateComprehensiveQuestion(id: string, data: Partial<ComprehensiveQuestionDB>) {
    const { data: result, error } = await supabase
      .from('comprehensive_questions')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return result as ComprehensiveQuestionDB
  },

  async deleteComprehensiveQuestion(id: string) {
    const { error } = await supabase
      .from('comprehensive_questions')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // Paragraph Questions
  async createParagraphQuestion(data: any) {
    const { data: result, error } = await supabase
      .from('paragraph_questions')
      .insert(data)
      .select()
      .single()
    
    if (error) throw error
    return result
  },

  async getParagraphQuestionsByContentSetId(contentSetId: string) {
    const { data, error } = await supabase
      .from('paragraph_questions')
      .select('*')
      .eq('content_set_id', contentSetId)
      .order('question_number', { ascending: true })
    
    if (error) throw error
    return data || []
  },

  async updateParagraphQuestion(id: string, data: any) {
    const { data: result, error } = await supabase
      .from('paragraph_questions')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return result
  },

  async deleteParagraphQuestion(id: string) {
    const { error } = await supabase
      .from('paragraph_questions')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // AI Generation Logs
  async createAIGenerationLog(data: Omit<AIGenerationLog, 'id' | 'created_at'>) {
    const { data: result, error } = await supabase
      .from('ai_generation_logs')
      .insert(data)
      .select()
      .single()
    
    if (error) throw error
    return result as AIGenerationLog
  },

  async getAIGenerationLogs(contentSetId?: string) {
    let query = supabase
      .from('ai_generation_logs')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (contentSetId) {
      query = query.eq('content_set_id', contentSetId)
    }
    
    const { data, error } = await query
    if (error) throw error
    return data as AIGenerationLog[]
  },

  // System Prompts (V2 - 새로운 구조)
  async getSystemPrompts() {
    const { data, error } = await supabase
      .from('system_prompts_v3')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('sub_category', { ascending: true })
      .order('name', { ascending: true })
    
    if (error) throw error
    
    // DB 필드명을 TypeScript 인터페이스에 맞게 변환
    return data.map(item => ({
      id: item.id,
      promptId: item.prompt_id,
      category: item.category,
      subCategory: item.sub_category,
      name: item.name,
      key: item.key,
      promptText: item.prompt_text,
      description: item.description,
      isActive: item.is_active,
      isDefault: item.is_default,
      version: item.version,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      createdBy: item.created_by,
      updatedBy: item.updated_by
    })) as SystemPrompt[]
  },

  async getPromptByKey(category: string, subCategory: string, key: string) {
    const { data, error } = await supabase
      .from('system_prompts_v3')
      .select('*')
      .eq('category', category)
      .eq('sub_category', subCategory)
      .eq('key', key)
      .eq('is_active', true)
      .single()
    
    if (error) throw error
    
    // DB 필드명을 TypeScript 인터페이스에 맞게 변환
    return {
      id: data.id,
      promptId: data.prompt_id,
      category: data.category,
      subCategory: data.sub_category,
      name: data.name,
      key: data.key,
      promptText: data.prompt_text,
      description: data.description,
      isActive: data.is_active,
      isDefault: data.is_default,
      version: data.version,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      createdBy: data.created_by,
      updatedBy: data.updated_by
    } as SystemPrompt
  },

  async updateSystemPrompt(promptId: string, promptText: string, changeReason?: string) {
    try {
      // 1. 현재 프롬프트 정보 조회
      const { data: currentPrompt, error: selectError } = await supabase
        .from('system_prompts_v3')
        .select('*')
        .eq('prompt_id', promptId)
        .single()
      
      if (selectError) throw selectError
      
      // 2. 버전 증가
      const newVersion = currentPrompt.version + 1
      
      // 3. 히스토리에 이전 버전 저장
      if (changeReason) {
        const { error: historyError } = await supabase
          .from('prompt_history')
          .insert({
            prompt_id: promptId,
            version: currentPrompt.version,
            prompt_text: currentPrompt.prompt_text,
            change_reason: changeReason,
            created_by: 'system'
          })
        
        if (historyError) {
          console.warn('프롬프트 히스토리 저장 실패:', historyError)
        }
      }
      
      // 4. 프롬프트 업데이트
      const { data, error: updateError } = await supabase
        .from('system_prompts_v3')
        .update({ 
          prompt_text: promptText,
          version: newVersion,
          updated_at: new Date().toISOString(),
          updated_by: 'system'
        })
        .eq('prompt_id', promptId)
        .select()
        .single()
      
      if (updateError) throw updateError
      
      return {
        promptId: data.prompt_id,
        newVersion: data.version,
        message: '프롬프트가 성공적으로 업데이트되었습니다.'
      }
    } catch (error) {
      console.error('프롬프트 업데이트 실패:', error)
      throw error
    }
  },

  // 레거시 시스템 프롬프트 (기존 구조)
  async getSystemPromptsLegacy() {
    const { data, error } = await supabase
      .from('system_prompts')
      .select('*')
      .eq('is_active', true)
      .order('prompt_type')
    
    if (error) throw error
    return data as SystemPromptLegacy[]
  },

  async getSystemPromptByType(promptType: string) {
    const { data, error } = await supabase
      .from('system_prompts')
      .select('*')
      .eq('prompt_type', promptType)
      .eq('is_active', true)
      .single()
    
    if (error) throw error
    return data as SystemPromptLegacy
  },

  // Helper function to save complete content set with all related data
  async saveCompleteContentSet(
    contentSetData: Omit<ContentSet, 'id' | 'created_at' | 'updated_at'>,
    passagesData: Omit<Passage, 'id' | 'content_set_id' | 'created_at'>[],
    vocabularyTerms: Omit<VocabularyTerm, 'id' | 'content_set_id' | 'created_at'>[],
    vocabularyQuestions: Omit<VocabularyQuestion, 'id' | 'content_set_id' | 'created_at'>[],
    paragraphQuestions: Omit<ParagraphQuestionDB, 'id' | 'content_set_id' | 'created_at'>[],
    comprehensiveQuestions: Omit<ComprehensiveQuestionDB, 'id' | 'content_set_id' | 'created_at'>[]
  ) {
    console.log('🏗️ saveCompleteContentSet 시작');
    console.log('📋 ContentSet 데이터:', contentSetData);
    
    try {
      const { data: contentSet, error: contentSetError } = await supabase
        .from('content_sets')
        .insert(contentSetData)
        .select()
        .single()
      
      if (contentSetError) {
        console.error('❌ ContentSet 삽입 오류:', contentSetError);
        throw contentSetError;
      }
      
      console.log('✅ ContentSet 삽입 성공:', contentSet.id);
      
      const contentSetId = contentSet.id
      
      // Add content_set_id to all related data
      const passagesWithId = passagesData.map(p => ({ ...p, content_set_id: contentSetId }))
      const vocabularyTermsWithId = vocabularyTerms.map(v => ({ ...v, content_set_id: contentSetId }))
      const vocabularyQuestionsWithId = vocabularyQuestions.map(q => ({ ...q, content_set_id: contentSetId }))
      const paragraphQuestionsWithId = paragraphQuestions.map(q => ({ ...q, content_set_id: contentSetId }))
      const comprehensiveQuestionsWithId = comprehensiveQuestions.map(q => ({ ...q, content_set_id: contentSetId }))
      
      console.log('🔗 관련 데이터에 content_set_id 추가 완료');
      
      // Insert all related data
      const results = []
      
      if (passagesWithId.length > 0) {
        console.log('📝 Passages 삽입 시작:', passagesWithId.length, '개');
        const { error: passagesError } = await supabase.from('passages').insert(passagesWithId)
        if (passagesError) {
          console.error('❌ Passages 삽입 오류:', passagesError);
          throw passagesError;
        }
        results.push('passages')
        console.log('✅ Passages 삽입 완료');
      }
      
      if (vocabularyTermsWithId.length > 0) {
        console.log('📚 VocabularyTerms 삽입 시작:', vocabularyTermsWithId.length, '개');
        const { error: termsError } = await supabase.from('vocabulary_terms').insert(vocabularyTermsWithId)
        if (termsError) {
          console.error('❌ VocabularyTerms 삽입 오류:', termsError);
          throw termsError;
        }
        results.push('vocabulary_terms')
        console.log('✅ VocabularyTerms 삽입 완료');
      }
      
      if (vocabularyQuestionsWithId.length > 0) {
        console.log('❓ VocabularyQuestions 삽입 시작:', vocabularyQuestionsWithId.length, '개');
        const { error: vocabError } = await supabase.from('vocabulary_questions').insert(vocabularyQuestionsWithId)
        if (vocabError) {
          console.error('❌ VocabularyQuestions 삽입 오류:', vocabError);
          throw vocabError;
        }
        results.push('vocabulary_questions')
        console.log('✅ VocabularyQuestions 삽입 완료');
      }
      
      if (paragraphQuestionsWithId.length > 0) {
        console.log('📄 ParagraphQuestions 삽입 시작:', paragraphQuestionsWithId.length, '개');
        console.log('📄 삽입할 데이터 샘플:', JSON.stringify(paragraphQuestionsWithId[0], null, 2));
        
        // 데이터 검증
        const validatedData = paragraphQuestionsWithId.map((q, index) => {
          // 필수 필드 검증
          if (!q.content_set_id || !q.question_text || !q.paragraph_text) {
            console.error(`❌ 문단문제 ${index + 1} 필수 필드 누락:`, q);
            throw new Error(`문단문제 ${index + 1}: 필수 필드가 누락되었습니다`);
          }
          
          // correct_answer 검증 (문제 유형에 따라 다름)
          if (q.question_type === '주관식 단답형' || q.question_type === '어절 순서 맞추기') {
            // 주관식 단답형 및 어절 순서 맞추기의 경우 실제 답안 텍스트가 들어감
            if (!q.correct_answer || q.correct_answer.trim() === '') {
              console.warn(`⚠️ 문단문제 ${index + 1} ${q.question_type} 답안이 비어있음`);
              q.correct_answer = q.question_type === '어절 순서 맞추기' ? '올바른 문장' : '답안';
            }
          } else {
            // 객관식의 경우 1-5 범위
            if (!['1', '2', '3', '4', '5'].includes(q.correct_answer)) {
              console.warn(`⚠️ 문단문제 ${index + 1} 정답 값 수정: ${q.correct_answer} -> 1`);
              q.correct_answer = '1';
            }
          }
          
          return q;
        });
        
        const { error: paragraphError } = await supabase.from('paragraph_questions').insert(validatedData)
        if (paragraphError) {
          console.error('❌ ParagraphQuestions 삽입 오류:', paragraphError);
          console.error('❌ 삽입 시도 데이터:', JSON.stringify(validatedData, null, 2));
          throw paragraphError;
        }
        results.push('paragraph_questions')
        console.log('✅ ParagraphQuestions 삽입 완료');
      }
      
      if (comprehensiveQuestionsWithId.length > 0) {
        console.log('🧠 ComprehensiveQuestions 삽입 시작:', comprehensiveQuestionsWithId.length, '개');
        const { error: compError } = await supabase.from('comprehensive_questions').insert(comprehensiveQuestionsWithId)
        if (compError) {
          console.error('❌ ComprehensiveQuestions 삽입 오류:', compError);
          throw compError;
        }
        results.push('comprehensive_questions')
        console.log('✅ ComprehensiveQuestions 삽입 완료');
      }
      
      console.log('🎉 모든 데이터 삽입 완료:', results.join(', '));
      
      return contentSet as ContentSet
    } catch (error) {
      console.error('💥 saveCompleteContentSet 전체 오류:', error);
      throw error;
    }
  },

  // Curriculum Data
  async getCurriculumData(filters: { subject?: string; grade?: string; area?: string } = {}) {
    let query = supabase
      .from('curriculum_data')
      .select('*')
      .eq('is_active', true)
    
    if (filters.subject) query = query.eq('subject', filters.subject)
    if (filters.grade) query = query.eq('grade', filters.grade)
    if (filters.area) query = query.eq('area', filters.area)
    
    query = query.order('subject').order('grade').order('area').order('main_topic').order('sub_topic')
    
    const { data, error } = await query
    if (error) throw error
    return data
  },

  async createCurriculumData(data: Omit<CurriculumData, 'id' | 'created_at'>[]) {
    const { data: result, error } = await supabase
      .from('curriculum_data')
      .insert(data)
      .select()
    
    if (error) throw error
    return result as CurriculumData[]
  },

  async updateCurriculumData(id: string, data: Partial<CurriculumData>) {
    const { data: result, error } = await supabase
      .from('curriculum_data')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return result as CurriculumData
  },

  async deleteCurriculumData(id: string) {
    const { error } = await supabase
      .from('curriculum_data')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
}