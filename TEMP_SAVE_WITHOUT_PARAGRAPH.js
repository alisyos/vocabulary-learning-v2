// 임시 해결책: 문단 문제 없이 저장하는 코드
// src/app/api/save-final-supabase/route.ts의 라인 281 부분을 다음과 같이 임시 수정:

// 기존 코드:
/*
const savedContentSet = await db.saveCompleteContentSet(
  contentSetData,
  passagesData,
  vocabularyTerms,
  transformedVocabularyQuestions,
  transformedParagraphQuestions,
  transformedComprehensiveQuestions
);
*/

// 임시 수정 코드:
const savedContentSet = await db.saveCompleteContentSet(
  contentSetData,
  passagesData,
  vocabularyTerms,
  transformedVocabularyQuestions,
  [], // 빈 배열로 문단 문제 제외
  transformedComprehensiveQuestions
);

// 이렇게 하면 문단 문제 없이 다른 모든 데이터는 정상 저장됩니다.