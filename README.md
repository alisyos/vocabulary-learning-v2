# 학습 지문 및 문제 생성 시스템

AI를 활용하여 교육과정 기반의 맞춤형 학습 지문과 문제를 7단계 워크플로우로 생성하는 웹 애플리케이션입니다.

## 🌟 주요 특징

- **7단계 워크플로우**: 지문 생성부터 최종 저장까지 체계적인 단계별 진행
- **완전한 사용자 제어**: 각 단계에서 검토 및 수정 가능
- **다양한 문제 유형**: 어휘 문제 + 5가지 종합 문제 유형
- **Cascading Dropdown**: 교육과정 기반의 계층적 선택 시스템 (Google Sheets 연동)
- **Google Sheets 연동**: 구조화된 데이터 저장 및 백업
- **로컬 백업**: JSON 파일 다운로드 기능
- **반응형 UI**: 모바일 및 데스크톱 환경에 최적화
- **실시간 연결 테스트**: Google Sheets 연결 상태 확인 및 자동 복구

## 📋 7단계 워크플로우

### 1단계: 지문 생성
- 교육과정 기반 입력 (구분, 과목, 학년, 영역, 대주제, 소주제, 핵심 개념어)
- GPT-4.1을 활용한 맞춤형 지문 생성
- 최소 20+개 용어 포함된 지문 자동 생성

### 2단계: 지문 검토 및 수정
- 제목, 본문, 용어 설명 실시간 편집
- 단락 추가/삭제, 용어 추가/삭제 기능
- 미리보기를 통한 최종 확인

### 3단계: 어휘 문제 생성
- 지문의 용어를 기반으로 각 용어당 1개씩 어휘 문제 자동 생성
- 5지선다 객관식 문제
- 용어의 의미, 사용법, 맥락 이해 평가

### 4단계: 어휘 문제 검토 및 수정
- 각 문제의 질문, 선택지, 정답, 해설 편집
- 문제 추가/삭제 기능
- 용어별 문제 최적화

### 5단계: 종합 문제 생성
- **5가지 문제 유형**: Random, 단답형, 문단별 순서 맞추기, 핵심 내용 요약, 핵심어/핵심문장 찾기
- **Random 선택**: 4가지 유형을 3개씩 총 12개 문제
- **특정 유형 선택**: 선택한 유형으로 12개 문제

### 6단계: 종합 문제 검토 및 수정
- 문제 유형별 분포 확인
- 각 문제의 상세 편집 (질문, 선택지, 정답, 해설)
- 문제 추가/삭제 및 유형 변경

### 7단계: 최종 저장
- 전체 콘텐츠 요약 확인
- Google Sheets 구조화 저장
- 로컬 JSON 파일 백업
- 새로운 세트 시작

## 🔧 기술 스택

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **AI**: OpenAI GPT-4.1 API
- **Database**: Google Sheets API (4개 시트 구조)
- **Deployment**: Vercel

## 🚀 설치 및 실행

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

## ⚙️ 환경 설정

