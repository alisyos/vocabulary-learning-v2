import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    const results: any[] = [];

    const tables = ['vocabulary_questions', 'paragraph_questions', 'comprehensive_questions'];

    for (const tableName of tables) {
      console.log(`\n처리 중: ${tableName}`);

      // 페이지네이션으로 전체 레코드 조회
      let allRecords: any[] = [];
      let currentPage = 0;
      const pageSize = 1000;
      let hasMoreData = true;

      while (hasMoreData) {
        const { data: pageData, error: fetchError } = await supabase
          .from(tableName)
          .select('id, option_1, option_2, option_3, option_4, option_5')
          .range(currentPage * pageSize, (currentPage + 1) * pageSize - 1);

        if (fetchError) {
          console.error(`${tableName} 조회 오류:`, fetchError);
          throw fetchError;
        }

        if (pageData && pageData.length > 0) {
          allRecords.push(...pageData);
          console.log(`  - 페이지 ${currentPage + 1}: ${pageData.length}개 레코드 조회`);
          if (pageData.length < pageSize) hasMoreData = false;
        } else {
          hasMoreData = false;
        }
        currentPage++;
      }

      console.log(`  - 총 ${allRecords.length}개 레코드 조회 완료`);

      // 5자 미만이면서 '다.'로 끝나는 항목 찾기
      for (const record of allRecords) {
        for (let i = 1; i <= 5; i++) {
          const optionKey = `option_${i}`;
          const value = record[optionKey];

          if (value) {
            const trimmed = value.trim();

            // 5자 미만이면서 '다.'로 끝나는 경우
            if (trimmed.length < 5 && trimmed.endsWith('다.')) {
              results.push({
                table: tableName,
                id: record.id,
                option: optionKey,
                value: trimmed,
                length: trimmed.length
              });
            }
          }
        }
      }

      console.log(`  - 5자 미만 + '다.' 끝: ${results.filter(r => r.table === tableName).length}개`);
    }

    console.log(`\n총 발견: ${results.length}개`);

    // 테이블별 통계
    const statsByTable = tables.map(tableName => ({
      tableName,
      count: results.filter(r => r.table === tableName).length
    }));

    return NextResponse.json({
      success: true,
      message: `5자 미만이면서 '다.'로 끝나는 항목: ${results.length}개`,
      totalCount: results.length,
      statsByTable,
      samples: results.slice(0, 50),  // 샘플 50개
      allResults: results  // 전체 결과 (수가 많지 않을 것으로 예상)
    });

  } catch (error) {
    console.error('조회 중 오류 발생:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
}
