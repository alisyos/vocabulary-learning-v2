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

  async getContentSets(filters: { grade?: string; subject?: string; area?: string; status?: string; user_id?: string } = {}) {
    // 페이지네이션을 통해 모든 데이터를 가져오기
    const pageSize = 1000; // Supabase 기본 제한
    let allData: ContentSet[] = [];
    let currentPage = 0;
    let hasMoreData = true;

    while (hasMoreData) {
      let query = supabase.from('content_sets').select(`
        id,
        user_id,
        division,
        grade,
        subject,
        area,
        session_number,
        grade_number,
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
      if (filters.user_id) query = query.eq('user_id', filters.user_id)

      // status 필터 처리 - 콤마로 구분된 복수 상태 지원
      if (filters.status) {
        if (filters.status.includes(',')) {
          // 복수 상태 (예: "검수완료,승인완료")
          const statuses = filters.status.split(',').map(s => s.trim());
          query = query.in('status', statuses);
        } else {
          // 단일 상태
          query = query.eq('status', filters.status);
        }
      }

      query = query.order('created_at', { ascending: false })
        .range(currentPage * pageSize, (currentPage + 1) * pageSize - 1)

      const { data, error } = await query
      if (error) throw error

      if (data && data.length > 0) {
        allData.push(...data);

        // 마지막 페이지인지 확인
        if (data.length < pageSize) {
          hasMoreData = false;
        } else {
          currentPage++;
        }
      } else {
        hasMoreData = false;
      }
    }

    console.log(`✅ 총 ${allData.length}개의 콘텐츠 세트를 가져왔습니다.`);
    return allData as ContentSet[]
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

    // 데이터 정렬: 각 테이블을 적절한 순서로 정렬
    if (data) {
      // ✅ 지문: passage_number로 정렬 (1, 2, ...)
      if (data.passages && Array.isArray(data.passages)) {
        data.passages.sort((a: any, b: any) => (a.passage_number || 0) - (b.passage_number || 0))
      }

      // ✅ 어휘 용어: order_index로 정렬
      if (data.vocabulary_terms && Array.isArray(data.vocabulary_terms)) {
        data.vocabulary_terms.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
      }

      // ✅ 어휘 문제: question_number로 정렬
      if (data.vocabulary_questions && Array.isArray(data.vocabulary_questions)) {
        data.vocabulary_questions.sort((a: any, b: any) => (a.question_number || 0) - (b.question_number || 0))
      }

      // ✅ 문단 문제: question_number로 정렬
      if (data.paragraph_questions && Array.isArray(data.paragraph_questions)) {
        data.paragraph_questions.sort((a: any, b: any) => (a.question_number || 0) - (b.question_number || 0))
      }

      // ✅ 종합 문제: question_number로 정렬
      if (data.comprehensive_questions && Array.isArray(data.comprehensive_questions)) {
        data.comprehensive_questions.sort((a: any, b: any) => (a.question_number || 0) - (b.question_number || 0))
      }
    }

    return data
  },

  async updateContentSet(id: string, data: Partial<ContentSet>) {
    console.log('Updating content set:', { id, data });

    const { data: result, error } = await supabase
      .from('content_sets')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Supabase update error:', error);
      throw error;
    }

    console.log('Update result:', result);
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
  
  async updateVocabularyTerms(contentSetId: string, terms: Omit<VocabularyTerm, 'id' | 'created_at'>[]) {
    try {
      // 1. 기존 어휘 조회
      const { data: existingTerms, error: fetchError } = await supabase
        .from('vocabulary_terms')
        .select('*')
        .eq('content_set_id', contentSetId)
        .order('created_at')
      
      if (fetchError) throw fetchError
      
      // 2. 업데이트할 어휘와 새로 생성할 어휘 구분
      const termsToUpdate: { id: string; data: Partial<VocabularyTerm> }[] = []
      const termsToCreate: Omit<VocabularyTerm, 'id' | 'created_at'>[] = []
      const processedIds = new Set<string>()
      
      // 3. 기존 어휘 업데이트 또는 새 어휘 생성
      terms.forEach((newTerm, index) => {
        const existingTerm = existingTerms?.[index]
        
        if (existingTerm?.id) {
          // 기존 어휘 업데이트
          termsToUpdate.push({
            id: existingTerm.id,
            data: {
              term: newTerm.term,
              definition: newTerm.definition,
              example_sentence: newTerm.example_sentence,
              has_question_generated: newTerm.has_question_generated,
              passage_id: (newTerm as any).passage_id || null
            }
          })
          processedIds.add(existingTerm.id)
        } else {
          // 새 어휘 생성
          termsToCreate.push(newTerm)
        }
      })
      
      // 4. 업데이트 실행
      for (const updateItem of termsToUpdate) {
        const { error: updateError } = await supabase
          .from('vocabulary_terms')
          .update(updateItem.data)
          .eq('id', updateItem.id)
        
        if (updateError) throw updateError
      }
      
      // 5. 새 어휘 생성
      if (termsToCreate.length > 0) {
        const { error: createError } = await supabase
          .from('vocabulary_terms')
          .insert(termsToCreate)
        
        if (createError) throw createError
      }
      
      // 6. 남은 기존 어휘 삭제 (새 목록에 없는 것들)
      const termsToDelete = existingTerms?.filter(t => t.id && !processedIds.has(t.id)) || []
      for (const termToDelete of termsToDelete) {
        if (termToDelete.id) {
          const { error: deleteError } = await supabase
            .from('vocabulary_terms')
            .delete()
            .eq('id', termToDelete.id)
          
          if (deleteError) throw deleteError
        }
      }
      
      return true
    } catch (error) {
      console.error('어휘 업데이트 실패:', error)
      throw error
    }
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

  async deleteParagraphQuestionsByContentSetId(contentSetId: string) {
    const { error } = await supabase
      .from('paragraph_questions')
      .delete()
      .eq('content_set_id', contentSetId)
    
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

  async deleteComprehensiveQuestionsByContentSetId(contentSetId: string) {
    const { error } = await supabase
      .from('comprehensive_questions')
      .delete()
      .eq('content_set_id', contentSetId)
    
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
      const paragraphQuestionsWithId = (paragraphQuestions || []).map(q => ({ ...q, content_set_id: contentSetId }))
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
          // 필수 필드 검증 (빈 문자열도 허용)
          if (!q.content_set_id) {
            console.error(`❌ 문단문제 ${index + 1} content_set_id 누락:`, q);
            throw new Error(`문단문제 ${index + 1}: content_set_id가 누락되었습니다`);
          }
          
          // question_text와 paragraph_text는 빈 문자열이라도 있으면 OK
          if (q.question_text === undefined || q.question_text === null) {
            console.error(`❌ 문단문제 ${index + 1} question_text 누락:`, q);
            throw new Error(`문단문제 ${index + 1}: question_text가 누락되었습니다`);
          }
          
          if (q.paragraph_text === undefined || q.paragraph_text === null) {
            console.error(`❌ 문단문제 ${index + 1} paragraph_text 누락:`, q);
            throw new Error(`문단문제 ${index + 1}: paragraph_text가 누락되었습니다`);
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
        
        console.log('📝 새로운 유형 그대로 저장:', comprehensiveQuestionsWithId.map(q => q.question_type));
        
        const { error: compError } = await supabase.from('comprehensive_questions').insert(comprehensiveQuestionsWithId)
        if (compError) {
          console.error('❌ ComprehensiveQuestions 삽입 오류:', compError);
          console.error('❌ 삽입 시도 데이터:', JSON.stringify(comprehensiveQuestionsWithId, null, 2));
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

  // Helper function to save complete content set with passage_id mapping for vocabulary terms
  async saveCompleteContentSetWithPassageMapping(
    contentSetData: Omit<ContentSet, 'id' | 'created_at' | 'updated_at'>,
    passagesData: Omit<Passage, 'id' | 'content_set_id' | 'created_at'>[],
    vocabularyTermsTemp: Array<Omit<VocabularyTerm, 'id' | 'content_set_id' | 'created_at' | 'passage_id'> & { passageIndex: number }>,
    vocabularyQuestions: Omit<VocabularyQuestion, 'id' | 'content_set_id' | 'created_at'>[],
    paragraphQuestions: Omit<ParagraphQuestionDB, 'id' | 'content_set_id' | 'created_at'>[],
    comprehensiveQuestions: Omit<ComprehensiveQuestionDB, 'id' | 'content_set_id' | 'created_at'>[]
  ) {
    console.log('🏗️ saveCompleteContentSetWithPassageMapping 시작 (passage_id 매핑 포함)');
    console.log('📋 ContentSet 데이터:', contentSetData);
    
    try {
      // 1. ContentSet 저장
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
      
      // 2. Passages 저장 및 ID 매핑
      const passagesWithId = passagesData.map(p => ({ ...p, content_set_id: contentSetId }))
      
      console.log('📝 Passages 삽입 중...', passagesWithId.length, '개');
      
      const { data: insertedPassages, error: passagesError } = await supabase
        .from('passages')
        .insert(passagesWithId)
        .select()
      
      if (passagesError) {
        console.error('❌ Passages 삽입 오류:', passagesError);
        throw passagesError;
      }
      
      console.log('✅ Passages 삽입 성공:', insertedPassages?.length || 0, '개');
      
      // 3. passage_number로 passage ID 매핑 생성
      const passageIndexToIdMap: { [key: number]: string } = {};
      insertedPassages?.forEach((passage) => {
        // passage_number - 1이 passageIndex와 매칭됨
        const idx = passage.passage_number - 1;
        passageIndexToIdMap[idx] = passage.id;
        console.log(`📖 매핑 생성: passageIndex ${idx} → passage_id ${passage.id} (passage_number: ${passage.passage_number})`);
      });

      console.log('📖 Passage Index to ID 매핑 완료:', passageIndexToIdMap);

      // 4. Vocabulary Terms를 passage_id와 함께 저장
      const vocabularyTermsWithId = vocabularyTermsTemp.map((v, index) => {
        const { passageIndex, ...termData } = v;
        const passageId = passageIndexToIdMap[passageIndex] || null;

        if (!passageId) {
          console.warn(`⚠️ [어휘 ${index + 1}] "${termData.term}"의 passage_id를 찾을 수 없음 (passageIndex: ${passageIndex})`);
        } else {
          console.log(`✅ [어휘 ${index + 1}] "${termData.term}" → passageIndex: ${passageIndex}, passage_id: ${passageId}`);
        }

        return {
          ...termData,
          content_set_id: contentSetId,
          passage_id: passageId // passage_id 추가
        };
      });
      
      console.log('📚 Vocabulary Terms 삽입 중 (passage_id 포함)...', vocabularyTermsWithId.length, '개');
      
      if (vocabularyTermsWithId.length > 0) {
        const { data: termsData, error: termsError } = await supabase
          .from('vocabulary_terms')
          .insert(vocabularyTermsWithId)
          .select()
        
        if (termsError) {
          console.error('❌ Vocabulary Terms 삽입 오류:', termsError);
          throw termsError;
        }
        
        console.log('✅ Vocabulary Terms 삽입 성공:', termsData?.length || 0, '개');
        
        // passage_id 매핑 결과 로그
        const passageIdCounts: { [key: string]: number } = {};
        termsData?.forEach((term: any) => {
          if (term.passage_id) {
            passageIdCounts[term.passage_id] = (passageIdCounts[term.passage_id] || 0) + 1;
          }
        });
        console.log('📊 Passage별 어휘 분포:', passageIdCounts);
      }
      
      // 5. 나머지 데이터 저장 (기존 로직과 동일)
      const vocabularyQuestionsWithId = vocabularyQuestions.map(q => ({ ...q, content_set_id: contentSetId }))
      const paragraphQuestionsWithId = (paragraphQuestions || []).map(q => ({ ...q, content_set_id: contentSetId }))
      const comprehensiveQuestionsWithId = comprehensiveQuestions.map(q => ({ ...q, content_set_id: contentSetId }))
      
      const results = []
      
      // Vocabulary Questions
      if (vocabularyQuestionsWithId.length > 0) {
        console.log('❓ Vocabulary Questions 삽입 중...', vocabularyQuestionsWithId.length, '개');
        const { error: vocabQError } = await supabase
          .from('vocabulary_questions')
          .insert(vocabularyQuestionsWithId)
        
        if (vocabQError) {
          console.error('❌ Vocabulary Questions 삽입 오류:', vocabQError);
          throw vocabQError;
        }
        results.push(`어휘문제 ${vocabularyQuestionsWithId.length}개`)
      }
      
      // Paragraph Questions
      if (paragraphQuestionsWithId.length > 0) {
        console.log('📄 Paragraph Questions 삽입 중...', paragraphQuestionsWithId.length, '개');
        const { error: paraQError } = await supabase
          .from('paragraph_questions')
          .insert(paragraphQuestionsWithId)
        
        if (paraQError) {
          console.error('❌ Paragraph Questions 삽입 오류:', paraQError);
          throw paraQError;
        }
        results.push(`문단문제 ${paragraphQuestionsWithId.length}개`)
      }
      
      // Comprehensive Questions
      if (comprehensiveQuestionsWithId.length > 0) {
        console.log('🧠 Comprehensive Questions 삽입 중...', comprehensiveQuestionsWithId.length, '개');
        const { error: compQError } = await supabase
          .from('comprehensive_questions')
          .insert(comprehensiveQuestionsWithId)
        
        if (compQError) {
          console.error('❌ Comprehensive Questions 삽입 오류:', compQError);
          throw compQError;
        }
        results.push(`종합문제 ${comprehensiveQuestionsWithId.length}개`)
      }
      
      console.log('🎉 모든 데이터 삽입 완료:', results.join(', '));
      
      return contentSet as ContentSet
    } catch (error) {
      console.error('💥 saveCompleteContentSetWithPassageMapping 전체 오류:', error);
      throw error;
    }
  },

  // Curriculum Data
  async getCurriculumData(filters: { subject?: string; grade?: string; area?: string } = {}) {
    let query = supabase
      .from('curriculum_data')
      .select(`
        *,
        keywords_for_passages,
        keywords_for_questions
      `)
      .eq('is_active', true)
    
    if (filters.subject) query = query.eq('subject', filters.subject)
    if (filters.grade) query = query.eq('grade', filters.grade)
    if (filters.area) query = query.eq('area', filters.area)
    
    query = query.order('subject').order('grade').order('area').order('main_topic').order('sub_topic')
    
    const { data, error } = await query
    if (error) {
      console.error('getCurriculumData error:', error);
      // 컬럼이 존재하지 않는 경우 기본 쿼리로 재시도
      if (error.message?.includes('keywords_for_passages') || error.message?.includes('keywords_for_questions') || error.message?.includes('grade_number')) {
        console.log('새 컬럼이 존재하지 않습니다. 기본 쿼리로 재시도합니다.');
        let fallbackQuery = supabase
          .from('curriculum_data')
          .select('*')
          .eq('is_active', true)

        if (filters.subject) fallbackQuery = fallbackQuery.eq('subject', filters.subject)
        if (filters.grade) fallbackQuery = fallbackQuery.eq('grade', filters.grade)
        if (filters.area) fallbackQuery = fallbackQuery.eq('area', filters.area)

        fallbackQuery = fallbackQuery.order('subject').order('grade').order('area').order('main_topic').order('sub_topic')

        const { data: fallbackData, error: fallbackError } = await fallbackQuery
        if (fallbackError) throw fallbackError

        // 기본값으로 빈 문자열 추가
        return (fallbackData || []).map(item => ({
          ...item,
          keywords_for_passages: item.keywords_for_passages || '',
          keywords_for_questions: item.keywords_for_questions || '',
          grade_number: item.grade_number || ''
        }))
      }
      throw error
    }
    return data || []
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

// 종합문제 유형 라벨링 함수
export function getComprehensiveQuestionTypeLabel(questionType: string): string {
  // 새로운 4가지 유형 매핑
  const newTypeMap: { [key: string]: string } = {
    '정보 확인': '정보 확인',
    '주제 파악': '주제 파악', 
    '자료해석': '자료해석',
    '추론': '추론'
  };

  // 이전 유형들을 새로운 유형으로 매핑
  const legacyTypeMap: { [key: string]: string } = {
    '단답형': '정보 확인',
    'type_short': '정보 확인',
    '핵심 내용 요약': '주제 파악',
    'type_summary': '주제 파악',
    '핵심문장 찾기': '주제 파악', 
    'type_keyword': '주제 파악',
    'OX문제': '자료해석',
    'type_ox': '자료해석',
    '자료분석하기': '자료해석',
    'type_data': '자료해석'
  };

  // 새로운 유형이면 그대로 반환
  if (newTypeMap[questionType]) {
    return newTypeMap[questionType];
  }

  // 이전 유형이면 새로운 유형으로 매핑
  if (legacyTypeMap[questionType]) {
    return legacyTypeMap[questionType];
  }

  // 매핑되지 않는 경우 원본 반환
  return questionType;
}

// 어휘 문제 유형 라벨링 함수
export function getVocabularyQuestionTypeLabel(questionType: string, detailedQuestionType?: string): string {
  // 상세 유형이 있으면 우선 사용
  if (detailedQuestionType) {
    const detailedTypeMap: { [key: string]: string } = {
      '5지선다 객관식': '5지선다',
      '낱말 골라 쓰기': '4지선다',
      '3개중 선택형': '3지선다',
      '2개중 선택형': '2지선다',
      '단답형 초성 문제': '단답형(초성)',
      '응용형 문장완성': '단답형(설명)'
    };
    
    if (detailedTypeMap[detailedQuestionType]) {
      return detailedTypeMap[detailedQuestionType];
    }
  }

  // 기본 유형 매핑
  const typeMap: { [key: string]: string } = {
    '객관식': '객관식',
    '주관식': '주관식',
    '5지선다 객관식': '5지선다',
    '낱말 골라 쓰기': '4지선다',
    '3개중 선택형': '3지선다',
    '2개중 선택형': '2지선다',
    '단답형 초성 문제': '단답형(초성)',
    '응용형 문장완성': '단답형(설명)'
  };

  return typeMap[questionType] || questionType;
}

// ============================================================================
// 이미지 데이터 관리 함수들
// ============================================================================

/**
 * 이미지 데이터 목록 조회
 */
export async function getImageDataList(filters?: {
  session_number?: string;
  is_visible?: boolean;
}): Promise<import('../types').ImageData[]> {
  try {
    let query = supabase
      .from('image_data')
      .select('*')
      .order('created_at', { ascending: false});

    // 필터 적용
    if (filters?.session_number) {
      query = query.eq('session_number', filters.session_number);
    }

    if (filters?.is_visible !== undefined) {
      query = query.eq('is_visible', filters.is_visible);
    }

    const { data, error } = await query;

    if (error) {
      console.error('이미지 데이터 조회 오류:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('getImageDataList 오류:', error);
    throw error;
  }
}

/**
 * 이미지 데이터 상세 조회
 */
export async function getImageDataById(id: string): Promise<import('../types').ImageData | null> {
  try {
    const { data, error } = await supabase
      .from('image_data')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('이미지 데이터 조회 오류:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('getImageDataById 오류:', error);
    throw error;
  }
}

/**
 * 이미지 메타데이터 생성 (파일 업로드 후 DB에 메타데이터 저장)
 */
export async function createImageData(
  imageData: Omit<import('../types').ImageData, 'id' | 'created_at' | 'updated_at'>
): Promise<import('../types').ImageData> {
  try {
    const { data, error } = await supabase
      .from('image_data')
      .insert([imageData])
      .select()
      .single();

    if (error) {
      console.error('이미지 데이터 생성 오류:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('createImageData 오류:', error);
    throw error;
  }
}

/**
 * 이미지 메타데이터 수정
 */
export async function updateImageData(
  id: string,
  updates: Partial<Omit<import('../types').ImageData, 'id' | 'created_at' | 'file_path' | 'file_name'>>
): Promise<import('../types').ImageData> {
  try {
    const { data, error } = await supabase
      .from('image_data')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('이미지 데이터 수정 오류:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('updateImageData 오류:', error);
    throw error;
  }
}

/**
 * 이미지 데이터 삭제 (Storage 파일도 함께 삭제)
 */
export async function deleteImageData(id: string, filePath: string): Promise<void> {
  try {
    // 1. Storage에서 파일 삭제
    const { error: storageError } = await supabase.storage
      .from('images')
      .remove([filePath]);

    if (storageError) {
      console.error('Storage 파일 삭제 오류:', storageError);
      throw storageError;
    }

    // 2. DB에서 메타데이터 삭제
    const { error: dbError } = await supabase
      .from('image_data')
      .delete()
      .eq('id', id);

    if (dbError) {
      console.error('이미지 메타데이터 삭제 오류:', dbError);
      throw dbError;
    }
  } catch (error) {
    console.error('deleteImageData 오류:', error);
    throw error;
  }
}

/**
 * Supabase Storage에 이미지 업로드
 */
export async function uploadImageToStorage(
  file: File,
  fileName: string
): Promise<string> {
  try {
    const { data, error } = await supabase.storage
      .from('images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('이미지 업로드 오류:', error);
      throw error;
    }

    return data.path;
  } catch (error) {
    console.error('uploadImageToStorage 오류:', error);
    throw error;
  }
}

/**
 * Supabase Storage에서 이미지 공개 URL 생성
 */
export function getImagePublicUrl(filePath: string): string {
  const { data } = supabase.storage
    .from('images')
    .getPublicUrl(filePath);

  return data.publicUrl;
}