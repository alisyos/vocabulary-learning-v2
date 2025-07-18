'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';

interface DataSet {
  timestamp: string;
  setId: string;
  userId?: string;
  division: string;
  subject: string;
  grade: string;
  area: string;
  mainTopic: string;  // v2 구조: mainTopic
  subTopic: string;   // v2 구조: subTopic
  keywords: string;   // v2 구조: keywords (복수형)
  passageTitle: string;
  vocabularyQuestionCount: number; // v2 구조
  comprehensiveQuestionCount: number; // v2 구조
  totalQuestions: number;
  createdAt: string;
  updatedAt: string;
  paragraphCount: number;
  vocabularyWordsCount: number;
  status: string;
  
  // 하위 호환성을 위한 별칭들
  maintopic?: string;
  subtopic?: string;
  keyword?: string;
  vocabularyCount?: number;
  comprehensiveCount?: number;
}

interface ApiResponse {
  success: boolean;
  data: DataSet[];
  stats: {
    total: number;
    subjects: string[];
    grades: string[];
    areas: string[];
    totalVocabularyQuestions: number;
    totalComprehensiveQuestions: number;
    mostRecentUpdate: string | null;
  };
  total: number;
  filtered: number;
  error?: string;
}

export default function ManagePage() {
  const [dataSets, setDataSets] = useState<DataSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ApiResponse['stats'] | null>(null);
  
  // 필터 상태
  const [filters, setFilters] = useState({
    subject: '',
    grade: '',
    area: '',
    search: ''
  });
  
  // 페이지네이션
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  const fetchDataSets = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (filters.subject) params.append('subject', filters.subject);
      if (filters.grade) params.append('grade', filters.grade);
      if (filters.area) params.append('area', filters.area);
      
      const response = await fetch(`/api/get-saved-sets?${params.toString()}`);
      const result: ApiResponse = await response.json();
      
      if (result.success) {
        // v2 데이터에 totalQuestions 계산 추가
        const dataWithTotalQuestions = result.data.map(item => ({
          ...item,
          totalQuestions: (item.vocabularyQuestionCount || item.vocabularyCount || 0) + 
                         (item.comprehensiveQuestionCount || item.comprehensiveCount || 0)
        }));
        setDataSets(dataWithTotalQuestions);
        setStats(result.stats);
      } else {
        setError(result.error || 'Unknown error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, [filters.subject, filters.grade, filters.area]);
  
  // 데이터 로드
  useEffect(() => {
    fetchDataSets();
  }, [fetchDataSets]);
  
  // 검색 필터링
  const filteredDataSets = dataSets.filter(item => {
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      return (
        item.passageTitle.toLowerCase().includes(searchTerm) ||
        (item.mainTopic || item.maintopic || '').toLowerCase().includes(searchTerm) ||
        (item.subTopic || item.subtopic || '').toLowerCase().includes(searchTerm) ||
        (item.keywords || item.keyword || '').toLowerCase().includes(searchTerm)
      );
    }
    return true;
  });
  
  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredDataSets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredDataSets.slice(startIndex, startIndex + itemsPerPage);
  
  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 통계 카드 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-gray-600">총 콘텐츠 세트</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-2xl font-bold text-indigo-600">{stats.totalVocabularyWords || 0}</div>
              <div className="text-sm text-gray-600">어휘 수</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-2xl font-bold text-purple-600">{stats.totalVocabularyQuestions}</div>
              <div className="text-sm text-gray-600">어휘 문제</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-2xl font-bold text-green-600">{stats.totalComprehensiveQuestions}</div>
              <div className="text-sm text-gray-600">종합 문제</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-2xl font-bold text-orange-600">
                {stats.totalVocabularyQuestions + stats.totalComprehensiveQuestions}
              </div>
              <div className="text-sm text-gray-600">총 문제 수</div>
            </div>
          </div>
        )}
        
        {/* 필터 및 검색 */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">과목</label>
              <select
                value={filters.subject}
                onChange={(e) => setFilters(prev => ({ ...prev, subject: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">전체</option>
                {stats?.subjects.map(subject => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">학년</label>
              <select
                value={filters.grade}
                onChange={(e) => setFilters(prev => ({ ...prev, grade: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">전체</option>
                {stats?.grades.map(grade => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">영역</label>
              <select
                value={filters.area}
                onChange={(e) => setFilters(prev => ({ ...prev, area: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">전체</option>
                {stats?.areas.map(area => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">검색</label>
              <input
                type="text"
                placeholder="제목, 주제, 키워드 검색..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              {filteredDataSets.length}개의 콘텐츠 세트 ({stats?.total}개 중)
            </p>
            <button
              onClick={() => setFilters({ subject: '', grade: '', area: '', search: '' })}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              필터 초기화
            </button>
          </div>
        </div>
        
        {/* 데이터 목록 */}
        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">데이터를 로드하는 중...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-red-600 mb-4">⚠️ 오류가 발생했습니다</div>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={fetchDataSets}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              다시 시도
            </button>
          </div>
        ) : filteredDataSets.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-gray-400 mb-4">📝</div>
            <p className="text-gray-600 mb-4">
              {filters.search || filters.subject || filters.grade || filters.area 
                ? '검색 조건에 맞는 콘텐츠가 없습니다.' 
                : '저장된 콘텐츠가 없습니다.'}
            </p>
            <Link
              href="/"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 inline-block"
            >
              첫 콘텐츠 생성하기
            </Link>
          </div>
        ) : (
          <>
            {/* 테이블 */}
            <div className="bg-white rounded-lg shadow overflow-hidden overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      생성일
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      과목
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      구분
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      학년
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      영역
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      대주제
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      소주제
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      문단수
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      어휘수
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      어휘문제수
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      종합문제수
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedData.map((item) => (
                    <tr key={item.setId} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(item.createdAt)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.subject}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.division}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.grade}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.area}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.mainTopic || item.maintopic}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.subTopic || item.subtopic}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.paragraphCount}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.vocabularyWordsCount}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-purple-600">
                        {item.vocabularyQuestionCount || item.vocabularyCount || 0}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-green-600">
                        {item.comprehensiveQuestionCount || item.comprehensiveCount || 0}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-1">
                          <button
                            onClick={() => window.open(`/manage/${item.setId}`, '_blank')}
                            className="text-blue-600 hover:text-blue-900 text-xs"
                          >
                            상세
                          </button>
                          <span className="text-gray-300">|</span>
                          <button className="text-red-600 hover:text-red-900 text-xs">
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* 페이지네이션 및 페이지 크기 선택 */}
            <div className="bg-white px-4 py-3 flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between border-t border-gray-200 sm:px-6 mt-4 rounded-lg shadow">
              <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center space-x-4">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">{startIndex + 1}</span>
                    -
                    <span className="font-medium">{Math.min(startIndex + itemsPerPage, filteredDataSets.length)}</span>
                    개 (총
                    <span className="font-medium"> {filteredDataSets.length}</span>
                    개)
                  </p>
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-gray-700">페이지당:</label>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1); // 페이지 크기 변경 시 첫 페이지로 이동
                      }}
                      className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value={20}>20개</option>
                      <option value={50}>50개</option>
                      <option value={100}>100개</option>
                    </select>
                  </div>
                </div>
                {totalPages > 1 && (
                  <div className="mt-3 sm:mt-0">
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        이전
                      </button>
                      {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
                        // 페이지 번호 표시 로직 (최대 10개 페이지 번호만 표시)
                        let pageNumber;
                        if (totalPages <= 10) {
                          pageNumber = i + 1;
                        } else if (currentPage <= 5) {
                          pageNumber = i + 1;
                        } else if (currentPage >= totalPages - 4) {
                          pageNumber = totalPages - 9 + i;
                        } else {
                          pageNumber = currentPage - 4 + i;
                        }
                        return pageNumber;
                      }).map(page => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            page === currentPage
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        다음
                      </button>
                    </nav>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 