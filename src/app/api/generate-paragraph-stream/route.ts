import { NextRequest } from 'next/server';
import { generatePassageStream, ModelType } from '@/lib/openai';
import { ParagraphQuestionType } from '@/types';
import { db } from '@/lib/supabase';
import { getDivisionKey, getDivisionSubCategory } from '@/lib/prompts';

interface ParagraphGenerationRequest {
  paragraphs: string[];
  selectedParagraphs: number[];
  questionType: ParagraphQuestionType;
  division: string;
  title: string;
  model?: ModelType;
}

export async function POST(request: NextRequest) {
  try {
    const body: ParagraphGenerationRequest = await request.json();
    
    // 입력값 검증
    if (!body.paragraphs || !Array.isArray(body.paragraphs) || body.paragraphs.length === 0) {
      return new Response(
        JSON.stringify({ error: '문단 목록이 필요합니다.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!body.selectedParagraphs || !Array.isArray(body.selectedParagraphs) || body.selectedParagraphs.length === 0) {
      return new Response(
        JSON.stringify({ error: '선택된 문단이 필요합니다.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!body.questionType || !body.division || !body.title) {
      return new Response(
        JSON.stringify({ error: '문제 유형, 구분, 제목 정보가 필요합니다.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 선택된 문단 번호 유효성 검증
    for (const paragraphNumber of body.selectedParagraphs) {
      if (paragraphNumber < 1 || paragraphNumber > body.paragraphs.length) {
        return new Response(
          JSON.stringify({ error: `잘못된 문단 번호입니다: ${paragraphNumber}` }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('🚀 Starting streaming paragraph generation for type:', body.questionType);

    // 통합 프롬프트 생성
    const prompt = await generateBatchParagraphPrompt(
      body.paragraphs,
      body.selectedParagraphs,
      body.questionType,
      body.division,
      body.title
    );

    const model = body.model || 'gpt-4.1';

    // 스트리밍 응답 생성
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 스트리밍 시작 메시지
          controller.enqueue(encoder.encode('data: {"type":"start","message":"문단 문제 생성을 시작합니다..."}\n\n'));

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
                message: `문단 문제 생성 중... (${Math.min(Math.floor((fullContent.length / 8000) * 100), 90)}%)`
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(progress)}\n\n`));
            }

            if (chunk.isComplete) {
              // 완료 시 파싱 시도
              try {
                console.log('🔍 Raw GPT response length:', fullContent.length);
                console.log('🔍 Raw GPT response preview:', fullContent.substring(0, 200) + '...');
                
                let parsedResult;
                
                // 1단계: 직접 JSON 파싱 시도
                try {
                  parsedResult = JSON.parse(fullContent);
                  console.log('✅ Direct JSON parsing successful');
                } catch (directParseError) {
                  console.log('❌ Direct JSON parsing failed:', directParseError.message);
                  
                  // 2단계: JSON 코드 블록 추출 시도
                  const jsonMatch = fullContent.match(/```json\n?([\s\S]*?)\n?```/);
                  if (jsonMatch) {
                    try {
                      parsedResult = JSON.parse(jsonMatch[1]);
                      console.log('✅ JSON code block parsing successful');
                    } catch (blockParseError) {
                      console.log('❌ JSON code block parsing failed:', blockParseError.message);
                      throw blockParseError;
                    }
                  } else {
                    // 3단계: 더 강력한 JSON 추출 시도
                    console.log('🔧 Attempting advanced JSON extraction...');
                    
                    // JSON 객체 경계 찾기 (중괄호 매칭)
                    let jsonStart = fullContent.indexOf('{');
                    let jsonEnd = -1;
                    
                    if (jsonStart !== -1) {
                      let braceCount = 0;
                      for (let i = jsonStart; i < fullContent.length; i++) {
                        if (fullContent[i] === '{') braceCount++;
                        if (fullContent[i] === '}') braceCount--;
                        if (braceCount === 0) {
                          jsonEnd = i;
                          break;
                        }
                      }
                    }
                    
                    if (jsonStart !== -1 && jsonEnd !== -1) {
                      const extractedJson = fullContent.substring(jsonStart, jsonEnd + 1);
                      console.log('🔍 Extracted JSON:', extractedJson.substring(0, 200) + '...');
                      
                      try {
                        parsedResult = JSON.parse(extractedJson);
                        console.log('✅ Advanced JSON extraction successful');
                      } catch (advancedParseError) {
                        console.log('❌ Advanced JSON extraction failed:', advancedParseError.message);
                        
                        // 4단계: 마지막 시도 - 정규식으로 정리
                        const cleanedContent = fullContent
                          .replace(/^[^{]*/, '') // 시작 부분의 비JSON 문자 제거
                          .replace(/[^}]*$/, '') // 끝 부분의 비JSON 문자 제거
                          .replace(/\n/g, ' ') // 개행 문자 제거
                          .replace(/\s+/g, ' ') // 연속 공백 정리
                          .trim();
                        
                        console.log('🔧 Final cleanup attempt:', cleanedContent.substring(0, 200) + '...');
                        parsedResult = JSON.parse(cleanedContent);
                        console.log('✅ Final cleanup successful');
                      }
                    } else {
                      throw new Error('No valid JSON object found in response');
                    }
                  }
                }

                // 결과 검증 및 형식 정리
                console.log('🔍 Parsed result structure:', Object.keys(parsedResult));
                console.log('🔍 Parsed result type:', typeof parsedResult);
                
                let questions = [];
                
                // 다양한 응답 구조에 대응
                if (parsedResult.paragraphQuestions && Array.isArray(parsedResult.paragraphQuestions)) {
                  questions = parsedResult.paragraphQuestions;
                  console.log('✅ Found questions in paragraphQuestions field');
                } else if (parsedResult.questions && Array.isArray(parsedResult.questions)) {
                  questions = parsedResult.questions;
                  console.log('✅ Found questions in questions field');
                } else if (Array.isArray(parsedResult)) {
                  questions = parsedResult;
                  console.log('✅ Found questions as direct array');
                } else if (parsedResult.question) {
                  // 단일 문제인 경우
                  questions = [parsedResult];
                  console.log('✅ Found single question object');
                } else {
                  console.log('❌ No valid questions found in parsed result');
                  console.log('🔍 Full parsed result:', JSON.stringify(parsedResult, null, 2));
                }
                
                console.log(`📊 Extracted ${questions.length} questions`);
                
                if (questions.length === 0) {
                  throw new Error('No questions found in GPT response');
                }
                
                // 각 문제에 고유한 ID 추가 (ID가 없는 경우)
                const questionsWithIds = questions.map((q: any, idx: number) => ({
                  ...q,
                  id: q.id || `paragraph_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 9)}`
                }));
                
                // 결과 전송
                const result = {
                  type: 'complete',
                  paragraphQuestions: questionsWithIds,
                  totalGenerated: questionsWithIds.length,
                  message: `문단 문제 ${questionsWithIds.length}개가 성공적으로 생성되었습니다.`,
                  _metadata: {
                    requestedType: body.questionType,
                    selectedParagraphs: body.selectedParagraphs,
                    usedPrompt: prompt // 전체 프롬프트 포함
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
    console.error('Paragraph generation error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : '문단 문제 생성 중 오류 발생' 
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}

// 통합 문단 문제 프롬프트 생성 함수
async function generateBatchParagraphPrompt(
  paragraphs: string[],
  selectedParagraphs: number[],
  questionType: ParagraphQuestionType,
  division: string,
  title: string
): Promise<string> {
  try {
    // 1. 시스템 프롬프트 가져오기
    const systemPrompt = await db.getPromptByKey('paragraph', 'paragraphSystem', 'system_base');
    console.log('📋 Paragraph system prompt:', systemPrompt ? `FROM DB (${systemPrompt.promptText.length} chars)` : 'FALLBACK TO HARDCODED');
    
    // 2. 문제 유형별 프롬프트 가져오기 (Random인 경우 모든 유형 포함)
    let typePromptText = '';
    
    if (questionType === 'Random') {
      const allTypes = ['빈칸 채우기', '주관식 단답형', '어절 순서 맞추기', 'OX문제', '객관식 일반형'];
      const typePrompts = await Promise.all(
        allTypes.map(async (type) => {
          const typeKeyMap: Record<string, string> = {
            '빈칸 채우기': 'type_blank',
            '주관식 단답형': 'type_short_answer',
            '어절 순서 맞추기': 'type_order',
            'OX문제': 'type_ox',
            '객관식 일반형': 'type_objective-general'
          };
          
          const typeKey = typeKeyMap[type];
          const prompt = await db.getPromptByKey('paragraph', 'paragraphType', typeKey);
          console.log(`📚 ${type} prompt:`, prompt ? `FROM DB (${prompt.promptText.length} chars)` : 'NOT FOUND');
          return `**${type}**:\n${prompt?.promptText || `${type} 문제 유형 가이드라인을 찾을 수 없습니다.`}`;
        })
      );
      typePromptText = typePrompts.join('\n\n');
    } else {
      const typeKeyMap: Record<string, string> = {
        '빈칸 채우기': 'type_blank',
        '주관식 단답형': 'type_short_answer',
        '어절 순서 맞추기': 'type_order',
        'OX문제': 'type_ox',
        '객관식 일반형': 'type_objective-general'
      };
      
      const typeKey = typeKeyMap[questionType];
      if (typeKey) {
        const typePrompt = await db.getPromptByKey('paragraph', 'paragraphType', typeKey);
        console.log(`📚 ${questionType} prompt:`, typePrompt ? `FROM DB (${typePrompt.promptText.length} chars)` : 'NOT FOUND');
        typePromptText = typePrompt?.promptText || `${questionType} 문제 유형 가이드라인을 찾을 수 없습니다.`;
      }
    }
    
    // 3. 구분별 프롬프트 가져오기
    let divisionPromptText = '';
    try {
      const divisionKey = getDivisionKey(division);
      const divisionSubCategory = getDivisionSubCategory(division);
      const divisionPrompt = await db.getPromptByKey('division', divisionSubCategory, divisionKey);
      console.log(`🎯 ${division} prompt:`, divisionPrompt ? `FROM DB (${divisionPrompt.promptText.length} chars)` : 'NOT FOUND');
      divisionPromptText = divisionPrompt?.promptText || '';
    } catch (error) {
      console.warn('⚠️ 구분별 프롬프트 조회 실패, 빈 문자열 사용:', error);
    }

    // 4. 선택된 문단들 텍스트 구성
    const selectedParagraphTexts = selectedParagraphs.map(num => {
      const paragraphText = paragraphs[num - 1];
      return `**문단 ${num}**: ${paragraphText}`;
    }).join('\n\n');

    // 5. 최종 프롬프트 구성 - DB 시스템 프롬프트 활용
    if (systemPrompt && systemPrompt.promptText) {
      console.log('🔧 Using DB-based paragraph system prompt with template substitution');
      
      // DB 시스템 프롬프트의 템플릿 변수 치환
      const questionIndexNote = '';
        
      const paragraphText = selectedParagraphTexts;
      const questionIndex = '1'; // 단일 문제 생성이므로 1번
      
      const finalPrompt = systemPrompt.promptText
        .replace(/{questionType}/g, questionType)
        .replace(/{questionIndexNote}/g, questionIndexNote)
        .replace(/{title}/g, title)
        .replace(/{grade}/g, division)
        .replace(/{paragraphText}/g, paragraphText)
        .replace(/{questionIndex}/g, questionIndex)
        .replace(/{divisionPrompt}/g, divisionPromptText || '해당 학년에 적합한 난이도로 조절해주세요.')
        .replace(/{specificPrompt}/g, typePromptText || '지정된 문제 유형에 맞는 문제를 생성해주세요.');
      
      console.log('✅ Paragraph template substitution completed');
      return finalPrompt;
    }

    // 폴백: 하드코딩된 프롬프트 (DB 조회 실패 시)
    console.log('🔧 Using fallback hardcoded paragraph system prompt');
    const questionTypeInstruction = questionType === 'Random' 
      ? `선택된 문단에 대해 ${questionType} 유형의 문제를 1개 생성해주세요.`
      : `각 선택된 문단에 대해 ${questionType} 문제를 4개씩 생성해주세요.`;

    const fallbackPrompt = `다음 지문의 선택된 문단들에 대한 문단 문제를 생성해주세요.

**지문 제목**: ${title}
**대상 학년**: ${division}
**문제 유형**: ${questionType}

${questionTypeInstruction}

**선택된 문단들**:
${selectedParagraphTexts}

**구분별 요구사항**:
${divisionPromptText}

**문제 유형별 요구사항**:
${typePromptText}

**응답 형식** (JSON):
{
  "paragraphQuestions": [
    {
      "id": "paragraph_{문단번호}_{문제유형}_{번호}_{timestamp}",
      "type": "문제유형",
      "paragraphNumber": 문단번호,
      "paragraphText": "문단 텍스트",
      "question": "문제 내용",
      ${questionType === 'Random' || !questionType.includes('주관식') ? 
        '"options": ["선택지1", "선택지2", "선택지3", "선택지4"],' : 
        '"answerInitials": "초성힌트",'
      }
      ${questionType === '어절 순서 맞추기' ? '"wordSegments": ["어절1", "어절2", "어절3", "어절4"],' : ''}
      "answer": "정답",
      "explanation": "해설"
    }
  ]
}

중요: 반드시 위의 JSON 형식으로만 응답해주세요.`;

    return fallbackPrompt;
    
  } catch (error) {
    console.error('❌ 문단 문제 프롬프트 생성 실패:', error);
    // 폴백 프롬프트 반환
    return generateFallbackBatchPrompt(paragraphs, selectedParagraphs, questionType, division, title);
  }
}

// 폴백 프롬프트 생성 함수
function generateFallbackBatchPrompt(
  paragraphs: string[],
  selectedParagraphs: number[],
  questionType: ParagraphQuestionType,
  division: string,
  title: string
): string {
  const selectedParagraphTexts = selectedParagraphs.map(num => {
    const paragraphText = paragraphs[num - 1];
    return `**문단 ${num}**: ${paragraphText}`;
  }).join('\n\n');

  const questionTypeInstruction = questionType === 'Random' 
    ? '선택된 모든 문단을 통틀어서 5가지 유형(빈칸 채우기, 주관식 단답형, 어절 순서 맞추기, OX문제, 객관식 일반형)의 문제를 각각 1개씩만 생성해주세요. 즉, 총 5개의 문제만 생성하면 됩니다.'
    : `각 선택된 문단에 대해 ${questionType} 문제를 4개씩 생성해주세요.`;

  return `다음 지문의 선택된 문단들에 대한 문단 문제를 생성해주세요.

**지문 제목**: ${title}
**대상 학년**: ${division}
**문제 유형**: ${questionType}

${questionTypeInstruction}

**선택된 문단들**:
${selectedParagraphTexts}

**주의사항**:
- ${division}에 맞는 어휘와 난이도 사용
- 명확하고 구체적인 문제 출제
- 정답과 오답이 명확히 구분되도록 작성
- 해설은 학생이 이해하기 쉽게 작성
- 반드시 JSON 형식으로만 응답

**응답 형식** (JSON):
{
  "paragraphQuestions": [
    {
      "id": "paragraph_{문단번호}_{문제유형}_{번호}_{timestamp}",
      "type": "문제유형",
      "paragraphNumber": 문단번호,
      "paragraphText": "문단 텍스트",
      "question": "문제 내용",
      "options": ["선택지1", "선택지2", "선택지3", "선택지4"],
      "answer": "정답",
      "explanation": "해설"
    }
  ]
}

중요: 반드시 위의 JSON 형식으로만 응답해주세요.`;
}