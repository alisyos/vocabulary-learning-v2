const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 환경변수가 설정되지 않았습니다.');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', !!supabaseKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateParagraphSchema() {
  console.log('🚀 문단 문제 테이블 스키마 마이그레이션 시작...');
  console.log('📍 대상 테이블: paragraph_questions');

  try {
    // 1. 현재 테이블 구조 확인
    console.log('\n🔍 현재 테이블 구조 확인 중...');
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'paragraph_questions')
      .order('ordinal_position');

    if (columnsError) {
      console.error('테이블 구조 확인 실패:', columnsError);
    } else {
      console.log('📋 현재 paragraph_questions 테이블 구조:');
      console.table(columns);
    }

    // 2. 테스트 데이터로 스키마 상태 확인
    console.log('\n🧪 새로운 스키마로 테스트 데이터 삽입 시도...');
    
    const testData = {
      content_set_id: '00000000-0000-0000-0000-000000000000',
      question_number: 999,
      question_type: '주관식 단답형',
      paragraph_number: 1,
      paragraph_text: '테스트 문단입니다.',
      question_text: '테스트 질문입니다.',
      correct_answer: '장래희망이라는 긴 답안을 테스트합니다',
      answer_initials: 'ㅈㄹㅎㅁ',
      explanation: '테스트 해설입니다.'
    };

    const { data: insertResult, error: insertError } = await supabase
      .from('paragraph_questions')
      .insert([testData])
      .select();

    if (insertError) {
      console.error('❌ 테스트 데이터 삽입 실패:', insertError.message);
      
      // 에러 분석
      if (insertError.message.includes('answer_initials')) {
        console.log('📝 필요한 작업: answer_initials 컬럼 추가 필요');
      }
      if (insertError.message.includes('varchar')) {
        console.log('📝 필요한 작업: correct_answer 컬럼 타입을 TEXT로 변경 필요');
      }
      
      console.log('\n📋 필요한 SQL 명령어:');
      console.log('1. correct_answer 컬럼 타입 변경:');
      console.log('   ALTER TABLE paragraph_questions ALTER COLUMN correct_answer TYPE TEXT;');
      console.log('\n2. answer_initials 컬럼 추가:');
      console.log('   ALTER TABLE paragraph_questions ADD COLUMN IF NOT EXISTS answer_initials TEXT;');
      console.log('\n🔧 실행 방법:');
      console.log('1. Supabase 대시보드 → SQL Editor 접속');
      console.log('2. 위의 SQL 명령어들을 실행');
      console.log('3. 다시 이 스크립트를 실행하여 확인');
      
    } else {
      console.log('✅ 테스트 데이터 삽입 성공! 스키마가 이미 업데이트되어 있습니다.');
      
      // 테스트 데이터 삭제
      await supabase
        .from('paragraph_questions')
        .delete()
        .eq('question_number', 999);
      console.log('🗑️ 테스트 데이터 삭제 완료');
      
      console.log('\n✅ 마이그레이션 완료! 새로운 기능들:');
      console.log('- correct_answer: TEXT 타입으로 긴 답안 지원');
      console.log('- answer_initials: 주관식 단답형 초성 힌트 지원');
    }

    // 3. 기존 데이터 확인
    console.log('\n📊 기존 데이터 확인...');
    const { data: existingData, error: dataError } = await supabase
      .from('paragraph_questions')
      .select('id, question_type, correct_answer, answer_initials')
      .limit(5);

    if (dataError) {
      console.error('기존 데이터 확인 실패:', dataError);
    } else if (existingData && existingData.length > 0) {
      console.log('📊 기존 데이터 샘플:');
      console.table(existingData);
    } else {
      console.log('📊 기존 데이터가 없습니다.');
    }

  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error);
  }
}

// 스크립트 실행
migrateParagraphSchema()
  .then(() => {
    console.log('\n🎉 마이그레이션 스크립트 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 스크립트 실행 실패:', error);
    process.exit(1);
  });