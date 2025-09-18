'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import RoleAuthGuard from '@/components/RoleAuthGuard';

interface DataSet {
  id: string; // UUID
  title: string; // passageTitle -> title
  grade: string;
  subject: string;
  area: string;
  total_passages: number;
  total_vocabulary_terms: number;
  total_vocabulary_questions: number;
  total_paragraph_questions: number;
  total_comprehensive_questions: number;
  created_at?: string;
  updated_at?: string;
  
  // API 필드들 (snake_case)
  user_id?: string;
  main_topic?: string;
  sub_topic?: string;
  
  // 계산된 필드들
  totalQuestions?: number;
  
  // 레거시 호환성을 위한 별칭들 (Google Sheets 데이터와 호환)
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



export default function ManagePage() {
  const [dataSets, setDataSets] = useState<DataSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ApiResponse['stats'] | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  
  // 필터 상태
  const [filters, setFilters] = useState({
    subject: '',
    grade: '',
    area: '',
    user: '',
    status: '',
    search: ''
  });
  
  // 페이지네이션
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  // 삭제 관련 상태
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    setId: string;
    title: string;
  }>({
    isOpen: false,
    setId: '',
    title: ''
  });
  const [deleting, setDeleting] = useState(false);
  
  // 상태 변경 관련 상태
  const [statusUpdating, setStatusUpdating] = useState<{
    setId: string;
    loading: boolean;
  }>({
    setId: '',
    loading: false
  });

  // 인라인 편집 상태 추가
  const [editingCell, setEditingCell] = useState<{
    setId: string;
    field: string;
    value: string;
  } | null>(null);
  
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
        // API에서 이미 변환된 데이터를 사용
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
  
  // 데이터 로드
  useEffect(() => {
    fetchDataSets();
  }, [fetchDataSets]);
  
