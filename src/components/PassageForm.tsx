'use client';

import { useState } from 'react';
import { PassageInput, GradeType, SubjectType, AreaType, PassageLengthType, TextType } from '@/types';

interface PassageFormProps {
  onSubmit: (input: PassageInput) => void;
  loading: boolean;
}

export default function PassageForm({ onSubmit, loading }: PassageFormProps) {
  const [formData, setFormData] = useState<PassageInput>({
    grade: '초등학교 중학년(3-4학년)',
    length: '4-5문장으로 구성한 5-6개 단락',
    subject: '사회',
    area: '일반사회',
    topic: '',
    textType: undefined,
  });

  const subjectAreas = {
    사회: ['일반사회', '지리', '역사', '경제'],
    과학: ['물리', '화학', '생물', '지구과학'],
  };

  const lengthOptions: { [key in GradeType]: PassageLengthType[] } = {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 빈 문자열인 topic을 undefined로 변환
    const submitData = {
      ...formData,
      topic: formData.topic?.trim() || undefined,
    };
    
    onSubmit(submitData);
  };

  const handleGradeChange = (grade: GradeType) => {
    setFormData({
      ...formData,
      grade,
      length: lengthOptions[grade][0],
    });
  };

  const handleSubjectChange = (subject: SubjectType) => {
    setFormData({
      ...formData,
      subject,
      area: subjectAreas[subject][0] as AreaType,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-4 rounded-lg shadow-md">
      <h2 className="text-xl font-bold text-gray-800 mb-4">학습 지문 생성</h2>
      
      {/* 학년 선택 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          학년 *
        </label>
        <select
          value={formData.grade}
          onChange={(e) => handleGradeChange(e.target.value as GradeType)}
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
          {lengthOptions[formData.grade].map((option) => (
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
          <option value="사회">사회</option>
          <option value="과학">과학</option>
        </select>
      </div>

      {/* 영역 선택 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          영역 *
        </label>
        <select
          value={formData.area}
          onChange={(e) => setFormData({ ...formData, area: e.target.value as AreaType })}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          required
        >
          {subjectAreas[formData.subject].map((area) => (
            <option key={area} value={area}>
              {area}
            </option>
          ))}
        </select>
      </div>

      {/* 주제 입력 (선택사항) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          주제 <span className="text-gray-500 text-xs">(선택사항)</span>
        </label>
        <input
          type="text"
          value={formData.topic || ''}
          onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
          placeholder="원하는 주제를 입력해주세요 (예: 환경보호, 우주탐사 등)"
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 text-sm"
        />
      </div>

      {/* 유형 선택 (선택사항) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          유형 <span className="text-gray-500 text-xs">(선택사항)</span>
        </label>
        <select
          value={formData.textType || ''}
          onChange={(e) => setFormData({ ...formData, textType: e.target.value as TextType || undefined })}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        >
          <option value="">유형을 선택해주세요</option>
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
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
      >
        {loading ? '지문 생성 중...' : '지문 생성하기'}
      </button>
    </form>
  );
}