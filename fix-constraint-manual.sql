-- comprehensive_questions 테이블의 question_type 제약조건 수정
-- Supabase 대시보드 > SQL Editor에서 실행

-- 1. 기존 제약조건 제거 (존재할 경우)
ALTER TABLE comprehensive_questions 
DROP CONSTRAINT IF EXISTS comprehensive_questions_question_type_check;

-- 2. 새로운 제약조건 추가 (5개 유형 허용)
ALTER TABLE comprehensive_questions 
ADD CONSTRAINT comprehensive_questions_question_type_check 
CHECK (question_type IN ('단답형', '핵심 내용 요약', '핵심문장 찾기', 'OX문제', '자료분석하기'));

-- 3. 제약조건이 올바르게 추가되었는지 확인
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(c.oid) as constraint_definition
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
WHERE t.relname = 'comprehensive_questions' 
    AND conname LIKE '%question_type%';

-- 4. 테스트 삽입 (성공하면 제약조건이 올바르게 설정됨)
-- 주의: 실제 content_set_id는 존재하는 값을 사용해야 함
-- INSERT INTO comprehensive_questions (
--     content_set_id, 
--     question_number, 
--     question_type, 
--     question_format, 
--     difficulty, 
--     question_text, 
--     correct_answer, 
--     explanation, 
--     is_supplementary, 
--     question_set_number
-- ) VALUES (
--     '00000000-0000-0000-0000-000000000000', -- 실제 UUID로 변경 필요
--     999, 
--     'OX문제', 
--     '객관식', 
--     '일반', 
--     'TEST 문제', 
--     '1', 
--     'TEST 해설', 
--     false, 
--     1
-- );

-- 5. 테스트 데이터 삭제 (위 테스트 성공 시)
-- DELETE FROM comprehensive_questions WHERE question_number = 999;