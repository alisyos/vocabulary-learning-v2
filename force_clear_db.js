const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tpcdttyywwcnuyjwsxqe.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwY2R0dHl5d3djbnV5andzeHFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU4MjQwNTQsImV4cCI6MjA1MTQwMDA1NH0.CFHG4a3E6WowENXFwqsLwi-o8xNp0ZKjPNZ5R7RHSMw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log('🔍 데이터베이스 상태 확인...');
  
  // system_prompts 테이블 확인
  const { data: oldData, count: oldCount } = await supabase
    .from('system_prompts')
    .select('*', { count: 'exact' });
  
  // system_prompts_v2 테이블 확인
  const { data: newData, count: newCount } = await supabase
    .from('system_prompts_v2')
    .select('*', { count: 'exact' });
  
  console.log(`system_prompts: ${oldCount}개`);
  console.log(`system_prompts_v2: ${newCount}개`);
  
  if (oldCount > 0) {
    console.log('🗑️ system_prompts 테이블 데이터 삭제 중...');
    const { error } = await supabase
      .from('system_prompts')
      .delete()
      .neq('id', 'dummy');
    if (error) console.error('삭제 실패:', error);
    else console.log('✅ system_prompts 삭제 완료');
  }
  
  if (newCount > 0) {
    console.log('🗑️ system_prompts_v2 테이블 데이터 삭제 중...');
    const { error } = await supabase
      .from('system_prompts_v2')
      .delete()
      .neq('id', 'dummy');
    if (error) console.error('삭제 실패:', error);
    else console.log('✅ system_prompts_v2 삭제 완료');
  }
  
  console.log('🚀 새로운 프롬프트 초기화 중...');
  // 초기화 API 호출
  const response = await fetch('http://localhost:3000/api/prompts/initialize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ forceReset: true })
  });
  
  const result = await response.json();
  console.log('초기화 결과:', result);
}

main().catch(console.error);