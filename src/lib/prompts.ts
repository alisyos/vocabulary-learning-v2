import { DivisionType, GradeType, SubjectType, AreaType, PassageLengthType, QuestionType, TextType } from '@/types';

// 구분별 프롬프트 (기존 학년)
const divisionPrompts = {
  '초등학교 중학년(3-4학년)': `초등학교 중학년(3-4학년): 학습자는 짧은 문장 구조와 익숙한 단어를 중심으로 이해할 수 있습니다. 설명은 구체적인 사례와 생활 속 경험에 기반해야 하며, 새로운 개념어에는 간단한 풀이가 필요합니다. 추상적인 개념은 '왜 그럴까?', '무엇이 다를까?'와 같은 질문으로 흥미를 유도하고, 그림을 그리듯 서술해 주세요.`,
  
  '초등학교 고학년(5-6학년)': `초등학교 고학년(5-6학년): 학습자는 다소 긴 문장과 낯선 단어를 접할 수 있으며, 인과관계나 비교 같은 구조를 이해하기 시작합니다. 설명은 실생활 예시에서 출발해 원리나 개념으로 자연스럽게 확장되도록 구성하고, 낱말 풀이도 포함합니다. 경험을 바탕으로 '어떤 일이 일어날까?', '무엇이 원인일까?' 같은 탐구형 문장도 포함해 주세요.`,
  
  '중학생(1-3학년)': `중학생(1-3학년): 학습자는 개념 간의 연결과 간단한 논리 전개를 이해할 수 있으며, 비교·예측·과정 설명에 익숙해집니다. 문장은 다소 길어도 되며, 주제의 흐름을 따라가며 개념의 관계를 파악할 수 있도록 구조화해 주세요. 생소한 개념어는 풀이를 제공하되, 학술적 용어 사용도 일부 가능하며, 사고를 유도하는 질문을 도입부나 전개부에 포함해 주세요.`
};

// 영역별 프롬프트
const areaPrompts = {
  '일반사회': `일반사회: 사회 규범, 규칙과 법, 공동체의 질서, 시민의 권리와 책임 등 사회를 구성하는 제도와 원리를 설명합니다. 초등학생에게는 생활 사례를 통해 제시해 주세요. 중학생에게는 사회 참여와 제도적 구조를 단계적으로 소개할 수 있습니다. 지문 구성 시 제도의 의미와 작동 방식을 생활 속 예시로 연결해 주세요.`,
  
  '지리': `지리: 지형, 기후, 자연환경, 인문환경, 지도 읽기, 지역 간 교류 등 공간과 장소의 특성을 다룹니다. 초등 수준에서는 일상에서 접할 수 있는 자연·인문 환경을 소개하고, 위치나 방향 개념을 단순하게 전달합니다. 중학생 수준에서는 심화된 공간적 사고로 확장할 수 있습니다. 실생활 기반 질문으로 지리적 사고력을 유도하세요.`,
  
  '역사': `역사: 과거 사회의 모습, 주요 인물과 사건, 시대 구분, 변화와 지속성, 문화유산 등을 시간의 흐름 속에서 설명합니다. 초등은 친숙하고 스토리 기반의 접근이 효과적입니다. 중학생은 구조적 설명이 가능합니다. 지문 구성 시 시대적 맥락을 인물이나 사건 중심으로 스토리텔링하세요.`,
  
  '경제': `경제: 필요와 선택, 생산과 소비, 돈과 직업, 시장과 가격, 자원 배분, 경제 활동의 기본 원리를 다룹니다. 초등은 일상적 경제 활동을 중심으로, 상황을 제공합니다. 중학생은 구조적이고 제도적인 요소를 다룹니다. 실생활 사례를 통해 경제적 사고와 의사결정 과정을 경험하도록 지문을 구성해 주세요.`,
  
  '물리': `물리: 힘과 운동, 속력, 마찰, 에너지 전환, 빛과 소리, 전기와 자기 등 자연 현상의 기본 원리를 설명합니다. 초등은 놀이와 생활 도구를 예시로 사용하여 개념을 쉽게 설명합니다. 중학생은 정량적 또는 개념적 분석 중심으로 설명할 수 있습니다. 지문은 탐구 동기를 유도하는 질문으로 시작하세요.`,
  
  '화학': `화학: 물질의 상태(고체, 액체, 기체), 용해와 혼합, 변화(물리·화학), 연소, 산과 염기 등 물질의 성질과 변화를 다룹니다. 초등은 관찰 가능한 생활 속 현상 중심으로 개념을 도입해야 하며, 실험적 탐색을 서술로 표현해 주세요. 중학생은 심화된 개념을 간단한 실생활 반응과 연계하여 설명할 수 있습니다. 지문은 질문형으로 시작하세요.`,
  
  '생물': `생물: 식물과 동물의 구조와 기능, 생명의 특성, 성장과 번식, 감각기관, 생태계 구성과 상호작용을 설명합니다. 초등은 친숙한 생물체를 중심으로 생김새, 먹이, 자라는 과정 등을 관찰 기반으로 설명해야 합니다. 중학생은 정밀한 생명 현상을 구조적으로 다룰 수 있습니다. 호기심 기반으로 시작하여 생물학적 개념을 끌어내세요.`,
  
  '지구과학': `지구과학: 지구의 구조, 날씨와 계절 변화, 화산과 지진, 별과 행성, 지형의 생성, 기후와 환경 문제 등 우주와 지구 시스템을 설명합니다. 초등은 주변 자연 현상 중심으로 구성해야 합니다. 중학생은 심화된 주제를 이해 가능한 수준으로 구조적으로 제시합니다. 지문은 계절·천체 관련 질문으로 시작하세요.`
};

// 지문 길이별 프롬프트
const lengthPrompts = {
  '1-2문장으로 구성한 10개 단락': `1-2문장으로 구성한 10개 단락: 각 단락은 한 가지 핵심 내용만을 다루며, 1-2문장으로 간결하게 표현합니다. 총 10개 단락으로 구성하여 전체 내용을 단계적으로 전개하세요. 각 단락 간의 연결성을 유지하면서도 독립적인 내용으로 이해할 수 있도록 작성하세요.`,
  
  '1-2문장으로 구성한 12개 단락': `1-2문장으로 구성한 12개 단락: 각 단락은 한 가지 핵심 내용만을 다루며, 1-2문장으로 간결하게 표현합니다. 총 12개 단락으로 구성하여 전체 내용을 세밀하게 단계적으로 전개하세요. 중학생 수준에 맞는 논리적 연결과 깊이 있는 내용 구성을 하세요.`,
  
  '10문장 이하로 구성한 5개 단락': `10문장 이하로 구성한 5개 단락: 각 단락은 5-10문장으로 구성하여 하나의 주제를 충분히 설명합니다. 총 5개 단락으로 전체 내용을 체계적으로 조직하세요. 중학생 수준의 사고력과 이해력을 고려하여 복합적인 개념도 포함할 수 있습니다.`,
  
  '4-5문장으로 구성한 5-6개 단락': `4-5문장으로 구성한 5-6개 단락: 각 단락은 4-5문장으로 구성하여 하나의 소주제를 완성도 있게 설명합니다. 총 5-6개 단락으로 전체 내용을 균형 있게 전개하세요. 초등 중학년 수준에 맞는 친근하고 이해하기 쉬운 구성을 유지하세요.`,
  
  '5-6문장으로 구성한 6개 단락': `5-6문장으로 구성한 6개 단락: 각 단락은 5-6문장으로 구성하여 주제를 보다 상세히 설명합니다. 총 6개 단락으로 전체 내용을 체계적이고 충실하게 전개하세요. 초등 고학년 수준의 사고력을 고려하여 인과관계나 비교 등의 논리적 구조도 포함하세요.`
};

