import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// 새로운 문단 문제 유형별 프롬프트 데이터
const NEW_PARAGRAPH_PROMPTS = [
  // 기존 유의어, 반의어, 문단요약 프롬프트 삭제하고 새로운 유형 추가
  {
    prompt_id: 'paragraph-type-blank',
    category: 'paragraph',
    sub_category: 'paragraphType',
    name: '빈칸 채우기',
    key: 'type_blank',
    prompt_text: `빈칸 채우기: 문단의 핵심 문장에서 중요한 단어나 구를 빈칸으로 처리하고, 문맥에 맞는 적절한 답을 고르는 문제입니다.

출력 형식:
{
  "type": "빈칸 채우기",
  "question": "다음 빈칸에 들어갈 말로 가장 적절한 것은?\\n\\n[빈칸이 포함된 문장]",
  "options": [
    "첫 번째 선택지",
    "두 번째 선택지",
    "세 번째 선택지",
    "네 번째 선택지",
    "다섯 번째 선택지"
  ],
  "answer": "정답 번호",
  "explanation": "정답인 이유와 문맥 설명"
}`,
    description: '빈칸 채우기 문제 형식',
    is_active: true,
    is_default: false,
    version: 1
  },
  {
    prompt_id: 'paragraph-type-short-answer',
    category: 'paragraph',
    sub_category: 'paragraphType',
    name: '주관식 단답형',
    key: 'type_short_answer',
    prompt_text: `주관식 단답형: 문단의 내용을 바탕으로 간단한 답을 쓰는 문제입니다. 정답과 함께 초성 힌트를 제공합니다.

출력 형식:
{
  "type": "주관식 단답형",
  "question": "문단 내용을 바탕으로 질문에 답하세요.",
  "answer": "정답 (예: 장래희망)",
  "answerInitials": "초성 힌트 (예: ㅈㄹㅎㅁ)",
  "explanation": "정답 해설과 근거"
}`,
    description: '주관식 단답형 문제 형식 (초성 힌트 포함)',
    is_active: true,
    is_default: false,
    version: 1
  },
  {
    prompt_id: 'paragraph-type-order',
    category: 'paragraph',
    sub_category: 'paragraphType',
    name: '어절 순서 맞추기',
    key: 'type_order',
    prompt_text: `어절 순서 맞추기: 문단의 핵심 문장을 어절 단위로 섞어 놓고, 올바른 순서로 배열하는 문제입니다. 문법적으로 자연스럽고 의미가 통하는 순서를 찾도록 합니다.

출력 형식:
{
  "type": "어절 순서 맞추기",
  "question": "다음 어절들을 올바른 문장 순서로 배열했을 때, 알맞은 번호 순서를 고르세요.\\n① 어절1\\n② 어절2\\n③ 어절3\\n④ 어절4\\n⑤ 어절5",
  "options": [
    "첫 번째 배열 순서",
    "두 번째 배열 순서",
    "세 번째 배열 순서",
    "네 번째 배열 순서",
    "다섯 번째 배열 순서"
  ],
  "answer": "정답 번호",
  "explanation": "정답 해설 (정해진 문장도 함께 제시)"
}`,
    description: '어절 순서 맞추기 문제 형식',
    is_active: true,
    is_default: false,
    version: 1
  },
  {
    prompt_id: 'paragraph-type-ox',
    category: 'paragraph',
    sub_category: 'paragraphType',
    name: 'OX문제',
    key: 'type_ox',
    prompt_text: `OX문제: 문단의 내용이 맞는지 틀린지 판단하는 문제입니다. 명확한 사실 확인이 가능한 내용으로 출제합니다.

출력 형식:
{
  "type": "OX문제",
  "question": "다음 내용이 문단의 설명과 일치하면 O, 일치하지 않으면 X를 고르세요.\\n\\n[판단할 내용]",
  "options": [
    "O (맞다)",
    "X (틀리다)"
  ],
  "answer": "정답 번호 (1 또는 2)",
  "explanation": "정답 근거와 문단에서의 해당 내용"
}`,
    description: 'OX문제 형식',
    is_active: true,
    is_default: false,
    version: 1
  }
];

