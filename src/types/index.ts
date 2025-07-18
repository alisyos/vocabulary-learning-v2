// 구분 타입 (기존 학년)
export type DivisionType = 
  | '초등학교 중학년(3-4학년)' 
  | '초등학교 고학년(5-6학년)' 
  | '중학생(1-3학년)';

// 학년 타입 (새로 추가, Google Sheets와 연동)
export type GradeType = string;

// 과목 타입
export type SubjectType = '사회' | '과학';

// 영역 타입
export type AreaType = 
  | '일반사회' | '지리' | '역사' | '경제'  // 사회
  | '물리' | '화학' | '생물' | '지구과학'; // 과학

// 지문 길이 타입
export type PassageLengthType = 
  | '4-5문장으로 구성한 5-6개 단락'
  | '5-6문장으로 구성한 6개 단락'
  | '1-2문장으로 구성한 10개 단락'
  | '10문장 이하로 구성한 5개 단락'
  | '1-2문장으로 구성한 12개 단락';

// 지문 유형 타입
export type TextType = 
  | '설명문' | '논설문' | '탐구문' | '뉴스 기사' | '인터뷰' 
  | '동화' | '시' | '대본' | '소설';

// 문제 형태 타입
export type QuestionType = '객관식' | '주관식';

// 필드 데이터 타입 (Google Sheets field 시트)
export interface FieldData {
  subject: string;
  grade: string;
  area: string;
  maintopic: string;
  subtopic: string;
  keyword: string;
}

// 지문 생성 입력값 (업데이트됨)
export interface PassageInput {
  division: DivisionType;   // 구분 (기존 grade)
  length: PassageLengthType;
  subject: SubjectType;
  grade: GradeType | '';    // 새로운 학년 필드
  area: AreaType | '';      // 빈 문자열 허용 (초기화 시)
  maintopic: string;        // 대주제
  subtopic: string;         // 소주제
  keyword: string;          // 핵심 개념어
  textType?: TextType;      // 유형 (선택사항)
}

// 지문 출력 스키마
export interface Passage {
  passages: {
    title: string;
    paragraphs: string[];
    footnote: string[];
  }[];
}

// 문제 생성 입력값
export interface QuestionInput {
  division: DivisionType;   // 구분 (기존 grade)
  passage: string;
  questionType: QuestionType;
}

// 객관식 문제
export interface MultipleChoiceQuestion {
  questionType: '객관식';
  questions: {
    type: '일반' | '보완';
    question: string;
    options: string[];
    answer: string;
    explanation: string;
  }[];
}

// 주관식 문제
export interface ShortAnswerQuestion {
  questionType: '주관식';
  questions: {
    type: '일반' | '보완';
    question: string;
    answer: string;
    explanation: string;
  }[];
}

// 문제 전체 타입
export type Question = MultipleChoiceQuestion | ShortAnswerQuestion;

// === 새로운 워크플로우 타입들 ===

// 워크플로우 단계
export type WorkflowStep = 
  | 'passage-generation'     // 1. 지문 생성
  | 'passage-review'        // 2. 지문 검토&수정
  | 'vocabulary-generation' // 3. 어휘 문제 생성
  | 'vocabulary-review'     // 4. 어휘 문제 검토&수정
  | 'comprehensive-generation' // 5. 종합 문제 생성
  | 'comprehensive-review'  // 6. 종합 문제 검토&수정
  | 'final-save';          // 7. 저장

// 편집 가능한 지문 (사용자가 수정 가능)
export interface EditablePassage {
  title: string;
  paragraphs: string[];
  footnote: string[];
}

// 어휘 문제 (각 용어당 1개씩)
export interface VocabularyQuestion {
  id: string;
  term: string;        // 용어
  question: string;    // 질문
  options: string[];   // 보기 1~5
  answer: string;      // 정답
  explanation: string; // 해설
}

// 종합 문제 유형
export type ComprehensiveQuestionType = 
  | 'Random'                    // 랜덤 (4가지 유형 3개씩)
  | '단답형'                    // 주관식 단답형
  | '문단별 순서 맞추기'         // 객관식 문단별 순서 맞추기
  | '핵심 내용 요약'            // 객관식 핵심 내용 요약
  | '핵심어/핵심문장 찾기';      // 객관식 핵심어/핵심문장 찾기

// 종합 문제 개별 문제
export interface ComprehensiveQuestion {
  id: string;
  type: Exclude<ComprehensiveQuestionType, 'Random'>;
  question: string;
  options?: string[];   // 객관식인 경우만
  answer: string;
  explanation: string;
  isSupplementary?: boolean; // 보완 문제 여부
  originalQuestionId?: string; // 보완 문제의 경우 원본 문제 ID
}

// 워크플로우 전체 데이터
export interface WorkflowData {
  // 기본 입력 정보
  input: PassageInput;
  
  // 각 단계별 데이터
  generatedPassage: Passage | null;           // 1. 생성된 지문
  editablePassage: EditablePassage | null;    // 2. 편집 가능한 지문
  vocabularyQuestions: VocabularyQuestion[];  // 3,4. 어휘 문제들
  comprehensiveQuestions: ComprehensiveQuestion[]; // 5,6. 종합 문제들
  
  // 상태 관리
  currentStep: WorkflowStep;
  loading: boolean;
}

// ============================================================================
// 정규화된 구조 타입들 (DB 연동 준비 완료)
// ============================================================================

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

