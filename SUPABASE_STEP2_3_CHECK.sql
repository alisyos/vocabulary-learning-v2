-- =============================================================================
-- 2단계: content_sets 컬럼 확인
-- =============================================================================
SELECT COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'content_sets' 
AND column_name = 'total_paragraph_questions';

-- 위 결과가 1이면 컬럼 존재, 0이면 컬럼 없음

-- =============================================================================
-- 3단계: paragraph_questions 테이블 구조 확인
-- =============================================================================
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'paragraph_questions' 
ORDER BY ordinal_position;