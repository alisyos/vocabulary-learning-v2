import { NextRequest, NextResponse } from 'next/server';
import { generatePassage } from '@/lib/openai';
import { generatePassagePrompt } from '@/lib/prompts';
import { PassageInput, AreaType } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body: PassageInput = await request.json();
    
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

    // GPT API 호출
    const result = await generatePassage(prompt);

    console.log('GPT response:', result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error generating passage:', error);
    return NextResponse.json(
      { error: '지문 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}