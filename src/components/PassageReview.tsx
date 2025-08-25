'use client';

import { useState, useEffect } from 'react';
import { EditablePassage } from '@/types';
import PromptModal from './PromptModal';

interface PassageReviewProps {
  editablePassage: EditablePassage;
  onUpdate: (updatedPassage: EditablePassage) => void;
  onNext: () => void;
  loading?: boolean;
  lastUsedPrompt?: string; // GPT에 보낸 프롬프트
}

export default function PassageReview({ 
  editablePassage, 
  onUpdate, 
  onNext, 
  loading = false,
  lastUsedPrompt = ''
}: PassageReviewProps) {
  const [localPassage, setLocalPassage] = useState<EditablePassage>(editablePassage);
  const [showPromptModal, setShowPromptModal] = useState(false);

  // 2개 지문 형식인지 확인
  const isDualPassageFormat = localPassage.passages && localPassage.passages.length > 0;
  
  // editablePassage prop 변경 시 localPassage 동기화
  useEffect(() => {
    console.log('🔄 PassageReview - editablePassage prop 변경됨:', editablePassage);
    setLocalPassage(editablePassage);
  }, [editablePassage]);
  
  // 디버깅 로그
  console.log('🔍 PassageReview - editablePassage:', editablePassage);
  console.log('📊 PassageReview - localPassage:', localPassage);
  console.log('🎯 PassageReview - isDualPassageFormat:', isDualPassageFormat);
  console.log('📝 PassageReview - passages 개수:', localPassage.passages?.length || 0);

  // === 단일 지문 형식 함수들 (기존 호환성) ===
  const handleTitleChange = (newTitle: string) => {
    const updated = { ...localPassage, title: newTitle };
    setLocalPassage(updated);
    onUpdate(updated);
  };

  const handleParagraphChange = (index: number, newContent: string) => {
    const updatedParagraphs = [...localPassage.paragraphs];
    updatedParagraphs[index] = newContent;
    const updated = { ...localPassage, paragraphs: updatedParagraphs };
    setLocalPassage(updated);
    onUpdate(updated);
  };

  const addParagraph = () => {
    const updated = { 
      ...localPassage, 
      paragraphs: [...localPassage.paragraphs, '새로운 단락을 입력하세요.'] 
    };
    setLocalPassage(updated);
    onUpdate(updated);
  };

  const removeParagraph = (index: number) => {
    if (localPassage.paragraphs.length <= 1) {
      alert('최소 1개의 단락은 있어야 합니다.');
      return;
    }
    const updatedParagraphs = localPassage.paragraphs.filter((_, i) => i !== index);
    const updated = { ...localPassage, paragraphs: updatedParagraphs };
    setLocalPassage(updated);
    onUpdate(updated);
  };

  const handleFootnoteChange = (index: number, newContent: string) => {
    const updatedFootnote = [...localPassage.footnote];
    updatedFootnote[index] = newContent;
    const updated = { ...localPassage, footnote: updatedFootnote };
    setLocalPassage(updated);
    onUpdate(updated);
  };

  const addFootnote = () => {
    const updated = { 
      ...localPassage, 
      footnote: [...localPassage.footnote, '새로운 용어: 용어 설명을 입력하세요.'] 
    };
    setLocalPassage(updated);
    onUpdate(updated);
  };

  const removeFootnote = (index: number) => {
    const updatedFootnote = localPassage.footnote.filter((_, i) => i !== index);
    const updated = { ...localPassage, footnote: updatedFootnote };
    setLocalPassage(updated);
    onUpdate(updated);
  };

  // === 2개 지문 형식 함수들 (새로운 기능) ===
  const handleIntroductionQuestionChange = (newQuestion: string) => {
    const updated = { ...localPassage, introduction_question: newQuestion };
    setLocalPassage(updated);
    onUpdate(updated);
  };

  const handlePassageTitleChange = (passageIndex: number, newTitle: string) => {
    if (!localPassage.passages) return;
    
    const updatedPassages = [...localPassage.passages];
    updatedPassages[passageIndex] = { ...updatedPassages[passageIndex], title: newTitle };
    const updated = { ...localPassage, passages: updatedPassages };
    setLocalPassage(updated);
    onUpdate(updated);
  };

  const handlePassageParagraphChange = (passageIndex: number, paragraphIndex: number, newContent: string) => {
    if (!localPassage.passages) return;
    
    const updatedPassages = [...localPassage.passages];
    const updatedParagraphs = [...updatedPassages[passageIndex].paragraphs];
    updatedParagraphs[paragraphIndex] = newContent;
    updatedPassages[passageIndex] = { ...updatedPassages[passageIndex], paragraphs: updatedParagraphs };
    const updated = { ...localPassage, passages: updatedPassages };
    setLocalPassage(updated);
    onUpdate(updated);
  };

  const addPassageParagraph = (passageIndex: number) => {
    if (!localPassage.passages) return;
    
    const updatedPassages = [...localPassage.passages];
    updatedPassages[passageIndex] = {
      ...updatedPassages[passageIndex],
      paragraphs: [...updatedPassages[passageIndex].paragraphs, '새로운 단락을 입력하세요.']
    };
    const updated = { ...localPassage, passages: updatedPassages };
    setLocalPassage(updated);
    onUpdate(updated);
  };

  const removePassageParagraph = (passageIndex: number, paragraphIndex: number) => {
    if (!localPassage.passages) return;
    if (localPassage.passages[passageIndex].paragraphs.length <= 1) {
      alert('최소 1개의 단락은 있어야 합니다.');
      return;
    }
    
    const updatedPassages = [...localPassage.passages];
    const updatedParagraphs = updatedPassages[passageIndex].paragraphs.filter((_, i) => i !== paragraphIndex);
    updatedPassages[passageIndex] = { ...updatedPassages[passageIndex], paragraphs: updatedParagraphs };
    const updated = { ...localPassage, passages: updatedPassages };
    setLocalPassage(updated);
    onUpdate(updated);
  };

  const handlePassageFootnoteChange = (passageIndex: number, footnoteIndex: number, newContent: string) => {
    if (!localPassage.passages) return;
    
    const updatedPassages = [...localPassage.passages];
    const updatedFootnote = [...updatedPassages[passageIndex].footnote];
    updatedFootnote[footnoteIndex] = newContent;
    updatedPassages[passageIndex] = { ...updatedPassages[passageIndex], footnote: updatedFootnote };
    const updated = { ...localPassage, passages: updatedPassages };
    setLocalPassage(updated);
    onUpdate(updated);
  };

  const addPassageFootnote = (passageIndex: number) => {
    if (!localPassage.passages) return;
    
    const updatedPassages = [...localPassage.passages];
    updatedPassages[passageIndex] = {
      ...updatedPassages[passageIndex],
      footnote: [...updatedPassages[passageIndex].footnote, '새로운 용어: 용어 설명을 입력하세요.']
    };
    const updated = { ...localPassage, passages: updatedPassages };
    setLocalPassage(updated);
    onUpdate(updated);
  };

  const removePassageFootnote = (passageIndex: number, footnoteIndex: number) => {
    if (!localPassage.passages) return;
    
    const updatedPassages = [...localPassage.passages];
    const updatedFootnote = updatedPassages[passageIndex].footnote.filter((_, i) => i !== footnoteIndex);
    updatedPassages[passageIndex] = { ...updatedPassages[passageIndex], footnote: updatedFootnote };
    const updated = { ...localPassage, passages: updatedPassages };
    setLocalPassage(updated);
    onUpdate(updated);
  };

  // 전체 문자 수 계산 (2개 지문 형식일 때)
  const getTotalCharCount = () => {
    if (isDualPassageFormat) {
      return localPassage.passages!.reduce((total, passage) => 
        total + passage.paragraphs.join('').length, 0);
    }
    return localPassage.paragraphs.join('').length;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-bold text-gray-800">2단계: 지문 검토 및 수정</h2>
          <button
            onClick={onNext}
            disabled={loading || (isDualPassageFormat ? 
              !localPassage.passages?.every(p => p.title.trim()) : 
              !localPassage.title.trim())}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
          >
            {loading ? '처리 중...' : '3단계: 어휘 문제 생성하기'}
          </button>
        </div>
        <div className="flex items-center space-x-2">
          {lastUsedPrompt && (
            <button
              onClick={() => setShowPromptModal(true)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md transition-colors font-medium text-sm flex items-center space-x-1"
              title="지문 생성에 사용된 프롬프트 확인"
            >
              <span>📋</span>
              <span>프롬프트 확인</span>
            </button>
          )}
          <span className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
            {isDualPassageFormat ? '2개 지문 검토' : '검토 및 수정'}
          </span>
        </div>
      </div>

      {isDualPassageFormat ? (
        // === 2개 지문 형식 UI ===
        <div className="space-y-8">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              📚 연관된 2개 지문 형식 | 총 {getTotalCharCount()}자
            </p>
          </div>

          {/* 도입 질문 섹션 - 2개 지문 형식 */}
          {localPassage.introduction_question !== undefined && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-semibold text-blue-900">
                  도입 질문
                </label>
                <span className="text-xs text-blue-600 bg-white px-2 py-1 rounded">
                  2개 지문을 아우르는 흥미 유발 질문
                </span>
              </div>
              <textarea
                value={localPassage.introduction_question || ''}
                onChange={(e) => handleIntroductionQuestionChange(e.target.value)}
                placeholder="예: 우리 몸은 어떻게 음식을 소화시킬까요?"
                className="w-full px-4 py-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white"
                rows={2}
              />
            </div>
          )}

          {localPassage.passages!.map((passage, passageIndex) => (
            <div key={passageIndex} className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  {passageIndex === 0 ? '첫 번째 지문 (기초)' : '두 번째 지문 (심화)'}
                </h3>
                <span className="ml-2 text-sm text-gray-500">
                  ({passage.paragraphs.join('').length}자)
                </span>
              </div>

              {/* 지문별 제목 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  제목
                </label>
                <input
                  type="text"
                  value={passage.title}
                  onChange={(e) => handlePassageTitleChange(passageIndex, e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-medium"
                  placeholder="지문의 제목을 입력하세요"
                />
              </div>

              {/* 지문별 본문 */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    본문 ({passage.paragraphs.length}개 단락)
                  </label>
                  <button
                    onClick={() => addPassageParagraph(passageIndex)}
                    className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-md hover:bg-green-200 transition-colors"
                  >
                    + 단락 추가
                  </button>
                </div>
                
                <div className="space-y-3">
                  {passage.paragraphs.map((paragraph, paragraphIndex) => (
                    <div key={paragraphIndex} className="relative">
                      <div className="flex items-start gap-2">
                        <span className="text-sm text-gray-500 mt-2 min-w-[60px]">
                          단락 {paragraphIndex + 1}
                        </span>
                        <textarea
                          value={paragraph}
                          onChange={(e) => handlePassageParagraphChange(passageIndex, paragraphIndex, e.target.value)}
                          className="flex-1 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[100px] resize-vertical"
                          placeholder={`${paragraphIndex + 1}번째 단락 내용을 입력하세요`}
                        />
                        <button
                          onClick={() => removePassageParagraph(passageIndex, paragraphIndex)}
                          className="text-red-500 hover:text-red-700 p-2 mt-1"
                          title="단락 삭제"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 지문별 용어 설명 */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    용어 설명 ({passage.footnote.length}개)
                    <span className="text-xs text-gray-500 ml-2">
                      {passageIndex === 0 ? '(용어 1-10)' : '(용어 11-20)'}
                    </span>
                  </label>
                  <button
                    onClick={() => addPassageFootnote(passageIndex)}
                    className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-md hover:bg-green-200 transition-colors"
                  >
                    + 용어 추가
                  </button>
                </div>
                
                <div className="space-y-2">
                  {passage.footnote.map((footnote, footnoteIndex) => (
                    <div key={footnoteIndex} className="flex items-center gap-2">
                      <span className="text-sm text-gray-500 min-w-[40px]">
                        {passageIndex === 0 ? footnoteIndex + 1 : footnoteIndex + 11}.
                      </span>
                      <input
                        type="text"
                        value={footnote}
                        onChange={(e) => handlePassageFootnoteChange(passageIndex, footnoteIndex, e.target.value)}
                        className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        placeholder="용어: 설명 (예시: 예시문장)"
                      />
                      <button
                        onClick={() => removePassageFootnote(passageIndex, footnoteIndex)}
                        className="text-red-500 hover:text-red-700 p-2"
                        title="용어 삭제"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {/* 2개 지문 미리보기 */}
          <div className="mt-8 p-6 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">미리보기</h3>
            <div className="space-y-6">
              {localPassage.passages!.map((passage, passageIndex) => (
                <div key={passageIndex} className="prose max-w-none">
                  <div className="flex items-center mb-3">
                    <h4 className="text-lg font-medium text-blue-700">{passage.title}</h4>
                    <span className="ml-2 text-sm text-gray-500 bg-white px-2 py-1 rounded">
                      {passageIndex === 0 ? '기초' : '심화'}
                    </span>
                  </div>
                  {passage.paragraphs.map((paragraph, paragraphIndex) => (
                    <p key={paragraphIndex} className="mb-3 text-gray-700 leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                  
                  {passage.footnote.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-300">
                      <h5 className="text-sm font-medium text-gray-800 mb-2">
                        용어 설명 {passageIndex === 0 ? '(1-10)' : '(11-20)'}
                      </h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {passage.footnote.map((footnote, footnoteIndex) => (
                          <li key={footnoteIndex}>
                            • {footnote}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        // === 기존 단일 지문 형식 UI (하위 호환성) ===
        <div>
          {/* 제목 편집 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              제목
            </label>
            <input
              type="text"
              value={localPassage.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-medium"
              placeholder="지문의 제목을 입력하세요"
            />
          </div>

          {/* 본문 편집 */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                본문 ({localPassage.paragraphs.length}개 단락) (총 {localPassage.paragraphs.join('').length}자)
              </label>
              <button
                onClick={addParagraph}
                className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-md hover:bg-green-200 transition-colors"
              >
                + 단락 추가
              </button>
            </div>
            
            <div className="space-y-4">
              {localPassage.paragraphs.map((paragraph, index) => (
                <div key={index} className="relative">
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-gray-500 mt-2 min-w-[60px]">
                      단락 {index + 1}
                    </span>
                    <textarea
                      value={paragraph}
                      onChange={(e) => handleParagraphChange(index, e.target.value)}
                      className="flex-1 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[100px] resize-vertical"
                      placeholder={`${index + 1}번째 단락 내용을 입력하세요`}
                    />
                    <button
                      onClick={() => removeParagraph(index)}
                      className="text-red-500 hover:text-red-700 p-2 mt-1"
                      title="단락 삭제"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 용어 설명 편집 */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                용어 설명 ({localPassage.footnote.length}개)
              </label>
              <button
                onClick={addFootnote}
                className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-md hover:bg-green-200 transition-colors"
              >
                + 용어 추가
              </button>
            </div>
            
            <div className="space-y-3">
              {localPassage.footnote.map((footnote, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 min-w-[40px]">
                    {index + 1}.
                  </span>
                  <input
                    type="text"
                    value={footnote}
                    onChange={(e) => handleFootnoteChange(index, e.target.value)}
                    className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="용어: 설명"
                  />
                  <button
                    onClick={() => removeFootnote(index)}
                    className="text-red-500 hover:text-red-700 p-2"
                    title="용어 삭제"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 단일 지문 미리보기 */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">미리보기</h3>
            <div className="prose max-w-none">
              <h4 className="text-lg font-medium text-blue-700 mb-3">{localPassage.title}</h4>
              {localPassage.paragraphs.map((paragraph, index) => (
                <p key={index} className="mb-3 text-gray-700 leading-relaxed">
                  {paragraph}
                </p>
              ))}
              
              {localPassage.footnote.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-300">
                  <h5 className="text-sm font-medium text-gray-800 mb-2">용어 설명</h5>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {localPassage.footnote.map((footnote, index) => (
                      <li key={index}>• {footnote}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 다음 단계 버튼 */}
      <div className="flex justify-center pt-6 border-t mt-6">
        <button
          onClick={onNext}
          disabled={loading || (isDualPassageFormat ? 
            !localPassage.passages?.every(p => p.title.trim()) : 
            !localPassage.title.trim())}
          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {loading ? '처리 중...' : '3단계: 어휘 문제 생성하기'}
        </button>
      </div>

      {/* 프롬프트 확인 모달 */}
      <PromptModal
        isOpen={showPromptModal}
        onClose={() => setShowPromptModal(false)}
        title="지문 생성 프롬프트"
        prompt={lastUsedPrompt}
        stepName="2단계: 지문 검토"
      />
    </div>
  );
}