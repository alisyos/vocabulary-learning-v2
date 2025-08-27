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
  const [questionCount, setQuestionCount] = useState<number>(4);
  const [fastGeneration, setFastGeneration] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<string>('');
  const [generatingSupplementary, setGeneratingSupplementary] = useState(false);

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
    '정보 확인',
    '주제 파악',
    '자료해석',
    '추론'
  ];

  const questionCountOptions = [4, 8, 12];

  // 종합 문제 생성 (기존 방식 또는 빠른 생성)
  const handleGenerateComprehensive = async () => {
    if (fastGeneration && includeSupplementary) {
      await handleFastGenerationWithBackground();
    } else {
      await handleTraditionalGeneration();
    }
  };

  // 🚀 빠른 생성: 기본 문제만 먼저, 보완 문제는 백그라운드
  const handleFastGenerationWithBackground = async () => {
    setGeneratingComp(true);
    setGenerationProgress('기본 문제 생성 중...');
    
    try {
      const selectedModel = localStorage.getItem('selectedGPTModel') || 'gpt-4.1';
      
      // 지문 텍스트 준비
      let passageText = '';
      if (editablePassage.passages && editablePassage.passages.length > 0) {
        editablePassage.passages.forEach((passage, index) => {
          passageText += `${passage.title}\n\n`;
          passageText += passage.paragraphs.join('\n\n');
          if (index < editablePassage.passages.length - 1) {
            passageText += '\n\n---\n\n';
          }
        });
      } else {
        passageText = `${editablePassage.title}\n\n${editablePassage.paragraphs.join('\n\n')}`;
      }
      
      // 1단계: 기본 문제만 빠르게 생성
      const basicResponse = await fetch('/api/generate-comprehensive-basic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          passage: passageText,
          division: division,
          questionType: selectedQuestionType,
          questionCount: questionCount,
          model: selectedModel
        }),
      });

      if (!basicResponse.ok) {
        throw new Error('기본 문제 생성에 실패했습니다.');
      }

      const basicResult = await basicResponse.json();
      const basicQuestions = basicResult.comprehensiveQuestions || [];
      
      console.log('⚡ Fast basic questions generated:', basicQuestions.length);
      
      // 기본 문제 먼저 표시
      setLocalQuestions(basicQuestions);
      onUpdate(basicQuestions, basicResult._metadata?.usedPrompt);
      
      setGenerationProgress('기본 문제 완료! 보완 문제 백그라운드 생성 중...');
      setGeneratingComp(false);
      setGeneratingSupplementary(true);
      
      // 2단계: 보완 문제 백그라운드 생성
      const supplementaryResponse = await fetch('/api/generate-comprehensive-supplementary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          passage: passageText,
          division: division,
          basicQuestions: basicQuestions,
          model: selectedModel
        }),
      });

      if (supplementaryResponse.ok) {
        const supplementaryResult = await supplementaryResponse.json();
        const supplementaryQuestions = supplementaryResult.supplementaryQuestions || [];
        
        console.log('🔄 Background supplementary questions generated:', supplementaryQuestions.length);
        
        // 기본 문제 + 보완 문제 합쳐서 업데이트
        const allQuestions = [...basicQuestions, ...supplementaryQuestions];
        setLocalQuestions(allQuestions);
        onUpdate(allQuestions, basicResult._metadata?.usedPrompt);
        
        setGenerationProgress(`완료! 기본 ${basicQuestions.length}개 + 보완 ${supplementaryQuestions.length}개 생성됨`);
      } else {
        console.error('보완 문제 생성 실패');
        setGenerationProgress(`기본 ${basicQuestions.length}개 완료 (보완 문제 생성 실패)`);
      }
      
    } catch (error) {
      console.error('Fast generation error:', error);
      alert('빠른 생성 중 오류가 발생했습니다.');
      setGenerationProgress('');
    } finally {
      setGeneratingSupplementary(false);
      setTimeout(() => setGenerationProgress(''), 3000); // 3초 후 메시지 제거
    }
  };

  // 📋 기존 방식 생성 (한 번에 모든 문제)
  const handleTraditionalGeneration = async () => {
    setGeneratingComp(true);
    setGenerationProgress(includeSupplementary ? '기본 + 보완 문제 생성 중...' : '기본 문제 생성 중...');
    
    try {
      const selectedModel = localStorage.getItem('selectedGPTModel') || 'gpt-4.1';
      
      let passageText = '';
      if (editablePassage.passages && editablePassage.passages.length > 0) {
        editablePassage.passages.forEach((passage, index) => {
          passageText += `${passage.title}\n\n`;
          passageText += passage.paragraphs.join('\n\n');
          if (index < editablePassage.passages.length - 1) {
            passageText += '\n\n---\n\n';
          }
        });
      } else {
        passageText = `${editablePassage.title}\n\n${editablePassage.paragraphs.join('\n\n')}`;
      }
      
      const response = await fetch('/api/generate-comprehensive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          passage: passageText,
          division: division,
          questionType: selectedQuestionType,
          questionCount: questionCount,
          includeSupplementary: includeSupplementary,
          model: selectedModel
        }),
      });

      if (!response.ok) {
        throw new Error('종합 문제 생성에 실패했습니다.');
      }

      const result = await response.json();
      const questions = result.comprehensiveQuestions || [];
      
      console.log('📋 Traditional generation completed:', {
        totalQuestions: questions.length,
        basicQuestions: questions.filter((q: any) => !q.isSupplementary).length,
        supplementaryQuestions: questions.filter((q: any) => q.isSupplementary).length
      });
      
      setLocalQuestions(questions);
      onUpdate(questions, result._metadata?.usedPrompt);
      setGenerationProgress(`완료! 총 ${questions.length}개 문제 생성됨`);
      
    } catch (error) {
      console.error('Traditional generation error:', error);
      alert('종합 문제 생성 중 오류가 발생했습니다.');
      setGenerationProgress('');
    } finally {
      setGeneratingComp(false);
      setTimeout(() => setGenerationProgress(''), 3000);
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
      type: '정보 확인',
      question: '질문을 입력하세요',
      options: ['선택지 1', '선택지 2', '선택지 3', '선택지 4', '선택지 5'],
      answer: '선택지 1',
      explanation: '해설을 입력하세요'
    };
    
    const updated = [...localQuestions, newQuestion];
    setLocalQuestions(updated);
    onUpdate(updated);
  };

  // 문제 삭제 (기본 문제 삭제 시 보완 문제도 함께 삭제)
  const removeQuestion = (index: number) => {
    if (localQuestions.length <= 1) {
      // 최소 1개의 문제는 있어야 하므로 삭제하지 않음
      return;
    }
    
    const questionToDelete = localQuestions[index];
    let updated = [...localQuestions];
    
    // 기본 문제인 경우, 해당 문제의 보완 문제들도 함께 삭제
    if (!questionToDelete.isSupplementary) {
      updated = localQuestions.filter((q, i) => {
        // 삭제하려는 문제 자체 제거
        if (i === index) return false;
        // 삭제하려는 문제의 보완 문제들 제거
        if (q.isSupplementary && q.originalQuestionId === questionToDelete.id) return false;
        return true;
      });
    } else {
      // 보완 문제인 경우, 해당 문제만 삭제
      updated = localQuestions.filter((_, i) => i !== index);
    }
    
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
                disabled={generatingComp || generatingSupplementary}
                className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
              >
                {generatingComp 
                  ? (fastGeneration && includeSupplementary ? '기본 문제 생성 중...' : '생성 중...') 
                  : generatingSupplementary 
                    ? '보완 문제 생성 중...'
                    : includeSupplementary 
                      ? (fastGeneration ? `⚡ ${questionCount}개 빠른 생성` : `${questionCount + (questionCount * 2)}개 생성`)
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
                  <p>• 4가지 유형을 각 {questionCount / 4}개씩 총 {questionCount}개 문제가 생성됩니다.</p>
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

            {/* 🚀 빠른 생성 옵션 (보완 문제가 체크된 경우만 표시) */}
            {includeSupplementary && (
              <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-400">
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id="fastGeneration"
                    checked={fastGeneration}
                    onChange={(e) => setFastGeneration(e.target.checked)}
                    className="w-5 h-5 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 mt-0.5"
                  />
                  <div className="flex-1">
                    <label htmlFor="fastGeneration" className="text-sm font-medium text-gray-800 cursor-pointer flex items-center gap-2">
                      <span>⚡ 빠른 생성 (권장)</span>
                      <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">NEW</span>
                    </label>
                    <div className="mt-1 text-xs text-gray-600">
                      <p className="text-green-700 font-medium">• 기본 문제를 먼저 빠르게 생성하여 즉시 확인 가능</p>
                      <p>• 보완 문제는 백그라운드에서 생성 (타임아웃 방지)</p>
                      <p>• 예상 대기시간: 15-20초 (기존 60초+ → 대폭 단축)</p>
                      <p className="text-orange-600">• Vercel 타임아웃 문제 해결을 위한 최적화된 방식</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 진행 상황 표시 */}
            {(generationProgress || generatingSupplementary) && (
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-800">
                      {generationProgress || '처리 중...'}
                    </p>
                    {generatingSupplementary && (
                      <p className="text-xs text-yellow-600 mt-1">
                        보완 문제는 백그라운드에서 생성 중입니다. 기본 문제부터 검토하실 수 있습니다.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleGenerateComprehensive}
              disabled={generatingComp || generatingSupplementary}
              className="bg-orange-600 text-white px-8 py-3 rounded-md hover:bg-orange-700 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {generatingComp 
                ? (fastGeneration && includeSupplementary ? '기본 문제 생성 중...' : '종합 문제 생성 중...') 
                : generatingSupplementary 
                  ? '보완 문제 백그라운드 생성 중...'
                  : includeSupplementary 
                    ? (fastGeneration 
                        ? `⚡ ${questionCount}개 종합 문제 빠르게 생성하기`
                        : `${questionCount + (questionCount * 2)}개 종합 문제 생성하기 (보완 문제 포함)`)
                    : `${questionCount}개 종합 문제 생성하기`
              }
            </button>
          </div>
        </div>

        {/* 종합 문제 생성 로딩 모달 */}
        {(generatingComp || generatingSupplementary) && (
          <div 
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          >
            <div className="bg-white backdrop-blur-sm p-8 rounded-xl shadow-lg border border-gray-100 text-center max-w-md">
              {/* 로딩 스피너 */}
              <div className={`w-12 h-12 border-3 border-gray-200 ${generatingSupplementary ? 'border-t-green-600' : 'border-t-orange-600'} rounded-full animate-spin mx-auto mb-4`}></div>
              
              {/* 메시지 */}
              <h3 className={`text-lg font-medium mb-1 ${generatingSupplementary ? 'text-green-800' : 'text-gray-800'}`}>
                {generatingComp 
                  ? (fastGeneration && includeSupplementary ? '⚡ 기본 문제 빠른 생성 중' : '종합 문제 생성 중')
                  : '🔄 보완 문제 백그라운드 생성 중'
                }
              </h3>
              
              <p className="text-sm text-gray-500 mb-2">
                {generatingComp 
                  ? (fastGeneration && includeSupplementary 
                      ? `${questionCount}개 기본 문제를 먼저 빠르게 생성합니다`
                      : includeSupplementary 
                        ? `${questionCount}개 기본 문제 + ${questionCount * 2}개 보완 문제를 생성하고 있습니다`
                        : `${questionCount}개 종합 문제를 생성하고 있습니다`)
                  : `${questionCount * 2}개 보완 문제를 배경에서 생성하고 있습니다`
                }
              </p>
              
              <p className="text-xs text-gray-400">
                {generatingComp 
                  ? (fastGeneration && includeSupplementary 
                      ? '잠시만 기다려주세요 (예상: 15-20초)'
                      : '잠시만 기다려주세요')
                  : '기본 문제는 이미 완성되었습니다. 백그라운드에서 보완 문제를 추가 생성 중입니다.'
                }
              </p>
              
              {generationProgress && (
                <div className="mt-3 p-2 bg-yellow-50 rounded-md">
                  <p className="text-sm text-yellow-800">{generationProgress}</p>
                </div>
              )}
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mb-3">
            {['정보 확인', '주제 파악', '자료해석', '추론'].map(type => {
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
                  <option value="정보 확인">정보 확인</option>
                  <option value="주제 파악">주제 파악</option>
                  <option value="자료해석">자료해석</option>
                  <option value="추론">추론</option>
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

              {/* 선택지 (새로운 유형들은 모두 객관식) */}
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

              {/* 정답 */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  정답
                </label>
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
