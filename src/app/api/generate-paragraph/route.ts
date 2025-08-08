import { NextRequest, NextResponse } from 'next/server';
import { generateQuestion, ModelType } from '@/lib/openai';
import { ParagraphQuestionWorkflow, ParagraphQuestionType } from '@/types';
import { db } from '@/lib/supabase';
import { getDivisionKey, getDivisionSubCategory } from '@/lib/prompts';

interface ParagraphGenerationRequest {
  paragraphs: string[];  // 선택된 문단들
  selectedParagraphs: number[];  // 선택된 문단 번호들 (1-based)
  questionType: ParagraphQuestionType;  // 문제 유형
  division: string; // 구분 (난이도 조절용)
  title: string;    // 지문 제목 (맥락 제공용)
  model?: ModelType; // GPT 모델 선택
}

interface GeneratedParagraphQuestionData {
  question: string;
  options?: string[];  // 객관식인 경우만
  wordSegments?: string[];  // 어절 순서 맞추기인 경우 어절들
  answer: string;
  answerInitials?: string;  // 주관식 단답형인 경우 초성
  explanation: string;
}

export async function POST(request: NextRequest) {
  try {
    const startTime = Date.now();
    const body: ParagraphGenerationRequest = await request.json();
    
    // 입력값 검증
    if (!body.paragraphs || !Array.isArray(body.paragraphs) || body.paragraphs.length === 0) {
      return NextResponse.json(
        { error: '문단 목록이 필요합니다.' },
        { status: 400 }
      );
    }

    if (!body.selectedParagraphs || !Array.isArray(body.selectedParagraphs) || body.selectedParagraphs.length === 0) {
      return NextResponse.json(
        { error: '선택된 문단이 필요합니다.' },
        { status: 400 }
      );
    }

    if (!body.questionType || !body.division || !body.title) {
      return NextResponse.json(
        { error: '문제 유형, 구분, 제목 정보가 필요합니다.' },
        { status: 400 }
      );
    }

    console.log('Generating paragraph questions for type:', body.questionType);

    const paragraphQuestions: ParagraphQuestionWorkflow[] = [];
    let lastUsedPrompt = '';
    
    // Random인 경우 각 문단별로 4가지 유형 1개씩 생성
    if (body.questionType === 'Random') {
      const questionTypes: Exclude<ParagraphQuestionType, 'Random'>[] = [
        '빈칸 채우기', '주관식 단답형', '어절 순서 맞추기', 'OX문제'
      ];
      
      // 각 선택된 문단에 대해
      for (const paragraphNumber of body.selectedParagraphs) {
        const paragraphText = body.paragraphs[paragraphNumber - 1];
        
        // 4가지 유형의 문제를 각각 생성
        for (let typeIndex = 0; typeIndex < questionTypes.length; typeIndex++) {
          const questionType = questionTypes[typeIndex];
          try {
            const { question, usedPrompt } = await generateSingleParagraphQuestion(
              paragraphText,
              paragraphNumber,
              questionType,
              body.division,
              body.title,
              1,
              body.model || 'gpt-4.1'
            );
            
            // 첫 번째 문제의 프롬프트를 저장 (대표 프롬프트로 사용)
            if (paragraphNumber === body.selectedParagraphs[0] && typeIndex === 0) {
              lastUsedPrompt = usedPrompt;
            }
            
            if (question) {
              paragraphQuestions.push(question);
            }
          } catch (error) {
            console.error(`Error generating ${questionType} question for paragraph ${paragraphNumber}:`, error);
          }
        }
      }
    } else {
      // 특정 유형인 경우 각 문단별로 해당 유형 4개씩 생성
      for (const paragraphNumber of body.selectedParagraphs) {
        const paragraphText = body.paragraphs[paragraphNumber - 1];
        
        // 각 문단에 대해 해당 유형의 문제를 4개 생성
        for (let questionIndex = 1; questionIndex <= 4; questionIndex++) {
          try {
            const { question, usedPrompt } = await generateSingleParagraphQuestion(
              paragraphText,
              paragraphNumber,
              body.questionType as Exclude<ParagraphQuestionType, 'Random'>,
              body.division,
              body.title,
              questionIndex,
              body.model || 'gpt-4.1'
            );
            
            // 첫 번째 문단의 첫 번째 문제의 프롬프트를 저장
            if (paragraphNumber === body.selectedParagraphs[0] && questionIndex === 1) {
              lastUsedPrompt = usedPrompt;
            }
            
            if (question) {
              paragraphQuestions.push(question);
            }
          } catch (error) {
            console.error(`Error generating ${body.questionType} question ${questionIndex} for paragraph ${paragraphNumber}:`, error);
          }
        }
      }
    }

    console.log(`Generated ${paragraphQuestions.length} paragraph questions`);

    // AI 생성 로그 저장
    try {
      await db.createAIGenerationLog({
        generation_type: 'paragraph',
        prompt_used: `문단 문제 생성 - 유형: ${body.questionType}, 선택된 문단: ${body.selectedParagraphs.length}개`,
        ai_response: JSON.stringify({
          questionType: body.questionType,
          selectedParagraphs: body.selectedParagraphs,
          generatedQuestions: paragraphQuestions.length,
          questions: paragraphQuestions
        }),
        tokens_used: paragraphQuestions.length * 100, // 추정값
        generation_time_ms: Date.now() - startTime,
        status: 'success'
      });
    } catch (logError) {
      console.error('Failed to save AI generation log:', logError);
    }

    return NextResponse.json({
      paragraphQuestions,
      totalGenerated: paragraphQuestions.length,
      message: '문단 문제가 성공적으로 생성되었습니다.',
      _metadata: {
        usedPrompt: lastUsedPrompt
      }
    });

  } catch (error) {
    console.error('Error in paragraph question generation:', error);
    return NextResponse.json(
      { error: '문단 문제 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 개별 문단 문제 생성 함수
async function generateSingleParagraphQuestion(
  paragraphText: string,
  paragraphNumber: number,
  questionType: Exclude<ParagraphQuestionType, 'Random'>,
  division: string,
  title: string,
  questionIndex: number = 1,
  model: ModelType = 'gpt-4.1'
): Promise<{ question: ParagraphQuestionWorkflow | null; usedPrompt: string }> {
  try {
    const prompt = await generateParagraphPrompt(
      paragraphText,
      questionType,
      division,
      title,
      questionIndex
    );

    console.log(`Generating ${questionType} question for paragraph ${paragraphNumber}`);

    // GPT API 호출 (모델 파라미터 포함)
    const result = await generateQuestion(prompt, model);

    // 결과 파싱 및 ParagraphQuestionWorkflow 형태로 변환
    if (result && typeof result === 'object' && 'question' in result) {
      const questionData = result as GeneratedParagraphQuestionData;
      
      return {
        question: {
          id: `paragraph_${paragraphNumber}_${questionType}_${questionIndex}_${Date.now()}`,
          type: questionType,
          paragraphNumber,
          paragraphText,
          question: questionData.question || '',
          options: questionData.options || undefined,
          wordSegments: questionData.wordSegments || undefined,
          answer: questionData.answer || '',
          answerInitials: questionData.answerInitials || undefined,
          explanation: questionData.explanation || ''
        },
        usedPrompt: prompt
      };
    }

    return { question: null, usedPrompt: prompt };

  } catch (error) {
    console.error(`Error generating single paragraph question:`, error);
    
    // 실패한 경우 기본 문제로 대체
    const prompt = await generateParagraphPrompt(paragraphText, questionType, division, title, questionIndex);
    return {
      question: {
        id: `paragraph_${paragraphNumber}_${questionType}_${questionIndex}_${Date.now()}`,
        type: questionType,
        paragraphNumber,
        paragraphText,
        question: `다음 문단에 대한 ${questionType} 문제입니다. (${questionIndex}번째)`,
        options: questionType === '주관식 단답형' || questionType === '어절 순서 맞추기' ? undefined : ['선택지 1', '선택지 2', '선택지 3', '선택지 4'],
        wordSegments: questionType === '어절 순서 맞추기' ? ['어절1', '어절2', '어절3', '어절4'] : undefined,
        answer: questionType === '어절 순서 맞추기' ? '어절1 어절2 어절3 어절4' : '1',
        answerInitials: questionType === '주관식 단답형' ? 'ㄱㄴㄷㄹ' : undefined,
        explanation: '문제 생성 중 오류가 발생하여 기본 문제로 대체되었습니다.'
      },
      usedPrompt: prompt
    };
  }
}

// 문단 문제 프롬프트 생성 함수
async function generateParagraphPrompt(
  paragraphText: string,
  questionType: Exclude<ParagraphQuestionType, 'Random'>,
  division: string,
  title: string,
  questionIndex: number = 1
): Promise<string> {
  try {
    // 1. 전체 시스템 프롬프트 가져오기
    console.log('🔍 시스템 프롬프트 조회 시작:', { category: 'paragraph', subCategory: 'paragraphSystem', key: 'system_base' });
    const systemPrompt = await db.getPromptByKey('paragraph', 'paragraphSystem', 'system_base');
    console.log('✅ 시스템 프롬프트 조회 완료:', systemPrompt.name);
    
    // 2. 문제 유형별 프롬프트 가져오기
    const typeKeyMap: Record<string, string> = {
      '빈칸 채우기': 'type_blank',
      '주관식 단답형': 'type_short_answer',
      '어절 순서 맞추기': 'type_order',
      'OX문제': 'type_ox'
    };
    
    const typeKey = typeKeyMap[questionType];
    if (!typeKey) {
      throw new Error(`Unknown question type: ${questionType}`);
    }
    
    console.log('🔍 문제 유형별 프롬프트 조회 시작:', { category: 'paragraph', subCategory: 'paragraphType', key: typeKey });
    const typePrompt = await db.getPromptByKey('paragraph', 'paragraphType', typeKey);
    console.log('✅ 문제 유형별 프롬프트 조회 완료:', typePrompt.name);
    
    // 3. 구분별 프롬프트 가져오기
    let divisionPromptText = '';
    try {
      console.log('🔍 구분별 프롬프트 조회 시작:', { division });
      const divisionKey = getDivisionKey(division);
      const divisionSubCategory = getDivisionSubCategory(division);
      const divisionPrompt = await db.getPromptByKey('division', divisionSubCategory, divisionKey);
      console.log('✅ 구분별 프롬프트 조회 완료:', divisionPrompt.name);
      divisionPromptText = divisionPrompt.promptText;
    } catch (error) {
      console.warn('⚠️ 구분별 프롬프트 조회 실패, 빈 문자열 사용:', error);
    }
    
    // 3. 프롬프트 템플릿에 변수 치환
    const questionIndexNote = questionIndex > 1 
      ? `이는 같은 문단에 대한 ${questionIndex}번째 ${questionType} 문제입니다. 이전 문제들과 다른 관점이나 다른 부분을 다루어 주세요.`
      : '';
    
    let finalPrompt = systemPrompt.promptText
      .replace(/{questionType}/g, questionType)
      .replace(/{questionIndexNote}/g, questionIndexNote)
      .replace(/{title}/g, title)
      .replace(/{grade}/g, division)
      .replace(/{paragraphText}/g, paragraphText)
      .replace(/{questionIndex}/g, questionIndex.toString())
      .replace(/{divisionPrompt}/g, divisionPromptText)
      .replace(/{specificPrompt}/g, typePrompt.promptText);
    
    console.log('✅ 문단 문제 프롬프트 생성 완료:', { questionType, questionIndex });
    return finalPrompt;
    
  } catch (error) {
    console.error('❌ 문단 문제 프롬프트 생성 실패:', error);
    
    // 폴백: 기존 하드코딩된 프롬프트 사용
    console.log('⚠️ 폴백 프롬프트 사용');
    return generateFallbackParagraphPrompt(paragraphText, questionType, division, title, questionIndex);
  }
}

// 폴백용 기존 프롬프트 생성 함수
function generateFallbackParagraphPrompt(
  paragraphText: string,
  questionType: Exclude<ParagraphQuestionType, 'Random'>,
  division: string,
  title: string,
  questionIndex: number = 1
): string {
  const questionIndexNote = questionIndex > 1 
    ? `이는 같은 문단에 대한 ${questionIndex}번째 ${questionType} 문제입니다. 이전 문제들과 다른 관점이나 다른 부분을 다루어 주세요.`
    : '';

  const basePrompt = `###지시사항
다음의 지문의 문단에 대한 ${questionType} 문제를 생성해주세요.
${questionIndexNote}

**지문 제목**: ${title}
**대상 학년**: ${division}
**문단 내용**: ${paragraphText}
**문제 번호**: ${questionIndex}번째 ${questionType} 문제

###구분 (난이도 조절)


###문제 유형별 요구사항
`;

  // 개별 문제 유형별 추가 요구사항 (questionIndex > 1인 경우)
  let specificPrompt = '';
  if (questionIndex > 1) {
    switch (questionType) {
      case '빈칸 채우기':
        specificPrompt = `- ${questionIndex}번째 문제이므로 이전 문제와 다른 단어나 위치를 빈칸으로 처리해 주세요. (총 4개 문제)`;
        break;
      case '주관식 단답형':
        specificPrompt = `- ${questionIndex}번째 문제이므로 문단의 다른 내용에 대한 질문을 만들어 주세요. 정답과 함께 초성 힌트를 제공하세요. (총 4개 문제)`;
        break;
      case '어절 순서 맞추기':
        specificPrompt = `- ${questionIndex}번째 문제이므로 이전 문제와 다른 문장을 선택하여 문제를 만들어 주세요. (총 4개 문제)`;
        break;
      case 'OX문제':
        specificPrompt = `- ${questionIndex}번째 문제이므로 문단의 다른 내용에 대한 참/거짓을 판단하는 문제를 만들어 주세요. (총 4개 문제)`;
        break;
    }
  }

  return basePrompt + specificPrompt + `

###주의사항
- ${division}에 맞는 어휘와 난이도 사용
- 명확하고 구체적인 문제 출제
- 정답과 오답이 명확히 구분되도록 작성
- 해설은 학생이 이해하기 쉽게 작성
- 반드시 JSON 형식으로만 응답

### 문제 유형별 상세 가이드라인

**빈칸 채우기**:
- 문단에서 핵심 어휘나 중요한 단어를 빈칸으로 처리
- 문맥에 맞는 적절한 단어를 선택하도록 하는 문제
- 어휘의 의미와 문맥 적절성을 평가

**주관식 단답형**:
- 문단의 내용을 바탕으로 간단한 답을 쓰는 문제
- 정답과 함께 반드시 초성 힌트를 제공 (예: 장래희망 → ㅈㄹㅎㅁ)
- 문단 이해도와 핵심 내용 파악 능력을 평가

**어절 순서 맞추기**:
- 문단에서 의미 있는 문장을 선택하여 어절들을 원형 번호로 제시
- 어절들을 올바른 순서로 배열했을 때의 번호 순서를 선택하는 문제
- 어절 배열과 문장 구성 능력을 평가

**OX문제**:
- 문단의 내용이 맞는지 틀린지 판단하는 문제
- 명확한 사실 확인이 가능한 내용으로 출제
- 문단 내용의 정확한 이해도를 평가

###출력 형식 (반드시 JSON 형식으로)

객관식 문제인 경우:
{
  "question": "문제 내용",
  "options": ["선택지1", "선택지2", "선택지3", "선택지4", "선택지5"],
  "answer": "1",
  "explanation": "정답 해설"
}

주관식 단답형인 경우:
{
  "question": "문제 내용",
  "answer": "정답 (예: 장래희망)",
  "answerInitials": "초성 힌트 (예: ㅈㄹㅎㅁ)",
  "explanation": "정답 해설"
}
`;
}