// 사용 통계 (usage_statistics 테이블)
export interface UsageStatisticsV2 {
  id?: number;
  contentSetId: string;
  viewCount: number;
  downloadCount: number;
  lastAccessed?: string;
  createdAt: string;
  updatedAt: string;
}

// 정규화된 구조의 전체 콘텐츠 상세 정보
export interface ContentSetDetailsV2 {
  contentSet: ContentSetV2;
  passage: PassageV2 | null;
  vocabularyTerms: VocabularyTermV2[];
  vocabularyQuestions: VocabularyQuestionV2[];
  comprehensiveQuestions: ComprehensiveQuestionV2[];
}

// API 응답을 위한 타입들
export interface ContentSetsResponseV2 {
  success: boolean;
  data: ContentSetV2[];
  stats: {
    totalSets: number;
    subjects: string[];
    grades: string[];
    areas: string[];
  };
  total: number;
  filtered?: number;
  filters?: {
    subject?: string;
    grade?: string;
    area?: string;
    limit?: number;
  };
  version: 'v2';
  message?: string;
}

export interface ContentSetDetailsResponseV2 {
  success: boolean;
  data: ContentSetDetailsV2;
  version: 'v2';
  message?: string;
}

// 마이그레이션 응답 타입
export interface MigrationResponseV2 {
  success: boolean;
  message: string;
  newSheets: string[];
  description?: string;
  nextSteps?: string[];
  error?: string;
  details?: string;
  troubleshooting?: string[];
}

// 향후 DB 연동을 위한 사용자 타입 (미리 정의)
export interface UserV2 {
  id?: number;
  email: string;
  name: string;
  role: 'admin' | 'teacher' | 'student';
  createdAt: string;
  updatedAt: string;
}

// 교육과정 데이터 (curriculum_data 테이블)
export interface CurriculumDataV2 {
  id?: number;
  subject: SubjectType;
  grade: string;
  area: string;
  mainTopic: string;
  subTopic: string;
  keywords: string;
  isActive: boolean;
  createdAt: string;
}

// ============================================================================
// 프롬프트 관리 시스템 타입들
// ============================================================================

// 프롬프트 카테고리 (생성 단계별)
export type PromptCategory = 
  | 'passage'         // 지문 생성
  | 'vocabulary'      // 어휘 문제 생성
  | 'comprehensive';  // 종합 문제 생성

// 프롬프트 서브 카테고리 (선택 옵션별)
export type PromptSubCategory = 
  // 지문 생성
  | 'division'          // 구분별 (초등 중학년/고학년, 중학생)
  | 'area'              // 영역별 (일반사회, 지리, 역사, 경제, 물리, 화학, 생물, 지구과학)
  | 'length'            // 길이별 (출력 형식)
  | 'textType'          // 유형별 (설명문, 논설문, 탐구문 등)
  // 어휘 문제 생성
  | 'vocabularyBase'    // 기본 어휘 문제 생성
  // 종합 문제 생성
  | 'questionGrade'     // 학년별 (문제 난이도)
  | 'questionType'      // 문제 유형별 (객관식, 주관식)
  | 'comprehensiveType' // 종합 문제 유형별
  | 'outputFormat';     // 출력 형식별

// 프롬프트 데이터 (system_prompts 테이블)
export interface SystemPrompt {
  id?: number;
  promptId: string;           // 고유 식별자 (예: 'division_elementary_mid')
  category: PromptCategory;   // 주 카테고리
  subCategory: PromptSubCategory; // 하위 카테고리
  name: string;               // 프롬프트 이름 (예: '초등학교 중학년(3-4학년)')
  key: string;                // 키 값 (예: '초등학교 중학년(3-4학년)')
  promptText: string;         // 실제 프롬프트 내용
  description?: string;       // 프롬프트 설명
  isActive: boolean;          // 활성화 여부
  isDefault: boolean;         // 기본값 여부
  version: number;            // 버전 (수정 이력 관리)
  createdAt: string;
  updatedAt: string;
  createdBy?: string;         // 생성자 (향후 사용자 시스템 연동)
  updatedBy?: string;         // 수정자 (향후 사용자 시스템 연동)
}

// 프롬프트 수정 이력 (prompt_history 테이블) - 향후 확장용
export interface PromptHistory {
  id?: number;
  promptId: string;
  version: number;
  promptText: string;
  changeReason?: string;
  createdAt: string;
  createdBy?: string;
}

// 프롬프트 사용 통계 (prompt_usage_stats 테이블) - 향후 확장용
export interface PromptUsageStats {
  id?: number;
  promptId: string;
  usageCount: number;
  lastUsedAt: string;
  avgGenerationTime?: number; // 평균 생성 시간
  successRate?: number;       // 성공률
  updatedAt: string;
}

// API용 프롬프트 그룹 데이터
export interface PromptGroup {
  category: PromptCategory;
  categoryName: string;
  subCategories: {
    subCategory: PromptSubCategory;
    subCategoryName: string;
    prompts: SystemPrompt[];
  }[];
}

// 프롬프트 관리 API 응답
export interface PromptsResponse {
  success: boolean;
  data: PromptGroup[];
  version: string;
  message?: string;
}

// 프롬프트 업데이트 요청
export interface PromptUpdateRequest {
  promptId: string;
  promptText: string;
  changeReason?: string;
}

// 프롬프트 업데이트 응답
export interface PromptUpdateResponse {
  success: boolean;
  promptId: string;
  newVersion: number;
  message: string;
}