-- =============================================================================
-- 문단 문제 기능을 위한 Supabase 스키마 업데이트
-- Supabase Dashboard > SQL Editor에서 실행하세요
-- =============================================================================

-- 1. 문단 문제 테이블 생성
CREATE TABLE IF NOT EXISTS paragraph_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_set_id UUID NOT NULL REFERENCES content_sets(id) ON DELETE CASCADE,
    question_number INTEGER NOT NULL,
    question_type VARCHAR(50) NOT NULL CHECK (question_type IN ('어절 순서 맞추기', '빈칸 채우기', '유의어 고르기', '반의어 고르기', '문단 요약')),
    paragraph_number INTEGER NOT NULL CHECK (paragraph_number >= 1 AND paragraph_number <= 10),
    paragraph_text TEXT NOT NULL,
    question_text TEXT NOT NULL,
    option_1 TEXT NOT NULL,
    option_2 TEXT NOT NULL,
    option_3 TEXT NOT NULL,
    option_4 TEXT NOT NULL,
    option_5 TEXT,
    correct_answer VARCHAR(1) NOT NULL CHECK (correct_answer IN ('1', '2', '3', '4', '5')),
    explanation TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(content_set_id, question_number)
);

-- 2. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_paragraph_questions_content_set_id ON paragraph_questions(content_set_id);
CREATE INDEX IF NOT EXISTS idx_paragraph_questions_paragraph_number ON paragraph_questions(paragraph_number);
CREATE INDEX IF NOT EXISTS idx_paragraph_questions_question_type ON paragraph_questions(question_type);

-- 3. content_sets 테이블에 문단 문제 수 컬럼 추가
ALTER TABLE content_sets ADD COLUMN IF NOT EXISTS total_paragraph_questions INTEGER DEFAULT 0;

-- 4. AI 생성 로그 제약 조건 업데이트 (문단 문제 타입 추가)
DO $$
BEGIN
    -- 기존 제약 조건 삭제
    IF EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage 
        WHERE constraint_name = 'ai_generation_logs_generation_type_check'
    ) THEN
        ALTER TABLE ai_generation_logs DROP CONSTRAINT ai_generation_logs_generation_type_check;
    END IF;
    
    -- 새로운 제약 조건 추가 (paragraph 타입 포함)
    ALTER TABLE ai_generation_logs ADD CONSTRAINT ai_generation_logs_generation_type_check 
        CHECK (generation_type IN ('passage', 'vocabulary', 'paragraph', 'comprehensive'));
END $$;

-- 5. RLS (Row Level Security) 정책 설정 (필요한 경우)
-- paragraph_questions 테이블에 대한 기본 정책 설정
ALTER TABLE paragraph_questions ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기 가능하도록 설정 (필요에 따라 수정)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'paragraph_questions' AND policyname = 'Enable read access for all users'
    ) THEN
        CREATE POLICY "Enable read access for all users" ON paragraph_questions
            FOR SELECT USING (true);
    END IF;
END $$;

-- 인증된 사용자가 삽입 가능하도록 설정
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'paragraph_questions' AND policyname = 'Enable insert for authenticated users only'
    ) THEN
        CREATE POLICY "Enable insert for authenticated users only" ON paragraph_questions
            FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    END IF;
END $$;

-- 인증된 사용자가 업데이트 가능하도록 설정
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'paragraph_questions' AND policyname = 'Enable update for authenticated users only'
    ) THEN
        CREATE POLICY "Enable update for authenticated users only" ON paragraph_questions
            FOR UPDATE USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- 인증된 사용자가 삭제 가능하도록 설정
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'paragraph_questions' AND policyname = 'Enable delete for authenticated users only'
    ) THEN
        CREATE POLICY "Enable delete for authenticated users only" ON paragraph_questions
            FOR DELETE USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- 6. 기존 데이터의 total_paragraph_questions 값 업데이트 (있는 경우)
UPDATE content_sets 
SET total_paragraph_questions = (
    SELECT COUNT(*) 
    FROM paragraph_questions 
    WHERE paragraph_questions.content_set_id = content_sets.id
)
WHERE total_paragraph_questions IS NULL OR total_paragraph_questions = 0;

-- 7. 트리거 함수 생성 (content_sets의 total_paragraph_questions 자동 업데이트용)
CREATE OR REPLACE FUNCTION update_paragraph_questions_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE content_sets 
        SET total_paragraph_questions = (
            SELECT COUNT(*) 
            FROM paragraph_questions 
            WHERE content_set_id = NEW.content_set_id
        )
        WHERE id = NEW.content_set_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE content_sets 
        SET total_paragraph_questions = (
            SELECT COUNT(*) 
            FROM paragraph_questions 
            WHERE content_set_id = OLD.content_set_id
        )
        WHERE id = OLD.content_set_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 8. 트리거 생성
DROP TRIGGER IF EXISTS trigger_update_paragraph_questions_count ON paragraph_questions;
CREATE TRIGGER trigger_update_paragraph_questions_count
    AFTER INSERT OR DELETE ON paragraph_questions
    FOR EACH ROW EXECUTE FUNCTION update_paragraph_questions_count();

-- 9. 스키마 생성 완료 확인 쿼리
SELECT 
  'paragraph_questions' as table_name,
  COUNT(*) as record_count,
  'Table created successfully' as status
FROM paragraph_questions
UNION ALL
SELECT 
  'content_sets_updated' as table_name,
  COUNT(*) as sets_with_paragraph_count,
  'Column added successfully' as status
FROM content_sets 
WHERE total_paragraph_questions IS NOT NULL;

-- 10. 컬럼 정보 확인
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'paragraph_questions' 
ORDER BY ordinal_position;

-- 11. 제약 조건 확인
SELECT 
    constraint_name,
    constraint_type,
    table_name
FROM information_schema.table_constraints
WHERE table_name = 'paragraph_questions';

-- 완료 메시지
SELECT 
    '✅ 문단 문제 스키마 업데이트가 완료되었습니다!' as message,
    NOW() as completed_at;