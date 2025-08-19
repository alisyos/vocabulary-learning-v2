const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function updateSimplifiedSystemPrompt() {
  console.log('🔧 어휘 시스템 프롬프트 간소화 업데이트 시작...');
  
  // 간소화된 시스템 프롬프트 - 공통 부분만 포함
  const simplifiedSystemPrompt = `###지시사항
주어진 용어에 대한 어휘 문제를 1개 생성하십시오.
- 용어의 정의, 의미, 사용법을 정확히 이해하고 있는지 평가하는 문제를 생성합니다.
- 지문의 맥락을 고려하여 용어의 구체적 의미를 묻는 문제를 만듭니다.
- 요청된 특정 문제 유형에 맞는 형식으로 생성합니다.

###대상 용어
**용어명**: {termName}
**용어 설명**: {termDescription}

###지문 맥락
{passage}

###구분 (난이도 조절)
{divisionPrompt}

###문제 유형 및 출력 형식
{questionTypePrompt}

###공통 주의사항
- 요청된 문제 유형에 정확히 맞는 JSON 형식으로 출력하십시오.
- 학년별 어휘 수준에 맞는 용어와 설명을 사용하십시오.
- 정답과 해설은 용어의 정확한 의미에 근거해야 합니다.
- 객관식의 경우 오답 선택지도 그럴듯하게 구성하여 변별력을 높이십시오.
- 단답형의 경우 초성 힌트를 정확히 제공하십시오.
- 모든 문제는 지문의 맥락을 고려하여 생성하십시오.`;

  try {
    const { error } = await supabase
      .from('system_prompts_v3')
      .update({
        prompt_text: simplifiedSystemPrompt,
        updated_at: new Date().toISOString(),
        updated_by: 'system'
      })
      .eq('category', 'vocabulary')
      .eq('sub_category', 'vocabularySystem')
      .eq('key', 'system_base');
    
    if (error) {
      console.error('❌ 업데이트 실패:', error);
      return;
    }
    
    console.log('✅ 어휘 시스템 프롬프트 간소화 완료!');
    console.log('📏 새 프롬프트 길이:', simplifiedSystemPrompt.length + '자');
    console.log('📉 길이 변화:', '2528자 → ' + simplifiedSystemPrompt.length + '자 (약 ' + Math.round((2528 - simplifiedSystemPrompt.length) / 2528 * 100) + '% 감소)');
    console.log('');
    console.log('🔍 간소화 내용:');
    console.log('  ❌ 제거됨: 모든 문제 유형의 개별 출력 형식');
    console.log('  ❌ 제거됨: 문제 유형별 세부 가이드라인');
    console.log('  ✅ 유지됨: 공통 지시사항 및 변수 템플릿');
    console.log('  ✅ 유지됨: {questionTypePrompt} 변수를 통한 유형별 프롬프트 삽입');
    console.log('');
    console.log('🎯 이제 개별 문제 유형별 프롬프트가 중복 없이 적용됩니다!');
    
  } catch (err) {
    console.error('❌ 스크립트 오류:', err);
  }
}

updateSimplifiedSystemPrompt();