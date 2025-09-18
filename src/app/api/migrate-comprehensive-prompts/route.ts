import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST() {
  try {
    console.log('🔄 종합 문제 프롬프트 마이그레이션 시작...');
    
    // 1. 기존 종합 문제 프롬프트 비활성화
    const { error: deactivateError } = await supabase
      .from('system_prompts_v3')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString(),
        updated_by: 'migration'
      })
      .eq('category', 'comprehensive')
      .eq('sub_category', 'comprehensiveType')
      .in('key', ['단답형', '핵심 내용 요약', '핵심문장 찾기', 'OX문제', '자료분석하기']);
    
    if (deactivateError) {
      console.error('기존 프롬프트 비활성화 실패:', deactivateError);
      // 에러가 나도 계속 진행
    } else {
      console.log('✅ 기존 종합 문제 프롬프트 비활성화 완료');
    }

    // 2. 새로운 종합 문제 유형 프롬프트 추가
    const newPrompts = [
      {
        prompt_id: 'comp-type-info',
        category: 'comprehensive',
        sub_category: 'comprehensiveType',
        name: '정보 확인',
        key: '정보 확인',
        prompt_text: `정보 확인: 지문에 직접 제시된 세부 정보를 정확히 파악하고 있는지 확인하는 문제입니다. 사실적 이해와 세부 내용 기억을 평가합니다.

생성 지침:
1. 지문에 명시적으로 언급된 정보 기반
2. 날짜, 숫자, 명칭, 용어 정의 등 구체적 사실 확인
3. 5지선다 객관식으로 구성
4. 정답은 지문에서 직접 확인 가능해야 함

출력 형식:
{
  "type": "정보 확인",
  "questionFormat": "객관식",
  "question": "지문에서 설명한 [구체적 내용]에 대한 설명으로 옳은 것은?",
  "options": ["선택지1", "선택지2", "선택지3", "선택지4", "선택지5"],
  "answer": "3",
  "explanation": "지문의 [해당 부분]에서 확인할 수 있듯이..."
}

주의사항:
- 지문에 직접 나타난 정보만 활용
- 추론이나 해석이 필요 없는 명확한 문제
- 오답도 지문 내용과 관련되게 구성`,
        description: '정보 확인 유형의 종합 문제 생성 가이드라인',
        is_active: true,
        is_default: false,
        version: 1,
        created_by: 'migration',
        updated_by: 'migration'
      },
      {
        prompt_id: 'comp-type-theme',
        category: 'comprehensive',
        sub_category: 'comprehensiveType',
        name: '주제 파악',
        key: '주제 파악',
        prompt_text: `주제 파악: 지문의 중심 주제나 핵심 메시지를 파악하는 문제입니다. 글 전체를 관통하는 주요 아이디어를 이해하고 있는지 평가합니다.

생성 지침:
1. 지문의 전체적인 흐름과 핵심 메시지 파악
2. 주제문, 결론, 핵심 아이디어를 중심으로 요약
3. 5개의 선택지 중 1개만이 정확한 요약이 되도록 구성
4. 오답은 부분적 내용, 과도한 일반화, 잘못된 해석 등으로 구성

출력 형식:
{
  "type": "주제 파악",
  "questionFormat": "객관식",
  "question": "다음 글의 핵심 내용을 가장 잘 요약한 것은?",
  "options": [
    "정답: 지문의 주제와 핵심 내용을 정확히 반영한 요약문",
    "오답1: 부분적 내용만 포함한 요약문",
    "오답2: 과도하게 일반화된 요약문",
    "오답3: 핵심을 놓친 요약문",
    "오답4: 잘못 해석된 요약문"
  ],
  "answer": "1",
  "explanation": "정답 선택지가 지문의 어느 부분을 반영하는지 구체적으로 설명"
}

주의사항:
- 각 선택지는 150-200자 내외로 구성
- 정답은 지문의 핵심을 모두 포함해야 함
- 오답들은 그럴듯하지만 명확한 차이점이 있어야 함`,
        description: '주제 파악 유형의 종합 문제 생성 가이드라인',
        is_active: true,
        is_default: false,
        version: 1,
        created_by: 'migration',
        updated_by: 'migration'
      },
      {
        prompt_id: 'comp-type-data',
        category: 'comprehensive',
        sub_category: 'comprehensiveType',
        name: '자료해석',
        key: '자료해석',
        prompt_text: `자료해석: 지문에 제시된 정보나 자료를 분석하고 해석하는 문제입니다. 표, 그래프, 수치 데이터 또는 텍스트 내 비교/대조 정보를 올바르게 이해하고 있는지 평가합니다.

생성 지침:
1. 지문에 포함된 구체적인 수치, 데이터, 비교 내용 활용
2. 데이터의 경향, 변화, 비교, 특징 등을 묻는 문제 구성
3. 정확한 수치 해석이나 논리적 분석력을 평가
4. 자료가 없는 경우, 지문의 비교/대조 내용을 분석 대상으로 활용

출력 형식:
{
  "type": "자료해석",
  "questionFormat": "객관식",
  "question": "지문의 자료(또는 내용)를 분석한 결과로 옳은 것은?",
  "options": [
    "정답: 지문의 자료를 정확히 분석한 내용",
    "오답1: 수치를 잘못 해석한 내용",
    "오답2: 경향을 반대로 분석한 내용",
    "오답3: 일부 데이터만 고려한 내용",
    "오답4: 지문에 없는 추론을 포함한 내용"
  ],
  "answer": "1",
  "explanation": "자료의 어느 부분을 근거로 해당 분석이 맞는지 구체적 수치와 함께 설명"
}

분석 유형 예시:
- 수치 비교: "A가 B보다 [구체적 수치]만큼 높다/낮다"
- 경향 분석: "[특정 기간] 동안 [지속적 증가/감소/변화없음] 경향을 보인다"
- 비율 분석: "전체에서 [특정 부분]이 [구체적 비율]을 차지한다"
- 변화 분석: "[이전 대비] [구체적 변화량/변화율]의 변화가 있다"

주의사항:
- 지문에 명시되지 않은 추론은 지양
- 구체적 수치나 사실 기반 분석 우선
- 정답은 지문의 자료에서 직접 확인 가능해야 함`,
        description: '자료해석 유형의 종합 문제 생성 가이드라인',
        is_active: true,
        is_default: false,
        version: 1,
        created_by: 'migration',
        updated_by: 'migration'
      },
      {
        prompt_id: 'comp-type-inference',
        category: 'comprehensive',
        sub_category: 'comprehensiveType',
        name: '추론',
        key: '추론',
        prompt_text: `추론: 지문의 내용을 바탕으로 논리적 추론이나 적용을 요구하는 문제입니다. 직접 언급되지 않았지만 지문의 정보로부터 유추할 수 있는 내용을 평가합니다.

생성 지침:
1. 지문의 내용을 바탕으로 논리적으로 추론 가능한 내용
2. 원인-결과, 비교-대조, 일반화-적용 등의 사고력 평가
3. 지문의 원리나 개념을 새로운 상황에 적용하는 문제
4. 5지선다 객관식으로 구성

출력 형식:
{
  "type": "추론",
  "questionFormat": "객관식",
  "question": "지문의 내용을 바탕으로 추론할 때, 가장 적절한 것은?",
  "options": [
    "정답: 논리적으로 타당한 추론",
    "오답1: 과도한 일반화",
    "오답2: 논리적 비약",
    "오답3: 부분적으로만 맞는 추론",
    "오답4: 근거가 부족한 추론"
  ],
  "answer": "1",
  "explanation": "지문의 어떤 내용을 근거로 해당 추론이 가능한지 논리적 과정 설명"
}

추론 유형 예시:
- 원인 추론: "이러한 결과가 나타난 이유는..."
- 결과 예측: "이 상황이 지속된다면..."
- 적용: "같은 원리를 다른 상황에 적용하면..."
- 비교 추론: "A와 B의 관계로 볼 때..."

주의사항:
- 지문에서 충분한 근거를 찾을 수 있는 추론이어야 함
- 과도한 비약이나 상상은 지양
- 논리적 타당성이 중요`,
        description: '추론 유형의 종합 문제 생성 가이드라인',
        is_active: true,
        is_default: false,
        version: 1,
        created_by: 'migration',
        updated_by: 'migration'
      }
    ];

    // 각 프롬프트를 개별적으로 삽입 (중복 방지)
    let insertedCount = 0;
    for (const prompt of newPrompts) {
      // 먼저 해당 키가 이미 존재하는지 확인
      const { data: existing } = await supabase
        .from('system_prompts_v3')
        .select('id')
        .eq('category', prompt.category)
        .eq('sub_category', prompt.sub_category)
        .eq('key', prompt.key)
        .single();
      
      if (existing) {
        // 이미 존재하면 업데이트
        const { error: updateError } = await supabase
          .from('system_prompts_v3')
          .update({
            prompt_text: prompt.prompt_text,
            name: prompt.name,
            description: prompt.description,
            is_active: true,
            updated_at: new Date().toISOString(),
            updated_by: 'migration'
          })
          .eq('id', existing.id);
        
        if (updateError) {
          console.error(`'${prompt.key}' 업데이트 실패:`, updateError);
        } else {
          console.log(`✅ '${prompt.key}' 프롬프트 업데이트 성공`);
          insertedCount++;
        }
      } else {
        // 존재하지 않으면 새로 삽입
        const { error: insertError } = await supabase
          .from('system_prompts_v3')
          .insert([prompt]);
        
        if (insertError) {
          console.error(`'${prompt.key}' 삽입 실패:`, insertError);
        } else {
          console.log(`✅ '${prompt.key}' 프롬프트 삽입 성공`);
          insertedCount++;
        }
      }
    }

    console.log(`🎯 종합 문제 프롬프트 마이그레이션 완료! (${insertedCount}개 처리)`);

    return NextResponse.json({
      success: true,
      message: `종합 문제 프롬프트 마이그레이션 완료 (${insertedCount}개 처리)`,
      count: insertedCount
    });

  } catch (error) {
    console.error('❌ 마이그레이션 중 오류 발생:', error);
    return NextResponse.json(
      {
        success: false,
        message: '마이그레이션 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}