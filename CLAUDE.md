# 학습 지문 및 문제 생성 시스템 개발 가이드

## 프로젝트 개요
AI 기반 과목별 독해 지문 및 문제 생성 웹 애플리케이션 개발

### 기술 스택
- **Frontend**: Next.js 15.4.1, React 19.1.0, TypeScript 5, Tailwind CSS 4
- **Backend**: Next.js API Routes
- **AI**: OpenAI GPT-4 API (OpenAI 5.9.2)
- **DB**: Supabase (PostgreSQL) - 메인 데이터베이스 ✅ **전환 완료**
- **Authentication**: React Context 기반 세션 관리
- **배포**: Vercel

## 🗄️ 데이터베이스 구조

### 🆕 Supabase (PostgreSQL) - 메인 데이터베이스

현재 시스템은 Supabase PostgreSQL을 메인 데이터베이스로 사용합니다.

#### 주요 테이블 구조
- **content_sets**: 콘텐츠 세트 기본 정보 (UUID 기반)
- **passages**: 지문 데이터 (paragraph_1 ~ paragraph_10)
- **vocabulary_terms**: 어휘 용어 및 정의
- **vocabulary_questions**: 어휘 문제 (5지선다)
- **comprehensive_questions**: 종합 문제 (객관식/주관식)
- **ai_generation_logs**: AI 생성 로그 및 통계
- **system_prompts**: 시스템 프롬프트 관리


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

### Supabase 테이블 구조 타입 정의

```typescript
// 콘텐츠 세트 (content_sets 테이블)
export interface ContentSet {
  id: string;
  user_id?: string;
  division: string;
  subject: string;
  grade: string;
  area: string;
  main_topic: string;
  sub_topic: string;
  keywords: string;
  title: string;
  total_passages: number;
  total_vocabulary_terms: number;
  total_vocabulary_questions: number;
  total_comprehensive_questions: number;
  status: string;
  created_at: string;
  updated_at: string;
}

// 지문 (passages 테이블)
export interface Passage {
  id: string;
  content_set_id: string;
  passage_number: number;
  title: string;
  paragraph_1?: string;
  paragraph_2?: string;
  // ... paragraph_10까지
  created_at: string;
}

// 어휘 용어 (vocabulary_terms 테이블)
export interface VocabularyTerm {
  id: string;
  content_set_id: string;
  term: string;
  definition: string;
  example_sentence?: string;
  order_index: number;
  created_at: string;
}

// 어휘 문제 (vocabulary_questions 테이블)
export interface VocabularyQuestion {
  id: string;
  content_set_id: string;
  question_number: number;
  term: string;
  question: string;
  option_1: string;
  option_2: string;
  option_3: string;
  option_4: string;
  option_5: string;
  correct_answer: string;
  explanation: string;
  created_at: string;
}

// 종합 문제 (comprehensive_questions 테이블)
export interface ComprehensiveQuestionDB {
  id: string;
  content_set_id: string;
  question_number: number;
  question_type: string;
  question: string;
  question_format: 'multiple_choice' | 'short_answer';
  option_1?: string;
  option_2?: string;
  option_3?: string;
  option_4?: string;
  option_5?: string;
  correct_answer: string;
  explanation: string;
  is_supplementary: boolean;
  original_question_id?: string;
  question_set_number: number;
  created_at: string;
}

// AI 생성 로그 (ai_generation_logs 테이블)
export interface AIGenerationLog {
  id: string;
  content_set_id: string;
  generation_type: 'passage' | 'vocabulary' | 'comprehensive';
  prompt_used: string;
  ai_response: any; // JSON 형태
  generation_time_ms?: number;
  tokens_used?: number;
  cost_usd?: number;
  created_at: string;
}

// 시스템 프롬프트 (system_prompts 테이블)
export interface SystemPrompt {
  id: string;
  prompt_type: string;
  prompt_content: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

## 개발 가이드라인

### 1. 프롬프트 엔지니어링
- 문서에 포함된 상세한 프롬프트를 활용
- 학년별, 과목별, 영역별 특성 반영
- JSON 형식 출력 보장

### 2. 데이터베이스 연동
- **Supabase**: 메인 데이터베이스로 PostgreSQL 사용
- 관계형 구조로 데이터 저장
- UUID 기반 ID 시스템

### 3. UI/UX 설계
- 직관적인 입력 폼 (학년, 과목, 영역 선택)
- 생성된 지문 및 문제 표시
- 학습자 친화적 인터페이스
- 7단계 워크플로우
- 4탭 편집 시스템

### 4. API 구조
```
## 콘텐츠 생성 API
/api/generate-passage - 지문 생성
/api/generate-vocabulary - 어휘 문제 생성
/api/generate-comprehensive - 종합 문제 생성

