'use client';

import { useState, useEffect } from 'react';
import { ComprehensiveQuestion, ComprehensiveQuestionType, EditablePassage } from '@/types';
import PromptModal from './PromptModal';

interface ComprehensiveQuestionsProps {
  editablePassage: EditablePassage;
  division: string;
  comprehensiveQuestions: ComprehensiveQuestion[];
  onUpdate: (questions: ComprehensiveQuestion[], usedPrompt?: string) => void;
  onNext: () => void;
  loading?: boolean;
  currentStep: 'generation' | 'review';
  lastUsedPrompt?: string; // GPT에 보낸 프롬프트
}

export default function ComprehensiveQuestions({
  editablePassage,
  division,
  comprehensiveQuestions,
  onUpdate,
  onNext,
  loading = false,
  currentStep,
  lastUsedPrompt = ''
}: ComprehensiveQuestionsProps) {
  const [localQuestions, setLocalQuestions] = useState<ComprehensiveQuestion[]>(comprehensiveQuestions);
  
  // Props 변경 시 디버깅
  console.log('ComprehensiveQuestions props:', {
    comprehensiveQuestionsLength: comprehensiveQuestions.length,
    localQuestionsLength: localQuestions.length,
    currentStep,
    propsQuestions: comprehensiveQuestions.slice(0, 2).map(q => ({
      id: q.id,
      type: q.type, 
      isSupplementary: q.isSupplementary
    }))
  });
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [selectedQuestionType, setSelectedQuestionType] = useState<ComprehensiveQuestionType>('Random');
  const [generatingComp, setGeneratingComp] = useState(false);
  const [includeSupplementary, setIncludeSupplementary] = useState(true);
  const [questionCount, setQuestionCount] = useState<number>(5);

  // props가 변경될 때 localQuestions 업데이트
  useEffect(() => {
    console.log('useEffect triggered - updating localQuestions from props:', {
      propsLength: comprehensiveQuestions.length,
      localLength: localQuestions.length
    });
    setLocalQuestions(comprehensiveQuestions);
  }, [comprehensiveQuestions]);

  const questionTypeOptions: ComprehensiveQuestionType[] = [
    'Random',
    '단답형',
    '핵심 내용 요약',
    '핵심문장 찾기',
    'OX문제',
    '자료분석하기'
  ];

  const questionCountOptions = [5, 10, 15];

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
          questionType: selectedQuestionType,
          questionCount: questionCount,
          includeSupplementary: includeSupplementary
        }),
      });

      if (!response.ok) {
        throw new Error('종합 문제 생성에 실패했습니다.');
      }

      const result = await response.json();
      const questions = result.comprehensiveQuestions || [];
      
      // API 응답 디버깅
      console.log('API Response received:', {
        totalQuestions: questions.length,
        basicQuestions: questions.filter((q: any) => !q.isSupplementary).length,
        supplementaryQuestions: questions.filter((q: any) => q.isSupplementary).length,
        firstFewQuestions: questions.slice(0, 3).map((q: any) => ({
          id: q.id,
          type: q.type,
          isSupplementary: q.isSupplementary,
          question: q.question?.substring(0, 30) + '...'
        }))
      });
      
      setLocalQuestions(questions);
      onUpdate(questions, result._metadata?.usedPrompt);
      
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
      <>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-bold text-gray-800">7단계: 종합 문제 생성</h2>
              <button
                onClick={handleGenerateComprehensive}
                disabled={generatingComp}
                className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
              >
                {generatingComp 
                  ? '생성 중...' 
                  : includeSupplementary 
                    ? `${questionCount + (questionCount * 2)}개 생성`
                    : `${questionCount}개 생성`
                }
              </button>
            </div>
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
                  <p>• 5가지 유형을 {questionCount / 5}개씩 총 {questionCount}개 문제가 생성됩니다.</p>
                ) : (
                  <p>• {selectedQuestionType} 유형으로 {questionCount}개 문제가 생성됩니다.</p>
                )}
                {includeSupplementary && (
                  <p className="text-orange-600 font-medium">• 보완 문제 포함 시 총 {questionCount + (questionCount * 2)}개 문제가 생성됩니다. (기본 {questionCount}개 + 보완 {questionCount * 2}개)</p>
                )}
              </div>
            </div>
             
            {/* 문제 개수 선택 */}
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                문제 개수 *
              </label>
              <select
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                {questionCountOptions.map((count) => (
                  <option key={count} value={count}>
                    {count}개
                  </option>
                ))}
              </select>
              <div className="mt-1 text-xs text-gray-600">
                <p>• 선택된 유형으로 생성되는 기본 문제 개수입니다.</p>
                {includeSupplementary && (
                  <p>• 보완 문제 포함 시 총 문제 수: 기본 {questionCount}개 + 보완 {questionCount * 2}개 = <strong>{questionCount + (questionCount * 2)}개</strong></p>
                )}
              </div>
            </div>

            {/* 보완 문제 선택 */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="supplementary"
                  checked={includeSupplementary}
                  onChange={(e) => setIncludeSupplementary(e.target.checked)}
                  className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 mt-0.5"
                />
                <div className="flex-1">
                  <label htmlFor="supplementary" className="text-sm font-medium text-gray-800 cursor-pointer">
                    보완 문제 생성
                  </label>
                  <div className="mt-1 text-xs text-gray-600">
                    <p>• 오답 시 학습 강화를 위한 추가 문제를 생성합니다</p>
                    <p>• 각 기본 문제당 2개의 보완 문제가 추가로 생성됩니다</p>
                    <p>• 총 문제 수: 기본 {questionCount}개 + 보완 {questionCount * 2}개 = <strong>{questionCount + (questionCount * 2)}개</strong></p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleGenerateComprehensive}
              disabled={generatingComp}
              className="bg-orange-600 text-white px-8 py-3 rounded-md hover:bg-orange-700 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {generatingComp 
                ? '종합 문제 생성 중...' 
                : includeSupplementary 
                  ? `${questionCount + (questionCount * 2)}개 종합 문제 생성하기 (보완 문제 포함)`
                  : `${questionCount}개 종합 문제 생성하기`
              }
            </button>
          </div>
        </div>

        {/* 종합 문제 생성 로딩 모달 */}
        {generatingComp && (
          <div 
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          >
            <div className="bg-white backdrop-blur-sm p-8 rounded-xl shadow-lg border border-gray-100 text-center">
              {/* 로딩 스피너 */}
              <div className="w-12 h-12 border-3 border-gray-200 border-t-orange-600 rounded-full animate-spin mx-auto mb-4"></div>
              
              {/* 메시지 */}
              <h3 className="text-lg font-medium text-gray-800 mb-1">
                종합 문제 생성 중
              </h3>
              <p className="text-sm text-gray-500 mb-2">
                {includeSupplementary 
                  ? `${questionCount}개 기본 문제 + ${questionCount * 2}개 보완 문제를 생성하고 있습니다`
                  : `${questionCount}개 종합 문제를 생성하고 있습니다`
                }
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

  // currentStep === 'review'
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-bold text-gray-800">8단계: 종합 문제 검토 및 수정</h2>
          <button
            onClick={onNext}
            disabled={loading || localQuestions.length === 0}
            className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
          >
            {loading ? '처리 중...' : '9단계: 최종 저장하기'}
          </button>
        </div>
        <div className="flex items-center space-x-2">
          {lastUsedPrompt && (
            <button
              onClick={() => setShowPromptModal(true)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md transition-colors font-medium text-sm flex items-center space-x-1"
              title="종합 문제 생성에 사용된 프롬프트 확인"
            >
              <span>📋</span>
              <span>프롬프트 확인</span>
            </button>
          )}
          <span className="text-sm text-orange-600 bg-orange-50 px-3 py-1 rounded-full">
            검토 및 수정
          </span>
        </div>
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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs mb-3">
            {['단답형', '핵심 내용 요약', '핵심문장 찾기', 'OX문제', '자료분석하기'].map(type => {
              const count = localQuestions.filter(q => q.type === type).length;
              const supplementaryCount = localQuestions.filter(q => q.type === type && q.isSupplementary).length;
              const mainCount = count - supplementaryCount;
              return (
                <div key={type} className="bg-white p-2 rounded text-center">
                  <div className="font-medium">{type}</div>
                  <div className="text-gray-600">{count}개</div>
                  {supplementaryCount > 0 && (
                    <div className="text-xs text-blue-600">
                      (기본 {mainCount}개 + 보완 {supplementaryCount}개)
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {localQuestions.some(q => q.isSupplementary) && (
            <div className="text-xs text-center text-gray-600 bg-white p-2 rounded">
              총 {localQuestions.length}개 문제 (기본 {localQuestions.filter(q => !q.isSupplementary).length}개 + 보완 {localQuestions.filter(q => q.isSupplementary).length}개)
            </div>
          )}
        </div>

        <div className="space-y-6">
          {(() => {
            // 기본 문제와 해당 보완 문제들을 그룹으로 정렬
            const basicQuestions = localQuestions.filter(q => !q.isSupplementary);
            const supplementaryQuestions = localQuestions.filter(q => q.isSupplementary);
            
            // 디버깅 로그
            console.log('ComprehensiveQuestions Debug:', {
              totalQuestions: localQuestions.length,
              basicQuestions: basicQuestions.length,
              supplementaryQuestions: supplementaryQuestions.length,
              questions: localQuestions.map(q => ({
                id: q.id,
                type: q.type,
                isSupplementary: q.isSupplementary,
                question: q.question.substring(0, 30) + '...'
              }))
            });
            
            // 기본 문제 순서대로 배치하되, 각 기본 문제 바로 뒤에 해당 보완 문제들 배치
            const orderedQuestions: ComprehensiveQuestion[] = [];
            
            basicQuestions.forEach(basicQ => {
              // 기본 문제 먼저 추가
              orderedQuestions.push(basicQ);
              
              // 해당 기본 문제의 보완 문제들 찾아서 추가
              const relatedSupplementary = supplementaryQuestions.filter(
                supQ => supQ.originalQuestionId === basicQ.id
              );
              orderedQuestions.push(...relatedSupplementary);
            });
            
            return orderedQuestions.map((question) => {
              // 보완 문제인 경우 원본 문제 정보 표시
              const originalQuestion = question.isSupplementary 
                ? localQuestions.find(q => q.id === question.originalQuestionId)
                : null;
              
              // 기본 문제 번호 계산 (보완 문제는 기본 문제 번호를 참조)
              const basicQuestionNumber = question.isSupplementary
                ? basicQuestions.findIndex(q => q.id === question.originalQuestionId) + 1
                : basicQuestions.findIndex(q => q.id === question.id) + 1;
            
            return (
              <div key={question.id} className={`border rounded-lg p-4 ${
                question.isSupplementary 
                  ? 'border-blue-200 bg-blue-50 ml-6' 
                  : 'border-orange-200 bg-orange-50'
              }`}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <h4 className="text-md font-medium text-gray-800">
                      {question.isSupplementary 
                        ? `📚 보완 문제 (${originalQuestion?.type || '알 수 없음'} 유형)` 
                        : `🎯 기본 문제 ${basicQuestionNumber}`
                      }
                    </h4>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      {question.type}
                    </span>
                    {question.isSupplementary && (
                      <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded font-medium">
                        보완 문제
                      </span>
                    )}
                    {originalQuestion && (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                        → 기본 문제: {originalQuestion.question.substring(0, 20)}...
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      // 실제 localQuestions 배열에서의 인덱스를 찾아 삭제
                      const actualIndex = localQuestions.findIndex(q => q.id === question.id);
                      if (actualIndex !== -1) {
                        removeQuestion(actualIndex);
                      }
                    }}
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
                  onChange={(e) => {
                    const actualIndex = localQuestions.findIndex(q => q.id === question.id);
                    if (actualIndex !== -1) {
                      handleQuestionUpdate(actualIndex, 'type', e.target.value);
                    }
                  }}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                >
                  <option value="단답형">단답형</option>
                  <option value="핵심 내용 요약">핵심 내용 요약</option>
                  <option value="핵심문장 찾기">핵심문장 찾기</option>
                  <option value="OX문제">OX문제</option>
                  <option value="자료분석하기">자료분석하기</option>
                </select>
              </div>

              {/* 질문 */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  질문
                </label>
                <textarea
                  value={question.question}
                  onChange={(e) => {
                    const actualIndex = localQuestions.findIndex(q => q.id === question.id);
                    if (actualIndex !== -1) {
                      handleQuestionUpdate(actualIndex, 'question', e.target.value);
                    }
                  }}
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
                      onClick={() => {
                        const actualIndex = localQuestions.findIndex(q => q.id === question.id);
                        if (actualIndex !== -1) {
                          addOption(actualIndex);
                        }
                      }}
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
                          onChange={(e) => {
                            const actualIndex = localQuestions.findIndex(q => q.id === question.id);
                            if (actualIndex !== -1) {
                              handleOptionUpdate(actualIndex, oIndex, e.target.value);
                            }
                          }}
                          className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                          placeholder={`선택지 ${oIndex + 1}`}
                        />
                        <button
                          onClick={() => {
                            const actualIndex = localQuestions.findIndex(q => q.id === question.id);
                            if (actualIndex !== -1) {
                              removeOption(actualIndex, oIndex);
                            }
                          }}
                          className="text-red-500 hover:text-red-700 text-sm px-2"
                          title="선택지 삭제"
                        >
                          ✕
                        </button>
                      </div>
                    )) || (
                      <button
                        onClick={() => {
                          const actualIndex = localQuestions.findIndex(q => q.id === question.id);
                          if (actualIndex !== -1) {
                            const updated = [...localQuestions];
                            updated[actualIndex].options = ['선택지 1', '선택지 2', '선택지 3', '선택지 4', '선택지 5'];
                            setLocalQuestions(updated);
                            onUpdate(updated);
                          }
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
                  <>
                    <input
                      type="text"
                      value={question.answer}
                      onChange={(e) => {
                        const actualIndex = localQuestions.findIndex(q => q.id === question.id);
                        if (actualIndex !== -1) {
                          handleQuestionUpdate(actualIndex, 'answer', e.target.value);
                        }
                      }}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                      placeholder="정답을 입력하세요"
                    />
                    <div className="mt-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        초성 힌트
                      </label>
                      <input
                        type="text"
                        value={question.answerInitials || ''}
                        onChange={(e) => {
                          const actualIndex = localQuestions.findIndex(q => q.id === question.id);
                          if (actualIndex !== -1) {
                            handleQuestionUpdate(actualIndex, 'answerInitials', e.target.value);
                          }
                        }}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                        placeholder="초성 힌트를 입력하세요 (예: ㅈㄹㅎㅁ)"
                      />
                    </div>
                  </>
                ) : (
                  <select
                    value={question.answer}
                    onChange={(e) => {
                      const actualIndex = localQuestions.findIndex(q => q.id === question.id);
                      if (actualIndex !== -1) {
                        handleQuestionUpdate(actualIndex, 'answer', e.target.value);
                      }
                    }}
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
                  onChange={(e) => {
                    const actualIndex = localQuestions.findIndex(q => q.id === question.id);
                    if (actualIndex !== -1) {
                      handleQuestionUpdate(actualIndex, 'explanation', e.target.value);
                    }
                  }}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm min-h-[60px] resize-vertical"
                  placeholder="해설을 입력하세요"
                />
              </div>
            </div>
          );
        });
          })()}
        </div>
      </div>

      {/* 다음 단계 버튼 */}
      <div className="flex justify-center pt-4 border-t">
        <button
          onClick={onNext}
          disabled={loading || localQuestions.length === 0}
          className="bg-orange-600 text-white px-6 py-2 rounded-md hover:bg-orange-700 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {loading ? '처리 중...' : '7단계: 최종 저장하기'}
        </button>
      </div>

      {/* 프롬프트 확인 모달 */}
      <PromptModal
        isOpen={showPromptModal}
        onClose={() => setShowPromptModal(false)}
        title="종합 문제 생성 프롬프트"
        prompt={lastUsedPrompt}
        stepName="8단계: 종합 문제 검토"
      />
    </div>
  );
}
