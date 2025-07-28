-- 프롬프트 테이블 재생성 (카테고리 제약조건 수정)

-- 1. 기존 테이블 삭제 (백업 후)
CREATE TABLE IF NOT EXISTS system_prompts_v2_backup AS SELECT * FROM system_prompts_v2;
DROP TABLE IF EXISTS system_prompts_v2;

-- 2. 새로운 테이블 생성 (확장된 카테고리 포함)
CREATE TABLE system_prompts_v2 (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt_id VARCHAR(255) NOT NULL UNIQUE,
  category VARCHAR(50) NOT NULL CHECK (category IN ('passage', 'vocabulary', 'paragraph', 'comprehensive', 'subject', 'area', 'division')),
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

-- 3. 인덱스 재생성
CREATE INDEX IF NOT EXISTS idx_system_prompts_v2_category ON system_prompts_v2(category);
CREATE INDEX IF NOT EXISTS idx_system_prompts_v2_sub_category ON system_prompts_v2(sub_category);
CREATE INDEX IF NOT EXISTS idx_system_prompts_v2_key ON system_prompts_v2(key);
CREATE INDEX IF NOT EXISTS idx_system_prompts_v2_active ON system_prompts_v2(is_active);

-- 4. 트리거 재생성
DROP TRIGGER IF EXISTS update_system_prompts_v2_updated_at ON system_prompts_v2;
CREATE TRIGGER update_system_prompts_v2_updated_at 
  BEFORE UPDATE ON system_prompts_v2 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. 확인
SELECT 'system_prompts_v2' as table_name, COUNT(*) as record_count FROM system_prompts_v2;