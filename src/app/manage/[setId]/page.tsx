'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';

interface SetDetails {
  id: string; // UUID
  title: string; // passageTitle -> title
  user_id?: string; // 생성자 ID
  division?: string; // 구분
  grade: string; // 실제 학년
  subject: string;
  area: string;
  main_topic?: string; // 대주제
  sub_topic?: string; // 소주제
  keywords?: string; // 키워드
  passage_length?: string; // DB 필드명 - 지문 길이
  text_type?: string; // DB 필드명 - 지문 유형
  total_passages: number;
  total_vocabulary_terms: number;
  total_vocabulary_questions: number;
  total_paragraph_questions: number;
  total_comprehensive_questions: number;
  status?: '검수 전' | '검수완료'; // 상태값
  created_at?: string;
  updated_at?: string;
  
  // 레거시 호환성을 위한 별칭들
  setId?: string;
  passageTitle?: string;
  userId?: string;
  mainTopic?: string;
  subTopic?: string;
  maintopic?: string;
  subtopic?: string;
  keyword?: string;
  passageLength?: string; // camelCase 별칭
  textType?: string; // camelCase 별칭
  createdAt?: string;
  updatedAt?: string;
  vocabularyQuestionCount?: number;
  comprehensiveQuestionCount?: number;
  paragraphCount?: number;
  vocabularyWordsCount?: number;
}

interface VocabularyQuestion {
  id: string;
  questionId: string;
  term: string;
  question: string;
  options: string[];
  correctAnswer: string;  // v2 구조: correctAnswer
  explanation: string;
  
  // 하위 호환성을 위한 별칭들
  answer?: string;
}

interface ComprehensiveQuestion {
  id: string;
  questionId: string;
  questionType: string;        // v2 구조: questionType
  question: string;
  questionFormat: string;
  options?: string[];
  correctAnswer: string;       // v2 구조: correctAnswer
  answerInitials?: string;     // 단답형 문제의 초성 힌트
  explanation: string;
  isSupplementary: boolean;
  originalQuestionId?: string;
  questionSetNumber: number;
  
  // 하위 호환성을 위한 별칭들
  type?: string;
  answer?: string;
}

interface ParagraphQuestion {
  id: string;
  questionId: string;
  questionNumber: number;
  questionType: string;
  paragraphNumber: number;
  paragraphText: string;
  question: string;
  options: string[];
  correctAnswer: string;
  answerInitials?: string; // 단답형 문제의 초성 힌트
  explanation: string;
  wordSegments?: string[]; // 어절 순서 맞추기 문제용 어절 배열
}

interface VocabularyTerm {
  id: string;
  term: string;
  definition: string;
  exampleSentence: string;
  orderIndex: number;
}

interface PassageData {
  title: string;
  paragraphs: string[];
}

interface ApiResponse {
  success: boolean;
  data: {
    contentSet: SetDetails;
    passage: PassageData | null;
    vocabularyTerms: VocabularyTerm[];
    vocabularyQuestions: VocabularyQuestion[];
    paragraphQuestions: ParagraphQuestion[];
    comprehensiveQuestions: ComprehensiveQuestion[];
  };
  version: string;
  message?: string;
  error?: string;
}

