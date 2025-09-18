-- Fix paragraph_questions table question_type constraint
-- Add support for '주관식 단답형' question type

-- 1. Drop existing constraint
ALTER TABLE paragraph_questions DROP CONSTRAINT IF EXISTS paragraph_questions_question_type_check;

-- 2. Add new constraint with additional allowed values
ALTER TABLE paragraph_questions ADD CONSTRAINT paragraph_questions_question_type_check 
  CHECK (question_type IN (
    '어절 순서 맞추기', 
    '빈칸 채우기', 
    '유의어 고르기', 
    '반의어 고르기', 
    '문단 요약',
    '주관식 단답형'
  ));

-- 3. Also allow option columns to be NULL for 주관식 단답형 questions
ALTER TABLE paragraph_questions ALTER COLUMN option_1 DROP NOT NULL;
ALTER TABLE paragraph_questions ALTER COLUMN option_2 DROP NOT NULL;  
ALTER TABLE paragraph_questions ALTER COLUMN option_3 DROP NOT NULL;
ALTER TABLE paragraph_questions ALTER COLUMN option_4 DROP NOT NULL;