import { NextRequest, NextResponse } from 'next/server';
import { initializeSystemPrompts } from '@/lib/google-sheets';

export async function POST(request: NextRequest) {
  try {
    const result = await initializeSystemPrompts();
    
    return NextResponse.json({
      success: result.success,
      message: result.message,
      count: result.count || 0
    });
  } catch (error) {
    console.error('Error initializing prompts:', error);
    return NextResponse.json(
      { 
        success: false,
        error: '프롬프트 초기화 중 오류가 발생했습니다.',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}