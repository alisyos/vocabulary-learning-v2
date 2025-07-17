'use client';

import { useState } from 'react';
import { VocabularyQuestion, EditablePassage } from '@/types';

interface VocabularyQuestionsProps {
  editablePassage: EditablePassage;
  division: string;
  vocabularyQuestions: VocabularyQuestion[];
  onUpdate: (questions: VocabularyQuestion[]) => void;
  onNext: () => void;
  loading?: boolean;
  currentStep: 'generation' | 'review';
}

export default function VocabularyQuestions({
  editablePassage,
  division,
  vocabularyQuestions,
  onUpdate,
  onNext,
  loading = false,
  currentStep
}: VocabularyQuestionsProps) {
  const [localQuestions, setLocalQuestions] = useState<VocabularyQuestion[]>(vocabularyQuestions);
  const [generatingVocab, setGeneratingVocab] = useState(false);

  // 어휘 문제 생성
  const handleGenerateVocabulary = async () => {
    setGeneratingVocab(true);
    
    try {
      const response = await fetch('/api/generate-vocabulary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          terms: editablePassage.footnote,
          passage: `${editablePassage.title}\n\n${editablePassage.paragraphs.join('\n\n')}`,
          division: division
        }),
      });

      if (!response.ok) {
        throw new Error('어휘 문제 생성에 실패했습니다.');
      }

      const result = await response.json();
      const questions = result.vocabularyQuestions || [];
      
      setLocalQuestions(questions);
      onUpdate(questions);
      
    } catch (error) {
      console.error('Error:', error);
      alert('어휘 문제 생성 중 오류가 발생했습니다.');
    } finally {
      setGeneratingVocab(false);
    }
  };

  // 문제 수정
  const handleQuestionUpdate = (index: number, field: keyof VocabularyQuestion, value: string | string[]) => {
    const updated = [...localQuestions];
    updated[index] = { ...updated[index], [field]: value };
    setLocalQuestions(updated);
    onUpdate(updated);
  };

  // 문제 추가
  const addQuestion = () => {
    const newQuestion: VocabularyQuestion = {
      id: `vocab_new_${Date.now()}`,
      term: '새로운 용어',
      question: '질문을 입력하세요',
      options: ['선택지 1', '선택지 2', '선택지 3', '선택지 4', '선택지 5'],
      answer: '선택지 1',
      explanation: '해설을 입력하세요'
    };
    
    const updated = [...localQuestions, newQuestion];
    setLocalQuestions(updated);
    onUpdate(updated);
  };

  // 문제 삭제
  const removeQuestion = (index: number) => {
    if (localQuestions.length <= 1) {
      alert('최소 1개의 문제는 있어야 합니다.');
      return;
    }
    
    const updated = localQuestions.filter((_, i) => i !== index);
    setLocalQuestions(updated);
    onUpdate(updated);
  };

  // 선택지 수정
  const handleOptionUpdate = (questionIndex: number, optionIndex: number, value: string) => {
    const updated = [...localQuestions];
    updated[questionIndex].options[optionIndex] = value;
    setLocalQuestions(updated);
    onUpdate(updated);
  };

  if (currentStep === 'generation') {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">3단계: 어휘 문제 생성</h2>
          <span className="text-sm text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
            문제 생성
          </span>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">추출된 용어 목록</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">
              총 {editablePassage.footnote.length}개의 용어가 추출되었습니다:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {editablePassage.footnote.map((footnote, index) => (
                <div key={index} className="text-sm bg-white p-2 rounded border">
                  {footnote.split(':')[0]?.trim() || footnote}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleGenerateVocabulary}
            disabled={generatingVocab || editablePassage.footnote.length === 0}
            className="bg-purple-600 text-white px-8 py-3 rounded-md hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {generatingVocab ? '어휘 문제 생성 중...' : `${editablePassage.footnote.length}개 어휘 문제 생성하기`}
          </button>
        </div>
      </div>
    );
  }

  // currentStep === 'review'
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">4단계: 어휘 문제 검토 및 수정</h2>
        <span className="text-sm text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
          검토 및 수정
        </span>
      </div>

      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">
            어휘 문제 ({localQuestions.length}개)
          </h3>
          <button
            onClick={addQuestion}
            className="bg-green-100 text-green-700 px-4 py-2 rounded-md hover:bg-green-200 transition-colors text-sm font-medium"
          >
            + 문제 추가
          </button>
        </div>

        <div className="space-y-6">
          {localQuestions.map((question, qIndex) => (
            <div key={question.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-4">
                <h4 className="text-md font-medium text-gray-800">문제 {qIndex + 1}</h4>
                <button
                  onClick={() => removeQuestion(qIndex)}
                  className="text-red-500 hover:text-red-700 text-sm"
                  title="문제 삭제"
                >
                  ✕ 삭제
                </button>
              </div>

              {/* 용어 */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  대상 용어
                </label>
                <input
                  type="text"
                  value={question.term}
                  onChange={(e) => handleQuestionUpdate(qIndex, 'term', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  placeholder="용어를 입력하세요"
                />
              </div>

              {/* 질문 */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  질문
                </label>
                <textarea
                  value={question.question}
                  onChange={(e) => handleQuestionUpdate(qIndex, 'question', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm min-h-[80px] resize-vertical"
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
                        onChange={(e) => handleOptionUpdate(qIndex, oIndex, e.target.value)}
                        className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                        placeholder={`선택지 ${oIndex + 1}`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* 정답 */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  정답
                </label>
                <select
                  value={question.answer}
                  onChange={(e) => handleQuestionUpdate(qIndex, 'answer', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                >
                  {question.options.map((option, index) => (
                    <option key={index} value={option}>
                      {index + 1}. {option}
                    </option>
                  ))}
                </select>
              </div>

              {/* 해설 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  해설
                </label>
                <textarea
                  value={question.explanation}
                  onChange={(e) => handleQuestionUpdate(qIndex, 'explanation', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm min-h-[60px] resize-vertical"
                  placeholder="해설을 입력하세요"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 다음 단계 버튼 */}
      <div className="flex justify-end pt-4 border-t">
        <button
          onClick={onNext}
          disabled={loading || localQuestions.length === 0}
          className="bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {loading ? '처리 중...' : '5단계: 종합 문제 생성하기'}
        </button>
      </div>
    </div>
  );
} 