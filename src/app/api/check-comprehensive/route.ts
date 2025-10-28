import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // 1. 전체 레코드 수
    const { count: totalCount, error: totalError } = await supabase
      .from('comprehensive_questions')
      .select('*', { count: 'exact', head: true });

    if (totalError) throw totalError;

    // 2. question_format 값별 분포
    const { data: allData, error: dataError } = await supabase
      .from('comprehensive_questions')
      .select('question_format')
      .limit(1000);

    if (dataError) throw dataError;

    const formatCounts = allData?.reduce((acc: Record<string, number>, row: any) => {
      const format = row.question_format || 'null';
      acc[format] = (acc[format] || 0) + 1;
      return acc;
    }, {}) || {};

    // 3. 샘플 레코드 3개
    const { data: samples, error: sampleError } = await supabase
      .from('comprehensive_questions')
      .select('id, question_type, question_format, correct_answer, option_1, option_2')
      .limit(3);

    if (sampleError) throw sampleError;

    return NextResponse.json({
      success: true,
      totalCount,
      formatCounts,
      samples
    });
  } catch (error) {
    console.error('조회 실패:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}
