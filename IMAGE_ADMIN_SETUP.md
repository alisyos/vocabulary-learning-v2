# 🖼️ 이미지 데이터 관리 시스템 설정 가이드

## 📋 개요

학습 콘텐츠에 사용되는 이미지를 Supabase Storage에 저장하고 관리하는 시스템입니다.

### 주요 기능
- ✅ 이미지 업로드 (최대 30MB)
- ✅ 차시 번호, 출처, 메모 관리
- ✅ 이미지 수정 및 삭제
- ✅ 차시별 필터링
- ✅ Supabase Storage 공개 URL 자동 생성

## 🛠️ 설치 및 설정

### 1. Supabase 테이블 생성

Supabase 대시보드에서 다음 작업을 수행하세요:

1. **SQL Editor로 이동**
   - Supabase 대시보드 > SQL Editor

2. **SQL 스크립트 실행**
   - `supabase-migrations/create_image_data_table.sql` 파일의 내용을 복사
   - SQL Editor에 붙여넣기 후 **RUN** 버튼 클릭

3. **테이블 확인**
   - Table Editor > `image_data` 테이블이 생성되었는지 확인

### 2. Supabase Storage 버킷 생성

Supabase 대시보드에서:

1. **Storage 메뉴로 이동**
   - Supabase 대시보드 > Storage

2. **새 버킷 생성**
   - "Create a new bucket" 버튼 클릭
   - Bucket name: `images`
   - Public bucket: **✅ 체크** (공개 URL 사용)
   - File size limit: `31457280` (30MB)
   - Allowed MIME types: `image/jpeg,image/png,image/gif,image/webp,image/svg+xml`

3. **Storage 정책 설정** (선택사항)
   - Storage > images > Policies
   - 기본적으로 Public 버킷은 읽기가 가능합니다
   - 쓰기 권한은 API에서 처리됩니다

### 3. 환경변수 확인

`.env.local` 파일에 Supabase 환경변수가 설정되어 있는지 확인:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 📱 사용 방법

### 1. 페이지 접근

- URL: `http://localhost:3000/image-admin`
- 메뉴: **시스템 설정 > 이미지 데이터 관리**
- 권한: **Admin 사용자만 접근 가능**

### 2. 이미지 업로드

1. **파일 선택**
   - "이미지 파일" 입력란에서 이미지 파일 선택
   - 지원 형식: JPEG, PNG, GIF, WebP, SVG
   - 최대 크기: 30MB

2. **메타데이터 입력** (선택사항)
   - 차시 번호: 예) 1-1, 2-3
   - 출처: 예) 공공데이터포털, AI 생성
   - 메모: 이미지 설명 또는 사용처

3. **업로드 버튼 클릭**
   - 성공 시 이미지 목록에 자동으로 추가됨
   - 파일은 UUID 기반 고유 이름으로 저장됨

### 3. 이미지 관리

#### 필터링
- **차시 필터**: 특정 차시의 이미지만 조회
- **필터 초기화**: 모든 이미지 표시

#### 이미지 수정
1. 이미지 카드에서 **"수정"** 버튼 클릭
2. 모달에서 차시 번호, 출처, 메모 수정
3. **"저장"** 버튼 클릭

#### 이미지 삭제
1. 이미지 카드에서 **"삭제"** 버튼 클릭
2. 확인 팝업에서 확인
3. Storage 파일 및 DB 메타데이터가 함께 삭제됨

## 🔧 API 엔드포인트

### 1. 이미지 목록 조회
```http
GET /api/images?session_number=1-1
```

### 2. 이미지 업로드
```http
POST /api/images/upload
Content-Type: multipart/form-data

{
  file: File,
  session_number: string,
  source: string,
  memo: string
}
```

### 3. 이미지 상세 조회
```http
GET /api/images/:id
```

### 4. 이미지 수정
```http
PATCH /api/images/:id
Content-Type: application/json

{
  session_number: string,
  source: string,
  memo: string
}
```

### 5. 이미지 삭제
```http
DELETE /api/images/:id
```

## 📊 데이터베이스 스키마

### image_data 테이블

| 컬럼명 | 타입 | 설명 | 제약조건 |
|--------|------|------|----------|
| id | UUID | 고유 ID | PRIMARY KEY |
| session_number | TEXT | 차시 번호 | nullable |
| file_name | TEXT | 원본 파일명 | NOT NULL |
| file_path | TEXT | Storage 경로 | UNIQUE, NOT NULL |
| file_size | INTEGER | 파일 크기 (bytes) | nullable |
| mime_type | TEXT | MIME 타입 | nullable |
| source | TEXT | 출처 | nullable |
| memo | TEXT | 메모 | nullable |
| uploaded_by | TEXT | 업로드한 사용자 | nullable |
| created_at | TIMESTAMP | 생성일시 | DEFAULT NOW() |
| updated_at | TIMESTAMP | 수정일시 | AUTO UPDATE |

### 인덱스
- `idx_image_data_session_number`: 차시 번호 검색 최적화
- `idx_image_data_created_at`: 최신순 정렬 최적화
- `idx_image_data_file_path`: 파일 경로 검색 최적화

## 🔐 보안 설정

### RLS (Row Level Security)
- **SELECT**: 모든 사용자 (공개)
- **INSERT**: 인증된 사용자만
- **UPDATE**: 인증된 사용자만
- **DELETE**: 인증된 사용자만

### Storage 정책
- **Public Bucket**: 읽기 전용 공개
- **쓰기 권한**: API를 통해서만 가능

## 🐛 문제 해결

### 1. 이미지 업로드 실패
- Supabase Storage 버킷 `images`가 생성되었는지 확인
- 버킷이 Public으로 설정되었는지 확인
- 파일 크기가 30MB를 초과하는지 확인
- 파일 형식이 이미지인지 확인

### 2. 이미지가 표시되지 않음
- Supabase Storage에서 파일이 실제로 존재하는지 확인
- 브라우저 콘솔에서 네트워크 오류 확인
- Public URL이 올바르게 생성되는지 확인

### 3. 권한 오류
- 사용자가 Admin 역할인지 확인
- RLS 정책이 올바르게 설정되었는지 확인
- 환경변수가 올바른지 확인

## 📈 향후 개선 계획

- [ ] 이미지 일괄 업로드
- [ ] 이미지 크기 자동 조정 (썸네일 생성)
- [ ] 이미지 검색 기능 강화 (태그, 키워드)
- [ ] 이미지 사용처 추적 (어느 콘텐츠에서 사용 중인지)
- [ ] 이미지 편집 기능 (자르기, 회전 등)
- [ ] CDN 통합 (성능 최적화)

## 📚 관련 문서

- [Supabase Storage 문서](https://supabase.com/docs/guides/storage)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [이미지 최적화](https://nextjs.org/docs/app/building-your-application/optimizing/images)

## 🆘 지원

문제가 발생하면 다음을 확인하세요:
1. 개발자 콘솔의 오류 메시지
2. Supabase 대시보드의 로그
3. 네트워크 탭의 API 요청/응답

---

**최종 업데이트**: 2025-10-01
