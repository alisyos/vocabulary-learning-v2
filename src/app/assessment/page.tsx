'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import RoleAuthGuard from '@/components/RoleAuthGuard';

interface QuestionData {
  id: string;
  question_text: string;
  option_1?: string;
  option_2?: string;
  option_3?: string;
  option_4?: string;
  option_5?: string;
  correct_answer: string;
  explanation: string;
  answer_initials?: string;
  term?: string;
  content_set: {
    division: string;
    grade: string;
    subject: string;
    area: string;
    main_topic?: string;
    sub_topic?: string;
  };
}

export default function AssessmentPage() {
  const [subject, setSubject] = useState<'사회' | '과학'>('사회');
  const [division, setDivision] = useState<'초등학교' | '중학교'>('초등학교');
  const [questionIds, setQuestionIds] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<QuestionData[] | null>(null);

  // 과목이나 과정이 변경되면 미리보기 초기화
  useEffect(() => {
    setPreviewData(null);
    setError(null);
  }, [subject, division]);

  // 문제 ID 유효성 검사
  const validateQuestionIds = (ids: string): string[] | null => {
    const trimmed = ids.trim();
    if (!trimmed) {
      setError('문제 ID를 입력해주세요.');
      return null;
    }

    const idArray = trimmed.split(',').map(id => id.trim()).filter(id => id.length > 0);

    if (idArray.length === 0) {
      setError('유효한 문제 ID를 입력해주세요.');
      return null;
    }

    if (idArray.length > 30) {
      setError('최대 30개까지만 입력 가능합니다.');
      return null;
    }

    return idArray;
  };

  // 미리보기 생성
  const handlePreview = async () => {
    setError(null);
    setPreviewData(null);

    const idArray = validateQuestionIds(questionIds);
    if (!idArray) return;

    try {
      setLoading(true);

      const response = await fetch('/api/assessment/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionIds: idArray,
          subject,
          division,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '문제 조회에 실패했습니다.');
      }

      const result = await response.json();

      if (result.success) {
        setPreviewData(result.data);

        // 경고 메시지가 있으면 표시
        if (result.warning) {
          setError(`⚠️ ${result.warning}`);
        }
      } else {
        throw new Error(result.error || '문제 조회에 실패했습니다.');
      }
    } catch (err) {
      console.error('미리보기 생성 실패:', err);
      setError(err instanceof Error ? err.message : '미리보기 생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // HTML 다운로드
  const handleDownload = async () => {
    if (!previewData || previewData.length === 0) {
      setError('먼저 미리보기를 생성해주세요.');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch('/api/assessment/generate-html', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questions: previewData,
          subject,
          division,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'HTML 생성에 실패했습니다.');
      }

      // HTML 파일 다운로드
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // 파일명 생성
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const filename = `진단평가_${subject}_${division}_${timestamp}.html`;
      link.download = filename;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setError(null);
    } catch (err) {
      console.error('HTML 다운로드 실패:', err);
      setError(err instanceof Error ? err.message : 'HTML 다운로드 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <RoleAuthGuard allowedRoles={['admin']}>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            {/* 헤더 */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">진단평가 문제 추출</h1>
              <p className="text-gray-600">
                어휘 문제 테이블에서 특정 문제들을 선택하여 진단평가용 HTML 파일을 생성합니다.
              </p>
            </div>

            {/* 오류/경고 메시지 */}
            {error && (
              <div className={`mb-6 rounded-lg p-4 ${
                error.startsWith('⚠️')
                  ? 'bg-yellow-50 border border-yellow-200'
                  : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex">
                  <div className="flex-shrink-0">
                    {error.startsWith('⚠️') ? (
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="ml-3">
                    <p className={`text-sm ${
                      error.startsWith('⚠️') ? 'text-yellow-800' : 'text-red-800'
                    }`}>{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* 입력 폼 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">📋 진단평가 정보 입력</h2>

              <div className="space-y-6">
                {/* 과목 선택 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    과목 선택
                  </label>
                  <div className="flex space-x-4">
                    <button
                      type="button"
                      onClick={() => setSubject('사회')}
                      className={`flex-1 py-3 px-4 rounded-md border-2 font-medium transition-colors ${
                        subject === '사회'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      사회
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubject('과학')}
                      className={`flex-1 py-3 px-4 rounded-md border-2 font-medium transition-colors ${
                        subject === '과학'
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      과학
                    </button>
                  </div>
                </div>

                {/* 과정 선택 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    과정 선택
                  </label>
                  <div className="flex space-x-4">
                    <button
                      type="button"
                      onClick={() => setDivision('초등학교')}
                      className={`flex-1 py-3 px-4 rounded-md border-2 font-medium transition-colors ${
                        division === '초등학교'
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      초등학교
                    </button>
                    <button
                      type="button"
                      onClick={() => setDivision('중학교')}
                      className={`flex-1 py-3 px-4 rounded-md border-2 font-medium transition-colors ${
                        division === '중학교'
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      중학교
                    </button>
                  </div>
                </div>

                {/* 문제 ID 입력 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    어휘 문제 ID 입력 (최대 30개)
                  </label>
                  <textarea
                    value={questionIds}
                    onChange={(e) => setQuestionIds(e.target.value)}
                    rows={4}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                    placeholder="문제 ID를 쉼표로 구분하여 입력하세요.&#10;예: abc123, def456, ghi789"
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    문제 ID는 vocabulary_questions 테이블의 id 컬럼 값입니다.
                  </p>
                </div>

                {/* 버튼 */}
                <div className="flex space-x-4">
                  <button
                    onClick={handlePreview}
                    disabled={loading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? '조회 중...' : '🔍 미리보기'}
                  </button>
                  <button
                    onClick={handleDownload}
                    disabled={loading || !previewData || previewData.length === 0}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? '생성 중...' : '💾 HTML 다운로드'}
                  </button>
                </div>
              </div>
            </div>

            {/* 미리보기 */}
            {previewData && previewData.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  📄 미리보기 ({previewData.length}개 문제)
                </h2>

                <div className="space-y-6">
                  {previewData.map((question, index) => (
                    <div key={question.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                              문제 {index + 1}
                            </span>
                            <span className="text-xs text-gray-500">ID: {question.id}</span>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p><strong>학년:</strong> {question.content_set.division} {question.content_set.grade}</p>
                            <p><strong>과목:</strong> {question.content_set.subject}</p>
                            <p><strong>영역:</strong> {question.content_set.area}</p>
                            {question.content_set.main_topic && (
                              <p><strong>대주제:</strong> {question.content_set.main_topic}</p>
                            )}
                            {question.content_set.sub_topic && (
                              <p><strong>소주제:</strong> {question.content_set.sub_topic}</p>
                            )}
                            {question.term && (
                              <p><strong>어휘:</strong> {question.term}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 p-4 bg-white rounded border border-gray-200">
                        <p className="font-medium text-gray-900 mb-3">{question.question_text}</p>

                        {question.option_1 && (
                          <div className="space-y-2">
                            {[1, 2, 3, 4, 5].map((num) => {
                              const optionKey = `option_${num}` as keyof QuestionData;
                              const option = question[optionKey];
                              if (!option) return null;

                              // 정답 비교 (선택지 텍스트와 정답 텍스트 비교)
                              const correctAnswerStr = String(question.correct_answer).trim();
                              const optionText = String(option).trim();
                              const isCorrect = optionText === correctAnswerStr;

                              return (
                                <div
                                  key={num}
                                  className={`p-3 rounded ${
                                    isCorrect
                                      ? 'bg-green-50 border-2 border-green-600 font-medium'
                                      : 'bg-gray-50 border border-gray-300'
                                  }`}
                                >
                                  <span className="font-medium mr-2">{num}.</span>
                                  {option}
                                  {isCorrect && (
                                    <span className="ml-2 text-green-600 font-bold">✓ 정답</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {!question.option_1 && (
                          <div className="p-2 rounded bg-green-50 border border-green-300">
                            <span className="font-medium mr-2">정답:</span>
                            {question.correct_answer}
                            {question.answer_initials && (
                              <span className="ml-3 text-sm text-yellow-700 bg-yellow-100 px-2 py-1 rounded">
                                초성 힌트: {question.answer_initials}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="mt-3 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                          <div className="font-medium text-blue-900 mb-1">💡 해설</div>
                          <div className="text-sm text-blue-800">{question.explanation}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </RoleAuthGuard>
  );
}
