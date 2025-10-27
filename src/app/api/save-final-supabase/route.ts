import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../lib/supabase';
import { parseFootnoteToVocabularyTerm } from '../../../lib/vocabularyParser';
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
      paragraphQuestions,
      comprehensiveQuestions,
      status
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
      footnote: editablePassage?.footnote?.length,
      // 새로운 2개 지문 형식 확인
      passages: editablePassage?.passages,
      passagesType: typeof editablePassage?.passages,
      passagesLength: editablePassage?.passages?.length,
      // 도입 질문 확인
      introduction_question: editablePassage?.introduction_question,
      introduction_question_type: typeof editablePassage?.introduction_question
    });

    // 2개 지문 형식인지 확인하고 데이터 처리
    let actualParagraphCount = 0;
    let totalFootnoteCount = 0;
    let passageTitle = '';
    
    if (editablePassage?.passages && Array.isArray(editablePassage.passages) && editablePassage.passages.length > 0) {
      // 새로운 2개 지문 형식
      console.log('🔄 새로운 2개 지문 형식 감지됨');
      
      editablePassage.passages.forEach((passage, index) => {
        console.log(`📖 지문 ${index + 1}:`, {
          title: passage.title,
          paragraphCount: passage.paragraphs?.length || 0,
          footnoteCount: passage.footnote?.length || 0
        });
        
        if (passage.paragraphs && Array.isArray(passage.paragraphs)) {
          actualParagraphCount += passage.paragraphs.filter((p: string) => {
            return p && typeof p === 'string' && p.trim() !== '';
          }).length;
        }
        
        if (passage.footnote && Array.isArray(passage.footnote)) {
          totalFootnoteCount += passage.footnote.length;
        }
      });
      
      // 첫 번째 지문의 제목을 사용하거나 공통 제목
      passageTitle = editablePassage.passages[0]?.title || editablePassage.title || '';
      
    } else if (editablePassage?.paragraphs && Array.isArray(editablePassage.paragraphs)) {
      // 기존 단일 지문 형식 
      console.log('📄 기존 단일 지문 형식 감지됨');
      
      actualParagraphCount = editablePassage.paragraphs.filter((p: string) => {
        return p && typeof p === 'string' && p.trim() !== '';
      }).length;
      
      totalFootnoteCount = editablePassage.footnote?.length || 0;
      passageTitle = editablePassage.title || '';
    }
    
    console.log('📊 계산된 데이터:', {
      actualParagraphCount,
      totalFootnoteCount,
      passageTitle
    });

    // Transform input data to ContentSet format
    const contentSetData: Omit<ContentSet, 'id' | 'created_at' | 'updated_at'> = {
      user_id: data.userId || 'anonymous', // 실제 로그인 사용자 정보 사용
      division: input.division, // 구분
      grade: input.grade || '3학년', // 실제 학년 (input.grade가 없으면 기본값)
      subject: input.subject,
      area: input.area,
      session_number: input.session_number && String(input.session_number).trim() !== '' ? String(input.session_number).trim() : null, // 차시 번호
      main_topic: input.maintopic || input.mainTopic || '',
      sub_topic: input.subtopic || input.subTopic || '',
      keywords: input.keyword || input.keywords || '',
      title: passageTitle,
      total_passages: actualParagraphCount, // 안전하게 계산된 문단 수
      total_vocabulary_terms: totalFootnoteCount,
      total_vocabulary_questions: vocabularyQuestions?.length || 0,
      total_paragraph_questions: paragraphQuestions?.length || 0,
      total_comprehensive_questions: comprehensiveQuestions?.length || 0,
      status: status || '검수 전',
      // 지문 길이와 유형 정보 (스키마에 컬럼 추가 완료)
      passage_length: input.length || null,
      text_type: input.textType || null,
      // 도입 질문 (2개 지문 형식에서 사용)
      introduction_question: editablePassage?.introduction_question || null
    };

    console.log('📊 ContentSet 데이터 변환 완료:', contentSetData);

    // Transform passage data - handle both single and dual passage formats
    let passagesData: Omit<Passage, 'id' | 'content_set_id' | 'created_at'>[] = [];
    
    if (editablePassage?.passages && Array.isArray(editablePassage.passages) && editablePassage.passages.length > 0) {
      // 새로운 2개 지문 형식 - 각 지문을 별도 passage로 저장
      console.log('🔄 2개 지문 형식 처리:', editablePassage.passages.length, '개 지문');
      
      editablePassage.passages.forEach((passage, index) => {
        const passageData = {
          passage_number: index + 1,
          title: passage.title || editablePassage.title || '',
          paragraph_1: passage.paragraphs?.[0] || undefined,
          paragraph_2: passage.paragraphs?.[1] || undefined,
          paragraph_3: passage.paragraphs?.[2] || undefined,
          paragraph_4: passage.paragraphs?.[3] || undefined,
          paragraph_5: passage.paragraphs?.[4] || undefined,
          paragraph_6: passage.paragraphs?.[5] || undefined,
          paragraph_7: passage.paragraphs?.[6] || undefined,
          paragraph_8: passage.paragraphs?.[7] || undefined,
          paragraph_9: passage.paragraphs?.[8] || undefined,
          paragraph_10: passage.paragraphs?.[9] || undefined,
        };
        
        console.log(`📖 지문 ${index + 1} 변환:`, {
          title: passageData.title,
          paragraphCount: Object.values(passageData).filter(p => p && p !== passageData.passage_number && p !== passageData.title).length
        });
        
        passagesData.push(passageData);
      });
    } else if (editablePassage?.paragraphs && Array.isArray(editablePassage.paragraphs)) {
      // 기존 단일 지문 형식
      console.log('📄 단일 지문 형식 처리');
      passagesData = [{
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
    }

    console.log('📝 Passage 데이터 변환 완료:', passagesData.length, '개');

    // Transform vocabulary terms - handle both single and dual passage formats
    // 각 어휘가 어느 지문에서 나왔는지 추적하기 위한 구조
    let vocabularyTermsWithPassageInfo: Array<{ footnote: string; passageIndex: number }> = [];
    
    if (editablePassage?.passages && Array.isArray(editablePassage.passages) && editablePassage.passages.length > 0) {
      // 새로운 2개 지문 형식 - 각 지문의 footnote와 지문 인덱스 연결
      console.log('🔄 2개 지문의 어휘 용어 처리 (지문별 구분)');
      editablePassage.passages.forEach((passage, passageIndex) => {
        if (passage.footnote && Array.isArray(passage.footnote)) {
          console.log(`📚 지문 ${passageIndex + 1} 어휘 용어:`, passage.footnote.length, '개');
          console.log(`📝 지문 ${passageIndex + 1} 어휘 목록:`, passage.footnote.map(f => {
            const parsed = parseFootnoteToVocabularyTerm(f);
            return parsed.term;
          }).join(', '));

          passage.footnote.forEach((footnote, footnoteIndex) => {
            vocabularyTermsWithPassageInfo.push({ footnote, passageIndex });
            console.log(`  ✓ 어휘 ${footnoteIndex + 1}: passageIndex=${passageIndex}`);
          });
        }
      });
    } else if (editablePassage?.footnote && Array.isArray(editablePassage.footnote)) {
      // 기존 단일 지문 형식
      console.log('📄 단일 지문 어휘 용어 처리');
      editablePassage.footnote.forEach((footnote, footnoteIndex) => {
        vocabularyTermsWithPassageInfo.push({ footnote, passageIndex: 0 });
        console.log(`  ✓ 어휘 ${footnoteIndex + 1}: passageIndex=0`);
      });
    }

    console.log('📚 총 어휘 용어 수:', vocabularyTermsWithPassageInfo.length, '개');
    console.log('📊 passageIndex별 어휘 분포:', vocabularyTermsWithPassageInfo.reduce((acc, item) => {
      acc[item.passageIndex] = (acc[item.passageIndex] || 0) + 1;
      return acc;
    }, {} as Record<number, number>));
    
    // 어휘 문제에서 사용된 용어들 추출 (문제 생성 여부 판단용)
    const vocabularyQuestionTerms = new Set(
      vocabularyQuestions?.map((q: any) => q.term?.trim().toLowerCase()).filter(Boolean) || []
    );
    console.log('📝 어휘 문제가 생성된 용어들:', Array.from(vocabularyQuestionTerms));
    
    // 먼저 지문들을 저장하고 passage_id를 받아야 함
    // (아래에서 수정)
    const vocabularyTermsTemp: Array<Omit<VocabularyTerm, 'id' | 'content_set_id' | 'created_at' | 'passage_id'> & { passageIndex: number }> = 
      vocabularyTermsWithPassageInfo?.map((item, index: number) => {
        const { footnote, passageIndex } = item;
        console.log(`어휘 용어 ${index + 1} 원본 footnote:`, footnote, '(지문', passageIndex + 1, ')');

        // 공통 파싱 라이브러리 사용
        const parsed = parseFootnoteToVocabularyTerm(footnote);

        // 이 용어에 대한 문제가 생성되었는지 확인
        const hasQuestion = vocabularyQuestionTerms.has(parsed.term.toLowerCase());
        console.log(`용어 "${parsed.term}" 문제 생성 여부:`, hasQuestion);

        const result = {
          term: parsed.term || '',
          definition: parsed.definition || footnote,
          example_sentence: parsed.example_sentence || null,
          has_question_generated: hasQuestion,
          passageIndex: passageIndex // 임시로 지문 인덱스 저장
        };
        
        console.log(`분리된 용어 ${index + 1}:`, result);
        return result;
      }) || [];

    console.log('📚 VocabularyTerms 데이터 변환 완료 (passage_id 매핑 전):', vocabularyTermsTemp.length, '개');

    // 6가지 어휘 문제 유형을 DB의 2가지 유형으로 매핑하는 함수
    const mapVocabularyQuestionType = (detailedType: string): '객관식' | '주관식' => {
      const objectiveTypes = [
        '5지선다 객관식',
        '2개중 선택형', 
        '3개중 선택형',
        '낱말 골라 쓰기'
      ];
      
      const subjectiveTypes = [
        '단답형 초성 문제',
        '응용형 문장완성'
      ];
      
      if (objectiveTypes.includes(detailedType)) {
        return '객관식';
      } else if (subjectiveTypes.includes(detailedType)) {
        return '주관식';
      } else {
        // fallback: 옵션 배열 유무로 판단
        return '객관식';
      }
    };

    // Transform vocabulary questions
    const transformedVocabularyQuestions: Omit<VocabularyQuestion, 'id' | 'content_set_id' | 'created_at'>[] =
      vocabularyQuestions?.map((q: {
        term?: string;
        question?: string;
        question_text?: string;
        options?: string[];
        option_1?: string;
        option_2?: string;
        option_3?: string;
        option_4?: string;
        option_5?: string;
        correctAnswer?: string;
        correct_answer?: string;
        answer?: string;
        explanation?: string;
        questionType?: string;
        question_type?: string;
        difficulty?: string;
        answerInitials?: string;
        answer_initials?: string;
      }, index: number) => {
        console.log(`어휘문제 ${index + 1} 원본:`, q);

        // 🔑 필드명 정규화 (snake_case와 camelCase 모두 지원)
        const questionText = q.question_text || q.question || '';
        const questionType = q.question_type || q.questionType || '';
        const answerInitials = q.answer_initials || q.answerInitials;

        // 옵션 정규화: 개별 필드와 배열을 병합
        // 🔧 개별 필드가 있으면 우선 사용, 없으면 options 배열의 해당 인덱스 값 사용
        // (4단계에서 일부만 수정해도 나머지는 유지되도록)
        const optionsArray = q.options || [];
        const options = [
          q.option_1 !== undefined ? q.option_1 : (optionsArray[0] || undefined),
          q.option_2 !== undefined ? q.option_2 : (optionsArray[1] || undefined),
          q.option_3 !== undefined ? q.option_3 : (optionsArray[2] || undefined),
          q.option_4 !== undefined ? q.option_4 : (optionsArray[3] || undefined),
          q.option_5 !== undefined ? q.option_5 : (optionsArray[4] || undefined)
        ];

        // 정답 정규화
        const correctAnswer = q.correct_answer || q.correctAnswer || q.answer || '';

        // questionType 매핑 (6가지 → 2가지)
        let mappedQuestionType: '객관식' | '주관식';

        if (questionType) {
          mappedQuestionType = mapVocabularyQuestionType(questionType);
          console.log(`어휘문제 ${index + 1} 타입 매핑: "${questionType}" → "${mappedQuestionType}"`);
        } else {
          // fallback: 옵션 배열 유무로 판단
          mappedQuestionType = (options && options.length > 0) ? '객관식' : '주관식';
          console.log(`어휘문제 ${index + 1} 타입 fallback: 옵션수 ${options?.length || 0} → "${mappedQuestionType}"`);
        }

        // difficulty 결정 (UI에서 설정된 값 사용, 없으면 기본값)
        const difficulty = q.difficulty || '일반';

        // 주관식 문제인 경우 초성 힌트 처리
        const isSubjective = mappedQuestionType === '주관식';
        const finalAnswerInitials = isSubjective ? answerInitials : null;

        console.log(`어휘문제 ${index + 1} 초성 힌트 처리: 주관식=${isSubjective}, answerInitials="${finalAnswerInitials}"`);

        // ✅ 완전한 DB 스키마 활용 (detailed_question_type, answer_initials 컬럼 추가 완료)
        const result = {
          question_number: index + 1,
          question_type: mappedQuestionType,
          difficulty: difficulty as '일반' | '보완',
          term: q.term || '', // 어휘 용어 저장
          question_text: questionText,
          option_1: options[0],
          option_2: options[1],
          option_3: options[2],
          option_4: options[3],
          option_5: options[4],
          correct_answer: correctAnswer,
          explanation: q.explanation || '',
          // ✅ 6가지 상세 유형 및 초성 힌트 저장
          detailed_question_type: questionType, // 6가지 상세 유형 저장
          answer_initials: finalAnswerInitials // 주관식만 초성 힌트 저장
        };
        
        // 디버깅 정보 추가
        console.log(`어휘문제 ${index + 1} 최종 저장 데이터 (DB 컬럼만):`, {
          question_type: result.question_type,
          difficulty: result.difficulty,
          term: result.term,
          has_options: !!(result.option_1),
          answer_length: (result.correct_answer || '').length
        });
        
        // 6가지 상세 유형 정보는 로그로만 출력 (향후 DB 컬럼 추가 시 활용)
        console.log(`어휘문제 ${index + 1} 메타 정보 (로그용):`, {
          original_question_type: questionType,
          answer_initials: finalAnswerInitials,
          is_subjective: isSubjective
        });
        console.log(`어휘문제 ${index + 1} 변환 결과:`, result);
        return result;
      }) || [];

    console.log('❓ VocabularyQuestions 데이터 변환 완료:', transformedVocabularyQuestions.length, '개');

    // Transform paragraph questions with safe handling - allow empty for comprehensive-only workflow
    let transformedParagraphQuestions: Omit<ParagraphQuestionDB, 'id' | 'content_set_id' | 'created_at'>[] = [];
    
    if (paragraphQuestions && Array.isArray(paragraphQuestions) && paragraphQuestions.length > 0) {
      console.log('📄 원본 문단문제 데이터:', JSON.stringify(paragraphQuestions, null, 2));
      
      transformedParagraphQuestions = paragraphQuestions.map((q: any, index: number) => {
        console.log(`문단문제 ${index + 1} 변환 시작:`, q);
        
        // 데이터 검증 및 기본값 설정
        const safeQ = {
          type: q.type || q.question_type || '빈칸 채우기',
          paragraphNumber: q.paragraphNumber || q.paragraph_number || 1,
          paragraphText: q.paragraphText || q.paragraph_text || '',
          question: q.question || q.question_text || '',
          options: Array.isArray(q.options) ? q.options : ['선택지 1', '선택지 2', '선택지 3', '선택지 4'],
          wordSegments: Array.isArray(q.wordSegments) ? q.wordSegments : null, // 어절 순서 맞추기용
          answer: q.answer || q.correct_answer || q.correctAnswer || '1',
          answerInitials: q.answerInitials || q.answer_initials || null, // 초성 힌트 필드 추가
          explanation: q.explanation || ''
        };
        
        // 디버깅을 위한 상세 로그 출력
        console.log(`📋 문단문제 ${index + 1} 원본 데이터:`, {
          type: q.type,
          answer: q.answer,
          correct_answer: q.correct_answer,
          correctAnswer: q.correctAnswer,
          wordSegments: q.wordSegments
        });
        console.log(`📋 문단문제 ${index + 1} 변환된 safeQ:`, {
          type: safeQ.type,
          answer: safeQ.answer,
          wordSegments: safeQ.wordSegments
        });
        
        // 문제 유형 검증 - 5가지 유형으로 업데이트 (객관식 일반형 추가)
        const validTypes = ['빈칸 채우기', '주관식 단답형', '어절 순서 맞추기', 'OX문제', '객관식 일반형'];
        if (!validTypes.includes(safeQ.type)) {
          console.warn(`⚠️ 유효하지 않은 문제 유형: ${safeQ.type}, 기본값으로 변경`);
          safeQ.type = '빈칸 채우기';
        }
        
        const result = {
          question_number: index + 1,
          question_type: safeQ.type,
          paragraph_number: Math.max(1, Math.min(10, safeQ.paragraphNumber)),
          paragraph_text: String(safeQ.paragraphText).substring(0, 5000), // 길이 제한
          question_text: String(safeQ.question),
          option_1: (safeQ.type === '주관식 단답형' || safeQ.type === '어절 순서 맞추기') ? null : String(safeQ.options[0] || '선택지 1'),
          option_2: (safeQ.type === '주관식 단답형' || safeQ.type === '어절 순서 맞추기') ? null : String(safeQ.options[1] || '선택지 2'),
          option_3: (safeQ.type === '주관식 단답형' || safeQ.type === '어절 순서 맞추기') ? null : String(safeQ.options[2] || '선택지 3'),
          option_4: (safeQ.type === '주관식 단답형' || safeQ.type === '어절 순서 맞추기') ? null : String(safeQ.options[3] || '선택지 4'),
          option_5: (safeQ.type === '주관식 단답형' || safeQ.type === '어절 순서 맞추기' || !safeQ.options[4]) ? null : String(safeQ.options[4]),
          word_segments: safeQ.type === '어절 순서 맞추기' ? safeQ.wordSegments : null, // 어절 순서 맞추기용 배열
          correct_answer: (safeQ.type === '주관식 단답형' || safeQ.type === '어절 순서 맞추기') ? String(safeQ.answer) : String(safeQ.answer).charAt(0), // 주관식은 전체 답안, 객관식은 번호만
          answer_initials: safeQ.type === '주관식 단답형' ? safeQ.answerInitials : null, // 주관식 단답형인 경우만 초성 힌트
          explanation: String(safeQ.explanation)
        };
        
        console.log(`문단문제 ${index + 1} 변환 완료:`, result);
        return result;
      });
    } else {
      console.log('📄 문단문제 데이터가 없습니다 (종합문제 전용 워크플로우):', paragraphQuestions);
    }

    console.log('📄 ParagraphQuestions 데이터 변환 완료:', transformedParagraphQuestions.length, '개');

        // Transform comprehensive questions - 문제 유형별로 기본문제와 보완문제 매칭
    console.log('📋 종합문제 변환 시작:', comprehensiveQuestions?.length || 0, '개');
    console.log('📥 받은 종합문제 데이터:', JSON.stringify(comprehensiveQuestions, null, 2));
    
    // 문제 유형별로 기본문제의 세트 ID 저장
    const typeToSetIdMap: { [questionType: string]: string } = {};
    
    // 먼저 모든 기본문제를 찾아서 세트 ID 생성
    comprehensiveQuestions?.forEach((q: { type?: string; questionType?: string; isSupplementary?: boolean; id?: string }, index: number) => {
      // 새로운 유형 우선 사용, fallback으로 구 유형 매핑
      let questionType = q.type || q.questionType || '정보 확인';
      
      // 새로운 4가지 유형을 그대로 사용 (변환하지 않음)
      console.log(`새로운 유형 그대로 사용: ${questionType}`);
      
      const isSupplementary = q.isSupplementary || false;
      
      if (!isSupplementary && !typeToSetIdMap[questionType]) {
        // 이 타입의 첫 번째 기본문제
        const timestamp = Date.now();
        const typeCodeMap: { [key: string]: string } = {
          // 새로운 4가지 유형
          '정보 확인': 'info',
          '주제 파악': 'theme',
          '자료해석': 'data',
          '추론': 'inference',
          // 구 유형 호환성 (혹시 모를 경우)
          '단답형': 'short',
          '핵심 내용 요약': 'summary',
          '핵심문장 찾기': 'keyword',
          'OX문제': 'ox',
          '자료분석하기': 'dataold'
        };
        const typeCode = typeCodeMap[questionType] || 'comp';
        typeToSetIdMap[questionType] = `comp_${typeCode}_${timestamp}_${questionType}`;
        console.log(`${questionType} 타입 세트 ID 생성:`, typeToSetIdMap[questionType]);
      }
    });
    
    console.log('📊 문제 유형별 세트 ID 맵핑:', typeToSetIdMap);
    
    const transformedComprehensiveQuestions: Omit<ComprehensiveQuestionDB, 'id' | 'content_set_id' | 'created_at'>[] = 
      comprehensiveQuestions?.map((q: { 
        type?: string; 
        questionType?: string; 
        isSupplementary?: boolean; 
        id?: string; 
        question: string; 
        options?: string[]; 
        correctAnswer: string; 
        answer: string; 
        answerInitials?: string;
        explanation: string;
        questionSetNumber?: number;
      }, index: number) => {
        // 새로운 유형 우선 사용, fallback으로 구 유형 매핑
        let questionType = q.type || q.questionType || '정보 확인';
        
        // 새로운 4가지 유형을 그대로 저장 (변환하지 않음)
        console.log(`새로운 유형 그대로 저장: ${questionType}`);
        
        const isSupplementary = q.isSupplementary || false;
        
        // 문제 유형에 따른 세트 ID 사용
        const originalQuestionId = typeToSetIdMap[questionType] || `comp_unknown_${Date.now()}_${index}`;
        
        console.log(`문제 ${index + 1} (${questionType}, ${isSupplementary ? '보완' : '기본'}) - original_question_id:`, originalQuestionId);
        console.log(`문제 ${index + 1} 답안 필드 확인:`, {
          answer: q.answer,
          correctAnswer: q.correctAnswer,
          correct_answer: q.correct_answer
        });

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
          correct_answer: q.answer || q.correctAnswer || q.correct_answer || '1',
          answer_initials: questionType === '단답형' ? (q.answerInitials || null) : null,
          explanation: q.explanation,
          is_supplementary: q.isSupplementary || false,
          original_question_id: originalQuestionId,
          question_set_number: q.questionSetNumber || 1
        };
      }) || [];

    console.log('🧠 ComprehensiveQuestions 데이터 변환 완료:', transformedComprehensiveQuestions.length, '개');

    console.log('💾 Supabase 저장 시작...');
    console.log('📊 저장할 데이터 요약:');
    console.log('  - ContentSet:', !!contentSetData);
    console.log('  - Passages:', passagesData.length);
    console.log('  - Vocabulary Terms:', vocabularyTermsTemp.length);  
    console.log('  - Vocabulary Questions:', transformedVocabularyQuestions.length);
    console.log('  - Paragraph Questions:', transformedParagraphQuestions.length);
    console.log('  - Comprehensive Questions:', transformedComprehensiveQuestions.length);

    // Save to Supabase with passage_id mapping
    console.log('🔄 db.saveCompleteContentSet 호출 중 (passage_id 매핑 포함)...');
    const savedContentSet = await db.saveCompleteContentSetWithPassageMapping(
      contentSetData,
      passagesData,
      vocabularyTermsTemp, // passageIndex 포함된 임시 데이터
      transformedVocabularyQuestions,
      transformedParagraphQuestions,
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
    console.error('❌ Error type:', typeof error);
    console.error('❌ Error string:', String(error));
    console.error('❌ Error JSON:', JSON.stringify(error, null, 2));
    
    if (error instanceof Error) {
      console.error('❌ Error is instance of Error');
      console.error('❌ Error name:', error.name);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
    } else {
      console.error('❌ Error is not instance of Error');
      console.error('❌ Error properties:', Object.keys(error || {}));
      if (error && typeof error === 'object') {
        for (const [key, value] of Object.entries(error)) {
          console.error(`❌ Error.${key}:`, value);
        }
      }
    }
    
    const errorMessage = error instanceof Error ? error.message : 
                        (error && typeof error === 'object' && 'message' in error) ? String(error.message) :
                        String(error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to save to Supabase',
      error: errorMessage,
      details: error instanceof Error ? error.stack : JSON.stringify(error, null, 2),
      errorName: error instanceof Error ? error.name : typeof error,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}