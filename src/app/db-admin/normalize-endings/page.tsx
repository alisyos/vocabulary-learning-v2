'use client';

import { useState } from 'react';
import Link from 'next/link';

interface NormalizationRule {
  id: string;
  label: string;
  category: '용어통일' | '문장형태' | '텍스트표현' | '의문형존댓말' | '일반규칙' | '불규칙';
  color: string;
}

interface PreviewStats {
  vocabularyTotal: number;
  vocabularyChanged: number;
  paragraphTotal: number;
  paragraphChanged: number;
  comprehensiveTotal: number;
  comprehensiveChanged: number;
}

interface PreviewItem {
  id: string;
  questionNumber: number;
  questionType: 'vocabulary' | 'paragraph' | 'comprehensive';
  original: Record<string, string>;
  normalized: Record<string, string>;
  appliedRules: NormalizationRule[];
  hasChanges: boolean;
}

interface PreviewData {
  vocabularyQuestions: PreviewItem[];
  paragraphQuestions: PreviewItem[];
  comprehensiveQuestions: PreviewItem[];
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
  const [showPreviewDetails, setShowPreviewDetails] = useState(true); // 기본값: 보기
  const [showRules, setShowRules] = useState(false); // 변환 규칙 숨김/보기 상태 (기본값: 숨김)
  const [contentSetId, setContentSetId] = useState('');

  // 편집된 데이터를 추적
  const [editedData, setEditedData] = useState<Map<string, Record<string, string>>>(new Map());

