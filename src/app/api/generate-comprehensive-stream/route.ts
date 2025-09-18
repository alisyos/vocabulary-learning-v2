import { NextRequest } from 'next/server';
import { generatePassageStream, ModelType } from '@/lib/openai';
import { generateComprehensivePromptFromDB } from '@/lib/prompts';

interface ComprehensiveGenerationRequest {
  passage: string;
  division: string;
  subject: string;
  area: string;
  questionTypes: string[];
  model?: ModelType;
}

export async function POST(request: NextRequest) {
  try {
    const body: ComprehensiveGenerationRequest = await request.json();
    
    // 입력값 검증
    if (!body.passage || !body.division || !body.subject || !body.area) {
      return new Response(
        JSON.stringify({ error: '필수 정보가 누락되었습니다.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!body.questionTypes || !Array.isArray(body.questionTypes) || body.questionTypes.length === 0) {
      return new Response(
        JSON.stringify({ error: '문제 유형이 선택되지 않았습니다.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('🚀 Starting streaming comprehensive generation for types:', body.questionTypes);
    console.log('📄 Request details:', {
      division: body.division,
      subject: body.subject,
      area: body.area,
      passageLength: body.passage.length,
      model: body.model
    });

    // 프롬프트 생성 - 첫 번째 유형 사용
    const questionType = body.questionTypes[0] || 'Random';
    const questionCount = body.questionTypes.length;
    
    console.log('📋 Using question type:', questionType, 'count:', questionCount);
    
    const prompt = await generateComprehensivePromptFromDB(
      questionType,
      body.passage,
      body.division,
      questionCount
    );
    
    console.log('✅ Prompt generated successfully:', prompt.length, 'characters');

    const model = body.model || 'gpt-4.1';

    // 스트리밍 응답 생성
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 스트리밍 시작 메시지
          controller.enqueue(encoder.encode('data: {"type":"start","message":"종합 문제 생성을 시작합니다..."}\n\n'));

          let fullContent = '';
          let chunkCount = 0;

          for await (const chunk of generatePassageStream(prompt, model)) {
            chunkCount++;
            
            if (chunk.error) {
              controller.enqueue(encoder.encode(`data: {"type":"error","error":"${chunk.error}"}\n\n`));
              break;
            }

            fullContent = chunk.content;

            // 주기적으로 진행 상황 전송 (매 10번째 청크마다)
            if (chunkCount % 10 === 0) {
              const progress = {
                type: 'progress',
                content: fullContent.substring(0, 500), // 미리보기
                totalChars: fullContent.length,
                message: `문제 생성 중... (${Math.min(Math.floor((fullContent.length / 10000) * 100), 90)}%)`
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(progress)}\n\n`));
            }

            if (chunk.isComplete) {
              // 완료 시 파싱 시도
              try {
                console.log('📝 GPT 전체 응답 내용 (first 1000 chars):', fullContent.substring(0, 1000));
                console.log('📝 GPT 전체 응답 길이:', fullContent.length);
                
                let parsedResult;
                
                // JSON 파싱 시도
                try {
                  parsedResult = JSON.parse(fullContent);
                  console.log('✅ 직접 JSON 파싱 성공');
                } catch (e) {
                  console.log('⚠️ 직접 JSON 파싱 실패, 코드 블록 추출 시도');
                  // JSON 파싱 실패 시 코드 블록 추출 시도
                  const jsonMatch = fullContent.match(/```json\n?([\s\S]*?)\n?```/);
                  if (jsonMatch) {
                    console.log('📝 코드 블록에서 JSON 추출:', jsonMatch[1].substring(0, 500));
                    parsedResult = JSON.parse(jsonMatch[1]);
                    console.log('✅ 코드 블록 JSON 파싱 성공');
                  } else {
                    console.log('⚠️ 코드 블록도 없음, 불완전한 JSON 복구 시도');
                    // 마지막 시도: 불완전한 JSON 복구
                    const cleanedContent = fullContent
                      .replace(/^[^{]*/, '') // 시작 부분의 비JSON 문자 제거
                      .replace(/[^}]*$/, ''); // 끝 부분의 비JSON 문자 제거
                    console.log('📝 정리된 콘텐츠:', cleanedContent.substring(0, 500));
                    parsedResult = JSON.parse(cleanedContent);
                    console.log('✅ 정리된 JSON 파싱 성공');
                  }
                }

                console.log('🗖️ 파싱된 결과 개체 구조:', Object.keys(parsedResult));
                console.log('🗖️ 파싱된 결과 샘플:', JSON.stringify(parsedResult, null, 2).substring(0, 1000));

                // 결과 검증 및 형식 정리
                let questions = parsedResult.comprehensiveQuestions || parsedResult.questions || [];
                
                // 단일 문제 객체인 경우 배열로 감싸기 (수정된 조건)
                if (questions.length === 0 && parsedResult.type && parsedResult.question) {
                  console.log('🔧 단일 문제 객체 감지, 배열로 변환');
                  console.log('🔍 변환 전 questions 길이:', questions.length);
                  console.log('🔍 parsedResult.type:', parsedResult.type);
                  
                  // GPT 응답 형식을 워크플로우 형식에 맞게 변환
                  const convertedQuestion = {
                    id: `comp_${parsedResult.type}_${Date.now()}`,
                    type: parsedResult.type,
                    question: parsedResult.question,
                    options: parsedResult.options,
                    answer: parsedResult.answer,
                    explanation: parsedResult.explanation,
                    questionFormat: parsedResult.questionFormat || 'multiple_choice'
                  };
                  
                  questions = [convertedQuestion];
                  console.log('🔧 변환 완료! 배열 길이:', questions.length);
                  console.log('🔍 변환된 첫 번째 문제 ID:', convertedQuestion.id);
                }
                
                console.log('📊 최종 배열 길이:', questions.length);
                console.log('📊 comprehensiveQuestions 필드:', !!parsedResult.comprehensiveQuestions);
                console.log('📊 questions 필드:', !!parsedResult.questions);
                console.log('📊 단일 객체 여부:', !!parsedResult.type);
                
                // 결과 전송
                const result = {
                  type: 'complete',
                  comprehensiveQuestions: questions,
                  totalGenerated: questions.length,
                  message: '종합 문제가 성공적으로 생성되었습니다.',
                  _metadata: {
                    requestedTypes: body.questionTypes,
                    generatedTypes: [...new Set(questions.map((q: any) => q.questionType))],
                    usedPrompt: prompt // 전체 프롬프트 반환
                  }
                };
                
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(result)}\n\n`));
              } catch (parseError) {
                console.error('Failed to parse streaming result:', parseError);
                controller.enqueue(encoder.encode(`data: {"type":"error","error":"결과 파싱 실패: ${parseError}"}\n\n`));
              }
            }
          }

          controller.enqueue(encoder.encode('data: {"type":"done"}\n\n'));
          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          controller.enqueue(
            encoder.encode(`data: {"type":"error","error":"${error instanceof Error ? error.message : '스트리밍 오류'}"}\n\n`)
          );
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Comprehensive generation error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : '종합 문제 생성 중 오류 발생' 
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}