import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../lib/supabase';
import { parseFootnoteToVocabularyTerm } from '../../../lib/vocabularyParser';
import type {
  ContentSet,
  Passage,
  VocabularyTerm,
  User
} from '../../../types';

// Helper function to infer division from grade
function inferDivisionFromGrade(grade: string): string {
  const gradeNum = grade.replace(/[^0-9]/g, '');
  const numGrade = parseInt(gradeNum, 10);

  if (numGrade >= 3 && numGrade <= 4) {
    return '초등학교 중학년(3-4학년)';
  } else if (numGrade >= 5 && numGrade <= 6) {
    return '초등학교 고학년(5-6학년)';
  } else if (numGrade >= 1 && numGrade <= 3 && (grade.includes('중') || grade.includes('7') || grade.includes('8') || grade.includes('9'))) {
    return '중학생(1-3학년)';
  }

  // Default fallback
  return '초등학교 중학년(3-4학년)';
}

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 save-intermediate API 시작');

    // 🔐 세션에서 사용자 정보 가져오기
    let currentUserId = 'anonymous';
    try {
      const sessionCookie = request.cookies.get('session');
      if (sessionCookie) {
        const user: User = JSON.parse(sessionCookie.value);
        if (user && user.userId) {
          currentUserId = user.userId;
          console.log('✅ 로그인 사용자:', currentUserId, '(', user.name, ')');
        } else {
          console.log('⚠️ 세션 쿠키는 있지만 userId가 없음');
        }
      } else {
        console.log('⚠️ 세션 쿠키가 없음 - anonymous로 저장됨');
      }
    } catch (sessionError) {
      console.error('❌ 세션 읽기 오류:', sessionError);
      console.log('⚠️ 세션 오류로 인해 anonymous로 저장됨');
    }

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

    // 🔍 session_number 필수 검증
    const inputSessionNumber = input.session_number;

    if (!inputSessionNumber) {
      console.log('❌ session_number가 제공되지 않음');
      return NextResponse.json({
        success: false,
        message: 'session_number는 필수 항목입니다. session_number를 선택하거나 입력해주세요.'
      }, { status: 400 });
    }

    console.log('✅ session_number 확인:', inputSessionNumber);

    // 🔍 curriculum_data에서 session_number로 레코드 찾기
    const mainTopic = input.maintopic || input.mainTopic || '';
    const subTopic = input.subtopic || input.subTopic || '';
    let curriculumMatch = null;

    try {
      console.log('🔍 curriculum_data에서 session_number 기준 매칭 레코드 조회 중...', { session_number: inputSessionNumber });

      const curriculumData = await db.getCurriculumData({});

      curriculumMatch = curriculumData.find(
        (item: any) => String(item.session_number) === String(inputSessionNumber)
      );

      if (curriculumMatch) {
        console.log('✅ curriculum_data에서 session_number 기준 매칭 레코드 발견:', {
          session_number: curriculumMatch.session_number,
          grade: curriculumMatch.grade,
          main_topic: curriculumMatch.main_topic,
          sub_topic: curriculumMatch.sub_topic,
          grade_number: curriculumMatch.grade_number,
          division: curriculumMatch.division,
          passage_length: curriculumMatch.passage_length,
          text_type: curriculumMatch.text_type
        });
      } else {
        console.log('⚠️ curriculum_data에서 session_number로 매칭 레코드를 찾지 못함');
        return NextResponse.json({
          success: false,
          message: `session_number ${inputSessionNumber}에 해당하는 교육과정 데이터를 찾을 수 없습니다.`
        }, { status: 400 });
      }
    } catch (error) {
      console.error('❌ curriculum_data 조회 실패:', error);
      return NextResponse.json({
        success: false,
        message: 'curriculum_data 조회 중 오류가 발생했습니다.'
      }, { status: 500 });
    }

    // curriculum_data에서 가져온 값 사용 (session_number 기준이므로 모두 curriculum_data 우선)
    const grade = curriculumMatch.grade;
    const gradeNumber = curriculumMatch.grade_number;
    const sessionNumber = curriculumMatch.session_number;
    const division = curriculumMatch.division || inferDivisionFromGrade(grade);
    const passageLength = curriculumMatch.passage_length || input.length || null;
    const textType = curriculumMatch.text_type || input.textType || null;

    console.log('📌 curriculum_data에서 가져온 최종 값:', {
      session_number: sessionNumber,
      division,
      grade,
      gradeNumber,
      passage_length: passageLength,
      text_type: textType,
      main_topic: curriculumMatch.main_topic,
      sub_topic: curriculumMatch.sub_topic
    });

    // Transform input data to ContentSet format (중간 저장용 - 1차검수 상태)
    const contentSetData: Omit<ContentSet, 'id' | 'created_at' | 'updated_at'> = {
      user_id: currentUserId, // 🔐 세션에서 가져온 사용자 ID 사용
      division: division,
      grade: grade,
      grade_number: gradeNumber && String(gradeNumber).trim() !== '' ? String(gradeNumber).trim() : null,
      subject: curriculumMatch.subject, // curriculum_data에서 가져옴
      area: curriculumMatch.area, // curriculum_data에서 가져옴
      session_number: sessionNumber && String(sessionNumber).trim() !== '' ? String(sessionNumber).trim() : null,
      main_topic: curriculumMatch.main_topic, // curriculum_data에서 가져옴
      sub_topic: curriculumMatch.sub_topic, // curriculum_data에서 가져옴
      keywords: curriculumMatch.keywords || input.keyword || input.keywords || '',
      title: passageTitle,
      total_passages: actualParagraphCount,
      total_vocabulary_terms: totalFootnoteCount,
      total_vocabulary_questions: 0, // 중간 저장 시 아직 생성 안됨
      total_paragraph_questions: 0, // 중간 저장 시 아직 생성 안됨
      total_comprehensive_questions: 0, // 중간 저장 시 아직 생성 안됨
      status: '1차검수', // 🔑 중간 저장 상태
      passage_length: passageLength, // curriculum_data에서 가져옴
      text_type: textType, // curriculum_data에서 가져옴
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
