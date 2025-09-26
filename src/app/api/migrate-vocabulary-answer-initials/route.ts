import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST() {
  try {
    console.log('vocabulary_questions 테이블에 answer_initials와 detailed_question_type 컬럼 추가 중...');

    // answer_initials 컬럼이 이미 존재하는지 확인
    const { data: answerInitialsColumns, error: answerInitialsCheckError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'vocabulary_questions')
      .eq('column_name', 'answer_initials');

    if (answerInitialsCheckError) {
      console.log('answer_initials 컬럼 확인 중 오류 (무시하고 계속):', answerInitialsCheckError.message);
    }

    // detailed_question_type 컬럼이 이미 존재하는지 확인
    const { data: detailedTypeColumns, error: detailedTypeCheckError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'vocabulary_questions')
      .eq('column_name', 'detailed_question_type');

    if (detailedTypeCheckError) {
      console.log('detailed_question_type 컬럼 확인 중 오류 (무시하고 계속):', detailedTypeCheckError.message);
    }

    const results: string[] = [];

    // answer_initials 컬럼 추가
    if (!answerInitialsColumns || answerInitialsColumns.length === 0) {
      try {
        const { error: alterError1 } = await supabase.rpc('exec_sql', {
          sql: 'ALTER TABLE vocabulary_questions ADD COLUMN IF NOT EXISTS answer_initials VARCHAR(100);'
        });

        if (alterError1) {
          console.error('answer_initials 컬럼 추가 실패:', alterError1);
          results.push(`❌ answer_initials 컬럼 추가 실패: ${alterError1.message}`);
        } else {
          results.push('✅ answer_initials 컬럼 추가 성공');
        }
      } catch (error) {
        results.push(`❌ answer_initials 컬럼 추가 중 예외: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      results.push('ℹ️ answer_initials 컬럼이 이미 존재합니다');
    }

    // detailed_question_type 컬럼 추가
    if (!detailedTypeColumns || detailedTypeColumns.length === 0) {
      try {
        const { error: alterError2 } = await supabase.rpc('exec_sql', {
          sql: 'ALTER TABLE vocabulary_questions ADD COLUMN IF NOT EXISTS detailed_question_type VARCHAR(100);'
        });

        if (alterError2) {
          console.error('detailed_question_type 컬럼 추가 실패:', alterError2);
          results.push(`❌ detailed_question_type 컬럼 추가 실패: ${alterError2.message}`);
        } else {
          results.push('✅ detailed_question_type 컬럼 추가 성공');
        }
      } catch (error) {
        results.push(`❌ detailed_question_type 컬럼 추가 중 예외: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      results.push('ℹ️ detailed_question_type 컬럼이 이미 존재합니다');
    }

    // 현재 테이블 구조 확인
    const { data: allColumns, error: allColumnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'vocabulary_questions')
      .order('ordinal_position');

    const hasErrors = results.some(r => r.startsWith('❌'));

    return NextResponse.json({
      success: !hasErrors,
      message: results.join('\n'),
      results: results,
      currentColumns: allColumns || [],
      manual_sql_if_needed: [
        'ALTER TABLE vocabulary_questions ADD COLUMN IF NOT EXISTS answer_initials VARCHAR(100);',
        'ALTER TABLE vocabulary_questions ADD COLUMN IF NOT EXISTS detailed_question_type VARCHAR(100);'
      ]
    });

  } catch (error) {
    console.error('마이그레이션 중 오류:', error);

    return NextResponse.json({
      success: false,
      message: '마이그레이션 중 오류가 발생했습니다.',
      manual_sql: [
        'ALTER TABLE vocabulary_questions ADD COLUMN IF NOT EXISTS answer_initials VARCHAR(100);',
        'ALTER TABLE vocabulary_questions ADD COLUMN IF NOT EXISTS detailed_question_type VARCHAR(100);'
      ],
      instruction: 'Supabase 콘솔의 SQL Editor에서 위 SQL들을 실행해주세요.',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}