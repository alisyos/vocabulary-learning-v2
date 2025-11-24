import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    console.log('📊 Grade별 필드 값 분석 시작...');

    // 1. 모든 content_sets 조회
    let allSets: any[] = [];
    let currentPage = 0;
    const pageSize = 1000;
    let hasMoreData = true;

    while (hasMoreData) {
      const { data: pageData, error: fetchError } = await supabase
        .from('content_sets')
        .select('*')
        .range(currentPage * pageSize, (currentPage + 1) * pageSize - 1);

      if (fetchError) throw fetchError;

      if (pageData && pageData.length > 0) {
        allSets.push(...pageData);
        if (pageData.length < pageSize) hasMoreData = false;
      } else {
        hasMoreData = false;
      }
      currentPage++;
    }

    console.log(`✅ 총 ${allSets.length}개 콘텐츠 세트 조회 완료`);

    // 2. grade별로 필드 값 분포 분석
    const fieldsToAnalyze = ['division', 'passage_length', 'text_type', 'session_number', 'grade_number'];
    const gradeAnalysis = new Map<string, any>();

    for (const record of allSets) {
      const { grade } = record;
      if (!grade) continue;

      if (!gradeAnalysis.has(grade)) {
        gradeAnalysis.set(grade, {
          count: 0,
          fields: {}
        });

        for (const field of fieldsToAnalyze) {
          gradeAnalysis.get(grade)!.fields[field] = new Map<string, number>();
        }
      }

      const gradeData = gradeAnalysis.get(grade)!;
      gradeData.count++;

      for (const field of fieldsToAnalyze) {
        const value = record[field] || '(null)';
        const fieldMap = gradeData.fields[field];
        fieldMap.set(value, (fieldMap.get(value) || 0) + 1);
      }
    }

    // 3. 분석 결과 정리
    const analysis: any[] = [];

    for (const [grade, data] of gradeAnalysis) {
      const gradeInfo: any = {
        grade,
        totalRecords: data.count,
        fieldDistributions: {}
      };

      for (const field of fieldsToAnalyze) {
        const fieldMap = data.fields[field];
        const sorted = Array.from(fieldMap.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([value, count]) => ({
            value,
            count,
            percentage: ((count / data.count) * 100).toFixed(1) + '%'
          }));

        gradeInfo.fieldDistributions[field] = {
          values: sorted,
          mostCommon: sorted[0]?.value,
          hasMultipleValues: sorted.length > 1
        };
      }

      analysis.push(gradeInfo);
    }

    // grade 이름으로 정렬
    analysis.sort((a, b) => a.grade.localeCompare(b.grade));

    console.log(`📊 ${gradeAnalysis.size}개 grade 분석 완료`);

    return NextResponse.json({
      success: true,
      totalRecords: allSets.length,
      totalGrades: gradeAnalysis.size,
      analysis
    });

  } catch (error) {
    console.error('분석 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
}
