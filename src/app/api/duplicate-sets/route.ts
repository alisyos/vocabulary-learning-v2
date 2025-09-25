import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { db, supabase } from '../../../lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { setIds } = await request.json();

    if (!setIds || !Array.isArray(setIds) || setIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid set IDs' },
        { status: 400 }
      );
    }

    let duplicatedCount = 0;
    const errors: string[] = [];

    for (const setId of setIds) {
      try {
        // 1. 원본 content_set 조회
        const { data: originalSet, error: setError } = await supabase
          .from('content_sets')
          .select('*')
          .eq('id', setId)
          .single();

        if (setError || !originalSet) {
          errors.push(`Set ${setId}: 원본 데이터를 찾을 수 없습니다`);
          continue;
        }

        // 2. 새로운 content_set 생성 (status를 '복제'로 설정)
        const newSetId = uuidv4();
        const newSet = {
          ...originalSet,
          id: newSetId,
          status: '복제',
          title: `${originalSet.title} (복제)`, // 제목에 (복제) 추가
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { error: insertSetError } = await supabase
          .from('content_sets')
          .insert(newSet);

        if (insertSetError) {
          errors.push(`Set ${setId}: 복제 실패`);
          continue;
        }

        // 3. passages 복제 및 ID 매핑 테이블 생성
        const { data: passages, error: passagesError } = await supabase
          .from('passages')
          .select('*')
          .eq('content_set_id', setId);

        console.log(`[복제] passages 조회 - setId: ${setId}, 개수: ${passages?.length || 0}`);
        if (passagesError) {
          console.error(`[복제] passages 조회 오류:`, passagesError);
        }

        // passage ID 매핑 테이블 (originalPassageId -> newPassageId)
        const passageIdMapping = new Map<string, string>();

        if (!passagesError && passages && passages.length > 0) {
          const newPassages = passages.map(p => {
            const { id, created_at, updated_at, ...passageData } = p;
            const newPassageId = uuidv4();

            // 매핑 테이블에 저장
            passageIdMapping.set(p.id, newPassageId);

            return {
              ...passageData,
              id: newPassageId,
              content_set_id: newSetId,
              created_at: new Date().toISOString(),
            };
          });

          const { data: insertedPassages, error: insertError } = await supabase
            .from('passages')
            .insert(newPassages)
            .select();

          if (insertError) {
            console.error(`[복제] passages 삽입 오류:`, insertError);
            errors.push(`Set ${setId}: 지문 복제 실패 - ${insertError.message}`);
          } else {
            console.log(`[복제] passages 삽입 성공 - 개수: ${insertedPassages?.length || 0}`);
            console.log(`[복제] passage ID 매핑:`, Array.from(passageIdMapping.entries()));
          }
        }

        // 4. vocabulary_terms 복제 (새로운 passage_id로 업데이트)
        const { data: vocabTerms, error: vocabTermsError } = await supabase
          .from('vocabulary_terms')
          .select('*')
          .eq('content_set_id', setId);

        console.log(`[복제] vocabulary_terms 조회 - setId: ${setId}, 개수: ${vocabTerms?.length || 0}`);
        if (vocabTermsError) {
          console.error(`[복제] vocabulary_terms 조회 오류:`, vocabTermsError);
        }

        if (!vocabTermsError && vocabTerms && vocabTerms.length > 0) {
          const newVocabTerms = vocabTerms.map(v => {
            // 불필요한 시스템 필드 제거
            const { id, created_at, updated_at, ...termData } = v;

            // passage_id가 있는 경우 새로운 ID로 매핑
            let newPassageId = termData.passage_id;
            if (termData.passage_id && passageIdMapping.has(termData.passage_id)) {
              newPassageId = passageIdMapping.get(termData.passage_id);
              console.log(`[복제] 어휘 용어 passage_id 매핑: ${termData.passage_id} -> ${newPassageId}`);
            }

            return {
              ...termData,
              id: uuidv4(),
              content_set_id: newSetId,
              passage_id: newPassageId,
              created_at: new Date().toISOString(),
            };
          });

          console.log(`[복제] vocabulary_terms 삽입 시도 - 개수: ${newVocabTerms.length}`);
          const { data: insertedTerms, error: insertError } = await supabase
            .from('vocabulary_terms')
            .insert(newVocabTerms)
            .select();

          if (insertError) {
            console.error(`[복제] vocabulary_terms 삽입 오류:`, insertError);
            errors.push(`Set ${setId}: 어휘 용어 복제 실패 - ${insertError.message}`);
          } else {
            console.log(`[복제] vocabulary_terms 삽입 성공 - 개수: ${insertedTerms?.length || 0}`);
          }
        }

        // 5. vocabulary_questions 복제
        const { data: vocabQuestions, error: vocabQuestionsError } = await supabase
          .from('vocabulary_questions')
          .select('*')
          .eq('content_set_id', setId);

        console.log(`[복제] vocabulary_questions 조회 - setId: ${setId}, 개수: ${vocabQuestions?.length || 0}`);
        if (vocabQuestionsError) {
          console.error(`[복제] vocabulary_questions 조회 오류:`, vocabQuestionsError);
        }

        if (!vocabQuestionsError && vocabQuestions && vocabQuestions.length > 0) {
          const newVocabQuestions = vocabQuestions.map(q => {
            // 불필요한 시스템 필드 제거
            const { id, created_at, updated_at, ...questionData } = q;
            return {
              ...questionData,
              id: uuidv4(),
              content_set_id: newSetId,
              created_at: new Date().toISOString(),
            };
          });

          console.log(`[복제] vocabulary_questions 삽입 시도 - 개수: ${newVocabQuestions.length}`);
          const { data: insertedQuestions, error: insertError } = await supabase
            .from('vocabulary_questions')
            .insert(newVocabQuestions)
            .select();

          if (insertError) {
            console.error(`[복제] vocabulary_questions 삽입 오류:`, insertError);
            errors.push(`Set ${setId}: 어휘 문제 복제 실패 - ${insertError.message}`);
          } else {
            console.log(`[복제] vocabulary_questions 삽입 성공 - 개수: ${insertedQuestions?.length || 0}`);
          }
        }

        // 6. paragraph_questions 복제
        const { data: paragraphQuestions, error: paragraphQuestionsError } = await supabase
          .from('paragraph_questions')
          .select('*')
          .eq('content_set_id', setId);

        console.log(`[복제] paragraph_questions 조회 - setId: ${setId}, 개수: ${paragraphQuestions?.length || 0}`);
        if (paragraphQuestionsError) {
          console.error(`[복제] paragraph_questions 조회 오류:`, paragraphQuestionsError);
        }

        if (!paragraphQuestionsError && paragraphQuestions && paragraphQuestions.length > 0) {
          const newParagraphQuestions = paragraphQuestions.map(q => {
            const { id, created_at, updated_at, ...questionData } = q;
            return {
              ...questionData,
              id: uuidv4(),
              content_set_id: newSetId,
              created_at: new Date().toISOString(),
            };
          });

          console.log(`[복제] paragraph_questions 삽입 시도 - 개수: ${newParagraphQuestions.length}`);
          const { data: insertedParagraph, error: insertError } = await supabase
            .from('paragraph_questions')
            .insert(newParagraphQuestions)
            .select();

          if (insertError) {
            console.error(`[복제] paragraph_questions 삽입 오류:`, insertError);
            errors.push(`Set ${setId}: 문단 문제 복제 실패 - ${insertError.message}`);
          } else {
            console.log(`[복제] paragraph_questions 삽입 성공 - 개수: ${insertedParagraph?.length || 0}`);
          }
        }

        // 7. comprehensive_questions 복제
        const { data: compQuestions, error: compQuestionsError } = await supabase
          .from('comprehensive_questions')
          .select('*')
          .eq('content_set_id', setId);

        console.log(`[복제] comprehensive_questions 조회 - setId: ${setId}, 개수: ${compQuestions?.length || 0}`);
        if (compQuestionsError) {
          console.error(`[복제] comprehensive_questions 조회 오류:`, compQuestionsError);
        }

        if (!compQuestionsError && compQuestions && compQuestions.length > 0) {
          // original_question_id 매핑 처리
          const idMapping = new Map<string, string>();
          const newCompQuestions = compQuestions.map(q => {
            const newId = uuidv4();
            if (q.id) {
              idMapping.set(q.id, newId);
            }
            const { id, created_at, updated_at, ...questionData } = q;
            return {
              ...questionData,
              id: newId,
              content_set_id: newSetId,
              created_at: new Date().toISOString(),
            };
          });

          // original_question_id 업데이트
          const processedQuestions = newCompQuestions.map(q => {
            if (q.original_question_id && idMapping.has(q.original_question_id)) {
              return {
                ...q,
                original_question_id: idMapping.get(q.original_question_id),
              };
            }
            return q;
          });

          console.log(`[복제] comprehensive_questions 삽입 시도 - 개수: ${processedQuestions.length}`);
          const { data: insertedComp, error: insertError } = await supabase
            .from('comprehensive_questions')
            .insert(processedQuestions)
            .select();

          if (insertError) {
            console.error(`[복제] comprehensive_questions 삽입 오류:`, insertError);
            errors.push(`Set ${setId}: 종합 문제 복제 실패 - ${insertError.message}`);
          } else {
            console.log(`[복제] comprehensive_questions 삽입 성공 - 개수: ${insertedComp?.length || 0}`);
          }
        }

        duplicatedCount++;
        console.log(`[복제] 세트 ${setId} 복제 완료 -> 새 ID: ${newSetId}`);
      } catch (error) {
        console.error(`Error duplicating set ${setId}:`, error);
        errors.push(`Set ${setId}: 알 수 없는 오류`);
      }
    }

    console.log(`[복제] 전체 작업 완료 - 성공: ${duplicatedCount}개, 오류: ${errors.length}개`);

    return NextResponse.json({
      success: true,
      duplicatedCount,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    console.error('Duplicate sets error:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}