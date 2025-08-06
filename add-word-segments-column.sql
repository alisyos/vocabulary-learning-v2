-- =============================================================================
-- 어절 순서 맞추기 문제를 주관식으로 변경하기 위한 스키마 업데이트
-- word_segments 컬럼 추가 (어절들을 배열로 저장)
-- =============================================================================

-- 1. word_segments 컬럼 추가 (TEXT[] 배열 타입)
ALTER TABLE paragraph_questions 
ADD COLUMN IF NOT EXISTS word_segments TEXT[];

-- 2. 컬럼 설명 추가
COMMENT ON COLUMN paragraph_questions.word_segments IS '어절 순서 맞추기 문제의 개별 어절들 (배열)';

-- 3. 어절 순서 맞추기 문제에 대한 기존 제약조건 완화
-- correct_answer 체크 제약조건이 있다면 제거 (주관식 답변 허용)
ALTER TABLE paragraph_questions DROP CONSTRAINT IF EXISTS paragraph_questions_correct_answer_check;

-- 4. 옵션 컬럼들을 NULL 허용으로 변경 (어절 순서 맞추기는 옵션이 필요 없음)
ALTER TABLE paragraph_questions ALTER COLUMN option_1 DROP NOT NULL;
ALTER TABLE paragraph_questions ALTER COLUMN option_2 DROP NOT NULL;
ALTER TABLE paragraph_questions ALTER COLUMN option_3 DROP NOT NULL;
ALTER TABLE paragraph_questions ALTER COLUMN option_4 DROP NOT NULL;

-- 5. 업데이트된 테이블 구조 확인
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'paragraph_questions'
ORDER BY ordinal_position;

-- 6. 완료 메시지
SELECT 
    '✅ word_segments 컬럼이 추가되었습니다!' as message,
    '✅ 어절 순서 맞추기 문제가 이제 주관식으로 처리됩니다!' as detail,
    NOW() as completed_at;