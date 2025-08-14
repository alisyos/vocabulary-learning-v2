-- ================================================================
-- 종합 문제 CHECK 제약조건 업데이트 스크립트
-- ================================================================
-- 
-- 이 스크립트는 Supabase 대시보드의 SQL Editor에서 수동으로 실행해야 합니다.
-- 새로운 4가지 종합 문제 유형을 허용하도록 CHECK 제약조건을 업데이트합니다.
--
-- 실행 방법:
-- 1. Supabase 대시보드 로그인
-- 2. SQL Editor로 이동
-- 3. 이 스크립트 전체를 복사하여 붙여넣기
-- 4. Run 버튼 클릭
-- ================================================================

-- 1. 기존 제약조건 확인 (선택사항)
-- 현재 제약조건을 확인하고 싶다면 아래 주석을 해제하고 실행하세요
/*
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'comprehensive_questions' 
AND tc.constraint_type = 'CHECK';
*/

-- 2. 기존 CHECK 제약조건 삭제
ALTER TABLE comprehensive_questions 
DROP CONSTRAINT IF EXISTS comprehensive_questions_question_type_check;

-- 3. 새로운 CHECK 제약조건 추가 (기존 5개 + 새로운 4개)
ALTER TABLE comprehensive_questions 
ADD CONSTRAINT comprehensive_questions_question_type_check 
CHECK (question_type IN (
    -- 기존 5가지 유형 (비활성화되었지만 DB 호환성을 위해 유지)
    '단답형',
    '핵심 내용 요약', 
    '핵심문장 찾기',
    'OX문제',
    '자료분석하기',
    -- 새로운 4가지 유형
    '정보 확인',
    '주제 파악',
    '자료해석',
    '추론'
));

-- 4. 제약조건 업데이트 확인
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'comprehensive_questions' 
AND tc.constraint_type = 'CHECK'
AND tc.constraint_name = 'comprehensive_questions_question_type_check';

-- 5. 테스트: 새로운 유형으로 데이터 삽입 테스트 (선택사항)
-- 성공 시 즉시 삭제하므로 실제 데이터에는 영향 없음
/*
BEGIN;

-- 테스트 데이터 삽입
INSERT INTO comprehensive_questions (
    content_set_id,
    question_number,
    question_type,
    difficulty,
    question_text,
    question_format,
    option_1,
    option_2,
    option_3,
    option_4,
    option_5,
    correct_answer,
    explanation,
    is_supplementary,
    question_set_number
) VALUES 
(
    '00000000-0000-0000-0000-000000000000',
    999,
    '정보 확인',
    '일반',
    '테스트 문제입니다',
    'multiple_choice',
    '선택지1',
    '선택지2', 
    '선택지3',
    '선택지4',
    '선택지5',
    '1',
    '테스트 해설입니다',
    false,
    1
);

-- 테스트 데이터 즉시 삭제
DELETE FROM comprehensive_questions 
WHERE content_set_id = '00000000-0000-0000-0000-000000000000' 
AND question_number = 999;

COMMIT;

-- 성공 메시지
SELECT '✅ 새로운 종합 문제 유형 제약조건 업데이트 완료!' as result;
*/

-- ================================================================
-- 업데이트 완료!
-- 
-- 이제 다음 4가지 새로운 종합 문제 유형을 사용할 수 있습니다:
-- 1. 정보 확인
-- 2. 주제 파악  
-- 3. 자료해석
-- 4. 추론
--
-- 기존 5가지 유형도 호환성을 위해 계속 허용됩니다.
-- ================================================================