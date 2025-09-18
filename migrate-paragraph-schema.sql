-- 문단 문제 테이블 스키마 마이그레이션
-- 실행 날짜: 2025-01-30
-- 목적: 주관식 단답형 문제 유형 지원을 위한 스키마 업데이트

-- 1. correct_answer 컬럼 타입을 VARCHAR에서 TEXT로 변경
-- 이유: 주관식 단답형 문제에서 긴 답안을 저장할 수 있도록 함
ALTER TABLE paragraph_questions 
ALTER COLUMN correct_answer TYPE TEXT;

-- 2. answer_initials 컬럼 추가
-- 이유: 주관식 단답형 문제의 초성 힌트 저장 (예: '장래희망' → 'ㅈㄹㅎㅁ')
ALTER TABLE paragraph_questions 
ADD COLUMN IF NOT EXISTS answer_initials TEXT;

-- 3. option 컬럼들의 NOT NULL 제약조건 해제 (주관식 단답형 지원을 위해)
ALTER TABLE paragraph_questions 
ALTER COLUMN option_1 DROP NOT NULL;

ALTER TABLE paragraph_questions 
ALTER COLUMN option_2 DROP NOT NULL;

ALTER TABLE paragraph_questions 
ALTER COLUMN option_3 DROP NOT NULL;

ALTER TABLE paragraph_questions 
ALTER COLUMN option_4 DROP NOT NULL;

-- 4. 컬럼에 대한 설명 추가
COMMENT ON COLUMN paragraph_questions.correct_answer IS '정답 (객관식: 1,2,3,4,5 | 주관식: 실제 답)';
COMMENT ON COLUMN paragraph_questions.answer_initials IS '주관식 단답형 초성 힌트 (예: ㅈㄹㅎㅁ)';

-- 5. correct_answer 체크 제약조건 제거 (주관식 단답형 지원을 위해)
ALTER TABLE paragraph_questions DROP CONSTRAINT IF EXISTS paragraph_questions_correct_answer_check;

-- 6. question_type 컬럼의 체크 제약조건 업데이트 (기존 제약조건이 있다면)
-- 새로운 문제 유형들을 허용하도록 업데이트
-- 주의: 기존 제약조건 이름을 확인한 후 실행해야 함
-- ALTER TABLE paragraph_questions DROP CONSTRAINT IF EXISTS paragraph_questions_question_type_check;
-- ALTER TABLE paragraph_questions ADD CONSTRAINT paragraph_questions_question_type_check 
--   CHECK (question_type IN ('빈칸 채우기', '주관식 단답형', '어절 순서 맞추기', 'OX문제'));

-- 7. 업데이트된 테이블 구조 확인
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'paragraph_questions'
ORDER BY ordinal_position;

-- 8. 기존 데이터 확인 (샘플)
SELECT 
  id,
  question_type,
  correct_answer,
  answer_initials,
  created_at
FROM paragraph_questions 
LIMIT 5;