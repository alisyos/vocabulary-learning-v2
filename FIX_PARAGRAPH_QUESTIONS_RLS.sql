-- =============================================================================
-- paragraph_questions 테이블 RLS 문제 해결을 위한 SQL 스크립트
-- Supabase Dashboard > SQL Editor에서 실행하세요
-- =============================================================================

-- 1. 현재 RLS 정책 확인
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'paragraph_questions';

-- 2. 기존 RLS 정책 모두 삭제
DROP POLICY IF EXISTS "Enable read access for all users" ON paragraph_questions;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON paragraph_questions;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON paragraph_questions;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON paragraph_questions;

-- 3. RLS 비활성화 (다른 테이블들과 동일하게)
ALTER TABLE paragraph_questions DISABLE ROW LEVEL SECURITY;

-- 4. 변경사항 확인
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('content_sets', 'passages', 'vocabulary_terms', 'vocabulary_questions', 'comprehensive_questions', 'paragraph_questions');

-- 5. 테이블에 대한 기본 권한 확인
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_name = 'paragraph_questions';

-- 완료 메시지
SELECT 
    '✅ paragraph_questions 테이블 RLS가 비활성화되었습니다!' as message,
    '다른 테이블들과 동일한 보안 설정이 적용되었습니다.' as description,
    NOW() as completed_at;