import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// 스키마 생성 SQL - 파일에서 읽어오는 대신 직접 정의
const SCHEMA_SQL = `
-- Content Sets (Main table for tracking generated content)
CREATE TABLE IF NOT EXISTS content_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(50),  -- 생성자 ID
    division VARCHAR(100) NOT NULL,  -- 구분 (초등학교 중학년, 고학년, 중학생)
    grade VARCHAR(50) NOT NULL,  -- 실제 학년
    subject VARCHAR(20) NOT NULL CHECK (subject IN ('사회', '과학')),
    area VARCHAR(50) NOT NULL,
    main_topic VARCHAR(200),  -- 대주제
    sub_topic VARCHAR(200),   -- 소주제  
    keywords TEXT,            -- 키워드
    title TEXT NOT NULL,
    total_passages INTEGER DEFAULT 1,
    total_vocabulary_terms INTEGER DEFAULT 0,
    total_vocabulary_questions INTEGER DEFAULT 0,
    total_comprehensive_questions INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT '검수 전' CHECK (status IN ('검수 전', '검수완료')),  -- 상태값
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Passages (One or more passages per content set)
CREATE TABLE IF NOT EXISTS passages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_set_id UUID NOT NULL REFERENCES content_sets(id) ON DELETE CASCADE,
    passage_number INTEGER NOT NULL DEFAULT 1,
    title TEXT NOT NULL,
    paragraph_1 TEXT,
    paragraph_2 TEXT,
    paragraph_3 TEXT,
    paragraph_4 TEXT,
    paragraph_5 TEXT,
    paragraph_6 TEXT,
    paragraph_7 TEXT,
    paragraph_8 TEXT,
    paragraph_9 TEXT,
    paragraph_10 TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(content_set_id, passage_number)
);

-- Vocabulary Terms (Individual terms with definitions)
CREATE TABLE IF NOT EXISTS vocabulary_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_set_id UUID NOT NULL REFERENCES content_sets(id) ON DELETE CASCADE,
    term VARCHAR(100) NOT NULL,
    definition TEXT NOT NULL,
    example_sentence TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vocabulary Questions (Questions based on vocabulary terms)
CREATE TABLE IF NOT EXISTS vocabulary_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_set_id UUID NOT NULL REFERENCES content_sets(id) ON DELETE CASCADE,
    question_number INTEGER NOT NULL,
    question_type VARCHAR(20) NOT NULL CHECK (question_type IN ('객관식', '주관식')),
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('일반', '보완')),
    term VARCHAR(100), -- 어휘 용어
    question_text TEXT NOT NULL,
    option_1 TEXT,
    option_2 TEXT,
    option_3 TEXT,
    option_4 TEXT,
    option_5 TEXT,
    correct_answer TEXT NOT NULL,
    explanation TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(content_set_id, question_number)
);

-- Comprehensive Questions (Reading comprehension questions)
CREATE TABLE IF NOT EXISTS comprehensive_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_set_id UUID NOT NULL REFERENCES content_sets(id) ON DELETE CASCADE,
    question_number INTEGER NOT NULL,
    question_type VARCHAR(50) NOT NULL CHECK (question_type IN ('단답형', '문단별 순서 맞추기', '핵심 내용 요약', '핵심어/핵심문장 찾기')),
    question_format VARCHAR(20) NOT NULL CHECK (question_format IN ('객관식', '주관식')) DEFAULT '주관식',
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('일반', '보완')),
    question_text TEXT NOT NULL,
    option_1 TEXT,
    option_2 TEXT,
    option_3 TEXT,
    option_4 TEXT,
    option_5 TEXT,
    correct_answer TEXT NOT NULL,
    explanation TEXT NOT NULL,
    is_supplementary BOOLEAN DEFAULT FALSE,
    original_question_id VARCHAR(100),
    question_set_number INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(content_set_id, question_number)
);



-- AI Generation Logs (Track AI generation requests and responses)
CREATE TABLE IF NOT EXISTS ai_generation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_set_id UUID REFERENCES content_sets(id) ON DELETE SET NULL,
    generation_type VARCHAR(50) NOT NULL CHECK (generation_type IN ('passage', 'vocabulary', 'comprehensive')),
    prompt_used TEXT NOT NULL,
    ai_response TEXT,
    tokens_used INTEGER,
    generation_time_ms INTEGER,
    status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'error', 'partial')) DEFAULT 'success',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System Prompts (Dynamic prompt management)
CREATE TABLE IF NOT EXISTS system_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_type VARCHAR(50) NOT NULL UNIQUE CHECK (prompt_type IN ('passage_generation', 'vocabulary_generation', 'comprehensive_generation')),
    prompt_content TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Curriculum Data (Educational content structure for hierarchical selection)
CREATE TABLE IF NOT EXISTS curriculum_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject VARCHAR(20) NOT NULL CHECK (subject IN ('사회', '과학')),
    grade VARCHAR(50) NOT NULL,
    area VARCHAR(50) NOT NULL,
    main_topic VARCHAR(200) NOT NULL,
    sub_topic VARCHAR(200) NOT NULL,
    keywords TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
`;

