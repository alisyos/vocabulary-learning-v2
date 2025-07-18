'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';

interface SetDetails {
  setId: string;
  division: string;
  subject: string;
  grade: string;
  area: string;
  mainTopic: string;     // v2 구조: mainTopic
  subTopic: string;      // v2 구조: subTopic
  keywords: string;      // v2 구조: keywords (복수형)
  passageTitle: string;
  status: string;
  createdAt: string;
  
  // 하위 호환성을 위한 별칭들
  maintopic?: string;
  subtopic?: string;
  keyword?: string;
}

interface VocabularyQuestion {
  id: string;
  questionId: string;
  term: string;
  question: string;
  options: string[];
  correctAnswer: string;  // v2 구조: correctAnswer
  explanation: string;
  
  // 하위 호환성을 위한 별칭들
  answer?: string;
}

interface ComprehensiveQuestion {
  id: string;
  questionId: string;
  questionType: string;        // v2 구조: questionType
  question: string;
  questionFormat: string;
  options?: string[];
  correctAnswer: string;       // v2 구조: correctAnswer
  explanation: string;
  isSupplementary: boolean;
  originalQuestionId?: string;
  questionSetNumber: number;
  
  // 하위 호환성을 위한 별칭들
  type?: string;
  answer?: string;
}

interface VocabularyTerm {
  id: string;
  term: string;
  definition: string;
  exampleSentence: string;
  orderIndex: number;
}

interface PassageData {
  title: string;
  paragraphs: string[];
}

interface ApiResponse {
  success: boolean;
  data: {
    contentSet: SetDetails;
    passage: PassageData | null;
    vocabularyTerms: VocabularyTerm[];
    vocabularyQuestions: VocabularyQuestion[];
    comprehensiveQuestions: ComprehensiveQuestion[];
  };
  version: string;
  message?: string;
  error?: string;
}

