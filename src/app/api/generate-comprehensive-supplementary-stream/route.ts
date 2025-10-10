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
다음 종합 문제의 **보완 문제 2개**를 생성해주세요.

⚠️ **중요: 원본 문제와 지시문 자체가 동일하거나 유사해서는 안 됩니다.**

각 보완 문제는 아래 **차별화 전략** 중 최소 2가지 이상을 적용하여 원본과 명확히 구분되어야 합니다:

**차별화 전략 8가지:**
1. **다른 정보 요구**: 원본이 A를 묻는다면 보완은 B 또는 C를 물어야 함
2. **다른 시간/순서**: 원본이 "먼저"를 묻는다면 보완은 "나중에", "과정", "결과" 등
3. **다른 범위**: 원본이 전체를 묻는다면 보완은 부분을, 원본이 부분이면 보완은 전체를
4. **다른 인과관계**: 원본이 원인을 묻는다면 보완은 결과를, 원본이 결과면 보완은 원인을
5. **다른 관점**: 원본이 긍정적 측면이면 보완은 부정적/중립적 측면, 또는 다른 주체의 관점
6. **다른 표현 방식**: 원본이 "이유"를 묻는다면 보완은 "목적", "방법", "특징" 등
7. **다른 지문 영역**: 원본이 1-3문단 기반이면 보완은 4-6문단 또는 전체 종합
8. **다른 사고 수준**: 원본이 단순 확인이면 보완은 비교/분석/추론, 원본이 추론이면 보완은 구체적 사실 확인

###원본 문제 정보
- **유형**: ${originalQuestion.type}
- **질문**: "${originalQuestion.question}"
${originalQuestion.options ? `- **선택지**:
  ${originalQuestion.options.map((opt: string, idx: number) => `${idx + 1}. ${opt}`).join('\n  ')}` : ''}
- **정답**: "${originalQuestion.answer}"

###지문
${body.passage}

###구분 (난이도 조절)
${divisionPrompt || `${body.division}에 적합한 난이도로 조절`}

###문제 유형 가이드라인
${typePrompt || `${originalQuestion.type} 유형의 문제를 생성하세요.`}

###각 보완 문제 역할
**첫 번째 보완 문제**: 원본 문제와 **완전히 다른 정보나 관점**을 다루되, 같은 유형으로 생성
- 원본과 다른 문단/영역을 활용하거나, 원본과 정반대 관점 제시
- 질문 구조 자체를 달리하기 (예: 원본이 "~은 무엇인가?"면 보완은 "~의 이유는?")

**두 번째 보완 문제**: 원본 및 첫 번째 보완과도 **명확히 구별**되는 제3의 관점
- 원본과 첫 번째 보완이 다루지 않은 새로운 정보 활용
- 시간적 순서, 인과관계, 범위 등에서 차별화

###금지 사항 (반드시 준수)
❌ 원본과 동일한 핵심 단어를 질문에 그대로 사용 금지
❌ 원본과 유사한 문장 구조 (예: "~의 이유는?", "~은 무엇인가?") 연속 사용 금지
❌ 원본과 같은 문단이나 같은 문장을 근거로 하는 문제 금지
❌ 선택지가 원본과 70% 이상 겹치는 경우 금지

###출력 형식 (JSON)
다음 JSON 배열 형식으로 정확히 2개 문제를 생성하십시오:
[
  {
    "question": "첫 번째 보완 문제 (원본과 완전히 다른 정보/관점)",
    "options": ["선택지1", "선택지2", "선택지3", "선택지4", "선택지5"],
    "answer": "정답",
    "answerInitials": "초성 힌트 (단답형일 때만)",
    "explanation": "해설 (어떤 차별화 전략을 사용했는지 간단히 언급)"
  },
  {
    "question": "두 번째 보완 문제 (원본 및 첫 번째와 모두 다른 제3의 관점)",
    "options": ["선택지1", "선택지2", "선택지3", "선택지4", "선택지5"],
    "answer": "정답",
    "answerInitials": "초성 힌트 (단답형일 때만)",
    "explanation": "해설 (어떤 차별화 전략을 사용했는지 간단히 언급)"
  }
]

###주의사항
- 반드시 위의 JSON 형식을 정확히 준수하십시오
- 단답형이 아닌 경우 options 배열을 포함하십시오
- 정답과 해설은 지문에 명확히 근거해야 합니다
- **각 보완 문제는 원본 문제 및 서로와도 명확히 구별되어야 합니다**
- 해설에 어떤 차별화 전략을 사용했는지 간단히 기재하십시오`;

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