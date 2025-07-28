import { NextRequest, NextResponse } from 'next/server';
import { initializeSystemPrompts } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const forceReset = body.forceReset || false;
    
    const result = await initializeSystemPrompts(forceReset);
    
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