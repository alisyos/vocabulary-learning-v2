import { SystemPrompt, PromptCategory, PromptSubCategory } from '@/types';

// 프롬프트 데이터 정의 (순서 중요!)
export const DEFAULT_PROMPTS_V2: SystemPrompt[] = [
  // ============== 1. 지문 생성 ==============
  // 전체 시스템 프롬프트
  {
    promptId: 'passage-system-base',
    category: 'passage',
    subCategory: 'system',
    name: '전체 시스템 프롬프트',
    key: 'system_base',
    promptText: `###지시사항
다음 입력값을 받아 학습 지문(passage)을 생성하십시오. 출력은 하나의 영역으로 구분합니다.
- passage: 입력 조건을 반영해 생성한 지문

모든 지문은 질문형·호기심 유발형 제목을 사용하고, 실생활 예시를 활용해 추상 개념을 설명해야 하며, 임의(random) 로직은 사용하지 않습니다.

###작성절차
1. 키워드 도출
- 구분·과목·학년·영역·지문 길이를 파싱하여 ① 핵심 개념(기초→심화), ② 생활 연계 예시, ③ 학년별 어휘 수준을 도출합니다.
2. 지문(passages) 생성
- 도출한 가이드를 조합해 제목 1개와 본문을 작성합니다.
- 본문은 입력된 지문 길이 가이드라인과 출력 형식 규칙을 정확히 준수합니다.
- **용어 설명 필수 요구사항**: 지문에 등장하는 모든 학습 관련 용어들을 footnote에 포함시켜야 합니다. 최소 20개 이상의 용어를 추출하여 설명하세요.
  * 핵심 개념어와 관련 용어들
  * 지문에 직접 언급된 전문 용어들
  * 학년 수준에 맞는 중요한 어휘들
  * 관련 배경 지식이 필요한 용어들
  * 생활 속에서 사용되는 관련 용어들도 포함
- **용어 설명 형식**: 각 용어에 대해 "용어: 설명 (예시: 예시문장)" 형태로 작성하세요.
  * 설명: 학년 수준에 맞는 간단하고 명확한 설명
  * 예시문장: 해당 용어가 실제로 사용되는 자연스러운 문장
3. 흥미 요소 적용
- 도입부에 실생활 상황·질문을 배치하여 독자의 호기심을 자극합니다.
- 단순 설명문뿐 아니라 비교·예측·원인결과 등 다양한 서술 방식을 활용합니다.
4. 출력 생성
- 아래 [공통 출력 스키마] 형식을 준수한 JSON만 출력하십시오.
- 지정된 키가 없거나 데이터를 찾을 수 없으면 **"-"**로 표기합니다.
- **footnote는 반드시 20개 이상의 용어 설명을 포함해야 하며, 각 용어는 설명과 예시문장을 모두 포함해야 합니다.**

###구분
{division_prompt}

###지문 길이
{length_prompt}

###과목
{subject}

###학년
{grade}

###영역
{area_prompt}

###대주제
{maintopic}
위 대주제를 중심으로 {area} 영역의 학습 내용과 연결하여 지문을 구성하세요.

###소주제
{subtopic}
이 소주제를 구체적으로 다루며, 대주제와의 연관성을 명확히 하여 지문을 작성하세요.

###핵심 개념어
{keyword}
이 핵심 개념어들을 지문에 자연스럽게 포함시키고, 학년 수준에 맞게 설명하세요. footnote에는 이 용어들을 포함하여 최소 20개 이상의 관련 용어 해설을 추가하세요.

###글의 유형 (선택사항)
{text_type_prompt}

###출력형식(JSON)
{output_format}`,
    description: '지문 생성의 기본 시스템 프롬프트',
    isActive: true,
    isDefault: true,
    version: 1,
  },

  // 지문 길이별 프롬프트 (순서: 1-2/10, 1-2/12, 10/5, 4-5/5-6, 5-6/6)
  {
    promptId: 'passage-length-1-2-10',
    category: 'passage',
    subCategory: 'length',
    name: '1-2문장으로 구성한 10개 단락',
    key: 'length_1_2_10',
    promptText: `{
  "passages": [
    {
      "title": "<질문형·흥미유발형 제목>",
      "paragraphs": [
        "<1-2문장으로 구성한 단락1>",
        "<1-2문장으로 구성한 단락2>",
        "<1-2문장으로 구성한 단락3>",
        "<1-2문장으로 구성한 단락4>",
        "<1-2문장으로 구성한 단락5>",
        "<1-2문장으로 구성한 단락6>",
        "<1-2문장으로 구성한 단락7>",
        "<1-2문장으로 구성한 단락8>",
        "<1-2문장으로 구성한 단락9>",
        "<1-2문장으로 구성한 단락10>"
      ],
      "footnote": [
        "용어1: 간단하고 명확한 설명 (예시: 용어1을 사용한 자연스러운 예시문장)",
        "용어2: 간단하고 명확한 설명 (예시: 용어2를 사용한 자연스러운 예시문장)",
        // ... 20-25개 용어
      ]
    }
  ]
}`,
    description: '초등학교 고학년용 지문 길이 형식',
    isActive: true,
    isDefault: false,
    version: 1,
  },

  {
    promptId: 'passage-length-1-2-12',
    category: 'passage',
    subCategory: 'length',
    name: '1-2문장으로 구성한 12개 단락',
    key: 'length_1_2_12',
    promptText: `{
  "passages": [
    {
      "title": "<질문형·흥미유발형 제목>",
      "paragraphs": [
        "<1-2문장으로 구성한 단락1>",
        "<1-2문장으로 구성한 단락2>",
        "<1-2문장으로 구성한 단락3>",
        "<1-2문장으로 구성한 단락4>",
        "<1-2문장으로 구성한 단락5>",
        "<1-2문장으로 구성한 단락6>",
        "<1-2문장으로 구성한 단락7>",
        "<1-2문장으로 구성한 단락8>",
        "<1-2문장으로 구성한 단락9>",
        "<1-2문장으로 구성한 단락10>",
        "<1-2문장으로 구성한 단락11>",
        "<1-2문장으로 구성한 단락12>"
      ],
      "footnote": [
        "용어1: 간단하고 명확한 설명 (예시: 용어1을 사용한 자연스러운 예시문장)",
        "용어2: 간단하고 명확한 설명 (예시: 용어2를 사용한 자연스러운 예시문장)",
        // ... 20-25개 용어
      ]
    }
  ]
}`,
    description: '중학생용 지문 길이 형식',
    isActive: true,
    isDefault: false,
    version: 1,
  },

  {
    promptId: 'passage-length-10-5',
    category: 'passage',
    subCategory: 'length',
    name: '10문장 이하로 구성한 5개 단락',
    key: 'length_10_5',
    promptText: `{
  "passages": [
    {
      "title": "<질문형·흥미유발형 제목>",
      "paragraphs": [
        "<10문장 이하로 구성한 단락1>",
        "<10문장 이하로 구성한 단락2>",
        "<10문장 이하로 구성한 단락3>",
        "<10문장 이하로 구성한 단락4>",
        "<10문장 이하로 구성한 단락5>"
      ],
      "footnote": [
        "용어1: 간단하고 명확한 설명 (예시: 용어1을 사용한 자연스러운 예시문장)",
        "용어2: 간단하고 명확한 설명 (예시: 용어2를 사용한 자연스러운 예시문장)",
        // ... 20-25개 용어
      ]
    }
  ]
}`,
    description: '중학생용 지문 길이 형식',
    isActive: true,
    isDefault: false,
    version: 1,
  },

  {
    promptId: 'passage-length-4-5-5-6',
    category: 'passage',
    subCategory: 'length',
    name: '4-5문장으로 구성한 5-6개 단락',
    key: 'length_4_5_5_6',
    promptText: `{
  "passages": [
    {
      "title": "<질문형·흥미유발형 제목>",
      "paragraphs": [
        "<4-5문장으로 구성한 단락1>",
        "<4-5문장으로 구성한 단락2>",
        "<4-5문장으로 구성한 단락3>",
        "<4-5문장으로 구성한 단락4>",
        "<4-5문장으로 구성한 단락5>",
        "<4-5문장으로 구성한 단락6(생략가능)>"
      ],
      "footnote": [
        "용어1: 간단하고 명확한 설명 (예시: 용어1을 사용한 자연스러운 예시문장)",
        "용어2: 간단하고 명확한 설명 (예시: 용어2를 사용한 자연스러운 예시문장)",
        // ... 20-25개 용어
      ]
    }
  ]
}`,
    description: '초등학교 중학년용 지문 길이 형식',
    isActive: true,
    isDefault: false,
    version: 1,
  },

  {
    promptId: 'passage-length-5-6-6',
    category: 'passage',
    subCategory: 'length',
    name: '5-6문장으로 구성한 6개 단락',
    key: 'length_5_6_6',
    promptText: `{
  "passages": [
    {
      "title": "<질문형·흥미유발형 제목>",
      "paragraphs": [
        "<5-6문장으로 구성한 단락1>",
        "<5-6문장으로 구성한 단락2>",
        "<5-6문장으로 구성한 단락3>",
        "<5-6문장으로 구성한 단락4>",
        "<5-6문장으로 구성한 단락5>",
        "<5-6문장으로 구성한 단락6>"
      ],
      "footnote": [
        "용어1: 간단하고 명확한 설명 (예시: 용어1을 사용한 자연스러운 예시문장)",
        "용어2: 간단하고 명확한 설명 (예시: 용어2를 사용한 자연스러운 예시문장)",
        // ... 20-25개 용어
      ]
    }
  ]
}`,
    description: '초등학교 고학년용 지문 길이 형식',
    isActive: true,
    isDefault: false,
    version: 1,
  },

  // 유형별 프롬프트 (순서: 생활문, 편지글, 기행문, 논설문, 설명문, 기사문, 과학탐구보고서, 실험보고서, 사회현상보고서)
  {
    promptId: 'passage-type-life',
    category: 'passage',
    subCategory: 'textType',
    name: '생활문',
    key: 'type_life',
    promptText: '생활문: 일상생활 속에서 경험하거나 관찰한 내용을 담은 글입니다. 시간 순서대로 일어난 일을 기록하거나, 특정 생활 경험을 통해 깨달은 점을 서술합니다. 친근하고 자연스러운 문체로 작성하며, 학생들이 공감할 수 있는 상황을 활용하세요.',
    description: '생활문 형식의 지문 작성 가이드',
    isActive: true,
    isDefault: false,
    version: 1,
  },

  {
    promptId: 'passage-type-letter',
    category: 'passage',
    subCategory: 'textType',
    name: '편지글',
    key: 'type_letter',
    promptText: '편지글: 특정 대상에게 전하는 메시지 형식의 글입니다. 받는 사람을 명시하고, 안부-본론-맺음말의 구조로 구성합니다. 친근하고 정감 있는 어투를 사용하며, 학습 내용을 편지 형식으로 자연스럽게 전달하세요.',
    description: '편지글 형식의 지문 작성 가이드',
    isActive: true,
    isDefault: false,
    version: 1,
  },

  {
    promptId: 'passage-type-travel',
    category: 'passage',
    subCategory: 'textType',
    name: '기행문',
    key: 'type_travel',
    promptText: '기행문: 여행이나 견학을 통해 보고 듣고 느낀 것을 기록한 글입니다. 방문 장소의 특징과 의미를 설명하고, 개인적인 감상을 더합니다. 시간이나 동선에 따라 구성하며, 생생한 묘사와 학습 정보를 균형 있게 포함하세요.',
    description: '기행문 형식의 지문 작성 가이드',
    isActive: true,
    isDefault: false,
    version: 1,
  },

  {
    promptId: 'passage-type-essay',
    category: 'passage',
    subCategory: 'textType',
    name: '논설문',
    key: 'type_essay',
    promptText: '논설문: 특정 주제에 대한 의견이나 주장을 논리적으로 전개하는 글입니다. 문제 제기-근거 제시-반박-결론의 구조를 가지며, 설득력 있는 근거와 사례를 활용합니다. 학년 수준에 맞는 논리적 사고를 유도하세요.',
    description: '논설문 형식의 지문 작성 가이드',
    isActive: true,
    isDefault: false,
    version: 1,
  },

  {
    promptId: 'passage-type-explanation',
    category: 'passage',
    subCategory: 'textType',
    name: '설명문',
    key: 'type_explanation',
    promptText: '설명문: 사물이나 현상, 개념을 객관적으로 설명하는 글입니다. 정의-특징-예시-활용의 구조로 구성하며, 쉬운 용어와 구체적인 예시를 사용합니다. 복잡한 개념을 단계별로 풀어서 설명하세요.',
    description: '설명문 형식의 지문 작성 가이드',
    isActive: true,
    isDefault: false,
    version: 1,
  },

  {
    promptId: 'passage-type-news',
    category: 'passage',
    subCategory: 'textType',
    name: '기사문',
    key: 'type_news',
    promptText: '기사문: 사실을 객관적으로 전달하는 뉴스 형식의 글입니다. 육하원칙에 따라 핵심 정보를 먼저 제시하고, 세부 내용을 보충합니다. 간결하고 명확한 문장을 사용하며, 학습 주제와 관련된 시사성 있는 내용을 다루세요.',
    description: '기사문 형식의 지문 작성 가이드',
    isActive: true,
    isDefault: false,
    version: 1,
  },

  {
    promptId: 'passage-type-science-inquiry',
    category: 'passage',
    subCategory: 'textType',
    name: '과학탐구보고서',
    key: 'type_science_inquiry',
    promptText: '과학탐구보고서: 과학적 탐구 과정과 결과를 체계적으로 정리한 글입니다. 탐구 주제-가설-탐구 방법-관찰 결과-결론의 구조로 구성합니다. 과학적 방법론을 따르며, 데이터와 증거를 중심으로 서술하세요.',
    description: '과학탐구보고서 형식의 지문 작성 가이드',
    isActive: true,
    isDefault: false,
    version: 1,
  },

  {
    promptId: 'passage-type-experiment',
    category: 'passage',
    subCategory: 'textType',
    name: '실험보고서',
    key: 'type_experiment',
    promptText: '실험보고서: 과학 실험의 과정과 결과를 정확히 기록한 글입니다. 실험 목적-재료 및 도구-실험 과정-결과-고찰의 구조로 구성합니다. 단계별 절차를 명확히 하고, 관찰 내용을 객관적으로 기술하세요.',
    description: '실험보고서 형식의 지문 작성 가이드',
    isActive: true,
    isDefault: false,
    version: 1,
  },

  {
    promptId: 'passage-type-social-report',
    category: 'passage',
    subCategory: 'textType',
    name: '사회현상보고서',
    key: 'type_social_report',
    promptText: '사회현상보고서: 사회 현상을 조사하고 분석한 내용을 담은 글입니다. 현상 소개-원인 분석-영향-해결 방안의 구조로 구성합니다. 통계나 사례를 활용하며, 객관적이고 균형 잡힌 시각을 유지하세요.',
    description: '사회현상보고서 형식의 지문 작성 가이드',
    isActive: true,
    isDefault: false,
    version: 1,
  },

  // ============== 2. 어휘 문제 생성 ==============
  {
    promptId: 'vocabulary-system-base',
    category: 'vocabulary',
    subCategory: 'vocabularySystem',
    name: '전체 시스템 프롬프트',
    key: 'system_base',
    promptText: `###지시사항
주어진 용어에 대한 어휘 문제를 1개 생성하십시오.
- 용어의 정의, 의미, 사용법을 정확히 이해하고 있는지 평가하는 문제를 생성합니다.
- 지문의 맥락을 고려하여 용어의 구체적 의미를 묻는 문제를 만듭니다.
- 5지선다 객관식 문제로 생성하며, 정답 1개와 그럴듯한 오답 4개를 제공합니다.

###대상 용어
**용어명**: {termName}
**용어 설명**: {termDescription}

###지문 맥락
{passage}

###구분 (난이도 조절)
{divisionPrompt}

###출력형식(JSON)
다음 JSON 형식으로만 출력하십시오:
{
  "question": "용어의 의미나 사용법을 묻는 질문",
  "options": [
    "정답 선택지",
    "오답 선택지 1", 
    "오답 선택지 2",
    "오답 선택지 3",
    "오답 선택지 4"
  ],
  "answer": "정답 선택지",
  "explanation": "정답인 이유와 오답인 이유를 포함한 해설"
}

###문제 생성 가이드라인
1. **질문 유형**:
   - 용어의 정의를 직접 묻는 문제
   - 용어가 사용된 맥락에서의 의미를 묻는 문제
   - 용어와 관련된 개념이나 예시를 묻는 문제
   - 용어를 다른 상황에 적용하는 문제

2. **선택지 구성**:
   - 정답: 용어의 정확한 의미 또는 올바른 사용법
   - 오답 1: 비슷하지만 미묘하게 다른 의미
   - 오답 2: 관련 있지만 틀린 개념
   - 오답 3: 일반적인 오해나 혼동 가능한 내용
   - 오답 4: 명백히 틀렸지만 그럴듯한 내용

###주의사항
- 반드시 위의 JSON 형식을 정확히 준수하십시오.
- 학년별 어휘 수준에 맞는 용어와 설명을 사용하십시오.
- 정답과 해설은 용어의 정확한 의미에 근거해야 합니다.
- 오답 선택지도 그럴듯하게 구성하여 변별력을 높이십시오.`,
    description: '어휘 문제 생성의 기본 시스템 프롬프트',
    isActive: true,
    isDefault: true,
    version: 1,
  },

  // 더 이상 사용하지 않는 프롬프트 (basePrompt에 통합됨)
  {
    promptId: 'vocabulary-type-multiple',
    category: 'vocabulary',
    subCategory: 'vocabularyType',
    name: '객관식 (사용 안함)',
    key: 'type_multiple',
    promptText: `[더 이상 사용하지 않는 프롬프트입니다. vocabulary-system-base에 통합되었습니다.]`,
    description: '어휘 문제 객관식 출력 형식 (더 이상 사용 안함)',
    isActive: false,
    isDefault: false,
    version: 1,
  },

  // ============== 3. 문단 문제 생성 ==============
  // 전체 시스템 프롬프트
  {
    promptId: 'paragraph-system-base',
    category: 'paragraph',
    subCategory: 'paragraphSystem',
    name: '전체 시스템 프롬프트',
    key: 'system_base',
    promptText: `###지시사항
다음의 지문의 문단에 대한 {questionType} 문제를 생성해주세요.
{questionIndexNote}

**지문 제목**: {title}
**대상 학년**: {grade}
**문단 내용**: {paragraphText}
**문제 번호**: {questionIndex}번째 {questionType} 문제

###구분 (난이도 조절)
{divisionPrompt}

###문제 유형별 요구사항
{specificPrompt}

###주의사항
- {grade}에 맞는 어휘와 난이도 사용
- 명확하고 구체적인 문제 출제
- 정답과 오답이 명확히 구분되도록 작성
- 해설은 학생이 이해하기 쉽게 작성
- 반드시 JSON 형식으로만 응답

### 문제 유형별 상세 가이드라인

**빈칸 채우기**:
- 문단에서 핵심 어휘나 중요한 단어를 빈칸으로 처리
- 문맥에 맞는 적절한 단어를 선택하도록 하는 문제
- 어휘의 의미와 문맥 적절성을 평가

**주관식 단답형**:
- 문단의 내용을 바탕으로 간단한 답을 쓰는 문제
- 정답과 함께 반드시 초성 힌트를 제공 (예: 장래희망 → ㅈㄹㅎㅁ)
- 문단 이해도와 핵심 내용 파악 능력을 평가

**어절 순서 맞추기**:
- 문단에서 의미 있는 문장을 선택하여 어절들을 원형 번호로 제시
- 어절들을 올바른 순서로 배열했을 때의 번호 순서를 선택하는 문제
- 어절 배열과 문장 구성 능력을 평가

**OX문제**:
- 문단의 내용이 맞는지 틀린지 판단하는 문제
- 명확한 사실 확인이 가능한 내용으로 출제
- 문단 내용의 정확한 이해도를 평가

###출력 형식 (반드시 JSON 형식으로)

{
  "question": "문제 내용",
  "options": ["선택지1", "선택지2", "선택지3", "선택지4", "선택지5"],
  "answer": "1",
  "explanation": "정답 해설"
}`,
    description: '문단 문제 생성의 기본 시스템 프롬프트',
    isActive: true,
    isDefault: true,
    version: 1,
  },

  // 문제 유형별 프롬프트 (순서: 빈칸 채우기, 주관식 단답형, 어절 순서 맞추기, OX문제)
  {
    promptId: 'paragraph-type-blank',
    category: 'paragraph',
    subCategory: 'paragraphType',
    name: '빈칸 채우기',
    key: 'type_blank',
    promptText: `빈칸 채우기: 문단의 핵심 문장에서 중요한 단어나 구를 빈칸으로 처리하고, 문맥에 맞는 적절한 답을 고르는 문제입니다.

출력 형식:
{
  "type": "빈칸 채우기",
  "question": "다음 빈칸에 들어갈 말로 가장 적절한 것은?\\n\\n[빈칸이 포함된 문장]",
  "options": [
    "첫 번째 선택지",
    "두 번째 선택지",
    "세 번째 선택지",
    "네 번째 선택지",
    "다섯 번째 선택지"
  ],
  "answer": "정답 번호",
  "explanation": "정답인 이유와 문맥 설명"
}`,
    description: '빈칸 채우기 문제 형식',
    isActive: true,
    isDefault: false,
    version: 1,
  },

  {
    promptId: 'paragraph-type-short-answer',
    category: 'paragraph',
    subCategory: 'paragraphType',
    name: '주관식 단답형',
    key: 'type_short_answer',
    promptText: `주관식 단답형: 문단의 내용을 바탕으로 간단한 답을 쓰는 문제입니다. 정답과 함께 초성 힌트를 제공합니다.

출력 형식:
{
  "type": "주관식 단답형",
  "question": "문단 내용을 바탕으로 질문에 답하세요.",
  "answer": "정답 (예: 장래희망)",
  "answerInitials": "초성 힌트 (예: ㅈㄹㅎㅁ)",
  "explanation": "정답 해설과 근거"
}`,
    description: '주관식 단답형 문제 형식 (초성 힌트 포함)',
    isActive: true,
    isDefault: false,
    version: 1,
  },

  {
    promptId: 'paragraph-type-order',
    category: 'paragraph',
    subCategory: 'paragraphType',
    name: '어절 순서 맞추기',
    key: 'type_order',
    promptText: `어절 순서 맞추기: 문단의 핵심 문장을 어절 단위로 섞어 놓고, 올바른 순서로 배열하는 문제입니다. 문법적으로 자연스럽고 의미가 통하는 순서를 찾도록 합니다.

출력 형식:
{
  "type": "어절 순서 맞추기",
  "question": "다음 어절들을 올바른 문장 순서로 배열했을 때, 알맞은 번호 순서를 고르세요.\\n① 어절1\\n② 어절2\\n③ 어절3\\n④ 어절4\\n⑤ 어절5",
  "options": [
    "첫 번째 배열 순서",
    "두 번째 배열 순서",
    "세 번째 배열 순서",
    "네 번째 배열 순서",
    "다섯 번째 배열 순서"
  ],
  "answer": "정답 번호",
  "explanation": "정답 해설 (정해진 문장도 함께 제시)"
}`,
    description: '어절 순서 맞추기 문제 형식',
    isActive: true,
    isDefault: false,
    version: 1,
  },

  {
    promptId: 'paragraph-type-ox',
    category: 'paragraph',
    subCategory: 'paragraphType',
    name: 'OX문제',
    key: 'type_ox',
    promptText: `OX문제: 문단의 내용이 맞는지 틀린지 판단하는 문제입니다. 명확한 사실 확인이 가능한 내용으로 출제합니다.

출력 형식:
{
  "type": "OX문제",
  "question": "다음 내용이 문단의 설명과 일치하면 O, 일치하지 않으면 X를 고르세요.\\n\\n[판단할 내용]",
  "options": [
    "O (맞다)",
    "X (틀리다)"
  ],
  "answer": "정답 번호 (1 또는 2)",
  "explanation": "정답 근거와 문단에서의 해당 내용"
}`,
    description: 'OX문제 형식',
    isActive: true,
    isDefault: false,
    version: 1,
  },

  // ============== 4. 종합 문제 생성 ==============
  // 전체 시스템 프롬프트
  {
    promptId: 'comprehensive-system-base',
    category: 'comprehensive',
    subCategory: 'comprehensiveSystem',
    name: '전체 시스템 프롬프트',
    key: 'system_base',
    promptText: `###지시사항
주어진 지문을 바탕으로 **{questionType}** 유형의 문제 {questionCount}개를 생성하십시오.
- 지문의 전체적인 이해와 핵심 내용 파악을 평가하는 문제를 생성합니다.
- 각 문제는 서로 다른 관점이나 내용을 다뤄야 합니다.
- 지문에 직접 언급된 내용이나 논리적으로 추론 가능한 내용만을 바탕으로 출제합니다.

###지문
{passage}

###구분 (난이도 조절)
{divisionPrompt}

###문제 유형 가이드라인
{typePrompt}

###주의사항
- 반드시 위의 JSON 형식을 정확히 준수하십시오.
- 각 문제는 서로 다른 내용이나 관점을 다뤄야 합니다.
- 정답과 해설은 지문에 명확히 근거해야 합니다.
- 객관식 문제의 오답 선택지도 그럴듯하게 구성하십시오.

### 문제 유형별 상세 가이드라인

**단답형 문제**:
- 지문의 핵심 내용을 간단한 단어나 구로 답하는 문제
- 사실적 정보나 핵심 개념을 묻는 문제
- 명확하고 구체적인 답변이 가능한 문제

**문단별 순서 맞추기**:
- 지문의 문단들을 논리적 순서로 배열하는 문제
- 내용의 흐름과 논리적 연결 관계를 파악하는 능력 평가
- 각 문단의 역할과 상호관계 이해 평가

**핵심 내용 요약**:
- 지문의 주요 내용을 요약하여 선택하는 문제
- 전체 내용의 핵심 메시지와 주제 파악 능력 평가
- 세부 내용과 핵심 내용을 구분하는 능력 평가

**핵심어/핵심문장 찾기**:
- 지문에서 가장 중요한 단어나 문장을 찾는 문제
- 내용의 중요도를 판단하는 능력 평가
- 지문의 핵심 아이디어를 파악하는 능력 평가`,
    description: '종합 문제 생성의 기본 시스템 프롬프트',
    isActive: true,
    isDefault: true,
    version: 1,
  },

  // 문제 유형별 프롬프트 (순서: 단답형, 문단별 순서 맞추기, 핵심 내용 요약, 핵심어/핵심문장 찾기)
  {
    promptId: 'comprehensive-type-short',
    category: 'comprehensive',
    subCategory: 'comprehensiveType',
    name: '단답형',
    key: 'type_short',
    promptText: `단답형: 지문의 핵심 내용에 대해 간단한 답을 요구하는 주관식 문제입니다. 1-3단어 또는 한 문장 이내로 답할 수 있는 문제를 출제합니다.

생성 지침:
1. 지문에 직접 언급된 내용 기반 문제
2. 명확하고 구체적인 정답 필요
3. 초성 힌트 필수 제공
4. 지문의 핵심 개념, 용어, 현상을 묻는 문제

출력 형식:
{
  "type": "단답형",
  "questionFormat": "주관식",
  "question": "지문에서 [구체적인 개념/현상/용어]는 무엇입니까?",
  "answer": "정답 (구체적인 용어나 개념)",
  "answerInitials": "초성 힌트 (예: ㅈㄹㅎㅁ)",
  "explanation": "정답 근거와 지문 해당 부분 인용"
}

주의사항:
- 정답은 지문에 명시된 내용이어야 함
- 모호하거나 해석 여지가 있는 문제 지양
- 학년 수준에 맞는 어휘와 개념 활용`,
    description: '단답형 문제 형식',
    isActive: true,
    isDefault: false,
    version: 1,
  },


  {
    promptId: 'comprehensive-type-summary',
    category: 'comprehensive',
    subCategory: 'comprehensiveType',
    name: '핵심 내용 요약',
    key: 'type_summary',
    promptText: `핵심 내용 요약: 전체 지문의 중심 내용을 파악하여 요약한 것을 고르는 문제입니다. 주제문이나 결론을 정확히 이해하고 있는지 평가합니다.

생성 지침:
1. 지문의 전체적인 흐름과 핵심 메시지 파악
2. 주제문, 결론, 핵심 아이디어를 중심으로 요약
3. 5개의 선택지 중 1개만이 정확한 요약이 되도록 구성
4. 오답은 부분적 내용, 과도한 일반화, 잘못된 해석 등으로 구성

출력 형식:
{
  "type": "핵심 내용 요약",
  "questionFormat": "객관식",
  "question": "다음 글의 핵심 내용을 가장 잘 요약한 것은?",
  "options": [
    "정답: 지문의 주제와 핵심 내용을 정확히 반영한 요약문",
    "오답1: 부분적 내용만 포함한 요약문",
    "오답2: 과도하게 일반화된 요약문",
    "오답3: 핵심을 놓친 요약문",
    "오답4: 잘못 해석된 요약문"
  ],
  "answer": "1",
  "explanation": "정답 선택지가 지문의 어느 부분을 반영하는지 구체적으로 설명"
}

주의사항:
- 각 선택지는 150-200자 내외로 구성
- 정답은 지문의 핵심을 모두 포함해야 함
- 오답들은 그럴듯하지만 명확한 차이점이 있어야 함`,
    description: '핵심 내용 요약 문제 형식',
    isActive: true,
    isDefault: false,
    version: 1,
  },

  {
    promptId: 'comprehensive-type-keyword',
    category: 'comprehensive',
    subCategory: 'comprehensiveType',
    name: '핵심문장 찾기',
    key: 'type_keyword',
    promptText: `핵심문장 찾기: 지문에서 가장 중요한 문장을 찾는 문제입니다. 글의 주제나 핵심 메시지를 담고 있는 문장을 파악합니다.

생성 지침:
1. 지문에서 실제로 사용된 문장들을 선택지로 활용
2. 주제문, 결론문, 핵심 아이디어를 담은 문장 위주로 구성
3. 정답은 글의 중심 내용을 가장 잘 드러내는 문장
4. 오답은 부차적 내용, 예시, 세부 사항을 담은 문장들

출력 형식:
{
  "type": "핵심문장 찾기",
  "questionFormat": "객관식",
  "question": "다음 글에서 핵심 내용을 가장 잘 드러낸 문장은?",
  "options": [
    "정답: 글의 주제나 결론을 가장 명확히 보여주는 문장",
    "오답1: 부차적 내용을 담은 문장",
    "오답2: 예시나 부연 설명 문장",
    "오답3: 세부 사항을 다룬 문장",
    "오답4: 도입부의 배경 설명 문장"
  ],
  "answer": "1",
  "explanation": "해당 문장이 왜 핵심문장인지, 글에서 어떤 역할을 하는지 설명"
}

주의사항:
- 모든 선택지는 지문에서 실제로 발췌한 문장이어야 함
- 문장의 길이는 적절히 조절 (너무 길거나 짧지 않게)
- 정답 문장은 글의 논리적 구조에서 핵심 역할을 해야 함`,
    description: '핵심문장 찾기 문제 형식',
    isActive: true,
    isDefault: false,
    version: 1,
  },

  {
    promptId: 'comprehensive-type-ox',
    category: 'comprehensive',
    subCategory: 'comprehensiveType',
    name: 'OX문제',
    key: 'type_ox',
    promptText: `OX문제: 지문의 내용에 대해 참(○) 또는 거짓(×)을 판단하는 문제입니다. 지문에 직접 언급된 사실이나 논리적으로 추론 가능한 내용을 바탕으로 합니다.

생성 지침:
1. 지문에 명시적으로 언급된 내용 기반
2. 명확히 참/거짓 판단이 가능한 진술문 작성
3. 애매하거나 주관적 해석이 필요한 내용 지양
4. 선택지는 "○ (참)" / "× (거짓)" 2개만 제공

출력 형식:
{
  "type": "OX문제",
  "questionFormat": "객관식",
  "question": "다음 내용이 지문의 설명과 일치하면 ○, 일치하지 않으면 ×를 고르세요.\\n\\n[지문 내용에 대한 명확한 진술문]",
  "options": [
    "○ (참)",
    "× (거짓)"
  ],
  "answer": "1 또는 2",
  "explanation": "지문의 해당 부분을 인용하며 참/거짓 근거를 명확히 제시"
}

예시 진술문:
- "지문에 따르면, [특정 현상]은 [특정 원인] 때문에 발생한다."
- "[특정 개념]의 특징은 [구체적 특징]이다."
- "[특정 사실]은 [특정 시기/조건]에 나타난다."

주의사항:
- 진술문은 지문에서 확인 가능한 명확한 사실이어야 함
- 추측이나 해석이 필요한 내용은 피할것
- 학생이 혼동할 수 있는 미묘한 차이는 지양`,
    description: 'OX문제 형식',
    isActive: true,
    isDefault: false,
    version: 1,
  },

  {
    promptId: 'comprehensive-type-data',
    category: 'comprehensive',
    subCategory: 'comprehensiveType',
    name: '자료분석하기',
    key: 'type_data',
    promptText: `자료분석하기: 지문에 제시된 자료(표, 그래프, 수치 등)를 분석하거나 해석하는 문제입니다. 자료에서 드러나는 경향, 특징, 비교 등을 올바르게 파악했는지 평가합니다.

생성 지침:
1. 지문에 포함된 구체적인 수치, 데이터, 비교 내용 활용
2. 데이터의 경향, 변화, 비교, 특징 등을 묻는 문제 구성
3. 정확한 수치 해석이나 논리적 분석력을 평가
4. 자료가 없는 경우, 지문의 비교/대조 내용을 분석 대상으로 활용

출력 형식:
{
  "type": "자료분석하기",
  "questionFormat": "객관식",
  "question": "지문의 자료(또는 내용)를 분석한 결과로 옳은 것은?",
  "options": [
    "정답: 지문의 자료를 정확히 분석한 내용",
    "오답1: 수치를 잘못 해석한 내용",
    "오답2: 경향을 반대로 분석한 내용",
    "오답3: 일부 데이터만 고려한 내용",
    "오답4: 지문에 없는 추론을 포함한 내용"
  ],
  "answer": "1",
  "explanation": "자료의 어느 부분을 근거로 해당 분석이 맞는지 구체적 수치와 함께 설명"
}

분석 유형 예시:
- 수치 비교: "A가 B보다 [구체적 수치]만큼 높다/낮다"
- 경향 분석: "[특정 기간] 동안 [지속적 증가/감소/변화없음] 경향을 보인다"
- 비율 분석: "전체에서 [특정 부분]이 [구체적 비율]을 차지한다"
- 변화 분석: "[이전 대비] [구체적 변화량/변화율]의 변화가 있다"

주의사항:
- 지문에 명시되지 않은 추론은 지양
- 구체적 수치나 사실 기반 분석 우선
- 정답은 지문의 자료에서 직접 확인 가능해야 함`,
    description: '자료분석하기 문제 형식',
    isActive: true,
    isDefault: false,
    version: 1,
  },

  // ============== 5. 과목 변수 프롬프트 ==============
  // 순서: 과학, 사회
  {
    promptId: 'subject-science',
    category: 'subject',
    subCategory: 'subjectScience',
    name: '과학',
    key: 'science',
    promptText: '과학: 자연 현상의 원리와 법칙을 탐구하는 과목입니다. 관찰, 실험, 추론을 통해 과학적 사고력을 기릅니다. 물리, 화학, 생물, 지구과학의 기초 개념을 학년 수준에 맞게 다룹니다.',
    description: '과학 과목 특성',
    isActive: true,
    isDefault: false,
    version: 1,
  },

  {
    promptId: 'subject-social',
    category: 'subject',
    subCategory: 'subjectSocial',
    name: '사회',
    key: 'social',
    promptText: '사회: 인간과 사회의 다양한 현상을 이해하는 과목입니다. 지리, 역사, 일반사회, 경제 등의 영역을 통해 민주시민으로서의 자질을 함양합니다.',
    description: '사회 과목 특성',
    isActive: true,
    isDefault: false,
    version: 1,
  },

  // ============== 6. 영역 변수 프롬프트 ==============
  // 순서: 지리, 일반사회, 정치, 경제, 화학, 물리, 생명, 지구과학
  {
    promptId: 'area-geography',
    category: 'area',
    subCategory: 'areaGeography',
    name: '지리',
    key: 'geography',
    promptText: '지리: 지형, 기후, 자연환경, 인문환경, 지도 읽기, 지역 간 교류 등 공간과 장소의 특성을 다룹니다. 초등 수준에서는 일상에서 접할 수 있는 자연·인문 환경을 소개하고, 위치나 방향 개념을 단순하게 전달합니다. 중학생 수준에서는 심화된 공간적 사고로 확장할 수 있습니다.',
    description: '지리 영역 특성',
    isActive: true,
    isDefault: false,
    version: 1,
  },

  {
    promptId: 'area-social',
    category: 'area',
    subCategory: 'areaSocial',
    name: '일반사회',
    key: 'social',
    promptText: '일반사회: 사회 규범, 규칙과 법, 공동체의 질서, 시민의 권리와 책임 등 사회를 구성하는 제도와 원리를 설명합니다. 초등학생에게는 생활 사례를 통해 제시하고, 중학생에게는 사회 참여와 제도적 구조를 단계적으로 소개합니다.',
    description: '일반사회 영역 특성',
    isActive: true,
    isDefault: false,
    version: 1,
  },

  {
    promptId: 'area-politics',
    category: 'area',
    subCategory: 'areaPolitics',
    name: '정치',
    key: 'politics',
    promptText: '정치: 민주주의, 정치 참여, 선거, 정부의 역할, 시민의 권리와 의무 등을 다룹니다. 초등 수준에서는 학급 회의나 규칙 만들기를 통해 민주적 의사결정을 경험하고, 중학생은 정치 제도와 민주주의 원리를 체계적으로 학습합니다.',
    description: '정치 영역 특성',
    isActive: true,
    isDefault: false,
    version: 1,
  },

  {
    promptId: 'area-economy',
    category: 'area',
    subCategory: 'areaEconomy',
    name: '경제',
    key: 'economy',
    promptText: '경제: 필요와 선택, 생산과 소비, 돈과 직업, 시장과 가격, 자원 배분, 경제 활동의 기본 원리를 다룹니다. 초등은 일상적 경제 활동을 중심으로, 중학생은 구조적이고 제도적인 요소를 다룹니다.',
    description: '경제 영역 특성',
    isActive: true,
    isDefault: false,
    version: 1,
  },

  {
    promptId: 'area-chemistry',
    category: 'area',
    subCategory: 'areaChemistry',
    name: '화학',
    key: 'chemistry',
    promptText: '화학: 물질의 상태(고체, 액체, 기체), 용해와 혼합, 변화(물리·화학), 연소, 산과 염기 등 물질의 성질과 변화를 다룹니다. 초등은 관찰 가능한 생활 속 현상 중심으로, 중학생은 심화된 개념을 실생활과 연계하여 설명합니다.',
    description: '화학 영역 특성',
    isActive: true,
    isDefault: false,
    version: 1,
  },

  {
    promptId: 'area-physics',
    category: 'area',
    subCategory: 'areaPhysics',
    name: '물리',
    key: 'physics',
    promptText: '물리: 힘과 운동, 속력, 마찰, 에너지 전환, 빛과 소리, 전기와 자기 등 자연 현상의 기본 원리를 설명합니다. 초등은 놀이와 생활 도구를 예시로 사용하고, 중학생은 정량적 또는 개념적 분석 중심으로 설명합니다.',
    description: '물리 영역 특성',
    isActive: true,
    isDefault: false,
    version: 1,
  },

  {
    promptId: 'area-biology',
    category: 'area',
    subCategory: 'areaBiology',
    name: '생명',
    key: 'biology',
    promptText: '생물: 식물과 동물의 구조와 기능, 생명의 특성, 성장과 번식, 감각기관, 생태계 구성과 상호작용을 설명합니다. 초등은 친숙한 생물체를 중심으로 관찰 기반으로 설명하고, 중학생은 정밀한 생명 현상을 구조적으로 다룹니다.',
    description: '생명 영역 특성',
    isActive: true,
    isDefault: false,
    version: 1,
  },

  {
    promptId: 'area-earth',
    category: 'area',
    subCategory: 'areaEarth',
    name: '지구과학',
    key: 'earth',
    promptText: '지구과학: 지구의 구조, 날씨와 계절 변화, 화산과 지진, 별과 행성, 지형의 생성, 기후와 환경 문제 등 우주와 지구 시스템을 설명합니다. 초등은 주변 자연 현상 중심으로, 중학생은 심화된 주제를 구조적으로 제시합니다.',
    description: '지구과학 영역 특성',
    isActive: true,
    isDefault: false,
    version: 1,
  },

  {
    promptId: 'area-science-inquiry',
    category: 'area',
    subCategory: 'areaScienceInquiry',
    name: '과학탐구',
    key: 'science_inquiry',
    promptText: '과학탐구: 과학적 사고력과 탐구 능력을 기르는 영역입니다. 관찰, 실험, 조사, 분석, 토론 등의 탐구 활동을 통해 과학적 지식을 구성하고 문제를 해결하는 과정을 다룹니다. 가설 설정, 변인 통제, 데이터 분석, 결론 도출 등의 과학적 방법을 학년 수준에 맞게 적용합니다.',
    description: '과학탐구 영역 특성',
    isActive: true,
    isDefault: false,
    version: 1,
  },

  // ============== 7. 구분(학습단계) 변수 프롬프트 ==============
  // 순서: 중학생(1~3학년), 초등학교 고학년(5~6학년), 초등학교 중학년(3~4학년)
  {
    promptId: 'division-middle',
    category: 'division',
    subCategory: 'divisionMiddle',
    name: '중학생(1~3학년)',
    key: 'middle',
    promptText: '중학생(1-3학년): 학습자는 개념 간의 연결과 간단한 논리 전개를 이해할 수 있으며, 비교·예측·과정 설명에 익숙해집니다. 문장은 다소 길어도 되며, 주제의 흐름을 따라가며 개념의 관계를 파악할 수 있도록 구조화해 주세요. 생소한 개념어는 풀이를 제공하되, 학술적 용어 사용도 일부 가능하며, 사고를 유도하는 질문을 도입부나 전개부에 포함해 주세요.',
    description: '중학생 학습 단계 특성',
    isActive: true,
    isDefault: false,
    version: 1,
  },

  {
    promptId: 'division-elem-high',
    category: 'division',
    subCategory: 'divisionElemHigh',
    name: '초등학교 고학년(5~6학년)',
    key: 'elem_high',
    promptText: '초등학교 고학년(5-6학년): 학습자는 다소 긴 문장과 낯선 단어를 접할 수 있으며, 인과관계나 비교 같은 구조를 이해하기 시작합니다. 설명은 실생활 예시에서 출발해 원리나 개념으로 자연스럽게 확장되도록 구성하고, 낱말 풀이도 포함합니다. 경험을 바탕으로 "어떤 일이 일어날까?", "무엇이 원인일까?" 같은 탐구형 문장도 포함해 주세요.',
    description: '초등학교 고학년 학습 단계 특성',
    isActive: true,
    isDefault: false,
    version: 1,
  },

  {
    promptId: 'division-elem-mid',
    category: 'division',
    subCategory: 'divisionElemMid',
    name: '초등학교 중학년(3~4학년)',
    key: 'elem_mid',
    promptText: '초등학교 중학년(3-4학년): 학습자는 짧은 문장 구조와 익숙한 단어를 중심으로 이해할 수 있습니다. 설명은 구체적인 사례와 생활 속 경험에 기반해야 하며, 새로운 개념어에는 간단한 풀이가 필요합니다. 추상적인 개념은 "왜 그럴까?", "무엇이 다를까?"와 같은 질문으로 흥미를 유도하고, 그림을 그리듯 서술해 주세요.',
    description: '초등학교 중학년 학습 단계 특성',
    isActive: true,
    isDefault: false,
    version: 1,
  },
];

