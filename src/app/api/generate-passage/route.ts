import { NextRequest, NextResponse } from 'next/server';
import { generatePassage, ModelType } from '@/lib/openai';
import { generatePassagePrompt } from '@/lib/prompts';
import { PassageInput, AreaType } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body: PassageInput & { model?: ModelType } = await request.json();
    const model = body.model || 'gpt-4.1'; // 기본값 gpt-4.1
    
    console.log('📝 Received body:', JSON.stringify(body, null, 2));
    console.log('🎨 textType value:', body.textType);
    console.log('🎨 textType type:', typeof body.textType);
    
    // 입력값 검증
    if (!body.division || !body.length || !body.subject || !body.grade || !body.area || !body.maintopic || !body.subtopic || !body.keyword) {
      return NextResponse.json(
        { error: '모든 필수 항목을 입력해주세요.' },
        { status: 400 }
      );
    }

    // 프롬프트 생성 (DB에서 조회, 실패 시 기본값 사용)
    const { generatePassagePromptFromDB } = await import('@/lib/prompts');
    const prompt = await generatePassagePromptFromDB(
      body.division,
      body.length,
      body.subject,
      body.grade,
      body.area as AreaType, // 타입 캐스팅
      body.maintopic,
      body.subtopic,
      body.keyword,
      body.textType
    );

    console.log('Generated prompt:', prompt);
    console.log(`🎯 선택된 모델: ${model}`);

    // GPT API 호출 (모델 파라미터 포함)
    const result = await generatePassage(prompt, model);

    console.log('GPT response:', result);

    // 결과에 사용된 프롬프트와 모델 정보도 함께 반환
    return NextResponse.json({
      ...result,
      _metadata: {
        usedPrompt: prompt,
        usedModel: model,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error generating passage:', error);
    return NextResponse.json(
      { error: '지문 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}