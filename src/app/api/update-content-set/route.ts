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
        editableVocabulary.map((vocab: any) => ({
          content_set_id: contentSetId,
          term: vocab.term || '',
          definition: vocab.definition || '',
          example_sentence: vocab.example_sentence || null
        }));
      
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

    // 5. ComprehensiveQuestions 업데이트
    if (editableComprehensive && editableComprehensive.length > 0) {
      console.log('🧠 ComprehensiveQuestions 업데이트 시작');
      const existingCompQuestions = await db.getComprehensiveQuestionsByContentSetId(contentSetId);
      
      for (let i = 0; i < editableComprehensive.length; i++) {
        const question = editableComprehensive[i];
        const updateData = {
          question_text: question.question,
          option_1: question.options?.[0],
          option_2: question.options?.[1],
          option_3: question.options?.[2],
          option_4: question.options?.[3],
          option_5: question.options?.[4],
          correct_answer: question.answer || question.correctAnswer,
          answer_initials: question.answerInitials, // 초성 힌트 필드 추가
          explanation: question.explanation,
          question_type: question.type || question.questionType || '단답형',
          question_format: (question.options ? '객관식' : '주관식') as '객관식' | '주관식'
        };
        
        if (existingCompQuestions[i]?.id) {
          await db.updateComprehensiveQuestion(existingCompQuestions[i].id!, updateData);
        }
      }
      console.log('🧠 ComprehensiveQuestions 업데이트 완료');
    }

    // 6. ParagraphQuestions 업데이트
    if (editableParagraphQuestions && editableParagraphQuestions.length > 0) {
      console.log('📄 ParagraphQuestions 업데이트 시작');
      
      // 기존 문단문제 데이터 조회
      const existingParagraphQuestions = await db.getParagraphQuestionsByContentSetId?.(contentSetId) || [];
      
      for (let i = 0; i < editableParagraphQuestions.length; i++) {
        const question = editableParagraphQuestions[i];
        const updateData = {
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
          answer_initials: question.answerInitials, // 초성 힌트 필드 추가
          explanation: question.explanation
        };
        
        if (existingParagraphQuestions[i]?.id) {
          // 기존 문단문제 업데이트
          await db.updateParagraphQuestion?.(existingParagraphQuestions[i].id!, updateData);
        } else {
          // 새 문단문제 생성
          await db.createParagraphQuestion?.({
            content_set_id: contentSetId,
            ...updateData
          });
        }
      }
      
      // 기존 문단문제가 더 많으면 삭제
      if (existingParagraphQuestions.length > editableParagraphQuestions.length) {
        for (let i = editableParagraphQuestions.length; i < existingParagraphQuestions.length; i++) {
          if (existingParagraphQuestions[i]?.id) {
            await db.deleteParagraphQuestion?.(existingParagraphQuestions[i].id!);
          }
        }
      }
      
      console.log('📄 ParagraphQuestions 업데이트 완료');
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