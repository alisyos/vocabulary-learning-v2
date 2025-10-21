import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 변환할 텍스트
const SEARCH_TEXT = '지문에서';
const REPLACE_TEXT = '이 글에서';

export async function POST(request: NextRequest) {
  try {
    const { dryRun = true } = await request.json();

    console.log(`🔄 comprehensive_questions.question_text "${SEARCH_TEXT}" → "${REPLACE_TEXT}" 변환 시작...`);

    // question_text에 '지문에서'가 포함된 모든 레코드 조회
    let allRecords: any[] = [];
    let currentPage = 0;
    const pageSize = 1000;
    let hasMoreData = true;

    while (hasMoreData) {
      console.log(`📄 페이지 ${currentPage + 1} 조회 중...`);

      const { data: pageData, error: fetchError } = await supabase
        .from('comprehensive_questions')
        .select('*')
        .not('question_text', 'is', null)
        .neq('question_text', '')
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

    // JavaScript에서 '지문에서'가 포함된 레코드 필터링
    const recordsWithSearchText = allRecords.filter(record => {
      const questionText = record.question_text || '';
      return questionText.includes(SEARCH_TEXT);
    });

    console.log(`📊 "${SEARCH_TEXT}"가 포함된 question_text 레코드 수: ${recordsWithSearchText.length}개`);
    console.log(`📊 총 레코드 수: ${allRecords.length}개`);

    if (recordsWithSearchText.length === 0) {
      return NextResponse.json({
        success: true,
        message: `"${SEARCH_TEXT}"가 포함된 question_text가 없습니다.`,
        totalRecords: allRecords.length,
        needsUpdate: 0
      });
    }

    const updates: Array<{
      id: string;
      original: string;
      converted: string;
      needsUpdate: boolean;
      occurrenceCount: number;
    }> = [];

    // 각 레코드 분석
    for (const record of recordsWithSearchText) {
      const originalText = record.question_text || '';
      const convertedText = originalText.replaceAll(SEARCH_TEXT, REPLACE_TEXT);
      const occurrenceCount = (originalText.match(new RegExp(SEARCH_TEXT, 'g')) || []).length;

      const needsUpdate = originalText !== convertedText;

      updates.push({
        id: record.id,
        original: originalText,
        converted: convertedText,
        needsUpdate,
        occurrenceCount
      });
    }

    const updatesNeeded = updates.filter(u => u.needsUpdate);

    console.log(`📝 변환이 필요한 레코드 수: ${updatesNeeded.length}`);

    if (dryRun) {
      // 드라이런 모드
      return NextResponse.json({
        success: true,
        dryRun: true,
        message: `드라이런 모드: ${updatesNeeded.length}개 question_text가 변환됩니다.`,
        totalRecords: allRecords.length,
        totalWithSearchText: recordsWithSearchText.length,
        needsUpdate: updatesNeeded.length,
        searchText: SEARCH_TEXT,
        replaceText: REPLACE_TEXT,
        samples: updatesNeeded.slice(0, 15).map(u => ({
          id: u.id,
          before: u.original,
          after: u.converted,
          occurrenceCount: u.occurrenceCount
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
            .from('comprehensive_questions')
            .update({
              question_text: update.converted
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

    console.log(`🎯 question_text "${SEARCH_TEXT}" → "${REPLACE_TEXT}" 변환 완료: 총 성공 ${successCount}개, 실패 ${errorCount}개`);

    return NextResponse.json({
      success: true,
      dryRun: false,
      message: `question_text 변환 완료: ${successCount}개 성공, ${errorCount}개 실패`,
      totalRecords: allRecords.length,
      totalWithSearchText: recordsWithSearchText.length,
      needsUpdate: updatesNeeded.length,
      successCount,
      errorCount,
      searchText: SEARCH_TEXT,
      replaceText: REPLACE_TEXT,
      errors: errors.slice(0, 10) // 최대 10개 오류만 반환
    });

  } catch (error) {
    console.error('question_text 변환 중 오류:', error);
    return NextResponse.json({
      success: false,
      error: 'question_text 변환 중 서버 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    });
  }
}
