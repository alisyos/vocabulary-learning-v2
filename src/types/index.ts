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
  | '2개의 지문 생성. 지문당 300자 내외 - 총 600자'
  | '2개의 지문 생성. 지문당 400자 내외 - 총 800자'
  | '2개의 지문 생성. 지문당 500자 내외 - 총 1,000자';

// 지문 유형 타입
export type TextType = 
  | '생활문' | '편지글' | '기행문' | '논설문' | '설명문' 
  | '기사문' | '과학탐구보고서' | '실험보고서' | '사회현상보고서';

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
  keywords_for_passages?: string;
  keywords_for_questions?: string;
}

// 지문 생성 입력값 (업데이트됨)
export interface PassageInput {
  division: DivisionType;   // 구분 (기존 grade)
  length: PassageLengthType;
  subject: SubjectType;
  grade: GradeType | '';    // 새로운 학년 필드
  area: AreaType | '';      // 빈 문자열 허용 (초기화 시)
  session_number?: string | null;  // 차시 번호
  maintopic: string;        // 대주제
  subtopic: string;         // 소주제
  keyword: string;          // 핵심 개념어
  keywords_for_passages?: string; // 지문용 키워드
  keywords_for_questions?: string; // 문제용 키워드
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

// 워크플로우 단계 (9단계로 확장)
export type WorkflowStep = 
  | 'passage-generation'     // 1. 지문 생성
  | 'passage-review'        // 2. 지문 검토&수정
  | 'vocabulary-generation' // 3. 어휘 문제 생성
  | 'vocabulary-review'     // 4. 어휘 문제 검토&수정
  | 'paragraph-generation'  // 5. 문단 문제 생성
  | 'paragraph-review'      // 6. 문단 문제 검토&수정
  | 'comprehensive-generation' // 7. 종합 문제 생성
  | 'comprehensive-review'  // 8. 종합 문제 검토&수정
  | 'final-save';          // 9. 저장

// 편집 가능한 지문 (사용자가 수정 가능) - 2개 지문 지원
export interface EditablePassage {
  title: string;
  paragraphs: string[];
  footnote: string[];
  // 2개 지문 지원 필드 (새 형식)
  passages?: {
    title: string;
    paragraphs: string[];
    footnote: string[];
  }[];
  // 도입 질문 (선택적) - 2개 지문을 아우르는 흥미 유발 질문
  introduction_question?: string;
}

// 어휘 문제 (각 용어당 1개씩) - 워크플로우용 (업데이트)
export interface VocabularyQuestionWorkflow {
  id: string;
  term: string;                    // 용어
  questionType: VocabularyQuestionType; // 문제 유형
  question: string;                // 질문
  options?: string[];              // 보기 (객관식인 경우만, 2~5개)
  answer: string;                  // 정답
  answerInitials?: string;         // 단답형인 경우 초성 힌트 (예: 'ㅈㄹㅎㅁ')
  explanation: string;             // 해설
  difficulty?: '일반' | '보완';     // 난이도/유형 구분 (기본 문제: '일반', 보완 문제: '보완')
  isSupplementary?: boolean;       // 보완 문제 여부 (호환성)
}

// 문단 문제 유형
export type ParagraphQuestionType = 
  | 'Random'           // 랜덤 (5가지 유형 1개씩)
  | '빈칸 채우기'       // 객관식 - 빈칸 채우기
  | '주관식 단답형'     // 주관식 - 단답형 (초성 포함)
  | '어절 순서 맞추기'   // 객관식 - 어절 순서 맞추기
  | 'OX문제'          // 객관식 - OX문제
  | '객관식 일반형';    // 객관식 - 일반형

// 문단 문제 개별 문제 (워크플로우용)
export interface ParagraphQuestionWorkflow {
  id: string;
  type: Exclude<ParagraphQuestionType, 'Random'>;
  paragraphNumber: number;   // 문단 번호 (1~10)
  paragraphText: string;     // 해당 문단 내용
  question: string;          // 문제
  options?: string[];        // 객관식인 경우만 보기 (4개 또는 5개)
  wordSegments?: string[];   // 어절 순서 맞추기인 경우 개별 어절들
  answer: string;            // 정답
  answerInitials?: string;   // 주관식 단답형인 경우 초성 (예: 'ㅈㄹㅎㅁ')
  explanation: string;       // 해설
}

// 종합 문제 유형
export type ComprehensiveQuestionType = 
  | 'Random'                    // 랜덤 (4가지 유형)
  | '정보 확인'                 // 지문의 세부 정보 확인
  | '주제 파악'                 // 글의 중심 주제 파악
  | '자료해석'                  // 도표, 그래프, 자료 해석
  | '추론';                     // 내용 추론 및 적용

// 종합 문제 개별 문제 (워크플로우용)
export interface ComprehensiveQuestionWorkflow {
  id: string;
  type: Exclude<ComprehensiveQuestionType, 'Random'>;
  question: string;
  options?: string[];   // 객관식인 경우만
  answer: string;
  answerInitials?: string; // 단답형인 경우 초성 힌트 (예: 'ㅈㄹㅎㅁ')
  explanation: string;
  isSupplementary?: boolean; // 보완 문제 여부
  originalQuestionId?: string; // 보완 문제의 경우 원본 문제 ID
}

// 워크플로우에서 사용하는 ComprehensiveQuestion 타입 별칭
export type ComprehensiveQuestion = ComprehensiveQuestionWorkflow;

// === 어휘 문제 유형 관련 추가 ===

// 어휘 문제 유형 정의 (6가지)
export type VocabularyQuestionType = 
  | '5지선다 객관식'         // 기존 유형
  | '단답형 초성 문제'       // 주관식 단답형 + 초성 힌트
  | '2개중 선택형'          // 2개 선택지
  | '3개중 선택형'          // 3개 선택지  
  | '낱말 골라 쓰기'        // 4개 선택지
  | '응용형 문장완성';       // 어휘 설명의 단어가 정답

// 어휘 문제 유형별 상수
export const VOCABULARY_QUESTION_TYPES = {
  MULTIPLE_CHOICE_5: '5지선다 객관식',
  SHORT_ANSWER_WITH_INITIAL: '단답형 초성 문제', 
  MULTIPLE_CHOICE_2: '2개중 선택형',
  MULTIPLE_CHOICE_3: '3개중 선택형',
  MULTIPLE_CHOICE_4: '낱말 골라 쓰기',
  SHORT_ANSWER_FROM_DEFINITION: '응용형 문장완성'
} as const;

// 워크플로우 전체 데이터
export interface WorkflowData {
  // 기본 입력 정보
  input: PassageInput;
  
