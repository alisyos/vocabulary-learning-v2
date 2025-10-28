import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    const tables = ['vocabulary_questions', 'paragraph_questions', 'comprehensive_questions'];
    const results: any = {};

    for (const tableName of tables) {
      const { data, error } = await supabase
        .from(tableName)
        .select('id, option_1, option_2, option_3, option_4, option_5')
        .limit(10);

      if (error) {
        console.error(`${tableName} 조회 오류:`, error);
        continue;
      }

      const samples = [];

      for (const record of data || []) {
        const options: any = {};

        for (let i = 1; i <= 5; i++) {
          const optionKey = `option_${i}`;
          const value = record[optionKey];

          if (value) {
            const trimmed = value.trim();
            options[optionKey] = {
              value: value,
              length: trimmed.length,
              endsWithDa: trimmed.endsWith('다'),
              endsWithDaPeriod: trimmed.endsWith('다.'),
              needsPeriod: trimmed.length >= 5 && trimmed.endsWith('다') && !trimmed.endsWith('다.')
            };
          }
        }

        samples.push({
          id: record.id,
          options
        });
      }

      results[tableName] = samples;
    }

    return NextResponse.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('샘플 조회 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
}
