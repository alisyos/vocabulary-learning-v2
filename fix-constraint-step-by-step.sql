-- 단계별 comprehensive_questions 테이블 제약조건 수정
-- Supabase 대시보드 > SQL Editor에서 단계별로 실행

-- 1단계: 현재 테이블의 question_type 값들 확인
SELECT 
    question_type, 
    COUNT(*) as count
FROM comprehensive_questions 
GROUP BY question_type 
ORDER BY count DESC;

-- 2단계: 기존 제약조건 확인
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(c.oid) as constraint_definition
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
WHERE t.relname = 'comprehensive_questions' 
    AND conname LIKE '%question_type%';

-- 3단계: 기존 제약조건 제거 (존재할 경우)
ALTER TABLE comprehensive_questions 
DROP CONSTRAINT IF EXISTS comprehensive_questions_question_type_check;

-- 4단계: 기존 데이터를 새로운 유형으로 업데이트
-- 이전 유형 → 새로운 유형 매핑

-- '문단별 순서 맞추기' → '핵심 내용 요약' (가장 유사한 유형으로 변경)
UPDATE comprehensive_questions 
SET question_type = '핵심 내용 요약' 
WHERE question_type = '문단별 순서 맞추기';

-- '핵심어/핵심문장 찾기' → '핵심문장 찾기' (이름 변경)
UPDATE comprehensive_questions 
SET question_type = '핵심문장 찾기' 
WHERE question_type = '핵심어/핵심문장 찾기';

-- 기타 예상 가능한 이전 유형들 처리
UPDATE comprehensive_questions 
SET question_type = '단답형' 
WHERE question_type IN ('주관식', '주관식 단답형', '단답', '주관식 문제');

UPDATE comprehensive_questions 
SET question_type = '핵심 내용 요약' 
WHERE question_type IN ('요약', '요약하기', '내용 요약', '핵심 요약');

UPDATE comprehensive_questions 
SET question_type = '핵심문장 찾기' 
WHERE question_type IN ('핵심어 찾기', '핵심문장', '중요문장 찾기', '핵심어/문장 찾기');

-- 5단계: 업데이트 후 현재 question_type 값들 재확인
SELECT 
    question_type, 
    COUNT(*) as count
FROM comprehensive_questions 
GROUP BY question_type 
ORDER BY count DESC;

-- 6단계: 허용되지 않는 값이 있다면 기본값으로 설정
-- (위에서 확인한 결과에 따라 필요시 실행)
UPDATE comprehensive_questions 
SET question_type = '단답형' 
WHERE question_type NOT IN ('단답형', '핵심 내용 요약', '핵심문장 찾기', 'OX문제', '자료분석하기');

-- 7단계: 새로운 제약조건 추가
ALTER TABLE comprehensive_questions 
ADD CONSTRAINT comprehensive_questions_question_type_check 
CHECK (question_type IN ('단답형', '핵심 내용 요약', '핵심문장 찾기', 'OX문제', '자료분석하기'));

-- 8단계: 제약조건이 올바르게 추가되었는지 최종 확인
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(c.oid) as constraint_definition
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
WHERE t.relname = 'comprehensive_questions' 
    AND conname LIKE '%question_type%';

-- 9단계: 최종 데이터 확인
SELECT 
    question_type, 
    COUNT(*) as count,
    MIN(created_at) as first_created,
    MAX(created_at) as last_created
FROM comprehensive_questions 
GROUP BY question_type 
ORDER BY count DESC;