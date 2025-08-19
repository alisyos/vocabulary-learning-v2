# 🎓 학습 지문 및 문제 생성 시스템 개발 가이드

## 📋 프로젝트 개요
AI 기반 과목별 독해 지문 및 문제 생성 웹 애플리케이션
- **현재 상태**: 프로덕션 배포 준비 완료 ✅
- **개발 단계**: MVP 완성 + 운영 단계
- **핵심 기능**: 7단계 콘텐츠 생성 워크플로우

### 🛠️ 기술 스택
- **Frontend**: Next.js 15.4.1 (App Router), React 19.1.0, TypeScript 5, Tailwind CSS 4
- **Backend**: Next.js API Routes (서버리스 함수)
- **AI Engine**: OpenAI GPT-4 API (OpenAI SDK 5.9.2)
- **Database**: Supabase PostgreSQL ✅ **완전 전환 완료**
- **Authentication**: React Context + HTTP-Only 쿠키 세션 관리
- **Deployment**: Vercel (프로덕션 배포 준비 완료)
- **Node.js**: 18.0.0+ (Turbopack 개발 서버)

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
- **system_prompts_v3**: 🆕 시스템 프롬프트 관리 (v3 스키마)

#### 🔧 system_prompts_v3 테이블 구조
```sql
CREATE TABLE system_prompts_v3 (
  id SERIAL PRIMARY KEY,
  category VARCHAR(50) NOT NULL,        -- 'area', 'division', 'subject' 등
  subcategory VARCHAR(100) NOT NULL,    -- 'areaBiology', 'divisionMiddle' 등
  key VARCHAR(100) NOT NULL,            -- 'biology', 'middle', 'science' 등
  prompt_content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(category, subcategory, key)
);
```


## 주요 기능 요구사항

### C-01. AI 기반 지문 생성 ✅ **완료**
- **학년별 대상**: 
  - 초등 중학년(3-4학년): 4-5문장/단락, 5-6개 단락
  - 초등 고학년(5-6학년): 5-6문장/단락, 6개 단락 또는 1-2문장/10단락
  - 중학생(1-3학년): ~10문장/5문단 또는 1-2문장/12단락
- **과목 및 영역**: 
  - 사회(4개): 일반사회, 지리, 역사, 경제
  - 과학(4개): 물리, 화학, 생물, 지구과학
- **🆕 지문 유형**: 설명문, 논설문, 탐구문, 뉴스 기사, 인터뷰, 동화, 시, 대본, 소설
- **🆕 지문 길이**: 5가지 옵션 (매우 짧음 ~ 매우 김)

### C-02. 문제 및 해설 생성 ✅ **완료**
- **어휘 문제**: 5지선다, 개념어 기반 (지문당 8-10개)
- **종합 문제**: 4가지 유형별 1개씩 (총 4개)
  - 정보 확인
  - 주제 파악
  - 자료해석
  - 추론
- **보완 문제**: 각 종합 문제당 2개씩 (총 8개)
- **해설 포함**: 모든 문제에 상세 해설 제공

### C-03. 시각자료 콘텐츠 ⏸️ **향후 계획**
- **출처**: 공공데이터, AI 이미지 생성, 이미지 제공 사이트
- **제공 기준**: 개념 이해에 필수적인 경우만 (지문당 1건 내외)
- **현재 상태**: 텍스트 기반 콘텐츠에 집중, 이미지 기능은 향후 추가 예정

## 🌟 핵심 기능 하이라이트

### 🔄 7단계 콘텐츠 생성 워크플로우
1. **지문 생성** → 교육과정 기반 계층적 선택
2. **지문 검토** → 실시간 편집 및 수정
3. **어휘 문제 생성** → 개념어 자동 추출 및 문제 생성
4. **어휘 문제 검토** → 문제별 개별 편집
5. **종합 문제 생성** → 4가지 유형 자동 생성
6. **종합 문제 검토** → 세트별 문제 관리
7. **최종 저장** → Supabase 트랜잭션 저장

### 📊 콘텐츠 관리 시스템
- **관리 대시보드**: 필터링, 검색, 상태별 조회
- **실시간 편집**: 모든 단계에서 즉시 수정 가능
- **상태 관리**: 검수 전 → 검수 완료 워크플로우
- **프롬프트 관리**: DB 기반 동적 프롬프트 수정

### 🔐 사용자 인증 시스템
- **계정 관리**: 8개 하드코딩 계정 (교사용)
- **세션 관리**: HTTP-Only 쿠키 (7일 만료)
- **보안**: XSS 방지, 안전한 세션 저장

## 데이터 구조

