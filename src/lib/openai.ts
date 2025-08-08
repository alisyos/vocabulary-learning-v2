import OpenAI from 'openai';

// OpenAI 클라이언트 초기화
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 지원하는 모델 타입
export type ModelType = 'gpt-4.1' | 'gpt-5';

// GPT API 호출 함수 (모델 선택 가능)
export async function callGPT(prompt: string, maxTokens: number = 2000, model: ModelType = 'gpt-4.1') {
  console.log(`🤖 OpenAI API 호출 - 모델: ${model}, maxTokens: ${maxTokens}`);
  
  try {
    const systemPrompt = '당신은 교육 콘텐츠 생성 전문가입니다. 주어진 지시사항에 따라 정확한 JSON 형식으로 응답해주세요.';
    
    let content: string | null = null;
    
    if (model === 'gpt-5') {
      console.log('🚀 GPT-5 API 사용 (responses.create)');
      // GPT-5 새로운 API 형식 사용
      const fullInput = `${systemPrompt}\n\n${prompt}`;
      
      const response = await client.responses.create({
        model: 'gpt-5',
        input: fullInput,
      });
      
      content = response.output_text;
    } else {
      console.log('📌 GPT-4.1 API 사용 (chat.completions.create)');
      // GPT-4.1 기존 API 형식 사용
      const response = await client.chat.completions.create({
        model: 'gpt-4.1',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: maxTokens,
        temperature: 0.7,
      });
      
      content = response.choices[0]?.message?.content || null;
    }
    
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
    console.error(`Error calling OpenAI API with model ${model}:`, error);
    throw error;
  }
}

// 지문 생성 전용 함수
export async function generatePassage(prompt: string, model: ModelType = 'gpt-4.1') {
  return await callGPT(prompt, 10000, model);
}

// 문제 생성 전용 함수
export async function generateQuestion(prompt: string, model: ModelType = 'gpt-4.1') {
  return await callGPT(prompt, 10000, model);
}