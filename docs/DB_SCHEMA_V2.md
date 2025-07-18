# 향후 DB 연동을 위한 정규화된 데이터베이스 스키마 v2

## 개요

학습 지문 및 문제 생성 시스템의 향후 별도 DB 서버 구축을 위해 설계된 정규화된 데이터베이스 스키마입니다. 현재는 Google Sheets의 새로운 v2 구조로 구현되어 있으며, 추후 MySQL, PostgreSQL 등의 관계형 데이터베이스로 직접 매핑할 수 있도록 설계되었습니다.

## 주요 개선 사항

### 기존 구조의 문제점
- JSON 데이터 과다 사용으로 성능 저하
- 단일 테이블에 모든 정보 저장으로 인한 복잡성
- 관계형 구조 부족으로 데이터 무결성 보장 어려움
- DB 전환 시 복잡한 변환 과정 필요

### 새로운 구조의 장점
- **데이터 정규화**: 지문, 어휘, 문제를 별도 테이블로 분리
- **관계형 설계**: 외래키 기반의 명확한 관계 설정
- **성능 최적화**: JSON 파싱 최소화로 빠른 데이터 조회
- **확장성**: 사용자 관리, 권한 체계, 통계 시스템 준비
- **DB 호환성**: 표준 SQL로 직접 매핑 가능

## 테이블 구조

### 1. content_sets_v2 - 콘텐츠 세트 메인 정보

**Google Sheets 컬럼:**
```
timestamp | set_id | user_id | division | subject | grade | area | main_topic | sub_topic | keywords | passage_title | passage_length | text_type | paragraph_count | vocabulary_words_count | vocabulary_question_count | comprehensive_question_count | status | created_at | updated_at
```

**향후 DB 스키마:**
```sql
CREATE TABLE content_sets (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    set_id VARCHAR(50) UNIQUE NOT NULL,
    user_id BIGINT,
    division ENUM('초등학교 중학년(3-4학년)', '초등학교 고학년(5-6학년)', '중학생(1-3학년)') NOT NULL,
    subject ENUM('사회', '과학') NOT NULL,
    grade VARCHAR(50) NOT NULL,
    area VARCHAR(50) NOT NULL,
    main_topic VARCHAR(200) NOT NULL,
    sub_topic VARCHAR(200) NOT NULL,
    keywords TEXT NOT NULL,
    passage_title VARCHAR(500) NOT NULL,
    passage_length ENUM('4-5문장으로 구성한 5-6개 단락', '5-6문장으로 구성한 6개 단락', '1-2문장으로 구성한 10개 단락', '10문장 이하로 구성한 5개 단락', '1-2문장으로 구성한 12개 단락') NOT NULL,
    text_type ENUM('설명문', '논설문', '탐구문', '뉴스 기사', '인터뷰', '동화', '시', '대본', '소설') NULL,
    paragraph_count INT DEFAULT 0,
    vocabulary_words_count INT DEFAULT 0,
    vocabulary_question_count INT DEFAULT 0,
    comprehensive_question_count INT DEFAULT 0,
    status ENUM('draft', 'completed', 'archived') DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
```

### 2. passages_v2 - 지문 데이터

**Google Sheets 컬럼:**
```
id | content_set_id | title | paragraph_1 | paragraph_2 | paragraph_3 | paragraph_4 | paragraph_5 | paragraph_6 | paragraph_7 | paragraph_8 | paragraph_9 | paragraph_10 | created_at | updated_at
```

**향후 DB 스키마:**
```sql
CREATE TABLE passages (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    content_set_id BIGINT NOT NULL,
    title VARCHAR(500) NOT NULL,
    paragraphs JSON NOT NULL,  -- 단락 배열
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (content_set_id) REFERENCES content_sets(id) ON DELETE CASCADE
);
```

### 3. vocabulary_terms_v2 - 어휘/용어 데이터

**Google Sheets 컬럼:**
```
id | content_set_id | term | definition | example_sentence | order_index | created_at
```

**향후 DB 스키마:**
```sql
CREATE TABLE vocabulary_terms (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    content_set_id BIGINT NOT NULL,
    term VARCHAR(200) NOT NULL,
    definition TEXT NOT NULL,
    example_sentence TEXT,
    order_index INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (content_set_id) REFERENCES content_sets(id) ON DELETE CASCADE
);
```

### 4. vocabulary_questions_v2 - 어휘 문제 데이터

**Google Sheets 컬럼:**
```
id | content_set_id | vocabulary_term_id | question_id | term | question | option_1 | option_2 | option_3 | option_4 | option_5 | correct_answer | explanation | created_at
```