export default function SetDetailPage({ params }: { params: { setId: string } }) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'passage' | 'vocabulary' | 'vocab-questions' | 'paragraph-questions' | 'comprehensive'>('passage');
  const [setId, setSetId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  
  // 편집 상태
  const [editablePassage, setEditablePassage] = useState<{title: string; paragraphs: string[]}>({title: '', paragraphs: []});
  const [editableVocabulary, setEditableVocabulary] = useState<string[]>([]);
  const [editableVocabQuestions, setEditableVocabQuestions] = useState<VocabularyQuestion[]>([]);
  const [editableParagraphQuestions, setEditableParagraphQuestions] = useState<ParagraphQuestion[]>([]);
  const [editableComprehensive, setEditableComprehensive] = useState<ComprehensiveQuestion[]>([]);
  
  const fetchSetDetails = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/get-curriculum-data-supabase?setId=${id}`);
      const result: ApiResponse = await response.json();
      
      console.log('상세보기 API 응답:', result); // 디버깅용 로그
      
      if (result.success && result.data) {
        setData(result);
        
        // 편집 가능한 상태로 초기화
        if (result.data?.passage) {
          setEditablePassage({
            title: result.data.passage.title || '',
            paragraphs: [...(result.data.passage.paragraphs || [])]
          });
        }
        
        // Supabase에서는 어휘 용어가 별도 테이블로 분리됨
        console.log('어휘 용어 원본 데이터:', result.data?.vocabularyTerms);
        console.log('어휘 문제 원본 데이터:', result.data?.vocabularyQuestions);
        console.log('종합 문제 원본 데이터:', result.data?.comprehensiveQuestions);
        
        const vocabularyTermsFormatted = (result.data?.vocabularyTerms || []).map((term: any, index) => {
          console.log(`어휘 용어 ${index + 1} 원본:`, term);
          
          if (term && typeof term === 'object' && term.term && term.definition) {
            // 예시 문장이 있으면 포함, 없으면 정의만
            let formattedTerm;
            if (term.example_sentence && term.example_sentence.trim() !== '') {
              formattedTerm = `${term.term}: ${term.definition} (예시: ${term.example_sentence})`;
            } else {
              formattedTerm = `${term.term}: ${term.definition}`;
            }
            console.log(`어휘 용어 ${index + 1} 변환 결과:`, formattedTerm);
            return formattedTerm;
          }
          // 이미 문자열 형태인 경우 (fallback)
          const fallback = typeof term === 'string' ? term : `용어: 정의`;
          console.log(`어휘 용어 ${index + 1} fallback:`, fallback);
          return fallback;
        });
        setEditableVocabulary(vocabularyTermsFormatted);
        
        // 어휘 문제 데이터 안전하게 처리
        const safeVocabQuestions = (result.data?.vocabularyQuestions || [])
          .filter(q => q && q.id)
          .map((q: any) => ({
            ...q,
            term: q.term || '', // term이 없을 경우 빈 문자열로 설정
            options: q.options || []
          }));
        setEditableVocabQuestions([...safeVocabQuestions]);
        
        // 문단 문제 데이터 안전하게 처리
        const safeParagraphQuestions = (result.data?.paragraphQuestions || [])
          .filter(q => q && q.id)
          .map((q: any) => ({
            ...q,
            options: q.options || []
          }));
        setEditableParagraphQuestions([...safeParagraphQuestions]);
        console.log('문단 문제 데이터:', safeParagraphQuestions);
        
        // 종합 문제 데이터 안전하게 처리
        const allQuestions = result.data?.comprehensiveQuestions || [];
        console.log('원본 종합문제 데이터:', allQuestions);
        
        // original_question_id를 기준으로 세트별 그룹화하여 정렬
        const questionsBySet: { [setId: string]: any[] } = {};
        
        allQuestions.forEach((q: any) => {
          const setId = q.originalQuestionId || q.questionId || 'unknown';
          if (!questionsBySet[setId]) {
            questionsBySet[setId] = [];
          }
          questionsBySet[setId].push(q);
        });
        
        console.log('세트별 그룹화된 문제:', questionsBySet);
        
        // 각 세트 내에서 기본문제 먼저, 보완문제 나중에 정렬
        const sortedQuestions: any[] = [];
        Object.keys(questionsBySet).sort().forEach(setId => {
          const setQuestions = questionsBySet[setId].sort((a, b) => {
            // 기본문제 먼저, 보완문제 나중에
            if (!a.isSupplementary && b.isSupplementary) return -1;
            if (a.isSupplementary && !b.isSupplementary) return 1;
            // 같은 타입이면 question_number로 정렬
            return (a.question_number || 0) - (b.question_number || 0);
          });
          sortedQuestions.push(...setQuestions);
        });
        
        const safeComprehensiveQuestions = sortedQuestions
          .filter(q => q && q.id);
          
        console.log('최종 정렬된 종합문제:', safeComprehensiveQuestions);
        console.log('기본문제:', safeComprehensiveQuestions.filter(q => !q.isSupplementary).length, '개');
        console.log('보완문제:', safeComprehensiveQuestions.filter(q => q.isSupplementary).length, '개');
        setEditableComprehensive([...safeComprehensiveQuestions]);
      } else {
        setError(result.error || 'Unknown error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    const initializeParams = async () => {
      const resolvedParams = await params;
      setSetId(resolvedParams.setId);
      fetchSetDetails(resolvedParams.setId);
    };
    
    initializeParams();
  }, [params, fetchSetDetails]);
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 저장 함수
  const handleSave = async () => {
    if (!data || !setId) return;
    
    setSaving(true);
    try {
      console.log('수정사항 저장 시작...', {
        contentSetId: setId,
        editablePassage,
        editableVocabulary,
        editableVocabQuestions,
        editableParagraphQuestions,
        editableComprehensive
      });

      const response = await fetch('/api/update-content-set', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contentSetId: setId,
          editablePassage,
          editableVocabulary,
          editableVocabQuestions,
          editableParagraphQuestions,
          editableComprehensive
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        alert('수정사항이 성공적으로 저장되었습니다.');
        // 데이터 새로고침
        await fetchSetDetails(setId);
      } else {
        alert(`저장 실패: ${result.message || '알 수 없는 오류가 발생했습니다.'}`);
      }
    } catch (error) {
      console.error('저장 중 오류:', error);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // HTML 다운로드 함수
  const handleHtmlDownload = () => {
    if (!data) return;

    const { contentSet } = data.data;
    
    // 종합문제를 세트별로 그룹화 (문제 유형별 그룹화)
    const questionSets: { [key: string]: typeof editableComprehensive } = {};
    
    // 문제 유형별로 그룹화 (같은 유형의 기본문제 + 보완문제들을 1세트로)
    const typeGroups: { [key: string]: typeof editableComprehensive } = {};
    
    editableComprehensive.forEach(question => {
      const questionType = question.questionType || question.type || '기타';
      if (!typeGroups[questionType]) {
        typeGroups[questionType] = [];
      }
      typeGroups[questionType].push(question);
    });
    
    // 각 유형별 그룹을 기본문제 우선으로 정렬하고 세트 생성
    let setIndex = 0;
    Object.entries(typeGroups).forEach(([type, questions]) => {
      // 기본문제와 보완문제 분리
      const mainQuestions = questions.filter(q => !q.isSupplementary);
      const supplementaryQuestions = questions.filter(q => q.isSupplementary);
      
      // 기본문제별로 세트 생성 (일반적으로 1개의 기본문제당 1세트)
      mainQuestions.forEach((mainQuestion, mainIndex) => {
        setIndex++;
        const setKey = `set_${setIndex}_${type}`;
        questionSets[setKey] = [mainQuestion];
        
        // 해당 기본문제에 연결된 보완문제들 추가
        // 같은 유형의 보완문제들을 순서대로 배분
        const relatedSupplementaryQuestions = supplementaryQuestions.slice(
          mainIndex * 2, // 기본문제 당 2개씩 보완문제 할당
          (mainIndex + 1) * 2
        );
        
        questionSets[setKey].push(...relatedSupplementaryQuestions);
      });
    });

    // 기본 문제 세트 수 계산 (기본 문제만)
    const mainQuestions = editableComprehensive.filter(q => !q.isSupplementary);
    const totalMainSets = mainQuestions.length;
    
    // 문단문제 유형별 분포 계산
    const paragraphTypeStats = editableParagraphQuestions.reduce((acc, question) => {
      const type = question.questionType || '기타';
      if (!acc[type]) {
        acc[type] = 0;
      }
      acc[type]++;
      return acc;
    }, {} as Record<string, number>);

    // 종합문제 유형별 분포 계산 (실제 문제 유형 기준)
    const comprehensiveTypeStats = editableComprehensive.reduce((acc, question) => {
      // questionType이 있으면 사용, 없으면 type 사용 (호환성)
      const type = question.questionType || question.type || '기타';
      if (!acc[type]) {
        acc[type] = { main: 0, supplementary: 0 };
      }
      if (question.isSupplementary) {
        acc[type].supplementary++;
      } else {
        acc[type].main++;
      }
      return acc;
    }, {} as Record<string, { main: number; supplementary: number }>);

    // HTML 템플릿 생성
    const htmlContent = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${editablePassage.title}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 850px; margin: 0 auto; padding: 25px; line-height: 1.6; color: #374151; }
        .header { border-bottom: 3px solid #e5e7eb; padding-bottom: 25px; margin-bottom: 35px; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); padding: 30px; border-radius: 12px; margin: -25px -25px 35px -25px; }
        .title { font-size: 28px; font-weight: bold; color: #1e40af; margin-bottom: 15px; text-align: center; text-shadow: 0 1px 2px rgba(0,0,0,0.1); }
        .content-id { text-align: center; font-size: 18px; color: #6b7280; margin-bottom: 30px; font-weight: 600; background-color: #fff; padding: 8px 16px; border-radius: 20px; display: inline-block; border: 2px solid #e5e7eb; }
        .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 15px; margin-bottom: 25px; }
        .info-row { display: flex; gap: 15px; margin-bottom: 15px; }
        .info-row .info-section { flex: 1; min-width: 0; }
        .info-section { background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%); border: 2px solid #e2e8f0; border-radius: 12px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); transition: transform 0.2s ease; }
        .info-section:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
        .info-title { font-size: 16px; font-weight: bold; color: #1e40af; margin-bottom: 15px; display: flex; align-items: center; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb; }
        .info-title::before { content: "●"; margin-right: 10px; font-size: 12px; }
        .info-item { margin-bottom: 10px; display: flex; align-items: flex-start; }
        .info-label { font-weight: 600; color: #4b5563; min-width: 85px; font-size: 14px; }
        .info-value { color: #1f2937; flex: 1; font-size: 14px; line-height: 1.5; }
        .type-stats { margin-top: 12px; background-color: #f1f5f9; padding: 12px; border-radius: 8px; border-left: 4px solid #3b82f6; }
        .type-stat-item { margin-bottom: 6px; font-size: 13px; color: #6b7280; display: flex; align-items: center; }
        .type-stat-item::before { content: "▶"; margin-right: 8px; color: #3b82f6; font-size: 10px; }
        .section { margin-bottom: 40px; }
        .section-title { font-size: 18px; font-weight: bold; color: #1f2937; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb; }
        .passage-content { background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .paragraph { margin-bottom: 15px; text-align: justify; }
        .vocabulary-list { list-style: none; padding: 0; }
        .vocabulary-item { background-color: #f8fafc; padding: 12px; margin-bottom: 8px; border-radius: 6px; border-left: 4px solid #3b82f6; }
        .vocab-term { font-weight: bold; color: #1e40af; }
        .vocab-definition { margin-left: 10px; }
        .vocab-example { font-style: italic; color: #6b7280; margin-top: 4px; }
        .question-set { background-color: #fff; border: 2px solid #e5e7eb; border-radius: 12px; padding: 25px; margin-bottom: 25px; }
        .set-header { background-color: #f1f5f9; padding: 15px; margin: -25px -25px 20px -25px; border-radius: 10px 10px 0 0; border-bottom: 1px solid #e2e8f0; }
        .set-title { font-size: 16px; font-weight: bold; color: #1e40af; margin: 0; }
        .question { background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 15px; }
        .question.main-question { border-left: 4px solid #3b82f6; background-color: #eff6ff; }
        .question.supplementary-question { border-left: 4px solid #f59e0b; background-color: #fffbeb; }
        .question-header { margin-bottom: 15px; }
        .question-number { font-weight: bold; color: #1e40af; }
        .question-type-badge { background-color: #e0e7ff; color: #3730a3; padding: 4px 8px; border-radius: 12px; font-size: 12px; margin-left: 10px; }
        .question-nature-badge { padding: 4px 8px; border-radius: 12px; font-size: 12px; margin-left: 5px; }
        .main-badge { background-color: #dbeafe; color: #1e40af; }
        .supplementary-badge { background-color: #fef3c7; color: #92400e; }
        .question-text { margin: 10px 0; font-weight: 500; }
        .options { margin: 15px 0; }
        .option { margin: 5px 0; padding: 8px; background-color: #f3f4f6; border-radius: 4px; }
        .correct-answer { background-color: #d1fae5; color: #059669; font-weight: bold; }
        .explanation { background-color: #fef3c7; padding: 12px; border-radius: 6px; margin-top: 10px; }
        .explanation-label { font-weight: bold; color: #92400e; }
        .vocab-question { background-color: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
         @media (max-width: 768px) {
             .info-row { flex-direction: column; }
             .info-row .info-section { flex: none; }
             .image-gallery { grid-template-columns: 1fr; }
         }
         
         @media print { 
             body { max-width: none; margin: 0; padding: 15px; } 
             .info-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; } 
             .info-row { display: flex; gap: 10px; margin-bottom: 10px; }
             .info-row .info-section { flex: 1; min-width: 0; }
             .header { background: #f8fafc; }
             .info-section { box-shadow: none; border: 1px solid #e2e8f0; }
             .info-section:hover { transform: none; }
         }
    </style>
</head>
  <body>
      <div class="header">
          <h1 class="title">어휘 학습 콘텐츠</h1>
          <div style="text-align: center; margin-bottom: 30px;">
             <div class="content-id">콘텐츠 세트 ID: ${contentSet.setId || contentSet.id || 'N/A'}</div>
         </div>
        
        <!-- 첫 번째 행: 기본 정보 + 생성 정보 -->
        <div class="info-row">
            <div class="info-section">
                <div class="info-title">기본 정보</div>
                <div class="info-item">
                    <span class="info-label">과목:</span>
                    <span class="info-value">${contentSet.subject} / ${contentSet.grade} / ${contentSet.area}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">주제:</span>
                    <span class="info-value">${contentSet.mainTopic || contentSet.maintopic} > ${contentSet.subTopic || contentSet.subtopic}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">핵심 개념어:</span>
                    <span class="info-value">${contentSet.keywords || contentSet.keyword}</span>
                </div>
            </div>
            
            <div class="info-section">
                <div class="info-title">생성 정보</div>
                <div class="info-item">
                    <span class="info-label">교육과정:</span>
                    <span class="info-value">${contentSet.division}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">지문길이:</span>
                    <span class="info-value">${contentSet.passageLength || '정보 없음'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">유형:</span>
                    <span class="info-value">${contentSet.textType || '선택안함'}</span>
                </div>
            </div>
        </div>
        
        <!-- 두 번째 행: 지문 정보 + 어휘 문제 -->
        <div class="info-row">
            <div class="info-section">
                <div class="info-title">지문 정보</div>
                <div class="info-item">
                    <span class="info-label">단락 수:</span>
                    <span class="info-value">${editablePassage.paragraphs.length}개</span>
                </div>
                <div class="info-item">
                    <span class="info-label">어휘 수:</span>
                    <span class="info-value">${editableVocabulary.length}개</span>
                </div>
            </div>
            
            <div class="info-section">
                <div class="info-title">어휘 문제</div>
                <div class="info-item">
                    <span class="info-label">총 문제 수:</span>
                    <span class="info-value">${editableVocabQuestions.length}개</span>
                </div>
                <div class="info-item">
                    <span class="info-label">문제형태:</span>
                    <span class="info-value">객관식 (5지선다)</span>
                </div>
            </div>
        </div>
        
        <!-- 세 번째 행: 문단 문제 + 종합 문제 -->
        <div class="info-row">
            <div class="info-section">
                <div class="info-title">문단 문제</div>
                <div class="info-item">
                    <span class="info-label">총 문제 수:</span>
                    <span class="info-value">${editableParagraphQuestions.length}개</span>
                </div>
                ${editableParagraphQuestions.length > 0 ? `
                <div class="info-item" style="flex-direction: column; align-items: flex-start;">
                    <span class="info-label">유형별 분포:</span>
                    <div class="type-stats">
                        ${Object.entries(paragraphTypeStats).map(([type, count]) => 
                          `<div class="type-stat-item">${type}: ${count}개</div>`
                        ).join('')}
                    </div>
                </div>
                ` : `
                <div class="info-item">
                    <span class="info-label">문제형태:</span>
                    <span class="info-value">저장된 문단 문제가 없습니다</span>
                </div>
                `}
            </div>
            
            <div class="info-section">
                <div class="info-title">종합 문제</div>
                <div class="info-item">
                    <span class="info-label">총 문제 수:</span>
                    <span class="info-value">${editableComprehensive.length}개 (${totalMainSets}세트)</span>
                </div>
                <div class="info-item" style="flex-direction: column; align-items: flex-start;">
                    <span class="info-label">유형별 분포:</span>
                    <div class="type-stats">
                        ${Object.entries(comprehensiveTypeStats).map(([type, stats]) => 
                          `<div class="type-stat-item">${type}: 기본 문제 ${stats.main}개, 보완 문제 ${stats.supplementary}개</div>`
                        ).join('')}
                    </div>
                </div>
            </div>
        </div>
    </div>

         <div class="section">
         <h2 class="section-title">📖 지문 (${editablePassage.paragraphs.length}단락)</h2>
         <div class="passage-content">
             <h3 style="margin-bottom: 20px; color: #1e40af; font-weight: bold; font-size: 20px; text-align: center; border-bottom: 2px solid #e5e7eb; padding-bottom: 15px;">${editablePassage.title}</h3>
             ${editablePassage.paragraphs.map(paragraph => `<div class="paragraph">${paragraph}</div>`).join('')}
         </div>
     </div>

    <div class="section">
        <h2 class="section-title">📚 어휘 (${editableVocabulary.length}개)</h2>
        <ul class="vocabulary-list">
            ${editableVocabulary.map((vocab, index) => {
              const match = vocab.match(/^([^:]+):\s*(.+?)\s*\(예시:\s*(.+?)\)\s*$/);
              if (match) {
                return `
                  <li class="vocabulary-item">
                    <span class="vocab-term">[어휘 ${index + 1}] - ${match[1].trim()}</span>
                    <div class="vocab-definition">${match[2].trim()}</div>
                    <div class="vocab-example">예시: ${match[3].trim()}</div>
                  </li>
                `;
              }
              const simpleMatch = vocab.match(/^([^:]+):\s*(.+)$/);
              if (simpleMatch) {
                return `
                  <li class="vocabulary-item">
                    <span class="vocab-term">[어휘 ${index + 1}] - ${simpleMatch[1].trim()}</span>
                    <div class="vocab-definition">${simpleMatch[2].trim()}</div>
                  </li>
                `;
              }
              return `<li class="vocabulary-item"><span class="vocab-term">[어휘 ${index + 1}] - ${vocab}</span></li>`;
            }).join('')}
        </ul>
    </div>

    <div class="section">
        <h2 class="section-title">❓ 어휘 문제 (${editableVocabQuestions.length}개)</h2>
        ${editableVocabQuestions.map((question, index) => `
          <div class="vocab-question">
            <div class="question-header">
                <span class="question-number">[어휘 문제 ${index + 1}]</span> - <strong>${question.term}</strong>
            </div>
            <div class="question-text">${question.question}</div>
            <div class="options">
                ${question.options.map((option, optIndex) => `
                  <div class="option ${option === (question.correctAnswer || question.answer) ? 'correct-answer' : ''}">
                    ${optIndex + 1}. ${option} ${option === (question.correctAnswer || question.answer) ? '✓' : ''}
                  </div>
                `).join('')}
            </div>
            <div class="explanation">
                <span class="explanation-label">해설:</span> ${question.explanation}
            </div>
          </div>
        `).join('')}
    </div>

    <div class="section">
        <h2 class="section-title">📋 문단 문제 (${editableParagraphQuestions.length}개)</h2>
        ${editableParagraphQuestions.length === 0 ? 
          '<div style="text-align: center; padding: 40px; color: #6b7280; background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">저장된 문단 문제가 없습니다.</div>' :
          (() => {
            // 문단 번호별로 그룹화
            const questionsByParagraph = editableParagraphQuestions.reduce((acc, question) => {
              const paragraphNum = question.paragraphNumber || 1;
              if (!acc[paragraphNum]) {
                acc[paragraphNum] = [];
              }
              acc[paragraphNum].push(question);
              return acc;
            }, {});
            
            // 문단 번호 순으로 정렬하여 HTML 생성
            return Object.keys(questionsByParagraph)
              .sort((a, b) => parseInt(a) - parseInt(b))
              .map(paragraphNum => {
                const questions = questionsByParagraph[paragraphNum];
                const firstQuestion = questions[0];
                
                return `
                <div class="question-set">
                  <div class="set-header">
                    <h3 class="set-title">[문단 ${paragraphNum}번 관련 문제] (${questions.length}개 문제)</h3>
                  </div>
                  
                  ${firstQuestion.paragraphText ? `
                    <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #3b82f6;">
                      <div style="font-weight: bold; color: #1e40af; margin-bottom: 12px; font-size: 16px;">📖 관련 문단 내용:</div>
                      <div style="line-height: 1.7; color: #374151; font-size: 15px;">${firstQuestion.paragraphText}</div>
                    </div>
                  ` : ''}
                  
                  ${questions.map((question, questionIndex) => `
                    <div class="question main-question">
                      <div class="question-header">
                        <span class="question-number">[문제 ${questionIndex + 1}]</span>
                        <span class="question-type-badge">${question.questionType}</span>
                      </div>
                      
                      <div class="question-text">${question.question}</div>
                      ${question.questionType === '어절 순서 맞추기' ? `
                        <div style="margin: 15px 0; padding: 10px; background-color: #fff3cd; border-radius: 6px; border-left: 4px solid #ffc107;">
                          <strong>어절 목록:</strong> ${(question.wordSegments || []).join(', ')}
                        </div>
                        <div class="correct-answer" style="margin: 10px 0; padding: 10px; border-radius: 6px; background-color: #e8f5e8;">
                          <strong>정답:</strong> ${question.correctAnswer}
                        </div>
                      ` : question.questionType === '주관식 단답형' ? `
                        <div class="correct-answer" style="margin: 10px 0; padding: 10px; border-radius: 6px;">
                          <strong>정답:</strong> ${question.correctAnswer}
                        </div>
                      ` : question.questionType === 'OX문제' ? `
                        <div class="options">
                          ${question.options.slice(0, 2).map((option, optIndex) => `
                            <div class="option ${(optIndex + 1).toString() === question.correctAnswer ? 'correct-answer' : ''}">
                              ${optIndex + 1}. ${option} ${(optIndex + 1).toString() === question.correctAnswer ? '✓' : ''}
                            </div>
                          `).join('')}
                        </div>
                      ` : `
                        <div class="options">
                          ${question.options.map((option, optIndex) => `
                            <div class="option ${(optIndex + 1).toString() === question.correctAnswer ? 'correct-answer' : ''}">
                              ${optIndex + 1}. ${option} ${(optIndex + 1).toString() === question.correctAnswer ? '✓' : ''}
                            </div>
                          `).join('')}
                        </div>
                      `}
                      <div class="explanation">
                        <span class="explanation-label">해설:</span> ${question.explanation}
                      </div>
                    </div>
                  `).join('')}
                </div>
                `;
              }).join('');
          })()
        }
    </div>

    <div class="section">
        <h2 class="section-title">📝 종합 문제 (${editableComprehensive.length}개, ${totalMainSets}세트)</h2>
        ${Object.entries(questionSets).map(([setKey, questions]) => {
          const mainQuestion = questions.find(q => !q.isSupplementary);
          const supplementaryQuestions = questions.filter(q => q.isSupplementary);
          
          // setKey에서 세트 번호와 유형 추출 (예: set_1_단답형 -> 세트 1, 단답형)
          const setMatch = setKey.match(/^set_(\d+)_(.+)$/);
          const setNumber = setMatch ? setMatch[1] : '?';
          const setType = setMatch ? setMatch[2] : (mainQuestion?.questionType || mainQuestion?.type || '문제유형');
          
          return `
          <div class="question-set">
            <div class="set-header">
                <h3 class="set-title">[종합 문제 - 세트 ${setNumber}] - ${setType}</h3>
            </div>
            ${questions.map((question, questionIndex) => `
              <div class="question ${question.isSupplementary ? 'supplementary-question' : 'main-question'}">
                <div class="question-header">
                    <span class="question-number">${question.isSupplementary ? '보완 문제' : '기본 문제'}</span>
                    <span class="question-type-badge">${question.questionType || question.type}</span>
                    <span class="question-nature-badge ${question.isSupplementary ? 'supplementary-badge' : 'main-badge'}">
                      ${question.isSupplementary ? '보완문제' : '기본문제'}
                    </span>
                </div>
                <div class="question-text">${question.question}</div>
                ${question.options && question.options.length > 0 ? (
                  (question.questionType || question.type) === 'OX문제' ? `
                    <div class="options">
                        ${question.options.slice(0, 2).map((option, optIndex) => `
                          <div class="option ${(optIndex + 1).toString() === (question.correctAnswer || question.answer) ? 'correct-answer' : ''}">
                            ${optIndex + 1}. ${option} ${(optIndex + 1).toString() === (question.correctAnswer || question.answer) ? '✓' : ''}
                          </div>
                        `).join('')}
                    </div>
                  ` : `
                    <div class="options">
                        ${question.options.map((option, optIndex) => `
                          <div class="option ${(optIndex + 1).toString() === (question.correctAnswer || question.answer) ? 'correct-answer' : ''}">
                            ${optIndex + 1}. ${option} ${(optIndex + 1).toString() === (question.correctAnswer || question.answer) ? '✓' : ''}
                          </div>
                        `).join('')}
                    </div>
                  `
                ) : `
                  <div class="correct-answer" style="margin: 10px 0; padding: 10px; border-radius: 6px;">
                    <strong>정답:</strong> ${question.correctAnswer || question.answer}
                  </div>
                `}
                <div class="explanation">
                    <span class="explanation-label">해설:</span> ${question.explanation}
                </div>
              </div>
            `).join('')}
          </div>
        `;
        }).join('')}
    </div>

</body>
</html>`;

    // HTML 파일 다운로드
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${String(contentSet.setId || contentSet.id || 'content')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // TXT 다운로드 함수
  const handleTxtDownload = () => {
    if (!data) return;

    const { contentSet } = data.data;
    
    // TXT 내용 생성
    const txtContent = `콘텐츠 세트 ID
${String(contentSet.setId || contentSet.id || 'N/A')}

과목
${contentSet.subject || 'N/A'}

학년
${contentSet.grade || 'N/A'}

영역
${contentSet.area || 'N/A'}

주제
${contentSet.mainTopic || contentSet.maintopic || 'N/A'} > ${contentSet.subTopic || contentSet.subtopic || 'N/A'}

핵심개념어
${contentSet.keywords || contentSet.keyword || 'N/A'}

지문
${editablePassage.title || '제목 없음'}
${editablePassage.paragraphs
  .map((paragraph, index) => {
    if (!paragraph.trim()) return '';
    return paragraph.trim();
  })
  .filter(p => p)
  .join(' ')}`;

    // TXT 파일 다운로드
    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${String(contentSet.setId || contentSet.id || 'content')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // HTML ver.2 다운로드 함수 (탭 형식)
  const handleHtmlDownloadV2 = () => {
    if (!data) return;

    const { contentSet } = data.data;
    
    // 종합문제를 세트별로 그룹화 (HTML ver.1과 동일한 방식)
    const questionSets: { [key: string]: typeof editableComprehensive } = {};
    
    // 문제 유형별로 그룹화 (같은 유형의 기본문제 + 보완문제들을 1세트로)
    const typeGroups: { [key: string]: typeof editableComprehensive } = {};
    
    // 어휘 용어 추출을 위한 함수
    const extractTermFromVocab = (vocab: string) => {
      let term = '';
      
      // "용어: 정의" 형식
      const simpleMatch = vocab.match(/^([^:]+):\s*(.+)$/);
      if (simpleMatch) {
        term = simpleMatch[1].trim();
      }
      
      // "용어(한자): 정의" 형식  
      const hanjaMatch = vocab.match(/^([^(]+)(\([^)]+\))?:\s*(.+)$/);
      if (hanjaMatch && !term) {
        term = hanjaMatch[1].trim();
      }
      
      // VocabularyTerm 객체 형식
      if (typeof vocab === 'object' && vocab.term) {
        term = vocab.term;
      }
      
      return term;
    };
    
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
      // 기본문제와 보완문제 분리
      const mainQuestions = questions.filter(q => !q.isSupplementary && !q.is_supplementary);
      const supplementaryQuestions = questions.filter(q => q.isSupplementary || q.is_supplementary);
      
      // 기본문제별로 세트 생성 (일반적으로 1개의 기본문제당 1세트)
      mainQuestions.forEach((mainQuestion, mainIndex) => {
        setIndex++;
        const setKey = `set_${setIndex}_${type}`;
        questionSets[setKey] = [mainQuestion];
        
        // 해당 기본문제에 연결된 보완문제들 추가
        // 같은 유형의 보완문제들을 순서대로 배분
        const relatedSupplementaryQuestions = supplementaryQuestions.slice(
          mainIndex * 2, // 기본문제 당 2개씩 보완문제 할당
          (mainIndex + 1) * 2
        );
        
        questionSets[setKey].push(...relatedSupplementaryQuestions);
      });
    });

    // 어휘 문제는 문단별로 구분하지 않음

    // 각 문단별 문단 문제 그룹화
    const paragraphQuestionsByParagraph: { [key: number]: typeof editableParagraphQuestions } = {};
    editableParagraphQuestions.forEach(q => {
      const paragraphNumber = q.paragraphNumber;
      if (!paragraphQuestionsByParagraph[paragraphNumber]) {
        paragraphQuestionsByParagraph[paragraphNumber] = [];
      }
      paragraphQuestionsByParagraph[paragraphNumber].push(q);
    });

    // 통계 계산
    const totalParagraphQuestions = editableParagraphQuestions.length;
    
    // 문단문제 유형별 분포 계산 (HTML ver.1과 동일한 방식)
    const paragraphTypeStats = editableParagraphQuestions.reduce((acc, question) => {
      // 여러 필드명을 시도해서 실제 유형을 찾음
      const type = question.questionType || question.question_type || question.type || '기타';
      console.log('문단 문제 유형 디버깅:', { question, type }); // 디버깅용
      if (!acc[type]) {
        acc[type] = 0;
      }
      acc[type]++;
      return acc;
    }, {} as Record<string, number>);

    // 종합문제 유형별 분포 계산 (HTML ver.1과 동일한 방식 - 기본/보완 문제 구분)
    const comprehensiveTypeStats = editableComprehensive.reduce((acc, question) => {
      const type = question.question_type || question.type || '기타';
      if (!acc[type]) {
        acc[type] = { main: 0, supplementary: 0 };
      }
      if (question.is_supplementary) {
        acc[type].supplementary++;
      } else {
        acc[type].main++;
      }
      return acc;
    }, {} as Record<string, { main: number; supplementary: number }>);
    
    // 기본 문제 세트 수 계산 (실제 생성된 세트 수)
    const totalMainSets = Object.keys(questionSets).length;

    const htmlContent = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${contentSet.passageTitle || '제목 없음'} - 학습 콘텐츠</title>
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
      font-size: 0.85em; /* 기본 폰트 크기를 2단계 줄임 (1em -> 0.85em) */
    }
    
    .info-card h3 {
      color: #495057;
      font-size: 1.05em; /* 제목 폰트 크기 조정 (1.1em -> 1.05em) */
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
      <h1 style="font-size: 2em;">${contentSet.passageTitle || '제목 없음'}</h1>
    </div>
    
    <div class="info-grid">
      <!-- 첫 번째 행: 기본 정보 + 생성 정보 + 지문 정보 -->
      <div class="info-row">
        <div class="info-card">
          <h3>기본 정보</h3>
          <p><strong>과목:</strong> ${contentSet.subject} / ${contentSet.grade} / ${contentSet.area}</p>
          <p><strong>주제:</strong> ${contentSet.mainTopic || contentSet.maintopic || 'N/A'} > ${contentSet.subTopic || contentSet.subtopic || 'N/A'}</p>
          <p><strong>핵심 개념어:</strong> ${contentSet.keywords || contentSet.keyword || 'N/A'}</p>
        </div>
        
        <div class="info-card">
          <h3>생성 정보</h3>
          <p><strong>교육과정:</strong> ${contentSet.division || contentSet.curriculum || 'N/A'}</p>
          <p><strong>지문길이:</strong> ${contentSet.passageLength || '정보 없음'}</p>
          <p><strong>유형:</strong> ${contentSet.textType || '선택안함'}</p>
        </div>
        
        <div class="info-card">
          <h3>지문 정보</h3>
          <p><strong>단락 수:</strong> ${editablePassage.paragraphs.filter(p => p.trim()).length}개</p>
          <p><strong>어휘 수:</strong> ${editableVocabulary.length}개</p>
        </div>
      </div>
      
      <!-- 두 번째 행: 어휘 문제 + 문단 문제 + 종합 문제 -->
      <div class="info-row">
        <div class="info-card">
          <h3>어휘 문제</h3>
          <p><strong>총 문제 수:</strong> ${editableVocabQuestions.length}개</p>
          <p><strong>문제형태:</strong> 5지선다 객관식</p>
        </div>
        
        <div class="info-card">
          <h3>문단 문제</h3>
          <p><strong>총 문제 수:</strong> ${totalParagraphQuestions}개</p>
          ${totalParagraphQuestions > 0 ? `
          <p><strong>유형별 분포:</strong></p>
          <div style="margin-top: 8px;">
            ${Object.entries(paragraphTypeStats).map(([type, count]) => `<div style="margin-bottom: 4px; color: #6c757d; font-size: 0.9em;">• ${type}: ${count}개</div>`).join('')}
          </div>
          ` : `<p><strong>문제형태:</strong> 저장된 문단 문제가 없습니다</p>`}
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
      <button class="tab active" onclick="showTab('passage')">지문 (${editablePassage.paragraphs.filter(p => p.trim()).length}단락)</button>
      <button class="tab" onclick="showTab('vocabulary-list')">어휘 (${editableVocabulary.length}개)</button>
      <button class="tab" onclick="showTab('vocabulary')">어휘 문제 (${editableVocabQuestions.length}개)</button>
      <button class="tab" onclick="showTab('paragraph')">문단 문제 (${totalParagraphQuestions}개)</button>
      <button class="tab" onclick="showTab('comprehensive')">종합 문제 (${totalMainSets}세트, ${editableComprehensive.length}개)</button>
      <button class="tab" onclick="showTab('images')">시각자료</button>
    </div>

    <!-- 지문 탭 -->
    <div id="passage-tab" class="tab-content active">
      <div class="passage-section">
        <h2 class="passage-title">${editablePassage.title}</h2>
        ${editablePassage.paragraphs
          .map((paragraph, index) => {
            if (!paragraph.trim()) return '';
            
            // 어휘 용어들 추출 및 하이라이트 처리
            let highlightedParagraph = paragraph;
            
            // 디버깅: 어휘 데이터 확인
            console.log('HTML ver.2 어휘 데이터:', editableVocabulary);
            console.log('문단 텍스트:', paragraph.substring(0, 100));
            
            // 어휘 용어들을 추출하고 길이순으로 정렬 (긴 것부터)
            const vocabTerms = editableVocabulary
              .map((vocab, vocabIndex) => ({
                vocab: vocab,
                term: extractTermFromVocab(vocab),
                index: vocabIndex
              }))
              .filter(item => item.term && item.term.length > 1)
              .sort((a, b) => b.term.length - a.term.length); // 길이 내림차순 정렬
            
            console.log('길이순 정렬된 어휘 용어들:', vocabTerms.map(item => item.term));
            
            // 길이가 긴 용어부터 하이라이트 적용
            vocabTerms.forEach((vocabItem) => {
              const term = vocabItem.term;
              console.log('어휘 ' + (vocabItem.index + 1) + ': "' + vocabItem.vocab + '" -> 용어: "' + term + '" (길이: ' + term.length + ')');
              
              // 정규식을 사용하여 용어를 찾고 스타일 적용 (대소문자 구분 없이)
              const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const regex = new RegExp('(' + escapedTerm + ')', 'gi');
              const beforeReplace = highlightedParagraph;
              highlightedParagraph = highlightedParagraph.replace(regex, '<strong style="color: #2563eb; font-weight: bold;">$1</strong>');
              
              if (beforeReplace !== highlightedParagraph) {
                console.log('"' + term + '" 용어가 문단에서 발견되어 하이라이트됨');
              }
            });
            
            return '<div class="paragraph">' +
              '<span class="paragraph-number">[' + (index + 1) + ']</span>' +
              highlightedParagraph +
              '</div>';
          })
          .join('')}
      </div>
    </div>

    <!-- 어휘 탭 -->
    <div id="vocabulary-list-tab" class="tab-content">
      <h2 style="color: #2c3e50; margin-bottom: 30px;">📚 핵심 어휘</h2>
      <div class="vocabulary-grid">
        ${editableVocabulary.map((vocab, index) => {
          // 기본적인 어휘 형식: "용어: 정의"
          const simpleMatch = vocab.match(/^([^:]+):\s*(.+)$/);
          if (simpleMatch) {
            const term = simpleMatch[1].trim();
            const definition = simpleMatch[2].trim();
            
            // 예시 부분을 분리 (간단한 문자열 처리)
            let mainDefinition = definition;
            let example = '';
            
            // 괄호 안에 예시가 있는 경우 분리
            const lastParenStart = definition.lastIndexOf('(');
            const lastParenEnd = definition.lastIndexOf(')');
            
            if (lastParenStart !== -1 && lastParenEnd !== -1 && lastParenStart < lastParenEnd) {
              const potentialExample = definition.substring(lastParenStart + 1, lastParenEnd);
              // 예시:, 예: 등이 포함된 경우만 분리
              if (potentialExample.includes('예시:') || potentialExample.includes('예:')) {
                mainDefinition = definition.substring(0, lastParenStart).trim();
                example = potentialExample;
              }
            }
            
            // 예시 문구에서 해당 어휘 용어를 하이라이트 처리
            let highlightedExample = example;
            if (example && term && term.length > 1) {
              const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const regex = new RegExp('(' + escapedTerm + ')', 'gi');
              highlightedExample = example.replace(regex, '<strong style="color: #2563eb; font-weight: bold;">$1</strong>');
            }
            
            return '<div class="vocabulary-card">' +
              '<div class="vocabulary-term">[어휘 ' + (index + 1) + '] - ' + term + '</div>' +
              '<div class="vocabulary-definition">' + mainDefinition + '</div>' +
              (example ? '<div class="vocabulary-example" style="margin-top: 8px; font-style: italic; color: #6c757d;">(' + highlightedExample + ')</div>' : '') +
              '</div>';
          }
          // 매칭되지 않으면 전체 텍스트를 표시
          return `
            <div class="vocabulary-card">
              <div class="vocabulary-term">[어휘 ${index + 1}]</div>
              <div class="vocabulary-definition">${vocab}</div>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- 어휘 문제 탭 -->
    <div id="vocabulary-tab" class="tab-content">
      <h2 style="color: #2c3e50; margin-bottom: 30px;">📝 어휘 문제</h2>
      ${editableVocabQuestions.map((question, index) => `
        <div class="question-container">
          <div class="question-header">
            <span class="question-number">어휘 문제 ${index + 1}</span>
            <span class="question-type">${question.term}</span>
          </div>
          <div class="question-text">${question.question}</div>
          <div class="options">
            ${question.options.map((option, optIndex) => `
              <div class="option ${option === (question.correctAnswer || question.answer) ? 'correct-answer' : ''}" style="margin-bottom: 10px; padding: 10px 15px; background-color: ${option === (question.correctAnswer || question.answer) ? '#e8f5e8' : 'white'}; border: 1px solid #dee2e6; border-radius: 5px; transition: background-color 0.2s;">
                ${optIndex + 1}. ${option} ${option === (question.correctAnswer || question.answer) ? ' ✓' : ''}
              </div>
            `).join('')}
          </div>
          <div class="answer-section">
            <div class="explanation" style="margin-top: 15px; padding: 15px; background-color: #f0f8ff; border-radius: 5px; border-left: 4px solid #3498db;">
              <strong>해설:</strong> ${question.explanation}
            </div>
          </div>
        </div>
      `).join('')}
    </div>

    <!-- 문단 문제 탭 -->
    <div id="paragraph-tab" class="tab-content">
      <h2 style="color: #2c3e50; margin-bottom: 30px;">📖 문단별 문제</h2>
      ${Object.entries(paragraphQuestionsByParagraph).sort(([a], [b]) => Number(a) - Number(b)).map(([paragraphNumber, questions]) => `
        <div style="margin-bottom: 40px;">
          <div style="background-color: #2c3e50; color: white; padding: 18px 24px; border-radius: 8px; margin-bottom: 25px; border-bottom: 3px solid #1a252f;">
            <h3 style="margin: 0; font-size: 18px; font-weight: bold; text-align: center;">
              📖 ${paragraphNumber}문단 문제 (${questions.length}개)
            </h3>
          </div>
          
          <!-- 문단 내용 표시 -->
          <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #3b82f6;">
            <div style="font-weight: bold; color: #1e40af; margin-bottom: 12px; font-size: 16px;">📖 ${paragraphNumber}문단 내용:</div>
            <div style="color: #334155; line-height: 1.6; font-size: 14px;">
              ${editablePassage.paragraphs[parseInt(paragraphNumber) - 1] || '해당 문단 내용을 찾을 수 없습니다.'}
            </div>
          </div>
          
          ${questions.map(q => `
            <div class="question-container">
              <div class="question-header">
                <span class="question-number">문단 문제 ${q.question_number || q.questionNumber}</span>
                <span class="question-type">${q.question_type || q.questionType}</span>
              </div>
              
              <!-- 관련 문단 번호 -->
              <div style="margin: 10px 0; padding: 8px 12px; background-color: #f8f9fa; border-left: 3px solid #6c757d; font-weight: bold;">
                📖 관련 문단: ${q.paragraph_number || q.paragraphNumber}번
              </div>
              
              <!-- 문제 텍스트 -->
              <div class="question-text" style="margin: 15px 0; font-weight: bold;">${q.question}</div>
              
              <!-- 문제 유형별 추가 정보 (어절들, 선택지) -->
              ${(q.question_type || q.questionType) === '어절 순서 맞추기' ? `
                <div style="margin: 15px 0; padding: 10px; background-color: #fff3cd; border-radius: 6px; border-left: 4px solid #ffc107;">
                  <strong>어절 목록:</strong> ${(q.wordSegments || q.word_segments || []).join(', ')}
                </div>
              ` : ''}
              
              ${q.options && q.options.length > 0 && (q.question_type || q.questionType) !== '어절 순서 맞추기' ? (
                (q.question_type || q.questionType) === 'OX문제' ? `
                  <div class="options" style="margin: 15px 0;">
                    <div style="font-weight: bold; margin-bottom: 10px;">선택지:</div>
                    ${q.options.slice(0, 2).map((option, optIndex) => `
                      <div class="option" style="margin-bottom: 8px; padding: 8px 12px; background-color: white; border: 1px solid #dee2e6; border-radius: 4px;">
                        ${optIndex + 1}. ${option}
                      </div>
                    `).join('')}
                  </div>
                ` : `
                  <div class="options" style="margin: 15px 0;">
                    <div style="font-weight: bold; margin-bottom: 10px;">선택지:</div>
                    ${q.options.map((option, optIndex) => `
                      <div class="option" style="margin-bottom: 8px; padding: 8px 12px; background-color: white; border: 1px solid #dee2e6; border-radius: 4px;">
                        ${optIndex + 1}. ${option}
                      </div>
                    `).join('')}
                  </div>
                `
              ) : ''}
              
              <!-- 정답 -->
              <div class="correct-answer" style="margin: 15px 0; padding: 10px; border-radius: 6px; background-color: #e8f5e8; border-left: 4px solid #28a745;">
                <strong>정답:</strong> ${q.correct_answer || q.correctAnswer}
              </div>
              
              <!-- 해설 -->
              <div class="answer-section" style="margin: 15px 0; padding: 10px; background-color: #f8f9fa; border-radius: 6px;">
                <div style="font-weight: bold; margin-bottom: 8px;">해설:</div>
                <div class="explanation">${q.explanation}</div>
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
        const setNumber = setKey.split('_')[1]; // set_1_단답형 -> 1
        
        return `
          <div style="margin-bottom: 50px; padding: 25px; background-color: #f0f8ff; border-radius: 10px;">
            <h3 style="color: #2980b9; margin-bottom: 25px;">종합 문제 세트 ${setNumber}: ${mainQuestion?.questionType || mainQuestion?.question_type || mainQuestion?.type || '알 수 없음'}</h3>
            
            ${mainQuestion ? `
              <div class="question-container" style="border: 2px solid #3498db;">
                <div class="question-header">
                  <span class="question-number" style="background: #2980b9;">기본 문제</span>
                  <span class="question-type">${mainQuestion.questionType || mainQuestion.type}</span>
                </div>
                <div class="question-text">${mainQuestion.question}</div>
                ${mainQuestion.options && mainQuestion.options.length > 0 ? (
                  (mainQuestion.questionType || mainQuestion.type) === 'OX문제' ? `
                    <div class="options">
                      ${mainQuestion.options.slice(0, 2).map((option, optIndex) => `
                        <div class="option ${(optIndex + 1).toString() === (mainQuestion.correctAnswer || mainQuestion.answer) ? 'correct-answer' : ''}" style="margin-bottom: 10px; padding: 10px 15px; background-color: ${(optIndex + 1).toString() === (mainQuestion.correctAnswer || mainQuestion.answer) ? '#e8f5e8' : 'white'}; border: 1px solid #dee2e6; border-radius: 5px;">
                          ${optIndex + 1}. ${option} ${(optIndex + 1).toString() === (mainQuestion.correctAnswer || mainQuestion.answer) ? ' ✓' : ''}
                        </div>
                      `).join('')}
                    </div>
                  ` : `
                    <div class="options">
                      ${mainQuestion.options.map((option, optIndex) => `
                        <div class="option ${(optIndex + 1).toString() === (mainQuestion.correctAnswer || mainQuestion.answer) ? 'correct-answer' : ''}" style="margin-bottom: 10px; padding: 10px 15px; background-color: ${(optIndex + 1).toString() === (mainQuestion.correctAnswer || mainQuestion.answer) ? '#e8f5e8' : 'white'}; border: 1px solid #dee2e6; border-radius: 5px;">
                          ${optIndex + 1}. ${option} ${(optIndex + 1).toString() === (mainQuestion.correctAnswer || mainQuestion.answer) ? ' ✓' : ''}
                        </div>
                      `).join('')}
                    </div>
                  `
                ) : `
                  <div class="correct-answer" style="margin: 10px 0; padding: 10px; border-radius: 6px; background-color: #e8f5e8;">
                    <strong>정답:</strong> ${mainQuestion.correctAnswer || mainQuestion.answer}
                  </div>
                `}
                <div class="answer-section">
                  <div class="explanation">${mainQuestion.explanation}</div>
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
                      <span class="question-type">${q.questionType || q.type}</span>
                    </div>
                    <div class="question-text">${q.question}</div>
                    ${q.options && q.options.length > 0 ? (
                      (q.questionType || q.type) === 'OX문제' ? `
                        <div class="options">
                          ${q.options.slice(0, 2).map((option, optIndex) => `
                            <div class="option ${(optIndex + 1).toString() === (q.correctAnswer || q.answer) ? 'correct-answer' : ''}" style="margin-bottom: 10px; padding: 10px 15px; background-color: ${(optIndex + 1).toString() === (q.correctAnswer || q.answer) ? '#e8f5e8' : 'white'}; border: 1px solid #dee2e6; border-radius: 5px;">
                              ${optIndex + 1}. ${option} ${(optIndex + 1).toString() === (q.correctAnswer || q.answer) ? ' ✓' : ''}
                            </div>
                          `).join('')}
                        </div>
                      ` : `
                        <div class="options">
                          ${q.options.map((option, optIndex) => `
                            <div class="option ${(optIndex + 1).toString() === (q.correctAnswer || q.answer) ? 'correct-answer' : ''}" style="margin-bottom: 10px; padding: 10px 15px; background-color: ${(optIndex + 1).toString() === (q.correctAnswer || q.answer) ? '#e8f5e8' : 'white'}; border: 1px solid #dee2e6; border-radius: 5px;">
                              ${optIndex + 1}. ${option} ${(optIndex + 1).toString() === (q.correctAnswer || q.answer) ? ' ✓' : ''}
                            </div>
                          `).join('')}
                        </div>
                      `
                    ) : `
                      <div class="correct-answer" style="margin: 10px 0; padding: 10px; border-radius: 6px; background-color: #e8f5e8;">
                        <strong>정답:</strong> ${q.correctAnswer || q.answer}
                      </div>
                    `}
                    <div class="answer-section">
                      <div class="explanation">${q.explanation}</div>
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
      <div id="image-gallery" class="image-gallery">
        <div class="no-images">
          <p>이미지를 찾고 있습니다...</p>
          <p style="margin-top: 10px; font-size: 0.9em;">HTML 파일과 같은 폴더에 있는 '${String(contentSet.setId || contentSet.id || 'content')}' ID가 포함된 이미지 파일을 표시합니다.</p>
        </div>
      </div>
    </div>
  </div>

  <script>
    // 탭 전환 함수
    function showTab(tabName) {
      // 모든 탭과 콘텐츠 숨기기
      const tabs = document.querySelectorAll('.tab');
      const contents = document.querySelectorAll('.tab-content');
      
      tabs.forEach(tab => tab.classList.remove('active'));
      contents.forEach(content => content.classList.remove('active'));
      
      // 선택된 탭과 콘텐츠 표시
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
        'paragraph': '문단 문제',
        'comprehensive': '종합 문제',
        'images': '시각자료'
      };
      return tabTexts[tabName] || '';
    }

    // 이미지 로드 함수
    async function loadImages() {
      const contentSetId = '${String(contentSet.setId || contentSet.id || 'content')}';
      const imageGallery = document.getElementById('image-gallery');
      const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
      const foundImages = [];
      
      // 가능한 이미지 파일 패턴들
      const imagePatterns = [
        contentSetId,  // 기본 파일명
        contentSetId + '_1',
        contentSetId + '_2',
        contentSetId + '_3',
        contentSetId + '_4',
        contentSetId + '_5'
      ];
      
      // 각 패턴과 확장자 조합 시도
      for (const pattern of imagePatterns) {
        for (const ext of imageExtensions) {
          const filename = pattern + '.' + ext;
          try {
            const img = new Image();
            img.src = filename;
            
            await new Promise((resolve, reject) => {
              img.onload = () => {
                foundImages.push({ src: filename, element: img });
                resolve();
              };
              img.onerror = reject;
              
              // 타임아웃 설정
              setTimeout(reject, 1000);
            }).catch(() => {});
          } catch (e) {}
        }
      }
      
      // 이미지 표시
      if (foundImages.length > 0) {
        imageGallery.innerHTML = foundImages.map(({ src }) => \`
          <div class="image-container">
            <img src="\${src}" alt="콘텐츠 관련 이미지" />
            <div class="image-filename">\${src}</div>
          </div>
        \`).join('');
      } else {
        imageGallery.innerHTML = \`
          <div class="no-images">
            <p>시각자료를 찾을 수 없습니다.</p>
            <p style="margin-top: 10px; font-size: 0.9em;">
              HTML 파일과 같은 폴더에 다음과 같은 형식의 이미지 파일을 추가해주세요:<br>
              \${contentSetId}.png, \${contentSetId}.jpg, \${contentSetId}_1.png 등
            </p>
          </div>
        \`;
      }
    }
    
    // 페이지 로드 시 이미지 로드
    window.addEventListener('DOMContentLoaded', loadImages);
  </script>
</body>
</html>
    `;

    // HTML 파일 다운로드
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${String(contentSet.setId || contentSet.id || 'content')}_v2.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 지문 편집 함수들
  const handleTitleChange = (newTitle: string) => {
    setEditablePassage(prev => ({ ...prev, title: newTitle }));
  };

  const handleParagraphChange = (index: number, newContent: string) => {
    setEditablePassage(prev => ({
      ...prev,
      paragraphs: prev.paragraphs.map((p, i) => i === index ? newContent : p)
    }));
  };

  const addParagraph = () => {
    setEditablePassage(prev => ({
      ...prev,
      paragraphs: [...prev.paragraphs, '새로운 단락을 입력하세요.']
    }));
  };

  const removeParagraph = (index: number) => {
    if (editablePassage.paragraphs.length <= 1) {
      alert('최소 1개의 단락은 있어야 합니다.');
      return;
    }
    setEditablePassage(prev => ({
      ...prev,
      paragraphs: prev.paragraphs.filter((_, i) => i !== index)
    }));
  };

  // 어휘 편집 함수들
  const handleVocabularyChange = (index: number, newContent: string) => {
    setEditableVocabulary(prev => prev.map((v, i) => i === index ? newContent : v));
  };

  const addVocabulary = () => {
    setEditableVocabulary(prev => [...prev, '새 용어: 설명 (예시: 예시문장)']);
  };

  const removeVocabulary = (index: number) => {
    setEditableVocabulary(prev => prev.filter((_, i) => i !== index));
  };

  // 어휘문제 편집 함수들
  const handleVocabQuestionChange = (index: number, field: keyof VocabularyQuestion, value: string | string[]) => {
    setEditableVocabQuestions(prev => prev.map((q, i) => 
      i === index ? { ...q, [field]: value } : q
    ));
  };

  const addVocabQuestion = () => {
    const newQuestion: VocabularyQuestion = {
      id: '',
      questionId: `vocab_${Date.now()}`,
      term: '새 용어',
      question: '새 질문을 입력하세요.',
      options: ['선택지 1', '선택지 2', '선택지 3', '선택지 4', '선택지 5'],
      correctAnswer: '선택지 1',
      explanation: '해설을 입력하세요.'
    };
    setEditableVocabQuestions(prev => [...prev, newQuestion]);
  };

  const removeVocabQuestion = (index: number) => {
    setEditableVocabQuestions(prev => prev.filter((_, i) => i !== index));
  };

  // 문단문제 편집 함수들
  const handleParagraphQuestionChange = (index: number, field: keyof ParagraphQuestion, value: string | string[]) => {
    setEditableParagraphQuestions(prev => prev.map((q, i) => 
      i === index ? { ...q, [field]: value } : q
    ));
  };

  const addParagraphQuestion = () => {
    const newQuestion: ParagraphQuestion = {
      id: '',
      questionId: `paragraph_${Date.now()}`,
      questionNumber: editableParagraphQuestions.length + 1,
      questionType: '빈칸 채우기',
      paragraphNumber: 1,
      paragraphText: '문단 내용을 입력하세요.',
      question: '새 문단 문제를 입력하세요.',
      options: ['선택지 1', '선택지 2', '선택지 3', '선택지 4', '선택지 5'],
      correctAnswer: '1',
      answerInitials: '', // 초성 힌트 기본값
      explanation: '해설을 입력하세요.'
    };
    setEditableParagraphQuestions(prev => [...prev, newQuestion]);
  };

  const removeParagraphQuestion = (index: number) => {
    setEditableParagraphQuestions(prev => prev.filter((_, i) => i !== index));
  };

  // 종합문제 편집 함수들
  const handleComprehensiveChange = (index: number, field: keyof ComprehensiveQuestion, value: string | string[] | boolean) => {
    setEditableComprehensive(prev => prev.map((q, i) => 
      i === index ? { ...q, [field]: value } : q
    ));
  };

  const addComprehensiveQuestion = () => {
    const baseId = `comp_${Date.now()}`;

    
    // 기본 문제 생성 (original_question_id를 자신의 questionId로 설정)
    const mainQuestion: ComprehensiveQuestion = {
      id: '',
      questionId: baseId,
      questionType: '단답형',
      question: '새 질문을 입력하세요.',
      questionFormat: 'short_answer',
      correctAnswer: '정답을 입력하세요.',
      answerInitials: '', // 초성 힌트 기본값
      explanation: '해설을 입력하세요.',
      isSupplementary: false,
      originalQuestionId: baseId, // 기본문제도 original_question_id 설정
      questionSetNumber: 1
    };
    
    // 보완 문제 2개 생성 (같은 original_question_id 사용)
    const supplementary1: ComprehensiveQuestion = {
      id: '',
      questionId: `${baseId}_supp1`,
      questionType: '단답형',
      question: '보완 질문 1을 입력하세요.',
      questionFormat: 'short_answer',
      correctAnswer: '정답을 입력하세요.',
      answerInitials: '', // 초성 힌트 기본값
      explanation: '해설을 입력하세요.',
      isSupplementary: true,
      originalQuestionId: baseId, // 기본문제와 같은 original_question_id
      questionSetNumber: 1
    };
    
    const supplementary2: ComprehensiveQuestion = {
      id: '',
      questionId: `${baseId}_supp2`,
      questionType: '단답형',
      question: '보완 질문 2를 입력하세요.',
      questionFormat: 'short_answer',
      correctAnswer: '정답을 입력하세요.',
      answerInitials: '', // 초성 힌트 기본값
      explanation: '해설을 입력하세요.',
      isSupplementary: true,
      originalQuestionId: baseId, // 기본문제와 같은 original_question_id
      questionSetNumber: 1
    };
    
    setEditableComprehensive(prev => [...prev, mainQuestion, supplementary1, supplementary2]);
  };

  const removeComprehensiveQuestion = (index: number) => {
    setEditableComprehensive(prev => prev.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">데이터를 로드하는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 text-center max-w-md">
          <div className="text-red-600 mb-4">⚠️ 오류가 발생했습니다</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="flex space-x-4 justify-center">
            <button
              onClick={() => fetchSetDetails(setId)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              다시 시도
            </button>
            <button
              onClick={() => window.close()}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
            >
              창 닫기
            </button>
          </div>
        </div>
      </div>
    );
  }

  const setDetails = data?.data?.contentSet;
  
  // 데이터가 없으면 오류 처리
  if (!setDetails) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 text-center max-w-md">
          <div className="text-red-600 mb-4">⚠️ 데이터를 찾을 수 없습니다</div>
          <p className="text-gray-600 mb-4">콘텐츠 세트 정보를 불러올 수 없습니다.</p>
          <div className="flex space-x-4 justify-center">
            <button
              onClick={() => fetchSetDetails(setId)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              다시 시도
            </button>
            <button
              onClick={() => window.close()}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
            >
              창 닫기
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* 페이지 헤더 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => window.close()} 
                className="text-blue-600 hover:text-blue-800 flex items-center"
              >
                <span className="mr-1">←</span>
                <span>창 닫기</span>
              </button>
              <div className="h-4 w-px bg-gray-300"></div>
              <h1 className="text-xl font-bold text-gray-900">{data?.data?.contentSet?.passageTitle || '제목 없음'}</h1>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleHtmlDownload}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                html v1
              </button>
              <button
                onClick={handleHtmlDownloadV2}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                html v2
              </button>
              <button
                onClick={handleTxtDownload}
                className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
              >
                txt
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {saving ? '저장 중...' : '수정 저장'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 기본 정보 카드 */}
        <div className="bg-white rounded-lg shadow mb-8 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">교육과정 정보</h3>
              <p className="text-sm text-gray-900">{setDetails.division}</p>
              <p className="text-sm text-gray-600">{setDetails.subject} · {setDetails.grade} · {setDetails.area}</p>
              <p className="text-xs text-gray-500 mt-1">{setDetails.mainTopic || setDetails.maintopic} &gt; {setDetails.subTopic || setDetails.subtopic}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">핵심 개념어</h3>
              <p className="text-sm text-gray-900">{setDetails.keywords || setDetails.keyword}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">지문 길이</h3>
              <p className="text-sm text-gray-900">{setDetails.passageLength || '정보 없음'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">지문 유형</h3>
              <p className="text-sm text-gray-900">{setDetails.textType || '선택 안함'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">생성 정보</h3>
              <p className="text-sm text-gray-900">{setDetails.createdAt ? formatDate(setDetails.createdAt) : '정보 없음'}</p>
              <p className="text-xs text-gray-500 mt-1">ID: {setDetails.setId || setDetails.id || 'N/A'}</p>
            </div>
          </div>
        </div>
        
        {/* 탭 네비게이션 */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              <button
                onClick={() => setActiveTab('passage')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'passage'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                지문
              </button>
              <button
                onClick={() => setActiveTab('vocabulary')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'vocabulary'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                어휘 ({editableVocabulary.length})
              </button>
              <button
                onClick={() => setActiveTab('vocab-questions')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'vocab-questions'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                어휘문제 ({editableVocabQuestions.length})
              </button>
              <button
                onClick={() => setActiveTab('paragraph-questions')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'paragraph-questions'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                문단문제 ({setDetails?.total_paragraph_questions || 0})
              </button>
              <button
                onClick={() => setActiveTab('comprehensive')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'comprehensive'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                종합문제 ({editableComprehensive.length})
              </button>
            </nav>
          </div>
          
          <div className="p-6">
            {/* 지문 탭 */}
            {activeTab === 'passage' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">제목</label>
                  <input
                    type="text"
                    value={editablePassage.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <label className="block text-sm font-medium text-gray-700">단락</label>
                    <button
                      onClick={addParagraph}
                      className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-sm"
                    >
                      + 단락 추가
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {editablePassage.paragraphs.map((paragraph, index) => (
                      <div key={index} className="relative">
                        <div className="flex justify-between items-start mb-2">
                          <label className="text-sm font-medium text-gray-600">단락 {index + 1}</label>
                          <button
                            onClick={() => removeParagraph(index)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            삭제
                          </button>
                        </div>
                        <textarea
                          value={paragraph}
                          onChange={(e) => handleParagraphChange(index, e.target.value)}
                          rows={4}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* 어휘 탭 */}
            {activeTab === 'vocabulary' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">용어 설명</h3>
                  <button
                    onClick={addVocabulary}
                    className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-sm"
                  >
                    + 용어 추가
                  </button>
                </div>
                
                <div className="space-y-4">
                  {editableVocabulary.map((vocab, index) => {
                    // 개선된 파싱 로직
                    const parseVocabulary = (vocabString: string) => {
                      console.log(`어휘 ${index + 1} 파싱 시도:`, vocabString);
                      
                      // 패턴 1: "용어: 설명 (예시: 예시문장)"
                      const fullMatch = vocabString.match(/^([^:]+):\s*(.+?)\s*\(예시:\s*(.+?)\)\s*$/);
                      if (fullMatch) {
                        const result = {
                          term: fullMatch[1].trim(),
                          description: fullMatch[2].trim(),
                          example: fullMatch[3].trim()
                        };
                        console.log('전체 패턴 매치:', result);
                        return result;
                      }
                      
                      // 패턴 2: "용어: 설명 (예시:" (닫는 괄호가 없는 경우 - 기존 잘못 저장된 데이터 처리)
                      const incompleteMatch = vocabString.match(/^([^:]+):\s*(.+?)\s*\(예시:\s*(.*)$/);
                      if (incompleteMatch) {
                        // (예시: 부분을 제거하고 설명만 사용
                        const cleanDescription = incompleteMatch[2].trim();
                        const result = {
                          term: incompleteMatch[1].trim(),
                          description: cleanDescription,
                          example: incompleteMatch[3].trim() || '' // 예시 부분이 있다면 사용
                        };
                        console.log('불완전 패턴 매치 (정리됨):', result);
                        return result;
                      }
                      
                      // 패턴 3: "용어: 설명 (예시" (예시 부분이 잘린 경우 - 기존 잘못 저장된 데이터)
                      const truncatedMatch = vocabString.match(/^([^:]+):\s*(.+?)\s*\(예시\s*$/);
                      if (truncatedMatch) {
                        const result = {
                          term: truncatedMatch[1].trim(),
                          description: truncatedMatch[2].trim(),
                          example: ''
                        };
                        console.log('잘린 예시 패턴 매치:', result);
                        return result;
                      }
                      
                      // 패턴 4: "용어: 설명"
                      const simpleMatch = vocabString.match(/^([^:]+):\s*(.+)$/);
                      if (simpleMatch) {
                        // 설명 부분에서 (예시: 부분을 분리 시도
                        const desc = simpleMatch[2].trim();
                        const exampleMatch = desc.match(/^(.+?)\s*\(예시:\s*(.*)$/);
                        if (exampleMatch) {
                          const result = {
                            term: simpleMatch[1].trim(),
                            description: exampleMatch[1].trim(),
                            example: exampleMatch[2].trim()
                          };
                          console.log('설명에서 예시 분리:', result);
                          return result;
                        } else {
                          const result = {
                            term: simpleMatch[1].trim(),
                            description: desc,
                            example: ''
                          };
                          console.log('단순 패턴 매치:', result);
                          return result;
                        }
                      }
                      
                      // 파싱 실패 시 기본값
                      const result = {
                        term: vocabString.trim() || '용어',
                        description: '',
                        example: ''
                      };
                      console.log('파싱 실패, 기본값 사용:', result);
                      return result;
                    };
                    
                    const { term, description, example } = parseVocabulary(vocab);
                    
                    const updateVocabulary = (newTerm: string, newDescription: string, newExample: string) => {
                      const newVocab = newExample 
                        ? `${newTerm}: ${newDescription} (예시: ${newExample})`
                        : `${newTerm}: ${newDescription}`;
                      handleVocabularyChange(index, newVocab);
                    };
                    
                    return (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <label className="text-sm font-medium text-gray-600">용어 {index + 1}</label>
                          <button
                            onClick={() => removeVocabulary(index)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            삭제
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">용어</label>
                            <input
                              type="text"
                              value={term}
                              onChange={(e) => updateVocabulary(e.target.value, description, example)}
                              className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">설명</label>
                            <input
                              type="text"
                              value={description}
                              onChange={(e) => updateVocabulary(term, e.target.value, example)}
                              className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">예시문장</label>
                            <input
                              type="text"
                              value={example}
                              onChange={(e) => updateVocabulary(term, description, e.target.value)}
                              className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* 어휘문제 탭 */}
            {activeTab === 'vocab-questions' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">어휘 문제</h3>
                  <button
                    onClick={addVocabQuestion}
                    className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-sm"
                  >
                    + 문제 추가
                  </button>
                </div>
                
                <div className="space-y-6">
                  {editableVocabQuestions.map((question, index) => (
                    <div key={question.questionId} className="border border-gray-200 rounded-lg p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-lg font-medium text-gray-900">문제 {index + 1}</h4>
                        <button
                          onClick={() => removeVocabQuestion(index)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          삭제
                        </button>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">어휘</label>
                            <input
                              type="text"
                              value={question.term}
                              onChange={(e) => handleVocabQuestionChange(index, 'term', e.target.value)}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">정답</label>
                            <select
                              value={question.correctAnswer || question.answer}
                              onChange={(e) => handleVocabQuestionChange(index, 'correctAnswer', e.target.value)}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                                          {question.options.map((option, optIndex) => (
                              <option key={`${question.questionId}-opt-${optIndex}`} value={option}>{optIndex + 1}. {option}</option>
                            ))}
                            </select>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">질문</label>
                          <textarea
                            value={question.question}
                            onChange={(e) => handleVocabQuestionChange(index, 'question', e.target.value)}
                            rows={2}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">선택지</label>
                          <div className="space-y-2">
                            {question.options.map((option, optIndex) => (
                              <div key={`${question.questionId}-option-${optIndex}`} className="flex items-center space-x-2">
                                <span className="text-sm font-medium w-6">{optIndex + 1}.</span>
                                <input
                                  type="text"
                                  value={option}
                                  onChange={(e) => {
                                    const newOptions = [...question.options];
                                    newOptions[optIndex] = e.target.value;
                                    handleVocabQuestionChange(index, 'options', newOptions);
                                  }}
                                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">해설</label>
                          <textarea
                            value={question.explanation}
                            onChange={(e) => handleVocabQuestionChange(index, 'explanation', e.target.value)}
                            rows={3}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* 문단문제 탭 */}
            {activeTab === 'paragraph-questions' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">문단 문제</h3>
                  <button
                    onClick={addParagraphQuestion}
                    className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-sm"
                  >
                    + 문제 추가
                  </button>
                </div>
                
                {editableParagraphQuestions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    저장된 문단 문제가 없습니다.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {editableParagraphQuestions.map((question, index) => (
                      <div key={question.questionId || question.id} className="border border-gray-200 rounded-lg p-6">
                        <div className="flex justify-between items-center mb-4">
                          <div>
                            <h4 className="text-lg font-medium text-gray-900">문제 {index + 1}</h4>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                {question.questionType}
                              </span>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                문단 {question.paragraphNumber}번
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => removeParagraphQuestion(index)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            삭제
                          </button>
                        </div>
                        
                        <div className="space-y-4">
                          {/* 1. 문제 유형과 관련 문단 번호 */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">문제 유형</label>
                              <select
                                value={question.questionType}
                                onChange={(e) => handleParagraphQuestionChange(index, 'questionType', e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              >
                                <option value="빈칸 채우기">빈칸 채우기</option>
                                <option value="주관식 단답형">주관식 단답형</option>
                                <option value="어절 순서 맞추기">어절 순서 맞추기</option>
                                <option value="OX문제">OX문제</option>
                                <option value="유의어 고르기">유의어 고르기</option>
                                <option value="반의어 고르기">반의어 고르기</option>
                                <option value="문단 요약">문단 요약</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">관련 문단 번호</label>
                              <input
                                type="number"
                                min="1"
                                max="10"
                                value={question.paragraphNumber}
                                onChange={(e) => handleParagraphQuestionChange(index, 'paragraphNumber', parseInt(e.target.value) || 1)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                          </div>
                          
                          {/* 2. 관련 문단 내용 */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">관련 문단 내용</label>
                            <textarea
                              value={question.paragraphText}
                              onChange={(e) => handleParagraphQuestionChange(index, 'paragraphText', e.target.value)}
                              rows={4}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          
                          {/* 3. 문제 텍스트 */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">문제</label>
                            <textarea
                              value={question.question}
                              onChange={(e) => handleParagraphQuestionChange(index, 'question', e.target.value)}
                              rows={3}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>

                          {/* 4. 어절들 (어절 순서 맞추기 문제만) */}
                          {question.questionType === '어절 순서 맞추기' && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                어절 목록 <span className="text-gray-500 text-xs">(쉼표로 구분)</span>
                              </label>
                              <input
                                type="text"
                                value={(question.wordSegments || []).join(', ')}
                                onChange={(e) => {
                                  const segments = e.target.value.split(',').map(s => s.trim()).filter(s => s);
                                  handleParagraphQuestionChange(index, 'wordSegments', segments);
                                }}
                                placeholder="어절들을 쉼표로 구분하여 입력하세요 (예: 사랑하는, 우리, 가족)"
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                          )}
                          
                          {/* 5. 선택지 (객관식 문제만, 어절 순서 맞추기 제외) */}
                          {question.questionType !== '주관식 단답형' && question.questionType !== '어절 순서 맞추기' && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">선택지</label>
                              <div className="space-y-2">
                                {question.options.map((option, optionIndex) => (
                                  <div key={optionIndex} className="flex items-center space-x-2">
                                    <span className="w-8 text-sm font-medium text-gray-600">{optionIndex + 1}.</span>
                                    <input
                                      type="text"
                                      value={option}
                                      onChange={(e) => {
                                        const newOptions = [...question.options];
                                        newOptions[optionIndex] = e.target.value;
                                        handleParagraphQuestionChange(index, 'options', newOptions);
                                      }}
                                      className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    {(optionIndex + 1).toString() === question.correctAnswer && (
                                      <span className="text-green-600 font-medium text-sm">✓ 정답</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 6. 정답 */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">정답</label>
                            {(question.questionType === '주관식 단답형' || question.questionType === '어절 순서 맞추기') ? (
                              <textarea
                                value={question.correctAnswer}
                                onChange={(e) => handleParagraphQuestionChange(index, 'correctAnswer', e.target.value)}
                                rows={2}
                                placeholder={question.questionType === '어절 순서 맞추기' ? "올바른 어절 순서를 입력하세요" : "단답형 정답을 입력하세요"}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            ) : (
                              <select
                                value={question.correctAnswer}
                                onChange={(e) => handleParagraphQuestionChange(index, 'correctAnswer', e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              >
                                {question.options.map((option, optIndex) => (
                                  <option key={optIndex} value={(optIndex + 1).toString()}>
                                    {optIndex + 1}번: {option.length > 20 ? option.substring(0, 20) + '...' : option}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                          
                          {/* 초성 힌트 (단답형 문제만) */}
                          {question.questionType === '주관식 단답형' && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                초성 힌트 <span className="text-gray-500 text-xs">(예: ㄱㄴㄷ)</span>
                              </label>
                              <input
                                type="text"
                                value={question.answerInitials || ''}
                                onChange={(e) => handleParagraphQuestionChange(index, 'answerInitials', e.target.value)}
                                placeholder="정답의 초성을 입력하세요 (예: ㄱㄴㄷ)"
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                          )}
                          
                          {/* 7. 해설 */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">해설</label>
                            <textarea
                              value={question.explanation}
                              onChange={(e) => handleParagraphQuestionChange(index, 'explanation', e.target.value)}
                              rows={3}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* 종합문제 탭 */}
            {activeTab === 'comprehensive' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">종합 문제</h3>
                  <button
                    onClick={addComprehensiveQuestion}
                    className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-sm"
                  >
                    + 문제 세트 추가
                  </button>
                </div>
                
                <div className="space-y-8">
                  {(() => {
                    // 문제를 세트별로 그룹화 (기본문제 1개 + 보완문제 2개 = 1세트)
                    const questionSets: { [key: string]: ComprehensiveQuestion[] } = {};
                    
                    editableComprehensive.forEach(question => {
                      // original_question_id를 기준으로 세트 그룹화
                      const setKey = question.originalQuestionId || question.questionId || 'unknown';
                      
                      // 보완문제의 경우 original_question_id가 세트 키가 됨
                      // 기본문제의 경우 자신의 original_question_id가 세트 키가 됨
                      
                      if (!questionSets[setKey]) {
                        questionSets[setKey] = [];
                      }
                      questionSets[setKey].push(question);
                    });
                    
                    console.log('종합문제 세트 그룹화 결과:', questionSets);

                    // 각 세트를 기본문제 순서로 정렬
                    Object.keys(questionSets).forEach(setKey => {
                      questionSets[setKey].sort((a, b) => {
                        if (!a.isSupplementary && b.isSupplementary) return -1;
                        if (a.isSupplementary && !b.isSupplementary) return 1;
                        return 0;
                      });
                    });

                    return Object.entries(questionSets).map(([setKey, questions], setIndex) => (
                      <div key={setKey} className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
                        <div className="flex justify-between items-center mb-6">
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900">
                              문제 세트 {setIndex + 1} ({questions[0].questionType || questions[0].type})
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">
                              기본문제 {questions.filter(q => !q.isSupplementary).length}개, 
                              보완문제 {questions.filter(q => q.isSupplementary).length}개
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              // 세트 전체 삭제
                              const questionIds = questions.map(q => q.questionId);
                              setEditableComprehensive(prev => 
                                prev.filter(q => !questionIds.includes(q.questionId))
                              );
                            }}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            세트 삭제
                          </button>
                        </div>
                        
                        <div className="space-y-6">
                          {questions.map((question, questionIndex) => {
                            const globalIndex = editableComprehensive.findIndex(q => q.questionId === question.questionId);
                            const isMainQuestion = !question.isSupplementary;
                            
                            // 보완문제 번호 계산 (기본문제 제외하고 카운트)
                            let supplementaryNumber = 0;
                            if (!isMainQuestion) {
                              const supplementaryQuestions = questions.filter(q => q.isSupplementary);
                              supplementaryNumber = supplementaryQuestions.findIndex(q => q.questionId === question.questionId) + 1;
                            }
                            
                            return (
                              <div key={question.questionId} className={`border rounded-lg p-4 ${isMainQuestion ? 'bg-white border-blue-200' : 'bg-blue-50 border-blue-100'}`}>
                                <div className="flex justify-between items-center mb-4">
                                  <div>
                                    <h5 className="text-md font-medium text-gray-900">
                                      {isMainQuestion ? '기본 문제' : `보완 문제 ${supplementaryNumber}`}
                                    </h5>
                                    <div className="flex items-center space-x-2 mt-1">
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                        {question.questionType || question.type}
                                      </span>
                                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        isMainQuestion 
                                          ? 'bg-blue-100 text-blue-800' 
                                          : 'bg-yellow-100 text-yellow-800'
                                      }`}>
                                        {isMainQuestion ? '기본문제' : '보완문제'}
                                      </span>
                                    </div>
                                  </div>
                                  {!isMainQuestion && (
                                    <button
                                      onClick={() => removeComprehensiveQuestion(globalIndex)}
                                      className="text-red-600 hover:text-red-800 text-sm"
                                    >
                                      삭제
                                    </button>
                                  )}
                                </div>
                                
                                <div className="space-y-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">질문</label>
                                    <textarea
                                      value={question.question}
                                      onChange={(e) => handleComprehensiveChange(globalIndex, 'question', e.target.value)}
                                      rows={3}
                                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  </div>
                                  
                                  {question.options && question.options.length > 0 ? (
                                    <div className="space-y-4">
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">선택지</label>
                                        <div className="space-y-2">
                                          {question.options.map((option, optIndex) => (
                                            <div key={`${question.questionId}-comp-option-${optIndex}`} className="flex items-center space-x-2">
                                              <span className="text-sm font-medium w-6">{optIndex + 1}.</span>
                                              <input
                                                type="text"
                                                value={option}
                                                onChange={(e) => {
                                                  const newOptions = [...(question.options || [])];
                                                  newOptions[optIndex] = e.target.value;
                                                  handleComprehensiveChange(globalIndex, 'options', newOptions);
                                                }}
                                                className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                              />
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">정답</label>
                                        <select
                                          value={question.correctAnswer || question.answer}
                                          onChange={(e) => handleComprehensiveChange(globalIndex, 'correctAnswer', e.target.value)}
                                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                          <option value="">정답을 선택하세요</option>
                                          {question.options.map((option, optIndex) => (
                                            <option key={optIndex} value={(optIndex + 1).toString()}>
                                              {optIndex + 1}번: {option.length > 20 ? option.substring(0, 20) + '...' : option}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="space-y-4">
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">정답</label>
                                        <textarea
                                          value={question.correctAnswer || question.answer}
                                          onChange={(e) => handleComprehensiveChange(globalIndex, 'correctAnswer', e.target.value)}
                                          rows={2}
                                          placeholder="단답형 정답을 입력하세요"
                                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                      </div>
                                      
                                      {/* 초성 힌트 (단답형 문제만) */}
                                      {question.questionType === '단답형' && (
                                        <div>
                                          <label className="block text-sm font-medium text-gray-700 mb-1">
                                            초성 힌트 <span className="text-gray-500 text-xs">(예: ㄱㄴㄷ)</span>
                                          </label>
                                          <input
                                            type="text"
                                            value={question.answerInitials || ''}
                                            onChange={(e) => handleComprehensiveChange(globalIndex, 'answerInitials', e.target.value)}
                                            placeholder="정답의 초성을 입력하세요 (예: ㄱㄴㄷ)"
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                          />
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">해설</label>
                                    <textarea
                                      value={question.explanation}
                                      onChange={(e) => handleComprehensiveChange(globalIndex, 'explanation', e.target.value)}
                                      rows={3}
                                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  </div>
                                </div>
                                
                                {isMainQuestion && (
                                  <div className="mt-4 pt-4 border-t border-gray-200">
                                    <button
                                      onClick={() => {
                                        // 보완 문제 추가
                                        const newSupplementary: ComprehensiveQuestion = {
                                          id: '',
                                          questionId: `comp_supp_${Date.now()}`,
                                          questionType: question.questionType || question.type || '단답형',
                                          question: '보완 질문을 입력하세요.',
                                          questionFormat: question.questionFormat || 'short_answer',
                                          options: question.options ? [...question.options] : undefined,
                                          correctAnswer: '',
                                          answerInitials: '', // 초성 힌트 기본값
                                          explanation: '해설을 입력하세요.',
                                          isSupplementary: true,
                                          originalQuestionId: question.questionId,
                                          questionSetNumber: question.questionSetNumber || 1
                                        };
                                        setEditableComprehensive(prev => [...prev, newSupplementary]);
                                      }}
                                      className="bg-yellow-600 text-white px-3 py-1 rounded-md hover:bg-yellow-700 text-sm"
                                    >
                                      + 보완 문제 추가
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 