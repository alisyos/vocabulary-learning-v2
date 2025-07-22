import { createClient } from '@supabase/supabase-js'
import type { 
  ContentSet, 
  Passage, 
  VocabularyTerm, 
  VocabularyQuestion, 
  ComprehensiveQuestionDB, 
  AIGenerationLog, 
  SystemPrompt,
  CurriculumData 
} from '../types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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

  // System Prompts
  async getSystemPrompts() {
    const { data, error } = await supabase
      .from('system_prompts')
      .select('*')
      .eq('is_active', true)
      .order('prompt_type')
    
    if (error) throw error
    return data as SystemPrompt[]
  },

  async getSystemPromptByType(promptType: string) {
    const { data, error } = await supabase
      .from('system_prompts')
      .select('*')
      .eq('prompt_type', promptType)
      .eq('is_active', true)
      .single()
    
    if (error) throw error
    return data as SystemPrompt
  },

  async updateSystemPrompt(promptType: string, promptContent: string) {
    const { data, error } = await supabase
      .from('system_prompts')
      .update({ prompt_content: promptContent })
      .eq('prompt_type', promptType)
      .select()
      .single()
    
    if (error) throw error
    return data as SystemPrompt
  },

  // Helper function to save complete content set with all related data
  async saveCompleteContentSet(
    contentSetData: Omit<ContentSet, 'id' | 'created_at' | 'updated_at'>,
    passagesData: Omit<Passage, 'id' | 'content_set_id' | 'created_at'>[],
    vocabularyTerms: Omit<VocabularyTerm, 'id' | 'content_set_id' | 'created_at'>[],
    vocabularyQuestions: Omit<VocabularyQuestion, 'id' | 'content_set_id' | 'created_at'>[],
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