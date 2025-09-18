-- curriculum_data 테이블에 새로운 컬럼 추가
-- keywords_for_passages: 지문 생성용 키워드
-- keywords_for_questions: 문제 생성용 키워드

-- 컬럼 추가
ALTER TABLE curriculum_data 
ADD COLUMN IF NOT EXISTS keywords_for_passages TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS keywords_for_questions TEXT DEFAULT '';

-- 컬럼 설명 추가
COMMENT ON COLUMN curriculum_data.keywords_for_passages IS '지문 생성용 키워드';
COMMENT ON COLUMN curriculum_data.keywords_for_questions IS '문제 생성용 키워드';

-- 권한 설정 (anon 사용자가 읽고 쓸 수 있도록)
GRANT SELECT, INSERT, UPDATE ON curriculum_data TO anon;
GRANT SELECT, INSERT, UPDATE ON curriculum_data TO authenticated;

-- 확인용 쿼리
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'curriculum_data'
AND column_name IN ('keywords_for_passages', 'keywords_for_questions');