// 출력 형식 프롬프트
const outputFormats = {
  '4-5문장으로 구성한 5-6개 단락': `{
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
        "용어3: 간단하고 명확한 설명 (예시: 용어3을 사용한 자연스러운 예시문장)",
        "용어4: 간단하고 명확한 설명 (예시: 용어4를 사용한 자연스러운 예시문장)",
        "용어5: 간단하고 명확한 설명 (예시: 용어5를 사용한 자연스러운 예시문장)",
        "용어6: 간단하고 명확한 설명 (예시: 용어6을 사용한 자연스러운 예시문장)",
        "용어7: 간단하고 명확한 설명 (예시: 용어7을 사용한 자연스러운 예시문장)",
        "용어8: 간단하고 명확한 설명 (예시: 용어8을 사용한 자연스러운 예시문장)",
        "용어9: 간단하고 명확한 설명 (예시: 용어9를 사용한 자연스러운 예시문장)",
        "용어10: 간단하고 명확한 설명 (예시: 용어10을 사용한 자연스러운 예시문장)",
        "용어11: 간단하고 명확한 설명 (예시: 용어11을 사용한 자연스러운 예시문장)",
        "용어12: 간단하고 명확한 설명 (예시: 용어12를 사용한 자연스러운 예시문장)",
        "용어13: 간단하고 명확한 설명 (예시: 용어13을 사용한 자연스러운 예시문장)",
        "용어14: 간단하고 명확한 설명 (예시: 용어14를 사용한 자연스러운 예시문장)",
        "용어15: 간단하고 명확한 설명 (예시: 용어15를 사용한 자연스러운 예시문장)",
        "용어16: 간단하고 명확한 설명 (예시: 용어16을 사용한 자연스러운 예시문장)",
        "용어17: 간단하고 명확한 설명 (예시: 용어17을 사용한 자연스러운 예시문장)",
        "용어18: 간단하고 명확한 설명 (예시: 용어18을 사용한 자연스러운 예시문장)",
        "용어19: 간단하고 명확한 설명 (예시: 용어19를 사용한 자연스러운 예시문장)",
        "용어20: 간단하고 명확한 설명 (예시: 용어20을 사용한 자연스러운 예시문장)",
        "추가용어21: 간단하고 명확한 설명 (예시: 추가용어21을 사용한 자연스러운 예시문장)",
        "추가용어22: 간단하고 명확한 설명 (예시: 추가용어22를 사용한 자연스러운 예시문장)",
        "추가용어23: 간단하고 명확한 설명 (예시: 추가용어23을 사용한 자연스러운 예시문장)",
        "추가용어24: 간단하고 명확한 설명 (예시: 추가용어24를 사용한 자연스러운 예시문장)",
        "추가용어25: 간단하고 명확한 설명 (예시: 추가용어25를 사용한 자연스러운 예시문장)"
      ]
    }
  ]
}`,
  
  '5-6문장으로 구성한 6개 단락': `{
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
        "용어3: 간단하고 명확한 설명 (예시: 용어3을 사용한 자연스러운 예시문장)",
        "용어4: 간단하고 명확한 설명 (예시: 용어4를 사용한 자연스러운 예시문장)",
        "용어5: 간단하고 명확한 설명 (예시: 용어5를 사용한 자연스러운 예시문장)",
        "용어6: 간단하고 명확한 설명 (예시: 용어6을 사용한 자연스러운 예시문장)",
        "용어7: 간단하고 명확한 설명 (예시: 용어7을 사용한 자연스러운 예시문장)",
        "용어8: 간단하고 명확한 설명 (예시: 용어8을 사용한 자연스러운 예시문장)",
        "용어9: 간단하고 명확한 설명 (예시: 용어9를 사용한 자연스러운 예시문장)",
        "용어10: 간단하고 명확한 설명 (예시: 용어10을 사용한 자연스러운 예시문장)",
        "용어11: 간단하고 명확한 설명 (예시: 용어11을 사용한 자연스러운 예시문장)",
        "용어12: 간단하고 명확한 설명 (예시: 용어12를 사용한 자연스러운 예시문장)",
        "용어13: 간단하고 명확한 설명 (예시: 용어13을 사용한 자연스러운 예시문장)",
        "용어14: 간단하고 명확한 설명 (예시: 용어14를 사용한 자연스러운 예시문장)",
        "용어15: 간단하고 명확한 설명 (예시: 용어15를 사용한 자연스러운 예시문장)",
        "용어16: 간단하고 명확한 설명 (예시: 용어16을 사용한 자연스러운 예시문장)",
        "용어17: 간단하고 명확한 설명 (예시: 용어17을 사용한 자연스러운 예시문장)",
        "용어18: 간단하고 명확한 설명 (예시: 용어18을 사용한 자연스러운 예시문장)",
        "용어19: 간단하고 명확한 설명 (예시: 용어19를 사용한 자연스러운 예시문장)",
        "용어20: 간단하고 명확한 설명 (예시: 용어20을 사용한 자연스러운 예시문장)",
        "추가용어21: 간단하고 명확한 설명 (예시: 추가용어21을 사용한 자연스러운 예시문장)",
        "추가용어22: 간단하고 명확한 설명 (예시: 추가용어22를 사용한 자연스러운 예시문장)",
        "추가용어23: 간단하고 명확한 설명 (예시: 추가용어23을 사용한 자연스러운 예시문장)",
        "추가용어24: 간단하고 명확한 설명 (예시: 추가용어24를 사용한 자연스러운 예시문장)",
        "추가용어25: 간단하고 명확한 설명 (예시: 추가용어25을 사용한 자연스러운 예시문장)"
      ]
    }
  ]
}`,
  
  '1-2문장으로 구성한 10개 단락': `{
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
        "용어3: 간단하고 명확한 설명 (예시: 용어3을 사용한 자연스러운 예시문장)",
        "용어4: 간단하고 명확한 설명 (예시: 용어4를 사용한 자연스러운 예시문장)",
        "용어5: 간단하고 명확한 설명 (예시: 용어5를 사용한 자연스러운 예시문장)",
        "용어6: 간단하고 명확한 설명 (예시: 용어6을 사용한 자연스러운 예시문장)",
        "용어7: 간단하고 명확한 설명 (예시: 용어7을 사용한 자연스러운 예시문장)",
        "용어8: 간단하고 명확한 설명 (예시: 용어8을 사용한 자연스러운 예시문장)",
        "용어9: 간단하고 명확한 설명 (예시: 용어9를 사용한 자연스러운 예시문장)",
        "용어10: 간단하고 명확한 설명 (예시: 용어10을 사용한 자연스러운 예시문장)",
        "용어11: 간단하고 명확한 설명 (예시: 용어11을 사용한 자연스러운 예시문장)",
        "용어12: 간단하고 명확한 설명 (예시: 용어12를 사용한 자연스러운 예시문장)",
        "용어13: 간단하고 명확한 설명 (예시: 용어13을 사용한 자연스러운 예시문장)",
        "용어14: 간단하고 명확한 설명 (예시: 용어14를 사용한 자연스러운 예시문장)",
        "용어15: 간단하고 명확한 설명 (예시: 용어15를 사용한 자연스러운 예시문장)",
        "용어16: 간단하고 명확한 설명 (예시: 용어16을 사용한 자연스러운 예시문장)",
        "용어17: 간단하고 명확한 설명 (예시: 용어17을 사용한 자연스러운 예시문장)",
        "용어18: 간단하고 명확한 설명 (예시: 용어18을 사용한 자연스러운 예시문장)",
        "용어19: 간단하고 명확한 설명 (예시: 용어19를 사용한 자연스러운 예시문장)",
        "용어20: 간단하고 명확한 설명 (예시: 용어20을 사용한 자연스러운 예시문장)",
        "추가용어21: 간단하고 명확한 설명 (예시: 추가용어21을 사용한 자연스러운 예시문장)",
        "추가용어22: 간단하고 명확한 설명 (예시: 추가용어22를 사용한 자연스러운 예시문장)",
        "추가용어23: 간단하고 명확한 설명 (예시: 추가용어23을 사용한 자연스러운 예시문장)",
        "추가용어24: 간단하고 명확한 설명 (예시: 추가용어24를 사용한 자연스러운 예시문장)",
        "추가용어25: 간단하고 명확한 설명 (예시: 추가용어25을 사용한 자연스러운 예시문장)"
      ]
    }
  ]
}`,
  
  '10문장 이하로 구성한 5개 단락': `{
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
        "용어3: 간단하고 명확한 설명 (예시: 용어3을 사용한 자연스러운 예시문장)",
        "용어4: 간단하고 명확한 설명 (예시: 용어4를 사용한 자연스러운 예시문장)",
        "용어5: 간단하고 명확한 설명 (예시: 용어5를 사용한 자연스러운 예시문장)",
        "용어6: 간단하고 명확한 설명 (예시: 용어6을 사용한 자연스러운 예시문장)",
        "용어7: 간단하고 명확한 설명 (예시: 용어7을 사용한 자연스러운 예시문장)",
        "용어8: 간단하고 명확한 설명 (예시: 용어8을 사용한 자연스러운 예시문장)",
        "용어9: 간단하고 명확한 설명 (예시: 용어9를 사용한 자연스러운 예시문장)",
        "용어10: 간단하고 명확한 설명 (예시: 용어10을 사용한 자연스러운 예시문장)",
        "용어11: 간단하고 명확한 설명 (예시: 용어11을 사용한 자연스러운 예시문장)",
        "용어12: 간단하고 명확한 설명 (예시: 용어12를 사용한 자연스러운 예시문장)",
        "용어13: 간단하고 명확한 설명 (예시: 용어13을 사용한 자연스러운 예시문장)",
        "용어14: 간단하고 명확한 설명 (예시: 용어14를 사용한 자연스러운 예시문장)",
        "용어15: 간단하고 명확한 설명 (예시: 용어15를 사용한 자연스러운 예시문장)",
        "용어16: 간단하고 명확한 설명 (예시: 용어16을 사용한 자연스러운 예시문장)",
        "용어17: 간단하고 명확한 설명 (예시: 용어17을 사용한 자연스러운 예시문장)",
        "용어18: 간단하고 명확한 설명 (예시: 용어18을 사용한 자연스러운 예시문장)",
        "용어19: 간단하고 명확한 설명 (예시: 용어19를 사용한 자연스러운 예시문장)",
        "용어20: 간단하고 명확한 설명 (예시: 용어20을 사용한 자연스러운 예시문장)",
        "추가용어21: 간단하고 명확한 설명 (예시: 추가용어21을 사용한 자연스러운 예시문장)",
        "추가용어22: 간단하고 명확한 설명 (예시: 추가용어22를 사용한 자연스러운 예시문장)",
        "추가용어23: 간단하고 명확한 설명 (예시: 추가용어23을 사용한 자연스러운 예시문장)",
        "추가용어24: 간단하고 명확한 설명 (예시: 추가용어24를 사용한 자연스러운 예시문장)",
        "추가용어25: 간단하고 명확한 설명 (예시: 추가용어25을 사용한 자연스러운 예시문장)"
      ]
    }
  ]
}`,
  
  '1-2문장으로 구성한 12개 단락': `{
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
        "용어3: 간단하고 명확한 설명 (예시: 용어3을 사용한 자연스러운 예시문장)",
        "용어4: 간단하고 명확한 설명 (예시: 용어4를 사용한 자연스러운 예시문장)",
        "용어5: 간단하고 명확한 설명 (예시: 용어5를 사용한 자연스러운 예시문장)",
        "용어6: 간단하고 명확한 설명 (예시: 용어6을 사용한 자연스러운 예시문장)",
        "용어7: 간단하고 명확한 설명 (예시: 용어7을 사용한 자연스러운 예시문장)",
        "용어8: 간단하고 명확한 설명 (예시: 용어8을 사용한 자연스러운 예시문장)",
        "용어9: 간단하고 명확한 설명 (예시: 용어9를 사용한 자연스러운 예시문장)",
        "용어10: 간단하고 명확한 설명 (예시: 용어10을 사용한 자연스러운 예시문장)",
        "용어11: 간단하고 명확한 설명 (예시: 용어11을 사용한 자연스러운 예시문장)",
        "용어12: 간단하고 명확한 설명 (예시: 용어12를 사용한 자연스러운 예시문장)",
        "용어13: 간단하고 명확한 설명 (예시: 용어13을 사용한 자연스러운 예시문장)",
        "용어14: 간단하고 명확한 설명 (예시: 용어14를 사용한 자연스러운 예시문장)",
        "용어15: 간단하고 명확한 설명 (예시: 용어15를 사용한 자연스러운 예시문장)",
        "용어16: 간단하고 명확한 설명 (예시: 용어16을 사용한 자연스러운 예시문장)",
        "용어17: 간단하고 명확한 설명 (예시: 용어17을 사용한 자연스러운 예시문장)",
        "용어18: 간단하고 명확한 설명 (예시: 용어18을 사용한 자연스러운 예시문장)",
        "용어19: 간단하고 명확한 설명 (예시: 용어19를 사용한 자연스러운 예시문장)",
        "용어20: 간단하고 명확한 설명 (예시: 용어20을 사용한 자연스러운 예시문장)",
        "추가용어21: 간단하고 명확한 설명 (예시: 추가용어21을 사용한 자연스러운 예시문장)",
        "추가용어22: 간단하고 명확한 설명 (예시: 추가용어22를 사용한 자연스러운 예시문장)",
        "추가용어23: 간단하고 명확한 설명 (예시: 추가용어23을 사용한 자연스러운 예시문장)",
        "추가용어24: 간단하고 명확한 설명 (예시: 추가용어24를 사용한 자연스러운 예시문장)",
        "추가용어25: 간단하고 명확한 설명 (예시: 추가용어25을 사용한 자연스러운 예시문장)"
      ]
    }
  ]
}`
};

