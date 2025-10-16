'use client';

import { useState } from 'react';
import Link from 'next/link';

interface PreviewStats {
  vocabularyTotal: number;
  vocabularyChanged: number;
  paragraphTotal: number;
  paragraphChanged: number;
  comprehensiveTotal: number;
  comprehensiveChanged: number;
}

interface PreviewData {
  vocabularyQuestions: any[];
  paragraphQuestions: any[];
  comprehensiveQuestions: any[];
  stats: PreviewStats;
}

interface ExecutionResult {
  success: boolean;
  message: string;
  stats?: {
    vocabularyQuestions: { total: number; updated: number; errors: number };
    paragraphQuestions: { total: number; updated: number; errors: number };
    comprehensiveQuestions: { total: number; updated: number; errors: number };
  };
  summary?: {
    totalUpdated: number;
    totalErrors: number;
    totalProcessed: number;
  };
}

export default function NormalizeEndingsPage() {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [showPreviewDetails, setShowPreviewDetails] = useState(false);

  // 미리보기 가져오기
  const handlePreview = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/normalize-endings/preview?limit=10');
      const data = await response.json();

      if (data.success) {
        setPreview(data.preview);
      } else {
        alert(`미리보기 실패: ${data.message}`);
      }
    } catch (error) {
      console.error('미리보기 오류:', error);
      alert('미리보기 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 일괄 실행
  const handleExecute = async () => {
    const confirmed = confirm(
      '⚠️ 주의: 모든 문제의 종결 어미를 일괄 수정합니다.\n\n' +
      '이 작업은 되돌릴 수 없습니다.\n' +
      '계속하시겠습니까?'
    );

    if (!confirmed) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/normalize-endings', {
        method: 'POST'
      });
      const data = await response.json();

      setResult(data);

      if (data.success) {
        alert(`✅ 정규화 완료!\n\n${data.summary.totalUpdated}개의 문제가 업데이트되었습니다.`);
      } else {
        alert(`❌ 정규화 실패\n\n${data.message}`);
      }
    } catch (error) {
      console.error('실행 오류:', error);
      alert('실행 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 강제 재정규화 (변경사항 비교 없이 무조건 업데이트)
  const handleForceExecute = async () => {
    const confirmed = confirm(
      '⚠️⚠️⚠️ 강제 재정규화 모드 ⚠️⚠️⚠️\n\n' +
      '변경사항 유무와 관계없이 모든 데이터를 재정규화합니다.\n' +
      '최신 normalizeEndingSentence 함수가 적용됩니다.\n\n' +
      '이 작업은 되돌릴 수 없습니다.\n' +
      '정말로 계속하시겠습니까?'
    );

    if (!confirmed) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/force-normalize-endings', {
        method: 'POST'
      });
      const data = await response.json();

      setResult(data);

      if (data.success) {
        alert(`✅ 강제 재정규화 완료!\n\n${data.summary.totalUpdated}개의 문제가 업데이트되었습니다.`);
      } else {
        alert(`❌ 강제 재정규화 실패\n\n${data.message}`);
      }
    } catch (error) {
      console.error('강제 재정규화 오류:', error);
      alert('강제 재정규화 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            종결 어미 정규화 도구
          </h1>
          <p className="text-gray-600">
            모든 문제의 종결 어미를 "~다" 형태로 일괄 변환합니다.
            <br />
            <span className="text-sm text-red-600">
              ⚠️ 실제 데이터를 수정하므로 주의가 필요합니다. 먼저 미리보기로 확인하세요.
            </span>
          </p>
        </div>

        {/* 변환 규칙 안내 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-3">
            📝 변환 규칙 (8가지)
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">설명합니다</span>
              <span className="mx-2">→</span>
              <span className="text-blue-700">설명한다</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">뜻합니다</span>
              <span className="mx-2">→</span>
              <span className="text-blue-700">뜻한다</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">했습니다</span>
              <span className="mx-2">→</span>
              <span className="text-blue-700">했다</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">있습니다</span>
              <span className="mx-2">→</span>
              <span className="text-blue-700">있다</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">필요합니다</span>
              <span className="mx-2">→</span>
              <span className="text-blue-700">필요하다</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">도구입니다</span>
              <span className="mx-2">→</span>
              <span className="text-blue-700">도구이다</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">의미합니다</span>
              <span className="mx-2">→</span>
              <span className="text-blue-700">의미한다</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">공부합니다</span>
              <span className="mx-2">→</span>
              <span className="text-blue-700">공부한다</span>
            </div>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={handlePreview}
            disabled={loading}
            className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold"
          >
            {loading ? '처리 중...' : '🔍 미리보기 (샘플 10개)'}
          </button>
          <button
            onClick={handleExecute}
            disabled={loading}
            className="flex-1 px-6 py-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 font-semibold"
          >
            {loading ? '처리 중...' : '⚡ 일괄 실행 (변경분만)'}
          </button>
          <button
            onClick={handleForceExecute}
            disabled={loading}
            className="flex-1 px-6 py-4 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 font-semibold"
          >
            {loading ? '처리 중...' : '🔥 강제 재정규화 (전체)'}
          </button>
        </div>

        {/* 미리보기 결과 */}
        {preview && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              📊 미리보기 통계 (샘플 기준)
            </h2>

            <div className="grid grid-cols-3 gap-4 mb-6">
              {/* 어휘 문제 */}
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">어휘 문제</div>
                <div className="text-2xl font-bold text-green-700">
                  {preview.stats.vocabularyChanged} / {preview.stats.vocabularyTotal}
                </div>
                <div className="text-xs text-gray-500">변경 대상</div>
              </div>

              {/* 문단 문제 */}
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">문단 문제</div>
                <div className="text-2xl font-bold text-blue-700">
                  {preview.stats.paragraphChanged} / {preview.stats.paragraphTotal}
                </div>
                <div className="text-xs text-gray-500">변경 대상</div>
              </div>

              {/* 종합 문제 */}
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">종합 문제</div>
                <div className="text-2xl font-bold text-purple-700">
                  {preview.stats.comprehensiveChanged} / {preview.stats.comprehensiveTotal}
                </div>
                <div className="text-xs text-gray-500">변경 대상</div>
              </div>
            </div>

            {/* 상세 변경 내용 토글 */}
            <button
              onClick={() => setShowPreviewDetails(!showPreviewDetails)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              {showPreviewDetails ? '▼ 상세 변경 내용 숨기기' : '▶ 상세 변경 내용 보기'}
            </button>

            {/* 상세 변경 내용 */}
            {showPreviewDetails && (
              <div className="mt-4 space-y-6 max-h-[600px] overflow-y-auto border-t border-gray-200 pt-4">
                {/* 어휘 문제 */}
                {preview.vocabularyQuestions.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-green-800 mb-3 flex items-center">
                      <span className="bg-green-100 px-2 py-1 rounded text-sm mr-2">어휘 문제</span>
                      <span className="text-sm text-gray-600">({preview.vocabularyQuestions.length}개 변경)</span>
                    </h3>
                    <div className="space-y-3">
                      {preview.vocabularyQuestions.slice(0, 5).map((item, idx) => (
                        <div key={idx} className="bg-green-50 border border-green-200 p-4 rounded-lg">
                          <div className="font-medium text-gray-900 mb-2 pb-2 border-b border-green-200">
                            문제 #{item.questionNumber}
                          </div>
                          <div className="space-y-2">
                            {Object.keys(item.original).map(key => (
                              <div key={key} className="ml-2">
                                <div className="text-xs text-gray-500 mb-1 font-medium">
                                  {key === 'question_text' ? '문제' :
                                   key === 'explanation' ? '해설' :
                                   key.startsWith('option_') ? `보기 ${key.split('_')[1]}` : key}
                                </div>
                                <div className="bg-white p-2 rounded mb-1 border-l-2 border-red-400">
                                  <span className="text-red-600 line-through">{item.original[key]}</span>
                                </div>
                                <div className="bg-white p-2 rounded border-l-2 border-green-500">
                                  <span className="text-green-700 font-medium">{item.normalized[key]}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      {preview.vocabularyQuestions.length > 5 && (
                        <div className="text-center text-sm text-gray-500 py-2">
                          ... 외 {preview.vocabularyQuestions.length - 5}개 더
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 문단 문제 */}
                {preview.paragraphQuestions.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-blue-800 mb-3 flex items-center">
                      <span className="bg-blue-100 px-2 py-1 rounded text-sm mr-2">문단 문제</span>
                      <span className="text-sm text-gray-600">({preview.paragraphQuestions.length}개 변경)</span>
                    </h3>
                    <div className="space-y-3">
                      {preview.paragraphQuestions.slice(0, 5).map((item, idx) => (
                        <div key={idx} className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                          <div className="font-medium text-gray-900 mb-2 pb-2 border-b border-blue-200">
                            문제 #{item.questionNumber}
                          </div>
                          <div className="space-y-2">
                            {Object.keys(item.original).map(key => (
                              <div key={key} className="ml-2">
                                <div className="text-xs text-gray-500 mb-1 font-medium">
                                  {key === 'question_text' ? '문제' :
                                   key === 'explanation' ? '해설' :
                                   key.startsWith('option_') ? `보기 ${key.split('_')[1]}` : key}
                                </div>
                                <div className="bg-white p-2 rounded mb-1 border-l-2 border-red-400">
                                  <span className="text-red-600 line-through">{item.original[key]}</span>
                                </div>
                                <div className="bg-white p-2 rounded border-l-2 border-green-500">
                                  <span className="text-green-700 font-medium">{item.normalized[key]}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      {preview.paragraphQuestions.length > 5 && (
                        <div className="text-center text-sm text-gray-500 py-2">
                          ... 외 {preview.paragraphQuestions.length - 5}개 더
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 종합 문제 */}
                {preview.comprehensiveQuestions.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-purple-800 mb-3 flex items-center">
                      <span className="bg-purple-100 px-2 py-1 rounded text-sm mr-2">종합 문제</span>
                      <span className="text-sm text-gray-600">({preview.comprehensiveQuestions.length}개 변경)</span>
                    </h3>
                    <div className="space-y-3">
                      {preview.comprehensiveQuestions.slice(0, 5).map((item, idx) => (
                        <div key={idx} className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
                          <div className="font-medium text-gray-900 mb-2 pb-2 border-b border-purple-200">
                            문제 #{item.questionNumber}
                          </div>
                          <div className="space-y-2">
                            {Object.keys(item.original).map(key => (
                              <div key={key} className="ml-2">
                                <div className="text-xs text-gray-500 mb-1 font-medium">
                                  {key === 'question_text' ? '문제' :
                                   key === 'explanation' ? '해설' :
                                   key.startsWith('option_') ? `보기 ${key.split('_')[1]}` : key}
                                </div>
                                <div className="bg-white p-2 rounded mb-1 border-l-2 border-red-400">
                                  <span className="text-red-600 line-through">{item.original[key]}</span>
                                </div>
                                <div className="bg-white p-2 rounded border-l-2 border-green-500">
                                  <span className="text-green-700 font-medium">{item.normalized[key]}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      {preview.comprehensiveQuestions.length > 5 && (
                        <div className="text-center text-sm text-gray-500 py-2">
                          ... 외 {preview.comprehensiveQuestions.length - 5}개 더
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 변경사항 없음 */}
                {preview.vocabularyQuestions.length === 0 &&
                 preview.paragraphQuestions.length === 0 &&
                 preview.comprehensiveQuestions.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    변경이 필요한 문제가 없습니다.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 실행 결과 */}
        {result && (
          <div className={`rounded-lg shadow-md p-6 ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
            <h2 className="text-xl font-bold mb-4" style={{ color: result.success ? '#047857' : '#dc2626' }}>
              {result.success ? '✅ 정규화 완료' : '❌ 정규화 실패'}
            </h2>

            <p className="text-gray-700 mb-4">{result.message}</p>

            {result.summary && (
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-white rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">총 처리</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {result.summary.totalProcessed}
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">업데이트</div>
                  <div className="text-2xl font-bold text-green-700">
                    {result.summary.totalUpdated}
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">오류</div>
                  <div className="text-2xl font-bold text-red-700">
                    {result.summary.totalErrors}
                  </div>
                </div>
              </div>
            )}

            {result.stats && (
              <div className="space-y-2 text-sm">
                <div className="bg-white rounded p-3">
                  <span className="font-medium">어휘 문제:</span> {result.stats.vocabularyQuestions.updated} / {result.stats.vocabularyQuestions.total} 업데이트
                  {result.stats.vocabularyQuestions.errors > 0 && (
                    <span className="text-red-600 ml-2">({result.stats.vocabularyQuestions.errors} 오류)</span>
                  )}
                </div>
                <div className="bg-white rounded p-3">
                  <span className="font-medium">문단 문제:</span> {result.stats.paragraphQuestions.updated} / {result.stats.paragraphQuestions.total} 업데이트
                  {result.stats.paragraphQuestions.errors > 0 && (
                    <span className="text-red-600 ml-2">({result.stats.paragraphQuestions.errors} 오류)</span>
                  )}
                </div>
                <div className="bg-white rounded p-3">
                  <span className="font-medium">종합 문제:</span> {result.stats.comprehensiveQuestions.updated} / {result.stats.comprehensiveQuestions.total} 업데이트
                  {result.stats.comprehensiveQuestions.errors > 0 && (
                    <span className="text-red-600 ml-2">({result.stats.comprehensiveQuestions.errors} 오류)</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 사용 가이드 */}
        <div className="bg-gray-100 rounded-lg p-6 mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            📖 사용 가이드
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
            <li>먼저 <strong>"미리보기"</strong> 버튼을 클릭하여 변경될 내용을 확인하세요.</li>
            <li>변경 내용이 올바른지 확인한 후 <strong>"일괄 실행 (변경분만)"</strong> 버튼을 클릭하세요.</li>
            <li className="text-orange-700 font-medium">
              <strong>"강제 재정규화 (전체)"</strong>는 이미 정규화된 데이터도 다시 처리합니다.
              정규화 로직이 업데이트된 경우에만 사용하세요.
            </li>
            <li>실행 후에는 되돌릴 수 없으므로 신중하게 결정하세요.</li>
            <li>실행 완료 후 통계를 확인하여 정상적으로 처리되었는지 검토하세요.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