  // 미리보기 가져오기
  const handlePreview = async () => {
    setLoading(true);
    setResult(null);
    setEditedData(new Map()); // 편집 데이터 초기화

    try {
      const url = contentSetId
        ? `/api/normalize-endings/preview?content_set_id=${contentSetId}`
        : '/api/normalize-endings/preview?limit=10';

      const response = await fetch(url);
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

  // 정규화된 값 편집 핸들러
  const handleEditNormalized = (itemId: string, field: string, value: string) => {
    setEditedData(prev => {
      const newMap = new Map(prev);
      const itemData = newMap.get(itemId) || {};
      itemData[field] = value;
      newMap.set(itemId, itemData);
      return newMap;
    });
  };

  // 편집된 값 가져오기 (편집되지 않았으면 원래 normalized 값)
  const getNormalizedValue = (item: PreviewItem, field: string): string => {
    const edited = editedData.get(item.id);
    if (edited && edited[field] !== undefined) {
      return edited[field];
    }
    return item.normalized[field] || '';
  };

  // 수정된 내용 적용
  const handleApplyChanges = async () => {
    if (!preview) return;

    const hasEdits = editedData.size > 0;
    const totalChanges =
      preview.vocabularyQuestions.length +
      preview.paragraphQuestions.length +
      preview.comprehensiveQuestions.length;

    const confirmed = confirm(
      `${hasEdits ? '✏️ 수정된 내용을 포함하여 ' : ''}총 ${totalChanges}개의 변경사항을 적용하시겠습니까?\n\n` +
      (hasEdits ? `직접 수정한 항목: ${editedData.size}개\n` : '') +
      '이 작업은 되돌릴 수 없습니다.'
    );

    if (!confirmed) return;

    setLoading(true);
    setResult(null);

    try {
      // 적용할 데이터 준비
      const updates = {
        vocabularyQuestions: preview.vocabularyQuestions.map(item => ({
          id: item.id,
          updates: Object.keys(item.normalized).reduce((acc, field) => {
            acc[field] = getNormalizedValue(item, field);
            return acc;
          }, {} as Record<string, string>)
        })),
        paragraphQuestions: preview.paragraphQuestions.map(item => ({
          id: item.id,
          updates: Object.keys(item.normalized).reduce((acc, field) => {
            acc[field] = getNormalizedValue(item, field);
            return acc;
          }, {} as Record<string, string>)
        })),
        comprehensiveQuestions: preview.comprehensiveQuestions.map(item => ({
          id: item.id,
          updates: Object.keys(item.normalized).reduce((acc, field) => {
            acc[field] = getNormalizedValue(item, field);
            return acc;
          }, {} as Record<string, string>)
        }))
      };

      const response = await fetch('/api/normalize-endings/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      const data = await response.json();
      setResult(data);

      if (data.success) {
        alert(`✅ 적용 완료!\n\n${data.summary.totalUpdated}개의 문제가 업데이트되었습니다.`);
        setPreview(null);
        setEditedData(new Map());
      } else {
        alert(`❌ 적용 실패\n\n${data.message}`);
      }
    } catch (error) {
      console.error('적용 오류:', error);
      alert('적용 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 일괄 실행
  const handleExecute = async () => {
    const scope = contentSetId ? `콘텐츠 세트 ID: ${contentSetId}의 문제` : '모든 문제';
    const confirmed = confirm(
      `⚠️ 주의: ${scope}의 종결 어미를 일괄 수정합니다.\n\n` +
      '이 작업은 되돌릴 수 없습니다.\n' +
      '계속하시겠습니까?'
    );

    if (!confirmed) return;

    setLoading(true);
    setResult(null);

    try {
      const url = contentSetId
        ? `/api/normalize-endings?content_set_id=${contentSetId}`
        : '/api/normalize-endings';

      const response = await fetch(url, {
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
    const scope = contentSetId ? `콘텐츠 세트 ID: ${contentSetId}의 데이터` : '모든 데이터';
    const confirmed = confirm(
      '⚠️⚠️⚠️ 강제 재정규화 모드 ⚠️⚠️⚠️\n\n' +
      `변경사항 유무와 관계없이 ${scope}를 재정규화합니다.\n` +
      '최신 normalizeEndingSentence 함수가 적용됩니다.\n\n' +
      '이 작업은 되돌릴 수 없습니다.\n' +
      '정말로 계속하시겠습니까?'
    );

    if (!confirmed) return;

    setLoading(true);
    setResult(null);

    try {
      const url = contentSetId
        ? `/api/force-normalize-endings?content_set_id=${contentSetId}`
        : '/api/force-normalize-endings';

      const response = await fetch(url, {
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

        {/* 콘텐츠 세트 ID 검색 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            🔍 콘텐츠 세트 검색
          </h2>
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                콘텐츠 세트 ID (선택사항)
              </label>
              <input
                type="text"
                value={contentSetId}
                onChange={(e) => setContentSetId(e.target.value)}
                placeholder="예: 123e4567-e89b-12d3-a456-426614174000 (비워두면 전체 검수)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            {contentSetId && (
              <button
                onClick={() => setContentSetId('')}
                className="mt-7 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                초기화
              </button>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-2">
            💡 특정 콘텐츠 세트만 검수하려면 ID를 입력하세요. 비워두면 전체 데이터를 대상으로 합니다.
          </p>
        </div>

        {/* 변환 규칙 안내 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-blue-900">
              📝 변환 규칙
            </h2>
            <button
              onClick={() => setShowRules(!showRules)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
            >
              {showRules ? '▲ 변환 규칙 숨기기' : '▼ 변환 규칙 보기'}
            </button>
          </div>

          {showRules && (
            <div>
              {/* 용어 통일 및 문장 형태 변환 */}
          <div className="mb-4">
            <h3 className="text-sm font-bold text-indigo-800 mb-2">🔄 용어 통일 및 문장 형태 변환 (6가지)</h3>
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-indigo-100 p-3 rounded-lg border border-indigo-400">
                <div className="text-center">
                  <span className="font-bold text-gray-800">핵심 주제</span>
                  <span className="mx-2 text-lg">→</span>
                  <span className="text-indigo-700 font-bold">중심 내용</span>
                </div>
                <div className="text-xs text-gray-600 mt-1 text-center">
                  핵심 주제는 → 중심 내용은
                </div>
              </div>
              <div className="bg-indigo-100 p-3 rounded-lg border border-indigo-400">
                <div className="text-center">
                  <span className="font-bold text-gray-800">말함</span>
                  <span className="mx-2 text-lg">→</span>
                  <span className="text-indigo-700 font-bold">함</span>
                </div>
                <div className="text-xs text-gray-600 mt-1 text-center">
                  이야기를 말함 → 이야기를 함
                </div>
              </div>
              <div className="bg-indigo-100 p-3 rounded-lg border border-indigo-400">
                <div className="text-center">
                  <span className="font-bold text-gray-800">까닭</span>
                  <span className="mx-2 text-lg">→</span>
                  <span className="text-indigo-700 font-bold">이유</span>
                </div>
                <div className="text-xs text-gray-600 mt-1 text-center">
                  그 까닭은 → 그 이유는
                </div>
              </div>
              <div className="bg-indigo-100 p-3 rounded-lg border border-indigo-400">
                <div className="text-center">
                  <span className="font-bold text-gray-800">지문에서</span>
                  <span className="mx-2 text-lg">→</span>
                  <span className="text-indigo-700 font-bold">이 글에서</span>
                </div>
                <div className="text-xs text-gray-600 mt-1 text-center">
                  지문에서 → 이 글에서
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="bg-indigo-100 p-3 rounded-lg border-2 border-indigo-500">
                <div className="text-center">
                  <span className="font-bold text-gray-800">고르세요.</span>
                  <span className="mx-2 text-lg">→</span>
                  <span className="text-indigo-700 font-bold">무엇인가요?</span>
                </div>
                <div className="text-xs text-gray-600 mt-1 text-center">
                  적절한 것을 고르세요. → 무엇인가요?
                </div>
              </div>
              <div className="bg-indigo-100 p-3 rounded-lg border-2 border-indigo-500">
                <div className="text-center">
                  <span className="font-bold text-gray-800">고르시오.</span>
                  <span className="mx-2 text-lg">→</span>
                  <span className="text-indigo-700 font-bold">무엇인가요?</span>
                </div>
                <div className="text-xs text-gray-600 mt-1 text-center">
                  적절한 것을 고르시오. → 무엇인가요?
                </div>
              </div>
            </div>
          </div>

              {/* 텍스트 표현 개선 */}
          <div className="mb-4">
            <h3 className="text-sm font-bold text-purple-800 mb-2">✨ 텍스트 표현 개선 (4가지)</h3>
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-purple-100 p-3 rounded-lg border border-purple-400">
                <div className="text-center">
                  <span className="font-bold text-gray-800">예:</span>
                  <span className="mx-2 text-lg">→</span>
                  <span className="text-purple-700 font-bold">예를 들어</span>
                </div>
                <div className="text-xs text-gray-600 mt-1 text-center">
                  예: 사과 → 예를 들어 사과
                </div>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg border border-purple-400">
                <div className="text-center">
                  <span className="font-bold text-gray-800">라 한다</span>
                  <span className="mx-2 text-lg">→</span>
                  <span className="text-purple-700 font-bold">라고 한다</span>
                </div>
                <div className="text-xs text-gray-600 mt-1 text-center">
                  라 한다 → 라고 한다
                </div>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg border border-purple-400">
                <div className="text-center">
                  <span className="font-bold text-gray-800">가?</span>
                  <span className="mx-2 text-lg">→</span>
                  <span className="text-purple-700 font-bold">가요?</span>
                </div>
                <div className="text-xs text-gray-600 mt-1 text-center">
                  무엇인가? → 무엇인가요?
                </div>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg border border-purple-400">
                <div className="text-center">
                  <span className="font-bold text-gray-800">까?</span>
                  <span className="mx-2 text-lg">→</span>
                  <span className="text-purple-700 font-bold">까요?</span>
                </div>
                <div className="text-xs text-gray-600 mt-1 text-center">
                  알을까? → 알을까요?
                </div>
              </div>
            </div>
          </div>

          {/* 핵심 일반 규칙 */}
          <div className="mb-4">
            <h3 className="text-sm font-bold text-blue-800 mb-2">🌟 핵심 일반 규칙 (3가지)</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-green-100 p-3 rounded-lg border-2 border-green-400">
                <div className="text-center">
                  <span className="font-bold text-gray-800">합니다</span>
                  <span className="mx-2 text-lg">→</span>
                  <span className="text-green-700 font-bold">한다</span>
                </div>
                <div className="text-xs text-gray-600 mt-1 text-center">
                  설명합니다 → 설명한다<br/>
                  필요합니다 → 필요한다
                </div>
              </div>
              <div className="bg-green-100 p-3 rounded-lg border-2 border-green-400">
                <div className="text-center">
                  <span className="font-bold text-gray-800">입니다</span>
                  <span className="mx-2 text-lg">→</span>
                  <span className="text-green-700 font-bold">이다</span>
                </div>
                <div className="text-xs text-gray-600 mt-1 text-center">
                  도구입니다 → 도구이다<br/>
                  것입니다 → 것이다
                </div>
              </div>
              <div className="bg-green-100 p-3 rounded-lg border-2 border-green-400">
                <div className="text-center">
                  <span className="font-bold text-gray-800">습니다</span>
                  <span className="mx-2 text-lg">→</span>
                  <span className="text-green-700 font-bold">다</span>
                </div>
                <div className="text-xs text-gray-600 mt-1 text-center">
                  갔습니다 → 갔다<br/>
                  했습니다 → 했다
                </div>
              </div>
            </div>
          </div>

          {/* 불규칙 특수 케이스 */}
          <div className="mb-4">
            <h3 className="text-sm font-bold text-orange-800 mb-2">⚡ 불규칙 특수 케이스 (2가지)</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-yellow-100 p-2 rounded border border-yellow-400">
                <span className="font-medium text-gray-700">됩니다</span>
                <span className="mx-2">→</span>
                <span className="text-orange-700 font-bold">된다</span>
                <span className="text-xs text-gray-600 ml-2">(불규칙 활용)</span>
              </div>
              <div className="bg-yellow-100 p-2 rounded border border-yellow-400">
                <span className="font-medium text-gray-700">납니다</span>
                <span className="mx-2">→</span>
                <span className="text-orange-700 font-bold">난다</span>
                <span className="text-xs text-gray-600 ml-2">(불규칙 활용)</span>
              </div>
            </div>
          </div>

          {/* 자동 처리 규칙 */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-2">🔄 자동 처리 규칙 (예시)</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-white p-2 rounded">
                <span className="font-medium text-gray-600">았습니다</span>
                <span className="mx-2">→</span>
                <span className="text-blue-700">았다</span>
              </div>
              <div className="bg-white p-2 rounded">
                <span className="font-medium text-gray-600">었습니다</span>
                <span className="mx-2">→</span>
                <span className="text-blue-700">었다</span>
              </div>
              <div className="bg-white p-2 rounded">
                <span className="font-medium text-gray-600">였습니다</span>
                <span className="mx-2">→</span>
                <span className="text-blue-700">였다</span>
              </div>
              <div className="bg-white p-2 rounded">
                <span className="font-medium text-gray-600">습니까</span>
                <span className="mx-2">→</span>
                <span className="text-blue-700">는가</span>
              </div>
            </div>
          </div>

              <p className="text-xs text-gray-600 mt-3 pt-3 border-t border-blue-200">
                💡 <strong className="text-green-700">초록색 배경</strong> = 핵심 일반 규칙 (대부분의 경우 적용)
                <br/>
                💡 <strong className="text-yellow-700">노란색 배경</strong> = 불규칙 특수 케이스 (우선 처리)
              </p>
            </div>
          )}
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                📊 미리보기 통계 {contentSetId ? '(콘텐츠 세트 전체)' : '(샘플 기준)'}
              </h2>
              <button
                onClick={handleApplyChanges}
                disabled={loading}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-semibold shadow-md"
              >
                {editedData.size > 0 ? `✏️ 수정 내용 적용 (${editedData.size}개 편집됨)` : '✅ 변경사항 적용'}
              </button>
            </div>

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
                      {preview.vocabularyQuestions.slice(0, 10).map((item, idx) => {
                        const isEdited = editedData.has(item.id);
                        return (
                          <div key={idx} className={`border p-4 rounded-lg ${isEdited ? 'bg-yellow-50 border-yellow-400' : 'bg-green-50 border-green-200'}`}>
                            <div className="font-medium text-gray-900 mb-2 pb-2 border-b border-green-200">
                              <div className="flex items-center justify-between mb-2">
                                <span>문제 #{item.questionNumber}</span>
                                {isEdited && <span className="text-xs bg-yellow-200 px-2 py-1 rounded">✏️ 편집됨</span>}
                              </div>
                              {item.appliedRules && item.appliedRules.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {item.appliedRules.map((rule, rIdx) => (
                                    <span key={rIdx} className={`text-xs px-2 py-0.5 rounded-full ${rule.color} font-medium`}>
                                      {rule.label}
                                    </span>
                                  ))}
                                </div>
                              )}
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
                                    <span className="text-red-600 line-through text-sm">{item.original[key]}</span>
                                  </div>
                                  <div className="bg-white rounded border-l-2 border-green-500">
                                    <textarea
                                      value={getNormalizedValue(item, key)}
                                      onChange={(e) => handleEditNormalized(item.id, key, e.target.value)}
                                      className="w-full p-2 text-sm text-green-700 font-medium border-none focus:ring-2 focus:ring-green-400 rounded resize-none"
                                      rows={2}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                      {preview.vocabularyQuestions.length > 10 && (
                        <div className="text-center text-sm text-gray-500 py-2">
                          ... 외 {preview.vocabularyQuestions.length - 10}개 더
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
                      {preview.paragraphQuestions.slice(0, 10).map((item, idx) => {
                        const isEdited = editedData.has(item.id);
                        return (
                          <div key={idx} className={`border p-4 rounded-lg ${isEdited ? 'bg-yellow-50 border-yellow-400' : 'bg-blue-50 border-blue-200'}`}>
                            <div className="font-medium text-gray-900 mb-2 pb-2 border-b border-blue-200">
                              <div className="flex items-center justify-between mb-2">
                                <span>문제 #{item.questionNumber}</span>
                                {isEdited && <span className="text-xs bg-yellow-200 px-2 py-1 rounded">✏️ 편집됨</span>}
                              </div>
                              {item.appliedRules && item.appliedRules.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {item.appliedRules.map((rule, rIdx) => (
                                    <span key={rIdx} className={`text-xs px-2 py-0.5 rounded-full ${rule.color} font-medium`}>
                                      {rule.label}
                                    </span>
                                  ))}
                                </div>
                              )}
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
                                    <span className="text-red-600 line-through text-sm">{item.original[key]}</span>
                                  </div>
                                  <div className="bg-white rounded border-l-2 border-green-500">
                                    <textarea
                                      value={getNormalizedValue(item, key)}
                                      onChange={(e) => handleEditNormalized(item.id, key, e.target.value)}
                                      className="w-full p-2 text-sm text-green-700 font-medium border-none focus:ring-2 focus:ring-green-400 rounded resize-none"
                                      rows={2}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                      {preview.paragraphQuestions.length > 10 && (
                        <div className="text-center text-sm text-gray-500 py-2">
                          ... 외 {preview.paragraphQuestions.length - 10}개 더
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
                      {preview.comprehensiveQuestions.slice(0, 10).map((item, idx) => {
                        const isEdited = editedData.has(item.id);
                        return (
                          <div key={idx} className={`border p-4 rounded-lg ${isEdited ? 'bg-yellow-50 border-yellow-400' : 'bg-purple-50 border-purple-200'}`}>
                            <div className="font-medium text-gray-900 mb-2 pb-2 border-b border-purple-200">
                              <div className="flex items-center justify-between mb-2">
                                <span>문제 #{item.questionNumber}</span>
                                {isEdited && <span className="text-xs bg-yellow-200 px-2 py-1 rounded">✏️ 편집됨</span>}
                              </div>
                              {item.appliedRules && item.appliedRules.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {item.appliedRules.map((rule, rIdx) => (
                                    <span key={rIdx} className={`text-xs px-2 py-0.5 rounded-full ${rule.color} font-medium`}>
                                      {rule.label}
                                    </span>
                                  ))}
                                </div>
                              )}
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
                                    <span className="text-red-600 line-through text-sm">{item.original[key]}</span>
                                  </div>
                                  <div className="bg-white rounded border-l-2 border-green-500">
                                    <textarea
                                      value={getNormalizedValue(item, key)}
                                      onChange={(e) => handleEditNormalized(item.id, key, e.target.value)}
                                      className="w-full p-2 text-sm text-green-700 font-medium border-none focus:ring-2 focus:ring-green-400 rounded resize-none"
                                      rows={2}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                      {preview.comprehensiveQuestions.length > 10 && (
                        <div className="text-center text-sm text-gray-500 py-2">
                          ... 외 {preview.comprehensiveQuestions.length - 10}개 더
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
            <li>
              <strong className="text-blue-700">✨ 권장 방법 (검토 후 적용)</strong>
              <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                <li>콘텐츠 세트 ID를 입력하여 특정 세트 선택 (또는 비워두면 전체 샘플)</li>
                <li><strong>"미리보기"</strong> 버튼으로 자동 변경 내용 확인</li>
                <li>필요시 각 필드를 <strong>직접 수정</strong>하여 원하는 대로 조정</li>
                <li><strong>"✅ 변경사항 적용"</strong> 버튼으로 검토된 내용 저장</li>
              </ul>
            </li>
            <li className="mt-3">
              <strong>일괄 실행 (변경분만)</strong>: 미리보기 없이 자동으로 변경된 항목만 업데이트
            </li>
            <li className="text-orange-700 font-medium">
              <strong>"강제 재정규화 (전체)"</strong>는 이미 정규화된 데이터도 다시 처리합니다.
              정규화 로직이 업데이트된 경우에만 사용하세요.
            </li>
            <li className="mt-2 text-red-700 font-medium">
              ⚠️ 모든 작업은 되돌릴 수 없으므로 신중하게 결정하세요.
            </li>
          </ol>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm text-blue-800">
              <strong>💡 팁:</strong> 편집된 항목은 노란색 배경으로 표시되며,
              "✏️ 편집됨" 뱃지가 나타납니다. 적용 버튼에는 편집된 항목 수가 표시됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
