import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface VocabularyTerm {
  term: string;
  definition: string;
  example_sentence: string;
}

interface ContextInfo {
  grade: string;
  subject: string;
  area: string;
  main_topic: string;
  sub_topic: string;
  keywords: string;
}

interface RegeneratePreviewRequest {
  terms: VocabularyTerm[];
  contextInfo: ContextInfo;
}

export async function POST(request: NextRequest) {
  try {
    const { terms, contextInfo }: RegeneratePreviewRequest = await request.json();

    if (!terms || !Array.isArray(terms) || terms.length === 0) {
      return NextResponse.json(
        { success: false, message: '재생성할 용어를 선택해주세요.' },
        { status: 400 }
      );
    }

    if (!contextInfo) {
      return NextResponse.json(
        { success: false, message: '콘텐츠 정보가 필요합니다.' },
        { status: 400 }
      );
    }

    // 병렬 처리를 위한 Promise 배열 생성
    const regenerationPromises = terms.map(async (termData) => {
      try {
        // GPT API를 사용하여 새로운 정의와 예문 생성
        const prompt = `
다음 용어에 대한 정의와 예문을 생성해주세요.

용어: ${termData.term}
학년: ${contextInfo.grade || ''}
과목: ${contextInfo.subject || ''}
영역: ${contextInfo.area || ''}
주제: ${contextInfo.main_topic || ''} - ${contextInfo.sub_topic || ''}
핵심개념어: ${contextInfo.keywords || ''}

요구사항:
1. 제시 된 어휘 뜻과 예시를 국가기초학력지원센터에서 제공하는 어휘 뜻풀이 및 예시 수준으로 작성해주세요.
2. 뜻은 한문장으로 제시하고, 예시는 1개만 제공해주세요.
3. 뜻은 개조식으로 문장(명사형) 형태여야 합니다. 단, 문장 끝 온점(.)은 제외
4. 예시는 항상 '~다.'로 끝나는 문장 형태여야 합니다.
5. 제시된 학년 수준으로 작성해주세요.

JSON 형식으로 답변:
{
  "definition": "정의 내용",
  "example_sentence": "예문 내용"
}`;

        const response = await openai.chat.completions.create({
          model: 'gpt-4.1',
          messages: [
            {
              role: 'system',
              content: '당신은 교육 전문가입니다. 학생의 수준에 맞는 명확하고 이해하기 쉬운 설명을 제공합니다.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          response_format: { type: "json_object" }
        });

        const generatedContent = JSON.parse(response.choices[0].message.content || '{}');

        return {
          success: true,
          data: {
            term: termData.term,
            original_definition: termData.definition,
            original_example: termData.example_sentence,
            new_definition: generatedContent.definition,
            new_example_sentence: generatedContent.example_sentence
          }
        };

      } catch (error) {
        console.error(`Error regenerating term ${termData.term}:`, error);
        return {
          success: false,
          term: termData.term,
          error: error instanceof Error ? error.message : '재생성 실패'
        };
      }
    });

    // 모든 Promise를 병렬로 실행
    const results = await Promise.all(regenerationPromises);

    // 결과 분리
    const regeneratedTerms = [];
    const errors = [];

    results.forEach(result => {
      if (result.success) {
        regeneratedTerms.push(result.data);
      } else {
        errors.push({
          term: result.term,
          error: result.error
        });
      }
    });

    if (regeneratedTerms.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: '모든 용어 재생성에 실패했습니다.',
          errors
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      regeneratedTerms,
      errors: errors.length > 0 ? errors : undefined,
      message: `${regeneratedTerms.length}개 용어가 재생성되었습니다.`
    });

  } catch (error) {
    console.error('Error in regenerate-preview API:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : '서버 오류가 발생했습니다.'
      },
      { status: 500 }
    );
  }
}