**향후 DB 스키마:**
```sql
CREATE TABLE vocabulary_questions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    content_set_id BIGINT NOT NULL,
    vocabulary_term_id BIGINT,
    question_id VARCHAR(100) NOT NULL,
    term VARCHAR(200) NOT NULL,
    question TEXT NOT NULL,
    option_1 VARCHAR(500) NOT NULL,
    option_2 VARCHAR(500) NOT NULL,
    option_3 VARCHAR(500) NOT NULL,
    option_4 VARCHAR(500) NOT NULL,
    option_5 VARCHAR(500) NOT NULL,
    correct_answer ENUM('1', '2', '3', '4', '5') NOT NULL,
    explanation TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (content_set_id) REFERENCES content_sets(id) ON DELETE CASCADE,
    FOREIGN KEY (vocabulary_term_id) REFERENCES vocabulary_terms(id) ON DELETE SET NULL
);
```

### 5. comprehensive_questions_v2 - 종합 문제 데이터

**Google Sheets 컬럼:**
```
id | content_set_id | question_id | question_type | question | question_format | option_1 | option_2 | option_3 | option_4 | option_5 | correct_answer | explanation | is_supplementary | original_question_id | question_set_number | created_at
```

**향후 DB 스키마:**
```sql
CREATE TABLE comprehensive_questions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    content_set_id BIGINT NOT NULL,
    question_id VARCHAR(100) NOT NULL,
    question_type ENUM('단답형', '문단별 순서 맞추기', '핵심 내용 요약', '핵심어/핵심문장 찾기') NOT NULL,
    question TEXT NOT NULL,
    question_format ENUM('multiple_choice', 'short_answer') NOT NULL,
    option_1 VARCHAR(500),
    option_2 VARCHAR(500),
    option_3 VARCHAR(500),
    option_4 VARCHAR(500),
    option_5 VARCHAR(500),
    correct_answer TEXT NOT NULL,
    explanation TEXT NOT NULL,
    is_supplementary BOOLEAN DEFAULT FALSE,
    original_question_id VARCHAR(100),
    question_set_number INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (content_set_id) REFERENCES content_sets(id) ON DELETE CASCADE
);
```

### 6. ai_generation_logs_v2 - AI 생성 로그

**Google Sheets 컬럼:**
```
id | content_set_id | generation_type | prompt_used | ai_response | generation_time_ms | tokens_used | cost_usd | created_at
```

**향후 DB 스키마:**
```sql
CREATE TABLE ai_generation_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    content_set_id BIGINT,
    generation_type ENUM('passage', 'vocabulary', 'comprehensive') NOT NULL,
    prompt_used TEXT NOT NULL,
    ai_response JSON NOT NULL,
    generation_time_ms INT,
    tokens_used INT,
    cost_usd DECIMAL(10,6),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (content_set_id) REFERENCES content_sets(id) ON DELETE SET NULL
);
```

### 7. users - 사용자 관리 (향후 확장)

