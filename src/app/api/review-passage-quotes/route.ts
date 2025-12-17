import { NextRequest, NextResponse } from 'next/server';
import { fetchAllFromTable, fetchAllContentSets, filterContentSets, batchUpdate } from '@/lib/reviewUtils';

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

    console.log(`📊 검수 시작 - 상태: ${statuses.join(', ')}, 차시: ${sessionRange ? `${sessionRange.start}-${sessionRange.end}` : '전체'}`);

    // 1. content_sets 전체 조회 및 필터링
    const allSets = await fetchAllContentSets();
    const filteredSets = filterContentSets(allSets, statuses, sessionRange);
    const contentSetIds = filteredSets.map(s => s.id);
    const contentSetIdSet = new Set(contentSetIds);

    if (contentSetIds.length === 0) {
      return NextResponse.json({
        success: true,
        dryRun,
        message: `검수 대상이 없습니다. (상태: ${statuses.join(', ')})`,
        samples: []
      });
    }

    console.log(`📝 총 ${contentSetIds.length}개 콘텐츠 세트의 지문 조회 시작`);

    // 2. passages 테이블 전체 조회 후 필터링
    const allPassages = await fetchAllFromTable('passages', contentSetIdSet);

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

    // batchUpdate 형식에 맞게 변환
    const batchUpdates = Array.from(updatesByPassageId.entries()).map(([passageId, passageUpdates]) => {
      const updateData: Record<string, any> = {};
      for (const update of passageUpdates) {
        updateData[update.paragraph_field] = update.converted;
      }
      return { id: passageId, data: updateData };
    });

    const result = await batchUpdate('passages', batchUpdates);

    // 개별 필드 기준으로 성공/실패 계산
    for (const [passageId, passageUpdates] of updatesByPassageId) {
      const updateResult = batchUpdates.find(u => u.id === passageId);
      if (updateResult) {
        successCount += passageUpdates.length;
      }
    }

    console.log(`✅ 완료 - 성공: ${result.successCount}개 지문, 실패: ${result.errorCount}개 지문`);

    return NextResponse.json({
      success: true,
      dryRun: false,
      message: `지문 따옴표 검수 완료: ${result.successCount}개 지문 성공, ${result.errorCount}개 지문 실패`,
      successCount: result.successCount,
      errorCount: result.errorCount,
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
