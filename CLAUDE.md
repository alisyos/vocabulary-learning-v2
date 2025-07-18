# 학습 지문 및 문제 생성 시스템 개발 가이드

## 프로젝트 개요
AI 기반 과목별 독해 지문 및 문제 생성 웹 애플리케이션 개발

### 기술 스택
- **API**: GPT API (콘텐츠 생성)
- **DB**: Google Sheets (정규화된 6개 시트 구조)
- **배포**: Vercel
- **프레임워크**: Next.js 15

## 🗄️ 정규화된 데이터베이스 구조

### 📊 Google Sheets 스키마 (6개 시트)

시스템은 향후 별도 DB 서버 전환을 위해 완전히 정규화된 구조를 사용합니다.

#### 1️⃣ field 시트 ⭐ **필수** (계층적 선택을 위한 기본 데이터)
```
subject | grade | area | maintopic | subtopic | keyword
```

#### 2️⃣ content_sets_v2 시트 (메인 콘텐츠 세트 정보)
```
timestamp | setId | userId | division | subject | grade | area | mainTopic | subTopic | keywords | passageTitle | paragraphCount | vocabularyWordsCount | vocabularyQuestionCount | comprehensiveQuestionCount | status | createdAt | updatedAt
```

#### 3️⃣ passages_v2 시트 (지문 데이터)
```
id | contentSetId | title | paragraph1 | paragraph2 | ... | paragraph10 | createdAt | updatedAt
```

#### 4️⃣ vocabulary_terms_v2 시트 (어휘 용어 데이터)
```
id | contentSetId | term | definition | exampleSentence | orderIndex | createdAt
```

#### 5️⃣ vocabulary_questions_v2 시트 (어휘 문제 데이터)
```
id | contentSetId | vocabularyTermId | questionId | term | question | option1 | option2 | option3 | option4 | option5 | correctAnswer | explanation | createdAt
```

#### 6️⃣ comprehensive_questions_v2 시트 (종합 문제 데이터)
```
id | contentSetId | questionId | questionType | question | questionFormat | option1 | option2 | option3 | option4 | option5 | correctAnswer | explanation | isSupplementary | originalQuestionId | questionSetNumber | createdAt
```

## 주요 기능 요구사항

### C-01. AI 기반 지문 생성
- **대상**: 초등 중학년(3-4학년), 고학년(5-6학년), 중학생(1-3학년)
- **과목**: 사회, 과학 (2개 과목)
- **영역**: 
  - 사회: 일반사회, 지리, 역사, 경제 (4개)
  - 과학: 물리, 화학, 생물, 지구과학 (4개)

#### 지문 구성 규칙
- 중학년(3-4학년): 4-5문장/단락, 5-6개 단락
- 고학년(5-6학년): 5-6문장/단락, 6개 단락 또는 1-2문장/10단락
- 중학생(1-3학년): ~10문장/5문단 또는 1-2문장/12단락

### C-02. 문제 및 해설 생성
- **문제 유형**: 객관식, 주관식 단답형
- **구성**: 일반 문제 1개 + 보완 문제 2개 (총 3개 세트)
- **해설 포함**: 오답 시 학생에게 제공

### C-03. 시각자료 콘텐츠
- **출처**: 공공데이터, AI 이미지 생성, 이미지 제공 사이트
- **제공 기준**: 개념 이해에 필수적인 경우만 (지문당 1건 내외)

## 데이터 구조

### 지문 생성 입력값
```typescript
interface PassageInput {
  grade: '초등학교 중학년(3-4학년)' | '초등학교 고학년(5-6학년)' | '중학생(1-3학년)';
  length: string; // 지문 길이 옵션
  subject: '사회' | '과학';
  area: string; // 영역별 선택지
}
```

### 지문 출력 스키마
```typescript
interface Passage {
  passages: {
    title: string; // 질문형·호기심 유발형 제목
    paragraphs: string[]; // 단락 배열
    footnote: string[]; // 개념어 풀이
  }[];
}
```

