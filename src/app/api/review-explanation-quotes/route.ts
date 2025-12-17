import { NextRequest, NextResponse } from 'next/server';
import { fetchAllFromTable, fetchAllContentSets, filterContentSets, batchUpdate } from '@/lib/reviewUtils';

// 인용이 아닌 작은따옴표를 제거하는 함수
// 인용 패턴: 닫는 따옴표 뒤에 '와', '라고', '고', '라는', '는', '처럼'이 오는 경우는 유지
function removeNonQuotationQuotes(text: string): string {
  if (!text) return text;

  // 모든 종류의 작은따옴표 문자 클래스
  // U+0027 ('), U+2018 ('), U+2019 ('), U+201A (‚), U+201B (‛)
  const quoteChars = '[\u0027\u2018\u2019\u201A\u201B]';

  // 인용 패턴 (닫는 따옴표 뒤에 오는 조사들)
  // '과', '와', '라고', '고', '라는', '는', '처럼', '이', '가', '을', '를', '에', ',', ' 그리고' 뒤에 공백이나 다른 문자가 올 수 있음
  const quotationSuffixes = ['과', '와', '라고', '고', '라는', '는', '처럼', '이', '가', '을', '를', '에', ',', ' 그리고'];

  // 정규식: 작은따옴표로 감싸진 내용 (1글자 이상)
  const pattern = new RegExp(
    `${quoteChars}([^${quoteChars.slice(1, -1)}]+)${quoteChars}`,
    'g'
  );

  return text.replace(pattern, (match, content, offset) => {
    // 5글자 이하는 무조건 따옴표 제거
    if (content.length <= 5) {
      return content;
    }

    // 닫는 따옴표 다음 문자 확인
    const afterMatch = text.slice(offset + match.length);

    // 인용 패턴인지 확인 (닫는 따옴표 바로 뒤에 인용 조사가 오는 경우)
    const isQuotation = quotationSuffixes.some(suffix => afterMatch.startsWith(suffix));

    if (isQuotation) {
      // 인용인 경우 원본 유지
      return match;
    } else {
      // 인용이 아닌 경우 따옴표 제거
      return content;
    }
  });
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

    console.log(`📝 총 ${contentSetIds.length}개 콘텐츠 세트의 문제 조회 시작`);

    // 2. 세 테이블에서 전체 레코드 조회 후 필터링
    console.log(`  어휘문제(vocabulary_questions) 조회 중...`);
    const vocabularyQuestions = await fetchAllFromTable('vocabulary_questions', contentSetIdSet);
    console.log(`  → ${vocabularyQuestions.length}개 조회`);

    console.log(`  문단문제(paragraph_questions) 조회 중...`);
    const paragraphQuestions = await fetchAllFromTable('paragraph_questions', contentSetIdSet);
    console.log(`  → ${paragraphQuestions.length}개 조회`);

    console.log(`  종합문제(comprehensive_questions) 조회 중...`);
    const comprehensiveQuestions = await fetchAllFromTable('comprehensive_questions', contentSetIdSet);
    console.log(`  → ${comprehensiveQuestions.length}개 조회`);

    const totalQuestions = vocabularyQuestions.length + paragraphQuestions.length + comprehensiveQuestions.length;
    console.log(`📄 총 ${totalQuestions}개 문제 조회 완료`);

    if (totalQuestions === 0) {
      return NextResponse.json({
        success: true,
        dryRun,
        message: '검수 대상 문제가 없습니다.',
        samples: []
      });
    }

    // 3. 각 문제의 explanation 필드 검사 및 변환
    const vocabularyUpdates: any[] = [];
    const paragraphUpdates: any[] = [];
    const comprehensiveUpdates: any[] = [];

    // 어휘문제 검사
    for (const question of vocabularyQuestions) {
      const original = question.explanation;
      if (!original) continue;

      const converted = removeNonQuotationQuotes(original);
      if (original !== converted) {
        vocabularyUpdates.push({
          id: question.id,
          content_set_id: question.content_set_id,
          question_number: question.question_number,
          original,
          converted,
          tableName: 'vocabulary_questions',
          tableLabel: '어휘문제'
        });
      }
    }

    // 문단문제 검사 (question_type이 '어절 순서 맞추기'인 경우 제외)
    for (const question of paragraphQuestions) {
      // '어절 순서 맞추기' 유형은 검수에서 제외
      if (question.question_type === '어절 순서 맞추기') continue;

      const original = question.explanation;
      if (!original) continue;

      const converted = removeNonQuotationQuotes(original);
      if (original !== converted) {
        paragraphUpdates.push({
          id: question.id,
          content_set_id: question.content_set_id,
          question_number: question.question_number,
          question_type: question.question_type,
          original,
          converted,
          tableName: 'paragraph_questions',
          tableLabel: '문단문제'
        });
      }
    }

    // 종합문제 검사
    for (const question of comprehensiveQuestions) {
      const original = question.explanation;
      if (!original) continue;

      const converted = removeNonQuotationQuotes(original);
      if (original !== converted) {
        comprehensiveUpdates.push({
          id: question.id,
          content_set_id: question.content_set_id,
          question_number: question.question_number,
          question_type: question.question_type,
          original,
          converted,
          tableName: 'comprehensive_questions',
          tableLabel: '종합문제'
        });
      }
    }

    const totalUpdates = vocabularyUpdates.length + paragraphUpdates.length + comprehensiveUpdates.length;
    console.log(`✅ 따옴표 발견 - 어휘: ${vocabularyUpdates.length}개, 문단: ${paragraphUpdates.length}개, 종합: ${comprehensiveUpdates.length}개 (총 ${totalUpdates}개)`);

    // 모든 업데이트를 합쳐서 샘플 준비
    const allUpdates = [...vocabularyUpdates, ...paragraphUpdates, ...comprehensiveUpdates];

    // 4. 드라이런 모드
    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        message: `드라이런 모드: ${totalUpdates}개의 해설이 수정됩니다. (어휘: ${vocabularyUpdates.length}개, 문단: ${paragraphUpdates.length}개, 종합: ${comprehensiveUpdates.length}개)`,
        totalRecords: totalQuestions,
        affectedRecords: totalUpdates,
        vocabularyCount: vocabularyUpdates.length,
        paragraphCount: paragraphUpdates.length,
        comprehensiveCount: comprehensiveUpdates.length,
        samples: allUpdates.slice(0, 15)
      });
    }

    // 5. 실제 업데이트 (배치 처리)
    let successCount = 0;
    let errorCount = 0;
    let vocabularySuccessCount = 0;
    let paragraphSuccessCount = 0;
    let comprehensiveSuccessCount = 0;

    console.log(`🔄 ${totalUpdates}개 해설 업데이트 시작`);

    // 어휘문제 업데이트
    if (vocabularyUpdates.length > 0) {
      const updates = vocabularyUpdates.map(u => ({ id: u.id, data: { explanation: u.converted } }));
      const result = await batchUpdate('vocabulary_questions', updates);
      vocabularySuccessCount = result.successCount;
      successCount += result.successCount;
      errorCount += result.errorCount;
    }

    // 문단문제 업데이트
    if (paragraphUpdates.length > 0) {
      const updates = paragraphUpdates.map(u => ({ id: u.id, data: { explanation: u.converted } }));
      const result = await batchUpdate('paragraph_questions', updates);
      paragraphSuccessCount = result.successCount;
      successCount += result.successCount;
      errorCount += result.errorCount;
    }

    // 종합문제 업데이트
    if (comprehensiveUpdates.length > 0) {
      const updates = comprehensiveUpdates.map(u => ({ id: u.id, data: { explanation: u.converted } }));
      const result = await batchUpdate('comprehensive_questions', updates);
      comprehensiveSuccessCount = result.successCount;
      successCount += result.successCount;
      errorCount += result.errorCount;
    }

    console.log(`✅ 완료 - 성공: ${successCount}, 실패: ${errorCount}`);

    return NextResponse.json({
      success: true,
      dryRun: false,
      message: `해설 따옴표 검수 완료: ${successCount}개 성공, ${errorCount}개 실패`,
      successCount,
      errorCount,
      vocabularyCount: vocabularySuccessCount,
      paragraphCount: paragraphSuccessCount,
      comprehensiveCount: comprehensiveSuccessCount,
      totalProcessed: totalUpdates
    });

  } catch (error) {
    console.error('어휘문제 해설 따옴표 검수 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
}
