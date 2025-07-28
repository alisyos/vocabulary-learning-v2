-- 기존 프롬프트 데이터 모두 삭제
DELETE FROM system_prompts_v2;

-- 시퀀스 리셋 (있다면)
-- ALTER SEQUENCE system_prompts_v2_id_seq RESTART WITH 1;