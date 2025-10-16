import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { normalizeEndingSentence } from '@/lib/textUtils';

/**
 * 종결 어미 정규화 미리보기 API
 *
 * GET /api/normalize-endings/preview?limit=10
 *
 * 실제 데이터를 변경하지 않고, 변경될 내용을 미리 확인합니다.
 * 각 테이블(vocabulary_questions, paragraph_questions, comprehensive_questions)에서
 * 샘플 데이터를 가져와 변경 전후를 비교합니다.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    console.log(`📋 종결 어미 정규화 미리보기 시작 (샘플 ${limit}개)`);

    const preview = {
      vocabularyQuestions: [] as any[],
      paragraphQuestions: [] as any[],
      comprehensiveQuestions: [] as any[],
      stats: {
        vocabularyTotal: 0,
        vocabularyChanged: 0,
        paragraphTotal: 0,
        paragraphChanged: 0,
        comprehensiveTotal: 0,
        comprehensiveChanged: 0,
      }
    };

    // 1. 어휘 문제 미리보기
    console.log('📚 어휘 문제 샘플 조회 중...');
    const { data: vocabQuestions, error: vocabError } = await supabase
      .from('vocabulary_questions')
      .select('id, question_number, question_text, option_1, option_2, option_3, option_4, option_5, explanation')
      .limit(limit);

    if (vocabError) throw vocabError;

    if (vocabQuestions) {
      preview.vocabularyQuestions = vocabQuestions.map(q => {
        const changes: any = {
          id: q.id,
          questionNumber: q.question_number,
          original: {},
          normalized: {},
          hasChanges: false
        };

        // 문제 텍스트
        const questionNormalized = normalizeEndingSentence(q.question_text);
        if (q.question_text !== questionNormalized) {
          changes.original.question_text = q.question_text;
          changes.normalized.question_text = questionNormalized;
          changes.hasChanges = true;
        }

        // 보기 1~5
        [1, 2, 3, 4, 5].forEach(i => {
          const optionKey = `option_${i}` as keyof typeof q;
          const optionValue = q[optionKey];
          if (optionValue) {
            const optionNormalized = normalizeEndingSentence(optionValue);
            if (optionValue !== optionNormalized) {
              changes.original[optionKey] = optionValue;
              changes.normalized[optionKey] = optionNormalized;
              changes.hasChanges = true;
            }
          }
        });

        // 해설
        const explanationNormalized = normalizeEndingSentence(q.explanation);
        if (q.explanation !== explanationNormalized) {
          changes.original.explanation = q.explanation;
          changes.normalized.explanation = explanationNormalized;
          changes.hasChanges = true;
        }

        if (changes.hasChanges) {
          preview.stats.vocabularyChanged++;
        }
        preview.stats.vocabularyTotal++;

        return changes;
      }).filter(c => c.hasChanges); // 변경사항 있는 것만 표시
    }

    // 2. 문단 문제 미리보기
    console.log('📄 문단 문제 샘플 조회 중...');
    const { data: paragraphQuestions, error: paragraphError } = await supabase
      .from('paragraph_questions')
      .select('id, question_number, question_text, option_1, option_2, option_3, option_4, option_5, explanation')
      .limit(limit);

    if (paragraphError) throw paragraphError;

    if (paragraphQuestions) {
      preview.paragraphQuestions = paragraphQuestions.map(q => {
        const changes: any = {
          id: q.id,
          questionNumber: q.question_number,
          original: {},
          normalized: {},
          hasChanges: false
        };

        // 문제 텍스트
        const questionNormalized = normalizeEndingSentence(q.question_text);
        if (q.question_text !== questionNormalized) {
          changes.original.question_text = q.question_text;
          changes.normalized.question_text = questionNormalized;
          changes.hasChanges = true;
        }

        // 보기 1~5
        [1, 2, 3, 4, 5].forEach(i => {
          const optionKey = `option_${i}` as keyof typeof q;
          const optionValue = q[optionKey];
          if (optionValue) {
            const optionNormalized = normalizeEndingSentence(optionValue);
            if (optionValue !== optionNormalized) {
              changes.original[optionKey] = optionValue;
              changes.normalized[optionKey] = optionNormalized;
              changes.hasChanges = true;
            }
          }
        });

        // 해설
        const explanationNormalized = normalizeEndingSentence(q.explanation);
        if (q.explanation !== explanationNormalized) {
          changes.original.explanation = q.explanation;
          changes.normalized.explanation = explanationNormalized;
          changes.hasChanges = true;
        }

        if (changes.hasChanges) {
          preview.stats.paragraphChanged++;
        }
        preview.stats.paragraphTotal++;

        return changes;
      }).filter(c => c.hasChanges); // 변경사항 있는 것만 표시
    }

    // 3. 종합 문제 미리보기
    console.log('🧠 종합 문제 샘플 조회 중...');
    const { data: comprehensiveQuestions, error: comprehensiveError } = await supabase
      .from('comprehensive_questions')
      .select('id, question_number, question_text, option_1, option_2, option_3, option_4, option_5, explanation')
      .limit(limit);

    if (comprehensiveError) throw comprehensiveError;

    if (comprehensiveQuestions) {
      preview.comprehensiveQuestions = comprehensiveQuestions.map(q => {
        const changes: any = {
          id: q.id,
          questionNumber: q.question_number,
          original: {},
          normalized: {},
          hasChanges: false
        };

        // 문제 텍스트
        const questionNormalized = normalizeEndingSentence(q.question_text);
        if (q.question_text !== questionNormalized) {
          changes.original.question_text = q.question_text;
          changes.normalized.question_text = questionNormalized;
          changes.hasChanges = true;
        }

        // 보기 1~5
        [1, 2, 3, 4, 5].forEach(i => {
          const optionKey = `option_${i}` as keyof typeof q;
          const optionValue = q[optionKey];
          if (optionValue) {
            const optionNormalized = normalizeEndingSentence(optionValue);
            if (optionValue !== optionNormalized) {
              changes.original[optionKey] = optionValue;
              changes.normalized[optionKey] = optionNormalized;
              changes.hasChanges = true;
            }
          }
        });

        // 해설
        const explanationNormalized = normalizeEndingSentence(q.explanation);
        if (q.explanation !== explanationNormalized) {
          changes.original.explanation = q.explanation;
          changes.normalized.explanation = explanationNormalized;
          changes.hasChanges = true;
        }

        if (changes.hasChanges) {
          preview.stats.comprehensiveChanged++;
        }
        preview.stats.comprehensiveTotal++;

        return changes;
      }).filter(c => c.hasChanges); // 변경사항 있는 것만 표시
    }

    console.log('✅ 미리보기 완료:', preview.stats);

    return NextResponse.json({
      success: true,
      message: '미리보기가 생성되었습니다.',
      preview,
      stats: preview.stats
    });

  } catch (error) {
    console.error('❌ 미리보기 생성 실패:', error);
    return NextResponse.json(
      {
        success: false,
        message: '미리보기 생성 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}