  // 전체 필터링 (과목, 학년, 영역, 사용자, 검색)
  const filteredDataSets = dataSets.filter(item => {
    // 과목 필터
    if (filters.subject && item.subject !== filters.subject) {
      return false;
    }
    
    // 학년 필터
    if (filters.grade && item.grade !== filters.grade) {
      return false;
    }
    
    // 영역 필터
    if (filters.area && item.area !== filters.area) {
      return false;
    }
    
    // 사용자 필터
    if (filters.user && item.userId !== filters.user) {
      return false;
    }
    
    // 상태값 필터
    if (filters.status && item.status !== filters.status) {
      return false;
    }
    
    // 검색 필터
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      return (
        (item.title || item.passageTitle || '').toLowerCase().includes(searchTerm) ||
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
  
  // 날짜 포맷팅 (직접 포맷팅)
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

  // 인라인 편집 시작 함수
  const startEditing = (setId: string, field: string, currentValue: string | number) => {
    setEditingCell({
      setId,
      field,
      value: String(currentValue)
    });
  };

  // 인라인 편집 취소 함수
  const cancelEditing = () => {
    setEditingCell(null);
  };

  // 인라인 편집 저장 함수
  const saveEditing = async () => {
    if (!editingCell) return;

    try {
      if (editingCell.field === 'status') {
        // 상태값 변경은 기존 updateStatus API 사용 (알림 비활성화)
        await updateStatus(editingCell.setId, editingCell.value as '검수 전' | '검수완료' | '승인완료', false);
      } else {
        // 다른 필드들은 추후 별도 API 구현 예정
        console.log('업데이트 요청:', editingCell);
        
        // 임시로 로컬 상태 업데이트
        setDataSets(prev => prev.map(item => 
          item.setId === editingCell.setId 
            ? { ...item, [editingCell.field]: editingCell.field.includes('Count') ? Number(editingCell.value) : editingCell.value }
            : item
        ));
        
        alert('수정이 완료되었습니다.');
      }
      
      setEditingCell(null);
    } catch (error) {
      console.error('수정 중 오류:', error);
      alert('수정 중 오류가 발생했습니다.');
    }
  };

  // 상태값 변경 함수
  const updateStatus = async (setId: string, newStatus: '검수 전' | '검수완료' | '승인완료', showAlert: boolean = true) => {
    console.log('상태값 변경 요청:', { setId, newStatus, showAlert }); // 디버깅용 로그
    
    setStatusUpdating({ setId, loading: true });
    
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
      
      console.log('상태값 변경 응답:', result); // 디버깅용 로그
      
      if (result.success) {
        // 데이터 새로고침
        await fetchDataSets();
        if (showAlert) {
          alert(`상태가 '${newStatus}'로 변경되었습니다.`);
        }
      } else {
        alert(result.error || '상태 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('상태 변경 오류:', error);
      alert('상태 변경 중 오류가 발생했습니다.');
    } finally {
      setStatusUpdating({ setId: '', loading: false });
    }
  };

  // 삭제 모달 열기
  const openDeleteModal = (setId: string, title: string, status: '검수 전' | '검수완료' | '승인완료') => {
    if (status === '검수완료' || status === '승인완료') {
      alert(`${status} 상태의 콘텐츠는 삭제할 수 없습니다. 먼저 상태를 "검수 전"으로 변경해주세요.`);
      return;
    }
    
    setDeleteModal({
      isOpen: true,
      setId,
      title
    });
  };

  // 삭제 모달 닫기
  const closeDeleteModal = () => {
    setDeleteModal({
      isOpen: false,
      setId: '',
      title: ''
    });
  };

  // 콘텐츠 세트 삭제
  const handleDelete = async () => {
    if (!deleteModal.setId) return;
    
    console.log('삭제 요청 ID:', deleteModal.setId); // 디버깅용 로그
    
    setDeleting(true);
    try {
      const response = await fetch(`/api/delete-set?setId=${deleteModal.setId}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      console.log('삭제 응답:', result); // 디버깅용 로그
      
      if (result.success) {
        // 성공 시 데이터 새로고침
        await fetchDataSets();
        alert('콘텐츠 세트가 성공적으로 삭제되었습니다.');
        closeDeleteModal();
      } else {
        alert(`삭제 실패: ${result.error}`);
      }
    } catch (error) {
      console.error('삭제 중 오류:', error);
      alert('삭제 중 오류가 발생했습니다.');
    } finally {
      setDeleting(false);
    }
  };
  
  return (
    <RoleAuthGuard allowedRoles={['admin', 'user']}>
      <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 통계 카드 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-xl font-bold text-blue-600">{totalCount || stats?.totalSets || 0}</div>
              <div className="text-xs text-gray-600">총 콘텐츠 세트</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-xl font-bold text-indigo-600">
                {dataSets.reduce((sum, item) => sum + (item.vocabularyWordsCount || 0), 0)}
              </div>
              <div className="text-xs text-gray-600">어휘 수</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-xl font-bold text-purple-600">{stats.totalVocabularyQuestions}</div>
              <div className="text-xs text-gray-600">어휘 문제</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-xl font-bold text-yellow-600">{stats.totalParagraphQuestions || 0}</div>
              <div className="text-xs text-gray-600">문단 문제</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-xl font-bold text-green-600">{stats.totalComprehensiveQuestions}</div>
              <div className="text-xs text-gray-600">종합 문제</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-xl font-bold text-orange-600">
                {stats.totalVocabularyQuestions + (stats.totalParagraphQuestions || 0) + stats.totalComprehensiveQuestions}
              </div>
              <div className="text-xs text-gray-600">총 문제 수</div>
            </div>
          </div>
        )}
        
        {/* 필터 및 검색 */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          {/* 첫 번째 줄: 과목, 학년, 영역 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
          </div>

          {/* 두 번째 줄: 사용자, 상태값, 검색 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">사용자</label>
              <select
                value={filters.user}
                onChange={(e) => setFilters(prev => ({ ...prev, user: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">전체</option>
                <option value="song">song</option>
                <option value="user1">user1</option>
                <option value="user2">user2</option>
                <option value="user3">user3</option>
                <option value="user4">user4</option>
                <option value="user5">user5</option>
                <option value="ahn">ahn</option>
                <option value="test">test</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">상태값</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">전체</option>
                <option value="검수 전">검수 전</option>
                <option value="검수완료">검수완료</option>
                <option value="승인완료">승인완료</option>
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
              {filteredDataSets.length}개의 콘텐츠 세트 ({stats?.totalSets || 0}개 중)
            </p>
            <button
              onClick={() => setFilters({ subject: '', grade: '', area: '', user: '', status: '', search: '' })}
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
              {filters.search || filters.subject || filters.grade || filters.area || filters.user || filters.status
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
                      생성자
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
                      어휘문제
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      문단문제
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      종합문제
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상태값
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedData.map((item) => (
                    <tr key={item.setId} className="hover:bg-gray-50">
                      <td className="px-2 py-3 text-xs text-gray-500 text-center">
                        <div className="leading-tight space-y-0.5">
                          <div className="font-medium">{formatDate(item.createdAt).datePart}</div>
                          <div className="text-gray-400">{formatDate(item.createdAt).timePart}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.subject}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                        {item.userId || '-'}
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
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.paragraphCount}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.vocabularyWordsCount}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-purple-600">
                        {editingCell?.setId === item.setId && editingCell?.field === 'vocabularyQuestionCount' ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              value={editingCell.value}
                              onChange={(e) => setEditingCell(prev => prev ? {...prev, value: e.target.value} : null)}
                              className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEditing();
                                if (e.key === 'Escape') cancelEditing();
                              }}
                              autoFocus
                            />
                            <button
                              onClick={saveEditing}
                              className="text-green-600 hover:text-green-800 p-1"
                              title="저장"
                            >
                              ✓
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="text-red-600 hover:text-red-800 p-1"
                              title="취소"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <span 
                            onClick={() => startEditing(item.setId, 'vocabularyQuestionCount', item.vocabularyQuestionCount || item.vocabularyCount || 0)}
                            className="cursor-pointer hover:bg-purple-50 px-2 py-1 rounded transition-colors"
                            title="클릭하여 수정"
                          >
                            {item.vocabularyQuestionCount || item.vocabularyCount || 0}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-yellow-600">
                        {item.total_paragraph_questions || 0}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-green-600">
                        {editingCell?.setId === item.setId && editingCell?.field === 'comprehensiveQuestionCount' ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              value={editingCell.value}
                              onChange={(e) => setEditingCell(prev => prev ? {...prev, value: e.target.value} : null)}
                              className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEditing();
                                if (e.key === 'Escape') cancelEditing();
                              }}
                              autoFocus
                            />
                            <button
                              onClick={saveEditing}
                              className="text-green-600 hover:text-green-800 p-1"
                              title="저장"
                            >
                              ✓
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="text-red-600 hover:text-red-800 p-1"
                              title="취소"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <span 
                            onClick={() => startEditing(item.setId, 'comprehensiveQuestionCount', item.comprehensiveQuestionCount || item.comprehensiveCount || 0)}
                            className="cursor-pointer hover:bg-green-50 px-2 py-1 rounded transition-colors"
                            title="클릭하여 수정"
                          >
                            {item.comprehensiveQuestionCount || item.comprehensiveCount || 0}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
                        {editingCell?.setId === item.setId && editingCell?.field === 'status' ? (
                          <div className="flex items-center justify-center space-x-2">
                            <select
                              value={editingCell.value}
                              onChange={(e) => setEditingCell(prev => prev ? {...prev, value: e.target.value} : null)}
                              className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEditing();
                                if (e.key === 'Escape') cancelEditing();
                              }}
                              autoFocus
                            >
                              <option value="검수 전">검수 전</option>
                              <option value="검수완료">검수완료</option>
                              <option value="승인완료">승인완료</option>
                            </select>
                            <button
                              onClick={saveEditing}
                              className="text-green-600 hover:text-green-800 p-1"
                              title="저장"
                            >
                              ✓
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="text-red-600 hover:text-red-800 p-1"
                              title="취소"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <span 
                            onClick={() => startEditing(item.setId, 'status', item.status)}
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full cursor-pointer hover:opacity-80 transition-opacity ${
                              item.status === '승인완료'
                                ? 'bg-blue-100 text-blue-800'
                                : item.status === '검수완료'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                            title="클릭하여 수정"
                          >
                            {item.status}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center justify-center space-x-3">
                          {/* 상세보기 아이콘 */}
                          <button
                            onClick={() => {
                              const setId = item.id || item.setId;
                              console.log('상세보기 클릭:', { itemId: item.id, setId: item.setId, finalId: setId });
                              if (setId) {
                                window.open(`/manage/${setId}`, '_blank');
                              } else {
                                alert('콘텐츠 ID를 찾을 수 없습니다.');
                              }
                            }}
                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1 rounded transition-colors"
                            title="상세보기"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          
                          {/* 상태 변경 아이콘 */}
                          <button
                            onClick={() => {
                              let newStatus: '검수 전' | '검수완료' | '승인완료';
                              if (item.status === '검수 전') {
                                newStatus = '검수완료';
                              } else if (item.status === '검수완료') {
                                newStatus = '승인완료';
                              } else {
                                newStatus = '검수 전';
                              }
                              updateStatus(item.id || item.setId, newStatus, false);
                            }}
                            disabled={statusUpdating.setId === item.setId && statusUpdating.loading}
                            className="text-purple-600 hover:text-purple-800 hover:bg-purple-50 p-1 rounded transition-colors disabled:opacity-50"
                            title={item.status === '검수 전' ? '검수완료로 변경' : item.status === '검수완료' ? '승인완료로 변경' : '검수 전으로 변경'}
                          >
                            {statusUpdating.setId === item.setId && statusUpdating.loading ? (
                              <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                          </button>
                          
                          {/* 삭제 아이콘 */}
                          <button 
                            onClick={() => openDeleteModal(item.id || item.setId, item.title || item.passageTitle, item.status)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1 rounded transition-colors"
                            title="삭제"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
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

        {/* 삭제 확인 모달 */}
        {deleteModal.isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900">콘텐츠 삭제 확인</h3>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  다음 콘텐츠를 정말 삭제하시겠습니까?
                </p>
                <p className="text-sm font-medium text-gray-900 bg-gray-50 p-2 rounded">
                  {deleteModal.title}
                </p>
                <p className="text-xs text-red-600 mt-2">
                  ⚠️ 이 작업은 되돌릴 수 없습니다. 모든 관련 데이터가 완전히 삭제됩니다.
                </p>
              </div>
              
              <div className="flex space-x-3 justify-end">
                <button
                  onClick={closeDeleteModal}
                  disabled={deleting}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50"
                >
                  취소
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-4 py-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center space-x-2"
                >
                  {deleting && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  )}
                  <span>{deleting ? '삭제 중...' : '삭제'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </RoleAuthGuard>
  );
} 