const INDEXES_SQL = `
-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_content_sets_grade_subject ON content_sets(grade, subject);
CREATE INDEX IF NOT EXISTS idx_content_sets_created_at ON content_sets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_passages_content_set_id ON passages(content_set_id);
CREATE INDEX IF NOT EXISTS idx_vocabulary_terms_content_set_id ON vocabulary_terms(content_set_id);
CREATE INDEX IF NOT EXISTS idx_vocabulary_questions_content_set_id ON vocabulary_questions(content_set_id);
CREATE INDEX IF NOT EXISTS idx_comprehensive_questions_content_set_id ON comprehensive_questions(content_set_id);
CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_content_set_id ON ai_generation_logs(content_set_id);
CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_created_at ON ai_generation_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_curriculum_data_subject_grade ON curriculum_data(subject, grade);
CREATE INDEX IF NOT EXISTS idx_curriculum_data_area ON curriculum_data(area);
CREATE INDEX IF NOT EXISTS idx_curriculum_data_active ON curriculum_data(is_active);
`;

const FUNCTIONS_SQL = `
-- Functions to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';
`;

const TRIGGERS_SQL = `
-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_content_sets_updated_at ON content_sets;
DROP TRIGGER IF EXISTS update_system_prompts_updated_at ON system_prompts;

-- Apply the updated_at trigger to relevant tables
CREATE TRIGGER update_content_sets_updated_at BEFORE UPDATE ON content_sets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_prompts_updated_at BEFORE UPDATE ON system_prompts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`;

const DEFAULT_PROMPTS_SQL = `
-- Insert default system prompts (only if they don't exist)
INSERT INTO system_prompts (prompt_type, prompt_content) 
SELECT 'passage_generation', '학년별, 과목별 지문을 생성하는 기본 프롬프트'
WHERE NOT EXISTS (SELECT 1 FROM system_prompts WHERE prompt_type = 'passage_generation');

INSERT INTO system_prompts (prompt_type, prompt_content) 
SELECT 'vocabulary_generation', '어휘 문제를 생성하는 기본 프롬프트'
WHERE NOT EXISTS (SELECT 1 FROM system_prompts WHERE prompt_type = 'vocabulary_generation');

INSERT INTO system_prompts (prompt_type, prompt_content) 
SELECT 'comprehensive_generation', '독해 문제를 생성하는 기본 프롬프트'
WHERE NOT EXISTS (SELECT 1 FROM system_prompts WHERE prompt_type = 'comprehensive_generation');
`;

