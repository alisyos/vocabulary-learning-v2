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

interface StatsData {
  totalQuestions: number;
  byGrade: Record<string, number>;
  byArea: Record<string, number>;
  bySubject: Record<string, number>;
  byDivision: Record<string, number>;
}

export default function AssessmentPage() {
  const [subject, setSubject] = useState<'사회' | '과학'>('사회');
  const [division, setDivision] = useState<'초등학교' | '중학교'>('초등학교');
  const [questionIds, setQuestionIds] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<QuestionData[] | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);

  // 입력된 문제 ID들의 통계 계산
  const calculateStats = (questions: QuestionData[]) => {
    const byGrade: Record<string, number> = {};
    const byArea: Record<string, number> = {};
    const bySubject: Record<string, number> = {};
    const byDivision: Record<string, number> = {};

    questions.forEach((q) => {
      // 학년별
      const grade = q.content_set.grade || '미분류';
      byGrade[grade] = (byGrade[grade] || 0) + 1;

      // 영역별
      const area = q.content_set.area || '미분류';
      byArea[area] = (byArea[area] || 0) + 1;

      // 과목별
      const subjectValue = q.content_set.subject || '미분류';
      bySubject[subjectValue] = (bySubject[subjectValue] || 0) + 1;

      // 과정별
      const divisionValue = q.content_set.division || '미분류';
      byDivision[divisionValue] = (byDivision[divisionValue] || 0) + 1;
    });

    return {
      totalQuestions: questions.length,
      byGrade,
      byArea,
      bySubject,
      byDivision
    };
  };

  // 과목이나 과정이 변경되면 미리보기와 통계 초기화
  useEffect(() => {
    setPreviewData(null);
    setStats(null);
    setError(null);
  }, [subject, division]);

  // 문제 ID 유효성 검사
  const validateQuestionIds = (ids: string): string[] | null => {
    const trimmed = ids.trim();
    if (!trimmed) {
      setError('문제 ID를 입력해주세요.');
      return null;
    }

    const idArray = trimmed.split(/[\n,]/).map(id => id.trim()).filter(id => id.length > 0);

    if (idArray.length === 0) {
      setError('유효한 문제 ID를 입력해주세요.');
      return null;
    }

    if (idArray.length > 100) {
      setError('최대 100개까지만 입력 가능합니다.');
      return null;
    }

    return idArray;
  };

  // 미리보기 생성
  const handlePreview = async () => {
    setError(null);
    setPreviewData(null);
    setStats(null);

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

        // 입력된 문제 ID들의 통계 계산
        const statsData = calculateStats(result.data);
        setStats(statsData);
        console.log('입력된 문제 통계:', statsData);

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

            {/* 통계 섹션 - 미리보기 버튼을 누른 후에만 표시 */}
            {stats && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">📊 입력한 문제 통계</h2>
                  <div className="text-sm text-gray-500">
                    {subject} · {division}
                  </div>
                </div>

                {/* 전체 통계 */}
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-1">
                      {stats.totalQuestions.toLocaleString()}
                    </div>
                    <div className="text-sm text-blue-800">입력한 어휘 문제 수</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 학년별 통계 */}
                  <div>
                    <h3 className="text-md font-semibold text-gray-800 mb-3 flex items-center">
                      <span className="mr-2">🎓</span>
                      학년별 분포
                    </h3>
                    <div className="space-y-2">
                      {Object.entries(stats.byGrade)
                        .sort(([a], [b]) => {
                          // 학년 정렬: 초3, 초4, 초5, 초6, 중1, 중2, 중3
                          const gradeOrder = ['초3', '초4', '초5', '초6', '중1', '중2', '중3'];
                          return gradeOrder.indexOf(a) - gradeOrder.indexOf(b);
                        })
                        .map(([grade, count]) => (
                          <div
                            key={grade}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <span className="text-sm font-medium text-gray-700">{grade}</span>
                            <div className="flex items-center space-x-3">
                              <div className="w-32 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-500 h-2 rounded-full transition-all"
                                  style={{
                                    width: `${(count / stats.totalQuestions) * 100}%`
                                  }}
                                ></div>
                              </div>
                              <span className="text-sm font-bold text-gray-900 min-w-[60px] text-right">
                                {count.toLocaleString()}개
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                    {Object.keys(stats.byGrade).length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">데이터가 없습니다.</p>
                    )}
                  </div>

                  {/* 영역별 통계 */}
                  <div>
                    <h3 className="text-md font-semibold text-gray-800 mb-3 flex items-center">
                      <span className="mr-2">📚</span>
                      영역별 분포
                    </h3>
                    <div className="space-y-2">
                      {Object.entries(stats.byArea)
                        .sort(([, a], [, b]) => b - a) // 개수순 정렬
                        .map(([area, count]) => (
                          <div
                            key={area}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <span className="text-sm font-medium text-gray-700">{area}</span>
                            <div className="flex items-center space-x-3">
                              <div className="w-32 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-green-500 h-2 rounded-full transition-all"
                                  style={{
                                    width: `${(count / stats.totalQuestions) * 100}%`
                                  }}
                                ></div>
                              </div>
                              <span className="text-sm font-bold text-gray-900 min-w-[60px] text-right">
                                {count.toLocaleString()}개
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                    {Object.keys(stats.byArea).length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">데이터가 없습니다.</p>
                    )}
                  </div>
                </div>

              </div>
            )}

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
                    어휘 문제 ID 입력 (최대 100개)
                  </label>
                  <textarea
                    value={questionIds}
                    onChange={(e) => setQuestionIds(e.target.value)}
                    rows={10}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                    placeholder="문제 ID를 한 줄에 하나씩 입력하세요. (쉼표로 구분도 가능)&#10;예:&#10;abc123&#10;def456&#10;ghi789"
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
