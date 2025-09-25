'use client';

import { useState } from 'react';
import RoleAuthGuard from '@/components/RoleAuthGuard';

interface FixResult {
  success: boolean;
  dryRun: boolean;
  message: string;
  totalFound: number;
  needsUpdate: number;
  successCount?: number;
  errorCount?: number;
  errors?: string[];
  samples?: Array<{
    id: string;
    before: { term: string; definition: string; example_sentence: string | null };
    after: { term: string; definition: string; example_sentence: string };
  }>;
}

export default function FixVocabularyPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FixResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
    phase: string;
  } | null>(null);
  const [stats, setStats] = useState<{
    total: number;
    withBrackets: number;
    withExample: number;
    withoutExample: number;
    emptyTerm: number;
    emptyDefinition: number;
  } | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [cleanResult, setCleanResult] = useState<FixResult | null>(null);
  const [cleaningExample, setCleaningExample] = useState(false);

  const handleFix = async (dryRun: boolean = true) => {
    setLoading(true);
    setResult(null);
    setProgress(null);

    try {
      // 진행률 시뮬레이션 (실제로는 서버에서 스트리밍으로 받을 수 있지만 간단한 방법 사용)
      if (!dryRun) {
        setProgress({ current: 0, total: 100, phase: '데이터 업데이트 중...' });

        // 주기적으로 진행률 업데이트 (가상)
        const progressInterval = setInterval(() => {
          setProgress(prev => {
            if (!prev) return null;
            const newCurrent = Math.min(prev.current + Math.random() * 10, 95);
            return { ...prev, current: Math.floor(newCurrent) };
          });
        }, 1000);

        // API 호출
        const response = await fetch('/api/fix-vocabulary-parsing', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ dryRun })
        });

        clearInterval(progressInterval);
        setProgress({ current: 100, total: 100, phase: '완료' });

        const data = await response.json();
        setResult(data);

        if (!response.ok) {
          throw new Error(data.error || 'API 호출 실패');
        }
      } else {
        // 드라이런인 경우 진행률 표시 없이 바로 실행
        const response = await fetch('/api/fix-vocabulary-parsing', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ dryRun })
        });

        const data = await response.json();
        setResult(data);

        if (!response.ok) {
          throw new Error(data.error || 'API 호출 실패');
        }
      }

    } catch (error) {
      console.error('어휘 파싱 수정 오류:', error);
      setResult({
        success: false,
        dryRun: false,
        message: '요청 처리 중 오류가 발생했습니다.',
        totalFound: 0,
        needsUpdate: 0,
        errors: [error instanceof Error ? error.message : '알 수 없는 오류']
      });
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  const handleCheckStats = async () => {
    setLoadingStats(true);
    try {
      const response = await fetch('/api/check-vocabulary-stats');
      const data = await response.json();

      if (data.success) {
        setStats(data.stats);
      } else {
        console.error('통계 조회 실패:', data.error);
        alert('통계 조회 중 오류가 발생했습니다: ' + data.error);
      }
    } catch (error) {
      console.error('통계 조회 오류:', error);
      alert('통계 조회 중 네트워크 오류가 발생했습니다.');
    } finally {
      setLoadingStats(false);
    }
  };

  const handleCleanExampleSentences = async (dryRun: boolean = true) => {
    setCleaningExample(true);
    setCleanResult(null);

    try {
      const response = await fetch('/api/clean-example-sentences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dryRun })
      });

      const data = await response.json();
      setCleanResult(data);

      if (!response.ok) {
        throw new Error(data.error || 'API 호출 실패');
      }

    } catch (error) {
      console.error('example_sentence 정리 오류:', error);
      setCleanResult({
        success: false,
        dryRun: false,
        message: 'example_sentence 정리 중 오류가 발생했습니다.',
        totalFound: 0,
        needsUpdate: 0,
        errors: [error instanceof Error ? error.message : '알 수 없는 오류']
      });
    } finally {
      setCleaningExample(false);
    }
  };

  return (
    <RoleAuthGuard allowedRoles={['admin']}>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 헤더 */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">
              어휘 데이터 일괄 수정 도구
            </h1>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    주의사항
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>이 도구는 vocabulary_terms 테이블의 어휘 데이터를 수정하는 두 가지 기능을 제공합니다:</p>
                    <ul className="mt-2 list-disc list-inside space-y-1">
                      <li><strong>1단계 - 파싱 수정:</strong> definition에 포함된 "(예시문장)"을 example_sentence로 분리</li>
                      <li><strong>2단계 - 예시문장 정리:</strong> example_sentence의 불완전한 괄호들을 정리</li>
                      <li><strong>권장 순서:</strong> 통계 확인 → 1단계 → 2단계 순으로 진행</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 실행 버튼 */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">🔧 수정 도구</h3>

            {/* 통계 조회 */}
            <div className="mb-6">
              <h4 className="text-md font-medium text-gray-700 mb-2">📈 데이터베이스 상태 확인</h4>
              <button
                onClick={handleCheckStats}
                disabled={loadingStats}
                className="w-full bg-gray-600 text-white px-6 py-3 rounded-md hover:bg-gray-700 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {loadingStats ? '조회 중...' : '📈 데이터 통계 조회'}
              </button>
            </div>

            {/* 1단계: 파싱 수정 */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="text-md font-medium text-blue-800 mb-2">1️⃣ 파싱 수정 (definition → example_sentence 분리)</h4>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => handleFix(true)}
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {loading ? '분석 중...' : '📊 미리보기'}
                </button>
                <button
                  onClick={() => handleFix(false)}
                  disabled={loading || !result?.success || result.dryRun !== true}
                  className="flex-1 bg-blue-800 text-white px-6 py-2 rounded-md hover:bg-blue-900 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {loading ? '수정 중...' : '🔧 실제 수정'}
                </button>
              </div>
            </div>

            {/* 2단계: 예시문장 정리 */}
            <div className="mb-4 p-4 bg-green-50 rounded-lg">
              <h4 className="text-md font-medium text-green-800 mb-2">2️⃣ 예시문장 정리 (괄호 잔여물 제거)</h4>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => handleCleanExampleSentences(true)}
                  disabled={cleaningExample}
                  className="flex-1 bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {cleaningExample ? '분석 중...' : '🧹 정리 미리보기'}
                </button>
                <button
                  onClick={() => handleCleanExampleSentences(false)}
                  disabled={cleaningExample || !cleanResult?.success || cleanResult.dryRun !== true}
                  className="flex-1 bg-green-800 text-white px-6 py-2 rounded-md hover:bg-green-900 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {cleaningExample ? '정리 중...' : '✨ 실제 정리'}
                </button>
              </div>
            </div>

            <p className="text-sm text-gray-600 text-center">
              <strong>권장 순서:</strong> 통계 확인 → 1단계 파싱 수정 → 2단계 예시문장 정리
            </p>
          </div>

          {/* 통계 정보 표시 */}
          {stats && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">📈 데이터베이스 통계</h3>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-xl font-bold text-blue-800">{stats.total.toLocaleString()}</div>
                  <div className="text-xs text-blue-600">전체 레코드</div>
                </div>

                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <div className="text-xl font-bold text-yellow-800">{stats.withBrackets.toLocaleString()}</div>
                  <div className="text-xs text-yellow-600">괄호 포함</div>
                </div>

                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-xl font-bold text-green-800">{stats.withExample.toLocaleString()}</div>
                  <div className="text-xs text-green-600">예시 있음</div>
                </div>

                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-xl font-bold text-gray-800">{stats.withoutExample.toLocaleString()}</div>
                  <div className="text-xs text-gray-600">예시 없음</div>
                </div>

                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-xl font-bold text-red-800">{stats.emptyTerm.toLocaleString()}</div>
                  <div className="text-xs text-red-600">용어 공백</div>
                </div>

                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-xl font-bold text-purple-800">{stats.emptyDefinition.toLocaleString()}</div>
                  <div className="text-xs text-purple-600">정의 공백</div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>설명:</strong> "괄호 포함" 항목이 수정이 필요한 레코드 수입니다.
                  이전에 이미 대부분의 데이터를 수정했다면 이 숫자가 작을 수 있습니다.
                </p>
              </div>
            </div>
          )}

          {/* 진행률 표시 */}
          {progress && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-800">진행 상황</h3>
                <span className="text-sm text-gray-600">{progress.current}%</span>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress.current}%` }}
                ></div>
              </div>

              <p className="text-sm text-gray-600">{progress.phase}</p>

              {/* 로딩 애니메이션 */}
              <div className="flex items-center mt-3">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-sm text-gray-600">처리 중...</span>
              </div>
            </div>
          )}

          {/* 2단계 결과 표시 */}
          {cleanResult && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                2️⃣ 예시문장 정리 {cleanResult.dryRun ? '미리보기 결과' : '정리 결과'}
              </h2>

              {/* 상태 표시 */}
              <div className={`p-4 rounded-lg mb-4 ${
                cleanResult.success
                  ? cleanResult.dryRun
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}>
                <p className={`font-medium ${
                  cleanResult.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {cleanResult.message}
                </p>
              </div>

              {/* 통계 정보 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-800">{cleanResult.totalFound}</div>
                  <div className="text-sm text-gray-600">괄호 포함 예시문장</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-800">{cleanResult.needsUpdate}</div>
                  <div className="text-sm text-yellow-600">정리 필요</div>
                </div>
                {!cleanResult.dryRun && (
                  <>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-800">{cleanResult.successCount || 0}</div>
                      <div className="text-sm text-green-600">성공</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-800">{cleanResult.errorCount || 0}</div>
                      <div className="text-sm text-red-600">실패</div>
                    </div>
                  </>
                )}
              </div>

              {/* 샘플 표시 */}
              {cleanResult.samples && cleanResult.samples.length > 0 && (
                <div className="border-t pt-6">
                  <h3 className="text-md font-semibold text-gray-800 mb-4">
                    정리 예시 (최대 10개)
                  </h3>
                  <div className="space-y-3">
                    {cleanResult.samples.map((sample, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-3">
                        <div className="grid md:grid-cols-2 gap-3">
                          <div className="bg-red-50 border border-red-200 rounded p-2">
                            <h4 className="font-medium text-red-800 text-sm mb-1">수정 전</h4>
                            <p className="text-sm text-red-700">"{sample.before}"</p>
                          </div>
                          <div className="bg-green-50 border border-green-200 rounded p-2">
                            <h4 className="font-medium text-green-800 text-sm mb-1">수정 후</h4>
                            <p className="text-sm text-green-700">"{sample.after}"</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 오류 목록 */}
              {cleanResult.errors && cleanResult.errors.length > 0 && (
                <div className="border-t pt-6">
                  <h3 className="text-md font-semibold text-red-800 mb-4">
                    오류 목록
                  </h3>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                      {cleanResult.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 1단계 결과 표시 */}
          {result && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-lg font-semibold text-gray-800">
                  1️⃣ 파싱 수정 {result.dryRun ? '미리보기 결과' : '수정 결과'}
                </h2>
                {result.samples && result.samples.length > 0 && (
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    {showDetails ? '상세 숨기기' : '상세 보기'}
                  </button>
                )}
              </div>

              {/* 상태 표시 */}
              <div className={`p-4 rounded-lg mb-4 ${
                result.success
                  ? result.dryRun
                    ? 'bg-blue-50 border border-blue-200'
                    : 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}>
                <p className={`font-medium ${
                  result.success
                    ? result.dryRun
                      ? 'text-blue-800'
                      : 'text-green-800'
                    : 'text-red-800'
                }`}>
                  {result.message}
                </p>
              </div>

              {/* 통계 정보 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-800">{result.totalFound}</div>
                  <div className="text-sm text-gray-600">총 검색 레코드</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-800">{result.needsUpdate}</div>
                  <div className="text-sm text-yellow-600">수정 필요</div>
                </div>
                {!result.dryRun && (
                  <>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-800">{result.successCount || 0}</div>
                      <div className="text-sm text-green-600">성공</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-800">{result.errorCount || 0}</div>
                      <div className="text-sm text-red-600">실패</div>
                    </div>
                  </>
                )}
              </div>

              {/* 상세 정보 */}
              {showDetails && result.samples && result.samples.length > 0 && (
                <div className="border-t pt-6">
                  <h3 className="text-md font-semibold text-gray-800 mb-4">
                    수정 예시 (최대 5개)
                  </h3>
                  <div className="space-y-4">
                    {result.samples.map((sample, index) => (
                      <div key={sample.id} className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-600 mb-2">
                          레코드 ID: {sample.id}
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          {/* Before */}
                          <div className="bg-red-50 border border-red-200 rounded p-3">
                            <h4 className="font-medium text-red-800 mb-2">수정 전</h4>
                            <div className="space-y-1 text-sm">
                              <div><strong>용어:</strong> {sample.before.term}</div>
                              <div><strong>뜻:</strong> {sample.before.definition}</div>
                              <div><strong>예시:</strong> {sample.before.example_sentence || '(없음)'}</div>
                            </div>
                          </div>

                          {/* After */}
                          <div className="bg-green-50 border border-green-200 rounded p-3">
                            <h4 className="font-medium text-green-800 mb-2">수정 후</h4>
                            <div className="space-y-1 text-sm">
                              <div><strong>용어:</strong> {sample.after.term}</div>
                              <div><strong>뜻:</strong> {sample.after.definition}</div>
                              <div><strong>예시:</strong> {sample.after.example_sentence || '(없음)'}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 오류 목록 */}
              {result.errors && result.errors.length > 0 && (
                <div className="border-t pt-6">
                  <h3 className="text-md font-semibold text-red-800 mb-4">
                    오류 목록 (최대 10개)
                  </h3>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                      {result.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </RoleAuthGuard>
  );
}