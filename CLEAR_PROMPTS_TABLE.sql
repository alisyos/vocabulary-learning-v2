-- =============================================================================
-- 잘못된 프롬프트 데이터 정리 SQL
-- Supabase Dashboard > SQL Editor에서 실행하세요
-- =============================================================================

-- 기존 잘못된 데이터 삭제
DELETE FROM system_prompts_v2;

-- 테이블 확인
SELECT COUNT(*) as remaining_records FROM system_prompts_v2;

-- 테이블 구조 확인
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'system_prompts_v2' 
ORDER BY ordinal_position; 