// 프롬프트 카테고리별 그룹화 함수
export function groupPromptsByCategory(prompts: SystemPrompt[]): Map<PromptCategory, SystemPrompt[]> {
  const grouped = new Map<PromptCategory, SystemPrompt[]>();
  
  prompts.forEach(prompt => {
    if (!grouped.has(prompt.category)) {
      grouped.set(prompt.category, []);
    }
    grouped.get(prompt.category)!.push(prompt);
  });
  
  return grouped;
}

// 프롬프트 검색 함수
export function findPrompt(
  prompts: SystemPrompt[],
  category: PromptCategory,
  subCategory: PromptSubCategory,
  key?: string
): SystemPrompt | undefined {
  return prompts.find(p => 
    p.category === category && 
    p.subCategory === subCategory && 
    (key ? p.key === key : true)
  );
}

// 활성화된 프롬프트만 필터링
export function getActivePrompts(prompts: SystemPrompt[]): SystemPrompt[] {
  return prompts.filter(p => p.isActive);
}

// 카테고리 이름 매핑
export const CATEGORY_NAMES: Record<PromptCategory, string> = {
  passage: '지문 생성',
  vocabulary: '어휘 문제 생성',
  paragraph: '문단 문제 생성',
  comprehensive: '종합 문제 생성',
  subject: '과목',
  area: '영역',
  division: '구분(학습단계)',
};

