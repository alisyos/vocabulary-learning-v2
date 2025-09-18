import { NextRequest, NextResponse } from 'next/server';
import { generateQuestion, ModelType } from '@/lib/openai';
import { ComprehensiveQuestion, ComprehensiveQuestionType } from '@/types';

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
  [ErrorType.GPT_RESPONSE_ERROR]: '기본 문제 생성 형식에 오류가 있습니다. 다시 시도해 주세요.',
  UNKNOWN_ERROR: '기본 문제 생성 중 예상하지 못한 오류가 발생했습니다.'
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

function createErrorResponse(error: any, context: string = '기본 문제 생성') {
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

interface BasicComprehensiveGenerationRequest {
  passage: string;
  division: string;
  questionType: ComprehensiveQuestionType;
  questionCount?: number;
  model?: ModelType;
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
    const body: BasicComprehensiveGenerationRequest = await request.json();
    
    // 입력값 검증
    if (!body.passage || !body.division || !body.questionType) {
      return NextResponse.json(
        { error: '지문 내용, 구분, 문제 유형이 모두 필요합니다.' },
        { status: 400 }
      );
    }

    const questionCount = body.questionCount || 4;
    
    if (![4, 8, 12].includes(questionCount)) {
      return NextResponse.json(
        { error: '문제 개수는 4, 8, 12 중 하나여야 합니다.' },
        { status: 400 }
      );
    }

    console.log(`⚡ Fast generating ${questionCount} basic comprehensive questions:`, body.questionType);

    const comprehensiveQuestions: ComprehensiveQuestion[] = [];
    let lastUsedPrompt = '';
    
    // 문제 유형 결정
    let typesToGenerate: string[] = [];
    
    if (body.questionType === 'Random') {
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
      typesToGenerate = Array(questionCount).fill(body.questionType);
    }

    // 유형별로 그룹화
    const typeGroups: { [key: string]: number } = {};
    typesToGenerate.forEach(type => {
      typeGroups[type] = (typeGroups[type] || 0) + 1;
    });

    console.log('⚡ Basic generation type groups:', typeGroups);

    // 🚀 병렬 처리: 각 유형별 기본 문제를 동시에 생성 (보완 문제 없음)
    const generationPromises = Object.entries(typeGroups).map(async ([currentType, count], index) => {
      try {
        const { generateComprehensivePromptFromDB } = await import('@/lib/prompts');
        const prompt = await generateComprehensivePromptFromDB(
          currentType,
          body.passage,
          body.division,
          count
        );

        console.log(`⚡ Fast generating ${count} ${currentType} questions`);

        const model = body.model || 'gpt-4.1';
        const result = await generateQuestion(prompt, model);

        // 결과 파싱 (기존과 동일한 로직)
        let questionSet: GeneratedQuestionSet | null = null;
        let singleQuestion: any = null;
        let directQuestionArray: any[] | null = null;
        
        if (result && typeof result === 'object' && 'raw' in result) {
          try {
            const rawText = result.raw as string;
            const arrayMatch = rawText.match(/\[[\s\S]*\]/);
            const objectMatch = rawText.match(/\{[\s\S]*\}/);
            
            if (arrayMatch) {
              const parsed = JSON.parse(arrayMatch[0]);
              if (Array.isArray(parsed)) {
                directQuestionArray = parsed;
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
          if (Array.isArray(result)) {
            directQuestionArray = result;
          } else if ('questions' in result) {
            questionSet = result as GeneratedQuestionSet;
          } else if ('question' in result) {
            singleQuestion = result;
          }
        }
        
        const generatedQuestions: ComprehensiveQuestion[] = [];
        
        // 생성된 문제 처리 (기존과 동일한 로직)
        if (questionSet && questionSet.questions && Array.isArray(questionSet.questions)) {
          const questionsToAdd = questionSet.questions.slice(0, count);
          
          questionsToAdd.forEach((q, qIndex) => {
            generatedQuestions.push({
              id: `comp_basic_${currentType.replace(/[^a-zA-Z0-9]/g, '_')}_${qIndex + 1}_${Date.now()}_${index}`,
              type: currentType as Exclude<ComprehensiveQuestionType, 'Random'>,
              question: q.question || '',
              options: q.options || undefined,
              answer: q.answer || '',
              answerInitials: q.answerInitials || undefined,
              explanation: q.explanation || '',
              isSupplementary: false
            });
          });
        } else if (directQuestionArray && Array.isArray(directQuestionArray) && directQuestionArray.length > 0) {
          const questionsToAdd = directQuestionArray.slice(0, count);
          
          questionsToAdd.forEach((q, qIndex) => {
            generatedQuestions.push({
              id: `comp_basic_${currentType.replace(/[^a-zA-Z0-9]/g, '_')}_${qIndex + 1}_${Date.now()}_${index}`,
              type: currentType as Exclude<ComprehensiveQuestionType, 'Random'>,
              question: q.question || '',
              options: q.options || undefined,
              answer: q.answer || '',
              answerInitials: q.answerInitials || undefined,
              explanation: q.explanation || '',
              isSupplementary: false
            });
          });
        } else if (singleQuestion && singleQuestion.question) {
          generatedQuestions.push({
            id: `comp_basic_${currentType.replace(/[^a-zA-Z0-9]/g, '_')}_1_${Date.now()}_${index}`,
            type: currentType as Exclude<ComprehensiveQuestionType, 'Random'>,
            question: singleQuestion.question || '',
            options: singleQuestion.options || undefined,
            answer: singleQuestion.answer || '',
            answerInitials: singleQuestion.answerInitials || undefined,
            explanation: singleQuestion.explanation || '',
            isSupplementary: false
          });
        } else {
          throw new Error('Invalid question format in API response');
        }

        return { type: currentType, questions: generatedQuestions, prompt };

      } catch (setError) {
        console.error(`❌ Error generating basic ${currentType} questions:`, setError);
        
        // 실패 시 기본 문제 생성
        const fallbackQuestions: ComprehensiveQuestion[] = [];
        for (let j = 0; j < count; j++) {
          fallbackQuestions.push({
            id: `comp_basic_fallback_${currentType.replace(/[^a-zA-Z0-9]/g, '_')}_${j + 1}_${Date.now()}_${index}`,
            type: currentType as Exclude<ComprehensiveQuestionType, 'Random'>,
            question: `${currentType} 기본 문제 ${j + 1}`,
            options: ['선택지 1', '선택지 2', '선택지 3', '선택지 4', '선택지 5'],
            answer: '선택지 1',
            explanation: '기본 문제 생성 중 오류가 발생하여 기본 문제로 대체되었습니다.',
            isSupplementary: false
          });
        }
        
        return { type: currentType, questions: fallbackQuestions, prompt: '', error: setError };
      }
    });

    // 🎯 모든 기본 문제를 병렬로 생성
    const generationResults = await Promise.all(generationPromises);
    
    // 생성된 문제들을 배열에 추가
    generationResults.forEach(result => {
      comprehensiveQuestions.push(...result.questions);
      
      if (!lastUsedPrompt && result.prompt) {
        lastUsedPrompt = result.prompt;
      }
    });

    const basicCount = comprehensiveQuestions.filter(q => !q.isSupplementary).length;
    
    console.log(`⚡ Fast generated ${comprehensiveQuestions.length} basic comprehensive questions`);

    return NextResponse.json({
      comprehensiveQuestions,
      totalGenerated: comprehensiveQuestions.length,
      questionType: body.questionType,
      questionCount: questionCount,
      includeSupplementary: false, // 기본 문제만 생성
      basicCount: basicCount,
      supplementaryCount: 0,
      message: `기본 문제 ${questionCount}개가 빠르게 생성되었습니다. (보완 문제는 별도 생성 가능)`,
      _metadata: {
        usedPrompt: lastUsedPrompt,
        fastGeneration: true
      }
    });

  } catch (error) {
    return createErrorResponse(error, '기본 문제 빠른 생성');
  }
}