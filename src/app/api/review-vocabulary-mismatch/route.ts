import { NextRequest, NextResponse } from 'next/server';
import { fetchAllFromTable, fetchAllContentSets, filterContentSets, batchDelete } from '@/lib/reviewUtils';

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
        message: `검수 대상이 없습니다.`,
        samples: []
      });
    }

    console.log(`📝 총 ${contentSetIds.length}개 콘텐츠 세트의 어휘 불일치 검사 시작`);

    // 2. vocabulary_terms와 vocabulary_questions를 전체 조회 후 필터링
    console.log(`📚 어휘 용어 조회 중...`);
    const allTerms = await fetchAllFromTable('vocabulary_terms', contentSetIdSet, 'content_set_id, term');
    console.log(`📄 총 ${allTerms.length}개 어휘 용어 조회 완료`);

    console.log(`\n❓ 어휘 문제 조회 중...`);
    const allQuestions = await fetchAllFromTable('vocabulary_questions', contentSetIdSet, 'id, content_set_id, term, question_number');
    console.log(`📄 총 ${allQuestions.length}개 어휘 문제 조회 완료`);

    // 3. content_set_id별로 terms를 Map으로 구성
    const termsMap = new Map<string, Set<string>>();
    for (const term of allTerms) {
      if (!termsMap.has(term.content_set_id)) {
        termsMap.set(term.content_set_id, new Set());
      }
      termsMap.get(term.content_set_id)!.add(term.term);
    }

    console.log(`\n🔍 불일치 검사 중...`);

    // 4. 각 question의 term이 해당 content_set의 terms에 있는지 확인
    const mismatches: any[] = [];

    for (const question of allQuestions) {
      const termSet = termsMap.get(question.content_set_id);

      // 해당 content_set에 대한 terms가 없거나, term이 Set에 없는 경우
      if (!termSet || !termSet.has(question.term)) {
        mismatches.push({
          content_set_id: question.content_set_id,
          question_id: question.id,
          question_number: question.question_number,
          term: question.term,
          reason: `어휘 테이블에 '${question.term}'이(가) 없음`
        });
      }
    }

    console.log(`✅ ${mismatches.length}개의 불일치 문제 발견`);

    // 5. 드라이런 모드
    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        message: `드라이런 모드: ${mismatches.length}개의 불일치 문제가 발견되었습니다.`,
        totalChecked: contentSetIds.length,
        mismatchCount: mismatches.length,
        samples: mismatches.slice(0, 20)
      });
    }

    // 6. 실제 실행 - 불일치 문제 삭제
    const questionIdsToDelete = mismatches.map(m => m.question_id);

    console.log(`🗑️ ${questionIdsToDelete.length}개 불일치 문제 삭제 시작`);

    const result = await batchDelete('vocabulary_questions', questionIdsToDelete);

    console.log(`✅ 완료 - 삭제 성공: ${result.successCount}, 실패: ${result.errorCount}`);

    return NextResponse.json({
      success: true,
      dryRun: false,
      message: `어휘 불일치 검수 완료: ${result.successCount}개 삭제됨, ${result.errorCount}개 실패`,
      successCount: result.successCount,
      errorCount: result.errorCount,
      totalProcessed: mismatches.length
    });

  } catch (error) {
    console.error('어휘 불일치 검수 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
}