// 지문 유형별 프롬프트
const textTypePrompts = {
  '설명문': `설명문: 특정 대상, 현상, 개념을 명확하고 체계적으로 설명하는 글입니다. 객관적 사실에 기반하여 정보를 전달하며, 정의-특성-예시-결론의 구조로 구성합니다. 학년에 맞는 어휘로 개념을 쉽게 풀어서 설명하세요.`,
  
  '논설문': `논설문: 특정 주제에 대한 의견이나 주장을 논리적으로 전개하는 글입니다. 문제 제기-근거 제시-반박-결론의 구조를 가지며, 설득력 있는 근거와 사례를 활용합니다. 학년 수준에 맞는 논리적 사고를 유도하세요.`,
  
  '탐구문': `탐구문: 궁금한 점이나 문제를 해결하기 위해 탐구하는 과정을 담은 글입니다. 문제 발견-가설 설정-탐구 과정-결과 도출의 구조로 구성하며, 과학적 사고와 탐구 방법을 보여줍니다. 호기심을 자극하는 질문으로 시작하세요.`,
  
  '뉴스 기사': `뉴스 기사: 최근 일어난 사건이나 이슈를 객관적으로 보도하는 글입니다. 5W1H(누가, 언제, 어디서, 무엇을, 왜, 어떻게)를 포함하여 사실을 정확하고 간결하게 전달합니다. 헤드라인 형태의 제목을 사용하세요.`,
  
  '인터뷰': `인터뷰: 전문가나 관련자와의 대화를 통해 정보를 얻는 글입니다. 질문과 답변의 형식으로 구성하며, 인터뷰 대상자의 경험과 견해를 생생하게 전달합니다. 대화체를 활용하여 현장감을 살리세요.`,
  
  '동화': `동화: 교훈이나 메시지를 재미있는 이야기로 전달하는 글입니다. 등장인물과 사건을 통해 학습 내용을 자연스럽게 녹여내며, 상상력을 자극하는 요소를 포함합니다. "옛날 옛적에" 같은 동화적 표현을 사용하세요.`,
  
  '시': `시: 함축적이고 운율이 있는 언어로 감정과 사상을 표현하는 글입니다. 은유, 의인법 등의 표현 기법을 사용하여 학습 내용을 시적으로 형상화합니다. 운율과 리듬감을 고려하여 작성하세요.`,
  
  '대본': `대본: 연극이나 드라마의 형식으로 구성된 글입니다. 등장인물의 대화와 행동 지시문으로 이루어지며, 학습 내용을 극적 상황으로 표현합니다. 무대 지시문과 대사를 명확히 구분하여 작성하세요.`,
  
  '소설': `소설: 허구의 이야기를 통해 인물, 사건, 배경을 생생하게 그려내는 글입니다. 플롯과 갈등을 통해 학습 내용을 흥미롭게 전달하며, 서사적 구조를 갖춥니다. 묘사와 서술을 적절히 활용하세요.`,
  
  '사례지문': `사례지문: 실제 사례나 구체적인 상황을 제시하여 학습 내용을 설명하는 글입니다. 구체적인 상황-문제 분석-해결 과정-교훈 도출의 구조로 구성하며, 실생활과의 연관성을 강조합니다. 생생한 사례를 통해 개념을 쉽게 이해할 수 있도록 하세요.`,
  
  '인터뷰형지문': `인터뷰형지문: 전문가나 관련자와의 질의응답 형식으로 구성된 글입니다. 질문자와 응답자의 대화를 통해 정보를 전달하며, 자연스러운 대화 흐름 속에서 학습 내용을 제시합니다. 구어체를 활용하여 친근하고 이해하기 쉽게 작성하세요.`,
  
  '비교/대조형지문': `비교/대조형지문: 두 개 이상의 대상을 비교하거나 대조하여 특성을 명확히 드러내는 글입니다. 공통점과 차이점을 체계적으로 분석하며, 표나 구분된 단락을 활용하여 비교 내용을 명확히 제시합니다. 비교 기준을 명확히 하여 작성하세요.`,
  
  '실험/조사보고문': `실험/조사보고문: 실험이나 조사를 통해 얻은 결과를 체계적으로 정리한 글입니다. 목적-방법-결과-결론의 구조로 구성하며, 객관적 데이터와 관찰 결과를 바탕으로 작성합니다. 과정과 결과를 명확하고 정확하게 기술하세요.`
};

