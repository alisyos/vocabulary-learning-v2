-- content_sets 테이블에 grade_number 컬럼 추가
-- grade_number: 과목 넘버 (예: 3, 4, 5, 6, 중1, 중2, 중3)

-- 컬럼 추가
ALTER TABLE content_sets
ADD COLUMN IF NOT EXISTS grade_number TEXT DEFAULT NULL;

-- 컬럼 설명 추가
COMMENT ON COLUMN content_sets.grade_number IS '과목 넘버 (예: 3, 4, 5, 6, 중1, 중2, 중3)';

-- 권한 설정 (anon 사용자가 읽고 쓸 수 있도록)
GRANT SELECT, INSERT, UPDATE ON content_sets TO anon;
GRANT SELECT, INSERT, UPDATE ON content_sets TO authenticated;

-- 확인용 쿼리
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'content_sets'
AND column_name = 'grade_number';
