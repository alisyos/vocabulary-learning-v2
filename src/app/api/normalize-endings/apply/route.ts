import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * 종결 어미 정규화 수정 내용 적용 API
 *
 * POST /api/normalize-endings/apply
 *
 * 사용자가 검토하고 수정한 정규화 내용을 DB에 적용합니다.
 * - 미리보기에서 편집된 내용을 그대로 저장합니다.
 * - 각 문제 유형별로 개별 업데이트를 수행합니다.
 */

interface UpdateItem {
  id: string;
  updates: Record<string, string>;
}

interface ApplyRequest {
  vocabularyQuestions: UpdateItem[];
  paragraphQuestions: UpdateItem[];
  comprehensiveQuestions: UpdateItem[];
}

export async function POST(request: Request) {
  try {
    const body: ApplyRequest = await request.json();
    console.log('🚀 종결 어미 정규화 수정 내용 적용 시작');

    const stats = {
      vocabularyQuestions: { total: 0, updated: 0, errors: 0 },
      paragraphQuestions: { total: 0, updated: 0, errors: 0 },
      comprehensiveQuestions: { total: 0, updated: 0, errors: 0 },
    };

    // ========================================
    // 1. 어휘 문제 업데이트
    // ========================================
    console.log('📚 어휘 문제 적용 시작...');
    stats.vocabularyQuestions.total = body.vocabularyQuestions.length;

    for (const item of body.vocabularyQuestions) {
      try {
        const { error: updateError } = await supabase
          .from('vocabulary_questions')
          .update(item.updates)
          .eq('id', item.id);

        if (updateError) {
          console.error(`❌ 어휘 문제 ${item.id} 업데이트 실패:`, updateError);
          stats.vocabularyQuestions.errors++;
        } else {
          stats.vocabularyQuestions.updated++;
        }
      } catch (error) {
        console.error(`❌ 어휘 문제 ${item.id} 처리 실패:`, error);
        stats.vocabularyQuestions.errors++;
      }
    }

    console.log(`✅ 어휘 문제 완료: ${stats.vocabularyQuestions.updated}/${stats.vocabularyQuestions.total} 업데이트`);

    // ========================================
    // 2. 문단 문제 업데이트
    // ========================================
    console.log('📄 문단 문제 적용 시작...');
    stats.paragraphQuestions.total = body.paragraphQuestions.length;

    for (const item of body.paragraphQuestions) {
      try {
        const { error: updateError } = await supabase
          .from('paragraph_questions')
          .update(item.updates)
          .eq('id', item.id);

        if (updateError) {
          console.error(`❌ 문단 문제 ${item.id} 업데이트 실패:`, updateError);
          stats.paragraphQuestions.errors++;
        } else {
          stats.paragraphQuestions.updated++;
        }
      } catch (error) {
        console.error(`❌ 문단 문제 ${item.id} 처리 실패:`, error);
        stats.paragraphQuestions.errors++;
      }
    }

    console.log(`✅ 문단 문제 완료: ${stats.paragraphQuestions.updated}/${stats.paragraphQuestions.total} 업데이트`);

    // ========================================
    // 3. 종합 문제 업데이트
    // ========================================
    console.log('🧠 종합 문제 적용 시작...');
    stats.comprehensiveQuestions.total = body.comprehensiveQuestions.length;

    for (const item of body.comprehensiveQuestions) {
      try {
        const { error: updateError } = await supabase
          .from('comprehensive_questions')
          .update(item.updates)
          .eq('id', item.id);

        if (updateError) {
          console.error(`❌ 종합 문제 ${item.id} 업데이트 실패:`, updateError);
          stats.comprehensiveQuestions.errors++;
        } else {
          stats.comprehensiveQuestions.updated++;
        }
      } catch (error) {
        console.error(`❌ 종합 문제 ${item.id} 처리 실패:`, error);
        stats.comprehensiveQuestions.errors++;
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

    console.log('🎉 수정 내용 적용 완료!');
    console.log(`   - 총 업데이트: ${totalUpdated}개`);
    console.log(`   - 총 오류: ${totalErrors}개`);

    return NextResponse.json({
      success: totalErrors === 0,
      message: `수정 내용이 적용되었습니다. (${totalUpdated}개 업데이트, ${totalErrors}개 오류)`,
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
    console.error('❌ 수정 내용 적용 실패:', error);
    return NextResponse.json(
      {
        success: false,
        message: '수정 내용 적용 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}