// 지문 생성 프롬프트 생성
export function generatePassagePrompt(
  division: DivisionType,
  length: PassageLengthType,
  subject: SubjectType,
  grade: GradeType,
  area: AreaType,
  maintopic: string,
  subtopic: string,
  keyword: string,
  textType?: TextType
): string {
  let prompt = `###지시사항
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
${divisionPrompts[division]}

###지문 길이
${length}

###과목
${subject}

###학년
${grade}

###영역
${areaPrompts[area]}

###대주제
${maintopic}
위 대주제를 중심으로 ${area} 영역의 학습 내용과 연결하여 지문을 구성하세요.

###소주제
${subtopic}
이 소주제를 구체적으로 다루며, 대주제와의 연관성을 명확히 하여 지문을 작성하세요.

###핵심 개념어
${keyword}
이 핵심 개념어들을 지문에 자연스럽게 포함시키고, 학년 수준에 맞게 설명하세요. footnote에는 이 용어들을 포함하여 최소 20개 이상의 관련 용어 해설을 추가하세요.`;

  // 선택적 유형 추가
  if (textType && textType in textTypePrompts) {
    prompt += `

###글의 유형
${textTypePrompts[textType as keyof typeof textTypePrompts]}`;
  }

  prompt += `

###출력형식(JSON)
${outputFormats[length]}`;

  return prompt;
}

// 문제 생성 프롬프트 - 학년별
const questionGradePrompts = {
  '초등학교 중학년(3-4학년)': `초등학교 중학년(3-4학년): 간단한 단어와 짧은 문장 중심으로 문제를 구성합니다. 질문은 사실 확인이나 정의 이해에 초점을 맞추며, 보기/정답/해설은 직관적이고 명확해야 합니다. 어려운 용어나 개념어는 피하고, 지문에서 사용된 표현을 최대한 그대로 활용해 주세요.`,
  
  '초등학교 고학년(5-6학년)': `초등학교 고학년(5-6학년): 개념 간의 관계, 비교, 원인·결과 등 약간 복잡한 사고를 요구할 수 있습니다. 질문은 지문 내용을 바탕으로 추론하거나 판단할 수 있는 형식도 허용됩니다. 해설에는 핵심 개념 간의 연결 관계를 명확히 설명해 주세요.`,
  
  '중학생(1-3학년)': `중학생(1-3학년): 개념을 분석하거나 적용하는 사고력이 반영되어야 하며, 복합적 질문도 가능합니다. 질문은 단순 사실 확인을 넘어, 원리나 맥락 파악을 유도해야 하며, 정답 외 오답 보기도 관련 개념과 혼동될 수 있도록 정교하게 구성해 주세요.`
};

// 문제 유형별 프롬프트
const questionTypePrompts = {
  '객관식': `객관식: 질문에 대한 보기 5개를 생성합니다. 보기는 모두 지문과 관련되어야 하며, 오답도 그럴듯한 근거를 지녀야 합니다. 정답 번호를 명확히 표시하고, 해설은 왜 정답이 맞는지와 왜 다른 보기들이 틀렸는지를 포함합니다.`,
  
  '주관식': `주관식 단답형: 답이 단어 또는 짧은 문장으로 작성 가능한 문제를 생성합니다. 질문은 지문 내 주요 개념, 정의, 원인·결과 등을 묻는 형식이어야 하며, 정답과 해설은 구체적이고 학년 수준에 맞는 설명으로 구성해야 합니다.`
};

