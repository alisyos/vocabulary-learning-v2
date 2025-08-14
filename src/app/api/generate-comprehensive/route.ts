import { NextRequest, NextResponse } from 'next/server';
import { generateQuestion, ModelType } from '@/lib/openai';
import { generateComprehensivePrompt } from '@/lib/prompts';
import { ComprehensiveQuestion, ComprehensiveQuestionType } from '@/types';

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

    // 각 유형별로 정확한 개수만큼 문제 생성
    let isFirstType = true;
    for (const [currentType, count] of Object.entries(typeGroups)) {
      try {
        // 해당 유형의 문제 생성 (DB에서 조회, 실패 시 기본값 사용)
        const { generateComprehensivePromptFromDB } = await import('@/lib/prompts');
        const prompt = await generateComprehensivePromptFromDB(
          currentType,
          body.passage,
          body.division,
          count
        );

        // 첫 번째 유형의 프롬프트를 저장 (대표 프롬프트로 사용)
        if (isFirstType) {
          lastUsedPrompt = prompt;
          isFirstType = false;
        }

        console.log(`Generating ${count} ${currentType} questions`);

        // GPT API 호출 (모델 파라미터 포함)
        const model = body.model || 'gpt-4.1';
        const result = await generateQuestion(prompt, model);
        console.log(`API Response for ${currentType}:`, JSON.stringify(result, null, 2));

        // 결과 파싱 및 ComprehensiveQuestion 형태로 변환
        let questionSet: GeneratedQuestionSet | null = null;
        let singleQuestion: any = null;
        
        // raw 응답 처리
        if (result && typeof result === 'object' && 'raw' in result) {
          try {
            // raw 텍스트에서 JSON 추출 시도
            const rawText = result.raw as string;
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
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
          if ('questions' in result) {
            questionSet = result as GeneratedQuestionSet;
          } else if ('question' in result) {
            singleQuestion = result;
          }
        }
        
        // questions 배열이 있는 경우
        if (questionSet && questionSet.questions && Array.isArray(questionSet.questions)) {
          const questionsToAdd = questionSet.questions.slice(0, count);
          console.log(`Adding ${questionsToAdd.length} questions of type ${currentType} from questions array`);
          
          questionsToAdd.forEach((q, index) => {
            comprehensiveQuestions.push({
              id: `comp_${currentType.replace(/[^a-zA-Z0-9]/g, '_')}_${index + 1}_${Date.now()}`,
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
          
          comprehensiveQuestions.push({
            id: `comp_${currentType.replace(/[^a-zA-Z0-9]/g, '_')}_1_${Date.now()}`,
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

      } catch (setError) {
        console.error(`Error generating ${currentType} questions:`, setError);
        
        // 실패 시 기본 문제 생성 (요청한 개수만큼)
        for (let j = 0; j < count; j++) {
          comprehensiveQuestions.push({
            id: `comp_fallback_${currentType.replace(/[^a-zA-Z0-9]/g, '_')}_${j + 1}_${Date.now()}`,
            type: currentType as Exclude<ComprehensiveQuestionType, 'Random'>,
            question: `${currentType} 문제 ${j + 1}`,
            options: ['선택지 1', '선택지 2', '선택지 3', '선택지 4', '선택지 5'],
            answer: '선택지 1',
            answerInitials: undefined, // 새로운 유형은 모두 객관식
            explanation: '문제 생성 중 오류가 발생하여 기본 문제로 대체되었습니다.',
            isSupplementary: false // 기본 문제임을 명시
          });
        }
      }
    }

    // 보완 문제 생성 (선택사항)
    if (body.includeSupplementary) {
      console.log('Generating supplementary questions...');
      const supplementaryQuestions: ComprehensiveQuestion[] = [];
      const supplementaryModel = body.model || 'gpt-4.1'; // 보완 문제용 모델 설정
      
      // 각 기본 문제당 2개의 보완 문제 생성
      for (const originalQuestion of comprehensiveQuestions) {
        for (let supIndex = 1; supIndex <= 2; supIndex++) {
          try {
            // 보완 문제용 프롬프트 생성 (DB에서 필요한 프롬프트만 조회)
            const { getPromptFromDB, getDivisionSubCategory, getDivisionKey, getComprehensiveTypeKey } = await import('@/lib/prompts');
            
            // DB에서 구분 프롬프트와 문제 유형 프롬프트만 조회
            const divisionPrompt = await getPromptFromDB('division', getDivisionSubCategory(body.division), getDivisionKey(body.division));
            const typePrompt = await getPromptFromDB('comprehensive', 'comprehensiveType', getComprehensiveTypeKey(originalQuestion.type));
            
            console.log(`🔧 Supplementary question ${supIndex} DB queries:`, {
              divisionPrompt: divisionPrompt ? 'FROM DB' : 'FALLBACK',
              typePrompt: typePrompt ? 'FROM DB' : 'FALLBACK'
            });
            
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
            
            console.log(`✅ Using enhanced supplementary prompt for question ${supIndex}`);
            console.log(`🔧 보완 문제 생성 - 모델: ${supplementaryModel}`);

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
              supplementaryQuestions.push({
                id: `comp_sup_${originalQuestion.id}_${supIndex}_${Date.now()}`,
                type: originalQuestion.type,
                question: supplementaryQuestion.question,
                options: supplementaryQuestion.options,
                answer: supplementaryQuestion.answer,
                answerInitials: supplementaryQuestion.answerInitials || undefined, // 초성 힌트 추가
                explanation: supplementaryQuestion.explanation || '보완 문제입니다.',
                isSupplementary: true, // 보완 문제 표시
                originalQuestionId: originalQuestion.id // 원본 문제 ID 참조
              });
            }
          } catch (supError) {
            console.error(`Error generating supplementary question ${supIndex} for ${originalQuestion.id}:`, supError);
            
            // 실패 시 기본 보완 문제 생성
            supplementaryQuestions.push({
              id: `comp_sup_fallback_${originalQuestion.id}_${supIndex}_${Date.now()}`,
              type: originalQuestion.type,
              question: `${originalQuestion.type} 보완 문제 ${supIndex}`,
              options: ['선택지 1', '선택지 2', '선택지 3', '선택지 4', '선택지 5'],
              answer: '선택지 1',
              answerInitials: undefined, // 새로운 유형은 모두 객관식
              explanation: '보완 문제 생성 중 오류가 발생하여 기본 문제로 대체되었습니다.',
              isSupplementary: true,
              originalQuestionId: originalQuestion.id // 원본 문제 ID 참조
            });
          }
        }
      }
      
      // 기본 문제와 보완 문제 합치기
      comprehensiveQuestions.push(...supplementaryQuestions);
      console.log(`Generated ${supplementaryQuestions.length} supplementary questions`);
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
    console.error('Error in comprehensive question generation:', error);
    return NextResponse.json(
      { error: '종합 문제 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 