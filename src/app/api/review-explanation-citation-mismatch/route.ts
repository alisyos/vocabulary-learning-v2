import { NextRequest, NextResponse } from 'next/server';
import { fetchAllFromTable, fetchAllContentSets, filterContentSets } from '@/lib/reviewUtils';

// 해설에서 작은따옴표로 인용된 텍스트들을 추출하는 함수
function extractCitations(text: string): string[] {
  if (!text) return [];

  // '...' 패턴을 찾음 (작은따옴표로 감싼 텍스트)
  const regex = /'([^']+)'/g;
  const citations: string[] = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    const citation = match[1].trim();
    // 최소 3자 이상인 인용만 추출 (너무 짧은 것은 제외)
    if (citation.length >= 3) {
      citations.push(citation);
    }
  }

  return citations;
}

// 인용된 텍스트가 지문에 존재하는지 확인하는 함수
function checkCitationInPassage(citation: string, passageText: string): { found: boolean; matchType: string } {
  if (!passageText || !citation) {
    return { found: false, matchType: 'passage_empty' };
  }

  // 정확히 일치하는 경우
  if (passageText.includes(citation)) {
    return { found: true, matchType: 'exact' };
  }

  // 공백/줄바꿈을 무시하고 비교
  const normalizedCitation = citation.replace(/\s+/g, '');
  const normalizedPassage = passageText.replace(/\s+/g, '');
  if (normalizedPassage.includes(normalizedCitation)) {
    return { found: true, matchType: 'normalized' };
  }

  // 마침표 유무 차이 허용
  const citationWithoutPeriod = citation.replace(/[.。]/g, '');
  if (passageText.includes(citationWithoutPeriod) || passageText.includes(citation + '.') || passageText.includes(citation + '。')) {
    return { found: true, matchType: 'period_diff' };
  }

  // 쉼표 유무 차이 허용
  const citationWithoutComma = citation.replace(/,/g, '');
  const passageWithoutComma = passageText.replace(/,/g, '');
  if (passageWithoutComma.includes(citationWithoutComma)) {
    return { found: true, matchType: 'comma_diff' };
  }

  return { found: false, matchType: 'not_found' };
}

// 모든 단락을 하나의 텍스트로 합치는 함수
function combinePassageParagraphs(passage: any): string {
  if (!passage) return '';

  const paragraphs = [
    passage.paragraph_1,
    passage.paragraph_2,
    passage.paragraph_3,
    passage.paragraph_4,
    passage.paragraph_5,
    passage.paragraph_6,
    passage.paragraph_7,
    passage.paragraph_8,
    passage.paragraph_9,
    passage.paragraph_10,
  ].filter(p => p && p.trim());

  return paragraphs.join(' ');
}

export async function POST(request: NextRequest) {
  try {
    const { dryRun = true, statuses = [], sessionRange = null } = await request.json();

    console.log(`📊 해설 인용 불일치 검수 시작 - 상태: ${statuses.join(', ')}, 차시: ${sessionRange ? `${sessionRange.start}-${sessionRange.end}` : '전체'}`);

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
        samples: [],
        mismatchCount: 0,
        totalChecked: 0
      });
    }

    console.log(`📝 총 ${contentSetIds.length}개 콘텐츠 세트의 지문 및 문제 조회 시작`);

    // 2. passages 테이블 전체 조회 후 필터링
    console.log(`📄 지문(passages) 조회 중...`);
    const allPassages = await fetchAllFromTable('passages', contentSetIdSet);
    console.log(`  → ${allPassages.length}개 지문 조회 완료`);

    // content_set_id별로 지문 텍스트 합치기
    const passageMap = new Map<string, string>();
    for (const passage of allPassages) {
      const combinedText = combinePassageParagraphs(passage);
      // 같은 content_set_id에 여러 지문이 있으면 모두 합침
      const existingText = passageMap.get(passage.content_set_id) || '';
      passageMap.set(passage.content_set_id, existingText + ' ' + combinedText);
    }

    console.log(`  → ${passageMap.size}개 콘텐츠 세트에 대한 지문 준비 완료`);

    // 3. paragraph_questions 전체 조회 후 필터링
    console.log(`📝 문단문제(paragraph_questions) 조회 중...`);
    const allParagraphQuestions = await fetchAllFromTable('paragraph_questions', contentSetIdSet);
    console.log(`  → ${allParagraphQuestions.length}개 조회 완료`);

    // 4. comprehensive_questions 전체 조회 후 필터링
    console.log(`📝 종합문제(comprehensive_questions) 조회 중...`);
    const allComprehensiveQuestions = await fetchAllFromTable('comprehensive_questions', contentSetIdSet);
    console.log(`  → ${allComprehensiveQuestions.length}개 조회 완료`);

    // 5. 각 문제의 해설에서 인용 텍스트 추출 및 지문과 비교
    const mismatches: any[] = [];
    let totalChecked = 0;

    // 문단문제 검사
    for (const question of allParagraphQuestions) {
      if (!question.explanation) continue;

      const passageText = passageMap.get(question.content_set_id);
      if (!passageText) continue;

      totalChecked++;
      const citations = extractCitations(question.explanation);

      for (const citation of citations) {
        const { found, matchType } = checkCitationInPassage(citation, passageText);

        if (!found) {
          mismatches.push({
            id: question.id,
            content_set_id: question.content_set_id,
            tableName: 'paragraph_questions',
            tableLabel: '문단문제',
            question_number: question.question_number,
            question_type: question.question_type || '',
            citation,
            explanation: question.explanation,
            matchType,
            reason: `인용 '${citation}'이(가) 지문에서 발견되지 않습니다.`
          });
        }
      }
    }

    // 종합문제 검사
    for (const question of allComprehensiveQuestions) {
      if (!question.explanation) continue;

      const passageText = passageMap.get(question.content_set_id);
      if (!passageText) continue;

      totalChecked++;
      const citations = extractCitations(question.explanation);

      for (const citation of citations) {
        const { found, matchType } = checkCitationInPassage(citation, passageText);

        if (!found) {
          mismatches.push({
            id: question.id,
            content_set_id: question.content_set_id,
            tableName: 'comprehensive_questions',
            tableLabel: '종합문제',
            question_number: question.question_number,
            question_type: question.question_type || '',
            citation,
            explanation: question.explanation,
            matchType,
            reason: `인용 '${citation}'이(가) 지문에서 발견되지 않습니다.`
          });
        }
      }
    }

    // 문단문제와 종합문제 각각의 불일치 수 계산
    const paragraphMismatches = mismatches.filter(m => m.tableName === 'paragraph_questions');
    const comprehensiveMismatches = mismatches.filter(m => m.tableName === 'comprehensive_questions');

    console.log(`⚠️ ${mismatches.length}개의 해설-지문 인용 불일치 발견 (전체 ${totalChecked}개 중)`);
    console.log(`  문단문제: ${paragraphMismatches.length}개, 종합문제: ${comprehensiveMismatches.length}개`);

    // 6. 결과 반환 (이 API는 보고만 하고 수정하지 않음)
    return NextResponse.json({
      success: true,
      dryRun: true, // 항상 드라이런 모드 (수정 기능 없음)
      message: `해설 인용 불일치 검수 완료: ${mismatches.length}개 불일치 발견 (전체 ${totalChecked}개 문제 중)`,
      totalChecked,
      mismatchCount: mismatches.length,
      paragraphCount: paragraphMismatches.length,
      comprehensiveCount: comprehensiveMismatches.length,
      samples: mismatches.slice(0, 30) // 샘플 30개 제공
    });

  } catch (error) {
    console.error('해설 인용 불일치 검수 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
}
