import { NextRequest, NextResponse } from 'next/server';
import { generateQuestion, ModelType } from '@/lib/openai';
import { generateVocabularyPrompt } from '@/lib/prompts';
import { VocabularyQuestion } from '@/types';

interface VocabularyGenerationRequest {
  terms: string[];  // 용어 목록 (footnote에서 추출)
  passage: string;  // 지문 내용 (맥락 제공용)
  division: string; // 구분 (난이도 조절용)
  model?: ModelType; // GPT 모델 선택
}

interface GeneratedQuestionData {
  question: string;
  options: string[];
  answer: string;
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

        // 프롬프트 생성 (DB에서 조회, 실패 시 기본값 사용)
        const { generateVocabularyPromptFromDB } = await import('@/lib/prompts');
        const prompt = await generateVocabularyPromptFromDB(
          termName,
          termDescription,
          body.passage,
          body.division
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
        if (result && typeof result === 'object' && 'question' in result) {
          const questionData = result as GeneratedQuestionData;
          
          console.log(`✅ Successfully parsed question for term "${termName}"`);
          
          vocabularyQuestions.push({
            id: `vocab_${i + 1}_${Date.now()}`,
            term: termName,
            question: questionData.question || '',
            options: questionData.options || [],
            answer: questionData.answer || '',
            explanation: questionData.explanation || ''
          });
        } else {
          console.log(`❌ Failed to parse question for term "${termName}" - result does not match expected format`);
        }

      } catch (termError) {
        console.error(`Error generating question for term "${term}":`, termError);
        
        // 실패한 용어는 기본 문제로 대체
        vocabularyQuestions.push({
          id: `vocab_${i + 1}_${Date.now()}`,
          term: term.split(':')[0]?.trim() || term,
          question: `다음 중 '${term.split(':')[0]?.trim() || term}'의 의미로 가장 적절한 것은?`,
          options: ['선택지 1', '선택지 2', '선택지 3', '선택지 4', '선택지 5'],
          answer: '선택지 1',
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
    console.error('Error in vocabulary generation:', error);
    return NextResponse.json(
      { error: '어휘 문제 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 