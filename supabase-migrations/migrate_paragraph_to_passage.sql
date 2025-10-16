-- =====================================================
-- 지문 문제 텍스트 마이그레이션: "문단" → "지문"
-- =====================================================
-- 작성일: 2025-01-29
-- 목적: paragraph_questions 테이블의 question 필드에서 "문단"을 "지문"으로 일괄 변경
--
-- 실행 방법:
-- 1. Supabase 대시보드 > SQL Editor 접속
-- 2. 이 스크립트 전체를 복사하여 붙여넣기
-- 3. Run 버튼 클릭
--
-- 주의사항:
-- - 이 작업은 되돌릴 수 없으므로 실행 전 백업 권장
-- - 먼저 SELECT 쿼리로 변경될 내용을 확인한 후 UPDATE 실행
-- =====================================================

-- 1단계: 현재 상태 확인 (변경 전)
-- "문단"이 포함된 문제와 해설을 확인합니다.
SELECT
  id,
  question_number,
  content_set_id,
  question_text as original_question,
  REPLACE(question_text, '문단', '지문') as updated_question,
  explanation as original_explanation,
  REPLACE(explanation, '문단', '지문') as updated_explanation,
  CASE
    WHEN question_text LIKE '%문단%' OR explanation LIKE '%문단%' THEN '변경됨'
    ELSE '변경없음'
  END as status
FROM paragraph_questions
WHERE question_text LIKE '%문단%' OR explanation LIKE '%문단%'
ORDER BY created_at DESC
LIMIT 20;

-- 위 쿼리 결과를 확인하고, 변경 내용이 올바른지 검토하세요.
-- 문제가 없다면 아래 주석을 해제하고 실제 UPDATE를 실행하세요.

-- =====================================================
-- 2단계: 실제 업데이트 수행
-- 아래 주석을 해제하고 실행하세요
-- =====================================================

/*
-- 백업 테이블 생성 (선택사항, 안전을 위해)
CREATE TABLE IF NOT EXISTS paragraph_questions_backup_20250129 AS
SELECT * FROM paragraph_questions
WHERE question_text LIKE '%문단%' OR explanation LIKE '%문단%';

-- 실제 업데이트 실행 (question_text와 explanation 모두 업데이트)
UPDATE paragraph_questions
SET
  question_text = REPLACE(question_text, '문단', '지문'),
  explanation = REPLACE(explanation, '문단', '지문')
WHERE question_text LIKE '%문단%' OR explanation LIKE '%문단%';

-- 업데이트 결과 확인
SELECT
  COUNT(*) as total_updated,
  'Updated successfully' as message
FROM paragraph_questions
WHERE updated_at > NOW() - INTERVAL '5 minutes';
*/

-- =====================================================
-- 3단계: 업데이트 후 검증 (UPDATE 실행 후 확인)
-- =====================================================

/*
-- 업데이트된 문제들 확인
SELECT
  id,
  question_number,
  question_text,
  explanation,
  updated_at
FROM paragraph_questions
WHERE updated_at > NOW() - INTERVAL '10 minutes'
ORDER BY updated_at DESC
LIMIT 20;

-- "문단"이 여전히 남아있는지 확인 (결과가 0이어야 함)
SELECT
  COUNT(*) as remaining_with_문단,
  COUNT(CASE WHEN question_text LIKE '%문단%' THEN 1 END) as in_question,
  COUNT(CASE WHEN explanation LIKE '%문단%' THEN 1 END) as in_explanation
FROM paragraph_questions
WHERE question_text LIKE '%문단%' OR explanation LIKE '%문단%';
*/

-- =====================================================
-- 참고: 변경 통계 쿼리
-- =====================================================

/*
-- 변경된 레코드 수 확인
SELECT
  COUNT(DISTINCT id) as total_records_changed
FROM paragraph_questions
WHERE updated_at > NOW() - INTERVAL '10 minutes';

-- 백업 테이블과 비교 (문제와 해설 모두)
SELECT
  'Before' as status,
  COUNT(*) as total_count,
  COUNT(CASE WHEN question_text LIKE '%문단%' THEN 1 END) as question_with_문단,
  COUNT(CASE WHEN explanation LIKE '%문단%' THEN 1 END) as explanation_with_문단
FROM paragraph_questions_backup_20250129
UNION ALL
SELECT
  'After' as status,
  COUNT(*) as total_count,
  COUNT(CASE WHEN question_text LIKE '%지문%' THEN 1 END) as question_with_지문,
  COUNT(CASE WHEN explanation LIKE '%지문%' THEN 1 END) as explanation_with_지문
FROM paragraph_questions
WHERE id IN (SELECT id FROM paragraph_questions_backup_20250129);
*/
