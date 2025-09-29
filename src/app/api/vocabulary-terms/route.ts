import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // 페이지네이션을 사용하여 전체 데이터 가져오기
    let allTerms: any[] = [];
    let offset = 0;
    const limit = 1000;
    let hasMore = true;

    while (hasMore) {
      // vocabulary_terms 테이블에서 데이터 조회
      const { data: terms, error: termsError } = await supabase
        .from('vocabulary_terms')
        .select(`
          *,
          content_sets (
            title,
            grade,
            subject,
            area,
            main_topic,
            sub_topic,
            keywords,
            user_id
          )
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (termsError) {
        console.error('Error fetching vocabulary terms:', termsError);
        return NextResponse.json(
          { error: 'Failed to fetch vocabulary terms' },
          { status: 500 }
        );
      }

      if (!terms || terms.length === 0) {
        hasMore = false;
      } else {
        allTerms = [...allTerms, ...terms];
        offset += limit;

        // 가져온 데이터가 limit보다 적으면 마지막 페이지
        if (terms.length < limit) {
          hasMore = false;
        }
      }
    }

    // 데이터 포맷팅
    const formattedTerms = allTerms?.map(term => ({
      id: term.id,
      content_set_id: term.content_set_id,
      term: term.term,
      definition: term.definition,
      example_sentence: term.example_sentence,
      has_question_generated: term.has_question_generated,
      passage_id: term.passage_id,
      passage_number: term.passage_number,
      passage_title: term.passage_title,
      created_at: term.created_at,
      // content_sets 정보 추가
      content_set_title: term.content_sets?.title,
      grade: term.content_sets?.grade,
      subject: term.content_sets?.subject,
      area: term.content_sets?.area,
      main_topic: term.content_sets?.main_topic,
      sub_topic: term.content_sets?.sub_topic,
      keywords: term.content_sets?.keywords,
      user_id: term.content_sets?.user_id
    })) || [];

    return NextResponse.json({
      success: true,
      terms: formattedTerms,
      total: formattedTerms.length
    });

  } catch (error) {
    console.error('Error in vocabulary-terms GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}