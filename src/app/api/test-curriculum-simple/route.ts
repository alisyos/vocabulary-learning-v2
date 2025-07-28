import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('간단한 Supabase 연결 테스트 시작...');
    
    // 1. 기본 연결 테스트
    const { data: testData, error: testError } = await supabase
      .from('content_sets')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('기본 연결 테스트 실패:', testError);
      return NextResponse.json({
        success: false,
        message: 'Supabase 기본 연결 실패',
        error: testError.message,
        step: 'connection_test'
      });
    }

    // 2. curriculum_data 테이블 존재 확인
    const { data: curriculumTest, error: curriculumError } = await supabase
      .from('curriculum_data')
      .select('count')
      .limit(1);

    if (curriculumError) {
      console.error('curriculum_data 테이블 접근 실패:', curriculumError);
      return NextResponse.json({
        success: false,
        message: 'curriculum_data 테이블이 존재하지 않습니다',
        error: curriculumError.message,
        step: 'table_check',
        recommendation: 'setup-supabase-schema API를 먼저 실행해주세요'
      });
    }

    // 3. curriculum_data 실제 데이터 조회
    const { data: actualData, error: dataError } = await supabase
      .from('curriculum_data')
      .select('*')
      .limit(5);

    if (dataError) {
      console.error('curriculum_data 데이터 조회 실패:', dataError);
      return NextResponse.json({
        success: false,
        message: 'curriculum_data 데이터 조회 실패',
        error: dataError.message,
        step: 'data_query'
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Supabase 연결 및 curriculum_data 테이블 정상',
      data: {
        connection: 'OK',
        table_exists: 'OK',
        data_count: actualData?.length || 0,
        sample_data: actualData?.slice(0, 3) || []
      },
      recommendation: actualData?.length === 0 ? 
        'curriculum_data가 비어있습니다. 마이그레이션을 실행해주세요' : 
        '모든 설정이 정상입니다'
    });

  } catch (error) {
    console.error('전체적인 오류:', error);
    return NextResponse.json({
      success: false,
      message: '예상치 못한 오류가 발생했습니다',
      error: error instanceof Error ? error.message : 'Unknown error',
      step: 'general_error'
    }, { status: 500 });
  }
} 