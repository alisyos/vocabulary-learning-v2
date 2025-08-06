async function fullMigration() {
  console.log('🚀 전체 프롬프트 마이그레이션 시작...');
  
  try {
    // 마이그레이션 API 호출
    const response = await fetch('http://localhost:3000/api/prompts/initialize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        forceReset: true // 기존 데이터가 있어도 강제로 덮어쓰기
      })
    });
    
    const result = await response.json();
    
    console.log('📊 마이그레이션 결과:');
    console.log(`  상태: ${response.status}`);
    console.log(`  성공: ${result.success}`);
    console.log(`  메시지: ${result.message}`);
    console.log(`  처리된 프롬프트 수: ${result.count || '알 수 없음'}`);
    
    if (result.success) {
      // 결과 검증
      const { createClient } = require('@supabase/supabase-js');
      require('dotenv').config({ path: '.env.local' });

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // 문단 문제 유형들 확인
      const { data: paragraphTypes, error } = await supabase
        .from('system_prompts_v3')
        .select('*')
        .eq('category', 'paragraph')
        .eq('sub_category', 'paragraphType')
        .order('name');
      
      if (paragraphTypes) {
        console.log('\n📋 문단 문제 유형 프롬프트 확인:');
        paragraphTypes.forEach(prompt => {
          console.log(`  ✅ ${prompt.name} (${prompt.key})`);
        });
        
        // 특별히 OX문제와 어절 순서 맞추기 확인
        const oxPrompt = paragraphTypes.find(p => p.key === 'type_ox');
        const orderPrompt = paragraphTypes.find(p => p.key === 'type_order');
        
        console.log('\n🔍 핵심 프롬프트 상세 확인:');
        if (oxPrompt) {
          console.log(`  ✅ OX문제 프롬프트 존재: ${oxPrompt.name}`);
        } else {
          console.log('  ❌ OX문제 프롬프트 없음');
        }
        
        if (orderPrompt) {
          console.log(`  ✅ 어절 순서 맞추기 프롬프트 존재: ${orderPrompt.name}`);
          if (orderPrompt.prompt_text.includes('wordSegments')) {
            console.log('      → 새로운 주관식 형태 확인됨');
          } else {
            console.log('      → 이전 객관식 형태');
          }
        } else {
          console.log('  ❌ 어절 순서 맞추기 프롬프트 없음');
        }
      }
      
      // 전체 통계
      const { data: allPrompts } = await supabase
        .from('system_prompts_v3')
        .select('category')
        .eq('is_active', true);
      
      if (allPrompts) {
        const categories = {};
        allPrompts.forEach(p => {
          categories[p.category] = (categories[p.category] || 0) + 1;
        });
        
        console.log('\n📊 카테고리별 프롬프트 통계:');
        Object.entries(categories).forEach(([cat, count]) => {
          console.log(`  ${cat}: ${count}개`);
        });
        
        console.log(`\n🎉 총 ${allPrompts.length}개의 프롬프트가 성공적으로 마이그레이션되었습니다!`);
      }
    } else {
      console.log('❌ 마이그레이션 실패:', result.error);
    }
    
  } catch (error) {
    console.log('❌ 마이그레이션 중 오류:', error.message);
  }
}

fullMigration().catch(console.error);