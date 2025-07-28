-- =============================================================================
-- 문단 문제 테이블 추가 SQL
-- Supabase Dashboard > SQL Editor에서 실행하세요
-- =============================================================================

-- Paragraph Questions (Questions based on individual paragraphs)
CREATE TABLE IF NOT EXISTS paragraph_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_set_id UUID NOT NULL REFERENCES content_sets(id) ON DELETE CASCADE,
    question_number INTEGER NOT NULL,
    question_type VARCHAR(50) NOT NULL CHECK (question_type IN ('어절 순서 맞추기', '빈칸 채우기', '유의어 고르기', '반의어 고르기', '문단 요약')),
    paragraph_number INTEGER NOT NULL CHECK (paragraph_number >= 1 AND paragraph_number <= 10),
    paragraph_text TEXT NOT NULL, -- 해당 문단 내용
    question_text TEXT NOT NULL,
    option_1 TEXT NOT NULL,
    option_2 TEXT NOT NULL,
    option_3 TEXT NOT NULL,
    option_4 TEXT NOT NULL,
    option_5 TEXT, -- 5번째 선택지는 선택사항
    correct_answer VARCHAR(1) NOT NULL CHECK (correct_answer IN ('1', '2', '3', '4', '5')),
    explanation TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(content_set_id, question_number)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_paragraph_questions_content_set_id ON paragraph_questions(content_set_id);
CREATE INDEX IF NOT EXISTS idx_paragraph_questions_paragraph_number ON paragraph_questions(paragraph_number);
CREATE INDEX IF NOT EXISTS idx_paragraph_questions_question_type ON paragraph_questions(question_type);

-- content_sets 테이블에 문단 문제 수 컬럼 추가
ALTER TABLE content_sets ADD COLUMN IF NOT EXISTS total_paragraph_questions INTEGER DEFAULT 0;

-- AI 생성 로그에 문단 문제 타입 추가
ALTER TABLE ai_generation_logs DROP CONSTRAINT IF EXISTS ai_generation_logs_generation_type_check;
ALTER TABLE ai_generation_logs ADD CONSTRAINT ai_generation_logs_generation_type_check 
    CHECK (generation_type IN ('passage', 'vocabulary', 'paragraph', 'comprehensive'));

-- 테이블 생성 완료 확인
SELECT 
  'paragraph_questions' as table_name,
  COUNT(*) as record_count
FROM paragraph_questions;

-- 컬럼 정보 확인
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'paragraph_questions' 
ORDER BY ordinal_position;