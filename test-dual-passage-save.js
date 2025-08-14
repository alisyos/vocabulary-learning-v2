// 2개 지문 형식 저장 테스트 스크립트
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tnscqyaqbeitjwrraupi.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRuc2NxeWFxYmVpdGp3cnJhdXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMzc5MjQsImV4cCI6MjA2ODcxMzkyNH0.cz9fEmTH6gRzyQfsmzg2KZhGTF2iYCNWxJn88VxBwcY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 2개 지문 형식의 테스트 데이터
const testData = {
  input: {
    division: '초등학교 중학년(3-4학년)',
    grade: '3학년',
    subject: '과학',
    area: '생물',
    maintopic: '동물의 한살이',
    subtopic: '곤충의 변태',
    keyword: '번데기, 애벌레, 완전변태',
    length: '2개의 지문 생성. 지문당 300자 내외 - 총 600자',
    textType: '설명문'
  },
  editablePassage: {
    title: '곤충은 어떻게 자랄까요?', // 기존 단일 지문 형식 호환을 위해 유지
    paragraphs: [], // 기존 형식 호환
    footnote: [], // 기존 형식 호환
    // 새로운 2개 지문 형식
    passages: [
      {
        title: '곤충은 어떻게 자랄까요?',
        paragraphs: [
          '곤충들은 사람과 다르게 자랍니다. 나비와 같은 곤충은 완전변태라는 특별한 과정을 거쳐서 어른이 됩니다.',
          '먼저 알에서 시작해서 애벌레가 됩니다. 애벌레는 많이 먹고 자라다가 번데기가 됩니다.',
          '번데기 안에서 놀라운 변화가 일어나 아름다운 나비가 됩니다.'
        ],
        footnote: [
          '완전변태: 알, 애벌레, 번데기, 성충의 4단계로 자라는 과정 (예시: 나비의 한살이가 완전변태의 대표적 예시입니다)',
          '애벌레: 곤충의 유충 단계로 주로 잎을 먹고 자랍니다 (예시: 배추흰나비 애벌레는 배추잎을 좋아해요)',
          '번데기: 애벌레에서 성충으로 변하는 중간 단계 (예시: 번데기 안에서 나비의 날개가 만들어져요)',
          '성충: 다 자란 어른 곤충 (예시: 알을 낳을 수 있는 어른 나비를 성충이라고 해요)',
          '변태: 곤충이 자라면서 모습이 바뀌는 과정 (예시: 애벌레가 나비로 변하는 것이 변태예요)'
        ]
      },
      {
        title: '곤충은 어떻게 자랄까요?',
        paragraphs: [
          '모든 곤충이 나비처럼 자라는 것은 아닙니다. 메뚜기나 잠자리는 불완전변태를 합니다.',
          '불완전변태는 알, 약충, 성충의 3단계로 자랍니다. 번데기 과정이 없어서 더 간단합니다.',
          '약충은 어른과 비슷하지만 날개가 작고 알을 낳을 수 없습니다.'
        ],
        footnote: [
          '불완전변태: 알, 약충, 성충의 3단계로 자라는 과정 (예시: 메뚜기는 불완전변태로 자라요)',
          '약충: 불완전변태 곤충의 새끼 단계 (예시: 어린 메뚜기를 약충이라고 불러요)',
          '탈피: 곤충이 자라면서 껍질을 벗는 것 (예시: 매미가 나무에서 껍질을 벗고 나오는 것이 탈피예요)',
          '날개: 곤충이 하늘을 나는 기관 (예시: 나비의 날개는 색깔이 아름다워요)',
          '곤충: 몸이 머리, 가슴, 배로 나뉘고 다리가 6개인 동물 (예시: 개미, 나비, 벌은 모두 곤충이에요)'
        ]
      }
    ]
  },
  vocabularyQuestions: [
    {
      id: 'vocab_1',
      term: '완전변태',
      question: '다음 중 완전변태의 4단계를 올바른 순서로 나타낸 것은?',
      options: ['알 → 애벌레 → 번데기 → 성충', '알 → 약충 → 성충', '애벌레 → 번데기 → 성충', '알 → 번데기 → 애벌레 → 성충', '약충 → 애벌레 → 성충'],
      answer: '1',
      explanation: '완전변태는 알, 애벌레, 번데기, 성충의 4단계로 이루어집니다.'
    }
  ],
  paragraphQuestions: [],
  comprehensiveQuestions: [
    {
      id: 'comp_1',
      type: '정보 확인',
      question: '곤충의 변태에 대한 설명으로 옳은 것은?',
      options: ['모든 곤충은 완전변태를 한다', '불완전변태는 4단계로 이루어진다', '완전변태에는 번데기 과정이 있다', '약충은 완전변태에서만 나타난다', '변태는 곤충에게만 나타나는 현상이다'],
      answer: '3',
      explanation: '완전변태는 번데기 과정을 거치는 것이 특징입니다.',
      isSupplementary: false,
      questionSetNumber: 1
    }
  ]
};

async function testDualPassageSave() {
  try {
    console.log('🧪 2개 지문 형식 저장 테스트 시작...');
    
    // API 호출
    const response = await fetch('http://localhost:3000/api/save-final-supabase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...testData,
        userId: 'test_user'
      }),
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ 테스트 성공!');
      console.log('📋 저장된 콘텐츠 ID:', result.data?.contentSetId);
      
      // 저장된 데이터 확인
      const { data: contentSet, error } = await supabase
        .from('content_sets')
        .select(`
          *,
          passages(*),
          vocabulary_terms(*),
          vocabulary_questions(*),
          comprehensive_questions(*)
        `)
        .eq('id', result.data.contentSetId)
        .single();
      
      if (error) {
        console.error('❌ 저장된 데이터 조회 실패:', error);
      } else {
        console.log('📊 저장된 데이터 검증:');
        console.log(`  - 지문 수: ${contentSet.passages?.length || 0}개`);
        console.log(`  - 어휘 용어 수: ${contentSet.vocabulary_terms?.length || 0}개`);
        console.log(`  - 어휘 문제 수: ${contentSet.vocabulary_questions?.length || 0}개`);
        console.log(`  - 종합 문제 수: ${contentSet.comprehensive_questions?.length || 0}개`);
        console.log(`  - 제목: "${contentSet.title}"`);
        
        if (contentSet.passages && contentSet.passages.length > 0) {
          contentSet.passages.forEach((passage, index) => {
            const paragraphCount = Object.values(passage)
              .filter(value => typeof value === 'string' && value.startsWith && !['id', 'content_set_id', 'created_at', 'title'].includes(value))
              .filter(value => value && value.trim() !== '')
              .length;
            console.log(`  📖 지문 ${passage.passage_number}: "${passage.title}" (${paragraphCount}개 문단)`);
          });
        }
        
        console.log('🎉 2개 지문 형식 저장 테스트 완료!');
      }
      
    } else {
      console.log('❌ 테스트 실패:', result.error);
      console.log('📋 상세 오류:', result);
    }
    
  } catch (error) {
    console.error('🚨 테스트 중 오류:', error);
  }
}

// 스크립트 실행
if (require.main === module) {
  testDualPassageSave();
}

module.exports = { testDualPassageSave };