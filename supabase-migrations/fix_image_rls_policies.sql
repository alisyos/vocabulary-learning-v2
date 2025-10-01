-- ============================================================================
-- 이미지 데이터 RLS 정책 수정 스크립트
-- ============================================================================
-- 실행 방법: Supabase 대시보드 > SQL Editor에서 이 스크립트를 실행하세요
-- ============================================================================

-- 방법 1: RLS 완전 비활성화 (개발 단계에 권장)
-- ============================================================================
ALTER TABLE image_data DISABLE ROW LEVEL SECURITY;

-- 기존 정책 모두 삭제
DROP POLICY IF EXISTS "Anyone can view images" ON image_data;
DROP POLICY IF EXISTS "Authenticated users can insert images" ON image_data;
DROP POLICY IF EXISTS "Authenticated users can update images" ON image_data;
DROP POLICY IF EXISTS "Authenticated users can delete images" ON image_data;

-- 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '✅ image_data 테이블의 RLS가 비활성화되었습니다';
  RAISE NOTICE '⚠️  이 설정은 개발 환경에 적합합니다';
  RAISE NOTICE '📋 다음 단계:';
  RAISE NOTICE '1. Supabase Storage > images 버킷 > Policies로 이동';
  RAISE NOTICE '2. "New Policy" 버튼 클릭';
  RAISE NOTICE '3. "For full customization" 선택';
  RAISE NOTICE '4. 아래 정책을 추가:';
  RAISE NOTICE '   - Policy name: Allow all operations';
  RAISE NOTICE '   - Allowed operation: All (SELECT, INSERT, UPDATE, DELETE)';
  RAISE NOTICE '   - Policy definition: true';
  RAISE NOTICE '5. 또는 Storage 버킷을 Public으로 설정하고 정책을 모두 제거';
END $$;


-- ============================================================================
-- 방법 2: 올바른 RLS 정책 설정 (프로덕션에 권장)
-- ============================================================================
-- 위의 방법 1이 작동하지 않으면 이 부분의 주석을 해제하고 실행하세요
-- ============================================================================

/*
-- RLS 활성화
ALTER TABLE image_data ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Anyone can view images" ON image_data;
DROP POLICY IF EXISTS "Authenticated users can insert images" ON image_data;
DROP POLICY IF EXISTS "Authenticated users can update images" ON image_data;
DROP POLICY IF EXISTS "Authenticated users can delete images" ON image_data;
DROP POLICY IF EXISTS "Allow all operations" ON image_data;

-- 새로운 정책: 모든 작업 허용 (익명 사용자 포함)
CREATE POLICY "Allow all operations"
  ON image_data
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '✅ image_data 테이블의 RLS 정책이 설정되었습니다';
  RAISE NOTICE '⚠️  모든 사용자가 접근 가능합니다 (익명 포함)';
  RAISE NOTICE '📋 프로덕션 환경에서는 더 엄격한 정책을 설정하세요';
END $$;
*/
