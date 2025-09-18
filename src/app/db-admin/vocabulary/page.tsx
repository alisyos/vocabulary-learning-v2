'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import RoleAuthGuard from '@/components/RoleAuthGuard';

interface VocabularyTerm {
  id: string;
  content_set_id: string;
  term: string;
  definition: string;
  example_sentence: string | null;
  has_question_generated: boolean;
  passage_id?: string;
  passage_number?: number;
  passage_title?: string;
  created_at: string;
  // 추가 정보
  content_set_title?: string;
  grade?: string;
  subject?: string;
  area?: string;
  main_topic?: string;
  sub_topic?: string;
  keywords?: string;
  user_id?: string;
}

export default function VocabularyDBPage() {
  const [vocabularyTerms, setVocabularyTerms] = useState<VocabularyTerm[]>([]);
  const [filteredTerms, setFilteredTerms] = useState<VocabularyTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<Partial<VocabularyTerm>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'core' | 'difficult'>('all');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const [selectedTerms, setSelectedTerms] = useState<Set<string>>(new Set());
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [regeneratedTerms, setRegeneratedTerms] = useState<any[]>([]);
  const [regenerating, setRegenerating] = useState(false);

  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    fetchVocabularyTerms();
  }, []);

  useEffect(() => {
    filterTerms();
  }, [vocabularyTerms, searchQuery, filterType, selectedGrade, selectedSubject, selectedArea, selectedUserId]);

  const fetchVocabularyTerms = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/vocabulary-terms');
      if (!response.ok) throw new Error('Failed to fetch');
      
      const data = await response.json();
      setVocabularyTerms(data.terms || []);
    } catch (error) {
      console.error('Error fetching vocabulary terms:', error);
      alert('어휘 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const filterTerms = () => {
    let filtered = [...vocabularyTerms];

    // 검색어 필터
    if (searchQuery) {
      filtered = filtered.filter(term => 
        term.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
        term.definition.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (term.example_sentence && term.example_sentence.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // 유형 필터
    if (filterType === 'core') {
      filtered = filtered.filter(term => term.has_question_generated === true);
    } else if (filterType === 'difficult') {
      filtered = filtered.filter(term => term.has_question_generated === false);
    }

    // 학년 필터
    if (selectedGrade !== 'all') {
      filtered = filtered.filter(term => term.grade === selectedGrade);
    }

    // 과목 필터
    if (selectedSubject !== 'all') {
      filtered = filtered.filter(term => term.subject === selectedSubject);
    }

    // 영역 필터
    if (selectedArea !== 'all') {
      filtered = filtered.filter(term => term.area === selectedArea);
    }

    // 생성자 필터
    if (selectedUserId !== 'all') {
      filtered = filtered.filter(term => term.user_id === selectedUserId);
    }

    setFilteredTerms(filtered);
    setCurrentPage(1);
  };

  const handleEdit = (term: VocabularyTerm) => {
    setEditingId(term.id);
    setEditingData({
      term: term.term,
      definition: term.definition,
      example_sentence: term.example_sentence,
      has_question_generated: term.has_question_generated
    });
  };

  const handleSave = async (id: string) => {
    try {
      const response = await fetch(`/api/vocabulary-terms/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingData)
      });

      if (!response.ok) throw new Error('Failed to update');

      // 로컬 상태 업데이트
      setVocabularyTerms(prev => 
        prev.map(term => 
          term.id === id 
            ? { ...term, ...editingData }
            : term
        )
      );
      
      setEditingId(null);
      setEditingData({});
      alert('수정이 완료되었습니다.');
    } catch (error) {
      console.error('Error updating term:', error);
      alert('수정에 실패했습니다.');
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditingData({});
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말로 이 어휘를 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/vocabulary-terms/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete');

      setVocabularyTerms(prev => prev.filter(term => term.id !== id));
      alert('삭제가 완료되었습니다.');
    } catch (error) {
      console.error('Error deleting term:', error);
      alert('삭제에 실패했습니다.');
    }
  };

  // 선택 관련 함수들
  const handleSelectTerm = (termId: string, checked: boolean) => {
    const newSelected = new Set(selectedTerms);
    if (checked) {
      newSelected.add(termId);
    } else {
      newSelected.delete(termId);
    }
    setSelectedTerms(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(paginatedTerms.map(term => term.id));
      setSelectedTerms(allIds);
    } else {
      setSelectedTerms(new Set());
    }
  };

  const handleDownloadSelected = () => {
    if (selectedTerms.size === 0) {
      alert('다운로드할 어휘를 선택해주세요.');
      return;
    }

    const selectedData = vocabularyTerms.filter(term => selectedTerms.has(term.id));
    downloadCSV(selectedData);
  };

  const downloadCSV = (data: VocabularyTerm[]) => {
    const headers = [
      'id', 
      'grade', 
      'subject', 
      'area', 
      'main_topic', 
      'sub_topic', 
      'keywords',
      'term', 
      'definition', 
      'example_sentence', 
      'has_question_generated'
    ];
    const csvContent = [
      headers.join(','),
      ...data.map(term => [
        term.id,
        `"${(term.grade || '').replace(/"/g, '""')}"`,
        `"${(term.subject || '').replace(/"/g, '""')}"`,
        `"${(term.area || '').replace(/"/g, '""')}"`,
        `"${(term.main_topic || '').replace(/"/g, '""')}"`,
        `"${(term.sub_topic || '').replace(/"/g, '""')}"`,
        `"${(term.keywords || '').replace(/"/g, '""')}"`,
        `"${term.term.replace(/"/g, '""')}"`,
        `"${term.definition.replace(/"/g, '""')}"`,
        `"${(term.example_sentence || '').replace(/"/g, '""')}"`,
        term.has_question_generated ? 'true' : 'false'
      ].join(','))
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `vocabulary_terms_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = async () => {
    if (!uploadFile) {
      alert('업로드할 파일을 선택해주세요.');
      return;
    }

    const formData = new FormData();
    formData.append('file', uploadFile);

    try {
      const response = await fetch('/api/vocabulary-terms/bulk-update', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      
      if (result.success) {
        let message = `${result.updatedCount}개의 어휘가 성공적으로 업데이트되었습니다.`;
        if (result.invalidIds && result.invalidIds.length > 0) {
          message += `\n\n존재하지 않는 ID (${result.invalidIds.length}개): ${result.invalidIds.slice(0, 5).join(', ')}`;
          if (result.invalidIds.length > 5) {
            message += ` 외 ${result.invalidIds.length - 5}개`;
          }
        }
        if (result.errors && result.errors.length > 0) {
          message += `\n\n오류 발생 (${result.errors.length}개):\n${result.errors.join('\n')}`;
        }
        alert(message);
        setShowUploadModal(false);
        setUploadFile(null);
        await fetchVocabularyTerms();
      } else {
        let errorMessage = `업로드 실패: ${result.message}`;
        if (result.details && Array.isArray(result.details)) {
          errorMessage += `\n\n세부 오류:\n${result.details.join('\n')}`;
        }
        if (result.received) {
          errorMessage += `\n\n받은 헤더: ${result.received.join(', ')}`;
        }
        alert(errorMessage);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('업로드 중 오류가 발생했습니다.');
    }
  };

  // 재생성 기능
  const handleRegenerate = async () => {
    if (selectedTerms.size === 0) {
      alert('재생성할 어휘를 선택해주세요.');
      return;
    }

    setRegenerating(true);
    try {
      const response = await fetch('/api/vocabulary-terms/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ termIds: Array.from(selectedTerms) })
      });

      const result = await response.json();

      if (result.success) {
        // 원본 데이터와 병합
        const mergedTerms = result.regeneratedTerms.map((regenTerm: any) => {
          const originalTerm = vocabularyTerms.find(t => t.id === regenTerm.id);
          return {
            ...regenTerm,
            original_definition: originalTerm?.definition || '',
            original_example: originalTerm?.example_sentence || ''
          };
        });

        setRegeneratedTerms(mergedTerms);
        setShowRegenerateModal(true);

        if (result.errors && result.errors.length > 0) {
          console.error('Regeneration errors:', result.errors);
        }
      } else {
        alert(`재생성 실패: ${result.message}`);
      }
    } catch (error) {
      console.error('Regeneration error:', error);
      alert('재생성 중 오류가 발생했습니다.');
    } finally {
      setRegenerating(false);
    }
  };

  // 재생성된 항목 개별 저장
  const handleSaveRegenerated = async (termId: string, newDefinition: string, newExample: string) => {
    try {
      const response = await fetch(`/api/vocabulary-terms/${termId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          definition: newDefinition,
          example_sentence: newExample
        })
      });

      if (!response.ok) throw new Error('Failed to update');

      // 로컬 상태 업데이트
      setVocabularyTerms(prev =>
        prev.map(term =>
          term.id === termId
            ? { ...term, definition: newDefinition, example_sentence: newExample }
            : term
        )
      );

      // 재생성 목록에서 제거
      setRegeneratedTerms(prev => prev.filter(t => t.id !== termId));

      alert('저장이 완료되었습니다.');
    } catch (error) {
      console.error('Error saving regenerated term:', error);
      alert('저장에 실패했습니다.');
    }
  };

  // 재생성된 모든 항목 일괄 저장
  const handleSaveAllRegenerated = async () => {
    let successCount = 0;
    let failCount = 0;

    for (const term of regeneratedTerms) {
      try {
        const response = await fetch(`/api/vocabulary-terms/${term.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            definition: term.new_definition,
            example_sentence: term.new_example_sentence
          })
        });

        if (response.ok) {
          successCount++;
          // 로컬 상태 업데이트
          setVocabularyTerms(prev =>
            prev.map(t =>
              t.id === term.id
                ? { ...t, definition: term.new_definition, example_sentence: term.new_example_sentence }
                : t
            )
          );
        } else {
          failCount++;
        }
      } catch (error) {
        console.error(`Error saving term ${term.id}:`, error);
        failCount++;
      }
    }

    if (successCount > 0) {
      alert(`${successCount}개 항목이 저장되었습니다.${failCount > 0 ? ` (${failCount}개 실패)` : ''}`);
      setShowRegenerateModal(false);
      setRegeneratedTerms([]);
      setSelectedTerms(new Set());
    } else {
      alert('저장에 실패했습니다.');
    }
  };

  // 페이지네이션
  const totalPages = Math.ceil(filteredTerms.length / itemsPerPage);
  const paginatedTerms = filteredTerms.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // 통계 계산
  const stats = {
    total: vocabularyTerms.length,
    core: vocabularyTerms.filter(t => t.has_question_generated).length,
    difficult: vocabularyTerms.filter(t => !t.has_question_generated).length
  };

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
          {/* 헤더 */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">어휘 DB 관리</h1>
            <p className="text-gray-600">전체 어휘 데이터를 확인하고 수정할 수 있습니다.</p>
            
            {/* 통계 */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-sm text-gray-600">전체 어휘</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.core}</div>
                <div className="text-sm text-gray-600">핵심 어휘</div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{stats.difficult}</div>
                <div className="text-sm text-gray-600">어려운 어휘</div>
              </div>
            </div>
          </div>

          {/* 필터 섹션 */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {/* 학년 필터 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">학년</label>
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">전체</option>
                  <option value="초3">초3</option>
                  <option value="초4">초4</option>
                  <option value="초5">초5</option>
                  <option value="초6">초6</option>
                  <option value="중1">중1</option>
                  <option value="중2">중2</option>
                  <option value="중3">중3</option>
                </select>
              </div>

              {/* 과목 필터 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">과목</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">전체</option>
                  <option value="사회">사회</option>
                  <option value="과학">과학</option>
                </select>
              </div>

              {/* 영역 필터 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">영역</label>
                <select
                  value={selectedArea}
                  onChange={(e) => setSelectedArea(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">전체</option>
                  <option value="지리">지리</option>
                  <option value="일반사회">일반사회</option>
                  <option value="역사">역사</option>
                  <option value="경제">경제</option>
                  <option value="물리">물리</option>
                  <option value="화학">화학</option>
                  <option value="생물">생물</option>
                  <option value="지구과학">지구과학</option>
                </select>
              </div>

              {/* 유형 필터 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">유형</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">전체</option>
                  <option value="core">핵심 어휘</option>
                  <option value="difficult">어려운 어휘</option>
                </select>
              </div>

              {/* 생성자 필터 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">생성자</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">전체</option>
                  {/* 동적으로 생성자 목록 생성 */}
                  {Array.from(new Set(vocabularyTerms.map(term => term.user_id).filter(Boolean)))
                    .sort()
                    .map(userId => (
                      <option key={userId} value={userId}>
                        {userId}
                      </option>
                    ))}
                </select>
              </div>

              {/* 검색 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">검색</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="용어, 정의, 예문 검색..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                검색 결과: {filteredTerms.length}개 | 선택됨: {selectedTerms.size}개
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleDownloadSelected}
                  disabled={selectedTerms.size === 0}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  선택 다운로드
                </button>
                <button
                  onClick={handleRegenerate}
                  disabled={selectedTerms.size === 0 || regenerating}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {regenerating ? '재생성 중...' : '재생성'}
                </button>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                >
                  대량 업로드
                </button>
              </div>
            </div>
          </div>

          {/* 테이블 */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-600">데이터를 불러오는 중...</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <input
                            type="checkbox"
                            checked={paginatedTerms.length > 0 && paginatedTerms.every(term => selectedTerms.has(term.id))}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            className="rounded border-gray-300"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          콘텐츠 정보
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          주제
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          핵심개념어
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          용어
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          정의
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          예문
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          유형
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          생성자
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          작업
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedTerms.map((term) => (
                        <tr key={term.id} className="hover:bg-gray-50">
                          {/* 선택 체크박스 */}
                          <td className="px-4 py-4">
                            <input
                              type="checkbox"
                              checked={selectedTerms.has(term.id)}
                              onChange={(e) => handleSelectTerm(term.id, e.target.checked)}
                              className="rounded border-gray-300"
                            />
                          </td>
                          {/* 1. 콘텐츠 정보 */}
                          <td className="px-4 py-4">
                            <div className="text-xs text-gray-600">
                              <div className="font-medium">{term.grade}</div>
                              <div>{term.subject} / {term.area}</div>
                            </div>
                          </td>
                          {/* 2. 주제 */}
                          <td className="px-4 py-4">
                            <div className="text-xs text-gray-600">
                              <div className="font-medium text-gray-900">{term.main_topic || '-'}</div>
                              <div>{term.sub_topic || '-'}</div>
                            </div>
                          </td>
                          {/* 3. 핵심개념어 */}
                          <td className="px-4 py-4">
                            <div className="text-xs text-gray-600 max-w-32 break-words">
                              {term.keywords || '-'}
                            </div>
                          </td>
                          {/* 4. 용어 */}
                          <td className="px-4 py-4">
                            {editingId === term.id ? (
                              <input
                                type="text"
                                value={editingData.term || ''}
                                onChange={(e) => setEditingData({...editingData, term: e.target.value})}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                            ) : (
                              <div className="text-sm font-medium text-gray-900 max-w-24 break-words">
                                {term.term}
                              </div>
                            )}
                          </td>
                          {/* 5. 정의 */}
                          <td className="px-4 py-4">
                            {editingId === term.id ? (
                              <textarea
                                value={editingData.definition || ''}
                                onChange={(e) => setEditingData({...editingData, definition: e.target.value})}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                rows={2}
                              />
                            ) : (
                              <div className="text-sm text-gray-900 max-w-48 break-words">
                                {term.definition}
                              </div>
                            )}
                          </td>
                          {/* 6. 예문 */}
                          <td className="px-4 py-4">
                            {editingId === term.id ? (
                              <textarea
                                value={editingData.example_sentence || ''}
                                onChange={(e) => setEditingData({...editingData, example_sentence: e.target.value})}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                rows={2}
                              />
                            ) : (
                              <div className="text-sm text-gray-600 max-w-48 break-words">
                                {term.example_sentence || '-'}
                              </div>
                            )}
                          </td>
                          {/* 7. 유형 */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            {editingId === term.id ? (
                              <select
                                value={editingData.has_question_generated ? 'core' : 'difficult'}
                                onChange={(e) => setEditingData({
                                  ...editingData, 
                                  has_question_generated: e.target.value === 'core'
                                })}
                                className="px-2 py-1 border border-gray-300 rounded text-sm"
                              >
                                <option value="core">핵심</option>
                                <option value="difficult">어려운</option>
                              </select>
                            ) : (
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                term.has_question_generated 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-orange-100 text-orange-800'
                              }`}>
                                {term.has_question_generated ? '핵심' : '어려운'}
                              </span>
                            )}
                          </td>
                          {/* 8. 생성자 */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-xs text-gray-600">
                              {term.user_id || '-'}
                            </div>
                          </td>
                          {/* 9. 작업 */}
                          <td className="px-4 py-4 whitespace-nowrap text-sm">
                            {editingId === term.id ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleSave(term.id)}
                                  className="text-green-600 hover:text-green-900 text-xs"
                                >
                                  저장
                                </button>
                                <button
                                  onClick={handleCancel}
                                  className="text-gray-600 hover:text-gray-900 text-xs"
                                >
                                  취소
                                </button>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEdit(term)}
                                  className="text-blue-600 hover:text-blue-900 text-xs"
                                >
                                  수정
                                </button>
                                <button
                                  onClick={() => handleDelete(term.id)}
                                  className="text-red-600 hover:text-red-900 text-xs"
                                >
                                  삭제
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 페이지네이션 */}
                {totalPages > 1 && (
                  <div className="bg-gray-50 px-6 py-3 flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      전체 {filteredTerms.length}개 중 {(currentPage - 1) * itemsPerPage + 1}-
                      {Math.min(currentPage * itemsPerPage, filteredTerms.length)}개 표시
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50"
                      >
                        이전
                      </button>
                      <span className="px-3 py-1 text-sm">
                        {currentPage} / {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50"
                      >
                        다음
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* 업로드 모달 */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">어휘 대량 업로드</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CSV 파일 선택
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <h4 className="text-sm font-medium text-yellow-800 mb-2">업로드 규칙</h4>
                <ul className="text-xs text-yellow-700 space-y-1">
                  <li>• CSV 파일의 필수 헤더: id, term, definition, example_sentence, has_question_generated</li>
                  <li>• 다운로드된 파일에는 참조용 정보(학년, 과목, 영역, 주제, 핵심개념어)도 포함됩니다</li>
                  <li>• id는 수정할 어휘의 고유 ID (필수, 수정 불가)</li>
                  <li>• has_question_generated는 true/false 값</li>
                  <li>• <strong>수정 가능한 필드:</strong> term, definition, example_sentence, has_question_generated</li>
                  <li>• <strong>수정 불가능한 필드:</strong> id, grade, subject, area, main_topic, sub_topic, keywords</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleFileUpload}
                  disabled={!uploadFile}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  업로드
                </button>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadFile(null);
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 재생성 결과 모달 */}
        {showRegenerateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">재생성 결과 확인</h3>

              <div className="mb-4 text-sm text-gray-600">
                {regeneratedTerms.length}개 항목이 재생성되었습니다. 각 항목을 확인하고 저장하세요.
              </div>

              <div className="space-y-4 mb-6">
                {regeneratedTerms.map((term, index) => (
                  <div key={term.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="font-medium text-gray-900 mb-3">
                      {index + 1}. {term.term}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* 원본 */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-700">원본</h4>
                        <div className="bg-gray-50 p-3 rounded text-sm">
                          <div className="mb-2">
                            <span className="font-medium">정의:</span> {term.original_definition}
                          </div>
                          <div>
                            <span className="font-medium">예문:</span> {term.original_example || '-'}
                          </div>
                        </div>
                      </div>

                      {/* 재생성 */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-blue-700">재생성 (새로운 내용)</h4>
                        <div className="bg-blue-50 p-3 rounded text-sm">
                          <div className="mb-2">
                            <span className="font-medium">정의:</span>
                            <textarea
                              value={term.new_definition}
                              onChange={(e) => {
                                setRegeneratedTerms(prev =>
                                  prev.map(t =>
                                    t.id === term.id
                                      ? { ...t, new_definition: e.target.value }
                                      : t
                                  )
                                );
                              }}
                              className="w-full mt-1 px-2 py-1 border border-gray-300 rounded text-sm"
                              rows={2}
                            />
                          </div>
                          <div>
                            <span className="font-medium">예문:</span>
                            <textarea
                              value={term.new_example_sentence}
                              onChange={(e) => {
                                setRegeneratedTerms(prev =>
                                  prev.map(t =>
                                    t.id === term.id
                                      ? { ...t, new_example_sentence: e.target.value }
                                      : t
                                  )
                                );
                              }}
                              className="w-full mt-1 px-2 py-1 border border-gray-300 rounded text-sm"
                              rows={2}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex justify-end gap-2">
                      <button
                        onClick={() => handleSaveRegenerated(term.id, term.new_definition, term.new_example_sentence)}
                        className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                      >
                        이 항목 저장
                      </button>
                      <button
                        onClick={() => {
                          setRegeneratedTerms(prev => prev.filter(t => t.id !== term.id));
                        }}
                        className="px-3 py-1 bg-gray-400 text-white rounded text-sm hover:bg-gray-500"
                      >
                        건너뛰기
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {regeneratedTerms.length > 0 && (
                <div className="flex gap-3 justify-end border-t pt-4">
                  <button
                    onClick={handleSaveAllRegenerated}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    모두 저장
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('재생성된 내용을 저장하지 않고 닫으시겠습니까?')) {
                        setShowRegenerateModal(false);
                        setRegeneratedTerms([]);
                      }
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    닫기
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </RoleAuthGuard>
  );
}