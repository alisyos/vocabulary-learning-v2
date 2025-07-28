-- =============================================================================
-- 4단계: 실제 삽입 테스트
-- =============================================================================

-- 먼저 테스트용 content_set 생성
INSERT INTO content_sets (
    division, grade, subject, area, title, 
    total_passages, total_vocabulary_terms, total_vocabulary_questions, 
    total_paragraph_questions, total_comprehensive_questions
) VALUES (
    '초등학교 중학년(3-4학년)', '3학년', '사회', '일반사회', '🧪 테스트 ' || NOW(),
    1, 0, 0, 1, 0
) RETURNING id, title;

-- 위 쿼리를 실행하고 나온 ID를 복사해서 아래 쿼리의 'YOUR_ID_HERE' 부분에 붙여넣으세요