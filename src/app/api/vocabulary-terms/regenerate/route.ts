import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { termIds } = await request.json();

    if (!termIds || !Array.isArray(termIds) || termIds.length === 0) {
      return NextResponse.json(
        { success: false, message: '재생성할 용어를 선택해주세요.' },
        { status: 400 }
      );
    }

    // 선택된 용어들 조회
    const { data: terms, error: fetchError } = await supabase
      .from('vocabulary_terms')
      .select(`
        id,
        term,
        content_set_id,
        content_sets (
          grade,
          subject,
          area,
          main_topic,
          sub_topic,
          keywords
        )
      `)
      .in('id', termIds);

    if (fetchError) {
      console.error('Error fetching terms:', fetchError);
      return NextResponse.json(
        { success: false, message: '용어 조회 실패' },
        { status: 500 }
      );
    }

    if (!terms || terms.length === 0) {
      return NextResponse.json(
        { success: false, message: '선택된 용어를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 병렬 처리를 위한 Promise 배열 생성
    const regenerationPromises = terms.map(async (termData) => {
      try {
        const contentSet = termData.content_sets;

        // GPT API를 사용하여 새로운 정의와 예문 생성
        const prompt = `
다음 용어에 대한 정의와 예문을 생성해주세요.

용어: ${termData.term}
학년: ${contentSet?.grade || ''}
과목: ${contentSet?.subject || ''}
영역: ${contentSet?.area || ''}
주제: ${contentSet?.main_topic || ''} - ${contentSet?.sub_topic || ''}
핵심개념어: ${contentSet?.keywords || ''}

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
            id: termData.id,
            term: termData.term,
            original_definition: '', // 원본 정의는 클라이언트에서 가지고 있음
            original_example: '',
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
    console.error('Error in regenerate API:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : '서버 오류가 발생했습니다.'
      },
      { status: 500 }
    );
  }
}