-- 간단한 삽입 테스트
INSERT INTO content_sets (
    division, grade, subject, area, title, 
    total_passages, total_vocabulary_terms, total_vocabulary_questions, 
    total_paragraph_questions, total_comprehensive_questions
) VALUES (
    '초등학교 중학년(3-4학년)', 
    '3학년', 
    '사회', 
    '일반사회', 
    '테스트',
    1, 0, 0, 1, 0
) RETURNING id;