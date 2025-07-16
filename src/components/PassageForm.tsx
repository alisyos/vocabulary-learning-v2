'use client';

import { useState, useEffect } from 'react';
import { PassageInput, DivisionType, SubjectType, AreaType, PassageLengthType, TextType, FieldData } from '@/types';

interface PassageFormProps {
  onSubmit: (input: PassageInput) => void;
  loading: boolean;
}

export default function PassageForm({ onSubmit, loading }: PassageFormProps) {
  const [formData, setFormData] = useState<PassageInput>({
    division: '초등학교 중학년(3-4학년)',
    length: '4-5문장으로 구성한 5-6개 단락',
    subject: '사회',
    grade: '',
    area: '',
    maintopic: '',
    subtopic: '',
    keyword: '',
    textType: undefined,
  });

  const [fieldData, setFieldData] = useState<FieldData[]>([]);
  const [availableOptions, setAvailableOptions] = useState({
    subjects: [] as string[],
    grades: [] as string[],
    areas: [] as string[],
    maintopics: [] as string[],
    subtopics: [] as string[],
    keywords: [] as string[]
  });

  const lengthOptions: { [key in DivisionType]: PassageLengthType[] } = {
    '초등학교 중학년(3-4학년)': ['4-5문장으로 구성한 5-6개 단락'],
    '초등학교 고학년(5-6학년)': [
      '5-6문장으로 구성한 6개 단락',
      '1-2문장으로 구성한 10개 단락',
    ],
    '중학생(1-3학년)': [
      '10문장 이하로 구성한 5개 단락',
      '1-2문장으로 구성한 12개 단락',
    ],
  };

  const textTypeOptions: TextType[] = [
    '설명문', '논설문', '탐구문', '뉴스 기사', '인터뷰', 
    '동화', '시', '대본', '소설'
  ];

  // Google Sheets에서 필드 데이터 가져오기
  useEffect(() => {
    const fetchFieldData = async () => {
      try {
        const response = await fetch('/api/get-field-data');
        if (response.ok) {
          const data = await response.json();
          setFieldData(data);
          
          // 고유한 과목 목록 생성
          const uniqueSubjects = [...new Set(data.map((item: FieldData) => item.subject))].filter(Boolean) as string[];
          setAvailableOptions(prev => ({ ...prev, subjects: uniqueSubjects }));
        }
      } catch (error) {
        console.error('Error fetching field data:', error);
      }
    };

    fetchFieldData();
  }, []);

  // 과목 변경 시 또는 데이터 로딩 완료 시 학년 옵션 업데이트
  useEffect(() => {
    if (formData.subject && fieldData.length > 0) {
      const filteredBySubject = fieldData.filter(item => item.subject === formData.subject);
      const uniqueGrades = [...new Set(filteredBySubject.map(item => item.grade))].filter(Boolean) as string[];
      setAvailableOptions(prev => ({ ...prev, grades: uniqueGrades }));
    }
  }, [formData.subject, fieldData]);

  // 학년 변경 시 영역 옵션 업데이트
  useEffect(() => {
    if (formData.subject && formData.grade && fieldData.length > 0) {
      const filteredByGrade = fieldData.filter(item => 
        item.subject === formData.subject && item.grade === formData.grade
      );
      const uniqueAreas = [...new Set(filteredByGrade.map(item => item.area))].filter(Boolean) as string[];
      setAvailableOptions(prev => ({ ...prev, areas: uniqueAreas }));
      
      // 하위 필드 초기화
      setFormData(prev => ({ ...prev, area: '', maintopic: '', subtopic: '', keyword: '' }));
    }
  }, [formData.subject, formData.grade, fieldData]);

  // 영역 변경 시 대주제 옵션 업데이트
  useEffect(() => {
    if (formData.subject && formData.grade && formData.area && fieldData.length > 0) {
      const filteredByArea = fieldData.filter(item => 
        item.subject === formData.subject && 
        item.grade === formData.grade && 
        item.area === formData.area
      );
      const uniqueMaintopics = [...new Set(filteredByArea.map(item => item.maintopic))].filter(Boolean) as string[];
      setAvailableOptions(prev => ({ ...prev, maintopics: uniqueMaintopics }));
      
      // 하위 필드 초기화
      setFormData(prev => ({ ...prev, maintopic: '', subtopic: '', keyword: '' }));
    }
  }, [formData.subject, formData.grade, formData.area, fieldData]);

  // 대주제 변경 시 소주제 옵션 업데이트
  useEffect(() => {
    if (formData.subject && formData.grade && formData.area && formData.maintopic && fieldData.length > 0) {
      const filteredByMaintopic = fieldData.filter(item => 
        item.subject === formData.subject && 
        item.grade === formData.grade && 
        item.area === formData.area &&
        item.maintopic === formData.maintopic
      );
      const uniqueSubtopics = [...new Set(filteredByMaintopic.map(item => item.subtopic))].filter(Boolean) as string[];
      setAvailableOptions(prev => ({ ...prev, subtopics: uniqueSubtopics }));
      
      // 하위 필드 초기화
      setFormData(prev => ({ ...prev, subtopic: '', keyword: '' }));
    }
  }, [formData.subject, formData.grade, formData.area, formData.maintopic, fieldData]);

  // 소주제 변경 시 핵심 개념어 자동 설정
  useEffect(() => {
    if (formData.subject && formData.grade && formData.area && formData.maintopic && formData.subtopic && fieldData.length > 0) {
      const matchedItem = fieldData.find(item => 
        item.subject === formData.subject && 
        item.grade === formData.grade && 
        item.area === formData.area &&
        item.maintopic === formData.maintopic &&
        item.subtopic === formData.subtopic
      );
      
      if (matchedItem) {
        setFormData(prev => ({ ...prev, keyword: matchedItem.keyword }));
      }
    }
  }, [formData.subject, formData.grade, formData.area, formData.maintopic, formData.subtopic, fieldData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 필수 필드 검증
    if (!formData.keyword) {
      alert('모든 필드를 선택해주세요.');
      return;
    }
    
    onSubmit(formData);
  };

  const handleDivisionChange = (division: DivisionType) => {
    setFormData({
      ...formData,
      division,
      length: lengthOptions[division][0],
    });
  };

  const handleSubjectChange = (subject: SubjectType) => {
    setFormData({
      ...formData,
      subject,
      grade: '',
      area: '',
      maintopic: '',
      subtopic: '',
      keyword: '',
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h2 className="text-xl font-bold text-gray-800 mb-4">학습 지문 생성</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 구분 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            구분 *
          </label>
          <select
            value={formData.division}
            onChange={(e) => handleDivisionChange(e.target.value as DivisionType)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            required
          >
            <option value="초등학교 중학년(3-4학년)">초등학교 중학년(3-4학년)</option>
            <option value="초등학교 고학년(5-6학년)">초등학교 고학년(5-6학년)</option>
            <option value="중학생(1-3학년)">중학생(1-3학년)</option>
          </select>
        </div>

        {/* 지문 길이 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            지문 길이 *
          </label>
          <select
            value={formData.length}
            onChange={(e) => setFormData({ ...formData, length: e.target.value as PassageLengthType })}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            required
          >
            {lengthOptions[formData.division].map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        {/* 과목 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            과목 *
          </label>
          <select
            value={formData.subject}
            onChange={(e) => handleSubjectChange(e.target.value as SubjectType)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            required
          >
            {availableOptions.subjects.length > 0 ? (
              availableOptions.subjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))
            ) : (
              <>
                <option value="사회">사회</option>
                <option value="과학">과학</option>
              </>
            )}
          </select>
        </div>

        {/* 학년 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            학년 *
          </label>
          <select
            value={formData.grade}
            onChange={(e) => setFormData({ ...formData, grade: e.target.value, area: '', maintopic: '', subtopic: '', keyword: '' })}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            required
            disabled={availableOptions.grades.length === 0}
          >
            <option value="">학년을 선택해주세요</option>
            {availableOptions.grades.map((grade) => (
              <option key={grade} value={grade}>
                {grade}
              </option>
            ))}
          </select>
        </div>

        {/* 영역 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            영역 *
          </label>
          <select
            value={formData.area}
            onChange={(e) => setFormData({ ...formData, area: e.target.value as AreaType, maintopic: '', subtopic: '', keyword: '' })}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            required
            disabled={availableOptions.areas.length === 0}
          >
            <option value="">영역을 선택해주세요</option>
            {availableOptions.areas.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>
        </div>

        {/* 대주제 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            대주제 *
          </label>
          <select
            value={formData.maintopic}
            onChange={(e) => setFormData({ ...formData, maintopic: e.target.value, subtopic: '', keyword: '' })}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            required
            disabled={availableOptions.maintopics.length === 0}
          >
            <option value="">대주제를 선택해주세요</option>
            {availableOptions.maintopics.map((maintopic) => (
              <option key={maintopic} value={maintopic}>
                {maintopic}
              </option>
            ))}
          </select>
        </div>

        {/* 소주제 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            소주제 *
          </label>
          <select
            value={formData.subtopic}
            onChange={(e) => setFormData({ ...formData, subtopic: e.target.value, keyword: '' })}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            required
            disabled={availableOptions.subtopics.length === 0}
          >
            <option value="">소주제를 선택해주세요</option>
            {availableOptions.subtopics.map((subtopic) => (
              <option key={subtopic} value={subtopic}>
                {subtopic}
              </option>
            ))}
          </select>
        </div>

        {/* 핵심 개념어 (자동 설정) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            핵심 개념어 *
          </label>
          <input
            type="text"
            value={formData.keyword}
            readOnly
            className="w-full p-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
            placeholder="소주제 선택 시 자동으로 설정됩니다"
          />
        </div>

        {/* 유형 선택 (선택사항) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            유형 (선택사항)
          </label>
          <select
            value={formData.textType || ''}
            onChange={(e) => setFormData({ ...formData, textType: e.target.value as TextType || undefined })}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="">유형을 선택해주세요 (선택사항)</option>
            {textTypeOptions.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {/* 제출 버튼 */}
        <button
          type="submit"
          disabled={loading || !formData.keyword}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          {loading ? '생성 중...' : '지문 생성'}
        </button>
      </form>
    </div>
  );
}