import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('Testing Supabase connection...');
    
    // 환경 변수 확인
    const envCheck = {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    };
    
    console.log('Environment variables check:', envCheck);
    
    // 누락된 환경 변수 확인
    const missingVars = Object.entries(envCheck)
      .filter(([key, exists]) => !exists)
      .map(([key]) => key);
    
    if (missingVars.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Supabase 환경 변수가 설정되지 않았습니다.',
        missingVariables: missingVars,
        envCheck,
        message: '다음 환경 변수들을 .env.local 파일에 설정해주세요:\n' +
                'NEXT_PUBLIC_SUPABASE_URL\n' +
                'NEXT_PUBLIC_SUPABASE_ANON_KEY'
      }, { status: 400 });
    }
    
    // Supabase 연결 테스트 - 간단한 쿼리 실행
    const { data, error } = await supabase
      .from('content_sets')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json({
        success: false,
        error: 'Supabase 데이터베이스 연결 실패',
        details: error.message,
        recommendations: [
          '1. Supabase 프로젝트가 활성화되어 있는지 확인하세요.',
          '2. 환경 변수가 올바르게 설정되었는지 확인하세요.',
          '3. 데이터베이스 스키마가 올바르게 생성되었는지 확인하세요.',
          '4. Supabase 프로젝트의 네트워크 설정을 확인하세요.'
        ]
      }, { status: 500 });
    }
    
    console.log('Supabase connection successful');
    
    // 테이블 존재 여부 확인
    const tables = ['content_sets', 'passages', 'vocabulary_terms', 'vocabulary_questions', 'comprehensive_questions', 'ai_generation_logs', 'system_prompts'];
    const tableChecks = [];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('count')
          .limit(1);
        
        tableChecks.push({
          table,
          exists: !error,
          error: error?.message || null
        });
      } catch (err) {
        tableChecks.push({
          table,
          exists: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      }
    }
    
    const missingTables = tableChecks.filter(check => !check.exists);
    
    return NextResponse.json({
      success: true,
      message: 'Supabase 연결이 성공적으로 확인되었습니다.',
      connectionInfo: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        authenticated: true,
        tablesChecked: tables.length,
        tablesFound: tableChecks.filter(check => check.exists).length
      },
      tableChecks,
      missingTables: missingTables.map(t => t.table),
      envCheck,
      recommendations: missingTables.length > 0 ? 
        `다음 테이블들이 누락되었습니다: ${missingTables.map(t => t.table).join(', ')}. supabase-schema.sql을 실행해주세요.` :
        '모든 필요한 테이블이 존재합니다.'
    });
    
  } catch (error) {
    console.error('Supabase connection test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Supabase 연결 테스트 실패',
      details: error instanceof Error ? error.message : '알 수 없는 오류',
      stack: error instanceof Error ? error.stack : undefined,
      recommendations: [
        '1. .env.local 파일에 Supabase 환경 변수를 정확히 설정했는지 확인하세요.',
        '2. Supabase 프로젝트가 활성화되어 있는지 확인하세요.',
        '3. supabase-schema.sql 파일을 실행해 데이터베이스 스키마를 생성했는지 확인하세요.',
        '4. Supabase 프로젝트 URL과 anon key가 정확한지 확인하세요.'
      ]
    }, { status: 500 });
  }
}