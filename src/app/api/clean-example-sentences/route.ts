import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// example_sentence 필드 정리 함수
const cleanExampleSentence = (sentence: string): string => {
  if (!sentence) return sentence;

  let cleaned = sentence.trim();

  // 1. 시작 부분의 불완전한 괄호 제거 (예: ")내용" -> "내용")
  cleaned = cleaned.replace(/^[)]/, '');

  // 2. 끝 부분의 불완전한 괄호 제거 (예: "내용(" -> "내용")
  cleaned = cleaned.replace(/[(]$/, '');

  // 3. 끝 부분의 ")." 패턴 정리 (예: "불었다)." -> "불었다.")
  cleaned = cleaned.replace(/\)\.$/, '.');

  // 4. 끝 부분의 단독 ")" 제거 (예: "불었다)" -> "불었다")
  cleaned = cleaned.replace(/\)$/, '');

  // 5. 시작 부분의 단독 "(" 제거 (예: "(불었다" -> "불었다")
  cleaned = cleaned.replace(/^[(]/, '');

  // 6. 중간에 있는 이상한 괄호 패턴들 정리
  // 예: "내용)추가내용" -> "내용 추가내용"
  cleaned = cleaned.replace(/\)([가-힣a-zA-Z])/g, ' $1');

  // 예: "내용(추가내용" -> "내용 추가내용"
  cleaned = cleaned.replace(/([가-힣a-zA-Z])\(/g, '$1 ');

  // 7. 여러 공백을 하나로 정리
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
};

export async function POST(request: NextRequest) {
  try {
    const { dryRun = true } = await request.json();

    console.log('🧹 example_sentence 필드 정리 작업 시작...');

    // example_sentence가 있는 모든 레코드 조회 후 JavaScript에서 필터링
    let allRecords: any[] = [];
    let currentPage = 0;
    const pageSize = 1000;
    let hasMoreData = true;

    while (hasMoreData) {
      console.log(`📄 페이지 ${currentPage + 1} 조회 중...`);

      const { data: pageData, error: fetchError } = await supabase
        .from('vocabulary_terms')
        .select('*')
        .not('example_sentence', 'is', null)
        .neq('example_sentence', '')
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

    // JavaScript에서 괄호가 포함된 레코드 필터링
    const allProblematicRecords = allRecords.filter(record => {
      const sentence = record.example_sentence || '';
      return sentence.includes('(') || sentence.includes(')');
    });

    console.log(`📊 괄호가 포함된 example_sentence 레코드 수: ${allProblematicRecords.length}`);

    if (allProblematicRecords.length === 0) {
      return NextResponse.json({
        success: true,
        message: '정리가 필요한 example_sentence가 없습니다.',
        totalFound: 0,
        needsUpdate: 0
      });
    }

    const updates: Array<{
      id: string;
      original: string;
      cleaned: string;
      needsUpdate: boolean;
    }> = [];

    // 각 레코드 분석
    for (const record of allProblematicRecords) {
      const originalSentence = record.example_sentence || '';
      const cleanedSentence = cleanExampleSentence(originalSentence);

      const needsUpdate = originalSentence !== cleanedSentence;

      updates.push({
        id: record.id,
        original: originalSentence,
        cleaned: cleanedSentence,
        needsUpdate
      });
    }

    const updatesNeeded = updates.filter(u => u.needsUpdate);

    console.log(`📝 정리가 필요한 레코드 수: ${updatesNeeded.length}`);

    if (dryRun) {
      // 드라이런 모드
      return NextResponse.json({
        success: true,
        dryRun: true,
        message: `드라이런 모드: ${updatesNeeded.length}개 example_sentence가 정리됩니다.`,
        totalFound: allProblematicRecords.length,
        needsUpdate: updatesNeeded.length,
        samples: updatesNeeded.slice(0, 10).map(u => ({
          id: u.id,
          before: u.original,
          after: u.cleaned
        }))
      });
    }

    // 실제 업데이트 실행 (배치 처리)
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    const batchSize = 100;

    console.log(`🔄 ${updatesNeeded.length}개 레코드를 ${batchSize}개씩 배치 정리 시작...`);

    for (let i = 0; i < updatesNeeded.length; i += batchSize) {
      const batch = updatesNeeded.slice(i, i + batchSize);
      console.log(`📦 배치 ${Math.floor(i / batchSize) + 1}/${Math.ceil(updatesNeeded.length / batchSize)} 처리 중... (${batch.length}개)`);

      // 배치별로 병렬 처리
      const batchPromises = batch.map(async (update) => {
        try {
          const { error } = await supabase
            .from('vocabulary_terms')
            .update({
              example_sentence: update.cleaned
            })
            .eq('id', update.id);

          if (error) {
            console.error(`레코드 ${update.id} 정리 실패:`, error);
            return { success: false, id: update.id, error: error.message };
          } else {
            return { success: true, id: update.id };
          }
        } catch (error) {
          console.error(`레코드 ${update.id} 정리 중 예외:`, error);
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

    console.log(`🎯 example_sentence 정리 완료: 총 성공 ${successCount}개, 실패 ${errorCount}개`);

    return NextResponse.json({
      success: true,
      dryRun: false,
      message: `example_sentence 정리 완료: ${successCount}개 성공, ${errorCount}개 실패`,
      totalFound: allProblematicRecords.length,
      needsUpdate: updatesNeeded.length,
      successCount,
      errorCount,
      errors: errors.slice(0, 10) // 최대 10개 오류만 반환
    });

  } catch (error) {
    console.error('example_sentence 정리 중 오류:', error);
    return NextResponse.json({
      success: false,
      error: 'example_sentence 정리 중 서버 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    });
  }
}