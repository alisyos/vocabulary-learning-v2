-- =============================================================================
-- 완전한 프롬프트 데이터 정리 및 재설정 SQL
-- Supabase Dashboard > SQL Editor에서 실행하세요
-- =============================================================================

-- 1. 모든 프롬프트 데이터 삭제
DELETE FROM prompt_history;
DELETE FROM prompt_usage_stats;
DELETE FROM system_prompts_v2;

-- 2. 시퀀스 리셋 (AUTO_INCREMENT 리셋)
-- PostgreSQL에서는 UUID를 사용하므로 불필요하지만, 확실히 하기 위해

-- 3. 테이블 확인
SELECT 'system_prompts_v2' as table_name, COUNT(*) as record_count FROM system_prompts_v2
UNION ALL
SELECT 'prompt_history' as table_name, COUNT(*) as record_count FROM prompt_history
UNION ALL
SELECT 'prompt_usage_stats' as table_name, COUNT(*) as record_count FROM prompt_usage_stats;

-- 4. 제약 조건 확인
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  tc.constraint_type
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name IN ('system_prompts_v2', 'prompt_history', 'prompt_usage_stats')
ORDER BY tc.table_name, tc.constraint_type; 