// 문제 출력 형식
const questionOutputFormats = {
  '객관식': `{
  "questionType": "객관식",
  "questions": [
    {
      "type": "일반",
      "question": "<질문>",
      "options": ["...", "...", "...", "...", "..."],
      "answer": "<정답 번호>",
      "explanation": "<해설>"
    },
    {
      "type": "보완",
      "question": "<질문>",
      "options": ["...", "...", "...", "...", "..."],
      "answer": "<정답 번호>",
      "explanation": "<해설>"
    },
    {
      "type": "보완",
      "question": "<질문>",
      "options": ["...", "...", "...", "...", "..."],
      "answer": "<정답 번호>",
      "explanation": "<해설>"
    }
  ]
}`,
  
  '주관식': `{
  "questionType": "주관식",
  "questions": [
    {
      "type": "일반",
      "question": "<질문>",
      "answer": "<정답 단어 또는 짧은 문장>",
      "explanation": "<해설>"
    },
    {
      "type": "보완",
      "question": "<질문>",
      "answer": "<정답 단어 또는 짧은 문장>",
      "explanation": "<해설>"
    },
    {
      "type": "보완",
      "question": "<질문>",
      "answer": "<정답 단어 또는 짧은 문장>",
      "explanation": "<해설>"
    }
  ]
}`
};

// 문제 생성 프롬프트 생성
export function generateQuestionPrompt(
  division: DivisionType,
  passage: string,
  questionType: QuestionType
): string {
  return `###지시사항
다음 입력값을 기반으로, 해당 지문 내용을 반영한 **문제 3개**를 생성하십시오.
- 일반 문제 1개와 보완 문제 2개를 생성합니다.
- 일반 문제는 학생이 처음 접하는 문제이며, 보완 문제는 오답 시 학습 강화를 위해 생성하는 구조입니다.
- 구분에 맞는 어휘 수준과 사고 수준을 반영해 난이도를 조절해야 합니다.
- 문제는 반드시 지문 내용 또는 개념을 기반으로 출제되어야 하며, 임의(random) 구성은 금지됩니다.

###지문
${passage}

###구분
${questionGradePrompts[division]}

###문제유형
${questionTypePrompts[questionType]}

###출력형식(JSON)
${questionOutputFormats[questionType]}`;
}

// 어휘 문제 생성 프롬프트 생성
export function generateVocabularyPrompt(
  termName: string,
  termDescription: string,
  passage: string,
  division: string
): string {
  return `###지시사항
주어진 용어에 대한 어휘 문제를 1개 생성하십시오.
- 용어의 의미, 사용법, 맥락을 정확히 이해했는지 평가하는 객관식 문제를 생성합니다.
- 5지선다 형태로 출제하며, 오답 보기도 그럴듯하게 구성해야 합니다.
- 지문의 맥락과 연결하여 문제를 구성하되, 용어 자체의 이해에 초점을 맞춥니다.

###대상 용어
**용어명**: ${termName}
**용어 설명**: ${termDescription || '지문에서 추출된 용어'}

###지문 맥락
${passage}

###구분 (난이도 조절)
${division}

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

3. **해설 작성**:
   - 정답인 이유를 명확히 설명
   - 주요 오답들이 왜 틀렸는지 간단히 설명
   - 용어의 핵심 개념을 강화하는 내용 포함`;
}

// 종합 문제 유형별 프롬프트
const comprehensiveQuestionPrompts = {
  '단답형': `단답형: 지문의 핵심 내용을 한 단어 또는 짧은 문장으로 답할 수 있는 주관식 문제를 생성합니다. 
- 명확하고 객관적인 정답이 있는 사실적 내용을 묻습니다.
- 답안은 1-3개 단어 또는 한 문장 이내로 답할 수 있어야 합니다.
- 지문에 직접적으로 언급된 내용이나 추론 가능한 내용을 묻습니다.`,

  '문단별 순서 맞추기': `문단별 순서 맞추기: 지문의 단락들을 섞어서 제시하고 올바른 순서를 찾는 객관식 문제를 생성합니다.
- 지문의 논리적 전개나 시간적 순서, 인과관계를 이해했는지 평가합니다.
- 3-4개의 단락을 무작위로 섞어서 제시하고 올바른 순서를 5지선다로 출제합니다.
- 각 단락의 핵심 내용을 요약하여 제시합니다.`,

  '핵심 내용 요약': `핵심 내용 요약: 지문의 주요 내용을 올바르게 요약한 것을 찾는 객관식 문제를 생성합니다.
- 지문의 전체적인 흐름과 핵심 메시지를 이해했는지 평가합니다.
- 주제, 주요 내용, 결론을 포함한 적절한 요약문을 정답으로 제시합니다.
- 오답은 부분적으로만 맞거나, 과장되거나, 핵심을 놓친 요약문으로 구성합니다.`,

  '핵심어/핵심문장 찾기': `핵심어/핵심문장 찾기: 지문에서 가장 중요한 단어나 문장을 찾는 객관식 문제를 생성합니다.
- 지문의 주제나 핵심 개념을 나타내는 중요한 어휘나 문장을 파악했는지 평가합니다.
- 지문에서 실제로 사용된 표현들을 선택지로 제시합니다.
- 정답은 지문의 주제나 결론과 직접적으로 연관된 핵심어/핵심문장이어야 합니다.`
};

// 종합 문제 출력 형식
const comprehensiveOutputFormats = {
  '단답형': `{
  "questions": [
    {
      "id": "comp_short_1",
      "type": "단답형",
      "question": "질문 내용",
      "answer": "정답",
      "explanation": "해설"
    },
    {
      "id": "comp_short_2", 
      "type": "단답형",
      "question": "질문 내용",
      "answer": "정답", 
      "explanation": "해설"
    },
    {
      "id": "comp_short_3",
      "type": "단답형", 
      "question": "질문 내용",
      "answer": "정답",
      "explanation": "해설"
    }
  ]
}`,

  '문단별 순서 맞추기': `{
  "questions": [
    {
      "id": "comp_order_1",
      "type": "문단별 순서 맞추기",
      "question": "다음 단락들을 올바른 순서로 배열한 것은?",
      "options": [
        "A-B-C-D",
        "B-A-D-C", 
        "C-A-B-D",
        "D-C-A-B",
        "A-C-B-D"
      ],
      "answer": "A-B-C-D",
      "explanation": "해설"
    },
    {
      "id": "comp_order_2",
      "type": "문단별 순서 맞추기", 
      "question": "질문 내용",
      "options": ["선택지1", "선택지2", "선택지3", "선택지4", "선택지5"],
      "answer": "정답",
      "explanation": "해설"
    },
    {
      "id": "comp_order_3",
      "type": "문단별 순서 맞추기",
      "question": "질문 내용", 
      "options": ["선택지1", "선택지2", "선택지3", "선택지4", "선택지5"],
      "answer": "정답",
      "explanation": "해설"
    }
  ]
}`,

  '핵심 내용 요약': `{
  "questions": [
    {
      "id": "comp_summary_1",
      "type": "핵심 내용 요약",
      "question": "다음 중 지문의 내용을 가장 잘 요약한 것은?",
      "options": [
        "올바른 요약문",
        "부분적으로만 맞는 요약문",
        "과장된 요약문", 
        "핵심을 놓친 요약문",
        "잘못된 요약문"
      ],
      "answer": "올바른 요약문",
      "explanation": "해설"
    },
    {
      "id": "comp_summary_2",
      "type": "핵심 내용 요약",
      "question": "질문 내용",
      "options": ["선택지1", "선택지2", "선택지3", "선택지4", "선택지5"],
      "answer": "정답",
      "explanation": "해설"
    },
    {
      "id": "comp_summary_3", 
      "type": "핵심 내용 요약",
      "question": "질문 내용",
      "options": ["선택지1", "선택지2", "선택지3", "선택지4", "선택지5"],
      "answer": "정답",
      "explanation": "해설"
    }
  ]
}`,

  '핵심어/핵심문장 찾기': `{
  "questions": [
    {
      "id": "comp_keyword_1",
      "type": "핵심어/핵심문장 찾기",
      "question": "다음 중 지문의 핵심을 가장 잘 나타내는 문장은?",
      "options": [
        "핵심 문장",
        "부차적 문장1",
        "부차적 문장2", 
        "세부사항 문장",
        "관련 없는 문장"
      ],
      "answer": "핵심 문장",
      "explanation": "해설"
    },
    {
      "id": "comp_keyword_2",
      "type": "핵심어/핵심문장 찾기", 
      "question": "질문 내용",
      "options": ["선택지1", "선택지2", "선택지3", "선택지4", "선택지5"],
      "answer": "정답",
      "explanation": "해설"
    },
    {
      "id": "comp_keyword_3",
      "type": "핵심어/핵심문장 찾기",
      "question": "질문 내용",
      "options": ["선택지1", "선택지2", "선택지3", "선택지4", "선택지5"], 
      "answer": "정답",
      "explanation": "해설"
    }
  ]
}`
};

