-- =============================================================================
-- 프롬프트 디버깅 - 모든 어절 순서 맞추기 관련 프롬프트 찾기
-- =============================================================================

-- 1. system_prompts_v3 테이블에서 모든 어절 순서 맞추기 관련 프롬프트 확인
SELECT 
    'system_prompts_v3' as table_name,
    prompt_id,
    category,
    sub_category,
    name,
    key,
    LEFT(prompt_text, 200) as prompt_preview,
    version,
    is_active,
    updated_at
FROM system_prompts_v3
WHERE prompt_text LIKE '%어절%순서%맞추기%'
    OR prompt_id LIKE '%order%'
    OR name LIKE '%어절%'
    OR key = 'type_order';

-- 2. 레거시 system_prompts 테이블도 확인 (있다면)
SELECT 
    'system_prompts (legacy)' as table_name,
    id,
    prompt_type,
    LEFT(prompt_content, 200) as prompt_preview,
    version,
    is_active,
    updated_at
FROM system_prompts
WHERE prompt_content LIKE '%어절%순서%맞추기%'
    OR prompt_type LIKE '%paragraph%'
LIMIT 10;

-- 3. 모든 문단 관련 프롬프트 확인
SELECT 
    'All paragraph prompts' as info,
    prompt_id,
    name,
    key,
    LEFT(prompt_text, 100) as preview
FROM system_prompts_v3
WHERE category = 'paragraph'
ORDER BY sub_category, name;