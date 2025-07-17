'use client';

import { useState } from 'react';
import PassageForm from '@/components/PassageForm';
import PassageDisplay from '@/components/PassageDisplay';
import PassageReview from '@/components/PassageReview';
import VocabularyQuestions from '@/components/VocabularyQuestions';
import ComprehensiveQuestions from '@/components/ComprehensiveQuestions';
import FinalSave from '@/components/FinalSave';
import { 
  PassageInput, 
  Passage, 
  EditablePassage,
  VocabularyQuestion,
  ComprehensiveQuestion,
  WorkflowData
} from '@/types';

export default function Home() {
  const [workflowData, setWorkflowData] = useState<WorkflowData>({
    input: {} as PassageInput,
    generatedPassage: null,
    editablePassage: null,
    vocabularyQuestions: [],
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

  // 5단계로 이동: 종합 문제 생성
  const handleMoveToComprehensiveGeneration = () => {
    setWorkflowData(prev => ({
      ...prev,
      currentStep: 'comprehensive-generation'
    }));
  };

  // 5단계: 종합 문제 생성 완료 후 6단계로 이동
  const handleComprehensiveGenerated = (questions: ComprehensiveQuestion[]) => {
    setWorkflowData(prev => ({
      ...prev,
      comprehensiveQuestions: questions,
      currentStep: 'comprehensive-review'
    }));
  };

  // 6단계: 종합 문제 업데이트
  const handleComprehensiveUpdate = (questions: ComprehensiveQuestion[]) => {
    setWorkflowData(prev => ({
      ...prev,
      comprehensiveQuestions: questions
    }));
  };

  // 7단계로 이동: 최종 저장
  const handleMoveToFinalSave = () => {
    setWorkflowData(prev => ({
      ...prev,
      currentStep: 'final-save'
    }));
  };

  // 새로운 세트 시작 (모든 데이터 초기화)
  const handleStartNewSet = () => {
    setWorkflowData({
      input: {} as PassageInput,
      generatedPassage: null,
      editablePassage: null,
      vocabularyQuestions: [],
      comprehensiveQuestions: [],
      currentStep: 'passage-generation',
      loading: false
    });
  };

  // 워크플로우 단계별 렌더링
  const renderCurrentStep = () => {
    const { currentStep, loading, editablePassage, generatedPassage, vocabularyQuestions, comprehensiveQuestions, input } = workflowData;

    switch (currentStep) {
      case 'passage-generation':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 입력 폼 */}
            <div className="lg:col-span-1">
              <PassageForm 
                onSubmit={handlePassageGeneration} 
                loading={loading} 
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
              <VocabularyQuestions
                editablePassage={editablePassage}
                division={input.division || ''}
                vocabularyQuestions={vocabularyQuestions}
                onUpdate={handleVocabularyGenerated}
                onNext={() => {}} // 생성 단계에서는 사용 안함
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
                vocabularyQuestions={vocabularyQuestions}
                onUpdate={handleVocabularyUpdate}
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
      { key: 'passage-generation', label: '1. 지문 생성' },
      { key: 'passage-review', label: '2. 지문 검토' },
      { key: 'vocabulary-generation', label: '3. 어휘 문제 생성' },
      { key: 'vocabulary-review', label: '4. 어휘 문제 검토' },
      { key: 'comprehensive-generation', label: '5. 종합 문제 생성' },
      { key: 'comprehensive-review', label: '6. 종합 문제 검토' },
      { key: 'final-save', label: '7. 저장' }
    ];

    const currentIndex = steps.findIndex(step => step.key === workflowData.currentStep);

    return (
      <div className="bg-white rounded-lg shadow-sm p-4 mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.key} className="flex items-center">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                ${index <= currentIndex 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-600'
                }
              `}>
                {index + 1}
              </div>
              <span className={`
                ml-2 text-sm font-medium
                ${index <= currentIndex ? 'text-blue-600' : 'text-gray-400'}
              `}>
                {step.label}
              </span>
              {index < steps.length - 1 && (
                <div className={`
                  w-8 h-0.5 mx-4
                  ${index < currentIndex ? 'bg-blue-600' : 'bg-gray-200'}
                `} />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            학습 지문 및 문제 생성 시스템
          </h1>
          <p className="text-gray-600">
            AI를 활용하여 교육과정 기반의 맞춤형 학습 콘텐츠를 생성합니다
          </p>
        </div>

        {/* 진행 상태 바 */}
        {renderProgressBar()}

        {/* 현재 단계 렌더링 */}
        {renderCurrentStep()}

        {/* 로딩 상태 */}
        {workflowData.loading && (
          <div className="fixed inset-0 flex items-center justify-center z-50">
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
              <p className="text-sm text-gray-500">
                잠시만 기다려주세요
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
