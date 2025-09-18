import { NextResponse } from 'next/server';
import { getPromptFromDB, updatePromptInDB } from '@/lib/prompts';

export async function POST() {
  try {
    // 현재 시스템 프롬프트 조회
    const currentPrompt = await getPromptFromDB('passage', 'system', 'system_base');
    
    if (!currentPrompt) {
      return NextResponse.json({ 
        error: '시스템 프롬프트를 찾을 수 없습니다.' 
      }, { status: 404 });
    }

    // 이미 변수들이 포함되어 있는지 확인
    const hasKeywordsForPassages = currentPrompt.includes('{keywords_for_passages}');
    const hasKeywordsForQuestions = currentPrompt.includes('{keywords_for_questions}');

    if (hasKeywordsForPassages && hasKeywordsForQuestions) {
      return NextResponse.json({
        success: true,
        message: '시스템 프롬프트에 이미 새로운 변수들이 포함되어 있습니다.',
        hasKeywordsForPassages,
        hasKeywordsForQuestions
      });
    }

    // 새로운 변수 섹션 추가
    let updatedPrompt = currentPrompt;

    // keywords_for_passages 섹션 추가 (핵심 개념어 섹션 다음에)
    if (!hasKeywordsForPassages) {
      const keywordSection = `
###지문용 키워드
{keywords_for_passages}
지문 작성 시 위 키워드들을 우선적으로 활용하여 내용을 구성하세요. 이 키워드들은 지문의 가독성과 교육적 효과를 높이는 데 중점을 둡니다.`;

      // ###핵심 개념어 섹션 다음에 삽입
      const keywordPos = updatedPrompt.indexOf('###핵심 개념어');
      if (keywordPos !== -1) {
        const nextSectionPos = updatedPrompt.indexOf('\n###', keywordPos + 1);
        if (nextSectionPos !== -1) {
          updatedPrompt = updatedPrompt.substring(0, nextSectionPos) + keywordSection + '\n' + updatedPrompt.substring(nextSectionPos);
        } else {
          updatedPrompt += keywordSection;
        }
      } else {
        // ###핵심 개념어 섹션이 없으면 끝에 추가
        updatedPrompt += keywordSection;
      }
    }

    // keywords_for_questions 섹션 추가
    if (!hasKeywordsForQuestions) {
      const questionsSection = `
###어휘문제용 키워드
{keywords_for_questions}
어휘 문제 생성을 고려하여 위 키워드들을 지문 내에 자연스럽게 포함시키세요. 이 키워드들은 학습자의 어휘력 향상에 중점을 둡니다.`;

      // 지문용 키워드 섹션 다음에 삽입
      const passageKeywordPos = updatedPrompt.indexOf('###지문용 키워드');
      if (passageKeywordPos !== -1) {
        const nextSectionPos = updatedPrompt.indexOf('\n###', passageKeywordPos + 1);
        if (nextSectionPos !== -1) {
          updatedPrompt = updatedPrompt.substring(0, nextSectionPos) + questionsSection + '\n' + updatedPrompt.substring(nextSectionPos);
        } else {
          updatedPrompt += questionsSection;
        }
      } else {
        updatedPrompt += questionsSection;
      }
    }

    // DB 업데이트
    await updatePromptInDB('passage', 'system', 'system_base', updatedPrompt);

    return NextResponse.json({
      success: true,
      message: '시스템 프롬프트에 새로운 변수 섹션이 추가되었습니다.',
      addedKeywordsForPassages: !hasKeywordsForPassages,
      addedKeywordsForQuestions: !hasKeywordsForQuestions,
      promptLength: updatedPrompt.length
    });

  } catch (error) {
    console.error('시스템 프롬프트 업데이트 실패:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}