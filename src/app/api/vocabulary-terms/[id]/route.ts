import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 개별 어휘 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    const { term, definition, example_sentence, has_question_generated } = body;

    // 업데이트할 필드 준비 (전달된 필드만 업데이트)
    const updateData: any = {};

    if (term !== undefined) updateData.term = term;
    if (definition !== undefined) updateData.definition = definition;
    if (example_sentence !== undefined) updateData.example_sentence = example_sentence;
    if (has_question_generated !== undefined) updateData.has_question_generated = has_question_generated;

    // 최소한 하나의 필드는 업데이트되어야 함
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: '업데이트할 데이터가 없습니다.' },
        { status: 400 }
      );
    }

    // 어휘 업데이트
    const { data, error } = await supabase
      .from('vocabulary_terms')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating vocabulary term:', error);
      return NextResponse.json(
        { error: 'Failed to update vocabulary term' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '어휘가 성공적으로 수정되었습니다.',
      data
    });

  } catch (error) {
    console.error('Error in vocabulary-terms PUT:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 개별 어휘 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // 먼저 관련된 vocabulary_questions가 있는지 확인
    const { data: questions, error: questionsError } = await supabase
      .from('vocabulary_questions')
      .select('id')
      .eq('term_id', id)
      .limit(1);

    if (questionsError) {
      console.error('Error checking vocabulary questions:', questionsError);
    }

    // 관련 문제가 있으면 경고
    if (questions && questions.length > 0) {
      return NextResponse.json(
        { 
          error: '이 어휘와 연결된 문제가 있습니다. 먼저 관련 문제를 삭제해주세요.',
          hasRelatedQuestions: true 
        },
        { status: 400 }
      );
    }

    // 어휘 삭제
    const { error } = await supabase
      .from('vocabulary_terms')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting vocabulary term:', error);
      return NextResponse.json(
        { error: 'Failed to delete vocabulary term' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '어휘가 성공적으로 삭제되었습니다.'
    });

  } catch (error) {
    console.error('Error in vocabulary-terms DELETE:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 개별 어휘 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const { data, error } = await supabase
      .from('vocabulary_terms')
      .select(`
        *,
        content_sets (
          title,
          grade,
          subject,
          area
        ),
        vocabulary_questions (
          id,
          question_text,
          correct_answer
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching vocabulary term:', error);
      return NextResponse.json(
        { error: 'Failed to fetch vocabulary term' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Vocabulary term not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Error in vocabulary-terms GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}