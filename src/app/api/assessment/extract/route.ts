import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { questionIds, subject, division } = await request.json();

    // 입력 검증
    if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
      return NextResponse.json(
        { success: false, error: '문제 ID 배열이 필요합니다.' },
        { status: 400 }
      );
    }

    if (questionIds.length > 100) {
      return NextResponse.json(
        { success: false, error: '최대 100개까지만 조회 가능합니다.' },
        { status: 400 }
      );
    }

    if (!subject || !division) {
      return NextResponse.json(
        { success: false, error: '과목과 과정 정보가 필요합니다.' },
        { status: 400 }
      );
    }

    console.log('진단평가 문제 조회 시작:', {
      questionIds: questionIds.length,
      subject,
      division,
    });

    // 어휘 문제 조회 (content_sets와 JOIN)
    const { data: questions, error } = await supabase
      .from('vocabulary_questions')
      .select(`
        id,
        question_text,
        option_1,
        option_2,
        option_3,
        option_4,
        option_5,
        correct_answer,
        explanation,
        answer_initials,
        term,
        content_sets!inner (
          division,
          grade,
          subject,
          area,
          main_topic,
          sub_topic
        )
      `)
      .in('id', questionIds);

    if (error) {
      console.error('문제 조회 실패:', error);
      return NextResponse.json(
        { success: false, error: '문제 조회에 실패했습니다.' },
        { status: 500 }
      );
    }

    if (!questions || questions.length === 0) {
      return NextResponse.json(
        { success: false, error: '조회된 문제가 없습니다. ID를 확인해주세요.' },
        { status: 404 }
      );
    }

    // 데이터 구조 변환
    const formattedQuestions = questions.map((q: any) => ({
      id: q.id,
      question_text: q.question_text,
      option_1: q.option_1,
      option_2: q.option_2,
      option_3: q.option_3,
      option_4: q.option_4,
      option_5: q.option_5,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      answer_initials: q.answer_initials,
      term: q.term,
      content_set: {
        division: q.content_sets.division,
        grade: q.content_sets.grade,
        subject: q.content_sets.subject,
        area: q.content_sets.area,
        main_topic: q.content_sets.main_topic,
        sub_topic: q.content_sets.sub_topic,
      },
    }));

    console.log(`✅ ${formattedQuestions.length}개 문제 조회 완료`);

    // 과목/과정 불일치 경고 체크 (필터링은 하지 않음)
    const mismatchedQuestions = formattedQuestions.filter((q) => {
      const matchSubject = q.content_set.subject === subject;
      const matchDivision = q.content_set.division.includes(division);
      return !matchSubject || !matchDivision;
    });

    let warningMessage = '';
    if (mismatchedQuestions.length > 0) {
      console.warn(
        `⚠️ 경고: ${formattedQuestions.length}개 중 ${mismatchedQuestions.length}개 문제가 선택한 과목/과정과 다릅니다.`
      );
      warningMessage = `선택한 과목/과정과 다른 문제가 ${mismatchedQuestions.length}개 포함되어 있습니다.`;
    }

    return NextResponse.json({
      success: true,
      data: formattedQuestions,
      total: formattedQuestions.length,
      message: `${formattedQuestions.length}개의 문제를 조회했습니다.`,
      warning: warningMessage || undefined,
    });
  } catch (error) {
    console.error('진단평가 문제 조회 중 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}
