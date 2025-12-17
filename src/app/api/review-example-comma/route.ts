import { NextRequest, NextResponse } from 'next/server';
import { fetchAllFromTable, fetchAllContentSets, filterContentSets, batchUpdate } from '@/lib/reviewUtils';

// '예를 들어 '를 '예를 들어, '로 변환하는 함수
// 이미 '예를 들어, '인 경우는 변환하지 않음
function fixExampleComma(text: string): string {
  if (!text) return text;

  // '예를 들어 '로 시작하지만 '예를 들어, '가 아닌 경우만 변환
  // 정규식: '예를 들어' 뒤에 쉼표가 없고 공백이 오는 경우
  return text.replace(/예를 들어(?!,)\s+/g, '예를 들어, ');
}

export async function POST(request: NextRequest) {
  try {
    const { dryRun = true, statuses = [], sessionRange = null } = await request.json();

    console.log(`📊 '예를 들어' 쉼표 검수 시작 - 상태: ${statuses.join(', ')}, 차시: ${sessionRange ? `${sessionRange.start}-${sessionRange.end}` : '전체'}`);

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

    console.log(`📝 총 ${contentSetIds.length}개 콘텐츠 세트의 문제 조회 시작`);

    // 결과 저장 객체
    const allUpdates: any[] = [];
    let vocabularyCount = 0;
    let paragraphCount = 0;
    let comprehensiveCount = 0;

    // 2. vocabulary_questions 테이블 전체 조회 후 검사
    console.log('🔍 어휘문제(vocabulary_questions) 검사 중...');
    const vocabularyQuestions = await fetchAllFromTable('vocabulary_questions', contentSetIdSet, 'id, content_set_id, question_number, explanation');

    for (const question of vocabularyQuestions) {
      if (!question.explanation) continue;

      // '예를 들어 '가 있지만 '예를 들어, '가 아닌 경우 찾기
      if (question.explanation.match(/예를 들어(?!,)\s+/)) {
        const original = question.explanation;
        const converted = fixExampleComma(original);

        if (original !== converted) {
          allUpdates.push({
            id: question.id,
            content_set_id: question.content_set_id,
            question_number: question.question_number,
            tableName: 'vocabulary_questions',
            tableLabel: '어휘문제',
            original,
            converted
          });
          vocabularyCount++;
        }
      }
    }
    console.log(`  어휘문제: ${vocabularyCount}개 발견`);

    // 3. paragraph_questions 테이블 전체 조회 후 검사
    console.log('🔍 문단문제(paragraph_questions) 검사 중...');
    const paragraphQuestions = await fetchAllFromTable('paragraph_questions', contentSetIdSet, 'id, content_set_id, question_number, explanation');

    for (const question of paragraphQuestions) {
      if (!question.explanation) continue;

      if (question.explanation.match(/예를 들어(?!,)\s+/)) {
        const original = question.explanation;
        const converted = fixExampleComma(original);

        if (original !== converted) {
          allUpdates.push({
            id: question.id,
            content_set_id: question.content_set_id,
            question_number: question.question_number,
            tableName: 'paragraph_questions',
            tableLabel: '문단문제',
            original,
            converted
          });
          paragraphCount++;
        }
      }
    }
    console.log(`  문단문제: ${paragraphCount}개 발견`);

    // 4. comprehensive_questions 테이블 전체 조회 후 검사
    console.log('🔍 종합문제(comprehensive_questions) 검사 중...');
    const comprehensiveQuestions = await fetchAllFromTable('comprehensive_questions', contentSetIdSet, 'id, content_set_id, question_number, question_type, explanation');

    for (const question of comprehensiveQuestions) {
      if (!question.explanation) continue;

      if (question.explanation.match(/예를 들어(?!,)\s+/)) {
        const original = question.explanation;
        const converted = fixExampleComma(original);

        if (original !== converted) {
          allUpdates.push({
            id: question.id,
            content_set_id: question.content_set_id,
            question_number: question.question_number,
            question_type: question.question_type,
            tableName: 'comprehensive_questions',
            tableLabel: '종합문제',
            original,
            converted
          });
          comprehensiveCount++;
        }
      }
    }
    console.log(`  종합문제: ${comprehensiveCount}개 발견`);

    console.log(`✅ 총 ${allUpdates.length}개의 해설에서 '예를 들어' 쉼표 누락 발견`);

    // 5. 드라이런 모드
    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        message: `드라이런 모드: ${allUpdates.length}개의 해설이 수정됩니다.`,
        totalRecords: allUpdates.length,
        affectedRecords: allUpdates.length,
        vocabularyCount,
        paragraphCount,
        comprehensiveCount,
        samples: allUpdates.slice(0, 20)
      });
    }

    // 6. 실제 업데이트 (테이블별 배치 처리)
    let successCount = 0;
    let errorCount = 0;

    console.log(`🔄 ${allUpdates.length}개 해설 업데이트 시작`);

    // 테이블별로 그룹화
    const updatesByTable: Record<string, any[]> = {
      vocabulary_questions: [],
      paragraph_questions: [],
      comprehensive_questions: []
    };

    for (const update of allUpdates) {
      updatesByTable[update.tableName].push(update);
    }

    // 각 테이블별로 업데이트 수행
    for (const [tableName, updates] of Object.entries(updatesByTable)) {
      if (updates.length === 0) continue;

      const batchUpdates = updates.map(u => ({ id: u.id, data: { explanation: u.converted } }));
      const result = await batchUpdate(tableName, batchUpdates);
      successCount += result.successCount;
      errorCount += result.errorCount;
    }

    console.log(`✅ 완료 - 성공: ${successCount}, 실패: ${errorCount}`);

    return NextResponse.json({
      success: true,
      dryRun: false,
      message: `'예를 들어' 쉼표 검수 완료: ${successCount}개 성공, ${errorCount}개 실패`,
      successCount,
      errorCount,
      vocabularyCount,
      paragraphCount,
      comprehensiveCount,
      totalProcessed: allUpdates.length
    });

  } catch (error) {
    console.error("'예를 들어' 쉼표 검수 오류:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
}
