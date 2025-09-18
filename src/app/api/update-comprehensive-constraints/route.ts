import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST() {
  try {
    console.log('🔧 comprehensive_questions 테이블 제약조건 업데이트 시작...');
    
    // 1. 기존 제약조건 삭제
    console.log('🗑️ 기존 question_type CHECK 제약조건 삭제...');
    
    const dropConstraintResult = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE comprehensive_questions DROP CONSTRAINT IF EXISTS comprehensive_questions_question_type_check;'
    });
    
    if (dropConstraintResult.error) {
      console.error('⚠️ 기존 제약조건 삭제 실패 (무시 가능):', dropConstraintResult.error);
    } else {
      console.log('✅ 기존 제약조건 삭제 완료');
    }
    
    // 2. 새로운 제약조건 추가 (기존 5개 + 새로운 4개)
    console.log('➕ 새로운 question_type CHECK 제약조건 추가...');
    
    const addConstraintSQL = `
      ALTER TABLE comprehensive_questions 
      ADD CONSTRAINT comprehensive_questions_question_type_check 
      CHECK (question_type IN (
        '단답형',
        '핵심 내용 요약', 
        '핵심문장 찾기',
        'OX문제',
        '자료분석하기',
        '정보 확인',
        '주제 파악',
        '자료해석',
        '추론'
      ));
    `;
    
    const addConstraintResult = await supabase.rpc('exec_sql', {
      sql: addConstraintSQL
    });
    
    if (addConstraintResult.error) {
      console.error('❌ 새로운 제약조건 추가 실패:', addConstraintResult.error);
      return NextResponse.json(
        {
          success: false,
          message: '새로운 제약조건 추가 실패',
          error: addConstraintResult.error
        },
        { status: 500 }
      );
    }
    
    console.log('✅ 새로운 제약조건 추가 완료');
    
    // 3. 새로운 유형으로 테스트 삽입
    console.log('🧪 새로운 유형 테스트 삽입...');
    
    const testTypes = ['정보 확인', '주제 파악', '자료해석', '추론'];
    let successCount = 0;
    
    for (const questionType of testTypes) {
      try {
        const { data, error } = await supabase
          .from('comprehensive_questions')
          .insert({
            content_set_id: '00000000-0000-0000-0000-000000000000',
            question_number: 999,
            question_type: questionType,
            difficulty: '일반',
            question_text: `${questionType} 테스트 문제`,
            question_format: 'multiple_choice',
            option_1: '선택지1',
            option_2: '선택지2',
            option_3: '선택지3', 
            option_4: '선택지4',
            option_5: '선택지5',
            correct_answer: '1',
            explanation: '테스트 해설',
            is_supplementary: false,
            question_set_number: 1
          })
          .select();
        
        if (error) {
          console.log(`❌ "${questionType}" 테스트 실패:`, error.message);
        } else {
          console.log(`✅ "${questionType}" 테스트 성공`);
          successCount++;
          
          // 테스트 데이터 즉시 삭제
          await supabase
            .from('comprehensive_questions')
            .delete()
            .eq('id', data[0].id);
        }
      } catch (testError) {
        console.log(`❌ "${questionType}" 테스트 중 오류:`, testError);
      }
    }
    
    console.log(`🎯 제약조건 업데이트 완료! (${successCount}/${testTypes.length}개 유형 테스트 성공)`);
    
    return NextResponse.json({
      success: true,
      message: `제약조건 업데이트 완료 (${successCount}/${testTypes.length}개 유형 테스트 성공)`,
      successCount,
      totalTypes: testTypes.length,
      updatedConstraint: 'comprehensive_questions_question_type_check'
    });

  } catch (error) {
    console.error('❌ 제약조건 업데이트 중 오류 발생:', error);
    return NextResponse.json(
      {
        success: false,
        message: '제약조건 업데이트 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}