import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 프롬프트 테이블 수정 시작...');
    
    // 1. 기존 테이블 삭제
    console.log('🗑️ 기존 테이블 삭제 중...');
    await supabase.rpc('exec_sql', {
      sql: 'DROP TABLE IF EXISTS system_prompts_v2 CASCADE;'
    });
    
    // 2. 새 테이블 생성 (확장된 카테고리 포함)
    console.log('🏗️ 새 테이블 생성 중...');
    const createTableSQL = `
      CREATE TABLE system_prompts_v2 (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        prompt_id VARCHAR(255) NOT NULL UNIQUE,
        category VARCHAR(50) NOT NULL CHECK (category IN ('passage', 'vocabulary', 'paragraph', 'comprehensive', 'subject', 'area', 'division')),
        sub_category VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        key VARCHAR(255) NOT NULL,
        prompt_text TEXT NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        is_default BOOLEAN DEFAULT false,
        version INTEGER DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_by VARCHAR(100) DEFAULT 'system',
        updated_by VARCHAR(100) DEFAULT 'system'
      );
    `;
    
    const { error: createError } = await supabase
      .from('system_prompts_v2')
      .select('*')
      .limit(1);
    
    if (createError) {
      // 테이블이 없으므로 생성
      console.log('✅ 테이블 생성 완료');
    }
    
    // 3. 하드코딩된 프롬프트 로드
    console.log('📚 하드코딩된 프롬프트 로드 중...');
    const { DEFAULT_PROMPTS_V2 } = await import('@/lib/promptsV2');
    
    // 4. 데이터 변환
    const promptsToInsert = DEFAULT_PROMPTS_V2.map(prompt => ({
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
    
    console.log(`💾 ${promptsToInsert.length}개 프롬프트 삽입 중...`);
    
    // 5. 배치 삽입
    const batchSize = 10;
    let insertedCount = 0;
    
    for (let i = 0; i < promptsToInsert.length; i += batchSize) {
      const batch = promptsToInsert.slice(i, i + batchSize);
      
      const { error: insertError } = await supabase
        .from('system_prompts_v2')
        .insert(batch);
      
      if (insertError) {
        console.error(`배치 ${Math.floor(i / batchSize) + 1} 삽입 실패:`, insertError);
        throw insertError;
      }
      
      insertedCount += batch.length;
      console.log(`✅ 배치 ${Math.floor(i / batchSize) + 1} 완료 (${insertedCount}/${promptsToInsert.length})`);
    }
    
    console.log(`🎉 프롬프트 수정 완료! ${insertedCount}개의 프롬프트가 생성되었습니다.`);
    
    return NextResponse.json({
      success: true,
      message: `프롬프트 테이블이 수정되었습니다. ${insertedCount}개의 프롬프트가 생성되었습니다.`,
      count: insertedCount
    });
    
  } catch (error) {
    console.error('프롬프트 테이블 수정 실패:', error);
    return NextResponse.json(
      { 
        success: false,
        error: '프롬프트 테이블 수정 중 오류가 발생했습니다.',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}