'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { SystemPrompt, PromptGroup, PromptsResponse, PromptUpdateRequest } from '@/types';

interface EditingPrompt {
  promptId: string;
  promptText: string;
  changeReason: string;
}

export default function PromptsPage() {
  const [promptGroups, setPromptGroups] = useState<PromptGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditingPrompt | null>(null);
  const [saving, setSaving] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [activeTab, setActiveTab] = useState<'passage' | 'vocabulary' | 'paragraph' | 'comprehensive' | 'subject' | 'area' | 'division'>('passage');
  const [showFullPrompt, setShowFullPrompt] = useState(false);
  const [fullPromptContent, setFullPromptContent] = useState('');
  const [fullPromptLoading, setFullPromptLoading] = useState(false);

  // 프롬프트 데이터 로드
  const loadPrompts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/prompts');
      
      if (!response.ok) {
        throw new Error('프롬프트 조회에 실패했습니다.');
      }
      
      const data: PromptsResponse = await response.json();
      
      if (data.success && data.data.length > 0) {
        setPromptGroups(data.data);
        // 데이터가 있으면 초기화된 것으로 간주 (하드코딩 또는 DB 모두 포함)
        setIsInitialized(true);
      } else {
        setIsInitialized(false);
      }
      
      setError(null);
    } catch (err) {
      console.error('프롬프트 로드 실패:', err);
      setError(err instanceof Error ? err.message : '프롬프트를 불러오는데 실패했습니다.');
      setIsInitialized(false);
    } finally {
      setLoading(false);
    }
  };

  // 초기화 함수
  const initializePrompts = async () => {
    try {
      setInitializing(true);
      const response = await fetch('/api/prompts/initialize', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('프롬프트 초기화에 실패했습니다.');
      }
      
      const result = await response.json();
      
      if (result.success) {
        await loadPrompts(); // 초기화 후 다시 로드
      } else {
        setError(result.message || '초기화에 실패했습니다.');
      }
    } catch (err) {
      console.error('프롬프트 초기화 실패:', err);
      setError(err instanceof Error ? err.message : '프롬프트 초기화에 실패했습니다.');
    } finally {
      setInitializing(false);
    }
  };

  // 프롬프트 수정 시작
  const startEditing = (prompt: SystemPrompt) => {
    setEditing({
      promptId: prompt.promptId,
      promptText: prompt.promptText,
      changeReason: ''
    });
  };

  // 프롬프트 수정 저장
  const savePrompt = async () => {
    if (!editing) return;

    try {
      setSaving(true);
      
      const updateRequest: PromptUpdateRequest = {
        promptId: editing.promptId,
        promptText: editing.promptText,
        changeReason: editing.changeReason || undefined
      };

      console.log('🔧 프롬프트 업데이트 요청 시작:', {
        promptId: editing.promptId,
        promptTextLength: editing.promptText.length,
        changeReason: editing.changeReason
      });

      const response = await fetch('/api/prompts', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateRequest),
      });

      console.log('📡 API 응답 상태:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      const responseText = await response.text();
      console.log('📄 원본 응답 텍스트:', responseText);

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON 파싱 실패:', parseError);
        throw new Error(`서버 응답을 파싱할 수 없습니다: ${responseText.substring(0, 200)}`);
      }

      console.log('📋 파싱된 응답:', result);

      if (!response.ok) {
        const errorMessage = result.error || result.message || `HTTP ${response.status}: 프롬프트 업데이트에 실패했습니다.`;
        throw new Error(errorMessage);
      }
      
      if (result.success) {
        setEditing(null);
        await loadPrompts(); // 업데이트 후 다시 로드
        
        // 성공 메시지 표시
        setError(null);
        console.log('✅ 프롬프트 저장 성공:', result.message);
      } else {
        const errorMessage = result.error || result.message || '업데이트에 실패했습니다.';
        console.error('❌ 프롬프트 업데이트 실패:', errorMessage);
        console.error('📋 전체 API 응답:', result);
        setError(`${errorMessage}${result.hint ? ` (힌트: ${result.hint})` : ''}`);
      }
    } catch (err) {
      console.error('💥 프롬프트 저장 중 예외 발생:', err);
      setError(err instanceof Error ? err.message : '프롬프트 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // 수정 취소
  const cancelEditing = () => {
    setEditing(null);
  };

  // 전체 시스템 프롬프트 생성 및 표시
  const showFullSystemPrompt = async () => {
    setFullPromptLoading(true);
    setShowFullPrompt(true);
    
    try {
      let promptContent = '';
      
      if (activeTab === 'passage') {
        // 지문 생성 전체 프롬프트 생성
        const { generatePassagePromptFromDB } = await import('@/lib/prompts');
        promptContent = await generatePassagePromptFromDB(
          '초등학교 중학년(3-4학년)', // 예시 값
          '4-5문장으로 구성한 5-6개 단락', // 예시 값
          '사회', // 예시 값
          '3학년', // 예시 값
          '일반사회', // 예시 값
          '[대주제 예시]', // 예시 값
          '[소주제 예시]', // 예시 값
          '[핵심개념어 예시]' // 예시 값
        );
      } else if (activeTab === 'vocabulary') {
        // 어휘 문제 생성 전체 프롬프트 생성
        const { generateVocabularyPromptFromDB } = await import('@/lib/prompts');
        promptContent = await generateVocabularyPromptFromDB(
          '[용어명 예시]', // 예시 값
          '[용어 설명 예시]', // 예시 값
          '[지문 내용 예시]', // 예시 값
          '초등학교 중학년(3-4학년)' // 예시 값
        );
      } else if (activeTab === 'paragraph') {
        // 문단 문제 생성 전체 프롬프트 생성 (generate-paragraph API의 generateParagraphPrompt 함수 사용)
        promptContent = `다음 지문의 문단에 대한 Random 문제를 생성해주세요.
이는 같은 문단에 대한 1번째 Random 문제입니다. 이전 문제들과 다른 관점이나 다른 부분을 다루어 주세요.

**지문 제목**: [예시 지문 제목]
**대상 학년**: 초등학교 중학년(3-4학년)
**문단 내용**: [예시 문단 1 내용]
**문제 번호**: 1번째 Random 문제

**문제 유형별 요구사항**:

- Random 선택 시 각 문단별로 5가지 유형을 1개씩 5개 문제가 생성됩니다.

**출력 형식** (반드시 JSON 형식으로):

{
  "question": "문제 내용",
  "options": ["선택지1", "선택지2", "선택지3", "선택지4", "선택지5"],
  "answer": "1",
  "explanation": "정답 해설"
}

**주의사항**:
- 초등학교 중학년(3-4학년)에 맞는 어휘와 난이도 사용
- 명확하고 구체적인 문제 출제
- 정답과 오답이 명확히 구분되도록 작성
- 해설은 학생이 이해하기 쉽게 작성
- 반드시 JSON 형식으로만 응답`;
      } else if (activeTab === 'comprehensive') {
        // 종합 문제 생성 전체 프롬프트 생성
        const { generateComprehensivePromptFromDB } = await import('@/lib/prompts');
        promptContent = await generateComprehensivePromptFromDB(
          '단답형', // 예시 값
          '[지문 내용 예시]', // 예시 값
          '초등학교 중학년(3-4학년)' // 예시 값
        );
      } else {
        promptContent = '해당 탭에서는 전체 시스템 프롬프트를 제공하지 않습니다.';
      }
      
      setFullPromptContent(promptContent);
    } catch (error) {
      console.error('전체 프롬프트 생성 실패:', error);
      setFullPromptContent('전체 프롬프트 생성 중 오류가 발생했습니다.');
    } finally {
      setFullPromptLoading(false);
    }
  };

  // 현재 활성 탭의 프롬프트 그룹 가져오기
  const getCurrentTabGroup = () => {
    const group = promptGroups.find(group => group.category === activeTab);
    console.log('Current activeTab:', activeTab);
    console.log('Available groups:', promptGroups.map(g => g.category));
    console.log('Found group:', group);
    return group;
  };

  // 탭 설정
  const tabs = [
    { id: 'passage' as const, label: '지문 생성', color: 'blue' },
    { id: 'vocabulary' as const, label: '어휘 문제 생성', color: 'purple' },
    { id: 'paragraph' as const, label: '문단 문제 생성', color: 'indigo' },
    { id: 'comprehensive' as const, label: '종합 문제 생성', color: 'green' },
    { id: 'subject' as const, label: '과목', color: 'orange' },
    { id: 'area' as const, label: '영역', color: 'pink' },
    { id: 'division' as const, label: '구분(학습단계)', color: 'gray' }
  ];

  useEffect(() => {
    loadPrompts();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">프롬프트 데이터를 불러오는 중...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {!isInitialized && !loading && (
          <div className="text-center py-20">
            <div className="max-w-lg mx-auto">
              <svg className="mx-auto h-12 w-12 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900">프롬프트 관리 시스템 설정</h3>
              <p className="mt-2 text-sm text-gray-600">
                현재 기존의 하드코딩된 프롬프트가 사용되고 있습니다.<br />
                프롬프트를 수정하고 관리하려면 아래 버튼을 클릭하여<br />
                <strong>기존 프롬프트를 데이터베이스로 마이그레이션</strong>하세요.
              </p>
              <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-700">
                  ⚠️ <strong>안전합니다!</strong> 기존 프롬프트가 삭제되지 않고, 데이터베이스에 복사됩니다.<br />
                  초기화 후에도 시스템은 정상적으로 작동하며, 프롬프트 수정이 가능해집니다.
                </p>
              </div>
              <div className="mt-6">
                <button
                  onClick={initializePrompts}
                  disabled={initializing}
                  className="inline-flex items-center px-6 py-3 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {initializing && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  )}
                  {initializing ? '마이그레이션 중...' : '기존 프롬프트를 DB로 마이그레이션'}
                </button>
              </div>
            </div>
          </div>
        )}

        {isInitialized && promptGroups.length > 0 && (
          <div className="space-y-6">
            {/* 탭 네비게이션 */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                      activeTab === tab.id
                        ? (activeTab === 'passage' ? 'border-blue-500 text-blue-600' :
                           activeTab === 'vocabulary' ? 'border-purple-500 text-purple-600' :
                           activeTab === 'paragraph' ? 'border-indigo-500 text-indigo-600' :
                           activeTab === 'comprehensive' ? 'border-green-500 text-green-600' :
                           activeTab === 'subject' ? 'border-orange-500 text-orange-600' :
                           activeTab === 'area' ? 'border-pink-500 text-pink-600' :
                           activeTab === 'division' ? 'border-gray-500 text-gray-600' : 'border-blue-500 text-blue-600')
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* 탭 컨텐츠 */}
            <div className="mt-6">
              {getCurrentTabGroup() ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className={`px-6 py-4 border-b border-gray-200 ${
                    activeTab === 'passage' ? 'bg-blue-50' :
                    activeTab === 'vocabulary' ? 'bg-purple-50' :
                    activeTab === 'paragraph' ? 'bg-indigo-50' :
                    activeTab === 'comprehensive' ? 'bg-green-50' :
                    activeTab === 'subject' ? 'bg-orange-50' :
                    activeTab === 'area' ? 'bg-pink-50' :
                    activeTab === 'division' ? 'bg-gray-50' : 'bg-blue-50'
                  }`}>
                    <div className="flex justify-between items-center">
                      <h2 className={`text-xl font-semibold ${
                        activeTab === 'passage' ? 'text-blue-900' :
                        activeTab === 'vocabulary' ? 'text-purple-900' :
                        activeTab === 'paragraph' ? 'text-indigo-900' :
                        activeTab === 'comprehensive' ? 'text-green-900' :
                        activeTab === 'subject' ? 'text-orange-900' :
                        activeTab === 'area' ? 'text-pink-900' :
                        activeTab === 'division' ? 'text-gray-900' : 'text-blue-900'
                      }`}>
                        {getCurrentTabGroup()?.categoryName} - 전체 시스템 프롬프트
                      </h2>
                      
                      {/* 완전한 프롬프트 미리보기 버튼 */}
                      {(activeTab === 'passage' || activeTab === 'vocabulary' || activeTab === 'paragraph' || activeTab === 'comprehensive') && (
                        <button
                          onClick={showFullSystemPrompt}
                          disabled={fullPromptLoading}
                          className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white shadow-sm transition-colors ${
                            activeTab === 'passage' ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500' :
                            activeTab === 'vocabulary' ? 'bg-purple-600 hover:bg-purple-700 focus:ring-purple-500' :
                            activeTab === 'paragraph' ? 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500' :
                            activeTab === 'comprehensive' ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                          } focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50`}
                        >
                          {fullPromptLoading && (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          )}
                          🔍 완전한 프롬프트 미리보기
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-6">
                    {getCurrentTabGroup()?.subCategories && getCurrentTabGroup()?.subCategories.length > 0 ? (
                      getCurrentTabGroup()?.subCategories.map((subCat) => (
                        <div key={subCat.subCategory} className="mb-8 last:mb-0">
                          <h3 className="text-lg font-medium text-gray-800 mb-4">{subCat.subCategoryName}</h3>
                          
                          <div className="space-y-4">
                            {subCat.prompts.map((prompt) => (
                              <div key={prompt.promptId} className="border border-gray-200 rounded-lg p-4">
                                <div className="flex items-start justify-between mb-3">
                                  <div>
                                    <h4 className="text-md font-medium text-gray-900">{prompt.name}</h4>
                                    {prompt.description && (
                                      <p className="text-sm text-gray-500 mt-1">{prompt.description}</p>
                                    )}
                                    <div className="flex items-center space-x-4 mt-2">
                                      <span className="text-xs text-gray-400">버전: {prompt.version}</span>
                                      <span className="text-xs text-gray-400">ID: {prompt.promptId}</span>
                                      {prompt.isDefault && (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                          기본값
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center space-x-2">
                                    <button
                                      onClick={async () => {
                                        const { getDefaultPromptById } = await import('@/lib/prompts');
                                        const defaultPromptText = getDefaultPromptById(prompt.promptId);
                                        if (defaultPromptText && confirm('이 프롬프트를 하드코딩된 기본값으로 초기화하시겠습니까?')) {
                                          setEditing({
                                            promptId: prompt.promptId,
                                            promptText: defaultPromptText,
                                            changeReason: '하드코딩된 기본값으로 초기화'
                                          });
                                        } else if (!defaultPromptText) {
                                          alert('이 프롬프트에 대한 하드코딩된 기본값이 없습니다.');
                                        }
                                      }}
                                      className={`inline-flex items-center px-3 py-1 border shadow-sm text-sm font-medium rounded-md text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                                        activeTab === 'passage' ? 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-500 border-blue-600' :
                                        activeTab === 'vocabulary' ? 'bg-purple-500 hover:bg-purple-600 focus:ring-purple-500 border-purple-600' :
                                        activeTab === 'paragraph' ? 'bg-indigo-500 hover:bg-indigo-600 focus:ring-indigo-500 border-indigo-600' :
                                        activeTab === 'comprehensive' ? 'bg-green-500 hover:bg-green-600 focus:ring-green-500 border-green-600' :
                                        activeTab === 'subject' ? 'bg-orange-500 hover:bg-orange-600 focus:ring-orange-500 border-orange-600' :
                                        activeTab === 'area' ? 'bg-pink-500 hover:bg-pink-600 focus:ring-pink-500 border-pink-600' :
                                        activeTab === 'division' ? 'bg-gray-500 hover:bg-gray-600 focus:ring-gray-500 border-gray-600' : 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-500 border-blue-600'
                                      }`}
                                      title="하드코딩된 기본값으로 초기화"
                                    >
                                      ↺ 초기화
                                    </button>
                                    <button
                                      onClick={() => startEditing(prompt)}
                                      className={`inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                                        activeTab === 'passage' ? 'focus:ring-blue-500' :
                                        activeTab === 'vocabulary' ? 'focus:ring-purple-500' :
                                        activeTab === 'paragraph' ? 'focus:ring-indigo-500' :
                                        activeTab === 'comprehensive' ? 'focus:ring-green-500' :
                                        activeTab === 'subject' ? 'focus:ring-orange-500' :
                                        activeTab === 'area' ? 'focus:ring-pink-500' :
                                        activeTab === 'division' ? 'focus:ring-gray-500' : 'focus:ring-blue-500'
                                      }`}
                                    >
                                      수정
                                    </button>
                                  </div>
                                </div>
                                
                                {editing?.promptId === prompt.promptId ? (
                                  <div className="space-y-4">
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-2">
                                        프롬프트 내용
                                      </label>
                                      <textarea
                                        value={editing.promptText}
                                        onChange={(e) => setEditing({ ...editing, promptText: e.target.value })}
                                        rows={10}
                                        className={`block w-full rounded-md border-gray-300 shadow-sm text-sm font-mono ${
                                          activeTab === 'passage' ? 'focus:border-blue-500 focus:ring-blue-500' :
                                          activeTab === 'vocabulary' ? 'focus:border-purple-500 focus:ring-purple-500' :
                                          activeTab === 'paragraph' ? 'focus:border-indigo-500 focus:ring-indigo-500' :
                                          activeTab === 'comprehensive' ? 'focus:border-green-500 focus:ring-green-500' :
                                          activeTab === 'subject' ? 'focus:border-orange-500 focus:ring-orange-500' :
                                          activeTab === 'area' ? 'focus:border-pink-500 focus:ring-pink-500' :
                                          activeTab === 'division' ? 'focus:border-gray-500 focus:ring-gray-500' : 'focus:border-blue-500 focus:ring-blue-500'
                                        }`}
                                        placeholder="프롬프트 내용을 입력하세요..."
                                      />
                                    </div>
                                    
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-2">
                                        변경 사유 (선택사항)
                                      </label>
                                      <input
                                        type="text"
                                        value={editing.changeReason}
                                        onChange={(e) => setEditing({ ...editing, changeReason: e.target.value })}
                                        className={`block w-full rounded-md border-gray-300 shadow-sm text-sm ${
                                          activeTab === 'passage' ? 'focus:border-blue-500 focus:ring-blue-500' :
                                          activeTab === 'vocabulary' ? 'focus:border-purple-500 focus:ring-purple-500' :
                                          activeTab === 'paragraph' ? 'focus:border-indigo-500 focus:ring-indigo-500' :
                                          activeTab === 'comprehensive' ? 'focus:border-green-500 focus:ring-green-500' :
                                          activeTab === 'subject' ? 'focus:border-orange-500 focus:ring-orange-500' :
                                          activeTab === 'area' ? 'focus:border-pink-500 focus:ring-pink-500' :
                                          activeTab === 'division' ? 'focus:border-gray-500 focus:ring-gray-500' : 'focus:border-blue-500 focus:ring-blue-500'
                                        }`}
                                        placeholder="변경한 이유를 간단히 적어주세요..."
                                      />
                                    </div>
                                    
                                    <div className="flex justify-end space-x-3">
                                      <button
                                        onClick={cancelEditing}
                                        className={`px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                                          activeTab === 'passage' ? 'focus:ring-blue-500' :
                                          activeTab === 'vocabulary' ? 'focus:ring-purple-500' :
                                          activeTab === 'paragraph' ? 'focus:ring-indigo-500' :
                                          activeTab === 'comprehensive' ? 'focus:ring-green-500' :
                                          activeTab === 'subject' ? 'focus:ring-orange-500' :
                                          activeTab === 'area' ? 'focus:ring-pink-500' :
                                          activeTab === 'division' ? 'focus:ring-gray-500' : 'focus:ring-blue-500'
                                        }`}
                                      >
                                        취소
                                      </button>
                                      <button
                                        onClick={savePrompt}
                                        disabled={saving}
                                        className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                                          activeTab === 'passage' ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500' :
                                          activeTab === 'vocabulary' ? 'bg-purple-600 hover:bg-purple-700 focus:ring-purple-500' :
                                          activeTab === 'paragraph' ? 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500' :
                                          activeTab === 'comprehensive' ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' :
                                          activeTab === 'subject' ? 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500' :
                                          activeTab === 'area' ? 'bg-pink-600 hover:bg-pink-700 focus:ring-pink-500' :
                                          activeTab === 'division' ? 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-500' : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                                        }`}
                                      >
                                        {saving ? (
                                          <div className="flex items-center">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            저장 중...
                                          </div>
                                        ) : (
                                          '저장'
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="bg-gray-50 rounded-md p-4">
                                    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono overflow-x-auto">
                                      {prompt.promptText}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <p>이 카테고리에 프롬프트가 없습니다.</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="p-12 text-center text-gray-500">
                    <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-lg font-medium mb-2">프롬프트 데이터를 불러오는 중...</p>
                    <p className="text-sm">이 카테고리의 프롬프트를 준비 중입니다.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* 전체 시스템 프롬프트 모달 */}
        {showFullPrompt && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
              {/* 모달 헤더 */}
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    🔍 완전한 프롬프트 미리보기 - {getCurrentTabGroup()?.categoryName}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    실제 콘텐츠 생성에 사용되는 최종 완성 프롬프트입니다 (예시 값 포함)
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(fullPromptContent);
                      alert('프롬프트가 클립보드에 복사되었습니다.');
                    }}
                    className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors flex items-center space-x-1"
                  >
                    <span>📋 복사</span>
                  </button>
                  <button
                    onClick={() => setShowFullPrompt(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* 모달 콘텐츠 */}
              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="px-6 py-4 bg-blue-50 border-b border-blue-100">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-blue-800">
                        <strong>미리보기 정보:</strong> 위의 &ldquo;전체 시스템 프롬프트&rdquo;에서 보여지는 개별 프롬프트들이 조합되어 
                        이 완전한 프롬프트가 생성됩니다. 실제 콘텐츠 생성 시에는 사용자 입력값으로 동적 대체됩니다.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex-1 overflow-auto p-6">
                  {fullPromptLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
                      <span className="text-gray-600">완전한 프롬프트 생성 중...</span>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4 border">
                      <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono leading-relaxed">
                        {fullPromptContent}
                      </pre>
                    </div>
                  )}
                </div>
              </div>

              {/* 모달 푸터 */}
              <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  완전한 프롬프트 길이: {fullPromptContent.length.toLocaleString()}자
                </div>
                <button
                  onClick={() => setShowFullPrompt(false)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}