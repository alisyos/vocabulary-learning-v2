'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';

interface SetDetails {
  timestamp: string;
  setId: string;
  division: string;
  subject: string;
  grade: string;
  area: string;
  maintopic: string;
  subtopic: string;
  keyword: string;
  passageTitle: string;
  vocabularyCount: number;
  comprehensiveCount: number;
  inputData: any;
  passageData: any;
  vocabularyData: any;
  comprehensiveData: any;
  createdAt: string;
  totalQuestions: number;
}

interface VocabularyQuestion {
  timestamp: string;
  setId: string;
  questionId: string;
  term: string;
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

interface ComprehensiveQuestion {
  timestamp: string;
  setId: string;
  questionId: string;
  type: string;
  question: string;
  options: string[] | null;
  answer: string;
  explanation: string;
  isSupplementary: boolean;
  originalQuestionId: string | null;
}

interface ApiResponse {
  success: boolean;
  setDetails: SetDetails;
  vocabularyQuestions: VocabularyQuestion[];
  comprehensiveQuestions: ComprehensiveQuestion[];
  questionTypeStats: any[];
  summary: {
    totalVocabularyQuestions: number;
    totalComprehensiveQuestions: number;
    typeDistribution: Record<string, number>;
    hasSupplementaryQuestions: boolean;
  };
  error?: string;
}

export default function SetDetailPage({ params }: { params: { setId: string } }) {
  const router = useRouter();
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'passage' | 'vocabulary' | 'comprehensive'>('overview');
  
  useEffect(() => {
    fetchSetDetails();
  }, [params.setId]);
  
  const fetchSetDetails = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/get-set-details?setId=${params.setId}`);
      const result: ApiResponse = await response.json();
      
      if (result.success) {
        setData(result);
      } else {
        setError(result.error || 'Unknown error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const downloadAsJson = () => {
    if (!data) return;
    
    const exportData = {
      setDetails: data.setDetails,
      passage: data.setDetails.passageData,
      vocabularyQuestions: data.vocabularyQuestions,
      comprehensiveQuestions: data.comprehensiveQuestions,
      summary: data.summary,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.setDetails.setId}_${data.setDetails.passageTitle}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">데이터를 로드하는 중...</p>
        </div>
      </div>
    );
  }
  
  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 text-center max-w-md">
          <div className="text-red-600 mb-4">⚠️ 오류가 발생했습니다</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="flex space-x-4 justify-center">
            <button
              onClick={fetchSetDetails}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              다시 시도
            </button>
            <Link
              href="/manage"
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
            >
              목록으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  const { setDetails, vocabularyQuestions, comprehensiveQuestions, summary } = data;
  
      return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        {/* 페이지별 헤더 */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-4">
                <Link href="/manage" className="text-blue-600 hover:text-blue-800 flex items-center">
                  <span className="mr-1">←</span>
                  <span>목록으로</span>
                </Link>
                <div className="h-4 w-px bg-gray-300"></div>
                <h1 className="text-xl font-bold text-gray-900">{setDetails.passageTitle}</h1>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={downloadAsJson}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center space-x-2"
                >
                  <span>💾</span>
                  <span>JSON 다운로드</span>
                </button>
                <button className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 transition-colors flex items-center space-x-2">
                  <span>✏️</span>
                  <span>편집</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 기본 정보 카드 */}
        <div className="bg-white rounded-lg shadow mb-8 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">교육과정 정보</h3>
              <p className="text-sm text-gray-900">{setDetails.division}</p>
              <p className="text-sm text-gray-600">{setDetails.subject} · {setDetails.grade} · {setDetails.area}</p>
              <p className="text-xs text-gray-500 mt-1">{setDetails.maintopic} &gt; {setDetails.subtopic}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">핵심 개념어</h3>
              <p className="text-sm text-gray-900">{setDetails.keyword}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">문제 구성</h3>
              <div className="space-y-1">
                <p className="text-sm text-purple-600">어휘 문제: {summary.totalVocabularyQuestions}개</p>
                <p className="text-sm text-green-600">종합 문제: {summary.totalComprehensiveQuestions}개</p>
                <p className="text-sm font-medium text-gray-900">총 {setDetails.totalQuestions}개</p>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">생성 정보</h3>
              <p className="text-sm text-gray-900">{formatDate(setDetails.createdAt)}</p>
              <p className="text-xs text-gray-500 mt-1">ID: {setDetails.setId}</p>
            </div>
          </div>
        </div>
        
        {/* 탭 네비게이션 */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                개요
              </button>
              <button
                onClick={() => setActiveTab('passage')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'passage'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                지문
              </button>
              <button
                onClick={() => setActiveTab('vocabulary')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'vocabulary'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                어휘 문제 ({summary.totalVocabularyQuestions})
              </button>
              <button
                onClick={() => setActiveTab('comprehensive')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'comprehensive'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                종합 문제 ({summary.totalComprehensiveQuestions})
              </button>
            </nav>
          </div>
          
          <div className="p-6">
            {/* 개요 탭 */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">문제 유형별 분포</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(summary.typeDistribution).map(([type, count]) => (
                      <div key={type} className="bg-gray-50 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-blue-600">{count}</div>
                        <div className="text-sm text-gray-600">{type}</div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {summary.hasSupplementaryQuestions && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-yellow-800 mb-2">보완 문제 포함</h4>
                    <p className="text-sm text-yellow-700">
                      이 세트에는 보완 문제가 포함되어 있습니다.
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {/* 지문 탭 */}
            {activeTab === 'passage' && setDetails.passageData && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">지문 본문</h3>
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="text-xl font-bold text-gray-900 mb-4">{setDetails.passageData.title}</h4>
                    <div className="space-y-4">
                      {setDetails.passageData.paragraphs.map((paragraph: string, index: number) => (
                        <p key={index} className="text-gray-700 leading-relaxed">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
                
                {setDetails.passageData.footnote && setDetails.passageData.footnote.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">용어 설명</h3>
                    <div className="bg-blue-50 rounded-lg p-6">
                      <div className="space-y-3">
                        {setDetails.passageData.footnote.map((note: string, index: number) => (
                          <div key={index} className="text-sm text-blue-900">
                            {note}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* 어휘 문제 탭 */}
            {activeTab === 'vocabulary' && (
              <div className="space-y-6">
                {vocabularyQuestions.map((question, index) => (
                  <div key={question.questionId} className="border border-gray-200 rounded-lg p-6">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="text-lg font-medium text-gray-900">
                        문제 {index + 1}. {question.term}
                      </h4>
                      <span className="text-xs text-gray-500">ID: {question.questionId}</span>
                    </div>
                    
                    <div className="mb-4">
                      <p className="text-gray-800 mb-3">{question.question}</p>
                      <div className="space-y-2">
                        {question.options.map((option, optIndex) => (
                          <div
                            key={optIndex}
                            className={`p-3 rounded-md border ${
                              option === question.answer
                                ? 'border-green-500 bg-green-50 text-green-800'
                                : 'border-gray-200 bg-gray-50'
                            }`}
                          >
                            <span className="font-medium">{optIndex + 1}. </span>
                            {option}
                            {option === question.answer && (
                              <span className="ml-2 text-green-600 font-medium">✓ 정답</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 rounded-md p-4">
                      <h5 className="text-sm font-medium text-blue-900 mb-2">해설</h5>
                      <p className="text-sm text-blue-800">{question.explanation}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* 종합 문제 탭 */}
            {activeTab === 'comprehensive' && (
              <div className="space-y-6">
                {comprehensiveQuestions.map((question, index) => (
                  <div key={question.questionId} className="border border-gray-200 rounded-lg p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="text-lg font-medium text-gray-900">
                          문제 {index + 1}
                        </h4>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            {question.type}
                          </span>
                          {question.isSupplementary && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              보완 문제
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">ID: {question.questionId}</span>
                    </div>
                    
                    <div className="mb-4">
                      <p className="text-gray-800 mb-3">{question.question}</p>
                      
                      {question.options && question.options.length > 0 ? (
                        <div className="space-y-2">
                          {question.options.map((option, optIndex) => (
                            <div
                              key={optIndex}
                              className={`p-3 rounded-md border ${
                                option === question.answer
                                  ? 'border-green-500 bg-green-50 text-green-800'
                                  : 'border-gray-200 bg-gray-50'
                              }`}
                            >
                              <span className="font-medium">{optIndex + 1}. </span>
                              {option}
                              {option === question.answer && (
                                <span className="ml-2 text-green-600 font-medium">✓ 정답</span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-green-50 border border-green-200 rounded-md p-3">
                          <span className="text-sm font-medium text-green-800">정답: </span>
                          <span className="text-green-700">{question.answer}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="bg-blue-50 rounded-md p-4">
                      <h5 className="text-sm font-medium text-blue-900 mb-2">해설</h5>
                      <p className="text-sm text-blue-800">{question.explanation}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 