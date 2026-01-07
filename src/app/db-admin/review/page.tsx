'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import RoleAuthGuard from '@/components/RoleAuthGuard';
import ContentEditModal from '@/components/ContentEditModal';
import { generateHtmlV2 } from '@/lib/htmlGeneratorV2';

interface DataSet {
  id: string;
  title: string;
  grade: string;
  subject: string;
  area: string;
  session_number?: string | null; // 차시 번호 필드 추가
  grade_number?: string | null; // 과목 넘버 필드 추가
  total_passages: number;
  total_vocabulary_terms: number;
  total_vocabulary_questions: number;
  total_paragraph_questions: number;
  total_comprehensive_questions: number;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
  main_topic?: string;
  sub_topic?: string;
  totalQuestions?: number;
  setId?: string;
  passageTitle?: string;
  vocabularyQuestionCount?: number;
  comprehensiveQuestionCount?: number;
  paragraphCount?: number;
  vocabularyWordsCount?: number;
  mainTopic?: string;
  subTopic?: string;
  keywords?: string;
  division?: string;
  status?: '검수 전' | '검수완료' | '승인완료';
  timestamp?: string;
  createdAt?: string;
  updatedAt?: string;
  userId?: string;
  maintopic?: string;
  subtopic?: string;
  keyword?: string;
}

interface ApiResponse {
  success: boolean;
  data: DataSet[];
  stats: {
    totalSets: number;
    subjects: string[];
    grades: string[];
    areas: string[];
    totalVocabularyQuestions?: number;
    totalComprehensiveQuestions?: number;
  };
  total: number;
  version?: string;
  message?: string;
  error?: string;
}

