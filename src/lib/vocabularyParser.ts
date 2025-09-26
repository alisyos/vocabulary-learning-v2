/**
 * 어휘 파싱 공통 라이브러리
 * GPT 응답으로 받은 어휘 데이터를 파싱하고 변환하는 함수들
 */

export interface VocabularyTerm {
  term: string;
  definition: string;
  example_sentence: string;
}

/**
 * footnote 형식의 어휘 데이터를 파싱하여 구조화된 객체로 변환
 * 다양한 GPT 응답 형태를 지원
 *
 * 지원하는 패턴:
 * 1. "용어: 정의 (예시: 예시문장)"
 * 2. "용어: 정의 (예: 예시문장)"
 * 3. "용어: 정의 (예시문장)" - 단순 괄호
 * 4. "용어: 정의. 예시: 예시문장" - 괄호 없는 경우
 * 5. "용어: 정의 예시: 예시문장" - 마침표 없는 경우
 * 6. "용어: 정의 (예시:" - 불완전한 형태
 * 7. "용어만있는경우" - 콜론 없는 경우
 *
 * @param footnote - 파싱할 footnote 문자열
 * @returns 파싱된 어휘 용어 객체
 */
export const parseFootnoteToVocabularyTerm = (footnote: string): VocabularyTerm => {
  // 첫 번째 콜론으로 term과 나머지 부분 분리
  const colonIndex = footnote.indexOf(':');

  if (colonIndex === -1) {
    // 콜론이 없는 경우 전체를 term으로
    return { term: footnote.trim(), definition: '', example_sentence: '' };
  }

  const term = footnote.substring(0, colonIndex).trim();
  const definitionPart = footnote.substring(colonIndex + 1).trim();

  // 다양한 예시 패턴 매칭 - 더 정교한 로직 사용
  // 1. "(예:" 또는 "(예시:" 패턴 (가장 일반적)
  let exampleMatch = definitionPart.match(/\(예시?:\s*([^)]+)\)/);

  // 2. "(예:"나 "(예시:" 없이 단순히 괄호만 있는 경우
  // 너무 짧은 내용은 예시로 간주하지 않음 (5글자 이상)
  if (!exampleMatch) {
    // 마지막 괄호 안의 내용을 예시로 간주
    // 공백이 있는 경우: " (예시문장)" 또는 " (예시문장)."
    // 공백이 없는 경우: "(예시문장)" 또는 "(예시문장)."
    exampleMatch = definitionPart.match(/\s*\(([^)]{5,})\)\.?$/);
  }

  // 3. 괄호 없는 패턴들 (위의 패턴이 매칭되지 않은 경우만)
  if (!exampleMatch) {
    // "정의. 예시: 예시문장" 패턴
    exampleMatch = definitionPart.match(/^(.+?)\.\s*예시:\s*(.+)$/);
    if (exampleMatch) {
      return {
        term,
        definition: exampleMatch[1].trim(),
        example_sentence: exampleMatch[2].trim()
      };
    }

    // "정의 예시: 예시문장" 패턴 (마침표 없는 경우)
    exampleMatch = definitionPart.match(/^(.+?)\s+예시:\s*(.+)$/);
    if (exampleMatch) {
      return {
        term,
        definition: exampleMatch[1].trim(),
        example_sentence: exampleMatch[2].trim()
      };
    }

    // "정의 (예시:" 불완전한 형태
    exampleMatch = definitionPart.match(/^(.+?)\s*\(예시?:\s*(.*)$/);
    if (exampleMatch) {
      const definition = exampleMatch[1].trim();
      const examplePart = exampleMatch[2].trim();
      return {
        term,
        definition,
        example_sentence: examplePart && examplePart !== '' ? examplePart : ''
      };
    }
  }

  let definition = definitionPart;
  let example_sentence = '';

  if (exampleMatch) {
    // 예시 부분 제거한 정의
    definition = definitionPart.replace(exampleMatch[0], '').trim();
    // 예시 문장
    example_sentence = exampleMatch[1].trim();
  }

  return { term, definition, example_sentence };
};

/**
 * 구조화된 어휘 데이터를 footnote 형식으로 변환
 *
 * @param term - 어휘 용어
 * @param definition - 정의
 * @param example_sentence - 예시 문장
 * @returns footnote 형식 문자열
 */
export const vocabularyTermToFootnote = (term: string, definition: string, example_sentence: string): string => {
  let result = `${term}: ${definition}`;
  if (example_sentence && example_sentence.trim()) {
    result += ` (예: ${example_sentence})`;
  }
  return result;
};

/**
 * 여러 footnote를 일괄 파싱
 *
 * @param footnotes - footnote 문자열 배열
 * @returns 파싱된 어휘 용어 객체 배열
 */
export const parseMultipleFootnotes = (footnotes: string[]): VocabularyTerm[] => {
  return footnotes.map(footnote => parseFootnoteToVocabularyTerm(footnote));
};

/**
 * 여러 어휘 용어를 footnote 형식으로 일괄 변환
 *
 * @param terms - 어휘 용어 객체 배열
 * @returns footnote 문자열 배열
 */
export const termsToFootnotes = (terms: VocabularyTerm[]): string[] => {
  return terms.map(term => vocabularyTermToFootnote(term.term, term.definition, term.example_sentence));
};