## 데이터 관리 API
/api/save-final-supabase - 최종 저장
/api/get-curriculum-data-supabase - 콘텐츠 조회 (목록/상세)
/api/get-set-details-supabase - 콘텐츠 상세 조회
/api/update-status - 상태 업데이트
/api/delete-set - 콘텐츠 삭제

## 프롬프트 관리 API
/api/prompts - 프롬프트 조회
/api/prompts/update - 프롬프트 업데이트

## 인증 API
/api/auth/login - 사용자 로그인
/api/auth/logout - 사용자 로그아웃
/api/auth/session - 세션 검증
```

## Supabase 데이터베이스의 장점

### 1. 성능 최적화
- JSON 파싱 없이 구조화된 데이터 직접 조회
- 빠른 데이터 접근과 수정
- 효율적인 관계형 구조

### 2. 확장성
- 실시간 데이터 동기화 지원
- PostgreSQL의 모든 기능 활용
- 성능 최적화된 쿼리 구조

### 3. 데이터 무결성
- 관계형 구조로 데이터 일관성 보장
- 외래키 관계를 통한 참조 무결성
- 트랜잭션을 통한 데이터 안정성

### 4. 관리 편의성
- 각 데이터 유형별 독립적 관리
- 명확한 데이터 구조
- 쉬운 백업 및 복원

## Supabase 함수 구조

### 주요 Supabase 함수 구조

```typescript
// db 객체를 통한 통합된 데이터 접근
export const db = {
  // 콘텐츠 세트 관리
  async createContentSet(data: Omit<ContentSet, 'id' | 'created_at' | 'updated_at'>): Promise<ContentSet>
  async getContentSets(filters?: { grade?: string; subject?: string; area?: string }): Promise<ContentSet[]>
  async getContentSetById(id: string): Promise<ContentSet & RelatedData>
  async updateContentSet(id: string, data: Partial<ContentSet>): Promise<ContentSet>
  async deleteContentSet(id: string): Promise<void>

  // 지문 관리
  async createPassage(data: Omit<Passage, 'id' | 'created_at'>): Promise<Passage>
  async getPassagesByContentSetId(contentSetId: string): Promise<Passage[]>
  async updatePassage(id: string, data: Partial<Passage>): Promise<Passage>

  // 어휘 관리
  async createVocabularyTerms(terms: Omit<VocabularyTerm, 'id' | 'created_at'>[]): Promise<VocabularyTerm[]>
  async getVocabularyTermsByContentSetId(contentSetId: string): Promise<VocabularyTerm[]>

  // 어휘 문제 관리
  async createVocabularyQuestions(questions: Omit<VocabularyQuestion, 'id' | 'created_at'>[]): Promise<VocabularyQuestion[]>
  async getVocabularyQuestionsByContentSetId(contentSetId: string): Promise<VocabularyQuestion[]>
  async updateVocabularyQuestion(id: string, data: Partial<VocabularyQuestion>): Promise<VocabularyQuestion>

  // 종합 문제 관리
  async createComprehensiveQuestions(questions: Omit<ComprehensiveQuestionDB, 'id' | 'created_at'>[]): Promise<ComprehensiveQuestionDB[]>
  async getComprehensiveQuestionsByContentSetId(contentSetId: string): Promise<ComprehensiveQuestionDB[]>
  async updateComprehensiveQuestion(id: string, data: Partial<ComprehensiveQuestionDB>): Promise<ComprehensiveQuestionDB>

  // 시스템 프롬프트 관리
  async getSystemPrompts(): Promise<SystemPrompt[]>
  async getSystemPromptByType(promptType: string): Promise<SystemPrompt>
  async updateSystemPrompt(promptType: string, promptContent: string): Promise<SystemPrompt>

  // 통합 저장 함수
  async saveCompleteContentSet(
    contentSetData: Omit<ContentSet, 'id' | 'created_at' | 'updated_at'>,
    passagesData: Omit<Passage, 'id' | 'content_set_id' | 'created_at'>[],
    vocabularyTerms: Omit<VocabularyTerm, 'id' | 'content_set_id' | 'created_at'>[],
    vocabularyQuestions: Omit<VocabularyQuestion, 'id' | 'content_set_id' | 'created_at'>[],
    comprehensiveQuestions: Omit<ComprehensiveQuestionDB, 'id' | 'content_set_id' | 'created_at'>[]
  ): Promise<ContentSet>

  // 교육과정 데이터 관리
  async getCurriculumData(filters?: { subject?: string; grade?: string; area?: string }): Promise<CurriculumData[]>
}
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
- Supabase PostgreSQL 기반 안정적인 데이터 저장

