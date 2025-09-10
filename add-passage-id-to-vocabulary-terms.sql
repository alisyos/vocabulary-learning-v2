-- vocabulary_terms 테이블에 passage_id 컬럼 추가
-- 각 어휘가 어느 지문에서 추출되었는지 추적하기 위함

-- 1. passage_id 컬럼 추가 (nullable로 먼저 추가)
ALTER TABLE vocabulary_terms 
ADD COLUMN IF NOT EXISTS passage_id UUID;

-- 2. passages 테이블과의 외래키 관계 설정
ALTER TABLE vocabulary_terms 
ADD CONSTRAINT fk_vocabulary_terms_passage_id 
FOREIGN KEY (passage_id) 
REFERENCES passages(id) 
ON DELETE CASCADE;

-- 3. 인덱스 추가 (검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_vocabulary_terms_passage_id 
ON vocabulary_terms(passage_id);

-- 4. 컬럼에 대한 설명 추가
COMMENT ON COLUMN vocabulary_terms.passage_id IS '어휘가 추출된 지문의 ID (2개 지문 형식에서 어휘의 출처 추적용)';

-- 5. 기존 데이터 처리 (옵션)
-- 기존 데이터는 모두 첫 번째 지문(passage_number = 1)에서 추출되었다고 가정
UPDATE vocabulary_terms vt
SET passage_id = (
    SELECT p.id 
    FROM passages p 
    WHERE p.content_set_id = vt.content_set_id 
    AND p.passage_number = 1
    LIMIT 1
)
WHERE vt.passage_id IS NULL 
AND EXISTS (
    SELECT 1 
    FROM passages p 
    WHERE p.content_set_id = vt.content_set_id
);