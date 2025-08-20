# 📊 Vocabulary Questions 데이터베이스 스키마 상태 보고서

## 🔍 현재 상황 요약

사용자가 요청한 "6가지 어휘 문제 유형 구분 및 초성 힌트 저장" 기능을 완전히 구현하려면 **데이터베이스 스키마 수정**이 필요합니다.

### ✅ 현재 구현된 기능
1. **6가지 어휘 문제 유형** UI 선택 및 생성 ✅
2. **주관식 문제 초성 힌트** UI 입력 및 생성 ✅  
3. **타입 매핑 로직** (6가지 → 2가지) ✅
4. **안전한 저장 로직** (기존 DB 스키마 사용) ✅

### ❌ 미완성 기능
1. **상세 문제 유형 저장** - `detailed_question_type` 컬럼 필요
2. **초성 힌트 저장** - `answer_initials` 컬럼 필요

## 📋 현재 vocabulary_questions 테이블 스키마

```sql
-- 현재 존재하는 컬럼들 (15개)
id                  TEXT (UUID)
content_set_id      TEXT (UUID, 외래키)
question_number     INTEGER
question_type       TEXT ('객관식' | '주관식')
difficulty          TEXT ('일반' | '보완')
question_text       TEXT
option_1            TEXT
option_2            TEXT  
option_3            TEXT
option_4            TEXT
option_5            TEXT
correct_answer      TEXT
explanation         TEXT
created_at          TEXT (ISO timestamp)
term                TEXT
```

## 🆕 추가 필요한 컬럼들

```sql
-- 향후 추가해야 할 컬럼들
ALTER TABLE vocabulary_questions 
ADD COLUMN detailed_question_type TEXT; -- '5지선다 객관식', '단답형 초성 문제' 등 6가지 유형

ALTER TABLE vocabulary_questions 
ADD COLUMN answer_initials TEXT; -- 주관식 문제의 초성 힌트 ('ㅈㄹㅎㅁ' 등)
```

## 🔧 현재 구현된 임시 해결책

### 1. 타입 매핑 시스템
```typescript
// src/app/api/save-final-supabase/route.ts:243-264
const mapVocabularyQuestionType = (detailedType: string): '객관식' | '주관식' => {
  const objectiveTypes = [
    '5지선다 객관식', '2지선다 객관식', 
    '3지선다 객관식', '4지선다 객관식'
  ];
  const subjectiveTypes = [
    '단답형 초성 문제', '단답형 설명 문제'
  ];
  
  if (objectiveTypes.includes(detailedType)) return '객관식';
  if (subjectiveTypes.includes(detailedType)) return '주관식';
  return '객관식'; // fallback
};
```

### 2. 메타 정보 로깅 시스템
```typescript
// src/app/api/save-final-supabase/route.ts:328-333
// 6가지 상세 유형 정보는 로그로만 출력 (향후 DB 컬럼 추가 시 활용)
console.log(`어휘문제 ${index + 1} 메타 정보 (로그용):`, {
  original_question_type: originalQuestionType,
  answer_initials: answerInitials,
  is_subjective: isSubjective
});
```

### 3. 안전한 저장 로직
```typescript
// src/app/api/save-final-supabase/route.ts:304-317
// 현재 DB 스키마에 맞는 기본 필드만 사용
const result = {
  question_number: index + 1,
  question_type: mappedQuestionType,
  difficulty: difficulty as '일반' | '보완',
  term: q.term || '',
  question_text: q.question,
  option_1: q.options?.[0],
  option_2: q.options?.[1],
  option_3: q.options?.[2],
  option_4: q.options?.[3],
  option_5: q.options?.[4],
  correct_answer: q.answer || q.correctAnswer,
  explanation: q.explanation
};
```

## 🎯 완전한 해결 방안

### 단계 1: 데이터베이스 스키마 수정 (관리자 작업 필요)

Supabase 대시보드 또는 SQL 에디터에서 실행:

```sql
-- 1. 상세 문제 유형 컬럼 추가
ALTER TABLE vocabulary_questions 
ADD COLUMN detailed_question_type TEXT;

-- 2. 초성 힌트 컬럼 추가  
ALTER TABLE vocabulary_questions 
ADD COLUMN answer_initials TEXT;

-- 3. 변경사항 확인
\d vocabulary_questions;
```

### 단계 2: 저장 로직 업데이트

스키마 수정 후 `src/app/api/save-final-supabase/route.ts`에서:

```typescript
// 수정 전 (현재)
const result = {
  question_number: index + 1,
  question_type: mappedQuestionType,
  difficulty: difficulty as '일반' | '보완',
  // ... 기본 필드들만
};

// 수정 후 (컬럼 추가 시)
const result = {
  question_number: index + 1,
  question_type: mappedQuestionType,
  difficulty: difficulty as '일반' | '보완',
  // ... 기본 필드들
  detailed_question_type: originalQuestionType, // 🆕 6가지 상세 유형
  answer_initials: isSubjective ? answerInitials : null // 🆕 초성 힌트
};
```

### 단계 3: TypeScript 타입 업데이트

`src/types/index.ts`에서:

```typescript
// 현재 (임시)
export interface VocabularyQuestion {
  // ... 기존 필드들
  // 향후 확장용 필드들 (현재는 DB에 없음)
  // detailed_question_type?: string; 
  // answer_initials?: string;
}

// 컬럼 추가 후
export interface VocabularyQuestion {
  // ... 기존 필드들
  detailed_question_type?: string; // 🆕 6가지 상세 유형
  answer_initials?: string; // 🆕 초성 힌트
}
```

## 📊 영향도 분석

### ✅ 현재 동작하는 기능
- ✅ 어휘 문제 생성 (6가지 유형 모두)
- ✅ 어휘 문제 저장 (2가지 기본 유형으로)
- ✅ 어휘 문제 표시 및 관리
- ✅ UI에서 6가지 유형 선택
- ✅ 주관식 문제 초성 힌트 입력

### ⚠️ 제한사항
- ❌ 저장된 데이터에서 6가지 상세 유형 구분 불가
- ❌ 주관식 문제의 초성 힌트 저장되지 않음
- ❌ 추후 상세 통계나 분석에서 세부 유형 정보 부족

### 🔮 컬럼 추가 후 개선사항
- ✅ 완전한 6가지 유형 구분 저장
- ✅ 주관식 문제 초성 힌트 저장
- ✅ 상세한 문제 유형별 통계 가능
- ✅ 문제 유형별 필터링 및 검색 가능
- ✅ 사용자 요구사항 100% 충족

## 🚨 주의사항

1. **현재 저장은 정상 동작함** - 시스템 사용에 문제없음
2. **데이터 손실 없음** - 기존 데이터는 안전하게 보관됨
3. **점진적 개선 가능** - 컬럼 추가 후 새로운 데이터부터 완전 기능 지원
4. **하위 호환성 유지** - 기존 코드는 수정 없이 계속 동작

## 📞 다음 단계

1. **즉시 사용 가능**: 현재 상태로도 모든 핵심 기능 동작
2. **향후 개선**: Supabase 관리자가 스키마 수정 시 완전한 기능 지원
3. **코드 준비**: 컬럼 추가 시 즉시 적용 가능한 코드 이미 준비됨

---

**결론**: 현재 시스템은 안정적으로 동작하며, 데이터베이스 스키마 수정만 완료되면 사용자가 요청한 모든 기능을 완벽하게 지원할 수 있습니다.