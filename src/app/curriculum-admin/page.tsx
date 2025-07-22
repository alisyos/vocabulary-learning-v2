'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import AuthGuard from '@/components/AuthGuard';
import { CurriculumData } from '@/types';

interface CsvRow {
  subject: string;
  grade: string;
  area: string;
  main_topic: string;
  sub_topic: string;
  keywords: string;
  is_active: string;
}

export default function CurriculumAdminPage() {
  const [data, setData] = useState<CurriculumData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CurriculumData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvData, setCsvData] = useState<CsvRow[]>([]);
  const [csvFile, setCsvFile] = useState<File | null>(null);

  // 새 항목/편집 폼 데이터
  const [formData, setFormData] = useState({
    subject: '사회',
    grade: '',
    area: '',
    main_topic: '',
    sub_topic: '',
    keywords: '',
    is_active: true
  });

  // 데이터 로드
  const loadData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/curriculum-admin');
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('데이터 로드 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 필터링된 데이터
  const filteredData = data.filter(item => {
    const matchesSearch = searchTerm === '' || 
      item.main_topic?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sub_topic?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.keywords?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSubject = filterSubject === '' || item.subject === filterSubject;
    const matchesGrade = filterGrade === '' || item.grade === filterGrade;
    
    return matchesSearch && matchesSubject && matchesGrade;
  });

  // CSV 템플릿 다운로드
  const downloadCsvTemplate = () => {
    const headers = ['subject', 'grade', 'area', 'main_topic', 'sub_topic', 'keywords', 'is_active'];
    const sampleData = [
      ['사회', '5학년', '일반사회', '우리나라의 정치', '민주주의와 시민 참여', '민주주의, 시민 참여, 선거', 'true'],
      ['과학', '6학년', '물리', '에너지와 생활', '전기 에너지', '전기, 에너지, 전자회로', 'true'],
      ['사회', '4학년', '지리', '우리 지역의 모습', '지역의 특성과 생활', '지역, 지형, 기후', 'true']
    ];
    
    const csvContent = [headers, ...sampleData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
    
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'curriculum_data_template.csv';
    link.click();
  };

  // CSV 파일 파싱
  const parseCsvFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        alert('CSV 파일이 비어있거나 형식이 잘못되었습니다.');
        return;
      }
      
      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
      const expectedHeaders = ['subject', 'grade', 'area', 'main_topic', 'sub_topic', 'keywords', 'is_active'];
      
      if (!expectedHeaders.every(h => headers.includes(h))) {
        alert('CSV 파일의 헤더가 올바르지 않습니다. 템플릿을 다운로드하여 확인해주세요.');
        return;
      }
      
      const parsedData: CsvRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
        if (values.length === headers.length) {
          const row: CsvRow = {
            subject: values[headers.indexOf('subject')] || '',
            grade: values[headers.indexOf('grade')] || '',
            area: values[headers.indexOf('area')] || '',
            main_topic: values[headers.indexOf('main_topic')] || '',
            sub_topic: values[headers.indexOf('sub_topic')] || '',
            keywords: values[headers.indexOf('keywords')] || '',
            is_active: values[headers.indexOf('is_active')] || 'true'
          };
          parsedData.push(row);
        }
      }
      
      setCsvData(parsedData);
    };
    
    reader.readAsText(file, 'UTF-8');
  };

  // CSV 파일 업로드 처리
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setCsvFile(file);
      parseCsvFile(file);
    } else {
      alert('CSV 파일만 업로드 가능합니다.');
    }
  };

  // CSV 데이터 검증
  const validateCsvData = (data: CsvRow[]) => {
    const errors: string[] = [];
    data.forEach((row, index) => {
      if (!row.subject || !row.grade || !row.area || !row.main_topic || !row.sub_topic) {
        errors.push(`행 ${index + 2}: 필수 필드가 누락되었습니다.`);
      }
      if (row.is_active && !['true', 'false'].includes(row.is_active.toLowerCase())) {
        errors.push(`행 ${index + 2}: is_active 값은 true 또는 false여야 합니다.`);
      }
    });
    return errors;
  };

  // CSV 데이터 등록
  const handleCsvSave = async () => {
    if (csvData.length === 0) {
      alert('등록할 데이터가 없습니다.');
      return;
    }

    const errors = validateCsvData(csvData);
    if (errors.length > 0) {
      alert('데이터 검증 오류:\n' + errors.join('\n'));
      return;
    }

    setLoading(true);
    try {
      const promises = csvData.map(row => {
        const item = {
          ...row,
          is_active: row.is_active.toLowerCase() === 'true'
        };
        return fetch('/api/curriculum-admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item)
        });
      });

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.ok).length;
      
      await loadData();
      closeCsvModal();
      alert(`${successCount}개 항목이 성공적으로 등록되었습니다.`);
    } catch (error) {
      console.error('CSV 등록 오류:', error);
      alert('CSV 등록 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 새 항목 추가/수정
  const handleSave = async () => {
    setLoading(true);
    try {
      const method = isEditing ? 'PUT' : 'POST';
      const url = isEditing ? `/api/curriculum-admin/${selectedItem?.id}` : '/api/curriculum-admin';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const result = await response.json();
      if (result.success) {
        await loadData();
        closeModal();
        alert(isEditing ? '수정되었습니다!' : '추가되었습니다!');
      } else {
        alert('오류: ' + result.message);
      }
    } catch (error) {
      console.error('저장 오류:', error);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 단일 삭제
  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/curriculum-admin/${id}`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      if (result.success) {
        await loadData();
        alert('삭제되었습니다!');
      } else {
        alert('삭제 오류: ' + result.message);
      }
    } catch (error) {
      console.error('삭제 오류:', error);
      alert('삭제 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 대량 삭제
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) {
      alert('삭제할 항목을 선택해주세요.');
      return;
    }

    if (!confirm(`선택된 ${selectedIds.length}개 항목을 삭제하시겠습니까?`)) return;

    setLoading(true);
    try {
      const promises = selectedIds.map(id =>
        fetch(`/api/curriculum-admin/${id}`, { method: 'DELETE' })
      );

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.ok).length;
      
      await loadData();
      setSelectedIds([]);
      alert(`${successCount}개 항목이 삭제되었습니다.`);
    } catch (error) {
      console.error('대량 삭제 오류:', error);
      alert('대량 삭제 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 편집 시작
  const startEdit = (item: CurriculumData) => {
    setSelectedItem(item);
    setFormData({
      subject: item.subject,
      grade: item.grade,
      area: item.area,
      main_topic: item.main_topic,
      sub_topic: item.sub_topic,
      keywords: item.keywords,
      is_active: item.is_active
    });
    setIsEditing(true);
    setShowModal(true);
  };

  // 새 항목 추가 시작
  const startAdd = () => {
    resetForm();
    setIsEditing(false);
    setShowModal(true);
  };

  // 폼 초기화
  const resetForm = () => {
    setFormData({
      subject: '사회',
      grade: '',
      area: '',
      main_topic: '',
      sub_topic: '',
      keywords: '',
      is_active: true
    });
    setSelectedItem(null);
  };

  // 모달 닫기
  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  // CSV 모달 닫기
  const closeCsvModal = () => {
    setShowCsvModal(false);
    setCsvData([]);
    setCsvFile(null);
  };

  // 전체 선택/해제
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredData.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredData.map(item => item.id!));
    }
  };

  // 개별 선택/해제
  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : [...prev, id]
    );
  };

  const subjects = ['사회', '과학'];
  const grades = ['3학년', '4학년', '5학년', '6학년', '중1', '중2', '중3'];
  const areas = {
    '사회': ['일반사회', '지리', '역사', '경제'],
    '과학': ['물리', '화학', '생물', '지구과학']
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <main className="p-6">
          <div className="max-w-7xl mx-auto">
            {/* 헤더 */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">필드데이터 관리</h1>
              <p className="text-gray-600">교육과정 데이터를 관리하고 편집할 수 있습니다</p>
            </div>

            {/* 필터 및 검색 */}
            <div className="bg-white p-4 rounded-lg shadow mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <input
                  type="text"
                  placeholder="검색 (주제, 소주제, 키워드)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                
                <select
                  value={filterSubject}
                  onChange={(e) => setFilterSubject(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">모든 과목</option>
                  {subjects.map(subject => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
                
                <select
                  value={filterGrade}
                  onChange={(e) => setFilterGrade(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">모든 학년</option>
                  {grades.map(grade => (
                    <option key={grade} value={grade}>{grade}</option>
                  ))}
                </select>
                
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterSubject('');
                    setFilterGrade('');
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                >
                  필터 초기화
                </button>
              </div>

              {/* 액션 버튼들 */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={startAdd}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  ➕ 새 데이터 추가
                </button>
                <button
                  onClick={downloadCsvTemplate}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  📄 CSV 템플릿 다운로드
                </button>
                <button
                  onClick={() => setShowCsvModal(true)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                >
                  📁 CSV 파일 업로드
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={selectedIds.length === 0}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  🗑️ 선택 삭제 ({selectedIds.length})
                </button>
              </div>
            </div>

            {/* 데이터 테이블 */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">
                    데이터 목록 ({filteredData.length}개)
                  </h2>
                  <label className="flex items-center text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredData.length && filteredData.length > 0}
                      onChange={toggleSelectAll}
                      className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    전체 선택
                  </label>
                </div>
              </div>
              
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-500">로딩 중...</p>
                </div>
              ) : filteredData.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-4xl mb-2">📋</div>
                  <p>데이터가 없습니다</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          선택
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          과목/학년/영역
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          대주제
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          소주제
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          키워드
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          상태
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          액션
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredData.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(item.id!)}
                              onChange={() => toggleSelect(item.id!)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex flex-col space-y-1">
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                {item.subject}
                              </span>
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                {item.grade}
                              </span>
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                                {item.area}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm font-medium text-gray-900">{item.main_topic}</div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm text-gray-600">{item.sub_topic}</div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm text-gray-500 max-w-xs truncate" title={item.keywords}>
                              {item.keywords}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              item.is_active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {item.is_active ? '활성' : '비활성'}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => startEdit(item)}
                              className="text-indigo-600 hover:text-indigo-900 mr-3"
                            >
                              수정
                            </button>
                            <button
                              onClick={() => handleDelete(item.id!)}
                              className="text-red-600 hover:text-red-900"
                            >
                              삭제
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 안내 정보 */}
            <div className="mt-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
                <span className="mr-2">💡</span>
                사용 안내
              </h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• CSV 템플릿을 다운로드하여 데이터를 준비해주세요</li>
                <li>• CSV 파일 업로드를 통해 대량 데이터를 한 번에 등록할 수 있습니다</li>
                <li>• 체크박스를 사용하여 여러 항목을 선택하고 대량 삭제할 수 있습니다</li>
                <li>• 비활성화된 데이터는 PassageForm에 표시되지 않습니다</li>
              </ul>
            </div>
          </div>
        </main>

        {/* 추가/수정 모달 */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  {isEditing ? '데이터 수정' : '새 데이터 추가'}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">과목</label>
                    <select
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value, area: '' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {subjects.map(subject => (
                        <option key={subject} value={subject}>{subject}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">학년</label>
                    <select
                      value={formData.grade}
                      onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">학년 선택</option>
                      {grades.map(grade => (
                        <option key={grade} value={grade}>{grade}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">영역</label>
                  <select
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">영역 선택</option>
                    {areas[formData.subject as keyof typeof areas]?.map(area => (
                      <option key={area} value={area}>{area}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">대주제</label>
                  <input
                    type="text"
                    value={formData.main_topic}
                    onChange={(e) => setFormData({ ...formData, main_topic: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="예: 우리나라의 정치"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">소주제</label>
                  <input
                    type="text"
                    value={formData.sub_topic}
                    onChange={(e) => setFormData({ ...formData, sub_topic: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="예: 민주주의와 시민 참여"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">핵심 개념어</label>
                  <textarea
                    value={formData.keywords}
                    onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="예: 민주주의, 시민 참여, 선거"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                    활성화
                  </label>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={handleSave}
                    disabled={loading || !formData.grade || !formData.area || !formData.main_topic || !formData.sub_topic}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        저장 중...
                      </div>
                    ) : (isEditing ? '수정' : '추가')}
                  </button>
                  
                  <button
                    onClick={closeModal}
                    className="bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 transition-colors"
                  >
                    취소
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CSV 업로드 모달 */}
        {showCsvModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">CSV 파일 업로드</h3>
                <button
                  onClick={closeCsvModal}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                {/* 파일 업로드 영역 */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <div className="space-y-2">
                    <div className="text-4xl">📁</div>
                    <h4 className="text-lg font-medium">CSV 파일을 선택해주세요</h4>
                    <p className="text-sm text-gray-500">템플릿에 맞는 CSV 파일만 업로드 가능합니다</p>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCsvUpload}
                      className="mt-2 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>
                </div>

                {/* CSV 데이터 미리보기 */}
                {csvData.length > 0 && (
                  <div className="border border-gray-200 rounded-lg">
                    <div className="p-4 border-b border-gray-200 bg-gray-50">
                      <h4 className="font-medium">미리보기 ({csvData.length}개 항목)</h4>
                    </div>
                    <div className="p-4 max-h-64 overflow-y-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="px-2 py-1 text-left font-medium">과목</th>
                            <th className="px-2 py-1 text-left font-medium">학년</th>
                            <th className="px-2 py-1 text-left font-medium">영역</th>
                            <th className="px-2 py-1 text-left font-medium">대주제</th>
                            <th className="px-2 py-1 text-left font-medium">소주제</th>
                            <th className="px-2 py-1 text-left font-medium">키워드</th>
                            <th className="px-2 py-1 text-left font-medium">활성</th>
                          </tr>
                        </thead>
                        <tbody>
                          {csvData.slice(0, 10).map((row, index) => (
                            <tr key={index} className="border-t">
                              <td className="px-2 py-1">{row.subject}</td>
                              <td className="px-2 py-1">{row.grade}</td>
                              <td className="px-2 py-1">{row.area}</td>
                              <td className="px-2 py-1">{row.main_topic}</td>
                              <td className="px-2 py-1">{row.sub_topic}</td>
                              <td className="px-2 py-1 max-w-xs truncate">{row.keywords}</td>
                              <td className="px-2 py-1">{row.is_active}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {csvData.length > 10 && (
                        <p className="text-sm text-gray-500 mt-2 text-center">
                          ...그 외 {csvData.length - 10}개 항목
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={handleCsvSave}
                    disabled={loading || csvData.length === 0}
                    className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        등록 중...
                      </div>
                    ) : `${csvData.length}개 항목 등록`}
                  </button>
                  
                  <button
                    onClick={closeCsvModal}
                    className="bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 transition-colors"
                  >
                    취소
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
} 