export default function SetDetailPage({ params }: { params: { setId: string } }) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'passage' | 'vocabulary' | 'vocab-questions' | 'comprehensive'>('passage');
  const [setId, setSetId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  
  // 편집 상태
  const [editablePassage, setEditablePassage] = useState<{title: string; paragraphs: string[]}>({title: '', paragraphs: []});
  const [editableVocabulary, setEditableVocabulary] = useState<string[]>([]);
  const [editableVocabQuestions, setEditableVocabQuestions] = useState<VocabularyQuestion[]>([]);
  const [editableComprehensive, setEditableComprehensive] = useState<ComprehensiveQuestion[]>([]);
  
  const fetchSetDetails = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/get-set-details?setId=${id}`);
      const result: ApiResponse = await response.json();
      
      if (result.success && result.data) {
        setData(result);
        
        // 편집 가능한 상태로 초기화
        if (result.data.passage) {
          setEditablePassage({
            title: result.data.passage.title,
            paragraphs: [...result.data.passage.paragraphs]
          });
        }
        
        // v2에서는 어휘 용어가 별도 테이블로 분리됨
        const vocabularyTermsFormatted = result.data.vocabularyTerms.map(term => 
          term.exampleSentence 
            ? `${term.term}: ${term.definition} (예시: ${term.exampleSentence})`
            : `${term.term}: ${term.definition}`
        );
        setEditableVocabulary(vocabularyTermsFormatted);
        
        setEditableVocabQuestions([...result.data.vocabularyQuestions]);
        setEditableComprehensive([...result.data.comprehensiveQuestions]);
      } else {
        setError(result.error || 'Unknown error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    const initializeParams = async () => {
      const resolvedParams = await params;
      setSetId(resolvedParams.setId);
      fetchSetDetails(resolvedParams.setId);
    };
    
    initializeParams();
  }, [params, fetchSetDetails]);
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 저장 함수
  const handleSave = async () => {
    if (!data) return;
    
    setSaving(true);
    try {
      // TODO: 저장 API 구현
      console.log('Saving changes...', {
        editablePassage,
        editableVocabulary,
        editableVocabQuestions,
        editableComprehensive
      });
      
      alert('변경사항이 저장되었습니다.');
    } catch (error) {
      console.error('Save error:', error);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // 지문 편집 함수들
  const handleTitleChange = (newTitle: string) => {
    setEditablePassage(prev => ({ ...prev, title: newTitle }));
  };

  const handleParagraphChange = (index: number, newContent: string) => {
    setEditablePassage(prev => ({
      ...prev,
      paragraphs: prev.paragraphs.map((p, i) => i === index ? newContent : p)
    }));
  };

  const addParagraph = () => {
    setEditablePassage(prev => ({
      ...prev,
      paragraphs: [...prev.paragraphs, '새로운 단락을 입력하세요.']
    }));
  };

  const removeParagraph = (index: number) => {
    if (editablePassage.paragraphs.length <= 1) {
      alert('최소 1개의 단락은 있어야 합니다.');
      return;
    }
    setEditablePassage(prev => ({
      ...prev,
      paragraphs: prev.paragraphs.filter((_, i) => i !== index)
    }));
  };

  // 어휘 편집 함수들
  const handleVocabularyChange = (index: number, newContent: string) => {
    setEditableVocabulary(prev => prev.map((v, i) => i === index ? newContent : v));
  };

  const addVocabulary = () => {
    setEditableVocabulary(prev => [...prev, '새 용어: 설명 (예시: 예시문장)']);
  };

  const removeVocabulary = (index: number) => {
    setEditableVocabulary(prev => prev.filter((_, i) => i !== index));
  };

  // 어휘문제 편집 함수들
  const handleVocabQuestionChange = (index: number, field: keyof VocabularyQuestion, value: string | string[]) => {
    setEditableVocabQuestions(prev => prev.map((q, i) => 
      i === index ? { ...q, [field]: value } : q
    ));
  };

  const addVocabQuestion = () => {
    const newQuestion: VocabularyQuestion = {
      id: '',
      questionId: `vocab_${Date.now()}`,
      term: '새 용어',
      question: '새 질문을 입력하세요.',
      options: ['선택지 1', '선택지 2', '선택지 3', '선택지 4', '선택지 5'],
      correctAnswer: '선택지 1',
      explanation: '해설을 입력하세요.'
    };
    setEditableVocabQuestions(prev => [...prev, newQuestion]);
  };

  const removeVocabQuestion = (index: number) => {
    setEditableVocabQuestions(prev => prev.filter((_, i) => i !== index));
  };

  // 종합문제 편집 함수들
  const handleComprehensiveChange = (index: number, field: keyof ComprehensiveQuestion, value: string | string[] | boolean) => {
    setEditableComprehensive(prev => prev.map((q, i) => 
      i === index ? { ...q, [field]: value } : q
    ));
  };

  const addComprehensiveQuestion = () => {
    const baseId = `comp_${Date.now()}`;

    
    // 기본 문제 생성
    const mainQuestion: ComprehensiveQuestion = {
      id: '',
      questionId: baseId,
      questionType: '단답형',
      question: '새 질문을 입력하세요.',
      questionFormat: 'short_answer',
      correctAnswer: '정답을 입력하세요.',
      explanation: '해설을 입력하세요.',
      isSupplementary: false,
      questionSetNumber: 1
    };
    
    // 보완 문제 2개 생성
    const supplementary1: ComprehensiveQuestion = {
      id: '',
      questionId: `${baseId}_supp1`,
      questionType: '단답형',
      question: '보완 질문 1을 입력하세요.',
      questionFormat: 'short_answer',
      correctAnswer: '정답을 입력하세요.',
      explanation: '해설을 입력하세요.',
      isSupplementary: true,
      originalQuestionId: baseId,
      questionSetNumber: 1
    };
    
    const supplementary2: ComprehensiveQuestion = {
      id: '',
      questionId: `${baseId}_supp2`,
      questionType: '단답형',
      question: '보완 질문 2를 입력하세요.',
      questionFormat: 'short_answer',
      correctAnswer: '정답을 입력하세요.',
      explanation: '해설을 입력하세요.',
      isSupplementary: true,
      originalQuestionId: baseId,
      questionSetNumber: 1
    };
    
    setEditableComprehensive(prev => [...prev, mainQuestion, supplementary1, supplementary2]);
  };

  const removeComprehensiveQuestion = (index: number) => {
    setEditableComprehensive(prev => prev.filter((_, i) => i !== index));
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
              onClick={() => fetchSetDetails(setId)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              다시 시도
            </button>
            <button
              onClick={() => window.close()}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
            >
              창 닫기
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { contentSet: setDetails } = data.data;
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* 페이지 헤더 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => window.close()} 
                className="text-blue-600 hover:text-blue-800 flex items-center"
              >
                <span className="mr-1">←</span>
                <span>창 닫기</span>
              </button>
              <div className="h-4 w-px bg-gray-300"></div>
              <h1 className="text-xl font-bold text-gray-900">{data.data.contentSet.passageTitle}</h1>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
              >
                <span>💾</span>
                <span>{saving ? '저장 중...' : '저장'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 기본 정보 카드 */}
        <div className="bg-white rounded-lg shadow mb-8 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">교육과정 정보</h3>
              <p className="text-sm text-gray-900">{setDetails.division}</p>
              <p className="text-sm text-gray-600">{setDetails.subject} · {setDetails.grade} · {setDetails.area}</p>
              <p className="text-xs text-gray-500 mt-1">{setDetails.mainTopic || setDetails.maintopic} &gt; {setDetails.subTopic || setDetails.subtopic}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">핵심 개념어</h3>
              <p className="text-sm text-gray-900">{setDetails.keywords || setDetails.keyword}</p>
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
                어휘 ({editableVocabulary.length})
              </button>
              <button
                onClick={() => setActiveTab('vocab-questions')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'vocab-questions'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                어휘문제 ({editableVocabQuestions.length})
              </button>
              <button
                onClick={() => setActiveTab('comprehensive')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'comprehensive'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                종합문제 ({editableComprehensive.length})
              </button>
            </nav>
          </div>
          
          <div className="p-6">
            {/* 지문 탭 */}
            {activeTab === 'passage' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">제목</label>
                  <input
                    type="text"
                    value={editablePassage.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <label className="block text-sm font-medium text-gray-700">단락</label>
                    <button
                      onClick={addParagraph}
                      className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-sm"
                    >
                      + 단락 추가
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {editablePassage.paragraphs.map((paragraph, index) => (
                      <div key={index} className="relative">
                        <div className="flex justify-between items-start mb-2">
                          <label className="text-sm font-medium text-gray-600">단락 {index + 1}</label>
                          <button
                            onClick={() => removeParagraph(index)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            삭제
                          </button>
                        </div>
                        <textarea
                          value={paragraph}
                          onChange={(e) => handleParagraphChange(index, e.target.value)}
                          rows={4}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* 어휘 탭 */}
            {activeTab === 'vocabulary' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">용어 설명</h3>
                  <button
                    onClick={addVocabulary}
                    className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-sm"
                  >
                    + 용어 추가
                  </button>
                </div>
                
                <div className="space-y-4">
                  {editableVocabulary.map((vocab, index) => {
                    // 더 정확한 파싱 로직
                    const parseVocabulary = (vocabString: string) => {
                      // 패턴: "용어: 설명 (예시: 예시문장)"
                      const match = vocabString.match(/^([^:]+):\s*(.+?)\s*\(예시:\s*(.+?)\)\s*$/);
                      if (match) {
                        return {
                          term: match[1].trim(),
                          description: match[2].trim(),
                          example: match[3].trim()
                        };
                      }
                      
                      // 예시가 없는 경우: "용어: 설명"
                      const simpleMatch = vocabString.match(/^([^:]+):\s*(.+)$/);
                      if (simpleMatch) {
                        return {
                          term: simpleMatch[1].trim(),
                          description: simpleMatch[2].trim(),
                          example: ''
                        };
                      }
                      
                      // 파싱 실패 시 기본값
                      return {
                        term: vocabString.trim(),
                        description: '',
                        example: ''
                      };
                    };
                    
                    const { term, description, example } = parseVocabulary(vocab);
                    
                    const updateVocabulary = (newTerm: string, newDescription: string, newExample: string) => {
                      const newVocab = newExample 
                        ? `${newTerm}: ${newDescription} (예시: ${newExample})`
                        : `${newTerm}: ${newDescription}`;
                      handleVocabularyChange(index, newVocab);
                    };
                    
                    return (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <label className="text-sm font-medium text-gray-600">용어 {index + 1}</label>
                          <button
                            onClick={() => removeVocabulary(index)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            삭제
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">용어</label>
                            <input
                              type="text"
                              value={term}
                              onChange={(e) => updateVocabulary(e.target.value, description, example)}
                              className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">설명</label>
                            <input
                              type="text"
                              value={description}
                              onChange={(e) => updateVocabulary(term, e.target.value, example)}
                              className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">예시문장</label>
                            <input
                              type="text"
                              value={example}
                              onChange={(e) => updateVocabulary(term, description, e.target.value)}
                              className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* 어휘문제 탭 */}
            {activeTab === 'vocab-questions' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">어휘 문제</h3>
                  <button
                    onClick={addVocabQuestion}
                    className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-sm"
                  >
                    + 문제 추가
                  </button>
                </div>
                
                <div className="space-y-6">
                  {editableVocabQuestions.map((question, index) => (
                    <div key={question.questionId} className="border border-gray-200 rounded-lg p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-lg font-medium text-gray-900">문제 {index + 1}</h4>
                        <button
                          onClick={() => removeVocabQuestion(index)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          삭제
                        </button>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">어휘</label>
                            <input
                              type="text"
                              value={question.term}
                              onChange={(e) => handleVocabQuestionChange(index, 'term', e.target.value)}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">정답</label>
                            <select
                              value={question.correctAnswer || question.answer}
                              onChange={(e) => handleVocabQuestionChange(index, 'correctAnswer', e.target.value)}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              {question.options.map((option, optIndex) => (
                                <option key={optIndex} value={option}>{optIndex + 1}. {option}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">질문</label>
                          <textarea
                            value={question.question}
                            onChange={(e) => handleVocabQuestionChange(index, 'question', e.target.value)}
                            rows={2}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">선택지</label>
                          <div className="space-y-2">
                            {question.options.map((option, optIndex) => (
                              <div key={optIndex} className="flex items-center space-x-2">
                                <span className="text-sm font-medium w-6">{optIndex + 1}.</span>
                                <input
                                  type="text"
                                  value={option}
                                  onChange={(e) => {
                                    const newOptions = [...question.options];
                                    newOptions[optIndex] = e.target.value;
                                    handleVocabQuestionChange(index, 'options', newOptions);
                                  }}
                                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">해설</label>
                          <textarea
                            value={question.explanation}
                            onChange={(e) => handleVocabQuestionChange(index, 'explanation', e.target.value)}
                            rows={3}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* 종합문제 탭 */}
            {activeTab === 'comprehensive' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">종합 문제</h3>
                  <button
                    onClick={addComprehensiveQuestion}
                    className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-sm"
                  >
                    + 문제 세트 추가
                  </button>
                </div>
                
                <div className="space-y-8">
                  {(() => {
                    // 문제를 세트별로 그룹화
                    const questionSets: { [key: string]: ComprehensiveQuestion[] } = {};
                    editableComprehensive.forEach(question => {
                      const setKey = question.isSupplementary && question.originalQuestionId 
                        ? question.originalQuestionId 
                        : question.questionId;
                      
                      if (!questionSets[setKey]) {
                        questionSets[setKey] = [];
                      }
                      questionSets[setKey].push(question);
                    });

                    // 각 세트를 기본문제 순서로 정렬
                    Object.keys(questionSets).forEach(setKey => {
                      questionSets[setKey].sort((a, b) => {
                        if (!a.isSupplementary && b.isSupplementary) return -1;
                        if (a.isSupplementary && !b.isSupplementary) return 1;
                        return 0;
                      });
                    });

                    return Object.entries(questionSets).map(([setKey, questions], setIndex) => (
                      <div key={setKey} className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
                        <div className="flex justify-between items-center mb-6">
                          <h4 className="text-lg font-semibold text-gray-900">
                            문제 세트 {setIndex + 1} ({questions[0].questionType || questions[0].type})
                          </h4>
                          <button
                            onClick={() => {
                              // 세트 전체 삭제
                              const questionIds = questions.map(q => q.questionId);
                              setEditableComprehensive(prev => 
                                prev.filter(q => !questionIds.includes(q.questionId))
                              );
                            }}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            세트 삭제
                          </button>
                        </div>
                        
                        <div className="space-y-6">
                          {questions.map((question, questionIndex) => {
                            const globalIndex = editableComprehensive.findIndex(q => q.questionId === question.questionId);
                            const questionNumber = questionIndex + 1;
                            const isMainQuestion = !question.isSupplementary;
                            
                            return (
                              <div key={question.questionId} className={`border rounded-lg p-4 ${isMainQuestion ? 'bg-white border-blue-200' : 'bg-blue-50 border-blue-100'}`}>
                                <div className="flex justify-between items-center mb-4">
                                  <div>
                                    <h5 className="text-md font-medium text-gray-900">
                                      {isMainQuestion ? '기본 문제' : `보완 문제 ${questionNumber - 1}`}
                                    </h5>
                                    <div className="flex items-center space-x-2 mt-1">
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                        {question.questionType || question.type}
                                      </span>
                                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        isMainQuestion 
                                          ? 'bg-blue-100 text-blue-800' 
                                          : 'bg-yellow-100 text-yellow-800'
                                      }`}>
                                        {isMainQuestion ? '기본문제' : '보완문제'}
                                      </span>
                                    </div>
                                  </div>
                                  {!isMainQuestion && (
                                    <button
                                      onClick={() => removeComprehensiveQuestion(globalIndex)}
                                      className="text-red-600 hover:text-red-800 text-sm"
                                    >
                                      삭제
                                    </button>
                                  )}
                                </div>
                                
                                <div className="space-y-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">질문</label>
                                    <textarea
                                      value={question.question}
                                      onChange={(e) => handleComprehensiveChange(globalIndex, 'question', e.target.value)}
                                      rows={3}
                                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  </div>
                                  
                                  {question.options && question.options.length > 0 ? (
                                    <div className="space-y-4">
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">선택지</label>
                                        <div className="space-y-2">
                                          {question.options.map((option, optIndex) => (
                                            <div key={optIndex} className="flex items-center space-x-2">
                                              <span className="text-sm font-medium w-6">{optIndex + 1}.</span>
                                              <input
                                                type="text"
                                                value={option}
                                                onChange={(e) => {
                                                  const newOptions = [...(question.options || [])];
                                                  newOptions[optIndex] = e.target.value;
                                                  handleComprehensiveChange(globalIndex, 'options', newOptions);
                                                }}
                                                className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                              />
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">정답</label>
                                        <select
                                          value={question.correctAnswer || question.answer}
                                          onChange={(e) => handleComprehensiveChange(globalIndex, 'correctAnswer', e.target.value)}
                                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                          <option value="">정답을 선택하세요</option>
                                          {question.options.map((option, optIndex) => (
                                            <option key={optIndex} value={option}>
                                              {optIndex + 1}. {option}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                    </div>
                                  ) : (
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">정답</label>
                                      <textarea
                                        value={question.correctAnswer || question.answer}
                                        onChange={(e) => handleComprehensiveChange(globalIndex, 'correctAnswer', e.target.value)}
                                        rows={2}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                      />
                                    </div>
                                  )}
                                  
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">해설</label>
                                    <textarea
                                      value={question.explanation}
                                      onChange={(e) => handleComprehensiveChange(globalIndex, 'explanation', e.target.value)}
                                      rows={3}
                                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  </div>
                                </div>
                                
                                {isMainQuestion && (
                                  <div className="mt-4 pt-4 border-t border-gray-200">
                                    <button
                                      onClick={() => {
                                        // 보완 문제 추가
                                        const newSupplementary: ComprehensiveQuestion = {
                                          id: '',
                                          questionId: `comp_supp_${Date.now()}`,
                                          questionType: question.questionType || question.type || '단답형',
                                          question: '보완 질문을 입력하세요.',
                                          questionFormat: question.questionFormat || 'short_answer',
                                          options: question.options ? [...question.options] : undefined,
                                          correctAnswer: '',
                                          explanation: '해설을 입력하세요.',
                                          isSupplementary: true,
                                          originalQuestionId: question.questionId,
                                          questionSetNumber: question.questionSetNumber || 1
                                        };
                                        setEditableComprehensive(prev => [...prev, newSupplementary]);
                                      }}
                                      className="bg-yellow-600 text-white px-3 py-1 rounded-md hover:bg-yellow-700 text-sm"
                                    >
                                      + 보완 문제 추가
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 