'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import RoleAuthGuard from '@/components/RoleAuthGuard';
import PassageForm from '@/components/PassageForm';
import PassageDisplay from '@/components/PassageDisplay';
import PassageReview from '@/components/PassageReview';
import VocabularyQuestions from '@/components/VocabularyQuestions';
import ParagraphQuestions from '@/components/ParagraphQuestions';
import ComprehensiveQuestions from '@/components/ComprehensiveQuestions';
import FinalSave from '@/components/FinalSave';
import {
  PassageInput,
  Passage,
  EditablePassage,
  VocabularyQuestion,
  VocabularyQuestionWorkflow,
  ParagraphQuestionWorkflow,
  ComprehensiveQuestion,
  WorkflowData,
  WorkflowStep
} from '@/types';

// 기본 입력값 상수
const DEFAULT_INPUT: PassageInput = {
  division: '초등학교 중학년(3-4학년)',
  length: '2개의 지문 생성. 지문당 300자 내외 - 총 600자',
  subject: '사회',
  grade: '',
  area: '',
  maintopic: '',
  subtopic: '',
  keyword: '',
  textType: '설명문',
};

// DB 데이터를 워크플로우 데이터로 변환하는 함수 (컴포넌트 외부)
function convertDBToWorkflowData(dbData: any): WorkflowData {
  console.log('🔄 변환 함수 시작 - 입력 데이터:', dbData);

  if (!dbData) {
    console.error('❌ dbData가 null 또는 undefined입니다');
    throw new Error('데이터가 없습니다');
  }

  const { contentSet, passages, vocabularyTerms, vocabularyQuestions, comprehensiveQuestions } = dbData;

  console.log('📋 추출된 데이터:', {
    hasContentSet: !!contentSet,
    contentSetKeys: contentSet ? Object.keys(contentSet) : [],
    hasPassages: !!passages,
    passagesLength: passages?.length,
    hasVocabularyTerms: !!vocabularyTerms,
    vocabularyTermsLength: vocabularyTerms?.length,
    hasVocabularyQuestions: !!vocabularyQuestions,
    vocabularyQuestionsLength: vocabularyQuestions?.length,
    hasComprehensiveQuestions: !!comprehensiveQuestions,
    comprehensiveQuestionsLength: comprehensiveQuestions?.length
  });

  if (!contentSet) {
    console.error('❌ contentSet이 없습니다');
    throw new Error('콘텐츠 세트 정보가 없습니다');
  }

  // PassageInput 생성
  const input: PassageInput = {
    division: contentSet.division || '초등학교 중학년(3-4학년)',
    length: contentSet.passage_length || '2개의 지문 생성. 지문당 300자 내외 - 총 600자',
    subject: contentSet.subject || '사회',
    grade: contentSet.grade || '',
    area: contentSet.area || '',
    maintopic: contentSet.main_topic || '',
    subtopic: contentSet.sub_topic || '',
    keyword: contentSet.keywords || '',
    textType: contentSet.text_type || '설명문',
  };

  console.log('📝 생성된 PassageInput:', input);

  // EditablePassage 생성
  let editablePassage: EditablePassage | null = null;

  if (passages && passages.length > 0) {
    if (passages.length >= 2) {
      // 2개 지문 형식으로 변환
      console.log('📖 2개 지문 감지됨, passages 형식으로 변환');

      const convertedPassages = passages.map((passage: any, index: number) => {
        // 각 지문의 단락 데이터 추출 (paragraph_1 ~ paragraph_10)
        const paragraphs: string[] = [];
        for (let i = 1; i <= 10; i++) {
          const paragraphKey = `paragraph_${i}`;
          if (passage[paragraphKey]) {
            paragraphs.push(passage[paragraphKey]);
          }
        }

        // 해당 지문에 속하는 어휘 용어만 필터링
        const passageVocabularyTerms = vocabularyTerms?.filter((term: any) =>
          term.passage_id === passage.id
        ) || [];

        // 해당 지문의 어휘 용어를 footnote 형식으로 변환
        const footnote = passageVocabularyTerms.map((term: any) =>
          `${term.term}: ${term.definition}${term.example_sentence ? ` (예: ${term.example_sentence})` : ''}`
        );

        console.log(`📚 지문 ${index + 1} (ID: ${passage.id})의 어휘 용어 수:`, footnote.length);

        return {
          title: passage.title || `지문 ${index + 1}`,
          paragraphs,
          footnote
        };
      });

      editablePassage = {
        title: '', // 2개 지문 형식에서는 개별 제목 사용
        paragraphs: [], // 2개 지문 형식에서는 개별 단락 사용
        footnote: [], // 2개 지문 형식에서는 개별 어휘 사용
        passages: convertedPassages,
        introduction_question: contentSet.introduction_question || passages[0].introduction_question || ''
      };
    } else {
      // 단일 지문 형식
      console.log('📄 단일 지문 감지됨, 기존 형식으로 변환');

      const passage = passages[0];

      // 단락 데이터 추출 (paragraph_1 ~ paragraph_10)
      const paragraphs: string[] = [];
      for (let i = 1; i <= 10; i++) {
        const paragraphKey = `paragraph_${i}`;
        if (passage[paragraphKey]) {
          paragraphs.push(passage[paragraphKey]);
        }
      }

      // 어휘 용어를 footnote 형식으로 변환 (string 배열로)
      const footnote = vocabularyTerms?.map((term: any) =>
        `${term.term}: ${term.definition}${term.example_sentence ? ` (예: ${term.example_sentence})` : ''}`
      ) || [];

      editablePassage = {
        title: passage.title || contentSet.title || '',
        paragraphs,
        footnote,
        introduction_question: contentSet.introduction_question || passage.introduction_question || ''
      };
    }
  }

  // VocabularyQuestion 생성
  const vocabularyQuestionsConverted: VocabularyQuestionWorkflow[] = vocabularyQuestions?.map((vq: any) => ({
    id: vq.id,
    questionType: vq.detailed_question_type || vq.question_type || '5지선다 객관식',
    term: vq.term,
    question: vq.question,
    options: [vq.option_1, vq.option_2, vq.option_3, vq.option_4, vq.option_5],
    answer: vq.answer || vq.correct_answer, // 워크플로우는 answer 필드 사용
    answerInitials: vq.answer_initials, // 초성 힌트 추가
    explanation: vq.explanation
  })) || [];

  // ParagraphQuestion 생성
  const paragraphQuestionsConverted: ParagraphQuestionWorkflow[] = dbData.paragraphQuestions?.map((pq: any) => ({
    id: pq.id || pq.questionId,
    type: pq.questionType,
    paragraphNumber: pq.paragraphNumber,
    paragraphText: pq.paragraphText,
    question: pq.question,
    options: pq.options,
    wordSegments: pq.wordSegments,
    answer: pq.correctAnswer,
    answerInitials: pq.answerInitials,
    explanation: pq.explanation
  })) || [];

  // ComprehensiveQuestion 생성
  const comprehensiveQuestionsConverted: ComprehensiveQuestion[] = dbData.comprehensiveQuestions?.map((cq: any) => ({
    id: cq.id || cq.questionId,
    type: cq.type || cq.questionType,
    questionFormat: cq.questionFormat === '객관식' ? 'multiple_choice' : 'short_answer',
    question: cq.question,
    options: cq.options,
    correctAnswer: cq.answer || cq.correctAnswer || cq.correct_answer,
    explanation: cq.explanation,
    isSupplementary: cq.isSupplementary || cq.is_supplementary || false,
    questionSetNumber: cq.questionSetNumber || 1,
    originalQuestionId: cq.originalQuestionId
  })) || [];

  console.log('📋 변환된 문단 문제 수:', paragraphQuestionsConverted.length);
  console.log('📋 변환된 종합 문제 수:', comprehensiveQuestionsConverted.length);

  // 종합 문제 분류별 로그
  const basicQuestions = comprehensiveQuestionsConverted.filter(q => !q.isSupplementary);
  const supplementaryQuestions = comprehensiveQuestionsConverted.filter(q => q.isSupplementary);
  console.log('📊 종합 문제 분류:');
  console.log('  - 기본 문제:', basicQuestions.length, '개');
  console.log('  - 보완 문제:', supplementaryQuestions.length, '개');

  // 유형별 분포
  const questionTypes = comprehensiveQuestionsConverted.reduce((acc, q) => {
    acc[q.type] = (acc[q.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  console.log('📈 종합 문제 유형별 분포:', questionTypes);

  return {
    input,
    generatedPassage: editablePassage ? { passages: [editablePassage] } : null,
    editablePassage,
    vocabularyQuestions: vocabularyQuestionsConverted,
    paragraphQuestions: paragraphQuestionsConverted,
    comprehensiveQuestions: comprehensiveQuestionsConverted,
    currentStep: 'passage-review', // 데이터가 있으면 검토 단계부터 시작
    loading: false
  };
}

export default function EditPage() {
  const router = useRouter();
  const [contentSetId, setContentSetId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [workflowData, setWorkflowData] = useState<WorkflowData>({
    input: { ...DEFAULT_INPUT },
    generatedPassage: null,
    editablePassage: null,
    vocabularyQuestions: [],
    paragraphQuestions: [],
    comprehensiveQuestions: [],
    currentStep: 'passage-generation',
    loading: false
  });

  // 각 단계에서 사용된 프롬프트 저장
  const [lastUsedPrompts, setLastUsedPrompts] = useState<{
    passage?: string;
    vocabulary?: string;
    paragraph?: string;
    comprehensive?: string;
  }>({});

  // 스트리밍 상태 관리
  const [streamingState, setStreamingState] = useState({
    isStreaming: false,
    message: '',
    progress: '',
    error: null as string | null,
    result: null as any
  });

  // 보완 문제 생성 상태 관리
  const [isSupplementaryGenerating, setIsSupplementaryGenerating] = useState(false);

  // 콘텐츠 세트 데이터 로드
  const loadContentSet = async (setId: string) => {
    if (!setId.trim()) {
      alert('콘텐츠 세트 ID를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setLoadError('');

    try {
      console.log('🔍 콘텐츠 세트 로드 시작:', setId);

      const response = await fetch(`/api/get-set-details-supabase?setId=${encodeURIComponent(setId)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '콘텐츠 세트를 불러오는데 실패했습니다.');
      }

      console.log('✅ 콘텐츠 세트 로드 완료:', data);
      console.log('🔍 API 응답 구조 분석:', {
        success: data.success,
        hasData: !!data.data,
        dataKeys: data.data ? Object.keys(data.data) : [],
        contentSet: data.data?.contentSet,
        contentSetKeys: data.data?.contentSet ? Object.keys(data.data.contentSet) : []
      });

      // 데이터를 워크플로우 형식으로 변환
      const convertedData = convertDBToWorkflowData(data.data || data);

      setWorkflowData(convertedData);
      setIsInitialized(true);

      console.log('🔄 워크플로우 데이터 변환 완료:', convertedData);

    } catch (error) {
      console.error('❌ 콘텐츠 세트 로드 실패:', error);
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      setLoadError(errorMessage);
      alert(`콘텐츠 세트 로드 실패: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };


  // 1단계: 지문 생성 (스트리밍 버전)
  const handlePassageGeneration = async (input: PassageInput & { model?: any }) => {
    setWorkflowData(prev => ({ ...prev, loading: true, input }));
    setStreamingState({
      isStreaming: true,
      message: '지문 생성 준비 중...',
      progress: '',
      error: null,
      result: null
    });

    try {
      const { handleStreamingRequest } = await import('@/lib/streaming');

      await handleStreamingRequest('/api/generate-passage-stream', input, {
        onStart: (message) => {
          console.log('🚀 스트리밍 시작:', message);
          setStreamingState(prev => ({
            ...prev,
            message: message.message || '지문 생성을 시작합니다...'
          }));
        },

        onProgress: (message) => {
          console.log('📈 스트리밍 진행:', message);
          setStreamingState(prev => ({
            ...prev,
            message: message.message || '지문 생성 진행 중...',
            progress: message.content || prev.progress
          }));
        },

        onComplete: (message) => {
          console.log('✅ 스트리밍 완료:', message);

          setStreamingState(prev => ({
            ...prev,
            isStreaming: false,
            message: message.message || '지문 생성이 완료되었습니다!',
            result: message.result
          }));

          if (message.result) {
            const result = message.result;

            // 사용된 프롬프트 저장
            if (result._metadata?.usedPrompt) {
              setLastUsedPrompts(prev => ({
                ...prev,
                passage: result._metadata.usedPrompt
              }));
            }

            // 생성된 지문을 편집 가능한 형태로 변환
            const editablePassage: EditablePassage = (() => {
              if (result.passages && result.passages.length === 2) {
                const convertedPassages = result.passages.map((passage: any, index: number) => {
                  const title = passage.title || `지문 ${index + 1}`;
                  const paragraphs = passage.content ? [passage.content] : (passage.paragraphs || []);
                  const footnote = passage.footnote || [];

                  return {
                    title,
                    paragraphs,
                    footnote
                  };
                });

                return {
                  title: '',
                  paragraphs: [],
                  footnote: [],
                  passages: convertedPassages,
                  introduction_question: result.introduction_question
                };
              } else if (result.passages && result.passages.length === 1) {
                return {
                  title: result.passages[0]?.title || result.title || '',
                  paragraphs: result.passages[0]?.content ? [result.passages[0].content] : (result.passages[0]?.paragraphs || []),
                  footnote: result.passages[0]?.footnote || result.footnote || [],
                  introduction_question: result.introduction_question
                };
              } else {
                return {
                  title: '',
                  paragraphs: [],
                  footnote: []
                };
              }
            })();

            setWorkflowData(prev => ({
              ...prev,
              generatedPassage: result,
              editablePassage,
              currentStep: 'passage-review',
              loading: false
            }));

            setStreamingState({
              isStreaming: false,
              message: '',
              progress: '',
              error: null,
              result: null
            });
          }
        },

        onError: (message) => {
          console.error('❌ 스트리밍 오류:', message);

          setStreamingState(prev => ({
            ...prev,
            isStreaming: false,
            error: message.error || '알 수 없는 오류가 발생했습니다.'
          }));

          alert(`지문 생성 중 오류가 발생했습니다: ${message.error}`);
          setWorkflowData(prev => ({ ...prev, loading: false }));
        }
      });

    } catch (error) {
      console.error('스트리밍 요청 오류:', error);

      setStreamingState(prev => ({
        ...prev,
        isStreaming: false,
        error: error instanceof Error ? error.message : String(error)
      }));

      alert('지문 생성 중 오류가 발생했습니다.');
      setWorkflowData(prev => ({ ...prev, loading: false }));
    }
  };

  // 2단계: 지문 검토 및 수정
  const handlePassageUpdate = (updatedPassage: EditablePassage) => {
    setWorkflowData(prev => ({
      ...prev,
      editablePassage: updatedPassage
    }));
  };

  // 3단계로 이동: 어휘 문제 생성
  const handleMoveToVocabularyGeneration = () => {
    setWorkflowData(prev => ({
      ...prev,
      currentStep: 'vocabulary-generation'
    }));
  };

  // 3단계: 어휘 문제 생성 완료 후 4단계로 이동
  const handleVocabularyGenerated = (questions: VocabularyQuestion[], usedPrompt?: string) => {
    if (usedPrompt) {
      setLastUsedPrompts(prev => ({
        ...prev,
        vocabulary: usedPrompt
      }));
    }

    setWorkflowData(prev => ({
      ...prev,
      vocabularyQuestions: questions,
      currentStep: 'vocabulary-review'
    }));
  };

  // 4단계: 어휘 문제 업데이트
  const handleVocabularyUpdate = (questions: VocabularyQuestion[]) => {
    setWorkflowData(prev => ({
      ...prev,
      vocabularyQuestions: questions
    }));
  };

  // 5단계로 이동: 문단 문제 생성
  const handleMoveToParagraphGeneration = () => {
    setWorkflowData(prev => ({
      ...prev,
      currentStep: 'paragraph-generation'
    }));
  };

  // 5단계: 문단 문제 생성 완료 후 6단계로 이동
  const handleParagraphGenerated = (questions: ParagraphQuestionWorkflow[], usedPrompt?: string) => {
    if (usedPrompt) {
      setLastUsedPrompts(prev => ({
        ...prev,
        paragraph: usedPrompt
      }));
    }

    setWorkflowData(prev => ({
      ...prev,
      paragraphQuestions: questions,
      currentStep: 'paragraph-review'
    }));
  };

  // 6단계: 문단 문제 업데이트
  const handleParagraphUpdate = (questions: ParagraphQuestionWorkflow[]) => {
    setWorkflowData(prev => ({
      ...prev,
      paragraphQuestions: questions
    }));
  };

  // 7단계로 이동: 종합 문제 생성
  const handleMoveToComprehensiveGeneration = () => {
    setWorkflowData(prev => ({
      ...prev,
      currentStep: 'comprehensive-generation'
    }));
  };

  // 7단계: 종합 문제 생성 완료 후 8단계로 이동
  const handleComprehensiveGenerated = (questions: ComprehensiveQuestion[], usedPrompt?: string, isIntermediateUpdate = false) => {
    const basicQuestions = questions.filter(q => !q.isSupplementary);
    const supplementaryQuestions = questions.filter(q => q.isSupplementary);

    if (usedPrompt) {
      setLastUsedPrompts(prev => ({
        ...prev,
        comprehensive: usedPrompt
      }));
    }

    const shouldMoveToReview = !isIntermediateUpdate && (
      supplementaryQuestions.length > 0 ||
      (!isSupplementaryGenerating && basicQuestions.length > 0)
    );

    setWorkflowData(prev => ({
      ...prev,
      comprehensiveQuestions: questions,
      currentStep: shouldMoveToReview ? 'comprehensive-review' : prev.currentStep
    }));
  };

  // 8단계: 종합 문제 업데이트
  const handleComprehensiveUpdate = (questions: ComprehensiveQuestion[]) => {
    setWorkflowData(prev => ({
      ...prev,
      comprehensiveQuestions: questions
    }));
  };

  // 9단계로 이동: 최종 저장
  const handleMoveToFinalSave = () => {
    setWorkflowData(prev => ({
      ...prev,
      currentStep: 'final-save'
    }));
  };

  // 새로운 세트 시작 (모든 데이터 초기화)
  const handleStartNewSet = () => {
    router.push('/'); // 메인 페이지로 이동
  };

  // 특정 단계로 이동
  const handleNavigateToStep = (stepKey: string) => {
    if (!isStepAccessible(stepKey)) {
      return;
    }

    setWorkflowData(prev => ({
      ...prev,
      currentStep: stepKey as WorkflowStep
    }));
  };

  // 단계 접근 가능 여부 확인
  const isStepAccessible = (stepKey: string): boolean => {
    const { generatedPassage, editablePassage, vocabularyQuestions, paragraphQuestions, comprehensiveQuestions } = workflowData;

    switch (stepKey) {
      case 'passage-generation':
        return true;
      case 'passage-review':
        return !!generatedPassage;
      case 'vocabulary-generation':
      case 'vocabulary-review':
        return !!editablePassage;
      case 'paragraph-generation':
      case 'paragraph-review':
        return vocabularyQuestions.length > 0;
      case 'comprehensive-generation':
      case 'comprehensive-review':
        return paragraphQuestions.length > 0;
      case 'final-save':
        return comprehensiveQuestions.length > 0;
      default:
        return false;
    }
  };

  // 워크플로우 단계별 렌더링
  const renderCurrentStep = () => {
    const { currentStep, loading, editablePassage, generatedPassage, vocabularyQuestions, paragraphQuestions, comprehensiveQuestions, input } = workflowData;

    switch (currentStep) {
      case 'passage-generation':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <PassageForm
                onSubmit={handlePassageGeneration}
                loading={loading}
                initialData={input}
                streamingState={streamingState}
              />
            </div>
            <div className="lg:col-span-2">
              {generatedPassage && (
                <PassageDisplay
                  passage={generatedPassage}
                  onGenerateQuestions={() => {}}
                  questionsLoading={false}
                />
              )}
            </div>
          </div>
        );

      case 'passage-review':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <PassageForm
                onSubmit={handlePassageGeneration}
                loading={loading}
                initialData={input}
                streamingState={streamingState}
              />
            </div>
            <div className="lg:col-span-2">
              {editablePassage && (
                <PassageReview
                  editablePassage={editablePassage}
                  onUpdate={handlePassageUpdate}
                  onNext={handleMoveToVocabularyGeneration}
                  loading={loading}
                  lastUsedPrompt={lastUsedPrompts.passage}
                />
              )}
            </div>
          </div>
        );

      case 'vocabulary-generation':
        return (
          <div className="max-w-4xl mx-auto">
            {editablePassage && (
              <VocabularyQuestions
                editablePassage={editablePassage}
                division={input.division || ''}
                keywords={input.keyword}
                keywords_for_questions={input.keywords_for_questions}
                vocabularyQuestions={vocabularyQuestions}
                onUpdate={handleVocabularyGenerated}
                onNext={() => {}}
                loading={loading}
                currentStep="generation"
              />
            )}
          </div>
        );

      case 'vocabulary-review':
        return (
          <div className="max-w-4xl mx-auto">
            {editablePassage && (
              <VocabularyQuestions
                editablePassage={editablePassage}
                division={input.division || ''}
                keywords={input.keyword}
                keywords_for_questions={input.keywords_for_questions}
                vocabularyQuestions={vocabularyQuestions}
                onUpdate={handleVocabularyUpdate}
                onNext={handleMoveToParagraphGeneration}
                loading={loading}
                currentStep="review"
                lastUsedPrompt={lastUsedPrompts.vocabulary}
              />
            )}
          </div>
        );

      case 'paragraph-generation':
        return (
          <div className="max-w-4xl mx-auto">
            {editablePassage && (
              <ParagraphQuestions
                editablePassage={editablePassage}
                division={input.division || ''}
                paragraphQuestions={paragraphQuestions}
                onUpdate={handleParagraphGenerated}
                onNext={() => {}}
                loading={loading}
                currentStep="generation"
              />
            )}
          </div>
        );

      case 'paragraph-review':
        return (
          <div className="max-w-4xl mx-auto">
            {editablePassage && (
              <ParagraphQuestions
                editablePassage={editablePassage}
                division={input.division || ''}
                paragraphQuestions={paragraphQuestions}
                onUpdate={handleParagraphUpdate}
                onNext={handleMoveToComprehensiveGeneration}
                loading={loading}
                currentStep="review"
                lastUsedPrompt={lastUsedPrompts.paragraph}
              />
            )}
          </div>
        );

      case 'comprehensive-generation':
        return (
          <div className="max-w-4xl mx-auto">
            {editablePassage && (
              <ComprehensiveQuestions
                editablePassage={editablePassage}
                division={input.division || ''}
                subject={input.subject || '사회'}
                area={input.area || ''}
                comprehensiveQuestions={comprehensiveQuestions}
                onUpdate={(questions, usedPrompt, isIntermediateUpdate) => handleComprehensiveGenerated(questions, usedPrompt, isIntermediateUpdate)}
                onNext={() => {
                  setWorkflowData(prev => ({
                    ...prev,
                    currentStep: 'comprehensive-review'
                  }));
                }}
                onSupplementaryStatusChange={setIsSupplementaryGenerating}
                loading={loading}
                currentStep="generation"
              />
            )}
          </div>
        );

      case 'comprehensive-review':
        return (
          <div className="max-w-4xl mx-auto">
            {editablePassage && (
              <ComprehensiveQuestions
                editablePassage={editablePassage}
                division={input.division || ''}
                subject={input.subject || '사회'}
                area={input.area || ''}
                comprehensiveQuestions={comprehensiveQuestions}
                onUpdate={handleComprehensiveUpdate}
                onNext={handleMoveToFinalSave}
                onSupplementaryStatusChange={setIsSupplementaryGenerating}
                loading={loading}
                currentStep="review"
                lastUsedPrompt={lastUsedPrompts.comprehensive}
              />
            )}
          </div>
        );

      case 'final-save':
        return (
          <div className="max-w-4xl mx-auto">
            {editablePassage && (
              <FinalSave
                input={input}
                editablePassage={editablePassage}
                vocabularyQuestions={vocabularyQuestions}
                paragraphQuestions={paragraphQuestions}
                comprehensiveQuestions={comprehensiveQuestions}
                onComplete={handleStartNewSet}
              />
            )}
          </div>
        );

      default:
        return <div>알 수 없는 단계입니다.</div>;
    }
  };

  // 워크플로우 진행 상태 표시
  const renderProgressBar = () => {
    const steps = [
      { key: 'passage-generation', label: '지문 생성' },
      { key: 'passage-review', label: '지문 검토' },
      { key: 'vocabulary-generation', label: '어휘 문제 생성' },
      { key: 'vocabulary-review', label: '어휘 문제 검토' },
      { key: 'paragraph-generation', label: '문단 문제 생성' },
      { key: 'paragraph-review', label: '문단 문제 검토' },
      { key: 'comprehensive-generation', label: '종합 문제 생성' },
      { key: 'comprehensive-review', label: '종합 문제 검토' },
      { key: 'final-save', label: '저장' }
    ];

    const currentIndex = steps.findIndex(step => step.key === workflowData.currentStep);

    return (
      <div className="mb-8">
        <div className="grid grid-cols-9 gap-2">
          {steps.map((step, index) => {
            const isAccessible = isStepAccessible(step.key);
            const isCurrent = step.key === workflowData.currentStep;
            const isActive = index <= currentIndex;

            return (
              <button
                key={step.key}
                onClick={() => handleNavigateToStep(step.key)}
                disabled={!isAccessible}
                className={`
                  relative px-2 py-2 rounded-lg transition-all duration-200
                  flex flex-col items-center text-center
                  ${isActive
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-gray-600 border border-gray-200'
                  }
                  ${isAccessible
                    ? 'hover:shadow-lg hover:scale-105 cursor-pointer'
                    : 'cursor-not-allowed opacity-50'
                  }
                  ${isCurrent ? 'ring-2 ring-blue-300 ring-offset-2' : ''}
                `}
                title={isAccessible ? `${step.label}로 이동` : '아직 접근할 수 없습니다'}
              >
                <div className={`
                  w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mb-1
                  ${isActive
                    ? 'bg-white text-blue-600'
                    : 'bg-gray-100 text-gray-500'
                  }
                `}>
                  {index + 1}
                </div>
                <span className={`
                  text-xs font-medium leading-tight whitespace-nowrap
                  ${isActive ? 'text-white' : 'text-gray-600'}
                `}>
                  {step.label}
                </span>
                {isCurrent && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border-2 border-white"></div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <RoleAuthGuard allowedRoles={['admin', 'user']}>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">

          {/* 페이지 헤더 */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">
              콘텐츠 수정
            </h1>
            <p className="text-gray-600 mb-6">
              기존 콘텐츠 세트를 불러와서 수정할 수 있습니다.
            </p>

            {/* 콘텐츠 세트 ID 입력 섹션 */}
            {!isInitialized && (
              <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
                <h2 className="text-lg font-medium text-gray-800 mb-4">
                  수정할 콘텐츠 세트 ID 입력
                </h2>
                <div className="flex gap-4">
                  <input
                    type="text"
                    value={contentSetId}
                    onChange={(e) => setContentSetId(e.target.value)}
                    placeholder="콘텐츠 세트 ID를 입력하세요"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={() => loadContentSet(contentSetId)}
                    disabled={isLoading || !contentSetId.trim()}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isLoading && (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    )}
                    {isLoading ? '로드 중...' : '불러오기'}
                  </button>
                </div>

                {loadError && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {loadError}
                  </div>
                )}

                <div className="mt-4 text-sm text-gray-500">
                  <p>• <a href="/manage" className="text-blue-600 hover:underline">DB 관리</a> 페이지에서 콘텐츠 세트 ID를 확인할 수 있습니다.</p>
                  <p>• ID는 UUID 형식입니다. (예: 550e8400-e29b-41d4-a716-446655440000)</p>
                </div>
              </div>
            )}
          </div>

          {/* 초기화된 후 워크플로우 표시 */}
          {isInitialized && (
            <>
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 text-blue-800">
                  <span className="text-blue-600">✏️</span>
                  <span className="font-medium">수정 모드</span>
                </div>
                <p className="text-blue-700 text-sm mt-1">
                  ID: {contentSetId} 콘텐츠를 수정하고 있습니다.
                </p>
              </div>

              {/* 진행 상태 바 */}
              {renderProgressBar()}

              {/* 현재 단계 렌더링 */}
              {renderCurrentStep()}
            </>
          )}

          {/* 로딩 상태 */}
          {workflowData.loading && workflowData.currentStep !== 'passage-generation' && (
            <div
              className="fixed inset-0 flex items-center justify-center z-50"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            >
              <div className="bg-white backdrop-blur-sm p-8 rounded-xl shadow-lg border border-gray-100 text-center">
                <div className="w-12 h-12 border-3 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                <h3 className="text-lg font-medium text-gray-800 mb-1">처리 중</h3>
                <p className="text-sm text-gray-500 mb-2">요청을 처리하고 있습니다</p>
                <p className="text-xs text-gray-400">잠시만 기다려주세요</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </RoleAuthGuard>
  );
}