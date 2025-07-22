'use client';

import { useState, useEffect } from 'react';
import { CurriculumData } from '@/types';

export default function CurriculumAdminPage() {
  const [data, setData] = useState<CurriculumData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CurriculumData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterGrade, setFilterGrade] = useState('');

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
        resetForm();
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

  // 삭제
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
    setIsEditing(false);
  };

  const subjects = ['사회', '과학'];
  const grades = ['3학년', '4학년', '5학년', '6학년', '중1', '중2', '중3'];
  const areas = {
    '사회': ['일반사회', '지리', '역사', '경제'],
    '과학': ['물리', '화학', '생물', '지구과학']
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">교육과정 데이터 관리</h1>
          <p className="text-gray-600">Supabase curriculum_data 테이블 관리</p>
        </div>

        {/* 필터 및 검색 */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="검색 (주제, 소주제, 키워드)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
            
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">모든 과목</option>
              {subjects.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
            
            <select
              value={filterGrade}
              onChange={(e) => setFilterGrade(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
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
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
            >
              필터 초기화
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 데이터 목록 */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">
                데이터 목록 ({filteredData.length}개)
              </h2>
            </div>
            
            <div className="p-4 max-h-96 overflow-y-auto">
              {loading ? (
                <div className="text-center py-4">로딩 중...</div>
              ) : filteredData.length === 0 ? (
                <div className="text-center py-4 text-gray-500">데이터가 없습니다</div>
              ) : (
                <div className="space-y-2">
                  {filteredData.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 border border-gray-200 rounded-md hover:bg-gray-50"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                              {item.subject}
                            </span>
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                              {item.grade}
                            </span>
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                              {item.area}
                            </span>
                          </div>
                          <div className="font-medium text-sm">{item.main_topic}</div>
                          <div className="text-sm text-gray-600">{item.sub_topic}</div>
                        </div>
                        <div className="flex space-x-1 ml-2">
                          <button
                            onClick={() => startEdit(item)}
                            className="px-2 py-1 bg-yellow-500 text-white text-xs rounded hover:bg-yellow-600"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => handleDelete(item.id!)}
                            className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 추가/편집 폼 */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">
                {isEditing ? '데이터 수정' : '새 데이터 추가'}
              </h2>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">과목</label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value, area: '' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="예: 우리나라의 정치"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">소주제</label>
                <input
                  type="text"
                  value={formData.sub_topic}
                  onChange={(e) => setFormData({ ...formData, sub_topic: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="예: 민주주의와 시민 참여"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">핵심 개념어</label>
                <textarea
                  value={formData.keywords}
                  onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                  className="mr-2"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                  활성화
                </label>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleSave}
                  disabled={loading || !formData.grade || !formData.area || !formData.main_topic || !formData.sub_topic}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? '저장 중...' : (isEditing ? '수정' : '추가')}
                </button>
                
                {isEditing && (
                  <button
                    onClick={resetForm}
                    className="bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600"
                  >
                    취소
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 안내 정보 */}
        <div className="mt-6 bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">💡 사용 안내</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• 데이터 수정 후 메인 페이지에서 즉시 반영됩니다</li>
            <li>• 검색은 대주제, 소주제, 키워드에서 수행됩니다</li>
            <li>• 비활성화된 데이터는 PassageForm에 표시되지 않습니다</li>
            <li>• 삭제된 데이터는 복구할 수 없으니 주의해주세요</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 