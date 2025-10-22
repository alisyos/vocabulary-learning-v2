'use client';

import { useState, useEffect } from 'react';
import { VocabularyQuestion, VocabularyQuestionWorkflow, EditablePassage, VocabularyQuestionType, VOCABULARY_QUESTION_TYPES } from '@/types';
import PromptModal from './PromptModal';

interface VocabularyQuestionsProps {
  editablePassage: EditablePassage;
  division: string;
  keywords?: string; // 1단계에서 입력한 핵심 개념어
  keywords_for_questions?: string; // 어휘문제용 키워드
  vocabularyQuestions: VocabularyQuestionWorkflow[];
  onUpdate: (questions: VocabularyQuestionWorkflow[], usedPrompt?: string) => void;
  onNext: () => void;
  loading?: boolean;
  currentStep: 'generation' | 'review';
  lastUsedPrompt?: string; // GPT에 보낸 프롬프트
}

export default function VocabularyQuestions({
  editablePassage,
  division,
  keywords,
  keywords_for_questions,
  vocabularyQuestions,
  onUpdate,
  onNext,
  loading = false,
  currentStep,
  lastUsedPrompt = ''
}: VocabularyQuestionsProps) {
  // 초기 state에도 기본값 보장
  const [localQuestions, setLocalQuestions] = useState<VocabularyQuestionWorkflow[]>(() => {
    return vocabularyQuestions.map(question => ({
      ...question,
      difficulty: question.difficulty || '일반'
    }));
  });
  const [generatingVocab, setGeneratingVocab] = useState(false);
  
  // props 변경 시 local state 동기화 (기본값 보장)
  useEffect(() => {
    // props에서 받은 문제들에 difficulty 기본값 보장 및 고유 ID 확인
    const questionsWithDefaults = vocabularyQuestions.map((question, index) => ({
      ...question,
      id: question.id || `vocab_init_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
      difficulty: question.difficulty || '일반' // undefined인 경우 '일반'으로 설정
    }));
    
    // ID 중복 체크
    const idCounts = questionsWithDefaults.reduce((acc, q) => {
      acc[q.id] = (acc[q.id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const duplicateIds = Object.entries(idCounts).filter(([_, count]) => count > 1);
    if (duplicateIds.length > 0) {
      console.error('⚠️ Initial duplicate IDs detected:', duplicateIds);
      
      // 중복된 ID를 가진 문제들에 새로운 고유 ID 할당
      const seenIds = new Set<string>();
      const uniqueQuestions = questionsWithDefaults.map((q, idx) => {
        if (seenIds.has(q.id)) {
          return {
            ...q,
            id: `vocab_fixed_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 9)}`
          };
        }
        seenIds.add(q.id);
        return q;
      });
      
      setLocalQuestions(uniqueQuestions);
    } else {
      setLocalQuestions(questionsWithDefaults);
    }
  }, [vocabularyQuestions]);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState<VocabularyQuestionType[]>(Object.values(VOCABULARY_QUESTION_TYPES) as VocabularyQuestionType[]);
  const [selectedTerm, setSelectedTerm] = useState<string>('');

  // 🚀 병렬 스트리밍 진행률 추적을 위한 state
  const [generationProgress, setGenerationProgress] = useState<string>('');
  const [typeProgress, setTypeProgress] = useState<Record<string, { progress: number; status: string }>>({});

  // 초기 용어 순서를 기억하기 위한 state
  const [termOrder, setTermOrder] = useState<string[]>([]);

  // 🆕 추가 생성 기능을 위한 state
  const [showAdditionalGenerationModal, setShowAdditionalGenerationModal] = useState(false);
  const [additionalSelectedTerms, setAdditionalSelectedTerms] = useState<string[]>([]);
  const [additionalSelectedQuestionTypes, setAdditionalSelectedQuestionTypes] = useState<VocabularyQuestionType[]>(Object.values(VOCABULARY_QUESTION_TYPES) as VocabularyQuestionType[]);

  // 🆕 문제 추가 시 유형 선택을 위한 state
  const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
  const [selectedQuestionTypeForAdd, setSelectedQuestionTypeForAdd] = useState<VocabularyQuestionType>('5지선다 객관식');
  
  // 병렬 스트리밍 진행률 실시간 업데이트
  useEffect(() => {
    if (generatingVocab && Object.keys(typeProgress).length > 0) {
      const totalTypes = Object.keys(typeProgress).length;
      const completedTypes = Object.values(typeProgress).filter(p => p.progress === 100).length;
      const totalProgress = Object.values(typeProgress).reduce((sum, p) => sum + p.progress, 0);
      const averageProgress = totalProgress / totalTypes;
      
      if (completedTypes === totalTypes) {
        setGenerationProgress(`🎉 병렬 스트리밍 완료: ${totalTypes}개 유형 모두 생성됨`);
      } else {
        setGenerationProgress(
          `병렬 스트리밍 진행률: ${Math.round(averageProgress)}% (${completedTypes}/${totalTypes} 유형 완료)`
        );
      }
    }
  }, [typeProgress, generatingVocab]);
  
  // 2개 지문 형식에서 모든 footnote 통합하여 가져오기
  const getAllFootnotes = () => {
    // 2개 지문 형식인 경우
    if (editablePassage.passages && editablePassage.passages.length > 0) {
      const allFootnotes: string[] = [];
      editablePassage.passages.forEach((passage) => {
        if (passage.footnote && Array.isArray(passage.footnote)) {
          allFootnotes.push(...passage.footnote);
        }
      });
      console.log('📚 2개 지문 형식 - 통합된 footnotes:', allFootnotes);
      return allFootnotes;
    }
    // 단일 지문 형식인 경우
    console.log('📄 단일 지문 형식 - footnotes:', editablePassage.footnote);
    return editablePassage.footnote || [];
  };

  // 어휘문제용 키워드와 매칭되는 용어들 찾기
  const getMatchedTerms = () => {
    console.log('=== 어휘문제용 키워드 매칭 디버깅 ===');
    console.log('keywords_for_questions:', keywords_for_questions);
    console.log('keywords (fallback):', keywords);
    
    const allFootnotes = getAllFootnotes();
    console.log('allFootnotes:', allFootnotes);
    
    // keywords_for_questions가 있으면 우선 사용, 없으면 기존 keywords 사용
    const targetKeywords = keywords_for_questions || keywords;
    
    if (!targetKeywords || targetKeywords.trim() === '') {
      console.log('어휘문제용 키워드가 없어서 빈 배열 반환');
      return [];
    }
    
    // keywords를 쉼표 또는 슬래시로 분리하고 정규화
    const keywordList = targetKeywords.split(/[,/]/).map(k => k.trim().toLowerCase()).filter(k => k.length > 0);
    console.log('keywordList (어휘문제용):', keywordList);
    
    if (keywordList.length === 0) {
      console.log('유효한 키워드가 없어서 빈 배열 반환');
      return [];
    }
    
    const matchedIndices = allFootnotes
      .map((footnote, index) => {
        const termName = footnote.split(':')[0]?.trim().toLowerCase() || footnote.toLowerCase();
        console.log(`용어 ${index}: "${footnote}" -> termName: "${termName}"`);
        
        // 키워드 중 하나와 완전 일치하면 선택
        const isMatched = keywordList.some(keyword => {
          const exactMatch = termName === keyword;
          console.log(`  키워드 "${keyword}" 매칭: termName === keyword = ${exactMatch}`);
          return exactMatch;
        });
        
        console.log(`  최종 매칭 결과: ${isMatched}`);
        return isMatched ? index.toString() : null;
      })
      .filter(Boolean) as string[];
    
    console.log('매칭된 인덱스들:', matchedIndices);
    return matchedIndices;
  };

  // 선택된 용어들 관리 (핵심 개념어 매칭된 것들만 디폴트 선택)
  const [selectedTerms, setSelectedTerms] = useState<string[]>(getMatchedTerms());

  // 용어 선택/해제
  const handleTermToggle = (termIndex: string) => {
    setSelectedTerms(prev => 
      prev.includes(termIndex) 
        ? prev.filter(id => id !== termIndex)
        : [...prev, termIndex]
    );
  };

  // 전체 선택/해제
  const handleSelectAll = () => {
    const allFootnotes = getAllFootnotes();
    const allTermIndices = allFootnotes.map((_, index) => index.toString());
    setSelectedTerms(prev => 
      prev.length === allTermIndices.length ? [] : allTermIndices
    );
  };

  // 선택된 용어들 가져오기
  const getSelectedTerms = () => {
    const allFootnotes = getAllFootnotes();
    return selectedTerms
      .map(index => allFootnotes[parseInt(index)])
      .filter(Boolean);
  };

  // 🆕 추가 어휘 문제 생성 함수 (기존 문제 유지)
  const handleAdditionalGeneration = async () => {
    const selectedTermsList = additionalSelectedTerms
      .map(index => getAllFootnotes()[parseInt(index)])
      .filter(Boolean);

    if (selectedTermsList.length === 0) {
      alert('추가 생성할 용어를 선택해주세요.');
      return;
    }

    if (additionalSelectedQuestionTypes.length === 0) {
      alert('문제 유형을 선택해주세요.');
      return;
    }

    // 🔑 중요: 추가 생성 모달을 먼저 닫아야 로딩 모달이 보입니다
    setShowAdditionalGenerationModal(false);
    setGeneratingVocab(true);

    try {
      // 로컬 스토리지에서 선택된 모델 가져오기
      const selectedModel = localStorage.getItem('selectedGPTModel') || 'gpt-4.1';

      // 병렬 스트리밍 초기화
      console.log(`🚀 ${additionalSelectedQuestionTypes.length}개 문제 유형을 병렬 스트리밍으로 추가 생성 시작`);

      // 각 문제 유형별 진행률 초기화
      const initialProgress: Record<string, { progress: number; status: string }> = {};
      additionalSelectedQuestionTypes.forEach(type => {
        initialProgress[type] = { progress: 0, status: '대기 중' };
      });
      setTypeProgress(initialProgress);
      setGenerationProgress(`${additionalSelectedQuestionTypes.length}개 문제 유형을 병렬 스트리밍으로 생성 중...`);

      // 지문 데이터 구성 (공통)
      let passageText = '';
      if (editablePassage.passages && editablePassage.passages.length > 0) {
        // 2개 지문 형식
        passageText = editablePassage.passages.map((passage, index) =>
          `[지문 ${index + 1}]\n${passage.title}\n\n${passage.paragraphs.join('\n\n')}`
        ).join('\n\n---\n\n');
      } else {
        // 단일 지문 형식 (기존)
        passageText = `${editablePassage.title}\n\n${editablePassage.paragraphs.join('\n\n')}`;
      }

      // 병렬 처리: 용어별 × 문제유형별로 개별 통신
      const allCombinations: Array<{term: string, questionType: string, key: string}> = [];
      selectedTermsList.forEach(term => {
        additionalSelectedQuestionTypes.forEach(questionType => {
          allCombinations.push({
            term,
            questionType,
            key: `${term}_${questionType}`
          });
        });
      });

      console.log(`🚀 총 ${allCombinations.length}개 개별 문제를 병렬 추가 생성 시작`);

      // 각 개별 문제별 진행률 초기화
      const initialIndividualProgress: Record<string, { progress: number; status: string }> = {};
      allCombinations.forEach(({key}) => {
        initialIndividualProgress[key] = { progress: 0, status: '대기 중' };
      });
      setTypeProgress(initialIndividualProgress);
      setGenerationProgress(`총 ${allCombinations.length}개 개별 문제를 병렬 생성 중...`);

      const generationPromises = allCombinations.map(async ({term, questionType, key}, index) => {
        console.log(`🎯 개별 문제 병렬 생성 시작 (${index + 1}/${allCombinations.length}): ${term} - ${questionType}`);

        try {
          // 해당 문제 상태를 '생성 중'으로 업데이트
          setTypeProgress(prev => ({
            ...prev,
            [key]: { progress: 0, status: '생성 중' }
          }));

          // 개별 용어만 전송
          const response = await fetch('/api/generate-vocabulary-stream', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              terms: [term], // 단일 용어만 전송
              passage: passageText,
              division: division,
              questionType: questionType,
              model: selectedModel
            }),
          });

          if (!response.ok) {
            console.error(`❌ ${term} - ${questionType} 문제 생성 실패`);
            setTypeProgress(prev => ({
              ...prev,
              [key]: { progress: 0, status: '실패' }
            }));
            return { term, questionType, key, questions: [], usedPrompt: '', success: false };
          }

          // 스트리밍 응답 처리
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          if (!reader) {
            throw new Error('스트리밍 응답을 읽을 수 없습니다.');
          }

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(data);

                  if (parsed.type === 'start') {
                    setTypeProgress(prev => ({
                      ...prev,
                      [key]: { progress: 10, status: '시작됨' }
                    }));
                  } else if (parsed.type === 'progress') {
                    // 진행률을 텍스트 길이 기반으로 계산 (10% ~ 90%)
                    const progressPercent = Math.min(90, 10 + Math.floor((parsed.totalChars || 0) / 100));
                    setTypeProgress(prev => ({
                      ...prev,
                      [key]: {
                        progress: progressPercent,
                        status: `생성 중 (${parsed.totalChars || 0}자)`
                      }
                    }));
                  } else if (parsed.type === 'complete') {
                    console.log(`✅ ${term} - ${questionType} 문제 ${parsed.vocabularyQuestions?.length || 0}개 생성 완료`);
                    setTypeProgress(prev => ({
                      ...prev,
                      [key]: {
                        progress: 100,
                        status: `완료 (${parsed.vocabularyQuestions?.length || 0}개)`
                      }
                    }));
                    return {
                      term,
                      questionType,
                      key,
                      questions: parsed.vocabularyQuestions || [],
                      usedPrompt: parsed._metadata?.usedPrompt || '',
                      success: true
                    };
                  } else if (parsed.type === 'error') {
                    console.error(`❌ ${term} - ${questionType} 스트리밍 오류:`, parsed.error);
                    setTypeProgress(prev => ({
                      ...prev,
                      [key]: { progress: 0, status: '오류' }
                    }));
                    return { term, questionType, key, questions: [], usedPrompt: '', success: false };
                  }
                } catch (e) {
                  console.error('파싱 오류:', e);
                }
              }
            }
          }

          // 스트리밍이 완료되었지만 complete 메시지를 받지 못한 경우
          return { term, questionType, key, questions: [], usedPrompt: '', success: false };

        } catch (error) {
          console.error(`❌ ${term} - ${questionType} 문제 생성 중 오류:`, error);
          return { term, questionType, key, questions: [], usedPrompt: '', success: false };
        }
      });

      // 모든 병렬 스트리밍 완료 대기
      const generationResults = await Promise.all(generationPromises);

      // 결과 집계
      const newQuestions: VocabularyQuestion[] = [];
      let lastUsedPrompt = '';
      let successCount = 0;
      let questionIndex = 0;

      for (const result of generationResults) {
        if (result.success && result.questions.length > 0) {
          // 각 문제에 고유한 ID 할당
          const questionsWithUniqueIds = result.questions.map((q, idx) => ({
            ...q,
            id: q.id || `vocab_add_${Date.now()}_${questionIndex++}_${idx}_${Math.random().toString(36).substr(2, 9)}`
          }));
          newQuestions.push(...questionsWithUniqueIds);
          successCount++;

          // 첫 번째 성공한 개별 문제의 프롬프트를 저장
          if (!lastUsedPrompt && result.usedPrompt) {
            lastUsedPrompt = result.usedPrompt;
          }
        }
      }

      console.log(`🎉 추가 생성 완료: ${successCount}/${allCombinations.length}개 문제 성공, 총 ${newQuestions.length}개 문제 생성`);

      setGenerationProgress(`🎉 추가 생성 완료: 총 ${newQuestions.length}개 문제 (${successCount}/${allCombinations.length}개 성공)`);

      if (newQuestions.length === 0) {
        throw new Error('모든 문제 유형 생성에 실패했습니다.');
      }

      // 생성된 문제들의 difficulty 기본값 설정
      const questionsWithDefaults = newQuestions.map(question => ({
        ...question,
        difficulty: question.difficulty || '일반'
      }));

      // 🔑 핵심: 기존 문제에 새 문제 추가 (덮어쓰지 않음!)
      const updatedQuestions = [...localQuestions, ...questionsWithDefaults];

      // 🆕 새로 추가된 용어 목록 추출
      const newTerms = Array.from(new Set(questionsWithDefaults.map(q => q.term)));
      console.log('📝 새로 추가된 용어:', newTerms);

      // 🆕 termOrder 업데이트: 기존 termOrder에 새 용어 추가
      const updatedTermOrder = [...termOrder];
      newTerms.forEach(term => {
        if (!updatedTermOrder.includes(term)) {
          updatedTermOrder.push(term);
        }
      });
      setTermOrder(updatedTermOrder);
      console.log('📋 업데이트된 termOrder:', updatedTermOrder);

      // 🆕 selectedTerm을 새로 추가된 첫 번째 용어로 설정 (사용자가 바로 확인할 수 있도록)
      if (newTerms.length > 0) {
        setSelectedTerm(newTerms[0]);
        console.log('🎯 selectedTerm 변경:', newTerms[0]);
      }

      // 상태 업데이트
      setLocalQuestions(updatedQuestions);
      onUpdate(updatedQuestions, lastUsedPrompt);

      // 선택된 용어 초기화 (모달은 이미 닫혔음)
      setAdditionalSelectedTerms([]);

      alert(`✅ ${newQuestions.length}개의 문제가 추가되었습니다!\n추가된 용어: ${newTerms.join(', ')}`);

    } catch (error) {
      console.error('Error:', error);
      setGenerationProgress('');
      alert('어휘 문제 추가 생성 중 오류가 발생했습니다.');
    } finally {
      setGeneratingVocab(false);
      setTimeout(() => setGenerationProgress(''), 3000);
    }
  };

  // 어휘 문제 생성 (스트리밍 지원)
  const handleGenerateVocabulary = async () => {
    const selectedTermsList = getSelectedTerms();

    if (selectedTermsList.length === 0) {
      alert('어휘 문제를 생성할 용어를 선택해주세요.');
      return;
    }

    if (selectedQuestionTypes.length === 0) {
      alert('문제 유형을 선택해주세요.');
      return;
    }

    setGeneratingVocab(true);
    
    try {
      // 로컬 스토리지에서 선택된 모델 가져오기
      const selectedModel = localStorage.getItem('selectedGPTModel') || 'gpt-4.1';
      
      // 병렬 스트리밍 초기화
      console.log(`🚀 ${selectedQuestionTypes.length}개 문제 유형을 병렬 스트리밍으로 생성 시작`);
      
      // 각 문제 유형별 진행률 초기화
      const initialProgress: Record<string, { progress: number; status: string }> = {};
      selectedQuestionTypes.forEach(type => {
        initialProgress[type] = { progress: 0, status: '대기 중' };
      });
      setTypeProgress(initialProgress);
      setGenerationProgress(`${selectedQuestionTypes.length}개 문제 유형을 병렬 스트리밍으로 생성 중...`);
      
      // 지문 데이터 구성 (공통)
      let passageText = '';
      if (editablePassage.passages && editablePassage.passages.length > 0) {
        // 2개 지문 형식
        passageText = editablePassage.passages.map((passage, index) => 
          `[지문 ${index + 1}]\n${passage.title}\n\n${passage.paragraphs.join('\n\n')}`
        ).join('\n\n---\n\n');
      } else {
        // 단일 지문 형식 (기존)
        passageText = `${editablePassage.title}\n\n${editablePassage.paragraphs.join('\n\n')}`;
      }

      // 병렬 처리: 용어별 × 문제유형별로 개별 통신 (30개 통신)
      const allCombinations: Array<{term: string, questionType: string, key: string}> = [];
      selectedTermsList.forEach(term => {
        selectedQuestionTypes.forEach(questionType => {
          allCombinations.push({
            term,
            questionType,
            key: `${term}_${questionType}`
          });
        });
      });

      console.log(`🚀 총 ${allCombinations.length}개 개별 문제를 병렬 생성 시작`);

      // 각 개별 문제별 진행률 초기화  
      const initialIndividualProgress: Record<string, { progress: number; status: string }> = {};
      allCombinations.forEach(({key}) => {
        initialIndividualProgress[key] = { progress: 0, status: '대기 중' };
      });
      setTypeProgress(initialIndividualProgress);
      setGenerationProgress(`총 ${allCombinations.length}개 개별 문제를 병렬 생성 중...`);

      const generationPromises = allCombinations.map(async ({term, questionType, key}, index) => {
        console.log(`🎯 개별 문제 병렬 생성 시작 (${index + 1}/${allCombinations.length}): ${term} - ${questionType}`);
        
        try {
          // 해당 문제 상태를 '생성 중'으로 업데이트
          setTypeProgress(prev => ({
            ...prev,
            [key]: { progress: 0, status: '생성 중' }
          }));

          // 개별 용어만 전송
          const response = await fetch('/api/generate-vocabulary-stream', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              terms: [term], // 단일 용어만 전송
              passage: passageText,
              division: division,
              questionType: questionType,
              model: selectedModel
            }),
          });

          if (!response.ok) {
            console.error(`❌ ${term} - ${questionType} 문제 생성 실패`);
            setTypeProgress(prev => ({
              ...prev,
              [key]: { progress: 0, status: '실패' }
            }));
            return { term, questionType, key, questions: [], usedPrompt: '', success: false };
          }

          // 스트리밍 응답 처리
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          if (!reader) {
            throw new Error('스트리밍 응답을 읽을 수 없습니다.');
          }

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;
                
                try {
                  const parsed = JSON.parse(data);
                  
                  if (parsed.type === 'start') {
                    setTypeProgress(prev => ({
                      ...prev,
                      [key]: { progress: 10, status: '시작됨' }
                    }));
                  } else if (parsed.type === 'progress') {
                    // 진행률을 텍스트 길이 기반으로 계산 (10% ~ 90%)
                    const progressPercent = Math.min(90, 10 + Math.floor((parsed.totalChars || 0) / 100));
                    setTypeProgress(prev => ({
                      ...prev,
                      [key]: { 
                        progress: progressPercent, 
                        status: `생성 중 (${parsed.totalChars || 0}자)` 
                      }
                    }));
                  } else if (parsed.type === 'complete') {
                    console.log(`✅ ${term} - ${questionType} 문제 ${parsed.vocabularyQuestions?.length || 0}개 생성 완료`);
                    setTypeProgress(prev => ({
                      ...prev,
                      [key]: { 
                        progress: 100, 
                        status: `완료 (${parsed.vocabularyQuestions?.length || 0}개)` 
                      }
                    }));
                    return {
                      term,
                      questionType,
                      key,
                      questions: parsed.vocabularyQuestions || [],
                      usedPrompt: parsed._metadata?.usedPrompt || '',
                      success: true
                    };
                  } else if (parsed.type === 'error') {
                    console.error(`❌ ${term} - ${questionType} 스트리밍 오류:`, parsed.error);
                    setTypeProgress(prev => ({
                      ...prev,
                      [key]: { progress: 0, status: '오류' }
                    }));
                    return { term, questionType, key, questions: [], usedPrompt: '', success: false };
                  }
                } catch (e) {
                  console.error('파싱 오류:', e);
                }
              }
            }
          }

          // 스트리밍이 완료되었지만 complete 메시지를 받지 못한 경우
          return { term, questionType, key, questions: [], usedPrompt: '', success: false };
          
        } catch (error) {
          console.error(`❌ ${term} - ${questionType} 문제 생성 중 오류:`, error);
          return { term, questionType, key, questions: [], usedPrompt: '', success: false };
        }
      });
      
      // 모든 병렬 스트리밍 완료 대기
      const generationResults = await Promise.all(generationPromises);
      
      // 결과 집계
      const allQuestions: VocabularyQuestion[] = [];
      let lastUsedPrompt = '';
      let successCount = 0;
      let questionIndex = 0;
      
      for (const result of generationResults) {
        if (result.success && result.questions.length > 0) {
          // 각 문제에 고유한 ID 할당
          const questionsWithUniqueIds = result.questions.map((q, idx) => ({
            ...q,
            id: q.id || `vocab_${Date.now()}_${questionIndex++}_${idx}_${Math.random().toString(36).substr(2, 9)}`
          }));
          allQuestions.push(...questionsWithUniqueIds);
          successCount++;
          
          // 첫 번째 성공한 개별 문제의 프롬프트를 저장
          if (!lastUsedPrompt && result.usedPrompt) {
            lastUsedPrompt = result.usedPrompt;
            console.log('📋 Received prompt from API:', {
              promptLength: lastUsedPrompt.length,
              promptPreview: lastUsedPrompt.substring(0, 200) + '...'
            });
          }
        }
      }
      
      console.log(`🎉 개별 문제 병렬 생성 완료: ${successCount}/${allCombinations.length}개 문제 성공, 총 ${allQuestions.length}개 문제 생성`);
      
      // ID 중복 체크
      const idCounts = allQuestions.reduce((acc, q) => {
        acc[q.id] = (acc[q.id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const duplicateIds = Object.entries(idCounts).filter(([_, count]) => count > 1);
      if (duplicateIds.length > 0) {
        console.error('⚠️ Duplicate IDs detected:', duplicateIds);
      }
      
      setGenerationProgress(`🎉 생성 완료: 총 ${allQuestions.length}개 문제 (${successCount}/${allCombinations.length}개 성공)`);
      
      if (allQuestions.length === 0) {
        throw new Error('모든 문제 유형 생성에 실패했습니다.');
      }
      
      // 생성된 문제들의 difficulty 기본값 설정 (API에서 설정되지 않은 경우)
      const questionsWithDefaults = allQuestions.map(question => ({
        ...question,
        difficulty: question.difficulty || '일반' // 기본값을 '일반' (기본문제)로 설정
      }));
      
      setLocalQuestions(questionsWithDefaults);
      onUpdate(questionsWithDefaults, lastUsedPrompt);
      
    } catch (error) {
      console.error('Error:', error);
      setGenerationProgress(''); // 오류 시 진행률 리셋
      alert('어휘 문제 생성 중 오류가 발생했습니다.');
    } finally {
      setGeneratingVocab(false);
      // 3초 후 진행률 메시지 자동 사라짐
      setTimeout(() => setGenerationProgress(''), 3000);
    }
  };

  // 문제 수정 - ID 기반으로 변경
  const handleQuestionUpdate = (questionId: string, field: keyof VocabularyQuestion, value: string | string[]) => {
    // 디버깅: 중복 ID 확인
    const matchingQuestions = localQuestions.filter(q => q.id === questionId);
    if (matchingQuestions.length > 1) {
      console.error(`⚠️ Duplicate ID found: ${questionId}`, {
        duplicateCount: matchingQuestions.length,
        questions: matchingQuestions.map(q => ({ id: q.id, term: q.term, question_text: q.question_text }))
      });
    }
    
    const updated = localQuestions.map(q => 
      q.id === questionId ? { ...q, [field]: value } : q
    );
    
    // 디버깅: difficulty 필드 업데이트 시 로그 출력
    if (field === 'difficulty') {
      const originalQuestion = localQuestions.find(q => q.id === questionId);
      const updatedQuestions = updated.filter(q => q.id === questionId);
      console.log(`📝 Updating question difficulty:`, {
        questionId,
        oldValue: originalQuestion?.difficulty,
        newValue: value,
        updatedCount: updatedQuestions.length,
        allQuestionIds: localQuestions.map(q => q.id)
      });
    }
    
    setLocalQuestions(updated);
    onUpdate(updated);
  };

  // 문제 추가 버튼 클릭 - 유형 선택 모달 열기
  const addQuestion = () => {
    setShowAddQuestionModal(true);
  };

  // 선택된 유형으로 문제 추가 실행
  const confirmAddQuestion = () => {
    const questionType = selectedQuestionTypeForAdd;
    const isMultipleChoice = questionType.includes('객관식') ||
                            questionType === '2개중 선택형' ||
                            questionType === '3개중 선택형' ||
                            questionType === '낱말 골라 쓰기';
    const optionCount = questionType === '2개중 선택형' ? 2 :
                       questionType === '3개중 선택형' ? 3 :
                       questionType === '낱말 골라 쓰기' ? 4 : 5;

    // 🔑 현재 선택된 용어를 사용 (4단계에서 탭별로 문제 추가)
    const termForNewQuestion = currentStep === 'review' && selectedTerm
      ? selectedTerm
      : '새로운 용어';

    const newQuestion: VocabularyQuestion = {
      id: `vocab_new_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content_set_id: '',
      question_number: localQuestions.length + 1,
      question_type: questionType,
      difficulty: '일반', // 새 문제는 기본적으로 '일반' (기본문제)로 설정
      term: termForNewQuestion,
      question_text: '질문을 입력하세요',
      option_1: isMultipleChoice ? '선택지 1' : undefined,
      option_2: isMultipleChoice ? '선택지 2' : undefined,
      option_3: isMultipleChoice && optionCount >= 3 ? '선택지 3' : undefined,
      option_4: isMultipleChoice && optionCount >= 4 ? '선택지 4' : undefined,
      option_5: isMultipleChoice && optionCount >= 5 ? '선택지 5' : undefined,
      correct_answer: isMultipleChoice ? '선택지 1' : '답을 입력하세요',
      answer_initials: !isMultipleChoice ? 'ㅇㅇ' : undefined,
      explanation: '해설을 입력하세요'
    };

    const updated = [...localQuestions, newQuestion];
    setLocalQuestions(updated);
    onUpdate(updated);

    // 모달 닫기
    setShowAddQuestionModal(false);
  };

  // 문제 삭제 - ID 기반으로 변경
  const removeQuestion = (questionId: string) => {
    if (localQuestions.length <= 1) {
      // 최소 1개의 문제는 있어야 하므로 삭제하지 않음
      return;
    }
    
    const questionToDelete = localQuestions.find(q => q.id === questionId);
    if (!questionToDelete) return;
    
    const updated = localQuestions.filter(q => q.id !== questionId);
    
    // 현재 선택된 용어의 마지막 문제를 삭제하는 경우
    if (currentStep === 'review' && questionToDelete.term === selectedTerm) {
      const remainingQuestionsForTerm = updated.filter(q => q.term === selectedTerm);
      
      // 해당 용어의 문제가 모두 삭제된 경우
      if (remainingQuestionsForTerm.length === 0) {
        // 남은 용어 중 첫 번째 용어로 이동
        const remainingTerms = termOrder.filter(term => updated.some(q => q.term === term));
        if (remainingTerms.length > 0) {
          setSelectedTerm(remainingTerms[0]);
        }
      }
    }
    
    console.log(`🗑️ Removing question:`, {
      questionId,
      questionTerm: questionToDelete.term,
      remainingCount: updated.length
    });
    
    setLocalQuestions(updated);
    onUpdate(updated);
  };

  // 선택지 수정 - ID 기반으로 변경
  const handleOptionUpdate = (questionId: string, optionIndex: number, value: string) => {
    const field = `option_${optionIndex + 1}` as keyof VocabularyQuestion;
    const updated = localQuestions.map(q => {
      if (q.id === questionId) {
        const oldOptionValue = (q as any)[field];

        // 🔧 수정한 선택지가 현재 정답이라면, 정답도 함께 업데이트
        const currentAnswer = q.correct_answer || q.answer;
        const newAnswer = currentAnswer === oldOptionValue ? value : currentAnswer;

        if (currentAnswer === oldOptionValue) {
          console.log(`✅ 정답도 함께 업데이트: "${oldOptionValue}" → "${value}"`);
        }

        // 완전히 새로운 객체 반환 (불변 업데이트)
        const updatedQuestion: any = {
          ...q,
          [field]: value
        };

        // correct_answer 또는 answer 필드 업데이트
        if (q.correct_answer !== undefined) {
          updatedQuestion.correct_answer = newAnswer;
        } else if ((q as any).answer !== undefined) {
          updatedQuestion.answer = newAnswer;
        }

        return updatedQuestion;
      }
      return q;
    });
    setLocalQuestions(updated);
    onUpdate(updated);
  };

  // 초기 용어 순서 설정 (review 단계 진입 시 한 번만)
  useEffect(() => {
    if (currentStep === 'review' && termOrder.length === 0 && localQuestions.length > 0) {
      const initialOrder = localQuestions
        .map(q => q.term || '')
        .filter(Boolean)
        .reduce((acc: string[], term) => {
          if (!acc.includes(term)) {
            acc.push(term);
          }
          return acc;
        }, []);
      setTermOrder(initialOrder);
      if (!selectedTerm && initialOrder.length > 0) {
        setSelectedTerm(initialOrder[0]);
      }
    }
  }, [currentStep, localQuestions.length]);
  
  // 고유한 용어 목록 - 저장된 순서 유지
  const uniqueTerms = currentStep === 'review' 
    ? termOrder.filter(term => localQuestions.some(q => q.term === term)) // termOrder 순서를 유지하면서 현재 존재하는 용어만 필터링
    : [];
  
  // 선택된 용어의 문제들만 필터링 (review 단계에서만)
  const filteredQuestions = currentStep === 'review' && selectedTerm 
    ? localQuestions.filter(q => q.term === selectedTerm)
    : localQuestions;

  if (currentStep === 'generation') {
    return (
      <>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-bold text-gray-800">3단계: 어휘 문제 생성</h2>
              <button
                onClick={handleGenerateVocabulary}
                disabled={generatingVocab || selectedTerms.length === 0 || selectedQuestionTypes.length === 0}
                className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
              >
                {generatingVocab 
                  ? '생성 중...' 
                  : selectedTerms.length === 0 
                    ? '용어 선택 필요'
                    : selectedQuestionTypes.length === 0
                      ? '문제 유형 선택 필요'
                      : `${selectedTerms.length}개 용어 × ${selectedQuestionTypes.length}가지 유형`
                }
              </button>
            </div>
            <span className="text-sm text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
              문제 생성
            </span>
          </div>

        {/* 문제 유형 선택 */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold text-gray-800">문제 유형 선택</h3>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {selectedQuestionTypes.length}/6개 선택됨
              </span>
              <button
                onClick={() => {
                  const allTypes = Object.values(VOCABULARY_QUESTION_TYPES) as VocabularyQuestionType[];
                  setSelectedQuestionTypes(prev => 
                    prev.length === allTypes.length ? [] : allTypes
                  );
                }}
                className="text-sm bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-1 rounded transition-colors"
              >
                {selectedQuestionTypes.length === 6 ? '전체 해제' : '전체 선택'}
              </button>
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-3">
              생성할 문제 유형을 선택하세요. 선택한 유형별로 각각 문제가 생성됩니다.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {(Object.values(VOCABULARY_QUESTION_TYPES) as VocabularyQuestionType[]).map((type) => {
                const isSelected = selectedQuestionTypes.includes(type);
                return (
                  <label 
                    key={type}
                    className={`
                      flex items-center space-x-3 p-3 rounded border cursor-pointer transition-all
                      ${isSelected 
                        ? 'bg-purple-50 border-purple-200 text-purple-900' 
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                      }
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedQuestionTypes(prev => [...prev, type]);
                        } else {
                          setSelectedQuestionTypes(prev => prev.filter(t => t !== type));
                        }
                      }}
                      className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <span className="text-sm font-medium">
                      {type}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold text-gray-800">추출된 용어 목록</h3>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {selectedTerms.length}/{getAllFootnotes().length}개 선택됨
              </span>
              <button
                onClick={handleSelectAll}
                className="text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded transition-colors"
              >
                {selectedTerms.length === getAllFootnotes().length ? '전체 해제' : '전체 선택'}
              </button>
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-3">
              문제로 만들 용어를 선택하세요 (총 {getAllFootnotes().length}개):
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {getAllFootnotes().map((footnote, index) => {
                const termIndex = index.toString();
                const isSelected = selectedTerms.includes(termIndex);
                const termName = footnote.split(':')[0]?.trim() || footnote;
                
                return (
                  <label 
                    key={index} 
                    className={`
                      flex items-center space-x-3 p-3 rounded border cursor-pointer transition-all
                      ${isSelected 
                        ? 'bg-blue-50 border-blue-200 text-blue-900' 
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                      }
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleTermToggle(termIndex)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium flex-1">
                      {termName}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center">
          {/* 🚀 병렬 처리 진행률 표시 */}
          {generationProgress && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg w-full max-w-md text-center">
              <p className="text-sm text-blue-700 font-medium">
                {generationProgress}
              </p>
              {!generationProgress.includes('🎉') && (
                <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full animate-pulse w-3/4"></div>
                </div>
              )}
            </div>
          )}
          
          <button
            onClick={handleGenerateVocabulary}
            disabled={generatingVocab || selectedTerms.length === 0}
            className="bg-purple-600 text-white px-8 py-3 rounded-md hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {generatingVocab 
              ? `🚀 병렬 생성 중... (${selectedQuestionTypes.length}개 유형)` 
              : selectedTerms.length === 0 
                ? '용어를 선택해주세요'
                : selectedQuestionTypes.length === 0
                  ? '문제 유형을 선택해주세요'
                  : `${selectedTerms.length}개 용어 × ${selectedQuestionTypes.length}가지 유형으로 문제 생성`
            }
          </button>
          
          {/* 🚀 성능 개선 안내 */}
          {selectedQuestionTypes.length > 1 && !generatingVocab && (
            <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-md max-w-md text-center">
              <p className="text-xs text-green-700">
                🚀 <strong>병렬 처리</strong> 적용! {selectedQuestionTypes.length}개 유형이 동시에 생성되어 
                <strong> 약 85% 더 빠름</strong> (기존 {selectedQuestionTypes.length * 3}초 → 3-5초)
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 어휘 문제 생성 로딩 모달 - 병렬 스트리밍 진행률 */}
      {generatingVocab && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        >
          <div className="bg-white backdrop-blur-sm p-8 rounded-xl shadow-lg border border-gray-100 text-center max-w-lg w-full mx-4">
            {/* 로딩 스피너 */}
            <div className="w-12 h-12 border-3 border-gray-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
            
            {/* 메시지 */}
            <h3 className="text-lg font-medium text-gray-800 mb-1">
              🚀 어휘 문제 병렬 스트리밍 중
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              선택된 {selectedTerms.length}개 용어로 {selectedQuestionTypes.length}가지 유형의 문제를 <strong>동시 스트리밍</strong>으로 생성하고 있습니다
            </p>
            
            {/* 전체 진행률 */}
            {generationProgress && (
              <div className="mb-4">
                <p className="text-sm text-blue-600 font-medium mb-2">
                  {generationProgress}
                </p>
                {Object.keys(typeProgress).length > 0 && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${Math.round(Object.values(typeProgress).reduce((sum, p) => sum + p.progress, 0) / Object.keys(typeProgress).length)}%` 
                      }}
                    ></div>
                  </div>
                )}
              </div>
            )}
            
            {/* 개별 문제 유형별 진행률 */}
            {Object.keys(typeProgress).length > 0 && (
              <div className="space-y-2 text-left">
                <h4 className="text-xs font-medium text-gray-700 mb-2 text-center">문제 유형별 진행률:</h4>
                {Object.entries(typeProgress).map(([type, progress]) => (
                  <div key={type} className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 truncate flex-1 mr-2">{type}</span>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <div className="w-16 bg-gray-200 rounded-full h-1.5">
                        <div 
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            progress.progress === 100 ? 'bg-green-500' : 
                            progress.progress > 0 ? 'bg-purple-500' : 'bg-gray-300'
                          }`}
                          style={{ width: `${progress.progress}%` }}
                        ></div>
                      </div>
                      <span className={`text-xs w-12 text-right ${
                        progress.progress === 100 ? 'text-green-600' : 
                        progress.progress > 0 ? 'text-purple-600' : 'text-gray-400'
                      }`}>
                        {progress.progress}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <p className="text-xs text-green-600 mt-4">
              🚀 병렬 스트리밍으로 빠르고 안정적! 타임아웃 방지 + 실시간 피드백
            </p>
          </div>
        </div>
      )}
      </>
    );
  }

  // currentStep === 'review'

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-bold text-gray-800">4단계: 어휘 문제 검토 및 수정</h2>
          <button
            onClick={() => setShowAdditionalGenerationModal(true)}
            disabled={generatingVocab}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
            title="빠진 어휘가 있으면 추가로 문제를 생성할 수 있습니다"
          >
            + 어휘 추가 생성
          </button>
          <button
            onClick={onNext}
            disabled={loading || localQuestions.length === 0}
            className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
          >
            {loading ? '처리 중...' : '5단계: 문단 문제 생성하기'}
          </button>
        </div>
        <div className="flex items-center space-x-2">
          {lastUsedPrompt && (
            <button
              onClick={() => setShowPromptModal(true)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md transition-colors font-medium text-sm flex items-center space-x-1"
              title="어휘 문제 생성에 사용된 프롬프트 확인"
            >
              <span>📋</span>
              <span>프롬프트 확인</span>
            </button>
          )}
          <span className="text-sm text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
            검토 및 수정
          </span>
        </div>
      </div>

      {/* 어휘별 탭 네비게이션 */}
      {uniqueTerms.length > 1 && (
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-2 overflow-x-auto">
              {uniqueTerms.map((term, index) => {
                const termQuestions = localQuestions.filter(q => q.term === term);
                const basicCount = termQuestions.filter(q => q.difficulty === '일반').length;
                const supplementCount = termQuestions.filter(q => q.difficulty === '보완').length;
                const isSelected = selectedTerm === term;
                return (
                  <button
                    key={index}
                    onClick={() => setSelectedTerm(term)}
                    className={`
                      whitespace-nowrap py-2 px-4 border-b-2 font-medium text-sm transition-colors
                      ${isSelected 
                        ? 'border-purple-500 text-purple-600' 
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    <span>{term}</span>
                    <div className="ml-2 flex items-center space-x-1">
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        기본 {basicCount}
                      </span>
                      {supplementCount > 0 && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                          보완 {supplementCount}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">
            {selectedTerm ? (
              <>
                "{selectedTerm}" 문제 ({filteredQuestions.length}개)
                <div className="ml-2 inline-flex items-center space-x-2">
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                    기본 {filteredQuestions.filter(q => q.difficulty === '일반').length}개
                  </span>
                  {filteredQuestions.filter(q => q.difficulty === '보완').length > 0 && (
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                      보완 {filteredQuestions.filter(q => q.difficulty === '보완').length}개
                    </span>
                  )}
                </div>
                <span className="ml-2 text-sm text-gray-500">
                  전체 {localQuestions.length}개 중
                </span>
              </>
            ) : (
              <>
                어휘 문제 ({localQuestions.length}개)
                <div className="ml-2 inline-flex items-center space-x-2">
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                    기본 {localQuestions.filter(q => q.difficulty === '일반').length}개
                  </span>
                  {localQuestions.filter(q => q.difficulty === '보완').length > 0 && (
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                      보완 {localQuestions.filter(q => q.difficulty === '보완').length}개
                    </span>
                  )}
                </div>

                {/* 어휘별 분포 표시 */}
                {uniqueTerms.length > 1 && (
                  <div className="mt-2">
                    <span className="text-xs text-gray-500 mr-2">어휘별 분포:</span>
                    <div className="inline-flex items-center space-x-1 flex-wrap">
                      {uniqueTerms.map((term, index) => {
                        const termQuestions = localQuestions.filter(q => q.term === term);
                        const basicCount = termQuestions.filter(q => q.difficulty === '일반').length;
                        const supplementCount = termQuestions.filter(q => q.difficulty === '보완').length;
                        return (
                          <span
                            key={index}
                            className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full mr-1 mb-1"
                            title={`${term}: 기본 ${basicCount}개${supplementCount > 0 ? `, 보완 ${supplementCount}개` : ''}`}
                          >
                            {term} ({basicCount + supplementCount})
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </h3>
          <button
            onClick={addQuestion}
            className="bg-green-100 text-green-700 px-4 py-2 rounded-md hover:bg-green-200 transition-colors text-sm font-medium"
          >
            + 문제 추가
          </button>
        </div>

        <div className="space-y-6">
          {filteredQuestions.map((question, displayIndex) => {
            return (
              <div key={question.id} className={`border rounded-lg p-4 ${
                question.difficulty === '보완'
                  ? 'border-orange-200 bg-orange-50'
                  : 'border-blue-200 bg-blue-50'
              }`}>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-2">
                  <h4 className="text-md font-medium text-gray-800">
                    문제 {displayIndex + 1}
                  </h4>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    question.difficulty === '보완'
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {question.difficulty === '보완' ? '보완 문제' : '기본 문제'}
                  </span>
                </div>
                <button
                  onClick={() => removeQuestion(question.id)}
                  className="text-red-500 hover:text-red-700 text-sm"
                  title="문제 삭제"
                >
                  ✕ 삭제
                </button>
              </div>

              {/* 문제 유형 및 기본/보완 선택 */}
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    {question.question_type || question.questionType || '5지선다 객관식'}
                  </span>
                  
                  {/* 기본/보완 문제 토글 스위치 */}
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">기본문제</span>
                    <button
                      onClick={() => {
                        const newValue = question.difficulty === '일반' ? '보완' : '일반';
                        console.log(`🔄 Switch clicked: ${newValue} for question ${question.id}, current value: ${question.difficulty}`);
                        handleQuestionUpdate(question.id, 'difficulty', newValue);
                      }}
                      className={`
                        relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                        ${question.difficulty === '보완' 
                          ? 'bg-orange-500 focus:ring-orange-500' 
                          : 'bg-blue-500 focus:ring-blue-500'
                        }
                        focus:outline-none focus:ring-2 focus:ring-offset-2
                      `}
                    >
                      <span
                        className={`
                          inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                          ${question.difficulty === '보완' ? 'translate-x-6' : 'translate-x-1'}
                        `}
                      />
                    </button>
                    <span className="text-sm text-gray-600">보완문제</span>
                  </div>
                </div>
                
                {/* 문제 타입 배지 */}
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  question.difficulty === '보완' 
                    ? 'bg-orange-100 text-orange-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {question.difficulty === '보완' ? '보완' : '기본'}
                </span>
              </div>

              {/* 용어 */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  대상 용어
                </label>
                <input
                  type="text"
                  value={question.term || ''}
                  onChange={(e) => handleQuestionUpdate(question.id, 'term', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  placeholder="용어를 입력하세요"
                />
              </div>

              {/* 질문 */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  질문
                </label>
                <textarea
                  value={question.question_text || question.question || ''}
                  onChange={(e) => handleQuestionUpdate(question.id, question.question_text ? 'question_text' : 'question', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm min-h-[80px] resize-vertical"
                  placeholder="질문을 입력하세요"
                />
              </div>

              {/* 선택지 (객관식만) */}
              {(() => {
                const questionType = question.question_type || question.questionType || '5지선다 객관식';
                // 객관식 문제 유형 판별: '객관식'이 포함되거나 선택형 문제들
                const isMultipleChoice = questionType.includes('객관식') || 
                                       questionType === '2개중 선택형' || 
                                       questionType === '3개중 선택형' || 
                                       questionType === '낱말 골라 쓰기';
                return isMultipleChoice;
              })() && (
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    선택지
                  </label>
                  <div className="space-y-2">
                    {(() => {
                      const questionType = question.question_type || question.questionType || '5지선다 객관식';
                      const maxOptions = questionType === '2개중 선택형' ? 2 :
                                        questionType === '3개중 선택형' ? 3 :
                                        questionType === '낱말 골라 쓰기' ? 4 : 5;
                      
                      const options = [
                        question.option_1 || (question.options && question.options[0]),
                        question.option_2 || (question.options && question.options[1]),
                        question.option_3 || (question.options && question.options[2]),
                        question.option_4 || (question.options && question.options[3]),
                        question.option_5 || (question.options && question.options[4])
                      ];
                      
                      return Array.from({ length: maxOptions }, (_, oIndex) => (
                        <div key={oIndex} className="flex items-center gap-2">
                          <span className="text-sm text-gray-500 min-w-[20px]">
                            {oIndex + 1}.
                          </span>
                          <input
                            type="text"
                            value={options[oIndex] || ''}
                            onChange={(e) => {
                              if (question.options) {
                                // 기존 options 배열 방식
                                handleOptionUpdate(question.id, oIndex, e.target.value);
                              } else {
                                // 새로운 option_1, option_2 방식
                                const field = `option_${oIndex + 1}` as keyof VocabularyQuestion;
                                handleQuestionUpdate(question.id, field, e.target.value);
                              }
                            }}
                            className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                            placeholder={`선택지 ${oIndex + 1}`}
                          />
                        </div>
                      ));
                    })()
                    }
                  </div>
                </div>
              )}

              {/* 정답 */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  정답
                </label>
                {(() => {
                  const questionType = question.question_type || question.questionType || '5지선다 객관식';
                  // 객관식 문제 유형 판별: '객관식'이 포함되거나 선택형 문제들
                  const isMultipleChoice = questionType.includes('객관식') || 
                                         questionType === '2개중 선택형' || 
                                         questionType === '3개중 선택형' || 
                                         questionType === '낱말 골라 쓰기';
                  return isMultipleChoice;
                })() ? (
                  <select
                    value={question.correct_answer || question.answer || ''}
                    onChange={(e) => handleQuestionUpdate(question.id, question.correct_answer !== undefined ? 'correct_answer' : 'answer', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  >
                    <option value="">정답을 선택하세요</option>
                    {(() => {
                      const questionType = question.question_type || question.questionType || '5지선다 객관식';
                      const maxOptions = questionType === '2개중 선택형' ? 2 :
                                        questionType === '3개중 선택형' ? 3 :
                                        questionType === '낱말 골라 쓰기' ? 4 : 5;
                      
                      const options = [
                        question.option_1 || (question.options && question.options[0]),
                        question.option_2 || (question.options && question.options[1]),
                        question.option_3 || (question.options && question.options[2]),
                        question.option_4 || (question.options && question.options[3]),
                        question.option_5 || (question.options && question.options[4])
                      ];
                      
                      return options.slice(0, maxOptions).map((option, index) => 
                        option ? (
                          <option key={index} value={option}>
                            {index + 1}. {option}
                          </option>
                        ) : null
                      ).filter(Boolean);
                    })()
                    }
                  </select>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={question.correct_answer || question.answer || ''}
                      onChange={(e) => handleQuestionUpdate(question.id, question.correct_answer !== undefined ? 'correct_answer' : 'answer', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                      placeholder="정답을 입력하세요"
                    />
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        초성 힌트 (예: ㅂㅇㅊ)
                      </label>
                      <input
                        type="text"
                        value={question.answer_initials || question.answerInitials || ''}
                        onChange={(e) => handleQuestionUpdate(question.id, question.answer_initials !== undefined ? 'answer_initials' : 'answerInitials', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                        placeholder="초성을 입력하세요 (예: ㅂㅇㅊ)"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 해설 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  해설
                </label>
                <textarea
                  value={question.explanation}
                  onChange={(e) => handleQuestionUpdate(question.id, 'explanation', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm min-h-[60px] resize-vertical"
                  placeholder="해설을 입력하세요"
                />
              </div>
            </div>
            );
          })}
        </div>
      </div>

      {/* 다음 단계 버튼 */}
      <div className="flex justify-center pt-4 border-t">
        <button
          onClick={onNext}
          disabled={loading || localQuestions.length === 0}
          className="bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {loading ? '처리 중...' : '5단계: 종합 문제 생성하기'}
        </button>
      </div>

      {/* 프롬프트 확인 모달 */}
      <PromptModal
        isOpen={showPromptModal}
        onClose={() => setShowPromptModal(false)}
        title="어휘 문제 생성 프롬프트"
        prompt={lastUsedPrompt}
        stepName="4단계: 어휘 문제 검토"
      />

      {/* 🚀 어휘 추가 생성 중 로딩 모달 */}
      {generatingVocab && (
        <div
          className="fixed inset-0 flex items-center justify-center z-[100]"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
        >
          <div className="bg-white backdrop-blur-sm p-8 rounded-xl shadow-lg border border-gray-100 text-center max-w-lg w-full mx-4">
            {/* 로딩 스피너 */}
            <div className="w-12 h-12 border-3 border-gray-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>

            {/* 메시지 */}
            <h3 className="text-lg font-medium text-gray-800 mb-1">
              🚀 어휘 문제 추가 생성 중
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              선택된 {additionalSelectedTerms.length}개 용어로 {additionalSelectedQuestionTypes.length}가지 유형의 문제를 <strong>병렬 스트리밍</strong>으로 생성하고 있습니다
            </p>

            {/* 전체 진행률 */}
            {generationProgress && (
              <div className="mb-4">
                <p className="text-sm text-green-600 font-medium mb-2">
                  {generationProgress}
                </p>
                {Object.keys(typeProgress).length > 0 && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.round(Object.values(typeProgress).reduce((sum, p) => sum + p.progress, 0) / Object.keys(typeProgress).length)}%`
                      }}
                    ></div>
                  </div>
                )}
              </div>
            )}

            {/* 개별 문제 유형별 진행률 */}
            {Object.keys(typeProgress).length > 0 && (
              <div className="space-y-2 text-left max-h-60 overflow-y-auto">
                <h4 className="text-xs font-medium text-gray-700 mb-2 text-center">개별 문제 진행률:</h4>
                {Object.entries(typeProgress).map(([type, progress]) => (
                  <div key={type} className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 truncate flex-1 mr-2">{type}</span>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <div className="w-16 bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            progress.progress === 100 ? 'bg-green-500' :
                            progress.progress > 0 ? 'bg-green-500' : 'bg-gray-300'
                          }`}
                          style={{ width: `${progress.progress}%` }}
                        ></div>
                      </div>
                      <span className={`text-xs w-12 text-right ${
                        progress.progress === 100 ? 'text-green-600' :
                        progress.progress > 0 ? 'text-green-600' : 'text-gray-400'
                      }`}>
                        {progress.progress}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-green-600 mt-4">
              🚀 병렬 스트리밍으로 빠르고 안정적! 기존 문제는 유지됩니다
            </p>
          </div>
        </div>
      )}

      {/* 🆕 어휘 추가 생성 모달 */}
      {showAdditionalGenerationModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        >
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">어휘 문제 추가 생성</h3>
              <button
                onClick={() => setShowAdditionalGenerationModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-4">
                기존 문제는 유지하면서 새로운 어휘에 대한 문제를 추가로 생성합니다.
              </p>

              {/* 문제 유형 선택 */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-lg font-semibold text-gray-800">문제 유형 선택</h4>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-600">
                      {additionalSelectedQuestionTypes.length}/6개 선택됨
                    </span>
                    <button
                      onClick={() => {
                        const allTypes = Object.values(VOCABULARY_QUESTION_TYPES) as VocabularyQuestionType[];
                        setAdditionalSelectedQuestionTypes(prev =>
                          prev.length === allTypes.length ? [] : allTypes
                        );
                      }}
                      className="text-sm bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-1 rounded transition-colors"
                    >
                      {additionalSelectedQuestionTypes.length === 6 ? '전체 해제' : '전체 선택'}
                    </button>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {(Object.values(VOCABULARY_QUESTION_TYPES) as VocabularyQuestionType[]).map((type) => {
                      const isSelected = additionalSelectedQuestionTypes.includes(type);
                      return (
                        <label
                          key={type}
                          className={`
                            flex items-center space-x-3 p-3 rounded border cursor-pointer transition-all
                            ${isSelected
                              ? 'bg-purple-50 border-purple-200 text-purple-900'
                              : 'bg-white border-gray-200 hover:bg-gray-50'
                            }
                          `}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setAdditionalSelectedQuestionTypes(prev => [...prev, type]);
                              } else {
                                setAdditionalSelectedQuestionTypes(prev => prev.filter(t => t !== type));
                              }
                            }}
                            className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                          />
                          <span className="text-sm font-medium">
                            {type}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 어휘 선택 */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-lg font-semibold text-gray-800">추가 생성할 어휘 선택</h4>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-600">
                      {additionalSelectedTerms.length}/{getAllFootnotes().length}개 선택됨
                    </span>
                    <button
                      onClick={() => {
                        const allFootnotes = getAllFootnotes();
                        const generatedTerms = Array.from(new Set(localQuestions.map(q => q.term)));
                        const availableIndices = allFootnotes
                          .map((footnote, index) => {
                            const termName = footnote.split(':')[0]?.trim() || footnote;
                            return !generatedTerms.includes(termName) ? index.toString() : null;
                          })
                          .filter(Boolean) as string[];

                        setAdditionalSelectedTerms(prev =>
                          prev.length === availableIndices.length ? [] : availableIndices
                        );
                      }}
                      className="text-sm bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1 rounded transition-colors"
                    >
                      {additionalSelectedTerms.length > 0 ? '전체 해제' : '선택 가능한 용어 모두 선택'}
                    </button>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
                  <p className="text-sm text-gray-600 mb-3">
                    아래 목록에서 추가로 문제를 생성할 어휘를 선택하세요:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {(() => {
                      const allFootnotes = getAllFootnotes();
                      const generatedTerms = Array.from(new Set(localQuestions.map(q => q.term)));

                      return allFootnotes.map((footnote, index) => {
                        const termIndex = index.toString();
                        const termName = footnote.split(':')[0]?.trim() || footnote;
                        const isAlreadyGenerated = generatedTerms.includes(termName);
                        const isSelected = additionalSelectedTerms.includes(termIndex);

                        return (
                          <label
                            key={index}
                            className={`
                              flex items-center space-x-3 p-3 rounded border transition-all
                              ${isAlreadyGenerated
                                ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
                                : isSelected
                                  ? 'bg-green-50 border-green-200 text-green-900 cursor-pointer'
                                  : 'bg-white border-gray-200 hover:bg-gray-50 cursor-pointer'
                              }
                            `}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={isAlreadyGenerated}
                              onChange={() => {
                                if (!isAlreadyGenerated) {
                                  setAdditionalSelectedTerms(prev =>
                                    prev.includes(termIndex)
                                      ? prev.filter(id => id !== termIndex)
                                      : [...prev, termIndex]
                                  );
                                }
                              }}
                              className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 disabled:opacity-50"
                            />
                            <div className="flex-1 flex items-center justify-between">
                              <span className="text-sm font-medium">
                                {termName}
                              </span>
                              {isAlreadyGenerated && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full ml-2">
                                  생성됨
                                </span>
                              )}
                            </div>
                          </label>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* 버튼 */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowAdditionalGenerationModal(false)}
                className="bg-gray-100 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-200 transition-colors font-medium"
              >
                취소
              </button>
              <button
                onClick={handleAdditionalGeneration}
                disabled={additionalSelectedTerms.length === 0 || additionalSelectedQuestionTypes.length === 0}
                className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {additionalSelectedTerms.length === 0
                  ? '용어를 선택해주세요'
                  : additionalSelectedQuestionTypes.length === 0
                    ? '문제 유형을 선택해주세요'
                    : `${additionalSelectedTerms.length}개 용어 × ${additionalSelectedQuestionTypes.length}가지 유형으로 추가 생성`
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🆕 문제 추가 시 유형 선택 모달 */}
      {showAddQuestionModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        >
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">문제 유형 선택</h3>
              <button
                onClick={() => setShowAddQuestionModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-4">
                {selectedTerm ? `"${selectedTerm}"` : '새 문제'}에 대한 문제 유형을 선택하세요.
              </p>

              <div className="space-y-2">
                {(Object.values(VOCABULARY_QUESTION_TYPES) as VocabularyQuestionType[]).map((type) => {
                  const isSelected = selectedQuestionTypeForAdd === type;
                  return (
                    <label
                      key={type}
                      className={`
                        flex items-center space-x-3 p-3 rounded border cursor-pointer transition-all
                        ${isSelected
                          ? 'bg-green-50 border-green-500 text-green-900'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                        }
                      `}
                    >
                      <input
                        type="radio"
                        name="questionType"
                        checked={isSelected}
                        onChange={() => setSelectedQuestionTypeForAdd(type)}
                        className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 focus:ring-green-500"
                      />
                      <span className="text-sm font-medium flex-1">
                        {type}
                      </span>
                      {isSelected && (
                        <span className="text-green-600">✓</span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 버튼 */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowAddQuestionModal(false)}
                className="bg-gray-100 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-200 transition-colors font-medium"
              >
                취소
              </button>
              <button
                onClick={confirmAddQuestion}
                className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors font-medium"
              >
                추가
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
