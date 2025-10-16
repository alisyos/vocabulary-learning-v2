// HTML v2 생성 유틸리티 함수
// 상세보기 페이지의 handleHtmlDownloadV2와 동일한 로직

// 타입 정의
export interface VocabularyTerm {
  term: string;
  definition: string;
  example_sentence?: string;
  has_question_generated?: boolean;
  passage_id?: string;
  passage_number?: number;
  passage_title?: string;
}

export interface Question {
  question: string;
  options?: string[];
  correctAnswer?: string;
  correct_answer?: string;
  answer?: string;
  explanation: string;
  questionType?: string;
  question_type?: string;
  type?: string;
  isSupplementary?: boolean;
  is_supplementary?: boolean;
  difficulty?: string;
  detailed_question_type?: string;
  detailedQuestionType?: string;
  term?: string;
  answer_initials?: string;
  answerInitials?: string;
  question_number?: number;
  questionNumber?: number;
  paragraph_number?: number;
  paragraphNumber?: number;
  wordSegments?: string[];
  word_segments?: string[];
  question_format?: string;
  option_1?: string;
  option_2?: string;
  option_3?: string;
  option_4?: string;
  option_5?: string;
}

export interface Passage {
  id?: string;
  title: string;
  paragraphs: string[];
  passage_number?: number;
}

export interface ContentSet {
  id?: string;
  setId?: string;
  title?: string;
  passageTitle?: string;
  session_number?: string | null;
  subject?: string;
  grade?: string;
  area?: string;
  mainTopic?: string;
  maintopic?: string;
  main_topic?: string;
  subTopic?: string;
  subtopic?: string;
  sub_topic?: string;
  division?: string;
  curriculum?: string;
  passageLength?: string;
  passage_length?: string;
  textType?: string;
  text_type?: string;
}

export interface GenerateHtmlV2Params {
  contentSet: ContentSet;
  passages: Passage[];
  passage: Passage | null;
  vocabularyTerms: VocabularyTerm[];
  vocabularyQuestions: Question[];
  paragraphQuestions: Question[];
  comprehensiveQuestions: Question[];
  introductionQuestion: string;
  visualMaterials: any[];
}

// 헬퍼 함수들
const getParagraphQuestionTypeLabel = (type: string): string => {
  const typeMap: { [key: string]: string } = {
    '빈칸 채우기': '빈칸 채우기',
    '주관식 단답형': '주관식',
    '어절 순서 맞추기': '문장 완성하기',
    'OX문제': 'OX퀴즈',
    '객관식 일반형': '객관식'
  };
  return typeMap[type] || type;
};

const getVocabularyQuestionTypeLabel = (type: string, detailedType?: string): string => {
  if (detailedType) return detailedType;
  const typeMap: { [key: string]: string} = {
    '객관식': '5지선다 객관식',
    '주관식': '주관식 단답형'
  };
  return typeMap[type] || type;
};

const getComprehensiveQuestionTypeLabel = (type: string): string => {
  const typeMap: { [key: string]: string } = {
    '정보 확인': '정보 확인',
    '주제 파악': '주제 파악',
    '자료해석': '자료해석',
    '추론': '추론',
    '단답형': '단답형',
    '핵심 내용 요약': '핵심 내용 요약',
    '핵심문장 찾기': '핵심문장 찾기',
    'OX문제': 'OX문제',
    '자료분석하기': '자료분석하기'
  };
  return typeMap[type] || type;
};

