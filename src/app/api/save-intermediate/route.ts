import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../lib/supabase';
import { parseFootnoteToVocabularyTerm } from '../../../lib/vocabularyParser';
import type {
  ContentSet,
  Passage,
  VocabularyTerm
} from '../../../types';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 save-intermediate API 시작');

    const data = await request.json();
    console.log('📥 받은 데이터:', JSON.stringify(data, null, 2));

    const {
      input,
      editablePassage
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
      passages: editablePassage?.passages,
      passagesType: typeof editablePassage?.passages,
      passagesLength: editablePassage?.passages?.length,
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

      editablePassage.passages.forEach((passage: any, index: number) => {
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

    // Transform input data to ContentSet format (중간 저장용 - 1차검수 상태)
    const contentSetData: Omit<ContentSet, 'id' | 'created_at' | 'updated_at'> = {
      user_id: data.userId || 'anonymous',
      division: input.division,
      grade: input.grade || '3학년',
      grade_number: input.grade_number && String(input.grade_number).trim() !== '' ? String(input.grade_number).trim() : null,
      subject: input.subject,
      area: input.area,
      session_number: input.session_number && String(input.session_number).trim() !== '' ? String(input.session_number).trim() : null,
      main_topic: input.maintopic || input.mainTopic || '',
      sub_topic: input.subtopic || input.subTopic || '',
      keywords: input.keyword || input.keywords || '',
      title: passageTitle,
      total_passages: actualParagraphCount,
      total_vocabulary_terms: totalFootnoteCount,
      total_vocabulary_questions: 0, // 중간 저장 시 아직 생성 안됨
      total_paragraph_questions: 0, // 중간 저장 시 아직 생성 안됨
      total_comprehensive_questions: 0, // 중간 저장 시 아직 생성 안됨
      status: '1차검수', // 🔑 중간 저장 상태
      passage_length: input.length || null,
      text_type: input.textType || null,
      introduction_question: editablePassage?.introduction_question || null
    };

    console.log('📊 ContentSet 데이터 변환 완료:', contentSetData);

    // Transform passage data - handle both single and dual passage formats
    let passagesData: Omit<Passage, 'id' | 'content_set_id' | 'created_at'>[] = [];

    if (editablePassage?.passages && Array.isArray(editablePassage.passages) && editablePassage.passages.length > 0) {
      // 새로운 2개 지문 형식 - 각 지문을 별도 passage로 저장
      console.log('🔄 2개 지문 형식 처리:', editablePassage.passages.length, '개 지문');

      editablePassage.passages.forEach((passage: any, index: number) => {
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
    let vocabularyTermsWithPassageInfo: Array<{ footnote: string; passageIndex: number }> = [];

    if (editablePassage?.passages && Array.isArray(editablePassage.passages) && editablePassage.passages.length > 0) {
      // 새로운 2개 지문 형식
      console.log('🔄 2개 지문의 어휘 용어 처리 (지문별 구분)');
      editablePassage.passages.forEach((passage: any, passageIndex: number) => {
        if (passage.footnote && Array.isArray(passage.footnote)) {
          console.log(`📚 지문 ${passageIndex + 1} 어휘 용어:`, passage.footnote.length, '개');

          passage.footnote.forEach((footnote: string) => {
            vocabularyTermsWithPassageInfo.push({ footnote, passageIndex });
          });
        }
      });
    } else if (editablePassage?.footnote && Array.isArray(editablePassage.footnote)) {
      // 기존 단일 지문 형식
      console.log('📄 단일 지문 어휘 용어 처리');
      editablePassage.footnote.forEach((footnote: string) => {
        vocabularyTermsWithPassageInfo.push({ footnote, passageIndex: 0 });
      });
    }

    console.log('📚 총 어휘 용어 수:', vocabularyTermsWithPassageInfo.length, '개');

    // Transform vocabulary terms to database format
    const vocabularyTermsTemp: Array<Omit<VocabularyTerm, 'id' | 'content_set_id' | 'created_at' | 'passage_id'> & { passageIndex: number }> =
      vocabularyTermsWithPassageInfo?.map((item, index: number) => {
        const { footnote, passageIndex } = item;
        console.log(`어휘 용어 ${index + 1} 원본 footnote:`, footnote, '(지문', passageIndex + 1, ')');

        // 공통 파싱 라이브러리 사용
        const parsed = parseFootnoteToVocabularyTerm(footnote);

        const result = {
          term: parsed.term || '',
          definition: parsed.definition || footnote,
          example_sentence: parsed.example_sentence || null,
          has_question_generated: false, // 중간 저장 시 아직 문제 생성 안됨
          passageIndex: passageIndex
        };

        console.log(`분리된 용어 ${index + 1}:`, result);
        return result;
      }) || [];

    console.log('📚 VocabularyTerms 데이터 변환 완료 (passage_id 매핑 전):', vocabularyTermsTemp.length, '개');

    console.log('💾 Supabase 저장 시작 (중간 저장 모드)...');
    console.log('📊 저장할 데이터 요약:');
    console.log('  - ContentSet:', !!contentSetData);
    console.log('  - Passages:', passagesData.length);
    console.log('  - Vocabulary Terms:', vocabularyTermsTemp.length);

    // Save to Supabase with passage_id mapping (중간 저장: content_set, passages, vocabulary_terms만 저장)
    console.log('🔄 db.saveIntermediateContent 호출 중 (중간 저장 모드)...');
    const savedContentSet = await db.saveCompleteContentSetWithPassageMapping(
      contentSetData,
      passagesData,
      vocabularyTermsTemp,
      [], // 어휘 문제 없음
      [], // 문단 문제 없음
      [] // 종합 문제 없음
    );

    console.log('✅ Supabase 중간 저장 완료:', savedContentSet.id);

    return NextResponse.json({
      success: true,
      message: 'Intermediate content saved successfully (status: 1차검수)',
      data: {
        contentSetId: savedContentSet.id,
        contentSet: savedContentSet,
        status: '1차검수'
      }
    });

  } catch (error) {
    console.error('❌ Supabase intermediate save error:', error);

    const errorMessage = error instanceof Error ? error.message :
                        (error && typeof error === 'object' && 'message' in error) ? String(error.message) :
                        String(error);

    return NextResponse.json({
      success: false,
      message: 'Failed to save intermediate content to Supabase',
      error: errorMessage,
      details: error instanceof Error ? error.stack : JSON.stringify(error, null, 2),
      errorName: error instanceof Error ? error.name : typeof error,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