  // 각 단계별 데이터
  generatedPassage: Passage | null;           // 1. 생성된 지문
  editablePassage: EditablePassage | null;    // 2. 편집 가능한 지문
  vocabularyQuestions: VocabularyQuestionWorkflow[];  // 3,4. 어휘 문제들
  paragraphQuestions: ParagraphQuestionWorkflow[];    // 5,6. 문단 문제들
  comprehensiveQuestions: ComprehensiveQuestionWorkflow[]; // 7,8. 종합 문제들
  
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
  role?: 'admin' | 'reviewer' | 'user';
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
  redirectUrl?: string;
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
export type ContentStatus = '검수 전' | '1차검수' | '2차검수' | '3차검수' | '검수완료' | '승인완료';

// 콘텐츠 세트 (content_sets 테이블) - Supabase 적용
export interface ContentSet {
  id?: string; // UUID
  user_id?: string; // 생성자 ID
  division: string; // 구분 (초등학교 중학년, 고학년, 중학생)
  grade: string; // 실제 학년
  subject: SubjectType;
  area: string;
  session_number?: string | null; // 차시 번호
  main_topic?: string; // 대주제
  sub_topic?: string; // 소주제
  keywords?: string; // 키워드
  title: string; // passageTitle -> title로 단순화
  total_passages: number;
  total_vocabulary_terms: number;
  total_vocabulary_questions: number;
  total_paragraph_questions?: number;
  total_comprehensive_questions: number;
  status?: ContentStatus; // 상태값
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
  passage_id?: string; // UUID - 어휘가 추출된 지문의 ID
  term: string;
  definition: string;
  example_sentence?: string | null; // 예시 문장
  has_question_generated?: boolean; // 어휘 문제 생성 여부 (true: 핵심어, false: 어려운 어휘)
  created_at?: string;
}

// 어휘 문제 (vocabulary_questions 테이블) - 실제 DB 스키마에 맞춤
export interface VocabularyQuestion {
  id?: string; // UUID
  content_set_id: string; // UUID
  question_number: number;
  question_type: '객관식' | '주관식'; // DB 제약조건에 맞는 2가지 유형
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

  // ✅ 확장 필드들 (DB 컬럼 추가 완료)
  detailed_question_type?: string; // 6가지 상세 유형 저장
  answer_initials?: string; // 단답형인 경우 초성 힌트

