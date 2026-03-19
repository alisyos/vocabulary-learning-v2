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
  const [currentStatus, setCurrentStatus] = useState<string>('검수 전');
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [selectedVocabTerm, setSelectedVocabTerm] = useState<string>('');

  // 시각자료 (이미지) 상태
  const [visualMaterials, setVisualMaterials] = useState<any[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);

  // 안전한 ID 기반 수정 함수들
  const updateVocabTerm = (termId: string, field: string, value: any) => {
    console.log(`🔧 어휘 용어 수정: ID=${termId}, field=${field}, value=`, value);
    setEditableVocabTerms(prev => prev.map(term =>
      term.id === termId ? { ...term, [field]: value } : term
    ));
  };

  const updateVocabQuestion = (questionId: string, field: string, value: any) => {
    console.log(`🔧 어휘 문제 수정: ID=${questionId}, field=${field}, value=`, value);
    setEditableVocabQuestions(prev => prev.map(question => {
      if (question.id === questionId) {
        const updatedQuestion = { ...question, [field]: value };

        // options 배열 업데이트 시 option_N 필드도 동기화
        if (field === 'options' && Array.isArray(value)) {
          value.forEach((opt, idx) => {
            updatedQuestion[`option_${idx + 1}`] = opt;
          });
        }

        return updatedQuestion;
      }
      return question;
    }));
  };

  const updateParagraphQuestion = (questionId: string, field: string, value: any) => {
    console.log(`🔧 문단 문제 수정: ID=${questionId}, field=${field}, value=`, value);
    setEditableParagraphQuestions(prev => prev.map(question => {
      if (question.id === questionId) {
        const updatedQuestion = { ...question, [field]: value };

        // options 배열 업데이트 시 option_N 필드도 동기화
        if (field === 'options' && Array.isArray(value)) {
          value.forEach((opt, idx) => {
            updatedQuestion[`option_${idx + 1}`] = opt;
          });
        }

        return updatedQuestion;
      }
      return question;
    }));
  };

  const updateComprehensiveQuestion = (questionId: string, field: string, value: any) => {
    console.log(`🔧 종합 문제 수정: ID=${questionId}, field=${field}, value=`, value);

    setEditableComprehensive(prev => {
      const updated = prev.map(question => {
        if (question.id === questionId) {
          const updatedQuestion = { ...question, [field]: value };

          // options 배열 업데이트 시 option_N 필드도 동기화
          if (field === 'options' && Array.isArray(value)) {
            value.forEach((opt, idx) => {
              updatedQuestion[`option_${idx + 1}`] = opt;
            });

            console.log('📝 종합 문제 options 배열 업데이트:', {
              questionId,
              oldOptions: question.options,
              newOptions: value,
              updatedQuestion: updatedQuestion
            });
          }

          return updatedQuestion;
        }
        return question;
      });

      return updated;
    });
  };

  // 상태 옵션 정의 (검수 전 제외)
  const statusOptions = [
    { value: '검수완료', label: '검수완료', color: 'bg-green-100 text-green-800' },
    { value: '승인완료', label: '승인완료', color: 'bg-blue-100 text-blue-800' }
  ];

  // 데이터 로드
  useEffect(() => {
    if (isOpen && contentSetId) {
      fetchContentData();
    }
  }, [isOpen, contentSetId]);

  // 시각자료 로드 함수
  const fetchVisualMaterials = async (sessionNumber: string | null | undefined) => {
    if (!sessionNumber) {
      console.log('차시 번호가 없어 이미지를 로드하지 않습니다.');
      setVisualMaterials([]);
      return;
    }

    setLoadingImages(true);
    try {
      const response = await fetch(`/api/images?session_number=${encodeURIComponent(sessionNumber)}&visible_only=true`);
      const result = await response.json();

      if (result.success && result.data) {
        console.log(`차시 ${sessionNumber}에 대한 이미지 ${result.data.length}개 로드됨`);
        setVisualMaterials(result.data);
      } else {
        console.error('이미지 로드 실패:', result.error);
        setVisualMaterials([]);
      }
    } catch (error) {
      console.error('이미지 로드 오류:', error);
      setVisualMaterials([]);
    } finally {
      setLoadingImages(false);
    }
  };

  const fetchContentData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/get-set-details-supabase?setId=${contentSetId}`);
      const result = await response.json();

      if (result.success && result.data) {
        console.log('Loaded data:', result.data);
        setData(result.data);

        // 현재 상태 설정
        setCurrentStatus(result.data.contentSet?.status || '검수 전');

        // 시각자료 로드
        const sessionNumber = result.data.contentSet?.session_number;
        if (sessionNumber) {
          fetchVisualMaterials(sessionNumber);
        }

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

        // 어휘 문제 데이터 상세 디버깅 (detailed_question_type 필드 확인)
        console.log('=== 어휘 문제 detailed_question_type 디버깅 ===');
        if (result.data.vocabularyQuestions && result.data.vocabularyQuestions.length > 0) {
          result.data.vocabularyQuestions.forEach((q, index) => {
            console.log(`어휘 문제 ${index + 1} (ID: ${q.id}):`, {
              term: q.term,
              question_type: q.question_type,
              detailed_question_type: q.detailed_question_type,
              detailedQuestionType: q.detailedQuestionType,
              difficulty: q.difficulty
            });
          });
        }
        console.log('=== 어휘 문제 디버깅 끝 ===');

        // 어휘 문제 데이터 필드 매핑 (ContentSet 관리 페이지와 동일하게)
        const mappedVocabQuestions = (result.data.vocabularyQuestions || []).map((q: any) => {
          console.log('🔄 ContentEditModal 어휘 문제 매핑:', {
            id: q.id,
            term: q.term,
            question_text: q.question_text,
            correct_answer: q.correct_answer,
            answer_initials: q.answer_initials
          });

          return {
            ...q,
            // 🔧 프론트엔드 호환성 필드 매핑
            question: q.question_text || q.question || '',
            correctAnswer: q.correct_answer || q.correctAnswer || '',
            answer: q.correct_answer || q.answer || '',
            options: q.options || [q.option_1, q.option_2, q.option_3, q.option_4, q.option_5].filter(opt => opt && opt.trim() !== '') || [],
            questionType: q.question_type || q.questionType || '객관식',
            detailedQuestionType: q.detailed_question_type || q.detailedQuestionType || '',
            answerInitials: q.answer_initials || q.answerInitials || '',
          };
        });

        setEditableVocabQuestions(mappedVocabQuestions);

        // 문단 문제 데이터 디버깅
        console.log('Paragraph Questions Raw Data:', result.data.paragraphQuestions);
        if (result.data.paragraphQuestions && result.data.paragraphQuestions.length > 0) {
          console.log('문단 문제 총 개수:', result.data.paragraphQuestions.length);
          result.data.paragraphQuestions.forEach((q, index) => {
            console.log(`문단 문제 ${index + 1}:`, {
              id: q.id,
              paragraph_number: q.paragraphNumber,
              question_type: q.questionType,
              question: q.question?.substring(0, 50) + '...',
            });
          });

          // 지문별 문제 개수 확인
          const questionsByPassage = {};
          result.data.paragraphQuestions.forEach(q => {
            const passageKey = q.paragraphNumber || 'unknown';
            questionsByPassage[passageKey] = (questionsByPassage[passageKey] || 0) + 1;
          });
          console.log('지문별 문단 문제 개수:', questionsByPassage);
        }

        // 문단 문제 데이터 필드 매핑 (어휘 문제와 동일한 방식)
        const mappedParagraphQuestions = (result.data.paragraphQuestions || []).map((q: any) => {
          console.log('🔄 ContentEditModal 문단 문제 매핑:', {
            id: q.id,
            questionType: q.questionType,
            question_text: q.question_text,
            correct_answer: q.correct_answer,
            answer_initials: q.answer_initials
          });

          return {
            ...q,
            // 🔧 프론트엔드 호환성 필드 매핑
            question: q.question_text || q.question || '',
            correctAnswer: q.correct_answer || q.correctAnswer || '',
            answer: q.correct_answer || q.answer || '',
            options: q.options || [q.option_1, q.option_2, q.option_3, q.option_4, q.option_5].filter(opt => opt && opt.trim() !== '') || [],
            questionType: q.question_type || q.questionType || '객관식',
            answerInitials: q.answer_initials || q.answerInitials || '',
          };
        });

        setEditableParagraphQuestions(mappedParagraphQuestions);

        // 종합 문제 데이터 필드 매핑 (어휘/문단 문제와 동일한 방식)
        const mappedComprehensiveQuestions = (result.data.comprehensiveQuestions || []).map((q: any) => {
          console.log('🔄 ContentEditModal 종합 문제 매핑:', {
            id: q.id,
            question_type: q.question_type,
            question_text: q.question_text,
            correct_answer: q.correct_answer,
            option_1: q.option_1,
            option_2: q.option_2
          });

          return {
            ...q,
            // 🔧 프론트엔드 호환성 필드 매핑
            question: q.question_text || q.question || '',
            correctAnswer: q.correct_answer || q.correctAnswer || '',
            answer: q.correct_answer || q.answer || '',
            options: q.options || [q.option_1, q.option_2, q.option_3, q.option_4, q.option_5].filter(opt => opt && opt.trim() !== '') || [],
            questionType: q.question_type || q.questionType || '객관식',
            answerInitials: q.answer_initials || q.answerInitials || '',
          };
        });

        setEditableComprehensive(mappedComprehensiveQuestions);
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
      if (!data) {
        alert('저장할 데이터가 없습니다.');
        return;
      }

      // 저장할 데이터 구성
      const saveData = {
        contentSetId: contentSetId,
        contentSet: {
          ...data.contentSet,
          // 기본 정보는 현재 편집된 값들로 업데이트
          introduction_question: introductionQuestion
        },
        passages: editablePassages,
        vocabularyTerms: editableVocabTerms,
        vocabularyQuestions: editableVocabQuestions,
        paragraphQuestions: editableParagraphQuestions,
        comprehensiveQuestions: editableComprehensive
      };

      console.log('저장할 데이터:', saveData);

      // 종합 문제 options 배열 디버깅
      console.log('🔍 종합 문제 저장 데이터 디버깅:');
      editableComprehensive.slice(0, 2).forEach((question, index) => {
        console.log(`종합 문제 ${index + 1}:`, {
          id: question.id,
          question: question.question,
          options: question.options,
          option_1: question.option_1,
          option_2: question.option_2,
          correctAnswer: question.correctAnswer,
          answer: question.answer
        });
      });

      // 저장 API 호출 (기존 API 구조에 맞춰 데이터 재구성)
      // editablePassages의 paragraph_1, paragraph_2... 형태를 paragraphs 배열로 변환
      const processedPassages = editablePassages.map(passage => ({
        ...passage,
        paragraphs: [
          passage.paragraph_1,
          passage.paragraph_2,
          passage.paragraph_3,
          passage.paragraph_4,
          passage.paragraph_5,
          passage.paragraph_6,
          passage.paragraph_7,
          passage.paragraph_8,
          passage.paragraph_9,
          passage.paragraph_10
        ].filter(p => p && p.trim() !== '') // 빈 문단 제거
      }));

      const apiData = {
        contentSetId: contentSetId,
        editableIntroductionQuestion: introductionQuestion,
        editablePassages: processedPassages,
        editableVocabulary: editableVocabTerms,
        editableVocabQuestions: editableVocabQuestions,
        editableParagraphQuestions: editableParagraphQuestions,
        editableComprehensive: editableComprehensive
      };

      console.log('API 전송 데이터:', apiData);
      console.log('원본 editablePassages:', editablePassages);
      console.log('변환된 processedPassages:', processedPassages);

      // 어휘 문제 저장 데이터 상세 디버깅
      console.log('=== 저장할 어휘 문제 데이터 디버깅 ===');
      if (editableVocabQuestions && editableVocabQuestions.length > 0) {
        editableVocabQuestions.forEach((q, index) => {
          console.log(`저장할 어휘 문제 ${index + 1} (ID: ${q.id}):`, {
            term: q.term,
            question_type: q.question_type,
            detailed_question_type: q.detailed_question_type,
            detailedQuestionType: q.detailedQuestionType,
            difficulty: q.difficulty,
            hasAllFields: {
              has_detailed_question_type: !!q.detailed_question_type,
              has_detailedQuestionType: !!q.detailedQuestionType,
              has_question_type: !!q.question_type
            }
          });
        });
      }
      console.log('=== 저장 데이터 디버깅 끝 ===');

      const response = await fetch('/api/update-content-set', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData)
      });

      const result = await response.json();

      if (result.success) {
        alert('변경사항이 성공적으로 저장되었습니다.');
        console.log('저장 완료:', result);

        // 저장 성공 후 데이터 새로고침
        await fetchContentData();
      } else {
        console.error('저장 실패:', result.error);
        alert(`저장 실패: ${result.error || '알 수 없는 오류가 발생했습니다.'}`);
      }
    } catch (error) {
      console.error('저장 오류:', error);
      alert('저장 중 오류가 발생했습니다. 네트워크 연결을 확인해주세요.');
    } finally {
      setSaving(false);
    }
  };

  // 상태 업데이트 함수
  const handleStatusUpdate = async (newStatus: string) => {
    setStatusUpdating(true);
    try {
      const response = await fetch('/api/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          setId: contentSetId,
          status: newStatus
        })
      });

      const result = await response.json();

      if (result.success) {
        setCurrentStatus(newStatus);
        console.log(`상태가 "${newStatus}"로 변경되었습니다.`);
        // alert 대신 조용한 성공 처리
      } else {
        console.error('상태 업데이트 실패:', result.error);
        alert(`상태 변경 실패: ${result.error}`);
      }
    } catch (error) {
      console.error('상태 업데이트 중 오류:', error);
      alert('상태 변경 중 오류가 발생했습니다.');
    } finally {
      setStatusUpdating(false);
    }
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'info', name: '기본 정보', icon: '📋' },
    { id: 'passages', name: '지문', icon: '📖' },
    { id: 'vocabulary', name: '어휘', icon: '📚' },
    { id: 'vocab-questions', name: '어휘 문제', icon: '❓' },
    { id: 'paragraph-questions', name: '지문 문제', icon: '📄' },
    { id: 'comprehensive', name: '종합 문제', icon: '🧠' },
    { id: 'visual-materials', name: '시각자료', icon: '🖼️' }
  ];

  // 저장 중 로딩 모달
  const SavingModal = () => {
    if (!saving) return null;

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center">
        {/* 배경 오버레이 */}
        <div className="absolute inset-0 bg-black bg-opacity-70"></div>

        {/* 로딩 내용 */}
        <div className="relative bg-white rounded-lg p-8 shadow-2xl max-w-sm w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">변경사항 저장 중</h3>
            <p className="text-sm text-gray-600 mb-4">
              콘텐츠를 저장하고 있습니다.<br />
              잠시만 기다려 주세요.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-xs text-yellow-800">
                ⚠️ 저장이 완료될 때까지 브라우저를 닫지 마세요.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

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
        <div className={`relative bg-white rounded-lg max-w-[95vw] w-full max-h-[95vh] overflow-hidden ${
          saving ? 'pointer-events-none opacity-75' : ''
        }`}>
          {/* 헤더 */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1 mr-4">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  {data?.contentSet?.session_number && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-base font-medium bg-white/20 text-white">
                      {data.contentSet.session_number}차시
                      {data.contentSet.grade_number && ` (${data.contentSet.grade_number})`}
                    </span>
                  )}
                  콘텐츠 세트 수정
                </h2>
                {data && (
                  <div className="text-sm opacity-90 mt-1">
                    <p className="break-words">
                      제목: {data.contentSet.title || '제목 없음'} | ID: {contentSetId}
                    </p>
                  </div>
                )}
              </div>

              {/* 상태 드롭다운과 닫기 버튼 */}
              <div className="flex items-center gap-4 flex-shrink-0">
                {data && (
                  <div className="text-right">
                    <label className="block text-xs opacity-75 mb-1">상태</label>
                    <div className="flex items-center">
                      <select
                        value={currentStatus}
                        onChange={(e) => handleStatusUpdate(e.target.value)}
                        disabled={statusUpdating}
                        className="text-sm rounded px-2 py-1 border border-white/20 bg-white/10 text-white focus:bg-white focus:text-gray-900 focus:outline-none disabled:opacity-50"
                      >
                        {statusOptions.map(option => (
                          <option
                            key={option.value}
                            value={option.value}
                            className="text-gray-900"
                          >
                            {option.label}
                          </option>
                        ))}
                      </select>
                      {statusUpdating && (
                        <span className="ml-2 text-xs opacity-75">업데이트 중...</span>
                      )}
                    </div>
                  </div>
                )}

                <button
                  onClick={saving ? undefined : onClose}
                  disabled={saving}
                  className={`text-white text-2xl ${
                    saving
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:text-gray-200 cursor-pointer'
                  }`}
                >
                  ✕
                </button>
              </div>
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
                    onClick={saving ? undefined : () => setActiveTab(tab.id)}
                    disabled={saving}
                    className={`px-6 py-3 text-sm font-medium transition-all ${
                      activeTab === tab.id
                        ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                        : saving
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <span className="mr-2">{tab.icon}</span>
                    {tab.name}
                  </button>
                ))}
              </div>

              {/* 탭 내용 */}
              <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(95vh - 220px)' }}>
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
                          <p><strong>핵심어:</strong> {editableVocabTerms
                            .filter(term => term.has_question_generated === true)
                            .map(term => term.term)
                            .join(', ') || '-'}</p>
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
                        <p><strong>지문 문제:</strong> {data.contentSet.total_paragraph_questions || 0}</p>
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

                      // 지문이 2개 이상인지 확인
                      const hasMultiplePassages = editablePassages.length >= 2;

                      // 어려운 어휘를 지문별로 그룹핑
                      const difficultByPassage1 = difficultTerms.filter(t =>
                        t.passage_id === editablePassages[0]?.id
                      );
                      const difficultByPassage2 = difficultTerms.filter(t =>
                        t.passage_id === editablePassages[1]?.id
                      );
                      const difficultUnassigned = difficultTerms.filter(t =>
                        !t.passage_id || !editablePassages.some((p: any) => p.id === t.passage_id)
                      );

                      // 지문 텍스트에 용어가 포함되는지 검사
                      const isTermInItsPassage = (termText: string, passageId?: string): boolean => {
                        const targetPassages = passageId
                          ? editablePassages.filter((p: any) => p.id === passageId)
                          : editablePassages;
                        const passageText = targetPassages
                          .map((p: any) => [p.paragraph_1, p.paragraph_2, p.paragraph_3, p.paragraph_4, p.paragraph_5,
                            p.paragraph_6, p.paragraph_7, p.paragraph_8, p.paragraph_9, p.paragraph_10]
                            .filter(Boolean).join(' '))
                          .join(' ');
                        return passageText.includes(termText);
                      };

                      // 어휘 카드 렌더링 함수
                      const renderTermCard = (term: any, index: number, type: 'core' | 'difficult', showPassageMove?: boolean) => {
                        const termId = term.id;
                        const notInPassage = !isTermInItsPassage(term.term, term.passage_id);

                        return (
                          <div key={term.id} className={`bg-white border ${type === 'core' ? 'border-blue-200' : 'border-orange-200'} rounded-lg p-4`}>
                            <div className="flex justify-between items-center mb-3">
                              <div className="flex items-center flex-wrap gap-1">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${type === 'core' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'} mr-2`}>
                                  {type === 'core' ? `핵심어 ${index + 1}` : `어려운 어휘 ${index + 1}`}
                                </span>
                                {notInPassage && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                                    지문 미포함
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                {showPassageMove && hasMultiplePassages && (
                                  <>
                                    {term.passage_id !== editablePassages[0]?.id && (
                                      <button
                                        onClick={() => updateVocabTerm(termId, 'passage_id', editablePassages[0]?.id)}
                                        className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                                        title="지문1로 이동"
                                      >
                                        지문1
                                      </button>
                                    )}
                                    {term.passage_id !== editablePassages[1]?.id && (
                                      <button
                                        onClick={() => updateVocabTerm(termId, 'passage_id', editablePassages[1]?.id)}
                                        className="text-xs px-2 py-1 bg-green-50 text-green-600 rounded hover:bg-green-100"
                                        title="지문2로 이동"
                                      >
                                        지문2
                                      </button>
                                    )}
                                  </>
                                )}
                                {type !== 'core' && (
                                <button
                                  onClick={() => {
                                    if (window.confirm('이 어려운 어휘를 삭제하시겠습니까?')) {
                                      setEditableVocabTerms(prev => prev.filter(t => t.id !== termId));
                                    }
                                  }}
                                  className="text-xs px-2 py-1 bg-red-50 text-red-500 rounded hover:bg-red-100"
                                  title="삭제"
                                >
                                  삭제
                                </button>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">용어</label>
                                <input
                                  type="text"
                                  value={term.term}
                                  onChange={(e) => updateVocabTerm(termId, 'term', e.target.value)}
                                  readOnly={type === 'core'}
                                  className={`w-full border border-gray-300 rounded-md px-2 py-1 text-sm ${type === 'core' ? 'bg-gray-100 text-gray-600' : ''}`}
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">정의</label>
                                <input
                                  type="text"
                                  value={term.definition}
                                  onChange={(e) => updateVocabTerm(termId, 'definition', e.target.value)}
                                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">예문</label>
                                <input
                                  type="text"
                                  value={term.example_sentence || ''}
                                  onChange={(e) => updateVocabTerm(termId, 'example_sentence', e.target.value)}
                                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      };

                      // 인라인 추가 폼 렌더링 함수
                      const renderAddForm = (type: 'core' | 'difficult') => {
                        const formId = `add-${type}-form`;
                        return (
                          <div id={formId} className="hidden bg-white border border-dashed border-gray-300 rounded-lg p-4 mt-3">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">용어 *</label>
                                <input type="text" id={`${formId}-term`} className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm" placeholder="용어 입력" />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">정의 *</label>
                                <input type="text" id={`${formId}-def`} className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm" placeholder="정의 입력" />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">예문 *</label>
                                <input type="text" id={`${formId}-example`} className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm" placeholder="예문 입력" />
                              </div>
                            </div>
                            {type === 'difficult' && hasMultiplePassages && (
                              <div className="mb-3">
                                <label className="block text-xs text-gray-500 mb-1">지문 선택</label>
                                <select id={`${formId}-passage`} className="border border-gray-300 rounded-md px-2 py-1 text-sm">
                                  <option value={editablePassages[0]?.id}>지문 1</option>
                                  <option value={editablePassages[1]?.id}>지문 2</option>
                                </select>
                              </div>
                            )}
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  const termEl = document.getElementById(`${formId}-term`) as HTMLInputElement;
                                  const defEl = document.getElementById(`${formId}-def`) as HTMLInputElement;
                                  const exampleEl = document.getElementById(`${formId}-example`) as HTMLInputElement;
                                  const passageEl = document.getElementById(`${formId}-passage`) as HTMLSelectElement;

                                  if (!termEl?.value?.trim() || !defEl?.value?.trim() || !exampleEl?.value?.trim()) {
                                    alert('용어, 정의, 예문은 필수 입력 항목입니다.');
                                    return;
                                  }

                                  const newTerm = {
                                    id: `new-${Date.now()}`,
                                    content_set_id: contentSetId,
                                    term: termEl.value.trim(),
                                    definition: defEl.value.trim(),
                                    example_sentence: exampleEl.value.trim(),
                                    has_question_generated: type === 'core',
                                    passage_id: passageEl?.value || editablePassages[0]?.id || null
                                  };

                                  setEditableVocabTerms(prev => [...prev, newTerm]);

                                  // 폼 초기화 및 닫기
                                  termEl.value = '';
                                  defEl.value = '';
                                  exampleEl.value = '';
                                  document.getElementById(formId)!.classList.add('hidden');
                                }}
                                className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                              >
                                추가
                              </button>
                              <button
                                onClick={() => document.getElementById(formId)!.classList.add('hidden')}
                                className="px-3 py-1 text-sm bg-gray-200 text-gray-600 rounded hover:bg-gray-300"
                              >
                                취소
                              </button>
                            </div>
                          </div>
                        );
                      };

                      // 어려운 어휘 리스트 렌더링 (지문별 구분 또는 단일 리스트)
                      const renderDifficultTermsList = () => {
                        if (!hasMultiplePassages) {
                          // 지문 1개일 때: 단일 리스트
                          return (
                            <div className="space-y-4">
                              {difficultTerms.map((term, index) => renderTermCard(term, index, 'difficult', false))}
                            </div>
                          );
                        }

                        // 지문 2개 이상일 때: 지문별 구분
                        return (
                          <div className="space-y-6">
                            {/* 지문1 어휘 */}
                            <div>
                              <h4 className="text-sm font-medium text-orange-700 mb-2 flex items-center">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700 mr-2">지문 1</span>
                                {editablePassages[0]?.title && <span className="text-gray-500 text-xs truncate max-w-xs">{editablePassages[0].title}</span>}
                                <span className="ml-2 text-xs text-gray-400">({difficultByPassage1.length}개)</span>
                              </h4>
                              {difficultByPassage1.length > 0 ? (
                                <div className="space-y-4">
                                  {difficultByPassage1.map((term, index) => renderTermCard(term, index, 'difficult', true))}
                                </div>
                              ) : (
                                <p className="text-sm text-gray-400 py-2">지문1에 해당하는 어려운 어휘가 없습니다.</p>
                              )}
                            </div>

                            {/* 지문2 어휘 */}
                            <div>
                              <h4 className="text-sm font-medium text-orange-700 mb-2 flex items-center">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-50 text-green-700 mr-2">지문 2</span>
                                {editablePassages[1]?.title && <span className="text-gray-500 text-xs truncate max-w-xs">{editablePassages[1].title}</span>}
                                <span className="ml-2 text-xs text-gray-400">({difficultByPassage2.length}개)</span>
                              </h4>
                              {difficultByPassage2.length > 0 ? (
                                <div className="space-y-4">
                                  {difficultByPassage2.map((term, index) => renderTermCard(term, index, 'difficult', true))}
                                </div>
                              ) : (
                                <p className="text-sm text-gray-400 py-2">지문2에 해당하는 어려운 어휘가 없습니다.</p>
                              )}
                            </div>

                            {/* 미배정 어휘 */}
                            {difficultUnassigned.length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium text-orange-700 mb-2 flex items-center">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600 mr-2">미배정</span>
                                  <span className="ml-2 text-xs text-gray-400">({difficultUnassigned.length}개)</span>
                                </h4>
                                <div className="space-y-4">
                                  {difficultUnassigned.map((term, index) => renderTermCard(term, index, 'difficult', true))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      };

                      return (
                        <>
                          {/* 핵심어 섹션 */}
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center">
                                <h3 className="text-lg font-semibold text-blue-800">핵심어</h3>
                                <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {coreTerms.length}개
                                </span>
                              </div>
                            </div>
                            <p className="text-sm text-blue-600 mb-4">
                              어휘 문제 출제 대상이 되는 핵심 용어들입니다. (어휘 문제와 연결되어 있어 추가/삭제 불가)
                            </p>

                            {coreTerms.length > 0 ? (
                              <div className="space-y-4 mt-4">
                                {coreTerms.map((term, index) => renderTermCard(term, index, 'core'))}
                              </div>
                            ) : (
                              <div className="text-center py-4 text-blue-600">
                                <p>핵심어가 없습니다.</p>
                              </div>
                            )}
                          </div>

                          {/* 어려운 어휘 섹션 */}
                          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center">
                                <h3 className="text-lg font-semibold text-orange-800">어려운 어휘</h3>
                                <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                  {difficultTerms.length}개
                                </span>
                              </div>
                              <button
                                onClick={() => document.getElementById('add-difficult-form')?.classList.toggle('hidden')}
                                className="text-sm px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600"
                              >
                                + 어려운 어휘 추가
                              </button>
                            </div>
                            <p className="text-sm text-orange-600 mb-4">
                              보조 설명용 용어들로, 문제 출제 대상이 아닙니다.
                            </p>

                            {renderAddForm('difficult')}

                            {difficultTerms.length > 0 ? (
                              <div className="mt-4">
                                {renderDifficultTermsList()}
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

                      // 어휘(term)별로 문제 그룹화
                      const termGroups: Record<string, { basic: any[]; supplementary: any[] }> = {};
                      const termOrder: string[] = [];
                      editableVocabQuestions.forEach(q => {
                        const term = q.term || '(알 수 없음)';
                        if (!termGroups[term]) {
                          termGroups[term] = { basic: [], supplementary: [] };
                          termOrder.push(term);
                        }
                        const isSupplementary = q.difficulty === '보완' ||
                                              q.question_type === '보완' ||
                                              q.is_supplementary === true;
                        if (isSupplementary) {
                          termGroups[term].supplementary.push(q);
                        } else {
                          termGroups[term].basic.push(q);
                        }
                      });

                      // 선택된 어휘가 없거나 유효하지 않으면 첫 번째 어휘 선택
                      const activeTerm = (selectedVocabTerm && termGroups[selectedVocabTerm]) ? selectedVocabTerm : termOrder[0];
                      const activeGroup = termGroups[activeTerm] || { basic: [], supplementary: [] };

                      // 문제 카드 렌더링 헬퍼
                      const renderQuestionCard = (question: any, label: string, index: number, borderColor: string, labelBg: string, labelText: string) => {
                        const questionId = question.id;
                        return (
                          <div key={question.id} className={`bg-white border ${borderColor} rounded-lg p-6`}>
                            <div className="mb-4">
                              <div className="flex justify-between items-center">
                                <h4 className="font-semibold">{label} {index + 1}</h4>
                                <div className="flex gap-2">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                    {question.detailed_question_type || '5지선다 객관식'}
                                  </span>
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${labelBg} ${labelText}`}>
                                    {label}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-3">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">문제</label>
                                <textarea
                                  value={question.question}
                                  onChange={(e) => updateVocabQuestion(questionId, 'question', e.target.value)}
                                  className="w-full border border-gray-300 rounded-md px-3 py-2 h-20 text-sm"
                                />
                              </div>

                              {(question.detailed_question_type === '단답형 초성 문제' ||
                                question.detailed_question_type === '단답형' ||
                                question.question_type === '주관식') ? (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                  <label className="block text-sm font-medium text-blue-800 mb-2">
                                    {question.detailed_question_type === '단답형 초성 문제' ? '💡 초성 힌트' : '💡 힌트'}
                                  </label>
                                  <input
                                    type="text"
                                    value={question.answerInitials || question.answer_initials || ''}
                                    onChange={(e) => updateVocabQuestion(questionId, 'answerInitials', e.target.value)}
                                    className="w-full border border-blue-300 rounded-md px-3 py-2 text-sm bg-white"
                                    placeholder={
                                      question.detailed_question_type === '단답형 초성 문제'
                                        ? "초성 힌트"
                                        : "힌트 또는 추가 정보"
                                    }
                                  />
                                  <div className="text-xs text-gray-500 mt-1">
                                    현재 초성 힌트 값: &quot;{question.answer_initials}&quot;
                                  </div>
                                </div>
                              ) : (
                                (() => {
                                  let optionCount = 5;
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
                                        const optionValue = (question.options && question.options[num - 1]) || question[`option_${num}`] || '';
                                        return (
                                          <div key={num}>
                                            <label className="block text-xs text-gray-500 mb-1">보기 {num}</label>
                                            <input
                                              type="text"
                                              value={optionValue}
                                              onChange={(e) => {
                                                const newValue = e.target.value;
                                                const currentOptions = question.options
                                                  ? [...question.options]
                                                  : [
                                                      question.option_1 || '',
                                                      question.option_2 || '',
                                                      question.option_3 || '',
                                                      question.option_4 || '',
                                                      question.option_5 || ''
                                                    ];
                                                const oldOptionValue = currentOptions[num - 1];
                                                currentOptions[num - 1] = newValue;
                                                updateVocabQuestion(questionId, 'options', currentOptions);
                                                const currentAnswer = question.correctAnswer || question.correct_answer || '';
                                                if (currentAnswer === String(num)) {
                                                  updateVocabQuestion(questionId, 'correctAnswer', String(num));
                                                } else if (currentAnswer === oldOptionValue && oldOptionValue !== '') {
                                                  updateVocabQuestion(questionId, 'correctAnswer', newValue);
                                                }
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
                                    value={question.correctAnswer || question.correct_answer || ''}
                                    onChange={(e) => updateVocabQuestion(questionId, 'correctAnswer', e.target.value)}
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
                                  <div className="text-xs text-gray-500 mt-1">
                                    현재 정답 값: &quot;{question.correct_answer}&quot;
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
                                    onChange={(e) => updateVocabQuestion(questionId, 'explanation', e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm h-20"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      };

                      return (
                        <div className="space-y-4">
                          {/* 어휘별 탭 네비게이션 */}
                          <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
                            {termOrder.map((term) => {
                              const group = termGroups[term];
                              const totalCount = group.basic.length + group.supplementary.length;
                              const isActive = term === activeTerm;
                              return (
                                <button
                                  key={term}
                                  onClick={() => setSelectedVocabTerm(term)}
                                  className={`px-3 py-2 rounded-t-lg text-sm font-medium transition-colors ${
                                    isActive
                                      ? 'bg-indigo-600 text-white'
                                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                  }`}
                                >
                                  {term}
                                  <span className={`ml-1.5 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-xs ${
                                    isActive ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-600'
                                  }`}>
                                    {totalCount}
                                  </span>
                                </button>
                              );
                            })}
                          </div>

                          {/* 선택된 어휘의 문제 표시 */}
                          <div className="space-y-6">
                            {/* 기본문제 섹션 */}
                            {activeGroup.basic.length > 0 && (
                              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                                <div className="flex items-center mb-4">
                                  <h3 className="text-lg font-semibold text-green-800">기본문제</h3>
                                  <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    {activeGroup.basic.length}개
                                  </span>
                                </div>
                                <div className="space-y-4">
                                  {activeGroup.basic.map((question, index) =>
                                    renderQuestionCard(question, '기본문제', index, 'border-green-200', 'bg-green-100', 'text-green-800')
                                  )}
                                </div>
                              </div>
                            )}

                            {/* 보완문제 섹션 */}
                            {activeGroup.supplementary.length > 0 && (
                              <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                                <div className="flex items-center mb-4">
                                  <h3 className="text-lg font-semibold text-orange-800">보완문제</h3>
                                  <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                    {activeGroup.supplementary.length}개
                                  </span>
                                </div>
                                <div className="space-y-4">
                                  {activeGroup.supplementary.map((question, index) =>
                                    renderQuestionCard(question, '보완문제', index, 'border-orange-200', 'bg-orange-100', 'text-orange-800')
                                  )}
                                </div>
                              </div>
                            )}

                            {/* 해당 어휘에 문제가 없는 경우 */}
                            {activeGroup.basic.length === 0 && activeGroup.supplementary.length === 0 && (
                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-8">
                                <div className="text-center text-gray-500">
                                  <p>이 어휘에 대한 문제가 없습니다.</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* 지문 문제 탭 */}
                {activeTab === 'paragraph-questions' && (
                  <div className="space-y-6">
                    {(() => {
                      // 지문별로 지문 문제를 그룹화
                      const questionsByPassage = {};
                      editableParagraphQuestions.forEach((question) => {
                        const passageKey = question.paragraphNumber || question.paragraph_number || 'unknown';
                        if (!questionsByPassage[passageKey]) {
                          questionsByPassage[passageKey] = [];
                        }
                        questionsByPassage[passageKey].push(question);
                      });

                      // 지문 번호 순으로 정렬
                      const sortedPassageKeys = Object.keys(questionsByPassage).sort((a, b) => {
                        if (a === 'unknown') return 1;
                        if (b === 'unknown') return -1;
                        return parseInt(a) - parseInt(b);
                      });

                      console.log('문단 문제 그룹화 결과:', questionsByPassage);

                      return sortedPassageKeys.map(passageKey => (
                        <div key={passageKey} className="bg-gray-50 border border-gray-300 rounded-lg p-6">
                          <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">
                            📖 {passageKey === 'unknown' ? '지문 정보 없음' : `지문 ${passageKey}`}
                            <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {questionsByPassage[passageKey].length}개 문제
                            </span>
                          </h3>

                          <div className="space-y-4">
                            {questionsByPassage[passageKey].map((question, questionIndex) => {
                              const questionId = question.id;
                              return (
                              <div key={question.id} className="bg-white border border-gray-200 rounded-lg p-6">
                                <div className="mb-4">
                                  <div className="flex justify-between items-center">
                                    <h4 className="font-semibold">
                                      문제 {questionIndex + 1}
                                    </h4>
                                    <span className="text-sm text-gray-500">
                                      {getQuestionTypeLabel(question.questionType || question.question_type)}
                                    </span>
                                  </div>
                                </div>

                                <div className="space-y-3">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">문제</label>
                                    <textarea
                                      value={question.question}
                                      onChange={(e) => updateParagraphQuestion(questionId, 'question', e.target.value)}
                                      className="w-full border border-gray-300 rounded-md px-3 py-2 h-20 text-sm"
                                    />
                                  </div>

                                  {(() => {
                                    const questionType = question.questionType || question.question_type;

                                    // 디버깅용 로그 - 문제 유형 확인
                                    console.log(`🔍 문단 문제 유형 분석:`, {
                                      questionType,
                                      questionId: question.id,
                                      originalQuestionType: question.questionType,
                                      questionTypeField: question.question_type,
                                      allFields: Object.keys(question)
                                    });

                                    // 주관식 유형 체크 함수
                                    const isSubjectiveType = (type) => {
                                      if (!type) return false;
                                      const subjectiveKeywords = ['주관', '단답', '서술', '초성'];
                                      return subjectiveKeywords.some(keyword => type.includes(keyword)) ||
                                             type === '주관식' ||
                                             type === '주관식 단답형' ||
                                             type === '단답형' ||
                                             type === '서술형';
                                    };

                                    // 2. 주관식: 초성 힌트 표시 (우선 체크)
                                    if (isSubjectiveType(questionType)) {
                                      console.log(`✅ 주관식 유형으로 인식: "${questionType}"`);
                                      return (
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                          <label className="block text-sm font-medium text-blue-800 mb-2">
                                            💡 초성 힌트 (주관식: {questionType})
                                          </label>
                                          <input
                                            type="text"
                                            value={question.answerInitials || question.answer_initials || ''}
                                            onChange={(e) => {
                                              updateParagraphQuestion(questionId, 'answerInitials', e.target.value);
                                              updateParagraphQuestion(questionId, 'answer_initials', e.target.value);
                                            }}
                                            className="w-full border border-blue-300 rounded-md px-3 py-2 text-sm bg-white"
                                            placeholder="초성 힌트 (예: ㅇㅈㄱㅇ)"
                                          />
                                          <div className="text-xs text-gray-500 mt-1">
                                            현재 초성 힌트 값: "{question.answerInitials || question.answer_initials || ''}"
                                          </div>
                                        </div>
                                      );
                                    }

                                    // 3. 문장 완성하기: 어절 목록 표시 (주관식)
                                    if (questionType === '문장 완성하기' || questionType === '어절 순서 맞추기') {
                                      return (
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                          <label className="block text-sm font-medium text-green-800 mb-2">
                                            📝 어절 목록 (word_segments)
                                          </label>
                                          <div className="flex flex-wrap gap-2 mb-3">
                                            {(question.wordSegments || []).map((segment, idx) => (
                                              <span key={idx} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                {segment}
                                              </span>
                                            ))}
                                          </div>
                                          <textarea
                                            value={(question.wordSegments || []).join(', ')}
                                            onChange={(e) => {
                                              const segments = e.target.value.split(',').map(s => s.trim()).filter(s => s);
                                              updateParagraphQuestion(questionId, 'wordSegments', segments);
                                            }}
                                            className="w-full border border-green-300 rounded-md px-3 py-2 text-sm bg-white h-20"
                                            placeholder="어절들을 쉼표로 구분하여 입력하세요 (예: 잘게, 음식이, 부서지고)"
                                          />
                                          <div className="text-xs text-gray-500 mt-1">
                                            현재 어절 목록: {(question.wordSegments || []).length}개 어절
                                          </div>
                                        </div>
                                      );
                                    }

                                    // 객관식 유형들: 동적 보기 개수 설정
                                    let optionCount = 5; // 기본값: 5지선다
                                    let gridCols = 'grid-cols-5';

                                    // 4. OX퀴즈: 2지선다
                                    if (questionType === 'OX퀴즈' || questionType === 'O/X 문제' || questionType === 'OX문제') {
                                      optionCount = 2;
                                      gridCols = 'grid-cols-2';
                                    }
                                    // 1. 빈칸 채우기: 5지선다
                                    else if (questionType === '빈칸 채우기' || questionType === '빈 칸 채우기') {
                                      optionCount = 5;
                                      gridCols = 'grid-cols-5';
                                    }
                                    // 5. 객관식: 5지선다
                                    else if (questionType === '객관식' || questionType === '다지선다' || questionType === '선택형') {
                                      optionCount = 5;
                                      gridCols = 'grid-cols-5';
                                    }
                                    // 기타 객관식 문제들은 기본 5지선다
                                    else {
                                      optionCount = 5;
                                      gridCols = 'grid-cols-5';
                                    }

                                    return (
                                      <div>
                                        <div className={`grid ${gridCols} gap-2`}>
                                          {Array.from({ length: optionCount }, (_, i) => i + 1).map(num => {
                                            const optionKey = `option_${num}`;
                                            const optionValue = question.options && question.options[num - 1]
                                              ? question.options[num - 1]
                                              : question[optionKey];

                                            return (
                                              <div key={num}>
                                                <label className="block text-xs text-gray-500 mb-1">보기 {num}</label>
                                                <input
                                                  type="text"
                                                  value={optionValue || ''}
                                                  onChange={(e) => {
                                                    const newValue = e.target.value;

                                                    // 기존 options 배열 또는 option_1~5 필드에서 가져오기
                                                    const currentOptions = question.options
                                                      ? [...question.options]
                                                      : [
                                                          question.option_1 || '',
                                                          question.option_2 || '',
                                                          question.option_3 || '',
                                                          question.option_4 || '',
                                                          question.option_5 || ''
                                                        ];

                                                    // 새 보기 값 설정
                                                    currentOptions[num - 1] = newValue;

                                                    // options 배열 업데이트
                                                    updateParagraphQuestion(questionId, 'options', currentOptions);
                                                    // 호환성을 위한 개별 필드도 함께 업데이트
                                                    updateParagraphQuestion(questionId, optionKey, newValue);
                                                  }}
                                                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                                                />
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    );
                                  })()}

                                  <div className="space-y-3">
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">정답</label>
                                      <input
                                        type="text"
                                        value={question.correctAnswer || question.correct_answer || ''}
                                        onChange={(e) => {
                                          updateParagraphQuestion(questionId, 'correctAnswer', e.target.value);
                                          updateParagraphQuestion(questionId, 'correct_answer', e.target.value);
                                        }}
                                        className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">해설</label>
                                      <textarea
                                        value={question.explanation || ''}
                                        onChange={(e) => updateParagraphQuestion(questionId, 'explanation', e.target.value)}
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
                      ));
                    })()}
                  </div>
                )}

                {/* 종합 문제 탭 */}
                {activeTab === 'comprehensive' && (
                  <div className="space-y-6">
                    {(() => {
                      // 기본문제와 보완문제로 분류
                      const basicQuestions = editableComprehensive.filter(q => {
                        const isSupplementary = q.difficulty === '보완' ||
                                              q.is_supplementary === true ||
                                              q.isSupplementary === true;
                        return !isSupplementary;
                      });

                      const supplementaryQuestions = editableComprehensive.filter(q => {
                        const isSupplementary = q.difficulty === '보완' ||
                                              q.is_supplementary === true ||
                                              q.isSupplementary === true;
                        return isSupplementary;
                      });

                      console.log('종합 문제 분류 결과:', {
                        총문제수: editableComprehensive.length,
                        기본문제수: basicQuestions.length,
                        보완문제수: supplementaryQuestions.length
                      });

                      return (
                        <div className="space-y-6">
                          {/* 기본문제 섹션 */}
                          {basicQuestions.length > 0 ? (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                              <div className="flex items-center mb-4">
                                <h3 className="text-lg font-semibold text-blue-800">✅ 기본문제</h3>
                                <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {basicQuestions.length}개
                                </span>
                              </div>
                              <p className="text-sm text-blue-600 mb-4">
                                기본 학습을 위한 종합 문제들입니다.
                              </p>

                              <div className="space-y-4">
                                {basicQuestions.map((question, index) => {
                                  const questionId = question.id;
                                  return (
                                    <div key={question.id} className="bg-white border border-blue-200 rounded-lg p-6">
                                      <div className="mb-4">
                                        <div className="flex justify-between items-center">
                                          <h4 className="font-semibold">기본문제 {index + 1}</h4>
                                          <div className="flex gap-2">
                                            <span className="text-sm text-gray-500">
                                              {question.question_type || question.type || '종합 문제'}
                                            </span>
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
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
                                            onChange={(e) => updateComprehensiveQuestion(questionId, 'question', e.target.value)}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 h-20 text-sm"
                                          />
                                        </div>

                                        {/* 종합 문제는 모두 5지선다 객관식 */}
                                        <div>
                                          <div className="space-y-3">
                                            {[1, 2, 3, 4, 5].map(num => {
                                              const optionKey = `option_${num}`;
                                              const optionValue = question[optionKey];

                                              return (
                                                <div key={num}>
                                                  <label className="block text-sm font-medium text-gray-700 mb-1">보기 {num}</label>
                                                  <input
                                                    type="text"
                                                    value={optionValue || ''}
                                                    onChange={(e) => {
                                                      const newValue = e.target.value;

                                                      // 기존 options 배열 또는 option_1~5 필드에서 가져오기
                                                      const currentOptions = question.options
                                                        ? [...question.options]
                                                        : [
                                                            question.option_1 || '',
                                                            question.option_2 || '',
                                                            question.option_3 || '',
                                                            question.option_4 || '',
                                                            question.option_5 || ''
                                                          ];

                                                      // 이전 보기 값 저장 (정답 업데이트 확인용)
                                                      const oldOptionValue = currentOptions[num - 1];

                                                      // 새 보기 값 설정
                                                      currentOptions[num - 1] = newValue;

                                                      // options 배열 업데이트
                                                      updateComprehensiveQuestion(questionId, 'options', currentOptions);
                                                      // 호환성을 위한 개별 필드도 함께 업데이트
                                                      updateComprehensiveQuestion(questionId, optionKey, newValue);

                                                      // 정답 보기를 수정한 경우, 정답도 자동 업데이트
                                                      const currentAnswer = question.correct_answer || question.answer || question.correctAnswer || '';

                                                      // 객관식 문제인 경우: 정답이 번호(1~5)인지 확인
                                                      if (currentAnswer === String(num)) {
                                                        // 정답 번호를 수정한 경우, 정답 텍스트를 새 보기 값으로 유지
                                                        updateComprehensiveQuestion(questionId, 'correct_answer', String(num));
                                                        updateComprehensiveQuestion(questionId, 'answer', String(num));
                                                        updateComprehensiveQuestion(questionId, 'correctAnswer', String(num));
                                                      }
                                                      // 정답이 이전 보기 텍스트와 일치하는 경우
                                                      else if (currentAnswer === oldOptionValue && oldOptionValue !== '') {
                                                        // 정답을 새 보기 값으로 업데이트
                                                        updateComprehensiveQuestion(questionId, 'correct_answer', newValue);
                                                        updateComprehensiveQuestion(questionId, 'answer', newValue);
                                                        updateComprehensiveQuestion(questionId, 'correctAnswer', newValue);
                                                      }
                                                    }}
                                                    className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                                                    placeholder={`보기 ${num} 내용을 입력하세요`}
                                                  />
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>

                                        <div className="space-y-3">
                                          <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">정답</label>
                                            <input
                                              type="text"
                                              value={question.correct_answer || question.answer || question.correctAnswer || ''}
                                              onChange={(e) => {
                                                updateComprehensiveQuestion(questionId, 'correct_answer', e.target.value);
                                                updateComprehensiveQuestion(questionId, 'answer', e.target.value);
                                                updateComprehensiveQuestion(questionId, 'correctAnswer', e.target.value);
                                              }}
                                              className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                                              placeholder="정답 번호 (예: 1, 2, 3, 4, 5)"
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">해설</label>
                                            <textarea
                                              value={question.explanation}
                                              onChange={(e) => updateComprehensiveQuestion(questionId, 'explanation', e.target.value)}
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
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                              <div className="text-center text-blue-600">
                                <div className="text-4xl mb-4">✅</div>
                                <p>기본 종합 문제가 없습니다.</p>
                                <p className="text-sm mt-2">모든 종합 문제가 보완문제로 분류되었을 수 있습니다.</p>
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
                                추가적인 학습 보완을 위한 종합 문제들입니다.
                              </p>

                              <div className="space-y-4">
                                {supplementaryQuestions.map((question, index) => {
                                  const questionId = question.id;
                                  return (
                                    <div key={question.id} className="bg-white border border-orange-200 rounded-lg p-6">
                                      <div className="mb-4">
                                        <div className="flex justify-between items-center">
                                          <h4 className="font-semibold">보완문제 {index + 1}</h4>
                                          <div className="flex gap-2">
                                            <span className="text-sm text-gray-500">
                                              {question.question_type || question.type || '종합 문제'}
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
                                            onChange={(e) => updateComprehensiveQuestion(questionId, 'question', e.target.value)}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 h-20 text-sm"
                                          />
                                        </div>

                                        {/* 종합 문제는 모두 5지선다 객관식 */}
                                        <div>
                                          <div className="space-y-3">
                                            {[1, 2, 3, 4, 5].map(num => {
                                              const optionKey = `option_${num}`;
                                              const optionValue = question[optionKey];

                                              return (
                                                <div key={num}>
                                                  <label className="block text-sm font-medium text-gray-700 mb-1">보기 {num}</label>
                                                  <input
                                                    type="text"
                                                    value={optionValue || ''}
                                                    onChange={(e) => {
                                                      const newValue = e.target.value;

                                                      // 기존 options 배열 또는 option_1~5 필드에서 가져오기
                                                      const currentOptions = question.options
                                                        ? [...question.options]
                                                        : [
                                                            question.option_1 || '',
                                                            question.option_2 || '',
                                                            question.option_3 || '',
                                                            question.option_4 || '',
                                                            question.option_5 || ''
                                                          ];

                                                      // 이전 보기 값 저장 (정답 업데이트 확인용)
                                                      const oldOptionValue = currentOptions[num - 1];

                                                      // 새 보기 값 설정
                                                      currentOptions[num - 1] = newValue;

                                                      // options 배열 업데이트
                                                      updateComprehensiveQuestion(questionId, 'options', currentOptions);
                                                      // 호환성을 위한 개별 필드도 함께 업데이트
                                                      updateComprehensiveQuestion(questionId, optionKey, newValue);

                                                      // 정답 보기를 수정한 경우, 정답도 자동 업데이트
                                                      const currentAnswer = question.correct_answer || question.answer || question.correctAnswer || '';

                                                      // 객관식 문제인 경우: 정답이 번호(1~5)인지 확인
                                                      if (currentAnswer === String(num)) {
                                                        // 정답 번호를 수정한 경우, 정답 텍스트를 새 보기 값으로 유지
                                                        updateComprehensiveQuestion(questionId, 'correct_answer', String(num));
                                                        updateComprehensiveQuestion(questionId, 'answer', String(num));
                                                        updateComprehensiveQuestion(questionId, 'correctAnswer', String(num));
                                                      }
                                                      // 정답이 이전 보기 텍스트와 일치하는 경우
                                                      else if (currentAnswer === oldOptionValue && oldOptionValue !== '') {
                                                        // 정답을 새 보기 값으로 업데이트
                                                        updateComprehensiveQuestion(questionId, 'correct_answer', newValue);
                                                        updateComprehensiveQuestion(questionId, 'answer', newValue);
                                                        updateComprehensiveQuestion(questionId, 'correctAnswer', newValue);
                                                      }
                                                    }}
                                                    className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                                                    placeholder={`보기 ${num} 내용을 입력하세요`}
                                                  />
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>

                                        <div className="space-y-3">
                                          <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">정답</label>
                                            <input
                                              type="text"
                                              value={question.correct_answer || question.answer || question.correctAnswer || ''}
                                              onChange={(e) => {
                                                updateComprehensiveQuestion(questionId, 'correct_answer', e.target.value);
                                                updateComprehensiveQuestion(questionId, 'answer', e.target.value);
                                                updateComprehensiveQuestion(questionId, 'correctAnswer', e.target.value);
                                              }}
                                              className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                                              placeholder="정답 번호 (예: 1, 2, 3, 4, 5)"
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">해설</label>
                                            <textarea
                                              value={question.explanation}
                                              onChange={(e) => updateComprehensiveQuestion(questionId, 'explanation', e.target.value)}
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
                                <p>보완 종합 문제가 없습니다.</p>
                                <p className="text-sm mt-2">필요에 따라 보완문제를 추가로 생성할 수 있습니다.</p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* 시각자료 탭 */}
                {activeTab === 'visual-materials' && (
                  <div className="space-y-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <div className="text-2xl">🖼️</div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-blue-900 mb-1">시각자료 정보</h3>
                          <p className="text-sm text-blue-700">
                            이 콘텐츠 세트의 차시 번호와 일치하는 이미지를 표시합니다.
                            {data?.contentSet?.session_number ? (
                              <span className="font-semibold ml-1">(차시: {data.contentSet.session_number})</span>
                            ) : (
                              <span className="text-orange-600 ml-1">(차시 번호가 설정되지 않았습니다)</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    {loadingImages ? (
                      <div className="flex justify-center items-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
                        <span className="ml-3 text-gray-600">이미지 로딩 중...</span>
                      </div>
                    ) : visualMaterials.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {visualMaterials.map((image) => {
                          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
                          const imageUrl = `${supabaseUrl}/storage/v1/object/public/images/${image.file_path}`;

                          return (
                            <div key={image.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                              <div className="aspect-video bg-gray-100 relative">
                                <img
                                  src={imageUrl}
                                  alt={image.file_name}
                                  className="w-full h-full object-contain"
                                  onError={(e) => {
                                    e.currentTarget.src = '/placeholder-image.png';
                                  }}
                                />
                              </div>
                              <div className="p-4 space-y-2">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-gray-900 text-sm truncate" title={image.file_name}>
                                      {image.file_name}
                                    </h4>
                                  </div>
                                </div>

                                {image.session_number && (
                                  <div className="flex items-center space-x-2 text-xs">
                                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 text-blue-800 font-medium">
                                      📚 차시: {image.session_number}
                                    </span>
                                  </div>
                                )}

                                {image.source && (
                                  <div className="text-xs text-gray-600">
                                    <span className="font-medium">출처:</span> {image.source}
                                  </div>
                                )}

                                {image.memo && (
                                  <div className="text-xs text-gray-600">
                                    <span className="font-medium">메모:</span> {image.memo}
                                  </div>
                                )}

                                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                  <div className="text-xs text-gray-500">
                                    {image.file_size ? `${(image.file_size / 1024 / 1024).toFixed(2)} MB` : '크기 미상'}
                                  </div>
                                  <a
                                    href={imageUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                                  >
                                    원본 보기 →
                                  </a>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8">
                        <div className="text-center text-gray-500">
                          <div className="text-5xl mb-4">🖼️</div>
                          <p className="text-lg font-medium mb-2">시각자료가 없습니다</p>
                          <p className="text-sm">
                            {data?.contentSet?.session_number ? (
                              <>차시 {data.contentSet.session_number}에 등록된 이미지가 없습니다.</>
                            ) : (
                              <>콘텐츠 세트에 차시 번호가 설정되지 않았습니다.</>
                            )}
                          </p>
                          <p className="text-xs text-gray-400 mt-2">
                            이미지를 추가하려면 "시스템 설정 &gt; 이미지 데이터 관리" 페이지를 이용하세요.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 하단 버튼 */}
              <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={saving ? undefined : onClose}
                    disabled={saving}
                    className={`px-4 py-2 border border-gray-300 rounded-md ${
                      saving
                        ? 'text-gray-400 cursor-not-allowed opacity-50'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
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

      {/* 저장 중 로딩 모달 */}
      <SavingModal />
    </div>
  );
}// Force rebuild: Thu Sep 18 18:05:46 KST 2025
