const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tpcdttyywwcnuyjwsxqe.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwY2R0dHl5d3djbnV5andzeHFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU4MjQwNTQsImV4cCI6MjA1MTQwMDA1NH0.CFHG4a3E6WowENXFwqsLwi-o8xNp0ZKjPNZ5R7RHSMw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log('🔥 완전 초기화 시작...');
  
  try {
    // 모든 테이블 완전 삭제
    console.log('🗑️ system_prompts 테이블 삭제...');
    const { error: error1 } = await supabase
      .from('system_prompts')
      .delete()
      .gte('id', '0'); // 모든 데이터 삭제
    
    console.log('🗑️ system_prompts_v2 테이블 삭제...');
    const { error: error2 } = await supabase
      .from('system_prompts_v2')
      .delete()
      .gte('id', '0'); // 모든 데이터 삭제
    
    if (error1) console.error('system_prompts 삭제 오류:', error1);
    if (error2) console.error('system_prompts_v2 삭제 오류:', error2);
    
    console.log('✅ 데이터베이스 완전 정리 완료');
    
    // 상태 확인
    const { data: check1, count: count1 } = await supabase
      .from('system_prompts')
      .select('*', { count: 'exact' });
    
    const { data: check2, count: count2 } = await supabase
      .from('system_prompts_v2')
      .select('*', { count: 'exact' });
    
    console.log(`✨ 정리 후 상태: system_prompts=${count1}개, system_prompts_v2=${count2}개`);
    
  } catch (error) {
    console.error('완전 초기화 실패:', error);
  }
}

main().catch(console.error);