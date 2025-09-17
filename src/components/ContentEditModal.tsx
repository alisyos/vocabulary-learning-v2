'use client';

import { useState, useEffect } from 'react';
import { ContentSet } from '@/types';

interface ContentEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentSetId: string;
}

interface DetailedContentData {
  contentSet: ContentSet;
  passages: any[];
  vocabularyTerms: any[];
  vocabularyQuestions: any[];
  paragraphQuestions: any[];
  comprehensiveQuestions: any[];
}

export default function ContentEditModal({ isOpen, onClose, contentSetId }: ContentEditModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [data, setData] = useState<DetailedContentData | null>(null);

  // 편집 가능한 데이터 상태
  const [editablePassages, setEditablePassages] = useState<any[]>([]);
  const [editableVocabTerms, setEditableVocabTerms] = useState<any[]>([]);
  const [editableVocabQuestions, setEditableVocabQuestions] = useState<any[]>([]);
  const [editableParagraphQuestions, setEditableParagraphQuestions] = useState<any[]>([]);
  const [editableComprehensive, setEditableComprehensive] = useState<any[]>([]);
  const [introductionQuestion, setIntroductionQuestion] = useState<string>('');

  // 데이터 로드
  useEffect(() => {
    if (isOpen && contentSetId) {
      fetchContentData();
    }
  }, [isOpen, contentSetId]);

  const fetchContentData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/get-set-details-supabase?setId=${contentSetId}`);
      const result = await response.json();

      if (result.success && result.data) {
        console.log('Loaded data:', result.data);
        setData(result.data);

        // 지문 데이터 처리 - 모든 지문 가져오기
        if (result.data.passages && result.data.passages.length > 0) {
          // passages 배열이 있는 경우 (모든 지문)
          setEditablePassages(result.data.passages);
        } else if (result.data.passage) {
          // 단일 passage 객체를 passages 배열 형태로 변환 (호환성)
          const passageData = {
            id: result.data.passage.id,
            title: result.data.passage.title,
            paragraph_1: result.data.passage.paragraphs[0] || '',
            paragraph_2: result.data.passage.paragraphs[1] || '',
            paragraph_3: result.data.passage.paragraphs[2] || '',
            paragraph_4: result.data.passage.paragraphs[3] || '',
            paragraph_5: result.data.passage.paragraphs[4] || '',
            paragraph_6: result.data.passage.paragraphs[5] || '',
            paragraph_7: result.data.passage.paragraphs[6] || '',
            paragraph_8: result.data.passage.paragraphs[7] || '',
            paragraph_9: result.data.passage.paragraphs[8] || '',
            paragraph_10: result.data.passage.paragraphs[9] || '',
          };
          setEditablePassages([passageData]);
        } else {
          setEditablePassages([]);
        }

        // 도입질문 설정
        setIntroductionQuestion(result.data.introductionQuestion || '');

        setEditableVocabTerms(result.data.vocabularyTerms || []);

        // 어휘 문제 데이터 디버깅
        console.log('Vocabulary Questions Raw Data:', result.data.vocabularyQuestions);
        if (result.data.vocabularyQuestions && result.data.vocabularyQuestions.length > 0) {
          result.data.vocabularyQuestions.forEach((q, index) => {
            console.log(`어휘 문제 ${index + 1}:`, {
              term: q.term,
              question: q.question,
              option_1: q.option_1,
              option_2: q.option_2,
              option_3: q.option_3,
              option_4: q.option_4,
              option_5: q.option_5,
              correct_answer: q.correct_answer,
              difficulty: q.difficulty,
              is_supplementary: q.is_supplementary,
              answer_initials: q.answer_initials // 초성 힌트 필드 로깅
            });
          });
        }

        setEditableVocabQuestions(result.data.vocabularyQuestions || []);
        setEditableParagraphQuestions(result.data.paragraphQuestions || []);
        setEditableComprehensive(result.data.comprehensiveQuestions || []);
      }
    } catch (error) {
      console.error('콘텐츠 로드 오류:', error);
      alert('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // TODO: 저장 API 구현
      alert('저장 기능은 추가 구현이 필요합니다.');
    } catch (error) {
      console.error('저장 오류:', error);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'info', name: '기본 정보', icon: '📋' },
    { id: 'passages', name: '지문', icon: '📖' },
    { id: 'vocabulary', name: '어휘', icon: '📚' },
    { id: 'vocab-questions', name: '어휘 문제', icon: '❓' },
    { id: 'paragraph-questions', name: '문단 문제', icon: '📄' },
    { id: 'comprehensive', name: '종합 문제', icon: '🧠' }
  ];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getQuestionTypeLabel = (type: string): string => {
    const typeMap: { [key: string]: string } = {
      '빈칸 채우기': '빈칸 채우기',
      '주관식 단답형': '주관식',
      '어절 순서 맞추기': '문장 완성하기',
      'OX문제': 'OX퀴즈',
      '객관식 일반형': '객관식'
    };
    return typeMap[type] || type;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        {/* 배경 오버레이 */}
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>

        {/* 모달 내용 */}
        <div className="relative bg-white rounded-lg max-w-7xl w-full max-h-[90vh] overflow-hidden">
          {/* 헤더 */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">콘텐츠 세트 수정</h2>
                {data && (
                  <p className="text-sm opacity-90 mt-1">
                    {data.contentSet.title || '제목 없음'} | ID: {contentSetId.substring(0, 8)}...
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="text-white hover:text-gray-200 text-2xl"
              >
                ✕
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>데이터를 불러오는 중...</p>
            </div>
          ) : data ? (
            <>
              {/* 탭 네비게이션 */}
              <div className="flex border-b border-gray-200 bg-gray-50">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-6 py-3 text-sm font-medium transition-all ${
                      activeTab === tab.id
                        ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <span className="mr-2">{tab.icon}</span>
                    {tab.name}
                  </button>
                ))}
              </div>

              {/* 탭 내용 */}
              <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
                {/* 기본 정보 탭 */}
                {activeTab === 'info' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-semibold text-gray-700 mb-3">교육과정 정보</h3>
                        <div className="space-y-2 text-sm">
                          <p><strong>구분:</strong> {data.contentSet.division}</p>
                          <p><strong>학년:</strong> {data.contentSet.grade}</p>
                          <p><strong>과목:</strong> {data.contentSet.subject}</p>
                          <p><strong>영역:</strong> {data.contentSet.area}</p>
                        </div>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-semibold text-gray-700 mb-3">콘텐츠 정보</h3>
                        <div className="space-y-2 text-sm">
                          <p><strong>대주제:</strong> {data.contentSet.main_topic}</p>
                          <p><strong>소주제:</strong> {data.contentSet.sub_topic}</p>
                          <p><strong>키워드:</strong> {data.contentSet.keywords}</p>
                          <p><strong>상태:</strong>
                            <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                              data.contentSet.status === '승인완료'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {data.contentSet.status}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-gray-700 mb-3">통계 정보</h3>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <p><strong>지문 수:</strong> {data.contentSet.total_passages}</p>
                        <p><strong>어휘 수:</strong> {data.contentSet.total_vocabulary_terms}</p>
                        <p><strong>어휘 문제:</strong> {data.contentSet.total_vocabulary_questions}</p>
                        <p><strong>문단 문제:</strong> {data.contentSet.total_paragraph_questions || 0}</p>
                        <p><strong>종합 문제:</strong> {data.contentSet.total_comprehensive_questions}</p>
                        <p><strong>생성일:</strong> {formatDate(data.contentSet.created_at || '')}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 지문 탭 */}
                {activeTab === 'passages' && (
                  <div className="space-y-6">
                    {/* 도입질문 */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-blue-800 mb-3">📝 도입질문</h3>
                      <p className="text-sm text-blue-600 mb-3">
                        2개 지문을 아우르는 흥미 유발 질문 (선택사항)
                      </p>
                      <textarea
                        value={introductionQuestion}
                        onChange={(e) => setIntroductionQuestion(e.target.value)}
                        className="w-full border border-blue-300 rounded-md px-3 py-2 h-20"
                        placeholder="예: 우리가 살고 있는 지구에는 어떤 비밀이 숨겨져 있을까요?"
                      />
                    </div>

                    {/* 지문들 */}
                    {editablePassages.map((passage, passageIndex) => (
                      <div key={passage.id} className="border border-gray-200 rounded-lg p-6">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-semibold text-gray-900">
                            📖 지문 {passageIndex + 1}
                          </h3>
                          <span className="text-sm text-gray-500">
                            ID: {passage.id?.substring(0, 8)}...
                          </span>
                        </div>

                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            지문 제목
                          </label>
                          <input
                            type="text"
                            value={passage.title}
                            onChange={(e) => {
                              const updated = [...editablePassages];
                              updated[passageIndex].title = e.target.value;
                              setEditablePassages(updated);
                            }}
                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                            placeholder="지문 제목을 입력하세요..."
                          />
                        </div>

                        {/* 문단들 */}
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => {
                          const paragraphKey = `paragraph_${num}`;
                          const paragraphValue = passage[paragraphKey];

                          // 빈 문단은 표시하지 않음
                          if (!paragraphValue || paragraphValue.trim() === '') return null;

                          return (
                            <div key={num} className="mb-4 bg-gray-50 p-4 rounded-lg">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                문단 {num}
                              </label>
                              <textarea
                                value={paragraphValue}
                                onChange={(e) => {
                                  const updated = [...editablePassages];
                                  updated[passageIndex][paragraphKey] = e.target.value;
                                  setEditablePassages(updated);
                                }}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 h-24 resize-y"
                                placeholder={`문단 ${num} 내용을 수정하세요...`}
                              />
                            </div>
                          );
                        })}
                      </div>
                    ))}

                    {/* 지문이 없는 경우 */}
                    {editablePassages.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <div className="text-4xl mb-4">📄</div>
                        <p>저장된 지문이 없습니다.</p>
                        <p className="text-sm mt-2">콘텐츠 생성 과정에서 지문이 생성되지 않았을 수 있습니다.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* 어휘 탭 */}
                {activeTab === 'vocabulary' && (
                  <div className="space-y-6">
                    {(() => {
                      // 핵심어와 어려운 어휘로 분류
                      const coreTerms = editableVocabTerms.filter(term => term.has_question_generated === true);
                      const difficultTerms = editableVocabTerms.filter(term => term.has_question_generated !== true);

                      return (
                        <>
                          {/* 핵심어 섹션 */}
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                            <div className="flex items-center mb-4">
                              <h3 className="text-lg font-semibold text-blue-800">📌 핵심어</h3>
                              <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {coreTerms.length}개
                              </span>
                            </div>
                            <p className="text-sm text-blue-600 mb-4">
                              어휘 문제 출제 대상이 되는 핵심 용어들입니다.
                            </p>

                            {coreTerms.length > 0 ? (
                              <div className="space-y-4">
                                {coreTerms.map((term, index) => {
                                  const originalIndex = editableVocabTerms.findIndex(t => t.id === term.id);
                                  return (
                                    <div key={term.id} className="bg-white border border-blue-200 rounded-lg p-4">
                                      <div className="flex justify-between items-center mb-3">
                                        <div className="flex items-center">
                                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                                            핵심어 {index + 1}
                                          </span>
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                          <label className="block text-xs text-gray-500 mb-1">용어 (읽기 전용)</label>
                                          <input
                                            type="text"
                                            value={term.term}
                                            readOnly
                                            className="w-full border border-gray-200 rounded-md px-2 py-1 text-sm bg-gray-100 text-gray-600"
                                            title="용어는 수정할 수 없습니다"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-xs text-gray-500 mb-1">정의</label>
                                          <input
                                            type="text"
                                            value={term.definition}
                                            onChange={(e) => {
                                              const updated = [...editableVocabTerms];
                                              updated[originalIndex].definition = e.target.value;
                                              setEditableVocabTerms(updated);
                                            }}
                                            className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-xs text-gray-500 mb-1">예문</label>
                                          <input
                                            type="text"
                                            value={term.example_sentence || ''}
                                            onChange={(e) => {
                                              const updated = [...editableVocabTerms];
                                              updated[originalIndex].example_sentence = e.target.value;
                                              setEditableVocabTerms(updated);
                                            }}
                                            className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-center py-4 text-blue-600">
                                <p>핵심어가 없습니다.</p>
                              </div>
                            )}
                          </div>

                          {/* 어려운 어휘 섹션 */}
                          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                            <div className="flex items-center mb-4">
                              <h3 className="text-lg font-semibold text-orange-800">📖 어려운 어휘</h3>
                              <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                {difficultTerms.length}개
                              </span>
                            </div>
                            <p className="text-sm text-orange-600 mb-4">
                              보조 설명용 용어들로, 문제 출제 대상이 아닙니다.
                            </p>

                            {difficultTerms.length > 0 ? (
                              <div className="space-y-4">
                                {difficultTerms.map((term, index) => {
                                  const originalIndex = editableVocabTerms.findIndex(t => t.id === term.id);
                                  return (
                                    <div key={term.id} className="bg-white border border-orange-200 rounded-lg p-4">
                                      <div className="flex justify-between items-center mb-3">
                                        <div className="flex items-center">
                                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 mr-2">
                                            어려운 어휘 {index + 1}
                                          </span>
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                          <label className="block text-xs text-gray-500 mb-1">용어 (읽기 전용)</label>
                                          <input
                                            type="text"
                                            value={term.term}
                                            readOnly
                                            className="w-full border border-gray-200 rounded-md px-2 py-1 text-sm bg-gray-100 text-gray-600"
                                            title="용어는 수정할 수 없습니다"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-xs text-gray-500 mb-1">정의</label>
                                          <input
                                            type="text"
                                            value={term.definition}
                                            onChange={(e) => {
                                              const updated = [...editableVocabTerms];
                                              updated[originalIndex].definition = e.target.value;
                                              setEditableVocabTerms(updated);
                                            }}
                                            className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-xs text-gray-500 mb-1">예문</label>
                                          <input
                                            type="text"
                                            value={term.example_sentence || ''}
                                            onChange={(e) => {
                                              const updated = [...editableVocabTerms];
                                              updated[originalIndex].example_sentence = e.target.value;
                                              setEditableVocabTerms(updated);
                                            }}
                                            className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-center py-4 text-orange-600">
                                <p>어려운 어휘가 없습니다.</p>
                              </div>
                            )}
                          </div>

                          {/* 전체 어휘가 없는 경우 */}
                          {editableVocabTerms.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                              <div className="text-4xl mb-4">📚</div>
                              <p>저장된 어휘가 없습니다.</p>
                              <p className="text-sm mt-2">콘텐츠 생성 과정에서 어휘가 생성되지 않았을 수 있습니다.</p>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* 어휘 문제 탭 */}
                {activeTab === 'vocab-questions' && (
                  <div className="space-y-6">
                    {(() => {
                      // 기본문제와 보완문제로 분류
                      const basicQuestions = editableVocabQuestions.filter(q => {
                        const isSupplementary = q.difficulty === '보완' ||
                                              q.question_type === '보완' ||
                                              q.is_supplementary === true;
                        console.log(`문제 "${q.term}" 분류:`, {
                          difficulty: q.difficulty,
                          question_type: q.question_type,
                          is_supplementary: q.is_supplementary,
                          isSupplementary: isSupplementary,
                          classification: isSupplementary ? '보완문제' : '기본문제'
                        });
                        return !isSupplementary;
                      });

                      const supplementaryQuestions = editableVocabQuestions.filter(q => {
                        const isSupplementary = q.difficulty === '보완' ||
                                              q.question_type === '보완' ||
                                              q.is_supplementary === true;
                        return isSupplementary;
                      });

                      console.log('문제 분류 결과:', {
                        총문제수: editableVocabQuestions.length,
                        기본문제수: basicQuestions.length,
                        보완문제수: supplementaryQuestions.length
                      });

                      // 전체 문제가 없을 때
                      if (editableVocabQuestions.length === 0) {
                        return (
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8">
                            <div className="text-center text-gray-500">
                              <div className="text-4xl mb-4">📝</div>
                              <p>저장된 어휘 문제가 없습니다.</p>
                              <p className="text-sm mt-2">콘텐츠 생성 과정에서 어휘 문제가 생성되지 않았을 수 있습니다.</p>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-6">
                          {/* 기본문제 섹션 */}
                          {basicQuestions.length > 0 ? (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                              <div className="flex items-center mb-4">
                                <h3 className="text-lg font-semibold text-green-800">✅ 기본문제</h3>
                                <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  {basicQuestions.length}개
                                </span>
                              </div>
                              <p className="text-sm text-green-600 mb-4">
                                핵심 어휘에 대한 기본 문제들입니다.
                              </p>

                              <div className="space-y-4">
                                {basicQuestions.map((question, index) => {
                                  const originalIndex = editableVocabQuestions.findIndex(q => q.id === question.id);
                                  return (
                                    <div key={question.id} className="bg-white border border-green-200 rounded-lg p-6">
                                      <div className="mb-4">
                                        <div className="flex justify-between items-center">
                                          <h4 className="font-semibold">기본문제 {index + 1} - {question.term}</h4>
                                          <div className="flex gap-2">
                                            <span className="text-sm text-gray-500">
                                              {question.detailed_question_type || '5지선다 객관식'}
                                            </span>
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                              기본문제
                                            </span>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="space-y-3">
                                        <div>
                                          <label className="block text-sm font-medium text-gray-700 mb-1">문제</label>
                                          <textarea
                                            value={question.question}
                                            onChange={(e) => {
                                              const updated = [...editableVocabQuestions];
                                              updated[originalIndex].question = e.target.value;
                                              setEditableVocabQuestions(updated);
                                            }}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 h-20 text-sm"
                                          />
                                        </div>

                                        {/* 문제 유형에 따른 조건부 렌더링 - 기본문제 */}
                                        {(question.detailed_question_type === '단답형 초성 문제' ||
                                          question.detailed_question_type === '단답형' ||
                                          question.question_type === '주관식') ? (
                                          // 주관식 힌트 영역
                                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                            <label className="block text-sm font-medium text-blue-800 mb-2">
                                              {question.detailed_question_type === '단답형 초성 문제' ? '💡 초성 힌트' : '💡 힌트'}
                                            </label>
                                            <input
                                              type="text"
                                              value={question.answer_initials || ''}
                                              onChange={(e) => {
                                                const updated = [...editableVocabQuestions];
                                                updated[originalIndex].answer_initials = e.target.value;
                                                setEditableVocabQuestions(updated);
                                              }}
                                              className="w-full border border-blue-300 rounded-md px-3 py-2 text-sm bg-white"
                                              placeholder={
                                                question.detailed_question_type === '단답형 초성 문제'
                                                  ? "초성 힌트"
                                                  : "힌트 또는 추가 정보"
                                              }
                                            />
                                            {/* 디버깅용 answer_initials 값 표시 */}
                                            <div className="text-xs text-gray-500 mt-1">
                                              현재 초성 힌트 값: "{question.answer_initials}"
                                            </div>
                                          </div>
                                        ) : (
                                          // 객관식 보기 영역
                                          (() => {
                                            // 문제 유형에 따른 보기 개수 결정
                                            let optionCount = 5; // 기본값: 5지선다
                                            if (question.detailed_question_type === '2개중 선택형') {
                                              optionCount = 2;
                                            } else if (question.detailed_question_type === '3개중 선택형') {
                                              optionCount = 3;
                                            } else if (question.detailed_question_type === '낱말 골라 쓰기') {
                                              optionCount = 4;
                                            }

                                            const gridCols = `grid-cols-${optionCount}`;

                                            return (
                                              <div className={`grid ${gridCols} gap-2`}>
                                                {Array.from({ length: optionCount }, (_, i) => i + 1).map(num => {
                                                  const optionValue = question[`option_${num}`];
                                                  console.log(`Question ${question.term} - Option ${num}:`, optionValue);
                                                  return (
                                                    <div key={num}>
                                                      <label className="block text-xs text-gray-500 mb-1">보기 {num}</label>
                                                      <input
                                                        type="text"
                                                        value={optionValue || ''}
                                                        onChange={(e) => {
                                                          const updated = [...editableVocabQuestions];
                                                          updated[originalIndex][`option_${num}`] = e.target.value;
                                                          setEditableVocabQuestions(updated);
                                                        }}
                                                        className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                                                        placeholder={`보기 ${num}`}
                                                      />
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            );
                                          })()
                                        )}

                                        <div className="space-y-3">
                                          <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">정답</label>
                                            <input
                                              type="text"
                                              value={question.correct_answer || ''}
                                              onChange={(e) => {
                                                const updated = [...editableVocabQuestions];
                                                updated[originalIndex].correct_answer = e.target.value;
                                                setEditableVocabQuestions(updated);
                                              }}
                                              className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                                              placeholder={
                                                (question.detailed_question_type === '단답형 초성 문제' ||
                                                 question.detailed_question_type === '단답형' ||
                                                 question.question_type === '주관식')
                                                  ? "정답 단어 (예: 안전교육)"
                                                  : question.detailed_question_type === '2개중 선택형'
                                                    ? "정답 번호 (예: 1, 2)"
                                                    : question.detailed_question_type === '3개중 선택형'
                                                      ? "정답 번호 (예: 1, 2, 3)"
                                                      : question.detailed_question_type === '낱말 골라 쓰기'
                                                        ? "정답 번호 (예: 1, 2, 3, 4)"
                                                        : "정답 번호 (예: 1, 2, 3, 4, 5)"
                                              }
                                            />
                                            {/* 디버깅용 정답 값 표시 */}
                                            <div className="text-xs text-gray-500 mt-1">
                                              현재 정답 값: "{question.correct_answer}"
                                              {(question.detailed_question_type === '단답형 초성 문제' ||
                                                question.detailed_question_type === '단답형' ||
                                                question.question_type === '주관식') && (
                                                <span className="text-blue-600 ml-2">
                                                  (주관식 문제: 단어 입력)
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">해설</label>
                                            <textarea
                                              value={question.explanation}
                                              onChange={(e) => {
                                                const updated = [...editableVocabQuestions];
                                                updated[originalIndex].explanation = e.target.value;
                                                setEditableVocabQuestions(updated);
                                              }}
                                              className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm h-20"
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                              <div className="text-center text-green-600">
                                <div className="text-4xl mb-4">✅</div>
                                <p>기본 어휘 문제가 없습니다.</p>
                                <p className="text-sm mt-2">모든 어휘 문제가 보완문제로 분류되었을 수 있습니다.</p>
                              </div>
                            </div>
                          )}

                          {/* 보완문제 섹션 */}
                          {supplementaryQuestions.length > 0 ? (
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                              <div className="flex items-center mb-4">
                                <h3 className="text-lg font-semibold text-orange-800">🔄 보완문제</h3>
                                <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                  {supplementaryQuestions.length}개
                                </span>
                              </div>
                              <p className="text-sm text-orange-600 mb-4">
                                추가적인 학습 보완을 위한 문제들입니다.
                              </p>

                              <div className="space-y-4">
                                {supplementaryQuestions.map((question, index) => {
                                  const originalIndex = editableVocabQuestions.findIndex(q => q.id === question.id);
                                  return (
                                    <div key={question.id} className="bg-white border border-orange-200 rounded-lg p-6">
                                      <div className="mb-4">
                                        <div className="flex justify-between items-center">
                                          <h4 className="font-semibold">보완문제 {index + 1} - {question.term}</h4>
                                          <div className="flex gap-2">
                                            <span className="text-sm text-gray-500">
                                              {question.detailed_question_type || '5지선다 객관식'}
                                            </span>
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                              보완문제
                                            </span>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="space-y-3">
                                        <div>
                                          <label className="block text-sm font-medium text-gray-700 mb-1">문제</label>
                                          <textarea
                                            value={question.question}
                                            onChange={(e) => {
                                              const updated = [...editableVocabQuestions];
                                              updated[originalIndex].question = e.target.value;
                                              setEditableVocabQuestions(updated);
                                            }}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 h-20 text-sm"
                                          />
                                        </div>

                                        {/* 문제 유형에 따른 조건부 렌더링 - 보완문제 */}
                                        {(question.detailed_question_type === '단답형 초성 문제' ||
                                          question.detailed_question_type === '단답형' ||
                                          question.question_type === '주관식') ? (
                                          // 주관식 힌트 영역
                                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                            <label className="block text-sm font-medium text-blue-800 mb-2">
                                              {question.detailed_question_type === '단답형 초성 문제' ? '💡 초성 힌트' : '💡 힌트'}
                                            </label>
                                            <input
                                              type="text"
                                              value={question.answer_initials || ''}
                                              onChange={(e) => {
                                                const updated = [...editableVocabQuestions];
                                                updated[originalIndex].answer_initials = e.target.value;
                                                setEditableVocabQuestions(updated);
                                              }}
                                              className="w-full border border-blue-300 rounded-md px-3 py-2 text-sm bg-white"
                                              placeholder={
                                                question.detailed_question_type === '단답형 초성 문제'
                                                  ? "초성 힌트"
                                                  : "힌트 또는 추가 정보"
                                              }
                                            />
                                            {/* 디버깅용 answer_initials 값 표시 */}
                                            <div className="text-xs text-gray-500 mt-1">
                                              현재 초성 힌트 값: "{question.answer_initials}"
                                            </div>
                                          </div>
                                        ) : (
                                          // 객관식 보기 영역
                                          (() => {
                                            // 문제 유형에 따른 보기 개수 결정
                                            let optionCount = 5; // 기본값: 5지선다
                                            if (question.detailed_question_type === '2개중 선택형') {
                                              optionCount = 2;
                                            } else if (question.detailed_question_type === '3개중 선택형') {
                                              optionCount = 3;
                                            } else if (question.detailed_question_type === '낱말 골라 쓰기') {
                                              optionCount = 4;
                                            }

                                            const gridCols = `grid-cols-${optionCount}`;

                                            return (
                                              <div className={`grid ${gridCols} gap-2`}>
                                                {Array.from({ length: optionCount }, (_, i) => i + 1).map(num => {
                                                  const optionValue = question[`option_${num}`];
                                                  console.log(`Question ${question.term} - Option ${num}:`, optionValue);
                                                  return (
                                                    <div key={num}>
                                                      <label className="block text-xs text-gray-500 mb-1">보기 {num}</label>
                                                      <input
                                                        type="text"
                                                        value={optionValue || ''}
                                                        onChange={(e) => {
                                                          const updated = [...editableVocabQuestions];
                                                          updated[originalIndex][`option_${num}`] = e.target.value;
                                                          setEditableVocabQuestions(updated);
                                                        }}
                                                        className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                                                        placeholder={`보기 ${num}`}
                                                      />
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            );
                                          })()
                                        )}

                                        <div className="space-y-3">
                                          <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">정답</label>
                                            <input
                                              type="text"
                                              value={question.correct_answer || ''}
                                              onChange={(e) => {
                                                const updated = [...editableVocabQuestions];
                                                updated[originalIndex].correct_answer = e.target.value;
                                                setEditableVocabQuestions(updated);
                                              }}
                                              className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                                              placeholder={
                                                (question.detailed_question_type === '단답형 초성 문제' ||
                                                 question.detailed_question_type === '단답형' ||
                                                 question.question_type === '주관식')
                                                  ? "정답 단어 (예: 안전교육)"
                                                  : question.detailed_question_type === '2개중 선택형'
                                                    ? "정답 번호 (예: 1, 2)"
                                                    : question.detailed_question_type === '3개중 선택형'
                                                      ? "정답 번호 (예: 1, 2, 3)"
                                                      : question.detailed_question_type === '낱말 골라 쓰기'
                                                        ? "정답 번호 (예: 1, 2, 3, 4)"
                                                        : "정답 번호 (예: 1, 2, 3, 4, 5)"
                                              }
                                            />
                                            {/* 디버깅용 정답 값 표시 */}
                                            <div className="text-xs text-gray-500 mt-1">
                                              현재 정답 값: "{question.correct_answer}"
                                              {(question.detailed_question_type === '단답형 초성 문제' ||
                                                question.detailed_question_type === '단답형' ||
                                                question.question_type === '주관식') && (
                                                <span className="text-blue-600 ml-2">
                                                  (주관식 문제: 단어 입력)
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">해설</label>
                                            <textarea
                                              value={question.explanation}
                                              onChange={(e) => {
                                                const updated = [...editableVocabQuestions];
                                                updated[originalIndex].explanation = e.target.value;
                                                setEditableVocabQuestions(updated);
                                              }}
                                              className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm h-20"
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                              <div className="text-center text-orange-600">
                                <div className="text-4xl mb-4">🔄</div>
                                <p>보완 어휘 문제가 없습니다.</p>
                                <p className="text-sm mt-2">필요에 따라 보완문제를 추가로 생성할 수 있습니다.</p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* 문단 문제 탭 */}
                {activeTab === 'paragraph-questions' && (
                  <div className="space-y-6">
                    {editableParagraphQuestions.map((question, index) => (
                      <div key={question.id} className="border border-gray-200 rounded-lg p-6">
                        <div className="mb-4">
                          <div className="flex justify-between items-center">
                            <h4 className="font-semibold">
                              문단 {question.paragraph_number} - 문제 {index + 1}
                            </h4>
                            <span className="text-sm text-gray-500">
                              {getQuestionTypeLabel(question.question_type)}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">문제</label>
                            <textarea
                              value={question.question}
                              onChange={(e) => {
                                const updated = [...editableParagraphQuestions];
                                updated[index].question = e.target.value;
                                setEditableParagraphQuestions(updated);
                              }}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 h-20 text-sm"
                            />
                          </div>

                          {question.question_type !== '주관식 단답형' && (
                            <div className="grid grid-cols-4 gap-2">
                              {[1, 2, 3, 4].map(num => {
                                const optionKey = `option_${num}`;
                                if (!question[optionKey]) return null;
                                return (
                                  <div key={num}>
                                    <label className="block text-xs text-gray-500 mb-1">보기 {num}</label>
                                    <input
                                      type="text"
                                      value={question[optionKey] || ''}
                                      onChange={(e) => {
                                        const updated = [...editableParagraphQuestions];
                                        updated[index][optionKey] = e.target.value;
                                        setEditableParagraphQuestions(updated);
                                      }}
                                      className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">정답</label>
                              <input
                                type="text"
                                value={question.correct_answer}
                                onChange={(e) => {
                                  const updated = [...editableParagraphQuestions];
                                  updated[index].correct_answer = e.target.value;
                                  setEditableParagraphQuestions(updated);
                                }}
                                className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">해설</label>
                              <textarea
                                value={question.explanation}
                                onChange={(e) => {
                                  const updated = [...editableParagraphQuestions];
                                  updated[index].explanation = e.target.value;
                                  setEditableParagraphQuestions(updated);
                                }}
                                className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm h-10"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 종합 문제 탭 */}
                {activeTab === 'comprehensive' && (
                  <div className="space-y-6">
                    {editableComprehensive.map((question, index) => (
                      <div key={question.id} className="border border-gray-200 rounded-lg p-6">
                        <div className="mb-4">
                          <div className="flex justify-between items-center">
                            <h4 className="font-semibold">문제 {index + 1}</h4>
                            <div className="flex gap-2">
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                {question.question_type}
                              </span>
                              {question.is_supplementary && (
                                <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">
                                  보완문제
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">문제</label>
                            <textarea
                              value={question.question}
                              onChange={(e) => {
                                const updated = [...editableComprehensive];
                                updated[index].question = e.target.value;
                                setEditableComprehensive(updated);
                              }}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 h-20 text-sm"
                            />
                          </div>

                          {question.question_format === 'multiple_choice' && (
                            <div className="grid grid-cols-5 gap-2">
                              {[1, 2, 3, 4, 5].map(num => {
                                const optionKey = `option_${num}`;
                                if (!question[optionKey]) return null;
                                return (
                                  <div key={num}>
                                    <label className="block text-xs text-gray-500 mb-1">보기 {num}</label>
                                    <input
                                      type="text"
                                      value={question[optionKey] || ''}
                                      onChange={(e) => {
                                        const updated = [...editableComprehensive];
                                        updated[index][optionKey] = e.target.value;
                                        setEditableComprehensive(updated);
                                      }}
                                      className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">정답</label>
                              <input
                                type="text"
                                value={question.correct_answer}
                                onChange={(e) => {
                                  const updated = [...editableComprehensive];
                                  updated[index].correct_answer = e.target.value;
                                  setEditableComprehensive(updated);
                                }}
                                className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">해설</label>
                              <textarea
                                value={question.explanation}
                                onChange={(e) => {
                                  const updated = [...editableComprehensive];
                                  updated[index].explanation = e.target.value;
                                  setEditableComprehensive(updated);
                                }}
                                className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm h-10"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 하단 버튼 */}
              <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? '저장 중...' : '변경사항 저장'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 text-center">
              <p className="text-gray-500">데이터를 불러올 수 없습니다.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}