  // 🔧 프론트엔드 호환성 필드들 (실제로는 위 필드들과 매핑됨)
  question?: string; // question_text와 동일
  correctAnswer?: string; // correct_answer와 동일
  answer?: string; // correct_answer와 동일 (또 다른 별명)
  options?: string[]; // [option_1, option_2, option_3, option_4, option_5]의 배열 형태
  questionId?: string; // 임시 ID (신규 생성 시 사용)
  questionType?: string; // question_type과 동일
  detailedQuestionType?: string; // detailed_question_type과 동일
  answerInitials?: string; // answer_initials와 동일
}

// 문단 문제 (paragraph_questions 테이블) - Supabase 적용
export interface ParagraphQuestionDB {
  id?: string; // UUID
  content_set_id: string; // UUID
  question_number: number;
  question_type: '빈칸 채우기' | '주관식 단답형' | '어절 순서 맞추기' | 'OX문제';
  paragraph_number: number; // 문단 번호 (1~10)
  paragraph_text: string;   // 해당 문단 내용
  question_text: string;
  option_1?: string;        // 객관식인 경우만
  option_2?: string;        // 객관식인 경우만
  option_3?: string;        // 객관식인 경우만
  option_4?: string;        // 객관식인 경우만
  option_5?: string;        // 5번째 선택지는 선택사항
  word_segments?: string[]; // 어절 순서 맞추기인 경우 개별 어절들
  correct_answer: string;   // 객관식: '1','2','3','4','5' | 주관식: 실제 답
  answer_initials?: string; // 주관식 단답형인 경우 초성 (예: 'ㅈㄹㅎㅁ')
  explanation: string;
  created_at?: string;
}

// 종합 문제 (comprehensive_questions 테이블) - Supabase 적용
export interface ComprehensiveQuestionDB {
  id?: string; // UUID
  content_set_id: string; // UUID
  question_number: number;
  question_type: '정보 확인' | '주제 파악' | '자료해석' | '추론';
  question_format: '객관식' | '주관식';
  difficulty: '일반' | '보완';
  question_text: string;
  option_1?: string;
  option_2?: string;
  option_3?: string;
  option_4?: string;
  option_5?: string;
  correct_answer: string;
  answer_initials?: string; // 단답형인 경우 초성 힌트
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
  generation_type: 'passage' | 'vocabulary' | 'paragraph' | 'comprehensive';
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
  paragraphQuestions: ParagraphQuestionDB[];  // 문단 문제 추가
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
  session_number?: string | null; // 세션 번호
  main_topic: string;
  sub_topic: string;
  keywords: string;
  keywords_for_passages?: string; // 지문용 키워드
  keywords_for_questions?: string; // 문제용 키워드
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

// 프롬프트 카테고리 (생성 단계별 + 변수 프롬프트)
export type PromptCategory = 
  | 'passage'         // 지문 생성
  | 'vocabulary'      // 어휘 문제 생성
  | 'paragraph'       // 문단 문제 생성
  | 'comprehensive'   // 종합 문제 생성
  | 'subject'         // 과목 변수 프롬프트
  | 'area'            // 영역 변수 프롬프트
  | 'division';       // 구분(학습단계) 변수 프롬프트

// 프롬프트 서브 카테고리 (선택 옵션별)
export type PromptSubCategory = 
  // 지문 생성
  | 'system'            // 전체 시스템 프롬프트
  | 'length'            // 지문 길이별 프롬프트
  | 'textType'          // 유형별 프롬프트 (논설문, 탐구문 등)
  // 어휘 문제 생성
  | 'vocabularySystem'  // 전체 시스템 프롬프트
  // 문단 문제 생성
  | 'paragraphSystem'   // 전체 시스템 프롬프트
  | 'paragraphType'     // 문제 유형별: 어절순서, 빈칸채우기, 유의어, 반의어, 문단요약
  // 종합 문제 생성
  | 'comprehensiveSystem' // 전체 시스템 프롬프트
  | 'comprehensiveType' // 문제 유형별: 단답형, 순서맞추기, 핵심요약, 핵심어찾기
  // 과목 변수
  | 'subjectScience'    // 과학
  | 'subjectSocial'     // 사회
  // 영역 변수
  | 'areaGeography'     // 지리
  | 'areaSocial'        // 일반사회
  | 'areaPolitics'      // 정치
  | 'areaEconomy'       // 경제
  | 'areaChemistry'     // 화학
  | 'areaPhysics'       // 물리
  | 'areaBiology'       // 생명
  | 'areaEarth'         // 지구과학
  // 구분(학습단계) 변수
  | 'divisionMiddle'    // 중학생(1~3학년)
  | 'divisionElemHigh'  // 초등학교 고학년(5~6학년)
  | 'divisionElemMid';  // 초등학교 중학년(3~4학년)

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

// ============================================================================
// 이미지 데이터 관리 시스템 타입들
// ============================================================================

// 이미지 데이터 (image_data 테이블) - Supabase 적용
export interface ImageData {
  id?: string; // UUID
  session_number?: string | null; // 차시 번호
  file_name: string; // 파일명
  file_path: string; // Supabase Storage 경로
  file_size?: number; // 파일 크기 (bytes)
  mime_type?: string; // MIME 타입 (image/jpeg, image/png 등)
  source?: string; // 출처
  memo?: string; // 메모
  uploaded_by?: string; // 업로드한 사용자 ID
  created_at?: string;
  updated_at?: string;
}

// 이미지 업로드 요청
export interface ImageUploadRequest {
  file: File;
  session_number?: string;
  source?: string;
  memo?: string;
}

// 이미지 업로드 응답
export interface ImageUploadResponse {
  success: boolean;
  data?: ImageData;
  message?: string;
  error?: string;
}

// 이미지 목록 조회 응답
export interface ImagesListResponse {
  success: boolean;
  data: ImageData[];
  total: number;
  message?: string;
}