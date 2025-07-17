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
  const [loadingFieldData, setLoadingFieldData] = useState(true);
  const [fieldDataError, setFieldDataError] = useState<string | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionSuccess, setConnectionSuccess] = useState(false);
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
      setLoadingFieldData(true);
      setFieldDataError(null);
      
      try {
        console.log('Fetching field data...');
        const response = await fetch('/api/get-field-data');
        console.log('Field data response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Field data received:', data.length, 'items');
          console.log('Sample data:', data.slice(0, 3));
          
          if (data.length === 0) {
            setFieldDataError('필드 데이터가 비어있습니다. Google Sheets의 field 시트를 확인해주세요.');
            // fallback 데이터 사용
            setAvailableOptions(prev => ({ ...prev, subjects: ['사회', '과학'] }));
          } else {
            setFieldData(data);
            
            // 고유한 과목 목록 생성
            const uniqueSubjects = [...new Set(data.map((item: FieldData) => item.subject))].filter(Boolean) as string[];
            console.log('Available subjects:', uniqueSubjects);
            
            if (uniqueSubjects.length === 0) {
              setFieldDataError('과목 데이터를 찾을 수 없습니다. field 시트의 subject 컬럼을 확인해주세요.');
              setAvailableOptions(prev => ({ ...prev, subjects: ['사회', '과학'] }));
            } else {
              setAvailableOptions(prev => ({ ...prev, subjects: uniqueSubjects }));
              setConnectionSuccess(true);
              // 3초 후 성공 메시지 숨김
              setTimeout(() => setConnectionSuccess(false), 3000);
            }
          }
        } else {
          const errorText = await response.text();
          console.error('Failed to fetch field data:', response.status, response.statusText, errorText);
          setFieldDataError(`API 호출 실패: ${response.status} - Google Sheets 연결을 확인해주세요.`);
          // fallback으로 기본 과목 설정
          setAvailableOptions(prev => ({ ...prev, subjects: ['사회', '과학'] }));
        }
      } catch (error) {
        console.error('Error fetching field data:', error);
        setFieldDataError(`연결 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
        // fallback으로 기본 과목 설정
        setAvailableOptions(prev => ({ ...prev, subjects: ['사회', '과학'] }));
      } finally {
        setLoadingFieldData(false);
      }
    };

    fetchFieldData();
  }, []);

  // Google Sheets 연결 테스트 및 데이터 재로드
  const handleTestConnection = async () => {
    setTestingConnection(true);
    setFieldDataError(null);
    
    try {
      // 먼저 연결 테스트
      const testResponse = await fetch('/api/test-sheets');
      const testResult = await testResponse.json();
      
      if (testResult.success) {
        console.log('Connection test successful');
        
        // 연결이 성공하면 필드 데이터 다시 가져오기
        const response = await fetch('/api/get-field-data');
        if (response.ok) {
          const data = await response.json();
          setFieldData(data);
          
                   const uniqueSubjects = [...new Set(data.map((item: FieldData) => item.subject))].filter(Boolean) as string[];
           setAvailableOptions(prev => ({ ...prev, subjects: uniqueSubjects }));
           setFieldDataError(null);
           setConnectionSuccess(true);
           setTimeout(() => setConnectionSuccess(false), 3000);
        } else {
          setFieldDataError('필드 데이터를 가져올 수 없습니다.');
        }
      } else {
        setFieldDataError(`연결 테스트 실패: ${testResult.error}`);
      }
    } catch (error) {
      console.error('Connection test error:', error);
      setFieldDataError(`연결 테스트 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setTestingConnection(false);
    }
  };

  // 과목 변경 시 또는 데이터 로딩 완료 시 학년 옵션 업데이트
  useEffect(() => {
    console.log('Subject effect triggered:', { subject: formData.subject, fieldDataLength: fieldData.length });
    
    if (formData.subject && fieldData.length > 0) {
      const filteredBySubject = fieldData.filter(item => item.subject === formData.subject);
      console.log('Filtered by subject:', filteredBySubject.length, 'items');
      
      const uniqueGrades = [...new Set(filteredBySubject.map(item => item.grade))].filter(Boolean) as string[];
      console.log('Available grades for', formData.subject, ':', uniqueGrades);
      
      setAvailableOptions(prev => ({ ...prev, grades: uniqueGrades }));
    } else {
      console.log('Clearing grades - no subject or no field data');
      setAvailableOptions(prev => ({ ...prev, grades: [] }));
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
      
      {/* 필드 데이터 상태 표시 */}
      {loadingFieldData && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            <span className="text-sm text-blue-700">Google Sheets에서 필드 데이터를 가져오는 중...</span>
          </div>
        </div>
      )}
      
             {fieldDataError && (
         <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
           <div className="flex">
             <div className="flex-shrink-0">
               <svg className="h-4 w-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                 <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
               </svg>
             </div>
             <div className="ml-2 flex-1">
               <p className="text-sm text-yellow-700 font-medium">Google Sheets 연결 문제</p>
               <p className="text-xs text-yellow-600 mt-1">{fieldDataError}</p>
               <p className="text-xs text-yellow-600 mt-1">기본 데이터로 작동하며, 선택 옵션이 제한될 수 있습니다.</p>
               <button
                 type="button"
                 onClick={handleTestConnection}
                 disabled={testingConnection}
                 className="mt-2 bg-yellow-600 text-white text-xs px-3 py-1 rounded hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 {testingConnection ? '연결 테스트 중...' : '연결 테스트 및 재시도'}
               </button>
             </div>
           </div>
                  </div>
       )}
       
       {connectionSuccess && (
         <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
           <div className="flex items-center">
             <svg className="h-4 w-4 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
               <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
             </svg>
             <span className="text-sm text-green-700">Google Sheets 연결 성공! 필드 데이터가 정상적으로 로드되었습니다.</span>
           </div>
         </div>
       )}
       
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