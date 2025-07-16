'use client';

import { useState } from 'react';
import { QuestionInput, GradeType, QuestionType } from '@/types';

interface QuestionFormProps {
  passage: string;
  grade: GradeType;
  onSubmit: (input: QuestionInput) => void;
  loading: boolean;
}

export default function QuestionForm({ passage, grade, onSubmit, loading }: QuestionFormProps) {
  const [questionType, setQuestionType] = useState<QuestionType>('객관식');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      grade,
      passage,
      questionType,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 bg-gray-50 p-4 rounded-lg">
      <h3 className="text-lg font-semibold text-gray-800 mb-3">문제 생성 설정</h3>
      
      {/* 문제 형태 선택 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          문제 형태 *
        </label>
        <select
          value={questionType}
          onChange={(e) => setQuestionType(e.target.value as QuestionType)}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          required
        >
          <option value="객관식">객관식</option>
          <option value="주관식">주관식</option>
        </select>
      </div>

      {/* 제출 버튼 */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
      >
        {loading ? '문제 생성 중...' : '문제 생성하기'}
      </button>
    </form>
  );
}