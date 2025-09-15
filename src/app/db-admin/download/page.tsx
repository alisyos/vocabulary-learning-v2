'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

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

export default function DownloadPage() {
  const [activeTab, setActiveTab] = useState('content_sets');
  const [downloading, setDownloading] = useState<{ [key: string]: boolean }>({});
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const handleDownload = async (tableName: string) => {
    setDownloading(prev => ({ ...prev, [tableName]: true }));
    
    try {
      const response = await fetch(`/api/download-csv?table=${tableName}`);
      
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
                          </code> 테이블의 모든 데이터를 원본 형태로 다운로드합니다.
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
  );
}