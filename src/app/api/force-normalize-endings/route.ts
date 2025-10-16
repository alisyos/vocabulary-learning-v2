import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { normalizeEndingSentence } from '@/lib/textUtils';

/**
 * 종결 어미 강제 재정규화 API
 *
 * POST /api/force-normalize-endings
 *
 * 변경 여부와 상관없이 모든 데이터를 재정규화합니다.
 * - 이미 정규화된 데이터도 다시 처리합니다.
 * - 최신 normalizeEndingSentence 함수를 적용합니다.
 */
export async function POST(request: Request) {
  try {
    console.log('🚀 종결 어미 강제 재정규화 시작');

    const stats = {
      vocabularyQuestions: { total: 0, updated: 0, errors: 0 },
      paragraphQuestions: { total: 0, updated: 0, errors: 0 },
      comprehensiveQuestions: { total: 0, updated: 0, errors: 0 },
    };

    // ========================================
    // 1. 어휘 문제 강제 업데이트
    // ========================================
    console.log('📚 어휘 문제 강제 정규화 시작...');

    const { data: vocabQuestions, error: vocabFetchError } = await supabase
      .from('vocabulary_questions')
      .select('*');

    if (vocabFetchError) throw vocabFetchError;

    if (vocabQuestions) {
      stats.vocabularyQuestions.total = vocabQuestions.length;

      for (const question of vocabQuestions) {
        try {
          const updates: any = {
            question_text: normalizeEndingSentence(question.question_text),
            explanation: normalizeEndingSentence(question.explanation),
          };

          // 보기 1~5 강제 정규화
          [1, 2, 3, 4, 5].forEach(i => {
            const optionKey = `option_${i}`;
            const optionValue = question[optionKey];
            if (optionValue) {
              updates[optionKey] = normalizeEndingSentence(optionValue);
            }
          });

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
        } catch (error) {
          console.error(`❌ 어휘 문제 ${question.id} 처리 실패:`, error);
          stats.vocabularyQuestions.errors++;
        }
      }
    }

    console.log(`✅ 어휘 문제 완료: ${stats.vocabularyQuestions.updated}/${stats.vocabularyQuestions.total} 업데이트`);

    // ========================================
    // 2. 문단 문제 강제 업데이트
    // ========================================
    console.log('📄 문단 문제 강제 정규화 시작...');

    const { data: paragraphQuestions, error: paragraphFetchError } = await supabase
      .from('paragraph_questions')
      .select('*');

    if (paragraphFetchError) throw paragraphFetchError;

    if (paragraphQuestions) {
      stats.paragraphQuestions.total = paragraphQuestions.length;

      for (const question of paragraphQuestions) {
        try {
          const updates: any = {
            question_text: normalizeEndingSentence(question.question_text),
            explanation: normalizeEndingSentence(question.explanation),
          };

          // 보기 1~5 강제 정규화
          [1, 2, 3, 4, 5].forEach(i => {
            const optionKey = `option_${i}`;
            const optionValue = question[optionKey];
            if (optionValue) {
              updates[optionKey] = normalizeEndingSentence(optionValue);
            }
          });

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
        } catch (error) {
          console.error(`❌ 문단 문제 ${question.id} 처리 실패:`, error);
          stats.paragraphQuestions.errors++;
        }
      }
    }

    console.log(`✅ 문단 문제 완료: ${stats.paragraphQuestions.updated}/${stats.paragraphQuestions.total} 업데이트`);

    // ========================================
    // 3. 종합 문제 강제 업데이트
    // ========================================
    console.log('🧠 종합 문제 강제 정규화 시작...');

    const { data: comprehensiveQuestions, error: comprehensiveFetchError } = await supabase
      .from('comprehensive_questions')
      .select('*');

    if (comprehensiveFetchError) throw comprehensiveFetchError;

    if (comprehensiveQuestions) {
      stats.comprehensiveQuestions.total = comprehensiveQuestions.length;

      for (const question of comprehensiveQuestions) {
        try {
          const updates: any = {
            question_text: normalizeEndingSentence(question.question_text),
            explanation: normalizeEndingSentence(question.explanation),
          };

          // 보기 1~5 강제 정규화
          [1, 2, 3, 4, 5].forEach(i => {
            const optionKey = `option_${i}`;
            const optionValue = question[optionKey];
            if (optionValue) {
              updates[optionKey] = normalizeEndingSentence(optionValue);
            }
          });

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

    console.log('🎉 강제 재정규화 완료!');
    console.log(`   - 총 업데이트: ${totalUpdated}개`);
    console.log(`   - 총 오류: ${totalErrors}개`);

    return NextResponse.json({
      success: totalErrors === 0,
      message: `강제 재정규화가 완료되었습니다. (${totalUpdated}개 업데이트, ${totalErrors}개 오류)`,
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
    console.error('❌ 강제 재정규화 실패:', error);
    return NextResponse.json(
      {
        success: false,
        message: '강제 재정규화 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}
