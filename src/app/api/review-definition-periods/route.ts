import { NextRequest, NextResponse } from 'next/server';
import { fetchAllFromTable, fetchAllContentSets, filterContentSets, batchUpdate } from '@/lib/reviewUtils';

// definition 값의 마지막 마침표를 제거하는 함수
function removePeriodIfPresent(text: string): string {
  if (!text || typeof text !== 'string') return text;
  const trimmed = text.trimEnd();
  if (trimmed.endsWith('.')) {
    return trimmed.slice(0, -1);
  }
  return text;
}

export async function POST(request: NextRequest) {
  try {
    const { dryRun = true, statuses = [], sessionRange = null } = await request.json();

    console.log(`📊 어휘 용어설명 마침표 검수 시작 - 상태: ${statuses.join(', ')}, 차시: ${sessionRange ? `${sessionRange.start}-${sessionRange.end}` : '전체'}`);

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

    console.log(`📝 총 ${contentSetIds.length}개 콘텐츠 세트의 어휘 용어 조회 시작`);

    // 2. vocabulary_terms 전체 조회 후 필터링
    const vocabularyTerms = await fetchAllFromTable('vocabulary_terms', contentSetIdSet);
    console.log(`📄 어휘 용어: 총 ${vocabularyTerms.length}개 조회`);

    // 3. definition 마침표 검사
    const updates: any[] = [];
    for (const term of vocabularyTerms) {
      const original = term.definition;
      if (!original) continue;

      const converted = removePeriodIfPresent(original);

      if (original !== converted) {
        updates.push({
          id: term.id,
          content_set_id: term.content_set_id,
          term: term.term,
          changedFields: {
            definition: {
              original,
              converted
            }
          },
          updateData: { definition: converted }
        });
      }
    }

    console.log(`✅ 전체: ${updates.length}개의 용어설명에서 마침표 발견`);

    // 4. 드라이런 모드
    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        message: `드라이런 모드: ${updates.length}개의 용어설명이 수정됩니다. (전체 ${vocabularyTerms.length}개 중)`,
        totalRecords: vocabularyTerms.length,
        affectedRecords: updates.length,
        samples: updates.slice(0, 20)
      });
    }

    // 5. 실제 업데이트 (배치 처리)
    if (updates.length === 0) {
      return NextResponse.json({
        success: true,
        dryRun: false,
        message: '수정할 대상이 없습니다.',
        successCount: 0,
        errorCount: 0,
        totalProcessed: 0
      });
    }

    console.log(`🔄 ${updates.length}개 용어설명 업데이트 시작`);

    const batchUpdates = updates.map(u => ({ id: u.id, data: u.updateData }));
    const result = await batchUpdate('vocabulary_terms', batchUpdates);

    console.log(`✅ 완료 - 성공: ${result.successCount}, 실패: ${result.errorCount}`);

    return NextResponse.json({
      success: true,
      dryRun: false,
      message: `어휘 용어설명 마침표 검수 완료: ${result.successCount}개 성공, ${result.errorCount}개 실패`,
      successCount: result.successCount,
      errorCount: result.errorCount,
      totalProcessed: updates.length
    });

  } catch (error) {
    console.error('어휘 용어설명 마침표 검수 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
}
