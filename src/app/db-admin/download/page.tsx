'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import RoleAuthGuard from '@/components/RoleAuthGuard';

interface TableInfo {
  key: string;
  name: string;
  description: string;
  icon: string;
}

const tables: TableInfo[] = [
  {
    key: 'content_sets',
    name: 'Content Sets',
    description: '콘텐츠 세트 기본 정보 (메타데이터, 통계)',
    icon: '📚'
  },
  {
    key: 'passages',
    name: 'Passages',
    description: '지문 데이터 (제목, 문단별 내용)',
    icon: '📖'
  },
  {
    key: 'vocabulary_terms',
    name: 'Vocabulary Terms',
    description: '어휘 용어 및 정의',
    icon: '📝'
  },
  {
    key: 'vocabulary_questions',
    name: 'Vocabulary Questions',
    description: '어휘 문제 (5지선다)',
    icon: '❓'
  },
  {
    key: 'paragraph_questions',
    name: 'Paragraph Questions',
    description: '문단별 문제',
    icon: '📄'
  },
  {
    key: 'comprehensive_questions',
    name: 'Comprehensive Questions',
    description: '종합 문제 (4가지 유형)',
    icon: '🧠'
  }
];

const statusOptions = [
  { value: 'all', label: '전체' },
  { value: '검수 전', label: '검수 전' },
  { value: '1차검수', label: '1차검수' },
  { value: '2차검수', label: '2차검수' },
  { value: '3차검수', label: '3차검수' },
  { value: '4차검수', label: '4차검수' },
  { value: '검수완료', label: '검수완료' },
  { value: '승인완료', label: '승인완료' }
];

