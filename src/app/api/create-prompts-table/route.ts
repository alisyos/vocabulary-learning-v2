import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 system_prompts_v3 테이블 생성 시작...');

    // 테이블 생성 SQL
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS system_prompts_v3 (
        id SERIAL PRIMARY KEY,
        prompt_id VARCHAR(100) UNIQUE NOT NULL,
        category VARCHAR(50) NOT NULL,
        sub_category VARCHAR(100) NOT NULL,
        name VARCHAR(200) NOT NULL,
        key VARCHAR(100) NOT NULL,
        prompt_text TEXT NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        is_default BOOLEAN DEFAULT true,
        version INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(100),
        updated_by VARCHAR(100),
        UNIQUE(category, sub_category, key)
      );
    `;

    // SQL 실행
    const { data, error } = await supabase.rpc('exec_sql', {
      query: createTableSQL
    });

    if (error) {
      // RPC 함수가 없는 경우 직접 실행 시도
      console.error('RPC 실행 실패:', error);
      
      // 대안: Supabase 대시보드에서 직접 실행하도록 안내
      return NextResponse.json({
        success: false,
        error: '테이블 생성 실패',
        message: 'Supabase 대시보드에서 직접 SQL을 실행해주세요.',
        sql: createTableSQL,
        instruction: '이 SQL을 Supabase 대시보드의 SQL Editor에서 실행하세요.'
      }, { status: 500 });
    }

    console.log('✅ system_prompts_v3 테이블 생성 성공');

    // 초기 데이터 삽입
    const { DEFAULT_PROMPTS_V2 } = await import('@/lib/promptsV2');
    const prompts = DEFAULT_PROMPTS_V2;

    console.log(`📝 ${prompts.length}개의 프롬프트 삽입 시작...`);

    // 프롬프트 데이터 삽입
    for (const prompt of prompts) {
      const insertData = {
        prompt_id: prompt.promptId,
        category: prompt.category,
        sub_category: prompt.subCategory,
        name: prompt.name,
        key: prompt.key,
        prompt_text: prompt.promptText,
        description: prompt.description || '',
        is_active: prompt.isActive,
        is_default: prompt.isDefault,
        version: prompt.version || 1,
        created_by: 'system',
        updated_by: 'system'
      };

      const { error: insertError } = await supabase
        .from('system_prompts_v3')
        .insert(insertData);

      if (insertError) {
        console.error(`프롬프트 삽입 실패 (${prompt.promptId}):`, insertError);
      } else {
        console.log(`✅ 프롬프트 삽입 성공: ${prompt.promptId}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'system_prompts_v3 테이블이 생성되고 초기 데이터가 삽입되었습니다.',
      count: prompts.length
    });

  } catch (error) {
    console.error('테이블 생성 중 오류:', error);
    return NextResponse.json({
      success: false,
      error: '테이블 생성 중 오류가 발생했습니다.',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // 테이블 존재 여부 확인
    const { data, error } = await supabase
      .from('system_prompts_v3')
      .select('count')
      .limit(1);

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({
          success: false,
          exists: false,
          message: 'system_prompts_v3 테이블이 존재하지 않습니다.',
          createUrl: '/api/create-prompts-table',
          method: 'POST'
        });
      }
      throw error;
    }

    const { count, error: countError } = await supabase
      .from('system_prompts_v3')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      exists: true,
      count: count || 0,
      message: `system_prompts_v3 테이블이 존재합니다. (${count || 0}개 레코드)`
    });

  } catch (error) {
    console.error('테이블 확인 중 오류:', error);
    return NextResponse.json({
      success: false,
      error: '테이블 확인 중 오류가 발생했습니다.',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}