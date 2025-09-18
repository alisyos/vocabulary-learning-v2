import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 문단 문제 테이블 스키마 마이그레이션 시작...');

    // 1. 먼저 현재 테이블 구조 확인
    console.log('🔍 현재 테이블 구조 확인 중...');
    const { data: currentStructure, error: structureError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'paragraph_questions')
      .order('ordinal_position');

    if (structureError) {
      console.error('테이블 구조 확인 실패:', structureError);
    } else {
      console.log('📋 현재 paragraph_questions 테이블 구조:');
      console.table(currentStructure);
    }

    // 2. 기존 데이터 확인
    console.log('📊 기존 데이터 확인 중...');
    const { data: existingData, error: dataError } = await supabase
      .from('paragraph_questions')
      .select('id, question_type, correct_answer')
      .limit(5);

    if (dataError) {
      console.error('기존 데이터 확인 실패:', dataError);
    } else {
      console.log('📊 기존 데이터 샘플:');
      console.table(existingData);
    }

    // 3. 테스트용 데이터 삽입 시도 (새로운 컬럼 필드가 있는지 확인)
    console.log('🧪 새로운 스키마로 테스트 데이터 삽입 시도...');
    
    // 임시 테스트 데이터 생성
    const testData = {
      content_set_id: '00000000-0000-0000-0000-000000000000', // 임시 UUID
      question_number: 999,
      question_type: '주관식 단답형',
      paragraph_number: 1,
      paragraph_text: '테스트 문단입니다.',
      question_text: '테스트 질문입니다.',
      correct_answer: '장래희망이라는 긴 답안을 테스트합니다',
      answer_initials: 'ㅈㄹㅎㅁ',
      explanation: '테스트 해설입니다.'
    };

    const { data: insertTest, error: insertError } = await supabase
      .from('paragraph_questions')
      .insert([testData])
      .select();

    let schemaStatus = {
      answer_initials_column: false,
      correct_answer_text_type: false,
      test_insert_success: false
    };

    if (insertError) {
      console.error('테스트 데이터 삽입 실패:', insertError);
      
      // 에러 메시지로 스키마 상태 판단
      if (insertError.message.includes('answer_initials')) {
        console.log('❌ answer_initials 컬럼이 없습니다.');
      } else {
        console.log('⚠️ 다른 이유로 삽입 실패');
      }
    } else {
      console.log('✅ 테스트 데이터 삽입 성공');
      schemaStatus.test_insert_success = true;
      schemaStatus.answer_initials_column = true;
      schemaStatus.correct_answer_text_type = true;

      // 테스트 데이터 삭제
      await supabase
        .from('paragraph_questions')
        .delete()
        .eq('question_number', 999);
      console.log('🗑️ 테스트 데이터 삭제 완료');
    }

    // 4. 스키마 마이그레이션 안내
    const migrationInstructions = {
      sql_script_location: '/migrate-paragraph-schema.sql',
      required_changes: [
        {
          action: 'ALTER COLUMN',
          sql: 'ALTER TABLE paragraph_questions ALTER COLUMN correct_answer TYPE TEXT;',
          reason: '주관식 단답형 문제의 긴 답안 지원을 위해 VARCHAR → TEXT로 변경'
        },
        {
          action: 'ADD COLUMN',
          sql: 'ALTER TABLE paragraph_questions ADD COLUMN IF NOT EXISTS answer_initials TEXT;',
          reason: '주관식 단답형 문제의 초성 힌트 저장을 위한 새 컬럼 추가'
        }
      ],
      instructions: [
        '1. Supabase 대시보드의 SQL Editor에 접속',
        '2. 프로젝트 루트의 migrate-paragraph-schema.sql 파일 내용을 복사',
        '3. SQL Editor에서 실행',
        '4. 다시 이 API를 호출하여 마이그레이션 확인'
      ]
    };

    return NextResponse.json({
      success: !insertError, // 테스트 삽입 성공 여부로 판단
      message: insertError 
        ? '스키마 마이그레이션이 필요합니다.' 
        : '스키마가 이미 업데이트되어 있습니다.',
      schemaStatus,
      currentStructure,
      existingDataSample: existingData,
      migrationInstructions: insertError ? migrationInstructions : null,
      details: {
        required_changes: [
          'correct_answer 컬럼: VARCHAR → TEXT (긴 답안 지원)',
          'answer_initials 컬럼 추가: TEXT (초성 힌트 저장)'
        ],
        test_result: insertError ? 'MIGRATION_NEEDED' : 'SCHEMA_READY'
      }
    });

  } catch (error) {
    console.error('문단 문제 스키마 마이그레이션 확인 실패:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '스키마 마이그레이션 확인 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}