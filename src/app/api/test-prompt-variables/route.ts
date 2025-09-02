import { NextResponse } from 'next/server';
import { getPromptFromDB } from '@/lib/supabase';

export async function GET() {
  try {
    // 시스템 프롬프트 조회
    const systemPrompt = await getPromptFromDB('passage', 'system', 'system_base');
    
    const result = {
      hasSystemPrompt: !!systemPrompt,
      systemPromptLength: systemPrompt?.length || 0,
      hasKeywordsForPassages: systemPrompt?.includes('{keywords_for_passages}') || false,
      hasKeywordsForQuestions: systemPrompt?.includes('{keywords_for_questions}') || false,
      systemPromptPreview: systemPrompt ? systemPrompt.substring(0, 500) + '...' : null
    };

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}