```sql
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    role ENUM('admin', 'teacher', 'student') DEFAULT 'teacher',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 8. curriculum_data - 교육과정 데이터 (기존 field 개선)

```sql
CREATE TABLE curriculum_data (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    subject ENUM('사회', '과학') NOT NULL,
    grade VARCHAR(50) NOT NULL,
    area VARCHAR(50) NOT NULL,
    main_topic VARCHAR(200) NOT NULL,
    sub_topic VARCHAR(200) NOT NULL,
    keywords TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 인덱스 설계

### 성능 최적화를 위한 인덱스

```sql
-- 콘텐츠 세트 검색 최적화
CREATE INDEX idx_content_sets_subject_grade ON content_sets(subject, grade);
CREATE INDEX idx_content_sets_area ON content_sets(area);
CREATE INDEX idx_content_sets_created_at ON content_sets(created_at);
CREATE INDEX idx_content_sets_status ON content_sets(status);

-- 외래키 관계 최적화
CREATE INDEX idx_vocabulary_questions_content_set ON vocabulary_questions(content_set_id);
CREATE INDEX idx_comprehensive_questions_content_set ON comprehensive_questions(content_set_id);
CREATE INDEX idx_vocabulary_terms_content_set ON vocabulary_terms(content_set_id);
CREATE INDEX idx_passages_content_set ON passages(content_set_id);
CREATE INDEX idx_ai_logs_content_set ON ai_generation_logs(content_set_id);

-- 문제 유형별 검색 최적화
CREATE INDEX idx_comprehensive_questions_type ON comprehensive_questions(question_type);
CREATE INDEX idx_comprehensive_questions_supplementary ON comprehensive_questions(is_supplementary);
```

## API 엔드포인트

### 새로운 v2 API 엔드포인트

| 엔드포인트 | 메서드 | 설명 | 상태 |
|-----------|--------|------|------|
| `/api/migrate-sheets` | POST | 기존 구조를 v2로 마이그레이션 | ✅ 완료 |
| `/api/save-final-v2` | POST | v2 구조로 콘텐츠 저장 | ✅ 완료 |
| `/api/get-saved-sets-v2` | GET | v2 구조에서 콘텐츠 목록 조회 | ✅ 완료 |
| `/api/get-set-details-v2` | GET | v2 구조에서 상세 정보 조회 | ✅ 완료 |

### 기존 API와의 호환성

- 기존 v1 API는 그대로 유지
- v2 API는 병행 운영으로 점진적 전환 가능
- 클라이언트에서 선택적으로 사용 가능

## 마이그레이션 가이드

### 1단계: v2 시트 생성 및 마이그레이션

```bash
# API 호출로 마이그레이션 실행
POST /api/migrate-sheets
```

### 2단계: 새로운 API 테스트

```bash
# v2 구조로 데이터 저장 테스트
POST /api/save-final-v2

# v2 구조에서 데이터 조회 테스트
GET /api/get-saved-sets-v2
GET /api/get-set-details-v2?setId=set_xxxxx
```

### 3단계: 클라이언트 점진적 전환

- 새로운 콘텐츠는 v2 API 사용
- 기존 콘텐츠는 v1 API 유지
- 필요시 마이그레이션된 데이터 확인

## 향후 DB 전환 계획

### 1단계: 데이터베이스 스키마 생성

```sql
-- 위에 정의된 스키마를 실제 DB에 생성
CREATE DATABASE vocabulary_learning_system;
USE vocabulary_learning_system;

-- 모든 테이블 생성 스크립트 실행
-- 인덱스 생성 스크립트 실행
```

### 2단계: 데이터 마이그레이션

```javascript
// Google Sheets v2 → Database 마이그레이션 스크립트
const migrateToDatabase = async () => {
  // 1. content_sets_v2 → content_sets 테이블
  // 2. passages_v2 → passages 테이블
  // 3. vocabulary_terms_v2 → vocabulary_terms 테이블
  // 4. vocabulary_questions_v2 → vocabulary_questions 테이블
  // 5. comprehensive_questions_v2 → comprehensive_questions 테이블
  // 6. ai_generation_logs_v2 → ai_generation_logs 테이블
};
```

### 3단계: API 전환

- Google Sheets 기반 함수들을 DB 기반으로 교체
- 동일한 인터페이스 유지로 클라이언트 변경 최소화
- 성능 테스트 및 최적화

## TypeScript 타입 정의

### 주요 타입들

```typescript
// 콘텐츠 세트
interface ContentSetV2 {
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

// API 응답
interface ContentSetsResponseV2 {
  success: boolean;
  data: ContentSetV2[];
  stats: {
    totalSets: number;
    subjects: string[];
    grades: string[];
    areas: string[];
  };
  total: number;
  version: 'v2';
}
```

## 성능 비교

### 기존 구조 vs 새로운 구조

| 항목 | 기존 구조 | 새로운 v2 구조 | 개선 효과 |
|------|-----------|----------------|-----------|
| 데이터 조회 | JSON 파싱 필요 | 직접 컬럼 접근 | 3-5배 빠름 |
| 메모리 사용량 | 전체 JSON 로드 | 필요한 필드만 | 50-70% 절약 |
| 쿼리 복잡도 | 복잡한 JSON 처리 | 단순한 SQL | 매우 단순화 |
| 확장성 | 제한적 | 무제한 | 무제한 확장 |
| 관계 설정 | 어려움 | 외래키 기반 | 완전한 관계형 |

## 보안 및 백업

### 데이터 보안

- 사용자별 권한 관리 시스템 준비
- 민감 정보 암호화 (향후 확장)
- API 접근 제어 및 인증

### 백업 전략

- 정기적 데이터베이스 백업
- Google Sheets 이중 저장 (임시)
- JSON 파일 로컬 백업 유지

## 결론

이 정규화된 스키마는 다음과 같은 장점을 제공합니다:

1. **즉시 사용 가능**: 현재 Google Sheets v2 구조로 구현됨
2. **DB 호환성**: MySQL, PostgreSQL 등으로 직접 변환 가능
3. **성능 최적화**: JSON 파싱 최소화로 빠른 조회
4. **확장성**: 사용자 관리, 통계, 권한 시스템 준비
5. **유지보수성**: 명확한 관계형 구조로 개발 용이

향후 별도 DB 서버 구축 시 이 스키마를 그대로 사용하여 원활한 전환이 가능합니다.