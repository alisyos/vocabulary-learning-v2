-- Fix paragraph_questions table to support ALL question types
-- 문단 문제와 종합 문제의 모든 유형을 지원하도록 제약조건 수정

-- 1. Drop existing constraint
ALTER TABLE paragraph_questions DROP CONSTRAINT IF EXISTS paragraph_questions_question_type_check;

-- 2. Add new constraint with ALL question types used in the system
ALTER TABLE paragraph_questions ADD CONSTRAINT paragraph_questions_question_type_check 
  CHECK (question_type IN (
    -- 기존 문단 문제 유형들
    '어절 순서 맞추기', 
    '빈칸 채우기', 
    '유의어 고르기', 
    '반의어 고르기', 
    '문단 요약',
    
    -- 새로운 문단 문제 유형들
    '주관식 단답형',
    'OX문제',
    
    -- 종합 문제 유형들
    '단답형',
    '문단별 순서 맞추기',
    '핵심 내용 요약', 
    '핵심어/핵심문장 찾기'
  ));

-- 3. Allow option columns to be NULL for subjective questions
ALTER TABLE paragraph_questions ALTER COLUMN option_1 DROP NOT NULL;
ALTER TABLE paragraph_questions ALTER COLUMN option_2 DROP NOT NULL;  
ALTER TABLE paragraph_questions ALTER COLUMN option_3 DROP NOT NULL;
ALTER TABLE paragraph_questions ALTER COLUMN option_4 DROP NOT NULL;

-- 4. Update correct_answer to allow text answers for subjective questions
ALTER TABLE paragraph_questions DROP CONSTRAINT IF EXISTS paragraph_questions_correct_answer_check;

-- 5. Add answer_initials column for 주관식 단답형 if it doesn't exist
ALTER TABLE paragraph_questions ADD COLUMN IF NOT EXISTS answer_initials TEXT;

-- 6. Update correct_answer column type to support both numbers and text
ALTER TABLE paragraph_questions ALTER COLUMN correct_answer TYPE TEXT;