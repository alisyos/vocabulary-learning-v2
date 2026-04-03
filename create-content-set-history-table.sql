-- content_set_history: 콘텐츠 세트 수정 전 전체 상태를 JSON 스냅샷으로 저장
CREATE TABLE content_set_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_set_id UUID NOT NULL REFERENCES content_sets(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  description TEXT DEFAULT '수동 저장',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(content_set_id, version_number)
);

-- 콘텐츠 세트별 버전 조회 인덱스
CREATE INDEX idx_content_set_history_lookup
  ON content_set_history(content_set_id, version_number DESC);

-- RLS 설정
ALTER TABLE content_set_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to content_set_history"
  ON content_set_history FOR ALL USING (true) WITH CHECK (true);
