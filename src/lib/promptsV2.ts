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

  // 유형별 프롬프트 (순서: 논설문, 탐구문, 사례지문, 인터뷰형지문, 비교/대조형지문, 실험/조사보고문)
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
    promptId: 'passage-type-inquiry',
    category: 'passage',
    subCategory: 'textType',
    name: '탐구문',
    key: 'type_inquiry',
    promptText: '탐구문: 궁금한 점이나 문제를 해결하기 위해 탐구하는 과정을 담은 글입니다. 문제 발견-가설 설정-탐구 과정-결과 도출의 구조로 구성하며, 과학적 사고와 탐구 방법을 보여줍니다. 호기심을 자극하는 질문으로 시작하세요.',
    description: '탐구문 형식의 지문 작성 가이드',
    isActive: true,
    isDefault: false,
    version: 1,
  },

  {
    promptId: 'passage-type-case',
    category: 'passage',
    subCategory: 'textType',
    name: '사례지문',
    key: 'type_case',
    promptText: '사례지문: 구체적인 사례나 실제 상황을 통해 개념을 설명하는 글입니다. 사례 제시-분석-개념 도출-적용의 구조로 구성하며, 실생활과 밀접한 예시를 활용합니다. 사례를 통해 자연스럽게 학습 개념을 이해하도록 돕습니다.',
    description: '사례지문 형식의 지문 작성 가이드',
    isActive: true,
    isDefault: false,
    version: 1,
  },

  {
    promptId: 'passage-type-interview',
    category: 'passage',
    subCategory: 'textType',
    name: '인터뷰형지문',
    key: 'type_interview',
    promptText: '인터뷰형지문: 전문가나 관련자와의 대화를 통해 정보를 전달하는 글입니다. 인터뷰어의 질문과 인터뷰이의 답변으로 구성하며, 전문 지식을 대화 형식으로 쉽게 풀어냅니다. 실제 인터뷰처럼 자연스러운 대화체를 사용하세요.',
    description: '인터뷰형지문 형식의 지문 작성 가이드',
    isActive: true,
    isDefault: false,
    version: 1,
  },

  {
    promptId: 'passage-type-compare',
    category: 'passage',
    subCategory: 'textType',
    name: '비교/대조형지문',
    key: 'type_compare',
    promptText: '비교/대조형지문: 두 개 이상의 대상을 비교하거나 대조하여 설명하는 글입니다. 공통점과 차이점을 체계적으로 분석하며, 비교 기준을 명확히 제시합니다. 표나 도식을 글로 풀어서 설명하는 형태로 구성하세요.',
    description: '비교/대조형지문 형식의 지문 작성 가이드',
    isActive: true,
    isDefault: false,
    version: 1,
  },

  {
    promptId: 'passage-type-experiment',
    category: 'passage',
    subCategory: 'textType',
    name: '실험/조사보고문',
    key: 'type_experiment',
    promptText: '실험/조사보고문: 실험이나 조사 과정과 결과를 체계적으로 기록한 글입니다. 목적-방법-과정-결과-결론의 구조로 구성하며, 객관적이고 정확한 기술을 중시합니다. 데이터와 관찰 내용을 학년 수준에 맞게 설명하세요.',
    description: '실험/조사보고문 형식의 지문 작성 가이드',
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

  {
    promptId: 'vocabulary-type-multiple',
    category: 'vocabulary',
    subCategory: 'vocabularyType',
    name: '객관식',
    key: 'type_multiple',
    promptText: `다음 JSON 형식으로 어휘 문제를 생성하세요:
{
  "vocabularyQuestions": [
    {
      "term": "용어명",
      "question": "다음 중 [용어명]의 의미로 가장 적절한 것은?",
      "options": [
        "1. 첫 번째 선택지",
        "2. 두 번째 선택지",
        "3. 세 번째 선택지",
        "4. 네 번째 선택지",
        "5. 다섯 번째 선택지"
      ],
      "answer": "3",
      "explanation": "정답 설명과 개념 해설"
    }
  ]
}`,
    description: '어휘 문제 객관식 출력 형식',
    isActive: true,
    isDefault: true,
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
다음 지문의 문단에 대한 {questionType} 문제를 생성해주세요.
{questionIndexNote}

**지문 제목**: {title}
**대상 학년**: {division}
**문단 내용**: {paragraphText}
**문제 번호**: {questionIndex}번째 {questionType} 문제

###문제 유형별 요구사항
{specificPrompt}

###출력 형식 (반드시 JSON 형식으로)
{
  "question": "문제 내용",
  "options": ["선택지1", "선택지2", "선택지3", "선택지4", "선택지5"],
  "answer": "1",
  "explanation": "정답 해설"
}

###주의사항
- {division}에 맞는 어휘와 난이도 사용
- 명확하고 구체적인 문제 출제
- 정답과 오답이 명확히 구분되도록 작성
- 해설은 학생이 이해하기 쉽게 작성
- 반드시 JSON 형식으로만 응답

### 문제 유형별 상세 가이드라인

**어절 순서 맞추기**:
- 문단에서 의미 있는 문장을 선택하여 어절들을 원형 번호로 제시
- 어절들을 올바른 순서로 배열했을 때의 번호 순서를 선택하는 문제
- 어절 배열과 문장 구성 능력을 평가

**빈칸 채우기**:
- 문단에서 핵심 어휘나 중요한 단어를 빈칸으로 처리
- 문맥에 맞는 적절한 단어를 선택하도록 하는 문제
- 어휘의 의미와 문맥 적절성을 평가

**유의어 고르기**:
- 문단에서 특정 단어를 제시하고, 유사한 의미의 단어를 찾는 문제
- 제시된 단어와 비슷한 의미를 가진 선택지 제공
- 어휘 확장 및 의미군 이해를 평가

**반의어 고르기**:
- 문단에서 특정 단어를 제시하고, 반대 의미의 단어를 찾는 문제
- 제시된 단어와 반대 의미를 가진 선택지 제공
- 어휘 관계 이해를 평가

**문단 요약**:
- 문단의 핵심 내용을 가장 잘 요약한 문장을 선택하는 문제
- 문단의 주요 정보와 핵심 메시지를 파악하는 능력 평가
- 독해력과 요약 능력을 평가`,
    description: '문단 문제 생성의 기본 시스템 프롬프트',
    isActive: true,
    isDefault: true,
    version: 1,
  },

  // 문제 유형별 프롬프트 (순서: 어절 순서 맞추기, 빈칸 채우기, 유의어 고르기, 반의어 고르기, 문단 요약)
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
  "question": "다음 어절들을 올바른 순서로 배열하여 문장을 완성하세요.",
  "shuffledWords": ["어절1", "어절2", "어절3", ...],
  "options": [
    "1. 첫 번째 배열 순서",
    "2. 두 번째 배열 순서",
    "3. 세 번째 배열 순서",
    "4. 네 번째 배열 순서"
  ],
  "answer": "정답 번호",
  "explanation": "올바른 순서와 그 이유 설명"
}`,
    description: '어절 순서 맞추기 문제 형식',
    isActive: true,
    isDefault: false,
    version: 1,
  },

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
    "1. 첫 번째 선택지",
    "2. 두 번째 선택지",
    "3. 세 번째 선택지",
    "4. 네 번째 선택지"
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
    promptId: 'paragraph-type-synonym',
    category: 'paragraph',
    subCategory: 'paragraphType',
    name: '유의어 고르기',
    key: 'type_synonym',
    promptText: `유의어 고르기: 문단에 나온 특정 단어와 비슷한 의미를 가진 단어를 고르는 문제입니다. 문맥상 치환 가능한 유의어를 찾도록 합니다.

출력 형식:
{
  "type": "유의어 고르기",
  "question": "밑줄 친 '[단어]'와 의미가 가장 비슷한 것은?\\n\\n[해당 단어가 포함된 문장]",
  "options": [
    "1. 첫 번째 선택지",
    "2. 두 번째 선택지",
    "3. 세 번째 선택지",
    "4. 네 번째 선택지"
  ],
  "answer": "정답 번호",
  "explanation": "유의어 관계 설명"
}`,
    description: '유의어 고르기 문제 형식',
    isActive: true,
    isDefault: false,
    version: 1,
  },

  {
    promptId: 'paragraph-type-antonym',
    category: 'paragraph',
    subCategory: 'paragraphType',
    name: '반의어 고르기',
    key: 'type_antonym',
    promptText: `반의어 고르기: 문단에 나온 특정 단어와 반대되는 의미를 가진 단어를 고르는 문제입니다. 문맥을 고려하여 적절한 반의어를 찾도록 합니다.

출력 형식:
{
  "type": "반의어 고르기",
  "question": "밑줄 친 '[단어]'와 반대되는 의미를 가진 것은?\\n\\n[해당 단어가 포함된 문장]",
  "options": [
    "1. 첫 번째 선택지",
    "2. 두 번째 선택지",
    "3. 세 번째 선택지",
    "4. 네 번째 선택지"
  ],
  "answer": "정답 번호",
  "explanation": "반의어 관계 설명"
}`,
    description: '반의어 고르기 문제 형식',
    isActive: true,
    isDefault: false,
    version: 1,
  },

  {
    promptId: 'paragraph-type-summary',
    category: 'paragraph',
    subCategory: 'paragraphType',
    name: '문단 요약',
    key: 'type_summary',
    promptText: `문단 요약: 문단의 핵심 내용을 한 문장으로 요약한 것을 고르는 문제입니다. 중심 내용을 정확히 파악하고 있는지 확인합니다.

출력 형식:
{
  "type": "문단 요약",
  "question": "이 문단의 내용을 가장 잘 요약한 것은?",
  "options": [
    "1. 첫 번째 요약문",
    "2. 두 번째 요약문",
    "3. 세 번째 요약문",
    "4. 네 번째 요약문"
  ],
  "answer": "정답 번호",
  "explanation": "핵심 내용과 요약의 적절성 설명"
}`,
    description: '문단 요약 문제 형식',
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

###출력형식(JSON)
{outputPrompt}

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

출력 형식:
{
  "type": "단답형",
  "question": "구체적인 질문 내용",
  "answer": "정답",
  "explanation": "정답의 근거와 지문에서의 위치 설명"
}`,
    description: '단답형 문제 형식',
    isActive: true,
    isDefault: false,
    version: 1,
  },

  {
    promptId: 'comprehensive-type-sequence',
    category: 'comprehensive',
    subCategory: 'comprehensiveType',
    name: '문단별 순서 맞추기',
    key: 'type_sequence',
    promptText: `문단별 순서 맞추기: 지문의 내용 전개 순서를 파악하는 문제입니다. 사건의 순서, 과정의 단계, 논리적 흐름 등을 묻습니다.

출력 형식:
{
  "type": "문단별 순서 맞추기",
  "question": "다음 내용을 시간/논리적 순서대로 배열한 것은?",
  "items": ["항목1", "항목2", "항목3", "항목4"],
  "options": [
    "1. ① → ② → ③ → ④",
    "2. ② → ① → ④ → ③",
    "3. ③ → ① → ② → ④",
    "4. ① → ③ → ② → ④"
  ],
  "answer": "정답 번호",
  "explanation": "올바른 순서와 그 근거 설명"
}`,
    description: '문단별 순서 맞추기 문제 형식',
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

출력 형식:
{
  "type": "핵심 내용 요약",
  "question": "이 글의 핵심 내용으로 가장 적절한 것은?",
  "options": [
    "1. 첫 번째 요약문",
    "2. 두 번째 요약문",
    "3. 세 번째 요약문",
    "4. 네 번째 요약문"
  ],
  "answer": "정답 번호",
  "explanation": "핵심 내용 파악의 근거 설명"
}`,
    description: '핵심 내용 요약 문제 형식',
    isActive: true,
    isDefault: false,
    version: 1,
  },

  {
    promptId: 'comprehensive-type-keyword',
    category: 'comprehensive',
    subCategory: 'comprehensiveType',
    name: '핵심어/핵심문장 찾기',
    key: 'type_keyword',
    promptText: `핵심어/핵심문장 찾기: 지문에서 가장 중요한 개념이나 문장을 찾는 문제입니다. 글의 주제나 핵심 메시지를 담고 있는 부분을 파악합니다.

출력 형식:
{
  "type": "핵심어/핵심문장 찾기",
  "question": "이 글의 핵심어/핵심문장으로 가장 적절한 것은?",
  "options": [
    "1. 첫 번째 선택지",
    "2. 두 번째 선택지",
    "3. 세 번째 선택지",
    "4. 네 번째 선택지"
  ],
  "answer": "정답 번호",
  "explanation": "핵심어/핵심문장 선정 이유 설명"
}`,
    description: '핵심어/핵심문장 찾기 문제 형식',
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
  vocabularyType: '문제 유형별 프롬프트',
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