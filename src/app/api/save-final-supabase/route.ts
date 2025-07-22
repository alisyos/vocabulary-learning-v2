import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../lib/supabase';
import type { 
  ContentSet, 
  Passage, 
  VocabularyTerm, 
  VocabularyQuestion, 
  ComprehensiveQuestionDB 
} from '../../../types';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 save-final-supabase API 시작');
    
    const data = await request.json();
    console.log('📥 받은 데이터:', JSON.stringify(data, null, 2));
    
    const {
      input,
      editablePassage,
      vocabularyQuestions,
      comprehensiveQuestions
    } = data;

    // Validate required data
    if (!input || !editablePassage) {
      console.log('❌ 필수 데이터 누락:', { input: !!input, editablePassage: !!editablePassage });
      return NextResponse.json({
        success: false,
        message: 'Required data missing'
      }, { status: 400 });
    }

    console.log('📋 입력 데이터 검증 완료');
    console.log('📝 editablePassage 구조:', {
      title: editablePassage?.title,
      paragraphs: editablePassage?.paragraphs,
      paragraphsType: typeof editablePassage?.paragraphs,
      paragraphsLength: editablePassage?.paragraphs?.length,
      footnote: editablePassage?.footnote?.length
    });

    // 안전한 문단 수 계산
    let actualParagraphCount = 0;
    if (editablePassage?.paragraphs && Array.isArray(editablePassage.paragraphs)) {
      actualParagraphCount = editablePassage.paragraphs.filter((p: any) => {
        return p && typeof p === 'string' && p.trim() !== '';
      }).length;
    }
    
    console.log('📊 계산된 문단 수:', actualParagraphCount);

    // Transform input data to ContentSet format
    const contentSetData: Omit<ContentSet, 'id' | 'created_at' | 'updated_at'> = {
      user_id: data.userId || 'anonymous', // 실제 로그인 사용자 정보 사용
      division: input.division, // 구분
      grade: input.grade || '3학년', // 실제 학년 (input.grade가 없으면 기본값)
      subject: input.subject,
      area: input.area,
      main_topic: input.maintopic || input.mainTopic || '',
      sub_topic: input.subtopic || input.subTopic || '',
      keywords: input.keyword || input.keywords || '',
      title: editablePassage.title,
      total_passages: actualParagraphCount, // 안전하게 계산된 문단 수
      total_vocabulary_terms: editablePassage.footnote?.length || 0,
      total_vocabulary_questions: vocabularyQuestions?.length || 0,
      total_comprehensive_questions: comprehensiveQuestions?.length || 0,
      status: '검수 전',
      // 지문 길이와 유형 정보 (스키마에 컬럼 추가 완료)
      passage_length: input.length || null,
      text_type: input.textType || null
    };

    console.log('📊 ContentSet 데이터 변환 완료:', contentSetData);

    // Transform passage data
    const passagesData: Omit<Passage, 'id' | 'content_set_id' | 'created_at'>[] = [{
      passage_number: 1,
      title: editablePassage.title,
      paragraph_1: editablePassage.paragraphs[0] || undefined,
      paragraph_2: editablePassage.paragraphs[1] || undefined,
      paragraph_3: editablePassage.paragraphs[2] || undefined,
      paragraph_4: editablePassage.paragraphs[3] || undefined,
      paragraph_5: editablePassage.paragraphs[4] || undefined,
      paragraph_6: editablePassage.paragraphs[5] || undefined,
      paragraph_7: editablePassage.paragraphs[6] || undefined,
      paragraph_8: editablePassage.paragraphs[7] || undefined,
      paragraph_9: editablePassage.paragraphs[8] || undefined,
      paragraph_10: editablePassage.paragraphs[9] || undefined,
    }];

    console.log('📝 Passage 데이터 변환 완료:', passagesData.length, '개');

    // Transform vocabulary terms (extract from footnotes with example sentences)
    const vocabularyTerms: Omit<VocabularyTerm, 'id' | 'content_set_id' | 'created_at'>[] = 
      editablePassage.footnote?.map((footnote: string) => {
        console.log('어휘 용어 원본 footnote:', footnote);
        
        // 첫 번째 콜론만 기준으로 분리
        const colonIndex = footnote.indexOf(':');
        if (colonIndex === -1) {
          // 콜론이 없는 경우
          return {
            term: footnote.trim(),
            definition: '',
            example_sentence: null
          };
        }
        
        const term = footnote.substring(0, colonIndex).trim();
        const definitionPart = footnote.substring(colonIndex + 1).trim();
        
        // 정의 부분에서 예시 문장 분리
        let definition = definitionPart;
        let exampleSentence = null;
        
        // 패턴 1: "정의 (예시: 예시문장)"
        const exampleMatch = definitionPart.match(/^(.+?)\s*\(예시:\s*(.+?)\)\s*$/);
        if (exampleMatch) {
          definition = exampleMatch[1].trim();
          exampleSentence = exampleMatch[2].trim();
        } else {
          // 패턴 2: "정의 (예시:" (불완전한 경우)
          const incompleteMatch = definitionPart.match(/^(.+?)\s*\(예시:\s*(.*)$/);
          if (incompleteMatch) {
            definition = incompleteMatch[1].trim();
            const examplePart = incompleteMatch[2].trim();
            if (examplePart && examplePart !== '') {
              exampleSentence = examplePart;
            }
          }
        }
        
        const result = {
          term: term || '',
          definition: definition || footnote,
          example_sentence: exampleSentence
        };
        
        console.log('분리된 용어:', result);
        return result;
      }) || [];

    console.log('📚 VocabularyTerms 데이터 변환 완료:', vocabularyTerms.length, '개');

    // Transform vocabulary questions
    const transformedVocabularyQuestions: Omit<VocabularyQuestion, 'id' | 'content_set_id' | 'created_at'>[] = 
      vocabularyQuestions?.map((q: any, index: number) => {
        console.log(`어휘문제 ${index + 1} 원본:`, q);
        const result = {
          question_number: index + 1,
          question_type: '객관식' as const,
          difficulty: '일반' as const,
          term: q.term || '', // 어휘 용어 저장
          question_text: q.question,
          option_1: q.options?.[0],
          option_2: q.options?.[1],
          option_3: q.options?.[2],
          option_4: q.options?.[3],
          option_5: q.options?.[4],
          correct_answer: q.answer || q.correctAnswer,
          explanation: q.explanation
        };
        console.log(`어휘문제 ${index + 1} 변환 결과:`, result);
        return result;
      }) || [];

    console.log('❓ VocabularyQuestions 데이터 변환 완료:', transformedVocabularyQuestions.length, '개');

        // Transform comprehensive questions - 문제 유형별로 기본문제와 보완문제 매칭
    console.log('📋 종합문제 변환 시작:', comprehensiveQuestions?.length || 0, '개');
    console.log('📥 받은 종합문제 데이터:', JSON.stringify(comprehensiveQuestions, null, 2));
    
    // 문제 유형별로 기본문제의 세트 ID 저장
    const typeToSetIdMap: { [questionType: string]: string } = {};
    
    // 먼저 모든 기본문제를 찾아서 세트 ID 생성
    comprehensiveQuestions?.forEach((q: any, index: number) => {
      const questionType = q.type || q.questionType || '단답형';
      const isSupplementary = q.isSupplementary || false;
      
      if (!isSupplementary && !typeToSetIdMap[questionType]) {
        // 이 타입의 첫 번째 기본문제
        const timestamp = Date.now();
        const typeCodeMap: { [key: string]: string } = {
          '단답형': 'short',
          '문단별 순서 맞추기': 'order',
          '핵심 내용 요약': 'summary',
          '핵심어/핵심문장 찾기': 'keyword'
        };
        const typeCode = typeCodeMap[questionType] || 'comp';
        typeToSetIdMap[questionType] = `comp_${typeCode}_${timestamp}_${questionType}`;
        console.log(`${questionType} 타입 세트 ID 생성:`, typeToSetIdMap[questionType]);
      }
    });
    
    console.log('📊 문제 유형별 세트 ID 맵핑:', typeToSetIdMap);
    
    const transformedComprehensiveQuestions: any[] = 
      comprehensiveQuestions?.map((q: any, index: number) => {
        const questionType = q.type || q.questionType || '단답형';
        const isSupplementary = q.isSupplementary || false;
        
        // 문제 유형에 따른 세트 ID 사용
        const originalQuestionId = typeToSetIdMap[questionType] || `comp_unknown_${Date.now()}_${index}`;
        
        console.log(`문제 ${index + 1} (${questionType}, ${isSupplementary ? '보완' : '기본'}) - original_question_id:`, originalQuestionId);
        
        return {
          question_number: index + 1,
          question_type: questionType,
          question_format: (q.options ? '객관식' : '주관식'),
          difficulty: (q.isSupplementary ? '보완' : '일반') as '일반' | '보완',
          question_text: q.question,
          option_1: q.options?.[0],
          option_2: q.options?.[1],
          option_3: q.options?.[2],
          option_4: q.options?.[3],
          option_5: q.options?.[4],
          correct_answer: q.answer,
          explanation: q.explanation,
          is_supplementary: q.isSupplementary || false,
          original_question_id: originalQuestionId,
          question_set_number: q.questionSetNumber || 1
        };
      }) || [];

    console.log('🧠 ComprehensiveQuestions 데이터 변환 완료:', transformedComprehensiveQuestions.length, '개');

    console.log('💾 Supabase 저장 시작...');

    // Save to Supabase
    const savedContentSet = await db.saveCompleteContentSet(
      contentSetData,
      passagesData,
      vocabularyTerms,
      transformedVocabularyQuestions,
      transformedComprehensiveQuestions
    );

    console.log('✅ Supabase 저장 완료:', savedContentSet.id);

    return NextResponse.json({
      success: true,
      message: 'Content saved successfully to Supabase',
      data: {
        contentSetId: savedContentSet.id,
        contentSet: savedContentSet
      }
    });

  } catch (error) {
    console.error('❌ Supabase save error:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json({
      success: false,
      message: 'Failed to save to Supabase',
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}