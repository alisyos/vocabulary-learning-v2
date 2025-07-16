'use client';

import { Passage } from '@/types';

interface PassageDisplayProps {
  passage: Passage & { saveStatus?: { saved: boolean; error: string | null } };
  onGenerateQuestions: (passageText: string) => void;
  questionsLoading: boolean;
}

export default function PassageDisplay({ 
  passage, 
  onGenerateQuestions, 
  questionsLoading 
}: PassageDisplayProps) {
  if (!passage.passages || passage.passages.length === 0) {
    return null;
  }

  const passageData = passage.passages[0];
  const passageText = passageData.paragraphs.join('\n\n');

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-start mb-6">
        <h2 className="text-2xl font-bold text-gray-800">생성된 지문</h2>
        
        {/* 저장 상태 표시 */}
        {passage.saveStatus && (
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            passage.saveStatus.saved 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {passage.saveStatus.saved ? '✓ 저장 완료' : '⚠ 저장 실패'}
          </div>
        )}
      </div>

      {/* 저장 오류 메시지 */}
      {passage.saveStatus && !passage.saveStatus.saved && passage.saveStatus.error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">
            <strong>저장 실패:</strong> {passage.saveStatus.error}
          </p>
        </div>
      )}
      
      {/* 제목 */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-blue-600 mb-2">
          {passageData.title}
        </h3>
      </div>

      {/* 본문 */}
      <div className="space-y-4 mb-6">
        {passageData.paragraphs.map((paragraph, index) => (
          <p key={index} className="text-gray-700 leading-relaxed text-justify">
            {paragraph}
          </p>
        ))}
      </div>

      {/* 주석 */}
      {passageData.footnote && passageData.footnote.length > 0 && (
        <div className="border-t pt-4 mb-6">
          <h4 className="text-sm font-medium text-gray-600 mb-2">용어 설명</h4>
          <ul className="space-y-1">
            {passageData.footnote.map((note, index) => (
              <li key={index} className="text-sm text-gray-600">
                • {note}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 문제 생성 버튼 */}
      <div className="border-t pt-4">
        <button
          onClick={() => onGenerateQuestions(passageText)}
          disabled={questionsLoading}
          className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {questionsLoading ? '문제 생성 중...' : '문제 생성하기'}
        </button>
      </div>
    </div>
  );
}