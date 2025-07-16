'use client';

import { Question } from '@/types';

interface QuestionDisplayProps {
  questions: Question & { saveStatus?: { saved: boolean; error: string | null } };
}

export default function QuestionDisplay({ questions }: QuestionDisplayProps) {
  if (!questions.questions || questions.questions.length === 0) {
    return null;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-start mb-6">
        <h2 className="text-2xl font-bold text-gray-800">생성된 문제</h2>
        
        {/* 저장 상태 표시 */}
        {questions.saveStatus && (
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            questions.saveStatus.saved 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {questions.saveStatus.saved ? '✓ 저장 완료' : '⚠ 저장 실패'}
          </div>
        )}
      </div>

      {/* 저장 오류 메시지 */}
      {questions.saveStatus && !questions.saveStatus.saved && questions.saveStatus.error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">
            <strong>저장 실패:</strong> {questions.saveStatus.error}
          </p>
        </div>
      )}
      
      <div className="space-y-6">
        {questions.questions.map((question, index) => (
          <div key={index} className="border-b last:border-b-0 pb-6 last:pb-0">
            {/* 문제 유형 표시 */}
            <div className="flex items-center gap-2 mb-3">
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                question.type === '일반' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-orange-100 text-orange-800'
              }`}>
                {question.type} 문제
              </span>
              <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                {questions.questionType}
              </span>
            </div>

            {/* 문제 */}
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                문제 {index + 1}
              </h3>
              <p className="text-gray-700">{question.question}</p>
            </div>

            {/* 객관식 선택지 */}
            {questions.questionType === '객관식' && 'options' in question && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-600 mb-2">선택지</h4>
                <ol className="space-y-1">
                  {question.options.map((option, optionIndex) => (
                    <li key={optionIndex} className={`p-2 rounded ${
                      optionIndex + 1 === parseInt(question.answer)
                        ? 'bg-green-100 text-green-800 font-medium'
                        : 'bg-gray-50 text-gray-700'
                    }`}>
                      {optionIndex + 1}. {option}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* 주관식 정답 */}
            {questions.questionType === '주관식' && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-600 mb-1">정답</h4>
                <p className="p-2 bg-green-100 text-green-800 font-medium rounded">
                  {question.answer}
                </p>
              </div>
            )}

            {/* 해설 */}
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-1">해설</h4>
              <p className="text-gray-700 text-sm bg-blue-50 p-3 rounded">
                {question.explanation}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}