# 학습 지문 및 문제 생성 시스템

AI를 활용하여 과목별 학습 지문과 문제를 자동으로 생성하는 웹 애플리케이션입니다.

## 기능

- **지문 생성**: 학년, 과목, 영역에 따른 맞춤형 학습 지문 생성
- **문제 생성**: 생성된 지문을 바탕으로 객관식/주관식 문제 자동 생성
- **Google Sheets 연동**: 생성된 콘텐츠를 Google Sheets에 자동 저장
- **반응형 UI**: 모바일 및 데스크톱 환경에 최적화된 인터페이스

## 기술 스택

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **AI**: OpenAI GPT-4 API
- **Database**: Google Sheets API
- **Deployment**: Vercel

## 설치 및 실행

1. 의존성 설치:
```bash
npm install
```

2. 환경 변수 설정 (`.env.local` 파일):
```env
# OpenAI API
OPENAI_API_KEY=your_openai_api_key_here

# Google Sheets API
GOOGLE_SHEETS_CLIENT_EMAIL=your_service_account_email_here
GOOGLE_SHEETS_PRIVATE_KEY=your_private_key_here
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id_here
```

3. 개발 서버 실행:
```bash
npm run dev
```

4. 프로덕션 빌드:
```bash
npm run build
npm start
```

## 환경 설정

### OpenAI API 설정
1. [OpenAI Platform](https://platform.openai.com/)에서 API 키 생성
2. `.env.local`에 `OPENAI_API_KEY` 설정

### Google Sheets API 설정
1. [Google Cloud Console](https://console.cloud.google.com/)에서 프로젝트 생성
2. Google Sheets API 활성화
3. 서비스 계정 생성 및 JSON 키 다운로드
4. Google Sheets 스프레드시트 생성 및 서비스 계정에 편집 권한 부여
5. `.env.local`에 관련 정보 설정

### Google Sheets 스키마
#### passages 시트
- timestamp, grade, subject, area, length, topic, textType, prompt, result

#### questions 시트  
- timestamp, grade, questionType, passage, prompt, result

## 지원 기능

### 학습 대상
- 초등학교 중학년(3-4학년)
- 초등학교 고학년(5-6학년)
- 중학생(1-3학년)

### 과목 및 영역
**사회**
- 일반사회, 지리, 역사, 경제

**과학**
- 물리, 화학, 생물, 지구과학

### 지문 형태
- 학년별 맞춤형 단락 구성
- 질문형·호기심 유발형 제목
- 실생활 연계 예시
- 개념어 풀이 포함

### 문제 유형
- 객관식 (5지선다)
- 주관식 단답형
- 일반 문제 1개 + 보완 문제 2개 구성

## 디렉토리 구조

```
src/
├── app/
│   ├── api/
│   │   ├── generate-passage/
│   │   └── generate-question/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── PassageForm.tsx
│   ├── PassageDisplay.tsx
│   ├── QuestionForm.tsx
│   └── QuestionDisplay.tsx
├── lib/
│   ├── google-sheets.ts
│   ├── openai.ts
│   └── prompts.ts
└── types/
    └── index.ts
```

## 배포

Vercel을 통한 배포:

1. Vercel 계정 연결
2. 환경 변수 설정
3. 자동 배포

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 라이선스

MIT License
