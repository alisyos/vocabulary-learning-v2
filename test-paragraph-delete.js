// 문단 문제 삭제 기능 테스트 스크립트
console.log('🧪 문단 문제 삭제 기능 테스트');

// 모의 문단 문제 데이터
const mockParagraphQuestions = [
  {
    id: 'q1',
    type: '빈칸 채우기',
    paragraphNumber: 1,
    question: '테스트 문제 1',
    options: ['옵션1', '옵션2', '옵션3', '옵션4'],
    answer: '1',
    explanation: '테스트 해설 1'
  },
  {
    id: 'q2', 
    type: '주관식 단답형',
    paragraphNumber: 2,
    question: '테스트 문제 2',
    answer: '테스트답안',
    answerInitials: 'ㅌㅅㄷㅇ',
    explanation: '테스트 해설 2'
  },
  {
    id: 'q3',
    type: '어절 순서 맞추기',
    paragraphNumber: 3,
    question: '테스트 문제 3',
    wordSegments: ['어절1', '어절2', '어절3'],
    answer: '어절1 어절2 어절3',
    explanation: '테스트 해설 3'
  }
];

console.log('📝 초기 문제 수:', mockParagraphQuestions.length);
console.log('📋 초기 문제 목록:');
mockParagraphQuestions.forEach((q, idx) => {
  console.log(`  ${idx + 1}. ${q.id}: ${q.type} - ${q.question}`);
});

// 삭제 기능 시뮬레이션
function simulateDelete(questions, questionId) {
  console.log(`\n🗑️ 문제 ${questionId} 삭제 시뮬레이션`);
  
  const questionToDelete = questions.find(q => q.id === questionId);
  if (!questionToDelete) {
    console.log('❌ 삭제할 문제를 찾을 수 없습니다.');
    return questions;
  }
  
  console.log(`📄 삭제할 문제: ${questionToDelete.type} - ${questionToDelete.question}`);
  
  const updatedQuestions = questions.filter(q => q.id !== questionId);
  
  console.log('✅ 삭제 완료!');
  console.log('📝 삭제 후 문제 수:', updatedQuestions.length);
  console.log('📋 삭제 후 문제 목록:');
  updatedQuestions.forEach((q, idx) => {
    console.log(`  ${idx + 1}. ${q.id}: ${q.type} - ${q.question}`);
  });
  
  return updatedQuestions;
}

// 테스트 실행
let currentQuestions = [...mockParagraphQuestions];

// 첫 번째 문제 삭제 테스트
currentQuestions = simulateDelete(currentQuestions, 'q1');

// 두 번째 문제 삭제 테스트
currentQuestions = simulateDelete(currentQuestions, 'q3');

// 존재하지 않는 문제 삭제 테스트
currentQuestions = simulateDelete(currentQuestions, 'q999');

console.log('\n🎉 모든 삭제 기능 테스트가 완료되었습니다!');