### 문제 생성 출력 스키마
```typescript
interface Question {
  questionType: '객관식' | '주관식';
  questions: {
    type: '일반' | '보완';
    question: string;
    options?: string[]; // 객관식만
    answer: string;
    explanation: string;
  }[];
}
```

### 정규화된 구조 타입 정의

```typescript
// 콘텐츠 세트 (content_sets_v2 테이블)
export interface ContentSet {
  id?: number;
  setId: string;
  userId?: string;
  division: DivisionType;
  subject: SubjectType;
  grade: string;
  area: string;
  mainTopic: string;
  subTopic: string;
  keywords: string;
  passageTitle: string;
  paragraphCount: number;
  vocabularyWordsCount: number;
  vocabularyQuestionCount: number;
  comprehensiveQuestionCount: number;
  status: 'draft' | 'completed' | 'archived';
  createdAt: string;
  updatedAt: string;
}

// 지문 (passages_v2 테이블)
export interface PassageData {
  id?: number;
  contentSetId: string;
  title: string;
  paragraphs: string[];
  createdAt: string;
  updatedAt: string;
}

// 어휘 용어 (vocabulary_terms_v2 테이블)
export interface VocabularyTerm {
  id?: number;
  contentSetId: string;
  term: string;
  definition: string;
  exampleSentence?: string;
  orderIndex: number;
  createdAt: string;
}

// 어휘 문제 (vocabulary_questions_v2 테이블)
export interface VocabularyQuestionData {
  id?: number;
  contentSetId: string;
  vocabularyTermId?: string;
  questionId: string;
  term: string;
  question: string;
  options: [string, string, string, string, string]; // 정확히 5개
  correctAnswer: string;
  explanation: string;
  createdAt: string;
}

// 종합 문제 (comprehensive_questions_v2 테이블)
export interface ComprehensiveQuestionData {
  id?: number;
  contentSetId: string;
  questionId: string;
  questionType: Exclude<ComprehensiveQuestionType, 'Random'>;
  question: string;
  questionFormat: 'multiple_choice' | 'short_answer';
  options?: [string, string, string, string, string]; // 객관식인 경우만
  correctAnswer: string;
  explanation: string;
  isSupplementary: boolean;
  originalQuestionId?: string;
  questionSetNumber: number;
  createdAt: string;
}

// AI 생성 로그 (ai_generation_logs_v2 테이블)
export interface AIGenerationLog {
  id?: number;
  contentSetId: string;
  generationType: 'passage' | 'vocabulary' | 'comprehensive';
  promptUsed: string;
  aiResponse: any; // JSON 형태
  generationTimeMs?: number;
  tokensUsed?: number;
  costUsd?: number;
  createdAt: string;
}
```

## 개발 가이드라인

### 1. 프롬프트 엔지니어링
- 문서에 포함된 상세한 프롬프트를 활용
- 학년별, 과목별, 영역별 특성 반영
- JSON 형식 출력 보장

### 2. Google Sheets 연동
- Google Sheets API 설정
- 정규화된 6개 시트 구조 사용
- 관계형 구조로 데이터 저장
- 읽기/쓰기 권한 관리

### 3. UI/UX 설계
- 직관적인 입력 폼 (학년, 과목, 영역 선택)
- 생성된 지문 및 문제 표시
- 학습자 친화적 인터페이스
- 7단계 워크플로우
- 4탭 편집 시스템

### 4. API 구조
```
/api/generate-passage - 지문 생성
/api/generate-vocabulary - 어휘 문제 생성
/api/generate-comprehensive - 종합 문제 생성
/api/save-final - 최종 저장 (정규화된 구조)
/api/get-saved-sets - 콘텐츠 목록 조회 (정규화된 구조)
/api/get-set-details - 콘텐츠 상세 조회 (정규화된 구조)
/api/get-field-data - 계층적 선택 데이터
/api/create-v2-sheets-backup - 정규화된 시트 생성
/api/test-sheets - 연결 테스트
```

## 정규화된 구조의 장점

### 1. 성능 최적화
- JSON 파싱 없이 구조화된 데이터 직접 조회
- 빠른 데이터 접근과 수정
- 효율적인 관계형 구조

