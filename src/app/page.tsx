'use client';

import { useState } from 'react';
import PassageForm from '@/components/PassageForm';
import PassageDisplay from '@/components/PassageDisplay';
import QuestionForm from '@/components/QuestionForm';
import QuestionDisplay from '@/components/QuestionDisplay';
import { PassageInput, QuestionInput, Passage, Question, GradeType } from '@/types';

export default function Home() {
  const [passageLoading, setPassageLoading] = useState(false);
  const [questionLoading, setQuestionLoading] = useState(false);
  const [passage, setPassage] = useState<Passage | null>(null);
  const [questions, setQuestions] = useState<Question | null>(null);
  const [currentGrade, setCurrentGrade] = useState<GradeType | ''>('');

  const handlePassageSubmit = async (input: PassageInput) => {
    setPassageLoading(true);
    setPassage(null);
    setQuestions(null);
    setCurrentGrade(input.grade);

    try {
      const response = await fetch('/api/generate-passage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error('지문 생성에 실패했습니다.');
      }

      const result = await response.json();
      setPassage(result);
    } catch (error) {
      console.error('Error:', error);
      alert('지문 생성 중 오류가 발생했습니다.');
    } finally {
      setPassageLoading(false);
    }
  };

  const handleQuestionSubmit = async (input: QuestionInput) => {
    setQuestionLoading(true);
    setQuestions(null);

    try {
      const response = await fetch('/api/generate-question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error('문제 생성에 실패했습니다.');
      }

      const result = await response.json();
      setQuestions(result);
    } catch (error) {
      console.error('Error:', error);
      alert('문제 생성 중 오류가 발생했습니다.');
    } finally {
      setQuestionLoading(false);
    }
  };

  const handleGenerateQuestions = (passageText: string) => {
    if (!currentGrade) {
      alert('학년 정보가 없습니다.');
      return;
    }

    const input: QuestionInput = {
      grade: currentGrade as GradeType,
      passage: passageText,
      questionType: '객관식',
    };

    handleQuestionSubmit(input);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            학습 지문 및 문제 생성 시스템
          </h1>
          <p className="text-gray-600">
            AI를 활용하여 과목별 학습 지문과 문제를 자동으로 생성합니다
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 왼쪽: 입력 폼 */}
          <div className="lg:col-span-1 space-y-4">
            <PassageForm 
              onSubmit={handlePassageSubmit} 
              loading={passageLoading} 
            />
            
            {passage && currentGrade && (
              <QuestionForm
                passage={passage.passages[0]?.paragraphs.join('\n\n') || ''}
                grade={currentGrade as GradeType}
                onSubmit={handleQuestionSubmit}
                loading={questionLoading}
              />
            )}
          </div>

          {/* 오른쪽: 결과 표시 */}
          <div className="lg:col-span-2 space-y-6">
            {passage && (
              <PassageDisplay
                passage={passage}
                onGenerateQuestions={handleGenerateQuestions}
                questionsLoading={questionLoading}
              />
            )}

            {questions && (
              <QuestionDisplay questions={questions} />
            )}
          </div>
        </div>

        {/* 로딩 상태 */}
        {(passageLoading || questionLoading) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-700">
                {passageLoading ? '지문을 생성하고 있습니다...' : '문제를 생성하고 있습니다...'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
