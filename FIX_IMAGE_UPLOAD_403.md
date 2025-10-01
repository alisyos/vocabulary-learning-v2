# 🔧 이미지 업로드 403 오류 해결 가이드

## 🚨 오류 메시지
```
이미지 업로드 오류: {
  statusCode: '403',
  error: 'Unauthorized',
  message: 'new row violates row-level security policy'
}
```

## 🔍 원인
Supabase의 Row Level Security (RLS) 정책 때문에 익명 키로 업로드할 때 권한이 거부됩니다.

## ✅ 해결 방법

### 1단계: image_data 테이블 RLS 수정

**Supabase 대시보드에서:**

1. **SQL Editor로 이동**
2. 다음 SQL 실행:

```sql
-- RLS 비활성화 (개발 환경에 권장)
ALTER TABLE image_data DISABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Anyone can view images" ON image_data;
DROP POLICY IF EXISTS "Authenticated users can insert images" ON image_data;
DROP POLICY IF EXISTS "Authenticated users can update images" ON image_data;
DROP POLICY IF EXISTS "Authenticated users can delete images" ON image_data;
```

또는 `supabase-migrations/fix_image_rls_policies.sql` 파일 내용을 복사하여 실행하세요.

### 2단계: Storage 버킷 정책 설정

**방법 A: Storage 정책 비활성화 (간단, 권장)**

1. **Supabase 대시보드 > Storage > images 버킷 클릭**
2. **Policies 탭 선택**
3. **기존 정책이 있다면 모두 삭제**
4. **Configuration 탭으로 이동**
5. **"Public bucket" 체크박스 확인** (✅ 체크되어야 함)

**방법 B: 모든 작업 허용 정책 추가**

1. **Supabase 대시보드 > Storage > images 버킷 > Policies**
2. **"New Policy" 버튼 클릭**
3. **"For full customization" 선택**
4. 다음 정보 입력:
   - **Policy name**: `Allow all operations`
   - **Allowed operation**: `All` (SELECT, INSERT, UPDATE, DELETE 모두 선택)
   - **Policy definition**:
     ```sql
     true
     ```
   - **WITH CHECK expression**:
     ```sql
     true
     ```
5. **Save policy**

### 3단계: 테스트

1. 개발 서버 재시작 (필요시):
   ```bash
   npm run dev
   ```

2. 브라우저에서 `/image-admin` 페이지 접속

3. 이미지 업로드 시도

## 📋 체크리스트

완료 후 다음을 확인하세요:

- [ ] `image_data` 테이블의 RLS가 비활성화되었거나 올바른 정책이 설정됨
- [ ] `images` Storage 버킷이 Public으로 설정됨
- [ ] Storage 버킷의 정책이 없거나 모든 작업을 허용함
- [ ] 이미지 업로드가 성공적으로 작동함
- [ ] 업로드된 이미지가 목록에 표시됨
- [ ] 이미지 공개 URL이 정상 작동함

## 🔐 보안 고려사항

### 개발 환경 (현재 설정)
- ✅ RLS 비활성화 또는 모든 작업 허용
- ✅ 빠른 개발 및 테스트 가능
- ⚠️ 누구나 데이터 접근 가능

### 프로덕션 환경 (향후 적용)
프로덕션 배포 시 다음 정책을 적용하세요:

```sql
-- image_data 테이블 RLS 활성화
ALTER TABLE image_data ENABLE ROW LEVEL SECURITY;

-- 읽기는 모두 허용
CREATE POLICY "Anyone can view images"
  ON image_data
  FOR SELECT
  USING (true);

-- 쓰기는 인증된 사용자만 (service_role 키 사용)
CREATE POLICY "Service role can insert images"
  ON image_data
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update images"
  ON image_data
  FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can delete images"
  ON image_data
  FOR DELETE
  USING (auth.role() = 'service_role');
```

그리고 API 라우트에서 `service_role` 키를 사용하도록 수정:

```typescript
// .env.local에 추가
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

// API에서 사용
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

## 🐛 여전히 작동하지 않는 경우

### 1. Supabase 대시보드 확인
- **Table Editor > image_data**
  - RLS 상태 확인 (비활성화되어야 함)

- **Storage > images**
  - Public 설정 확인
  - Policies가 비어있거나 모든 작업 허용하는지 확인

### 2. 브라우저 콘솔 확인
- F12 > Console 탭
- Network 탭에서 실패한 요청 확인
- 정확한 오류 메시지 확인

### 3. 환경변수 확인
```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. 캐시 클리어
```bash
# Next.js 캐시 삭제
rm -rf .next

# 재시작
npm run dev
```

### 5. Supabase 프로젝트 재시작
Supabase 대시보드에서 프로젝트를 일시 정지했다가 재시작해보세요.

## 📞 추가 도움

여전히 문제가 해결되지 않으면:
1. Supabase 로그 확인 (Dashboard > Logs)
2. SQL Editor에서 직접 INSERT 테스트:
   ```sql
   INSERT INTO image_data (file_name, file_path)
   VALUES ('test.jpg', 'test/test.jpg');
   ```
3. 오류 메시지를 복사하여 Supabase 문서 검색

---

**최종 업데이트**: 2025-10-01
