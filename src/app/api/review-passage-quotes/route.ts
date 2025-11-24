import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 작은따옴표로 감싸진 단어를 찾아서 제거하는 함수
function removeQuotesFromText(text: string): string {
  if (!text) return text;

  // 모든 종류의 작은따옴표 패턴을 찾아서 단어만 남김
  // U+0027 ('), U+2018 ('), U+2019 ('), U+201A (‚), U+201B (‛) 모두 처리
  // 길이 제한 없이 모든 따옴표 처리
  return text.replace(/[\u0027\u2018\u2019\u201A\u201B]([^\u0027\u2018\u2019\u201A\u201B]+)[\u0027\u2018\u2019\u201A\u201B]/g, '$1');
}

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

    console.log(`📝 총 ${contentSetIds.length}개 콘텐츠 세트의 지문 조회 시작`);

    // 2. passages 테이블에서 해당 content_set_id의 모든 레코드 조회 (페이지네이션 적용)
    // contentSetIds를 청크로 나누어 조회 (in 절 제한 고려)
    const chunkSize = 100;
    let allPassages: any[] = [];

    for (let i = 0; i < contentSetIds.length; i += chunkSize) {
      const chunk = contentSetIds.slice(i, i + chunkSize);

      // 각 청크에 대해 페이지네이션
      let pageNum = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('passages')
          .select('*')
          .in('content_set_id', chunk)
          .range(pageNum * 1000, (pageNum + 1) * 1000 - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allPassages.push(...data);
          if (data.length < 1000) hasMore = false;
        } else {
          hasMore = false;
        }
        pageNum++;
      }

      console.log(`  청크 ${Math.floor(i / chunkSize) + 1}/${Math.ceil(contentSetIds.length / chunkSize)}: ${allPassages.length}개 누적`);
    }

    console.log(`📄 총 ${allPassages.length}개 지문 조회 완료`);

    if (allPassages.length === 0) {
      return NextResponse.json({
        success: true,
        dryRun,
        message: '검수 대상 지문이 없습니다.',
        samples: []
      });
    }

    // 3. 각 passage의 paragraph 필드 검사 및 변환
    const updates: any[] = [];

    for (const passage of allPassages) {
      for (let i = 1; i <= 10; i++) {
        const fieldName = `paragraph_${i}`;
        const original = passage[fieldName];

        if (!original) continue;

        const converted = removeQuotesFromText(original);

        if (original !== converted) {
          updates.push({
            id: passage.id,
            content_set_id: passage.content_set_id,
            paragraph_field: fieldName,
            original,
            converted,
            needsUpdate: true
          });
        }
      }
    }

    console.log(`✅ ${updates.length}개의 단락에서 따옴표 발견`);

    // 4. 드라이런 모드
    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        message: `드라이런 모드: ${updates.length}개의 단락이 수정됩니다.`,
        totalRecords: allPassages.length,
        affectedRecords: updates.length,
        samples: updates.slice(0, 15)
      });
    }

    // 5. 실제 업데이트 (passage별로 그룹화하여 처리)
    let successCount = 0;
    let errorCount = 0;

    // passage ID별로 업데이트를 그룹화
    const updatesByPassageId = new Map<string, any[]>();
    for (const update of updates) {
      if (!updatesByPassageId.has(update.id)) {
        updatesByPassageId.set(update.id, []);
      }
      updatesByPassageId.get(update.id)!.push(update);
    }

    console.log(`🔄 ${updatesByPassageId.size}개 지문 업데이트 시작`);

    // 각 passage에 대해 업데이트 실행
    for (const [passageId, passageUpdates] of updatesByPassageId) {
      try {
        // 해당 passage의 모든 필드 업데이트를 하나의 객체로 만듦
        const updateData: any = {};
        for (const update of passageUpdates) {
          updateData[update.paragraph_field] = update.converted;
        }

        const { error } = await supabase
          .from('passages')
          .update(updateData)
          .eq('id', passageId);

        if (error) {
          console.error(`Error updating passage ${passageId}:`, error);
          errorCount += passageUpdates.length;
        } else {
          successCount += passageUpdates.length;
        }
      } catch (err) {
        console.error(`Exception updating passage ${passageId}:`, err);
        errorCount += passageUpdates.length;
      }
    }

    console.log(`✅ 완료 - 성공: ${successCount}, 실패: ${errorCount}`);

    return NextResponse.json({
      success: true,
      dryRun: false,
      message: `지문 따옴표 검수 완료: ${successCount}개 성공, ${errorCount}개 실패`,
      successCount,
      errorCount,
      totalProcessed: updates.length
    });

  } catch (error) {
    console.error('지문 따옴표 검수 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
}