export default function ContentSetReviewPage() {
  const [dataSets, setDataSets] = useState<DataSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ApiResponse['stats'] | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [selectedSets, setSelectedSets] = useState<Set<string>>(new Set());

  // 일괄 작업 상태
  const [batchOperation, setBatchOperation] = useState<{
    loading: boolean;
    type: 'download' | null;
  }>({ loading: false, type: null });

  // 전체 옵션을 위한 별도 상태 (필터링과 무관하게 유지)
  const [allOptions, setAllOptions] = useState<{
    subjects: string[];
    grades: string[];
    areas: string[];
  }>({
    subjects: [],
    grades: [],
    areas: []
  });

  // 필터 상태
  const [filters, setFilters] = useState({
    subject: '',
    grade: '',
    area: '',
    session: '', // 차시 필터 추가
    user: '',
    status: '검수완료,승인완료', // 기본값을 검수완료와 승인완료로 설정
    search: '',
    excludeOldSessions: true // 1000차시 이전 제외 (기본값: 제외)
  });

  // 페이지네이션
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);


  // 수정 모달 상태
  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    contentSetId: string;
  }>({
    isOpen: false,
    contentSetId: ''
  });

  const fetchDataSets = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters.subject) params.append('subject', filters.subject);
      if (filters.grade) params.append('grade', filters.grade);
      if (filters.area) params.append('area', filters.area);
      if (filters.user) params.append('user', filters.user);
      if (filters.status) params.append('status', filters.status);

      const response = await fetch(`/api/get-curriculum-data-supabase?${params.toString()}`);
      const result: ApiResponse = await response.json();

      if (result.success) {
        setDataSets(result.data);
        setStats(result.stats);
        setTotalCount(result.total);
      } else {
        setError(result.error || 'Unknown error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, [filters.subject, filters.grade, filters.area, filters.user, filters.status]);

  // 초기 로드 시 전체 옵션 가져오기
  useEffect(() => {
    const fetchAllOptions = async () => {
      try {
        // 필터 없이 전체 데이터 가져오기 (상태 필터만 유지)
        const params = new URLSearchParams();
        params.append('status', '검수완료,승인완료');

        const response = await fetch(`/api/get-curriculum-data-supabase?${params.toString()}`);
        const result: ApiResponse = await response.json();

        if (result.success && result.stats) {
          setAllOptions({
            subjects: result.stats.subjects || [],
            grades: result.stats.grades || [],
            areas: result.stats.areas || []
          });
        }
      } catch (err) {
        console.error('Failed to fetch all options:', err);
      }
    };

    fetchAllOptions();
  }, []); // 컴포넌트 마운트 시 한 번만 실행

  // 데이터 로드
  useEffect(() => {
    fetchDataSets();
  }, [fetchDataSets]);

  // 검색 필터링
  const filteredDataSets = dataSets.filter(item => {
    // 1000차시 이전 제외 필터
    if (filters.excludeOldSessions) {
      const sessionNum = item.session_number ? parseInt(item.session_number) : 0;
      // 차시 번호가 없거나 1000 미만인 경우 제외
      if (!item.session_number || isNaN(sessionNum) || sessionNum < 1000) {
        return false;
      }
    }

    // 차시 필터 (완전 일치 검색)
    if (filters.session) {
      // "없음" 또는 "null" 입력 시 차시 정보가 없는 항목만 표시
      if (filters.session === '없음' || filters.session.toLowerCase() === 'null') {
        if (item.session_number) {
          return false;
        }
      } else {
        // 일반 완전 일치 검색
        if (String(item.session_number) !== filters.session) {
          return false;
        }
      }
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      return (
        (item.id || item.setId || '').toLowerCase().includes(searchTerm) ||
        (item.title || item.passageTitle || '').toLowerCase().includes(searchTerm) ||
        (item.mainTopic || item.maintopic || '').toLowerCase().includes(searchTerm) ||
        (item.subTopic || item.subtopic || '').toLowerCase().includes(searchTerm) ||
        (item.keywords || item.keyword || '').toLowerCase().includes(searchTerm)
      );
    }
    return true;
  });

  // 차시 번호 순으로 정렬 (내림차순)
  const sortedDataSets = [...filteredDataSets].sort((a, b) => {
    const sessionA = a.session_number ? parseInt(a.session_number) : -1;
    const sessionB = b.session_number ? parseInt(b.session_number) : -1;
    return sessionB - sessionA;
  });

  // 페이지네이션 계산
  const totalPages = Math.ceil(sortedDataSets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = sortedDataSets.slice(startIndex, startIndex + itemsPerPage);

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = String(date.getFullYear()).slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');

    const datePart = `${year}.${month}.${day}`;
    const timePart = `${hour}:${minute}`;

    return { datePart, timePart };
  };

  // 구분 텍스트 단축
  const formatDivision = (division: string) => {
    switch(division) {
      case '초등학교 중학년(3-4학년)':
        return '중학년';
      case '초등학교 고학년(5-6학년)':
        return '고학년';
      case '중학생(1-3학년)':
        return '중학생';
      default:
        return division;
    }
  };

  // 상태값 변경 함수
  const updateStatus = async (setId: string, newStatus: '검수완료' | '승인완료') => {
    try {
      const response = await fetch('/api/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          setId,
          status: newStatus
        }),
      });

      const result = await response.json();

      if (result.success) {
        await fetchDataSets();
      } else {
        console.error('상태 변경 실패:', result);
        const errorMessage = result.details ?
          `${result.error}\n\n상세 정보: ${result.details}` :
          result.error || '상태 변경에 실패했습니다.';
        alert(errorMessage);
      }
    } catch (error) {
      console.error('상태 변경 오류:', error);
      alert('상태 변경 중 오류가 발생했습니다.');
    }
  };

  // 전체 선택/해제 토글
  const toggleSelectAll = () => {
    if (selectedSets.size === paginatedData.length) {
      setSelectedSets(new Set());
    } else {
      const newSelected = new Set<string>();
      paginatedData.forEach(item => {
        const id = item.id || item.setId;
        if (id) newSelected.add(id);
      });
      setSelectedSets(newSelected);
    }
  };

  // 개별 항목 선택 토글
  const toggleSelectItem = (itemId: string) => {
    const newSelected = new Set(selectedSets);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedSets(newSelected);
  };

  // 일괄 HTML 다운로드
  const handleBatchHtmlDownload = async () => {
    if (selectedSets.size === 0) {
      alert('다운로드할 콘텐츠를 선택해주세요.');
      return;
    }

    const selectedCount = selectedSets.size;
    if (!confirm(`선택한 ${selectedCount}개의 콘텐츠를 HTML로 다운로드하시겠습니까?`)) {
      return;
    }

    setBatchOperation({ loading: true, type: 'download' });
    try {
      let successCount = 0;
      let failCount = 0;

      for (const setId of Array.from(selectedSets)) {
        try {
          // 1. 세트 상세 정보 가져오기
          const response = await fetch(`/api/get-set-details-supabase?setId=${setId}`);
          const result = await response.json();

          if (!result.success || !result.data) {
            failCount++;
            continue;
          }

          // 2. 시각자료 가져오기 (session_number가 있는 경우) - 표시 상태인 이미지만
          let visualMaterials = [];
          if (result.data.contentSet.session_number) {
            const imageResponse = await fetch(
              `/api/images?session_number=${encodeURIComponent(result.data.contentSet.session_number)}&visible_only=true`
            );
            const imageResult = await imageResponse.json();
            if (imageResult.success) {
              visualMaterials = imageResult.data || [];
            }
          }

          // 3. passages 데이터 변환 (DB 형식 → UI 형식)
          const passages = (result.data.passages || []).map((p: any) => ({
            id: p.id,
            title: p.title,
            paragraphs: [
              p.paragraph_1, p.paragraph_2, p.paragraph_3,
              p.paragraph_4, p.paragraph_5, p.paragraph_6,
              p.paragraph_7, p.paragraph_8, p.paragraph_9,
              p.paragraph_10
            ].filter((para: string | null | undefined) => para && para.trim() !== ''),
            passage_number: p.passage_number
          }));

          // 4. HTML 생성
          const htmlContent = generateHtmlV2({
            contentSet: result.data.contentSet,
            passages,
            passage: result.data.passage,
            vocabularyTerms: result.data.vocabularyTerms || [],
            vocabularyQuestions: result.data.vocabularyQuestions || [],
            paragraphQuestions: result.data.paragraphQuestions || [],
            comprehensiveQuestions: result.data.comprehensiveQuestions || [],
            introductionQuestion: result.data.introductionQuestion || '',
            visualMaterials
          });

          // 5. 다운로드
          const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          const gradePrefix = result.data.contentSet.grade_number
            ? `${result.data.contentSet.grade_number}_`
            : '';
          const sessionPrefix = result.data.contentSet.session_number
            ? `${result.data.contentSet.session_number}차시_`
            : '';
          link.download = `${gradePrefix}${sessionPrefix}${setId}.html`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          successCount++;
          // 브라우저가 다운로드를 처리할 시간을 주기 위한 짧은 지연
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
          console.error(`세트 ${setId} 다운로드 실패:`, error);
          failCount++;
        }
      }

      setSelectedSets(new Set());

      if (failCount === 0) {
        alert(`${successCount}개의 HTML 파일이 성공적으로 다운로드되었습니다.`);
      } else {
        alert(`${successCount}개 다운로드 성공, ${failCount}개 다운로드 실패`);
      }
    } catch (error) {
      console.error('일괄 HTML 다운로드 중 오류:', error);
      alert('일괄 HTML 다운로드 중 오류가 발생했습니다.');
    } finally {
      setBatchOperation({ loading: false, type: null });
    }
  };

  return (
    <RoleAuthGuard allowedRoles={['admin', 'reviewer']}>
      <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 페이지 헤더 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">콘텐츠세트 검수</h1>
          <p className="mt-2 text-sm text-gray-600">
            검수완료 및 승인완료 상태의 콘텐츠를 확인하고 수정할 수 있습니다.
          </p>
        </div>

        {/* 통계 카드 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-xl font-bold text-blue-600">{filteredDataSets.length}</div>
              <div className="text-xs text-gray-600">
                검수 대상 콘텐츠
                {filters.excludeOldSessions && <span className="text-gray-400 ml-1">(1000+)</span>}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-xl font-bold text-green-600">
                {filteredDataSets.filter(d => d.status === '검수완료').length}
              </div>
              <div className="text-xs text-gray-600">검수완료</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-xl font-bold text-blue-600">
                {filteredDataSets.filter(d => d.status === '승인완료').length}
              </div>
              <div className="text-xs text-gray-600">승인완료</div>
            </div>
          </div>
        )}

        {/* 필터 및 검색 */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">과목</label>
              <select
                value={filters.subject}
                onChange={(e) => setFilters(prev => ({ ...prev, subject: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">전체</option>
                {allOptions.subjects.map(subject => (
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
                {allOptions.grades.map(grade => (
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
                {allOptions.areas.map(area => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">차시</label>
              <input
                type="text"
                placeholder="차시 번호 입력 (예: 1029) 또는 '없음'"
                value={filters.session}
                onChange={(e) => setFilters(prev => ({ ...prev, session: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {/* 1000차시 이전 제외 체크박스 */}
              <label className="flex items-center mt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.excludeOldSessions}
                  onChange={(e) => setFilters(prev => ({ ...prev, excludeOldSessions: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-xs text-gray-600">
                  1000차시 이전 제외
                </span>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">상태</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="검수완료,승인완료">검수완료+승인완료</option>
                <option value="검수완료">검수완료</option>
                <option value="승인완료">승인완료</option>
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">검색</label>
            <input
              type="text"
              placeholder="ID, 제목, 주제, 키워드 검색..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              {filteredDataSets.length}개의 콘텐츠 세트
            </p>
            <button
              onClick={() => setFilters({ subject: '', grade: '', area: '', session: '', user: '', status: '검수완료,승인완료', search: '', excludeOldSessions: true })}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              필터 초기화
            </button>
          </div>
        </div>

        {/* 일괄 작업 버튼 */}
        {selectedSets.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-blue-900">
                {selectedSets.size}개 항목 선택됨
              </span>
              <button
                onClick={() => setSelectedSets(new Set())}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                선택 해제
              </button>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleBatchHtmlDownload}
                disabled={batchOperation.loading}
                className="px-4 py-2 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {batchOperation.loading && batchOperation.type === 'download' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>다운로드 중...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>일괄 HTML 다운로드</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

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
            <p className="text-gray-600">
              검수 대상 콘텐츠가 없습니다.
            </p>
          </div>
        ) : (
          <>
            {/* 테이블 */}
            <div className="bg-white rounded-lg shadow overflow-hidden overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-3 text-left w-10">
                      <input
                        type="checkbox"
                        checked={paginatedData.length > 0 && selectedSets.size === paginatedData.length}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      생성일
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      차시
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상태
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
                      문제 수
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedData.map((item) => {
                    const itemId = item.id || item.setId || '';
                    return (
                    <tr key={itemId} className="hover:bg-gray-50">
                      <td className="px-2 py-3">
                        <input
                          type="checkbox"
                          checked={selectedSets.has(itemId)}
                          onChange={() => toggleSelectItem(itemId)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-2 py-3 text-xs text-gray-500 text-center">
                        <div className="leading-tight space-y-0.5">
                          <div className="font-medium">{formatDate(item.createdAt).datePart}</div>
                          <div className="text-gray-400">{formatDate(item.createdAt).timePart}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.session_number
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {item.session_number ? `${item.session_number}${item.grade_number ? ` (${item.grade_number})` : ''}` : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                        <button
                          onClick={() => {
                            const fullId = item.id || item.setId || '';
                            navigator.clipboard.writeText(fullId);
                            alert('ID가 클립보드에 복사되었습니다.');
                          }}
                          className="font-mono text-xs hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                          title={item.id || item.setId || ''}
                        >
                          {(item.id || item.setId || '').slice(0, 8)}...
                        </button>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
                        <button
                          onClick={() => {
                            const currentStatus = item.status;
                            const newStatus = currentStatus === '검수완료' ? '승인완료' : '검수완료';
                            const setId = item.id || item.setId;
                            if (setId) {
                              updateStatus(setId, newStatus);
                            }
                          }}
                          className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full cursor-pointer transition-all hover:shadow-md ${
                            item.status === '승인완료'
                              ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                              : 'bg-green-100 text-green-800 hover:bg-green-200'
                          }`}
                          title={`클릭하여 '${item.status === '검수완료' ? '승인완료' : '검수완료'}'로 변경`}
                        >
                          {item.status}
                        </button>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.subject}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDivision(item.division)}
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
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                        <div className="flex flex-col text-xs">
                          <span>어휘: {item.vocabularyQuestionCount || 0}</span>
                          <span>지문: {item.total_paragraph_questions || 0}</span>
                          <span>종합: {item.comprehensiveQuestionCount || 0}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center justify-center">
                          {/* 수정 */}
                          <button
                            onClick={() => {
                              const setId = item.id || item.setId;
                              if (setId) {
                                setEditModal({ isOpen: true, contentSetId: setId });
                              }
                            }}
                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1 rounded transition-colors"
                            title="수정"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                  })}
                </tbody>
              </table>
            </div>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-4 rounded-lg shadow">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    이전
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    다음
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">{startIndex + 1}</span>
                      -
                      <span className="font-medium">{Math.min(startIndex + itemsPerPage, filteredDataSets.length)}</span>
                      개 (총
                      <span className="font-medium"> {filteredDataSets.length}</span>
                      개)
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        이전
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).slice(
                        Math.max(0, currentPage - 3),
                        Math.min(totalPages, currentPage + 2)
                      ).map(page => (
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
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 콘텐츠 수정 모달 */}
      {editModal.isOpen && (
        <ContentEditModal
          isOpen={editModal.isOpen}
          contentSetId={editModal.contentSetId}
          onClose={() => {
            setEditModal({ isOpen: false, contentSetId: '' });
            fetchDataSets(); // 모달 닫을 때 데이터 새로고침
          }}
        />
      )}
      </div>
    </RoleAuthGuard>
  );
}