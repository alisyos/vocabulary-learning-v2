-- comprehensive_questions 테이블 제약조건 수정 - 최종 버전
-- Supabase 대시보드 > SQL Editor에서 순서대로 실행

-- 1. 기존 제약조건 제거
ALTER TABLE comprehensive_questions 
DROP CONSTRAINT IF EXISTS comprehensive_questions_question_type_check;

-- 2. 기존 데이터를 새로운 유형으로 업데이트
-- '문단별 순서 맞추기' (41개) → 삭제 또는 다른 유형으로 변환
-- 옵션 A: 핵심 내용 요약으로 변환 (가장 유사한 유형)
UPDATE comprehensive_questions 
SET question_type = '핵심 내용 요약' 
WHERE question_type = '문단별 순서 맞추기';

-- 옵션 B: 만약 삭제를 원한다면 (주의: 데이터 손실)
-- DELETE FROM comprehensive_questions WHERE question_type = '문단별 순서 맞추기';

-- '핵심어/핵심문장 찾기' (33개) → '핵심문장 찾기'로 이름 변경
UPDATE comprehensive_questions 
SET question_type = '핵심문장 찾기' 
WHERE question_type = '핵심어/핵심문장 찾기';

-- 3. 업데이트 후 확인
SELECT 
    question_type, 
    COUNT(*) as count
FROM comprehensive_questions 
GROUP BY question_type 
ORDER BY count DESC;

-- 4. 새로운 제약조건 추가
ALTER TABLE comprehensive_questions 
ADD CONSTRAINT comprehensive_questions_question_type_check 
CHECK (question_type IN ('단답형', '핵심 내용 요약', '핵심문장 찾기', 'OX문제', '자료분석하기'));

-- 5. 최종 확인
SELECT 
    question_type, 
    COUNT(*) as count,
    CASE 
        WHEN question_type IN ('단답형', '핵심 내용 요약', '핵심문장 찾기', 'OX문제', '자료분석하기') 
        THEN '✅ 허용됨'
        ELSE '❌ 허용 안됨'
    END as status
FROM comprehensive_questions 
GROUP BY question_type 
ORDER BY count DESC;

-- 6. 제약조건 확인
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(c.oid) as constraint_definition
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
WHERE t.relname = 'comprehensive_questions' 
    AND conname LIKE '%question_type%';