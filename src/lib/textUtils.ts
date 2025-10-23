/**
 * 텍스트 유틸리티 함수 모음
 * - 종결 어미 정규화
 * - 텍스트 포맷팅
 */

/**
 * 종결 어미를 "~다" 형태로 정규화하고 텍스트 표현을 개선
 *
 * 변환 규칙:
 * - 텍스트 표현: "예:" → "예를 들어"
 * - 의문형 존댓말: "~가?" → "~가요?", "~까?" → "~까요?"
 * - "~합니다" → "~한다" (예: 설명합니다 → 설명한다, 필요합니다 → 필요한다)
 * - "~습니다" → "~다" (예: 했습니다 → 했다, 갔습니다 → 갔다)
 * - "~입니다" → "~이다" (예: 도구입니다 → 도구이다)
 * - "~ㅂ니다" → "~다"
 * - 특수 케이스(불규칙): 됩니다 → 된다, 납니다 → 난다
 *
 * @param text 원본 텍스트
 * @returns 정규화된 텍스트
 *
 * @example
 * normalizeEndingSentence("예: 사과, 바나나") // "예를 들어 사과, 바나나"
 * normalizeEndingSentence("무엇인가?") // "무엇인가요?"
 * normalizeEndingSentence("알을까?") // "알을까요?"
 * normalizeEndingSentence("이것은 도구입니다.") // "이것은 도구이다."
 * normalizeEndingSentence("했습니다.") // "했다."
 * normalizeEndingSentence("필요합니다.") // "필요한다."
 * normalizeEndingSentence("됩니다.") // "된다."
 */
export function normalizeEndingSentence(text: string | null | undefined): string {
  if (!text) return '';

  let normalized = text;

  // ⚠️ 중요: 더 구체적인 패턴을 먼저 적용해야 합니다!
  // 예: "설명합니다"는 "합니다" 규칙을 먼저 적용해야 "설명한다"가 됩니다.
  //     만약 "습니다"를 먼저 적용하면 "설명합다"가 되어 버립니다.

  // -1. 텍스트 표현 정규화
  //     "예:" → "예를 들어" (문장 시작 또는 중간에 등장)
  normalized = normalized.replace(/예:/g, '예를 들어');

  // -0.5. 의문형 반말 → 존댓말 변환
  //      "~가?" → "~가요?"
  normalized = normalized.replace(/([가-힣])가\?/g, '$1가요?');
  //      "~까?" → "~까요?"
  normalized = normalized.replace(/([가-힣])까\?/g, '$1까요?');

  // 0. 특수 케이스 (불규칙 동사) - 가장 먼저 처리!
  //    "됩니다" → "된다" (되다의 불규칙 활용)
  normalized = normalized.replace(/됩니다/g, '된다');
  //    "납니다" → "난다" (나다의 불규칙 활용)
  normalized = normalized.replace(/납니다/g, '난다');

  // 1. "~합니다" → "~한다" (일반 규칙)
  //    예: 설명합니다 → 설명한다, 공부합니다 → 공부한다, 필요합니다 → 필요한다, 의미합니다 → 의미한다
  normalized = normalized.replace(/([가-힣])합니다/g, '$1한다');

  // 2. "~였습니다" → "~였다"
  //    예: 그것이었습니다 → 그것이었다
  normalized = normalized.replace(/([가-힣])였습니다/g, '$1였다');

  // 3. "~았습니다/었습니다" → "~았다/었다"
  //    예: 갔습니다 → 갔다, 먹었습니다 → 먹었다
  normalized = normalized.replace(/([가-힣])았습니다/g, '$1았다');
  normalized = normalized.replace(/([가-힣])었습니다/g, '$1었다');

  // 4. "~습니다" → "~다"
  //    예: 했습니다 → 했다, 있습니다 → 있다, 없습니다 → 없다
  normalized = normalized.replace(/([가-힣])습니다/g, '$1다');

  // 5. "~ㅂ니다" → "~다" (받침 있는 경우)
  //    예: 먹습니다 → 먹다, 좋습니다 → 좋다
  normalized = normalized.replace(/([가-힣])ㅂ니다/g, '$1다');

  // 6. "~입니다" → "~이다"
  //    예: 도구입니다 → 도구이다, 것입니다 → 것이다
  normalized = normalized.replace(/([가-힣])입니다/g, '$1이다');

  // 7. "~습니까" → "~는가" (의문형)
  //    예: 좋습니까 → 좋은가, 먹습니까 → 먹는가
  normalized = normalized.replace(/([가-힣])습니까/g, '$1는가');
  normalized = normalized.replace(/([가-힣])ㅂ니까/g, '$1는가');

  // 8. "~입니까" → "~인가"
  //    예: 도구입니까 → 도구인가
  normalized = normalized.replace(/([가-힣])입니까/g, '$1인가');

  return normalized;
}

/**
 * 여러 텍스트를 일괄 정규화
 *
 * @param texts 텍스트 배열
 * @returns 정규화된 텍스트 배열
 */
export function normalizeEndingSentences(texts: (string | null | undefined)[]): string[] {
  return texts.map(text => normalizeEndingSentence(text));
}

/**
 * 객체의 특정 필드들에 종결 어미 정규화 적용
 *
 * @param obj 원본 객체
 * @param fields 정규화할 필드명 배열
 * @returns 정규화된 객체
 */
export function normalizeObjectFields<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[]
): T {
  const normalized = { ...obj };

  fields.forEach(field => {
    if (typeof normalized[field] === 'string') {
      normalized[field] = normalizeEndingSentence(normalized[field] as string) as any;
    }
  });

  return normalized;
}

/**
 * 배열의 객체들에 종결 어미 정규화 적용
 *
 * @param items 원본 객체 배열
 * @param fields 정규화할 필드명 배열
 * @returns 정규화된 객체 배열
 */
export function normalizeArrayFields<T extends Record<string, any>>(
  items: T[],
  fields: (keyof T)[]
): T[] {
  return items.map(item => normalizeObjectFields(item, fields));
}

/**
 * 테스트용 함수: 변환 전후 비교
 *
 * @param text 원본 텍스트
 * @returns { original, normalized, changed }
 */
export function previewNormalization(text: string): {
  original: string;
  normalized: string;
  changed: boolean;
} {
  const normalized = normalizeEndingSentence(text);
  return {
    original: text,
    normalized,
    changed: text !== normalized
  };
}
