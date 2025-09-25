import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    console.log('📊 vocabulary_terms 테이블 통계 조회 중...');

    // 1. 전체 레코드 수
    const { count: totalCount, error: totalError } = await supabase
      .from('vocabulary_terms')
      .select('*', { count: 'exact', head: true });

    if (totalError) {
      console.error('전체 레코드 수 조회 오류:', totalError);
      return NextResponse.json({
        success: false,
        error: '전체 레코드 수 조회 중 오류가 발생했습니다.',
        details: totalError.message
      });
    }

    // 2. definition에 괄호가 포함된 레코드 수
    const { count: bracketCount, error: bracketError } = await supabase
      .from('vocabulary_terms')
      .select('*', { count: 'exact', head: true })
      .or('definition.like.*(*),definition.like.*(예:*),definition.like.*(예시:*)');

    if (bracketError) {
      console.error('괄호 포함 레코드 수 조회 오류:', bracketError);
      return NextResponse.json({
        success: false,
        error: '괄호 포함 레코드 수 조회 중 오류가 발생했습니다.',
        details: bracketError.message
      });
    }

    // 3. example_sentence가 비어있지 않은 레코드 수 (정상적으로 파싱된 레코드)
    const { count: parsedCount, error: parsedError } = await supabase
      .from('vocabulary_terms')
      .select('*', { count: 'exact', head: true })
      .not('example_sentence', 'is', null)
      .neq('example_sentence', '');

    if (parsedError) {
      console.error('파싱된 레코드 수 조회 오류:', parsedError);
      return NextResponse.json({
        success: false,
        error: '파싱된 레코드 수 조회 중 오류가 발생했습니다.',
        details: parsedError.message
      });
    }

    // 4. example_sentence가 비어있는 레코드 수
    const { count: emptyExampleCount, error: emptyExampleError } = await supabase
      .from('vocabulary_terms')
      .select('*', { count: 'exact', head: true })
      .or('example_sentence.is.null,example_sentence.eq.');

    if (emptyExampleError) {
      console.error('빈 예시 레코드 수 조회 오류:', emptyExampleError);
      return NextResponse.json({
        success: false,
        error: '빈 예시 레코드 수 조회 중 오류가 발생했습니다.',
        details: emptyExampleError.message
      });
    }

    // 5. term이 비어있는 레코드 수
    const { count: emptyTermCount, error: emptyTermError } = await supabase
      .from('vocabulary_terms')
      .select('*', { count: 'exact', head: true })
      .or('term.is.null,term.eq.');

    if (emptyTermError) {
      console.error('빈 용어 레코드 수 조회 오류:', emptyTermError);
      return NextResponse.json({
        success: false,
        error: '빈 용어 레코드 수 조회 중 오류가 발생했습니다.',
        details: emptyTermError.message
      });
    }

    // 6. definition이 비어있는 레코드 수
    const { count: emptyDefinitionCount, error: emptyDefinitionError } = await supabase
      .from('vocabulary_terms')
      .select('*', { count: 'exact', head: true })
      .or('definition.is.null,definition.eq.');

    if (emptyDefinitionError) {
      console.error('빈 정의 레코드 수 조회 오류:', emptyDefinitionError);
      return NextResponse.json({
        success: false,
        error: '빈 정의 레코드 수 조회 중 오류가 발생했습니다.',
        details: emptyDefinitionError.message
      });
    }

    console.log(`📊 통계 조회 완료:
      - 전체 레코드: ${totalCount}
      - 괄호 포함 레코드: ${bracketCount}
      - 예시 있는 레코드: ${parsedCount}
      - 예시 없는 레코드: ${emptyExampleCount}
      - 용어 비어있음: ${emptyTermCount}
      - 정의 비어있음: ${emptyDefinitionCount}`);

    return NextResponse.json({
      success: true,
      stats: {
        total: totalCount || 0,
        withBrackets: bracketCount || 0,
        withExample: parsedCount || 0,
        withoutExample: emptyExampleCount || 0,
        emptyTerm: emptyTermCount || 0,
        emptyDefinition: emptyDefinitionCount || 0
      }
    });

  } catch (error) {
    console.error('통계 조회 중 오류:', error);
    return NextResponse.json({
      success: false,
      error: '통계 조회 중 서버 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    });
  }
}