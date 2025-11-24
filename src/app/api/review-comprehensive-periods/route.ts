import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// '~다'로 끝나는데 마침표가 없는 경우 마침표 추가하는 함수
function addPeriodIfNeeded(text: string): string {
  if (!text || typeof text !== 'string') return text;

  const trimmed = text.trim();

  // '~다'로 끝나는 경우만 처리
  if (trimmed.endsWith('다') && !trimmed.endsWith('다.')) {
    return trimmed + '.';
  }

  // '다'로 끝나지 않는 경우 원본 그대로 반환 (trim 하지 않음)
  return text;
}

export async function POST(request: NextRequest) {
  try {
    const { dryRun = true, statuses = [], sessionRange = null } = await request.json();

    // 1. 상태별 필터링하여 content_set_id 조회 (페이지네이션 적용)
    let allSets: any[] = [];
    let currentPage = 0;
    const pageSize = 1000;
    let hasMoreData = true;

    console.log(`📊 종합문제 마침표 검수 시작 - 상태: ${statuses.join(', ')}, 차시: ${sessionRange ? `${sessionRange.start}-${sessionRange.end}` : '전체'}`);

    while (hasMoreData) {
      let query = supabase
        .from('content_sets')
        .select('id, session_number, status')
        .range(currentPage * pageSize, (currentPage + 1) * pageSize - 1);

      // 상태 필터링을 DB 레벨에서 수행
      if (statuses && statuses.length > 0) {
        query = query.in('status', statuses);
      }

      const { data: pageData, error: setsError } = await query;
      if (setsError) throw setsError;

      if (pageData && pageData.length > 0) {
        allSets.push(...pageData);
        console.log(`  페이지 ${currentPage + 1}: ${pageData.length}개 조회 (누적: ${allSets.length}개)`);
        if (pageData.length < pageSize) hasMoreData = false;
      } else {
        hasMoreData = false;
      }
      currentPage++;
    }

    // 차시 범위 필터링 (JavaScript에서 수행)
    let filteredSets = allSets;
    if (sessionRange && sessionRange.start && sessionRange.end) {
      filteredSets = filteredSets.filter(set => {
        if (!set.session_number) return false;

        // session_number가 숫자인 경우 파싱
        const sessionNum = parseInt(set.session_number, 10);
        if (!isNaN(sessionNum)) {
          return sessionNum >= sessionRange.start && sessionNum <= sessionRange.end;
        }

        return false;
      });
      console.log(`  차시 필터링 후: ${filteredSets.length}개`);
    }

    const contentSetIds = filteredSets.map(s => s.id);

    if (contentSetIds.length === 0) {
      return NextResponse.json({
        success: true,
        dryRun,
        message: `검수 대상이 없습니다. (상태: ${statuses.join(', ')})`,
        samples: []
      });
    }

    console.log(`📝 총 ${contentSetIds.length}개 콘텐츠 세트의 종합문제 조회 시작`);

    // 2. comprehensive_questions 테이블에서 해당 content_set_id의 모든 레코드 조회 (페이지네이션 적용)
    // contentSetIds를 청크로 나누어 조회 (in 절 제한 고려)
    const chunkSize = 100;
    let allQuestions: any[] = [];

    for (let i = 0; i < contentSetIds.length; i += chunkSize) {
      const chunk = contentSetIds.slice(i, i + chunkSize);

      // 각 청크에 대해 페이지네이션
      let pageNum = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('comprehensive_questions')
          .select('*')
          .in('content_set_id', chunk)
          .range(pageNum * 1000, (pageNum + 1) * 1000 - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allQuestions.push(...data);
          if (data.length < 1000) hasMore = false;
        } else {
          hasMore = false;
        }
        pageNum++;
      }

      console.log(`  청크 ${Math.floor(i / chunkSize) + 1}/${Math.ceil(contentSetIds.length / chunkSize)}: ${allQuestions.length}개 누적`);
    }

    console.log(`📄 총 ${allQuestions.length}개 종합문제 조회 완료`);

    if (allQuestions.length === 0) {
      return NextResponse.json({
        success: true,
        dryRun,
        message: '검수 대상 종합문제가 없습니다.',
        samples: []
      });
    }

    // 3. 각 문제의 선택지와 정답에서 마침표 검사 및 추가
    const updates: any[] = [];

    for (const question of allQuestions) {
      const fieldsToCheck = ['option_1', 'option_2', 'option_3', 'option_4', 'option_5', 'correct_answer'];
      let needsUpdate = false;
      const changedFields: any = {};

      for (const field of fieldsToCheck) {
        const original = question[field];
        if (!original) continue;

        const converted = addPeriodIfNeeded(original);

        if (original !== converted) {
          changedFields[field] = {
            original,
            converted
          };
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        updates.push({
          id: question.id,
          content_set_id: question.content_set_id,
          question_number: question.question_number,
          question_type: question.question_type,
          changedFields,
          updateData: Object.fromEntries(
            Object.entries(changedFields).map(([field, value]: [string, any]) => [field, value.converted])
          )
        });
      }
    }

    console.log(`✅ ${updates.length}개의 문제에서 마침표 누락 발견`);

    // 4. 드라이런 모드
    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        message: `드라이런 모드: ${updates.length}개의 문제가 수정됩니다.`,
        totalRecords: allQuestions.length,
        affectedRecords: updates.length,
        samples: updates.slice(0, 20)
      });
    }

    // 5. 실제 업데이트 (배치 처리)
    let successCount = 0;
    let errorCount = 0;
    const batchSize = 100;

    console.log(`🔄 ${updates.length}개 종합문제 업데이트 시작`);

    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);

      const batchPromises = batch.map(async (update) => {
        try {
          const { error } = await supabase
            .from('comprehensive_questions')
            .update(update.updateData)
            .eq('id', update.id);

          return error ? { success: false } : { success: true };
        } catch (err) {
          console.error(`Error updating question ${update.id}:`, err);
          return { success: false };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      successCount += batchResults.filter(r => r.success).length;
      errorCount += batchResults.filter(r => !r.success).length;

      // API 부하 방지를 위한 대기
      if (i + batchSize < updates.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`✅ 완료 - 성공: ${successCount}, 실패: ${errorCount}`);

    return NextResponse.json({
      success: true,
      dryRun: false,
      message: `종합문제 마침표 검수 완료: ${successCount}개 성공, ${errorCount}개 실패`,
      successCount,
      errorCount,
      totalProcessed: updates.length
    });

  } catch (error) {
    console.error('종합문제 마침표 검수 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
}
