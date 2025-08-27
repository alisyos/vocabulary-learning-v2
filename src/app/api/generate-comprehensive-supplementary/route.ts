import { NextRequest, NextResponse } from 'next/server';
import { generateQuestion, ModelType } from '@/lib/openai';
import { ComprehensiveQuestion } from '@/types';

// 오류 처리는 기존 comprehensive API와 동일하게 유지
enum ErrorType {
  OPENAI_API_ERROR = 'OPENAI_API_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  INPUT_VALIDATION_ERROR = 'INPUT_VALIDATION_ERROR',
  GPT_RESPONSE_ERROR = 'GPT_RESPONSE_ERROR'
}

const ERROR_MESSAGES = {
  [ErrorType.OPENAI_API_ERROR]: 'AI 서비스 연결에 문제가 있습니다. 잠시 후 다시 시도해 주세요.',
  [ErrorType.DATABASE_ERROR]: '데이터 처리 중 오류가 발생했습니다. 관리자에게 문의해 주세요.',
  [ErrorType.INPUT_VALIDATION_ERROR]: '입력된 정보가 올바르지 않습니다. 이전 단계를 확인해 주세요.',
  [ErrorType.GPT_RESPONSE_ERROR]: '보완 문제 생성 형식에 오류가 있습니다. 다시 시도해 주세요.',
  UNKNOWN_ERROR: '보완 문제 생성 중 예상하지 못한 오류가 발생했습니다.'
};

const ERROR_STATUS_CODES = {
  [ErrorType.OPENAI_API_ERROR]: 503,
  [ErrorType.DATABASE_ERROR]: 500,
  [ErrorType.INPUT_VALIDATION_ERROR]: 400,
  [ErrorType.GPT_RESPONSE_ERROR]: 422
};

function classifyError(error: any): ErrorType {
  const errorMessage = error.message?.toLowerCase() || '';
  const errorCode = error.code || error.status;

  if (errorCode === 401 || errorCode === 429 || errorCode === 503) {
    return ErrorType.OPENAI_API_ERROR;
  }
  if (errorMessage.includes('openai') || errorMessage.includes('api key')) {
    return ErrorType.OPENAI_API_ERROR;
  }
  if (errorMessage.includes('json') || errorMessage.includes('parse')) {
    return ErrorType.GPT_RESPONSE_ERROR;
  }
  
  return ErrorType.OPENAI_API_ERROR;
}

function createErrorResponse(error: any, context: string = '보완 문제 생성') {
  const errorType = classifyError(error);
  const message = ERROR_MESSAGES[errorType] || ERROR_MESSAGES.UNKNOWN_ERROR;
  const statusCode = ERROR_STATUS_CODES[errorType] || 500;

  console.error(`[${errorType}] ${context} 오류:`, error);

  return NextResponse.json(
    { 
      error: { 
        message,
        type: errorType,
        timestamp: new Date().toISOString()
      }
    },
    { status: statusCode }
  );
}

interface SupplementaryGenerationRequest {
  passage: string;
  division: string;
  basicQuestions: ComprehensiveQuestion[]; // 기본 문제들
  model?: ModelType;
}

