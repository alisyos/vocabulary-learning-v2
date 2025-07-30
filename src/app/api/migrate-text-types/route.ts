import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // 새로운 지문 유형 프롬프트 마이그레이션 SQL
  const migrationSQL = `
-- 1. 기존 구 유형들 비활성화 (삭제하지 않고 보관)
UPDATE system_prompts_v3 
SET is_active = false, 
    updated_at = CURRENT_TIMESTAMP,
    updated_by = 'migration'
WHERE category = 'passage' 
  AND sub_category = 'textType' 
  AND key IN (
    'type_inquiry', 'type_case', 'type_interview', 
    'type_compare', 'type_experiment'
  );

-- 2. 새로운 지문 유형들 삽입/업데이트
INSERT INTO system_prompts_v3 (
  prompt_id, category, sub_category, name, key, prompt_text, 
  description, is_active, is_default, version, created_by, updated_by
) VALUES 
  -- 생활문
  ('passage-type-life', 'passage', 'textType', '생활문', 'type_life', 
   '생활문: 일상생활 속에서 경험하거나 관찰한 내용을 담은 글입니다. 시간 순서대로 일어난 일을 기록하거나, 특정 생활 경험을 통해 깨달은 점을 서술합니다. 친근하고 자연스러운 문체로 작성하며, 학생들이 공감할 수 있는 상황을 활용하세요.',
   '생활문 형식의 지문 작성 가이드', true, true, 1, 'migration', 'migration'),
  
  -- 편지글
  ('passage-type-letter', 'passage', 'textType', '편지글', 'type_letter',
   '편지글: 특정 대상에게 전하는 메시지 형식의 글입니다. 받는 사람을 명시하고, 안부-본론-맺음말의 구조로 구성합니다. 친근하고 정감 있는 어투를 사용하며, 학습 내용을 편지 형식으로 자연스럽게 전달하세요.',
   '편지글 형식의 지문 작성 가이드', true, true, 1, 'migration', 'migration'),
  
  -- 기행문
  ('passage-type-travel', 'passage', 'textType', '기행문', 'type_travel',
   '기행문: 여행이나 견학을 통해 보고 듣고 느낀 것을 기록한 글입니다. 방문 장소의 특징과 의미를 설명하고, 개인적인 감상을 더합니다. 시간이나 동선에 따라 구성하며, 생생한 묘사와 학습 정보를 균형 있게 포함하세요.',
   '기행문 형식의 지문 작성 가이드', true, true, 1, 'migration', 'migration'),
  
  -- 설명문 (기존 유지하되 key 변경)
  ('passage-type-explanation', 'passage', 'textType', '설명문', 'type_explanation',
   '설명문: 사물이나 현상, 개념을 객관적으로 설명하는 글입니다. 정의-특징-예시-활용의 구조로 구성하며, 쉬운 용어와 구체적인 예시를 사용합니다. 복잡한 개념을 단계별로 풀어서 설명하세요.',
   '설명문 형식의 지문 작성 가이드', true, true, 1, 'migration', 'migration'),
  
  -- 기사문
  ('passage-type-news', 'passage', 'textType', '기사문', 'type_news',
   '기사문: 사실을 객관적으로 전달하는 뉴스 형식의 글입니다. 육하원칙에 따라 핵심 정보를 먼저 제시하고, 세부 내용을 보충합니다. 간결하고 명확한 문장을 사용하며, 학습 주제와 관련된 시사성 있는 내용을 다루세요.',
   '기사문 형식의 지문 작성 가이드', true, true, 1, 'migration', 'migration'),
  
  -- 과학탐구보고서
  ('passage-type-science-inquiry', 'passage', 'textType', '과학탐구보고서', 'type_science_inquiry',
   '과학탐구보고서: 과학적 탐구 과정과 결과를 체계적으로 정리한 글입니다. 탐구 주제-가설-탐구 방법-관찰 결과-결론의 구조로 구성합니다. 과학적 방법론을 따르며, 데이터와 증거를 중심으로 서술하세요.',
   '과학탐구보고서 형식의 지문 작성 가이드', true, true, 1, 'migration', 'migration'),
  
  -- 실험보고서 (기존 type_experiment를 type_experiment로 유지하되 내용 업데이트)
  ('passage-type-experiment-report', 'passage', 'textType', '실험보고서', 'type_experiment',
   '실험보고서: 과학 실험의 과정과 결과를 정확히 기록한 글입니다. 실험 목적-재료 및 도구-실험 과정-결과-고찰의 구조로 구성합니다. 단계별 절차를 명확히 하고, 관찰 내용을 객관적으로 기술하세요.',
   '실험보고서 형식의 지문 작성 가이드', true, true, 2, 'migration', 'migration'),
  
  -- 사회현상보고서
  ('passage-type-social-report', 'passage', 'textType', '사회현상보고서', 'type_social_report',
   '사회현상보고서: 사회 현상을 조사하고 분석한 내용을 담은 글입니다. 현상 소개-원인 분석-영향-해결 방안의 구조로 구성합니다. 통계나 사례를 활용하며, 객관적이고 균형 잡힌 시각을 유지하세요.',
   '사회현상보고서 형식의 지문 작성 가이드', true, true, 1, 'migration', 'migration')

ON CONFLICT (prompt_id) DO UPDATE SET
  prompt_text = EXCLUDED.prompt_text,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  version = EXCLUDED.version,
  updated_at = CURRENT_TIMESTAMP,
  updated_by = 'migration';

-- 3. 논설문 프롬프트 존재 확인 및 업데이트
INSERT INTO system_prompts_v3 (
  prompt_id, category, sub_category, name, key, prompt_text, 
  description, is_active, is_default, version, created_by, updated_by
) VALUES 
  ('passage-type-essay', 'passage', 'textType', '논설문', 'type_essay',
   '논설문: 특정 주제에 대한 의견이나 주장을 논리적으로 전개하는 글입니다. 문제 제기-근거 제시-반박-결론의 구조를 가지며, 설득력 있는 근거와 사례를 활용합니다. 학년 수준에 맞는 논리적 사고를 유도하세요.',
   '논설문 형식의 지문 작성 가이드', true, true, 1, 'migration', 'migration')
ON CONFLICT (prompt_id) DO UPDATE SET
  prompt_text = EXCLUDED.prompt_text,
  is_active = true,
  updated_at = CURRENT_TIMESTAMP,
  updated_by = 'migration';

-- 4. 마이그레이션 완료 확인
SELECT 
  name, 
  key, 
  is_active,
  version,
  updated_at
FROM system_prompts_v3 
WHERE category = 'passage' 
  AND sub_category = 'textType' 
ORDER BY is_active DESC, name;
  `;

  const rollbackSQL = `
-- 롤백용 SQL (필요시 사용)
-- 모든 textType 프롬프트를 다시 활성화
UPDATE system_prompts_v3 
SET is_active = true, 
    updated_at = CURRENT_TIMESTAMP,
    updated_by = 'rollback'
WHERE category = 'passage' 
  AND sub_category = 'textType';
  `;

  return NextResponse.json({
    success: true,
    message: '새로운 지문 유형 프롬프트 마이그레이션 SQL이 준비되었습니다.',
    changes: {
      removed: ['탐구문', '사례지문', '인터뷰형지문', '비교/대조형지문'],
      added: ['생활문', '편지글', '기행문', '설명문', '기사문', '과학탐구보고서', '실험보고서', '사회현상보고서'],
      kept: ['논설문']
    },
    instructions: [
      '1. Supabase 대시보드의 SQL Editor에서 migrationSQL을 실행하세요.',
      '2. 실행 후 쿼리 결과에서 새로운 유형들이 is_active = true로 표시되는지 확인하세요.',
      '3. 프롬프트 관리 페이지를 새로고침하여 새로운 유형들이 표시되는지 확인하세요.',
      '4. (문제 발생시) rollbackSQL을 실행하여 이전 상태로 복구할 수 있습니다.'
    ],
    sql: {
      migration: migrationSQL,
      rollback: rollbackSQL
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    
    if (action === 'check') {
      // 현재 textType 프롬프트 상태 확인
      const { supabase } = await import('@/lib/supabase');
      
      const { data, error } = await supabase
        .from('system_prompts_v3')
        .select('name, key, is_active, version, updated_at')
        .eq('category', 'passage')
        .eq('sub_category', 'textType')
        .order('is_active', { ascending: false })
        .order('name');

      if (error) {
        return NextResponse.json({
          success: false,
          error: '프롬프트 상태 확인 실패',
          message: error.message
        });
      }

      return NextResponse.json({
        success: true,
        message: '현재 textType 프롬프트 상태',
        data: data || [],
        activeCount: data?.filter(p => p.is_active).length || 0,
        totalCount: data?.length || 0
      });
    }

    return NextResponse.json({
      success: false,
      message: '지원하지 않는 액션입니다.',
      supportedActions: ['check']
    });

  } catch (error) {
    console.error('마이그레이션 API 오류:', error);
    return NextResponse.json({
      success: false,
      error: '요청 처리 중 오류가 발생했습니다.',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}