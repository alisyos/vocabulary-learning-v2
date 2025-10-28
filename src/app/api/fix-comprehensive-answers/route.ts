import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 문자열 유사도 계산 (Levenshtein distance)
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[len1][len2];
}

// 정규화 함수 (비교를 위한)
function normalizeText(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/['"'"]/g, "'");
}

// 가장 유사한 옵션 찾기
function findBestMatch(correctAnswer: string, options: string[]): {
  matchedOption: string;
  optionNumber: string;
  matchType: string;
  similarity: number;
} {
  const normalizedAnswer = normalizeText(correctAnswer);

  let bestMatch = {
    matchedOption: options[0],
    optionNumber: '1',
    matchType: 'none',
    similarity: 0
  };

  let minDistance = Infinity;

  options.forEach((option, index) => {
    const normalizedOption = normalizeText(option);

    // 1. 정확히 일치
    if (normalizedOption === normalizedAnswer) {
      bestMatch = {
        matchedOption: option,
        optionNumber: String(index + 1),
        matchType: 'exact',
        similarity: 100
      };
      minDistance = 0;
      return;
    }

    // 2. 마침표 차이만 있는 경우
    if (normalizedOption.replace(/\.$/, '') === normalizedAnswer.replace(/\.$/, '')) {
      if (minDistance > 1) {
        bestMatch = {
          matchedOption: option,
          optionNumber: String(index + 1),
          matchType: 'period-diff',
          similarity: 99
        };
        minDistance = 1;
      }
      return;
    }

    // 3. 포함 관계 (정답이 옵션에 포함되거나 그 반대)
    if (normalizedOption.includes(normalizedAnswer) || normalizedAnswer.includes(normalizedOption)) {
      const distance = Math.abs(normalizedOption.length - normalizedAnswer.length);
      if (distance < minDistance) {
        bestMatch = {
          matchedOption: option,
          optionNumber: String(index + 1),
          matchType: 'contains',
          similarity: 90
        };
        minDistance = distance;
      }
      return;
    }

    // 4. Levenshtein distance 계산
    const distance = levenshteinDistance(normalizedAnswer, normalizedOption);
    const maxLen = Math.max(normalizedAnswer.length, normalizedOption.length);
    const similarity = Math.round(((maxLen - distance) / maxLen) * 100);

    if (distance < minDistance) {
      bestMatch = {
        matchedOption: option,
        optionNumber: String(index + 1),
        matchType: 'levenshtein',
        similarity
      };
      minDistance = distance;
    }
  });

  return bestMatch;
}

export async function POST(request: NextRequest) {
  try {
    const { dryRun = true } = await request.json();

    console.log(`\n${'='.repeat(60)}`);
    console.log(`종합 문제 정답 매칭 작업 시작 (dryRun: ${dryRun})`);
    console.log(`${'='.repeat(60)}\n`);

    // 환경변수 확인
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('Supabase Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    // 1. 모든 객관식 종합 문제 조회 (페이지네이션)
    let allQuestions: any[] = [];
    let currentPage = 0;
    const pageSize = 1000;
    let hasMoreData = true;

    // 먼저 전체 카운트 확인 (모든 필터 제거)
    const { count, error: countError } = await supabase
      .from('comprehensive_questions')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('카운트 조회 오류:', countError);
      throw countError;
    } else {
      console.log(`전체 종합 문제 수: ${count}개`);
    }

    // 샘플 데이터 확인
    const { data: sampleData, error: sampleError } = await supabase
      .from('comprehensive_questions')
      .select('id, question_format, option_1, option_2, option_3, option_4, option_5, correct_answer')
      .limit(5);

    if (sampleError) {
      console.error('샘플 조회 오류:', sampleError);
    } else {
      console.log('샘플 레코드 (5개):');
      sampleData?.forEach((sample, idx) => {
        console.log(`  ${idx + 1}. ID: ${sample.id}`);
        console.log(`     정답: ${sample.correct_answer?.substring(0, 50)}...`);
        console.log(`     옵션1: ${sample.option_1?.substring(0, 50)}...`);
      });
    }

    while (hasMoreData) {
      // 모든 필터 제거 - 전체 comprehensive_questions 조회
      const { data: pageData, error: fetchError } = await supabase
        .from('comprehensive_questions')
        .select('*')
        .range(currentPage * pageSize, (currentPage + 1) * pageSize - 1);

      if (fetchError) {
        console.error('데이터 조회 오류:', fetchError);
        throw fetchError;
      }

      if (pageData && pageData.length > 0) {
        allQuestions.push(...pageData);
        console.log(`페이지 ${currentPage + 1}: ${pageData.length}개 레코드 조회`);
        if (pageData.length < pageSize) hasMoreData = false;
      } else {
        hasMoreData = false;
      }
      currentPage++;
    }

    console.log(`\n총 ${allQuestions.length}개의 객관식 종합 문제를 조회했습니다.\n`);

    // 2. 각 문제에 대해 최적의 매칭 찾기
    const updates = allQuestions.map((question, index) => {
      const options = [
        question.option_1,
        question.option_2,
        question.option_3,
        question.option_4,
        question.option_5
      ].filter(opt => opt); // null/undefined 제거

      const bestMatch = findBestMatch(question.correct_answer, options);

      const needsUpdate = question.correct_answer !== bestMatch.matchedOption;

      if ((index + 1) % 100 === 0) {
        console.log(`진행 중: ${index + 1}/${allQuestions.length} 처리 완료`);
      }

      return {
        id: question.id,
        question_number: question.question_number,
        content_set_id: question.content_set_id,
        original_answer: question.correct_answer,
        matched_option: bestMatch.matchedOption,
        option_number: bestMatch.optionNumber,
        match_type: bestMatch.matchType,
        similarity: bestMatch.similarity,
        needsUpdate
      };
    });

    const updatesNeeded = updates.filter(u => u.needsUpdate);
    const perfectMatches = updates.filter(u => !u.needsUpdate);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`분석 결과:`);
    console.log(`${'='.repeat(60)}`);
    console.log(`총 문제 수: ${allQuestions.length}개`);
    console.log(`이미 정확한 정답: ${perfectMatches.length}개`);
    console.log(`업데이트 필요: ${updatesNeeded.length}개`);
    console.log(`${'='.repeat(60)}\n`);

    // 매칭 타입별 통계
    const matchTypeStats = updatesNeeded.reduce((acc, u) => {
      acc[u.match_type] = (acc[u.match_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('매칭 타입별 분포:');
    Object.entries(matchTypeStats).forEach(([type, count]) => {
      console.log(`  - ${type}: ${count}개`);
    });
    console.log('');

    // 3. 드라이런 모드
    if (dryRun) {
      // 샘플 20개 선택 (다양한 매칭 타입)
      const samples: any[] = [];
      const typesNeeded = ['exact', 'period-diff', 'contains', 'levenshtein'];

      typesNeeded.forEach(type => {
        const typeMatches = updatesNeeded.filter(u => u.match_type === type).slice(0, 5);
        samples.push(...typeMatches);
      });

      // 부족하면 나머지로 채우기
      if (samples.length < 20) {
        const remaining = updatesNeeded
          .filter(u => !samples.find(s => s.id === u.id))
          .slice(0, 20 - samples.length);
        samples.push(...remaining);
      }

      return NextResponse.json({
        success: true,
        dryRun: true,
        message: `드라이런 모드: ${updatesNeeded.length}개 레코드가 업데이트됩니다.`,
        statistics: {
          total: allQuestions.length,
          alreadyCorrect: perfectMatches.length,
          needsUpdate: updatesNeeded.length,
          matchTypeStats
        },
        samples: samples.slice(0, 20)
      });
    }

    // 4. 실제 업데이트 (배치 처리)
    console.log('실제 업데이트를 시작합니다...\n');

    let successCount = 0;
    let errorCount = 0;
    const errors: any[] = [];
    const batchSize = 100;

    for (let i = 0; i < updatesNeeded.length; i += batchSize) {
      const batch = updatesNeeded.slice(i, i + batchSize);
      console.log(`배치 ${Math.floor(i / batchSize) + 1}/${Math.ceil(updatesNeeded.length / batchSize)}: ${batch.length}개 처리 중...`);

      const batchPromises = batch.map(async (update) => {
        try {
          const { error } = await supabase
            .from('comprehensive_questions')
            .update({ correct_answer: update.matched_option })
            .eq('id', update.id);

          if (error) throw error;
          return { success: true, id: update.id };
        } catch (err) {
          console.error(`레코드 ${update.id} 업데이트 실패:`, err);
          return {
            success: false,
            id: update.id,
            error: err instanceof Error ? err.message : '알 수 없는 오류'
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      const batchSuccess = batchResults.filter(r => r.success).length;
      const batchErrors = batchResults.filter(r => !r.success);

      successCount += batchSuccess;
      errorCount += batchErrors.length;
      errors.push(...batchErrors);

      console.log(`  ✓ 성공: ${batchSuccess}개, ✗ 실패: ${batchErrors.length}개`);

      // API 부하 방지를 위한 대기
      if (i + batchSize < updatesNeeded.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`업데이트 완료!`);
    console.log(`${'='.repeat(60)}`);
    console.log(`성공: ${successCount}개`);
    console.log(`실패: ${errorCount}개`);
    console.log(`${'='.repeat(60)}\n`);

    return NextResponse.json({
      success: true,
      dryRun: false,
      statistics: {
        total: allQuestions.length,
        alreadyCorrect: perfectMatches.length,
        needsUpdate: updatesNeeded.length,
        matchTypeStats
      },
      successCount,
      errorCount,
      errors: errors.slice(0, 10) // 최대 10개 오류만 반환
    });

  } catch (error) {
    console.error('작업 실패:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      },
      { status: 500 }
    );
  }
}
