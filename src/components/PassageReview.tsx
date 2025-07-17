'use client';

import { useState } from 'react';
import { EditablePassage } from '@/types';

interface PassageReviewProps {
  editablePassage: EditablePassage;
  onUpdate: (updatedPassage: EditablePassage) => void;
  onNext: () => void;
  loading?: boolean;
}

export default function PassageReview({ 
  editablePassage, 
  onUpdate, 
  onNext, 
  loading = false 
}: PassageReviewProps) {
  const [localPassage, setLocalPassage] = useState<EditablePassage>(editablePassage);

  // 제목 수정
  const handleTitleChange = (newTitle: string) => {
    const updated = { ...localPassage, title: newTitle };
    setLocalPassage(updated);
    onUpdate(updated);
  };

  // 단락 수정
  const handleParagraphChange = (index: number, newContent: string) => {
    const updatedParagraphs = [...localPassage.paragraphs];
    updatedParagraphs[index] = newContent;
    const updated = { ...localPassage, paragraphs: updatedParagraphs };
    setLocalPassage(updated);
    onUpdate(updated);
  };

  // 단락 추가
  const addParagraph = () => {
    const updated = { 
      ...localPassage, 
      paragraphs: [...localPassage.paragraphs, '새로운 단락을 입력하세요.'] 
    };
    setLocalPassage(updated);
    onUpdate(updated);
  };

  // 단락 삭제
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

  // 용어 설명 수정
  const handleFootnoteChange = (index: number, newContent: string) => {
    const updatedFootnote = [...localPassage.footnote];
    updatedFootnote[index] = newContent;
    const updated = { ...localPassage, footnote: updatedFootnote };
    setLocalPassage(updated);
    onUpdate(updated);
  };

  // 용어 설명 추가
  const addFootnote = () => {
    const updated = { 
      ...localPassage, 
      footnote: [...localPassage.footnote, '새로운 용어: 용어 설명을 입력하세요.'] 
    };
    setLocalPassage(updated);
    onUpdate(updated);
  };

  // 용어 설명 삭제
  const removeFootnote = (index: number) => {
    const updatedFootnote = localPassage.footnote.filter((_, i) => i !== index);
    const updated = { ...localPassage, footnote: updatedFootnote };
    setLocalPassage(updated);
    onUpdate(updated);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-bold text-gray-800">2단계: 지문 검토 및 수정</h2>
          <button
            onClick={onNext}
            disabled={loading || !localPassage.title.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
          >
            {loading ? '처리 중...' : '3단계: 어휘 문제 생성하기'}
          </button>
        </div>
        <span className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
          검토 및 수정
        </span>
      </div>

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
            본문 ({localPassage.paragraphs.length}개 단락)
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

      {/* 다음 단계 버튼 */}
      <div className="flex justify-center pt-4 border-t">
        <button
          onClick={onNext}
          disabled={loading || !localPassage.title.trim()}
          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {loading ? '처리 중...' : '3단계: 어휘 문제 생성하기'}
        </button>
      </div>

      {/* 미리보기 */}
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
  );
} 