// 서브카테고리 이름 매핑
export const SUBCATEGORY_NAMES: Record<PromptSubCategory, string> = {
  // 지문 생성
  system: '전체 시스템 프롬프트',
  length: '지문 길이별 프롬프트',
  textType: '유형별 프롬프트',
  // 어휘 문제 생성
  vocabularySystem: '전체 시스템 프롬프트',
  vocabularyType: '문제 유형별 프롬프트 (사용 안함)',
  // 문단 문제 생성
  paragraphSystem: '전체 시스템 프롬프트',
  paragraphType: '문제 유형별 프롬프트',
  // 종합 문제 생성
  comprehensiveSystem: '전체 시스템 프롬프트',
  comprehensiveType: '문제 유형별 프롬프트',
  // 과목
  subjectScience: '과학',
  subjectSocial: '사회',
  // 영역
  areaGeography: '지리',
  areaSocial: '일반사회',
  areaPolitics: '정치',
  areaEconomy: '경제',
  areaChemistry: '화학',
  areaPhysics: '물리',
  areaBiology: '생명',
  areaEarth: '지구과학',
  // 구분
  divisionMiddle: '중학생(1~3학년)',
  divisionElemHigh: '초등학교 고학년(5~6학년)',
  divisionElemMid: '초등학교 중학년(3~4학년)',
};