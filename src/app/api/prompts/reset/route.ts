import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { promptId } = body;

    if (!promptId) {
      return NextResponse.json(
        { success: false, error: '프롬프트 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 하드코딩된 프롬프트에서 정보 가져오기
    const { DEFAULT_PROMPTS_V2 } = await import('@/lib/promptsV2');
    const originalPrompt = DEFAULT_PROMPTS_V2.find(p => p.promptId === promptId);
    
    if (!originalPrompt) {
      return NextResponse.json(
        { success: false, error: '프롬프트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 하드코딩된 프롬프트를 DB에 덮어쓰기 (초기화)
    const promptDataForDB = {
      prompt_id: originalPrompt.promptId,
      category: originalPrompt.category,
      sub_category: originalPrompt.subCategory,
      name: originalPrompt.name,
      key: originalPrompt.key,
      prompt_text: originalPrompt.promptText,
      description: originalPrompt.description || '',
      is_active: originalPrompt.isActive,
      is_default: originalPrompt.isDefault,
      version: originalPrompt.version,
      created_by: 'system',
      updated_by: 'system'
    };

    const { error } = await supabase
      .from('system_prompts_v3')
      .upsert(promptDataForDB, { 
        onConflict: 'prompt_id',
        ignoreDuplicates: false // 덮어쓰기 허용
      });

    if (error) {
      console.error('프롬프트 초기화 실패:', error);
      return NextResponse.json({
        success: false,
        error: '프롬프트 초기화에 실패했습니다.',
        message: error.message
      }, { status: 500 });
    }

    console.log(`✅ 프롬프트 초기화 성공: ${promptId} (${originalPrompt.name}) - 하드코딩된 버전으로 덮어씀`);

    // 캐시 초기화
    const { clearPromptCache } = await import('@/lib/prompts');
    clearPromptCache(originalPrompt.category, originalPrompt.subCategory, originalPrompt.key);

    return NextResponse.json({
      success: true,
      message: `'${originalPrompt.name}' 프롬프트가 초기화되었습니다.`,
      promptId: promptId,
      category: originalPrompt.category,
      resetAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('프롬프트 초기화 중 오류:', error);
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