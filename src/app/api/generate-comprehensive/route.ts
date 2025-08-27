import { NextRequest, NextResponse } from 'next/server';
import { generateQuestion, ModelType } from '@/lib/openai';
import { generateComprehensivePrompt } from '@/lib/prompts';
import { ComprehensiveQuestion, ComprehensiveQuestionType } from '@/types';

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
  [ErrorType.GPT_RESPONSE_ERROR]: '종합 문제 생성 형식에 오류가 있습니다. 다시 시도해 주세요.',
  UNKNOWN_ERROR: '종합 문제 생성 중 예상하지 못한 오류가 발생했습니다.'
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
function createErrorResponse(error: any, context: string = '종합 문제 생성') {
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

interface ComprehensiveGenerationRequest {
  passage: string;  // 지문 내용 (수정된 지문)
  division: string; // 구분 (난이도 조절용)
  questionType: ComprehensiveQuestionType; // 문제 유형
  questionCount?: number; // 생성할 문제 개수 (기본값: 12)
  includeSupplementary?: boolean; // 보완 문제 포함 여부
  model?: ModelType; // GPT 모델 선택
}

interface GeneratedQuestionSet {
  questions: {
    id: string;
    type: string;
    question: string;
    options?: string[];
    answer: string;
    explanation: string;
  }[];
}

export async function POST(request: NextRequest) {
  try {
    const body: ComprehensiveGenerationRequest = await request.json();
    
    // 입력값 검증
    if (!body.passage || !body.division || !body.questionType) {
      return NextResponse.json(
        { error: '지문 내용, 구분, 문제 유형이 모두 필요합니다.' },
        { status: 400 }
      );
    }

    // 기본값 설정
    const questionCount = body.questionCount || 4;
    
    // 문제 개수 검증 (4, 8, 12만 허용)
    if (![4, 8, 12].includes(questionCount)) {
      return NextResponse.json(
        { error: '문제 개수는 4, 8, 12 중 하나여야 합니다.' },
        { status: 400 }
      );
    }

    console.log(`Generating ${questionCount} comprehensive questions:`, body.questionType);

    const comprehensiveQuestions: ComprehensiveQuestion[] = [];
    let lastUsedPrompt = '';
    
    // 문제 유형 결정
    let typesToGenerate: string[] = [];
    
    if (body.questionType === 'Random') {
      // Random 선택 시: 4가지 유형을 고르게 분배
      const baseQuestionsPerType = Math.floor(questionCount / 4);
      const remainder = questionCount % 4;
      const questionTypes = ['정보 확인', '주제 파악', '자료해석', '추론'];
      
      questionTypes.forEach((type, index) => {
        const count = baseQuestionsPerType + (index < remainder ? 1 : 0);
        for (let i = 0; i < count; i++) {
          typesToGenerate.push(type);
        }
      });
    } else {
      // 특정 유형 선택 시: 해당 유형으로 지정된 개수만큼
      typesToGenerate = Array(questionCount).fill(body.questionType);
    }

    // 유형별로 그룹화하여 문제 생성
    const typeGroups: { [key: string]: number } = {};
    
    // 각 유형별 개수 계산
    typesToGenerate.forEach(type => {
      typeGroups[type] = (typeGroups[type] || 0) + 1;
    });

    console.log('Type groups to generate:', typeGroups);

    // 🚀 병렬 처리: 각 유형별 문제를 동시에 생성
    console.log('🚀 Starting parallel generation for basic questions:', typeGroups);
    
    const generationPromises = Object.entries(typeGroups).map(async ([currentType, count], index) => {
      try {
        // 해당 유형의 문제 생성 (DB에서 조회, 실패 시 기본값 사용)
        const { generateComprehensivePromptFromDB } = await import('@/lib/prompts');
        const prompt = await generateComprehensivePromptFromDB(
          currentType,
          body.passage,
          body.division,
          count
        );

        console.log(`🔄 Generating ${count} ${currentType} questions in parallel`);

        // GPT API 호출 (모델 파라미터 포함)
        const model = body.model || 'gpt-4.1';
        const result = await generateQuestion(prompt, model);
        console.log(`✅ API Response for ${currentType}:`, JSON.stringify(result, null, 2));

        // 결과 파싱 및 ComprehensiveQuestion 형태로 변환
        let questionSet: GeneratedQuestionSet | null = null;
        let singleQuestion: any = null;
        let directQuestionArray: any[] | null = null;
        
        // raw 응답 처리
        if (result && typeof result === 'object' && 'raw' in result) {
          try {
            // raw 텍스트에서 JSON 추출 시도
            const rawText = result.raw as string;
            // 먼저 배열 형식 찾기 시도
            const arrayMatch = rawText.match(/\[[\s\S]*\]/);
            // 그 다음 객체 형식 찾기 시도
            const objectMatch = rawText.match(/\{[\s\S]*\}/);
            
            if (arrayMatch) {
              const parsed = JSON.parse(arrayMatch[0]);
              if (Array.isArray(parsed)) {
                directQuestionArray = parsed;
                console.log(`Found direct question array with ${parsed.length} questions for ${currentType}`);
              }
            } else if (objectMatch) {
              const parsed = JSON.parse(objectMatch[0]);
              if (parsed.questions && Array.isArray(parsed.questions)) {
                questionSet = parsed as GeneratedQuestionSet;
              } else if (parsed.question) {
                singleQuestion = parsed;
              }
            }
          } catch (parseError) {
            console.error(`Failed to parse raw response for ${currentType}:`, parseError);
          }
        } else if (result && typeof result === 'object') {
          // 직접 배열인지 확인
          if (Array.isArray(result)) {
            directQuestionArray = result;
            console.log(`Found direct question array (no raw) with ${result.length} questions for ${currentType}`);
          } else if ('questions' in result) {
            questionSet = result as GeneratedQuestionSet;
          } else if ('question' in result) {
            singleQuestion = result;
          }
        }
        
        const generatedQuestions: ComprehensiveQuestion[] = [];
        
        // questions 배열이 있는 경우
        if (questionSet && questionSet.questions && Array.isArray(questionSet.questions)) {
          const questionsToAdd = questionSet.questions.slice(0, count);
          console.log(`Adding ${questionsToAdd.length} questions of type ${currentType} from questions array`);
          
          questionsToAdd.forEach((q, qIndex) => {
            generatedQuestions.push({
              id: `comp_${currentType.replace(/[^a-zA-Z0-9]/g, '_')}_${qIndex + 1}_${Date.now()}_${index}`,
              type: currentType as Exclude<ComprehensiveQuestionType, 'Random'>,
              question: q.question || '',
              options: q.options || undefined,
              answer: q.answer || '',
              answerInitials: q.answerInitials || undefined,
              explanation: q.explanation || '',
              isSupplementary: false
            });
          });
        } 
        // 직접 배열 형식인 경우 (GPT가 배열로 바로 반환한 경우)
        else if (directQuestionArray && Array.isArray(directQuestionArray) && directQuestionArray.length > 0) {
          const questionsToAdd = directQuestionArray.slice(0, count);
          console.log(`Adding ${questionsToAdd.length} questions of type ${currentType} from direct question array`);
          
          questionsToAdd.forEach((q, qIndex) => {
            generatedQuestions.push({
              id: `comp_${currentType.replace(/[^a-zA-Z0-9]/g, '_')}_${qIndex + 1}_${Date.now()}_${index}`,
              type: currentType as Exclude<ComprehensiveQuestionType, 'Random'>,
              question: q.question || '',
              options: q.options || undefined,
              answer: q.answer || '',
              answerInitials: q.answerInitials || undefined,
              explanation: q.explanation || '',
              isSupplementary: false
            });
          });
        } 
        // 단일 문제 객체인 경우
        else if (singleQuestion && singleQuestion.question) {
          console.log(`Adding 1 question of type ${currentType} from single question object`);
          
          generatedQuestions.push({
            id: `comp_${currentType.replace(/[^a-zA-Z0-9]/g, '_')}_1_${Date.now()}_${index}`,
            type: currentType as Exclude<ComprehensiveQuestionType, 'Random'>,
            question: singleQuestion.question || '',
            options: singleQuestion.options || undefined,
            answer: singleQuestion.answer || '',
            answerInitials: singleQuestion.answerInitials || undefined,
            explanation: singleQuestion.explanation || '',
            isSupplementary: false
          });
        } else {
          console.error(`No valid questions found in response for ${currentType}`);
          throw new Error('Invalid question format in API response');
        }

        return { type: currentType, questions: generatedQuestions, prompt };

      } catch (setError) {
        console.error(`❌ Error generating ${currentType} questions:`, setError);
        
        // 실패 시 기본 문제 생성 (요청한 개수만큼)
        const fallbackQuestions: ComprehensiveQuestion[] = [];
        for (let j = 0; j < count; j++) {
          fallbackQuestions.push({
            id: `comp_fallback_${currentType.replace(/[^a-zA-Z0-9]/g, '_')}_${j + 1}_${Date.now()}_${index}`,
            type: currentType as Exclude<ComprehensiveQuestionType, 'Random'>,
            question: `${currentType} 문제 ${j + 1}`,
            options: ['선택지 1', '선택지 2', '선택지 3', '선택지 4', '선택지 5'],
            answer: '선택지 1',
            answerInitials: undefined, // 새로운 유형은 모두 객관식
            explanation: '문제 생성 중 오류가 발생하여 기본 문제로 대체되었습니다.',
            isSupplementary: false // 기본 문제임을 명시
          });
        }
        
        return { type: currentType, questions: fallbackQuestions, prompt: '', error: setError };
      }
    });

    // 🎯 모든 기본 문제를 병렬로 생성하고 결과 수집
    const generationResults = await Promise.all(generationPromises);
    console.log(`✅ Parallel generation completed. Results:`, generationResults.map(r => ({ 
      type: r.type, 
      count: r.questions.length,
      hasError: !!r.error
    })));
    
    // 생성된 문제들을 comprehensiveQuestions 배열에 추가
    generationResults.forEach(result => {
      comprehensiveQuestions.push(...result.questions);
      
      // 첫 번째 결과의 프롬프트를 대표 프롬프트로 사용
      if (!lastUsedPrompt && result.prompt) {
        lastUsedPrompt = result.prompt;
      }
    });

    // 🚀 보완 문제 생성 (병렬 처리)
    if (body.includeSupplementary) {
      console.log('🚀 Starting parallel generation for supplementary questions...');
      const supplementaryModel = body.model || 'gpt-4.1'; // 보완 문제용 모델 설정
      
      // 🎯 각 기본 문제당 2개의 보완 문제를 병렬로 생성
      const supplementaryPromises = comprehensiveQuestions.flatMap((originalQuestion, originalIndex) => {
        return [1, 2].map(async (supIndex) => {
          try {
            // 보완 문제용 프롬프트 생성 (DB에서 필요한 프롬프트만 조회)
            const { getPromptFromDB, getDivisionSubCategory, getDivisionKey, getComprehensiveTypeKey } = await import('@/lib/prompts');
            
            // DB에서 구분 프롬프트와 문제 유형 프롬프트만 조회
            const divisionPrompt = await getPromptFromDB('division', getDivisionSubCategory(body.division), getDivisionKey(body.division));
            const typePrompt = await getPromptFromDB('comprehensive', 'comprehensiveType', getComprehensiveTypeKey(originalQuestion.type));
            
            console.log(`🔄 Generating supplementary question ${supIndex} for ${originalQuestion.type} in parallel`);
            
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
                id: `comp_sup_${originalQuestion.id}_${supIndex}_${Date.now()}_${originalIndex}`,
                type: originalQuestion.type,
                question: supplementaryQuestion.question,
                options: supplementaryQuestion.options,
                answer: supplementaryQuestion.answer,
                answerInitials: supplementaryQuestion.answerInitials || undefined, // 초성 힌트 추가
                explanation: supplementaryQuestion.explanation || '보완 문제입니다.',
                isSupplementary: true, // 보완 문제 표시
                originalQuestionId: originalQuestion.id, // 원본 문제 ID 참조
                success: true
              };
            } else {
              throw new Error('No valid supplementary question generated');
            }
            
          } catch (supError) {
            console.error(`❌ Error generating supplementary question ${supIndex} for ${originalQuestion.id}:`, supError);
            
            // 실패 시 기본 보완 문제 생성
            return {
              id: `comp_sup_fallback_${originalQuestion.id}_${supIndex}_${Date.now()}_${originalIndex}`,
              type: originalQuestion.type,
              question: `${originalQuestion.type} 보완 문제 ${supIndex}`,
              options: ['선택지 1', '선택지 2', '선택지 3', '선택지 4', '선택지 5'],
              answer: '선택지 1',
              answerInitials: undefined, // 새로운 유형은 모두 객관식
              explanation: '보완 문제 생성 중 오류가 발생하여 기본 문제로 대체되었습니다.',
              isSupplementary: true,
              originalQuestionId: originalQuestion.id, // 원본 문제 ID 참조
              success: false,
              error: supError
            };
          }
        });
      });
      
      // 🎯 모든 보완 문제를 병렬로 생성하고 결과 수집
      const supplementaryResults = await Promise.all(supplementaryPromises);
      console.log(`✅ Parallel supplementary generation completed. Results:`, supplementaryResults.map(r => ({ 
        id: r.id, 
        type: r.type,
        success: r.success
      })));
      
      // 성공한 보완 문제들만 추가 (타입 안전성을 위해 필터링)
      const validSupplementaryQuestions = supplementaryResults.filter(result => result.id).map(result => {
        const { success, error, ...question } = result;
        return question as ComprehensiveQuestion;
      });
      
      // 기본 문제와 보완 문제 합치기
      comprehensiveQuestions.push(...validSupplementaryQuestions);
      console.log(`✅ Generated ${validSupplementaryQuestions.length} supplementary questions in parallel`);
    }

    // 디버깅 로그 추가
    const basicCount = comprehensiveQuestions.filter(q => !q.isSupplementary).length;
    const supplementaryCount = comprehensiveQuestions.filter(q => q.isSupplementary).length;
    
    console.log(`Generated total ${comprehensiveQuestions.length} comprehensive questions (${body.includeSupplementary ? 'with supplementary' : 'basic only'})`);
    console.log(`Basic questions: ${basicCount}, Supplementary questions: ${supplementaryCount}`);
    console.log('All questions:', comprehensiveQuestions.map(q => ({ 
      id: q.id, 
      type: q.type, 
      isSupplementary: q.isSupplementary,
      question: q.question.substring(0, 50) + '...'
    })));

    return NextResponse.json({
      comprehensiveQuestions,
      totalGenerated: comprehensiveQuestions.length,
      questionType: body.questionType,
      questionCount: questionCount,
      includeSupplementary: body.includeSupplementary,
      typeDistribution: body.questionType === 'Random' 
        ? { 
            '정보 확인': questionCount / 4, 
            '주제 파악': questionCount / 4, 
            '자료해석': questionCount / 4, 
            '추론': questionCount / 4
          }
        : { [body.questionType]: questionCount },
      basicCount: comprehensiveQuestions.filter(q => !q.isSupplementary).length,
      supplementaryCount: body.includeSupplementary ? comprehensiveQuestions.filter(q => q.isSupplementary).length : 0,
      message: `종합 문제 ${questionCount}개가 성공적으로 생성되었습니다.${body.includeSupplementary ? ` (보완 문제 ${questionCount * 2}개 포함)` : ''}`,
      _metadata: {
        usedPrompt: lastUsedPrompt
      }
    });

  } catch (error) {
    return createErrorResponse(error, '종합 문제 생성');
  }
} 