// 메인 HTML 생성 함수
export function generateHtmlV2(params: GenerateHtmlV2Params): string {
  const {
    contentSet,
    passages: editablePassages,
    passage: editablePassage,
    vocabularyTerms: vocabularyTermsData,
    vocabularyQuestions: editableVocabQuestions,
    paragraphQuestions: editableParagraphQuestions,
    comprehensiveQuestions: editableComprehensive,
    introductionQuestion: editableIntroductionQuestion,
    visualMaterials
  } = params;

  // 어휘 배열 생성
  const editableVocabulary = vocabularyTermsData.map(v => v.term + ': ' + v.definition);

  // 종합문제를 세트별로 그룹화
  const questionSets: { [key: string]: Question[] } = {};
  const typeGroups: { [key: string]: Question[] } = {};

  editableComprehensive.forEach(question => {
    const questionType = question.questionType || question.question_type || question.type || '기타';
    if (!typeGroups[questionType]) {
      typeGroups[questionType] = [];
    }
    typeGroups[questionType].push(question);
  });

  // 각 유형별 그룹을 기본문제 우선으로 정렬하고 세트 생성
  let setIndex = 0;
  Object.entries(typeGroups).forEach(([type, questions]) => {
    const mainQuestions = questions.filter(q => !q.isSupplementary && !q.is_supplementary);
    const supplementaryQuestions = questions.filter(q => q.isSupplementary || q.is_supplementary);

    mainQuestions.forEach((mainQuestion, mainIndex) => {
      setIndex++;
      const setKey = `set_${setIndex}_${type}`;
      questionSets[setKey] = [mainQuestion];

      const relatedSupplementaryQuestions = supplementaryQuestions.slice(
        mainIndex * 2,
        (mainIndex + 1) * 2
      );

      questionSets[setKey].push(...relatedSupplementaryQuestions);
    });
  });

  // 어휘 문제를 어휘별로 그룹화
  const vocabularyQuestionsByTerm: { [key: string]: Question[] } = {};
  editableVocabQuestions.forEach(q => {
    const term = q.term || '기타';
    if (!vocabularyQuestionsByTerm[term]) {
      vocabularyQuestionsByTerm[term] = [];
    }
    vocabularyQuestionsByTerm[term].push(q);
  });

  // 각 어휘별로 난이도순 정렬
  Object.keys(vocabularyQuestionsByTerm).forEach(term => {
    vocabularyQuestionsByTerm[term].sort((a, b) => {
      const aDifficulty = a.difficulty || a.question_type || '일반';
      const bDifficulty = b.difficulty || b.question_type || '일반';

      if (aDifficulty === '보완' && bDifficulty !== '보완') return 1;
      if (aDifficulty !== '보완' && bDifficulty === '보완') return -1;

      return 0;
    });
  });

  // 각 문단별 지문 문제 그룹화
  const paragraphQuestionsByParagraph: { [key: number]: Question[] } = {};
  editableParagraphQuestions.forEach(q => {
    const paragraphNumber = q.paragraphNumber || q.paragraph_number || 1;
    if (!paragraphQuestionsByParagraph[paragraphNumber]) {
      paragraphQuestionsByParagraph[paragraphNumber] = [];
    }
    paragraphQuestionsByParagraph[paragraphNumber].push(q);
  });

  // 통계 계산
  const totalParagraphQuestions = editableParagraphQuestions.length;
  const coreVocabularyCount = vocabularyTermsData.filter(term => term.has_question_generated === true).length;
  const difficultVocabularyCount = vocabularyTermsData.filter(term => term.has_question_generated !== true).length;
  const totalVocabularyCount = vocabularyTermsData.length;

  // 지문문제 유형별 분포 계산
  const paragraphTypeStats = editableParagraphQuestions.reduce((acc, question) => {
    const originalType = question.questionType || question.question_type || question.type || '기타';
    const type = getParagraphQuestionTypeLabel(originalType);
    if (!acc[type]) {
      acc[type] = 0;
    }
    acc[type]++;
    return acc;
  }, {} as Record<string, number>);

  // 종합문제 유형별 분포 계산
  const comprehensiveTypeStats = editableComprehensive.reduce((acc, question) => {
    const type = question.question_type || question.type || '기타';
    if (!acc[type]) {
      acc[type] = { main: 0, supplementary: 0 };
    }
    if (question.is_supplementary || question.isSupplementary) {
      acc[type].supplementary++;
    } else {
      acc[type].main++;
    }
    return acc;
  }, {} as Record<string, { main: number; supplementary: number }>);

  // 어휘 문제 유형별 분포 계산
  const vocabularyTypeStats = editableVocabQuestions.reduce((acc, question) => {
    const type = question.detailed_question_type || question.detailedQuestionType ||
                 question.question_type || question.questionType || '5지선다 객관식';
    if (!acc[type]) {
      acc[type] = 0;
    }
    acc[type]++;
    return acc;
  }, {} as Record<string, number>);

  // 기본 문제 세트 수 계산
  const totalMainSets = Object.keys(questionSets).length;

  // HTML 템플릿 (원본 handleHtmlDownloadV2의 htmlContent와 동일)
  const htmlContent = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${contentSet.passageTitle || contentSet.title || '제목 없음'} - 학습 콘텐츠</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji';
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
      padding: 20px;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      background-color: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 30px;
      border-bottom: 2px solid #eee;
    }

    .header h1 {
      font-size: 2.5em;
      color: #2c3e50;
      margin-bottom: 15px;
    }

    .header .set-id {
      color: #7f8c8d;
      font-size: 0.9em;
      margin-top: 10px;
    }

    .info-grid {
      margin-bottom: 40px;
    }

    .info-row {
      display: flex;
      gap: 20px;
      margin-bottom: 20px;
    }

    .info-row .info-card {
      flex: 1;
      min-width: 0;
    }

    .info-row:last-child {
      margin-bottom: 0;
    }

    .info-card {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      border: 1px solid #e9ecef;
      font-size: 0.85em;
    }

    .info-card h3 {
      color: #495057;
      font-size: 1.05em;
      margin-bottom: 10px;
      border-bottom: 2px solid #dee2e6;
      padding-bottom: 8px;
    }

    .info-card p {
      margin: 5px 0;
      color: #6c757d;
    }

    .info-card strong {
      color: #495057;
    }

    /* 탭 스타일 */
    .tabs {
      display: flex;
      border-bottom: 2px solid #dee2e6;
      margin-bottom: 30px;
    }

    .tab {
      padding: 12px 24px;
      cursor: pointer;
      background: none;
      border: none;
      font-size: 1.1em;
      color: #6c757d;
      transition: all 0.3s ease;
      position: relative;
    }

    .tab:hover {
      color: #495057;
    }

    .tab.active {
      color: #2c3e50;
      font-weight: bold;
    }

    .tab.active::after {
      content: '';
      position: absolute;
      bottom: -2px;
      left: 0;
      right: 0;
      height: 2px;
      background-color: #3498db;
    }

    .tab-content {
      display: none;
    }

    .tab-content.active {
      display: block;
    }

    /* 지문 스타일 */
    .passage-section {
      margin-bottom: 40px;
    }

    .passage-title {
      font-size: 1.8em;
      color: #2c3e50;
      margin-bottom: 20px;
      text-align: center;
    }

    .paragraph {
      margin-bottom: 20px;
      text-align: justify;
      line-height: 1.8;
      padding: 15px;
      background-color: #f8f9fa;
      border-radius: 5px;
    }

    .paragraph-number {
      font-weight: bold;
      color: #3498db;
      margin-right: 8px;
    }

    /* 어휘 스타일 */
    .vocabulary-section {
      margin-bottom: 40px;
    }

    .vocabulary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .vocabulary-card {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      border: 1px solid #e9ecef;
    }

    .vocabulary-term {
      font-weight: bold;
      color: #2c3e50;
      font-size: 1.2em;
      margin-bottom: 10px;
    }

    .vocabulary-definition {
      color: #495057;
      margin-bottom: 10px;
    }

    .vocabulary-example {
      color: #6c757d;
      font-style: italic;
      font-size: 0.95em;
    }

    /* 문제 스타일 */
    .question-container {
      margin-bottom: 30px;
      padding: 25px;
      background-color: #f8f9fa;
      border-radius: 8px;
      border: 1px solid #e9ecef;
    }

    .question-header {
      display: flex;
      align-items: center;
      margin-bottom: 15px;
    }

    .question-number {
      background: #3498db;
      color: white;
      padding: 5px 12px;
      border-radius: 20px;
      margin-right: 15px;
      font-weight: bold;
    }

    .question-type {
      color: #7f8c8d;
      font-size: 0.9em;
    }

    .question-text {
      margin-bottom: 20px;
      font-weight: 500;
      color: #2c3e50;
    }

    .options {
      list-style: none;
      margin-bottom: 20px;
    }

    .options li {
      margin-bottom: 10px;
      padding: 10px 15px;
      background-color: white;
      border: 1px solid #dee2e6;
      border-radius: 5px;
      transition: background-color 0.2s;
    }

    .options li:hover {
      background-color: #e9ecef;
    }

    .answer-section {
      border-top: 1px solid #dee2e6;
      padding-top: 15px;
      margin-top: 15px;
    }

    .answer {
      color: #27ae60;
      font-weight: bold;
      margin-bottom: 10px;
    }

    .explanation {
      color: #555;
      line-height: 1.6;
      background-color: #f0f8ff;
      padding: 15px;
      border-radius: 5px;
      border-left: 4px solid #3498db;
    }

    /* 이미지 갤러리 스타일 */
    .image-gallery {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin-top: 20px;
    }

    .image-container {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 8px;
      border: 1px solid #e9ecef;
      text-align: center;
    }

    .image-container img {
      max-width: 100%;
      height: auto;
      border-radius: 5px;
      margin-bottom: 10px;
    }

    .image-filename {
      color: #6c757d;
      font-size: 0.9em;
      word-break: break-all;
    }

    .no-images {
      text-align: center;
      color: #6c757d;
      padding: 40px;
      font-style: italic;
    }

    /* 인쇄 스타일 */
    @media print {
      body {
        background-color: white;
        padding: 0;
      }

      .container {
        box-shadow: none;
        padding: 20px;
      }

      .tabs {
        display: none;
      }

      .tab-content {
        display: block !important;
        page-break-after: always;
      }

      .tab-content:last-child {
        page-break-after: avoid;
      }

      .question-container {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <p class="set-id">콘텐츠 세트 ID: ${String(contentSet.setId || contentSet.id || 'N/A')}</p>
      <h1 style="font-size: 2em;">
        ${contentSet.session_number ? `<span style="display: inline-flex; align-items: center; padding: 4px 12px; border-radius: 9999px; font-size: 0.7em; font-weight: 500; background-color: #dbeafe; color: #1e40af; margin-right: 12px;">${contentSet.session_number}차시</span>` : ''}${contentSet.passageTitle || contentSet.title || '제목 없음'}
      </h1>
    </div>

    <div class="info-grid">
      <!-- 첫 번째 행: 기본 정보 + 생성 정보 + 지문 정보 -->
      <div class="info-row">
        <div class="info-card">
          <h3>기본 정보</h3>
          <p><strong>과목:</strong> ${contentSet.subject} / ${contentSet.grade} / ${contentSet.area}</p>
          <p><strong>주제:</strong> ${contentSet.mainTopic || contentSet.maintopic || contentSet.main_topic || 'N/A'} > ${contentSet.subTopic || contentSet.subtopic || contentSet.sub_topic || 'N/A'}</p>
          <p><strong>핵심어:</strong> ${vocabularyTermsData.filter(term => term.has_question_generated === true).map(term => term.term).join(', ') || 'N/A'}</p>
        </div>

        <div class="info-card">
          <h3>생성 정보</h3>
          <p><strong>교육과정:</strong> ${contentSet.division || contentSet.curriculum || 'N/A'}</p>
          <p><strong>지문길이:</strong> ${contentSet.passageLength || contentSet.passage_length || '정보 없음'}</p>
          <p><strong>유형:</strong> ${(() => {
            const textType = contentSet.textType || contentSet.text_type;
            if (textType === '기행문') return '설명문 – 초등 중학년';
            if (textType === '논설문') return '설명문 – 초등 고학년';
            if (textType === '설명문') return '설명문 – 중학생';
            return textType || '선택안함';
          })()}</p>
        </div>

        <div class="info-card">
          <h3>지문 정보</h3>
          <p><strong>지문 수:</strong> ${editablePassages.length > 0 ? editablePassages.length : 1}개</p>
          <p><strong>어휘 수:</strong> ${totalVocabularyCount}개 (핵심어 ${coreVocabularyCount}개 / 어려운 어휘 ${difficultVocabularyCount}개)</p>
        </div>
      </div>

      <!-- 두 번째 행: 어휘 문제 + 지문 문제 + 종합 문제 -->
      <div class="info-row">
        <div class="info-card">
          <h3>어휘 문제</h3>
          <p><strong>총 문제 수:</strong> ${editableVocabQuestions.length}개</p>
          ${editableVocabQuestions.length > 0 ? `
          <p><strong>유형별 분포:</strong></p>
          <div style="margin-top: 8px;">
            ${Object.entries(vocabularyTypeStats).map(([type, count]) => `<div style="margin-bottom: 4px; color: #6c757d; font-size: 0.9em;">• ${type}: ${count}개</div>`).join('')}
          </div>
          ` : `<p><strong>문제형태:</strong> 저장된 어휘 문제가 없습니다</p>`}
        </div>

        <div class="info-card">
          <h3>지문 문제</h3>
          <p><strong>총 문제 수:</strong> ${totalParagraphQuestions}개</p>
          ${totalParagraphQuestions > 0 ? `
          <p><strong>유형별 분포:</strong></p>
          <div style="margin-top: 8px;">
            ${Object.entries(paragraphTypeStats).map(([type, count]) => `<div style="margin-bottom: 4px; color: #6c757d; font-size: 0.9em;">• ${type}: ${count}개</div>`).join('')}
          </div>
          ` : `<p><strong>문제형태:</strong> 저장된 지문 문제가 없습니다</p>`}
        </div>

        <div class="info-card">
          <h3>종합 문제</h3>
          <p><strong>총 문제 수:</strong> ${editableComprehensive.length}개 (${totalMainSets}세트)</p>
          <p><strong>유형별 분포:</strong></p>
          <div style="margin-top: 8px;">
            ${Object.entries(comprehensiveTypeStats).map(([type, stats]) => `<div style="margin-bottom: 4px; color: #6c757d; font-size: 0.9em;">• ${type}: 기본 ${stats.main}개, 보완 ${stats.supplementary}개</div>`).join('')}
          </div>
        </div>
      </div>
    </div>

    <!-- 탭 메뉴 -->
    <div class="tabs">
      <button class="tab active" onclick="showTab('passage')">지문 (${editablePassages.length > 0 ? editablePassages.length : 1}개)</button>
      <button class="tab" onclick="showTab('vocabulary-list')">어휘 (${editableVocabulary.length}개)</button>
      <button class="tab" onclick="showTab('vocabulary')">어휘 문제 (${editableVocabQuestions.length}개)</button>
      <button class="tab" onclick="showTab('paragraph')">지문 문제 (${totalParagraphQuestions}개)</button>
      <button class="tab" onclick="showTab('comprehensive')">종합 문제 (${totalMainSets}세트, ${editableComprehensive.length}개)</button>
      <button class="tab" onclick="showTab('images')">시각자료</button>
    </div>

    <!-- 지문 탭 -->
    <div id="passage-tab" class="tab-content active">
      ${editablePassages.length > 0 ? (function() {
        let result = '';

        if (editablePassages.length > 1) {
          result += `<h2 class="passage-title" style="text-align: center; margin-bottom: 40px;">${editablePassages[0].title}</h2>`;
        }

        if (editableIntroductionQuestion && editableIntroductionQuestion.trim()) {
          result += `
            <div style="background-color: #f0f9ff; border: 1px solid #3b82f6; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
              <div style="display: flex; align-items: flex-start; gap: 15px;">
                <div style="width: 40px; height: 40px; background-color: #3b82f6; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                  <span style="color: white; font-weight: bold; font-size: 18px;">Q</span>
                </div>
                <div style="flex: 1;">
                  <h3 style="color: #1e40af; font-size: 1.1em; margin: 0 0 10px 0; font-weight: bold;">도입 질문</h3>
                  <p style="color: #1e40af; font-size: 1em; line-height: 1.6; margin: 0;">
                    ${editableIntroductionQuestion}
                  </p>
                </div>
              </div>
            </div>
          `;
        }

        result += editablePassages.map((passage, passageIndex) => `
          <div class="passage-section" style="margin-bottom: ${passageIndex < editablePassages.length - 1 ? '50px' : '30px'};">
            ${editablePassages.length > 1 ?
              `<h3 style="color: #2c3e50; margin-bottom: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">지문 ${passageIndex + 1}</h3>` :
              `<h2 class="passage-title">${passage.title}</h2>`
            }
            ${passage.paragraphs
              .map((paragraph, index) => {
                if (!paragraph.trim()) return '';

                let highlightedParagraph = paragraph;

                const vocabTerms = vocabularyTermsData
                  .map((vocabTerm) => ({
                    term: vocabTerm.term,
                    isCoreVocab: vocabTerm.has_question_generated === true
                  }))
                  .filter(item => item.term && item.term.length > 1)
                  .sort((a, b) => b.term.length - a.term.length);

                vocabTerms.forEach((vocabItem) => {
                  const term = vocabItem.term;
                  const isCoreVocab = vocabItem.isCoreVocab;

                  if (term && term.length > 1) {
                    const escapedTerm = term.replace(/[.*+?^${}()|[\\]\\]/g, '\$&');
                    const regex = new RegExp('(' + escapedTerm + ')', 'gi');

                    const styleText = isCoreVocab
                      ? 'color: #2563eb; font-weight: bold; text-decoration: underline;'
                      : 'color: #2563eb; font-weight: bold;';

                    highlightedParagraph = highlightedParagraph.replace(regex, '<strong style="' + styleText + '">$1</strong>');
                  }
                });

                return '<div class="paragraph">' + highlightedParagraph + '</div>';
              })
              .join('')}
          </div>
        `).join('');

        return result;
      })() : `
        <div class="passage-section">
          ${editableIntroductionQuestion && editableIntroductionQuestion.trim() ? `
            <div style="background-color: #f0f9ff; border: 1px solid #3b82f6; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
              <div style="display: flex; align-items: flex-start; gap: 15px;">
                <div style="width: 40px; height: 40px; background-color: #3b82f6; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                  <span style="color: white; font-weight: bold; font-size: 18px;">Q</span>
                </div>
                <div style="flex: 1;">
                  <h3 style="color: #1e40af; font-size: 1.1em; margin: 0 0 10px 0; font-weight: bold;">도입 질문</h3>
                  <p style="color: #1e40af; font-size: 1em; line-height: 1.6; margin: 0;">
                    ${editableIntroductionQuestion}
                  </p>
                </div>
              </div>
            </div>
          ` : ''}
          <h2 class="passage-title">${editablePassage?.title || ''}</h2>
          ${(editablePassage?.paragraphs || [])
            .map((paragraph, index) => {
              if (!paragraph.trim()) return '';

              let highlightedParagraph = paragraph;

              const vocabTerms = vocabularyTermsData
                .map((vocab, vocabIndex) => ({
                  vocab: vocab,
                  term: vocab.term,
                  index: vocabIndex,
                  isCoreVocabulary: vocab.has_question_generated === true
                }))
                .filter(item => item.term && item.term.length > 1)
                .sort((a, b) => b.term.length - a.term.length);

              vocabTerms.forEach((vocabItem) => {
                const term = vocabItem.term;

                if (term && term.length > 1) {
                  const escapedTerm = term.replace(/[.*+?^${}()|[\\]\\]/g, '\$&');
                  const regex = new RegExp('(' + escapedTerm + ')', 'gi');

                  const style = vocabItem.isCoreVocabulary
                    ? 'color: #2563eb; font-weight: bold; text-decoration: underline;'
                    : 'color: #2563eb; font-weight: bold;';

                  highlightedParagraph = highlightedParagraph.replace(regex, '<strong style="' + style + '">$1</strong>');
                }
              });

              return '<div class="paragraph">' + highlightedParagraph + '</div>';
            })
            .join('')}
        </div>
      `}
    </div>

    <!-- 어휘 탭 -->
    <div id="vocabulary-list-tab" class="tab-content">
      <!-- 핵심어 섹션 -->
      <div style="margin-bottom: 40px;">
        <h2 style="color: #2c3e50; margin-bottom: 20px;">📚 핵심어 (${coreVocabularyCount}개)</h2>
        <p style="color: #6c757d; margin-bottom: 30px; font-style: italic;">어휘 문제로 출제된 중요한 용어들입니다.</p>
        <div class="vocabulary-grid">
          ${vocabularyTermsData.filter(term => term.has_question_generated === true).map((vocabTerm, index) => {
            const vocab = vocabTerm.term + ': ' + vocabTerm.definition + (vocabTerm.example_sentence ? ' (예시: ' + vocabTerm.example_sentence + ')' : '');

            const simpleMatch = vocab.match(/^([^:]+):\s*(.+)$/);
            if (simpleMatch) {
              const term = simpleMatch[1].trim();
              const definition = simpleMatch[2].trim();

              let mainDefinition = definition;
              let example = '';

              const lastParenStart = definition.lastIndexOf('(');
              const lastParenEnd = definition.lastIndexOf(')');

              if (lastParenStart !== -1 && lastParenEnd !== -1 && lastParenStart < lastParenEnd) {
                const potentialExample = definition.substring(lastParenStart + 1, lastParenEnd);
                if (potentialExample.includes('예시:') || potentialExample.includes('예:')) {
                  mainDefinition = definition.substring(0, lastParenStart).trim();
                  example = potentialExample;
                }
              }

              let highlightedExample = example;
              if (example && term && term.length > 1) {
                const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, function(match) { return '\\' + match; });
                const regex = new RegExp('(' + escapedTerm + ')', 'gi');
                highlightedExample = example.replace(regex, '<strong style="color: #2563eb; font-weight: bold;">$1</strong>');
              }

              return '<div class="vocabulary-card" style="border-left: 4px solid #28a745;">' +
                '<div class="vocabulary-term">[핵심어 ' + (index + 1) + '] - ' + term + '</div>' +
                '<div class="vocabulary-definition">' + mainDefinition + '</div>' +
                (example ? '<div class="vocabulary-example" style="margin-top: 8px; font-style: italic; color: #6c757d;">(' + highlightedExample + ')</div>' : '') +
                '</div>';
            }
            return '';
          }).join('')}
        </div>
      </div>

      <!-- 어려운 어휘 섹션 -->
      <div>
        <h2 style="color: #2c3e50; margin-bottom: 20px;">📖 어려운 어휘 (${difficultVocabularyCount}개)</h2>
        <p style="color: #6c757d; margin-bottom: 30px; font-style: italic;">지문 이해에 도움이 되는 추가 어휘들입니다.</p>
        ${(() => {
          const difficultTerms = vocabularyTermsData.filter(term => term.has_question_generated !== true);

          const termsByPassage: any = {};
          difficultTerms.forEach(term => {
            const passageKey = term.passage_id || 'unknown';
            if (!termsByPassage[passageKey]) {
              termsByPassage[passageKey] = {
                passageNumber: term.passage_number || 1,
                passageTitle: term.passage_title || '지문',
                terms: []
              };
            }
            termsByPassage[passageKey].terms.push(term);
          });

          const sortedPassages = Object.entries(termsByPassage).sort((a: any, b: any) =>
            a[1].passageNumber - b[1].passageNumber
          );

          return sortedPassages.map(([passageId, passageData]: any) => {
            const passageLabel = editablePassages.length > 1
              ? '지문 ' + passageData.passageNumber + ': ' + passageData.passageTitle
              : '지문에서 추출된 어휘';

            const vocabularyCardsHtml = passageData.terms.map((vocabTerm: any, index: number) => {
              const vocab = vocabTerm.term + ': ' + vocabTerm.definition + (vocabTerm.example_sentence ? ' (예시: ' + vocabTerm.example_sentence + ')' : '');

              const simpleMatch = vocab.match(/^([^:]+):\s*(.+)$/);
              if (simpleMatch) {
                const term = simpleMatch[1].trim();
                const definition = simpleMatch[2].trim();

                let mainDefinition = definition;
                let example = '';

                const lastParenStart = definition.lastIndexOf('(');
                const lastParenEnd = definition.lastIndexOf(')');

                if (lastParenStart !== -1 && lastParenEnd !== -1 && lastParenStart < lastParenEnd) {
                  const potentialExample = definition.substring(lastParenStart + 1, lastParenEnd);
                  if (potentialExample.includes('예시:') || potentialExample.includes('예:')) {
                    mainDefinition = definition.substring(0, lastParenStart).trim();
                    example = potentialExample;
                  }
                }

                let highlightedExample = example;
                if (example && term && term.length > 1) {
                  const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, function(match) { return '\\' + match; });
                  const regex = new RegExp('(' + escapedTerm + ')', 'gi');
                  highlightedExample = example.replace(regex, '<strong style="color: #2563eb; font-weight: bold;">$1</strong>');
                }

                return '<div class="vocabulary-card" style="border-left: 4px solid #6c757d;">' +
                  '<div class="vocabulary-term">[어려운 어휘 ' + (index + 1) + '] - ' + term + '</div>' +
                  '<div class="vocabulary-definition">' + mainDefinition + '</div>' +
                  (example ? '<div class="vocabulary-example" style="margin-top: 8px; font-style: italic; color: #6c757d;">(' + highlightedExample + ')</div>' : '') +
                  '</div>';
              }
              return '';
            }).join('');

            return '<div style="margin-bottom: 30px;">' +
              '<h3 style="color: #dc6843; margin-bottom: 15px; font-size: 1.1em;">' +
              '📄 ' + passageLabel + ' (' + passageData.terms.length + '개)' +
              '</h3>' +
              '<div class="vocabulary-grid">' +
              vocabularyCardsHtml +
              '</div>' +
              '</div>';
          }).join('');
        })()}
      </div>
    </div>

    <!-- 어휘 문제 탭 -->
    <div id="vocabulary-tab" class="tab-content">
      <h2 style="color: #2c3e50; margin-bottom: 30px;">📝 어휘 문제</h2>
      ${Object.keys(vocabularyQuestionsByTerm).sort().map(term => {
        const questions = vocabularyQuestionsByTerm[term];

        const basicQuestions = questions.filter(q => !(q.difficulty === '보완' || q.question_type === '보완')).length;
        const supplementaryQuestions = questions.filter(q => q.difficulty === '보완' || q.question_type === '보완').length;

        return `
          <div style="margin-bottom: 40px; padding: 20px; background-color: #f8f9fa; border-radius: 8px; border-left: 4px solid #17a2b8;">
            <h3 style="color: #17a2b8; margin-bottom: 20px;">📚 어휘: ${term} (${questions.length}개 문제 / 기본 ${basicQuestions}개, 보완 ${supplementaryQuestions}개)</h3>
            ${questions.map((question, questionIndex) => {
              const questionTypeLabel = getVocabularyQuestionTypeLabel(
                question.question_type || question.questionType || '객관식',
                question.detailed_question_type || question.detailedQuestionType
              );
              const detailedType = question.detailed_question_type || question.detailedQuestionType || questionTypeLabel;
              const isSupplementary = question.difficulty === '보완' || question.question_type === '보완';
              const levelLabel = isSupplementary ? '보완문제' : '기본문제';

              return `
                <div class="question-container" style="margin-bottom: 30px; background-color: white; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <div class="question-header" style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px; background-color: #2c3e50; padding: 12px; border-radius: 6px;">
                    <span class="question-number" style="font-weight: 600; color: white;">어휘 문제 ${questionIndex + 1}</span>
                    <span class="question-type-badge" style="background-color: #17a2b8; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px;">
                      ${detailedType}
                    </span>
                    <span class="question-level-badge" style="background-color: ${isSupplementary ? '#f39c12' : '#27ae60'}; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px;">
                      ${levelLabel}
                    </span>
                  </div>
                  <div class="question-text">${question.question}</div>

                  ${question.options && question.options.length > 0 ? `
                    <div class="options">
                      ${question.options.map((option, optIndex) => `
                        <div class="option ${option === (question.correctAnswer || question.answer) ? 'correct-answer' : ''}" style="margin-bottom: 10px; padding: 10px 15px; background-color: ${option === (question.correctAnswer || question.answer) ? '#e8f5e8' : 'white'}; border: 1px solid #dee2e6; border-radius: 5px; transition: background-color 0.2s;">
                          ${optIndex + 1}. ${option} ${option === (question.correctAnswer || question.answer) ? ' ✓' : ''}
                        </div>
                      `).join('')}
                    </div>
                  ` : `
                    <div class="correct-answer" style="margin: 10px 0; padding: 10px; border-radius: 6px; background-color: #e8f5e8;">
                      <strong>정답:</strong> ${question.correctAnswer || question.answer}
                      ${question.answer_initials || question.answerInitials ? `
                        <span style="margin-left: 15px; color: #666; font-size: 0.9em;">
                          (초성 힌트: ${question.answer_initials || question.answerInitials})
                        </span>
                      ` : ''}
                    </div>
                  `}

                  <div class="answer-section">
                    <div class="explanation" style="margin-top: 15px; padding: 15px; background-color: #f0f8ff; border-radius: 5px; border-left: 4px solid #3498db;">
                      <strong>해설:</strong> ${question.explanation}
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `;
      }).join('')}
    </div>

    <!-- 지문 문제 탭 -->
    <div id="paragraph-tab" class="tab-content">
      <h2 style="color: #2c3e50; margin-bottom: 30px;">📖 지문별 문제</h2>
      ${Object.entries(paragraphQuestionsByParagraph).sort(([a], [b]) => Number(a) - Number(b)).map(([paragraphNumber, questions]) => `
        <div style="margin-bottom: 40px;">
          <div style="background-color: #2c3e50; color: white; padding: 18px 24px; border-radius: 8px; margin-bottom: 25px; border-bottom: 3px solid #1a252f;">
            <h3 style="margin: 0; font-size: 18px; font-weight: bold; text-align: center;">
              📖 ${paragraphNumber}문단 지문 문제 (${questions.length}개)
            </h3>
          </div>

          <!-- 문단 내용 표시 -->
          <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #3b82f6;">
            <div style="font-weight: bold; color: #1e40af; margin-bottom: 12px; font-size: 16px;">📖 ${paragraphNumber}문단 내용:</div>
            <div style="color: #334155; line-height: 1.6; font-size: 14px;">
              ${(() => {
                const paragraphIndex = parseInt(paragraphNumber) - 1;

                if (editablePassages.length > 0) {
                  const allParagraphs: string[] = [];
                  editablePassages.forEach(passage => {
                    passage.paragraphs.forEach(para => {
                      if (para.trim()) allParagraphs.push(para);
                    });
                  });
                  return allParagraphs[paragraphIndex] || '해당 문단 내용을 찾을 수 없습니다.';
                } else {
                  return (editablePassage?.paragraphs || [])[paragraphIndex] || '해당 문단 내용을 찾을 수 없습니다.';
                }
              })()}
            </div>
          </div>

          ${questions.map(q => `
            <div class="question-container">
              <div class="question-header">
                <span class="question-number">지문 문제 ${q.question_number || q.questionNumber}</span>
                <span class="question-type">${getParagraphQuestionTypeLabel(q.question_type || q.questionType || '')}</span>
              </div>

              <!-- 관련 문단 번호 -->
              <div style="margin: 10px 0; padding: 8px 12px; background-color: #f8f9fa; border-left: 3px solid #6c757d; font-weight: bold;">
                📖 관련 문단: ${q.paragraph_number || q.paragraphNumber}번
              </div>

              <!-- 문제 텍스트 -->
              <div class="question-text" style="margin: 15px 0; font-weight: bold;">${q.question}</div>

              <!-- 문제 유형별 추가 정보 (어절들, 선택지) -->
              ${(q.question_type || q.questionType) === '어절 순서 맞추기' || (q.question_type || q.questionType) === '문장 완성하기' ? `
                <div style="margin: 15px 0; padding: 15px; background-color: #f8f9fa; border-radius: 6px; border: 1px solid #e9ecef;">
                  <div style="font-weight: bold; color: #495057; margin-bottom: 12px; font-size: 0.95em;">
                    어절 목록:
                  </div>
                  <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                    ${(q.wordSegments || q.word_segments || []).map((segment, idx) => `
                      <span style="
                        display: inline-block;
                        padding: 8px 14px;
                        background-color: white;
                        color: #495057;
                        border: 1px solid #dee2e6;
                        border-radius: 5px;
                        font-size: 0.95em;
                        position: relative;
                      ">
                        <span style="
                          display: inline-block;
                          margin-right: 6px;
                          color: #6c757d;
                          font-size: 0.85em;
                        ">${idx + 1}.</span>
                        ${segment}
                      </span>
                    `).join('')}
                  </div>
                </div>
              ` : ''}

              ${q.options && q.options.length > 0 && (q.question_type || q.questionType) !== '어절 순서 맞추기' && (q.question_type || q.questionType) !== '문장 완성하기' ? (
                (q.question_type || q.questionType) === 'OX문제' ? `
                  <div class="options" style="margin: 15px 0;">
                    <div style="font-weight: bold; margin-bottom: 10px;">선택지:</div>
                    ${q.options.slice(0, 2).map((option, optIndex) => `
                      <div class="option ${option === (q.correct_answer || q.correctAnswer) ? 'correct-answer' : ''}" style="margin-bottom: 8px; padding: 8px 12px; background-color: ${option === (q.correct_answer || q.correctAnswer) ? '#e8f5e8' : 'white'}; border: 1px solid #dee2e6; border-radius: 4px;">
                        ${optIndex + 1}. ${option} ${option === (q.correct_answer || q.correctAnswer) ? ' ✓' : ''}
                      </div>
                    `).join('')}
                  </div>
                ` : `
                  <div class="options" style="margin: 15px 0;">
                    <div style="font-weight: bold; margin-bottom: 10px;">선택지:</div>
                    ${q.options.map((option, optIndex) => `
                      <div class="option ${(optIndex + 1).toString() === (q.correct_answer || q.correctAnswer) ? 'correct-answer' : ''}" style="margin-bottom: 8px; padding: 8px 12px; background-color: ${(optIndex + 1).toString() === (q.correct_answer || q.correctAnswer) ? '#e8f5e8' : 'white'}; border: 1px solid #dee2e6; border-radius: 4px;">
                        ${optIndex + 1}. ${option} ${(optIndex + 1).toString() === (q.correct_answer || q.correctAnswer) ? ' ✓' : ''}
                      </div>
                    `).join('')}
                  </div>
                `
              ) : `
                <div class="correct-answer" style="margin: 10px 0; padding: 10px; border-radius: 6px; background-color: #e8f5e8;">
                  <strong>정답:</strong> ${q.correct_answer || q.correctAnswer}
                  ${q.answer_initials || q.answerInitials ? `
                    <span style="margin-left: 15px; color: #666; font-size: 0.9em;">
                      (초성 힌트: ${q.answer_initials || q.answerInitials})
                    </span>
                  ` : ''}
                </div>
              `}

              <!-- 해설 -->
              <div class="answer-section">
                <div class="explanation" style="margin-top: 15px; padding: 15px; background-color: #f0f8ff; border-radius: 5px; border-left: 4px solid #3498db;">
                  <strong>해설:</strong> ${q.explanation}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `).join('')}
    </div>

    <!-- 종합 문제 탭 -->
    <div id="comprehensive-tab" class="tab-content">
      <h2 style="color: #2c3e50; margin-bottom: 30px;">🎯 종합 문제</h2>
      ${Object.keys(questionSets).sort().map(setKey => {
        const questions = questionSets[setKey];
        const mainQuestion = questions.find(q => !q.isSupplementary && !q.is_supplementary);
        const supplementaryQuestions = questions.filter(q => q.isSupplementary || q.is_supplementary);
        const setNumber = setKey.split('_')[1];
        const mainQuestionTypeLabel = getComprehensiveQuestionTypeLabel(mainQuestion?.questionType || mainQuestion?.question_type || mainQuestion?.type || '알 수 없음');

        return `
          <div style="margin-bottom: 50px; padding: 25px; background-color: #f0f8ff; border-radius: 10px;">
            <h3 style="color: #2980b9; margin-bottom: 25px;">종합 문제 세트 ${setNumber}: ${mainQuestionTypeLabel}</h3>

            ${mainQuestion ? `
              <div class="question-container" style="border: 2px solid #3498db;">
                <div class="question-header">
                  <span class="question-number" style="background: #2980b9;">기본 문제</span>
                  <span class="question-type">${getComprehensiveQuestionTypeLabel(mainQuestion.questionType || mainQuestion.type)}</span>
                </div>
                <div class="question-text">${mainQuestion.question}</div>
                ${mainQuestion.options && mainQuestion.options.length > 0 ? (
                  (mainQuestion.questionType || mainQuestion.type) === 'OX문제' ? `
                    <div class="options">
                      ${mainQuestion.options.slice(0, 2).map((option, optIndex) => `
                        <div class="option ${option === (mainQuestion.correctAnswer || mainQuestion.answer) ? 'correct-answer' : ''}" style="margin-bottom: 10px; padding: 10px 15px; background-color: ${option === (mainQuestion.correctAnswer || mainQuestion.answer) ? '#e8f5e8' : 'white'}; border: 1px solid #dee2e6; border-radius: 5px;">
                          ${optIndex + 1}. ${option} ${option === (mainQuestion.correctAnswer || mainQuestion.answer) ? ' ✓' : ''}
                        </div>
                      `).join('')}
                    </div>
                  ` : `
                    <div class="options">
                      ${mainQuestion.options.map((option, optIndex) => `
                        <div class="option ${option === (mainQuestion.correctAnswer || mainQuestion.answer) ? 'correct-answer' : ''}" style="margin-bottom: 10px; padding: 10px 15px; background-color: ${option === (mainQuestion.correctAnswer || mainQuestion.answer) ? '#e8f5e8' : 'white'}; border: 1px solid #dee2e6; border-radius: 5px;">
                          ${optIndex + 1}. ${option} ${option === (mainQuestion.correctAnswer || mainQuestion.answer) ? ' ✓' : ''}
                        </div>
                      `).join('')}
                    </div>
                  `
                ) : `
                  <div class="correct-answer" style="margin: 10px 0; padding: 10px; border-radius: 6px; background-color: #e8f5e8;">
                    <strong>정답:</strong> ${mainQuestion.correctAnswer || mainQuestion.answer}
                    ${mainQuestion.answer_initials || mainQuestion.answerInitials ? `
                      <span style="margin-left: 15px; color: #666; font-size: 0.9em;">
                        (초성 힌트: ${mainQuestion.answer_initials || mainQuestion.answerInitials})
                      </span>
                    ` : ''}
                  </div>
                `}
                <div class="answer-section">
                  <div class="explanation" style="margin-top: 15px; padding: 15px; background-color: #f0f8ff; border-radius: 5px; border-left: 4px solid #3498db;">
                    <strong>해설:</strong> ${mainQuestion.explanation}
                  </div>
                </div>
              </div>
            ` : ''}

            ${supplementaryQuestions.length > 0 ? `
              <div style="margin-top: 20px; padding-left: 20px;">
                <h4 style="color: #34495e; margin-bottom: 15px;">보완 문제</h4>
                ${supplementaryQuestions.map((q, index) => `
                  <div class="question-container" style="border: 1px solid #95a5a6;">
                    <div class="question-header">
                      <span class="question-number" style="background: #7f8c8d;">보완 문제 ${index + 1}</span>
                      <span class="question-type">${getComprehensiveQuestionTypeLabel(q.questionType || q.type)}</span>
                    </div>
                    <div class="question-text">${q.question}</div>
                    ${q.options && q.options.length > 0 ? (
                      (q.questionType || q.type) === 'OX문제' ? `
                        <div class="options">
                          ${q.options.slice(0, 2).map((option, optIndex) => `
                            <div class="option ${option === (q.correctAnswer || q.answer) ? 'correct-answer' : ''}" style="margin-bottom: 10px; padding: 10px 15px; background-color: ${option === (q.correctAnswer || q.answer) ? '#e8f5e8' : 'white'}; border: 1px solid #dee2e6; border-radius: 5px;">
                              ${optIndex + 1}. ${option} ${option === (q.correctAnswer || q.answer) ? ' ✓' : ''}
                            </div>
                          `).join('')}
                        </div>
                      ` : `
                        <div class="options">
                          ${q.options.map((option, optIndex) => `
                            <div class="option ${option === (q.correctAnswer || q.answer) ? 'correct-answer' : ''}" style="margin-bottom: 10px; padding: 10px 15px; background-color: ${option === (q.correctAnswer || q.answer) ? '#e8f5e8' : 'white'}; border: 1px solid #dee2e6; border-radius: 5px;">
                              ${optIndex + 1}. ${option} ${option === (q.correctAnswer || q.answer) ? ' ✓' : ''}
                            </div>
                          `).join('')}
                        </div>
                      `
                    ) : `
                      <div class="correct-answer" style="margin: 10px 0; padding: 10px; border-radius: 6px; background-color: #e8f5e8;">
                        <strong>정답:</strong> ${q.correctAnswer || q.answer}
                        ${q.answer_initials || q.answerInitials ? `
                          <span style="margin-left: 15px; color: #666; font-size: 0.9em;">
                            (초성 힌트: ${q.answer_initials || q.answerInitials})
                          </span>
                        ` : ''}
                      </div>
                    `}
                    <div class="answer-section">
                      <div class="explanation" style="margin-top: 15px; padding: 15px; background-color: #f0f8ff; border-radius: 5px; border-left: 4px solid #3498db;">
                        <strong>해설:</strong> ${q.explanation}
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        `;
      }).join('')}
    </div>

    <!-- 시각자료 탭 -->
    <div id="images-tab" class="tab-content">
      <h2 style="color: #2c3e50; margin-bottom: 30px;">🖼️ 시각자료</h2>
      ${contentSet.session_number ? `
        <div style="background: #f0f7ff; padding: 12px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #3b82f6;">
          <p style="color: #1e40af; margin: 0; font-size: 0.95em;">
            📌 차시 번호: <strong>${contentSet.session_number}</strong>
          </p>
        </div>
      ` : ''}
      <div id="image-gallery" class="image-gallery">
        <div class="no-images">
          <p>이미지를 불러오는 중...</p>
        </div>
      </div>
    </div>
  </div>

  <script>
    // 탭 전환 함수
    function showTab(tabName) {
      const tabs = document.querySelectorAll('.tab');
      const contents = document.querySelectorAll('.tab-content');

      tabs.forEach(tab => tab.classList.remove('active'));
      contents.forEach(content => content.classList.remove('active'));

      const selectedTab = Array.from(tabs).find(tab =>
        tab.textContent.includes(getTabText(tabName)) || tab.onclick.toString().includes("'" + tabName + "'")
      );
      const selectedContent = document.getElementById(tabName + '-tab');

      if (selectedTab) selectedTab.classList.add('active');
      if (selectedContent) selectedContent.classList.add('active');
    }

    function getTabText(tabName) {
      const tabTexts = {
        'passage': '지문',
        'vocabulary-list': '어휘',
        'vocabulary': '어휘 문제',
        'paragraph': '지문 문제',
        'comprehensive': '종합 문제',
        'images': '시각자료'
      };
      return tabTexts[tabName] || '';
    }

    // 이미지 로드 함수
    async function loadImages() {
      const sessionNumber = '${contentSet.session_number || ''}';
      const imageGallery = document.getElementById('image-gallery');
      const supabaseUrl = '${process.env.NEXT_PUBLIC_SUPABASE_URL}';

      if (!sessionNumber) {
        imageGallery.innerHTML = \`
          <div class="no-images">
            <p>⚠️ 차시 번호가 설정되지 않았습니다.</p>
            <p style="margin-top: 10px; font-size: 0.9em;">
              시각자료를 표시하려면 콘텐츠 세트에 차시 번호를 설정해주세요.
            </p>
          </div>
        \`;
        return;
      }

      try {
        const imageData = ${JSON.stringify(visualMaterials)};

        if (imageData.length === 0) {
          imageGallery.innerHTML = \`
            <div class="no-images">
              <p>이 차시에 등록된 이미지가 없습니다.</p>
              <p style="margin-top: 10px; font-size: 0.9em; color: #6c757d;">
                차시 번호 "\${sessionNumber}"와 연결된 이미지가 없습니다.<br>
                이미지 데이터 관리 페이지에서 이미지를 등록하세요.
              </p>
            </div>
          \`;
          return;
        }

        imageGallery.innerHTML = imageData.map(image => {
          const imageUrl = \`\${supabaseUrl}/storage/v1/object/public/images/\${image.file_path}\`;
          return \`
            <div class="image-container">
              <img src="\${imageUrl}"
                   alt="\${image.file_name}"
                   onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBOb3QgRm91bmQ8L3RleHQ+PC9zdmc+'" />
              <div class="image-filename">\${image.file_name}</div>
              \${image.source ? \`<div style="color: #6c757d; font-size: 0.85em; margin-top: 5px;">출처: \${image.source}</div>\` : ''}
              \${image.memo ? \`<div style="color: #6c757d; font-size: 0.85em; margin-top: 3px;">\${image.memo}</div>\` : ''}
            </div>
          \`;
        }).join('');

      } catch (error) {
        console.error('이미지 로드 오류:', error);
        imageGallery.innerHTML = \`
          <div class="no-images">
            <p>⚠️ 이미지 로드 중 오류가 발생했습니다.</p>
            <p style="margin-top: 10px; font-size: 0.9em; color: #dc3545;">
              \${error.message || '알 수 없는 오류'}
            </p>
          </div>
        \`;
      }
    }

    window.addEventListener('DOMContentLoaded', loadImages);
  </script>
</body>
</html>
  `;

  return htmlContent;
}
