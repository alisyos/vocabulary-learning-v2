-- ============================================================================
-- image_data 테이블에 is_visible 컬럼 추가
-- ============================================================================
-- 실행 방법: Supabase 대시보드 > SQL Editor에서 이 스크립트를 실행하세요
-- ============================================================================

-- 1. is_visible 컬럼 추가 (기본값: true)
ALTER TABLE image_data
ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT true;

-- 2. 기존 데이터에 기본값 설정 (모든 기존 이미지는 표시됨)
UPDATE image_data
SET is_visible = true
WHERE is_visible IS NULL;

-- 3. 인덱스 추가 (검색 성능 최적화)
CREATE INDEX IF NOT EXISTS idx_image_data_is_visible
  ON image_data(is_visible);

-- 4. 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '✅ image_data 테이블에 is_visible 컬럼 추가 완료!';
  RAISE NOTICE '📋 다음 단계:';
  RAISE NOTICE '1. /image-admin 페이지에서 이미지 표시/숨김을 설정할 수 있습니다';
  RAISE NOTICE '2. 콘텐츠 관리 페이지에서는 is_visible=true인 이미지만 표시됩니다';
END $$;