// 종합 문제 생성 프롬프트 생성
export function generateComprehensivePrompt(
  questionType: string, // '단답형', '문단별 순서 맞추기', etc.
  passage: string,
  division: string
): string {
  return `###지시사항
주어진 지문을 바탕으로 **${questionType}** 유형의 문제 3개를 생성하십시오.
- 지문의 전체적인 이해와 핵심 내용 파악을 평가하는 문제를 생성합니다.
- 각 문제는 서로 다른 관점이나 내용을 다뤄야 합니다.
- 지문에 직접 언급된 내용이나 논리적으로 추론 가능한 내용만을 바탕으로 출제합니다.

###지문
${passage}

###구분 (난이도 조절)  
${division}

###문제 유형 가이드라인
${comprehensiveQuestionPrompts[questionType as keyof typeof comprehensiveQuestionPrompts]}

###출력형식(JSON)
${comprehensiveOutputFormats[questionType as keyof typeof comprehensiveOutputFormats]}

###주의사항
- 반드시 위의 JSON 형식을 정확히 준수하십시오.
- 각 문제는 서로 다른 내용이나 관점을 다뤄야 합니다.
- 정답과 해설은 지문에 명확히 근거해야 합니다.
- 객관식 문제의 오답 선택지도 그럴듯하게 구성하십시오.`;
}

// ============================================================================
// 프롬프트 관리 시스템을 위한 기본 데이터 추출 함수
// ============================================================================

export function getDefaultPrompts() {
  // promptsV2의 DEFAULT_PROMPTS_V2를 반환
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { DEFAULT_PROMPTS_V2 } = require('./promptsV2');
    return DEFAULT_PROMPTS_V2;
  } catch (error) {
    console.error('promptsV2 로드 실패:', error);
  }
  
  // 폴백: 기존 하드코딩된 프롬프트 생성
  const defaultPrompts = [];
  let promptCounter = 1; // 고유 ID 생성용 카운터

  // 0. 전체 지문생성 시스템 프롬프트
  const fullPassagePrompt = `###지시사항
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
{texttype_prompt}

###출력형식(JSON)
{output_format}

※ 위의 {변수명} 부분은 실제 사용 시 동적으로 치환됩니다.`;

  defaultPrompts.push({
    promptId: `prompt_${promptCounter++}`,
    category: 'passage' as const,
    subCategory: 'system' as const,
    name: '전체 지문생성 시스템 프롬프트',
    key: 'fullSystemPrompt',
    promptText: fullPassagePrompt,
    description: '지문 생성에 사용되는 완전한 시스템 프롬프트 템플릿'
  });

  // 0-1. 전체 어휘 문제 생성 시스템 프롬프트
  const fullVocabularyPrompt = `###지시사항
주어진 용어에 대한 어휘 문제를 1개 생성하십시오.
- 용어의 의미, 사용법, 맥락을 정확히 이해했는지 평가하는 객관식 문제를 생성합니다.
- 5지선다 형태로 출제하며, 오답 보기도 그럴듯하게 구성해야 합니다.
- 지문의 맥락과 연결하여 문제를 구성하되, 용어 자체의 이해에 초점을 맞춥니다.

###대상 용어
**용어명**: {term_name}
**용어 설명**: {term_description}

###지문 맥락
{passage}

###구분 (난이도 조절)
{division_prompt}

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

3. **해설 작성**:
   - 정답인 이유를 명확히 설명
   - 주요 오답들이 왜 틀렸는지 간단히 설명
   - 용어의 핵심 개념을 강화하는 내용 포함

※ 위의 {변수명} 부분은 실제 사용 시 동적으로 치환됩니다.`;

  defaultPrompts.push({
    promptId: `prompt_${promptCounter++}`,
    category: 'vocabulary' as const,
    subCategory: 'system' as const,
    name: '전체 어휘 문제 생성 시스템 프롬프트',
    key: 'fullSystemPrompt',
    promptText: fullVocabularyPrompt,
    description: '어휘 문제 생성에 사용되는 완전한 시스템 프롬프트 템플릿'
  });

  // 0-2. 전체 종합 문제 생성 시스템 프롬프트
  const fullComprehensivePrompt = `###지시사항
주어진 지문을 바탕으로 **{question_type}** 유형의 문제 3개를 생성하십시오.
- 지문의 전체적인 이해와 핵심 내용 파악을 평가하는 문제를 생성합니다.
- 각 문제는 서로 다른 관점이나 내용을 다뤄야 합니다.
- 지문에 직접 언급된 내용이나 논리적으로 추론 가능한 내용만을 바탕으로 출제합니다.

###지문
{passage}

###구분 (난이도 조절)  
{division_prompt}

###문제 유형 가이드라인
{question_type_prompt}

###출력형식(JSON)
{output_format}

###주의사항
- 반드시 위의 JSON 형식을 정확히 준수하십시오.
- 각 문제는 서로 다른 내용이나 관점을 다뤄야 합니다.
- 정답과 해설은 지문에 명확히 근거해야 합니다.
- 객관식 문제의 오답 선택지도 그럴듯하게 구성하십시오.

※ 위의 {변수명} 부분은 실제 사용 시 동적으로 치환됩니다.`;

  defaultPrompts.push({
    promptId: `prompt_${promptCounter++}`,
    category: 'comprehensive' as const,
    subCategory: 'system' as const,
    name: '전체 종합 문제 생성 시스템 프롬프트',
    key: 'fullSystemPrompt',
    promptText: fullComprehensivePrompt,
    description: '종합 문제 생성에 사용되는 완전한 시스템 프롬프트 템플릿'
  });

  // 1. 구분별 프롬프트 (Division) - 별도 카테고리로 분리
  Object.entries(divisionPrompts).forEach(([key, value]) => {
    defaultPrompts.push({
      promptId: `prompt_${promptCounter++}`,
      category: 'division' as const,
      subCategory: 'divisionLevel' as const,
      name: key,
      key: key,
      promptText: value,
      description: `${key}에 대한 학습 수준별 프롬프트`
    });
  });

  // 2. 영역별 프롬프트 (Area) - 별도 카테고리로 분리
  Object.entries(areaPrompts).forEach(([key, value]) => {
    defaultPrompts.push({
      promptId: `prompt_${promptCounter++}`,
      category: 'area' as const,
      subCategory: 'areaContent' as const,
      name: key,
      key: key,
      promptText: value,
      description: `${key} 영역에 대한 지문 생성 가이드라인`
    });
  });

  // 3. 지문 길이별 프롬프트 (Length Guidelines)
  Object.entries(lengthPrompts).forEach(([key, value]) => {
    defaultPrompts.push({
      promptId: `prompt_${promptCounter++}`,
      category: 'passage' as const,
      subCategory: 'lengthGuideline' as const,
      name: key,
      key: key,
      promptText: value,
      description: `${key} 구성의 지문 생성 가이드라인`
    });
  });

  // 4. 출력 형식별 프롬프트 (Output Format)
  Object.entries(outputFormats).forEach(([key, value]) => {
    defaultPrompts.push({
      promptId: `prompt_${promptCounter++}`,
      category: 'passage' as const,
      subCategory: 'outputFormat' as const,
      name: key,
      key: key,
      promptText: value,
      description: `${key} 형식의 지문 JSON 출력 구조`
    });
  });

  // 5. 지문 유형별 프롬프트 (Text Type)
  Object.entries(textTypePrompts).forEach(([key, value]) => {
    defaultPrompts.push({
      promptId: `prompt_${promptCounter++}`,
      category: 'passage' as const,
      subCategory: 'textType' as const,
      name: key,
      key: key,
      promptText: value,
      description: `${key} 유형의 지문 생성 가이드라인`
    });
  });

  // 5. 문제 생성 - 학년별 프롬프트 (Question Grade)
  Object.entries(questionGradePrompts).forEach(([key, value]) => {
    defaultPrompts.push({
      promptId: `prompt_${promptCounter++}`,
      category: 'vocabulary' as const,
      subCategory: 'questionGrade' as const,
      name: key,
      key: key,
      promptText: value,
      description: `${key}을 위한 문제 생성 가이드라인`
    });
  });

  // 6. 문제 유형별 프롬프트 (Question Type)
  Object.entries(questionTypePrompts).forEach(([key, value]) => {
    defaultPrompts.push({
      promptId: `prompt_${promptCounter++}`,
      category: 'vocabulary' as const,
      subCategory: 'questionType' as const,
      name: key,
      key: key,
      promptText: value,
      description: `${key} 문제 생성 가이드라인`
    });
  });

  // 7. 문제 출력 형식별 프롬프트 (Question Output Format)
  Object.entries(questionOutputFormats).forEach(([key, value]) => {
    defaultPrompts.push({
      promptId: `prompt_${promptCounter++}`,
      category: 'vocabulary' as const,
      subCategory: 'outputFormat' as const,
      name: key,
      key: key,
      promptText: value,
      description: `${key} 문제의 출력 형식`
    });
  });

  // 8. 종합 문제 유형별 프롬프트 (Comprehensive Question Type)
  Object.entries(comprehensiveQuestionPrompts).forEach(([key, value]) => {
    defaultPrompts.push({
      promptId: `prompt_${promptCounter++}`,
      category: 'comprehensive' as const,
      subCategory: 'comprehensiveType' as const,
      name: key,
      key: key,
      promptText: value,
      description: `${key} 유형의 종합 문제 생성 가이드라인`
    });
  });

  // 9. 종합 문제 출력 형식별 프롬프트 (Comprehensive Output Format)
  Object.entries(comprehensiveOutputFormats).forEach(([key, value]) => {
    defaultPrompts.push({
      promptId: `prompt_${promptCounter++}`,
      category: 'comprehensive' as const,
      subCategory: 'outputFormat' as const,
      name: key,
      key: key,
      promptText: value,
      description: `${key} 종합 문제의 출력 형식`
    });
  });

  // 10. 어휘 문제 기본 프롬프트
  const vocabularyBasePrompt = `###지시사항
주어진 용어에 대한 어휘 문제를 1개 생성하십시오.
- 용어의 의미, 사용법, 맥락을 정확히 이해했는지 평가하는 객관식 문제를 생성합니다.
- 5지선다 형태로 출제하며, 오답 보기도 그럴듯하게 구성해야 합니다.
- 지문의 맥락과 연결하여 문제를 구성하되, 용어 자체의 이해에 초점을 맞춥니다.`;

  defaultPrompts.push({
    promptId: `prompt_${promptCounter++}`,
    category: 'vocabulary' as const,
    subCategory: 'vocabularyBase' as const,
    name: '어휘 문제 기본 프롬프트',
    key: 'vocabularyBase',
    promptText: vocabularyBasePrompt,
    description: '어휘 문제 생성을 위한 기본 프롬프트'
  });

  return defaultPrompts;
}

