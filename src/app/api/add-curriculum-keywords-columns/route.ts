import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET() {
  try {
    // 1. 컬럼 추가
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE curriculum_data 
        ADD COLUMN IF NOT EXISTS keywords_for_passages TEXT DEFAULT '',
        ADD COLUMN IF NOT EXISTS keywords_for_questions TEXT DEFAULT '';
      `
    }).single();

    // RPC 함수가 없는 경우 직접 쿼리 실행
    if (alterError && alterError.message.includes('exec_sql')) {
      // Supabase에서 직접 SQL 실행이 불가능한 경우
      // 컬럼이 이미 존재하는지 확인
      const { data: columns, error: columnError } = await supabase
        .from('curriculum_data')
        .select('*')
        .limit(1);

      if (columnError) {
        throw columnError;
      }

      // 샘플 데이터로 컬럼 존재 여부 확인
      if (columns && columns.length > 0) {
        const sampleRow = columns[0];
        const hasPassagesColumn = 'keywords_for_passages' in sampleRow;
        const hasQuestionsColumn = 'keywords_for_questions' in sampleRow;

        if (hasPassagesColumn && hasQuestionsColumn) {
          return NextResponse.json({
            success: true,
            message: '컬럼이 이미 존재합니다.',
            columns: {
              keywords_for_passages: hasPassagesColumn,
              keywords_for_questions: hasQuestionsColumn
            }
          });
        } else {
          return NextResponse.json({
            success: false,
            message: '컬럼이 존재하지 않습니다. Supabase 대시보드에서 직접 SQL을 실행해주세요.',
            sql: `
ALTER TABLE curriculum_data 
ADD COLUMN IF NOT EXISTS keywords_for_passages TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS keywords_for_questions TEXT DEFAULT '';
            `,
            instructions: [
              '1. Supabase 대시보드로 이동',
              '2. SQL Editor 섹션 접속',
              '3. 위의 SQL 쿼리 실행',
              '4. 실행 완료 후 페이지 새로고침'
            ]
          });
        }
      }
    }

    // 2. 컬럼 정보 조회
    const { data: tableInfo, error: infoError } = await supabase
      .from('curriculum_data')
      .select('*')
      .limit(1);

    if (infoError) {
      throw infoError;
    }

    // 3. 컬럼 존재 확인
    let hasPassagesColumn = false;
    let hasQuestionsColumn = false;
    
    if (tableInfo && tableInfo.length > 0) {
      const sampleRow = tableInfo[0];
      hasPassagesColumn = 'keywords_for_passages' in sampleRow;
      hasQuestionsColumn = 'keywords_for_questions' in sampleRow;
    }

    return NextResponse.json({
      success: true,
      message: '컬럼 추가 프로세스 완료',
      columns: {
        keywords_for_passages: hasPassagesColumn,
        keywords_for_questions: hasQuestionsColumn
      },
      note: hasPassagesColumn && hasQuestionsColumn 
        ? '모든 컬럼이 정상적으로 존재합니다.'
        : '일부 컬럼이 누락되었습니다. Supabase 대시보드에서 확인해주세요.'
    });

  } catch (error) {
    console.error('컬럼 추가 오류:', error);
    
    // 오류 발생 시에도 안내 메시지 제공
    return NextResponse.json({
      success: false,
      message: '자동 컬럼 추가 실패. 수동으로 추가해주세요.',
      error: error instanceof Error ? error.message : 'Unknown error',
      sql: `
-- Supabase SQL Editor에서 다음 쿼리를 실행하세요:

ALTER TABLE curriculum_data 
ADD COLUMN IF NOT EXISTS keywords_for_passages TEXT DEFAULT '';

ALTER TABLE curriculum_data 
ADD COLUMN IF NOT EXISTS keywords_for_questions TEXT DEFAULT '';

-- 확인용 쿼리
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'curriculum_data' 
AND column_name IN ('keywords_for_passages', 'keywords_for_questions');
      `,
      instructions: [
        '1. Supabase 프로젝트 대시보드 접속',
        '2. 왼쪽 메뉴에서 "SQL Editor" 클릭',
        '3. "New query" 버튼 클릭',
        '4. 위의 SQL 쿼리 복사하여 붙여넣기',
        '5. "Run" 버튼 클릭하여 실행',
        '6. 실행 완료 후 이 페이지 새로고침'
      ]
    }, { status: 500 });
  }
}