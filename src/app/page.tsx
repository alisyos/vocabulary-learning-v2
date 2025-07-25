'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import AuthGuard from '@/components/AuthGuard';
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
  ParagraphQuestionWorkflow,
  ComprehensiveQuestion,
  WorkflowData,
  WorkflowStep
} from '@/types';

// 기본 입력값 상수
const DEFAULT_INPUT: PassageInput = {
  division: '초등학교 중학년(3-4학년)',
  length: '4-5문장으로 구성한 5-6개 단락',
  subject: '사회',
  grade: '',
  area: '',
  maintopic: '',
  subtopic: '',
  keyword: '',
  textType: undefined,
};

export default function Home() {
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

  // 1단계: 지문 생성
  const handlePassageGeneration = async (input: PassageInput) => {
    setWorkflowData(prev => ({ ...prev, loading: true, input }));

    try {
      const response = await fetch('/api/generate-passage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error('지문 생성에 실패했습니다.');
      }

      const result: Passage = await response.json();
      
      // 생성된 지문을 편집 가능한 형태로 변환
      const editablePassage: EditablePassage = {
        title: result.passages[0]?.title || '',
        paragraphs: result.passages[0]?.paragraphs || [],
        footnote: result.passages[0]?.footnote || []
      };

      setWorkflowData(prev => ({
        ...prev,
        generatedPassage: result,
        editablePassage,
        currentStep: 'passage-review',
        loading: false
      }));

    } catch (error) {
      console.error('Error:', error);
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
  const handleVocabularyGenerated = (questions: VocabularyQuestion[]) => {
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
  const handleParagraphGenerated = (questions: ParagraphQuestionWorkflow[]) => {
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
  const handleComprehensiveGenerated = (questions: ComprehensiveQuestion[]) => {
    setWorkflowData(prev => ({
      ...prev,
      comprehensiveQuestions: questions,
      currentStep: 'comprehensive-review'
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
    setWorkflowData({
      input: { ...DEFAULT_INPUT },
      generatedPassage: null,
      editablePassage: null,
      vocabularyQuestions: [],
      paragraphQuestions: [],
      comprehensiveQuestions: [],
      currentStep: 'passage-generation',
      loading: false
    });
  };

  // 특정 단계로 이동
  const handleNavigateToStep = (stepKey: string) => {
    // 이동 가능한지 확인
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
        return true; // 항상 접근 가능
      
      case 'passage-review':
        return !!generatedPassage; // 지문이 생성되었을 때
      
      case 'vocabulary-generation':
      case 'vocabulary-review':
        return !!editablePassage; // 지문이 수정되었을 때
      
      case 'paragraph-generation':
      case 'paragraph-review':
        return vocabularyQuestions.length > 0; // 어휘 문제가 생성되었을 때
      
      case 'comprehensive-generation':
      case 'comprehensive-review':
        return paragraphQuestions.length > 0; // 문단 문제가 생성되었을 때
      
      case 'final-save':
        return comprehensiveQuestions.length > 0; // 종합 문제가 생성되었을 때
      
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
            {/* 입력 폼 */}
            <div className="lg:col-span-1">
              <PassageForm 
                onSubmit={handlePassageGeneration} 
                loading={loading}
                initialData={input}
              />
            </div>

            {/* 결과 표시 */}
            <div className="lg:col-span-2">
              {generatedPassage && (
                <PassageDisplay
                  passage={generatedPassage}
                  onGenerateQuestions={() => {}} // 비활성화
                  questionsLoading={false}
                />
              )}
            </div>
          </div>
        );

      case 'passage-review':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 좌측: 학습 지문 생성 폼 (고정) */}
            <div className="lg:col-span-1">
              <PassageForm 
                onSubmit={handlePassageGeneration} 
                loading={loading}
                initialData={input}
              />
            </div>

            {/* 우측: 지문 검토 및 수정 */}
            <div className="lg:col-span-2">
              {editablePassage && (
                <PassageReview
                  editablePassage={editablePassage}
                  onUpdate={handlePassageUpdate}
                  onNext={handleMoveToVocabularyGeneration}
                  loading={loading}
                />
              )}
            </div>
          </div>
        );

      case 'vocabulary-generation':
        return (
          <div className="max-w-4xl mx-auto">
            {editablePassage && (
              <>
                {(() => {
                  console.log('3단계 - input.keywords:', input.keywords);
                  console.log('3단계 - 전체 input:', input);
                  console.log('3단계 - input 객체의 모든 키:', Object.keys(input));
                  console.log('3단계 - input 객체 전체 구조:', JSON.stringify(input, null, 2));
                  return null;
                })()}
                <VocabularyQuestions
                  editablePassage={editablePassage}
                  division={input.division || ''}
                  keywords={input.keyword}
                  vocabularyQuestions={vocabularyQuestions}
                  onUpdate={handleVocabularyGenerated}
                  onNext={() => {}} // 생성 단계에서는 사용 안함
                  loading={loading}
                  currentStep="generation"
                />
              </>
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
                vocabularyQuestions={vocabularyQuestions}
                onUpdate={handleVocabularyUpdate}
                onNext={handleMoveToParagraphGeneration}
                loading={loading}
                currentStep="review"
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
                onNext={() => {}} // 생성 단계에서는 사용 안함
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
                comprehensiveQuestions={comprehensiveQuestions}
                onUpdate={handleComprehensiveGenerated}
                onNext={() => {}} // 생성 단계에서는 사용 안함
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
                comprehensiveQuestions={comprehensiveQuestions}
                onUpdate={handleComprehensiveUpdate}
                onNext={handleMoveToFinalSave}
                loading={loading}
                currentStep="review"
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

  // 워크플로우 진행 상태 표시 (네비게이션 기능 포함)
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
                {/* 단계 번호 */}
                <div className={`
                  w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mb-1
                  ${isActive 
                    ? 'bg-white text-blue-600' 
                    : 'bg-gray-100 text-gray-500'
                  }
                `}>
                  {index + 1}
                </div>
                
                {/* 단계 라벨 */}
                <span className={`
                  text-xs font-medium leading-tight whitespace-nowrap
                  ${isActive ? 'text-white' : 'text-gray-600'}
                `}>
                  {step.label}
                </span>
                
                {/* 현재 단계 표시 */}
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
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">

          {/* 진행 상태 바 */}
          {renderProgressBar()}

          {/* 현재 단계 렌더링 */}
          {renderCurrentStep()}

          {/* 로딩 상태 */}
          {workflowData.loading && (
            <div 
              className="fixed inset-0 flex items-center justify-center z-50"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            >
              <div className="bg-white backdrop-blur-sm p-8 rounded-xl shadow-lg border border-gray-100 text-center">
                {/* 로딩 스피너 */}
                <div className="w-12 h-12 border-3 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                
                {/* 메시지 */}
                <h3 className="text-lg font-medium text-gray-800 mb-1">
                  {workflowData.currentStep === 'passage-generation' 
                    ? '지문 생성 중' 
                    : '처리 중'
                  }
                </h3>
                <p className="text-sm text-gray-500 mb-2">
                  {workflowData.currentStep === 'passage-generation' 
                    ? '교육과정에 맞는 맞춤형 지문을 생성하고 있습니다' 
                    : '요청을 처리하고 있습니다'
                  }
                </p>
                <p className="text-xs text-gray-400">
                  잠시만 기다려주세요
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
