-- =============================================================================
-- RLS(Row Level Security) 문제 해결을 위한 SQL 스크립트
-- paragraph_questions 테이블의 RLS를 다른 테이블과 동일하게 비활성화
-- Supabase Dashboard > SQL Editor에서 실행하세요
-- =============================================================================

-- 1. 현재 모든 테이블의 RLS 상태 확인
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN (
    'content_sets', 
    'passages', 
    'vocabulary_terms', 
    'vocabulary_questions', 
    'comprehensive_questions', 
    'paragraph_questions',
    'ai_generation_logs',
    'system_prompts_v3'
)
ORDER BY tablename;

-- 2. paragraph_questions 테이블의 기존 RLS 정책 모두 삭제
DROP POLICY IF EXISTS "Enable read access for all users" ON paragraph_questions;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON paragraph_questions;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON paragraph_questions;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON paragraph_questions;

-- 3. paragraph_questions 테이블의 RLS 비활성화 (다른 테이블들과 동일하게)
ALTER TABLE paragraph_questions DISABLE ROW LEVEL SECURITY;

-- 4. 모든 테이블에 대한 기본 권한 부여 (안전장치)
GRANT ALL ON paragraph_questions TO authenticated;
GRANT ALL ON paragraph_questions TO anon;

-- 5. 변경사항 최종 확인
SELECT 
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity = false THEN '✅ RLS 비활성화됨 (정상)'
        ELSE '❌ RLS 활성화됨 (문제 가능성)'
    END as status
FROM pg_tables 
WHERE tablename IN (
    'content_sets', 
    'passages', 
    'vocabulary_terms', 
    'vocabulary_questions', 
    'comprehensive_questions', 
    'paragraph_questions',
    'ai_generation_logs',
    'system_prompts_v3'
)
ORDER BY tablename;

-- 6. paragraph_questions 테이블 권한 확인
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_name = 'paragraph_questions'
ORDER BY grantee, privilege_type;

-- 완료 메시지
SELECT 
    '🎉 RLS 문제가 해결되었습니다!' as message,
    'paragraph_questions 테이블이 다른 테이블들과 동일한 보안 설정을 가지게 되었습니다.' as description,
    NOW() as completed_at;