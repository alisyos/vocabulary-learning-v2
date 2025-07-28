-- 기존 테이블 확인
SELECT 'system_prompts' as table_name, COUNT(*) as count FROM system_prompts
UNION ALL
SELECT 'system_prompts_v2' as table_name, COUNT(*) as count FROM system_prompts_v2;