-- =============================================================================
-- content_sets 테이블의 total_paragraph_questions 값 확인 및 업데이트
-- Supabase Dashboard > SQL Editor에서 실행하세요
-- =============================================================================

-- 1. content_sets 테이블의 현재 total_paragraph_questions 값 확인
SELECT 
    id,
    title,
    subject,
    grade,
    area,
    total_paragraph_questions,
    created_at
FROM content_sets 
ORDER BY created_at DESC
LIMIT 10;

-- 2. paragraph_questions 테이블의 데이터 확인
SELECT 
    content_set_id,
    COUNT(*) as actual_paragraph_questions_count
FROM paragraph_questions 
GROUP BY content_set_id
ORDER BY content_set_id;

-- 3. content_sets와 paragraph_questions를 조인하여 실제값과 저장된 값 비교
SELECT 
    cs.id,
    cs.title,
    cs.total_paragraph_questions as stored_count,
    COALESCE(pq.actual_count, 0) as actual_count,
    CASE 
        WHEN cs.total_paragraph_questions != COALESCE(pq.actual_count, 0) 
        THEN '❌ 불일치' 
        ELSE '✅ 일치' 
    END as status
FROM content_sets cs
LEFT JOIN (
    SELECT 
        content_set_id,
        COUNT(*) as actual_count
    FROM paragraph_questions 
    GROUP BY content_set_id
) pq ON cs.id = pq.content_set_id
ORDER BY cs.created_at DESC;

-- 4. total_paragraph_questions 값이 0이거나 NULL인 경우를 찾아서 업데이트
UPDATE content_sets 
SET total_paragraph_questions = (
    SELECT COUNT(*) 
    FROM paragraph_questions 
    WHERE paragraph_questions.content_set_id = content_sets.id
)
WHERE total_paragraph_questions IS NULL 
   OR total_paragraph_questions = 0 
   OR total_paragraph_questions != (
       SELECT COUNT(*) 
       FROM paragraph_questions 
       WHERE paragraph_questions.content_set_id = content_sets.id
   );

-- 5. 업데이트 후 확인
SELECT 
    cs.id,
    cs.title,
    cs.total_paragraph_questions as updated_count,
    COALESCE(pq.actual_count, 0) as actual_count,
    CASE 
        WHEN cs.total_paragraph_questions = COALESCE(pq.actual_count, 0) 
        THEN '✅ 일치' 
        ELSE '❌ 불일치' 
    END as status
FROM content_sets cs
LEFT JOIN (
    SELECT 
        content_set_id,
        COUNT(*) as actual_count
    FROM paragraph_questions 
    GROUP BY content_set_id
) pq ON cs.id = pq.content_set_id
ORDER BY cs.created_at DESC;

-- 6. 문단 문제가 있는 content_sets의 통계
SELECT 
    COUNT(CASE WHEN total_paragraph_questions > 0 THEN 1 END) as sets_with_paragraph_questions,
    COUNT(*) as total_sets,
    SUM(total_paragraph_questions) as total_paragraph_questions_sum,
    AVG(total_paragraph_questions) as avg_paragraph_questions_per_set
FROM content_sets;

-- 완료 메시지
SELECT 
    '✅ content_sets 테이블의 total_paragraph_questions 값이 업데이트되었습니다!' as message,
    NOW() as completed_at;