### 📝 지문 생성 입력값 (업데이트됨)
```typescript
interface PassageInput {
  // 교육과정 정보
  grade: '초등학교 중학년(3-4학년)' | '초등학교 고학년(5-6학년)' | '중학생(1-3학년)';
  subject: '사회' | '과학';
  area: string; // 세부 영역 (8개 영역)
  
  // 콘텐츠 메타데이터
  main_topic: string; // 대주제
  sub_topic: string; // 소주제
  keywords: string; // 핵심 개념어 (쉼표 분리)
  
  // 🆕 지문 구성 옵션
  passage_length: '매우 짧음' | '짧음' | '보통' | '김' | '매우 김';
  text_type: '설명문' | '논설문' | '탐구문' | '뉴스 기사' | '인터뷰' | '동화' | '시' | '대본' | '소설';
}
```

### 📄 지문 출력 스키마 (업데이트됨)
```typescript
interface PassageOutput {
  title: string; // 질문형·호기심 유발 제목
  paragraphs: string[]; // 문단 배열 (최대 10개)
  vocabulary_terms: {
    term: string;
    definition: string;
    example_sentence?: string;
  }[]; // 🆕 개념어 및 정의
}
```

### 🧠 문제 생성 출력 스키마 (업데이트됨)
```typescript
// 어휘 문제
interface VocabularyQuestion {
  term: string; // 문제 대상 용어
  question: string; // 문제 텍스트
  options: [string, string, string, string, string]; // 5지선다
  correct_answer: string; // 정답 (1~5)
  explanation: string; // 해설
}

// 종합 문제
interface ComprehensiveQuestion {
  question_type: '정보 확인' | '주제 파악' | '자료해석' | '추론';
  question_format: 'multiple_choice' | 'short_answer';
  question: string;
  options?: string[]; // 객관식만
  correct_answer: string;
  explanation: string;
  is_supplementary: boolean; // 보완 문제 여부
  question_set_number: number; // 세트 번호
}
```

### Supabase 테이블 구조 타입 정의

