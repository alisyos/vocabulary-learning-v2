'use client';

import { useState, useEffect } from 'react';
import { EditablePassage } from '@/types';
import PromptModal from './PromptModal';
import { parseFootnoteToVocabularyTerm, vocabularyTermToFootnote } from '@/lib/vocabularyParser';

interface PassageReviewProps {
  editablePassage: EditablePassage;
  onUpdate: (updatedPassage: EditablePassage) => void;
  onNext: () => void;
  loading?: boolean;
  lastUsedPrompt?: string; // GPT에 보낸 프롬프트
  contextInfo?: {
    grade: string;
    subject: string;
    area: string;
    main_topic: string;
    sub_topic: string;
    keywords: string;
  };
}

// 어휘 파싱 함수는 공통 라이브러리에서 import

export default function PassageReview({
  editablePassage,
  onUpdate,
  onNext,
  loading = false,
  lastUsedPrompt = '',
  contextInfo
}: PassageReviewProps) {
  const [localPassage, setLocalPassage] = useState<EditablePassage>(editablePassage);
  const [showPromptModal, setShowPromptModal] = useState(false);

  // 어휘 재생성 관련 상태
  const [selectedTermIndices, setSelectedTermIndices] = useState<Set<string>>(new Set());
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [regeneratedTerms, setRegeneratedTerms] = useState<any[]>([]);
  const [regenerating, setRegenerating] = useState(false);

  // 2개 지문 형식인지 확인
  const isDualPassageFormat = localPassage.passages && localPassage.passages.length > 0;
  
  // editablePassage prop 변경 시 localPassage 동기화
  useEffect(() => {
    console.log('🔄 PassageReview - editablePassage prop 변경됨:', editablePassage);
    setLocalPassage(editablePassage);
  }, [editablePassage]);
  
  // 디버깅 로그
  console.log('🔍 PassageReview - editablePassage:', editablePassage);
  console.log('📊 PassageReview - localPassage:', localPassage);
  console.log('🎯 PassageReview - isDualPassageFormat:', isDualPassageFormat);
  console.log('📝 PassageReview - passages 개수:', localPassage.passages?.length || 0);

  // === 단일 지문 형식 함수들 (기존 호환성) ===
  const handleTitleChange = (newTitle: string) => {
    const updated = { ...localPassage, title: newTitle };
    setLocalPassage(updated);
    onUpdate(updated);
  };

  const handleParagraphChange = (index: number, newContent: string) => {
    const updatedParagraphs = [...localPassage.paragraphs];
    updatedParagraphs[index] = newContent;
    const updated = { ...localPassage, paragraphs: updatedParagraphs };
    setLocalPassage(updated);
    onUpdate(updated);
  };

  const addParagraph = () => {
    const updated = { 
      ...localPassage, 
      paragraphs: [...localPassage.paragraphs, '새로운 단락을 입력하세요.'] 
    };
    setLocalPassage(updated);
    onUpdate(updated);
  };

  const removeParagraph = (index: number) => {
    if (localPassage.paragraphs.length <= 1) {
      alert('최소 1개의 단락은 있어야 합니다.');
      return;
    }
    const updatedParagraphs = localPassage.paragraphs.filter((_, i) => i !== index);
    const updated = { ...localPassage, paragraphs: updatedParagraphs };
    setLocalPassage(updated);
    onUpdate(updated);
  };

  const handleFootnoteChange = (index: number, newContent: string) => {
    const updatedFootnote = [...localPassage.footnote];
    updatedFootnote[index] = newContent;
    const updated = { ...localPassage, footnote: updatedFootnote };
    setLocalPassage(updated);
    onUpdate(updated);
  };

  // 어휘 개별 필드 변경 핸들러 (단일 지문)
  const handleVocabularyFieldChange = (index: number, field: 'term' | 'definition' | 'example_sentence', value: string) => {
    const currentFootnote = localPassage.footnote[index];
    const parsed = parseFootnoteToVocabularyTerm(currentFootnote);

    // 필드 업데이트
    parsed[field] = value;

    // footnote 형식으로 재조합
    const newFootnote = vocabularyTermToFootnote(parsed.term, parsed.definition, parsed.example_sentence);
    handleFootnoteChange(index, newFootnote);
  };

  const addFootnote = () => {
    const updated = { 
      ...localPassage, 
      footnote: [...localPassage.footnote, '새로운 용어: 용어 설명을 입력하세요.'] 
    };
    setLocalPassage(updated);
    onUpdate(updated);
  };

  const removeFootnote = (index: number) => {
    const updatedFootnote = localPassage.footnote.filter((_, i) => i !== index);
    const updated = { ...localPassage, footnote: updatedFootnote };
    setLocalPassage(updated);
    onUpdate(updated);
  };

  // === 2개 지문 형식 함수들 (새로운 기능) ===
  const handleIntroductionQuestionChange = (newQuestion: string) => {
    const updated = { ...localPassage, introduction_question: newQuestion };
    setLocalPassage(updated);
    onUpdate(updated);
  };

  const handlePassageTitleChange = (passageIndex: number, newTitle: string) => {
    if (!localPassage.passages) return;
    
    const updatedPassages = [...localPassage.passages];
    updatedPassages[passageIndex] = { ...updatedPassages[passageIndex], title: newTitle };
    const updated = { ...localPassage, passages: updatedPassages };
    setLocalPassage(updated);
    onUpdate(updated);
  };

  const handlePassageParagraphChange = (passageIndex: number, paragraphIndex: number, newContent: string) => {
    if (!localPassage.passages) return;
    
    const updatedPassages = [...localPassage.passages];
    const updatedParagraphs = [...updatedPassages[passageIndex].paragraphs];
    updatedParagraphs[paragraphIndex] = newContent;
    updatedPassages[passageIndex] = { ...updatedPassages[passageIndex], paragraphs: updatedParagraphs };
    const updated = { ...localPassage, passages: updatedPassages };
    setLocalPassage(updated);
    onUpdate(updated);
  };

  const addPassageParagraph = (passageIndex: number) => {
    if (!localPassage.passages) return;
    
    const updatedPassages = [...localPassage.passages];
    updatedPassages[passageIndex] = {
      ...updatedPassages[passageIndex],
      paragraphs: [...updatedPassages[passageIndex].paragraphs, '새로운 단락을 입력하세요.']
    };
    const updated = { ...localPassage, passages: updatedPassages };
    setLocalPassage(updated);
    onUpdate(updated);
  };

  const removePassageParagraph = (passageIndex: number, paragraphIndex: number) => {
    if (!localPassage.passages) return;
    if (localPassage.passages[passageIndex].paragraphs.length <= 1) {
      alert('최소 1개의 단락은 있어야 합니다.');
      return;
    }
    
    const updatedPassages = [...localPassage.passages];
    const updatedParagraphs = updatedPassages[passageIndex].paragraphs.filter((_, i) => i !== paragraphIndex);
    updatedPassages[passageIndex] = { ...updatedPassages[passageIndex], paragraphs: updatedParagraphs };
    const updated = { ...localPassage, passages: updatedPassages };
    setLocalPassage(updated);
    onUpdate(updated);
  };

  const handlePassageFootnoteChange = (passageIndex: number, footnoteIndex: number, newContent: string) => {
    if (!localPassage.passages) return;

    const updatedPassages = [...localPassage.passages];
    const updatedFootnote = [...updatedPassages[passageIndex].footnote];
    updatedFootnote[footnoteIndex] = newContent;
    updatedPassages[passageIndex] = { ...updatedPassages[passageIndex], footnote: updatedFootnote };
    const updated = { ...localPassage, passages: updatedPassages };
    setLocalPassage(updated);
    onUpdate(updated);
  };

  // 어휘 개별 필드 변경 핸들러 (2개 지문)
  const handlePassageVocabularyFieldChange = (
    passageIndex: number,
    footnoteIndex: number,
    field: 'term' | 'definition' | 'example_sentence',
    value: string
  ) => {
    if (!localPassage.passages) return;

    const currentFootnote = localPassage.passages[passageIndex].footnote[footnoteIndex];
    const parsed = parseFootnoteToVocabularyTerm(currentFootnote);

    // 필드 업데이트
    parsed[field] = value;

    // footnote 형식으로 재조합
    const newFootnote = vocabularyTermToFootnote(parsed.term, parsed.definition, parsed.example_sentence);
    handlePassageFootnoteChange(passageIndex, footnoteIndex, newFootnote);
  };

  const addPassageFootnote = (passageIndex: number) => {
    if (!localPassage.passages) return;
    
    const updatedPassages = [...localPassage.passages];
    updatedPassages[passageIndex] = {
      ...updatedPassages[passageIndex],
      footnote: [...updatedPassages[passageIndex].footnote, '새로운 용어: 용어 설명을 입력하세요.']
    };
    const updated = { ...localPassage, passages: updatedPassages };
    setLocalPassage(updated);
    onUpdate(updated);
  };

  const removePassageFootnote = (passageIndex: number, footnoteIndex: number) => {
    if (!localPassage.passages) return;
    
    const updatedPassages = [...localPassage.passages];
    const updatedFootnote = updatedPassages[passageIndex].footnote.filter((_, i) => i !== footnoteIndex);
    updatedPassages[passageIndex] = { ...updatedPassages[passageIndex], footnote: updatedFootnote };
    const updated = { ...localPassage, passages: updatedPassages };
    setLocalPassage(updated);
    onUpdate(updated);
  };

  // 전체 문자 수 계산 (2개 지문 형식일 때)
  const getTotalCharCount = () => {
    if (isDualPassageFormat) {
      return localPassage.passages!.reduce((total, passage) =>
        total + passage.paragraphs.join('').length, 0);
    }
    return localPassage.paragraphs.join('').length;
  };

  // 용어가 단락에 포함되어 있는지 확인하는 함수
  const isTermInParagraphs = (term: string, paragraphs: string[]): boolean => {
    const combinedText = paragraphs.join(' ');
    return combinedText.includes(term);
  };

  // 2개 지문 형식: 해당 지문의 단락에 용어가 있는지 확인
  const isTermInPassageParagraphs = (term: string, passageIndex: number): boolean => {
    if (!isDualPassageFormat || !localPassage.passages) return true;
    const passage = localPassage.passages[passageIndex];
    return isTermInParagraphs(term, passage.paragraphs);
  };

  // 중복 용어 체크 함수 (2개 지문 형식 전용)
  const getDuplicateTerms = (): Set<string> => {
    if (!isDualPassageFormat || !localPassage.passages || localPassage.passages.length < 2) {
      return new Set();
    }

    const duplicates = new Set<string>();
    const firstPassageTerms = new Map<string, number>(); // term -> count
    const secondPassageTerms = new Map<string, number>(); // term -> count

    // 첫 번째 지문의 용어 수집 및 내부 중복 체크
    localPassage.passages[0].footnote.forEach(footnote => {
      const parsed = parseFootnoteToVocabularyTerm(footnote);
      const normalizedTerm = parsed.term.trim().toLowerCase();
      const count = firstPassageTerms.get(normalizedTerm) || 0;
      firstPassageTerms.set(normalizedTerm, count + 1);

      // 첫 번째 지문 내부에서 중복이 발견되면 추가
      if (count >= 1) {
        duplicates.add(normalizedTerm);
      }
    });

    // 두 번째 지문의 용어 수집 및 내부 중복 + 지문 간 중복 체크
    localPassage.passages[1].footnote.forEach(footnote => {
      const parsed = parseFootnoteToVocabularyTerm(footnote);
      const normalizedTerm = parsed.term.trim().toLowerCase();
      const count = secondPassageTerms.get(normalizedTerm) || 0;
      secondPassageTerms.set(normalizedTerm, count + 1);

      // 두 번째 지문 내부에서 중복이 발견되면 추가
      if (count >= 1) {
        duplicates.add(normalizedTerm);
      }

      // 첫 번째 지문과의 중복 체크
      if (firstPassageTerms.has(normalizedTerm)) {
        duplicates.add(normalizedTerm);
      }
    });

    return duplicates;
  };

  // 특정 용어가 중복인지 확인하는 함수
  const isDuplicateTerm = (term: string): boolean => {
    if (!isDualPassageFormat) return false;
    const duplicateTerms = getDuplicateTerms();
    const normalizedTerm = term.trim().toLowerCase();
    return duplicateTerms.has(normalizedTerm);
  };

  // 중복 유형을 확인하는 함수 (같은 지문 내 중복인지, 다른 지문과 중복인지)
  const getDuplicateType = (term: string, currentPassageIndex: number): {
    hasSamePassageDuplicate: boolean;
    hasOtherPassageDuplicate: boolean;
  } => {
    if (!isDualPassageFormat || !localPassage.passages) {
      return { hasSamePassageDuplicate: false, hasOtherPassageDuplicate: false };
    }

    const normalizedTerm = term.trim().toLowerCase();

    // 현재 지문 내 중복 체크
    let samePassageCount = 0;
    localPassage.passages[currentPassageIndex].footnote.forEach(footnote => {
      const parsed = parseFootnoteToVocabularyTerm(footnote);
      if (parsed.term.trim().toLowerCase() === normalizedTerm) {
        samePassageCount++;
      }
    });

    // 다른 지문과의 중복 체크
    const otherPassageIndex = currentPassageIndex === 0 ? 1 : 0;
    let otherPassageHasTerm = false;
    localPassage.passages[otherPassageIndex].footnote.forEach(footnote => {
      const parsed = parseFootnoteToVocabularyTerm(footnote);
      if (parsed.term.trim().toLowerCase() === normalizedTerm) {
        otherPassageHasTerm = true;
      }
    });

    return {
      hasSamePassageDuplicate: samePassageCount > 1,
      hasOtherPassageDuplicate: otherPassageHasTerm
    };
  };

  // 예시 문장에 용어가 포함되어 있는지 확인하는 함수
  const isTermInExampleSentence = (term: string, exampleSentence: string): boolean => {
    if (!exampleSentence || !exampleSentence.trim()) {
      return true; // 예시 문장이 없으면 체크하지 않음
    }
    const normalizedTerm = term.trim().toLowerCase();
    const normalizedExample = exampleSentence.trim().toLowerCase();
    return normalizedExample.includes(normalizedTerm);
  };

  // === 어휘 재생성 기능 ===
  // 용어 선택 핸들러
  const handleSelectTerm = (termKey: string, checked: boolean) => {
    const newSelected = new Set(selectedTermIndices);
    if (checked) {
      newSelected.add(termKey);
    } else {
      newSelected.delete(termKey);
    }
    setSelectedTermIndices(newSelected);
  };

  // 전체 선택 핸들러
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allKeys = new Set<string>();
      if (isDualPassageFormat) {
        localPassage.passages!.forEach((passage, pIdx) => {
          passage.footnote.forEach((_, fIdx) => {
            allKeys.add(`${pIdx}-${fIdx}`);
          });
        });
      } else {
        localPassage.footnote.forEach((_, fIdx) => {
          allKeys.add(`single-${fIdx}`);
        });
      }
      setSelectedTermIndices(allKeys);
    } else {
      setSelectedTermIndices(new Set());
    }
  };

  // 어휘 재생성 실행
  const handleRegenerate = async () => {
    if (selectedTermIndices.size === 0) {
      alert('재생성할 용어를 선택해주세요.');
      return;
    }

    if (!contextInfo) {
      alert('콘텐츠 정보가 없습니다. 재생성할 수 없습니다.');
      return;
    }

    setRegenerating(true);
    try {
      // 선택된 용어 추출
      const termsToRegenerate = [];

      if (isDualPassageFormat) {
        localPassage.passages!.forEach((passage, pIdx) => {
          passage.footnote.forEach((footnote, fIdx) => {
            const key = `${pIdx}-${fIdx}`;
            if (selectedTermIndices.has(key)) {
              const parsed = parseFootnoteToVocabularyTerm(footnote);
              termsToRegenerate.push({
                ...parsed,
                key,
                passageIndex: pIdx,
                footnoteIndex: fIdx
              });
            }
          });
        });
      } else {
        localPassage.footnote.forEach((footnote, fIdx) => {
          const key = `single-${fIdx}`;
          if (selectedTermIndices.has(key)) {
            const parsed = parseFootnoteToVocabularyTerm(footnote);
            termsToRegenerate.push({
              ...parsed,
              key,
              footnoteIndex: fIdx
            });
          }
        });
      }

      const response = await fetch('/api/vocabulary-terms/regenerate-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          terms: termsToRegenerate.map(t => ({
            term: t.term,
            definition: t.definition,
            example_sentence: t.example_sentence
          })),
          contextInfo
        })
      });

      const result = await response.json();

      if (result.success) {
        // key 정보 복원
        const mergedTerms = result.regeneratedTerms.map((regenTerm: any, idx: number) => ({
          ...regenTerm,
          ...termsToRegenerate[idx] // key, passageIndex, footnoteIndex 포함
        }));

        setRegeneratedTerms(mergedTerms);
        setShowRegenerateModal(true);

        if (result.errors && result.errors.length > 0) {
          console.error('Regeneration errors:', result.errors);
        }
      } else {
        alert(`재생성 실패: ${result.message}`);
      }
    } catch (error) {
      console.error('Regeneration error:', error);
      alert('재생성 중 오류가 발생했습니다.');
    } finally {
      setRegenerating(false);
    }
  };

  // 재생성된 항목 개별 저장
  const handleSaveRegenerated = (termData: any) => {
    const newFootnote = vocabularyTermToFootnote(
      termData.term,
      termData.new_definition,
      termData.new_example_sentence
    );

    // 먼저 localPassage를 복사하여 업데이트
    const updatedPassage = { ...localPassage };

    if (isDualPassageFormat && termData.passageIndex !== undefined) {
      // 2개 지문 형식: passageIndex 검증 및 로깅
      const targetPassageIndex = termData.passageIndex;

      console.log(`🔍 용어 "${termData.term}" 저장 시작 - 지문 인덱스: ${targetPassageIndex}`);

      // passageIndex 유효성 검증
      if (targetPassageIndex < 0 || targetPassageIndex >= (localPassage.passages?.length || 0)) {
        console.error(`❌ 유효하지 않은 passageIndex: ${targetPassageIndex} (전체 지문 수: ${localPassage.passages?.length || 0})`);
        alert(`저장 오류: 지문 인덱스가 유효하지 않습니다. 페이지를 새로고침하고 다시 시도해주세요.`);
        return;
      }

      // 2개 지문 형식: 현재 footnote 배열에서 용어명으로 인덱스 찾기
      const currentFootnotes = localPassage.passages![targetPassageIndex].footnote;
      console.log(`📚 지문 ${targetPassageIndex + 1}의 현재 어휘 목록:`, currentFootnotes.map(f => {
        const p = parseFootnoteToVocabularyTerm(f);
        return p.term;
      }));

      const currentIndex = currentFootnotes.findIndex(footnote => {
        const parsed = parseFootnoteToVocabularyTerm(footnote);
        return parsed.term === termData.term;
      });

      if (currentIndex !== -1) {
        console.log(`✅ 용어 "${termData.term}"을 지문 ${targetPassageIndex + 1}의 ${currentIndex + 1}번째 위치에서 찾음`);

        // 깊은 복사로 passages 배열 업데이트
        const updatedPassages = [...localPassage.passages!];
        const updatedFootnote = [...updatedPassages[targetPassageIndex].footnote];
        updatedFootnote[currentIndex] = newFootnote;
        updatedPassages[targetPassageIndex] = {
          ...updatedPassages[targetPassageIndex],
          footnote: updatedFootnote
        };
        updatedPassage.passages = updatedPassages;

        // 상태 업데이트
        setLocalPassage(updatedPassage);
        onUpdate(updatedPassage);

        console.log(`✅ 용어 "${termData.term}" 저장 완료 (지문 ${targetPassageIndex + 1})`);
      } else {
        console.error(`❌ 용어 "${termData.term}"을 지문 ${targetPassageIndex + 1}에서 찾을 수 없습니다.`);
        alert(`용어 "${termData.term}"을 찾을 수 없습니다. 페이지를 새로고침하고 다시 시도해주세요.`);
        return;
      }
    } else {
      // 단일 지문 형식: 현재 footnote 배열에서 용어명으로 인덱스 찾기
      console.log(`🔍 용어 "${termData.term}" 저장 시작 (단일 지문)`);

      const currentIndex = localPassage.footnote.findIndex(footnote => {
        const parsed = parseFootnoteToVocabularyTerm(footnote);
        return parsed.term === termData.term;
      });

      if (currentIndex !== -1) {
        console.log(`✅ 용어 "${termData.term}"을 ${currentIndex + 1}번째 위치에서 찾음`);

        // footnote 배열 업데이트
        const updatedFootnote = [...localPassage.footnote];
        updatedFootnote[currentIndex] = newFootnote;
        updatedPassage.footnote = updatedFootnote;

        // 상태 업데이트
        setLocalPassage(updatedPassage);
        onUpdate(updatedPassage);

        console.log(`✅ 용어 "${termData.term}" 저장 완료 (단일 지문)`);
      } else {
        console.error(`❌ 용어 "${termData.term}"을 찾을 수 없습니다.`);
        alert(`용어 "${termData.term}"을 찾을 수 없습니다. 페이지를 새로고침하고 다시 시도해주세요.`);
        return;
      }
    }

    // 재생성 목록에서 제거
    setRegeneratedTerms(prev => {
      const updated = prev.filter(t => t.key !== termData.key);

      // 마지막 항목이 저장되면 모달 자동 닫기
      if (updated.length === 0) {
        setShowRegenerateModal(false);
        setSelectedTermIndices(new Set());
        alert('모든 항목이 저장되었습니다.');
      }

      return updated;
    });
  };

  // 재생성된 모든 항목 일괄 저장
  const handleSaveAllRegenerated = () => {
    let successCount = 0;
    let failCount = 0;

    console.log(`🔄 일괄 저장 시작: ${regeneratedTerms.length}개 어휘`);

    // 먼저 localPassage를 복사하여 모든 변경사항을 한 번에 적용
    const updatedPassage = { ...localPassage };

    regeneratedTerms.forEach((termData, index) => {
      const newFootnote = vocabularyTermToFootnote(
        termData.term,
        termData.new_definition,
        termData.new_example_sentence
      );

      if (isDualPassageFormat && termData.passageIndex !== undefined) {
        const targetPassageIndex = termData.passageIndex;

        console.log(`🔍 [${index + 1}/${regeneratedTerms.length}] 용어 "${termData.term}" 일괄 저장 - 지문 인덱스: ${targetPassageIndex}`);

        // passageIndex 유효성 검증
        if (targetPassageIndex < 0 || targetPassageIndex >= (localPassage.passages?.length || 0)) {
          console.error(`❌ 유효하지 않은 passageIndex: ${targetPassageIndex} (전체 지문 수: ${localPassage.passages?.length || 0})`);
          failCount++;
          return;
        }

        // 2개 지문 형식: 현재 footnote 배열에서 용어명으로 인덱스 찾기
        if (!updatedPassage.passages) {
          updatedPassage.passages = [...localPassage.passages!];
        }

        const currentFootnotes = updatedPassage.passages[targetPassageIndex].footnote;
        const currentIndex = currentFootnotes.findIndex(footnote => {
          const parsed = parseFootnoteToVocabularyTerm(footnote);
          return parsed.term === termData.term;
        });

        if (currentIndex !== -1) {
          console.log(`✅ 용어 "${termData.term}"을 지문 ${targetPassageIndex + 1}의 ${currentIndex + 1}번째 위치에서 찾음`);

          // 깊은 복사로 passages 배열 업데이트
          const updatedPassages = [...updatedPassage.passages];
          const updatedFootnote = [...updatedPassages[targetPassageIndex].footnote];
          updatedFootnote[currentIndex] = newFootnote;
          updatedPassages[targetPassageIndex] = {
            ...updatedPassages[targetPassageIndex],
            footnote: updatedFootnote
          };
          updatedPassage.passages = updatedPassages;
          successCount++;

          console.log(`✅ 용어 "${termData.term}" 일괄 저장 완료 (지문 ${targetPassageIndex + 1})`);
        } else {
          console.error(`❌ 용어 "${termData.term}"을 지문 ${targetPassageIndex + 1}에서 찾을 수 없습니다.`);
          failCount++;
        }
      } else {
        // 단일 지문 형식: 현재 footnote 배열에서 용어명으로 인덱스 찾기
        console.log(`🔍 [${index + 1}/${regeneratedTerms.length}] 용어 "${termData.term}" 일괄 저장 (단일 지문)`);

        if (!updatedPassage.footnote) {
          updatedPassage.footnote = [...localPassage.footnote];
        }

        const currentIndex = updatedPassage.footnote.findIndex(footnote => {
          const parsed = parseFootnoteToVocabularyTerm(footnote);
          return parsed.term === termData.term;
        });

        if (currentIndex !== -1) {
          console.log(`✅ 용어 "${termData.term}"을 ${currentIndex + 1}번째 위치에서 찾음`);

          // footnote 배열 업데이트
          const updatedFootnote = [...updatedPassage.footnote];
          updatedFootnote[currentIndex] = newFootnote;
          updatedPassage.footnote = updatedFootnote;
          successCount++;

          console.log(`✅ 용어 "${termData.term}" 일괄 저장 완료 (단일 지문)`);
        } else {
          console.error(`❌ 용어 "${termData.term}"을 찾을 수 없습니다.`);
          failCount++;
        }
      }
    });

    // 모든 변경사항을 한 번에 적용
    if (successCount > 0) {
      setLocalPassage(updatedPassage);
      onUpdate(updatedPassage);
      console.log(`✅ 총 ${successCount}개 용어 일괄 저장 완료, 부모로 전달`);
    }

    if (failCount > 0) {
      alert(`${successCount}개 항목이 저장되었습니다.\n${failCount}개 항목은 저장에 실패했습니다.`);
    } else {
      alert(`${successCount}개 항목이 모두 저장되었습니다.`);
    }

    setShowRegenerateModal(false);
    setRegeneratedTerms([]);
    setSelectedTermIndices(new Set());
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-bold text-gray-800">2단계: 지문 검토 및 수정</h2>
          <button
            onClick={onNext}
            disabled={loading || (isDualPassageFormat ? 
              !localPassage.passages?.every(p => p.title.trim()) : 
              !localPassage.title.trim())}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
          >
            {loading ? '처리 중...' : '3단계: 어휘 문제 생성하기'}
          </button>
        </div>
        <div className="flex items-center space-x-2">
          {lastUsedPrompt && (
            <button
              onClick={() => setShowPromptModal(true)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md transition-colors font-medium text-sm flex items-center space-x-1"
              title="지문 생성에 사용된 프롬프트 확인"
            >
              <span>📋</span>
              <span>프롬프트 확인</span>
            </button>
          )}
          <span className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
            {isDualPassageFormat ? '2개 지문 검토' : '검토 및 수정'}
          </span>
        </div>
      </div>

      {isDualPassageFormat ? (
        // === 2개 지문 형식 UI ===
        <div className="space-y-8">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              📚 연관된 2개 지문 형식 | 총 {getTotalCharCount()}자
            </p>
          </div>

          {/* 도입 질문 섹션 - 2개 지문 형식 */}
          {localPassage.introduction_question !== undefined && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-semibold text-blue-900">
                  도입 질문
                </label>
                <span className="text-xs text-blue-600 bg-white px-2 py-1 rounded">
                  2개 지문을 아우르는 흥미 유발 질문
                </span>
              </div>
              <textarea
                value={localPassage.introduction_question || ''}
                onChange={(e) => handleIntroductionQuestionChange(e.target.value)}
                placeholder="예: 우리 몸은 어떻게 음식을 소화시킬까요?"
                className="w-full px-4 py-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white"
                rows={2}
              />
            </div>
          )}

          {localPassage.passages!.map((passage, passageIndex) => (
            <div key={passageIndex} className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  {passageIndex === 0 ? '첫 번째 지문 (기초)' : '두 번째 지문 (심화)'}
                </h3>
                <span className="ml-2 text-sm text-gray-500">
                  ({passage.paragraphs.join('').length}자)
                </span>
              </div>

              {/* 지문별 제목 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  제목
                </label>
                <input
                  type="text"
                  value={passage.title}
                  onChange={(e) => handlePassageTitleChange(passageIndex, e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-medium"
                  placeholder="지문의 제목을 입력하세요"
                />
              </div>

              {/* 지문별 본문 */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    본문 ({passage.paragraphs.length}개 단락)
                  </label>
                  <button
                    onClick={() => addPassageParagraph(passageIndex)}
                    className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-md hover:bg-green-200 transition-colors"
                  >
                    + 단락 추가
                  </button>
                </div>
                
                <div className="space-y-3">
                  {passage.paragraphs.map((paragraph, paragraphIndex) => (
                    <div key={paragraphIndex} className="relative">
                      <div className="flex items-start gap-2">
                        <span className="text-sm text-gray-500 mt-2 min-w-[60px]">
                          단락 {paragraphIndex + 1}
                        </span>
                        <textarea
                          value={paragraph}
                          onChange={(e) => handlePassageParagraphChange(passageIndex, paragraphIndex, e.target.value)}
                          className="flex-1 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[100px] resize-vertical"
                          placeholder={`${paragraphIndex + 1}번째 단락 내용을 입력하세요`}
                        />
                        <button
                          onClick={() => removePassageParagraph(passageIndex, paragraphIndex)}
                          className="text-red-500 hover:text-red-700 p-2 mt-1"
                          title="단락 삭제"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 지문별 용어 설명 */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    용어 설명 ({passage.footnote.length}개)
                    <span className="text-xs text-gray-500 ml-2">
                      {passageIndex === 0 ? '(용어 1-10)' : '(용어 11-20)'}
                    </span>
                    {(() => {
                      const missingCount = passage.footnote.filter((footnote) => {
                        const parsed = parseFootnoteToVocabularyTerm(footnote);
                        return !isTermInPassageParagraphs(parsed.term, passageIndex);
                      }).length;
                      return missingCount > 0 ? (
                        <span className="ml-2 text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
                          ⚠️ {missingCount}개 본문에 없음
                        </span>
                      ) : null;
                    })()}
                    {(() => {
                      const duplicateCount = passage.footnote.filter((footnote) => {
                        const parsed = parseFootnoteToVocabularyTerm(footnote);
                        return isDuplicateTerm(parsed.term);
                      }).length;
                      return duplicateCount > 0 ? (
                        <span className="ml-2 text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                          🔴 {duplicateCount}개 중복됨
                        </span>
                      ) : null;
                    })()}
                    {(() => {
                      const exampleMissingCount = passage.footnote.filter((footnote) => {
                        const parsed = parseFootnoteToVocabularyTerm(footnote);
                        return !isTermInExampleSentence(parsed.term, parsed.example_sentence);
                      }).length;
                      return exampleMissingCount > 0 ? (
                        <span className="ml-2 text-xs text-yellow-700 bg-yellow-100 px-2 py-1 rounded">
                          ⚡ {exampleMissingCount}개 예시 문장에 용어 없음
                        </span>
                      ) : null;
                    })()}
                  </label>
                  <div className="flex gap-2">
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer bg-gray-50 px-3 py-1 rounded-md hover:bg-gray-100 transition-colors">
                      <input
                        type="checkbox"
                        checked={(() => {
                          let totalTerms = 0;
                          let selectedCount = 0;
                          localPassage.passages!.forEach((passage, pIdx) => {
                            passage.footnote.forEach((_, fIdx) => {
                              totalTerms++;
                              if (selectedTermIndices.has(`${pIdx}-${fIdx}`)) {
                                selectedCount++;
                              }
                            });
                          });
                          return totalTerms > 0 && totalTerms === selectedCount;
                        })()}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <span>전체 선택</span>
                    </label>
                    <button
                      onClick={handleRegenerate}
                      disabled={selectedTermIndices.size === 0 || regenerating}
                      className="text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded-md hover:bg-purple-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {regenerating ? '재생성 중...' : `선택 재생성 (${selectedTermIndices.size})`}
                    </button>
                    <button
                      onClick={() => addPassageFootnote(passageIndex)}
                      className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-md hover:bg-green-200 transition-colors"
                    >
                      + 용어 추가
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {passage.footnote.map((footnote, footnoteIndex) => {
                    const parsed = parseFootnoteToVocabularyTerm(footnote);
                    const globalIndex = passageIndex === 0 ? footnoteIndex + 1 : footnoteIndex + 11;
                    const termKey = `${passageIndex}-${footnoteIndex}`;
                    const isTermMissing = !isTermInPassageParagraphs(parsed.term, passageIndex);
                    const isTermDuplicate = isDuplicateTerm(parsed.term);
                    const duplicateType = getDuplicateType(parsed.term, passageIndex);
                    const isExampleMissing = !isTermInExampleSentence(parsed.term, parsed.example_sentence);

                    return (
                      <div
                        key={footnoteIndex}
                        className={`border rounded-lg p-3 ${
                          isTermDuplicate
                            ? 'bg-red-50 border-red-300'
                            : isTermMissing
                            ? 'bg-orange-50 border-orange-300'
                            : isExampleMissing
                            ? 'bg-yellow-50 border-yellow-300'
                            : 'bg-white border-gray-200'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selectedTermIndices.has(termKey)}
                            onChange={(e) => handleSelectTerm(termKey, e.target.checked)}
                            className="mt-2 rounded border-gray-300"
                          />
                          <span className="text-sm text-gray-500 min-w-[25px] mt-1">
                            {globalIndex}.
                          </span>
                          <div className="flex-1 space-y-2">
                            {isTermDuplicate && (
                              <div className="flex flex-col gap-1">
                                {duplicateType.hasSamePassageDuplicate && (
                                  <div className="flex items-center gap-2 text-red-700 text-sm font-medium bg-red-100 px-2 py-1 rounded">
                                    <span>🔴</span>
                                    <span>이 용어는 이 지문 내에서 중복됩니다</span>
                                  </div>
                                )}
                                {duplicateType.hasOtherPassageDuplicate && (
                                  <div className="flex items-center gap-2 text-red-700 text-sm font-medium bg-red-100 px-2 py-1 rounded">
                                    <span>🔴</span>
                                    <span>이 용어는 {passageIndex === 0 ? '두 번째' : '첫 번째'} 지문과 중복됩니다</span>
                                  </div>
                                )}
                              </div>
                            )}
                            {isTermMissing && !isTermDuplicate && (
                              <div className="flex items-center gap-2 text-orange-700 text-sm font-medium bg-orange-100 px-2 py-1 rounded">
                                <span>⚠️</span>
                                <span>이 용어가 지문 본문에 포함되어 있지 않습니다</span>
                              </div>
                            )}
                            {isExampleMissing && !isTermDuplicate && !isTermMissing && (
                              <div className="flex items-center gap-2 text-yellow-700 text-sm font-medium bg-yellow-100 px-2 py-1 rounded">
                                <span>⚡</span>
                                <span>예시 문장에 용어가 포함되어 있지 않습니다</span>
                              </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  용어
                                </label>
                                <input
                                  type="text"
                                  value={parsed.term}
                                  onChange={(e) => handlePassageVocabularyFieldChange(passageIndex, footnoteIndex, 'term', e.target.value)}
                                  className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
                                    isTermDuplicate
                                      ? 'border-red-400'
                                      : isTermMissing
                                      ? 'border-orange-400'
                                      : 'border-gray-300'
                                  }`}
                                  placeholder="용어 입력"
                                />
                              </div>
                              <div className="md:col-span-2">
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  뜻
                                </label>
                                <input
                                  type="text"
                                  value={parsed.definition}
                                  onChange={(e) => handlePassageVocabularyFieldChange(passageIndex, footnoteIndex, 'definition', e.target.value)}
                                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                  placeholder="용어의 뜻 입력"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                예시 문장 (선택사항)
                              </label>
                              <input
                                type="text"
                                value={parsed.example_sentence}
                                onChange={(e) => handlePassageVocabularyFieldChange(passageIndex, footnoteIndex, 'example_sentence', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                placeholder="예시 문장 입력 (선택사항)"
                              />
                            </div>
                          </div>
                          <button
                            onClick={() => removePassageFootnote(passageIndex, footnoteIndex)}
                            className="text-red-500 hover:text-red-700 p-1"
                            title="용어 삭제"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}

          {/* 2개 지문 미리보기 */}
          <div className="mt-8 p-6 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">미리보기</h3>
            <div className="space-y-6">
              {localPassage.passages!.map((passage, passageIndex) => (
                <div key={passageIndex} className="prose max-w-none">
                  <div className="flex items-center mb-3">
                    <h4 className="text-lg font-medium text-blue-700">{passage.title}</h4>
                    <span className="ml-2 text-sm text-gray-500 bg-white px-2 py-1 rounded">
                      {passageIndex === 0 ? '기초' : '심화'}
                    </span>
                  </div>
                  {passage.paragraphs.map((paragraph, paragraphIndex) => (
                    <p key={paragraphIndex} className="mb-3 text-gray-700 leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                  
                  {passage.footnote.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-300">
                      <h5 className="text-sm font-medium text-gray-800 mb-2">
                        용어 설명 {passageIndex === 0 ? '(1-10)' : '(11-20)'}
                      </h5>
                      <div className="grid grid-cols-1 gap-2 text-sm">
                        {passage.footnote.map((footnote, footnoteIndex) => {
                          const parsed = parseFootnoteToVocabularyTerm(footnote);
                          const globalIndex = passageIndex === 0 ? footnoteIndex + 1 : footnoteIndex + 11;
                          const isTermMissing = !isTermInPassageParagraphs(parsed.term, passageIndex);
                          const isTermDuplicate = isDuplicateTerm(parsed.term);
                          const duplicateType = getDuplicateType(parsed.term, passageIndex);
                          const isExampleMissing = !isTermInExampleSentence(parsed.term, parsed.example_sentence);
                          return (
                            <div
                              key={footnoteIndex}
                              className={`flex items-start gap-2 p-2 rounded border ${
                                isTermDuplicate
                                  ? 'bg-red-50 border-red-300'
                                  : isTermMissing
                                  ? 'bg-orange-50 border-orange-300'
                                  : isExampleMissing
                                  ? 'bg-yellow-50 border-yellow-300'
                                  : 'bg-white border-gray-100'
                              }`}
                            >
                              <span className={`font-medium ${
                                isTermDuplicate
                                  ? 'text-red-600'
                                  : isTermMissing
                                  ? 'text-orange-600'
                                  : isExampleMissing
                                  ? 'text-yellow-700'
                                  : 'text-blue-600'
                              }`}>
                                {isTermDuplicate && '🔴 '}
                                {isTermMissing && !isTermDuplicate && '⚠️ '}
                                {isExampleMissing && !isTermDuplicate && !isTermMissing && '⚡ '}
                                {globalIndex}.
                              </span>
                              <div className="flex-1">
                                <span className="font-medium text-gray-800">{parsed.term}</span>
                                <span className="text-gray-600">: {parsed.definition}</span>
                                {parsed.example_sentence && (
                                  <span className="text-gray-500 italic"> (예: {parsed.example_sentence})</span>
                                )}
                                {isTermDuplicate && (
                                  <div className="text-red-700 text-xs mt-1 space-y-0.5">
                                    {duplicateType.hasSamePassageDuplicate && (
                                      <div>이 지문 내에서 중복됨</div>
                                    )}
                                    {duplicateType.hasOtherPassageDuplicate && (
                                      <div>{passageIndex === 0 ? '두 번째' : '첫 번째'} 지문과 중복됨</div>
                                    )}
                                  </div>
                                )}
                                {isTermMissing && !isTermDuplicate && (
                                  <div className="text-orange-700 text-xs mt-1">
                                    본문에 포함되지 않음
                                  </div>
                                )}
                                {isExampleMissing && !isTermDuplicate && !isTermMissing && (
                                  <div className="text-yellow-700 text-xs mt-1">
                                    예시 문장에 용어 없음
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        // === 기존 단일 지문 형식 UI (하위 호환성) ===
        <div>
          {/* 제목 편집 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              제목
            </label>
            <input
              type="text"
              value={localPassage.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-medium"
              placeholder="지문의 제목을 입력하세요"
            />
          </div>

          {/* 본문 편집 */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                본문 ({localPassage.paragraphs.length}개 단락) (총 {localPassage.paragraphs.join('').length}자)
              </label>
              <button
                onClick={addParagraph}
                className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-md hover:bg-green-200 transition-colors"
              >
                + 단락 추가
              </button>
            </div>
            
            <div className="space-y-4">
              {localPassage.paragraphs.map((paragraph, index) => (
                <div key={index} className="relative">
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-gray-500 mt-2 min-w-[60px]">
                      단락 {index + 1}
                    </span>
                    <textarea
                      value={paragraph}
                      onChange={(e) => handleParagraphChange(index, e.target.value)}
                      className="flex-1 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[100px] resize-vertical"
                      placeholder={`${index + 1}번째 단락 내용을 입력하세요`}
                    />
                    <button
                      onClick={() => removeParagraph(index)}
                      className="text-red-500 hover:text-red-700 p-2 mt-1"
                      title="단락 삭제"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 용어 설명 편집 */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-700">
                용어 설명 ({localPassage.footnote.length}개)
                {(() => {
                  const missingCount = localPassage.footnote.filter((footnote) => {
                    const parsed = parseFootnoteToVocabularyTerm(footnote);
                    return !isTermInParagraphs(parsed.term, localPassage.paragraphs);
                  }).length;
                  return missingCount > 0 ? (
                    <span className="ml-2 text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
                      ⚠️ {missingCount}개 본문에 없음
                    </span>
                  ) : null;
                })()}
                {(() => {
                  const exampleMissingCount = localPassage.footnote.filter((footnote) => {
                    const parsed = parseFootnoteToVocabularyTerm(footnote);
                    return !isTermInExampleSentence(parsed.term, parsed.example_sentence);
                  }).length;
                  return exampleMissingCount > 0 ? (
                    <span className="ml-2 text-xs text-yellow-700 bg-yellow-100 px-2 py-1 rounded">
                      ⚡ {exampleMissingCount}개 예시 문장에 용어 없음
                    </span>
                  ) : null;
                })()}
              </label>
              <div className="flex gap-2">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer bg-gray-50 px-3 py-1 rounded-md hover:bg-gray-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={localPassage.footnote.length > 0 && localPassage.footnote.every((_, fIdx) =>
                      selectedTermIndices.has(`single-${fIdx}`)
                    )}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span>전체 선택</span>
                </label>
                <button
                  onClick={handleRegenerate}
                  disabled={selectedTermIndices.size === 0 || regenerating}
                  className="text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded-md hover:bg-purple-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {regenerating ? '재생성 중...' : `선택 재생성 (${selectedTermIndices.size})`}
                </button>
                <button
                  onClick={addFootnote}
                  className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-md hover:bg-green-200 transition-colors"
                >
                  + 용어 추가
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {localPassage.footnote.map((footnote, index) => {
                const parsed = parseFootnoteToVocabularyTerm(footnote);
                const termKey = `single-${index}`;
                const isTermMissing = !isTermInParagraphs(parsed.term, localPassage.paragraphs);
                const isExampleMissing = !isTermInExampleSentence(parsed.term, parsed.example_sentence);

                return (
                  <div
                    key={index}
                    className={`border rounded-lg p-3 ${
                      isTermMissing
                        ? 'bg-orange-50 border-orange-300'
                        : isExampleMissing
                        ? 'bg-yellow-50 border-yellow-300'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedTermIndices.has(termKey)}
                        onChange={(e) => handleSelectTerm(termKey, e.target.checked)}
                        className="mt-2 rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-500 min-w-[25px] mt-1">
                        {index + 1}.
                      </span>
                      <div className="flex-1 space-y-2">
                        {isTermMissing && (
                          <div className="flex items-center gap-2 text-orange-700 text-sm font-medium bg-orange-100 px-2 py-1 rounded">
                            <span>⚠️</span>
                            <span>이 용어가 지문 본문에 포함되어 있지 않습니다</span>
                          </div>
                        )}
                        {isExampleMissing && !isTermMissing && (
                          <div className="flex items-center gap-2 text-yellow-700 text-sm font-medium bg-yellow-100 px-2 py-1 rounded">
                            <span>⚡</span>
                            <span>예시 문장에 용어가 포함되어 있지 않습니다</span>
                          </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              용어
                            </label>
                            <input
                              type="text"
                              value={parsed.term}
                              onChange={(e) => handleVocabularyFieldChange(index, 'term', e.target.value)}
                              className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
                                isTermMissing ? 'border-orange-400' : 'border-gray-300'
                              }`}
                              placeholder="용어 입력"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              뜻
                            </label>
                            <input
                              type="text"
                              value={parsed.definition}
                              onChange={(e) => handleVocabularyFieldChange(index, 'definition', e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                              placeholder="용어의 뜻 입력"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            예시 문장 (선택사항)
                          </label>
                          <input
                            type="text"
                            value={parsed.example_sentence}
                            onChange={(e) => handleVocabularyFieldChange(index, 'example_sentence', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            placeholder="예시 문장 입력 (선택사항)"
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => removeFootnote(index)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="용어 삭제"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 단일 지문 미리보기 */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">미리보기</h3>
            <div className="prose max-w-none">
              <h4 className="text-lg font-medium text-blue-700 mb-3">{localPassage.title}</h4>
              {localPassage.paragraphs.map((paragraph, index) => (
                <p key={index} className="mb-3 text-gray-700 leading-relaxed">
                  {paragraph}
                </p>
              ))}
              
              {localPassage.footnote.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-300">
                  <h5 className="text-sm font-medium text-gray-800 mb-2">용어 설명</h5>
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    {localPassage.footnote.map((footnote, index) => {
                      const parsed = parseFootnoteToVocabularyTerm(footnote);
                      const isTermMissing = !isTermInParagraphs(parsed.term, localPassage.paragraphs);
                      const isExampleMissing = !isTermInExampleSentence(parsed.term, parsed.example_sentence);
                      return (
                        <div
                          key={index}
                          className={`flex items-start gap-2 p-2 rounded border ${
                            isTermMissing
                              ? 'bg-orange-50 border-orange-300'
                              : isExampleMissing
                              ? 'bg-yellow-50 border-yellow-300'
                              : 'bg-white border-gray-100'
                          }`}
                        >
                          <span className={`font-medium ${
                            isTermMissing
                              ? 'text-orange-600'
                              : isExampleMissing
                              ? 'text-yellow-700'
                              : 'text-blue-600'
                          }`}>
                            {isTermMissing && '⚠️ '}
                            {isExampleMissing && !isTermMissing && '⚡ '}
                            {index + 1}.
                          </span>
                          <div className="flex-1">
                            <span className="font-medium text-gray-800">{parsed.term}</span>
                            <span className="text-gray-600">: {parsed.definition}</span>
                            {parsed.example_sentence && (
                              <span className="text-gray-500 italic"> (예: {parsed.example_sentence})</span>
                            )}
                            {isTermMissing && (
                              <div className="text-orange-700 text-xs mt-1">
                                본문에 포함되지 않음
                              </div>
                            )}
                            {isExampleMissing && !isTermMissing && (
                              <div className="text-yellow-700 text-xs mt-1">
                                예시 문장에 용어 없음
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 다음 단계 버튼 */}
      <div className="flex justify-center pt-6 border-t mt-6">
        <button
          onClick={onNext}
          disabled={loading || (isDualPassageFormat ? 
            !localPassage.passages?.every(p => p.title.trim()) : 
            !localPassage.title.trim())}
          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {loading ? '처리 중...' : '3단계: 어휘 문제 생성하기'}
        </button>
      </div>

      {/* 프롬프트 확인 모달 */}
      <PromptModal
        isOpen={showPromptModal}
        onClose={() => setShowPromptModal(false)}
        title="지문 생성 프롬프트"
        prompt={lastUsedPrompt}
        stepName="2단계: 지문 검토"
      />

      {/* 재생성 결과 모달 */}
      {showRegenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">재생성 결과 확인</h3>

            <div className="mb-4 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {regeneratedTerms.length}개 항목이 재생성되었습니다. 각 항목을 확인하고 저장하세요.
              </div>
            </div>

            <div className="space-y-4 mb-6">
              {regeneratedTerms.map((term, index) => (
                <div key={term.key || index} className="border border-gray-200 rounded-lg p-4">
                  <div className="font-medium text-gray-900 mb-3">
                    {index + 1}. {term.term}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* 원본 */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-700">원본</h4>
                      <div className="bg-gray-50 p-3 rounded text-sm">
                        <div className="mb-2">
                          <span className="font-medium">정의:</span> {term.original_definition}
                        </div>
                        <div>
                          <span className="font-medium">예문:</span> {term.original_example || '-'}
                        </div>
                      </div>
                    </div>

                    {/* 재생성 */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-blue-700">재생성 (새로운 내용)</h4>
                      <div className="bg-blue-50 p-3 rounded text-sm">
                        <div className="mb-2">
                          <span className="font-medium">정의:</span>
                          <textarea
                            value={term.new_definition}
                            onChange={(e) => {
                              setRegeneratedTerms(prev =>
                                prev.map(t =>
                                  t.key === term.key
                                    ? { ...t, new_definition: e.target.value }
                                    : t
                                )
                              );
                            }}
                            className="w-full mt-1 px-2 py-1 border border-gray-300 rounded text-sm"
                            rows={2}
                          />
                        </div>
                        <div>
                          <span className="font-medium">예문:</span>
                          <textarea
                            value={term.new_example_sentence}
                            onChange={(e) => {
                              setRegeneratedTerms(prev =>
                                prev.map(t =>
                                  t.key === term.key
                                    ? { ...t, new_example_sentence: e.target.value }
                                    : t
                                )
                              );
                            }}
                            className="w-full mt-1 px-2 py-1 border border-gray-300 rounded text-sm"
                            rows={2}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      onClick={() => handleSaveRegenerated(term)}
                      className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                    >
                      이 항목 저장
                    </button>
                    <button
                      onClick={() => {
                        setRegeneratedTerms(prev => prev.filter(t => t.key !== term.key));
                      }}
                      className="px-3 py-1 bg-gray-400 text-white rounded text-sm hover:bg-gray-500"
                    >
                      건너뛰기
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {regeneratedTerms.length > 0 && (
              <div className="flex gap-3 justify-end border-t pt-4">
                <button
                  onClick={handleSaveAllRegenerated}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  모두 저장
                </button>
                <button
                  onClick={() => {
                    if (confirm('재생성된 내용을 저장하지 않고 닫으시겠습니까?')) {
                      setShowRegenerateModal(false);
                      setRegeneratedTerms([]);
                    }
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  닫기
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}