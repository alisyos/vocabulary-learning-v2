import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    const results: any = {
      withDa: [],  // '다'로 끝나는 항목
      withDaPeriod: [],  // '다.'로 끝나는 항목
      needsPeriod: []  // 5자 이상이면서 '다'로 끝나지만 마침표 없는 항목
    };

    const tables = ['vocabulary_questions', 'paragraph_questions', 'comprehensive_questions'];

    for (const tableName of tables) {
      const { data, error } = await supabase
        .from(tableName)
        .select('id, option_1, option_2, option_3, option_4, option_5')
        .limit(1000);  // 1000개만 샘플링

      if (error) {
        console.error(`${tableName} 조회 오류:`, error);
        continue;
      }

      for (const record of data || []) {
        for (let i = 1; i <= 5; i++) {
          const optionKey = `option_${i}`;
          const value = record[optionKey];

          if (value) {
            const trimmed = value.trim();

            // '다'로 끝나는 항목
            if (trimmed.endsWith('다') && !trimmed.endsWith('다.')) {
              results.withDa.push({
                table: tableName,
                id: record.id,
                option: optionKey,
                value: trimmed,
                length: trimmed.length
              });

              // 5자 이상인 경우
              if (trimmed.length >= 5) {
                results.needsPeriod.push({
                  table: tableName,
                  id: record.id,
                  option: optionKey,
                  value: trimmed,
                  length: trimmed.length
                });
              }
            }

            // '다.'로 끝나는 항목
            if (trimmed.endsWith('다.')) {
              results.withDaPeriod.push({
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
    }

    return NextResponse.json({
      success: true,
      summary: {
        withDa: results.withDa.length,
        withDaPeriod: results.withDaPeriod.length,
        needsPeriod: results.needsPeriod.length
      },
      samples: {
        withDa: results.withDa.slice(0, 10),
        withDaPeriod: results.withDaPeriod.slice(0, 10),
        needsPeriod: results.needsPeriod.slice(0, 10)
      }
    });

  } catch (error) {
    console.error('디버깅 조회 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
}
