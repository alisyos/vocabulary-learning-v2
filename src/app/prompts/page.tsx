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

      const response = await fetch('/api/prompts', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateRequest),
      });

      if (!response.ok) {
        throw new Error('프롬프트 업데이트에 실패했습니다.');
      }

      const result = await response.json();
      
      if (result.success) {
        setEditing(null);
        await loadPrompts(); // 업데이트 후 다시 로드
      } else {
        setError(result.message || '업데이트에 실패했습니다.');
      }
    } catch (err) {
      console.error('프롬프트 저장 실패:', err);
      setError(err instanceof Error ? err.message : '프롬프트 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // 수정 취소
  const cancelEditing = () => {
    setEditing(null);
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
                        ? `border-${tab.color}-500 text-${tab.color}-600`
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
                  <div className={`bg-${tabs.find(t => t.id === activeTab)?.color}-50 px-6 py-4 border-b border-gray-200`}>
                    <h2 className={`text-xl font-semibold text-${tabs.find(t => t.id === activeTab)?.color}-900`}>
                      {getCurrentTabGroup()?.categoryName}
                    </h2>
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
                                  
                                  <button
                                    onClick={() => startEditing(prompt)}
                                    className={`ml-4 inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${tabs.find(t => t.id === activeTab)?.color}-500`}
                                  >
                                    수정
                                  </button>
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
                                        className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-${tabs.find(t => t.id === activeTab)?.color}-500 focus:ring-${tabs.find(t => t.id === activeTab)?.color}-500 text-sm font-mono`}
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
                                        className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-${tabs.find(t => t.id === activeTab)?.color}-500 focus:ring-${tabs.find(t => t.id === activeTab)?.color}-500 text-sm`}
                                        placeholder="변경한 이유를 간단히 적어주세요..."
                                      />
                                    </div>
                                    
                                    <div className="flex justify-end space-x-3">
                                      <button
                                        onClick={cancelEditing}
                                        className={`px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${tabs.find(t => t.id === activeTab)?.color}-500`}
                                      >
                                        취소
                                      </button>
                                      <button
                                        onClick={savePrompt}
                                        disabled={saving}
                                        className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-${tabs.find(t => t.id === activeTab)?.color}-600 hover:bg-${tabs.find(t => t.id === activeTab)?.color}-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${tabs.find(t => t.id === activeTab)?.color}-500 disabled:opacity-50`}
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
      </main>
    </div>
  );
}