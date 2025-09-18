async function verifyParagraphTypes() {
  console.log('🔍 프롬프트 API에서 문단 문제 유형 확인...');
  
  try {
    const response = await fetch('http://localhost:3000/api/prompts');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.success && data.data) {
      const paragraphGroup = data.data.find(group => group.category === 'paragraph');
      
      if (paragraphGroup) {
        console.log('📋 문단 문제 생성 카테고리 발견');
        console.log(`   카테고리명: ${paragraphGroup.categoryName}`);
        
        const typeSubCategory = paragraphGroup.subCategories?.find(sub => sub.subCategory === 'paragraphType');
        if (typeSubCategory) {
          console.log(`\n📝 ${typeSubCategory.subCategoryName} 서브카테고리:`);
          console.log(`   총 ${typeSubCategory.prompts?.length || 0}개의 문제 유형`);
          
          const expectedTypes = [
            { key: 'type_blank', name: '빈칸 채우기' },
            { key: 'type_short_answer', name: '주관식 단답형' },
            { key: 'type_order', name: '어절 순서 맞추기' },
            { key: 'type_ox', name: 'OX문제' }
          ];
          
          console.log('\n✅ 확인된 문제 유형들:');
          expectedTypes.forEach(expected => {
            const found = typeSubCategory.prompts?.find(p => p.key === expected.key);
            if (found) {
              console.log(`   ✅ ${found.name} (${found.key})`);
            } else {
              console.log(`   ❌ ${expected.name} (${expected.key}) - 없음`);
            }
          });
          
          // 어절 순서 맞추기 프롬프트 내용 확인
          const orderPrompt = typeSubCategory.prompts?.find(p => p.key === 'type_order');
          if (orderPrompt) {
            console.log('\n🎯 어절 순서 맞추기 프롬프트 상세:');
            if (orderPrompt.promptText.includes('wordSegments')) {
              console.log('   ✅ 새로운 주관식 형태 (wordSegments) 확인됨');
            } else {
              console.log('   ❌ 이전 객관식 형태 (options) 유지됨');
            }
          }
          
        } else {
          console.log('❌ paragraphType 서브카테고리를 찾을 수 없음');
        }
      } else {
        console.log('❌ paragraph 카테고리를 찾을 수 없음');
      }
    } else {
      console.log('❌ API 응답 오류:', data.error);
    }
    
  } catch (error) {
    console.log('❌ 검증 중 오류:', error.message);
  }
}

verifyParagraphTypes().catch(console.error);