import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 정답이 선택지 중 하나와 일치하는지 확인하는 함수
function checkAnswerMatch(question: any): { isMatch: boolean; reason: string } {
  const correctAnswer = question.correct_answer?.trim();

  // 정답이 비어있는 경우
  if (!correctAnswer) {
    return {
      isMatch: false,
      reason: '정답(correct_answer)이 비어있습니다.'
    };
  }

  // question_format이 'short_answer'인 경우 선택지 검증 제외
  if (question.question_format === 'short_answer') {
    return {
      isMatch: true,
      reason: '주관식 문제는 선택지 일치 검증 제외'
    };
  }

  // 선택지 수집
  const options = [
    question.option_1?.trim(),
    question.option_2?.trim(),
    question.option_3?.trim(),
    question.option_4?.trim(),
    question.option_5?.trim()
  ].filter(opt => opt); // 빈 값 제외

  // 선택지가 없는 경우
  if (options.length === 0) {
    return {
      isMatch: false,
      reason: '선택지가 없습니다.'
    };
  }

  // 정답이 선택지 중 하나와 일치하는지 확인
  const isMatch = options.some(opt => opt === correctAnswer);

  if (!isMatch) {
    return {
      isMatch: false,
      reason: `정답 '${correctAnswer}'이 선택지 중 어느 것과도 일치하지 않습니다. (선택지 개수: ${options.length}개)`
    };
  }

  return {
    isMatch: true,
    reason: '정답이 선택지와 일치합니다.'
  };
}

export async function POST(request: NextRequest) {
  try {
    const { dryRun = true, statuses = [], sessionRange = null } = await request.json();

    // 1. 상태별 필터링하여 content_set_id 조회 (페이지네이션 적용)
    let allSets: any[] = [];
    let currentPage = 0;
    const pageSize = 1000;
    let hasMoreData = true;

    console.log(`📊 종합문제 정답-선택지 일치 검수 시작 - 상태: ${statuses.join(', ')}, 차시: ${sessionRange ? `${sessionRange.start}-${sessionRange.end}` : '전체'}`);

    while (hasMoreData) {
      let query = supabase
        .from('content_sets')
        .select('id, session_number, status')
        .range(currentPage * pageSize, (currentPage + 1) * pageSize - 1);

      // 상태 필터링을 DB 레벨에서 수행
      if (statuses && statuses.length > 0) {
        query = query.in('status', statuses);
      }

      const { data: pageData, error: setsError } = await query;
      if (setsError) throw setsError;

      if (pageData && pageData.length > 0) {
        allSets.push(...pageData);
        console.log(`  페이지 ${currentPage + 1}: ${pageData.length}개 조회 (누적: ${allSets.length}개)`);
        if (pageData.length < pageSize) hasMoreData = false;
      } else {
        hasMoreData = false;
      }
      currentPage++;
    }

    // 차시 범위 필터링 (JavaScript에서 수행)
    let filteredSets = allSets;
    if (sessionRange && sessionRange.start && sessionRange.end) {
      filteredSets = filteredSets.filter(set => {
        if (!set.session_number) return false;

        // session_number가 숫자인 경우 파싱
        const sessionNum = parseInt(set.session_number, 10);
        if (!isNaN(sessionNum)) {
          return sessionNum >= sessionRange.start && sessionNum <= sessionRange.end;
        }

        return false;
      });
      console.log(`  차시 필터링 후: ${filteredSets.length}개`);
    }

    const contentSetIds = filteredSets.map(s => s.id);

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

    console.log(`📝 총 ${contentSetIds.length}개 콘텐츠 세트의 종합문제 조회 시작`);

    // 2. comprehensive_questions 테이블에서 해당 content_set_id의 모든 레코드 조회 (페이지네이션 적용)
    // contentSetIds를 청크로 나누어 조회 (in 절 제한 고려)
    const chunkSize = 100;
    let allQuestions: any[] = [];

    for (let i = 0; i < contentSetIds.length; i += chunkSize) {
      const chunk = contentSetIds.slice(i, i + chunkSize);

      // 각 청크에 대해 페이지네이션
      let pageNum = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('comprehensive_questions')
          .select('*')
          .in('content_set_id', chunk)
          .range(pageNum * 1000, (pageNum + 1) * 1000 - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allQuestions.push(...data);
          if (data.length < 1000) hasMore = false;
        } else {
          hasMore = false;
        }
        pageNum++;
      }

      console.log(`  청크 ${Math.floor(i / chunkSize) + 1}/${Math.ceil(contentSetIds.length / chunkSize)}: ${allQuestions.length}개 누적`);
    }

    console.log(`📄 총 ${allQuestions.length}개 종합문제 조회 완료`);

    if (allQuestions.length === 0) {
      return NextResponse.json({
        success: true,
        dryRun,
        message: '검수 대상 종합문제가 없습니다.',
        samples: [],
        mismatchCount: 0,
        totalChecked: 0
      });
    }

    // 3. 각 문제의 정답-선택지 일치 검사
    const mismatches: any[] = [];

    for (const question of allQuestions) {
      const { isMatch, reason } = checkAnswerMatch(question);

      if (!isMatch) {
        mismatches.push({
          id: question.id,
          content_set_id: question.content_set_id,
          question_number: question.question_number,
          question_type: question.question_type,
          question_format: question.question_format,
          question_text: question.question?.substring(0, 100) || '', // 문제 텍스트 일부
          correct_answer: question.correct_answer,
          options: [
            question.option_1,
            question.option_2,
            question.option_3,
            question.option_4,
            question.option_5
          ].filter(opt => opt),
          reason
        });
      }
    }

    console.log(`⚠️ ${mismatches.length}개의 정답-선택지 불일치 발견 (전체 ${allQuestions.length}개 중)`);

    // 4. 결과 반환 (이 API는 보고만 하고 수정하지 않음)
    return NextResponse.json({
      success: true,
      dryRun: true, // 항상 드라이런 모드 (수정 기능 없음)
      message: `정답-선택지 일치 검수 완료: ${mismatches.length}개 불일치 발견 (전체 ${allQuestions.length}개 중)`,
      totalChecked: allQuestions.length,
      mismatchCount: mismatches.length,
      samples: mismatches.slice(0, 30) // 샘플 30개 제공
    });

  } catch (error) {
    console.error('종합문제 정답-선택지 일치 검수 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
}