```typescript
// 📊 콘텐츠 세트 (content_sets 테이블) - 메인 테이블
export interface ContentSet {
  id: string; // UUID 기본 키
  user_id?: string; // 생성자 ID
  
  // 교육과정 분류
  division: string; // 초등학교/중학교
  grade: string; // 실제 학년 (3-4학년, 5-6학년, 1-3학년)
  subject: string; // 사회/과학
  area: string; // 세부 영역 (8개)
  
  // 콘텐츠 정보
  main_topic: string; // 대주제
  sub_topic: string; // 소주제
  keywords: string; // 핵심 개념어 (쉼표 분리)
  title: string; // 지문 제목
  
  // 🆕 메타데이터 (새로 추가된 필드)
  passage_length?: string; // 지문 길이 (매우 짧음~매우 김)
  text_type?: string; // 지문 유형 (설명문, 논설문 등)
  
  // 통계 정보
  total_passages: number; // 지문 수 (보통 1개)
  total_vocabulary_terms: number; // 어휘 용어 수
  total_vocabulary_questions: number; // 어휘 문제 수
  total_comprehensive_questions: number; // 종합 문제 수
  
  // 시스템 필드
  status: string; // '검수 전' | '검수완료'
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

## 📊 현재 구현 상태 (2025년 1월 기준)

### ✅ 완료된 핵심 기능
1. **🔄 7단계 콘텐츠 생성 워크플로우** - 완전 구현
   - 지문 생성 → 검토 → 어휘 문제 → 검토 → 종합 문제 → 검토 → 저장
2. **🗄️ Supabase PostgreSQL 완전 전환** - 관계형 DB로 성능 향상
3. **📱 반응형 UI/UX** - 모바일/데스크톱 최적화 완료
4. **🔐 사용자 인증 시스템** - HTTP-Only 쿠키 기반 보안 세션
5. **📝 프롬프트 관리 시스템** - DB 기반 동적 프롬프트 수정
6. **📊 콘텐츠 관리 대시보드** - 필터링, 검색, 상태 관리
7. **🎯 교육과정 기반 생성** - 학년/과목/영역별 맞춤형 콘텐츠
8. **🆕 지문 유형/길이 다양화** - 9가지 유형, 5단계 길이 옵션

### 🛠️ 주요 컴포넌트 및 페이지
- **🏠 MainPage**: 7단계 워크플로우 메인 페이지
- **📝 PassageForm**: 교육과정 기반 계층적 선택 폼
- **✏️ PassageReview**: 지문 실시간 편집 인터페이스
- **📚 VocabularyQuestions**: 어휘 문제 생성/편집 시스템
- **🧠 ComprehensiveQuestions**: 4유형 종합 문제 관리
- **💾 FinalSave**: Supabase 트랜잭션 저장
- **📋 ManagePage**: 콘텐츠 관리 대시보드
- **🎛️ PromptsPage**: 프롬프트 관리 인터페이스
- **🔒 AuthGuard**: 인증 보호 및 Header 컴포넌트

### 🌐 API 엔드포인트 현황 (18개)
```
📝 콘텐츠 생성: /api/generate-{passage|vocabulary|comprehensive}
💾 데이터 관리: /api/{save-final|get-curriculum-data|update-status|delete-set}-supabase
🎛️ 시스템 관리: /api/{prompts|curriculum-admin}/*
🔐 인증: /api/auth/{login|logout|session}
🛠️ 유틸리티: /api/{setup-supabase-schema|migrate-*|test-*}
```

### 📈 기술적 성취
- **타입 안전성**: 100% TypeScript 적용
- **성능 최적화**: 구조화된 데이터 활용으로 JSON 파싱 최소화
- **확장성**: 관계형 DB 설계로 수평/수직 확장 준비
- **보안**: XSS 방지, 안전한 환경변수 관리
- **배포 준비**: Vercel 프로덕션 배포 완료

### 🔮 향후 개선 계획 (우선순위순)
1. **🖼️ 이미지/시각자료 지원** - AI 이미지 생성 통합
2. **👥 사용자 역할 관리** - 관리자/교사/학생별 권한
3. **📊 데이터 분석 대시보드** - 사용량 통계 및 인사이트
4. **🚀 성능 최적화** - 캐싱, 페이지네이션, 지연 로딩
5. **🧪 테스트 시스템** - 단위/통합 테스트 구축
6. **🔍 고급 검색** - 전문 검색 및 AI 추천 시스템
7. **📱 모바일 앱** - React Native 또는 PWA 전환

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

## 🔧 시스템 프롬프트 관리 및 매핑

### 📋 한글-영어 키 매핑 시스템

콘텐츠 생성 시스템은 한글 UI 이름을 영어 데이터베이스 키로 변환하는 매핑 시스템을 사용합니다.

#### 🗂️ 영역(Area) 매핑
```typescript
// 영역명 한글 -> 영어 키 매핑
const areaKeyMap = {
  '지리': 'geography',
  '일반사회': 'social', 
  '역사': 'history',
  '경제': 'economy',
  '정치': 'politics',
  '화학': 'chemistry',
  '물리': 'physics',
  '생물': 'biology',
  '생명': 'biology',
  '지구과학': 'earth',
  '과학탐구': 'science_inquiry'
};

// 서브카테고리 매핑
const areaSubcategoryMap = {
  'geography': 'areaGeography',
  'social': 'areaSocial',
  'history': 'areaHistory',
  'economy': 'areaEconomy',
  'chemistry': 'areaChemistry',
  'physics': 'areaPhysics',
  'biology': 'areaBiology',
  'earth': 'areaEarth'
};
```

#### 🎓 구분(Division) 매핑
```typescript
const divisionKeyMap = {
  '초등학교': 'elementary',
  '중학교': 'middle'
};

const divisionSubcategoryMap = {
  'elementary': 'divisionElementary',
  'middle': 'divisionMiddle'
};
```

#### 📚 과목(Subject) 매핑
```typescript
const subjectKeyMap = {
  '사회': 'social',
  '과학': 'science'
};

const subjectSubcategoryMap = {
  'social': 'subjectSocial',
  'science': 'subjectScience'
};
```

### 🔍 프롬프트 조회 프로세스

1. **한글 입력값 수신** (예: area = '생물')
2. **영어 키 변환** (`getAreaKey('생물')` → `'biology'`)
3. **서브카테고리 결정** (`getAreaSubcategory('biology')` → `'areaBiology'`)
4. **DB 조회** (`system_prompts_v3` 테이블에서 `category='area', subcategory='areaBiology', key='biology'` 조회)
5. **프롬프트 반환** (조회 실패 시 하드코딩된 기본값 사용)

### 🛠️ 프롬프트 관리 시스템 위치

- **매핑 함수**: `/src/lib/prompts.ts`
- **DB 조회 함수**: `/src/lib/supabase.ts` (`getPromptByKey`)
- **프롬프트 생성**: `/src/lib/prompts.ts` (`generateComprehensivePromptFromDB` 등)

## 🚨 문제 해결 가이드

### 🔧 일반적인 문제 및 해결방법

#### 1. 프롬프트가 DB에서 조회되지 않는 문제

**증상**: "###영역", "###구분", "###과목" 섹션이 비어있거나 하드코딩된 값이 표시됨

**원인**: 
- 한글 이름과 영어 키 간의 매핑 문제
- `system_prompts_v3` 테이블에 해당 키가 없음
- 서브카테고리 매핑 오류

**해결방법**:
1. **매핑 확인**: `/src/lib/prompts.ts`에서 매핑 함수 확인
2. **DB 데이터 확인**: Supabase에서 `system_prompts_v3` 테이블 조회
3. **로그 확인**: 콘솔에서 `getPromptFromDB` 함수의 로그 확인

```typescript
// 디버깅용 로그 추가
console.log('Requesting prompt:', { category, subcategory, key });
console.log('Mapped key:', getAreaKey(areaName));
```

#### 2. 콘텐츠 생성 실패

**증상**: GPT API 호출 실패 또는 잘못된 형식의 응답

**원인**:
- OpenAI API 키 문제
- 프롬프트 형식 오류
- 네트워크 연결 문제

**해결방법**:
1. **환경변수 확인**: `OPENAI_API_KEY` 설정 확인
2. **API 응답 로그**: 콘솔에서 GPT 응답 확인
3. **프롬프트 검증**: 생성된 프롬프트 내용 확인

#### 3. Supabase 연결 문제

**증상**: 데이터 저장/조회 실패

**원인**:
- Supabase 환경변수 설정 오류
- 네트워크 연결 문제
- 테이블 스키마 변경

**해결방법**:
1. **환경변수 확인**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. **테이블 존재 확인**: Supabase 대시보드에서 테이블 확인
3. **권한 확인**: RLS 정책 및 API 권한 확인

### 🔍 디버깅 도구

#### 프롬프트 매핑 테스트
```typescript
// 콘솔에서 테스트 가능
import { getAreaKey, getAreaSubcategory } from '@/lib/prompts';

console.log(getAreaKey('생물')); // 'biology'
console.log(getAreaSubcategory('biology')); // 'areaBiology'
```

#### DB 조회 테스트
```typescript
// API 경로에서 테스트
import { getPromptByKey } from '@/lib/supabase';

const prompt = await getPromptByKey('area', 'areaBiology', 'biology');
console.log('Retrieved prompt:', prompt);
```

### 📝 로그 분석

**중요한 로그 패턴**:
- `getPromptFromDB`: DB 조회 결과
- `Mapped key`: 매핑된 키 값
- `API Response`: GPT API 응답
- `Generated questions`: 생성된 문제 수

**오류 패턴**:
- `undefined prompt`: 매핑 또는 DB 조회 실패
- `JSON parse error`: GPT 응답 파싱 실패
- `Supabase error`: 데이터베이스 연결 문제

## 🔄 최근 업데이트 (2025년 1월)

### ✅ 완료된 수정 사항

1. **종합 문제 유형 체계 개편** (2025-01-29)
   - 기존 5가지 유형에서 새로운 4가지 유형으로 전환
   - 이전: 단답형, 핵심 내용 요약, 핵심문장 찾기, OX문제, 자료분석하기
   - **신규**: 정보 확인, 주제 파악, 자료해석, 추론
   - DB 기반 프롬프트 시스템으로 완전 전환

2. **프롬프트 매핑 시스템 구현** (2025-01-29)
   - 한글 UI 이름 → 영어 DB 키 매핑 함수 추가
   - `getAreaKey`, `getDivisionKey`, `getSubjectKey` 함수 구현
   - 서브카테고리 매핑 함수 추가
   - `getComprehensiveTypeKey` 함수를 새로운 유형에 맞게 수정

3. **DB 조회 최적화**
   - `system_prompts_v3` 테이블 구조 활용
   - 올바른 키와 서브카테고리로 조회 수정
   - 폴백 메커니즘 유지

4. **UI/UX 개선**
   - FinalSave.tsx의 종합 문제 유형별 분포 표시를 새로운 4가지 유형으로 업데이트
   - 저장 완료 페이지에서 정확한 유형 분류 표시

5. **타입 안전성 강화**
   - TypeScript 매핑 함수 타입 정의
   - 오류 처리 개선

### 🚀 다음 개선 계획

1. **프롬프트 관리 UI 개선**
   - 매핑 관계 시각화
   - 프롬프트 편집 시 키 매핑 표시

2. **자동 테스트 추가**
   - 매핑 함수 단위 테스트
   - DB 조회 통합 테스트

3. **모니터링 강화**
   - 프롬프트 조회 성공률 추적
   - 실패 원인 분석 로깅

---

이 가이드를 따라 Supabase를 활용하여 고성능, 확장 가능한 학습 콘텐츠 생성 시스템을 구축하고 운영하세요.