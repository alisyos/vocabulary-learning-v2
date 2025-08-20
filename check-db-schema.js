// Check actual database schema for vocabulary_questions table
// This will help us understand what columns exist and what we need to add

const { createClient } = require('@supabase/supabase-js');

// Note: You'll need to update these with current environment variables
const supabaseUrl = 'https://your-project.supabase.co';
const supabaseKey = 'your-anon-key';

async function checkVocabularyQuestionsSchema() {
  console.log('🔍 vocabulary_questions 테이블 스키마 확인...');
  console.log('');
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // 테이블의 샘플 데이터를 조회하여 컬럼 구조 파악
    const { data, error } = await supabase
      .from('vocabulary_questions')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ 조회 오류:', error);
      console.log('');
      console.log('💡 환경변수를 올바르게 설정한 후 다시 실행하세요:');
      console.log('   - NEXT_PUBLIC_SUPABASE_URL');
      console.log('   - NEXT_PUBLIC_SUPABASE_ANON_KEY');
      return;
    }

    if (data && data.length > 0) {
      console.log('✅ 현재 vocabulary_questions 테이블 컬럼들:');
      const columns = Object.keys(data[0]);
      columns.forEach((col, index) => {
        console.log(`  [${index + 1}] ${col}: ${typeof data[0][col]}`);
      });
      
      console.log('');
      console.log('🎯 중요 필드 존재 여부:');
      const requiredFields = [
        'id', 'content_set_id', 'question_number', 'question_type', 
        'difficulty', 'term', 'question_text', 'correct_answer', 'explanation'
      ];
      
      const missingFields = [
        'detailed_question_type', 'answer_initials'
      ];
      
      requiredFields.forEach(field => {
        const exists = columns.includes(field);
        console.log(`  ${exists ? '✅' : '❌'} ${field}: ${exists ? '존재' : '없음'}`);
      });
      
      console.log('');
      console.log('🔮 향후 추가 예정 필드들:');
      missingFields.forEach(field => {
        const exists = columns.includes(field);
        console.log(`  ${exists ? '✅' : '📋'} ${field}: ${exists ? '이미 존재' : '추가 필요'}`);
      });
      
      console.log('');
      console.log('📋 샘플 데이터:');
      console.log(JSON.stringify(data[0], null, 2));
      
    } else {
      console.log('📋 테이블이 비어있습니다.');
      console.log('💡 먼저 어휘 문제를 생성하여 테이블 구조를 확인할 수 있습니다.');
    }
    
  } catch (err) {
    console.error('❌ 스크립트 오류:', err.message);
  }
}

console.log('📚 데이터베이스 스키마 확인 도구');
console.log('====================================');
console.log('');
console.log('이 스크립트는 vocabulary_questions 테이블의 실제 컬럼 구조를 확인합니다.');
console.log('현재는 환경변수가 설정되지 않아 실행되지 않을 수 있습니다.');
console.log('');

// checkVocabularyQuestionsSchema();

// 현재 알려진 정보 출력
console.log('🔍 현재 알려진 정보:');
console.log('');
console.log('❌ 누락된 컬럼들 (오류 메시지 기반):');
console.log('  - answer_initials: 주관식 문제의 초성 힌트 저장용');
console.log('  - detailed_question_type: 6가지 상세 유형 구분용');
console.log('');
console.log('✅ 기존 컬럼들 (정상 동작하는 필드들):');
console.log('  - id, content_set_id, question_number');
console.log('  - question_type, difficulty, term'); 
console.log('  - question_text, correct_answer, explanation');
console.log('  - option_1, option_2, option_3, option_4, option_5');
console.log('  - created_at');
console.log('');
console.log('🎯 해결 방안:');
console.log('  1. 현재: 기존 컬럼만 사용하여 저장 (✅ 구현 완료)');
console.log('  2. 향후: 누락된 컬럼들을 DB에 추가');
console.log('  3. 최종: 6가지 유형 구분 및 초성 힌트 완전 지원');
console.log('');
console.log('💡 현재 상태:');
console.log('  - 저장은 정상적으로 작동함');
console.log('  - 6가지 유형 정보는 로그로만 출력');
console.log('  - 초성 힌트는 로그로만 출력');
console.log('  - UI에서 선택한 난이도는 정상 반영');