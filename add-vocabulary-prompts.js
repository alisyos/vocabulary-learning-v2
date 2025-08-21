const { createClient } = require('@supabase/supabase-js');

async function addVocabularyTypePrompts() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const vocabularyPrompts = [
    {
      prompt_id: 'vocabulary-type-multiple-5',
      category: 'vocabulary',
      sub_category: 'vocabularyType',
      name: '5지선다 객관식 문제',
      key: '5지선다 객관식',
      prompt_text: `다음 지문의 어휘 용어들을 바탕으로 5지선다 객관식 문제를 생성하세요.

### 문제 생성 원칙
1. 각 용어마다 1개의 문제를 생성합니다
2. 문제는 용어의 의미를 묻는 형태로 구성합니다
3. 5개의 선택지 중 1개만 정답이고, 나머지 4개는 그럴듯한 오답입니다
4. 학년 수준에 맞는 어휘와 문장을 사용합니다

### 출력 형식 (JSON)
{
  "vocabularyQuestions": [
    {
      "term": "용어명",
      "questionType": "5지선다 객관식",
      "question": "문제 텍스트",
      "options": ["선택지1", "선택지2", "선택지3", "선택지4", "선택지5"],
      "answer": "정답 선택지",
      "explanation": "해설"
    }
  ]
}`,
      description: '5개 선택지를 제공하는 객관식 문제 생성',
      is_active: true,
      is_default: true,
      version: 1,
      created_by: 'system',
      updated_by: 'system'
    },
    {
      prompt_id: 'vocabulary-type-short-initial',
      category: 'vocabulary',
      sub_category: 'vocabularyType',
      name: '단답형 초성 문제',
      key: '단답형 초성 문제',
      prompt_text: `다음 지문의 어휘 용어들을 바탕으로 단답형 초성 문제를 생성하세요.

### 문제 생성 원칙
1. 각 용어마다 1개의 문제를 생성합니다
2. 용어의 정의나 설명을 제시하고 해당 용어를 답하도록 합니다
3. 정답의 초성을 힌트로 제공합니다
4. 학년 수준에 맞는 설명을 사용합니다

### 출력 형식 (JSON)
{
  "vocabularyQuestions": [
    {
      "term": "용어명",
      "questionType": "단답형 초성 문제",
      "question": "문제 텍스트 (초성 힌트 포함)",
      "answer": "정답",
      "answerInitials": "초성힌트 (예: ㅈㄹㅎㅁ)",
      "explanation": "해설"
    }
  ]
}`,
      description: '초성 힌트가 포함된 단답형 문제 생성',
      is_active: true,
      is_default: false,
      version: 1,
      created_by: 'system',
      updated_by: 'system'
    },
    {
      prompt_id: 'vocabulary-type-multiple-2',
      category: 'vocabulary',
      sub_category: 'vocabularyType',
      name: '2개중 선택형 문제',
      key: '2개중 선택형',
      prompt_text: `다음 지문의 어휘 용어들을 바탕으로 2개중 선택형 문제를 생성하세요.

### 문제 생성 원칙
1. 각 용어마다 1개의 문제를 생성합니다
2. 용어의 의미를 묻는 형태로 구성합니다
3. 2개의 선택지 중 1개만 정답이고, 1개는 그럴듯한 오답입니다
4. 학년 수준에 맞는 어휘와 문장을 사용합니다

### 출력 형식 (JSON)
{
  "vocabularyQuestions": [
    {
      "term": "용어명",
      "questionType": "2개중 선택형",
      "question": "문제 텍스트",
      "options": ["선택지1", "선택지2"],
      "answer": "정답 선택지",
      "explanation": "해설"
    }
  ]
}`,
      description: '2개 선택지를 제공하는 선택형 문제 생성',
      is_active: true,
      is_default: false,
      version: 1,
      created_by: 'system',
      updated_by: 'system'
    },
    {
      prompt_id: 'vocabulary-type-multiple-3',
      category: 'vocabulary',
      sub_category: 'vocabularyType',
      name: '3개중 선택형 문제',
      key: '3개중 선택형',
      prompt_text: `다음 지문의 어휘 용어들을 바탕으로 3개중 선택형 문제를 생성하세요.

### 문제 생성 원칙
1. 각 용어마다 1개의 문제를 생성합니다
2. 용어의 의미를 묻는 형태로 구성합니다
3. 3개의 선택지 중 1개만 정답이고, 나머지 2개는 그럴듯한 오답입니다
4. 학년 수준에 맞는 어휘와 문장을 사용합니다

### 출력 형식 (JSON)
{
  "vocabularyQuestions": [
    {
      "term": "용어명",
      "questionType": "3개중 선택형",
      "question": "문제 텍스트",
      "options": ["선택지1", "선택지2", "선택지3"],
      "answer": "정답 선택지",
      "explanation": "해설"
    }
  ]
}`,
      description: '3개 선택지를 제공하는 선택형 문제 생성',
      is_active: true,
      is_default: false,
      version: 1,
      created_by: 'system',
      updated_by: 'system'
    },
    {
      prompt_id: 'vocabulary-type-multiple-4',
      category: 'vocabulary',
      sub_category: 'vocabularyType',
      name: '낱말 골라 쓰기 문제',
      key: '낱말 골라 쓰기',
      prompt_text: `다음 지문의 어휘 용어들을 바탕으로 낱말 골라 쓰기 문제를 생성하세요.

### 문제 생성 원칙
1. 각 용어마다 1개의 문제를 생성합니다
2. 용어의 의미를 묻는 형태로 구성합니다
3. 4개의 선택지 중 1개만 정답이고, 나머지 3개는 그럴듯한 오답입니다
4. 학년 수준에 맞는 어휘와 문장을 사용합니다

### 출력 형식 (JSON)
{
  "vocabularyQuestions": [
    {
      "term": "용어명",
      "questionType": "낱말 골라 쓰기",
      "question": "문제 텍스트",
      "options": ["선택지1", "선택지2", "선택지3", "선택지4"],
      "answer": "정답 선택지",
      "explanation": "해설"
    }
  ]
}`,
      description: '4개 선택지에서 알맞은 낱말을 고르는 문제 생성',
      is_active: true,
      is_default: false,
      version: 1,
      created_by: 'system',
      updated_by: 'system'
    },
    {
      prompt_id: 'vocabulary-type-short-definition',
      category: 'vocabulary',
      sub_category: 'vocabularyType',
      name: '응용형 문장완성 문제',
      key: '응용형 문장완성',
      prompt_text: `다음 지문의 어휘 용어들을 바탕으로 응용형 문장완성 문제를 생성하세요.

### 문제 생성 원칙
1. 각 용어마다 1개의 문제를 생성합니다
2. 용어의 설명에서 핵심 단어를 빼고 문제를 구성합니다
3. 빈 칸에 들어갈 단어가 정답이 됩니다 (용어 자체가 아닌 설명 속 단어)
4. 초성 힌트를 제공합니다
5. 학년 수준에 맞는 문장을 사용합니다

### 출력 형식 (JSON)
{
  "vocabularyQuestions": [
    {
      "term": "용어명",
      "questionType": "응용형 문장완성",
      "question": "용어 설명에서 핵심 단어를 빈칸으로 만든 문제 텍스트",
      "answer": "설명에서 빠진 핵심 단어",
      "answerInitials": "초성힌트 (예: ㅈㄹㅎㅁ)",
      "explanation": "해설"
    }
  ]
}`,
      description: '어휘를 활용한 문장 완성 응용 문제 생성',
      is_active: true,
      is_default: false,
      version: 1,
      created_by: 'system',
      updated_by: 'system'
    }
  ];

  try {
    console.log('🔧 어휘 문제 유형별 프롬프트 추가 시작...');
    
    for (let i = 0; i < vocabularyPrompts.length; i++) {
      const prompt = vocabularyPrompts[i];
      console.log(`[${i + 1}] 추가 중: ${prompt.name}`);
      
      const { data, error } = await supabase
        .from('system_prompts_v3')
        .insert([prompt])
        .select();
      
      if (error) {
        console.error('❌ 추가 실패:', prompt.name, error);
      } else {
        console.log('✅ 추가 성공:', prompt.name);
      }
    }
    
    console.log('');
    console.log('🎯 어휘 문제 유형별 프롬프트 추가 완료!');
    
    // 추가된 결과 확인
    const { data: checkData, error: checkError } = await supabase
      .from('system_prompts_v3')
      .select('*')
      .eq('category', 'vocabulary')
      .eq('sub_category', 'vocabularyType')
      .order('created_at', { ascending: true });
    
    if (checkError) {
      console.error('❌ 확인 실패:', checkError);
    } else {
      console.log('');
      console.log('📋 추가된 어휘 문제 유형별 프롬프트 확인:');
      console.log('총', checkData?.length || 0, '개');
      checkData?.forEach((prompt, index) => {
        console.log(`[${index + 1}] ${prompt.name} (${prompt.key})`);
      });
    }
    
  } catch (err) {
    console.error('❌ 스크립트 오류:', err);
  }
}

// 실행
addVocabularyTypePrompts();