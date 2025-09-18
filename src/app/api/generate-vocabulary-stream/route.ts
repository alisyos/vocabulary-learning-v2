import { NextRequest } from 'next/server';
import { generatePassageStream, ModelType } from '@/lib/openai';
import { generateVocabularyPromptFromDB, getDivisionKey, getDivisionSubCategory } from '@/lib/prompts';
import { VocabularyQuestionType } from '@/types';
import { db } from '@/lib/supabase';

interface VocabularyGenerationRequest {
  terms: string[];
  passage: string;
  division: string;
  questionType: VocabularyQuestionType;
  model?: ModelType;
}

export async function POST(request: NextRequest) {
  try {
    const body: VocabularyGenerationRequest = await request.json();
    
    // 입력값 검증
    if (!body.terms || !Array.isArray(body.terms) || body.terms.length === 0) {
      return new Response(
        JSON.stringify({ error: '용어 목록이 필요합니다.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!body.passage || !body.division) {
      return new Response(
        JSON.stringify({ error: '지문 내용과 구분 정보가 필요합니다.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!body.questionType) {
      return new Response(
        JSON.stringify({ error: '문제 유형이 필요합니다.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('🚀 Starting streaming vocabulary generation for terms:', body.terms);

    // 모든 용어에 대한 통합 프롬프트 생성
    const termsWithDescriptions = body.terms.map(term => {
      const [termName, termDescription] = term.includes(':') 
        ? term.split(':').map(s => s.trim())
        : [term.trim(), ''];
      return { termName, termDescription };
    });

    // 통합 프롬프트 생성
    const prompt = await generateBatchVocabularyPrompt(
      termsWithDescriptions,
      body.passage,
      body.division,
      body.questionType
    );

    const model = body.model || 'gpt-4.1';

    // 스트리밍 응답 생성
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 스트리밍 시작 메시지
          controller.enqueue(encoder.encode('data: {"type":"start","message":"어휘 문제 생성을 시작합니다..."}\n\n'));

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
                totalChars: fullContent.length
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(progress)}\n\n`));
            }

            if (chunk.isComplete) {
              // 완료 시 파싱 시도
              try {
                let parsedResult;
                
                // JSON 파싱 시도
                try {
                  parsedResult = JSON.parse(fullContent);
                } catch (e) {
                  // JSON 파싱 실패 시 코드 블록 추출 시도
                  const jsonMatch = fullContent.match(/```json\n?([\s\S]*?)\n?```/);
                  if (jsonMatch) {
                    parsedResult = JSON.parse(jsonMatch[1]);
                  } else {
                    throw new Error('JSON 파싱 실패');
                  }
                }

                // 각 문제에 고유한 ID 추가
                const questionsWithIds = (parsedResult.vocabularyQuestions || []).map((q: any, idx: number) => ({
                  ...q,
                  id: `vocab_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 9)}`
                }));
                
                // 결과 전송
                const result = {
                  type: 'complete',
                  vocabularyQuestions: questionsWithIds,
                  totalGenerated: questionsWithIds.length,
                  message: '어휘 문제가 성공적으로 생성되었습니다.',
                  _metadata: {
                    usedPrompt: prompt // 전체 프롬프트 전달
                  }
                };
                
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(result)}\n\n`));
              } catch (parseError) {
                console.error('Failed to parse streaming result:', parseError);
                controller.enqueue(encoder.encode(`data: {"type":"error","error":"결과 파싱 실패"}\n\n`));
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
    console.error('Vocabulary generation error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : '어휘 문제 생성 중 오류 발생' 
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}

// 통합 프롬프트 생성 함수 (DB 기반)
async function generateBatchVocabularyPrompt(
  terms: { termName: string; termDescription: string }[],
  passage: string,
  division: string,
  questionType: VocabularyQuestionType
): Promise<string> {
  try {
    // 1. 전체 시스템 프롬프트 조회
    const systemPrompt = await db.getPromptByKey('vocabulary', 'vocabularySystem', 'system_base');
    
    // 2. 문제 유형별 프롬프트 조회 (key 필드에 한글 이름 그대로 사용)
    const typePrompt = await db.getPromptByKey('vocabulary', 'vocabularyType', questionType);
    
    // 3. 구분별 프롬프트 조회
    const divisionKey = getDivisionKey(division);
    const divisionSubCategory = getDivisionSubCategory(division);
    const divisionPrompt = await db.getPromptByKey('division', divisionSubCategory, divisionKey);

    console.log('🔧 Vocabulary batch prompt generation:', {
      systemPrompt: systemPrompt?.promptText ? 'FROM DB (' + systemPrompt.promptText.length + ' chars)' : 'NOT FOUND',
      typePrompt: typePrompt?.promptText ? 'FROM DB (' + typePrompt.promptText.length + ' chars)' : 'NOT FOUND',
      divisionPrompt: divisionPrompt?.promptText ? 'FROM DB (' + divisionPrompt.promptText.length + ' chars)' : 'NOT FOUND', 
      termCount: terms.length,
      questionType,
      division
    });

    // 4. 용어 목록 포맷팅
    const termsList = terms.map(t => 
      `- ${t.termName}${t.termDescription ? `: ${t.termDescription}` : ''}`
    ).join('\n');

    // 5. 시스템 프롬프트와 유형별 프롬프트를 함께 사용
    if (systemPrompt?.promptText && typePrompt?.promptText) {
      console.log('🔧 Using combined DB system + type prompts with variable substitution');
      
      // 시스템 프롬프트의 변수 치환 (단일/다중 용어 대응)
      const termName = terms.length === 1 ? terms[0].termName : terms.map(t => t.termName).join(', ');
      const termDescription = terms.length === 1 
        ? (terms[0].termDescription || '지문에서 추출된 용어')
        : terms.map(t => t.termDescription || '지문에서 추출된 용어').join(', ');
      
      const processedSystemPrompt = systemPrompt.promptText
        .replace(/{termName}/g, termName)
        .replace(/{termDescription}/g, termDescription)
        .replace(/{passage}/g, passage)
        .replace(/{divisionPrompt}/g, divisionPrompt?.promptText || `${division} 수준의 문제`)
        .replace(/{questionTypePrompt}/g, typePrompt.promptText)
        .replace(/{termsList}/g, termsList)
        .replace(/{division}/g, division)
        .replace(/{termCount}/g, terms.length.toString());
      
      const finalPrompt = processedSystemPrompt;
      
      console.log('✅ Combined vocabulary DB prompts with variable substitution applied');
      return finalPrompt;
    }
    
    // 6. 유형별 프롬프트만 있는 경우 - 변수 치환 적용
    else if (typePrompt?.promptText) {
      console.log('🔧 Using DB type prompt only with variable substitution');
      
      // 유형별 프롬프트의 변수 치환
      const termName = terms.length === 1 ? terms[0].termName : terms.map(t => t.termName).join(', ');
      const termDescription = terms.length === 1 
        ? (terms[0].termDescription || '지문에서 추출된 용어')
        : terms.map(t => t.termDescription || '지문에서 추출된 용어').join(', ');
      
      const processedTypePrompt = typePrompt.promptText
        .replace(/{termName}/g, termName)
        .replace(/{termDescription}/g, termDescription)
        .replace(/{passage}/g, passage)
        .replace(/{divisionPrompt}/g, divisionPrompt?.promptText || `${division} 수준의 문제`)
        .replace(/{termsList}/g, termsList)
        .replace(/{division}/g, division)
        .replace(/{termCount}/g, terms.length.toString());
      
      console.log('✅ Type-only vocabulary DB prompt with variable substitution applied');
      return processedTypePrompt;
    }

    // 5. 폴백: 하드코딩 프롬프트 사용
    console.log('⚠️ Using fallback hardcoded vocabulary prompt');
    return generateFallbackBatchVocabularyPrompt(terms, passage, division, questionType);

  } catch (error) {
    console.error('❌ DB vocabulary prompt generation failed:', error);
    // 폴백: 하드코딩 프롬프트 사용
    return generateFallbackBatchVocabularyPrompt(terms, passage, division, questionType);
  }
}

// 폴백 하드코딩 프롬프트 함수
function generateFallbackBatchVocabularyPrompt(
  terms: { termName: string; termDescription: string }[],
  passage: string,
  division: string,
  questionType: VocabularyQuestionType
): string {
  const isMultipleChoice = questionType.includes('객관식') || 
                          questionType.includes('선택형') || 
                          questionType === '낱말 골라 쓰기';

  const optionCount = questionType === '2개중 선택형' ? 2 :
                     questionType === '3개중 선택형' ? 3 :
                     questionType === '낱말 골라 쓰기' ? 4 :
                     questionType === '5지 선다 객관식' ? 5 : 0;

  const termsList = terms.map(t => 
    `- ${t.termName}${t.termDescription ? `: ${t.termDescription}` : ''}`
  ).join('\n');

  return `다음 지문과 용어 목록을 바탕으로 ${division} 수준의 어휘 문제를 생성해주세요.

[지문]
${passage}

[용어 목록]
${termsList}

[문제 유형]
${questionType}

각 용어에 대해 한 문제씩 생성하되, 다음 형식을 따라주세요:

${isMultipleChoice ? `
- 객관식 문제 (${optionCount}개 선택지)
- 정답은 반드시 선택지 중 하나여야 함
- 오답 선택지는 그럴듯하지만 명확히 틀린 내용으로 구성
` : `
- 단답형 문제
- 정답의 초성 힌트 제공 (answerInitials 필드)
`}

JSON 형식으로 응답해주세요:
{
  "vocabularyQuestions": [
    {
      "term": "용어명",
      "questionType": "${questionType}",
      "question": "문제 내용",
      ${isMultipleChoice ? 
        `"options": ["선택지1", "선택지2"${optionCount > 2 ? ', "선택지3"' : ''}${optionCount > 3 ? ', "선택지4"' : ''}${optionCount > 4 ? ', "선택지5"' : ''}],` : 
        '"answerInitials": "정답의 초성",'}
      "answer": "${isMultipleChoice ? '정답 선택지' : '정답'}",
      "explanation": "해설"
    }
  ]
}`;
}