### 2. 확장성
- 향후 별도 DB 서버로 직접 매핑 가능
- PostgreSQL, MySQL 등 관계형 DB 지원
- 성능 최적화된 쿼리 구조

### 3. 데이터 무결성
- 관계형 구조로 데이터 일관성 보장
- 외래키 관계를 통한 참조 무결성
- 정규화를 통한 중복 데이터 최소화

### 4. 관리 편의성
- 각 데이터 유형별 독립적 관리
- 명확한 데이터 구조
- 쉬운 백업 및 복원

## 라이브러리 함수 구조

### 정규화된 구조 저장 함수
```typescript
// 콘텐츠 세트 저장
export async function saveContentSet(contentSetData: ContentSet)

// 지문 저장
export async function savePassage(passageData: PassageData)

// 어휘 용어 저장
export async function saveVocabularyTerms(termsData: {
  contentSetId: string;
  terms: VocabularyTerm[];
})

// 어휘 문제 저장
export async function saveVocabularyQuestions(questionsData: {
  contentSetId: string;
  questions: VocabularyQuestionData[];
})

// 종합 문제 저장
export async function saveComprehensiveQuestions(questionsData: {
  contentSetId: string;
  questions: ComprehensiveQuestionData[];
})

// AI 생성 로그 저장
export async function saveAIGenerationLog(logData: AIGenerationLog)
```

### 정규화된 구조 조회 함수
```typescript
// 콘텐츠 세트 목록 조회
export async function getContentSets(filters?: {
  subject?: string;
  grade?: string;
  area?: string;
  limit?: number;
})

// 특정 콘텐츠 세트 상세 조회
export async function getContentSetDetails(setId: string)
```

## 품질 관리
- MVP 테스트를 통한 적합성 검증
- 학년별 어휘 수준 준수
- 저작권 문제 없는 콘텐츠 보장

## 주요 특징
- 질문형 제목으로 흥미 유발
- 실생활 연계 예시 활용
- 단계적 난이도 조정 (기초→심화)
- 개념어 풀이 제공
- 정규화된 데이터 구조
- 향후 DB 전환 준비 완료

## 시스템 아키텍처

### 데이터 흐름
1. **사용자 입력** → PassageInput 인터페이스
2. **AI 생성** → GPT API 호출
3. **데이터 정규화** → 6개 시트로 분리 저장
4. **조회/편집** → 관계형 구조에서 효율적 조회

### 저장 프로세스
1. **ContentSet** 저장 (기본 정보)
2. **Passage** 저장 (지문 데이터)
3. **VocabularyTerms** 저장 (어휘 용어)
4. **VocabularyQuestions** 저장 (어휘 문제)
5. **ComprehensiveQuestions** 저장 (종합 문제)
6. **AIGenerationLog** 저장 (생성 로그)

### 조회 프로세스
1. **ContentSets** 목록 조회 (필터링/페이지네이션)
2. **ContentSetDetails** 상세 조회 (JOIN 방식)
3. **관련 데이터** 통합 조회 (지문, 어휘, 문제)

## 다음 단계
1. 정규화된 구조 활용 최적화
2. 실시간 편집 기능 고도화
3. 통계 및 분석 기능 강화
4. 별도 DB 서버 전환 준비
5. 사용자 관리 시스템 추가
6. 학습 진도 관리 기능

## 중요한 가이드라인

### 데이터 처리
- 모든 데이터는 정규화된 구조로 저장
- 관계형 구조의 장점을 최대한 활용
- 외래키 관계를 명확히 설정

### API 설계
- RESTful 원칙 준수
- 정규화된 구조에 맞는 엔드포인트 설계
- 효율적인 데이터 조회를 위한 최적화

### 사용자 경험
- 7단계 워크플로우 유지
- 4탭 편집 시스템 활용
- 실시간 저장 및 미리보기 제공

### 성능 최적화
- 불필요한 JSON 파싱 최소화
- 구조화된 데이터 직접 활용
- 효율적인 쿼리 패턴 사용

이 가이드를 따라 정규화된 구조를 효과적으로 활용하여 고품질의 학습 콘텐츠 생성 시스템을 개발하고 유지보수하세요.