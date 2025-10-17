'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Header from '@/components/Header';
import RoleAuthGuard from '@/components/RoleAuthGuard';
import { getComprehensiveQuestionTypeLabel, getVocabularyQuestionTypeLabel } from '@/lib/supabase';
import ComprehensiveCSVUploadModal from '@/components/ComprehensiveCSVUploadModal';
import { useScrollPreservation, handleClickWithFocusManagement, handleInputBlurWithScrollCheck } from '@/hooks/useScrollPreservation';

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
  session_number?: string | null; // 차시 번호
  passage_length?: string; // DB 필드명 - 지문 길이
  text_type?: string; // DB 필드명 - 지문 유형
  introduction_question?: string; // 도입 질문
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
  has_question_generated?: boolean; // 어휘 문제 생성 여부 (true: 핵심어, false: 어려운 어휘)
  passage_id?: string; // 어휘가 추출된 지문의 ID
  passage_number?: number; // 지문 번호 (조인된 데이터)
  passage_title?: string; // 지문 제목 (조인된 데이터)
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
    passages: PassageData[]; // 여러 지문 지원
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
  const [activeTab, setActiveTab] = useState<'passage' | 'vocabulary' | 'vocab-questions' | 'paragraph-questions' | 'comprehensive' | 'visual-materials'>('passage');
  const [setId, setSetId] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // 스크롤 보존 Hook 초기화
  const { withScrollPreservation, blurActiveElement, preventAutoScroll, cleanup } = useScrollPreservation();
  
  // 편집 상태
  const [editablePassage, setEditablePassage] = useState<{title: string; paragraphs: string[]}>({title: '', paragraphs: []});
  const [editablePassages, setEditablePassages] = useState<Array<{id?: string; title: string; paragraphs: string[]}>>([]);
  const [currentPassageIndex, setCurrentPassageIndex] = useState(0);
  const [editableVocabulary, setEditableVocabulary] = useState<string[]>([]);
  const [vocabularyTermsData, setVocabularyTermsData] = useState<VocabularyTerm[]>([]);
  const [editableVocabQuestions, setEditableVocabQuestions] = useState<VocabularyQuestion[]>([]);
  const [editableParagraphQuestions, setEditableParagraphQuestions] = useState<ParagraphQuestion[]>([]);
  const [editableComprehensive, setEditableComprehensive] = useState<ComprehensiveQuestion[]>([]);
  const [editableIntroductionQuestion, setEditableIntroductionQuestion] = useState<string>('');
  const [isCSVModalOpen, setIsCSVModalOpen] = useState(false);

  // 시각자료 (이미지) 상태
  const [visualMaterials, setVisualMaterials] = useState<any[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);

  // 이미지 로드 함수
  const fetchVisualMaterials = useCallback(async (sessionNumber: string | null | undefined) => {
    if (!sessionNumber) {
      setVisualMaterials([]);
      return;
    }

    try {
      setLoadingImages(true);
      const response = await fetch(`/api/images?session_number=${encodeURIComponent(sessionNumber)}&visible_only=true`);
      const result = await response.json();

      if (result.success) {
        setVisualMaterials(result.data || []);
      } else {
        console.error('이미지 로드 실패:', result.error);
        setVisualMaterials([]);
      }
    } catch (error) {
      console.error('이미지 로드 오류:', error);
      setVisualMaterials([]);
    } finally {
      setLoadingImages(false);
    }
  }, []);

  const fetchSetDetails = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/get-curriculum-data-supabase?setId=${id}`);
      const result: ApiResponse = await response.json();
      
      console.log('상세보기 API 응답:', result); // 디버깅용 로그
      
      if (result.success && result.data) {
        setData(result);

        // 도입 질문 초기화
        if (result.data?.contentSet?.introduction_question) {
          setEditableIntroductionQuestion(result.data.contentSet.introduction_question);
        }

        // 시각자료 (이미지) 로드
        if (result.data?.contentSet?.session_number) {
          fetchVisualMaterials(result.data.contentSet.session_number);
        }
        
        // 편집 가능한 상태로 초기화
        if (result.data?.passages && result.data.passages.length > 0) {
          // 모든 지문을 저장
          setEditablePassages(result.data.passages.map((p: any) => ({
            id: p.id,
            title: p.title || '',
            paragraphs: [...(p.paragraphs || [])]
          })));
          // 첫 번째 지문을 현재 편집 중인 지문으로 설정
          setEditablePassage({
            title: result.data.passages[0].title || '',
            paragraphs: [...(result.data.passages[0].paragraphs || [])]
          });
        } else if (result.data?.passage) {
          // 기존 호환성 유지 (단일 지문)
          setEditablePassage({
            title: result.data.passage.title || '',
            paragraphs: [...(result.data.passage.paragraphs || [])]
          });
          setEditablePassages([{
            title: result.data.passage.title || '',
            paragraphs: [...(result.data.passage.paragraphs || [])]
          }]);
        }
        
        // Supabase에서는 어휘 용어가 별도 테이블로 분리됨
        console.log('어휘 용어 원본 데이터:', result.data?.vocabularyTerms);
        console.log('어휘 문제 원본 데이터:', result.data?.vocabularyQuestions);
        console.log('종합 문제 원본 데이터:', result.data?.comprehensiveQuestions);
        
        // VocabularyTerm 객체를 직접 사용하여 has_question_generated 필드 보존
        const vocabularyTermsProcessed = (result.data?.vocabularyTerms || []).map((term: any, index) => {
          console.log(`어휘 용어 ${index + 1} 원본:`, term);
          
          if (term && typeof term === 'object' && term.term && term.definition) {
            // VocabularyTerm 객체 구조를 유지 (passage 정보 포함)
            const processedTerm = {
              id: term.id,
              content_set_id: term.content_set_id,
              term: term.term,
              definition: term.definition,
              example_sentence: term.example_sentence || '',
              has_question_generated: term.has_question_generated || false,
              passage_id: term.passage_id, // 지문 ID 추가
              passage_number: term.passage_number, // 지문 번호 추가
              passage_title: term.passage_title, // 지문 제목 추가
              created_at: term.created_at
            };
            console.log(`어휘 용어 ${index + 1} 처리 결과:`, processedTerm);
            return processedTerm;
          }
          // 기존 문자열 형태는 객체로 변환 (fallback)
          const fallbackTerm = typeof term === 'string' ? term : `용어: 정의`;
          const [termPart, definitionPart] = fallbackTerm.split(':').map(s => s.trim());
          const processedFallback = {
            id: `temp-${index}`,
            content_set_id: '',
            term: termPart || '용어',
            definition: definitionPart || '정의',
            example_sentence: '',
            has_question_generated: false,
            created_at: ''
          };
          console.log(`어휘 용어 ${index + 1} fallback 처리:`, processedFallback);
          return processedFallback;
        });
        
        // 이제 VocabularyTerm 배열로 저장
        setEditableVocabulary(vocabularyTermsProcessed.map(term => 
          term.example_sentence 
            ? `${term.term}: ${term.definition} (예시: ${term.example_sentence})`
            : `${term.term}: ${term.definition}`
        ));
        
        // 원본 VocabularyTerm 객체도 별도 상태로 저장
        setVocabularyTermsData(vocabularyTermsProcessed);
        
        // 어휘 문제 데이터 안전하게 처리
        console.log('🔍 원본 vocabularyQuestions 데이터:', result.data?.vocabularyQuestions?.slice(0, 2));
        
        const safeVocabQuestions = (result.data?.vocabularyQuestions || [])
          .filter(q => q && q.id)
          .map((q: any) => {
            console.log('🔄 처리 중인 문제:', {
              id: q.id,
              term: q.term,
              question_type: q.question_type,
              detailed_question_type: q.detailed_question_type,
              difficulty: q.difficulty
            });
            
            return {
              ...q,
              term: q.term || '', // term이 없을 경우 빈 문자열로 설정
              // 🔧 프론트엔드 호환성 필드 매핑
              question: q.question_text || q.question || '',
              correctAnswer: q.correct_answer || q.correctAnswer || '',
              answer: q.correct_answer || q.answer || '',
              options: q.options || [q.option_1, q.option_2, q.option_3, q.option_4, q.option_5].filter(opt => opt && opt.trim() !== '') || [],
              questionType: q.question_type || q.questionType || '객관식',
              detailedQuestionType: q.detailed_question_type || q.detailedQuestionType || '',
              answerInitials: q.answer_initials || q.answerInitials || '',
              // 상세 문제 유형과 난이도 필드 보존
              detailed_question_type: q.detailed_question_type,
              difficulty: q.difficulty
            };
          });
          
        console.log('✅ 최종 safeVocabQuestions:', safeVocabQuestions.slice(0, 2));
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

  // 스크롤 보존 Hook 정리
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);
  
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
  const handleSave = withScrollPreservation(async () => {
    if (!data || !setId) return;
    
    setSaving(true);
    try {
      console.log('수정사항 저장 시작...', {
        contentSetId: setId,
        editableIntroductionQuestion,
        editablePassage,
        editablePassages,
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
          editableIntroductionQuestion,
          editablePassage,
          editablePassages, // 여러 지문 배열도 전송
          editableVocabulary,
          vocabularyTermsData, // 어휘 타입 정보 포함
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
  });

  // 저장 중 로딩 모달 컴포넌트 (Portal 사용)
  const SavingModal = () => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
      setMounted(true);
      return () => setMounted(false);
    }, []);

    if (!saving || !mounted) return null;

    return createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ position: 'fixed' }}>
        {/* 배경 오버레이 */}
        <div className="absolute inset-0 bg-black bg-opacity-70"></div>

        {/* 로딩 내용 */}
        <div className="relative bg-white rounded-lg p-8 shadow-2xl max-w-sm w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-600 border-t-transparent mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">수정사항 저장 중</h3>
            <p className="text-sm text-gray-600 mb-4">
              콘텐츠를 저장하고 있습니다.<br />
              잠시만 기다려 주세요.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-xs text-yellow-800">
                ⚠️ 저장이 완료될 때까지 브라우저를 닫지 마세요.
              </p>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  // 어휘 문제를 어휘별로 그룹화 (React 편집 탭용)
  const vocabularyQuestionsByTermForEdit: { [key: string]: (typeof editableVocabQuestions[0] & {arrayIndex: number})[] } = {};
  editableVocabQuestions.forEach((q, index) => {
    const term = q.term || '미분류';
    if (!vocabularyQuestionsByTermForEdit[term]) {
      vocabularyQuestionsByTermForEdit[term] = [];
    }
    vocabularyQuestionsByTermForEdit[term].push({ ...q, arrayIndex: index });
  });

  // 각 어휘별로 난이도순 정렬 (일반문제 먼저, 보완문제 나중에)
  Object.keys(vocabularyQuestionsByTermForEdit).forEach(term => {
    vocabularyQuestionsByTermForEdit[term].sort((a, b) => {
      // difficulty 또는 question_type을 기준으로 정렬
      const aDifficulty = a.difficulty || a.question_type || '일반';
      const bDifficulty = b.difficulty || b.question_type || '일반';

      // '일반' 또는 '일반' 아닌 다른 값은 앞에, '보완'은 뒤에
      if (aDifficulty === '보완' && bDifficulty !== '보완') return 1;
      if (aDifficulty !== '보완' && bDifficulty === '보완') return -1;

      // 둘 다 같은 카테고리면 배열 순서 유지 (arrayIndex 기준)
      return a.arrayIndex - b.arrayIndex;
    });
  });



  // TXT 다운로드 함수
  const handleTxtDownload = () => {
    if (!data) return;

    const { contentSet } = data.data;
    
    // 모든 지문을 하나로 연결 (제목은 첫 번째 지문 것만 사용)
    const firstTitle = editablePassages[0]?.title || '제목 없음';
    const allParagraphs = editablePassages.flatMap(passage => 
      passage.paragraphs
        .map(paragraph => paragraph.trim())
        .filter(p => p)
    ).join('\n');
    
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

지문 유형
${contentSet.text_type || contentSet.textType || 'N/A'}

지문
${firstTitle}
${allParagraphs}`;

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
    
    // 지문 문제 유형명 매핑 함수
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

    // 어휘 문제를 어휘별로 그룹화 (종합 문제처럼 세트로 구성)
    const vocabularyQuestionsByTerm: { [key: string]: typeof editableVocabQuestions } = {};
    editableVocabQuestions.forEach(q => {
      const term = q.term || '기타';
      if (!vocabularyQuestionsByTerm[term]) {
        vocabularyQuestionsByTerm[term] = [];
      }
      vocabularyQuestionsByTerm[term].push(q);
    });

    // 각 어휘별로 난이도순 정렬 (일반문제 먼저, 보완문제 나중에)
    Object.keys(vocabularyQuestionsByTerm).forEach(term => {
      vocabularyQuestionsByTerm[term].sort((a, b) => {
        // difficulty 또는 question_type을 기준으로 정렬
        const aDifficulty = a.difficulty || a.question_type || '일반';
        const bDifficulty = b.difficulty || b.question_type || '일반';
        
        // '일반' 또는 '일반' 아닌 다른 값은 앞에, '보완'은 뒤에
        if (aDifficulty === '보완' && bDifficulty !== '보완') return 1;
        if (aDifficulty !== '보완' && bDifficulty === '보완') return -1;
        
        // 둘 다 같은 카테고리면 원래 순서 유지
        return 0;
      });
    });

    // 어휘 문제를 어휘별로 그룹화 (HTML ver.2에서도 동일)
    const vocabularyQuestionsByTermV2: { [key: string]: typeof editableVocabQuestions } = {};
    editableVocabQuestions.forEach(q => {
      const term = q.term || '기타';
      if (!vocabularyQuestionsByTermV2[term]) {
        vocabularyQuestionsByTermV2[term] = [];
      }
      vocabularyQuestionsByTermV2[term].push(q);
    });

    // 각 어휘별로 난이도순 정렬 (HTML ver.2용)
    Object.keys(vocabularyQuestionsByTermV2).forEach(term => {
      vocabularyQuestionsByTermV2[term].sort((a, b) => {
        // difficulty 또는 question_type을 기준으로 정렬
        const aDifficulty = a.difficulty || a.question_type || '일반';
        const bDifficulty = b.difficulty || b.question_type || '일반';
        
        // '일반' 또는 '일반' 아닌 다른 값은 앞에, '보완'은 뒤에
        if (aDifficulty === '보완' && bDifficulty !== '보완') return 1;
        if (aDifficulty !== '보완' && bDifficulty === '보완') return -1;
        
        // 둘 다 같은 카테고리면 원래 순서 유지
        return 0;
      });
    });

    // 각 문단별 지문 문제 그룹화
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
    
    // 어휘 통계 계산 (핵심어 vs 어려운 어휘)
    const coreVocabularyCount = vocabularyTermsData.filter(term => term.has_question_generated === true).length;
    const difficultVocabularyCount = vocabularyTermsData.filter(term => term.has_question_generated !== true).length;
    const totalVocabularyCount = vocabularyTermsData.length;
    
    // 지문문제 유형별 분포 계산 (HTML ver.1과 동일한 방식)
    const paragraphTypeStats = editableParagraphQuestions.reduce((acc, question) => {
      // 여러 필드명을 시도해서 실제 유형을 찾음
      const originalType = question.questionType || question.question_type || question.type || '기타';
      const type = getParagraphQuestionTypeLabel(originalType);
      console.log('지문 문제 유형 디버깅:', { question, originalType, type }); // 디버깅용
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
      // is_supplementary와 isSupplementary 둘 다 확인
      if (question.is_supplementary || question.isSupplementary) {
        acc[type].supplementary++;
      } else {
        acc[type].main++;
      }
      return acc;
    }, {} as Record<string, { main: number; supplementary: number }>);
    
    // 어휘 문제 유형별 분포 계산
    const vocabularyTypeStats = editableVocabQuestions.reduce((acc, question) => {
      // 상세 유형을 우선 사용하고, 없으면 기본 유형 사용
      const type = question.detailed_question_type || question.detailedQuestionType || 
                   question.question_type || question.questionType || '5지선다 객관식';
      console.log('어휘 문제 유형 디버깅:', { question, type }); // 디버깅용
      if (!acc[type]) {
        acc[type] = 0;
      }
      acc[type]++;
      return acc;
    }, {} as Record<string, number>);
    
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
      <h1 style="font-size: 2em;">
        ${contentSet.session_number ? `<span style="display: inline-flex; align-items: center; padding: 4px 12px; border-radius: 9999px; font-size: 0.7em; font-weight: 500; background-color: #dbeafe; color: #1e40af; margin-right: 12px;">${contentSet.session_number}차시</span>` : ''}${contentSet.passageTitle || '제목 없음'}
      </h1>
    </div>
    
    <div class="info-grid">
      <!-- 첫 번째 행: 기본 정보 + 생성 정보 + 지문 정보 -->
      <div class="info-row">
        <div class="info-card">
          <h3>기본 정보</h3>
          <p><strong>과목:</strong> ${contentSet.subject} / ${contentSet.grade} / ${contentSet.area}</p>
          <p><strong>주제:</strong> ${contentSet.mainTopic || contentSet.maintopic || 'N/A'} > ${contentSet.subTopic || contentSet.subtopic || 'N/A'}</p>
          <p><strong>핵심어:</strong> ${vocabularyTermsData.filter(term => term.has_question_generated === true).map(term => term.term).join(', ') || 'N/A'}</p>
        </div>
        
        <div class="info-card">
          <h3>생성 정보</h3>
          <p><strong>교육과정:</strong> ${contentSet.division || contentSet.curriculum || 'N/A'}</p>
          <p><strong>지문길이:</strong> ${contentSet.passageLength || '정보 없음'}</p>
          <p><strong>유형:</strong> ${(() => {
            const textType = contentSet.textType;
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
        
        // 여러 지문이 있을 때 공통 제목 표시
        if (editablePassages.length > 1) {
          result += `<h2 class="passage-title" style="text-align: center; margin-bottom: 40px;">${editablePassages[0].title}</h2>`;
        }
        
        // 도입 질문 표시 (제목과 지문 사이)
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
        
        // 각 지문 표시
        result += editablePassages.map((passage, passageIndex) => `
          <div class="passage-section" style="margin-bottom: ${passageIndex < editablePassages.length - 1 ? '50px' : '30px'};">
            ${editablePassages.length > 1 ? 
              `<h3 style="color: #2c3e50; margin-bottom: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">지문 ${passageIndex + 1}</h3>` : 
              `<h2 class="passage-title">${passage.title}</h2>`
            }
            ${passage.paragraphs
              .map((paragraph, index) => {
                if (!paragraph.trim()) return '';
                
                // 어휘 용어들 추출 및 하이라이트 처리
                let highlightedParagraph = paragraph;
                
                // vocabularyTermsData를 기반으로 어휘 용어들을 추출하고 길이순으로 정렬 (긴 것부터)
                const vocabTerms = vocabularyTermsData
                  .map((vocabTerm) => ({
                    term: vocabTerm.term,
                    isCoreVocab: vocabTerm.has_question_generated === true
                  }))
                  .filter(item => item.term && item.term.length > 1)
                  .sort((a, b) => b.term.length - a.term.length);
                
                // 길이가 긴 용어부터 하이라이트 적용
                vocabTerms.forEach((vocabItem) => {
                  const term = vocabItem.term;
                  const isCoreVocab = vocabItem.isCoreVocab;
                  
                  if (term && term.length > 1) {
                    const escapedTerm = term.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
                    const regex = new RegExp('(' + escapedTerm + ')', 'gi');
                    
                    // 핵심어는 볼드 + 밑줄, 어려운 어휘는 볼드만 적용
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
          <h2 class="passage-title">${editablePassage.title}</h2>
          ${editablePassage.paragraphs
            .map((paragraph, index) => {
              if (!paragraph.trim()) return '';
              
              // 어휘 용어들 추출 및 하이라이트 처리
              let highlightedParagraph = paragraph;
              
              // 어휘 용어들을 추출하고 길이순으로 정렬 (긴 것부터)
              const vocabTerms = vocabularyTermsData
                .map((vocab, vocabIndex) => ({
                  vocab: vocab,
                  term: vocab.term,
                  index: vocabIndex,
                  isCoreVocabulary: vocab.has_question_generated === true
                }))
                .filter(item => item.term && item.term.length > 1)
                .sort((a, b) => b.term.length - a.term.length);
              
              // 길이가 긴 용어부터 하이라이트 적용
              vocabTerms.forEach((vocabItem) => {
                const term = vocabItem.term;
                
                if (term && term.length > 1) {
                  const escapedTerm = term.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
                  const regex = new RegExp('(' + escapedTerm + ')', 'gi');
                  
                  // 핵심어는 볼드 + 밑줄, 어려운 어휘는 볼드만
                  const style = vocabItem.isCoreVocabulary 
                    ? 'color: #2563eb; font-weight: bold; text-decoration: underline;'
                    : 'color: #2563eb; font-weight: bold;';
                  
                  highlightedParagraph = highlightedParagraph.replace(regex, `<strong style="${style}">$1</strong>`);
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

      <!-- 어려운 어휘 섹션 - 지문별로 그룹화 -->
      <div>
        <h2 style="color: #2c3e50; margin-bottom: 20px;">📖 어려운 어휘 (${difficultVocabularyCount}개)</h2>
        <p style="color: #6c757d; margin-bottom: 30px; font-style: italic;">지문 이해에 도움이 되는 추가 어휘들입니다.</p>
        ${(() => {
          // 어려운 어휘만 필터링
          const difficultTerms = vocabularyTermsData.filter(term => term.has_question_generated !== true);
          
          // 지문별로 그룹화
          const termsByPassage = {};
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
          
          // passage_number로 정렬
          const sortedPassages = Object.entries(termsByPassage).sort((a, b) => 
            a[1].passageNumber - b[1].passageNumber
          );
          
          // HTML 생성
          return sortedPassages.map(([passageId, passageData]) => {
            const passageLabel = editablePassages.length > 1 
              ? `지문 ${passageData.passageNumber}: ${passageData.passageTitle}` 
              : '지문에서 추출된 어휘';
            
            return `
              <div style="margin-bottom: 30px;">
                <h3 style="color: #dc6843; margin-bottom: 15px; font-size: 1.1em;">
                  📄 ${passageLabel} (${passageData.terms.length}개)
                </h3>
                <div class="vocabulary-grid">
                  ${passageData.terms.map((vocabTerm, index) => {
            const vocab = vocabTerm.term + ': ' + vocabTerm.definition + (vocabTerm.example_sentence ? ' (예시: ' + vocabTerm.example_sentence + ')' : '');
            
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
              
              return '<div class="vocabulary-card" style="border-left: 4px solid #6c757d;">' +
                '<div class="vocabulary-term">[어려운 어휘 ' + (index + 1) + '] - ' + term + '</div>' +
                '<div class="vocabulary-definition">' + mainDefinition + '</div>' +
                (example ? '<div class="vocabulary-example" style="margin-top: 8px; font-style: italic; color: #6c757d;">(' + highlightedExample + ')</div>' : '') +
                '</div>';
            }
            return '';
                  }).join('')}
                </div>
              </div>
            `;
          }).join('');
        })()}
      </div>
    </div>

    <!-- 어휘 문제 탭 -->
    <div id="vocabulary-tab" class="tab-content">
      <h2 style="color: #2c3e50; margin-bottom: 30px;">📝 어휘 문제</h2>
      ${Object.keys(vocabularyQuestionsByTerm).sort().map(term => {
        const questions = vocabularyQuestionsByTerm[term];
        
        // 기본문제와 보완문제 개수 계산
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
                
                // editablePassages가 있고 여러 지문이 있는 경우
                if (editablePassages.length > 0) {
                  // 모든 지문의 문단을 합쳐서 순서대로 배열 생성
                  const allParagraphs = [];
                  editablePassages.forEach(passage => {
                    passage.paragraphs.forEach(para => {
                      if (para.trim()) allParagraphs.push(para);
                    });
                  });
                  return allParagraphs[paragraphIndex] || '해당 문단 내용을 찾을 수 없습니다.';
                } else {
                  // 단일 지문인 경우 기존 로직 사용
                  return editablePassage.paragraphs[paragraphIndex] || '해당 문단 내용을 찾을 수 없습니다.';
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
        const setNumber = setKey.split('_')[1]; // set_1_단답형 -> 1
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
        'paragraph': '지문 문제',
        'comprehensive': '종합 문제',
        'images': '시각자료'
      };
      return tabTexts[tabName] || '';
    }

    // 서버에서 이미지 로드 함수
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
        // 이미지 데이터 JSON (다운로드 시점의 이미지 목록 임베드)
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

        // 이미지 표시
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
    const sessionPrefix = contentSet.session_number ? `${contentSet.session_number}차시_` : '';
    link.download = `${sessionPrefix}${String(contentSet.setId || contentSet.id || 'content')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 지문 편집 함수들 - editablePassages와 editablePassage 동기화
  const handleTitleChange = (newTitle: string, passageIndex: number = currentPassageIndex) => {
    // editablePassage 업데이트
    if (passageIndex === currentPassageIndex) {
      setEditablePassage(prev => ({ ...prev, title: newTitle }));
    }
    
    // editablePassages 업데이트
    setEditablePassages(prev => 
      prev.map((p, i) => i === passageIndex ? { ...p, title: newTitle } : p)
    );
  };

  const handleParagraphChange = (index: number, newContent: string, passageIndex: number = currentPassageIndex) => {
    // editablePassage 업데이트
    if (passageIndex === currentPassageIndex) {
      setEditablePassage(prev => ({
        ...prev,
        paragraphs: prev.paragraphs.map((p, i) => i === index ? newContent : p)
      }));
    }
    
    // editablePassages 업데이트
    setEditablePassages(prev => 
      prev.map((p, i) => i === passageIndex 
        ? { ...p, paragraphs: p.paragraphs.map((para, j) => j === index ? newContent : para) }
        : p
      )
    );
  };

  const addParagraph = () => {
    setEditablePassage(prev => ({
      ...prev,
      paragraphs: [...prev.paragraphs, '새로운 단락을 입력하세요.']
    }));
  };

  const removeParagraph = (index: number, passageIndex: number = currentPassageIndex) => {
    // 해당 지문의 단락 수 확인
    const targetPassage = editablePassages[passageIndex] || editablePassage;
    if (targetPassage.paragraphs.length <= 1) {
      alert('최소 1개의 단락은 있어야 합니다.');
      return;
    }
    
    // editablePassage 업데이트
    if (passageIndex === currentPassageIndex) {
      setEditablePassage(prev => ({
        ...prev,
        paragraphs: prev.paragraphs.filter((_, i) => i !== index)
      }));
    }
    
    // editablePassages 업데이트
    setEditablePassages(prev => 
      prev.map((p, i) => i === passageIndex 
        ? { ...p, paragraphs: p.paragraphs.filter((_, j) => j !== index) }
        : p
      )
    );
  };

  // 어휘 편집 함수들
  const handleVocabularyChange = (index: number, newContent: string) => {
    setEditableVocabulary(prev => prev.map((v, i) => i === index ? newContent : v));
  };

  const addVocabulary = () => {
    setEditableVocabulary(prev => [...prev, '새 용어: 설명 (예시: 예시문장)']);
  };

  const removeVocabulary = (index: number) => {
    console.log(`🗑️ 어휘 삭제: index=${index}`);
    setEditableVocabulary(prev => prev.filter((_, i) => i !== index));
    // vocabularyTermsData도 함께 업데이트
    setVocabularyTermsData(prev => prev.filter((_, i) => i !== index));
  };

  // 안전한 ID 매칭 함수
  const findQuestionIndex = (questions: any[], targetId: string) => {
    // 먼저 정확한 ID 매칭 시도
    let index = questions.findIndex(q => q.id === targetId);
    if (index !== -1) {
      console.log(`✅ ID로 찾음: ${targetId} -> index ${index}`);
      return index;
    }

    // questionId로 매칭 시도
    index = questions.findIndex(q => q.questionId === targetId);
    if (index !== -1) {
      console.log(`✅ questionId로 찾음: ${targetId} -> index ${index}`);
      return index;
    }

    // temp ID 패턴 매칭 (마지막 수단)
    if (targetId.startsWith('temp-')) {
      const parts = targetId.split('-');
      const tempIndex = parseInt(parts[parts.length - 1]);
      if (!isNaN(tempIndex) && tempIndex >= 0 && tempIndex < questions.length) {
        console.log(`✅ temp ID로 찾음: ${targetId} -> index ${tempIndex}`);
        return tempIndex;
      }
    }

    console.error(`❌ 문제를 찾을 수 없음: ${targetId}`);
    return -1;
  };

  // 어휘문제 편집 함수들 (ID 기반으로 수정) - 포커스 해제 없이 스크롤만 보존
  const handleVocabQuestionChange = (questionId: string, field: keyof VocabularyQuestion, value: string | string[]) => {
    console.log(`🔧 어휘 문제 수정 시도: ID=${questionId}, field=${field}, value=`, value);

    if (!questionId) {
      console.error('❌ questionId가 없습니다. 수정할 수 없습니다.');
      return;
    }

    setEditableVocabQuestions(prev => {
      console.log(`📊 현재 어휘 문제 배열:`, prev.map((q, i) => ({
        index: i,
        id: q.id,
        questionId: q.questionId,
        term: q.term
      })));

      const targetIndex = findQuestionIndex(prev, questionId);

      if (targetIndex === -1) {
        console.error(`❌ 어휘 문제를 찾을 수 없습니다: ID=${questionId}`);
        console.error(`❌ 검색된 배열:`, prev.map(q => ({ id: q.id, questionId: q.questionId })));
        return prev;
      }

      // 수정 전 데이터 확인
      const beforeUpdate = prev[targetIndex];
      console.log(`📝 수정 전 데이터 (index ${targetIndex}):`, {
        id: beforeUpdate.id,
        questionId: beforeUpdate.questionId,
        term: beforeUpdate.term,
        currentValue: beforeUpdate[field]
      });

      const updated = prev.map((q, index) =>
        index === targetIndex ? { ...q, [field]: value } : q
      );

      // 수정 후 데이터 확인
      const afterUpdate = updated[targetIndex];
      console.log(`✅ 어휘 문제 수정 완료 (index ${targetIndex}):`, {
        id: afterUpdate.id,
        questionId: afterUpdate.questionId,
        term: afterUpdate.term,
        newValue: afterUpdate[field]
      });

      return updated;
    });
  }; // 🆕 스크롤 보존 완전 제거

  // 기존 인덱스 기반 함수 (호환성용)
  const handleVocabQuestionChangeByIndex = (index: number, field: keyof VocabularyQuestion, value: string | string[]) => {
    setEditableVocabQuestions(prev => prev.map((q, i) =>
      i === index ? { ...q, [field]: value } : q
    ));
  };

  const addVocabQuestion = withScrollPreservation(() => {
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
  });

  // 어휘 문제 삭제 함수 (ID 기반으로 수정)
  const removeVocabQuestion = withScrollPreservation((questionId: string) => {
    console.log(`🗑️ 어휘 문제 삭제: ID=${questionId}`);
    setEditableVocabQuestions(prev => {
      const filtered = prev.filter(q => q.id !== questionId);
      console.log(`✅ 삭제 완료. 남은 문제 수: ${filtered.length}`);
      return filtered;
    });
  });

  // 기존 인덱스 기반 함수 (호환성용)
  const removeVocabQuestionByIndex = (index: number) => {
    setEditableVocabQuestions(prev => prev.filter((_, i) => i !== index));
  };

  // 문단문제 편집 함수들 (ID 기반으로 수정) - 포커스 해제 없이 스크롤만 보존
  const handleParagraphQuestionChange = withScrollPreservation((questionId: string, field: keyof ParagraphQuestion, value: string | string[]) => {
    console.log(`🔧 문단 문제 수정 시도: ID=${questionId}, field=${field}, value=`, value);

    if (!questionId) {
      console.error('❌ questionId가 없습니다. 문단 문제를 수정할 수 없습니다.');
      return;
    }

    setEditableParagraphQuestions(prev => {
      console.log(`📊 현재 문단 문제 배열:`, prev.map((q, i) => ({
        index: i,
        id: q.id,
        questionId: q.questionId,
        questionType: q.questionType
      })));

      const targetIndex = findQuestionIndex(prev, questionId);

      if (targetIndex === -1) {
        console.error(`❌ 문단 문제를 찾을 수 없습니다: ID=${questionId}`);
        console.error(`❌ 검색된 배열:`, prev.map(q => ({ id: q.id, questionId: q.questionId })));
        return prev;
      }

      // 수정 전 데이터 확인
      const beforeUpdate = prev[targetIndex];
      console.log(`📝 수정 전 데이터 (index ${targetIndex}):`, {
        id: beforeUpdate.id,
        questionId: beforeUpdate.questionId,
        questionType: beforeUpdate.questionType,
        currentValue: beforeUpdate[field]
      });

      const updated = prev.map((q, index) =>
        index === targetIndex ? { ...q, [field]: value } : q
      );

      // 수정 후 데이터 확인
      const afterUpdate = updated[targetIndex];
      console.log(`✅ 문단 문제 수정 완료 (index ${targetIndex}):`, {
        id: afterUpdate.id,
        questionId: afterUpdate.questionId,
        questionType: afterUpdate.questionType,
        newValue: afterUpdate[field]
      });

      return updated;
    });
  }, { forceBlur: false, delay: 0 }); // 입력 중에는 포커스 해제하지 않음

  // 기존 인덱스 기반 함수 (호환성용)
  const handleParagraphQuestionChangeByIndex = (index: number, field: keyof ParagraphQuestion, value: string | string[]) => {
    setEditableParagraphQuestions(prev => prev.map((q, i) =>
      i === index ? { ...q, [field]: value } : q
    ));
  };

  const addParagraphQuestion = withScrollPreservation(() => {
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
  });

  const removeParagraphQuestion = withScrollPreservation((index: number) => {
    setEditableParagraphQuestions(prev => prev.filter((_, i) => i !== index));
  });

  // 종합문제 편집 함수들 (ID 기반으로 수정) - 포커스 해제 없이 스크롤만 보존
  const handleComprehensiveChange = withScrollPreservation((questionId: string, field: keyof ComprehensiveQuestion, value: string | string[] | boolean) => {
    console.log(`🔧 종합 문제 수정 시도: ID=${questionId}, field=${field}, value=`, value);

    if (!questionId) {
      console.error('❌ questionId가 없습니다. 종합 문제를 수정할 수 없습니다.');
      return;
    }

    setEditableComprehensive(prev => {
      console.log(`📊 현재 종합 문제 배열:`, prev.map((q, i) => ({
        index: i,
        id: q.id,
        questionId: q.questionId,
        questionType: q.questionType,
        isSupplementary: q.isSupplementary
      })));

      const targetIndex = findQuestionIndex(prev, questionId);

      if (targetIndex === -1) {
        console.error(`❌ 종합 문제를 찾을 수 없습니다: ID=${questionId}`);
        console.error(`❌ 검색된 배열:`, prev.map(q => ({ id: q.id, questionId: q.questionId })));
        return prev;
      }

      // 수정 전 데이터 확인
      const beforeUpdate = prev[targetIndex];
      console.log(`📝 수정 전 데이터 (index ${targetIndex}):`, {
        id: beforeUpdate.id,
        questionId: beforeUpdate.questionId,
        questionType: beforeUpdate.questionType,
        isSupplementary: beforeUpdate.isSupplementary,
        currentValue: beforeUpdate[field]
      });

      const updated = prev.map((q, index) =>
        index === targetIndex ? { ...q, [field]: value } : q
      );

      // 수정 후 데이터 확인
      const afterUpdate = updated[targetIndex];
      console.log(`✅ 종합 문제 수정 완료 (index ${targetIndex}):`, {
        id: afterUpdate.id,
        questionId: afterUpdate.questionId,
        questionType: afterUpdate.questionType,
        isSupplementary: afterUpdate.isSupplementary,
        newValue: afterUpdate[field]
      });

      return updated;
    });
  }, { forceBlur: false, delay: 0 }); // 입력 중에는 포커스 해제하지 않음

  // 기존 인덱스 기반 함수 (호환성용)
  const handleComprehensiveChangeByIndex = (index: number, field: keyof ComprehensiveQuestion, value: string | string[] | boolean) => {
    setEditableComprehensive(prev => prev.map((q, i) =>
      i === index ? { ...q, [field]: value } : q
    ));
  };

  const addComprehensiveQuestion = withScrollPreservation(() => {
    const baseId = `comp_${Date.now()}`;
    
    // 기존 문제들의 최대 questionSetNumber 찾기
    const maxExistingSetNumber = editableComprehensive.reduce((max, q) => {
      return Math.max(max, q.questionSetNumber || 0);
    }, 0);
    
    const newSetNumber = maxExistingSetNumber + 1;
    
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
      questionSetNumber: newSetNumber
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
      questionSetNumber: newSetNumber
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
      questionSetNumber: newSetNumber
    };
    
    setEditableComprehensive(prev => [...prev, mainQuestion, supplementary1, supplementary2]);
  });

  const handleCSVUpload = (questions: any[]) => {
    // 기존 문제들의 최대 questionSetNumber 찾기
    const maxExistingSetNumber = editableComprehensive.reduce((max, q) => {
      return Math.max(max, q.questionSetNumber || 0);
    }, 0);
    
    // 문제 세트별로 그룹화하고 ID 할당
    const now = Date.now();
    const processedQuestions: ComprehensiveQuestion[] = [];
    
    let currentSetId = '';
    let currentSetIndex = 0;
    
    questions.forEach((q, index) => {
      if (!q.isSupplementary) {
        // 새로운 세트 시작
        currentSetIndex = Math.floor(index / 3);
        currentSetId = `comp_${now}_${currentSetIndex}`;
      }
      
      const questionId = q.isSupplementary 
        ? `${currentSetId}_supp${processedQuestions.filter(pq => pq.originalQuestionId === currentSetId && pq.isSupplementary).length + 1}`
        : currentSetId;
      
      processedQuestions.push({
        id: '',
        questionId: questionId,
        questionType: q.questionType,
        question: q.question,
        questionFormat: q.questionFormat,
        options: q.options,
        correctAnswer: q.correctAnswer,
        answerInitials: q.questionFormat === 'short_answer' ? '' : undefined,
        explanation: q.explanation,
        isSupplementary: q.isSupplementary,
        originalQuestionId: currentSetId,
        questionSetNumber: maxExistingSetNumber + currentSetIndex + 1  // 기존 세트 번호 이후부터 시작
      });
    });
    
    setEditableComprehensive(prev => [...prev, ...processedQuestions]);
    setIsCSVModalOpen(false);
  };

  const removeComprehensiveQuestion = withScrollPreservation((index: number) => {
    setEditableComprehensive(prev => prev.filter((_, i) => i !== index));
  });

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
    <RoleAuthGuard allowedRoles={['admin', 'user']}>
      <div className="min-h-screen bg-gray-50 scroll-preserve stable-layout">
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
              <h1 className="text-xl font-bold text-gray-900 flex items-center">
                {data?.data?.contentSet?.session_number && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800 mr-3">
                    {data.data.contentSet.session_number}차시
                  </span>
                )}
                {data?.data?.contentSet?.passageTitle || '제목 없음'}
              </h1>
            </div>
            <div className="flex items-center space-x-3">
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
                onClick={saving ? undefined : (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  blurActiveElement();
                  handleSave();
                }}
                disabled={saving}
                className={`px-4 py-2 rounded-md transition-colors prevent-focus-scroll ${
                  saving
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed opacity-50'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
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
                onClick={saving ? undefined : (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  blurActiveElement();
                  setActiveTab('passage');
                }}
                disabled={saving}
                className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors prevent-focus-scroll ${
                  activeTab === 'passage'
                    ? 'border-blue-500 text-blue-600'
                    : saving
                      ? 'border-transparent text-gray-400 cursor-not-allowed'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                지문
              </button>
              <button
                onClick={saving ? undefined : (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  blurActiveElement();
                  setActiveTab('vocabulary');
                }}
                disabled={saving}
                className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors prevent-focus-scroll ${
                  activeTab === 'vocabulary'
                    ? 'border-blue-500 text-blue-600'
                    : saving
                      ? 'border-transparent text-gray-400 cursor-not-allowed'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                어휘 ({editableVocabulary.length})
              </button>
              <button
                onClick={saving ? undefined : () => setActiveTab('vocab-questions')}
                disabled={saving}
                className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'vocab-questions'
                    ? 'border-blue-500 text-blue-600'
                    : saving
                      ? 'border-transparent text-gray-400 cursor-not-allowed'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                어휘문제 ({editableVocabQuestions.length})
              </button>
              <button
                onClick={saving ? undefined : () => setActiveTab('paragraph-questions')}
                disabled={saving}
                className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'paragraph-questions'
                    ? 'border-blue-500 text-blue-600'
                    : saving
                      ? 'border-transparent text-gray-400 cursor-not-allowed'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                지문문제 ({setDetails?.total_paragraph_questions || 0})
              </button>
              <button
                onClick={saving ? undefined : () => setActiveTab('comprehensive')}
                disabled={saving}
                className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'comprehensive'
                    ? 'border-blue-500 text-blue-600'
                    : saving
                      ? 'border-transparent text-gray-400 cursor-not-allowed'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                종합문제 ({editableComprehensive.length})
              </button>
              <button
                onClick={saving ? undefined : () => setActiveTab('visual-materials')}
                disabled={saving}
                className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'visual-materials'
                    ? 'border-blue-500 text-blue-600'
                    : saving
                      ? 'border-transparent text-gray-400 cursor-not-allowed'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                시각자료 ({visualMaterials.length})
              </button>
            </nav>
          </div>
          
          <div className={`p-6 ${saving ? 'pointer-events-none opacity-75' : ''}`}>
            {/* 지문 탭 */}
            {activeTab === 'passage' && (
              <div className="space-y-6">
                {/* 도입 질문 편집 섹션 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    도입 질문
                  </label>
                  <textarea
                    value={editableIntroductionQuestion}
                    onChange={(e) => setEditableIntroductionQuestion(e.target.value)}
                    placeholder="학생들의 흥미를 유발하고 주제에 대한 호기심을 자극하는 도입 질문을 입력하세요."
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 prevent-focus-scroll"
                  />
                </div>

                {/* 모든 지문을 순서대로 표시 */}
                {editablePassages.map((passage, passageIndex) => (
                  <div key={passageIndex} className="border-t pt-6">
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        제목 {editablePassages.length > 1 ? `(지문 ${passageIndex + 1})` : ''}
                      </label>
                      <input
                        type="text"
                        value={passage.title}
                        onChange={(e) => {
                          handleTitleChange(e.target.value, passageIndex);
                        }}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <label className="block text-sm font-medium text-gray-700">
                          단락 {editablePassages.length > 1 ? `(지문 ${passageIndex + 1})` : ''}
                        </label>
                        <button
                          onClick={() => {
                            setCurrentPassageIndex(passageIndex);
                            setEditablePassage({
                              title: passage.title,
                              paragraphs: [...passage.paragraphs]
                            });
                            addParagraph();
                          }}
                          className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-sm"
                        >
                          + 단락 추가
                        </button>
                      </div>
                      
                      <div className="space-y-4">
                        {passage.paragraphs.map((paragraph, paragraphIndex) => (
                          <div key={paragraphIndex} className="relative">
                            <div className="flex justify-between items-start mb-2">
                              <label className="text-sm font-medium text-gray-600">단락 {paragraphIndex + 1}</label>
                              <button
                                onClick={() => {
                                  const updatedPassages = [...editablePassages];
                                  updatedPassages[passageIndex].paragraphs = updatedPassages[passageIndex].paragraphs.filter((_, i) => i !== paragraphIndex);
                                  setEditablePassages(updatedPassages);
                                  if (passageIndex === currentPassageIndex) {
                                    removeParagraph(paragraphIndex);
                                  }
                                }}
                                className="text-red-600 hover:text-red-800 text-sm"
                              >
                                삭제
                              </button>
                            </div>
                            <textarea
                              value={paragraph}
                              onChange={(e) => {
                                handleParagraphChange(paragraphIndex, e.target.value, passageIndex);
                              }}
                              rows={4}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* 어휘 탭 - 핵심어/어려운 어휘 분류 표시 */}
            {activeTab === 'vocabulary' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">
                    어휘 ({vocabularyTermsData.length}개)
                  </h3>
                  
                  {/* 신규 용어 추가 버튼과 지문 선택 */}
                  <div className="flex items-center gap-3">
                    {editablePassages.length > 1 && (
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600">새 용어를 추가할 지문:</label>
                        <select
                          id="new-vocabulary-passage"
                          className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          {editablePassages.map((passage, pIdx) => (
                            <option key={pIdx} value={`passage_${pIdx}`}>
                              지문 {pIdx + 1}: {passage.title || '제목 없음'}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <button
                      onClick={() => {
                        // 기본 용어 추가
                        addVocabulary();
                        
                        // 지문 정보 설정 (여러 지문이 있을 때만)
                        if (editablePassages.length > 1) {
                          setTimeout(() => {
                            const selectElement = document.getElementById('new-vocabulary-passage') as HTMLSelectElement;
                            const selectedPassageId = selectElement?.value || 'passage_0';
                            const passageIndex = parseInt(selectedPassageId.split('_')[1]);
                            const selectedPassage = editablePassages[passageIndex];
                            
                            // 새로 추가된 용어에 지문 정보 설정
                            const newIndex = editableVocabulary.length - 1; // 방금 추가된 용어의 인덱스
                            const updatedTermsData = [...vocabularyTermsData];
                            if (!updatedTermsData[newIndex]) {
                              updatedTermsData[newIndex] = {
                                id: `temp-${newIndex}`,
                                term: '용어',
                                definition: '설명',
                                exampleSentence: '',
                                orderIndex: newIndex,
                                has_question_generated: false,
                                passage_id: selectedPassageId,
                                passage_number: passageIndex + 1,
                                passage_title: selectedPassage?.title || '지문'
                              };
                            } else {
                              updatedTermsData[newIndex] = {
                                ...updatedTermsData[newIndex],
                                passage_id: selectedPassageId,
                                passage_number: passageIndex + 1,
                                passage_title: selectedPassage?.title || '지문'
                              };
                            }
                            setVocabularyTermsData(updatedTermsData);
                          }, 10); // 짧은 지연으로 addVocabulary 실행 완료 후 처리
                        }
                      }}
                      className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-sm"
                    >
                      + 용어 추가
                    </button>
                  </div>
                </div>

                {/* 핵심어 섹션 (어휘 문제가 생성된 용어) */}
                {(() => {
                  const coreTerms = vocabularyTermsData.filter(term => term.has_question_generated === true);
                  return coreTerms.length > 0 && (
                    <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                      <h4 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                        <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                        핵심어 ({coreTerms.length}개)
                      </h4>
                      <p className="text-sm text-blue-700 mb-4">어휘 문제가 생성된 핵심 학습 용어입니다.</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {coreTerms.map((term, index) => (
                          <div key={term.id} className="bg-white rounded-lg p-4 border border-blue-200">
                            <div className="font-semibold text-blue-900 text-lg mb-2">
                              {term.term}
                            </div>
                            <div className="text-gray-700 mb-2">
                              {term.definition}
                            </div>
                            {term.example_sentence && (
                              <div className="text-sm text-gray-600 italic">
                                예시: {term.example_sentence}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* 어려운 어휘 섹션 - 지문별로 그룹화 */}
                {(() => {
                  const difficultTerms = vocabularyTermsData.filter(term => term.has_question_generated !== true);
                  
                  // 지문별로 그룹화
                  const termsByPassage: { [key: string]: { passageNumber: number; passageTitle: string; terms: typeof difficultTerms } } = {};
                  
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
                  
                  // passage_number로 정렬
                  const sortedPassages = Object.entries(termsByPassage).sort((a, b) => 
                    a[1].passageNumber - b[1].passageNumber
                  );
                  
                  return difficultTerms.length > 0 && (
                    <div className="bg-orange-50 rounded-lg p-6 border border-orange-200">
                      <h4 className="text-lg font-semibold text-orange-900 mb-4 flex items-center">
                        <span className="w-3 h-3 bg-orange-500 rounded-full mr-2"></span>
                        어려운 어휘 ({difficultTerms.length}개)
                      </h4>
                      <p className="text-sm text-orange-700 mb-6">문제로 만들어지지 않은 추가 학습 용어입니다.</p>
                      
                      {/* 지문별로 구분하여 표시 */}
                      {sortedPassages.map(([passageId, { passageNumber, passageTitle, terms }]) => (
                        <div key={passageId} className="mb-6 last:mb-0">
                          <h5 className="text-md font-semibold text-orange-800 mb-3 flex items-center">
                            <span className="mr-2">📖</span>
                            {editablePassages.length > 1 ? `지문 ${passageNumber}: ${passageTitle}` : '지문에서 추출된 어휘'}
                            <span className="ml-2 text-sm text-orange-600">({terms.length}개)</span>
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {terms.map((term, index) => (
                              <div key={term.id} className="bg-white rounded-lg p-4 border border-orange-200">
                                <div className="flex justify-between items-start mb-2">
                                  <div className="font-semibold text-orange-900 text-lg">
                                    {term.term}
                                  </div>
                                  <span className="text-xs text-orange-600">No.{index + 1}</span>
                                </div>
                                <div className="text-gray-700 mb-2">
                                  {term.definition}
                                </div>
                                {term.example_sentence && (
                                  <div className="text-sm text-gray-600 italic">
                                    예시: {term.example_sentence}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* 편집 모드 (기존 편집 기능 유지) */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">편집 모드</h4>
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

                        // VocabularyTerm 데이터도 업데이트 (index 직접 사용)
                        const updatedTermsData = [...vocabularyTermsData];
                        if (updatedTermsData[index]) {
                          updatedTermsData[index] = {
                            ...updatedTermsData[index],
                            term: newTerm,
                            definition: newDescription,
                            example_sentence: newExample
                          };
                          setVocabularyTermsData(updatedTermsData);
                        }
                      };

                      const updateVocabularyType = (newType: '핵심어' | '어려운 어휘') => {
                        const updatedTermsData = [...vocabularyTermsData];
                        // index 직접 사용하여 해당 어휘 업데이트
                        if (updatedTermsData[index]) {
                          updatedTermsData[index] = {
                            ...updatedTermsData[index],
                            has_question_generated: newType === '핵심어' ? true : false
                          };
                          setVocabularyTermsData(updatedTermsData);
                        }
                      };
                      
                      const updateVocabularyPassage = (passageId: string) => {
                        const updatedTermsData = [...vocabularyTermsData];
                        // index를 직접 사용하여 해당 어휘 업데이트
                        if (updatedTermsData[index]) {
                          // 선택된 지문 찾기
                          const passageIndex = parseInt(passageId.split('_')[1]);
                          const selectedPassage = editablePassages[passageIndex];

                          updatedTermsData[index] = {
                            ...updatedTermsData[index],
                            passage_id: passageId,
                            passage_number: passageIndex + 1,
                            passage_title: selectedPassage?.title || '지문'
                          };

                          console.log(`어휘 ${index + 1} 지문 변경: ${passageId} (passage_number: ${passageIndex + 1})`);
                          setVocabularyTermsData(updatedTermsData);
                        }
                      };
                      
                      // vocabularyTermsData에서 현재 용어(term)와 매칭되는 데이터 찾기
                      // index를 사용하여 직접 매칭 (editableVocabulary와 vocabularyTermsData는 동일한 순서)
                      const currentTermData = vocabularyTermsData[index];

                      // 디버깅용 로그
                      console.log(`어휘 ${index + 1} - term: "${term}", currentTermData:`, currentTermData);

                      // 현재 어휘 유형 결정 (has_question_generated 기반)
                      const currentType = currentTermData?.has_question_generated === true ? '핵심어' : '어려운 어휘';

                      // 현재 어휘가 속한 지문 ID 가져오기 (UUID -> passage_N 형태로 변환)
                      const currentPassageUUID = currentTermData?.passage_id;
                      let currentPassageId = `passage_0`; // 기본값

                      if (currentPassageUUID) {
                        // editablePassages에서 해당 UUID를 가진 지문의 인덱스 찾기
                        const passageIndex = editablePassages.findIndex(p => p.id === currentPassageUUID);
                        if (passageIndex !== -1) {
                          currentPassageId = `passage_${passageIndex}`;
                        }
                      }

                      console.log(`어휘 ${index + 1} - 소속 지문: ${currentPassageId} (UUID: ${currentPassageUUID}, passage_number: ${currentTermData?.passage_number})`);

                      return (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-3">
                            <label className="text-sm font-medium text-gray-600">용어 {index + 1}</label>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeVocabulary(index);
                              }}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              삭제
                            </button>
                          </div>

                          <div className="space-y-3">
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

                            {/* 지문 선택 및 어휘 유형 선택 */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* 지문 선택 드롭다운 (여러 지문이 있을 때만 표시) */}
                              {editablePassages.length > 1 && (
                                <div>
                                  <label className="block text-xs text-gray-500 mb-1">소속 지문</label>
                                  <select
                                    value={currentPassageId}
                                    onChange={(e) => updateVocabularyPassage(e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  >
                                    {editablePassages.map((passage, pIdx) => (
                                      <option key={pIdx} value={`passage_${pIdx}`}>
                                        지문 {pIdx + 1}: {passage.title || '제목 없음'}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
                              
                              {/* 어휘 유형 선택 */}
                              <div className={editablePassages.length > 1 ? '' : 'md:col-span-2'}>
                                <label className="block text-xs text-gray-500 mb-1">어휘 유형</label>
                                <div className="flex gap-4">
                                <button
                                  type="button"
                                  onClick={() => updateVocabularyType('핵심어')}
                                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                                    currentType === '핵심어'
                                      ? 'bg-blue-500 text-white'
                                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                  }`}
                                >
                                  <span className="flex items-center justify-center">
                                    <span className="mr-2">📌</span> 핵심어
                                  </span>
                                  <span className="text-xs opacity-80 mt-1 block">어휘 문제 출제 대상</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateVocabularyType('어려운 어휘')}
                                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                                    currentType === '어려운 어휘'
                                      ? 'bg-orange-500 text-white'
                                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                  }`}
                                >
                                  <span className="flex items-center justify-center">
                                    <span className="mr-2">📖</span> 어려운 어휘
                                  </span>
                                  <span className="text-xs opacity-80 mt-1 block">보조 설명용 용어</span>
                                </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
            
            {/* 어휘문제 탭 */}
            {activeTab === 'vocab-questions' && (
              <div className="space-y-6 stable-layout scroll-preserve">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">어휘 문제 ({editableVocabQuestions.length}개)</h3>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      blurActiveElement();
                      addVocabQuestion();
                    }}
                    className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-sm prevent-focus-scroll"
                  >
                    + 문제 추가
                  </button>
                </div>
                
                {Object.keys(vocabularyQuestionsByTermForEdit).sort().map(term => {
                  const questions = vocabularyQuestionsByTermForEdit[term];
                  return (
                    <div key={term} className="bg-gray-50 rounded-lg p-6 border border-gray-200" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center mb-4">
                        <h4 className="text-lg font-semibold text-gray-900">📚 어휘: {term}</h4>
                        <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {questions.length}개 문제
                        </span>
                      </div>
                      
                      <div className="space-y-6">
                        {questions.map((question, questionIndex) => {
                          const arrayIndex = (question as any).arrayIndex;
                          const questionId = question.id || question.questionId || `temp-vocab-${questionIndex}`;
                          // 문제 유형 디버깅
                          console.log(`🔍 문제 ${questionIndex + 1} 유형 디버깅 (ID: ${questionId}, arrayIndex: ${arrayIndex}):`, {
                            question_type: question.question_type,
                            questionType: question.questionType,
                            detailed_question_type: question.detailed_question_type,
                            detailedQuestionType: question.detailedQuestionType,
                            questionId: questionId,
                            arrayIndex: arrayIndex
                          });

                          const questionTypeLabel = getVocabularyQuestionTypeLabel(
                            question.question_type || question.questionType || '객관식',
                            question.detailed_question_type || question.detailedQuestionType
                          );

                          console.log(`📊 계산된 questionTypeLabel: ${questionTypeLabel}`);
                          console.log(`📋 최종 표시될 유형: ${question.detailed_question_type || question.detailedQuestionType || questionTypeLabel}`);
                          
                          return (
                            <div key={`vocab-${questionId}-${questionIndex}`} className="bg-white border border-gray-200 rounded-lg p-6" onClick={(e) => e.stopPropagation()}>
                              <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center space-x-3">
                                  <h5 className="text-md font-medium text-gray-900">문제 {questionIndex + 1}</h5>
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                                    {question.detailed_question_type || question.detailedQuestionType || questionTypeLabel}
                                  </span>
                                  {(question.difficulty || question.question_type === '보완') && (
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                      (question.difficulty === '보완' || question.question_type === '보완')
                                        ? 'bg-orange-100 text-orange-800'
                                        : 'bg-green-100 text-green-800'
                                    }`}>
                                      {question.difficulty === '보완' || question.question_type === '보완' ? '보완문제' : '일반문제'}
                                    </span>
                                  )}
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    blurActiveElement();
                                    removeVocabQuestion(questionId);
                                  }}
                                  className="text-red-600 hover:text-red-800 text-sm prevent-focus-scroll"
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
                                      onChange={(e) => handleVocabQuestionChange(questionId, 'term', e.target.value)}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        e.target.focus();
                                      }}
                                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 prevent-focus-scroll"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">정답</label>
                                    {(() => {
                                      const isSubjective = (question.detailed_question_type || question.detailedQuestionType || '').includes('단답형') || 
                                                          (question.question_type || question.questionType || '').includes('주관식');
                                      
                                      return isSubjective ? (
                                        <textarea
                                          value={question.correctAnswer || question.answer}
                                          onChange={(e) => handleVocabQuestionChange(questionId, 'correctAnswer', e.target.value)}
                                          rows={2}
                                          placeholder="주관식 정답을 입력하세요"
                                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                      ) : (
                                        <select
                                          value={question.correctAnswer || question.answer}
                                          onChange={(e) => handleVocabQuestionChange(questionId, 'correctAnswer', e.target.value)}
                                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                          {question.options.map((option, optIndex) => (
                                            <option key={question.questionId + '-opt-' + optIndex} value={option}>
                                              {optIndex + 1}. {option}
                                            </option>
                                          ))}
                                        </select>
                                      );
                                    })()}
                                  </div>
                                </div>
                                
                                {/* 초성힌트 표시 (주관식 문제만) */}
                                {(() => {
                                  const isSubjective = (question.detailed_question_type || question.detailedQuestionType || '').includes('단답형') || 
                                                      (question.question_type || question.questionType || '').includes('주관식');
                                  
                                  return isSubjective ? (
                                    <div className="grid grid-cols-1 gap-4">
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                          초성힌트 
                                          <span className="text-gray-500 text-xs ml-2">(선택사항)</span>
                                        </label>
                                        <input
                                          type="text"
                                          value={question.answerInitials || question.answer_initials || ''}
                                          onChange={(e) => handleVocabQuestionChange(questionId, 'answerInitials', e.target.value)}
                                          placeholder="예: ㄱㅇㅂ (정답의 초성을 입력하면 학습자에게 힌트로 제공됩니다)"
                                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                      </div>
                                    </div>
                                  ) : null;
                                })()}
                                
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">질문</label>
                                  <textarea
                                    value={question.question}
                                    onChange={(e) => handleVocabQuestionChange(questionId, 'question', e.target.value)}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.target.focus();
                                    }}
                                    onBlur={() => {
                                      // 어휘 문제 탭에서는 스크롤 복원 방지
                                      console.log('📝 질문 입력 완료 - 스크롤 복원 생략');
                                    }}
                                    rows={2}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 prevent-focus-scroll"
                                  />
                                </div>
                                
                                {/* 선택지 (객관식 문제만 표시) */}
                                {(() => {
                                  const isSubjective = (question.detailed_question_type || question.detailedQuestionType || '').includes('단답형') || 
                                                      (question.question_type || question.questionType || '').includes('주관식');
                                  
                                  return !isSubjective ? (
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-2">선택지</label>
                                      <div className="space-y-2">
                                        {question.options.map((option, optIndex) => (
                                          <div key={question.questionId + '-option-' + optIndex} className="flex items-center space-x-2">
                                            <span className="text-sm font-medium w-6">{optIndex + 1}.</span>
                                            <input
                                              type="text"
                                              value={option}
                                              onChange={(e) => {
                                                const newOptions = [...question.options];
                                                newOptions[optIndex] = e.target.value;
                                                handleVocabQuestionChange(questionId, 'options', newOptions);
                                              }}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                e.target.focus();
                                              }}
                                              className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 prevent-focus-scroll"
                                            />
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ) : null;
                                })()}
                                
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">해설</label>
                                  <textarea
                                    value={question.explanation}
                                    onChange={(e) => handleVocabQuestionChange(questionId, 'explanation', e.target.value)}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.target.focus();
                                    }}
                                    onBlur={() => {
                                      // 어휘 문제 탭에서는 스크롤 복원 방지
                                      console.log('📝 해설 입력 완료 - 스크롤 복원 생략');
                                    }}
                                    rows={3}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 prevent-focus-scroll"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* 지문문제 탭 */}
            {activeTab === 'paragraph-questions' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">지문 문제</h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      addParagraphQuestion();
                    }}
                    className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-sm"
                  >
                    + 문제 추가
                  </button>
                </div>

                {editableParagraphQuestions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    저장된 지문 문제가 없습니다.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {editableParagraphQuestions.map((question, index) => {
                      const questionId = question.id || question.questionId || `temp-paragraph-${index}`;
                      return (
                      <div key={`paragraph-${questionId}-${index}`} className="border border-gray-200 rounded-lg p-6">
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
                            onClick={(e) => {
                              e.stopPropagation();
                              removeParagraphQuestion(index);
                            }}
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
                                onChange={(e) => handleParagraphQuestionChange(questionId, 'questionType', e.target.value)}
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
                                onChange={(e) => handleParagraphQuestionChange(questionId, 'paragraphNumber', parseInt(e.target.value) || 1)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                          </div>
                          
                          {/* 2. 관련 문단 내용 */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">관련 문단 내용</label>
                            <div className="p-3 bg-gray-50 rounded-lg border">
                              <div className="text-sm text-gray-800">
                                {(() => {
                                  // 실제 지문 데이터에서 해당 문단 가져오기
                                  const getAllParagraphs = () => {
                                    if (editablePassages && editablePassages.length > 0) {
                                      const allParagraphs: string[] = [];
                                      editablePassages.forEach((passage) => {
                                        if (passage.paragraphs && Array.isArray(passage.paragraphs)) {
                                          allParagraphs.push(...passage.paragraphs);
                                        }
                                      });
                                      return allParagraphs;
                                    }
                                    return [];
                                  };
                                  
                                  const allParagraphs = getAllParagraphs();
                                  const paragraphIndex = question.paragraphNumber - 1;
                                  const paragraphText = allParagraphs[paragraphIndex];
                                  
                                  return paragraphText || question.paragraphText || '해당 문단 내용을 불러올 수 없습니다.';
                                })()}
                              </div>
                            </div>
                          </div>
                          
                          {/* 3. 문제 텍스트 */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">문제</label>
                            <textarea
                              value={question.question}
                              onChange={(e) => handleParagraphQuestionChange(questionId, 'question', e.target.value)}
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
                                  handleParagraphQuestionChange(questionId, 'wordSegments', segments);
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
                                        handleParagraphQuestionChange(questionId, 'options', newOptions);
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
                                onChange={(e) => handleParagraphQuestionChange(questionId, 'correctAnswer', e.target.value)}
                                rows={2}
                                placeholder={question.questionType === '어절 순서 맞추기' ? "올바른 어절 순서를 입력하세요" : "단답형 정답을 입력하세요"}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            ) : (
                              <select
                                value={question.correctAnswer}
                                onChange={(e) => handleParagraphQuestionChange(questionId, 'correctAnswer', e.target.value)}
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
                                onChange={(e) => handleParagraphQuestionChange(questionId, 'answerInitials', e.target.value)}
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
                              onChange={(e) => handleParagraphQuestionChange(questionId, 'explanation', e.target.value)}
                              rows={3}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    );
                    })}
                  </div>
                )}
              </div>
            )}
            
            {/* 종합문제 탭 */}
            {activeTab === 'comprehensive' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">종합 문제</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsCSVModalOpen(true)}
                      className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 text-sm flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      CSV 업로드
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        addComprehensiveQuestion();
                      }}
                      className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-sm"
                    >
                      + 문제 세트 추가
                    </button>
                  </div>
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
                            const questionId = question.id || question.questionId || `temp-comprehensive-${questionIndex}`;
                            const isMainQuestion = !question.isSupplementary;
                            
                            // 보완문제 번호 계산 (기본문제 제외하고 카운트)
                            let supplementaryNumber = 0;
                            if (!isMainQuestion) {
                              const supplementaryQuestions = questions.filter(q => q.isSupplementary);
                              supplementaryNumber = supplementaryQuestions.findIndex(q => q.questionId === question.questionId) + 1;
                            }
                            
                            return (
                              <div key={`comprehensive-${questionId}-${questionIndex}`} className={`border rounded-lg p-4 ${isMainQuestion ? 'bg-white border-blue-200' : 'bg-blue-50 border-blue-100'}`}>
                                <div className="flex justify-between items-center mb-4">
                                  <div>
                                    <h5 className="text-md font-medium text-gray-900">
                                      {isMainQuestion ? '기본 문제' : `보완 문제 ${supplementaryNumber}`}
                                    </h5>
                                    <div className="flex items-center space-x-2 mt-1">
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                        {getComprehensiveQuestionTypeLabel(question.questionType || question.type)}
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
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeComprehensiveQuestion(globalIndex);
                                      }}
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
                                      onChange={(e) => handleComprehensiveChange(questionId, 'question', e.target.value)}
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
                                                  handleComprehensiveChange(questionId, 'options', newOptions);
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
                                          value={(() => {
                                            const currentAnswer = question.correctAnswer || question.answer;
                                            // 이미 옵션 텍스트 형식이면 그대로 반환
                                            if (question.options?.includes(currentAnswer)) {
                                              return currentAnswer;
                                            }
                                            // 번호 형식(1-5)이면 해당 옵션 텍스트로 변환
                                            if (['1', '2', '3', '4', '5'].includes(currentAnswer)) {
                                              const index = parseInt(currentAnswer) - 1;
                                              return question.options?.[index] || '';
                                            }
                                            return '';
                                          })()}
                                          onChange={(e) => handleComprehensiveChange(questionId, 'correctAnswer', e.target.value)}
                                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                          <option value="">정답을 선택하세요</option>
                                          {question.options.map((option, optIndex) => (
                                            <option key={optIndex} value={option}>
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
                                          onChange={(e) => handleComprehensiveChange(questionId, 'correctAnswer', e.target.value)}
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
                                            onChange={(e) => handleComprehensiveChange(questionId, 'answerInitials', e.target.value)}
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
                                      onChange={(e) => handleComprehensiveChange(questionId, 'explanation', e.target.value)}
                                      rows={3}
                                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  </div>
                                </div>
                                
                                {isMainQuestion && (
                                  <div className="mt-4 pt-4 border-t border-gray-200">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
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

            {/* 시각자료 탭 */}
            {activeTab === 'visual-materials' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">시각자료 (이미지)</h3>
                  {data?.data?.contentSet?.session_number && (
                    <div className="text-sm text-gray-600">
                      차시 번호: <span className="font-semibold text-blue-600">{data.data.contentSet.session_number}</span>
                    </div>
                  )}
                </div>

                {!data?.data?.contentSet?.session_number ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                    <p className="text-yellow-800 mb-2">📌 차시 번호가 설정되지 않았습니다.</p>
                    <p className="text-sm text-yellow-700">
                      시각자료를 표시하려면 콘텐츠 세트에 차시 번호를 설정해주세요.
                    </p>
                  </div>
                ) : loadingImages ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
                    <p className="mt-2 text-gray-600">이미지 로딩 중...</p>
                  </div>
                ) : visualMaterials.length === 0 ? (
                  <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                    <div className="text-gray-400 text-5xl mb-4">🖼️</div>
                    <p className="text-gray-600 mb-2">이 차시에 등록된 이미지가 없습니다.</p>
                    <p className="text-sm text-gray-500 mb-4">
                      차시 번호 "{data.data.contentSet.session_number}"와 연결된 이미지가 없습니다.
                    </p>
                    <a
                      href="/image-admin"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      이미지 업로드하러 가기
                    </a>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-sm text-gray-600 mb-4">
                      총 <span className="font-semibold text-blue-600">{visualMaterials.length}</span>개의 이미지
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {visualMaterials.map((image: any) => (
                        <div key={image.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                          <div className="relative h-48 bg-gray-100">
                            <img
                              src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/${image.file_path}`}
                              alt={image.file_name}
                              className="w-full h-full object-contain cursor-pointer"
                              onClick={() => {
                                window.open(
                                  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/${image.file_path}`,
                                  '_blank'
                                );
                              }}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBOb3QgRm91bmQ8L3RleHQ+PC9zdmc+';
                              }}
                            />
                          </div>

                          <div className="p-4">
                            <h4 className="font-medium text-gray-900 truncate mb-2" title={image.file_name}>
                              {image.file_name}
                            </h4>

                            <div className="space-y-1 text-sm text-gray-600">
                              {image.source && (
                                <div className="flex items-start">
                                  <span className="font-medium w-12 flex-shrink-0">출처:</span>
                                  <span className="flex-1">{image.source}</span>
                                </div>
                              )}
                              {image.memo && (
                                <div className="flex items-start">
                                  <span className="font-medium w-12 flex-shrink-0">메모:</span>
                                  <span className="flex-1">{image.memo}</span>
                                </div>
                              )}
                              <div className="flex items-center">
                                <span className="font-medium w-12 flex-shrink-0">크기:</span>
                                <span>
                                  {image.file_size
                                    ? image.file_size < 1024 * 1024
                                      ? (image.file_size / 1024).toFixed(2) + ' KB'
                                      : (image.file_size / (1024 * 1024)).toFixed(2) + ' MB'
                                    : '-'}
                                </span>
                              </div>
                              <div className="flex items-center">
                                <span className="font-medium w-12 flex-shrink-0">등록:</span>
                                <span>{new Date(image.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>

                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <button
                                onClick={() => {
                                  window.open(
                                    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/${image.file_path}`,
                                    '_blank'
                                  );
                                }}
                                className="w-full px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 text-sm font-medium transition-colors"
                              >
                                원본 크기로 보기
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start">
                        <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="flex-1">
                          <p className="text-sm text-blue-800 mb-2">
                            이미지를 추가하거나 수정하려면 이미지 데이터 관리 페이지를 이용하세요.
                          </p>
                          <a
                            href="/image-admin"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium underline"
                          >
                            이미지 데이터 관리 페이지 열기 →
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CSV 업로드 모달 */}
      <ComprehensiveCSVUploadModal
        isOpen={isCSVModalOpen}
        onClose={() => setIsCSVModalOpen(false)}
        onUpload={handleCSVUpload}
        contentSetId={setId}
      />

      {/* 저장 중 로딩 모달 */}
      <SavingModal />
      </div>
    </RoleAuthGuard>
  );
} // Force rebuild: Thu Sep 18 18:06:04 KST 2025
