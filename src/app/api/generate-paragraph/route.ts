import { NextRequest, NextResponse } from 'next/server';
import { generateQuestion } from '@/lib/openai';
import { ParagraphQuestionWorkflow, ParagraphQuestionType } from '@/types';
import { db } from '@/lib/supabase';

interface ParagraphGenerationRequest {
  paragraphs: string[];  // 선택된 문단들
  selectedParagraphs: number[];  // 선택된 문단 번호들 (1-based)
  questionType: ParagraphQuestionType;  // 문제 유형
  division: string; // 구분 (난이도 조절용)
  title: string;    // 지문 제목 (맥락 제공용)
}

interface GeneratedParagraphQuestionData {
  question: string;
  options: string[];
  answer: string;
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
    
    // Random인 경우 각 문단별로 5가지 유형 1개씩 생성
    if (body.questionType === 'Random') {
      const questionTypes: Exclude<ParagraphQuestionType, 'Random'>[] = [
        '어절 순서 맞추기', '빈칸 채우기', '유의어 고르기', '반의어 고르기', '문단 요약'
      ];
      
      // 각 선택된 문단에 대해
      for (const paragraphNumber of body.selectedParagraphs) {
        const paragraphText = body.paragraphs[paragraphNumber - 1];
        
        // 5가지 유형의 문제를 각각 생성
        for (const questionType of questionTypes) {
          try {
            const question = await generateSingleParagraphQuestion(
              paragraphText,
              paragraphNumber,
              questionType,
              body.division,
              body.title
            );
            
            if (question) {
              paragraphQuestions.push(question);
            }
          } catch (error) {
            console.error(`Error generating ${questionType} question for paragraph ${paragraphNumber}:`, error);
          }
        }
      }
    } else {
      // 특정 유형인 경우 각 문단별로 해당 유형 5개씩 생성
      for (const paragraphNumber of body.selectedParagraphs) {
        const paragraphText = body.paragraphs[paragraphNumber - 1];
        
        // 각 문단에 대해 해당 유형의 문제를 5개 생성
        for (let questionIndex = 1; questionIndex <= 5; questionIndex++) {
          try {
            const question = await generateSingleParagraphQuestion(
              paragraphText,
              paragraphNumber,
              body.questionType as Exclude<ParagraphQuestionType, 'Random'>,
              body.division,
              body.title,
              questionIndex  // 같은 유형의 몇 번째 문제인지 전달
            );
            
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
      message: '문단 문제가 성공적으로 생성되었습니다.'
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
  questionIndex: number = 1
): Promise<ParagraphQuestionWorkflow | null> {
  try {
    const prompt = generateParagraphPrompt(
      paragraphText,
      questionType,
      division,
      title,
      questionIndex
    );

    console.log(`Generating ${questionType} question for paragraph ${paragraphNumber}`);

    // GPT API 호출
    const result = await generateQuestion(prompt);

    // 결과 파싱 및 ParagraphQuestionWorkflow 형태로 변환
    if (result && typeof result === 'object' && 'question' in result) {
      const questionData = result as GeneratedParagraphQuestionData;
      
      return {
        id: `paragraph_${paragraphNumber}_${questionType}_${questionIndex}_${Date.now()}`,
        type: questionType,
        paragraphNumber,
        paragraphText,
        question: questionData.question || '',
        options: questionData.options || [],
        answer: questionData.answer || '',
        explanation: questionData.explanation || ''
      };
    }

    return null;

  } catch (error) {
    console.error(`Error generating single paragraph question:`, error);
    
    // 실패한 경우 기본 문제로 대체
    return {
      id: `paragraph_${paragraphNumber}_${questionType}_${questionIndex}_${Date.now()}`,
      type: questionType,
      paragraphNumber,
      paragraphText,
      question: `다음 문단에 대한 ${questionType} 문제입니다. (${questionIndex}번째)`,
      options: ['선택지 1', '선택지 2', '선택지 3', '선택지 4'],
      answer: '1',
      explanation: '문제 생성 중 오류가 발생하여 기본 문제로 대체되었습니다.'
    };
  }
}

// 문단 문제 프롬프트 생성 함수
function generateParagraphPrompt(
  paragraphText: string,
  questionType: Exclude<ParagraphQuestionType, 'Random'>,
  division: string,
  title: string,
  questionIndex: number = 1
): string {
  const basePrompt = `
다음 지문의 문단에 대한 ${questionType} 문제를 생성해주세요.
${questionIndex > 1 ? `이는 같은 문단에 대한 ${questionIndex}번째 ${questionType} 문제입니다. 이전 문제들과 다른 관점이나 다른 부분을 다루어 주세요.` : ''}

**지문 제목**: ${title}
**대상 학년**: ${division}
**문단 내용**: ${paragraphText}
**문제 번호**: ${questionIndex}번째 ${questionType} 문제

**문제 유형별 요구사항**:
`;

  let specificPrompt = '';

  switch (questionType) {
    case '어절 순서 맞추기':
      specificPrompt = `
- 문단에서 의미 있는 문장을 선택하여 어절들을 번호로 제시
- 어절들을 올바른 순서로 배열했을 때의 번호 순서를 선택하는 문제
- 문제 형식: "[어절 순서 맞추기] 다음 어절들을 올바른 문장 순서로 배열했을 때, 알맞은 번호 순서를 고르세요."
- 어절 목록: 각 어절에 번호를 매겨 목록으로 제시 (예: 1. 갔다, 2. 나는, 3. 학교에)
- 선택지: 번호 순서의 조합으로 제시 (예: ① 2-3-1, ② 1-2-3, ③ 3-2-1, ④ 2-1-3)
- 4개의 선택지로 제시 (정답 1개, 오답 3개)
- 어절 배열과 문장 구성 능력을 평가
${questionIndex > 1 ? `- ${questionIndex}번째 문제이므로 이전 문제와 다른 문장을 선택하여 문제를 만들어 주세요` : ''}
`;
      break;

    case '빈칸 채우기':
      specificPrompt = `
- 문단에서 핵심 어휘나 중요한 단어를 빈칸으로 처리
- 문맥에 맞는 적절한 단어를 선택하도록 하는 문제
- 4개 또는 5개의 선택지로 제시
- 어휘의 의미와 문맥 적절성을 평가
${questionIndex > 1 ? `- ${questionIndex}번째 문제이므로 이전 문제와 다른 단어나 위치를 빈칸으로 처리해 주세요` : ''}
`;
      break;

    case '유의어 고르기':
      specificPrompt = `
- 문단에서 특정 단어를 제시하고, 유사한 의미의 단어를 찾는 문제
- 제시된 단어와 비슷한 의미를 가진 선택지 제공
- 4개의 선택지로 제시 (정답 1개, 오답 3개)
- 어휘 확장 및 의미군 이해를 평가
${questionIndex > 1 ? `- ${questionIndex}번째 문제이므로 이전 문제와 다른 단어를 선택하여 유의어를 찾는 문제를 만들어 주세요` : ''}
`;
      break;

    case '반의어 고르기':
      specificPrompt = `
- 문단에서 특정 단어를 제시하고, 반대 의미의 단어를 찾는 문제
- 제시된 단어와 반대 의미를 가진 선택지 제공
- 4개의 선택지로 제시 (정답 1개, 오답 3개)
- 어휘 관계 이해를 평가
${questionIndex > 1 ? `- ${questionIndex}번째 문제이므로 이전 문제와 다른 단어를 선택하여 반의어를 찾는 문제를 만들어 주세요` : ''}
`;
      break;

    case '문단 요약':
      specificPrompt = `
- 문단의 핵심 내용을 가장 잘 요약한 문장을 선택하는 문제
- 문단의 주요 정보와 핵심 메시지를 파악하는 능력 평가
- 4개의 선택지로 제시 (정답 1개, 오답 3개)
- 독해력과 요약 능력을 평가
${questionIndex > 1 ? `- ${questionIndex}번째 문제이므로 문단의 다른 측면이나 다른 관점에서 요약하는 문제를 만들어 주세요` : ''}
`;
      break;
  }

  return basePrompt + specificPrompt + `

**출력 형식** (반드시 JSON 형식으로):
${questionType === '어절 순서 맞추기' ? `
{
  "question": "[어절 순서 맞추기]\\n[문제] 다음 어절들을 올바른 문장 순서로 배열했을 때, 알맞은 번호 순서를 고르세요.\\n[어절 목록]\\n1. 어절1\\n2. 어절2\\n3. 어절3",
  "options": ["① 2-3-1", "② 1-2-3", "③ 3-2-1", "④ 2-1-3"],
  "answer": "1",
  "explanation": "정답 해설 (정해진 문장도 함께 제시)"
}` : `
{
  "question": "문제 내용",
  "options": ["선택지1", "선택지2", "선택지3", "선택지4"],
  "answer": "1",
  "explanation": "정답 해설"
}`}

**주의사항**:
- ${division}에 맞는 어휘와 난이도 사용
- 명확하고 구체적인 문제 출제
- 정답과 오답이 명확히 구분되도록 작성
- 해설은 학생이 이해하기 쉽게 작성
- 반드시 JSON 형식으로만 응답
`;
}