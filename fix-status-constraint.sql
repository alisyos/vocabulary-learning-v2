-- 1. 먼저 기존 제약조건 제거
ALTER TABLE content_sets
DROP CONSTRAINT IF EXISTS content_sets_status_check;

-- 2. 새로운 제약조건 추가 (승인완료 포함)
ALTER TABLE content_sets
ADD CONSTRAINT content_sets_status_check
CHECK (status IN ('검수 전', '검수완료', '승인완료'));

-- 3. 제약조건이 제대로 적용되었는지 확인
SELECT
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'content_sets'::regclass
AND contype = 'c'
AND conname LIKE '%status%';