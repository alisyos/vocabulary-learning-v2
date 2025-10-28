import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`종합 문제 정답 검증 작업 시작`);
    console.log(`${'='.repeat(60)}\n`);

    // 1. 모든 종합 문제 조회 (페이지네이션)
    let allQuestions: any[] = [];
    let currentPage = 0;
    const pageSize = 1000;
    let hasMoreData = true;

    while (hasMoreData) {
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

    console.log(`\n총 ${allQuestions.length}개의 종합 문제를 조회했습니다.\n`);

    // 2. 각 문제의 정답이 보기 중 하나와 일치하는지 확인
    const mismatches: any[] = [];
    const matches: any[] = [];

    allQuestions.forEach((question, index) => {
      const options = [
        question.option_1,
        question.option_2,
        question.option_3,
        question.option_4,
        question.option_5
      ].filter(opt => opt); // null/undefined 제거

      const correctAnswer = question.correct_answer;

      // 정답이 보기 중 하나와 정확히 일치하는지 확인
      const isMatch = options.some(option => option === correctAnswer);

      if (!isMatch) {
        // 일치하지 않는 경우
        mismatches.push({
          id: question.id,
          question_number: question.question_number,
          content_set_id: question.content_set_id,
          question_type: question.question_type,
          correct_answer: correctAnswer,
          options: options,
          // 가장 유사한 옵션 찾기
          closest_match: findClosestMatch(correctAnswer, options)
        });
      } else {
        matches.push({
          id: question.id,
          correct_answer: correctAnswer
        });
      }

      if ((index + 1) % 1000 === 0) {
        console.log(`진행 중: ${index + 1}/${allQuestions.length} 검증 완료`);
      }
    });

    console.log(`\n${'='.repeat(60)}`);
    console.log(`검증 결과:`);
    console.log(`${'='.repeat(60)}`);
    console.log(`총 문제 수: ${allQuestions.length}개`);
    console.log(`✓ 정답이 보기와 일치: ${matches.length}개 (${((matches.length / allQuestions.length) * 100).toFixed(2)}%)`);
    console.log(`✗ 정답이 보기와 불일치: ${mismatches.length}개 (${((mismatches.length / allQuestions.length) * 100).toFixed(2)}%)`);
    console.log(`${'='.repeat(60)}\n`);

    // 불일치 항목이 있으면 샘플 출력
    if (mismatches.length > 0) {
      console.log('불일치 샘플 (최대 20개):');
      mismatches.slice(0, 20).forEach((mismatch, idx) => {
        console.log(`\n${idx + 1}. ID: ${mismatch.id}`);
        console.log(`   문제 번호: ${mismatch.question_number}`);
        console.log(`   유형: ${mismatch.question_type}`);
        console.log(`   정답: "${mismatch.correct_answer}"`);
        console.log(`   가장 유사한 보기: "${mismatch.closest_match.option}" (유사도: ${mismatch.closest_match.similarity}%)`);
        console.log(`   모든 보기:`);
        mismatch.options.forEach((opt: string, i: number) => {
          console.log(`     ${i + 1}. "${opt}"`);
        });
      });
    }

    return NextResponse.json({
      success: true,
      statistics: {
        total: allQuestions.length,
        matches: matches.length,
        mismatches: mismatches.length,
        matchRate: ((matches.length / allQuestions.length) * 100).toFixed(2) + '%'
      },
      mismatchSamples: mismatches.slice(0, 50) // 최대 50개 샘플 반환
    });

  } catch (error) {
    console.error('검증 실패:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      },
      { status: 500 }
    );
  }
}

// 가장 유사한 옵션 찾기 (간단한 유사도 계산)
function findClosestMatch(target: string, options: string[]): { option: string; similarity: number } {
  let bestMatch = { option: options[0] || '', similarity: 0 };

  options.forEach(option => {
    const similarity = calculateSimilarity(target, option);
    if (similarity > bestMatch.similarity) {
      bestMatch = { option, similarity };
    }
  });

  return bestMatch;
}

// 간단한 문자열 유사도 계산 (0-100)
function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 100;

  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  // 포함 관계 확인
  if (longer.includes(shorter)) {
    return Math.round((shorter.length / longer.length) * 100);
  }

  // Levenshtein distance
  const distance = levenshteinDistance(str1, str2);
  const maxLen = Math.max(str1.length, str2.length);
  return Math.round(((maxLen - distance) / maxLen) * 100);
}

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
