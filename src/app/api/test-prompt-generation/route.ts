import { NextResponse } from 'next/server';
import { generateVocabularyPromptFromDB } from '@/lib/prompts';

export async function GET() {
  try {
    // 테스트용 데이터
    const termName = '민주주의';
    const termDescription = '국민이 주권을 가지는 정치 체제';
    const passage = '민주주의는 현대 사회의 중요한 가치입니다. 우리나라는 민주주의 국가로서 국민이 선거를 통해 대표자를 선출합니다.';
    const division = '초등학교 중학년(3-4학년)';
    const questionType = '의미 파악형';
    
    // 프롬프트 생성
    const generatedPrompt = await generateVocabularyPromptFromDB(
      termName,
      termDescription,
      passage,
      division,
      questionType
    );
    
    // 치환이 되었는지 확인
    const hasPassageContent = generatedPrompt.includes(passage);
    const hasTermName = generatedPrompt.includes(termName);
    const hasTermDescription = generatedPrompt.includes(termDescription);
    
    // 남아있는 플레이스홀더 확인
    const remainingPlaceholders = generatedPrompt.match(/\{[^}]+\}/g) || [];
    
    return NextResponse.json({
      testData: {
        termName,
        termDescription,
        passage,
        division,
        questionType
      },
      replacementStatus: {
        passageReplaced: hasPassageContent,
        termNameReplaced: hasTermName,
        termDescriptionReplaced: hasTermDescription
      },
      remainingPlaceholders,
      promptLength: generatedPrompt.length,
      promptPreview: generatedPrompt.substring(0, 1000),
      fullPrompt: generatedPrompt
    });
  } catch (error) {
    return NextResponse.json({
      error: '프롬프트 생성 실패',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}