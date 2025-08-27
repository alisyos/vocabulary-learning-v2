import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import type { 
  VocabularyTerm, 
  VocabularyQuestion, 
  ComprehensiveQuestionDB 
} from '@/types';

export async function PUT(request: NextRequest) {
  try {
    console.log('🚀 update-content-set API 시작');
    
    const data = await request.json();
    console.log('📥 받은 데이터:', JSON.stringify(data, null, 2));
    
    const {
      contentSetId,
      editableIntroductionQuestion,
      editablePassage,
      editableVocabulary,
      editableVocabQuestions,
      editableParagraphQuestions,
      editableComprehensive
    } = data;

    // Validate required data
    if (!contentSetId || !editablePassage) {
      console.log('❌ 필수 데이터 누락:', { contentSetId: !!contentSetId, editablePassage: !!editablePassage });
      return NextResponse.json({
        success: false,
        message: 'contentSetId와 editablePassage는 필수입니다.'
      }, { status: 400 });
    }

    console.log('📋 입력 데이터 검증 완료');

    // 안전한 문단 수 계산
    let actualParagraphCount = 0;
    if (editablePassage?.paragraphs && Array.isArray(editablePassage.paragraphs)) {
      actualParagraphCount = editablePassage.paragraphs.filter((p: string) => {
        return p && typeof p === 'string' && p.trim() !== '';
      }).length;
    }
    
    console.log('📊 계산된 문단 수:', actualParagraphCount);

    // 1. ContentSet 업데이트
    const contentSetUpdateData = {
      title: editablePassage.title,
      introduction_question: editableIntroductionQuestion || null,
      total_passages: actualParagraphCount,
      total_vocabulary_terms: editableVocabulary?.length || 0,
      total_vocabulary_questions: editableVocabQuestions?.length || 0,
      total_paragraph_questions: editableParagraphQuestions?.length || 0,
      total_comprehensive_questions: editableComprehensive?.length || 0,
      updated_at: new Date().toISOString()
    };

    console.log('📊 ContentSet 업데이트 데이터:', contentSetUpdateData);
    await db.updateContentSet(contentSetId, contentSetUpdateData);

    // 2. Passage 업데이트
    const passageData = {
      title: editablePassage.title,
      paragraph_1: editablePassage.paragraphs[0] || null,
      paragraph_2: editablePassage.paragraphs[1] || null,
      paragraph_3: editablePassage.paragraphs[2] || null,
      paragraph_4: editablePassage.paragraphs[3] || null,
      paragraph_5: editablePassage.paragraphs[4] || null,
      paragraph_6: editablePassage.paragraphs[5] || null,
      paragraph_7: editablePassage.paragraphs[6] || null,
      paragraph_8: editablePassage.paragraphs[7] || null,
      paragraph_9: editablePassage.paragraphs[8] || null,
      paragraph_10: editablePassage.paragraphs[9] || null,
    };

    // 기존 passage 찾아서 업데이트
    const existingPassages = await db.getPassagesByContentSetId(contentSetId);
    if (existingPassages.length > 0 && existingPassages[0].id) {
      console.log('📝 기존 Passage 업데이트');
      await db.updatePassage(existingPassages[0].id, passageData);
    }

    // 3. VocabularyTerms 재생성 (기존 삭제 후 새로 생성)
    if (editableVocabulary && editableVocabulary.length > 0) {
      console.log('📚 VocabularyTerms 재생성 시작');
      await db.deleteVocabularyTermsByContentSetId(contentSetId);
      
      const vocabularyTerms: Omit<VocabularyTerm, 'id' | 'created_at'>[] = 
        editableVocabulary.map((vocab: any, index: number) => {
          // vocab가 문자열인 경우 파싱
          if (typeof vocab === 'string') {
            const colonIndex = vocab.indexOf(':');
            if (colonIndex !== -1) {
              const term = vocab.substring(0, colonIndex).trim();
              const restText = vocab.substring(colonIndex + 1).trim();
              
              // 예시 문장 추출 (예시: ... 패턴)
              const exampleMatch = restText.match(/(.+?)\s*\(예시:\s*(.+?)\)$/);
              if (exampleMatch) {
                const definition = exampleMatch[1].trim();
                const example = exampleMatch[2].trim();
                return {
                  content_set_id: contentSetId,
                  term: term,
                  definition: definition,
                  example_sentence: example
                };
              } else {
                return {
                  content_set_id: contentSetId,
                  term: term,
                  definition: restText,
                  example_sentence: null
                };
              }
            } else {
              return {
                content_set_id: contentSetId,
                term: `용어${index + 1}`,
                definition: vocab,
                example_sentence: null
              };
            }
          } else {
            // vocab가 객체인 경우
            return {
              content_set_id: contentSetId,
              term: vocab.term || '',
              definition: vocab.definition || '',
              example_sentence: vocab.example_sentence || null
            };
          }
        });
      
      await db.createVocabularyTerms(vocabularyTerms);
      console.log('📚 VocabularyTerms 재생성 완료:', vocabularyTerms.length, '개');
    }

    // 4. VocabularyQuestions 업데이트
    if (editableVocabQuestions && editableVocabQuestions.length > 0) {
      console.log('❓ VocabularyQuestions 업데이트 시작');
      const existingVocabQuestions = await db.getVocabularyQuestionsByContentSetId(contentSetId);
      
      for (let i = 0; i < editableVocabQuestions.length; i++) {
        const question = editableVocabQuestions[i];
        const updateData = {
          question_text: question.question,
          option_1: question.options?.[0],
          option_2: question.options?.[1],
          option_3: question.options?.[2],
          option_4: question.options?.[3],
          option_5: question.options?.[4],
          correct_answer: question.answer || question.correctAnswer,
          explanation: question.explanation,
          term: question.term || ''
        };
        
        if (existingVocabQuestions[i]?.id) {
          await db.updateVocabularyQuestion(existingVocabQuestions[i].id!, updateData);
        }
      }
      console.log('❓ VocabularyQuestions 업데이트 완료');
    }

    // 5. ComprehensiveQuestions 업데이트 (유니크 제약조건 회피를 위한 단계별 처리)
    console.log('🧠 ComprehensiveQuestions 업데이트 시작');
    
    // 기존 종합문제 조회
    const existingCompQuestions = await db.getComprehensiveQuestionsByContentSetId(contentSetId);
    console.log('🧠 기존 종합문제 수:', existingCompQuestions.length);
    console.log('🧠 수정된 종합문제 수:', editableComprehensive?.length || 0);
    
    // 현재 남아있는 문제의 ID 목록 생성
    const remainingQuestionIds = new Set<string>();
    const questionsToUpdate: any[] = [];
    const questionsToCreate: any[] = [];
    
    // 기존 문제들의 최대 question_number 찾기 (새 문제 추가 시 사용)
    const maxExistingQuestionNumber = existingCompQuestions.reduce((max, q) => {
      return Math.max(max, q.question_number || 0);
    }, 0);
    
    // 기존 문제의 ID와 question_number 매핑 생성
    const existingQuestionNumberMap = new Map<string, number>();
    existingCompQuestions.forEach(q => {
      if (q.id) {
        existingQuestionNumberMap.set(q.id, q.question_number || 0);
      }
    });
    
    if (editableComprehensive && editableComprehensive.length > 0) {
      let nextNewQuestionNumber = maxExistingQuestionNumber + 1;
      
      for (let i = 0; i < editableComprehensive.length; i++) {
        const question = editableComprehensive[i];
        
        console.log(`🧠 문제 ${i + 1} 처리:`, { 
          id: question.id, 
          questionId: question.questionId,
          hasId: !!question.id,
          questionType: question.type || question.questionType
        });
        
        if (question.id) {
          // 기존 문제 업데이트 - 기존 question_number 유지
          remainingQuestionIds.add(question.id);
          const existingNumber = existingQuestionNumberMap.get(question.id) || (i + 1);
          
          questionsToUpdate.push({
            id: question.id,
            data: {
              question_text: question.question,
              question_type: question.type || question.questionType || '정보 확인',
              question_format: (question.options && question.options.length > 0 ? '객관식' : '주관식') as '객관식' | '주관식',
              difficulty: (question.isSupplementary ? '보완' : '일반') as '일반' | '보완',
              option_1: question.options?.[0] || null,
              option_2: question.options?.[1] || null,
              option_3: question.options?.[2] || null,
              option_4: question.options?.[3] || null,
              option_5: question.options?.[4] || null,
              correct_answer: question.answer || question.correctAnswer || '',
              answer_initials: question.answerInitials || null,
              explanation: question.explanation || '',
              is_supplementary: question.isSupplementary || false,
              original_question_id: question.originalQuestionId || null,
              question_set_number: question.questionSetNumber || Math.floor(i / 3) + 1
            },
            newQuestionNumber: existingNumber  // 기존 번호 유지
          });
        } else {
          // 새 문제 추가 - 새로운 question_number 할당
          questionsToCreate.push({
            content_set_id: contentSetId,
            question_number: nextNewQuestionNumber++,  // 새로운 번호 할당
            question_text: question.question,
            question_type: question.type || question.questionType || '정보 확인',
            question_format: (question.options && question.options.length > 0 ? '객관식' : '주관식') as '객관식' | '주관식',
            difficulty: (question.isSupplementary ? '보완' : '일반') as '일반' | '보완',
            option_1: question.options?.[0] || null,
            option_2: question.options?.[1] || null,
            option_3: question.options?.[2] || null,
            option_4: question.options?.[3] || null,
            option_5: question.options?.[4] || null,
            correct_answer: question.answer || question.correctAnswer || '',
            answer_initials: question.answerInitials || null,
            explanation: question.explanation || '',
            is_supplementary: question.isSupplementary || false,
            original_question_id: question.originalQuestionId || null,
            question_set_number: question.questionSetNumber || Math.floor(i / 3) + 1
          });
        }
      }
    }
    
    // 1단계: 삭제된 문제들 제거 (유니크 제약조건 해제)
    for (const existingQuestion of existingCompQuestions) {
      if (!remainingQuestionIds.has(existingQuestion.id!)) {
        try {
          await db.deleteComprehensiveQuestion(existingQuestion.id!);
          console.log(`🧠 종합문제 삭제 성공: ${existingQuestion.id}`);
        } catch (error) {
          console.error(`🧠 종합문제 삭제 실패: ${existingQuestion.id}`, error);
          throw error;
        }
      }
    }
    
    // 2단계: 기존 문제들 업데이트 (question_number 포함)
    for (const updateItem of questionsToUpdate) {
      try {
        const updateDataWithNumber = {
          ...updateItem.data,
          question_number: updateItem.newQuestionNumber
        };
        console.log(`🧠 업데이트 데이터 (번호 ${updateItem.newQuestionNumber}):`, updateDataWithNumber);
        await db.updateComprehensiveQuestion(updateItem.id, updateDataWithNumber);
        console.log(`🧠 종합문제 업데이트 성공: ${updateItem.id}`);
      } catch (error) {
        console.error(`🧠 종합문제 업데이트 실패: ${updateItem.id}`, error);
        throw error;
      }
    }
    
    // 3단계: 새 문제들 생성
    if (questionsToCreate.length > 0) {
      try {
        console.log(`🧠 새 종합문제 ${questionsToCreate.length}개 생성 시작`);
        await db.createComprehensiveQuestions(questionsToCreate);
        console.log(`🧠 새 종합문제 ${questionsToCreate.length}개 생성 완료`);
      } catch (error) {
        console.error(`🧠 새 종합문제 생성 실패:`, error);
        throw error;
      }
    }
    
    console.log('🧠 ComprehensiveQuestions 업데이트 완료');

    // 6. ParagraphQuestions 재생성 (기존 삭제 후 새로 생성)
    if (editableParagraphQuestions && editableParagraphQuestions.length > 0) {
      console.log('📄 ParagraphQuestions 재생성 시작');
      
      // 기존 문단문제 모두 삭제
      try {
        await db.deleteParagraphQuestionsByContentSetId?.(contentSetId);
        console.log('📄 기존 문단문제 삭제 완료');
      } catch (error) {
        console.log('📄 문단문제 삭제 중 오류 (무시):', error);
      }
      
      // 새 문단문제 생성
      for (let i = 0; i < editableParagraphQuestions.length; i++) {
        const question = editableParagraphQuestions[i];
        const createData = {
          content_set_id: contentSetId,
          question_number: question.questionNumber || (i + 1),
          question_type: question.questionType,
          paragraph_number: question.paragraphNumber,
          paragraph_text: question.paragraphText,
          question_text: question.question,
          option_1: question.options?.[0] || '',
          option_2: question.options?.[1] || '',
          option_3: question.options?.[2] || '',
          option_4: question.options?.[3] || '',
          option_5: question.options?.[4] || '',
          correct_answer: question.correctAnswer,
          answer_initials: question.answerInitials,
          explanation: question.explanation,
          word_segments: question.wordSegments || null
        };
        
        try {
          await db.createParagraphQuestion?.(createData);
        } catch (error) {
          console.error(`📄 문단문제 ${i + 1} 생성 실패:`, error);
        }
      }
      
      console.log('📄 ParagraphQuestions 재생성 완료:', editableParagraphQuestions.length, '개');
    }

    console.log('✅ 모든 데이터 업데이트 완료');

    return NextResponse.json({
      success: true,
      message: '콘텐츠가 성공적으로 수정되었습니다.',
      contentSetId: contentSetId
    });

  } catch (error) {
    console.error('❌ 콘텐츠 업데이트 오류:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json({
      success: false,
      message: '콘텐츠 수정 중 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
} 