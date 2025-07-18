import { NextRequest, NextResponse } from 'next/server';
import { generateQuestion } from '@/lib/openai';
import { generateQuestionPrompt } from '@/lib/prompts';
import { QuestionInput } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body: QuestionInput = await request.json();
    
    // 입력값 검증
    if (!body.division || !body.passage || !body.questionType) {
      return NextResponse.json(
        { error: '모든 필수 항목을 입력해주세요.' },
        { status: 400 }
      );
    }

    // 프롬프트 생성
    const prompt = generateQuestionPrompt(
      body.division,
      body.passage,
      body.questionType
    );

    console.log('Generated question prompt:', prompt);

    // GPT API 호출
    const result = await generateQuestion(prompt);

    console.log('GPT question response:', result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error generating questions:', error);
    return NextResponse.json(
      { error: '문제 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}