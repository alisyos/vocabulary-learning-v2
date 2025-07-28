-- =============================================================================
-- 단계별 진단 쿼리 - 각각 개별적으로 실행하세요
-- =============================================================================

-- ⭐ 1단계: 핵심 테이블 존재 여부 확인
SELECT 
    table_name,
    CASE 
        WHEN table_name IS NOT NULL THEN '✅ 존재'
        ELSE '❌ 없음'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('content_sets', 'paragraph_questions', 'vocabulary_questions', 'comprehensive_questions')
ORDER BY table_name;

-- 위 쿼리를 먼저 실행하고 결과를 확인하세요.
-- paragraph_questions 테이블이 '✅ 존재'로 나와야 합니다.