// 삭제할 기존 프롬프트 ID들
const PROMPTS_TO_DELETE = [
  'paragraph-type-synonym',    // 유의어 고르기
  'paragraph-type-antonym',    // 반의어 고르기
  'paragraph-type-summary'     // 문단 요약
];

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 문단 문제 유형별 프롬프트 마이그레이션 시작...');

    // 1. 기존 삭제 대상 프롬프트들 삭제
    console.log('🗑️ 기존 프롬프트 삭제 중...');
    for (const promptId of PROMPTS_TO_DELETE) {
      const { error: deleteError } = await supabase
        .from('system_prompts_v3')
        .delete()
        .eq('prompt_id', promptId);
      
      if (deleteError) {
        console.error(`프롬프트 삭제 실패 (${promptId}):`, deleteError);
      } else {
        console.log(`✅ ${promptId} 삭제 완료`);
      }
    }

    // 2. 새로운 프롬프트들 upsert (존재하면 업데이트, 없으면 생성)
    console.log('💾 새로운 프롬프트 삽입/업데이트 중...');
    const insertResults = [];
    
    for (const prompt of NEW_PARAGRAPH_PROMPTS) {
      const { data, error } = await supabase
        .from('system_prompts_v3')
        .upsert(
          {
            ...prompt,
            created_by: 'system',
            updated_by: 'system',
            updated_at: new Date().toISOString()
          },
          {
            onConflict: 'prompt_id'
          }
        )
        .select();
      
      if (error) {
        console.error(`프롬프트 삽입/업데이트 실패 (${prompt.prompt_id}):`, error);
        insertResults.push({ promptId: prompt.prompt_id, success: false, error: error.message });
      } else {
        console.log(`✅ ${prompt.prompt_id} 삽입/업데이트 완료`);
        insertResults.push({ promptId: prompt.promptId, success: true });
      }
    }

    // 3. 시스템 프롬프트의 가이드라인도 업데이트
    console.log('🔄 시스템 프롬프트 가이드라인 업데이트 중...');
    const updatedSystemPrompt = `###지시사항
다음의 지문의 문단에 대한 {questionType} 문제를 생성해주세요.
{questionIndexNote}

**지문 제목**: {title}
**대상 학년**: {grade}
**문단 내용**: {paragraphText}
**문제 번호**: {questionIndex}번째 {questionType} 문제

###구분 (난이도 조절)
{divisionPrompt}

###문제 유형별 요구사항
{specificPrompt}

###주의사항
- {grade}에 맞는 어휘와 난이도 사용
- 명확하고 구체적인 문제 출제
- 정답과 오답이 명확히 구분되도록 작성
- 해설은 학생이 이해하기 쉽게 작성
- 반드시 JSON 형식으로만 응답

### 문제 유형별 상세 가이드라인

**빈칸 채우기**:
- 문단에서 핵심 어휘나 중요한 단어를 빈칸으로 처리
- 문맥에 맞는 적절한 단어를 선택하도록 하는 문제
- 어휘의 의미와 문맥 적절성을 평가

**주관식 단답형**:
- 문단의 내용을 바탕으로 간단한 답을 쓰는 문제
- 정답과 함께 반드시 초성 힌트를 제공 (예: 장래희망 → ㅈㄹㅎㅁ)
- 문단 이해도와 핵심 내용 파악 능력을 평가

**어절 순서 맞추기**:
- 문단에서 의미 있는 문장을 선택하여 어절들을 원형 번호로 제시
- 어절들을 올바른 순서로 배열했을 때의 번호 순서를 선택하는 문제
- 어절 배열과 문장 구성 능력을 평가

**OX문제**:
- 문단의 내용이 맞는지 틀린지 판단하는 문제
- 명확한 사실 확인이 가능한 내용으로 출제
- 문단 내용의 정확한 이해도를 평가

###출력 형식 (반드시 JSON 형식으로)

{
  "question": "문제 내용",
  "options": ["선택지1", "선택지2", "선택지3", "선택지4", "선택지5"],
  "answer": "1",
  "explanation": "정답 해설"
}`;

    const { error: systemUpdateError } = await supabase
      .from('system_prompts_v3')
      .update({
        prompt_text: updatedSystemPrompt,
        updated_by: 'system',
        updated_at: new Date().toISOString(),
        version: 2
      })
      .eq('prompt_id', 'paragraph-system-base');

    if (systemUpdateError) {
      console.error('시스템 프롬프트 업데이트 실패:', systemUpdateError);
    } else {
      console.log('✅ 시스템 프롬프트 가이드라인 업데이트 완료');
    }

    // 4. 결과 확인
    const { data: finalCheck, error: checkError } = await supabase
      .from('system_prompts_v3')
      .select('prompt_id, name')
      .eq('category', 'paragraph')
      .eq('sub_category', 'paragraphType');

    if (checkError) {
      console.error('최종 확인 실패:', checkError);
    } else {
      console.log('📋 업데이트된 문단 문제 유형별 프롬프트:');
      finalCheck?.forEach(prompt => {
        console.log(`  - ${prompt.prompt_id}: ${prompt.name}`);
      });
    }

    return NextResponse.json({
      success: true,
      message: '문단 문제 유형별 프롬프트 마이그레이션이 완료되었습니다.',
      details: {
        deletedPrompts: PROMPTS_TO_DELETE,
        insertedPrompts: insertResults,
        updatedSystemPrompt: 'paragraph-system-base',
        finalPrompts: finalCheck?.map(p => ({ id: p.prompt_id, name: p.name })) || []
      }
    });

  } catch (error) {
    console.error('문단 프롬프트 마이그레이션 실패:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '마이그레이션 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}