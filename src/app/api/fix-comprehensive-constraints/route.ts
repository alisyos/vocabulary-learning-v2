import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 comprehensive_questions 테이블 제약조건 수정 시작...');
    
    // 1. 현재 테이블의 제약조건 확인을 위해 기존 데이터 조회
    const { data: existingData, error: selectError } = await supabase
      .from('comprehensive_questions')
      .select('question_type')
      .limit(5);
    
    if (selectError) {
      console.error('❌ 기존 데이터 조회 실패:', selectError);
    } else {
      console.log('📋 기존 question_type 값들:', existingData?.map(d => d.question_type));
    }
    
    // 2. 새로운 문제 유형으로 테스트 삽입 시도
    console.log('🧪 새로운 문제 유형 테스트 삽입...');
    
    const testQuestions = [
      {
        content_set_id: '00000000-0000-0000-0000-000000000000',
        question_number: 999,
        question_type: '단답형',
        question_format: '주관식',
        difficulty: '일반',
        question_text: 'TEST - 단답형',
        correct_answer: 'TEST',
        explanation: 'TEST',
        is_supplementary: false,
        question_set_number: 1
      },
      {
        content_set_id: '00000000-0000-0000-0000-000000000000',
        question_number: 998,
        question_type: 'OX문제',
        question_format: '객관식',
        difficulty: '일반',
        question_text: 'TEST - OX문제',
        option_1: '○ (참)',
        option_2: '× (거짓)',
        correct_answer: '1',
        explanation: 'TEST',
        is_supplementary: false,
        question_set_number: 1
      },
      {
        content_set_id: '00000000-0000-0000-0000-000000000000',
        question_number: 997,
        question_type: '자료분석하기',
        question_format: '객관식',
        difficulty: '일반',
        question_text: 'TEST - 자료분석하기',
        option_1: '선택지1',
        option_2: '선택지2',
        option_3: '선택지3',
        option_4: '선택지4',
        option_5: '선택지5',
        correct_answer: '1',
        explanation: 'TEST',
        is_supplementary: false,
        question_set_number: 1
      }
    ];
    
    const testResults = [];
    
    for (const testQuestion of testQuestions) {
      console.log(`🧪 ${testQuestion.question_type} 테스트 중...`);
      
      const { data: insertData, error: insertError } = await supabase
        .from('comprehensive_questions')
        .insert(testQuestion)
        .select();
      
      if (insertError) {
        console.log(`❌ ${testQuestion.question_type} 삽입 실패:`, insertError.message);
        testResults.push({
          type: testQuestion.question_type,
          success: false,
          error: insertError.message
        });
        
        // 제약조건 오류인지 확인
        if (insertError.message.includes('question_type_check')) {
          console.log(`🚨 ${testQuestion.question_type}은 허용되지 않는 question_type입니다.`);
        }
      } else {
        console.log(`✅ ${testQuestion.question_type} 삽입 성공!`);
        testResults.push({
          type: testQuestion.question_type,
          success: true,
          id: insertData?.[0]?.id
        });
        
        // 테스트 데이터 즉시 삭제
        if (insertData?.[0]?.id) {
          const { error: deleteError } = await supabase
            .from('comprehensive_questions')
            .delete()
            .eq('id', insertData[0].id);
          
          if (deleteError) {
            console.log(`⚠️ ${testQuestion.question_type} 테스트 데이터 삭제 실패:`, deleteError.message);
          } else {
            console.log(`🧹 ${testQuestion.question_type} 테스트 데이터 삭제 완료`);
          }
        }
      }
    }
    
    // 결과 분석
    const failedTypes = testResults.filter(r => !r.success);
    const successTypes = testResults.filter(r => r.success);
    
    console.log('📊 테스트 결과:');
    console.log('✅ 성공한 유형들:', successTypes.map(r => r.type));
    console.log('❌ 실패한 유형들:', failedTypes.map(r => r.type));
    
    if (failedTypes.length > 0) {
      return NextResponse.json({
        success: false,
        message: '일부 문제 유형이 데이터베이스 제약조건에서 허용되지 않습니다.',
        failedTypes: failedTypes,
        successTypes: successTypes,
        recommendation: 'Supabase 대시보드에서 comprehensive_questions 테이블의 question_type 제약조건을 수동으로 수정해야 합니다.',
        sqlCommand: `ALTER TABLE comprehensive_questions DROP CONSTRAINT IF EXISTS comprehensive_questions_question_type_check; ALTER TABLE comprehensive_questions ADD CONSTRAINT comprehensive_questions_question_type_check CHECK (question_type IN ('단답형', '핵심 내용 요약', '핵심문장 찾기', 'OX문제', '자료분석하기'));`
      });
    } else {
      return NextResponse.json({
        success: true,
        message: '모든 새로운 문제 유형이 성공적으로 테스트되었습니다!',
        successTypes: successTypes
      });
    }
    
  } catch (error) {
    console.error('💥 제약조건 수정 중 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: '제약조건 수정 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

// GET 요청으로 현재 상태 확인
export async function GET() {
  try {
    // 현재 저장된 question_type 값들 조회
    const { data: questionTypes, error } = await supabase
      .from('comprehensive_questions')
      .select('question_type')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      throw error;
    }
    
    const uniqueTypes = [...new Set(questionTypes?.map(q => q.question_type) || [])];
    
    return NextResponse.json({
      success: true,
      currentQuestionTypes: uniqueTypes,
      requiredTypes: ['단답형', '핵심 내용 요약', '핵심문장 찾기', 'OX문제', '자료분석하기'],
      sampleData: questionTypes?.slice(0, 5)
    });
    
  } catch (error) {
    console.error('현재 상태 조회 실패:', error);
    return NextResponse.json(
      {
        success: false,
        error: '현재 상태 조회에 실패했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}