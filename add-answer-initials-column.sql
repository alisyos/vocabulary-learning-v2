-- Add missing columns to comprehensive_questions table (safe version)
-- These columns are required by the application but missing from the current schema

-- Check which columns exist first
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'comprehensive_questions';

-- Add question_format column only if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'comprehensive_questions' 
                   AND column_name = 'question_format') THEN
        ALTER TABLE comprehensive_questions 
        ADD COLUMN question_format VARCHAR(20) CHECK (question_format IN ('객관식', '주관식'));
        
        COMMENT ON COLUMN comprehensive_questions.question_format IS '문제 형식: 객관식 또는 주관식';
    END IF;
END $$;

-- Add answer_initials column only if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'comprehensive_questions' 
                   AND column_name = 'answer_initials') THEN
        ALTER TABLE comprehensive_questions 
        ADD COLUMN answer_initials TEXT;
        
        COMMENT ON COLUMN comprehensive_questions.answer_initials IS '단답형 문제의 초성 힌트 (예: "ㄱㄴㄷ")';
    END IF;
END $$;

-- Add is_supplementary column only if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'comprehensive_questions' 
                   AND column_name = 'is_supplementary') THEN
        ALTER TABLE comprehensive_questions 
        ADD COLUMN is_supplementary BOOLEAN DEFAULT false;
        
        COMMENT ON COLUMN comprehensive_questions.is_supplementary IS '보완 문제 여부 (기본문제의 추가 문제)';
    END IF;
END $$;

-- Add original_question_id column only if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'comprehensive_questions' 
                   AND column_name = 'original_question_id') THEN
        ALTER TABLE comprehensive_questions 
        ADD COLUMN original_question_id TEXT;
        
        COMMENT ON COLUMN comprehensive_questions.original_question_id IS '보완 문제가 연결된 원래 문제의 ID';
    END IF;
END $$;

-- Add question_set_number column only if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'comprehensive_questions' 
                   AND column_name = 'question_set_number') THEN
        ALTER TABLE comprehensive_questions 
        ADD COLUMN question_set_number INTEGER DEFAULT 1;
        
        COMMENT ON COLUMN comprehensive_questions.question_set_number IS '문제 세트 번호 (관련 문제들을 그룹화)';
    END IF;
END $$;

-- Update the question_type constraint to include the new question types used by the application
-- First, drop the existing constraint if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'comprehensive_questions_question_type_check' 
               AND table_name = 'comprehensive_questions') THEN
        ALTER TABLE comprehensive_questions 
        DROP CONSTRAINT comprehensive_questions_question_type_check;
    END IF;
END $$;

-- Add the new constraint with updated question types
ALTER TABLE comprehensive_questions 
ADD CONSTRAINT comprehensive_questions_question_type_check 
CHECK (question_type IN ('단답형', '핵심 내용 요약', '핵심문장 찾기', 'OX문제', '자료분석하기', '객관식', '주관식'));

-- Verify all columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'comprehensive_questions' 
ORDER BY ordinal_position;