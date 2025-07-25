-- =============================================================================
-- 문단 문제 저장 오류 진단 스크립트 (수정버전)
-- Supabase Dashboard > SQL Editor에서 실행하여 상태를 확인하세요
-- =============================================================================

-- 1. 테이블 존재 여부 확인
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

-- 2. paragraph_questions 테이블 구조 확인
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'paragraph_questions' 
ORDER BY ordinal_position;

-- 3. paragraph_questions 테이블 제약 조건 확인
SELECT 
    constraint_name,
    constraint_type,
    table_name
FROM information_schema.table_constraints
WHERE table_name = 'paragraph_questions';

-- 4. content_sets 테이블에 total_paragraph_questions 컬럼 존재 확인
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'content_sets' 
AND column_name = 'total_paragraph_questions';

-- 5. 현재 데이터 상태 확인
SELECT 
    'content_sets' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN total_paragraph_questions IS NOT NULL THEN 1 END) as with_paragraph_count
FROM content_sets
UNION ALL
SELECT 
    'paragraph_questions' as table_name,
    COUNT(*) as total_records,
    NULL as with_paragraph_count
FROM paragraph_questions;

-- 6. ai_generation_logs 테이블의 generation_type 제약 조건 확인 (수정된 버전)
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    CASE contype
        WHEN 'c' THEN 'CHECK constraint'
        WHEN 'f' THEN 'FOREIGN KEY constraint'
        WHEN 'p' THEN 'PRIMARY KEY constraint'
        WHEN 'u' THEN 'UNIQUE constraint'
        ELSE 'Other'
    END as constraint_description
FROM pg_constraint 
WHERE conname LIKE '%generation_type%';

-- 7. RLS 정책 확인
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'paragraph_questions';

-- 8. 체크 제약조건 상세 확인 (paragraph_questions)
SELECT 
    tc.constraint_name,
    tc.table_name,
    cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'paragraph_questions';

-- 9. 외래키 제약조건 확인
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'paragraph_questions';

-- 10. 에러 발생 가능성 높은 항목들 체크
SELECT 
    '테이블 권한 확인' as check_item,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_privileges 
            WHERE table_name = 'paragraph_questions' 
            AND privilege_type = 'INSERT'
        ) THEN '✅ INSERT 권한 있음'
        ELSE '❌ INSERT 권한 없음 또는 확인 불가'
    END as status
UNION ALL
SELECT 
    'content_sets 테이블 존재 확인' as check_item,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_name = 'content_sets'
        ) THEN '✅ content_sets 테이블 존재'
        ELSE '❌ content_sets 테이블 없음'
    END as status
UNION ALL
SELECT 
    'paragraph_questions 테이블 존재 확인' as check_item,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_name = 'paragraph_questions'
        ) THEN '✅ paragraph_questions 테이블 존재'
        ELSE '❌ paragraph_questions 테이블 없음'
    END as status;

-- 11. 간단한 삽입 테스트 (실제 데이터 영향 없음 - 롤백됨)
DO $$
DECLARE
    test_content_set_id UUID;
    test_result TEXT;
BEGIN
    -- 테스트용 content_set 생성 시도
    BEGIN
        INSERT INTO content_sets (
            division, grade, subject, area, title, 
            total_passages, total_vocabulary_terms, total_vocabulary_questions, 
            total_paragraph_questions, total_comprehensive_questions
        ) VALUES (
            '초등학교 중학년(3-4학년)', '3학년', '사회', '일반사회', '🧪 테스트',
            1, 0, 0, 1, 0
        ) RETURNING id INTO test_content_set_id;
        
        -- 테스트용 paragraph_question 삽입 시도
        INSERT INTO paragraph_questions (
            content_set_id, question_number, question_type, paragraph_number,
            paragraph_text, question_text, option_1, option_2, option_3, option_4,
            correct_answer, explanation
        ) VALUES (
            test_content_set_id, 1, '문단 요약', 1,
            '테스트 문단 내용입니다.', '다음 문단의 내용을 가장 잘 요약한 것은?',
            '선택지 1', '선택지 2', '선택지 3', '선택지 4',
            '1', '테스트 해설입니다.'
        );
        
        test_result := '✅ 삽입 테스트 성공';
        
        -- 테스트 데이터 삭제 (롤백)
        DELETE FROM paragraph_questions WHERE content_set_id = test_content_set_id;
        DELETE FROM content_sets WHERE id = test_content_set_id;
        
    EXCEPTION WHEN OTHERS THEN
        test_result := '❌ 삽입 테스트 실패: ' || SQLERRM;
    END;
    
    -- 결과 출력을 위한 임시 테이블 생성 및 삽입
    CREATE TEMP TABLE IF NOT EXISTS test_results (result TEXT);
    INSERT INTO test_results VALUES (test_result);
END
$$;

-- 테스트 결과 출력
SELECT 
    '삽입 테스트 결과' as test_name,
    result as status
FROM test_results;

-- 12. 진단 완료 메시지
SELECT 
    '🔍 진단 완료' as message,
    '위 결과를 통해 문제점을 파악할 수 있습니다' as note,
    NOW() as timestamp;