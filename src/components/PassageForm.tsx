'use client';

import { useState, useEffect } from 'react';
import { PassageInput, DivisionType, SubjectType, AreaType, PassageLengthType, TextType, FieldData, CurriculumData } from '@/types';

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

  // Supabase에서 필드 데이터 가져오기
  useEffect(() => {
    const fetchFieldData = async () => {
      setLoadingFieldData(true);
      setFieldDataError(null);
      
      try {
        console.log('Fetching curriculum structure from Supabase...');
        const response = await fetch('/api/get-curriculum-structure');
        console.log('Curriculum structure response status:', response.status);
        
        const dataSource = response.headers.get('X-Data-Source');
        const migrationRequired = response.headers.get('X-Migration-Required');
        
        if (response.ok) {
          const data = await response.json();
          console.log('Curriculum structure received:', data.length, 'items');
          console.log('Data source:', dataSource);
          console.log('Sample data:', data.slice(0, 3));
          
          if (migrationRequired === 'true') {
            setFieldDataError('Supabase 데이터베이스가 비어있습니다. 마이그레이션을 실행해주세요.');
          }
          
          if (data.length === 0) {
            setFieldDataError('교육과정 데이터가 비어있습니다. 데이터베이스를 확인해주세요.');
            // fallback 데이터 사용
            setAvailableOptions(prev => ({ ...prev, subjects: ['사회', '과학'] }));
          } else {
            // CurriculumData를 FieldData 형태로 변환
            const mappedData = data.map((item: CurriculumData) => ({
              subject: item.subject,
              grade: item.grade,
              area: item.area,
              maintopic: item.main_topic,
              subtopic: item.sub_topic,
              keyword: item.keywords
            }));
            
            setFieldData(mappedData);
            
            // 고유한 과목 목록 생성
            const uniqueSubjects = [...new Set(mappedData.map((item: FieldData) => item.subject))].filter(Boolean) as string[];
            console.log('Available subjects:', uniqueSubjects);
            
            if (uniqueSubjects.length === 0) {
              setFieldDataError('과목 데이터를 찾을 수 없습니다. 데이터베이스의 subject 컬럼을 확인해주세요.');
              setAvailableOptions(prev => ({ ...prev, subjects: ['사회', '과학'] }));
            } else {
              setAvailableOptions(prev => ({ ...prev, subjects: uniqueSubjects }));
            }
          }
        } else {
          const errorText = await response.text();
          console.error('Failed to fetch curriculum data:', response.status, response.statusText, errorText);
          setFieldDataError(`API 호출 실패: ${response.status} - Supabase 연결을 확인해주세요.`);
          // fallback으로 기본 과목 설정
          setAvailableOptions(prev => ({ ...prev, subjects: ['사회', '과학'] }));
        }
      } catch (error) {
        console.error('Error fetching curriculum data:', error);
        setFieldDataError(`연결 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
        // fallback으로 기본 과목 설정
        setAvailableOptions(prev => ({ ...prev, subjects: ['사회', '과학'] }));
      } finally {
        setLoadingFieldData(false);
      }
    };

    fetchFieldData();
  }, []);

  // Supabase 연결 테스트 및 데이터 재로드
  const handleTestConnection = async () => {
    setTestingConnection(true);
    setFieldDataError(null);
    
    try {
      // 먼저 마이그레이션 상태 확인
      const migrationResponse = await fetch('/api/migrate-curriculum-to-supabase');
      const migrationResult = await migrationResponse.json();
      
      if (migrationResult.success || migrationResult.supabase_count > 0) {
        console.log('Supabase connection successful');
        
                      // 연결이 성공하면 교육과정 데이터 다시 가져오기
        const response = await fetch('/api/get-curriculum-structure');
        if (response.ok) {
          const data = await response.json();
          
          // CurriculumData를 FieldData 형태로 변환
          const mappedData = data.map((item: CurriculumData) => ({
            subject: item.subject,
            grade: item.grade,
            area: item.area,
            maintopic: item.main_topic,
            subtopic: item.sub_topic,
            keyword: item.keywords
          }));
          
          setFieldData(mappedData);
          
          const uniqueSubjects = [...new Set(mappedData.map((item: FieldData) => item.subject))].filter(Boolean) as string[];
          setAvailableOptions(prev => ({ ...prev, subjects: uniqueSubjects }));
          setFieldDataError(null);
        } else {
          setFieldDataError('교육과정 데이터를 가져올 수 없습니다.');
        }
      } else {
        setFieldDataError(`Supabase 연결 테스트 실패: ${migrationResult.error || '알 수 없는 오류'}`);
      }
    } catch (error) {
      console.error('Supabase connection test error:', error);
      setFieldDataError(`Supabase 연결 테스트 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
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

  // 연결 상태 표시 함수
  const getConnectionStatus = () => {
    if (loadingFieldData) {
      return {
        icon: <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>,
        text: "연결 중",
        color: "text-blue-600"
      };
    }
    
    if (fieldDataError) {
      return {
        icon: <svg className="h-4 w-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>,
        text: "연결 문제",
        color: "text-yellow-600"
      };
    }
    
    if (fieldData.length > 0) {
      return {
        icon: <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>,
        text: "연결됨",
        color: "text-green-600"
      };
    }
    
    return {
      icon: <svg className="h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>,
      text: "미연결",
      color: "text-gray-500"
    };
  };

  const connectionStatus = getConnectionStatus();

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">학습 지문 생성</h2>
        <div className="flex items-center space-x-2" title={fieldDataError || "Supabase 연결 상태"}>
          {connectionStatus.icon}
          <span className={`text-xs font-medium ${connectionStatus.color}`}>
            {connectionStatus.text}
          </span>
          {fieldDataError && (
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testingConnection}
              className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded transition-colors disabled:opacity-50"
              title="Supabase 연결 재시도"
            >
              재시도
            </button>
          )}
        </div>
      </div>
       
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