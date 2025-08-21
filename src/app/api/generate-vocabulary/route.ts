import { NextRequest, NextResponse } from 'next/server';
import { generateQuestion, ModelType } from '@/lib/openai';
import { generateVocabularyPrompt } from '@/lib/prompts';
import { VocabularyQuestion, VocabularyQuestionType } from '@/types';

// 오류 유형 정의
enum ErrorType {
  OPENAI_API_ERROR = 'OPENAI_API_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  INPUT_VALIDATION_ERROR = 'INPUT_VALIDATION_ERROR',
  GPT_RESPONSE_ERROR = 'GPT_RESPONSE_ERROR'
}

// 한국어 오류 메시지 매핑
const ERROR_MESSAGES = {
  [ErrorType.OPENAI_API_ERROR]: 'AI 서비스 연결에 문제가 있습니다. 잠시 후 다시 시도해 주세요.',
  [ErrorType.DATABASE_ERROR]: '데이터 처리 중 오류가 발생했습니다. 관리자에게 문의해 주세요.',
  [ErrorType.INPUT_VALIDATION_ERROR]: '입력된 정보가 올바르지 않습니다. 이전 단계를 확인해 주세요.',
  [ErrorType.GPT_RESPONSE_ERROR]: '어휘 문제 생성 형식에 오류가 있습니다. 다시 시도해 주세요.',
  UNKNOWN_ERROR: '어휘 문제 생성 중 예상하지 못한 오류가 발생했습니다.'
};

// HTTP 상태 코드 매핑
const ERROR_STATUS_CODES = {
  [ErrorType.OPENAI_API_ERROR]: 503,
  [ErrorType.DATABASE_ERROR]: 500,
  [ErrorType.INPUT_VALIDATION_ERROR]: 400,
  [ErrorType.GPT_RESPONSE_ERROR]: 422
};

// 오류 유형 분류 함수
function classifyError(error: any): ErrorType {
  const errorMessage = error.message?.toLowerCase() || '';
  const errorCode = error.code || error.status;

  // OpenAI API 오류
  if (errorCode === 401 || errorCode === 429 || errorCode === 503) {
    return ErrorType.OPENAI_API_ERROR;
  }
  if (errorMessage.includes('openai') || errorMessage.includes('api key') || 
      errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
    return ErrorType.OPENAI_API_ERROR;
  }

  // 데이터베이스 오류
  if (errorMessage.includes('supabase') || errorMessage.includes('database') || 
      errorMessage.includes('connection') || errorMessage.includes('timeout')) {
    return ErrorType.DATABASE_ERROR;
  }

  // GPT 응답 파싱 오류
  if (errorMessage.includes('json') || errorMessage.includes('parse') || 
      errorMessage.includes('invalid response') || errorMessage.includes('format')) {
    return ErrorType.GPT_RESPONSE_ERROR;
  }

  // 입력 검증 오류 (이미 별도 처리되어 여기 도달 가능성 낮음)
  if (errorMessage.includes('validation') || errorMessage.includes('required') || 
      errorMessage.includes('invalid input')) {
    return ErrorType.INPUT_VALIDATION_ERROR;
  }

  // 기본값
  return ErrorType.OPENAI_API_ERROR; // 대부분 AI API 관련 문제일 가능성 높음
}

// 구조화된 오류 응답 생성 함수
function createErrorResponse(error: any, context: string = '어휘 문제 생성') {
  const errorType = classifyError(error);
  const message = ERROR_MESSAGES[errorType] || ERROR_MESSAGES.UNKNOWN_ERROR;
  const statusCode = ERROR_STATUS_CODES[errorType] || 500;

  // 메타데이터 수집 (프로덕션 안전)
  const errorMetadata = {
    error: {
      message: error.message || String(error),
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      name: error.name,
      code: error.code || error.status
    },
    errorType,
    context,
    timestamp: new Date().toISOString(),
    request: {
      userAgent: (global as any).currentRequest?.headers?.get('user-agent') || 'unknown',
      ip: (global as any).currentRequest?.headers?.get('x-forwarded-for') || 'unknown',
      method: (global as any).currentRequest?.method || 'unknown',
      url: (global as any).currentRequest?.url || 'unknown'
    },
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      memory: process.memoryUsage(),
      uptime: process.uptime()
    }
  };

  console.error(`[${errorType}] ${context} 오류:`, errorMetadata);

  return NextResponse.json(
    { 
      error: { 
        message,
        type: errorType,
        timestamp: errorMetadata.timestamp
      }
    },
    { status: statusCode }
  );
}

interface VocabularyGenerationRequest {
  terms: string[];  // 용어 목록 (footnote에서 추출)
  passage: string;  // 지문 내용 (맥락 제공용)
  division: string; // 구분 (난이도 조절용)
  questionType: VocabularyQuestionType; // 문제 유형 (6가지 중 선택)
  model?: ModelType; // GPT 모델 선택
}

interface GeneratedQuestionData {
  term: string;
  questionType: VocabularyQuestionType;
  question: string;
  options?: string[];     // 객관식인 경우만
  answer: string;
  answerInitials?: string; // 단답형인 경우 초성 힌트
  explanation: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: VocabularyGenerationRequest = await request.json();
    
    // 입력값 검증
    if (!body.terms || !Array.isArray(body.terms) || body.terms.length === 0) {
      return NextResponse.json(
        { error: '용어 목록이 필요합니다.' },
        { status: 400 }
      );
    }

