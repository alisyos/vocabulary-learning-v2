import { NextRequest, NextResponse } from 'next/server';
import { generatePassage, ModelType } from '@/lib/openai';
import { generatePassagePrompt } from '@/lib/prompts';
import { PassageInput, AreaType } from '@/types';

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
  [ErrorType.GPT_RESPONSE_ERROR]: '지문 생성 형식에 오류가 있습니다. 다시 시도해 주세요.',
  UNKNOWN_ERROR: '지문 생성 중 예상하지 못한 오류가 발생했습니다.'
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
function createErrorResponse(error: any, context: string = '지문 생성') {
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

export async function POST(request: NextRequest) {
  try {
    const body: PassageInput & { model?: ModelType } = await request.json();
    const model = body.model || 'gpt-4.1'; // 기본값 gpt-4.1
    
    console.log('📝 Received body:', JSON.stringify(body, null, 2));
    console.log('🎨 textType value:', body.textType);
    console.log('🎨 textType type:', typeof body.textType);
    
    // 입력값 검증
    if (!body.division || !body.length || !body.subject || !body.grade || !body.area || !body.maintopic || !body.subtopic || !body.keyword) {
      return NextResponse.json(
        { error: '모든 필수 항목을 입력해주세요.' },
        { status: 400 }
      );
    }

    // 프롬프트 생성 (DB에서 조회, 실패 시 기본값 사용)
    const { generatePassagePromptFromDB } = await import('@/lib/prompts');
    const prompt = await generatePassagePromptFromDB(
      body.division,
      body.length,
      body.subject,
      body.grade,
      body.area as AreaType, // 타입 캐스팅
      body.maintopic,
      body.subtopic,
      body.keyword,
      body.textType,
      body.keywords_for_passages,
      body.keywords_for_questions
    );

    console.log('Generated prompt:', prompt);
    console.log('🔍 프롬프트 변수 치환 상태 확인:');
    console.log('- keywords_for_passages:', body.keywords_for_passages);
    console.log('- keywords_for_questions:', body.keywords_for_questions);
    console.log('- 치환된 프롬프트 내용 확인:', prompt.includes('{keywords_for_passages}') ? '❌ 미치환' : '✅ 치환완료');
    console.log(`🎯 선택된 모델: ${model}`);

    // GPT API 호출 (모델 파라미터 포함)
    const result = await generatePassage(prompt, model);

    console.log('GPT response:', result);

    // 결과에 사용된 프롬프트와 모델 정보도 함께 반환
    return NextResponse.json({
      ...result,
      _metadata: {
        usedPrompt: prompt,
        usedModel: model,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    return createErrorResponse(error, '지문 생성');
  }
}