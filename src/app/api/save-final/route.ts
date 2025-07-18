import { NextRequest, NextResponse } from 'next/server';
import { 
  saveContentSetV2,
  savePassageV2,
  saveVocabularyTermsV2,
  saveVocabularyQuestionsV2,
  saveComprehensiveQuestionsV2,
  saveAIGenerationLogV2
} from '@/lib/google-sheets';
import { 
  PassageInput, 
  EditablePassage, 
  VocabularyQuestion, 
  ComprehensiveQuestion 
} from '@/types';

interface FinalSaveRequestV2 {
  input: PassageInput;
  editablePassage: EditablePassage;
  vocabularyQuestions: VocabularyQuestion[];
  comprehensiveQuestions: ComprehensiveQuestion[];
  userId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: FinalSaveRequestV2 = await request.json();
    
    // 입력값 검증
    if (!body.input || !body.editablePassage || !body.vocabularyQuestions || !body.comprehensiveQuestions) {
      return NextResponse.json(
        { error: '모든 데이터가 필요합니다.' },
        { status: 400 }
      );
    }

    console.log('정규화된 구조로 데이터를 저장합니다...');
    
    const timestamp = new Date().toISOString();
    const setId = `set_${Date.now()}`;

    // 디버깅: 저장될 데이터 로그 출력
    const contentSetData = {
      setId,
      userId: body.userId || '', // 로그인한 사용자 ID
      division: body.input.division,
      subject: body.input.subject,
      grade: body.input.grade,
      area: body.input.area,
      mainTopic: body.input.maintopic || '',
      subTopic: body.input.subtopic || '',
      keywords: body.input.keyword || '',
      passageTitle: body.editablePassage.title,
      passageLength: body.input.length, // 지문 길이 정보 추가
      textType: body.input.textType, // 지문 유형 정보 추가 (선택사항)
      paragraphCount: body.editablePassage.paragraphs?.length || 0,
      vocabularyWordsCount: body.editablePassage.footnote?.length || 0,
      vocabularyQuestionCount: body.vocabularyQuestions.length,
      comprehensiveQuestionCount: body.comprehensiveQuestions.length,
      status: '검수 전' // 기본값을 '검수 전'으로 변경
    };

    console.log('=== 저장될 콘텐츠 세트 데이터 ===');
    console.log('원본 input:', JSON.stringify(body.input, null, 2));
    console.log('setId:', contentSetData.setId);
    console.log('userId:', contentSetData.userId);
    console.log('division:', contentSetData.division, '(type:', typeof contentSetData.division, ')');
    console.log('subject:', contentSetData.subject);
    console.log('grade:', contentSetData.grade);
    console.log('area:', contentSetData.area);
    console.log('mainTopic:', contentSetData.mainTopic);
    console.log('subTopic:', contentSetData.subTopic);
    console.log('keywords:', contentSetData.keywords);
    console.log('================================');

    // 1. 콘텐츠 세트 메인 정보 저장
    await saveContentSetV2(contentSetData);

    // 2. 지문 데이터 저장
    await savePassageV2({
      contentSetId: setId,
      title: body.editablePassage.title,
      paragraphs: body.editablePassage.paragraphs || []
    });

    // 3. 어휘 용어 데이터 저장 (footnote 파싱)
    if (body.editablePassage.footnote && body.editablePassage.footnote.length > 0) {
      const parsedTerms = body.editablePassage.footnote.map((item, index) => {
        // "용어: 정의 (예시)" 형태로 파싱
        const match = item.match(/^(.+?):\s*(.+?)(?:\s*\((.+)\))?$/);
        if (match) {
          return {
            term: match[1].trim(),
            definition: match[2].trim(),
            exampleSentence: match[3]?.trim(),
            orderIndex: index + 1
          };
        }
        // 파싱 실패 시 기본 형태
        return {
          term: `용어_${index + 1}`,
          definition: item,
          exampleSentence: undefined,
          orderIndex: index + 1
        };
      });

      await saveVocabularyTermsV2({
        contentSetId: setId,
        terms: parsedTerms
      });
    }

    // 4. 어휘 문제 저장
    if (body.vocabularyQuestions.length > 0) {
      await saveVocabularyQuestionsV2({
        contentSetId: setId,
        questions: body.vocabularyQuestions.map(q => ({
          questionId: q.id,
          term: q.term,
          question: q.question,
          options: q.options,
          correctAnswer: q.answer,
          explanation: q.explanation
        }))
      });
    }

    // 5. 종합 문제 저장
    if (body.comprehensiveQuestions.length > 0) {
      await saveComprehensiveQuestionsV2({
        contentSetId: setId,
        questions: body.comprehensiveQuestions.map(q => ({
          questionId: q.id,
          questionType: q.type,
          question: q.question,
          options: q.options,
          correctAnswer: q.answer,
          explanation: q.explanation,
          isSupplementary: q.isSupplementary || false,
          originalQuestionId: q.originalQuestionId,
          questionSetNumber: 1 // 기본값
        }))
      });
    }

    // 6. AI 생성 로그 저장 (기본 정보)
    await saveAIGenerationLogV2({
      contentSetId: setId,
      generationType: 'passage', // 전체 워크플로우 완료
      promptUsed: `전체 워크플로우 완료 - ${body.input.subject} ${body.input.grade} ${body.input.area}`,
      aiResponse: {
        passageTitle: body.editablePassage.title,
        vocabularyCount: body.vocabularyQuestions.length,
        comprehensiveCount: body.comprehensiveQuestions.length,
        completedAt: timestamp
      }
    });

    console.log('✓ 모든 데이터가 정규화된 구조로 저장되었습니다.');

    return NextResponse.json({
      success: true,
      setId,
      message: '정규화된 구조로 모든 데이터가 성공적으로 저장되었습니다.',
      savedData: {
        timestamp,
        setId,
        passageTitle: body.editablePassage.title,
        paragraphCount: body.editablePassage.paragraphs?.length || 0,
        vocabularyWordsCount: body.editablePassage.footnote?.length || 0,
        vocabularyCount: body.vocabularyQuestions.length,
        comprehensiveCount: body.comprehensiveQuestions.length,
        vocabularyQuestionCount: body.vocabularyQuestions.length,
        comprehensiveQuestionCount: body.comprehensiveQuestions.length,
        typeDistribution: {
          '단답형': body.comprehensiveQuestions.filter(q => q.type === '단답형').length,
          '문단별 순서 맞추기': body.comprehensiveQuestions.filter(q => q.type === '문단별 순서 맞추기').length,
          '핵심 내용 요약': body.comprehensiveQuestions.filter(q => q.type === '핵심 내용 요약').length,
          '핵심어/핵심문장 찾기': body.comprehensiveQuestions.filter(q => q.type === '핵심어/핵심문장 찾기').length
        },
        newStructure: true
      },
      newSheets: [
        'content_sets_v2',
        'passages_v2',
        'vocabulary_terms_v2',
        'vocabulary_questions_v2',
        'comprehensive_questions_v2',
        'ai_generation_logs_v2'
      ]
    });

  } catch (error) {
    console.error('정규화된 구조 저장 중 오류:', error);
    
    return NextResponse.json({
      success: false,
      error: '정규화된 구조로 저장 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류',
      troubleshooting: [
        '1. Google Sheets 권한을 확인해주세요.',
        '2. 새로운 v2 시트들이 생성되었는지 확인해주세요.',
        '3. 마이그레이션을 먼저 실행했는지 확인해주세요.'
      ]
    }, { status: 500 });
  }
}