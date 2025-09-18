import { NextRequest } from 'next/server';
import { generatePassageStream, ModelType } from '@/lib/openai';
import { ComprehensiveQuestion } from '@/types';

interface SupplementaryStreamRequest {
  passage: string;
  division: string;
  basicQuestions: ComprehensiveQuestion[]; // 기본 문제들
  model?: ModelType;
}

export async function POST(request: NextRequest) {
  try {
    const body: SupplementaryStreamRequest = await request.json();
    
    // 입력값 검증
    if (!body.passage || !body.division || !body.basicQuestions || !Array.isArray(body.basicQuestions)) {
      return new Response(
        JSON.stringify({ error: '지문 내용, 구분, 기본 문제 목록이 모두 필요합니다.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (body.basicQuestions.length === 0) {
      return new Response(
        JSON.stringify({ error: '기본 문제가 없습니다. 기본 문제를 먼저 생성해주세요.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 첫 번째 기본 문제를 대상으로 보완 문제 생성 (스트리밍은 단일 기본 문제당)
    const originalQuestion = body.basicQuestions[0];
    
    console.log(`🚀 Starting streaming supplementary generation for: ${originalQuestion.type}`);
    console.log('📄 Request details:', {
      division: body.division,
      passageLength: body.passage.length,
      originalQuestionType: originalQuestion.type,
      model: body.model
    });

    // 보완 문제용 프롬프트 생성
    const { getPromptFromDB, getDivisionSubCategory, getDivisionKey, getComprehensiveTypeKey } = await import('@/lib/prompts');
    
    // DB에서 구분 프롬프트와 문제 유형 프롬프트 조회
    const divisionPrompt = await getPromptFromDB('division', getDivisionSubCategory(body.division), getDivisionKey(body.division));
    const typePrompt = await getPromptFromDB('comprehensive', 'comprehensiveType', getComprehensiveTypeKey(originalQuestion.type));
    
    // 보완 문제 전용 프롬프트 (2개 문제 동시 생성에 특화)
    const supplementaryPrompt = `###지시사항
다음 종합 문제의 보완 문제 2개를 생성해주세요.
- 원본 문제와 같은 유형이지만 서로 다른 관점에서 접근
- 학습 강화를 위한 추가 연습 문제로 제작
- 오답 시 학습에 도움이 되는 내용으로 구성
- 지문에 직접 언급된 내용이나 논리적으로 추론 가능한 내용만 활용
- 2개 문제는 서로 다른 내용과 접근 방식을 가져야 함

###원본 문제 정보
- 유형: ${originalQuestion.type}
- 질문: "${originalQuestion.question}"
- 정답: "${originalQuestion.answer}"

###지문
${body.passage}

###구분 (난이도 조절)
${divisionPrompt || `${body.division}에 적합한 난이도로 조절`}

###문제 유형 가이드라인
${typePrompt || `${originalQuestion.type} 유형의 문제를 생성하세요.`}

###출력 형식 (JSON)
다음 JSON 배열 형식으로 정확히 2개 문제를 생성하십시오:
[
  {
    "question": "첫 번째 보완 문제 내용",
    "options": ["선택지1", "선택지2", "선택지3", "선택지4", "선택지5"],
    "answer": "정답",
    "answerInitials": "초성 힌트 (단답형일 때만, 예: ㅈㄹㅎㅁ)",
    "explanation": "해설"
  },
  {
    "question": "두 번째 보완 문제 내용",
    "options": ["선택지1", "선택지2", "선택지3", "선택지4", "선택지5"],
    "answer": "정답",
    "answerInitials": "초성 힌트 (단답형일 때만, 예: ㅈㄹㅎㅁ)",
    "explanation": "해설"
  }
]

###주의사항
- 반드시 위의 JSON 형식을 정확히 준수하십시오
- 단답형이 아닌 경우 options 배열을 포함하십시오
- 단답형인 경우 options는 생략 가능합니다
- 정답과 해설은 지문에 명확히 근거해야 합니다
- 원본 문제와 중복되지 않는 새로운 관점의 문제를 생성하십시오`;

    console.log('✅ Supplementary prompt generated successfully:', supplementaryPrompt.length, 'characters');

    const model = body.model || 'gpt-4.1';

    // 스트리밍 응답 생성
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 스트리밍 시작 메시지
          controller.enqueue(encoder.encode(`data: {"type":"start","message":"${originalQuestion.type} 보완 문제 생성을 시작합니다..."}\n\n`));

          let fullContent = '';
          let chunkCount = 0;

          for await (const chunk of generatePassageStream(supplementaryPrompt, model)) {
            chunkCount++;
            
            if (chunk.error) {
              controller.enqueue(encoder.encode(`data: {"type":"error","error":"${chunk.error}"}\n\n`));
              break;
            }

            fullContent = chunk.content;

            // 주기적으로 진행 상황 전송 (매 5번째 청크마다 - 보완문제는 더 자주)
            if (chunkCount % 5 === 0) {
              const progress = {
                type: 'progress',
                content: fullContent.substring(0, 300), // 보완문제는 더 짧게 미리보기
                totalChars: fullContent.length,
                message: `${originalQuestion.type} 보완 문제 생성 중... (${Math.min(Math.floor((fullContent.length / 8000) * 100), 90)}%)`
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(progress)}\n\n`));
            }

            if (chunk.isComplete) {
              // 완료 시 파싱 시도
              try {
                console.log(`📝 ${originalQuestion.type} 보완 문제 GPT 전체 응답 내용 (first 800 chars):`, fullContent.substring(0, 800));
                console.log(`📝 ${originalQuestion.type} 보완 문제 GPT 전체 응답 길이:`, fullContent.length);
                
                let parsedResult;
                
                // JSON 파싱 시도
                try {
                  // 배열 패턴 먼저 찾기
                  const arrayMatch = fullContent.match(/\[[\s\S]*\]/);
                  if (arrayMatch) {
                    parsedResult = JSON.parse(arrayMatch[0]);
                  } else {
                    // 배열이 없으면 개별 JSON 객체 찾기 (fallback)
                    const jsonMatch = fullContent.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                      const singleQuestion = JSON.parse(jsonMatch[0]);
                      parsedResult = [singleQuestion]; // 단일 문제를 배열로 감싸기
                    }
                  }
                } catch (parseError) {
                  console.error('JSON 파싱 실패, 원본 응답 사용:', parseError);
                  parsedResult = [];
                }

                // 결과 검증 및 변환
                const supplementaryQuestions = [];
                if (Array.isArray(parsedResult) && parsedResult.length > 0) {
                  for (let i = 0; i < Math.min(parsedResult.length, 2); i++) {
                    const supQ = parsedResult[i];
                    if (supQ?.question) {
                      supplementaryQuestions.push({
                        id: `comp_sup_stream_${originalQuestion.id}_${i + 1}_${Date.now()}`,
                        type: originalQuestion.type,
                        question: supQ.question,
                        options: supQ.options,
                        answer: supQ.answer,
                        answerInitials: supQ.answerInitials || undefined,
                        explanation: supQ.explanation || '보완 문제입니다.',
                        isSupplementary: true,
                        originalQuestionId: originalQuestion.id
                      });
                    }
                  }
                }

                console.log(`✅ ${originalQuestion.type} 보완 문제 생성 완료:`, supplementaryQuestions.length, '개');

                // 완료 메시지 전송
                const completeMessage = {
                  type: 'complete',
                  supplementaryQuestions: supplementaryQuestions,
                  totalGenerated: supplementaryQuestions.length,
                  message: `${originalQuestion.type} 보완 문제 ${supplementaryQuestions.length}개 생성 완료`,
                  _metadata: {
                    originalQuestionId: originalQuestion.id,
                    originalQuestionType: originalQuestion.type,
                    usedPrompt: supplementaryPrompt,
                    processingTime: new Date().toISOString()
                  }
                };

                controller.enqueue(encoder.encode(`data: ${JSON.stringify(completeMessage)}\n\n`));

              } catch (error) {
                console.error(`❌ ${originalQuestion.type} 보완 문제 파싱 오류:`, error);
                controller.enqueue(encoder.encode(`data: {"type":"error","error":"보완 문제 파싱 중 오류가 발생했습니다."}\n\n`));
              }

              // 스트림 종료
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
              break;
            }
          }
        } catch (error) {
          console.error('❌ 보완 문제 스트리밍 오류:', error);
          controller.enqueue(encoder.encode(`data: {"type":"error","error":"${error instanceof Error ? error.message : String(error)}"}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('❌ 보완 문제 스트리밍 API 오류:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : '보완 문제 생성 중 예상하지 못한 오류가 발생했습니다.' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}