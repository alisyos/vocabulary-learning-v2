// 구분 타입 (기존 학년)
export type DivisionType = 
  | '초등학교 중학년(3-4학년)' 
  | '초등학교 고학년(5-6학년)' 
  | '중학생(1-3학년)';

// 학년 타입 정의
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

// 필드 데이터 타입 정의
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

// 지문 출력 스키마 (AI 생성용)
export interface PassageOutput {
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

// 어휘 문제 (각 용어당 1개씩) - 워크플로우용
export interface VocabularyQuestionWorkflow {
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

// 종합 문제 개별 문제 (워크플로우용)
export interface ComprehensiveQuestionWorkflow {
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
  vocabularyQuestions: VocabularyQuestionWorkflow[];  // 3,4. 어휘 문제들
  comprehensiveQuestions: ComprehensiveQuestionWorkflow[]; // 5,6. 종합 문제들
  
  // 상태 관리
  currentStep: WorkflowStep;
  loading: boolean;
}

// ============================================================================
// 사용자 인증 시스템 타입들
// ============================================================================

// 사용자 정보
export interface User {
  userId: string;
  name: string;
  isLoggedIn: boolean;
}

// 로그인 요청
export interface LoginRequest {
  userId: string;
  password: string;
}

// 로그인 응답
export interface LoginResponse {
  success: boolean;
  user?: User;
  message?: string;
}

// 세션 정보
export interface SessionInfo {
  user: User | null;
  isLoading: boolean;
}

// 하드코딩된 계정 정보
export interface Account {
  userId: string;
  password: string;
  name: string;
}

// ============================================================================
// 정규화된 구조 타입들 (DB 연동 준비 완료) - 업데이트
// ============================================================================

// 콘텐츠 상태 타입
export type ContentStatus = '검수 전' | '검수완료';

// 콘텐츠 세트 (content_sets 테이블) - Supabase 적용
export interface ContentSet {
  id?: string; // UUID
  user_id?: string; // 생성자 ID
  division: string; // 구분 (초등학교 중학년, 고학년, 중학생)
  grade: string; // 실제 학년
  subject: SubjectType;
  area: string;
  main_topic?: string; // 대주제
  sub_topic?: string; // 소주제
  keywords?: string; // 키워드
  title: string; // passageTitle -> title로 단순화
  total_passages: number;
  total_vocabulary_terms: number;
  total_vocabulary_questions: number;
  total_comprehensive_questions: number;
  status?: '검수 전' | '검수완료'; // 상태값
  passage_length?: string | null; // 지문 길이 (선택사항)
  text_type?: string | null; // 지문 유형 (선택사항)
  created_at?: string;
  updated_at?: string;
}

// 지문 (passages 테이블) - Supabase 적용
export interface Passage {
  id?: string; // UUID
  content_set_id: string; // UUID
  passage_number: number;
  title: string;
  paragraph_1?: string;
  paragraph_2?: string;
  paragraph_3?: string;
  paragraph_4?: string;
  paragraph_5?: string;
  paragraph_6?: string;
  paragraph_7?: string;
  paragraph_8?: string;
  paragraph_9?: string;
  paragraph_10?: string;
  created_at?: string;
}

// 어휘 용어 (vocabulary_terms 테이블) - Supabase 적용
export interface VocabularyTerm {
  id?: string; // UUID
  content_set_id: string; // UUID
  term: string;
  definition: string;
  example_sentence?: string | null; // 예시 문장
  created_at?: string;
}

// 어휘 문제 (vocabulary_questions 테이블) - Supabase 적용
export interface VocabularyQuestion {
  id?: string; // UUID
  content_set_id: string; // UUID
  question_number: number;
  question_type: '객관식' | '주관식';
  difficulty: '일반' | '보완';
  term?: string; // 어휘 용어
  question_text: string;
  option_1?: string;
  option_2?: string;
  option_3?: string;
  option_4?: string;
  option_5?: string;
  correct_answer: string;
  explanation: string;
  created_at?: string;
}

// 종합 문제 (comprehensive_questions 테이블) - Supabase 적용
export interface ComprehensiveQuestionDB {
  id?: string; // UUID
  content_set_id: string; // UUID
  question_number: number;
  question_type: '단답형' | '문단별 순서 맞추기' | '핵심 내용 요약' | '핵심어/핵심문장 찾기';
  question_format: '객관식' | '주관식';
  difficulty: '일반' | '보완';
  question_text: string;
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
  created_at?: string;
}

// AI 생성 로그 (ai_generation_logs 테이블) - Supabase 적용
export interface AIGenerationLog {
  id?: string; // UUID
  content_set_id?: string; // UUID, nullable
  generation_type: 'passage' | 'vocabulary' | 'comprehensive';
  prompt_used: string;
  ai_response?: string; // JSON string
  tokens_used?: number;
  generation_time_ms?: number;
  status: 'success' | 'error' | 'partial';
  error_message?: string;
  created_at?: string;
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
  contentSet: ContentSet;
  passage: Passage | null;
  vocabularyTerms: VocabularyTerm[];
  vocabularyQuestions: VocabularyQuestion[];
  comprehensiveQuestions: ComprehensiveQuestionDB[];
}

// API 응답을 위한 타입들
export interface ContentSetsResponseV2 {
  success: boolean;
  data: ContentSet[];
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
  savedTables: string[];
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

// 교육과정 데이터 (curriculum_data 테이블) - Supabase 적용
export interface CurriculumData {
  id?: string; // UUID
  subject: SubjectType;
  grade: string;
  area: string;
  main_topic: string;
  sub_topic: string;
  keywords: string;
  is_active: boolean;
  created_at?: string;
}

// 교육과정 데이터 (curriculum_data 테이블) - 레거시 (V2)
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
  | 'system'            // 전체 시스템 프롬프트
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

// 프롬프트 데이터 (system_prompts_v2 테이블) - 새로운 구조
export interface SystemPrompt {
  id?: string; // UUID
  promptId: string; // unique identifier
  category: PromptCategory; // 'passage' | 'vocabulary' | 'comprehensive'
  subCategory: PromptSubCategory; // 서브 카테고리
  name: string; // 프롬프트 이름
  key: string; // 키 (실제 사용할 때의 키)
  promptText: string; // 프롬프트 내용
  description?: string; // 설명
  isActive: boolean;
  isDefault: boolean;
  version: number;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

// 레거시 프롬프트 데이터 (기존 system_prompts 테이블)
export interface SystemPromptLegacy {
  id?: string; // UUID
  prompt_type: string; // 'passage_generation' | 'vocabulary_generation' | 'comprehensive_generation'
  prompt_content: string;
  version: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
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
  isFromDatabase?: boolean; // 실제 DB에서 가져온 데이터인지 여부
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