import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    console.log('🏗️ system_prompts_v3 테이블 생성 시작...');
    
    // 1. 테이블 생성 SQL
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS system_prompts_v3 (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        prompt_id VARCHAR(255) NOT NULL UNIQUE,
        category VARCHAR(50) NOT NULL,
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
    
    // 2. 인덱스 생성 SQL
    const createIndexesSQL = `
      CREATE INDEX IF NOT EXISTS idx_system_prompts_v3_category ON system_prompts_v3(category);
      CREATE INDEX IF NOT EXISTS idx_system_prompts_v3_sub_category ON system_prompts_v3(sub_category);
      CREATE INDEX IF NOT EXISTS idx_system_prompts_v3_key ON system_prompts_v3(key);
      CREATE INDEX IF NOT EXISTS idx_system_prompts_v3_active ON system_prompts_v3(is_active);
      CREATE INDEX IF NOT EXISTS idx_system_prompts_v3_prompt_id ON system_prompts_v3(prompt_id);
    `;
    
    // 3. 트리거 생성 SQL
    const createTriggerSQL = `
      DROP TRIGGER IF EXISTS update_system_prompts_v3_updated_at ON system_prompts_v3;
      CREATE TRIGGER update_system_prompts_v3_updated_at 
        BEFORE UPDATE ON system_prompts_v3 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `;
    
    // SQL 실행
    console.log('📝 테이블 생성 중...');
    const { error: tableError } = await supabase.rpc('exec_sql', { 
      sql: createTableSQL 
    });
    
    if (tableError) {
      console.error('테이블 생성 실패:', tableError);
      // RPC 함수가 없을 수 있으므로 직접 쿼리 시도
      const { error: directError } = await supabase
        .from('system_prompts_v3')
        .select('id')
        .limit(1);
      
      if (directError && directError.code === '42P01') {
        throw new Error('테이블이 존재하지 않고 생성할 수 없습니다. Supabase Dashboard에서 수동으로 생성해주세요.');
      }
    }
    
    console.log('📊 인덱스 생성 중...');
    const { error: indexError } = await supabase.rpc('exec_sql', { 
      sql: createIndexesSQL 
    });
    
    if (indexError) {
      console.warn('인덱스 생성 실패 (무시):', indexError);
    }
    
    console.log('⚡ 트리거 생성 중...');
    const { error: triggerError } = await supabase.rpc('exec_sql', { 
      sql: createTriggerSQL 
    });
    
    if (triggerError) {
      console.warn('트리거 생성 실패 (무시):', triggerError);
    }
    
    // 테이블 존재 확인
    const { data: testData, error: testError } = await supabase
      .from('system_prompts_v3')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('테이블 확인 실패:', testError);
      throw new Error(`테이블 생성에 실패했습니다: ${testError.message}`);
    }
    
    console.log('✅ system_prompts_v3 테이블이 성공적으로 생성되었습니다.');
    
    return NextResponse.json({
      success: true,
      message: 'system_prompts_v3 테이블이 생성되었습니다.',
      nextStep: '/api/initialize-prompts-v3을 호출하여 데이터를 초기화하세요.'
    });
    
  } catch (error) {
    console.error('테이블 생성 실패:', error);
    return NextResponse.json({
      success: false,
      error: '테이블 생성 중 오류가 발생했습니다.',
      message: error instanceof Error ? error.message : 'Unknown error',
      instruction: 'Supabase Dashboard > SQL Editor에서 CREATE_NEW_PROMPTS_TABLE.sql을 직접 실행해주세요.'
    }, { status: 500 });
  }
}