export default function DownloadPage() {
  const [activeTab, setActiveTab] = useState('content_sets');
  const [downloading, setDownloading] = useState<{ [key: string]: boolean }>({});
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['all']);
  const [sessionRange, setSessionRange] = useState<string>(''); // 차시 범위 (예: "1-100")
  const [sessionRangeError, setSessionRangeError] = useState<string>('');
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const handleStatusChange = (status: string) => {
    if (status === 'all') {
      setSelectedStatuses(['all']);
    } else {
      const newStatuses = selectedStatuses.filter(s => s !== 'all');
      if (newStatuses.includes(status)) {
        const filtered = newStatuses.filter(s => s !== status);
        setSelectedStatuses(filtered.length === 0 ? ['all'] : filtered);
      } else {
        setSelectedStatuses([...newStatuses, status]);
      }
    }
  };

  // 차시 범위 검증 함수
  const validateSessionRange = (range: string): { valid: boolean; error?: string; start?: number; end?: number } => {
    if (!range || range.trim() === '') {
      return { valid: true }; // 빈 값은 유효 (전체 선택)
    }

    const trimmed = range.trim();
    const match = trimmed.match(/^(\d+)-(\d+)$/);

    if (!match) {
      return { valid: false, error: '형식이 올바르지 않습니다. "1-100" 형식으로 입력하세요.' };
    }

    const start = parseInt(match[1], 10);
    const end = parseInt(match[2], 10);

    if (start < 1 || end < 1) {
      return { valid: false, error: '차시 번호는 1 이상이어야 합니다.' };
    }

    if (start > end) {
      return { valid: false, error: '시작 차시가 끝 차시보다 클 수 없습니다.' };
    }

    return { valid: true, start, end };
  };

  // 차시 범위 입력 변경 핸들러
  const handleSessionRangeChange = (value: string) => {
    setSessionRange(value);
    const validation = validateSessionRange(value);
    if (!validation.valid) {
      setSessionRangeError(validation.error || '');
    } else {
      setSessionRangeError('');
    }
  };

  const handleDownload = async (tableName: string) => {
    // 차시 범위 검증
    const rangeValidation = validateSessionRange(sessionRange);
    if (!rangeValidation.valid) {
      alert(rangeValidation.error || '차시 범위 입력이 올바르지 않습니다.');
      return;
    }

    setDownloading(prev => ({ ...prev, [tableName]: true }));

    try {
      // status 파라미터 구성
      const statusParam = selectedStatuses.includes('all')
        ? 'all'
        : selectedStatuses.join(',');

      // URL 파라미터 구성
      const params = new URLSearchParams({
        table: tableName,
        status: statusParam
      });

      // 차시 범위가 있으면 추가
      if (sessionRange && sessionRange.trim() !== '') {
        params.append('sessionRange', sessionRange.trim());
      }

      const response = await fetch(`/api/download-csv?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const contentDisposition = response.headers.get('content-disposition');
      let filename = `${tableName}.csv`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]*)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      link.download = filename;
      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Download error:', error);
      alert(error instanceof Error ? error.message : 'Download failed');
    } finally {
      setDownloading(prev => ({ ...prev, [tableName]: false }));
    }
  };

  const activeTable = tables.find(table => table.key === activeTab);

  // 인증 로딩 중
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 인증 체크
  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <RoleAuthGuard allowedRoles={['admin']}>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow">
            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
                {tables.map((table) => (
                  <button
                    key={table.key}
                    onClick={() => setActiveTab(table.key)}
                    className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                      activeTab === table.key
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-lg">{table.icon}</span>
                    <span className="hidden sm:inline">{table.name}</span>
                    <span className="sm:hidden">{table.key}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTable && (
                <div className="space-y-6">
                  {/* Table Info */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{activeTable.icon}</span>
                      <div>
                        <h3 className="text-lg font-semibold text-blue-900">
                          {activeTable.name}
                        </h3>
                        <p className="text-blue-700 text-sm">
                          {activeTable.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Status Filter Section */}
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-5">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                        <h4 className="text-md font-semibold text-purple-900">
                          검수 상태별 필터링
                        </h4>
                      </div>

                      <p className="text-sm text-purple-700">
                        다운로드할 데이터의 검수 상태를 선택하세요. 여러 개 선택 가능합니다.
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {statusOptions.map((option) => {
                          const isSelected = selectedStatuses.includes(option.value);
                          const isAll = option.value === 'all';

                          return (
                            <button
                              key={option.value}
                              onClick={() => handleStatusChange(option.value)}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                isSelected
                                  ? isAll
                                    ? 'bg-purple-600 text-white shadow-md'
                                    : 'bg-indigo-600 text-white shadow-md'
                                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {isSelected && !isAll && (
                                <span className="mr-1">✓</span>
                              )}
                              {option.label}
                            </button>
                          );
                        })}
                      </div>

                      <div className="bg-white rounded-md p-3 border border-purple-100">
                        <p className="text-xs text-gray-600">
                          <span className="font-semibold">선택된 상태:</span>{' '}
                          {selectedStatuses.includes('all')
                            ? '전체'
                            : selectedStatuses.length > 0
                            ? selectedStatuses.join(', ')
                            : '없음 (전체로 자동 설정됩니다)'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Session Number Range Filter Section */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-5">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                        </svg>
                        <h4 className="text-md font-semibold text-green-900">
                          차시 범위 필터링
                        </h4>
                      </div>

                      <p className="text-sm text-green-700">
                        특정 차시 범위의 데이터만 다운로드하려면 아래 형식으로 입력하세요.
                      </p>

                      <div className="space-y-2">
                        <input
                          type="text"
                          value={sessionRange}
                          onChange={(e) => handleSessionRangeChange(e.target.value)}
                          placeholder="예: 1-100"
                          className={`w-full px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${
                            sessionRangeError
                              ? 'border-red-300 focus:ring-red-500'
                              : 'border-gray-300 focus:ring-green-500'
                          }`}
                        />
                        {sessionRangeError && (
                          <p className="text-xs text-red-600 flex items-center space-x-1">
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <span>{sessionRangeError}</span>
                          </p>
                        )}
                      </div>

                      <div className="bg-white rounded-md p-3 border border-green-100">
                        <p className="text-xs text-gray-600">
                          <span className="font-semibold">입력 형식:</span> "시작-끝" (예: 1-100, 10-50)
                          <br />
                          <span className="font-semibold">비워두면:</span> 모든 차시 포함
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Download Section */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                    <div className="text-center space-y-4">
                      <div>
                        <h4 className="text-lg font-medium text-gray-900">
                          CSV 파일 다운로드
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          <code className="bg-gray-200 px-2 py-1 rounded text-xs">
                            {activeTable.key}
                          </code> 테이블의{' '}
                          {selectedStatuses.includes('all') ? (
                            <span className="font-semibold">모든 데이터</span>
                          ) : (
                            <>
                              <span className="font-semibold text-indigo-600">
                                {selectedStatuses.join(', ')}
                              </span>{' '}
                              상태의 데이터
                            </>
                          )}
                          를 원본 형태로 다운로드합니다.
                        </p>
                      </div>

                      <button
                        onClick={() => handleDownload(activeTable.key)}
                        disabled={downloading[activeTable.key]}
                        className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white ${
                          downloading[activeTable.key]
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                        }`}
                      >
                        {downloading[activeTable.key] ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            다운로드 중...
                          </>
                        ) : (
                          <>
                            <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            CSV 다운로드
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Usage Notes */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-yellow-800">
                          사용법 안내
                        </h3>
                        <div className="mt-2 text-sm text-yellow-700">
                          <ul className="list-disc list-inside space-y-1">
                            <li>CSV 파일은 UTF-8 BOM 인코딩으로 생성되어 Excel에서 한글이 정상적으로 표시됩니다.</li>
                            <li>파일명에는 다운로드 시각이 자동으로 포함됩니다.</li>
                            <li>데이터는 생성 시간 순으로 정렬됩니다.</li>
                            <li>만약 여전히 한글이 깨질 경우, Excel에서 "데이터" → "텍스트 나누기" → "구분 기호로 분리됨" → "쉼표"를 선택하여 가져오기하세요.</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </RoleAuthGuard>
  );
}