// ============================================================================
// DB에서 프롬프트를 조회하는 새로운 함수들
// ============================================================================

// 메모리 캐시를 저장할 전역 변수
const promptCache = new Map<string, { text: string, timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5분

// Supabase에서 프롬프트를 조회하여 기존 방식으로 사용할 수 있도록 하는 함수
export async function getPromptFromDB(category: string, subCategory: string, key: string): Promise<string> {
  const cacheKey = `${category}/${subCategory}/${key}`;
  
  // 캐시 확인
  const cached = promptCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`캐시에서 프롬프트 사용: ${cacheKey}`);
    return cached.text;
  }
  
  try {
    const { db } = await import('./supabase');
    const prompt = await db.getPromptByKey(category, subCategory, key);
    
    if (prompt && prompt.promptText) {
      // 캐시에 저장
      promptCache.set(cacheKey, { text: prompt.promptText, timestamp: Date.now() });
      return prompt.promptText;
    }
    
    // Supabase에서 찾지 못하면 기본값 사용
    console.warn(`프롬프트를 Supabase에서 찾지 못함: ${category}/${subCategory}/${key}, 기본값 사용`);
    const defaultText = getDefaultPromptByKey(category, subCategory, key);
    // 기본값도 캐시에 저장
    promptCache.set(cacheKey, { text: defaultText, timestamp: Date.now() });
    return defaultText;
  } catch (error) {
    console.error('Supabase 프롬프트 조회 실패, 기본값 사용:', error);
    const defaultText = getDefaultPromptByKey(category, subCategory, key);
    // 기본값도 캐시에 저장
    promptCache.set(cacheKey, { text: defaultText, timestamp: Date.now() });
    return defaultText;
  }
}

// 캐시 업데이트 함수 (프롬프트 수정 시 사용)
export function updatePromptCache(category: string, subCategory: string, key: string, text: string) {
  const cacheKey = `${category}/${subCategory}/${key}`;
  promptCache.set(cacheKey, { text, timestamp: Date.now() });
}

// 기본값에서 프롬프트를 찾는 헬퍼 함수
function getDefaultPromptByKey(category: string, subCategory: string, key: string): string {
  // 기존 하드코딩된 객체들에서 찾기
  switch (subCategory) {
    case 'system':
      // 전체 시스템 프롬프트들을 반환
      if (category === 'passage' && key === 'fullSystemPrompt') {
        return getDefaultPrompts().find(p => p.promptId === 'passage_system_full')?.promptText || '';
      } else if (category === 'vocabulary' && key === 'fullSystemPrompt') {
        return getDefaultPrompts().find(p => p.promptId === 'vocabulary_system_full')?.promptText || '';
      } else if (category === 'comprehensive' && key === 'fullSystemPrompt') {
        return getDefaultPrompts().find(p => p.promptId === 'comprehensive_system_full')?.promptText || '';
      }
      return '';
    case 'division':
    case 'divisionLevel':
      return divisionPrompts[key as keyof typeof divisionPrompts] || '';
    case 'area':
    case 'areaContent':
      return areaPrompts[key as keyof typeof areaPrompts] || '';
    case 'length':
    case 'outputFormat':
      return outputFormats[key as keyof typeof outputFormats] || '';
    case 'lengthGuideline':
      return lengthPrompts[key as keyof typeof lengthPrompts] || '';
    case 'textType':
      return textTypePrompts[key as keyof typeof textTypePrompts] || '';
    case 'questionGrade':
      return questionGradePrompts[key as keyof typeof questionGradePrompts] || '';
    case 'questionType':
      return questionTypePrompts[key as keyof typeof questionTypePrompts] || '';
    case 'outputFormat':
      if (category === 'vocabulary') {
        return questionOutputFormats[key as keyof typeof questionOutputFormats] || '';
      } else if (category === 'comprehensive') {
        return comprehensiveOutputFormats[key as keyof typeof comprehensiveOutputFormats] || '';
      }
      return '';
    case 'comprehensiveType':
      return comprehensiveQuestionPrompts[key as keyof typeof comprehensiveQuestionPrompts] || '';
    case 'subjectContent':
      // promptsV2에서 과목 프롬프트 찾기
      if (key === '과학' || key === 'science') {
        return getDefaultPrompts().find(p => p.promptId === 'subject-science')?.promptText || '과학';
      } else if (key === '사회' || key === 'social') {
        return getDefaultPrompts().find(p => p.promptId === 'subject-social')?.promptText || '사회';
      }
      return key;
    default:
      // promptsV2에서 직접 찾아보기
      const prompt = getDefaultPrompts().find(p => 
        p.category === category && 
        p.subCategory === subCategory && 
        p.key === key
      );
      return prompt?.promptText || '';
  }
}

