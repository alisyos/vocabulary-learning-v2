'use client';

import { useState } from 'react';
import { ComprehensiveQuestion, ComprehensiveQuestionType, EditablePassage } from '@/types';

interface ComprehensiveQuestionsProps {
  editablePassage: EditablePassage;
  division: string;
  comprehensiveQuestions: ComprehensiveQuestion[];
  onUpdate: (questions: ComprehensiveQuestion[]) => void;
  onNext: () => void;
  loading?: boolean;
  currentStep: 'generation' | 'review';
}

export default function ComprehensiveQuestions({
  editablePassage,
  division,
  comprehensiveQuestions,
  onUpdate,
  onNext,
  loading = false,
  currentStep
}: ComprehensiveQuestionsProps) {
  const [localQuestions, setLocalQuestions] = useState<ComprehensiveQuestion[]>(comprehensiveQuestions);
  const [selectedQuestionType, setSelectedQuestionType] = useState<ComprehensiveQuestionType>('Random');
  const [generatingComp, setGeneratingComp] = useState(false);

  const questionTypeOptions: ComprehensiveQuestionType[] = [
    'Random',
    '단답형',
    '문단별 순서 맞추기',
    '핵심 내용 요약',
    '핵심어/핵심문장 찾기'
  ];

  // 종합 문제 생성
  const handleGenerateComprehensive = async () => {
    setGeneratingComp(true);
    
    try {
      const response = await fetch('/api/generate-comprehensive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          passage: `${editablePassage.title}\n\n${editablePassage.paragraphs.join('\n\n')}`,
          division: division,
          questionType: selectedQuestionType
        }),
      });

      if (!response.ok) {
        throw new Error('종합 문제 생성에 실패했습니다.');
      }

      const result = await response.json();
      const questions = result.comprehensiveQuestions || [];
      
      setLocalQuestions(questions);
      onUpdate(questions);
      
    } catch (error) {
      console.error('Error:', error);
      alert('종합 문제 생성 중 오류가 발생했습니다.');
    } finally {
      setGeneratingComp(false);
    }
  };

  // 문제 수정
  const handleQuestionUpdate = (index: number, field: keyof ComprehensiveQuestion, value: string | string[]) => {
    const updated = [...localQuestions];
    updated[index] = { ...updated[index], [field]: value };
    setLocalQuestions(updated);
    onUpdate(updated);
  };

  // 문제 추가
  const addQuestion = () => {
    const newQuestion: ComprehensiveQuestion = {
      id: `comp_new_${Date.now()}`,
      type: '단답형',
      question: '질문을 입력하세요',
      answer: '정답을 입력하세요',
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

  // 선택지 수정 (객관식 문제용)
  const handleOptionUpdate = (questionIndex: number, optionIndex: number, value: string) => {
    const updated = [...localQuestions];
    if (updated[questionIndex].options) {
      updated[questionIndex].options![optionIndex] = value;
      setLocalQuestions(updated);
      onUpdate(updated);
    }
  };

  // 선택지 추가 (객관식 문제용)
  const addOption = (questionIndex: number) => {
    const updated = [...localQuestions];
    if (!updated[questionIndex].options) {
      updated[questionIndex].options = [];
    }
    updated[questionIndex].options!.push('새로운 선택지');
    setLocalQuestions(updated);
    onUpdate(updated);
  };

  // 선택지 제거 (객관식 문제용)
  const removeOption = (questionIndex: number, optionIndex: number) => {
    const updated = [...localQuestions];
    if (updated[questionIndex].options && updated[questionIndex].options!.length > 2) {
      updated[questionIndex].options!.splice(optionIndex, 1);
      setLocalQuestions(updated);
      onUpdate(updated);
    }
  };

  if (currentStep === 'generation') {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">5단계: 종합 문제 생성</h2>
          <span className="text-sm text-orange-600 bg-orange-50 px-3 py-1 rounded-full">
            문제 생성
          </span>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">문제 유형 선택</h3>
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              문제 형태 *
            </label>
            <select
              value={selectedQuestionType}
              onChange={(e) => setSelectedQuestionType(e.target.value as ComprehensiveQuestionType)}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              {questionTypeOptions.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            
            <div className="mt-3 text-sm text-gray-600">
              <p><strong>선택된 유형:</strong> {selectedQuestionType}</p>
              {selectedQuestionType === 'Random' ? (
                <p>• 4가지 유형을 3개씩 총 12개 문제가 생성됩니다.</p>
              ) : (
                <p>• {selectedQuestionType} 유형으로 12개 문제가 생성됩니다.</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleGenerateComprehensive}
            disabled={generatingComp}
            className="bg-orange-600 text-white px-8 py-3 rounded-md hover:bg-orange-700 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {generatingComp ? '종합 문제 생성 중...' : '12개 종합 문제 생성하기'}
          </button>
        </div>
      </div>
    );
  }

  // currentStep === 'review'
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">6단계: 종합 문제 검토 및 수정</h2>
        <span className="text-sm text-orange-600 bg-orange-50 px-3 py-1 rounded-full">
          검토 및 수정
        </span>
      </div>

      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">
            종합 문제 ({localQuestions.length}개)
          </h3>
          <button
            onClick={addQuestion}
            className="bg-green-100 text-green-700 px-4 py-2 rounded-md hover:bg-green-200 transition-colors text-sm font-medium"
          >
            + 문제 추가
          </button>
        </div>

        {/* 문제 유형별 분류 표시 */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-2">문제 유형별 분포</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            {['단답형', '문단별 순서 맞추기', '핵심 내용 요약', '핵심어/핵심문장 찾기'].map(type => {
              const count = localQuestions.filter(q => q.type === type).length;
              return (
                <div key={type} className="bg-white p-2 rounded text-center">
                  <div className="font-medium">{type}</div>
                  <div className="text-gray-600">{count}개</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          {localQuestions.map((question, qIndex) => (
            <div key={question.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <h4 className="text-md font-medium text-gray-800">문제 {qIndex + 1}</h4>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                    {question.type}
                  </span>
                </div>
                <button
                  onClick={() => removeQuestion(qIndex)}
                  className="text-red-500 hover:text-red-700 text-sm"
                  title="문제 삭제"
                >
                  ✕ 삭제
                </button>
              </div>

              {/* 문제 유형 변경 */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  문제 유형
                </label>
                <select
                  value={question.type}
                  onChange={(e) => handleQuestionUpdate(qIndex, 'type', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                >
                  <option value="단답형">단답형</option>
                  <option value="문단별 순서 맞추기">문단별 순서 맞추기</option>
                  <option value="핵심 내용 요약">핵심 내용 요약</option>
                  <option value="핵심어/핵심문장 찾기">핵심어/핵심문장 찾기</option>
                </select>
              </div>

              {/* 질문 */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  질문
                </label>
                <textarea
                  value={question.question}
                  onChange={(e) => handleQuestionUpdate(qIndex, 'question', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm min-h-[80px] resize-vertical"
                  placeholder="질문을 입력하세요"
                />
              </div>

              {/* 선택지 (단답형이 아닌 경우) */}
              {question.type !== '단답형' && (
                <div className="mb-3">
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      선택지
                    </label>
                    <button
                      onClick={() => addOption(qIndex)}
                      className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                    >
                      + 선택지 추가
                    </button>
                  </div>
                  <div className="space-y-2">
                    {question.options?.map((option, oIndex) => (
                      <div key={oIndex} className="flex items-center gap-2">
                        <span className="text-sm text-gray-500 min-w-[20px]">
                          {oIndex + 1}.
                        </span>
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => handleOptionUpdate(qIndex, oIndex, e.target.value)}
                          className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                          placeholder={`선택지 ${oIndex + 1}`}
                        />
                        <button
                          onClick={() => removeOption(qIndex, oIndex)}
                          className="text-red-500 hover:text-red-700 text-sm px-2"
                          title="선택지 삭제"
                        >
                          ✕
                        </button>
                      </div>
                    )) || (
                      <button
                        onClick={() => {
                          const updated = [...localQuestions];
                          updated[qIndex].options = ['선택지 1', '선택지 2', '선택지 3', '선택지 4', '선택지 5'];
                          setLocalQuestions(updated);
                          onUpdate(updated);
                        }}
                        className="w-full p-2 border-2 border-dashed border-gray-300 rounded-md text-gray-500 hover:border-gray-400"
                      >
                        + 선택지 추가하기
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* 정답 */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  정답
                </label>
                {question.type === '단답형' ? (
                  <input
                    type="text"
                    value={question.answer}
                    onChange={(e) => handleQuestionUpdate(qIndex, 'answer', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                    placeholder="정답을 입력하세요"
                  />
                ) : (
                  <select
                    value={question.answer}
                    onChange={(e) => handleQuestionUpdate(qIndex, 'answer', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                  >
                    {question.options?.map((option, index) => (
                      <option key={index} value={option}>
                        {index + 1}. {option}
                      </option>
                    )) || <option value="">선택지를 먼저 추가해주세요</option>}
                  </select>
                )}
              </div>

              {/* 해설 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  해설
                </label>
                <textarea
                  value={question.explanation}
                  onChange={(e) => handleQuestionUpdate(qIndex, 'explanation', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm min-h-[60px] resize-vertical"
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
          className="bg-orange-600 text-white px-6 py-2 rounded-md hover:bg-orange-700 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {loading ? '처리 중...' : '7단계: 최종 저장하기'}
        </button>
      </div>
    </div>
  );
} 