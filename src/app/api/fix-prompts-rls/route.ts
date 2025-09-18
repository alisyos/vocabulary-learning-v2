import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // 테이블 정보 확인 SQL
  const checkTableSQL = `
-- 1. 테이블 구조 확인
\\d system_prompts_v3

-- 2. 시퀀스 목록 확인
SELECT 
    schemaname,
    sequencename,
    last_value,
    start_value,
    increment_by,
    max_value,
    min_value,
    cache_value,
    is_cycled,
    is_called
FROM pg_sequences 
WHERE sequencename LIKE '%system_prompts_v3%' OR sequencename LIKE '%prompts%';

-- 3. 테이블과 연결된 시퀀스 확인
SELECT 
    t.table_name,
    c.column_name,
    c.column_default
FROM information_schema.tables t
JOIN information_schema.columns c ON c.table_name = t.table_name
WHERE t.table_name = 'system_prompts_v3'
AND c.column_default LIKE 'nextval%';

-- 4. RLS 상태 확인
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'system_prompts_v3';
  `;

  // system_prompts_v3 테이블의 RLS 정책 생성 SQL (수정됨)
  const fixRLSSQL = `
-- Step 1: RLS를 완전히 비활성화 (가장 간단하고 확실한 방법)
ALTER TABLE system_prompts_v3 DISABLE ROW LEVEL SECURITY;

-- Step 2: 테이블 권한 재설정
GRANT ALL ON system_prompts_v3 TO anon;
GRANT ALL ON system_prompts_v3 TO authenticated;
GRANT ALL ON system_prompts_v3 TO service_role;

-- Step 3: 시퀀스 권한 설정 (실제 시퀀스 이름에 맞게 수정 필요)
-- 아래 명령들은 실제 시퀀스 이름이 확인된 후 실행하세요
-- 일반적인 시퀀스 이름들:
-- GRANT USAGE, SELECT ON SEQUENCE system_prompts_v3_id_seq TO anon, authenticated, service_role;
-- 또는
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
  `;

  const testSQL = `
-- 테스트: 간단한 INSERT 시도
INSERT INTO system_prompts_v3 (
  prompt_id, category, sub_category, name, key, prompt_text, 
  description, is_active, is_default, version, created_by, updated_by
) VALUES (
  'test-prompt-123', 'test', 'test', 'Test Prompt', 'test_key', 
  'This is a test prompt for checking RLS policies.',
  'Test description', true, false, 1, 'test_user', 'test_user'
) ON CONFLICT (prompt_id) DO UPDATE SET
  prompt_text = EXCLUDED.prompt_text,
  updated_at = CURRENT_TIMESTAMP;

-- 테스트 데이터 삭제
DELETE FROM system_prompts_v3 WHERE prompt_id = 'test-prompt-123';
  `;

  return NextResponse.json({
    success: true,
    message: 'system_prompts_v3 테이블의 RLS 문제 해결 SQL이 준비되었습니다.',
    problem: 'Row Level Security (RLS) 정책으로 인해 데이터 삽입/업데이트가 차단되고 있습니다.',
    solution: 'RLS를 비활성화하거나 적절한 정책을 생성해야 합니다.',
    instructions: [
      '1. Supabase 대시보드에 로그인하세요.',
      '2. SQL Editor로 이동하세요.',
      '3. 아래 fixRLSSQL을 복사하여 실행하세요.',
      '4. (선택사항) testSQL로 정상 작동하는지 테스트하세요.',
      '5. 프롬프트 관리 페이지에서 다시 업데이트를 시도하세요.'
    ],
    sql: {
      fixRLS: fixRLSSQL,
      test: testSQL
    },
    alternatives: [
      'Option 1 (권장): RLS를 완전히 비활성화 - 간단하고 확실한 방법',
      'Option 2: RLS 정책 생성 - 보안을 유지하면서 접근 허용'
    ]
  });
}

export async function POST(request: NextRequest) {
  return NextResponse.json({
    success: false,
    message: 'RLS 정책은 직접 Supabase 대시보드에서 설정해야 합니다.',
    reason: '보안상의 이유로 애플리케이션에서 직접 RLS 정책을 변경할 수 없습니다.',
    action: 'GET 요청으로 SQL을 받아 Supabase 대시보드에서 실행하세요.'
  });
}