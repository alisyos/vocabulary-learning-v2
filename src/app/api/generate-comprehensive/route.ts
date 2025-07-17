import { NextRequest, NextResponse } from 'next/server';
import { generateQuestion } from '@/lib/openai';
import { generateComprehensivePrompt } from '@/lib/prompts';
import { ComprehensiveQuestion, ComprehensiveQuestionType } from '@/types';

interface ComprehensiveGenerationRequest {
  passage: string;  // 지문 내용 (수정된 지문)
  division: string; // 구분 (난이도 조절용)
  questionType: ComprehensiveQuestionType; // 문제 유형
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

    console.log('Generating comprehensive questions:', body.questionType);

    const comprehensiveQuestions: ComprehensiveQuestion[] = [];
    
    // 문제 유형 결정
    let typesToGenerate: string[] = [];
    
    if (body.questionType === 'Random') {
      // Random 선택 시: 4가지 유형을 3개씩 총 12개
      typesToGenerate = [
        '단답형', '단답형', '단답형',
        '문단별 순서 맞추기', '문단별 순서 맞추기', '문단별 순서 맞추기',
        '핵심 내용 요약', '핵심 내용 요약', '핵심 내용 요약',
        '핵심어/핵심문장 찾기', '핵심어/핵심문장 찾기', '핵심어/핵심문장 찾기'
      ];
    } else {
      // 특정 유형 선택 시: 해당 유형 12개
      typesToGenerate = Array(12).fill(body.questionType);
    }

    // 각 유형별로 문제 생성 (3개씩 묶어서 처리)
    for (let i = 0; i < typesToGenerate.length; i += 3) {
      const currentType = typesToGenerate[i];
      
      try {
        // 프롬프트 생성 (3개씩)
        const prompt = generateComprehensivePrompt(
          currentType,
          body.passage,
          body.division
        );

        console.log(`Generating ${currentType} questions (set ${Math.floor(i/3) + 1})`);

        // GPT API 호출
        const result = await generateQuestion(prompt);

        // 결과 파싱 및 ComprehensiveQuestion 형태로 변환
        if (result && typeof result === 'object' && 'questions' in result) {
          const questionSet = result as GeneratedQuestionSet;
          
          if (questionSet.questions && Array.isArray(questionSet.questions)) {
            questionSet.questions.forEach((q, index) => {
              comprehensiveQuestions.push({
                id: `comp_${currentType.replace(/[^a-zA-Z0-9]/g, '_')}_${i + index + 1}_${Date.now()}`,
                type: currentType as Exclude<ComprehensiveQuestionType, 'Random'>,
                question: q.question || '',
                options: q.options || undefined,
                answer: q.answer || '',
                explanation: q.explanation || ''
              });
            });
          }
        }

      } catch (setError) {
        console.error(`Error generating ${currentType} questions:`, setError);
        
        // 실패한 세트는 기본 문제로 대체
        for (let j = 0; j < 3; j++) {
          comprehensiveQuestions.push({
            id: `comp_fallback_${i + j + 1}_${Date.now()}`,
            type: currentType as Exclude<ComprehensiveQuestionType, 'Random'>,
            question: `${currentType} 문제 ${j + 1}`,
            options: currentType !== '단답형' ? ['선택지 1', '선택지 2', '선택지 3', '선택지 4', '선택지 5'] : undefined,
            answer: currentType !== '단답형' ? '선택지 1' : '기본 답안',
            explanation: '문제 생성 중 오류가 발생하여 기본 문제로 대체되었습니다.'
          });
        }
      }
    }

    console.log(`Generated ${comprehensiveQuestions.length} comprehensive questions`);

    return NextResponse.json({
      comprehensiveQuestions,
      totalGenerated: comprehensiveQuestions.length,
      questionType: body.questionType,
      typeDistribution: body.questionType === 'Random' 
        ? { '단답형': 3, '문단별 순서 맞추기': 3, '핵심 내용 요약': 3, '핵심어/핵심문장 찾기': 3 }
        : { [body.questionType]: 12 },
      message: '종합 문제가 성공적으로 생성되었습니다.'
    });

  } catch (error) {
    console.error('Error in comprehensive question generation:', error);
    return NextResponse.json(
      { error: '종합 문제 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 