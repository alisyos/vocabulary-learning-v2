import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST() {
  try {
    console.log('vocabulary_questions 테이블에 term 컬럼 추가 중...');
    
    // 컬럼이 이미 존재하는지 확인
    const { data: columns, error: columnCheckError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'vocabulary_questions')
      .eq('column_name', 'term');

    if (columnCheckError) {
      console.log('컬럼 확인 중 오류 (무시하고 계속):', columnCheckError.message);
    }

    if (columns && columns.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'term 컬럼이 이미 존재합니다.',
        alreadyExists: true
      });
    }

    // ALTER TABLE을 사용하여 컬럼 추가
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE vocabulary_questions ADD COLUMN IF NOT EXISTS term VARCHAR(100);'
    });

    if (alterError) {
      console.error('ALTER TABLE 실행 실패:', alterError);
      
      // 직접 SQL 실행이 안되면 사용자에게 수동 실행 안내
      return NextResponse.json({
        success: false,
        message: '자동 마이그레이션 실패. 수동으로 실행해주세요.',
        manual_sql: 'ALTER TABLE vocabulary_questions ADD COLUMN IF NOT EXISTS term VARCHAR(100);',
        error: alterError.message
      });
    }

    return NextResponse.json({
      success: true,
      message: 'vocabulary_questions 테이블에 term 컬럼을 성공적으로 추가했습니다.'
    });

  } catch (error) {
    console.error('마이그레이션 중 오류:', error);
    
    return NextResponse.json({
      success: false,
      message: '마이그레이션 중 오류가 발생했습니다.',
      manual_sql: 'ALTER TABLE vocabulary_questions ADD COLUMN IF NOT EXISTS term VARCHAR(100);',
      instruction: 'Supabase 콘솔의 SQL Editor에서 위 SQL을 실행해주세요.',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 