// 새로운 동적 프롬프트 생성 함수들 (DB 조회 사용)
export async function generatePassagePromptFromDB(
  division: DivisionType,
  length: PassageLengthType,
  subject: SubjectType,
  grade: GradeType,
  area: AreaType,
  maintopic: string,
  subtopic: string,
  keyword: string,
  textType?: TextType
): Promise<string> {
  try {
    // DB에서 각 프롬프트 조회
    const divisionPrompt = await getPromptFromDB('division', 'divisionLevel', division);
    const lengthGuidelinePrompt = await getPromptFromDB('passage', 'lengthGuideline', length);
    const outputFormatPrompt = await getPromptFromDB('passage', 'outputFormat', length);
    const areaPrompt = await getPromptFromDB('area', 'areaContent', area);
    const subjectPrompt = await getPromptFromDB('subject', 'subjectContent', subject);
    
    let prompt = `###지시사항
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
${divisionPrompt}

###지문 길이
${lengthGuidelinePrompt || length}

###과목
${subjectPrompt || subject}

###학년
${grade}

###영역
${areaPrompt}

###대주제
${maintopic}
위 대주제를 중심으로 ${area} 영역의 학습 내용과 연결하여 지문을 구성하세요.

###소주제
${subtopic}
이 소주제를 구체적으로 다루며, 대주제와의 연관성을 명확히 하여 지문을 작성하세요.

###핵심 개념어
${keyword}
이 핵심 개념어들을 지문에 자연스럽게 포함시키고, 학년 수준에 맞게 설명하세요. footnote에는 이 용어들을 포함하여 최소 20개 이상의 관련 용어 해설을 추가하세요.`;

    // 선택적 유형 추가
    if (textType) {
      const textTypePrompt = await getPromptFromDB('passage', 'textType', textType);
      if (textTypePrompt) {
        prompt += `

###글의 유형
${textTypePrompt}`;
      }
    }

    prompt += `

###출력형식(JSON)
${outputFormatPrompt || outputFormats[length]}`;

    return prompt;
  } catch (error) {
    console.error('DB 프롬프트 생성 실패, 기본 함수 사용:', error);
    // 실패 시 기존 함수 사용
    return generatePassagePrompt(division, length, subject, grade, area, maintopic, subtopic, keyword, textType);
  }
}

export async function generateQuestionPromptFromDB(
  division: DivisionType,
  passage: string,
  questionType: QuestionType
): Promise<string> {
  try {
    const divisionPrompt = await getPromptFromDB('vocabulary', 'questionGrade', division);
    const questionTypePrompt = await getPromptFromDB('vocabulary', 'questionType', questionType);
    const outputFormatPrompt = await getPromptFromDB('vocabulary', 'outputFormat', questionType);

    return `###지시사항
다음 입력값을 기반으로, 해당 지문 내용을 반영한 **문제 3개**를 생성하십시오.
- 일반 문제 1개와 보완 문제 2개를 생성합니다.
- 일반 문제는 학생이 처음 접하는 문제이며, 보완 문제는 오답 시 학습 강화를 위해 생성하는 구조입니다.
- 구분에 맞는 어휘 수준과 사고 수준을 반영해 난이도를 조절해야 합니다.
- 문제는 반드시 지문 내용 또는 개념을 기반으로 출제되어야 하며, 임의(random) 구성은 금지됩니다.

###지문
${passage}

###구분
${divisionPrompt}

###문제유형
${questionTypePrompt}

###출력형식(JSON)
${outputFormatPrompt}`;
  } catch (error) {
    console.error('DB 문제 프롬프트 생성 실패, 기본 함수 사용:', error);
    return generateQuestionPrompt(division, passage, questionType);
  }
}

export async function generateVocabularyPromptFromDB(
  termName: string,
  termDescription: string,
  passage: string,
  division: string
): Promise<string> {
  try {
    const basePrompt = await getPromptFromDB('vocabulary', 'vocabularyBase', 'vocabularyBase');
    const divisionPrompt = await getPromptFromDB('vocabulary', 'questionGrade', division);

    return `${basePrompt}

###대상 용어
**용어명**: ${termName}
**용어 설명**: ${termDescription || '지문에서 추출된 용어'}

###지문 맥락
${passage}

###구분 (난이도 조절)
${divisionPrompt}

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

3. **해설 작성**:
   - 정답인 이유를 명확히 설명
   - 주요 오답들이 왜 틀렸는지 간단히 설명
   - 용어의 핵심 개념을 강화하는 내용 포함`;
  } catch (error) {
    console.error('DB 어휘 프롬프트 생성 실패, 기본 함수 사용:', error);
    return generateVocabularyPrompt(termName, termDescription, passage, division);
  }
}

export async function generateComprehensivePromptFromDB(
  questionType: string,
  passage: string,
  division: string
): Promise<string> {
  try {
    const typePrompt = await getPromptFromDB('comprehensive', 'comprehensiveType', questionType);
    const outputPrompt = await getPromptFromDB('comprehensive', 'outputFormat', questionType);
    const divisionPrompt = await getPromptFromDB('vocabulary', 'questionGrade', division);

    return `###지시사항
주어진 지문을 바탕으로 **${questionType}** 유형의 문제 3개를 생성하십시오.
- 지문의 전체적인 이해와 핵심 내용 파악을 평가하는 문제를 생성합니다.
- 각 문제는 서로 다른 관점이나 내용을 다뤄야 합니다.
- 지문에 직접 언급된 내용이나 논리적으로 추론 가능한 내용만을 바탕으로 출제합니다.

###지문
${passage}

###구분 (난이도 조절)  
${divisionPrompt}

###문제 유형 가이드라인
${typePrompt}

###출력형식(JSON)
${outputPrompt}

###주의사항
- 반드시 위의 JSON 형식을 정확히 준수하십시오.
- 각 문제는 서로 다른 내용이나 관점을 다뤄야 합니다.
- 정답과 해설은 지문에 명확히 근거해야 합니다.
- 객관식 문제의 오답 선택지도 그럴듯하게 구성하십시오.`;
  } catch (error) {
    console.error('DB 종합 프롬프트 생성 실패, 기본 함수 사용:', error);
    return generateComprehensivePrompt(questionType, passage, division);
  }
}