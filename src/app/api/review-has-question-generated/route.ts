import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { dryRun = true, statuses = [], sessionRange = null } = await request.json();

    // 1. 상태별 필터링하여 content_set_id 조회 (페이지네이션 적용)
    let allSets: any[] = [];
    let currentPage = 0;
    const pageSize = 1000;
    let hasMoreData = true;

    console.log(`📊 검수 시작 - 상태: ${statuses.join(', ')}, 차시: ${sessionRange ? `${sessionRange.start}-${sessionRange.end}` : '전체'}`);

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

    console.log(`📝 총 ${contentSetIds.length}개 콘텐츠 세트의 어휘 조회 시작`);

    // 2. vocabulary_terms 테이블에서 해당 content_set_id의 모든 레코드 조회 (페이지네이션 적용)
    // contentSetIds를 청크로 나누어 조회 (in 절 제한 고려)
    const chunkSize = 100;
    let allTerms: any[] = [];

    for (let i = 0; i < contentSetIds.length; i += chunkSize) {
      const chunk = contentSetIds.slice(i, i + chunkSize);

      // 각 청크에 대해 페이지네이션
      let pageNum = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('vocabulary_terms')
          .select('*')
          .in('content_set_id', chunk)
          .range(pageNum * 1000, (pageNum + 1) * 1000 - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allTerms.push(...data);
          if (data.length < 1000) hasMore = false;
        } else {
          hasMore = false;
        }
        pageNum++;
      }

      console.log(`  청크 ${Math.floor(i / chunkSize) + 1}/${Math.ceil(contentSetIds.length / chunkSize)}: ${allTerms.length}개 누적`);
    }

    console.log(`📄 총 ${allTerms.length}개 어휘 조회 완료`);

    if (allTerms.length === 0) {
      return NextResponse.json({
        success: true,
        dryRun,
        message: '검수 대상 어휘가 없습니다.',
        samples: []
      });
    }

    // 3. 각 term에 대해 vocabulary_questions에 해당 문제가 있는지 확인
    const updates: any[] = [];

    console.log(`🔍 ${allTerms.length}개 어휘의 has_question_generated 필드 검증 시작`);

    for (const term of allTerms) {
      // 해당 content_set_id와 term으로 vocabulary_questions 조회
      const { data: questions, error: questionsError } = await supabase
        .from('vocabulary_questions')
        .select('id')
        .eq('content_set_id', term.content_set_id)
        .eq('term', term.term);

      if (questionsError) {
        console.error(`Error checking questions for term ${term.term}:`, questionsError);
        continue;
      }

      const hasQuestion = questions && questions.length > 0;
      const currentValue = term.has_question_generated;

      // 현재 값과 실제 값이 다른 경우만 업데이트 대상에 추가
      if (currentValue !== hasQuestion) {
        updates.push({
          id: term.id,
          content_set_id: term.content_set_id,
          term: term.term,
          current: currentValue,
          should_be: hasQuestion,
          needsUpdate: true,
          reason: hasQuestion
            ? '어휘문제가 존재하지만 FALSE로 표시됨'
            : '어휘문제가 없지만 TRUE로 표시됨'
        });
      }
    }

    console.log(`✅ ${updates.length}개의 불일치 항목 발견`);

    // 4. 드라이런 모드
    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        message: `드라이런 모드: ${updates.length}개의 어휘 항목이 수정됩니다.`,
        totalRecords: allTerms.length,
        affectedRecords: updates.length,
        samples: updates.slice(0, 15)
      });
    }

    // 5. 실제 업데이트 (배치 처리)
    let successCount = 0;
    let errorCount = 0;
    const batchSize = 100;

    console.log(`🔄 ${updates.length}개 어휘 항목 업데이트 시작`);

    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);

      const batchPromises = batch.map(async (update) => {
        try {
          const { error } = await supabase
            .from('vocabulary_terms')
            .update({ has_question_generated: update.should_be })
            .eq('id', update.id);

          return error ? { success: false } : { success: true };
        } catch (err) {
          console.error(`Error updating term ${update.id}:`, err);
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
      message: `has_question_generated 검수 완료: ${successCount}개 성공, ${errorCount}개 실패`,
      successCount,
      errorCount,
      totalProcessed: updates.length
    });

  } catch (error) {
    console.error('has_question_generated 검수 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
}
