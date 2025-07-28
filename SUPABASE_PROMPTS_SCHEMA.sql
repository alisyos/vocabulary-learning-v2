-- =============================================================================
-- 프롬프트 관리 시스템을 위한 Supabase 테이블 생성 SQL
-- Supabase Dashboard > SQL Editor에서 실행하세요
-- =============================================================================

-- 기존 system_prompts 테이블이 있다면 백업 (선택사항)
-- CREATE TABLE IF NOT EXISTS system_prompts_backup AS SELECT * FROM system_prompts;

-- 새로운 프롬프트 테이블 생성
CREATE TABLE IF NOT EXISTS system_prompts_v2 (
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

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_system_prompts_v2_category ON system_prompts_v2(category);
CREATE INDEX IF NOT EXISTS idx_system_prompts_v2_sub_category ON system_prompts_v2(sub_category);
CREATE INDEX IF NOT EXISTS idx_system_prompts_v2_key ON system_prompts_v2(key);
CREATE INDEX IF NOT EXISTS idx_system_prompts_v2_active ON system_prompts_v2(is_active);

-- 프롬프트 히스토리 테이블 (버전 관리용)
CREATE TABLE IF NOT EXISTS prompt_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt_id VARCHAR(255) NOT NULL,
  version INTEGER NOT NULL,
  prompt_text TEXT NOT NULL,
  change_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(100) DEFAULT 'system'
);

-- 프롬프트 사용 통계 테이블 (향후 확장용)
CREATE TABLE IF NOT EXISTS prompt_usage_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt_id VARCHAR(255) NOT NULL,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  avg_generation_time_ms FLOAT,
  success_rate FLOAT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- updated_at 자동 업데이트 함수 (이미 있다면 무시됨)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- updated_at 자동 업데이트 트리거
DROP TRIGGER IF EXISTS update_system_prompts_v2_updated_at ON system_prompts_v2;
CREATE TRIGGER update_system_prompts_v2_updated_at 
  BEFORE UPDATE ON system_prompts_v2 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 테이블 생성 완료 확인
SELECT 
  'system_prompts_v2' as table_name,
  COUNT(*) as record_count
FROM system_prompts_v2
UNION ALL
SELECT 
  'prompt_history' as table_name,
  COUNT(*) as record_count  
FROM prompt_history
UNION ALL
SELECT 
  'prompt_usage_stats' as table_name,
  COUNT(*) as record_count
FROM prompt_usage_stats; 