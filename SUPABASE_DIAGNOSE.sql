-- =============================================================================
-- 문단 문제 저장 오류 진단 스크립트
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

-- 6. ai_generation_logs 테이블의 generation_type 제약 조건 확인
SELECT 
    conname as constraint_name,
    consrc as constraint_definition
FROM pg_constraint 
WHERE conname LIKE '%generation_type%';

-- 7. RLS 정책 확인
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'paragraph_questions';

-- 8. 테스트 데이터 삽입 시도 (실제 오류 확인용 - 주의해서 사용)
-- 아래 주석을 해제하여 테스트 가능하지만, 실제 데이터에 영향을 줄 수 있습니다.
/*
-- 먼저 테스트용 content_set 생성
INSERT INTO content_sets (
    division, grade, subject, area, title, 
    total_passages, total_vocabulary_terms, total_vocabulary_questions, 
    total_paragraph_questions, total_comprehensive_questions
) VALUES (
    '초등학교 중학년(3-4학년)', '3학년', '사회', '일반사회', '테스트 제목',
    1, 0, 0, 1, 0
) RETURNING id;

-- 위에서 생성된 ID로 paragraph_questions 테스트 삽입
-- (위 쿼리 결과의 ID로 content_set_id 값을 교체하세요)
INSERT INTO paragraph_questions (
    content_set_id, question_number, question_type, paragraph_number,
    paragraph_text, question_text, option_1, option_2, option_3, option_4,
    correct_answer, explanation
) VALUES (
    'YOUR_CONTENT_SET_ID_HERE', -- 위에서 생성된 실제 ID로 교체
    1, '문단 요약', 1,
    '테스트 문단 내용입니다.', '다음 문단의 내용을 가장 잘 요약한 것은?',
    '선택지 1', '선택지 2', '선택지 3', '선택지 4',
    '1', '테스트 해설입니다.'
);
*/

-- 9. 에러 발생 가능성 높은 항목들 체크
SELECT 
    '테이블 권한 확인' as check_item,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_privileges 
            WHERE table_name = 'paragraph_questions' 
            AND privilege_type = 'INSERT'
        ) THEN '✅ INSERT 권한 있음'
        ELSE '❌ INSERT 권한 없음'
    END as status
UNION ALL
SELECT 
    '외래키 제약조건 확인' as check_item,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.referential_constraints
            WHERE constraint_name LIKE '%paragraph_questions%'
        ) THEN '✅ 외래키 제약조건 존재'
        ELSE '❌ 외래키 제약조건 없음'
    END as status;

-- 10. 진단 완료 메시지
SELECT 
    '🔍 진단 완료' as message,
    '위 결과를 확인하여 문제점을 파악하세요' as note,
    NOW() as timestamp;