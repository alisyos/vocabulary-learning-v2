import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST() {
  try {
    console.log('curriculum_data 테이블 생성 시도...');
    
    // 1. 우선 기본 데이터를 삽입해서 테이블 구조를 추론하도록 시도
    const sampleData = {
      subject: '사회',
      grade: '3학년',
      area: '일반사회',
      main_topic: '우리나라의 정치',
      sub_topic: '민주주의와 시민 참여',
      keywords: '민주주의, 시민 참여, 선거',
      is_active: true
    };

    // 2. 테이블이 존재하는지 확인
    const { data: existCheck, error: checkError } = await supabase
      .from('curriculum_data')
      .select('count')
      .limit(1);

    if (checkError && checkError.message.includes('does not exist')) {
      return NextResponse.json({
        success: false,
        message: 'curriculum_data 테이블이 존재하지 않습니다',
        error: checkError.message,
        manual_creation_sql: `
CREATE TABLE curriculum_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject VARCHAR(20) NOT NULL,
    grade VARCHAR(50) NOT NULL,
    area VARCHAR(50) NOT NULL,
    main_topic VARCHAR(200) NOT NULL,
    sub_topic VARCHAR(200) NOT NULL,
    keywords TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`,
        instruction: 'Supabase 콘솔의 SQL Editor에서 위 SQL을 실행해주세요'
      });
    }

    // 3. 테이블이 존재하면 샘플 데이터 삽입 시도
    const { data: insertData, error: insertError } = await supabase
      .from('curriculum_data')
      .insert(sampleData)
      .select();

    if (insertError) {
      return NextResponse.json({
        success: false,
        message: '샘플 데이터 삽입 실패',
        error: insertError.message
      });
    }

    return NextResponse.json({
      success: true,
      message: 'curriculum_data 테이블이 정상적으로 작동합니다',
      sample_data: insertData
    });

  } catch (error) {
    console.error('테이블 생성 중 오류:', error);
    return NextResponse.json({
      success: false,
      message: '테이블 생성 중 오류가 발생했습니다',
      error: error instanceof Error ? error.message : 'Unknown error',
      manual_creation_sql: `
CREATE TABLE curriculum_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject VARCHAR(20) NOT NULL,
    grade VARCHAR(50) NOT NULL,
    area VARCHAR(50) NOT NULL,
    main_topic VARCHAR(200) NOT NULL,
    sub_topic VARCHAR(200) NOT NULL,
    keywords TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`,
      instruction: 'Supabase 콘솔의 SQL Editor에서 위 SQL을 실행해주세요'
    }, { status: 500 });
  }
} 