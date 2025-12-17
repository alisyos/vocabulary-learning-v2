import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchAllFromTable, fetchAllContentSets, filterContentSets, batchUpdate } from '@/lib/reviewUtils';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

    console.log(`📝 총 ${contentSetIds.length}개 콘텐츠 세트의 어휘 조회 시작`);

    // 2. vocabulary_terms 테이블 전체 조회 후 필터링
    const allTerms = await fetchAllFromTable('vocabulary_terms', contentSetIdSet);

    console.log(`📄 총 ${allTerms.length}개 어휘 조회 완료`);

    if (allTerms.length === 0) {
      return NextResponse.json({
        success: true,
        dryRun,
        message: '검수 대상 어휘가 없습니다.',
        samples: []
      });
    }

    // 3. vocabulary_questions 테이블 전체 조회 후 필터링
    const allQuestions = await fetchAllFromTable('vocabulary_questions', contentSetIdSet, 'id, content_set_id, term');

    console.log(`📄 총 ${allQuestions.length}개 어휘 문제 조회 완료`);

    // content_set_id + term 조합으로 문제가 있는지 확인하기 위한 Set
    const questionKeySet = new Set<string>();
    for (const question of allQuestions) {
      questionKeySet.add(`${question.content_set_id}|${question.term}`);
    }

    // 4. 각 term에 대해 has_question_generated 필드 검증
    const updates: any[] = [];

    console.log(`🔍 ${allTerms.length}개 어휘의 has_question_generated 필드 검증 시작`);

    for (const term of allTerms) {
      const key = `${term.content_set_id}|${term.term}`;
      const hasQuestion = questionKeySet.has(key);
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

    // 5. 드라이런 모드
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

    // 6. 실제 업데이트 (배치 처리)
    console.log(`🔄 ${updates.length}개 어휘 항목 업데이트 시작`);

    const batchUpdates = updates.map(u => ({
      id: u.id,
      data: { has_question_generated: u.should_be }
    }));

    const result = await batchUpdate('vocabulary_terms', batchUpdates);

    console.log(`✅ 완료 - 성공: ${result.successCount}, 실패: ${result.errorCount}`);

    return NextResponse.json({
      success: true,
      dryRun: false,
      message: `has_question_generated 검수 완료: ${result.successCount}개 성공, ${result.errorCount}개 실패`,
      successCount: result.successCount,
      errorCount: result.errorCount,
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