## 시스템 아키텍처

### 데이터 흐름
1. **사용자 입력** → PassageInput 인터페이스 (지문 유형 및 길이 포함)
2. **AI 생성** → GPT API 호출 (Supabase 관리 프롬프트 사용)
3. **데이터 저장** → Supabase PostgreSQL 테이블에 관계형 저장
4. **조회/편집** → 관계형 구조에서 효율적 조회 (상태 기반 필터링)

### 저장 프로세스
1. **ContentSet** 저장 (기본 정보 + 지문 유형/길이 정보)
2. **Passage** 저장 (지문 데이터)
3. **VocabularyTerms** 저장 (어휘 용어)
4. **VocabularyQuestions** 저장 (어휘 문제)
5. **ComprehensiveQuestions** 저장 (종합 문제)
6. **AIGenerationLog** 저장 (생성 로그)

### 조회 프로세스
1. **ContentSets** 목록 조회 (필터링/페이지네이션)
2. **ContentSetDetails** 상세 조회 (JOIN 방식)
3. **관련 데이터** 통합 조회 (지문, 어휘, 문제)
4. **실시간 동기화** Supabase 실시간 기능 활용

## 📋 현재 구현 상태

### ✅ 완료된 기능
1. **7단계 워크플로우**: 지문 생성부터 최종 저장까지 완전 구현
2. **Supabase PostgreSQL 전환**: Google Sheets에서 완전 전환 완료
3. **콘텐츠 관리 시스템**: 관리 대시보드 및 상세 편집 기능
4. **프롬프트 관리 시스템**: DB 기반 프롬프트 관리 완전 구현
5. **사용자 인증 시스템**: 로그인/로그아웃 및 세션 관리
6. **콘텐츠 상태 관리**: 검수 전/검수완료 상태 관리
7. **반응형 UI**: 모바일 및 데스크톱 최적화

### 🔄 주요 컴포넌트
- **PassageForm**: 지문 생성 폼 (계층적 선택 및 지문 유형 선택)
- **PassageReview**: 지문 검토 및 실시간 편집
- **VocabularyQuestions**: 어휘 문제 생성 및 편집
- **ComprehensiveQuestions**: 종합 문제 생성 및 세트 관리
- **FinalSave**: 최종 저장 및 백업
- **AuthGuard**: 인증 보호 컴포넌트
- **Header**: 사용자 정보 및 네비게이션

### 🔧 다음 개선 사항
1. **사용자 관리 고도화**: 역할별 권한 관리
2. **성능 최적화**: 대용량 데이터 처리 개선
3. **분석 및 통계**: 사용자 활동 분석 기능
4. **API 최적화**: 캐싱 및 속도 개선
5. **테스트 코드**: 단위 테스트 및 통합 테스트
6. **고급 검색**: 전문 검색 및 AI 기반 추천 시스템

## 중요한 가이드라인

### 데이터 처리
- 모든 데이터는 Supabase PostgreSQL에 저장
- 관계형 구조의 장점을 최대한 활용
- 외래키 관계를 명확히 설정

### API 설계
- RESTful 원칙 준수
- Supabase 기반 효율적인 엔드포인트 설계
- 효율적인 데이터 조회를 위한 최적화

### 사용자 경험
- 7단계 워크플로우 유지
- 4탭 편집 시스템 활용
- 실시간 저장 및 미리보기 제공

### 성능 최적화
- 불필요한 JSON 파싱 최소화
- 구조화된 데이터 직접 활용
- 효율적인 쿼리 패턴 사용

---

이 가이드를 따라 Supabase를 활용하여 고성능, 확장 가능한 학습 콘텐츠 생성 시스템을 구축하고 운영하세요.