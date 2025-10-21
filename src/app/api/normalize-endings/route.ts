import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { normalizeEndingSentence } from '@/lib/textUtils';

/**
 * 종결 어미 정규화 일괄 실행 API
 *
 * POST /api/normalize-endings
 *
 * 모든 문제(어휘, 문단, 종합)의 종결 어미를 "~다" 형태로 일괄 변환합니다.
 * - question_text, option_1~5, explanation 필드를 대상으로 합니다.
 * - 실제 데이터를 수정하므로 주의가 필요합니다.
 */
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const contentSetId = searchParams.get('content_set_id');

    const scope = contentSetId ? `콘텐츠 세트 ${contentSetId}` : '전체 데이터';
    console.log(`🚀 종결 어미 정규화 일괄 실행 시작 (${scope})`);

    const stats = {
      vocabularyQuestions: { total: 0, updated: 0, errors: 0 },
      paragraphQuestions: { total: 0, updated: 0, errors: 0 },
      comprehensiveQuestions: { total: 0, updated: 0, errors: 0 },
    };

    // ========================================
    // 1. 어휘 문제 업데이트
    // ========================================
    console.log('📚 어휘 문제 정규화 시작...');

    let vocabQuery = supabase.from('vocabulary_questions').select('*');
    if (contentSetId) {
      vocabQuery = vocabQuery.eq('content_set_id', contentSetId);
    }

    const { data: vocabQuestions, error: vocabFetchError } = await vocabQuery;

    if (vocabFetchError) throw vocabFetchError;

    if (vocabQuestions) {
      stats.vocabularyQuestions.total = vocabQuestions.length;

      for (const question of vocabQuestions) {
        try {
          const updates: any = {};
          let hasChanges = false;

          // 문제 텍스트
          const questionNormalized = normalizeEndingSentence(question.question_text);
          if (question.question_text !== questionNormalized) {
            updates.question_text = questionNormalized;
            hasChanges = true;
          }

          // 보기 1~5
          [1, 2, 3, 4, 5].forEach(i => {
            const optionKey = `option_${i}`;
            const optionValue = question[optionKey];
            if (optionValue) {
              const optionNormalized = normalizeEndingSentence(optionValue);
              if (optionValue !== optionNormalized) {
                updates[optionKey] = optionNormalized;
                hasChanges = true;
              }
            }
          });

          // 해설
          const explanationNormalized = normalizeEndingSentence(question.explanation);
          if (question.explanation !== explanationNormalized) {
            updates.explanation = explanationNormalized;
            hasChanges = true;
          }

          // 변경사항이 있으면 업데이트
          if (hasChanges) {
            const { error: updateError } = await supabase
              .from('vocabulary_questions')
              .update(updates)
              .eq('id', question.id);

            if (updateError) {
              console.error(`❌ 어휘 문제 ${question.id} 업데이트 실패:`, updateError);
              stats.vocabularyQuestions.errors++;
            } else {
              stats.vocabularyQuestions.updated++;
            }
          }
        } catch (error) {
          console.error(`❌ 어휘 문제 ${question.id} 처리 실패:`, error);
          stats.vocabularyQuestions.errors++;
        }
      }
    }

    console.log(`✅ 어휘 문제 완료: ${stats.vocabularyQuestions.updated}/${stats.vocabularyQuestions.total} 업데이트`);

    // ========================================
    // 2. 문단 문제 업데이트
    // ========================================
    console.log('📄 문단 문제 정규화 시작...');

    let paragraphQuery = supabase.from('paragraph_questions').select('*');
    if (contentSetId) {
      paragraphQuery = paragraphQuery.eq('content_set_id', contentSetId);
    }

    const { data: paragraphQuestions, error: paragraphFetchError } = await paragraphQuery;

    if (paragraphFetchError) throw paragraphFetchError;

    if (paragraphQuestions) {
      stats.paragraphQuestions.total = paragraphQuestions.length;

      for (const question of paragraphQuestions) {
        try {
          const updates: any = {};
          let hasChanges = false;

          // 문제 텍스트
          const questionNormalized = normalizeEndingSentence(question.question_text);
          if (question.question_text !== questionNormalized) {
            updates.question_text = questionNormalized;
            hasChanges = true;
          }

          // 보기 1~5
          [1, 2, 3, 4, 5].forEach(i => {
            const optionKey = `option_${i}`;
            const optionValue = question[optionKey];
            if (optionValue) {
              const optionNormalized = normalizeEndingSentence(optionValue);
              if (optionValue !== optionNormalized) {
                updates[optionKey] = optionNormalized;
                hasChanges = true;
              }
            }
          });

          // 해설
          const explanationNormalized = normalizeEndingSentence(question.explanation);
          if (question.explanation !== explanationNormalized) {
            updates.explanation = explanationNormalized;
            hasChanges = true;
          }

          // 변경사항이 있으면 업데이트
          if (hasChanges) {
            const { error: updateError } = await supabase
              .from('paragraph_questions')
              .update(updates)
              .eq('id', question.id);

            if (updateError) {
              console.error(`❌ 문단 문제 ${question.id} 업데이트 실패:`, updateError);
              stats.paragraphQuestions.errors++;
            } else {
              stats.paragraphQuestions.updated++;
            }
          }
        } catch (error) {
          console.error(`❌ 문단 문제 ${question.id} 처리 실패:`, error);
          stats.paragraphQuestions.errors++;
        }
      }
    }

    console.log(`✅ 문단 문제 완료: ${stats.paragraphQuestions.updated}/${stats.paragraphQuestions.total} 업데이트`);

    // ========================================
    // 3. 종합 문제 업데이트
    // ========================================
    console.log('🧠 종합 문제 정규화 시작...');

    let comprehensiveQuery = supabase.from('comprehensive_questions').select('*');
    if (contentSetId) {
      comprehensiveQuery = comprehensiveQuery.eq('content_set_id', contentSetId);
    }

    const { data: comprehensiveQuestions, error: comprehensiveFetchError } = await comprehensiveQuery;

    if (comprehensiveFetchError) throw comprehensiveFetchError;

    if (comprehensiveQuestions) {
      stats.comprehensiveQuestions.total = comprehensiveQuestions.length;

      for (const question of comprehensiveQuestions) {
        try {
          const updates: any = {};
          let hasChanges = false;

          // 문제 텍스트
          const questionNormalized = normalizeEndingSentence(question.question_text);
          if (question.question_text !== questionNormalized) {
            updates.question_text = questionNormalized;
            hasChanges = true;
          }

          // 보기 1~5
          [1, 2, 3, 4, 5].forEach(i => {
            const optionKey = `option_${i}`;
            const optionValue = question[optionKey];
            if (optionValue) {
              const optionNormalized = normalizeEndingSentence(optionValue);
              if (optionValue !== optionNormalized) {
                updates[optionKey] = optionNormalized;
                hasChanges = true;
              }
            }
          });

          // 해설
          const explanationNormalized = normalizeEndingSentence(question.explanation);
          if (question.explanation !== explanationNormalized) {
            updates.explanation = explanationNormalized;
            hasChanges = true;
          }

          // 변경사항이 있으면 업데이트
          if (hasChanges) {
            const { error: updateError } = await supabase
              .from('comprehensive_questions')
              .update(updates)
              .eq('id', question.id);

            if (updateError) {
              console.error(`❌ 종합 문제 ${question.id} 업데이트 실패:`, updateError);
              stats.comprehensiveQuestions.errors++;
            } else {
              stats.comprehensiveQuestions.updated++;
            }
          }
        } catch (error) {
          console.error(`❌ 종합 문제 ${question.id} 처리 실패:`, error);
          stats.comprehensiveQuestions.errors++;
        }
      }
    }

    console.log(`✅ 종합 문제 완료: ${stats.comprehensiveQuestions.updated}/${stats.comprehensiveQuestions.total} 업데이트`);

    // ========================================
    // 최종 결과 반환
    // ========================================
    const totalUpdated =
      stats.vocabularyQuestions.updated +
      stats.paragraphQuestions.updated +
      stats.comprehensiveQuestions.updated;

    const totalErrors =
      stats.vocabularyQuestions.errors +
      stats.paragraphQuestions.errors +
      stats.comprehensiveQuestions.errors;

    console.log('🎉 종결 어미 정규화 완료!');
    console.log(`   - 총 업데이트: ${totalUpdated}개`);
    console.log(`   - 총 오류: ${totalErrors}개`);

    return NextResponse.json({
      success: totalErrors === 0,
      message: `종결 어미 정규화가 완료되었습니다. (${totalUpdated}개 업데이트, ${totalErrors}개 오류)`,
      stats,
      summary: {
        totalUpdated,
        totalErrors,
        totalProcessed:
          stats.vocabularyQuestions.total +
          stats.paragraphQuestions.total +
          stats.comprehensiveQuestions.total
      }
    });

  } catch (error) {
    console.error('❌ 종결 어미 정규화 실패:', error);
    return NextResponse.json(
      {
        success: false,
        message: '종결 어미 정규화 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}
