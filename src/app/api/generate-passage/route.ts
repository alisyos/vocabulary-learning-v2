import { NextRequest, NextResponse } from 'next/server';
import { generatePassage } from '@/lib/openai';
import { generatePassagePrompt } from '@/lib/prompts';
import { savePassageData } from '@/lib/google-sheets';
import { PassageInput } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body: PassageInput = await request.json();
    
    // 입력값 검증
    if (!body.grade || !body.length || !body.subject || !body.area) {
      return NextResponse.json(
        { error: '모든 필수 항목을 입력해주세요.' },
        { status: 400 }
      );
    }

    // 프롬프트 생성 (선택적 매개변수 포함)
    const prompt = generatePassagePrompt(
      body.grade,
      body.length,
      body.subject,
      body.area,
      body.topic,
      body.textType
    );

    console.log('Generated prompt:', prompt);

    // GPT API 호출
    const result = await generatePassage(prompt);

    console.log('GPT response:', result);

    // Google Sheets에 저장
    let saveStatus = {
      saved: false,
      error: null as string | null
    };

    try {
      await savePassageData(body, prompt, result);
      console.log('Data saved to Google Sheets successfully');
      saveStatus.saved = true;
    } catch (sheetsError) {
      console.error('Failed to save to Google Sheets:', sheetsError);
      saveStatus.error = sheetsError instanceof Error ? sheetsError.message : 'Google Sheets 저장 실패';
      // Google Sheets 저장 실패해도 응답은 반환
    }

    return NextResponse.json({
      ...result,
      saveStatus
    });
  } catch (error) {
    console.error('Error generating passage:', error);
    return NextResponse.json(
      { error: '지문 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}