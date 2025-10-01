'use client';

import { useState, useEffect, useRef } from 'react';
import { PassageInput, DivisionType, SubjectType, AreaType, PassageLengthType, TextType, FieldData, CurriculumData } from '@/types';
import { ModelType } from '@/lib/openai';

interface StreamingState {
  isStreaming: boolean;
  message: string;
  progress: string;
  error: string | null;
  result: any | null;
}

interface PassageFormProps {
  onSubmit: (input: PassageInput & { model: ModelType }) => void;
  loading: boolean;
  initialData?: PassageInput;
  streamingState?: StreamingState;
}

export default function PassageForm({ onSubmit, loading, initialData, streamingState }: PassageFormProps) {
  const [selectedModel, setSelectedModel] = useState<ModelType>(() => {
    // 로컬 스토리지에서 저장된 모델 불러오기
    if (typeof window !== 'undefined') {
      const savedModel = localStorage.getItem('selectedGPTModel');
      return (savedModel as ModelType) || 'gpt-4.1';
    }
    return 'gpt-4.1';
  });
  
  const [formData, setFormData] = useState<PassageInput>(() => {
    const defaultData = {
      division: '초등학교 중학년(3-4학년)' as DivisionType,
      length: '2개의 지문 생성. 지문당 300자 내외 - 총 600자' as PassageLengthType,
      subject: '사회' as SubjectType,
      grade: '',
      area: '',
      session_number: '',
      maintopic: '',
      subtopic: '',
      keyword: '',
      keywords_for_passages: '',
      keywords_for_questions: '',
      textType: '기행문' as TextType,
    };
    
    if (initialData && initialData.division) {
      return { ...defaultData, ...initialData };
    }
    return defaultData;
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

  // 차시 검색 관련 state
  const [sessionNumber, setSessionNumber] = useState('');
  const [sessionSearchLoading, setSessionSearchLoading] = useState(false);
  const [sessionSearchError, setSessionSearchError] = useState<string | null>(null);
  const [sessionSearchSuccess, setSessionSearchSuccess] = useState(false);

  const lengthOptions: { [key in DivisionType]: PassageLengthType[] } = {
    '초등학교 중학년(3-4학년)': ['2개의 지문 생성. 지문당 300자 내외 - 총 600자'],
    '초등학교 고학년(5-6학년)': ['2개의 지문 생성. 지문당 400자 내외 - 총 800자'],
    '중학생(1-3학년)': ['2개의 지문 생성. 지문당 500자 내외 - 총 1,000자'],
  };

  const textTypeOptions: TextType[] = [
    '기행문', '논설문', '설명문'
  ];

  // 초기 데이터가 변경될 때 폼 데이터 업데이트
  useEffect(() => {
    if (initialData && initialData.division) {
      const defaultData = {
        division: '초등학교 중학년(3-4학년)' as DivisionType,
        length: '2개의 지문 생성. 지문당 300자 내외 - 총 600자' as PassageLengthType,
        subject: '사회' as SubjectType,
        grade: '',
        area: '',
        maintopic: '',
        subtopic: '',
        keyword: '',
        keywords_for_passages: '',
        keywords_for_questions: '',
        textType: '기행문' as TextType,
      };
      
      // textType이 undefined인 경우 기본값 유지
      const mergedData = { ...defaultData, ...initialData };
      if (initialData.textType === undefined) {
        mergedData.textType = '기행문' as TextType;
      }
      
      setFormData(mergedData);
    }
  }, [initialData]);

  // 페이지 초기 로드 시 구분에 맞는 유형 자동 설정
  useEffect(() => {
    const getTextTypeForDivision = (division: DivisionType): TextType => {
      switch (division) {
        case '초등학교 중학년(3-4학년)':
          return '기행문';
        case '초등학교 고학년(5-6학년)':
          return '논설문';
        case '중학생(1-3학년)':
          return '설명문';
        default:
          return '기행문';
      }
    };

    // 항상 올바른 유형으로 설정 (강제 설정)
    const correctTextType = getTextTypeForDivision(formData.division);
    console.log('🔍 DEBUG: Current division:', formData.division);
    console.log('🔍 DEBUG: Current textType:', formData.textType);
    console.log('🔍 DEBUG: Correct textType should be:', correctTextType);
    
    if (formData.textType !== correctTextType) {
      console.log('🔄 Updating textType from', formData.textType, 'to', correctTextType);
      setFormData(prev => ({
        ...prev,
        textType: correctTextType
      }));
    } else {
      console.log('✅ TextType is already correct:', correctTextType);
    }
  }, [formData.division]); // division이 변경될 때마다 실행

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
            // CurriculumData를 FieldData 형태로 변환 (새 키워드 필드 포함)
            const mappedData = data.map((item: CurriculumData) => ({
              subject: item.subject,
              grade: item.grade,
              area: item.area,
              maintopic: item.main_topic,
              subtopic: item.sub_topic,
              keyword: item.keywords,
              keywords_for_passages: item.keywords_for_passages || '',
              keywords_for_questions: item.keywords_for_questions || ''
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
          
          // CurriculumData를 FieldData 형태로 변환 (새 키워드 필드 포함)
          const mappedData = data.map((item: CurriculumData) => ({
            subject: item.subject,
            grade: item.grade,
            area: item.area,
            maintopic: item.main_topic,
            subtopic: item.sub_topic,
            keyword: item.keywords,
            keywords_for_passages: item.keywords_for_passages || '',
            keywords_for_questions: item.keywords_for_questions || ''
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

  // 학년 변경 시 영역 옵션 업데이트 (초기화 로직 제거)
  useEffect(() => {
    if (formData.subject && formData.grade && fieldData.length > 0) {
      const filteredByGrade = fieldData.filter(item => 
        item.subject === formData.subject && item.grade === formData.grade
      );
      const uniqueAreas = [...new Set(filteredByGrade.map(item => item.area))].filter(Boolean) as string[];
      setAvailableOptions(prev => ({ ...prev, areas: uniqueAreas }));
    }
  }, [formData.subject, formData.grade, fieldData]);

  // 영역 변경 시 대주제 옵션 업데이트 (초기화 로직 제거)
  useEffect(() => {
    if (formData.subject && formData.grade && formData.area && fieldData.length > 0) {
      const filteredByArea = fieldData.filter(item => 
        item.subject === formData.subject && 
        item.grade === formData.grade && 
        item.area === formData.area
      );
      const uniqueMaintopics = [...new Set(filteredByArea.map(item => item.maintopic))].filter(Boolean) as string[];
      setAvailableOptions(prev => ({ ...prev, maintopics: uniqueMaintopics }));
    }
  }, [formData.subject, formData.grade, formData.area, fieldData]);

  // 대주제 변경 시 소주제 옵션 업데이트 (초기화 로직 제거)
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
    }
  }, [formData.subject, formData.grade, formData.area, formData.maintopic, fieldData]);

  // 소주제 변경 시 핵심 개념어 및 새 키워드 필드들 자동 설정
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
        setFormData(prev => ({ 
          ...prev, 
          keyword: matchedItem.keyword,
          keywords_for_passages: matchedItem.keywords_for_passages || '',
          keywords_for_questions: matchedItem.keywords_for_questions || ''
        }));
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
    
    onSubmit({ ...formData, model: selectedModel });
  };
  
  // 모델 변경 시 로컬 스토리지에 저장
  const handleModelChange = (model: ModelType) => {
    setSelectedModel(model);
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedGPTModel', model);
    }
  };

  const handleDivisionChange = (division: DivisionType) => {
    // 구분에 따른 유형 자동 설정
    const getTextTypeForDivision = (division: DivisionType): TextType => {
      switch (division) {
        case '초등학교 중학년(3-4학년)':
          return '기행문';
        case '초등학교 고학년(5-6학년)':
          return '논설문';
        case '중학생(1-3학년)':
          return '설명문';
        default:
          return '기행문';
      }
    };

    setFormData({
      ...formData,
      division,
      length: lengthOptions[division][0],
      textType: getTextTypeForDivision(division),
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
      keywords_for_passages: '',
      keywords_for_questions: '',
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

  // 차시 검색 함수
  const handleSessionSearch = async () => {
    if (!sessionNumber.trim()) {
      setSessionSearchError('차시 번호를 입력해주세요.');
      return;
    }

    setSessionSearchLoading(true);
    setSessionSearchError(null);
    setSessionSearchSuccess(false);

    try {
      // curriculum-admin API를 사용하여 데이터 검색
      const response = await fetch('/api/curriculum-admin');

      if (!response.ok) {
        throw new Error('데이터를 가져올 수 없습니다.');
      }

      const result = await response.json();

      if (!result.success || !result.data) {
        throw new Error('데이터 조회에 실패했습니다.');
      }

      // 차시 번호로 정확히 일치하는 데이터 찾기
      const matchedData = result.data.find((item: CurriculumData) =>
        String(item.session_number || '').toLowerCase() === sessionNumber.toLowerCase()
      );

      if (!matchedData) {
        setSessionSearchError(`차시 '${sessionNumber}'에 해당하는 데이터를 찾을 수 없습니다.`);
        return;
      }

      // 찾은 데이터로 폼 자동 채우기
      await fillFormWithSessionData(matchedData);

      setSessionSearchSuccess(true);
      setTimeout(() => setSessionSearchSuccess(false), 3000); // 3초 후 성공 메시지 숨김

    } catch (error) {
      console.error('차시 검색 오류:', error);
      setSessionSearchError(error instanceof Error ? error.message : '검색 중 오류가 발생했습니다.');
    } finally {
      setSessionSearchLoading(false);
    }
  };

  // 찾은 데이터로 폼 채우기
  const fillFormWithSessionData = async (data: CurriculumData) => {
    // 구분 결정 (학년 기반)
    let division: DivisionType = '초등학교 중학년(3-4학년)';
    if (data.grade.includes('5') || data.grade.includes('6')) {
      division = '초등학교 고학년(5-6학년)';
    } else if (data.grade.includes('중')) {
      division = '중학생(1-3학년)';
    }

    // 구분에 따른 지문 길이와 텍스트 타입 설정
    const lengthMapping = {
      '초등학교 중학년(3-4학년)': '2개의 지문 생성. 지문당 300자 내외 - 총 600자' as PassageLengthType,
      '초등학교 고학년(5-6학년)': '2개의 지문 생성. 지문당 400자 내외 - 총 800자' as PassageLengthType,
      '중학생(1-3학년)': '2개의 지문 생성. 지문당 500자 내외 - 총 1,000자' as PassageLengthType,
    };

    const textTypeMapping = {
      '초등학교 중학년(3-4학년)': '기행문' as TextType,
      '초등학교 고학년(5-6학년)': '논설문' as TextType,
      '중학생(1-3학년)': '설명문' as TextType,
    };

    // 폼 데이터 업데이트
    setFormData({
      division,
      length: lengthMapping[division],
      subject: data.subject as SubjectType,
      grade: data.grade,
      area: data.area as AreaType,
      session_number: data.session_number || sessionNumber, // 차시 번호 포함
      maintopic: data.main_topic,
      subtopic: data.sub_topic,
      keyword: data.keywords,
      keywords_for_passages: data.keywords_for_passages || '',
      keywords_for_questions: data.keywords_for_questions || '',
      textType: textTypeMapping[division],
    });

    // 연쇄적 옵션 업데이트 (기존 fieldData 사용)
    if (fieldData.length > 0) {
      // 과목별 학년 옵션 업데이트
      const subjectFiltered = fieldData.filter(item => item.subject === data.subject);
      const grades = [...new Set(subjectFiltered.map(item => item.grade))].filter(Boolean);

      // 학년별 영역 옵션 업데이트
      const gradeFiltered = subjectFiltered.filter(item => item.grade === data.grade);
      const areas = [...new Set(gradeFiltered.map(item => item.area))].filter(Boolean);

      // 영역별 대주제 옵션 업데이트
      const areaFiltered = gradeFiltered.filter(item => item.area === data.area);
      const maintopics = [...new Set(areaFiltered.map(item => item.maintopic))].filter(Boolean);

      // 대주제별 소주제 옵션 업데이트
      const maintopicFiltered = areaFiltered.filter(item => item.maintopic === data.main_topic);
      const subtopics = [...new Set(maintopicFiltered.map(item => item.subtopic))].filter(Boolean);

      setAvailableOptions(prev => ({
        ...prev,
        grades,
        areas,
        maintopics,
        subtopics
      }));
    }
  };

  // 차시 검색 초기화
  const handleClearSession = () => {
    setSessionNumber('');
    setSessionSearchError(null);
    setSessionSearchSuccess(false);

    // 폼을 기본값으로 초기화
    const defaultData = {
      division: '초등학교 중학년(3-4학년)' as DivisionType,
      length: '2개의 지문 생성. 지문당 300자 내외 - 총 600자' as PassageLengthType,
      subject: '사회' as SubjectType,
      grade: '',
      area: '',
      maintopic: '',
      subtopic: '',
      keyword: '',
      keywords_for_passages: '',
      keywords_for_questions: '',
      textType: '기행문' as TextType,
    };

    setFormData(defaultData);

    // 옵션들도 초기화
    setAvailableOptions(prev => ({
      ...prev,
      grades: [],
      areas: [],
      maintopics: [],
      subtopics: []
    }));
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold text-gray-800">학습 지문 생성</h2>
        {/* 연결 상태 */}
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
      
      {/* AI 모델 선택 - 제목 바로 아래 */}
      <div className="mb-4 pb-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <label className="text-sm font-medium text-gray-700">AI 모델:</label>
          <select
            value={selectedModel}
            onChange={(e) => handleModelChange(e.target.value as ModelType)}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="gpt-4.1">GPT-4.1</option>
            <option value="gpt-5">GPT-5</option>
            <option value="gpt-5-mini">GPT-5-mini</option>
          </select>
          <span className="text-xs text-gray-500">
            모든 콘텐츠 생성에 사용
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 차시 검색 섭션 */}
        <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-blue-800">
              🔍 차시 기반 자동 입력
            </h3>
            <span className="text-xs text-blue-600">
              차시 번호를 입력하면 아래 정보가 자동으로 채워집니다
            </span>
          </div>

          <div className="flex space-x-3">
            <div className="flex-1">
              <input
                type="text"
                value={sessionNumber}
                onChange={(e) => setSessionNumber(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSessionSearch()}
                placeholder="차시 번호 입력 (예: 1, 2-1, A-3)"
                className="w-full p-2 border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            <button
              type="button"
              onClick={handleSessionSearch}
              disabled={!sessionNumber.trim() || sessionSearchLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {sessionSearchLoading ? '검색 중...' : '검색'}
            </button>
            {sessionNumber && (
              <button
                type="button"
                onClick={handleClearSession}
                className="px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-sm"
                title="차시 검색 초기화"
              >
                초기화
              </button>
            )}
          </div>

          {/* 검색 결과 메시지 */}
          {sessionSearchError && (
            <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded-md">
              <p className="text-sm text-red-700">⚠️ {sessionSearchError}</p>
            </div>
          )}

          {sessionSearchSuccess && (
            <div className="mt-2 p-2 bg-green-100 border border-green-300 rounded-md">
              <p className="text-sm text-green-700">✅ 차시 {sessionNumber}에 대한 정보를 찾았습니다!</p>
            </div>
          )}
        </div>

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
            {formData.division && lengthOptions[formData.division]?.map((option) => (
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
            onChange={(e) => {
              setFormData({ ...formData, grade: e.target.value, area: '', maintopic: '', subtopic: '', keyword: '', keywords_for_passages: '', keywords_for_questions: '' });
            }}
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
            onChange={(e) => {
              setFormData({ ...formData, area: e.target.value as AreaType, maintopic: '', subtopic: '', keyword: '', keywords_for_passages: '', keywords_for_questions: '' });
            }}
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
            onChange={(e) => {
              setFormData({ ...formData, maintopic: e.target.value, subtopic: '', keyword: '', keywords_for_passages: '', keywords_for_questions: '' });
            }}
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
            onChange={(e) => {
              setFormData({ ...formData, subtopic: e.target.value, keyword: '', keywords_for_passages: '', keywords_for_questions: '' });
            }}
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

        {/* 지문용 키워드 (자동 설정) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            지문용 키워드
          </label>
          <input
            type="text"
            value={formData.keywords_for_passages || ''}
            readOnly
            className="w-full p-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
            placeholder="소주제 선택 시 자동으로 설정됩니다"
          />
        </div>

        {/* 문제용 키워드 (자동 설정) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            어휘문제용 키워드
          </label>
          <input
            type="text"
            value={formData.keywords_for_questions || ''}
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
            value={formData.textType || '기행문'}
            onChange={(e) => setFormData({ ...formData, textType: e.target.value as TextType })}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            {textTypeOptions.map((type) => {
              const getDisplayText = (type: string) => {
                switch (type) {
                  case '기행문': return '기행문 (초등 중학년 기본값)';
                  case '논설문': return '논설문 (초등 고학년 기본값)';
                  case '설명문': return '설명문 (중학생 기본값)';
                  default: return type;
                }
              };
              
              return (
                <option key={type} value={type}>
                  {getDisplayText(type)}
                </option>
              );
            })}
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

      {/* 지문 생성 스트리밍 모달 */}
      {streamingState && (streamingState.isStreaming || streamingState.error || streamingState.message) && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
        >
          <div className="bg-white backdrop-blur-sm p-6 rounded-xl shadow-2xl border border-gray-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* 헤더 */}
            <div className="text-center mb-6">
              <div className={`w-12 h-12 border-3 border-gray-200 ${streamingState.isStreaming ? 'border-t-blue-600' : streamingState.error ? 'border-t-red-600' : 'border-t-green-600'} rounded-full animate-spin mx-auto mb-3`}></div>
              <h3 className="text-xl font-bold mb-2 text-gray-800">
                {streamingState.isStreaming 
                  ? '🚀 1단계: 지문 스트리밍 생성 중'
                  : streamingState.error 
                    ? '❌ 지문 생성 오류' 
                    : '✅ 지문 생성 완료'
                }
              </h3>
              <p className="text-sm text-gray-600">
                {streamingState.isStreaming 
                  ? '교육과정에 맞는 맞춤형 지문을 실시간으로 생성하고 있습니다'
                  : streamingState.error 
                    ? '지문 생성 중 문제가 발생했습니다'
                    : '지문 생성이 성공적으로 완료되었습니다'
                }
              </p>
            </div>

            {/* 진행 메시지 */}
            {streamingState.message && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-blue-800 text-center">{streamingState.message}</p>
              </div>
            )}

            {/* 에러 메시지 */}
            {streamingState.error && (
              <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center justify-center">
                  <svg className="w-4 h-4 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm text-red-700">{streamingState.error}</span>
                </div>
              </div>
            )}

            {/* 진행률 표시 (진행 중인 경우) */}
            {streamingState.isStreaming && (
              <div className="mb-4">
                <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                  <div className="bg-blue-600 h-3 rounded-full transition-all duration-500 animate-pulse" style={{ width: '60%' }}></div>
                </div>
                <p className="text-xs text-gray-600 text-center">AI 모델이 스트리밍 응답을 생성하고 있습니다...</p>
              </div>
            )}

            {/* 생성 진행 정보 */}
            {streamingState.progress && streamingState.progress.length > 0 && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center justify-center">
                  <span className="text-sm text-gray-700">📝 현재 생성된 글자수: </span>
                  <span className="text-sm font-semibold text-blue-600 ml-1">{streamingState.progress.length}자</span>
                </div>
              </div>
            )}

            {/* 완료 상태 */}
            {!streamingState.isStreaming && !streamingState.error && streamingState.result && (
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-center justify-center text-green-700">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm font-medium">지문 생성 완료! 잠시 후 2단계 검토로 자동 이동합니다.</span>
                </div>
              </div>
            )}

            {/* 하단 정보 */}
            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500">
                {streamingState.isStreaming 
                  ? '스트리밍 방식으로 실시간 생성 과정을 확인할 수 있습니다'
                  : '생성이 완료되면 자동으로 다음 단계로 이동합니다'
                }
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}