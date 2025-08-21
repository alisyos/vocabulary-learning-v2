const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function updateVocabularySystemPrompt() {
  const newSystemPrompt = `###지시사항
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

###문제 유형
요청된 문제 유형에 따라 해당 형식으로 생성하십시오:
{questionTypePrompt}

###출력 형식
요청된 문제 유형에 따라 다음과 같은 JSON 형식으로 출력하십시오:

**5지선다 객관식:**
{
  "type": "5지선다 객관식",
  "question": "'{termName}'의 뜻으로 가장 적절한 것은?",
  "options": [
    "정답 선택지",
    "오답 선택지 1", 
    "오답 선택지 2",
    "오답 선택지 3",
    "오답 선택지 4"
  ],
  "answer": "1",
  "explanation": "'{termName}'는 {정확한 정의}를 의미합니다."
}

**2개중 선택형/3개중 선택형/낱말 골라 쓰기 객관식:**
{
  "type": "요청된 유형명",
  "question": "'{termName}'의 뜻으로 가장 적절한 것은?",
  "options": [
    "정답 선택지",
    "오답 선택지들..."
  ],
  "answer": "1",
  "explanation": "'{termName}'는 {정확한 정의}를 의미합니다."
}

**단답형 초성 문제:**
{
  "type": "단답형 초성 문제",
  "question": "다음 설명에 해당하는 용어를 쓰시오.\\n\\n{termDescription}\\n\\n초성 힌트: {초성}",
  "answer": "{termName}",
  "answerInitials": "{초성 힌트}",
  "explanation": "'{termName}'는 {정확한 정의}를 의미합니다."
}

**응용형 문장완성:**
{
  "type": "응용형 문장완성",
  "question": "'{termName}'의 뜻을 간단히 설명하시오.",
  "answer": "{termDescription의 핵심 내용}",
  "answerInitials": "{정답의 초성}",
  "explanation": "'{termName}'는 {정확한 정의}를 의미합니다."
}

###문제 유형별 세부 가이드라인

**5지선다 객관식 상세 지침:**
1. 질문 구성:
   - 반드시 "'{용어}'의 뜻으로 가장 적절한 것은?" 형식 사용
   - 용어명을 따옴표로 감싸기

2. 선택지 구성 (5개):
   - 정답: 용어의 정확한 정의 (간결하고 명확하게)
   - 오답 1: 비슷하지만 미묘하게 다른 의미
   - 오답 2: 관련 있지만 틀린 개념
   - 오답 3: 일반적인 오해나 혼동 가능한 내용
   - 오답 4: 명백히 틀렸지만 그럴듯한 내용

3. 해설:
   - "'{용어}'는 {정확한 정의}를 의미합니다." 형식 사용

**2개중 선택형/3개중 선택형/낱말 골라 쓰기 상세 지침:**
1. 질문 구성: 5지선다와 동일
2. 선택지 구성: 요청된 개수에 맞춰 구성
   - 2개중 선택형: 정답 + 가장 혼동하기 쉬운 오답 1개
   - 3개중 선택형: 정답 + 오답 2개 (비슷한 의미 + 관련 개념)
   - 낱말 골라 쓰기: 정답 + 오답 3개 (비슷한 의미 + 관련 개념 + 혼동 가능한 내용)

**단답형 초성 문제 상세 지침:**
1. 질문 구성:
   - "다음 설명에 해당하는 용어를 쓰시오." 형식 사용
   - 용어의 정의나 설명을 제시
   - 초성 힌트 제공 (예: ㅂㅇㅊ)

2. 답안 구성:
   - answer: 정확한 용어명
   - answerInitials: 초성 힌트 (한글 초성으로만 구성)

3. 초성 힌트 생성 규칙:
   - 용어의 각 글자에서 초성만 추출
   - 예: "병원체" → "ㅂㅇㅊ"
   - 예: "감염병" → "ㄱㅇㅂ"

**응용형 문장완성 상세 지침:**
1. 질문 구성:
   - "'{용어}'의 뜻을 간단히 설명하시오." 형식 사용
   - 용어명을 제시하고 그 뜻을 묻는 형식

2. 답안 구성:
   - answer: 용어의 핵심적인 정의 (1-2문장으로 간결하게)
   - answerInitials: 답안의 주요 키워드들의 초성

3. 답안 작성 원칙:
   - 학년 수준에 맞는 쉬운 언어로 설명
   - 핵심 개념을 명확히 포함
   - 너무 길지 않게 1-2문장으로 구성

###공통 주의사항
- 요청된 문제 유형에 정확히 맞는 JSON 형식으로 출력하십시오.
- 학년별 어휘 수준에 맞는 용어와 설명을 사용하십시오.
- 정답과 해설은 용어의 정확한 의미에 근거해야 합니다.
- 객관식의 경우 오답 선택지도 그럴듯하게 구성하여 변별력을 높이십시오.
- 단답형의 경우 초성 힌트를 정확히 제공하십시오.
- 모든 문제는 지문의 맥락을 고려하여 생성하십시오.`;

  try {
    console.log('🔧 어휘 시스템 프롬프트 업데이트 시작...');
    
    const { data, error } = await supabase
      .from('system_prompts_v3')
      .update({
        prompt_text: newSystemPrompt,
        updated_at: new Date().toISOString(),
        updated_by: 'system'
      })
      .eq('category', 'vocabulary')
      .eq('sub_category', 'vocabularySystem')
      .eq('key', 'system_base');
    
    if (error) {
      console.error('❌ 업데이트 실패:', error);
    } else {
      console.log('✅ 어휘 시스템 프롬프트 업데이트 성공');
      console.log('📏 새 프롬프트 길이:', newSystemPrompt.length, '자');
      
      // 업데이트 결과 확인
      const { data: updated, error: checkError } = await supabase
        .from('system_prompts_v3')
        .select('*')
        .eq('category', 'vocabulary')
        .eq('sub_category', 'vocabularySystem')
        .eq('key', 'system_base')
        .single();
      
      if (!checkError && updated) {
        console.log('');
        console.log('✅ 업데이트 확인 완료');
        console.log('  - 업데이트 시간:', updated.updated_at);
        console.log('  - 6가지 문제 유형 지원:');
        console.log('    • 5지선다 객관식:', updated.prompt_text.includes('5지선다 객관식') ? '✅' : '❌');
        console.log('    • 2개중 선택형/3개중 선택형/낱말 골라 쓰기:', updated.prompt_text.includes('2지선다/3지선다/4지선다') ? '✅' : '❌');
        console.log('    • 단답형 초성 문제:', updated.prompt_text.includes('단답형 초성 문제') ? '✅' : '❌');
        console.log('    • 응용형 문장완성:', updated.prompt_text.includes('단답형 설명 문제') ? '✅' : '❌');
        
        console.log('');
        console.log('🎯 주요 개선 사항:');
        console.log('  ✅ 기존 랜덤 추출 방식 → 특정 유형 지정 방식으로 변경');
        console.log('  ✅ 2가지 유형 → 6가지 유형으로 확장');
        console.log('  ✅ 객관식 선택지 개수 유연성 제공 (2~5개)');
        console.log('  ✅ 단답형 문제에 초성 힌트 기능 추가');
        console.log('  ✅ {questionTypePrompt} 변수로 동적 프롬프트 지원');
      }
    }
    
  } catch (err) {
    console.error('❌ 스크립트 오류:', err);
  }
}

updateVocabularySystemPrompt();