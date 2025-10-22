import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 큰따옴표를 작은따옴표로 변환하는 함수
const convertQuotes = (text: string): string => {
  if (!text) return text;

  // 큰따옴표(")를 작은따옴표(')로 변환
  return text.replace(/"/g, "'");
};

export async function POST(request: NextRequest) {
  try {
    const { dryRun = true } = await request.json();

    console.log('🔄 vocabulary_questions.explanation 큰따옴표 → 작은따옴표 변환 시작...');

    // explanation이 있는 모든 레코드 조회
    let allRecords: any[] = [];
    let currentPage = 0;
    const pageSize = 1000;
    let hasMoreData = true;

    while (hasMoreData) {
      console.log(`📄 페이지 ${currentPage + 1} 조회 중...`);

      const { data: pageData, error: fetchError } = await supabase
        .from('vocabulary_questions')
        .select('*')
        .not('explanation', 'is', null)
        .neq('explanation', '')
        .range(currentPage * pageSize, (currentPage + 1) * pageSize - 1);

      if (fetchError) {
        console.error(`페이지 ${currentPage + 1} 조회 오류:`, fetchError);
        return NextResponse.json({
          success: false,
          error: '데이터 조회 중 오류가 발생했습니다.',
          details: fetchError.message
        });
      }

      if (pageData && pageData.length > 0) {
        allRecords.push(...pageData);
        console.log(`✅ 페이지 ${currentPage + 1}: ${pageData.length}개 레코드 조회`);

        if (pageData.length < pageSize) {
          hasMoreData = false;
        }
      } else {
        hasMoreData = false;
      }

      currentPage++;
    }

    // 큰따옴표가 포함된 레코드 필터링
    const recordsWithDoubleQuotes = allRecords.filter(record => {
      const explanation = record.explanation || '';
      return explanation.includes('"');
    });

    console.log(`📊 큰따옴표가 포함된 explanation 레코드 수: ${recordsWithDoubleQuotes.length}개`);
    console.log(`📊 총 레코드 수: ${allRecords.length}개`);

    if (recordsWithDoubleQuotes.length === 0) {
      return NextResponse.json({
        success: true,
        message: '큰따옴표가 포함된 explanation이 없습니다.',
        totalFound: allRecords.length,
        needsUpdate: 0
      });
    }

    const updates: Array<{
      id: string;
      original: string;
      converted: string;
      needsUpdate: boolean;
    }> = [];

    // 각 레코드 분석
    for (const record of recordsWithDoubleQuotes) {
      const originalExplanation = record.explanation || '';
      const convertedExplanation = convertQuotes(originalExplanation);

      const needsUpdate = originalExplanation !== convertedExplanation;

      updates.push({
        id: record.id,
        original: originalExplanation,
        converted: convertedExplanation,
        needsUpdate
      });
    }

    const updatesNeeded = updates.filter(u => u.needsUpdate);

    console.log(`📝 변환이 필요한 레코드 수: ${updatesNeeded.length}`);

    if (dryRun) {
      // 드라이런 모드
      return NextResponse.json({
        success: true,
        dryRun: true,
        message: `드라이런 모드: ${updatesNeeded.length}개 explanation이 변환됩니다.`,
        totalRecords: allRecords.length,
        totalWithDoubleQuotes: recordsWithDoubleQuotes.length,
        needsUpdate: updatesNeeded.length,
        samples: updatesNeeded.slice(0, 15).map(u => ({
          id: u.id,
          before: u.original,
          after: u.converted,
          doubleQuoteCount: (u.original.match(/"/g) || []).length
        }))
      });
    }

    // 실제 업데이트 실행 (배치 처리)
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    const batchSize = 100;

    console.log(`🔄 ${updatesNeeded.length}개 레코드를 ${batchSize}개씩 배치 변환 시작...`);

    for (let i = 0; i < updatesNeeded.length; i += batchSize) {
      const batch = updatesNeeded.slice(i, i + batchSize);
      console.log(`📦 배치 ${Math.floor(i / batchSize) + 1}/${Math.ceil(updatesNeeded.length / batchSize)} 처리 중... (${batch.length}개)`);

      // 배치별로 병렬 처리
      const batchPromises = batch.map(async (update) => {
        try {
          const { error } = await supabase
            .from('vocabulary_questions')
            .update({
              explanation: update.converted
            })
            .eq('id', update.id);

          if (error) {
            console.error(`레코드 ${update.id} 변환 실패:`, error);
            return { success: false, id: update.id, error: error.message };
          } else {
            return { success: true, id: update.id };
          }
        } catch (error) {
          console.error(`레코드 ${update.id} 변환 중 예외:`, error);
          return {
            success: false,
            id: update.id,
            error: error instanceof Error ? error.message : '알 수 없는 오류'
          };
        }
      });

      // 배치 처리 완료 대기
      const batchResults = await Promise.all(batchPromises);

      // 결과 집계
      for (const result of batchResults) {
        if (result.success) {
          successCount++;
        } else {
          errorCount++;
          errors.push(`ID ${result.id}: ${result.error}`);
        }
      }

      console.log(`✅ 배치 ${Math.floor(i / batchSize) + 1} 완료: 성공 ${batchResults.filter(r => r.success).length}개, 실패 ${batchResults.filter(r => !r.success).length}개`);

      // 다음 배치 처리 전 잠시 대기 (API 부하 방지)
      if (i + batchSize < updatesNeeded.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`🎯 vocabulary_questions.explanation 큰따옴표 → 작은따옴표 변환 완료: 총 성공 ${successCount}개, 실패 ${errorCount}개`);

    return NextResponse.json({
      success: true,
      dryRun: false,
      message: `vocabulary_questions.explanation 변환 완료: ${successCount}개 성공, ${errorCount}개 실패`,
      totalRecords: allRecords.length,
      totalWithDoubleQuotes: recordsWithDoubleQuotes.length,
      needsUpdate: updatesNeeded.length,
      successCount,
      errorCount,
      errors: errors.slice(0, 10) // 최대 10개 오류만 반환
    });

  } catch (error) {
    console.error('vocabulary_questions.explanation 변환 중 오류:', error);
    return NextResponse.json({
      success: false,
      error: 'explanation 변환 중 서버 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    });
  }
}
