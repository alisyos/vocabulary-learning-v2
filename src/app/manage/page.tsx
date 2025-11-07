'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import RoleAuthGuard from '@/components/RoleAuthGuard';
import { generateHtmlV2 } from '@/lib/htmlGeneratorV2';

interface DataSet {
  id: string; // UUID
  title: string; // passageTitle -> title
  grade: string;
  subject: string;
  area: string;
  session_number?: string | null; // 차시 번호
  grade_number?: string | null; // 과목 넘버
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
  status?: '검수 전' | '1차검수' | '2차검수' | '3차검수' | '4차검수' | '검수완료' | '승인완료';
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
  const [selectedSets, setSelectedSets] = useState<Set<string>>(new Set());

  // 복사 완료 알림 상태
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // 필터 상태
  const [filters, setFilters] = useState({
    subject: '',
    grade: '',
    area: '',
    session: '', // 차시 필터 추가
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

  // 일괄 작업 상태
  const [batchOperation, setBatchOperation] = useState<{
    loading: boolean;
    type: 'delete' | 'duplicate' | 'status' | null;
  }>({ loading: false, type: null });

  // 일괄 상태값 변경 모달 상태
  const [statusModal, setStatusModal] = useState<{
    isOpen: boolean;
    selectedStatus: string;
  }>({ isOpen: false, selectedStatus: '' });
  
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
  
  // 전체 필터링 (과목, 학년, 영역, 차시, 사용자, 검색)
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

    // 차시 필터 (완전 일치 검색 + 범위 검색)
    if (filters.session) {
      // "없음" 또는 "null" 입력 시 차시 정보가 없는 항목만 표시
      if (filters.session === '없음' || filters.session.toLowerCase() === 'null') {
        if (item.session_number) {
          return false;
        }
      } else {
        // 범위 검색: "50~55" 형태
        const rangeMatch = filters.session.match(/^(\d+)\s*[~-]\s*(\d+)$/);
        if (rangeMatch) {
          const startSession = parseInt(rangeMatch[1], 10);
          const endSession = parseInt(rangeMatch[2], 10);
          const currentSession = parseInt(String(item.session_number || ''), 10);

          // 범위 내에 없으면 필터링
          if (isNaN(currentSession) || currentSession < startSession || currentSession > endSession) {
            return false;
          }
        } else {
          // 일반 완전 일치 검색
          if (String(item.session_number) !== filters.session) {
            return false;
          }
        }
      }
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
        // 콘텐츠 세트 ID로 검색 (UUID 부분 일치 또는 전체 일치)
        (item.id || '').toLowerCase().includes(searchTerm) ||
        // 기존 검색 필드들
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
  
  // 세트 ID 복사 함수
  const copySetId = async (setId: string) => {
    try {
      await navigator.clipboard.writeText(setId);
      setCopiedId(setId);

      // 2초 후 복사 완료 표시 제거
      setTimeout(() => {
        setCopiedId(null);
      }, 2000);
    } catch (err) {
      console.error('클립보드 복사 실패:', err);
      alert('ID 복사에 실패했습니다.');
    }
  };

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
  const updateStatus = async (setId: string, newStatus: '검수 전' | '1차검수' | '2차검수' | '3차검수' | '4차검수' | '검수완료' | '승인완료', showAlert: boolean = true) => {
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
  const openDeleteModal = (setId: string, title: string, status: '검수 전' | '1차검수' | '2차검수' | '3차검수' | '4차검수' | '검수완료' | '승인완료') => {
    if (status !== '검수 전') {
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

  // 일괄 삭제
  const handleBatchDelete = async () => {
    if (selectedSets.size === 0) {
      alert('삭제할 콘텐츠를 선택해주세요.');
      return;
    }

    // 선택된 항목들의 상태 확인
    const selectedItems = dataSets.filter(item => {
      const id = item.id || item.setId;
      return selectedSets.has(id);
    });

    const nonDeletableItems = selectedItems.filter(item => item.status !== '검수 전');
    if (nonDeletableItems.length > 0) {
      alert('"검수 전" 상태가 아닌 콘텐츠가 포함되어 있습니다.\n"검수 전" 상태의 콘텐츠만 삭제할 수 있습니다.');
      return;
    }

    if (!confirm(`선택한 ${selectedSets.size}개의 콘텐츠를 정말 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    setBatchOperation({ loading: true, type: 'delete' });
    try {
      const deletePromises = Array.from(selectedSets).map(setId =>
        fetch(`/api/delete-set?setId=${setId}`, { method: 'DELETE' })
      );

      const results = await Promise.all(deletePromises);
      const jsonResults = await Promise.all(results.map(r => r.json()));

      const successCount = jsonResults.filter(r => r.success).length;
      const failCount = jsonResults.filter(r => !r.success).length;

      await fetchDataSets();
      setSelectedSets(new Set());

      if (failCount === 0) {
        alert(`${successCount}개의 콘텐츠가 성공적으로 삭제되었습니다.`);
      } else {
        alert(`${successCount}개 삭제 성공, ${failCount}개 삭제 실패`);
      }
    } catch (error) {
      console.error('일괄 삭제 중 오류:', error);
      alert('일괄 삭제 중 오류가 발생했습니다.');
    } finally {
      setBatchOperation({ loading: false, type: null });
    }
  };

  // 일괄 복제
  const handleBatchDuplicate = async () => {
    if (selectedSets.size === 0) {
      alert('복제할 콘텐츠를 선택해주세요.');
      return;
    }

    if (!confirm(`선택한 ${selectedSets.size}개의 콘텐츠를 복제하시겠습니까?`)) {
      return;
    }

    setBatchOperation({ loading: true, type: 'duplicate' });
    try {
      const response = await fetch('/api/duplicate-sets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          setIds: Array.from(selectedSets),
        }),
      });

      const result = await response.json();

      if (result.success) {
        await fetchDataSets();
        setSelectedSets(new Set());
        alert(`${result.duplicatedCount}개의 콘텐츠가 성공적으로 복제되었습니다.`);
      } else {
        alert(result.error || '복제에 실패했습니다.');
      }
    } catch (error) {
      console.error('일괄 복제 중 오류:', error);
      alert('일괄 복제 중 오류가 발생했습니다.');
    } finally {
      setBatchOperation({ loading: false, type: null });
    }
  };

  // 일괄 상태값 변경 모달 열기
  const openStatusModal = () => {
    if (selectedSets.size === 0) {
      alert('상태를 변경할 콘텐츠를 선택해주세요.');
      return;
    }
    setStatusModal({ isOpen: true, selectedStatus: '검수 전' });
  };

  // 일괄 상태값 변경 모달 닫기
  const closeStatusModal = () => {
    setStatusModal({ isOpen: false, selectedStatus: '' });
  };

  // 일괄 상태값 변경
  const handleBatchStatusChange = async () => {
    if (!statusModal.selectedStatus) {
      alert('상태를 선택해주세요.');
      return;
    }

    setBatchOperation({ loading: true, type: 'status' });
    try {
      const response = await fetch('/api/batch-update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          setIds: Array.from(selectedSets),
          status: statusModal.selectedStatus,
        }),
      });

      const result = await response.json();

      if (result.success) {
        await fetchDataSets();
        setSelectedSets(new Set());
        closeStatusModal();
        alert(`${result.updatedCount}개의 콘텐츠 상태가 '${statusModal.selectedStatus}'로 변경되었습니다.`);
      } else {
        alert(result.error || '상태 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('일괄 상태 변경 중 오류:', error);
      alert('일괄 상태 변경 중 오류가 발생했습니다.');
    } finally {
      setBatchOperation({ loading: false, type: null });
    }
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

          // 2. 시각자료 가져오기 (session_number가 있는 경우)
          let visualMaterials = [];
          if (result.data.contentSet.session_number) {
            const imageResponse = await fetch(
              `/api/images?session_number=${encodeURIComponent(result.data.contentSet.session_number)}`
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
          {/* 첫 번째 줄: 과목, 학년, 영역, 차시 */}
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
              <label className="block text-sm font-medium text-gray-700 mb-2">차시</label>
              <input
                type="text"
                placeholder="예: 29 또는 50~55 또는 '없음'"
                value={filters.session}
                onChange={(e) => setFilters(prev => ({ ...prev, session: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                범위 검색: 50~55 또는 50-55
              </p>
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
                <option value="1차검수">1차검수</option>
                <option value="2차검수">2차검수</option>
                <option value="3차검수">3차검수</option>
                <option value="4차검수">4차검수</option>
                <option value="검수완료">검수완료</option>
                <option value="승인완료">승인완료</option>
                <option value="복제">복제</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">통합 검색</label>
              <input
                type="text"
                placeholder="제목, 주제, 키워드, 콘텐츠 세트 ID 검색..."
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
              onClick={() => setFilters({ subject: '', grade: '', area: '', session: '', user: '', status: '', search: '' })}
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
                onClick={handleBatchDuplicate}
                disabled={batchOperation.loading}
                className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {batchOperation.loading && batchOperation.type === 'duplicate' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>복제 중...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>일괄 복제</span>
                  </>
                )}
              </button>
              <button
                onClick={openStatusModal}
                disabled={batchOperation.loading}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {batchOperation.loading && batchOperation.type === 'status' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>상태 변경 중...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>일괄 상태변경</span>
                  </>
                )}
              </button>
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
              <button
                onClick={handleBatchDelete}
                disabled={batchOperation.loading}
                className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {batchOperation.loading && batchOperation.type === 'delete' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>삭제 중...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>일괄 삭제</span>
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
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-1 py-2 text-left w-8">
                      <input
                        type="checkbox"
                        checked={paginatedData.length > 0 && selectedSets.size === paginatedData.length}
                        indeterminate={selectedSets.size > 0 && selectedSets.size < paginatedData.length}
                        onChange={toggleSelectAll}
                        className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-1 py-2 text-left text-[11px] font-medium text-gray-500 uppercase">
                      생성일
                    </th>
                    <th className="px-1 py-2 text-left text-[11px] font-medium text-gray-500 uppercase">
                      차시
                    </th>
                    <th className="px-1 py-2 text-left text-[11px] font-medium text-gray-500 uppercase">
                      과목
                    </th>
                    <th className="px-1 py-2 text-left text-[11px] font-medium text-gray-500 uppercase">
                      생성자
                    </th>
                    <th className="px-1 py-2 text-left text-[11px] font-medium text-gray-500 uppercase">
                      구분
                    </th>
                    <th className="px-1 py-2 text-left text-[11px] font-medium text-gray-500 uppercase">
                      학년
                    </th>
                    <th className="px-1 py-2 text-left text-[11px] font-medium text-gray-500 uppercase">
                      영역
                    </th>
                    <th className="px-1 py-2 text-left text-[11px] font-medium text-gray-500 uppercase max-w-[80px]">
                      대주제
                    </th>
                    <th className="px-1 py-2 text-left text-[11px] font-medium text-gray-500 uppercase max-w-[80px]">
                      소주제
                    </th>
                    <th className="px-1 py-2 text-center text-[11px] font-medium text-gray-500 uppercase">
                      문단
                    </th>
                    <th className="px-1 py-2 text-center text-[11px] font-medium text-gray-500 uppercase">
                      어휘
                    </th>
                    <th className="px-1 py-2 text-center text-[11px] font-medium text-gray-500 uppercase">
                      어휘<br/>문제
                    </th>
                    <th className="px-1 py-2 text-center text-[11px] font-medium text-gray-500 uppercase">
                      문단<br/>문제
                    </th>
                    <th className="px-1 py-2 text-center text-[11px] font-medium text-gray-500 uppercase">
                      종합<br/>문제
                    </th>
                    <th className="px-1 py-2 text-center text-[11px] font-medium text-gray-500 uppercase">
                      상태값
                    </th>
                    <th className="px-1 py-2 text-center text-[11px] font-medium text-gray-500 uppercase">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedData.map((item) => {
                    const itemId = item.id || item.setId;
                    return (
                    <tr key={itemId} className="hover:bg-gray-50">
                      <td className="px-1 py-2">
                        <input
                          type="checkbox"
                          checked={selectedSets.has(itemId)}
                          onChange={() => toggleSelectItem(itemId)}
                          className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-1 py-2 text-[11px] text-gray-500 text-center">
                        <div className="leading-tight space-y-0.5">
                          <div className="font-medium">{formatDate(item.createdAt).datePart}</div>
                          <div className="text-gray-400">{formatDate(item.createdAt).timePart}</div>
                        </div>
                      </td>
                      <td className="px-1 py-2 text-[11px] text-center">
                        <span className={`inline-flex items-center px-1 py-0.5 rounded text-[10px] font-medium ${
                          item.session_number
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {item.session_number || '-'}
                        </span>
                      </td>
                      <td className="px-1 py-2 text-[11px] text-gray-900">
                        {item.subject}
                      </td>
                      <td className="px-1 py-2 text-[11px] text-gray-600">
                        {item.userId || '-'}
                      </td>
                      <td className="px-1 py-2 text-[11px] text-gray-900">
                        {formatDivision(item.division)}
                      </td>
                      <td className="px-1 py-2 text-[11px] text-gray-900">
                        {item.grade}
                      </td>
                      <td className="px-1 py-2 text-[11px] text-gray-900">
                        {item.area}
                      </td>
                      <td className="px-1 py-2 text-[11px] text-gray-900 max-w-[80px]">
                        <div className="break-words line-clamp-2" title={item.mainTopic || item.maintopic}>
                          {item.mainTopic || item.maintopic}
                        </div>
                      </td>
                      <td className="px-1 py-2 text-[11px] text-gray-900 max-w-[80px]">
                        <div className="break-words line-clamp-2" title={item.subTopic || item.subtopic}>
                          {item.subTopic || item.subtopic}
                        </div>
                      </td>
                      <td className="px-1 py-2 text-[11px] text-gray-900 text-center">
                        {item.paragraphCount}
                      </td>
                      <td className="px-1 py-2 text-[11px] text-gray-900 text-center">
                        {item.vocabularyWordsCount}
                      </td>
                      <td className="px-1 py-2 text-[11px] text-purple-600 text-center">
                        {editingCell?.setId === item.setId && editingCell?.field === 'vocabularyQuestionCount' ? (
                          <div className="flex items-center justify-center space-x-1">
                            <input
                              type="number"
                              value={editingCell.value}
                              onChange={(e) => setEditingCell(prev => prev ? {...prev, value: e.target.value} : null)}
                              className="w-10 px-1 py-0.5 text-[11px] border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEditing();
                                if (e.key === 'Escape') cancelEditing();
                              }}
                              autoFocus
                            />
                            <button
                              onClick={saveEditing}
                              className="text-green-600 hover:text-green-800 text-[11px]"
                              title="저장"
                            >
                              ✓
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="text-red-600 hover:text-red-800 text-[11px]"
                              title="취소"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <span
                            onClick={() => startEditing(item.setId, 'vocabularyQuestionCount', item.vocabularyQuestionCount || item.vocabularyCount || 0)}
                            className="cursor-pointer hover:bg-purple-50 px-1 py-0.5 rounded transition-colors"
                            title="클릭하여 수정"
                          >
                            {item.vocabularyQuestionCount || item.vocabularyCount || 0}
                          </span>
                        )}
                      </td>
                      <td className="px-1 py-2 text-[11px] text-yellow-600 text-center">
                        {item.total_paragraph_questions || 0}
                      </td>
                      <td className="px-1 py-2 text-[11px] text-green-600 text-center">
                        {editingCell?.setId === item.setId && editingCell?.field === 'comprehensiveQuestionCount' ? (
                          <div className="flex items-center justify-center space-x-1">
                            <input
                              type="number"
                              value={editingCell.value}
                              onChange={(e) => setEditingCell(prev => prev ? {...prev, value: e.target.value} : null)}
                              className="w-10 px-1 py-0.5 text-[11px] border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEditing();
                                if (e.key === 'Escape') cancelEditing();
                              }}
                              autoFocus
                            />
                            <button
                              onClick={saveEditing}
                              className="text-green-600 hover:text-green-800 text-[11px]"
                              title="저장"
                            >
                              ✓
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="text-red-600 hover:text-red-800 text-[11px]"
                              title="취소"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <span
                            onClick={() => startEditing(item.setId, 'comprehensiveQuestionCount', item.comprehensiveQuestionCount || item.comprehensiveCount || 0)}
                            className="cursor-pointer hover:bg-green-50 px-1 py-0.5 rounded transition-colors"
                            title="클릭하여 수정"
                          >
                            {item.comprehensiveQuestionCount || item.comprehensiveCount || 0}
                          </span>
                        )}
                      </td>
                      <td className="px-1 py-2 text-[11px] text-center">
                        {editingCell?.setId === item.setId && editingCell?.field === 'status' ? (
                          <div className="flex items-center justify-center space-x-1">
                            <select
                              value={editingCell.value}
                              onChange={(e) => setEditingCell(prev => prev ? {...prev, value: e.target.value} : null)}
                              className="px-1 py-0.5 text-[10px] border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEditing();
                                if (e.key === 'Escape') cancelEditing();
                              }}
                              autoFocus
                            >
                              <option value="검수 전">검수 전</option>
                              <option value="1차검수">1차검수</option>
                              <option value="2차검수">2차검수</option>
                              <option value="3차검수">3차검수</option>
                              <option value="4차검수">4차검수</option>
                              <option value="검수완료">검수완료</option>
                              <option value="승인완료">승인완료</option>
                            </select>
                            <button
                              onClick={saveEditing}
                              className="text-green-600 hover:text-green-800 text-[11px]"
                              title="저장"
                            >
                              ✓
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="text-red-600 hover:text-red-800 text-[11px]"
                              title="취소"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <span
                            onClick={() => startEditing(item.setId, 'status', item.status)}
                            className={`inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded-full cursor-pointer hover:opacity-80 transition-opacity ${
                              item.status === '승인완료'
                                ? 'bg-blue-100 text-blue-800'
                                : item.status === '검수완료'
                                ? 'bg-green-100 text-green-800'
                                : item.status === '4차검수'
                                ? 'bg-teal-100 text-teal-800'
                                : item.status === '3차검수'
                                ? 'bg-indigo-100 text-indigo-800'
                                : item.status === '2차검수'
                                ? 'bg-purple-100 text-purple-800'
                                : item.status === '1차검수'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                            title="클릭하여 수정"
                          >
                            {item.status}
                          </span>
                        )}
                      </td>
                      <td className="px-1 py-2 text-[11px] font-medium">
                        <div className="flex items-center justify-center space-x-1">
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
                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-0.5 rounded transition-colors"
                            title="상세보기"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>

                          {/* 세트 ID 복사 아이콘 */}
                          <button
                            onClick={() => copySetId(item.id || item.setId)}
                            className={`p-0.5 rounded transition-colors ${
                              copiedId === (item.id || item.setId)
                                ? 'text-green-600 hover:text-green-800 hover:bg-green-50'
                                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                            }`}
                            title={copiedId === (item.id || item.setId) ? '복사됨!' : '세트 ID 복사'}
                          >
                            {copiedId === (item.id || item.setId) ? (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            )}
                          </button>

                          {/* 상태 변경 아이콘 */}
                          <button
                            onClick={() => {
                              let newStatus: '검수 전' | '1차검수' | '2차검수' | '3차검수' | '4차검수' | '검수완료' | '승인완료';
                              if (item.status === '검수 전') {
                                newStatus = '1차검수';
                              } else if (item.status === '1차검수') {
                                newStatus = '2차검수';
                              } else if (item.status === '2차검수') {
                                newStatus = '3차검수';
                              } else if (item.status === '3차검수') {
                                newStatus = '4차검수';
                              } else if (item.status === '4차검수') {
                                newStatus = '검수완료';
                              } else if (item.status === '검수완료') {
                                newStatus = '승인완료';
                              } else {
                                newStatus = '검수 전';
                              }
                              updateStatus(item.id || item.setId, newStatus, false);
                            }}
                            disabled={statusUpdating.setId === item.setId && statusUpdating.loading}
                            className="text-purple-600 hover:text-purple-800 hover:bg-purple-50 p-0.5 rounded transition-colors disabled:opacity-50"
                            title={item.status === '검수 전' ? '1차검수로 변경' : item.status === '1차검수' ? '2차검수로 변경' : item.status === '2차검수' ? '3차검수로 변경' : item.status === '3차검수' ? '4차검수로 변경' : item.status === '4차검수' ? '검수완료로 변경' : item.status === '검수완료' ? '승인완료로 변경' : '검수 전으로 변경'}
                          >
                            {statusUpdating.setId === item.setId && statusUpdating.loading ? (
                              <div className="w-3 h-3 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                          </button>

                          {/* 삭제 아이콘 */}
                          <button
                            onClick={() => openDeleteModal(item.id || item.setId, item.title || item.passageTitle, item.status)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50 p-0.5 rounded transition-colors"
                            title="삭제"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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

        {/* 상태값 변경 모달 */}
        {statusModal.isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900">일괄 상태값 변경</h3>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-3">
                  선택한 {selectedSets.size}개 콘텐츠의 상태를 변경합니다.
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">새로운 상태</label>
                  <select
                    value={statusModal.selectedStatus}
                    onChange={(e) => setStatusModal(prev => ({ ...prev, selectedStatus: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="검수 전">검수 전</option>
                    <option value="1차검수">1차검수</option>
                    <option value="2차검수">2차검수</option>
                    <option value="3차검수">3차검수</option>
                    <option value="4차검수">4차검수</option>
                    <option value="검수완료">검수완료</option>
                    <option value="승인완료">승인완료</option>
                    <option value="복제">복제</option>
                  </select>
                </div>
              </div>

              <div className="flex space-x-3 justify-end">
                <button
                  onClick={closeStatusModal}
                  disabled={batchOperation.loading}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50"
                >
                  취소
                </button>
                <button
                  onClick={handleBatchStatusChange}
                  disabled={batchOperation.loading || !statusModal.selectedStatus}
                  className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
                >
                  {batchOperation.loading && batchOperation.type === 'status' && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  )}
                  <span>{batchOperation.loading && batchOperation.type === 'status' ? '변경 중...' : '변경'}</span>
                </button>
              </div>
            </div>
          </div>
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