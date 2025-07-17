import OpenAI from 'openai';

// OpenAI 클라이언트 초기화
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// GPT API 호출 함수
export async function callGPT(prompt: string, maxTokens: number = 2000) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        {
          role: 'system',
          content: '당신은 교육 콘텐츠 생성 전문가입니다. 주어진 지시사항에 따라 정확한 JSON 형식으로 응답해주세요.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content received from OpenAI');
    }

    // JSON 파싱 시도
    try {
      return JSON.parse(content);
    } catch (parseError) {
      // JSON 파싱 실패 시 원본 텍스트 반환
      console.warn('Failed to parse JSON response:', parseError);
      return { raw: content };
    }
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    throw error;
  }
}

// 지문 생성 전용 함수
export async function generatePassage(prompt: string) {
  return await callGPT(prompt, 10000);
}

// 문제 생성 전용 함수
export async function generateQuestion(prompt: string) {
  return await callGPT(prompt, 10000);
}