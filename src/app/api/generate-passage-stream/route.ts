import { NextRequest, NextResponse } from 'next/server';
import { generatePassageStream, ModelType } from '@/lib/openai';
import { generatePassagePromptFromDB } from '@/lib/prompts';
import { PassageInput, AreaType } from '@/types';

// 오류 유형 정의
enum ErrorType {
  OPENAI_API_ERROR = 'OPENAI_API_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  INPUT_VALIDATION_ERROR = 'INPUT_VALIDATION_ERROR',
  GPT_RESPONSE_ERROR = 'GPT_RESPONSE_ERROR'
}

// 한국어 오류 메시지 매핑
const ERROR_MESSAGES = {
  [ErrorType.OPENAI_API_ERROR]: 'AI 서비스 연결에 문제가 있습니다. 잠시 후 다시 시도해 주세요.',
  [ErrorType.DATABASE_ERROR]: '데이터 처리 중 오류가 발생했습니다. 관리자에게 문의해 주세요.',
  [ErrorType.INPUT_VALIDATION_ERROR]: '입력된 정보가 올바르지 않습니다. 이전 단계를 확인해 주세요.',
  [ErrorType.GPT_RESPONSE_ERROR]: '지문 생성 형식에 오류가 있습니다. 다시 시도해 주세요.',
  UNKNOWN_ERROR: '지문 생성 중 예상하지 못한 오류가 발생했습니다.'
};

// 스트리밍 응답을 위한 텍스트 인코더
const encoder = new TextEncoder();

export async function POST(request: NextRequest) {
  try {
    const body: PassageInput & { model?: ModelType } = await request.json();
    const model = body.model || 'gpt-4.1';
    
    console.log('📝 Streaming request received:', JSON.stringify(body, null, 2));
    console.log('🎨 textType value:', body.textType);
    console.log(`🎯 선택된 모델: ${model}`);
    
    // 입력값 검증
    if (!body.division || !body.length || !body.subject || !body.grade || !body.area || !body.maintopic || !body.subtopic || !body.keyword) {
      return NextResponse.json(
        { error: '모든 필수 항목을 입력해주세요.' },
        { status: 400 }
      );
    }

    // 프롬프트 생성 (DB에서 조회, 실패 시 기본값 사용)
    const prompt = await generatePassagePromptFromDB(
      body.division,
      body.length,
      body.subject,
      body.grade,
      body.area as AreaType,
      body.maintopic,
      body.subtopic,
      body.keyword,
      body.textType,
      body.keywords_for_passages,
      body.keywords_for_questions
    );

    console.log('Generated prompt for streaming:', prompt);
    console.log('🔍 프롬프트 변수 치환 상태 확인:');
    console.log('- keywords_for_passages:', body.keywords_for_passages);
    console.log('- keywords_for_questions:', body.keywords_for_questions);
    console.log('- 치환된 프롬프트 내용 확인:', prompt.includes('{keywords_for_passages}') ? '❌ 미치환' : '✅ 치환완료');

    // 스트리밍 응답 생성
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 시작 메시지 전송
          const startMessage = {
            type: 'start',
            message: '지문 생성을 시작합니다...',
            timestamp: new Date().toISOString()
          };
          
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(startMessage)}\n\n`)
          );

          let accumulatedContent = '';
          let chunkCount = 0;
          let isStreamClosed = false;

          // GPT 스트리밍 호출
          for await (const chunk of generatePassageStream(prompt, model)) {
            if (isStreamClosed) break; // 스트림이 닫혔으면 중단
            
            chunkCount++;
            
            // 에러가 있는 경우
            if (chunk.error) {
              const errorMessage = {
                type: 'error',
                error: chunk.error,
                timestamp: new Date().toISOString()
              };
              
              try {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(errorMessage)}\n\n`)
                );
              } catch (e) {
                console.warn('Controller already closed, cannot send error message');
              }
              isStreamClosed = true;
              break;
            }

            accumulatedContent = chunk.content;
            
            // 진행 상황 메시지 (몇 개의 청크마다)
            if (chunkCount % 5 === 0 && !chunk.isComplete) {
              const progressMessage = {
                type: 'progress',
                message: `지문 생성 중... (${chunkCount}개 청크 처리됨)`,
                content: accumulatedContent,
                isComplete: false,
                timestamp: new Date().toISOString()
              };
              
              try {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(progressMessage)}\n\n`)
                );
              } catch (e) {
                console.warn('Controller already closed, cannot send progress message');
                isStreamClosed = true;
                break;
              }
            }

            // 완료되었을 때
            if (chunk.isComplete) {
              console.log('🎉 스트리밍 완료, 최종 내용 길이:', accumulatedContent.length);
              
              try {
                // JSON 파싱 시도
                const parsedResult = JSON.parse(accumulatedContent);
                
                const completeMessage = {
                  type: 'complete',
                  message: '지문 생성이 완료되었습니다!',
                  result: {
                    ...parsedResult,
                    _metadata: {
                      usedPrompt: prompt,
                      usedModel: model,
                      generatedAt: new Date().toISOString(),
                      totalChunks: chunkCount
                    }
                  },
                  timestamp: new Date().toISOString()
                };
                
                try {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify(completeMessage)}\n\n`)
                  );
                } catch (e) {
                  console.warn('Controller already closed, cannot send complete message');
                }
                
              } catch (parseError) {
                console.warn('JSON 파싱 실패, 원본 텍스트 반환:', parseError);
                
                const rawMessage = {
                  type: 'complete',
                  message: '지문 생성이 완료되었습니다! (원본 형식)',
                  result: {
                    raw: accumulatedContent,
                    _metadata: {
                      usedPrompt: prompt,
                      usedModel: model,
                      generatedAt: new Date().toISOString(),
                      totalChunks: chunkCount,
                      parseError: parseError instanceof Error ? parseError.message : String(parseError)
                    }
                  },
                  timestamp: new Date().toISOString()
                };
                
                try {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify(rawMessage)}\n\n`)
                  );
                } catch (e) {
                  console.warn('Controller already closed, cannot send raw message');
                }
              }
              
              isStreamClosed = true;
              break;
            }
          }

        } catch (error) {
          console.error('스트리밍 중 오류 발생:', error);
          
          const errorMessage = {
            type: 'error',
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString()
          };
          
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(errorMessage)}\n\n`)
          );
        } finally {
          controller.close();
        }
      },
    });

    // Server-Sent Events 헤더 설정
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Nginx 버퍼링 비활성화
      },
    });

  } catch (error) {
    console.error('스트리밍 API 초기화 오류:', error);
    
    return NextResponse.json(
      { 
        error: { 
          message: ERROR_MESSAGES.UNKNOWN_ERROR,
          type: 'INITIALIZATION_ERROR',
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    );
  }
}