export async function POST() {
  try {
    console.log('🚀 Starting Supabase schema setup...');

    console.log('⚠️ 프롬프트 테이블 생성은 수동으로 진행해주세요.');
    console.log('📋 SUPABASE_PROMPTS_SCHEMA.sql 파일을 Supabase Dashboard > SQL Editor에서 실행하세요.');

    const results = [];
    
    // 1. 기본 테이블 존재 여부 확인
    console.log('Checking existing tables...');
    
    // comprehensive_questions 테이블 확인 및 필요한 컬럼 추가
    try {
      const { error: checkError } = await supabase
        .from('comprehensive_questions')
        .select('id')
        .limit(1);
      
      if (checkError) {
        results.push({
          step: 'table_check',
          success: false,
          error: 'comprehensive_questions table does not exist. Please create tables first.',
          manual_sql: SCHEMA_SQL
        });
      } else {
        results.push({
          step: 'table_check',
          success: true,
          message: 'comprehensive_questions table exists'
        });
        
                 // 필요한 컬럼들을 개별적으로 추가 시도
         const columnsToAdd = [
           { name: 'question_format', sql: 'ALTER TABLE comprehensive_questions ADD COLUMN question_format VARCHAR(20) DEFAULT \'주관식\';' },
           { name: 'is_supplementary', sql: 'ALTER TABLE comprehensive_questions ADD COLUMN is_supplementary BOOLEAN DEFAULT FALSE;' },
           { name: 'original_question_id', sql: 'ALTER TABLE comprehensive_questions ADD COLUMN original_question_id VARCHAR(100);' },
           { name: 'question_set_number', sql: 'ALTER TABLE comprehensive_questions ADD COLUMN question_set_number INTEGER DEFAULT 1;' }
         ];
         
         // 기존 컬럼 타입 변경이 필요한 경우
         const columnTypeChanges = [
           { 
             name: 'original_question_id_type_change', 
             sql: 'ALTER TABLE comprehensive_questions ALTER COLUMN original_question_id TYPE VARCHAR(100);',
             description: 'Change original_question_id from UUID to VARCHAR(100)'
           }
         ];
        
        for (const column of columnsToAdd) {
          try {
            // 간단한 업데이트 시도로 컬럼 존재 여부 확인
            const { error: updateError } = await supabase
              .from('comprehensive_questions')
              .update({ [column.name]: null })
              .eq('id', 'non-existent-id');
            
            if (updateError && updateError.message.includes('column')) {
              results.push({
                step: `add_column_${column.name}`,
                success: false,
                error: `Column ${column.name} does not exist. Manual SQL required.`,
                manual_sql: column.sql
              });
            } else {
              results.push({
                step: `check_column_${column.name}`,
                success: true,
                message: `Column ${column.name} already exists`
              });
            }
          } catch (error) {
            results.push({
              step: `check_column_${column.name}`,
              success: false,
              error: `Failed to check column ${column.name}: ${error}`,
              manual_sql: column.sql
            });
          }
        }
        
        // 컬럼 타입 변경 시도
        for (const typeChange of columnTypeChanges) {
          try {
            // 타입 변경은 직접 SQL로 실행해야 함 (Supabase 클라이언트로는 불가능)
            results.push({
              step: `type_change_${typeChange.name}`,
              success: false,
              error: 'Column type change requires manual SQL execution',
              manual_sql: typeChange.sql,
              description: typeChange.description
            });
          } catch (error) {
            results.push({
              step: `type_change_${typeChange.name}`,
              success: false,
              error: `Failed to change column type: ${error}`,
              manual_sql: typeChange.sql
            });
          }
        }
      }
    } catch (sqlError) {
      results.push({ 
        step: 'table_check', 
        success: false, 
        error: sqlError instanceof Error ? sqlError.message : 'Table check failed',
        manual_sql: SCHEMA_SQL
      });
    }
    
    console.log('Schema update completed');
    
    // Count successes and failures
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    
    // 수동 SQL이 필요한 항목들 정리
    const manualSqlNeeded = results.filter(r => r.manual_sql).map(r => r.manual_sql);
    
    return NextResponse.json({
      success: failureCount === 0,
      message: failureCount === 0 
        ? `Schema update completed successfully. ${successCount} checks passed.`
        : `Schema update completed with ${failureCount} items requiring manual SQL execution.`,
      results,
      manual_sql_required: manualSqlNeeded,
      details: {
        total_steps: results.length,
        successful_steps: successCount,
        failed_steps: failureCount,
        manual_sql_count: manualSqlNeeded.length
      }
    });
    
  } catch (error) {
    console.error('Schema setup failed:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Supabase 스키마 설정 중 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
}