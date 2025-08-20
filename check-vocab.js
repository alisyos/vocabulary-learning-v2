const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://tnscqyaqbeitjwrraupi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRuc2NxeWFxYmVpdGp3cnJhdXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMzc5MjQsImV4cCI6MjA2ODcxMzkyNH0.cz9fEmTH6gRzyQfsmzg2KZhGTF2iYCNWxJn88VxBwcY'
);

async function checkVocabularyWithContentSet() {
  try {
    // 어휘 문제가 있는 콘텐츠 세트 찾기
    const { data: questions, error } = await supabase
      .from('vocabulary_questions')
      .select('content_set_id, id, term, question_type, detailed_question_type, difficulty')
      .order('content_set_id')
      .limit(20);
    
    if (error) {
      console.error('❌ 조회 오류:', error);
      return;
    }

    console.log('📚 어휘 문제 현황:');
    console.log('총', questions?.length || 0, '개 문제');
    
    // content_set_id별로 그룹화
    const grouped = {};
    questions.forEach(q => {
      if (!grouped[q.content_set_id]) {
        grouped[q.content_set_id] = [];
      }
      grouped[q.content_set_id].push(q);
    });
    
    for (const setId in grouped) {
      console.log('\n========================================');
      console.log('콘텐츠 세트 ID:', setId);
      console.log('URL: http://localhost:3000/manage/' + setId);
      console.log('문제 수:', grouped[setId].length, '개');
      console.log('----------------------------------------');
      
      grouped[setId].forEach((q, idx) => {
        console.log(`  [${idx + 1}] 용어: ${q.term}`);
        console.log(`      ID: ${q.id}`);
        console.log(`      question_type: ${q.question_type}`);
        console.log(`      detailed_question_type: ${q.detailed_question_type || 'null'}`);
        console.log(`      difficulty: ${q.difficulty || 'null'}`);
        console.log('');
      });
    }
    
  } catch (err) {
    console.error('❌ 스크립트 오류:', err);
  }
}

checkVocabularyWithContentSet();