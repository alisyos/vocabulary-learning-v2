import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 종합 문제 유형 마이그레이션 시작...');
    
    // 현재 DB에서 종합 문제 유형 프롬프트들 조회
    const { data: existingPrompts, error: selectError } = await supabase
      .from('system_prompts_v3')
      .select('*')
      .eq('category', 'comprehensive')
      .eq('sub_category', 'comprehensiveType');
    
    if (selectError) {
      console.error('기존 프롬프트 조회 실패:', selectError);
      throw selectError;
    }
    
    console.log(`📋 기존 종합 문제 유형 프롬프트: ${existingPrompts?.length || 0}개`);
    
    // 이전 유형들 제거 (문단별 순서 맞추기, 핵심어/핵심문장 찾기)
    const legacyTypes = ['type_order', 'type_keyword_sentence']; // 기존 key들
    
    if (existingPrompts && existingPrompts.length > 0) {
      console.log('🗑️ 이전 문제 유형 프롬프트 제거 시작...');
      
      // 모든 기존 종합 문제 유형 프롬프트 제거
      const { error: deleteError } = await supabase
        .from('system_prompts_v3')
        .delete()
        .eq('category', 'comprehensive')
        .eq('sub_category', 'comprehensiveType');
      
      if (deleteError) {
        console.error('기존 프롬프트 삭제 실패:', deleteError);
        throw deleteError;
      }
      
      console.log('✅ 기존 종합 문제 유형 프롬프트 삭제 완료');
    }
    
    // 새로운 5개 유형의 프롬프트 정의
    const newComprehensiveTypes = [
      {
        prompt_id: 'comprehensive-type-short',
        category: 'comprehensive',
        sub_category: 'comprehensiveType',
        name: '단답형',
        key: 'type_short',
        prompt_text: `단답형: 지문의 핵심 내용에 대해 간단한 답을 요구하는 주관식 문제입니다. 1-3단어 또는 한 문장 이내로 답할 수 있는 문제를 출제합니다.

생성 시 반드시 다음을 포함해야 합니다:
1. 초성 힌트 제공 (예: "ㅇㅇㅇ", "ㄱㄱㅇㅎ" 등)
2. 지문에 직접 언급된 내용 기반 문제
3. 명확하고 구체적인 정답

형식:
- 문제: "다음 지문에서 [특정 개념/현상]은 무엇입니까?"
- 초성 힌트: "ㅇㅇㅇ (3자)"
- 정답: 구체적인 용어나 개념
- 해설: 지문의 해당 부분 인용 및 설명`,
        description: '지문 내용을 바탕으로 한 주관식 단답형 문제 (초성 힌트 포함)',
        is_active: true,
        is_default: true,
        version: 1,
        created_by: 'migration',
        updated_by: 'migration'
      },
      {
        prompt_id: 'comprehensive-type-summary',
        category: 'comprehensive',
        sub_category: 'comprehensiveType',
        name: '핵심 내용 요약',
        key: 'type_summary',
        prompt_text: `핵심 내용 요약: 전체 지문의 중심 내용을 파악하여 요약한 것을 고르는 문제입니다. 주제문이나 결론을 정확히 이해하고 있는지 평가합니다.

생성 지침:
1. 지문의 전체적인 흐름과 핵심 메시지 파악
2. 주제문, 결론, 핵심 아이디어를 중심으로 요약
3. 5개의 선택지 중 1개만이 정확한 요약이 되도록 구성
4. 오답은 부분적 내용, 과도한 일반화, 잘못된 해석 등으로 구성

형식:
- 문제: "다음 글의 핵심 내용을 가장 잘 요약한 것은?"
- 선택지: 5개의 요약문 (200자 내외)
- 정답: 지문의 주제와 핵심 내용을 정확히 반영한 요약
- 해설: 정답 선택지가 지문의 어느 부분을 반영하는지 설명`,
        description: '지문의 전체 내용을 요약하는 객관식 문제',
        is_active: true,
        is_default: true,
        version: 1,
        created_by: 'migration',
        updated_by: 'migration'
      },
      {
        prompt_id: 'comprehensive-type-keyword',
        category: 'comprehensive',
        sub_category: 'comprehensiveType',
        name: '핵심문장 찾기',
        key: 'type_keyword',
        prompt_text: `핵심문장 찾기: 지문에서 가장 중요한 문장을 찾는 문제입니다. 글의 주제나 핵심 메시지를 담고 있는 문장을 파악합니다.

생성 지침:
1. 지문에서 실제로 사용된 문장들을 선택지로 활용
2. 주제문, 결론문, 핵심 아이디어를 담은 문장 위주로 구성
3. 정답은 글의 중심 내용을 가장 잘 드러내는 문장
4. 오답은 부차적 내용, 예시, 세부 사항을 담은 문장들

형식:
- 문제: "다음 글에서 핵심 내용을 가장 잘 드러낸 문장은?"
- 선택지: 지문에서 발췌한 5개 문장
- 정답: 글의 주제나 결론을 가장 명확히 보여주는 문장
- 해설: 해당 문장이 왜 핵심문장인지, 글에서 어떤 역할을 하는지 설명`,
        description: '지문에서 핵심 내용을 담은 중요한 문장을 찾는 문제',
        is_active: true,
        is_default: true,
        version: 1,
        created_by: 'migration',
        updated_by: 'migration'
      },
      {
        prompt_id: 'comprehensive-type-ox',
        category: 'comprehensive',
        sub_category: 'comprehensiveType',
        name: 'OX문제',
        key: 'type_ox',
        prompt_text: `OX문제: 지문의 내용에 대해 참(○) 또는 거짓(×)을 판단하는 문제입니다. 지문에 직접 언급된 사실이나 논리적으로 추론 가능한 내용을 바탕으로 합니다.

생성 지침:
1. 지문에 명시적으로 언급된 내용 기반
2. 명확히 참/거짓 판단이 가능한 진술문 작성
3. 애매하거나 주관적 해석이 필요한 내용 지양
4. 선택지는 "○ (참)" / "× (거짓)" 2개만 제공

형식:
- 문제: 지문 내용에 대한 명확한 진술문 제시
- 선택지: ① ○ (참), ② × (거짓)
- 정답: ○ 또는 ×
- 해설: 지문의 해당 부분 인용하며 참/거짓 근거 제시

예시:
"지문에 따르면, [특정 현상]은 [특정 원인] 때문에 발생한다."
→ 지문에서 해당 인과관계가 명시되었는지 확인`,
        description: '지문 내용의 참/거짓을 판단하는 OX 문제',
        is_active: true,
        is_default: true,
        version: 1,
        created_by: 'migration',
        updated_by: 'migration'
      },
      {
        prompt_id: 'comprehensive-type-data',
        category: 'comprehensive',
        sub_category: 'comprehensiveType',
        name: '자료분석하기',
        key: 'type_data',
        prompt_text: `자료분석하기: 지문에 제시된 자료(표, 그래프, 수치 등)를 분석하거나 해석하는 문제입니다. 자료에서 드러나는 경향, 특징, 비교 등을 올바르게 파악했는지 평가합니다.

생성 지침:
1. 지문에 포함된 구체적인 수치, 데이터, 비교 내용 활용
2. 데이터의 경향, 변화, 비교, 특징 등을 묻는 문제 구성
3. 정확한 수치 해석이나 논리적 분석력을 평가
4. 자료가 없는 경우, 지문의 비교/대조 내용을 분석 대상으로 활용

형식:
- 문제: "지문의 자료(또는 내용)를 분석한 결과로 옳은 것은?"
- 선택지: 5개의 분석 결과 또는 해석
- 정답: 지문의 자료를 정확히 분석한 내용
- 해설: 자료의 어느 부분을 근거로 해당 분석이 맞는지 설명

주의사항:
- 지문에 명시되지 않은 추론은 지양
- 구체적 수치나 사실 기반 분석 우선`,
        description: '지문의 자료나 데이터를 분석하고 해석하는 문제',
        is_active: true,
        is_default: true,
        version: 1,
        created_by: 'migration',
        updated_by: 'migration'
      }
    ];
    
    console.log('💾 새로운 종합 문제 유형 프롬프트 삽입 중...');
    
    // 새로운 프롬프트들 삽입
    const { error: insertError } = await supabase
      .from('system_prompts_v3')
      .insert(newComprehensiveTypes);
    
    if (insertError) {
      console.error('새로운 프롬프트 삽입 실패:', insertError);
      throw insertError;
    }
    
    console.log('✅ 새로운 종합 문제 유형 프롬프트 삽입 완료');
    
    // 마이그레이션 결과 확인
    const { data: updatedPrompts, error: verifyError } = await supabase
      .from('system_prompts_v3')
      .select('*')
      .eq('category', 'comprehensive')
      .eq('sub_category', 'comprehensiveType')
      .order('name');
    
    if (verifyError) {
      console.error('마이그레이션 결과 확인 실패:', verifyError);
      throw verifyError;
    }
    
    console.log('🎉 종합 문제 유형 마이그레이션 완료!');
    console.log('📋 새로운 문제 유형들:');
    updatedPrompts?.forEach(prompt => {
      console.log(`  - ${prompt.name} (${prompt.key})`);
    });
    
    return NextResponse.json({
      success: true,
      message: '종합 문제 유형 마이그레이션이 완료되었습니다.',
      oldCount: existingPrompts?.length || 0,
      newCount: newComprehensiveTypes.length,
      newTypes: updatedPrompts?.map(p => ({
        name: p.name,
        key: p.key,
        promptId: p.prompt_id
      })) || []
    });
    
  } catch (error) {
    console.error('종합 문제 유형 마이그레이션 실패:', error);
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

// GET 요청으로 현재 상태 확인
export async function GET() {
  try {
    const { data: currentPrompts, error } = await supabase
      .from('system_prompts_v3')
      .select('*')
      .eq('category', 'comprehensive')
      .eq('sub_category', 'comprehensiveType')
      .order('name');
    
    if (error) throw error;
    
    return NextResponse.json({
      success: true,
      currentTypes: currentPrompts?.map(p => ({
        name: p.name,
        key: p.key,
        promptId: p.prompt_id,
        isActive: p.is_active,
        updatedAt: p.updated_at
      })) || [],
      count: currentPrompts?.length || 0
    });
    
  } catch (error) {
    console.error('현재 상태 조회 실패:', error);
    return NextResponse.json(
      { 
        success: false,
        error: '현재 상태 조회에 실패했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}