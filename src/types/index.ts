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