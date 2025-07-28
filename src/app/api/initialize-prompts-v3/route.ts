import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 프롬프트 v3 초기화 시작...');
    
    // promptsV2에서 모든 프롬프트 가져오기
    const { DEFAULT_PROMPTS_V2 } = await import('@/lib/promptsV2');
    const defaultPrompts = DEFAULT_PROMPTS_V2;
    
    console.log(`📚 ${defaultPrompts.length}개의 기본 프롬프트를 발견했습니다.`);
    
    // 기존 데이터 확인
    const { data: existingPrompts, error: checkError } = await supabase
      .from('system_prompts_v3')
      .select('prompt_id')
      .limit(1);
    
    if (checkError) {
      console.error('기존 프롬프트 확인 실패:', checkError);
      throw checkError;
    }
    
    // 기존 데이터가 있으면 삭제
    if (existingPrompts && existingPrompts.length > 0) {
      console.log('🗑️ 기존 프롬프트 데이터를 삭제합니다...');
      const { error: deleteError } = await supabase
        .from('system_prompts_v3')
        .delete()
        .neq('prompt_id', 'dummy'); // 모든 데이터 삭제
        
      if (deleteError) {
        console.error('기존 데이터 삭제 실패:', deleteError);
        throw deleteError;
      }
      console.log('✅ 기존 데이터가 삭제되었습니다.');
    }
    
    // DB에 삽입할 데이터 형식으로 변환
    const promptsToInsert = defaultPrompts.map(prompt => ({
      prompt_id: prompt.promptId,
      category: prompt.category,
      sub_category: prompt.subCategory,
      name: prompt.name,
      key: prompt.key,
      prompt_text: prompt.promptText,
      description: prompt.description || '',
      is_active: true,
      is_default: true,
      version: 1,
      created_by: 'system',
      updated_by: 'system'
    }));
    
    // 디버깅: 카테고리별 분포 확인
    const categoryCount = promptsToInsert.reduce((acc, p) => {
      acc[p.category] = (acc[p.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('🔍 카테고리별 프롬프트 수:', categoryCount);
    
    // 중복 확인
    const duplicateIds = promptsToInsert.map(p => p.prompt_id).filter((id, index, arr) => arr.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      console.error('🚨 중복된 promptId 발견:', duplicateIds);
      throw new Error(`중복된 promptId가 있습니다: ${duplicateIds.join(', ')}`);
    }
    
    console.log('💾 프롬프트 데이터를 system_prompts_v3에 삽입 중...');
    
    // 배치로 삽입
    const batchSize = 50;
    let insertedCount = 0;
    
    for (let i = 0; i < promptsToInsert.length; i += batchSize) {
      const batch = promptsToInsert.slice(i, i + batchSize);
      
      const { error: insertError } = await supabase
        .from('system_prompts_v3')
        .insert(batch);
      
      if (insertError) {
        console.error(`배치 ${Math.floor(i / batchSize) + 1} 삽입 실패:`, insertError);
        console.error('실패한 배치 내용:', batch);
        throw insertError;
      }
      
      insertedCount += batch.length;
      console.log(`✅ 배치 ${Math.floor(i / batchSize) + 1} 완료 (${insertedCount}/${promptsToInsert.length})`);
    }
    
    // 결과 확인
    const { data: finalCheck, error: finalError } = await supabase
      .from('system_prompts_v3')
      .select('category')
      .eq('is_active', true);
    
    if (finalError) {
      console.error('최종 확인 실패:', finalError);
      throw finalError;
    }
    
    const finalCategoryCount = finalCheck?.reduce((acc, p) => {
      acc[p.category] = (acc[p.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};
    
    console.log('🎉 프롬프트 v3 초기화 완료!');
    console.log('📊 최종 카테고리별 저장 수:', finalCategoryCount);
    
    return NextResponse.json({
      success: true,
      message: `프롬프트 v3 초기화가 완료되었습니다. ${insertedCount}개의 프롬프트가 생성되었습니다.`,
      count: insertedCount,
      categoryCount: finalCategoryCount
    });
    
  } catch (error) {
    console.error('프롬프트 v3 초기화 실패:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json({
      success: false,
      error: '프롬프트 v3 초기화 중 오류가 발생했습니다.',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}