    if (!body.passage || !body.division) {
      return NextResponse.json(
        { error: '지문 내용과 구분 정보가 필요합니다.' },
        { status: 400 }
      );
    }

    if (!body.questionType) {
      return NextResponse.json(
        { error: '문제 유형이 필요합니다.' },
        { status: 400 }
      );
    }

    console.log('Generating vocabulary questions for terms:', body.terms);

    // 각 용어별로 문제 생성
    const vocabularyQuestions: VocabularyQuestion[] = [];
    let lastUsedPrompt = '';
    
    for (let i = 0; i < body.terms.length; i++) {
      const term = body.terms[i];
      
      try {
        // 용어에서 실제 용어와 설명 분리 (예: "민주주의: 국민이 주권을 가지는 정치 체제")
        const [termName, termDescription] = term.includes(':') 
          ? term.split(':').map(s => s.trim())
          : [term.trim(), ''];

        // 유형별 프롬프트 생성 (DB에서 조회, 실패 시 기본값 사용)
        const { generateVocabularyPromptFromDB } = await import('@/lib/prompts');
        const prompt = await generateVocabularyPromptFromDB(
          termName,
          termDescription,
          body.passage,
          body.division,
          body.questionType
        );

        console.log(`Generating question for term: ${termName}`);

        // 첫 번째 용어의 프롬프트를 저장 (대표 프롬프트로 사용)
        if (i === 0) {
          lastUsedPrompt = prompt;
        }

        // GPT API 호출 (모델 파라미터 포함)
        const model = body.model || 'gpt-4.1';
        const result = await generateQuestion(prompt, model);

        console.log(`🤖 GPT API response for term "${termName}":`, {
          resultType: typeof result,
          hasQuestionField: result && typeof result === 'object' && 'question' in result,
          resultKeys: result && typeof result === 'object' ? Object.keys(result) : 'not an object',
          resultPreview: result && typeof result === 'object' ? JSON.stringify(result).substring(0, 200) + '...' : result
        });

        // 결과 파싱 및 VocabularyQuestion 형태로 변환
        if (result && typeof result === 'object') {
          // GPT가 vocabularyQuestions 배열로 응답하는 경우
          if ('vocabularyQuestions' in result && Array.isArray(result.vocabularyQuestions)) {
            const questions = result.vocabularyQuestions as GeneratedQuestionData[];
            if (questions.length > 0) {
              const questionData = questions[0]; // 첫 번째 문제 사용
              
              console.log(`✅ Successfully parsed question for term "${termName}" (from array)`);
              
              vocabularyQuestions.push({
                id: `vocab_${i + 1}_${Date.now()}`,
                term: termName,
                questionType: body.questionType,
                question: questionData.question || '',
                options: questionData.options || undefined,
                answer: questionData.answer || '',
                answerInitials: questionData.answerInitials || undefined,
                explanation: questionData.explanation || ''
              });
            }
          }
          // 직접 문제 객체인 경우
          else if ('question' in result) {
            const questionData = result as GeneratedQuestionData;
            
            console.log(`✅ Successfully parsed question for term "${termName}" (direct)`);
            
            vocabularyQuestions.push({
              id: `vocab_${i + 1}_${Date.now()}`,
              term: termName,
              questionType: body.questionType,
              question: questionData.question || '',
              options: questionData.options || undefined,
              answer: questionData.answer || '',
              answerInitials: questionData.answerInitials || undefined,
              explanation: questionData.explanation || ''
            });
          } else {
            console.log(`❌ Failed to parse question for term "${termName}" - unexpected format`);
          }
        } else {
          console.log(`❌ Failed to parse question for term "${termName}" - result is not an object`);
        }

      } catch (termError) {
        console.error(`Error generating question for term "${term}":`, termError);
        
        // 실패한 용어는 기본 문제로 대체
        const termName = term.split(':')[0]?.trim() || term;
        const isMultipleChoice = body.questionType.includes('객관식');
        
        vocabularyQuestions.push({
          id: `vocab_${i + 1}_${Date.now()}`,
          term: termName,
          questionType: body.questionType,
          question: isMultipleChoice 
            ? `다음 중 '${termName}'의 의미로 가장 적절한 것은?`
            : `'${termName}'의 의미를 쓰세요.`,
          options: isMultipleChoice 
            ? (body.questionType === '2개중 선택형' ? ['선택지 1', '선택지 2'] :
               body.questionType === '3개중 선택형' ? ['선택지 1', '선택지 2', '선택지 3'] :
               body.questionType === '낱말 골라 쓰기' ? ['선택지 1', '선택지 2', '선택지 3', '선택지 4'] :
               ['선택지 1', '선택지 2', '선택지 3', '선택지 4', '선택지 5'])
            : undefined,
          answer: isMultipleChoice ? '선택지 1' : termName,
          answerInitials: !isMultipleChoice ? 'ㅇㅇ' : undefined,
          explanation: '문제 생성 중 오류가 발생하여 기본 문제로 대체되었습니다.'
        });
      }
    }

    console.log(`Generated ${vocabularyQuestions.length} vocabulary questions`);

    return NextResponse.json({
      vocabularyQuestions,
      totalGenerated: vocabularyQuestions.length,
      message: '어휘 문제가 성공적으로 생성되었습니다.',
      _metadata: {
        usedPrompt: lastUsedPrompt
      }
    });

  } catch (error) {
    return createErrorResponse(error, '어휘 문제 생성');
  }
} 