import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export async function GET() {
  try {
    // vocabulary system_base 프롬프트 조회
    const systemPrompt = await db.getPromptByKey('vocabulary', 'vocabularySystem', 'system_base');
    
    // 실제 프롬프트 내용 확인
    const promptContent = systemPrompt?.promptText || 'NOT FOUND';
    
    // {passage} 플레이스홀더가 있는지 확인
    const hasPassagePlaceholder = promptContent.includes('{passage}');
    
    // 모든 플레이스홀더 찾기
    const placeholders = promptContent.match(/\{[^}]+\}/g) || [];
    
    return NextResponse.json({
      found: !!systemPrompt,
      hasPassagePlaceholder,
      placeholders,
      promptLength: promptContent.length,
      promptPreview: promptContent.substring(0, 500),
      fullPrompt: promptContent
    });
  } catch (error) {
    return NextResponse.json({
      error: '프롬프트 조회 실패',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}