### OpenAI API 설정
1. [OpenAI Platform](https://platform.openai.com/)에서 API 키 생성
2. `.env.local`에 `OPENAI_API_KEY` 설정

### Google Sheets API 설정
1. [Google Cloud Console](https://console.cloud.google.com/)에서 프로젝트 생성
2. Google Sheets API 활성화
3. 서비스 계정 생성 및 JSON 키 다운로드
4. Google Sheets 스프레드시트 생성 및 서비스 계정에 편집 권한 부여
5. `.env.local`에 관련 정보 설정

### Google Sheets 스키마 (5개 시트)

#### field 시트 ⭐ **필수** (계층적 선택을 위한 기본 데이터)
```
subject | grade | area | maintopic | subtopic | keyword
```
예시 데이터:
```
사회 | 3학년 | 일반사회 | 우리나라의 정치 | 민주주의와 시민 참여 | 민주주의, 시민 참여, 선거
사회 | 4학년 | 일반사회 | 사회 제도와 기관 | 지방 자치와 시민 생활 | 지방자치, 시민참여, 공공서비스
과학 | 3학년 | 생물 | 동물의 생활 | 동물의 특징 | 서식지, 먹이, 생김새
```

> 💡 **중요**: field 시트가 없거나 비어있으면 계층적 선택이 작동하지 않고 기본 데이터만 사용됩니다.

#### final_sets 시트 (메인 데이터)
```
timestamp | setId | division | subject | grade | area | maintopic | subtopic | keyword | passageTitle | vocabularyCount | comprehensiveCount | inputData | passageData | vocabularyData | comprehensiveData
```

#### vocabulary_details 시트 (어휘 문제 상세)
```
timestamp | setId | questionId | term | question | options | answer | explanation
```

#### comprehensive_details 시트 (종합 문제 상세)
```
timestamp | setId | questionId | type | question | options | answer | explanation
```

#### question_type_stats 시트 (문제 유형별 통계)
```
timestamp | setId | questionType | count
```

## 🏗️ 시스템 구조

### Cascading Dropdown 시스템
교육과정 기반의 계층적 선택 구조:

**구분** → **과목** → **학년** → **영역** → **대주제** → **소주제** → **핵심 개념어**

### 지원 구분 및 과목

**구분 (학습 단계)**
- 초등학교 중학년(3-4학년)
- 초등학교 고학년(5-6학년)  
- 중학생(1-3학년)

**과목 및 영역**
- **사회**: 일반사회, 지리, 역사, 경제
- **과학**: 물리, 화학, 생물, 지구과학

**학년**
- 3학년, 4학년, 5학년, 6학년, 중1, 중2, 중3

### 문제 유형

**어휘 문제**
- 각 용어당 1개씩 생성
- 5지선다 객관식
- 용어의 의미, 사용법, 맥락 평가

**종합 문제 (5가지 유형)**
1. **단답형**: 핵심 내용을 짧은 답으로 작성
2. **문단별 순서 맞추기**: 논리적 전개 순서 파악
3. **핵심 내용 요약**: 전체 내용의 적절한 요약 선택
4. **핵심어/핵심문장 찾기**: 지문의 핵심 요소 파악
5. **Random**: 위 4가지 유형을 3개씩 균등 생성

### 지문 형태
- 구분별 맞춤형 단락 구성
- 질문형·호기심 유발형 제목
- 실생활 연계 예시
- 최소 20+개 개념어 풀이 포함

## 📡 API 엔드포인트

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

### POST `/api/generate-vocabulary`
어휘 문제 생성 API
```json
{
  "terms": ["민주주의: 국민이 주권을 가지는 정치 체제", "선거: 국민이 대표를 선택하는 제도"],
  "passage": "지문 전체 내용",
  "division": "초등학교 중학년(3-4학년)"
}
```

### POST `/api/generate-comprehensive`
종합 문제 생성 API
```json
{
  "passage": "수정된 지문 내용",
  "division": "초등학교 중학년(3-4학년)",
  "questionType": "Random"
}
```

### POST `/api/save-final`
최종 저장 API
```json
{
  "input": "입력 데이터",
  "editablePassage": "수정된 지문",
  "vocabularyQuestions": "어휘 문제 배열",
  "comprehensiveQuestions": "종합 문제 배열"
}
```

### GET `/api/get-field-data`
교육과정 데이터 조회 API
- Google Sheets의 field 시트에서 계층적 교육과정 데이터 조회
- 연결 실패 시 폴백 데이터 제공

## 📁 디렉토리 구조

```
src/
├── app/
│   ├── api/
│   │   ├── generate-passage/         # 지문 생성
│   │   ├── generate-vocabulary/      # 어휘 문제 생성
│   │   ├── generate-comprehensive/   # 종합 문제 생성
│   │   ├── save-final/              # 최종 저장
│   │   └── get-field-data/          # 교육과정 데이터
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                     # 메인 워크플로우
├── components/
│   ├── PassageForm.tsx             # 지문 생성 폼 (1단계)
│   ├── PassageReview.tsx           # 지문 검토&수정 (2단계)
│   ├── VocabularyQuestions.tsx     # 어휘 문제 생성&검토 (3,4단계)
│   ├── ComprehensiveQuestions.tsx  # 종합 문제 생성&검토 (5,6단계)
│   ├── FinalSave.tsx              # 최종 저장 (7단계)
│   ├── PassageDisplay.tsx         # 지문 표시 (기존)
│   └── QuestionDisplay.tsx        # 문제 표시 (기존)
├── lib/
│   ├── google-sheets.ts           # Google Sheets API 연동
│   ├── openai.ts                 # OpenAI API 연동
│   └── prompts.ts                # AI 프롬프트 관리
└── types/
    └── index.ts                  # TypeScript 타입 정의
```

## 🚀 배포

### Vercel 배포
1. Vercel 계정에 GitHub 저장소 연결
2. 환경 변수 설정
3. 자동 배포

### 환경 변수 주의사항
- `GOOGLE_SHEETS_PRIVATE_KEY`: 개행 문자(`\n`)와 따옴표 처리 주의
- 키 값은 `-----BEGIN PRIVATE KEY-----`로 시작하고 `-----END PRIVATE KEY-----`로 끝나야 함

## 🔄 워크플로우 특징

### 단계별 제어
- 각 단계에서 완전한 검토 및 수정 가능
- 자동 저장 없음 - 사용자가 원할 때만 진행
- 단계 이동 전 데이터 검증

### 백업 시스템
- Google Sheets 구조화 저장
- 로컬 JSON 파일 다운로드
- 저장 실패 시 백업 데이터 제공

### 사용자 경험
- 진행 상태 시각화 (7단계 진행 바)
- 실시간 미리보기
- 단계별 컬러 코딩
- 반응형 디자인

## 📊 생성 결과물

### 완성된 학습 콘텐츠 세트
- **지문**: 제목 + 여러 단락 + 용어 설명
- **어휘 문제**: 용어당 1개씩 (보통 20+개)
- **종합 문제**: 12개 (유형별 3개씩 또는 단일 유형 12개)
- **총 문제 수**: 보통 30-40개 문제

### 문제 형태
- 모든 문제에 해설 포함
- 객관식: 5지선다
- 주관식: 단답형
- 난이도: 구분에 따라 자동 조절

## 🛠️ 개발 정보

- **개발 서버**: `npm run dev` → [http://localhost:3000](http://localhost:3000)
- **빌드**: `npm run build`
- **메인 페이지 크기**: 8.14kB (전체 워크플로우 포함)
- **총 API 엔드포인트**: 6개
- **총 컴포넌트**: 7개

## 📝 라이선스

MIT License

---

## 🎯 시스템 활용 방법

1. **교육자**: 교육과정에 맞는 학습 자료 생성
2. **학습자**: 체계적인 문제 해결을 통한 학습
3. **콘텐츠 제작자**: 대량의 교육 콘텐츠 효율적 생성
4. **교육 기관**: 표준화된 학습 자료 관리

**🚀 완전한 7단계 워크플로우로 고품질 학습 콘텐츠를 생성하세요!**
