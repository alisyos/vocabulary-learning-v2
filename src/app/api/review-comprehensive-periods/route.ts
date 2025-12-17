import { NextRequest, NextResponse } from 'next/server';
import { fetchAllFromTable, fetchAllContentSets, filterContentSets, batchUpdate } from '@/lib/reviewUtils';

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

    console.log(`📊 종합/문단 문제 마침표 검수 시작 - 상태: ${statuses.join(', ')}, 차시: ${sessionRange ? `${sessionRange.start}-${sessionRange.end}` : '전체'}`);

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

    console.log(`📝 총 ${contentSetIds.length}개 콘텐츠 세트의 종합/문단 문제 조회 시작`);

    // 2. comprehensive_questions 전체 조회 후 필터링
    const comprehensiveFieldsToCheck = ['option_1', 'option_2', 'option_3', 'option_4', 'option_5', 'correct_answer'];
    const comprehensiveQuestions = await fetchAllFromTable('comprehensive_questions', contentSetIdSet);
    console.log(`📄 종합문제: 총 ${comprehensiveQuestions.length}개 조회`);

    // 종합문제 마침표 검사
    const comprehensiveUpdates: any[] = [];
    for (const question of comprehensiveQuestions) {
      let needsUpdate = false;
      const changedFields: any = {};

      for (const field of comprehensiveFieldsToCheck) {
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
        comprehensiveUpdates.push({
          id: question.id,
          content_set_id: question.content_set_id,
          question_number: question.question_number,
          question_type: question.question_type,
          tableName: 'comprehensive_questions',
          changedFields,
          updateData: Object.fromEntries(
            Object.entries(changedFields).map(([field, value]: [string, any]) => [field, value.converted])
          )
        });
      }
    }

    console.log(`  종합문제: ${comprehensiveUpdates.length}개 마침표 누락 발견`);

    // 3. paragraph_questions 전체 조회 후 필터링
    const paragraphFieldsToCheck = ['option_1', 'option_2', 'option_3', 'option_4', 'option_5'];
    const paragraphQuestions = await fetchAllFromTable('paragraph_questions', contentSetIdSet);
    console.log(`📄 문단문제: 총 ${paragraphQuestions.length}개 조회`);

    // 문단문제 마침표 검사
    const paragraphUpdates: any[] = [];
    for (const question of paragraphQuestions) {
      let needsUpdate = false;
      const changedFields: any = {};

      for (const field of paragraphFieldsToCheck) {
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
        paragraphUpdates.push({
          id: question.id,
          content_set_id: question.content_set_id,
          question_number: question.question_number,
          question_type: question.question_type,
          tableName: 'paragraph_questions',
          changedFields,
          updateData: Object.fromEntries(
            Object.entries(changedFields).map(([field, value]: [string, any]) => [field, value.converted])
          )
        });
      }
    }

    console.log(`  문단문제: ${paragraphUpdates.length}개 마침표 누락 발견`);

    // 4. 전체 업데이트 목록 합치기
    const allUpdates = [...comprehensiveUpdates, ...paragraphUpdates];
    const totalQuestions = comprehensiveQuestions.length + paragraphQuestions.length;

    console.log(`✅ 전체: ${allUpdates.length}개의 문제에서 마침표 누락 발견 (종합: ${comprehensiveUpdates.length}개, 문단: ${paragraphUpdates.length}개)`);

    // 5. 드라이런 모드
    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        message: `드라이런 모드: ${allUpdates.length}개의 문제가 수정됩니다. (종합문제: ${comprehensiveUpdates.length}개, 문단문제: ${paragraphUpdates.length}개)`,
        totalRecords: totalQuestions,
        affectedRecords: allUpdates.length,
        comprehensiveCount: comprehensiveUpdates.length,
        paragraphCount: paragraphUpdates.length,
        samples: allUpdates.slice(0, 20)
      });
    }

    // 6. 실제 업데이트 (배치 처리)
    let successCount = 0;
    let errorCount = 0;

    console.log(`🔄 ${allUpdates.length}개 문제 업데이트 시작`);

    // 종합문제 업데이트
    if (comprehensiveUpdates.length > 0) {
      const updates = comprehensiveUpdates.map(u => ({ id: u.id, data: u.updateData }));
      const result = await batchUpdate('comprehensive_questions', updates);
      successCount += result.successCount;
      errorCount += result.errorCount;
    }

    // 문단문제 업데이트
    if (paragraphUpdates.length > 0) {
      const updates = paragraphUpdates.map(u => ({ id: u.id, data: u.updateData }));
      const result = await batchUpdate('paragraph_questions', updates);
      successCount += result.successCount;
      errorCount += result.errorCount;
    }

    console.log(`✅ 완료 - 성공: ${successCount}, 실패: ${errorCount}`);

    return NextResponse.json({
      success: true,
      dryRun: false,
      message: `마침표 검수 완료: ${successCount}개 성공, ${errorCount}개 실패 (종합문제: ${comprehensiveUpdates.length}개, 문단문제: ${paragraphUpdates.length}개)`,
      successCount,
      errorCount,
      comprehensiveCount: comprehensiveUpdates.length,
      paragraphCount: paragraphUpdates.length,
      totalProcessed: allUpdates.length
    });

  } catch (error) {
    console.error('종합/문단 문제 마침표 검수 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
}
