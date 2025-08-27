'use client';

import { useState, useEffect } from 'react';
import { ParagraphQuestionWorkflow, EditablePassage, ParagraphQuestionType } from '@/types';
import PromptModal from './PromptModal';

interface ParagraphQuestionsProps {
  editablePassage: EditablePassage;
  division: string;
  paragraphQuestions: ParagraphQuestionWorkflow[];
  onUpdate: (questions: ParagraphQuestionWorkflow[], usedPrompt?: string) => void;
  onNext: () => void;
  loading?: boolean;
  currentStep: 'generation' | 'review';
  lastUsedPrompt?: string; // GPT에 보낸 프롬프트
}

export default function ParagraphQuestions({
  editablePassage,
  division,
  paragraphQuestions,
  onUpdate,
  onNext,
  loading = false,
  currentStep,
  lastUsedPrompt = ''
}: ParagraphQuestionsProps) {
  const [localQuestions, setLocalQuestions] = useState<ParagraphQuestionWorkflow[]>(paragraphQuestions);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [generatingParagraph, setGeneratingParagraph] = useState(false);
  const [selectedParagraphTab, setSelectedParagraphTab] = useState<number | null>(null); // 선택된 문단 탭 (null 시 첫 번째 문단 선택)
  const [generationProgress, setGenerationProgress] = useState<string>('');
  const [estimatedQuestions, setEstimatedQuestions] = useState<number>(0);
  
  // 2개 지문 형식에서 모든 paragraphs 통합하여 가져오기
  const getAllParagraphs = () => {
    // 2개 지문 형식인 경우
    if (editablePassage.passages && editablePassage.passages.length > 0) {
      const allParagraphs: string[] = [];
      editablePassage.passages.forEach((passage) => {
        if (passage.paragraphs && Array.isArray(passage.paragraphs)) {
          allParagraphs.push(...passage.paragraphs);
        }
      });
      console.log('📚 2개 지문 형식 - 통합된 paragraphs:', allParagraphs);
      return allParagraphs;
    }
    // 단일 지문 형식인 경우
    console.log('📄 단일 지문 형식 - paragraphs:', editablePassage.paragraphs);
    return editablePassage.paragraphs || [];
  };
  
  // 문단 선택 관리 (기본적으로 모든 문단 선택)
  const [selectedParagraphs, setSelectedParagraphs] = useState<string[]>(
    getAllParagraphs().map((_, index) => (index + 1).toString())
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
    const allParagraphIndices = getAllParagraphs().map((_, index) => (index + 1).toString());
    setSelectedParagraphs(prev => 
      prev.length === allParagraphIndices.length ? [] : allParagraphIndices
    );
  };

  // 오류 응답에서 구체적인 메시지 추출
  const parseErrorMessage = (response: Response, fallbackMessage: string = '문단 문제 생성 중 오류가 발생했습니다.') => {
    return response.json().then(errorData => {
      // 구조화된 오류 응답에서 메시지 추출
      if (errorData?.error?.message) {
        return errorData.error.message;
      }
      // 단순한 오류 메시지
      if (typeof errorData?.error === 'string') {
        return errorData.error;
      }
      // 기본 메시지
      return fallbackMessage;
    }).catch(() => {
      // JSON 파싱 실패 시 기본 메시지
      return fallbackMessage;
    });
  };

  // 예상 문제 수 계산
  const calculateEstimatedQuestions = () => {
    if (selectedParagraphs.length === 0) return 0;
    
    if (selectedQuestionType === 'Random') {
      // Random: 각 문단별로 5가지 유형 × 1개씩
      return selectedParagraphs.length * 5;
    } else {
      // 특정 유형: 각 문단별로 4개씩
      return selectedParagraphs.length * 4;
    }
  };

  // 문단 문제 생성 (개선된 진행 상황 표시)
  const handleGenerateParagraph = async () => {
    if (selectedParagraphs.length === 0) {
      alert('생성할 문단을 선택해주세요.');
      return;
    }

    const estimated = calculateEstimatedQuestions();
    setEstimatedQuestions(estimated);
    setGeneratingParagraph(true);
    
    // 진행 상황 설정
    if (selectedQuestionType === 'Random') {
      setGenerationProgress(`🚀 ${selectedParagraphs.length}개 문단 × 5가지 유형 = ${estimated}개 문제를 병렬로 생성 중...`);
    } else {
      setGenerationProgress(`🚀 ${selectedParagraphs.length}개 문단 × 4개씩 = ${estimated}개 ${selectedQuestionType} 문제를 병렬로 생성 중...`);
    }

    try {
      // 로컬 스토리지에서 선택된 모델 가져오기
      const selectedModel = localStorage.getItem('selectedGPTModel') || 'gpt-4.1';
      
      const allParagraphs = getAllParagraphs();
      const title = editablePassage.passages && editablePassage.passages.length > 0 
        ? editablePassage.passages[0].title 
        : editablePassage.title;
      
      const response = await fetch('/api/generate-paragraph', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paragraphs: allParagraphs,
          selectedParagraphs: selectedParagraphs.map(p => parseInt(p)),
          questionType: selectedQuestionType,
          division,
          title: title,
          model: selectedModel
        }),
      });

      if (!response.ok) {
        // 구체적인 오류 메시지 추출 및 표시
        const errorMessage = await parseErrorMessage(response);
        alert(errorMessage);
        setGenerationProgress('');
        return;
      }

      const result = await response.json();
      const newQuestions = result.paragraphQuestions || [];
      
      console.log('🎉 Paragraph questions generation completed:', {
        estimated: estimated,
        actual: newQuestions.length,
        questionType: selectedQuestionType,
        selectedParagraphs: selectedParagraphs.length
      });
      
      setLocalQuestions(newQuestions);
      onUpdate(newQuestions, result._metadata?.usedPrompt);
      setGenerationProgress(`✅ 완료! 총 ${newQuestions.length}개 문제 생성됨 (병렬 처리로 시간 대폭 단축)`);

    } catch (error) {
      console.error('Error generating paragraph questions:', error);
      setGenerationProgress('');
      
      // 네트워크 오류 등 예외 상황에 대한 구체적인 메시지
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          alert('네트워크 연결에 문제가 있습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.');
        } else {
          alert(`문단 문제 생성 중 오류가 발생했습니다: ${error.message}`);
        }
      } else {
        alert('문단 문제 생성 중 예상하지 못한 오류가 발생했습니다.');
      }
    } finally {
      setGeneratingParagraph(false);
      setTimeout(() => setGenerationProgress(''), 3000); // 3초 후 메시지 제거
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

  // 문제 삭제
  const handleQuestionDelete = (questionId: string) => {
    const updatedQuestions = localQuestions.filter(q => q.id !== questionId);
    setLocalQuestions(updatedQuestions);
    onUpdate(updatedQuestions);
  };

  // 문제 유형별 설명
  const getQuestionTypeDescription = (type: ParagraphQuestionType) => {
    switch (type) {
      case 'Random':
        return '5가지 유형의 문제를 1개씩 생성합니다.';
      case '빈칸 채우기':
        return '문맥에 맞는 적절한 단어를 선택하는 문제입니다.';
      case '주관식 단답형':
        return '문단의 내용을 바탕으로 간단한 답을 쓰는 문제입니다. (초성 힌트 제공)';
      case '어절 순서 맞추기':
        return '문장의 어절들을 올바른 순서로 배열하는 문제입니다.';
      case 'OX문제':
        return '문단의 내용이 맞는지 틀린지 판단하는 문제입니다.';
      case '객관식 일반형':
        return '지문의 핵심 내용을 이해했는지 확인하는 5지선다 문제입니다.';
      default:
        return '';
    }
  };

  // 고유한 문단 번호들 추출 (정렬된 상태로) - 조건부 렌더링 전에 계산
  const uniqueParagraphNumbers = Array.from(
    new Set(localQuestions.map(q => q.paragraphNumber).filter(Boolean))
  ).sort((a, b) => a - b);

  // 선택된 탭이 없으면 첫 번째 문단 선택 - Hook은 항상 호출되어야 함
  useEffect(() => {
    if (currentStep === 'review' && selectedParagraphTab === null && uniqueParagraphNumbers.length > 0) {
      setSelectedParagraphTab(uniqueParagraphNumbers[0]);
    }
  }, [currentStep, uniqueParagraphNumbers.length, selectedParagraphTab]);

  // 선택된 탭에 따라 문제 필터링
  const filteredQuestions = currentStep === 'review' && selectedParagraphTab !== null
    ? localQuestions.filter(q => q.paragraphNumber === selectedParagraphTab)
    : localQuestions;

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
                  ? '🚀 병렬 생성 중...' 
                  : selectedParagraphs.length === 0 
                    ? '문단 선택 필요'
                    : `🚀 ${selectedParagraphs.length}개 문단으로 빠른 생성`
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
                  {selectedParagraphs.length}/{getAllParagraphs().length}개 선택됨
                </span>
                <button
                  onClick={handleSelectAll}
                  className="text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded transition-colors"
                >
                  {selectedParagraphs.length === getAllParagraphs().length ? '전체 해제' : '전체 선택'}
                </button>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-3">
                문제로 만들 문단을 선택하세요 (총 {getAllParagraphs().length}개):
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                {getAllParagraphs().map((paragraph, index) => {
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
                {(['Random', '빈칸 채우기', '주관식 단답형', '어절 순서 맞추기', 'OX문제', '객관식 일반형'] as ParagraphQuestionType[]).map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              
              <div className="mt-3 text-sm text-gray-600">
                <p><strong>선택된 유형:</strong> {selectedQuestionType}</p>
                <p>• {getQuestionTypeDescription(selectedQuestionType)}</p>
                {selectedQuestionType === 'Random' ? (
                  <p>• 선택된 문단별로 5가지 유형을 1개씩 총 5개 문제가 생성됩니다.</p>
                ) : (
                  <p>• 선택된 문단별로 {selectedQuestionType} 유형의 문제를 4개 생성됩니다.</p>
                )}
                <p className="text-green-600 font-medium">• 🚀 병렬 처리로 빠른 생성: 예상 대기시간 10-15초 (기존 30-50초 대비 대폭 단축)</p>
              </div>
            </div>
          </div>

          {/* 🚀 진행 상황 표시 */}
          {generationProgress && (
            <div className="mb-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-800">{generationProgress}</p>
                  {estimatedQuestions > 0 && (
                    <p className="text-xs text-blue-600 mt-1">
                      총 {estimatedQuestions}개 문제를 동시에 생성하여 대기시간을 최소화합니다.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-center">
            <button
              onClick={handleGenerateParagraph}
              disabled={generatingParagraph || selectedParagraphs.length === 0}
              className="bg-orange-600 text-white px-8 py-3 rounded-md hover:bg-orange-700 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {generatingParagraph 
                ? '🚀 문단 문제 병렬 생성 중...' 
                : selectedParagraphs.length === 0 
                  ? '문단을 선택해주세요'
                  : `🚀 선택된 ${selectedParagraphs.length}개 문단으로 문제 빠르게 생성하기`
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
                🚀 문단 문제 병렬 생성 중
              </h3>
              <p className="text-sm text-gray-500 mb-2">
                선택된 {selectedParagraphs.length}개 문단으로 {selectedQuestionType} 문제를 병렬로 생성하고 있습니다
              </p>
              {estimatedQuestions > 0 && (
                <p className="text-sm text-blue-600 mb-2 font-medium">
                  총 {estimatedQuestions}개 문제를 동시에 생성하여 시간을 단축합니다
                </p>
              )}
              <p className="text-xs text-gray-400">
                예상 대기시간: 10-15초 (병렬 처리로 대폭 단축)
              </p>
              {generationProgress && (
                <div className="mt-3 p-2 bg-blue-50 rounded-md">
                  <p className="text-sm text-blue-800">{generationProgress}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </>
    );
  }

  // 검토 단계에서 문단별 문제 수 계산
  const getQuestionCountByParagraph = () => {
    const counts: { [key: number]: number } = {};
    localQuestions.forEach(q => {
      if (q.paragraphNumber) {
        counts[q.paragraphNumber] = (counts[q.paragraphNumber] || 0) + 1;
      }
    });
    return counts;
  };

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
        <div className="flex items-center space-x-2">
          {lastUsedPrompt && (
            <button
              onClick={() => setShowPromptModal(true)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md transition-colors font-medium text-sm flex items-center space-x-1"
              title="문단 문제 생성에 사용된 프롬프트 확인"
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

      {/* 문단별 탭 네비게이션 */}
      {uniqueParagraphNumbers.length > 0 && (
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-2 overflow-x-auto">
              {/* 각 문단별 탭 */}
              {uniqueParagraphNumbers.map((paragraphNum) => {
                const questionCount = localQuestions.filter(q => q.paragraphNumber === paragraphNum).length;
                const isSelected = selectedParagraphTab === paragraphNum;
                
                return (
                  <button
                    key={paragraphNum}
                    onClick={() => setSelectedParagraphTab(paragraphNum)}
                    className={`
                      whitespace-nowrap py-2 px-4 border-b-2 font-medium text-sm transition-colors
                      ${isSelected 
                        ? 'border-orange-500 text-orange-600' 
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    <span>문단 {paragraphNum}</span>
                    <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                      {questionCount}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">
            {selectedParagraphTab !== null && `문단 ${selectedParagraphTab} 문제 (${filteredQuestions.length}개)`}
            <span className="ml-2 text-sm text-gray-500">
              전체 {localQuestions.length}개 중
            </span>
          </h3>
        </div>

        <div className="space-y-6">
          {filteredQuestions.map((question, displayIndex) => {
            // 실제 문제의 인덱스 찾기 (삭제를 위해)
            const qIndex = localQuestions.findIndex(q => q.id === question.id);
            
            return (
              <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-md font-medium text-gray-800">
                      문제 {displayIndex + 1} - {question.type}
                    </h4>
                    <p className="text-sm text-gray-600">문단 {question.paragraphNumber}</p>
                </div>
                <button
                  onClick={() => handleQuestionDelete(question.id)}
                  className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded-md text-sm font-medium transition-colors flex items-center space-x-1"
                  title="문제 삭제"
                >
                  <span>🗑️</span>
                  <span>삭제</span>
                </button>
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

              {/* 어절 순서 맞추기인 경우 - 어절들 표시 */}
              {question.type === '어절 순서 맞추기' && (
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    어절들 (무작위 순서)
                  </label>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    {question.wordSegments && question.wordSegments.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {question.wordSegments.map((segment, idx) => (
                          <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                            {segment}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 italic">
                        어절 정보가 없습니다. 문제를 다시 생성해 주세요.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 선택지 (객관식인 경우만 - 어절 순서 맞추기 제외) */}
              {question.type !== '주관식 단답형' && question.type !== '어절 순서 맞추기' && (
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    선택지
                  </label>
                  <div className="space-y-2">
                    {question.options?.map((option, oIndex) => (
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
              )}

              {/* 정답 및 초성 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    정답
                  </label>
                  {(question.type === '주관식 단답형' || question.type === '어절 순서 맞추기') ? (
                    <input
                      type="text"
                      value={question.answer}
                      onChange={(e) => handleQuestionUpdate(question.id, 'answer', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                      placeholder={question.type === '어절 순서 맞추기' 
                        ? "올바른 순서로 배열된 문장을 입력하세요" 
                        : "정답을 입력하세요 (예: 장래희망)"
                      }
                    />
                  ) : (
                    <select
                      value={question.answer}
                      onChange={(e) => handleQuestionUpdate(question.id, 'answer', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                    >
                      {question.options?.map((_, optionIndex) => (
                        <option key={optionIndex} value={(optionIndex + 1).toString()}>
                          {optionIndex + 1}번
                        </option>
                      )) || []}
                    </select>
                  )}
                </div>
                
                {/* 초성 필드 (주관식 단답형인 경우만) */}
                {question.type === '주관식 단답형' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      초성 힌트
                    </label>
                    <input
                      type="text"
                      value={question.answerInitials || ''}
                      onChange={(e) => handleQuestionUpdate(question.id, 'answerInitials', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                      placeholder="초성을 입력하세요 (예: ㅈㄹㅎㅁ)"
                    />
                  </div>
                )}
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
            );
          })}
        </div>
      </div>

      {localQuestions.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          생성된 문단 문제가 없습니다.
        </div>
      )}

      {/* 프롬프트 확인 모달 */}
      <PromptModal
        isOpen={showPromptModal}
        onClose={() => setShowPromptModal(false)}
        title="문단 문제 생성 프롬프트"
        prompt={lastUsedPrompt}
        stepName="6단계: 문단 문제 검토"
      />
    </div>
  );
}
