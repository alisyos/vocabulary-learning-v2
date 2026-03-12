'use client';

import { useState } from 'react';
import Link from 'next/link';

interface ReviewResult {
  success: boolean;
  dryRun: boolean;
  message: string;
  totalRecords?: number;
  affectedRecords?: number;
  samples?: any[];
  successCount?: number;
  errorCount?: number;
  details?: any;
  mismatchCount?: number; // 어휘 불일치 검수용
  totalChecked?: number; // 어휘 불일치 검수용
}

export default function FinalReviewPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string[]>(['검수 전']); // 배열로 변경
  const [sessionRange, setSessionRange] = useState<string>(''); // 차시 범위 입력

  // 8가지 검수 상태
  const statusOptions = [
    '검수 전',
    '1차검수',
    '2차검수',
    '3차검수',
    '4차검수',
    '검수완료',
    '복제',
    '승인완료'
  ];

  // 상태 토글 함수
  const toggleStatus = (status: string) => {
    setStatusFilter(prev => {
      if (prev.includes(status)) {
        // 이미 선택된 경우 제거 (단, 최소 1개는 유지)
        if (prev.length > 1) {
          return prev.filter(s => s !== status);
        }
        return prev;
      } else {
        // 선택되지 않은 경우 추가
        return [...prev, status];
      }
    });
  };

  // 전체 선택/해제
  const toggleAll = () => {
    if (statusFilter.length === statusOptions.length) {
      // 전체 선택 상태면 첫 번째만 남기기
      setStatusFilter([statusOptions[0]]);
    } else {
      // 전체 선택
      setStatusFilter([...statusOptions]);
    }
  };

  // 차시 범위 파싱 함수
  const parseSessionRange = (input: string): { start: number | null; end: number | null } | null => {
    if (!input || input.trim() === '') {
      return null; // 빈 값이면 필터링 안 함
    }

    const trimmed = input.trim();

    // '1-20' 형식
    if (trimmed.includes('-')) {
      const parts = trimmed.split('-').map(s => s.trim());
      if (parts.length === 2) {
        const start = parseInt(parts[0], 10);
        const end = parseInt(parts[1], 10);
        if (!isNaN(start) && !isNaN(end) && start > 0 && end >= start) {
          return { start, end };
        }
      }
      return null; // 잘못된 형식
    }

    // '1' 형식 (단일 차시)
    const single = parseInt(trimmed, 10);
    if (!isNaN(single) && single > 0) {
      return { start: single, end: single };
    }

    return null; // 잘못된 형식
  };

  // 각 검수 항목별 결과
  const [passageQuotesResult, setPassageQuotesResult] = useState<ReviewResult | null>(null);
  const [explanationQuotesResult, setExplanationQuotesResult] = useState<ReviewResult | null>(null);
  const [hasQuestionResult, setHasQuestionResult] = useState<ReviewResult | null>(null);
  const [vocabularyMismatchResult, setVocabularyMismatchResult] = useState<ReviewResult | null>(null);
  const [comprehensivePeriodsResult, setComprehensivePeriodsResult] = useState<ReviewResult | null>(null);
  const [answerMatchResult, setAnswerMatchResult] = useState<ReviewResult | null>(null);
  const [exampleCommaResult, setExampleCommaResult] = useState<ReviewResult | null>(null);
  const [quotePeriodResult, setQuotePeriodResult] = useState<ReviewResult | null>(null);
  const [doubleQuotesResult, setDoubleQuotesResult] = useState<ReviewResult | null>(null);
  const [citationMismatchResult, setCitationMismatchResult] = useState<ReviewResult | null>(null);
  const [textReplaceResult, setTextReplaceResult] = useState<ReviewResult | null>(null);
  const [definitionPeriodsResult, setDefinitionPeriodsResult] = useState<ReviewResult | null>(null);

  // 11번 검수용 상태
  const [searchText, setSearchText] = useState<string>('');
  const [replaceText, setReplaceText] = useState<string>('');

  // 1. 지문 따옴표 검수
  const handlePassageQuotesReview = async (dryRun: boolean) => {
    setLoading('passage-quotes');
    setPassageQuotesResult(null);

    try {
      const parsedRange = parseSessionRange(sessionRange);

      const response = await fetch('/api/review-passage-quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dryRun,
          statuses: statusFilter, // 배열로 전달
          sessionRange: parsedRange
        })
      });

      const data = await response.json();
      setPassageQuotesResult(data);

      if (!dryRun && data.success) {
        alert(`✅ 지문 따옴표 검수 완료!\n\n${data.successCount}개 수정됨`);
      }
    } catch (error) {
      console.error('지문 따옴표 검수 오류:', error);
      alert('검수 중 오류가 발생했습니다.');
    } finally {
      setLoading(null);
    }
  };

  // 2. 어휘문제 해설 따옴표 검수
  const handleExplanationQuotesReview = async (dryRun: boolean) => {
    setLoading('explanation-quotes');
    setExplanationQuotesResult(null);

    try {
      const parsedRange = parseSessionRange(sessionRange);

      const response = await fetch('/api/review-explanation-quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dryRun,
          statuses: statusFilter, // 배열로 전달
          sessionRange: parsedRange
        })
      });

      const data = await response.json();
      setExplanationQuotesResult(data);

      if (!dryRun && data.success) {
        alert(`✅ 해설 따옴표 검수 완료!\n\n${data.successCount}개 수정됨\n(어휘문제: ${data.vocabularyCount || 0}개, 문단문제: ${data.paragraphCount || 0}개, 종합문제: ${data.comprehensiveCount || 0}개)`);
      }
    } catch (error) {
      console.error('해설 따옴표 검수 오류:', error);
      alert('검수 중 오류가 발생했습니다.');
    } finally {
      setLoading(null);
    }
  };

  // 3. has_question_generated 검수
  const handleHasQuestionReview = async (dryRun: boolean) => {
    setLoading('has-question');
    setHasQuestionResult(null);

    try {
      const parsedRange = parseSessionRange(sessionRange);

      const response = await fetch('/api/review-has-question-generated', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dryRun,
          statuses: statusFilter, // 배열로 전달
          sessionRange: parsedRange
        })
      });

      const data = await response.json();
      setHasQuestionResult(data);

      if (!dryRun && data.success) {
        alert(`✅ has_question_generated 검수 완료!\n\n${data.successCount}개 수정됨`);
      }
    } catch (error) {
      console.error('has_question_generated 검수 오류:', error);
      alert('검수 중 오류가 발생했습니다.');
    } finally {
      setLoading(null);
    }
  };

  // 4. 어휘-어휘문제 불일치 검수
  const handleVocabularyMismatchReview = async (dryRun: boolean) => {
    setLoading('vocabulary-mismatch');
    setVocabularyMismatchResult(null);

    try {
      const parsedRange = parseSessionRange(sessionRange);

      const response = await fetch('/api/review-vocabulary-mismatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dryRun,
          statuses: statusFilter,
          sessionRange: parsedRange
        })
      });

      const data = await response.json();
      setVocabularyMismatchResult(data);

      if (!dryRun && data.success) {
        alert(`✅ 어휘-어휘문제 불일치 검수 완료!\n\n${data.successCount}개 삭제됨`);
      }
    } catch (error) {
      console.error('어휘-어휘문제 불일치 검수 오류:', error);
      alert('검수 중 오류가 발생했습니다.');
    } finally {
      setLoading(null);
    }
  };

  // 5. 종합문제 선택지/정답 마침표 검수
  const handleComprehensivePeriodsReview = async (dryRun: boolean) => {
    setLoading('comprehensive-periods');
    setComprehensivePeriodsResult(null);

    try {
      const parsedRange = parseSessionRange(sessionRange);

      const response = await fetch('/api/review-comprehensive-periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dryRun,
          statuses: statusFilter,
          sessionRange: parsedRange
        })
      });

      const data = await response.json();
      setComprehensivePeriodsResult(data);

      if (!dryRun && data.success) {
        alert(`✅ 종합/문단 문제 마침표 검수 완료!\n\n${data.successCount}개 수정됨\n(종합문제: ${data.comprehensiveCount || 0}개, 문단문제: ${data.paragraphCount || 0}개)`);
      }
    } catch (error) {
      console.error('종합문제 마침표 검수 오류:', error);
      alert('검수 중 오류가 발생했습니다.');
    } finally {
      setLoading(null);
    }
  };

  // 6. 종합문제 정답-선택지 일치 검수
  const handleAnswerMatchReview = async () => {
    setLoading('answer-match');
    setAnswerMatchResult(null);

    try {
      const parsedRange = parseSessionRange(sessionRange);

      const response = await fetch('/api/review-comprehensive-answer-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dryRun: true, // 항상 드라이런 (수정 기능 없음)
          statuses: statusFilter,
          sessionRange: parsedRange
        })
      });

      const data = await response.json();
      setAnswerMatchResult(data);
    } catch (error) {
      console.error('종합문제 정답-선택지 일치 검수 오류:', error);
      alert('검수 중 오류가 발생했습니다.');
    } finally {
      setLoading(null);
    }
  };

  // 7. '예를 들어' 쉼표 검수
  const handleExampleCommaReview = async (dryRun: boolean) => {
    setLoading('example-comma');
    setExampleCommaResult(null);

    try {
      const parsedRange = parseSessionRange(sessionRange);

      const response = await fetch('/api/review-example-comma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dryRun,
          statuses: statusFilter,
          sessionRange: parsedRange
        })
      });

      const data = await response.json();
      setExampleCommaResult(data);

      if (!dryRun && data.success) {
        alert(`✅ '예를 들어' 쉼표 검수 완료!\n\n${data.successCount}개 수정됨\n(어휘문제: ${data.vocabularyCount || 0}개, 문단문제: ${data.paragraphCount || 0}개, 종합문제: ${data.comprehensiveCount || 0}개)`);
      }
    } catch (error) {
      console.error("'예를 들어' 쉼표 검수 오류:", error);
      alert('검수 중 오류가 발생했습니다.');
    } finally {
      setLoading(null);
    }
  };

  // 8. 인용문 마침표 검수
  const handleQuotePeriodReview = async (dryRun: boolean) => {
    setLoading('quote-period');
    setQuotePeriodResult(null);

    try {
      const parsedRange = parseSessionRange(sessionRange);

      const response = await fetch('/api/review-quote-period', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dryRun,
          statuses: statusFilter,
          sessionRange: parsedRange
        })
      });

      const data = await response.json();
      setQuotePeriodResult(data);

      if (!dryRun && data.success) {
        alert(`✅ 인용문 마침표 검수 완료!\n\n${data.successCount}개 수정됨\n(문단문제: ${data.paragraphCount || 0}개, 종합문제: ${data.comprehensiveCount || 0}개)`);
      }
    } catch (error) {
      console.error('인용문 마침표 검수 오류:', error);
      alert('검수 중 오류가 발생했습니다.');
    } finally {
      setLoading(null);
    }
  };

  // 9. 해설 큰따옴표 → 작은따옴표 변환 검수
  const handleDoubleQuotesReview = async (dryRun: boolean) => {
    setLoading('double-quotes');
    setDoubleQuotesResult(null);

    try {
      const parsedRange = parseSessionRange(sessionRange);

      const response = await fetch('/api/review-double-quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dryRun,
          statuses: statusFilter,
          sessionRange: parsedRange
        })
      });

      const data = await response.json();
      setDoubleQuotesResult(data);

      if (!dryRun && data.success) {
        alert(`✅ 해설 큰따옴표 검수 완료!\n\n${data.successCount}개 수정됨\n(어휘문제: ${data.vocabularyCount || 0}개, 문단문제: ${data.paragraphCount || 0}개, 종합문제: ${data.comprehensiveCount || 0}개)`);
      }
    } catch (error) {
      console.error('해설 큰따옴표 검수 오류:', error);
      alert('검수 중 오류가 발생했습니다.');
    } finally {
      setLoading(null);
    }
  };

  // 10. 해설 인용 불일치 검수
  const handleCitationMismatchReview = async () => {
    setLoading('citation-mismatch');
    setCitationMismatchResult(null);

    try {
      const parsedRange = parseSessionRange(sessionRange);

      const response = await fetch('/api/review-explanation-citation-mismatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dryRun: true, // 항상 드라이런 (수정 기능 없음)
          statuses: statusFilter,
          sessionRange: parsedRange
        })
      });

      const data = await response.json();
      setCitationMismatchResult(data);
    } catch (error) {
      console.error('해설 인용 불일치 검수 오류:', error);
      alert('검수 중 오류가 발생했습니다.');
    } finally {
      setLoading(null);
    }
  };

  // 11. 텍스트 일괄 수정 검수
  const handleTextReplaceReview = async (dryRun: boolean) => {
    if (!searchText.trim()) {
      alert('검색어를 입력해주세요.');
      return;
    }

    setLoading('text-replace');
    setTextReplaceResult(null);

    try {
      const parsedRange = parseSessionRange(sessionRange);

      const response = await fetch('/api/review-text-replace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dryRun,
          statuses: statusFilter,
          sessionRange: parsedRange,
          searchText: searchText.trim(),
          replaceText: replaceText
        })
      });

      const data = await response.json();
      setTextReplaceResult(data);

      if (!dryRun && data.success) {
        alert(`✅ 텍스트 일괄 수정 완료!\n\n"${searchText}" → "${replaceText}"\n${data.successCount}개 수정됨`);
      }
    } catch (error) {
      console.error('텍스트 일괄 수정 오류:', error);
      alert('검수 중 오류가 발생했습니다.');
    } finally {
      setLoading(null);
    }
  };

  // 12. 어휘 용어설명 마침표 검수
  const handleDefinitionPeriodsReview = async (dryRun: boolean) => {
    setLoading('definition-periods');
    setDefinitionPeriodsResult(null);

    try {
      const parsedRange = parseSessionRange(sessionRange);

      const response = await fetch('/api/review-definition-periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dryRun,
          statuses: statusFilter,
          sessionRange: parsedRange
        })
      });

      const data = await response.json();
      setDefinitionPeriodsResult(data);

      if (!dryRun && data.success) {
        alert(`✅ 어휘 용어설명 마침표 검수 완료!\n\n${data.successCount}개 수정됨`);
      }
    } catch (error) {
      console.error('어휘 용어설명 마침표 검수 오류:', error);
      alert('검수 중 오류가 발생했습니다.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">
              최종 검수
            </h1>
            <Link
              href="/db-admin"
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              ← DB 관리로 돌아가기
            </Link>
          </div>
          <p className="text-gray-600">
            생성된 콘텐츠의 데이터 품질을 검수하고 자동으로 수정합니다.
            <br />
            <span className="text-sm text-red-600">
              ⚠️ 실제 데이터를 수정하므로 먼저 드라이런으로 확인하세요.
            </span>
          </p>
        </div>

        {/* 검수 상태 필터링 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            🔍 필터링 옵션
          </h2>

          {/* 검수 상태 선택 (체크박스) */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700">
                검수 상태 (중복 선택 가능):
              </label>
              <button
                onClick={toggleAll}
                className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                {statusFilter.length === statusOptions.length ? '전체 해제' : '전체 선택'}
              </button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {statusOptions.map((status) => (
                <label
                  key={status}
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 cursor-pointer transition-colors ${
                    statusFilter.includes(status)
                      ? 'bg-blue-50 border-blue-500 text-blue-900'
                      : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={statusFilter.includes(status)}
                    onChange={() => toggleStatus(status)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="font-medium text-sm">{status}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 차시 범위 입력 */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700 w-24">
              차시 범위:
            </label>
            <input
              type="text"
              value={sessionRange}
              onChange={(e) => setSessionRange(e.target.value)}
              placeholder="예: 1 (1차시만) 또는 1-20 (1~20차시)"
              className="flex-1 max-w-md px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
            {sessionRange && (
              <button
                onClick={() => setSessionRange('')}
                className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                초기화
              </button>
            )}
          </div>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>현재 필터:</strong>
              <br />
              • 검수 상태: <strong className="text-blue-600">{statusFilter.join(', ')}</strong> ({statusFilter.length}개 선택)
              <br />
              • 차시 범위: {sessionRange ? (
                <strong className="text-blue-600">{sessionRange}</strong>
              ) : (
                <span className="text-gray-500">전체 차시</span>
              )}
            </p>
          </div>
        </div>

        {/* 검수 항목 1: 지문 따옴표 검수 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3">
            📝 1. 지문 따옴표 검수
          </h2>
          <p className="text-gray-600 mb-4">
            지문(passages) 테이블의 단락(paragraph_1~10) 내용에서 어휘에 작은따옴표가 있는 경우 삭제합니다.
            <br />
            <span className="text-sm text-gray-500">
              예: '공급' → 공급
            </span>
          </p>

          <div className="flex gap-4 mb-4">
            <button
              onClick={() => handlePassageQuotesReview(true)}
              disabled={loading !== null}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold"
            >
              {loading === 'passage-quotes' ? '처리 중...' : '🔍 드라이런 (미리보기)'}
            </button>
            <button
              onClick={() => {
                if (confirm('⚠️ 지문 따옴표를 실제로 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
                  handlePassageQuotesReview(false);
                }
              }}
              disabled={loading !== null}
              className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 font-semibold"
            >
              {loading === 'passage-quotes' ? '처리 중...' : '⚡ 실행'}
            </button>
          </div>

          {/* 결과 표시 */}
          {passageQuotesResult && (
            <div className={`rounded-lg p-4 ${passageQuotesResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <h3 className="font-semibold text-gray-900 mb-2">
                {passageQuotesResult.dryRun ? '📊 드라이런 결과' : '✅ 실행 결과'}
              </h3>
              <p className="text-gray-700 mb-2">{passageQuotesResult.message}</p>

              {passageQuotesResult.dryRun && passageQuotesResult.samples && passageQuotesResult.samples.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    샘플 미리보기 (최대 10개):
                  </p>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {passageQuotesResult.samples.slice(0, 10).map((sample: any, idx: number) => (
                      <div key={idx} className="bg-white p-3 rounded border border-gray-200 text-sm">
                        <div className="font-medium text-gray-800 mb-1">
                          콘텐츠 세트: {sample.content_set_id}
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            {sample.paragraph_field}
                          </span>
                        </div>
                        <div className="text-red-600 line-through mb-1 text-xs">
                          {sample.original}
                        </div>
                        <div className="text-green-600 font-medium text-xs">
                          {sample.converted}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!passageQuotesResult.dryRun && (
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div className="bg-white p-3 rounded">
                    <div className="text-sm text-gray-600">성공</div>
                    <div className="text-2xl font-bold text-green-700">
                      {passageQuotesResult.successCount || 0}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded">
                    <div className="text-sm text-gray-600">실패</div>
                    <div className="text-2xl font-bold text-red-700">
                      {passageQuotesResult.errorCount || 0}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 검수 항목 2: 해설 따옴표 검수 (어휘/문단/종합) */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3">
            📚 2. 해설 따옴표 검수 (어휘/문단/종합)
          </h2>
          <p className="text-gray-600 mb-4">
            어휘문제(vocabulary_questions), 문단문제(paragraph_questions), 종합문제(comprehensive_questions) 테이블의 해설(explanation)에서 인용이 아닌 작은따옴표를 삭제합니다.
            <br />
            <span className="text-sm text-gray-500">
              예: &apos;공급&apos; → 공급 (인용 패턴인 &apos;~&apos;와/라고/고/라는/는/처럼/이/가/을/를/에 는 유지)
            </span>
          </p>

          <div className="flex gap-4 mb-4">
            <button
              onClick={() => handleExplanationQuotesReview(true)}
              disabled={loading !== null}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold"
            >
              {loading === 'explanation-quotes' ? '처리 중...' : '🔍 드라이런 (미리보기)'}
            </button>
            <button
              onClick={() => {
                if (confirm('⚠️ 어휘/문단/종합 문제 해설의 따옴표를 실제로 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
                  handleExplanationQuotesReview(false);
                }
              }}
              disabled={loading !== null}
              className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 font-semibold"
            >
              {loading === 'explanation-quotes' ? '처리 중...' : '⚡ 실행'}
            </button>
          </div>

          {/* 결과 표시 */}
          {explanationQuotesResult && (
            <div className={`rounded-lg p-4 ${explanationQuotesResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <h3 className="font-semibold text-gray-900 mb-2">
                {explanationQuotesResult.dryRun ? '📊 드라이런 결과' : '✅ 실행 결과'}
              </h3>
              <p className="text-gray-700 mb-2">{explanationQuotesResult.message}</p>

              {/* 테이블별 건수 표시 */}
              {explanationQuotesResult.dryRun && (explanationQuotesResult as any).vocabularyCount !== undefined && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-sm text-blue-800">
                    <strong>📊 상세 내역:</strong>
                    <br />
                    • 어휘문제: <strong>{(explanationQuotesResult as any).vocabularyCount}개</strong>
                    <br />
                    • 문단문제: <strong>{(explanationQuotesResult as any).paragraphCount}개</strong>
                    <br />
                    • 종합문제: <strong>{(explanationQuotesResult as any).comprehensiveCount}개</strong>
                  </p>
                </div>
              )}

              {explanationQuotesResult.dryRun && explanationQuotesResult.samples && explanationQuotesResult.samples.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    샘플 미리보기 (최대 15개):
                  </p>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {explanationQuotesResult.samples.slice(0, 15).map((sample: any, idx: number) => (
                      <div key={idx} className="bg-white p-3 rounded border border-gray-200 text-sm">
                        <div className="font-medium text-gray-800 mb-1">
                          콘텐츠 세트: {sample.content_set_id}
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-xs px-2 py-1 rounded ${
                            sample.tableName === 'vocabulary_questions'
                              ? 'bg-green-100 text-green-700'
                              : sample.tableName === 'paragraph_questions'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-purple-100 text-purple-700'
                          }`}>
                            {sample.tableLabel}
                          </span>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            문제 #{sample.question_number}
                          </span>
                          {sample.question_type && (
                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                              {sample.question_type}
                            </span>
                          )}
                        </div>
                        <div className="text-red-600 line-through mb-1 text-xs">
                          {sample.original.length > 150 ? sample.original.slice(0, 150) + '...' : sample.original}
                        </div>
                        <div className="text-green-600 font-medium text-xs">
                          {sample.converted.length > 150 ? sample.converted.slice(0, 150) + '...' : sample.converted}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!explanationQuotesResult.dryRun && (
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div className="bg-white p-3 rounded">
                    <div className="text-sm text-gray-600">성공</div>
                    <div className="text-2xl font-bold text-green-700">
                      {explanationQuotesResult.successCount || 0}
                    </div>
                    {(explanationQuotesResult as any).vocabularyCount !== undefined && (
                      <div className="text-xs text-gray-500 mt-1">
                        어휘: {(explanationQuotesResult as any).vocabularyCount}개,
                        문단: {(explanationQuotesResult as any).paragraphCount}개,
                        종합: {(explanationQuotesResult as any).comprehensiveCount}개
                      </div>
                    )}
                  </div>
                  <div className="bg-white p-3 rounded">
                    <div className="text-sm text-gray-600">실패</div>
                    <div className="text-2xl font-bold text-red-700">
                      {explanationQuotesResult.errorCount || 0}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 검수 항목 3: has_question_generated 검수 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3">
            🔍 3. has_question_generated 검수
          </h2>
          <p className="text-gray-600 mb-4">
            어휘(vocabulary_terms) 테이블의 has_question_generated 필드가 실제 어휘문제 존재 여부와 일치하는지 확인하고 수정합니다.
            <br />
            <span className="text-sm text-gray-500">
              어휘문제가 있으면 TRUE, 없으면 FALSE로 설정
            </span>
          </p>

          <div className="flex gap-4 mb-4">
            <button
              onClick={() => handleHasQuestionReview(true)}
              disabled={loading !== null}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold"
            >
              {loading === 'has-question' ? '처리 중...' : '🔍 드라이런 (미리보기)'}
            </button>
            <button
              onClick={() => {
                if (confirm('⚠️ has_question_generated를 실제로 수정하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
                  handleHasQuestionReview(false);
                }
              }}
              disabled={loading !== null}
              className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 font-semibold"
            >
              {loading === 'has-question' ? '처리 중...' : '⚡ 실행'}
            </button>
          </div>

          {/* 결과 표시 */}
          {hasQuestionResult && (
            <div className={`rounded-lg p-4 ${hasQuestionResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <h3 className="font-semibold text-gray-900 mb-2">
                {hasQuestionResult.dryRun ? '📊 드라이런 결과' : '✅ 실행 결과'}
              </h3>
              <p className="text-gray-700 mb-2">{hasQuestionResult.message}</p>

              {hasQuestionResult.dryRun && hasQuestionResult.samples && hasQuestionResult.samples.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    샘플 미리보기 (최대 10개):
                  </p>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {hasQuestionResult.samples.slice(0, 10).map((sample: any, idx: number) => (
                      <div key={idx} className="bg-white p-3 rounded border border-gray-200 text-sm">
                        <div className="font-medium text-gray-800 mb-1">
                          {sample.content_set_id} - {sample.term}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-red-600">현재: {sample.current ? 'TRUE' : 'FALSE'}</span>
                          <span>→</span>
                          <span className="text-green-600 font-medium">변경: {sample.should_be ? 'TRUE' : 'FALSE'}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          이유: {sample.reason}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!hasQuestionResult.dryRun && (
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div className="bg-white p-3 rounded">
                    <div className="text-sm text-gray-600">성공</div>
                    <div className="text-2xl font-bold text-green-700">
                      {hasQuestionResult.successCount || 0}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded">
                    <div className="text-sm text-gray-600">실패</div>
                    <div className="text-2xl font-bold text-red-700">
                      {hasQuestionResult.errorCount || 0}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 검수 항목 4: 어휘-어휘문제 불일치 검수 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3">
            ⚠️ 4. 어휘-어휘문제 불일치 검수
          </h2>
          <p className="text-gray-600 mb-4">
            어휘문제(vocabulary_questions)가 같은 콘텐츠 세트 내의 어휘(vocabulary_terms)에 존재하는지 확인합니다.
            <br />
            <span className="text-sm text-red-600 font-medium">
              ⚠️ 어휘 테이블에 없는 term으로 만들어진 문제는 삭제됩니다.
            </span>
          </p>

          <div className="flex gap-4 mb-4">
            <button
              onClick={() => handleVocabularyMismatchReview(true)}
              disabled={loading !== null}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold"
            >
              {loading === 'vocabulary-mismatch' ? '처리 중...' : '🔍 드라이런 (미리보기)'}
            </button>
            <button
              onClick={() => {
                if (confirm('⚠️⚠️ 경고 ⚠️⚠️\n\n어휘 테이블에 없는 term의 어휘문제를 삭제합니다.\n이 작업은 되돌릴 수 없습니다.\n\n정말로 실행하시겠습니까?')) {
                  handleVocabularyMismatchReview(false);
                }
              }}
              disabled={loading !== null}
              className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 font-semibold"
            >
              {loading === 'vocabulary-mismatch' ? '처리 중...' : '🗑️ 실행 (불일치 문제 삭제)'}
            </button>
          </div>

          {/* 결과 표시 */}
          {vocabularyMismatchResult && (
            <div className={`rounded-lg p-4 ${vocabularyMismatchResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <h3 className="font-semibold text-gray-900 mb-2">
                {vocabularyMismatchResult.dryRun ? '📊 드라이런 결과' : '✅ 실행 결과'}
              </h3>
              <p className="text-gray-700 mb-2">{vocabularyMismatchResult.message}</p>

              {vocabularyMismatchResult.dryRun && vocabularyMismatchResult.samples && vocabularyMismatchResult.samples.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    불일치 문제 미리보기 (최대 20개):
                  </p>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {vocabularyMismatchResult.samples.map((sample: any, idx: number) => (
                      <div key={idx} className="bg-white p-3 rounded border-2 border-red-300 text-sm">
                        <div className="font-medium text-gray-800 mb-1">
                          콘텐츠 세트: {sample.content_set_id}
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                            문제 #{sample.question_number}
                          </span>
                          <span className="text-red-600 font-semibold">Term: {sample.term}</span>
                        </div>
                        <div className="text-gray-600 text-xs mb-1">
                          문제: {sample.question_text}
                        </div>
                        <div className="text-xs text-red-600 font-medium">
                          ⚠️ {sample.reason}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 p-2 bg-yellow-50 border border-yellow-300 rounded">
                    <p className="text-sm text-yellow-800">
                      <strong>💡 참고:</strong> 총 {vocabularyMismatchResult.mismatchCount}개의 불일치 문제가 발견되었습니다.
                      실행 시 이 문제들이 모두 삭제됩니다.
                    </p>
                  </div>
                </div>
              )}

              {!vocabularyMismatchResult.dryRun && (
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div className="bg-white p-3 rounded">
                    <div className="text-sm text-gray-600">삭제 성공</div>
                    <div className="text-2xl font-bold text-green-700">
                      {vocabularyMismatchResult.successCount || 0}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded">
                    <div className="text-sm text-gray-600">실패</div>
                    <div className="text-2xl font-bold text-red-700">
                      {vocabularyMismatchResult.errorCount || 0}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 검수 항목 5: 종합문제/문단문제 선택지 마침표 검수 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3">
            📌 5. 종합/문단 문제 선택지 마침표 검수
          </h2>
          <p className="text-gray-600 mb-4">
            종합문제(comprehensive_questions)와 문단문제(paragraph_questions) 테이블의 선택지에서 '~다'로 끝나는데 마침표가 없는 경우 마침표를 추가합니다.
            <br />
            <span className="text-sm text-gray-500">
              • 종합문제: 선택지(option_1~5)와 정답(correct_answer)
              <br />
              • 문단문제: 선택지(option_1~5)만 처리
              <br />
              예: '공급이 증가한다' → '공급이 증가한다.'
            </span>
          </p>

          <div className="flex gap-4 mb-4">
            <button
              onClick={() => handleComprehensivePeriodsReview(true)}
              disabled={loading !== null}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold"
            >
              {loading === 'comprehensive-periods' ? '처리 중...' : '🔍 드라이런 (미리보기)'}
            </button>
            <button
              onClick={() => {
                if (confirm('⚠️ 종합문제/문단문제 선택지에 마침표를 실제로 추가하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
                  handleComprehensivePeriodsReview(false);
                }
              }}
              disabled={loading !== null}
              className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 font-semibold"
            >
              {loading === 'comprehensive-periods' ? '처리 중...' : '⚡ 실행'}
            </button>
          </div>

          {/* 결과 표시 */}
          {comprehensivePeriodsResult && (
            <div className={`rounded-lg p-4 ${comprehensivePeriodsResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <h3 className="font-semibold text-gray-900 mb-2">
                {comprehensivePeriodsResult.dryRun ? '📊 드라이런 결과' : '✅ 실행 결과'}
              </h3>
              <p className="text-gray-700 mb-2">{comprehensivePeriodsResult.message}</p>

              {/* 종합/문단 문제별 건수 표시 */}
              {comprehensivePeriodsResult.dryRun && (comprehensivePeriodsResult as any).comprehensiveCount !== undefined && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-sm text-blue-800">
                    <strong>📊 상세 내역:</strong>
                    <br />
                    • 종합문제: <strong>{(comprehensivePeriodsResult as any).comprehensiveCount}개</strong>
                    <br />
                    • 문단문제: <strong>{(comprehensivePeriodsResult as any).paragraphCount}개</strong>
                  </p>
                </div>
              )}

              {comprehensivePeriodsResult.dryRun && comprehensivePeriodsResult.samples && comprehensivePeriodsResult.samples.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    샘플 미리보기 (최대 20개):
                  </p>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {comprehensivePeriodsResult.samples.map((sample: any, idx: number) => (
                      <div key={idx} className="bg-white p-3 rounded border border-gray-200 text-sm">
                        <div className="font-medium text-gray-800 mb-1">
                          콘텐츠 세트: {sample.content_set_id}
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-xs px-2 py-1 rounded ${
                            sample.tableName === 'comprehensive_questions'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-orange-100 text-orange-700'
                          }`}>
                            {sample.tableName === 'comprehensive_questions' ? '종합문제' : '문단문제'}
                          </span>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            문제 #{sample.question_number}
                          </span>
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                            {sample.question_type}
                          </span>
                        </div>
                        {Object.entries(sample.changedFields).map(([field, value]: [string, any]) => (
                          <div key={field} className="mb-2 pl-3 border-l-2 border-blue-300">
                            <div className="text-xs font-semibold text-gray-600 mb-1">{field}:</div>
                            <div className="text-red-600 line-through text-xs mb-1">
                              {value.original}
                            </div>
                            <div className="text-green-600 font-medium text-xs">
                              {value.converted}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!comprehensivePeriodsResult.dryRun && (
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div className="bg-white p-3 rounded">
                    <div className="text-sm text-gray-600">성공</div>
                    <div className="text-2xl font-bold text-green-700">
                      {comprehensivePeriodsResult.successCount || 0}
                    </div>
                    {(comprehensivePeriodsResult as any).comprehensiveCount !== undefined && (
                      <div className="text-xs text-gray-500 mt-1">
                        종합: {(comprehensivePeriodsResult as any).comprehensiveCount}개,
                        문단: {(comprehensivePeriodsResult as any).paragraphCount}개
                      </div>
                    )}
                  </div>
                  <div className="bg-white p-3 rounded">
                    <div className="text-sm text-gray-600">실패</div>
                    <div className="text-2xl font-bold text-red-700">
                      {comprehensivePeriodsResult.errorCount || 0}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 검수 항목 6: 종합문제 정답-선택지 일치 검수 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3">
            🔎 6. 종합문제 정답-선택지 일치 검수
          </h2>
          <p className="text-gray-600 mb-4">
            종합문제(comprehensive_questions) 테이블의 정답(correct_answer)이 선택지(option_1~5) 중 하나와 정확히 일치하는지 확인합니다.
            <br />
            <span className="text-sm text-red-600 font-medium">
              ⚠️ 이 검수는 보고만 하며 데이터를 수정하지 않습니다. 불일치하는 문제는 수동으로 수정해야 합니다.
            </span>
          </p>

          <div className="flex gap-4 mb-4">
            <button
              onClick={() => handleAnswerMatchReview()}
              disabled={loading !== null}
              className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 font-semibold"
            >
              {loading === 'answer-match' ? '처리 중...' : '🔍 검수 실행 (보고만)'}
            </button>
          </div>

          {/* 결과 표시 */}
          {answerMatchResult && (
            <div className={`rounded-lg p-4 ${answerMatchResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <h3 className="font-semibold text-gray-900 mb-2">
                📊 검수 결과
              </h3>
              <p className="text-gray-700 mb-2">{answerMatchResult.message}</p>

              {answerMatchResult.mismatchCount !== undefined && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-300 rounded">
                  <p className="text-sm text-yellow-800">
                    <strong>📈 통계:</strong>
                    <br />
                    • 전체 검사: <strong>{answerMatchResult.totalChecked}개</strong>
                    <br />
                    • 불일치: <strong className="text-red-600">{answerMatchResult.mismatchCount}개</strong>
                  </p>
                </div>
              )}

              {answerMatchResult.samples && answerMatchResult.samples.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    불일치 문제 목록 (최대 30개):
                  </p>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {answerMatchResult.samples.map((sample: any, idx: number) => (
                      <div key={idx} className="bg-white p-3 rounded border-2 border-red-300 text-sm">
                        <div className="font-medium text-gray-800 mb-1">
                          콘텐츠 세트: {sample.content_set_id}
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                            문제 #{sample.question_number}
                          </span>
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                            {sample.question_type}
                          </span>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            {sample.question_format}
                          </span>
                        </div>
                        <div className="text-gray-600 text-xs mb-2">
                          문제: {sample.question_text}
                        </div>
                        <div className="mb-2 p-2 bg-red-50 rounded">
                          <div className="text-xs font-semibold text-red-700 mb-1">정답:</div>
                          <div className="text-xs text-red-800">{sample.correct_answer}</div>
                        </div>
                        <div className="mb-2 p-2 bg-gray-50 rounded">
                          <div className="text-xs font-semibold text-gray-700 mb-1">선택지:</div>
                          {sample.options.map((opt: string, optIdx: number) => (
                            <div key={optIdx} className="text-xs text-gray-700">
                              {optIdx + 1}. {opt}
                            </div>
                          ))}
                        </div>
                        <div className="text-xs text-red-600 font-medium">
                          ⚠️ {sample.reason}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 검수 항목 7: '예를 들어' 쉼표 검수 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3">
            ✍️ 7. &apos;예를 들어&apos; 쉼표 검수
          </h2>
          <p className="text-gray-600 mb-4">
            어휘문제(vocabulary_questions), 문단문제(paragraph_questions), 종합문제(comprehensive_questions) 테이블의 해설(explanation)에서
            &apos;예를 들어 &apos;를 &apos;예를 들어, &apos;로 변환합니다.
            <br />
            <span className="text-sm text-gray-500">
              예: &apos;예를 들어 사과는...&apos; → &apos;예를 들어, 사과는...&apos;
            </span>
          </p>

          <div className="flex gap-4 mb-4">
            <button
              onClick={() => handleExampleCommaReview(true)}
              disabled={loading !== null}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold"
            >
              {loading === 'example-comma' ? '처리 중...' : '🔍 드라이런 (미리보기)'}
            </button>
            <button
              onClick={() => {
                if (confirm("⚠️ '예를 들어' 뒤에 쉼표를 실제로 추가하시겠습니까?\n이 작업은 되돌릴 수 없습니다.")) {
                  handleExampleCommaReview(false);
                }
              }}
              disabled={loading !== null}
              className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 font-semibold"
            >
              {loading === 'example-comma' ? '처리 중...' : '⚡ 실행'}
            </button>
          </div>

          {/* 결과 표시 */}
          {exampleCommaResult && (
            <div className={`rounded-lg p-4 ${exampleCommaResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <h3 className="font-semibold text-gray-900 mb-2">
                {exampleCommaResult.dryRun ? '📊 드라이런 결과' : '✅ 실행 결과'}
              </h3>
              <p className="text-gray-700 mb-2">{exampleCommaResult.message}</p>

              {/* 테이블별 건수 표시 */}
              {exampleCommaResult.dryRun && (exampleCommaResult as any).vocabularyCount !== undefined && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-sm text-blue-800">
                    <strong>📊 상세 내역:</strong>
                    <br />
                    • 어휘문제: <strong>{(exampleCommaResult as any).vocabularyCount}개</strong>
                    <br />
                    • 문단문제: <strong>{(exampleCommaResult as any).paragraphCount}개</strong>
                    <br />
                    • 종합문제: <strong>{(exampleCommaResult as any).comprehensiveCount}개</strong>
                  </p>
                </div>
              )}

              {exampleCommaResult.dryRun && exampleCommaResult.samples && exampleCommaResult.samples.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    샘플 미리보기 (최대 20개):
                  </p>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {exampleCommaResult.samples.map((sample: any, idx: number) => (
                      <div key={idx} className="bg-white p-3 rounded border border-gray-200 text-sm">
                        <div className="font-medium text-gray-800 mb-1">
                          콘텐츠 세트: {sample.content_set_id}
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-xs px-2 py-1 rounded ${
                            sample.tableName === 'vocabulary_questions'
                              ? 'bg-green-100 text-green-700'
                              : sample.tableName === 'paragraph_questions'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-purple-100 text-purple-700'
                          }`}>
                            {sample.tableLabel}
                          </span>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            문제 #{sample.question_number}
                          </span>
                          {sample.question_type && (
                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                              {sample.question_type}
                            </span>
                          )}
                        </div>
                        <div className="text-red-600 line-through mb-1 text-xs">
                          {sample.original.length > 150 ? sample.original.slice(0, 150) + '...' : sample.original}
                        </div>
                        <div className="text-green-600 font-medium text-xs">
                          {sample.converted.length > 150 ? sample.converted.slice(0, 150) + '...' : sample.converted}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!exampleCommaResult.dryRun && (
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div className="bg-white p-3 rounded">
                    <div className="text-sm text-gray-600">성공</div>
                    <div className="text-2xl font-bold text-green-700">
                      {exampleCommaResult.successCount || 0}
                    </div>
                    {(exampleCommaResult as any).vocabularyCount !== undefined && (
                      <div className="text-xs text-gray-500 mt-1">
                        어휘: {(exampleCommaResult as any).vocabularyCount}개,
                        문단: {(exampleCommaResult as any).paragraphCount}개,
                        종합: {(exampleCommaResult as any).comprehensiveCount}개
                      </div>
                    )}
                  </div>
                  <div className="bg-white p-3 rounded">
                    <div className="text-sm text-gray-600">실패</div>
                    <div className="text-2xl font-bold text-red-700">
                      {exampleCommaResult.errorCount || 0}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 검수 항목 8: 인용문 마침표 검수 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3">
            📜 8. 인용문 마침표 검수
          </h2>
          <p className="text-gray-600 mb-4">
            문단문제(paragraph_questions), 종합문제(comprehensive_questions) 테이블의 해설(explanation)에서
            인용된 완성형 문장에 마침표가 누락된 경우 추가합니다.
            <br />
            <span className="text-sm text-gray-500">
              예: &apos;밥을 먹었다&apos;라고 → &apos;밥을 먹었다.&apos;라고
              <br />
              예: &apos;그려야 해&apos;라고 → &apos;그려야 해.&apos;라고
            </span>
          </p>

          <div className="flex gap-4 mb-4">
            <button
              onClick={() => handleQuotePeriodReview(true)}
              disabled={loading !== null}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold"
            >
              {loading === 'quote-period' ? '처리 중...' : '🔍 드라이런 (미리보기)'}
            </button>
            <button
              onClick={() => {
                if (confirm('⚠️ 인용문에 마침표를 실제로 추가하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
                  handleQuotePeriodReview(false);
                }
              }}
              disabled={loading !== null}
              className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 font-semibold"
            >
              {loading === 'quote-period' ? '처리 중...' : '⚡ 실행'}
            </button>
          </div>

          {/* 결과 표시 */}
          {quotePeriodResult && (
            <div className={`rounded-lg p-4 ${quotePeriodResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <h3 className="font-semibold text-gray-900 mb-2">
                {quotePeriodResult.dryRun ? '📊 드라이런 결과' : '✅ 실행 결과'}
              </h3>
              <p className="text-gray-700 mb-2">{quotePeriodResult.message}</p>

              {/* 테이블별 건수 표시 */}
              {quotePeriodResult.dryRun && (quotePeriodResult as any).paragraphCount !== undefined && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-sm text-blue-800">
                    <strong>📊 상세 내역:</strong>
                    <br />
                    • 문단문제: <strong>{(quotePeriodResult as any).paragraphCount}개</strong>
                    <br />
                    • 종합문제: <strong>{(quotePeriodResult as any).comprehensiveCount}개</strong>
                  </p>
                </div>
              )}

              {quotePeriodResult.dryRun && quotePeriodResult.samples && quotePeriodResult.samples.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    샘플 미리보기 (최대 20개):
                  </p>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {quotePeriodResult.samples.map((sample: any, idx: number) => (
                      <div key={idx} className="bg-white p-3 rounded border border-gray-200 text-sm">
                        <div className="font-medium text-gray-800 mb-1">
                          콘텐츠 세트: {sample.content_set_id}
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-xs px-2 py-1 rounded ${
                            sample.tableName === 'paragraph_questions'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-purple-100 text-purple-700'
                          }`}>
                            {sample.tableLabel}
                          </span>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            문제 #{sample.question_number}
                          </span>
                          {sample.question_type && (
                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                              {sample.question_type}
                            </span>
                          )}
                        </div>
                        {/* 변경 내역 표시 */}
                        {sample.changes && sample.changes.length > 0 && (
                          <div className="mb-2 p-2 bg-yellow-50 rounded border border-yellow-200">
                            <div className="text-xs font-semibold text-yellow-800 mb-1">변경 내역:</div>
                            {sample.changes.map((change: string, changeIdx: number) => (
                              <div key={changeIdx} className="text-xs text-yellow-700">
                                {change}
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="text-red-600 line-through mb-1 text-xs">
                          {sample.original.length > 150 ? sample.original.slice(0, 150) + '...' : sample.original}
                        </div>
                        <div className="text-green-600 font-medium text-xs">
                          {sample.converted.length > 150 ? sample.converted.slice(0, 150) + '...' : sample.converted}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!quotePeriodResult.dryRun && (
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div className="bg-white p-3 rounded">
                    <div className="text-sm text-gray-600">성공</div>
                    <div className="text-2xl font-bold text-green-700">
                      {quotePeriodResult.successCount || 0}
                    </div>
                    {(quotePeriodResult as any).paragraphCount !== undefined && (
                      <div className="text-xs text-gray-500 mt-1">
                        문단: {(quotePeriodResult as any).paragraphCount}개,
                        종합: {(quotePeriodResult as any).comprehensiveCount}개
                      </div>
                    )}
                  </div>
                  <div className="bg-white p-3 rounded">
                    <div className="text-sm text-gray-600">실패</div>
                    <div className="text-2xl font-bold text-red-700">
                      {quotePeriodResult.errorCount || 0}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 검수 항목 9: 해설 큰따옴표 검수 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3">
            ❝ 9. 해설 큰따옴표 → 작은따옴표 변환
          </h2>
          <p className="text-gray-600 mb-4">
            어휘문제(vocabulary_questions), 문단문제(paragraph_questions), 종합문제(comprehensive_questions) 테이블의 해설(explanation)에서
            큰따옴표(&quot;)를 작은따옴표(&apos;)로 변환합니다.
            <br />
            <span className="text-sm text-gray-500">
              예: &quot;공급&quot; → &apos;공급&apos;
            </span>
          </p>

          <div className="flex gap-4 mb-4">
            <button
              onClick={() => handleDoubleQuotesReview(true)}
              disabled={loading !== null}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold"
            >
              {loading === 'double-quotes' ? '처리 중...' : '🔍 드라이런 (미리보기)'}
            </button>
            <button
              onClick={() => {
                if (confirm('⚠️ 해설의 큰따옴표를 작은따옴표로 실제로 변환하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
                  handleDoubleQuotesReview(false);
                }
              }}
              disabled={loading !== null}
              className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 font-semibold"
            >
              {loading === 'double-quotes' ? '처리 중...' : '⚡ 실행'}
            </button>
          </div>

          {/* 결과 표시 */}
          {doubleQuotesResult && (
            <div className={`rounded-lg p-4 ${doubleQuotesResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <h3 className="font-semibold text-gray-900 mb-2">
                {doubleQuotesResult.dryRun ? '📊 드라이런 결과' : '✅ 실행 결과'}
              </h3>
              <p className="text-gray-700 mb-2">{doubleQuotesResult.message}</p>

              {/* 테이블별 건수 표시 */}
              {doubleQuotesResult.dryRun && (doubleQuotesResult as any).vocabularyCount !== undefined && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-sm text-blue-800">
                    <strong>📊 상세 내역:</strong>
                    <br />
                    • 어휘문제: <strong>{(doubleQuotesResult as any).vocabularyCount}개</strong>
                    <br />
                    • 문단문제: <strong>{(doubleQuotesResult as any).paragraphCount}개</strong>
                    <br />
                    • 종합문제: <strong>{(doubleQuotesResult as any).comprehensiveCount}개</strong>
                  </p>
                </div>
              )}

              {doubleQuotesResult.dryRun && doubleQuotesResult.samples && doubleQuotesResult.samples.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    샘플 미리보기 (최대 15개):
                  </p>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {doubleQuotesResult.samples.map((sample: any, idx: number) => (
                      <div key={idx} className="bg-white p-3 rounded border border-gray-200 text-sm">
                        <div className="font-medium text-gray-800 mb-1">
                          콘텐츠 세트: {sample.content_set_id}
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-xs px-2 py-1 rounded ${
                            sample.tableName === 'vocabulary_questions'
                              ? 'bg-green-100 text-green-700'
                              : sample.tableName === 'paragraph_questions'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-purple-100 text-purple-700'
                          }`}>
                            {sample.tableLabel}
                          </span>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            문제 #{sample.question_number}
                          </span>
                          {sample.question_type && (
                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                              {sample.question_type}
                            </span>
                          )}
                        </div>
                        <div className="text-red-600 line-through mb-1 text-xs">
                          {sample.original.length > 150 ? sample.original.slice(0, 150) + '...' : sample.original}
                        </div>
                        <div className="text-green-600 font-medium text-xs">
                          {sample.converted.length > 150 ? sample.converted.slice(0, 150) + '...' : sample.converted}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!doubleQuotesResult.dryRun && (
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div className="bg-white p-3 rounded">
                    <div className="text-sm text-gray-600">성공</div>
                    <div className="text-2xl font-bold text-green-700">
                      {doubleQuotesResult.successCount || 0}
                    </div>
                    {(doubleQuotesResult as any).vocabularyCount !== undefined && (
                      <div className="text-xs text-gray-500 mt-1">
                        어휘: {(doubleQuotesResult as any).vocabularyCount}개,
                        문단: {(doubleQuotesResult as any).paragraphCount}개,
                        종합: {(doubleQuotesResult as any).comprehensiveCount}개
                      </div>
                    )}
                  </div>
                  <div className="bg-white p-3 rounded">
                    <div className="text-sm text-gray-600">실패</div>
                    <div className="text-2xl font-bold text-red-700">
                      {doubleQuotesResult.errorCount || 0}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 검수 항목 10: 해설 인용 불일치 검수 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3">
            🔗 10. 해설 인용-지문 불일치 검수
          </h2>
          <p className="text-gray-600 mb-4">
            문단문제(paragraph_questions), 종합문제(comprehensive_questions) 테이블의 해설(explanation)에서
            작은따옴표(&apos;)로 인용된 텍스트가 지문(passages)에 실제로 존재하는지 확인합니다.
            <br />
            <span className="text-sm text-red-600 font-medium">
              ⚠️ 이 검수는 보고만 하며 데이터를 수정하지 않습니다. 불일치하는 인용은 수동으로 수정해야 합니다.
            </span>
          </p>

          <div className="flex gap-4 mb-4">
            <button
              onClick={() => handleCitationMismatchReview()}
              disabled={loading !== null}
              className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 font-semibold"
            >
              {loading === 'citation-mismatch' ? '처리 중...' : '🔍 검수 실행 (보고만)'}
            </button>
          </div>

          {/* 결과 표시 */}
          {citationMismatchResult && (
            <div className={`rounded-lg p-4 ${citationMismatchResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <h3 className="font-semibold text-gray-900 mb-2">
                📊 검수 결과
              </h3>
              <p className="text-gray-700 mb-2">{citationMismatchResult.message}</p>

              {citationMismatchResult.mismatchCount !== undefined && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-300 rounded">
                  <p className="text-sm text-yellow-800">
                    <strong>📈 통계:</strong>
                    <br />
                    • 전체 검사: <strong>{citationMismatchResult.totalChecked}개</strong> 문제
                    <br />
                    • 불일치: <strong className="text-red-600">{citationMismatchResult.mismatchCount}개</strong>
                    <br />
                    • 문단문제: <strong>{(citationMismatchResult as any).paragraphCount || 0}개</strong>
                    <br />
                    • 종합문제: <strong>{(citationMismatchResult as any).comprehensiveCount || 0}개</strong>
                  </p>
                </div>
              )}

              {citationMismatchResult.samples && citationMismatchResult.samples.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    불일치 목록 (최대 30개):
                  </p>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {citationMismatchResult.samples.map((sample: any, idx: number) => (
                      <div key={idx} className="bg-white p-3 rounded border-2 border-red-300 text-sm">
                        <div className="font-medium text-gray-800 mb-1">
                          콘텐츠 세트: {sample.content_set_id}
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-xs px-2 py-1 rounded ${
                            sample.tableName === 'paragraph_questions'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-purple-100 text-purple-700'
                          }`}>
                            {sample.tableLabel}
                          </span>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            문제 #{sample.question_number}
                          </span>
                          {sample.question_type && (
                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                              {sample.question_type}
                            </span>
                          )}
                        </div>
                        <div className="mb-2 p-2 bg-red-50 rounded">
                          <div className="text-xs font-semibold text-red-700 mb-1">지문에 없는 인용:</div>
                          <div className="text-sm text-red-800 font-medium">&apos;{sample.citation}&apos;</div>
                        </div>
                        <div className="mb-2 p-2 bg-gray-50 rounded">
                          <div className="text-xs font-semibold text-gray-700 mb-1">해설 원문:</div>
                          <div className="text-xs text-gray-700">
                            {sample.explanation?.length > 200 ? sample.explanation.slice(0, 200) + '...' : sample.explanation}
                          </div>
                        </div>
                        <div className="text-xs text-red-600 font-medium">
                          ⚠️ {sample.reason}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 검수 항목 11: 텍스트 일괄 수정 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3">
            ✏️ 11. 텍스트 일괄 수정
          </h2>
          <p className="text-gray-600 mb-4">
            특정 텍스트를 찾아 다른 텍스트로 일괄 수정합니다. 6개 테이블의 모든 텍스트 필드를 대상으로 합니다.
            <br />
            <span className="text-sm text-gray-500">
              예: &apos;관계회복&apos; → &apos;관계 회복&apos; / &apos;까닭&apos; → &apos;이유&apos;
            </span>
          </p>

          {/* 검색어/대체어 입력 */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                검색어 (찾을 텍스트)
              </label>
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="예: 관계회복"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                대체어 (바꿀 텍스트)
              </label>
              <input
                type="text"
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                placeholder="예: 관계 회복"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              />
            </div>
          </div>

          {/* 검수 대상 테이블 안내 */}
          <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>📋 검수 대상:</strong>
              <br />
              • 지문: title, paragraph_1~10
              <br />
              • 어휘: term, definition, example_sentence
              <br />
              • 어휘문제: question_text, option_1~5, correct_answer, explanation, term
              <br />
              • 문단문제: question_text, option_1~5, correct_answer, explanation, word_segments
              <br />
              • 종합문제: question_text, option_1~5, correct_answer, explanation
              <br />
              • 콘텐츠세트: title
            </p>
          </div>

          <div className="flex gap-4 mb-4">
            <button
              onClick={() => handleTextReplaceReview(true)}
              disabled={loading !== null || !searchText.trim()}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold"
            >
              {loading === 'text-replace' ? '처리 중...' : '🔍 드라이런 (미리보기)'}
            </button>
            <button
              onClick={() => {
                if (confirm(`⚠️ 텍스트 일괄 수정을 실행하시겠습니까?\n\n"${searchText}" → "${replaceText}"\n\n이 작업은 되돌릴 수 없습니다.`)) {
                  handleTextReplaceReview(false);
                }
              }}
              disabled={loading !== null || !searchText.trim()}
              className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 font-semibold"
            >
              {loading === 'text-replace' ? '처리 중...' : '⚡ 실행'}
            </button>
          </div>

          {/* 결과 표시 */}
          {textReplaceResult && (
            <div className={`rounded-lg p-4 ${textReplaceResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <h3 className="font-semibold text-gray-900 mb-2">
                {textReplaceResult.dryRun ? '📊 드라이런 결과' : '✅ 실행 결과'}
              </h3>
              <p className="text-gray-700 mb-2">{textReplaceResult.message}</p>

              {/* 테이블별 건수 표시 */}
              {textReplaceResult.dryRun && (textReplaceResult as any).tableStats && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-sm text-blue-800">
                    <strong>📊 테이블별 수정 대상:</strong>
                    <br />
                    • 지문: <strong>{(textReplaceResult as any).tableStats?.passages || 0}개</strong>
                    <br />
                    • 어휘: <strong>{(textReplaceResult as any).tableStats?.vocabulary_terms || 0}개</strong>
                    <br />
                    • 어휘문제: <strong>{(textReplaceResult as any).tableStats?.vocabulary_questions || 0}개</strong>
                    <br />
                    • 문단문제: <strong>{(textReplaceResult as any).tableStats?.paragraph_questions || 0}개</strong>
                    <br />
                    • 종합문제: <strong>{(textReplaceResult as any).tableStats?.comprehensive_questions || 0}개</strong>
                    <br />
                    • 콘텐츠세트: <strong>{(textReplaceResult as any).tableStats?.content_sets || 0}개</strong>
                  </p>
                </div>
              )}

              {textReplaceResult.dryRun && textReplaceResult.samples && textReplaceResult.samples.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    샘플 미리보기 (테이블별 최대 3개씩):
                  </p>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {textReplaceResult.samples.map((sample: any, idx: number) => (
                      <div key={idx} className="bg-white p-3 rounded border border-gray-200 text-sm">
                        <div className="font-medium text-gray-800 mb-1">
                          콘텐츠 세트: {sample.content_set_id}
                        </div>
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className={`text-xs px-2 py-1 rounded ${
                            sample.tableName === 'passages'
                              ? 'bg-blue-100 text-blue-700'
                              : sample.tableName === 'vocabulary_terms'
                              ? 'bg-teal-100 text-teal-700'
                              : sample.tableName === 'vocabulary_questions'
                              ? 'bg-green-100 text-green-700'
                              : sample.tableName === 'paragraph_questions'
                              ? 'bg-orange-100 text-orange-700'
                              : sample.tableName === 'comprehensive_questions'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {sample.tableLabel}
                          </span>
                          {sample.question_number && (
                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                              문제 #{sample.question_number}
                            </span>
                          )}
                          {sample.term && (
                            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                              {sample.term}
                            </span>
                          )}
                        </div>
                        {/* 변경 필드별 상세 표시 */}
                        {Object.entries(sample.changedFields).map(([field, values]: [string, any]) => (
                          <div key={field} className="mb-2 pl-3 border-l-2 border-blue-300">
                            <div className="text-xs font-semibold text-gray-600 mb-1">{field}:</div>
                            <div className="text-red-600 line-through text-xs mb-1">
                              {values.original.length > 100 ? values.original.slice(0, 100) + '...' : values.original}
                            </div>
                            <div className="text-green-600 font-medium text-xs">
                              {values.converted.length > 100 ? values.converted.slice(0, 100) + '...' : values.converted}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!textReplaceResult.dryRun && (
                <div className="mt-3">
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div className="bg-white p-3 rounded">
                      <div className="text-sm text-gray-600">성공</div>
                      <div className="text-2xl font-bold text-green-700">
                        {textReplaceResult.successCount || 0}
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded">
                      <div className="text-sm text-gray-600">실패</div>
                      <div className="text-2xl font-bold text-red-700">
                        {textReplaceResult.errorCount || 0}
                      </div>
                    </div>
                  </div>
                  {(textReplaceResult as any).tableStats && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                      <p className="text-sm text-blue-800">
                        <strong>📊 테이블별 수정 결과:</strong>
                        <br />
                        • 지문: <strong>{(textReplaceResult as any).tableStats?.passages || 0}개</strong>
                        <br />
                        • 어휘: <strong>{(textReplaceResult as any).tableStats?.vocabulary_terms || 0}개</strong>
                        <br />
                        • 어휘문제: <strong>{(textReplaceResult as any).tableStats?.vocabulary_questions || 0}개</strong>
                        <br />
                        • 문단문제: <strong>{(textReplaceResult as any).tableStats?.paragraph_questions || 0}개</strong>
                        <br />
                        • 종합문제: <strong>{(textReplaceResult as any).tableStats?.comprehensive_questions || 0}개</strong>
                        <br />
                        • 콘텐츠세트: <strong>{(textReplaceResult as any).tableStats?.content_sets || 0}개</strong>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 검수 항목 12: 어휘 용어설명 마침표 검수 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3">
            📌 12. 어휘 용어설명 마침표 검수
          </h2>
          <p className="text-gray-600 mb-4">
            vocabulary_terms 테이블의 definition 값에서 문장 끝 마침표를 제거하여 통일된 형식으로 수정합니다.
            <br />
            <span className="text-sm text-gray-500">
              예: &apos;물질을 이루는 가장 작은 단위.&apos; → &apos;물질을 이루는 가장 작은 단위&apos;
            </span>
          </p>

          <div className="flex gap-4 mb-4">
            <button
              onClick={() => handleDefinitionPeriodsReview(true)}
              disabled={loading !== null}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold"
            >
              {loading === 'definition-periods' ? '처리 중...' : '🔍 드라이런 (미리보기)'}
            </button>
            <button
              onClick={() => {
                if (confirm('⚠️ 어휘 용어설명의 마침표를 실제로 제거하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
                  handleDefinitionPeriodsReview(false);
                }
              }}
              disabled={loading !== null}
              className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 font-semibold"
            >
              {loading === 'definition-periods' ? '처리 중...' : '⚡ 실행'}
            </button>
          </div>

          {/* 결과 표시 */}
          {definitionPeriodsResult && (
            <div className={`rounded-lg p-4 ${definitionPeriodsResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <h3 className="font-semibold text-gray-900 mb-2">
                {definitionPeriodsResult.dryRun ? '📊 드라이런 결과' : '✅ 실행 결과'}
              </h3>
              <p className="text-gray-700 mb-2">{definitionPeriodsResult.message}</p>

              {definitionPeriodsResult.dryRun && definitionPeriodsResult.samples && definitionPeriodsResult.samples.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    샘플 미리보기 (최대 20개):
                  </p>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {definitionPeriodsResult.samples.map((sample: any, idx: number) => (
                      <div key={idx} className="bg-white p-3 rounded border border-gray-200 text-sm">
                        <div className="font-medium text-gray-800 mb-1">
                          콘텐츠 세트: {sample.content_set_id}
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                            {sample.term}
                          </span>
                        </div>
                        {Object.entries(sample.changedFields).map(([field, value]: [string, any]) => (
                          <div key={field} className="mb-2 pl-3 border-l-2 border-blue-300">
                            <div className="text-xs font-semibold text-gray-600 mb-1">{field}:</div>
                            <div className="text-red-600 line-through text-xs mb-1">
                              {value.original.length > 100 ? value.original.slice(0, 100) + '...' : value.original}
                            </div>
                            <div className="text-green-600 font-medium text-xs">
                              {value.converted.length > 100 ? value.converted.slice(0, 100) + '...' : value.converted}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!definitionPeriodsResult.dryRun && (
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div className="bg-white p-3 rounded">
                    <div className="text-sm text-gray-600">성공</div>
                    <div className="text-2xl font-bold text-green-700">
                      {definitionPeriodsResult.successCount || 0}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded">
                    <div className="text-sm text-gray-600">실패</div>
                    <div className="text-2xl font-bold text-red-700">
                      {definitionPeriodsResult.errorCount || 0}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 사용 가이드 */}
        <div className="bg-gray-100 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            📖 사용 가이드
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
            <li>
              <strong>검수 상태 선택</strong>: 검수 전/검수 완료/전체 중 선택하여 대상 콘텐츠 세트를 필터링합니다.
            </li>
            <li>
              <strong>드라이런 먼저 실행</strong>: 각 검수 항목의 "드라이런" 버튼으로 변경될 내용을 미리 확인합니다.
            </li>
            <li>
              <strong>실행</strong>: 드라이런 결과를 확인한 후 "실행" 버튼으로 실제 데이터를 수정합니다.
            </li>
            <li className="text-red-700 font-medium">
              ⚠️ 모든 실행 작업은 되돌릴 수 없으므로 신중하게 결정하세요.
            </li>
          </ol>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm text-blue-800">
              <strong>💡 팁:</strong> 검수 항목은 독립적으로 실행할 수 있으며, 필요한 항목만 선택하여 검수할 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
