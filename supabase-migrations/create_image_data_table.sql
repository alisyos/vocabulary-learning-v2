-- ============================================================================
-- 이미지 데이터 관리 테이블 생성 스크립트
-- ============================================================================
-- 실행 방법: Supabase 대시보드 > SQL Editor에서 이 스크립트를 실행하세요
-- ============================================================================

-- 1. image_data 테이블 생성
CREATE TABLE IF NOT EXISTS image_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_number TEXT,                    -- 차시 번호 (예: "1-1", "2-3")
  file_name TEXT NOT NULL,                -- 원본 파일명
  file_path TEXT NOT NULL UNIQUE,         -- Supabase Storage 경로 (UUID 기반)
  file_size INTEGER,                      -- 파일 크기 (bytes)
  mime_type TEXT,                         -- MIME 타입 (image/jpeg, image/png 등)
  source TEXT,                            -- 출처 (예: 공공데이터포털, AI 생성)
  memo TEXT,                              -- 메모 또는 설명
  uploaded_by TEXT,                       -- 업로드한 사용자 ID
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. 인덱스 생성 (검색 성능 최적화)
CREATE INDEX IF NOT EXISTS idx_image_data_session_number
  ON image_data(session_number);

CREATE INDEX IF NOT EXISTS idx_image_data_created_at
  ON image_data(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_image_data_file_path
  ON image_data(file_path);

-- 3. updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_image_data_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. updated_at 자동 업데이트 트리거
DROP TRIGGER IF EXISTS trigger_update_image_data_updated_at ON image_data;
CREATE TRIGGER trigger_update_image_data_updated_at
  BEFORE UPDATE ON image_data
  FOR EACH ROW
  EXECUTE FUNCTION update_image_data_updated_at();

-- 5. RLS (Row Level Security) 정책 설정
ALTER TABLE image_data ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽을 수 있도록 설정 (공개)
CREATE POLICY "Anyone can view images"
  ON image_data
  FOR SELECT
  USING (true);

-- 인증된 사용자만 이미지 업로드 가능
CREATE POLICY "Authenticated users can insert images"
  ON image_data
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- 인증된 사용자만 이미지 수정 가능
CREATE POLICY "Authenticated users can update images"
  ON image_data
  FOR UPDATE
  USING (auth.role() = 'authenticated');

-- 인증된 사용자만 이미지 삭제 가능
CREATE POLICY "Authenticated users can delete images"
  ON image_data
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- 6. 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '✅ image_data 테이블 생성 완료!';
  RAISE NOTICE '📋 다음 단계:';
  RAISE NOTICE '1. Supabase Storage에서 "images" 버킷을 생성하세요 (Public 설정)';
  RAISE NOTICE '2. Storage > images > Policies에서 적절한 정책을 설정하세요';
  RAISE NOTICE '3. /image-admin 페이지에서 이미지를 업로드하세요';
END $$;
