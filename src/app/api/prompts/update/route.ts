import { NextRequest, NextResponse } from 'next/server';
import { updateSystemPrompt } from '@/lib/supabase';
import { PromptUpdateRequest, PromptUpdateResponse } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body: PromptUpdateRequest = await request.json();
    
    // 입력값 검증
    if (!body.promptId || !body.promptText) {
      return NextResponse.json(
        { 
          success: false,
          error: 'promptId와 promptText는 필수입니다.' 
        },
        { status: 400 }
      );
    }

    // 프롬프트 업데이트
    const result = await updateSystemPrompt(
      body.promptId, 
      body.promptText, 
      body.changeReason
    );

    const response: PromptUpdateResponse = {
      success: true,
      promptId: result.promptId,
      newVersion: result.newVersion,
      message: result.message
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating prompt:', error);
    return NextResponse.json(
      { 
        success: false,
        error: '프롬프트 업데이트 중 오류가 발생했습니다.',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}