import { NextRequest, NextResponse } from 'next/server';
import { saveToSheet } from '@/lib/google-sheets';
import { 
  PassageInput, 
  EditablePassage, 
  VocabularyQuestion, 
  ComprehensiveQuestion 
} from '@/types';

interface FinalSaveRequest {
  input: PassageInput;
  editablePassage: EditablePassage;
  vocabularyQuestions: VocabularyQuestion[];
  comprehensiveQuestions: ComprehensiveQuestion[];
}

export async function POST(request: NextRequest) {
  try {
    const body: FinalSaveRequest = await request.json();
    
    // 입력값 검증
    if (!body.input || !body.editablePassage || !body.vocabularyQuestions || !body.comprehensiveQuestions) {
      return NextResponse.json(
        { error: '모든 데이터가 필요합니다.' },
        { status: 400 }
      );
    }

    console.log('Saving final data set...');
    
    // 환경 변수 사전 검증
    const envCheck = {
      GOOGLE_SHEETS_CLIENT_EMAIL: !!process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      GOOGLE_SHEETS_PRIVATE_KEY: !!process.env.GOOGLE_SHEETS_PRIVATE_KEY,
      GOOGLE_SHEETS_SPREADSHEET_ID: !!process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
      GOOGLE_APPLICATION_CREDENTIALS: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
    };
    
    console.log('Environment variables check:', envCheck);
    
    const missingVars = Object.entries(envCheck)
      .filter(([key, exists]) => !exists && key !== 'GOOGLE_APPLICATION_CREDENTIALS')
      .map(([key]) => key);
    
    if (missingVars.length > 0 && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      return NextResponse.json({
        success: false,
        error: 'Google Sheets 환경 변수가 설정되지 않았습니다.',
        details: `누락된 환경 변수: ${missingVars.join(', ')}`,
        missingVariables: missingVars,
        recommendations: [
          '.env.local 파일을 생성하고 다음 환경 변수들을 설정해주세요:',
          'GOOGLE_SHEETS_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com',
          'GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nYOUR_KEY\\n-----END PRIVATE KEY-----\\n"',
          'GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id'
        ]
      }, { status: 500 });
    }

    const timestamp = new Date().toISOString();
    
    // 세트 ID 생성 (타임스탬프 기반)
    const setId = `set_${Date.now()}`;

    try {
      // 1. 메인 데이터 시트에 저장 (각 세트의 요약 정보)
      const mainData = [
        [
          timestamp,
          setId,
          body.input.division,
          body.input.subject,
          body.input.grade,
          body.input.area,
          body.input.maintopic,
          body.input.subtopic,
          body.input.keyword,
          body.editablePassage.title,
          body.vocabularyQuestions.length,
          body.comprehensiveQuestions.length,
          JSON.stringify(body.input),
          JSON.stringify(body.editablePassage),
          JSON.stringify(body.vocabularyQuestions),
          JSON.stringify(body.comprehensiveQuestions)
        ]
      ];
      
      await saveToSheet('final_sets', mainData);
      console.log('Main data saved successfully');

      // 2. 어휘 문제 상세 데이터 저장
      if (body.vocabularyQuestions.length > 0) {
        const vocabData = body.vocabularyQuestions.map(q => [
          timestamp,
          setId,
          q.id,
          q.term,
          q.question,
          JSON.stringify(q.options),
          q.answer,
          q.explanation
        ]);
        
        await saveToSheet('vocabulary_details', vocabData);
        console.log('Vocabulary questions saved successfully');
      }

      // 3. 종합 문제 상세 데이터 저장
      if (body.comprehensiveQuestions.length > 0) {
        const compData = body.comprehensiveQuestions.map(q => [
          timestamp,
          setId,
          q.id,
          q.type,
          q.question,
          q.options ? JSON.stringify(q.options) : '',
          q.answer,
          q.explanation,
          q.isSupplementary ? 'true' : 'false', // 보완 문제 여부 (문자열)
          q.originalQuestionId || '' // 원본 문제 ID (보완 문제가 아닌 경우 빈 문자열)
        ]);
        
        await saveToSheet('comprehensive_details', compData);
        console.log('Comprehensive questions saved successfully');
      }

      // 4. 종합 문제 유형별 통계 저장
      const typeStats = ['단답형', '문단별 순서 맞추기', '핵심 내용 요약', '핵심어/핵심문장 찾기']
        .map(type => {
          const count = body.comprehensiveQuestions.filter(q => q.type === type).length;
          return [timestamp, setId, type, count] as (string | number)[];
        })
        .filter(([, , , count]) => (count as number) > 0);

      if (typeStats.length > 0) {
        await saveToSheet('question_type_stats', typeStats);
        console.log('Question type statistics saved successfully');
      }

      return NextResponse.json({
        success: true,
        setId,
        message: '모든 데이터가 성공적으로 저장되었습니다.',
        savedData: {
          timestamp,
          setId,
          passageTitle: body.editablePassage.title,
          vocabularyCount: body.vocabularyQuestions.length,
          comprehensiveCount: body.comprehensiveQuestions.length,
          typeDistribution: {
            '단답형': body.comprehensiveQuestions.filter(q => q.type === '단답형').length,
            '문단별 순서 맞추기': body.comprehensiveQuestions.filter(q => q.type === '문단별 순서 맞추기').length,
            '핵심 내용 요약': body.comprehensiveQuestions.filter(q => q.type === '핵심 내용 요약').length,
            '핵심어/핵심문장 찾기': body.comprehensiveQuestions.filter(q => q.type === '핵심어/핵심문장 찾기').length
          }
        }
      });

    } catch (saveError) {
      console.error('Error saving to Google Sheets:', saveError);
      
      return NextResponse.json({
        success: false,
        error: 'Google Sheets 저장 중 오류가 발생했습니다.',
        details: saveError instanceof Error ? saveError.message : '알 수 없는 오류',
        localBackup: {
          // 로컬 백업용 데이터 (클라이언트가 필요시 사용)
          timestamp,
          setId,
          data: body
        }
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in final save:', error);
    return NextResponse.json(
      { error: '최종 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 