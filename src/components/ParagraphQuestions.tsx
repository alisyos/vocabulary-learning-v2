'use client';

import { useState } from 'react';
import { ParagraphQuestionWorkflow, EditablePassage, ParagraphQuestionType } from '@/types';

interface ParagraphQuestionsProps {
  editablePassage: EditablePassage;
  division: string;
  paragraphQuestions: ParagraphQuestionWorkflow[];
  onUpdate: (questions: ParagraphQuestionWorkflow[]) => void;
  onNext: () => void;
  loading?: boolean;
  currentStep: 'generation' | 'review';
}

export default function ParagraphQuestions({
  editablePassage,
  division,
  paragraphQuestions,
  onUpdate,
  onNext,
  loading = false,
  currentStep
}: ParagraphQuestionsProps) {
  const [localQuestions, setLocalQuestions] = useState<ParagraphQuestionWorkflow[]>(paragraphQuestions);
  const [generatingParagraph, setGeneratingParagraph] = useState(false);
  
  // 문단 선택 관리 (기본적으로 모든 문단 선택)
  const [selectedParagraphs, setSelectedParagraphs] = useState<string[]>(
    editablePassage.paragraphs.map((_, index) => (index + 1).toString())
  );
  
  // 문제 유형 선택 (기본값: Random)
  const [selectedQuestionType, setSelectedQuestionType] = useState<ParagraphQuestionType>('Random');

  // 문단 선택/해제
  const handleParagraphToggle = (paragraphIndex: string) => {
    setSelectedParagraphs(prev => 
      prev.includes(paragraphIndex) 
        ? prev.filter(id => id !== paragraphIndex)
        : [...prev, paragraphIndex]
    );
  };

  // 전체 선택/해제
  const handleSelectAll = () => {
    const allParagraphIndices = editablePassage.paragraphs.map((_, index) => (index + 1).toString());
    setSelectedParagraphs(prev => 
      prev.length === allParagraphIndices.length ? [] : allParagraphIndices
    );
  };

  // 문단 문제 생성
  const handleGenerateParagraph = async () => {
    if (selectedParagraphs.length === 0) {
      alert('생성할 문단을 선택해주세요.');
      return;
    }

    setGeneratingParagraph(true);

    try {
      const response = await fetch('/api/generate-paragraph', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paragraphs: editablePassage.paragraphs,
          selectedParagraphs: selectedParagraphs.map(p => parseInt(p)),
          questionType: selectedQuestionType,
          division,
          title: editablePassage.title
        }),
      });

      if (!response.ok) {
        throw new Error('문단 문제 생성에 실패했습니다.');
      }

      const result = await response.json();
      const newQuestions = result.paragraphQuestions || [];
      
      setLocalQuestions(newQuestions);
      onUpdate(newQuestions);

    } catch (error) {
      console.error('Error generating paragraph questions:', error);
      alert('문단 문제 생성 중 오류가 발생했습니다.');
    } finally {
      setGeneratingParagraph(false);
    }
  };

  // 문제 수정
  const handleQuestionUpdate = (questionId: string, field: keyof ParagraphQuestionWorkflow, value: any) => {
    const updatedQuestions = localQuestions.map(q => 
      q.id === questionId ? { ...q, [field]: value } : q
    );
    setLocalQuestions(updatedQuestions);
    onUpdate(updatedQuestions);
  };

  // 옵션 수정
  const handleOptionUpdate = (questionId: string, optionIndex: number, value: string) => {
    const updatedQuestions = localQuestions.map(q => 
      q.id === questionId 
        ? { 
            ...q, 
            options: q.options.map((opt, idx) => idx === optionIndex ? value : opt)
          } 
        : q
    );
    setLocalQuestions(updatedQuestions);
    onUpdate(updatedQuestions);
  };

  // 문제 유형별 설명
  const getQuestionTypeDescription = (type: ParagraphQuestionType) => {
    switch (type) {
      case 'Random':
        return '5가지 유형의 문제를 1개씩 생성합니다.';
      case '어절 순서 맞추기':
        return '문장의 어절들을 올바른 순서로 배열하는 문제입니다.';
      case '빈칸 채우기':
        return '문맥에 맞는 적절한 단어를 선택하는 문제입니다.';
      case '유의어 고르기':
        return '제시된 단어와 비슷한 의미의 단어를 찾는 문제입니다.';
      case '반의어 고르기':
        return '제시된 단어와 반대 의미의 단어를 찾는 문제입니다.';
      case '문단 요약':
        return '문단의 핵심 내용을 가장 잘 요약한 문장을 선택하는 문제입니다.';
      default:
        return '';
    }
  };

  if (currentStep === 'generation') {
    return (
      <>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-bold text-gray-800">5단계: 문단 문제 생성</h2>
              <button
                onClick={handleGenerateParagraph}
                disabled={generatingParagraph || selectedParagraphs.length === 0}
                className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
              >
                {generatingParagraph 
                  ? '생성 중...' 
                  : selectedParagraphs.length === 0 
                    ? '문단 선택 필요'
                    : `${selectedParagraphs.length}개 문단으로 생성`
                }
              </button>
            </div>
            <span className="text-sm text-orange-600 bg-orange-50 px-3 py-1 rounded-full">
              문제 생성
            </span>
          </div>

          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-800">문단 선택</h3>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  {selectedParagraphs.length}/{editablePassage.paragraphs.length}개 선택됨
                </span>
                <button
                  onClick={handleSelectAll}
                  className="text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded transition-colors"
                >
                  {selectedParagraphs.length === editablePassage.paragraphs.length ? '전체 해제' : '전체 선택'}
                </button>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-3">
                문제로 만들 문단을 선택하세요 (총 {editablePassage.paragraphs.length}개):
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                {editablePassage.paragraphs.map((paragraph, index) => {
                  const paragraphNumber = (index + 1).toString();
                  const isSelected = selectedParagraphs.includes(paragraphNumber);
                  
                  return (
                    <label 
                      key={index} 
                      className={`
                        flex items-start space-x-3 p-3 rounded border cursor-pointer transition-all
                        ${isSelected 
                          ? 'bg-blue-50 border-blue-200 text-blue-900' 
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                        }
                      `}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleParagraphToggle(paragraphNumber)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 mt-1"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium mb-1">
                          문단 {index + 1}
                        </div>
                        <div className="text-sm text-gray-600 line-clamp-2">
                          {paragraph}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">문제 유형 선택</h3>
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                문제 형태 *
              </label>
              <select
                value={selectedQuestionType}
                onChange={(e) => setSelectedQuestionType(e.target.value as ParagraphQuestionType)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                {(['Random', '어절 순서 맞추기', '빈칸 채우기', '유의어 고르기', '반의어 고르기', '문단 요약'] as ParagraphQuestionType[]).map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              
              <div className="mt-3 text-sm text-gray-600">
                <p><strong>선택된 유형:</strong> {selectedQuestionType}</p>
                {selectedQuestionType === 'Random' ? (
                  <p>• 선택된 문단 별로 5가지 유형을 1개씩 5개 문제가 생성됩니다.</p>
                ) : (
                  <p>• 선택된 문단 별로 {selectedQuestionType} 유형의 5개 문제가 생성됩니다.</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleGenerateParagraph}
              disabled={generatingParagraph || selectedParagraphs.length === 0}
              className="bg-orange-600 text-white px-8 py-3 rounded-md hover:bg-orange-700 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {generatingParagraph 
                ? '문단 문제 생성 중...' 
                : selectedParagraphs.length === 0 
                  ? '문단을 선택해주세요'
                  : `선택된 ${selectedParagraphs.length}개 문단으로 문제 생성하기`
              }
            </button>
          </div>
        </div>

        {/* 문단 문제 생성 로딩 모달 */}
        {generatingParagraph && (
          <div 
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          >
            <div className="bg-white backdrop-blur-sm p-8 rounded-xl shadow-lg border border-gray-100 text-center">
              {/* 로딩 스피너 */}
              <div className="w-12 h-12 border-3 border-gray-200 border-t-orange-600 rounded-full animate-spin mx-auto mb-4"></div>
              
              {/* 메시지 */}
              <h3 className="text-lg font-medium text-gray-800 mb-1">
                문단 문제 생성 중
              </h3>
              <p className="text-sm text-gray-500 mb-2">
                선택된 {selectedParagraphs.length}개 문단으로 {selectedQuestionType} 문제를 생성하고 있습니다
              </p>
              <p className="text-xs text-gray-400">
                잠시만 기다려주세요
              </p>
            </div>
          </div>
        )}
      </>
    );
  }

  // 검토 단계
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-bold text-gray-800">6단계: 문단 문제 검토 및 수정</h2>
          <button
            onClick={onNext}
            disabled={loading || localQuestions.length === 0}
            className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
          >
            {loading ? '처리 중...' : '7단계: 종합 문제 생성하기'}
          </button>
        </div>
        <span className="text-sm text-orange-600 bg-orange-50 px-3 py-1 rounded-full">
          검토 및 수정
        </span>
      </div>

      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">
            문단 문제 ({localQuestions.length}개)
          </h3>
        </div>

        <div className="space-y-6">
          {localQuestions.map((question, qIndex) => (
            <div key={question.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-md font-medium text-gray-800">문제 {qIndex + 1} - {question.type}</h4>
                  <p className="text-sm text-gray-600">문단 {question.paragraphNumber}</p>
                </div>
              </div>

              {/* 해당 문단 내용 */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-700 mb-2">문단 {question.paragraphNumber} 내용:</div>
                <div className="text-sm text-gray-800">{question.paragraphText}</div>
              </div>

              {/* 질문 */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  질문
                </label>
                <textarea
                  value={question.question}
                  onChange={(e) => handleQuestionUpdate(question.id, 'question', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm min-h-[80px] resize-vertical"
                  placeholder="질문을 입력하세요"
                />
              </div>

              {/* 선택지 */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  선택지
                </label>
                <div className="space-y-2">
                  {question.options.map((option, oIndex) => (
                    <div key={oIndex} className="flex items-center gap-2">
                      <span className="text-sm text-gray-500 min-w-[20px]">
                        {oIndex + 1}.
                      </span>
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => handleOptionUpdate(question.id, oIndex, e.target.value)}
                        className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                        placeholder={`선택지 ${oIndex + 1}`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* 정답 및 해설 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    정답
                  </label>
                  <select
                    value={question.answer}
                    onChange={(e) => handleQuestionUpdate(question.id, 'answer', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                  >
                    {question.options.map((_, optionIndex) => (
                      <option key={optionIndex} value={(optionIndex + 1).toString()}>
                        {optionIndex + 1}번
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 해설 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  해설
                </label>
                <textarea
                  value={question.explanation}
                  onChange={(e) => handleQuestionUpdate(question.id, 'explanation', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm min-h-[80px] resize-vertical"
                  placeholder="해설을 입력하세요"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {localQuestions.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          생성된 문단 문제가 없습니다.
        </div>
      )}
    </div>
  );
}