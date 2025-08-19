'use client';

import { useState } from 'react';
import { VocabularyQuestion, EditablePassage, VocabularyQuestionType, VOCABULARY_QUESTION_TYPES } from '@/types';
import PromptModal from './PromptModal';

interface VocabularyQuestionsProps {
  editablePassage: EditablePassage;
  division: string;
  keywords?: string; // 1단계에서 입력한 핵심 개념어
  vocabularyQuestions: VocabularyQuestion[];
  onUpdate: (questions: VocabularyQuestion[], usedPrompt?: string) => void;
  onNext: () => void;
  loading?: boolean;
  currentStep: 'generation' | 'review';
  lastUsedPrompt?: string; // GPT에 보낸 프롬프트
}

export default function VocabularyQuestions({
  editablePassage,
  division,
  keywords,
  vocabularyQuestions,
  onUpdate,
  onNext,
  loading = false,
  currentStep,
  lastUsedPrompt = ''
}: VocabularyQuestionsProps) {
  const [localQuestions, setLocalQuestions] = useState<VocabularyQuestion[]>(vocabularyQuestions);
  const [generatingVocab, setGeneratingVocab] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState<VocabularyQuestionType[]>(['5지선다 객관식']);
  
  // 2개 지문 형식에서 모든 footnote 통합하여 가져오기
  const getAllFootnotes = () => {
    // 2개 지문 형식인 경우
    if (editablePassage.passages && editablePassage.passages.length > 0) {
      const allFootnotes: string[] = [];
      editablePassage.passages.forEach((passage) => {
        if (passage.footnote && Array.isArray(passage.footnote)) {
          allFootnotes.push(...passage.footnote);
        }
      });
      console.log('📚 2개 지문 형식 - 통합된 footnotes:', allFootnotes);
      return allFootnotes;
    }
    // 단일 지문 형식인 경우
    console.log('📄 단일 지문 형식 - footnotes:', editablePassage.footnote);
    return editablePassage.footnote || [];
  };

  // 핵심 개념어와 매칭되는 용어들 찾기
  const getMatchedTerms = () => {
    console.log('=== 핵심 개념어 매칭 디버깅 ===');
    console.log('keywords:', keywords);
    
    const allFootnotes = getAllFootnotes();
    console.log('allFootnotes:', allFootnotes);
    
    if (!keywords || keywords.trim() === '') {
      console.log('keywords가 없어서 빈 배열 반환');
      return [];
    }
    
    // keywords를 쉼표 또는 슬래시로 분리하고 정규화
    const keywordList = keywords.split(/[,/]/).map(k => k.trim().toLowerCase()).filter(k => k.length > 0);
    console.log('keywordList:', keywordList);
    
    if (keywordList.length === 0) {
      console.log('유효한 키워드가 없어서 빈 배열 반환');
      return [];
    }
    
    const matchedIndices = allFootnotes
      .map((footnote, index) => {
        const termName = footnote.split(':')[0]?.trim().toLowerCase() || footnote.toLowerCase();
        console.log(`용어 ${index}: "${footnote}" -> termName: "${termName}"`);
        
        // 키워드 중 하나와 완전 일치하면 선택
        const isMatched = keywordList.some(keyword => {
          const exactMatch = termName === keyword;
          console.log(`  키워드 "${keyword}" 매칭: termName === keyword = ${exactMatch}`);
          return exactMatch;
        });
        
        console.log(`  최종 매칭 결과: ${isMatched}`);
        return isMatched ? index.toString() : null;
      })
      .filter(Boolean) as string[];
    
    console.log('매칭된 인덱스들:', matchedIndices);
    return matchedIndices;
  };

  // 선택된 용어들 관리 (핵심 개념어 매칭된 것들만 디폴트 선택)
  const [selectedTerms, setSelectedTerms] = useState<string[]>(getMatchedTerms());

  // 용어 선택/해제
  const handleTermToggle = (termIndex: string) => {
    setSelectedTerms(prev => 
      prev.includes(termIndex) 
        ? prev.filter(id => id !== termIndex)
        : [...prev, termIndex]
    );
  };

  // 전체 선택/해제
  const handleSelectAll = () => {
    const allFootnotes = getAllFootnotes();
    const allTermIndices = allFootnotes.map((_, index) => index.toString());
    setSelectedTerms(prev => 
      prev.length === allTermIndices.length ? [] : allTermIndices
    );
  };

  // 선택된 용어들 가져오기
  const getSelectedTerms = () => {
    const allFootnotes = getAllFootnotes();
    return selectedTerms
      .map(index => allFootnotes[parseInt(index)])
      .filter(Boolean);
  };

  // 어휘 문제 생성
  const handleGenerateVocabulary = async () => {
    const selectedTermsList = getSelectedTerms();
    
    if (selectedTermsList.length === 0) {
      alert('어휘 문제를 생성할 용어를 선택해주세요.');
      return;
    }

    if (selectedQuestionTypes.length === 0) {
      alert('문제 유형을 선택해주세요.');
      return;
    }

    setGeneratingVocab(true);
    
    try {
      // 로컬 스토리지에서 선택된 모델 가져오기
      const selectedModel = localStorage.getItem('selectedGPTModel') || 'gpt-4.1';
      
      // 모든 문제를 저장할 배열
      const allQuestions: VocabularyQuestion[] = [];
      let lastUsedPrompt = '';
      
      // 선택된 각 문제 유형별로 API 호출
      for (const questionType of selectedQuestionTypes) {
        console.log(`🎯 생성 중인 문제 유형: ${questionType}`);
        
        const response = await fetch('/api/generate-vocabulary', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            terms: selectedTermsList,
            passage: `${editablePassage.title}\n\n${editablePassage.paragraphs.join('\n\n')}`,
            division: division,
            questionType: questionType,
            model: selectedModel
          }),
        });

        if (!response.ok) {
          console.error(`❌ ${questionType} 문제 생성 실패`);
          continue; // 실패한 유형은 건너뛰고 계속 진행
        }

        const result = await response.json();
        const questions = result.vocabularyQuestions || [];
        
        // 첫 번째 유형의 프롬프트를 저장
        if (!lastUsedPrompt && result._metadata?.usedPrompt) {
          lastUsedPrompt = result._metadata.usedPrompt;
        }
        
        console.log(`✅ ${questionType} 문제 ${questions.length}개 생성 완료`);
        allQuestions.push(...questions);
      }
      
      if (allQuestions.length === 0) {
        throw new Error('모든 문제 유형 생성에 실패했습니다.');
      }
      
      console.log(`🎉 총 ${allQuestions.length}개 문제 생성 완료 (${selectedQuestionTypes.length}가지 유형)`);
      
      setLocalQuestions(allQuestions);
      onUpdate(allQuestions, lastUsedPrompt);
      
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
    // 선택된 유형 중 첫 번째를 기본값으로 사용 (선택된 유형이 없으면 5지선다 사용)
    const defaultQuestionType = selectedQuestionTypes.length > 0 ? selectedQuestionTypes[0] : '5지선다 객관식';
    const isMultipleChoice = defaultQuestionType.includes('객관식');
    const optionCount = defaultQuestionType === '2지선다 객관식' ? 2 :
                       defaultQuestionType === '3지선다 객관식' ? 3 :
                       defaultQuestionType === '4지선다 객관식' ? 4 : 5;
    
    const newQuestion: VocabularyQuestion = {
      id: `vocab_new_${Date.now()}`,
      content_set_id: '',
      question_number: localQuestions.length + 1,
      question_type: defaultQuestionType,
      difficulty: '일반',
      term: '새로운 용어',
      question_text: '질문을 입력하세요',
      option_1: isMultipleChoice ? '선택지 1' : undefined,
      option_2: isMultipleChoice ? '선택지 2' : undefined,
      option_3: isMultipleChoice && optionCount >= 3 ? '선택지 3' : undefined,
      option_4: isMultipleChoice && optionCount >= 4 ? '선택지 4' : undefined,
      option_5: isMultipleChoice && optionCount >= 5 ? '선택지 5' : undefined,
      correct_answer: isMultipleChoice ? '선택지 1' : '답을 입력하세요',
      answer_initials: !isMultipleChoice ? 'ㅇㅇ' : undefined,
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

  // 선택지 수정 (기존 인터페이스 지원을 위해 유지)
  const handleOptionUpdate = (questionIndex: number, optionIndex: number, value: string) => {
    const updated = [...localQuestions];
    const field = `option_${optionIndex + 1}` as keyof VocabularyQuestion;
    updated[questionIndex] = { ...updated[questionIndex], [field]: value };
    setLocalQuestions(updated);
    onUpdate(updated);
  };

  if (currentStep === 'generation') {
    return (
      <>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-bold text-gray-800">3단계: 어휘 문제 생성</h2>
              <button
                onClick={handleGenerateVocabulary}
                disabled={generatingVocab || selectedTerms.length === 0 || selectedQuestionTypes.length === 0}
                className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
              >
                {generatingVocab 
                  ? '생성 중...' 
                  : selectedTerms.length === 0 
                    ? '용어 선택 필요'
                    : selectedQuestionTypes.length === 0
                      ? '문제 유형 선택 필요'
                      : `${selectedTerms.length}개 용어 × ${selectedQuestionTypes.length}가지 유형`
                }
              </button>
            </div>
            <span className="text-sm text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
              문제 생성
            </span>
          </div>

        {/* 문제 유형 선택 */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold text-gray-800">문제 유형 선택</h3>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {selectedQuestionTypes.length}/6개 선택됨
              </span>
              <button
                onClick={() => {
                  const allTypes = Object.values(VOCABULARY_QUESTION_TYPES) as VocabularyQuestionType[];
                  setSelectedQuestionTypes(prev => 
                    prev.length === allTypes.length ? [] : allTypes
                  );
                }}
                className="text-sm bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-1 rounded transition-colors"
              >
                {selectedQuestionTypes.length === 6 ? '전체 해제' : '전체 선택'}
              </button>
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-3">
              생성할 문제 유형을 선택하세요. 선택한 유형별로 각각 문제가 생성됩니다.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {(Object.values(VOCABULARY_QUESTION_TYPES) as VocabularyQuestionType[]).map((type) => {
                const isSelected = selectedQuestionTypes.includes(type);
                return (
                  <label 
                    key={type}
                    className={`
                      flex items-center space-x-3 p-3 rounded border cursor-pointer transition-all
                      ${isSelected 
                        ? 'bg-purple-50 border-purple-200 text-purple-900' 
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                      }
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedQuestionTypes(prev => [...prev, type]);
                        } else {
                          setSelectedQuestionTypes(prev => prev.filter(t => t !== type));
                        }
                      }}
                      className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <span className="text-sm font-medium">
                      {type}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold text-gray-800">추출된 용어 목록</h3>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {selectedTerms.length}/{getAllFootnotes().length}개 선택됨
              </span>
              <button
                onClick={handleSelectAll}
                className="text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded transition-colors"
              >
                {selectedTerms.length === getAllFootnotes().length ? '전체 해제' : '전체 선택'}
              </button>
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-3">
              문제로 만들 용어를 선택하세요 (총 {getAllFootnotes().length}개):
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {getAllFootnotes().map((footnote, index) => {
                const termIndex = index.toString();
                const isSelected = selectedTerms.includes(termIndex);
                const termName = footnote.split(':')[0]?.trim() || footnote;
                
                return (
                  <label 
                    key={index} 
                    className={`
                      flex items-center space-x-3 p-3 rounded border cursor-pointer transition-all
                      ${isSelected 
                        ? 'bg-blue-50 border-blue-200 text-blue-900' 
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                      }
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleTermToggle(termIndex)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium flex-1">
                      {termName}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleGenerateVocabulary}
            disabled={generatingVocab || selectedTerms.length === 0}
            className="bg-purple-600 text-white px-8 py-3 rounded-md hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {generatingVocab 
              ? '어휘 문제 생성 중...' 
              : selectedTerms.length === 0 
                ? '용어를 선택해주세요'
                : selectedQuestionTypes.length === 0
                  ? '문제 유형을 선택해주세요'
                  : `${selectedTerms.length}개 용어 × ${selectedQuestionTypes.length}가지 유형으로 문제 생성`
            }
          </button>
        </div>
      </div>

      {/* 어휘 문제 생성 로딩 모달 */}
      {generatingVocab && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        >
          <div className="bg-white backdrop-blur-sm p-8 rounded-xl shadow-lg border border-gray-100 text-center">
            {/* 로딩 스피너 */}
            <div className="w-12 h-12 border-3 border-gray-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
            
            {/* 메시지 */}
            <h3 className="text-lg font-medium text-gray-800 mb-1">
              어휘 문제 생성 중
            </h3>
            <p className="text-sm text-gray-500 mb-2">
              선택된 {selectedTerms.length}개 용어로 {selectedQuestionTypes.length}가지 유형의 문제를 생성하고 있습니다
            </p>
            <p className="text-xs text-gray-400">
              선택된 유형: {selectedQuestionTypes.join(', ')}
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
          <h2 className="text-xl font-bold text-gray-800">4단계: 어휘 문제 검토 및 수정</h2>
          <button
            onClick={onNext}
            disabled={loading || localQuestions.length === 0}
            className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
          >
            {loading ? '처리 중...' : '5단계: 문단 문제 생성하기'}
          </button>
        </div>
        <div className="flex items-center space-x-2">
          {lastUsedPrompt && (
            <button
              onClick={() => setShowPromptModal(true)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md transition-colors font-medium text-sm flex items-center space-x-1"
              title="어휘 문제 생성에 사용된 프롬프트 확인"
            >
              <span>📋</span>
              <span>프롬프트 확인</span>
            </button>
          )}
          <span className="text-sm text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
            검토 및 수정
          </span>
        </div>
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

              {/* 문제 유형 표시 */}
              <div className="mb-3">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  {question.question_type || question.questionType || '5지선다 객관식'}
                </span>
              </div>

              {/* 용어 */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  대상 용어
                </label>
                <input
                  type="text"
                  value={question.term || ''}
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
                  value={question.question_text || question.question || ''}
                  onChange={(e) => handleQuestionUpdate(qIndex, question.question_text ? 'question_text' : 'question', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm min-h-[80px] resize-vertical"
                  placeholder="질문을 입력하세요"
                />
              </div>

              {/* 선택지 (객관식만) */}
              {((question.question_type || question.questionType || '5지선다 객관식').includes('객관식')) && (
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    선택지
                  </label>
                  <div className="space-y-2">
                    {(() => {
                      const questionType = question.question_type || question.questionType || '5지선다 객관식';
                      const maxOptions = questionType === '2지선다 객관식' ? 2 :
                                        questionType === '3지선다 객관식' ? 3 :
                                        questionType === '4지선다 객관식' ? 4 : 5;
                      
                      const options = [
                        question.option_1 || (question.options && question.options[0]),
                        question.option_2 || (question.options && question.options[1]),
                        question.option_3 || (question.options && question.options[2]),
                        question.option_4 || (question.options && question.options[3]),
                        question.option_5 || (question.options && question.options[4])
                      ];
                      
                      return Array.from({ length: maxOptions }, (_, oIndex) => (
                        <div key={oIndex} className="flex items-center gap-2">
                          <span className="text-sm text-gray-500 min-w-[20px]">
                            {oIndex + 1}.
                          </span>
                          <input
                            type="text"
                            value={options[oIndex] || ''}
                            onChange={(e) => {
                              if (question.options) {
                                // 기존 options 배열 방식
                                handleOptionUpdate(qIndex, oIndex, e.target.value);
                              } else {
                                // 새로운 option_1, option_2 방식
                                const field = `option_${oIndex + 1}` as keyof VocabularyQuestion;
                                handleQuestionUpdate(qIndex, field, e.target.value);
                              }
                            }}
                            className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                            placeholder={`선택지 ${oIndex + 1}`}
                          />
                        </div>
                      ));
                    })()
                    }
                  </div>
                </div>
              )}

              {/* 정답 */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  정답
                </label>
                {((question.question_type || question.questionType || '5지선다 객관식').includes('객관식')) ? (
                  <select
                    value={question.correct_answer || question.answer || ''}
                    onChange={(e) => handleQuestionUpdate(qIndex, question.correct_answer !== undefined ? 'correct_answer' : 'answer', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  >
                    <option value="">정답을 선택하세요</option>
                    {(() => {
                      const questionType = question.question_type || question.questionType || '5지선다 객관식';
                      const maxOptions = questionType === '2지선다 객관식' ? 2 :
                                        questionType === '3지선다 객관식' ? 3 :
                                        questionType === '4지선다 객관식' ? 4 : 5;
                      
                      const options = [
                        question.option_1 || (question.options && question.options[0]),
                        question.option_2 || (question.options && question.options[1]),
                        question.option_3 || (question.options && question.options[2]),
                        question.option_4 || (question.options && question.options[3]),
                        question.option_5 || (question.options && question.options[4])
                      ];
                      
                      return options.slice(0, maxOptions).map((option, index) => 
                        option ? (
                          <option key={index} value={option}>
                            {index + 1}. {option}
                          </option>
                        ) : null
                      ).filter(Boolean);
                    })()
                    }
                  </select>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={question.correct_answer || question.answer || ''}
                      onChange={(e) => handleQuestionUpdate(qIndex, question.correct_answer !== undefined ? 'correct_answer' : 'answer', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                      placeholder="정답을 입력하세요"
                    />
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        초성 힌트 (예: ㅂㅇㅊ)
                      </label>
                      <input
                        type="text"
                        value={question.answer_initials || question.answerInitials || ''}
                        onChange={(e) => handleQuestionUpdate(qIndex, question.answer_initials !== undefined ? 'answer_initials' : 'answerInitials', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                        placeholder="초성을 입력하세요 (예: ㅂㅇㅊ)"
                      />
                    </div>
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
      <div className="flex justify-center pt-4 border-t">
        <button
          onClick={onNext}
          disabled={loading || localQuestions.length === 0}
          className="bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {loading ? '처리 중...' : '5단계: 종합 문제 생성하기'}
        </button>
      </div>

      {/* 프롬프트 확인 모달 */}
      <PromptModal
        isOpen={showPromptModal}
        onClose={() => setShowPromptModal(false)}
        title="어휘 문제 생성 프롬프트"
        prompt={lastUsedPrompt}
        stepName="4단계: 어휘 문제 검토"
      />
    </div>
  );
}
