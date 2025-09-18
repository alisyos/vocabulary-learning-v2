-- =============================================================================
-- 어절 순서 맞추기 프롬프트 초기화
-- 기존 DB에 저장된 프롬프트를 삭제하여 하드코딩된 새 버전을 사용하도록 함
-- =============================================================================

-- 1. 현재 저장된 어절 순서 맞추기 프롬프트 확인
SELECT 
    prompt_id,
    category,
    sub_category,
    name,
    key,
    LEFT(prompt_text, 100) as prompt_preview,
    version,
    updated_at
FROM system_prompts_v3
WHERE category = 'paragraph' 
    AND sub_category = 'paragraphType'
    AND key = 'type_order';

-- 2. 어절 순서 맞추기 프롬프트 삭제 (두 가지 prompt_id 모두 삭제)
DELETE FROM system_prompts_v3
WHERE (category = 'paragraph' 
    AND sub_category = 'paragraphType'
    AND key = 'type_order')
    OR prompt_id = 'paragraph-type-order';

-- 3. 다시 확인
SELECT 
    prompt_id,
    category,
    sub_category,
    name,
    key,
    LEFT(prompt_text, 100) as prompt_preview
FROM system_prompts_v3
WHERE prompt_id = 'paragraph-type-order'
    OR (category = 'paragraph' AND key = 'type_order');

-- 4. 삭제 확인
SELECT 
    '✅ 어절 순서 맞추기 프롬프트가 삭제되었습니다.' as message,
    '이제 하드코딩된 새 버전(주관식)이 사용됩니다.' as detail,
    NOW() as completed_at;

-- 5. 옵션: 모든 문단 문제 프롬프트 삭제 (필요한 경우)
-- DELETE FROM system_prompts_v3
-- WHERE category = 'paragraph';