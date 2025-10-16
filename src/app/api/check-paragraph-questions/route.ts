import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * paragraph_questions 테이블 데이터 확인 API
 *
 * GET /api/check-paragraph-questions
 *
 * paragraph_questions 테이블의 데이터 존재 여부와 샘플 데이터를 확인합니다.
 */
export async function GET(request: Request) {
  try {
    console.log('🔍 paragraph_questions 테이블 확인 시작...');

    // 전체 개수 확인
    const { count: totalCount, error: countError } = await supabase
      .from('paragraph_questions')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ 개수 조회 실패:', countError);
      throw countError;
    }

    console.log(`📊 전체 paragraph_questions 개수: ${totalCount}`);

    // 샘플 데이터 5개 가져오기
    const { data: sampleData, error: sampleError } = await supabase
      .from('paragraph_questions')
      .select('id, question_number, question_text, option_1, option_2, explanation')
      .limit(5);

    if (sampleError) {
      console.error('❌ 샘플 데이터 조회 실패:', sampleError);
      throw sampleError;
    }

    console.log(`📄 샘플 데이터 ${sampleData?.length || 0}개 조회 완료`);

    // "~습니다" 형태가 포함된 데이터 확인
    const { data: needsNormalization, error: needsError } = await supabase
      .from('paragraph_questions')
      .select('id, question_number, question_text, explanation')
      .or('question_text.ilike.%습니다%,question_text.ilike.%입니다%,explanation.ilike.%습니다%,explanation.ilike.%입니다%')
      .limit(10);

    if (needsError) {
      console.error('❌ 정규화 필요 데이터 조회 실패:', needsError);
      throw needsError;
    }

    console.log(`✅ 정규화 필요한 데이터: ${needsNormalization?.length || 0}개`);

    return NextResponse.json({
      success: true,
      totalCount: totalCount || 0,
      sampleData: sampleData || [],
      needsNormalizationCount: needsNormalization?.length || 0,
      needsNormalizationSamples: needsNormalization || [],
      message: totalCount === 0
        ? 'paragraph_questions 테이블에 데이터가 없습니다.'
        : `총 ${totalCount}개의 문단 문제가 있으며, 그 중 ${needsNormalization?.length || 0}개가 정규화가 필요합니다.`
    });

  } catch (error) {
    console.error('❌ paragraph_questions 확인 실패:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'paragraph_questions 확인 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}
