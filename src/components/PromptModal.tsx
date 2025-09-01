'use client';

import { useState } from 'react';

interface PromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  prompt: string;
  stepName: string;
}

export default function PromptModal({ 
  isOpen, 
  onClose, 
  title, 
  prompt, 
  stepName 
}: PromptModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('클립보드 복사 실패:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              📋 프롬프트 확인 - {stepName}
            </h3>
            <p className="text-sm text-gray-500 mt-1">{title}</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors flex items-center space-x-1"
            >
              <span>{copied ? '📋 복사됨!' : '📋 복사'}</span>
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 콘텐츠 */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="px-6 py-4 bg-blue-50 border-b border-blue-100">
            <p className="text-sm text-blue-800">
              💡 아래는 GPT에게 전송된 <strong>실제 프롬프트</strong>입니다. 
              템플릿의 모든 변수({'{termName}'}, {'{passage}'} 등)가 실제 값으로 치환된 상태입니다.
            </p>
          </div>
          <div className="flex-1 overflow-auto p-6">
            <div className="bg-gray-50 rounded-lg p-4 border">
              <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono leading-relaxed">
                {prompt}
              </pre>
            </div>
            {/* 템플릿 변수 확인 */}
            {prompt.includes('{') && prompt.includes('}') && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ 프롬프트에 치환되지 않은 템플릿 변수가 있습니다: {prompt.match(/\{[^}]+\}/g)?.join(', ')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 푸터 */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            프롬프트 길이: {prompt.length.toLocaleString()}자
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}