export async function POST(request: NextRequest) {
  try {
    const body: SupplementaryGenerationRequest = await request.json();
    
    // 입력값 검증
    if (!body.passage || !body.division || !body.basicQuestions || !Array.isArray(body.basicQuestions)) {
      return NextResponse.json(
        { error: '지문 내용, 구분, 기본 문제 목록이 모두 필요합니다.' },
        { status: 400 }
      );
    }

    if (body.basicQuestions.length === 0) {
      return NextResponse.json(
        { error: '기본 문제가 없습니다. 기본 문제를 먼저 생성해주세요.' },
        { status: 400 }
      );
    }

    console.log(`🔄 Background generating supplementary questions for ${body.basicQuestions.length} basic questions...`);

    const supplementaryModel = body.model || 'gpt-4.1';
    
    // 🎯 각 기본 문제당 2개의 보완 문제를 병렬로 생성
    const supplementaryPromises = body.basicQuestions.flatMap((originalQuestion, originalIndex) => {
      return [1, 2].map(async (supIndex) => {
        try {
          // 보완 문제용 프롬프트 생성 (DB에서 필요한 프롬프트만 조회)
          const { getPromptFromDB, getDivisionSubCategory, getDivisionKey, getComprehensiveTypeKey } = await import('@/lib/prompts');
          
          // DB에서 구분 프롬프트와 문제 유형 프롬프트만 조회
          const divisionPrompt = await getPromptFromDB('division', getDivisionSubCategory(body.division), getDivisionKey(body.division));
          const typePrompt = await getPromptFromDB('comprehensive', 'comprehensiveType', getComprehensiveTypeKey(originalQuestion.type));
          
          console.log(`🔄 Background generating supplementary question ${supIndex} for ${originalQuestion.type}`);
          
          // 보완 문제 전용 프롬프트 (단일 문제 생성에 특화)
          const supplementaryPrompt = `###지시사항
다음 종합 문제의 보완 문제 ${supIndex}번을 생성해주세요.
- 원본 문제와 같은 유형이지만 다른 관점에서 접근
- 학습 강화를 위한 추가 연습 문제로 제작
- 오답 시 학습에 도움이 되는 내용으로 구성
- 지문에 직접 언급된 내용이나 논리적으로 추론 가능한 내용만 활용

###원본 문제 정보
- 유형: ${originalQuestion.type}
- 질문: "${originalQuestion.question}"
- 정답: "${originalQuestion.answer}"

###지문
${body.passage}

###구분 (난이도 조절)
${divisionPrompt || `${body.division}에 적합한 난이도로 조절`}

###문제 유형 가이드라인
${typePrompt || `${originalQuestion.type} 유형의 문제를 생성하세요.`}

###출력 형식 (JSON)
다음 JSON 형식으로 정확히 1개 문제만 생성하십시오:
{
  "question": "질문 내용",
  "options": ["선택지1", "선택지2", "선택지3", "선택지4", "선택지5"],
  "answer": "정답",
  "answerInitials": "초성 힌트 (단답형일 때만, 예: ㅈㄹㅎㅁ)",
  "explanation": "해설"
}

###주의사항
- 반드시 위의 JSON 형식을 정확히 준수하십시오
- 단답형이 아닌 경우 options 배열을 포함하십시오
- 단답형인 경우 options는 생략 가능합니다
- 정답과 해설은 지문에 명확히 근거해야 합니다
- 원본 문제와 중복되지 않는 새로운 관점의 문제를 생성하십시오`;
          
          const supplementaryResult = await generateQuestion(supplementaryPrompt, supplementaryModel);
          
          // 보완 문제 결과 파싱
          let supplementaryQuestion = null;
          
          if (supplementaryResult && typeof supplementaryResult === 'object') {
            if ('raw' in supplementaryResult) {
              try {
                const rawText = supplementaryResult.raw as string;
                const jsonMatch = rawText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  supplementaryQuestion = JSON.parse(jsonMatch[0]);
                }
              } catch (parseError) {
                console.error(`Failed to parse supplementary raw response:`, parseError);
              }
            } else if ('question' in supplementaryResult) {
              supplementaryQuestion = supplementaryResult;
            }
          }
          
          if (supplementaryQuestion?.question) {
            return {
              id: `comp_bg_sup_${originalQuestion.id}_${supIndex}_${Date.now()}_${originalIndex}`,
              type: originalQuestion.type,
              question: supplementaryQuestion.question,
              options: supplementaryQuestion.options,
              answer: supplementaryQuestion.answer,
              answerInitials: supplementaryQuestion.answerInitials || undefined,
              explanation: supplementaryQuestion.explanation || '보완 문제입니다.',
              isSupplementary: true,
              originalQuestionId: originalQuestion.id,
              success: true
            };
          } else {
            throw new Error('No valid supplementary question generated');
          }
          
        } catch (supError) {
          console.error(`❌ Background error generating supplementary question ${supIndex} for ${originalQuestion.id}:`, supError);
          
          // 실패 시 기본 보완 문제 생성
          return {
            id: `comp_bg_sup_fallback_${originalQuestion.id}_${supIndex}_${Date.now()}_${originalIndex}`,
            type: originalQuestion.type,
            question: `${originalQuestion.type} 보완 문제 ${supIndex} (배경 생성)`,
            options: ['선택지 1', '선택지 2', '선택지 3', '선택지 4', '선택지 5'],
            answer: '선택지 1',
            explanation: '보완 문제 배경 생성 중 오류가 발생하여 기본 문제로 대체되었습니다.',
            isSupplementary: true,
            originalQuestionId: originalQuestion.id,
            success: false,
            error: supError
          };
        }
      });
    });
    
    // 🎯 모든 보완 문제를 병렬로 생성하고 결과 수집
    const supplementaryResults = await Promise.all(supplementaryPromises);
    console.log(`✅ Background supplementary generation completed. Results:`, supplementaryResults.map(r => ({ 
      id: r.id, 
      type: r.type,
      success: r.success
    })));
    
    // 성공한 보완 문제들만 추가 (타입 안전성을 위해 필터링)
    const validSupplementaryQuestions = supplementaryResults.filter(result => result.id).map(result => {
      const { success, error, ...question } = result;
      return question as ComprehensiveQuestion;
    });
    
    const successCount = supplementaryResults.filter(r => r.success).length;
    const failureCount = supplementaryResults.length - successCount;
    
    console.log(`✅ Background generated ${validSupplementaryQuestions.length} supplementary questions (성공: ${successCount}, 실패: ${failureCount})`);

    return NextResponse.json({
      supplementaryQuestions: validSupplementaryQuestions,
      totalGenerated: validSupplementaryQuestions.length,
      basicQuestionsCount: body.basicQuestions.length,
      successCount: successCount,
      failureCount: failureCount,
      message: `보완 문제 ${validSupplementaryQuestions.length}개가 배경에서 생성되었습니다. (기본 문제 ${body.basicQuestions.length}개당 각각 2개씩)`,
      _metadata: {
        backgroundGeneration: true,
        processingTime: new Date().toISOString()
      }
    });

  } catch (error) {
    return createErrorResponse(error, '보완 문제 배경 생성');
  }
}