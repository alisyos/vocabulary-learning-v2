// 학년 타입
export type GradeType = 
  | '초등학교 중학년(3-4학년)' 
  | '초등학교 고학년(5-6학년)' 
  | '중학생(1-3학년)';

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

// 지문 생성 입력값
export interface PassageInput {
  grade: GradeType;
  length: PassageLengthType;
  subject: SubjectType;
  area: AreaType;
  topic?: string;       // 주제 (선택사항)
  textType?: TextType;  // 유형 (선택사항)
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
  grade: GradeType;
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