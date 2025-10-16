import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * 지문 문제(paragraph_questions)의 문제 텍스트와 해설에서 "문단"을 "지문"으로 변경하는 마이그레이션 API
 *
 * 실행 방법:
 * POST /api/migrate-paragraph-to-passage
 * Body: { "dryRun": true } - 실제 업데이트 없이 미리보기만
 * Body: { "dryRun": false } - 실제 업데이트 수행
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const dryRun = body.dryRun !== false; // 기본값은 true (안전모드)

    console.log(`🚀 문단→지문 마이그레이션 시작 (${dryRun ? 'DRY RUN' : 'LIVE'})`);

    // 1. 현재 "문단"이 포함된 문제들 조회 (문제 텍스트와 해설 모두)
    console.log('🔍 "문단"이 포함된 문제와 해설 검색 중...');

    const { data: questions, error: fetchError } = await supabase
      .from('paragraph_questions')
      .select('id, question_text, explanation, question_number, content_set_id')
      .or('question_text.ilike.%문단%,explanation.ilike.%문단%');

    if (fetchError) {
      throw new Error(`문제 조회 실패: ${fetchError.message}`);
    }

    console.log(`📊 총 ${questions?.length || 0}개의 문제에서 "문단" 발견`);

    if (!questions || questions.length === 0) {
      return NextResponse.json({
        success: true,
        message: '"문단"이 포함된 문제가 없습니다.',
        updated: 0,
        dryRun
      });
    }

    // 2. 변경될 내용 미리보기 (문제와 해설 모두)
    const changes = questions.map(q => {
      const originalQuestion = q.question_text;
      const updatedQuestion = originalQuestion.replace(/문단/g, '지문');
      const originalExplanation = q.explanation;
      const updatedExplanation = originalExplanation.replace(/문단/g, '지문');

      return {
        id: q.id,
        question_number: q.question_number,
        content_set_id: q.content_set_id,
        originalQuestion,
        updatedQuestion,
        originalExplanation,
        updatedExplanation,
        questionChanged: originalQuestion !== updatedQuestion,
        explanationChanged: originalExplanation !== updatedExplanation
      };
    }).filter(c => c.questionChanged || c.explanationChanged);

    console.log(`✏️ 실제로 변경될 문제: ${changes.length}개`);

    // 변경 내용 샘플 출력 (처음 5개)
    console.log('📝 변경 샘플 (최대 5개):');
    changes.slice(0, 5).forEach((change, idx) => {
      console.log(`\n[${idx + 1}] ID: ${change.id}`);
      if (change.questionChanged) {
        console.log(`   문제 원본: ${change.originalQuestion}`);
        console.log(`   문제 변경: ${change.updatedQuestion}`);
      }
      if (change.explanationChanged) {
        console.log(`   해설 원본: ${change.originalExplanation}`);
        console.log(`   해설 변경: ${change.updatedExplanation}`);
      }
    });

    // 3. 실제 업데이트 수행 (dryRun이 false인 경우만)
    let updateResults = [];

    if (!dryRun) {
      console.log('💾 실제 업데이트 수행 중...');

      for (const change of changes) {
        const { error: updateError } = await supabase
          .from('paragraph_questions')
          .update({
            question_text: change.updatedQuestion,
            explanation: change.updatedExplanation
          })
          .eq('id', change.id);

        if (updateError) {
          console.error(`❌ 업데이트 실패 (ID: ${change.id}):`, updateError);
          updateResults.push({
            id: change.id,
            success: false,
            error: updateError.message
          });
        } else {
          console.log(`✅ 업데이트 성공 (ID: ${change.id})`);
          updateResults.push({
            id: change.id,
            success: true
          });
        }
      }

      const successCount = updateResults.filter(r => r.success).length;
      const failCount = updateResults.filter(r => !r.success).length;

      console.log(`\n✅ 성공: ${successCount}개`);
      console.log(`❌ 실패: ${failCount}개`);
    }

    return NextResponse.json({
      success: true,
      message: dryRun
        ? `미리보기 완료: ${changes.length}개 문제가 변경될 예정입니다.`
        : `업데이트 완료: ${updateResults.filter(r => r.success).length}개 문제가 변경되었습니다.`,
      dryRun,
      totalFound: questions.length,
      totalToChange: changes.length,
      changes: changes.map(c => ({
        id: c.id,
        question_number: c.question_number,
        question: {
          before: c.originalQuestion,
          after: c.updatedQuestion,
          changed: c.questionChanged
        },
        explanation: {
          before: c.originalExplanation,
          after: c.updatedExplanation,
          changed: c.explanationChanged
        }
      })),
      updateResults: dryRun ? null : updateResults,
      statistics: {
        successful: dryRun ? null : updateResults.filter(r => r.success).length,
        failed: dryRun ? null : updateResults.filter(r => !r.success).length
      }
    });

  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error);
    return NextResponse.json(
      {
        success: false,
        error: '마이그레이션 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

/**
 * GET 요청으로 현재 상태 확인
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 현재 상태 확인 중...');

    // "문단"이 포함된 문제 수 확인 (문제와 해설 모두)
    const { count: totalCount, error: countError } = await supabase
      .from('paragraph_questions')
      .select('*', { count: 'exact', head: true })
      .or('question_text.ilike.%문단%,explanation.ilike.%문단%');

    if (countError) {
      throw new Error(`문제 조회 실패: ${countError.message}`);
    }

    // 샘플 데이터 조회
    const { data: samples, error: sampleError } = await supabase
      .from('paragraph_questions')
      .select('id, question_text, explanation, question_number')
      .or('question_text.ilike.%문단%,explanation.ilike.%문단%')
      .limit(10);

    if (sampleError) {
      throw new Error(`샘플 조회 실패: ${sampleError.message}`);
    }

    return NextResponse.json({
      success: true,
      message: '"문단"이 포함된 문제와 해설 현황',
      totalProblemsWithKeyword: totalCount || 0,
      samples: samples?.map(s => ({
        id: s.id,
        question_number: s.question_number,
        question: s.question_text,
        explanation: s.explanation,
        hasKeywordInQuestion: s.question_text.includes('문단'),
        hasKeywordInExplanation: s.explanation.includes('문단')
      })) || [],
      instructions: {
        dryRun: 'POST /api/migrate-paragraph-to-passage { "dryRun": true }',
        execute: 'POST /api/migrate-paragraph-to-passage { "dryRun": false }'
      }
    });

  } catch (error) {
    console.error('❌ 상태 확인 실패:', error);
    return NextResponse.json(
      {
        success: false,
        error: '상태 확인 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}
