# 학습 지문 및 문제 생성 시스템

AI를 활용하여 교육과정 기반의 맞춤형 학습 지문과 문제를 자동으로 생성하는 웹 애플리케이션입니다.

## 주요 기능

- **지문 생성**: 구분, 과목, 학년, 영역에 따른 맞춤형 학습 지문 생성
- **문제 생성**: 생성된 지문을 바탕으로 객관식/주관식 문제 자동 생성
- **Cascading Dropdown**: 교육과정 기반의 계층적 선택 시스템
- **Google Sheets 연동**: 생성된 콘텐츠와 교육과정 데이터를 Google Sheets에 자동 저장
- **반응형 UI**: 모바일 및 데스크톱 환경에 최적화된 인터페이스

## 기술 스택

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **AI**: OpenAI GPT-4.1 API
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

#### passages 시트 (지문 데이터)
```
timestamp | division | subject | grade | area | length | maintopic | subtopic | keyword | textType | prompt | result
```

#### questions 시트 (문제 데이터)
```
timestamp | division | questionType | passage | prompt | result
```

#### field 시트 (교육과정 데이터)
```
subject | grade | area | maintopic | subtopic | keyword
```

## 시스템 구조

### Cascading Dropdown 시스템
교육과정 기반의 계층적 선택 구조:

1. **구분** → 2. **과목** → 3. **학년** → 4. **영역** → 5. **대주제** → 6. **소주제** → 7. **핵심 개념어**

### 지원 구분 및 과목

**구분 (학습 단계)**
- 초등학교 중학년(3-4학년)
- 초등학교 고학년(5-6학년)  
- 중학생(1-3학년)

**과목 및 영역**

**사회**
- 일반사회, 지리, 역사, 경제

**과학**
- 물리, 화학, 생물, 지구과학

**학년**
- 3학년, 4학년, 5학년, 6학년, 중1, 중2, 중3

### 지문 형태
- 구분별 맞춤형 단락 구성
- 질문형·호기심 유발형 제목
- 실생활 연계 예시
- 개념어 풀이 포함

### 문제 유형
- 객관식 (5지선다)
- 주관식 단답형
- 일반 문제 1개 + 보완 문제 2개 구성

### 지문 유형 (선택사항)
- 설명문, 논설문, 탐구문, 뉴스 기사, 인터뷰, 동화, 시, 대본, 소설

## API 엔드포인트

### POST `/api/generate-passage`
지문 생성 API
```json
{
  "division": "초등학교 중학년(3-4학년)",
  "length": "4-5문장으로 구성한 5-6개 단락",
  "subject": "사회",
  "grade": "3학년",
  "area": "일반사회",
  "maintopic": "우리나라의 정치",
  "subtopic": "민주주의와 시민 참여",
  "keyword": "민주주의, 시민 참여, 선거",
  "textType": "설명문"
}
```

### POST `/api/generate-question`
문제 생성 API
```json
{
  "division": "초등학교 중학년(3-4학년)",
  "passage": "생성된 지문 내용",
  "questionType": "객관식"
}
```

### GET `/api/get-field-data`
교육과정 데이터 조회 API
- Google Sheets의 field 시트에서 계층적 교육과정 데이터 조회
- 연결 실패 시 폴백 데이터 제공

## 디렉토리 구조

```
src/
├── app/
│   ├── api/
│   │   ├── generate-passage/
│   │   ├── generate-question/
│   │   └── get-field-data/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── PassageForm.tsx         # 지문 생성 폼 (Cascading Dropdown)
│   ├── PassageDisplay.tsx      # 지문 표시 컴포넌트
│   ├── QuestionForm.tsx        # 문제 생성 폼
│   └── QuestionDisplay.tsx     # 문제 표시 컴포넌트
├── lib/
│   ├── google-sheets.ts        # Google Sheets API 연동
│   ├── openai.ts              # OpenAI API 연동
│   └── prompts.ts             # AI 프롬프트 관리
└── types/
    └── index.ts               # TypeScript 타입 정의
```

## 배포

### Vercel 배포
1. Vercel 계정에 GitHub 저장소 연결
2. 환경 변수 설정
3. 자동 배포

### 환경 변수 주의사항
- `GOOGLE_SHEETS_PRIVATE_KEY`: 개행 문자(`\n`)와 따옴표 처리 주의
- 키 값은 `-----BEGIN PRIVATE KEY-----`로 시작하고 `-----END PRIVATE KEY-----`로 끝나야 함

## 개발 정보

- **개발 서버**: `npm run dev` → [http://localhost:3000](http://localhost:3000)
- **빌드**: `npm run build`
- **타입 체크**: TypeScript 타입 검사 포함
- **린팅**: ESLint 설정 포함

## 라이선스

MIT License
