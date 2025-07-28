-- =============================================================================
-- 새로운 프롬프트 관리 테이블 생성 (모든 카테고리 지원)
-- Supabase Dashboard > SQL Editor에서 실행하세요
-- =============================================================================

-- 기존 테이블 백업 (선택사항)
CREATE TABLE IF NOT EXISTS system_prompts_v2_backup AS SELECT * FROM system_prompts_v2;

-- 새로운 프롬프트 테이블 생성 (제약 조건 없음)
CREATE TABLE IF NOT EXISTS system_prompts_v3 (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt_id VARCHAR(255) NOT NULL UNIQUE,
  category VARCHAR(50) NOT NULL, -- 제약 조건 제거
  sub_category VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  key VARCHAR(255) NOT NULL,
  prompt_text TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(100) DEFAULT 'system',
  updated_by VARCHAR(100) DEFAULT 'system'
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_system_prompts_v3_category ON system_prompts_v3(category);
CREATE INDEX IF NOT EXISTS idx_system_prompts_v3_sub_category ON system_prompts_v3(sub_category);
CREATE INDEX IF NOT EXISTS idx_system_prompts_v3_key ON system_prompts_v3(key);
CREATE INDEX IF NOT EXISTS idx_system_prompts_v3_active ON system_prompts_v3(is_active);
CREATE INDEX IF NOT EXISTS idx_system_prompts_v3_prompt_id ON system_prompts_v3(prompt_id);

-- updated_at 자동 업데이트 트리거
DROP TRIGGER IF EXISTS update_system_prompts_v3_updated_at ON system_prompts_v3;
CREATE TRIGGER update_system_prompts_v3_updated_at 
  BEFORE UPDATE ON system_prompts_v3 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 기존 데이터가 있다면 복사
INSERT INTO system_prompts_v3 (
  prompt_id, category, sub_category, name, key, prompt_text, 
  description, is_active, is_default, version, created_by, updated_by
)
SELECT 
  prompt_id, category, sub_category, name, key, prompt_text,
  description, is_active, is_default, version, created_by, updated_by
FROM system_prompts_v2
ON CONFLICT (prompt_id) DO NOTHING;

-- 테이블 생성 완료 확인
SELECT 
  'system_prompts_v3' as table_name,
  COUNT(*) as record_count
FROM system_prompts_v3;

-- 카테고리별 레코드 수 확인
SELECT 
  category,
  COUNT(*) as count
FROM system_prompts_v3
GROUP BY category
ORDER BY category;