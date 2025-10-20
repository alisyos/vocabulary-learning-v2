'use client';

import { useState, useEffect } from 'react';
import { ComprehensiveQuestion, ComprehensiveQuestionType, EditablePassage } from '@/types';
import PromptModal from './PromptModal';

interface ComprehensiveQuestionsProps {
  editablePassage: EditablePassage;
  division: string;
  subject?: string;
  area?: string;
  comprehensiveQuestions: ComprehensiveQuestion[];
  onUpdate: (questions: ComprehensiveQuestion[], usedPrompt?: string, isIntermediateUpdate?: boolean) => void;
  onNext: () => void;
  loading?: boolean;
  currentStep: 'generation' | 'review';
  lastUsedPrompt?: string; // GPT에 보낸 프롬프트
  onSupplementaryStatusChange?: (isGenerating: boolean) => void; // 보완 문제 생성 상태 콜백
}

export default function ComprehensiveQuestions({
  editablePassage,
  division,
  subject,
  area,
  comprehensiveQuestions,
  onUpdate,
  onNext,
  loading = false,
  currentStep,
  lastUsedPrompt = '',
  onSupplementaryStatusChange
}: ComprehensiveQuestionsProps) {
  const [localQuestions, setLocalQuestions] = useState<ComprehensiveQuestion[]>([]);
  
  // Props 변경 시 디버깅
  console.log('ComprehensiveQuestions props:', {
    comprehensiveQuestionsLength: comprehensiveQuestions.length,
    localQuestionsLength: localQuestions.length,
    currentStep,
    propsQuestions: comprehensiveQuestions.slice(0, 2).map(q => ({
      id: q.id,
      type: q.type, 
      isSupplementary: q.isSupplementary
    }))
  });
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [selectedQuestionType, setSelectedQuestionType] = useState<ComprehensiveQuestionType>('Random');
  const [generatingComp, setGeneratingComp] = useState(false);
  const [includeSupplementary, setIncludeSupplementary] = useState(true);
  const [questionCount, setQuestionCount] = useState<number>(4);
  const [generationProgress, setGenerationProgress] = useState<string>('');
  const [generatingSupplementary, setGeneratingSupplementary] = useState(false);
  // 🚀 병렬 스트리밍 진행률 추적
  const [typeProgress, setTypeProgress] = useState<Record<string, { progress: number; status: string }>>({});
  // 📚 문단별 탭 관리 - edit 페이지에서는 전체 보기로 시작
  const [activeQuestionTab, setActiveQuestionTab] = useState<number>(currentStep === 'review' ? -1 : 0);

  // props가 변경될 때 localQuestions 업데이트 (초기 로드 포함)
  useEffect(() => {
    console.log('useEffect triggered - updating localQuestions from props:', {
      propsLength: comprehensiveQuestions.length,
      localLength: localQuestions.length,
      basicQuestions: comprehensiveQuestions.filter(q => !q.isSupplementary).length,
      supplementaryQuestions: comprehensiveQuestions.filter(q => q.isSupplementary).length
    });

    // props에서 온 문제들로 로컬 상태 업데이트
    setLocalQuestions(comprehensiveQuestions);

    // 문제가 새로 생성되었을 때 탭 초기화
    if (comprehensiveQuestions.length > 0) {
      const basicQuestions = comprehensiveQuestions.filter(q => !q.isSupplementary);

      if (currentStep === 'review') {
        // edit 페이지(review 모드)에서는 항상 전체 보기로 시작
        setActiveQuestionTab(-1);
      } else if (basicQuestions.length > 1) {
        // 생성 모드에서는 기본 문제가 여러 개인 경우 첫 번째 탭
        setActiveQuestionTab(0);
      } else {
        // 기본 문제가 1개 이하인 경우 전체 보기
        setActiveQuestionTab(-1);
      }
    }
  }, [comprehensiveQuestions, currentStep]);

  // 병렬 스트리밍 진행률 실시간 업데이트
  useEffect(() => {
    if (generatingComp && Object.keys(typeProgress).length > 0) {
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
  }, [typeProgress, generatingComp]);

  const questionTypeOptions: ComprehensiveQuestionType[] = [
    'Random',
    '정보 확인',
    '주제 파악',
    '자료해석',
    '추론'
  ];

  const questionCountOptions = [4, 8, 12];

  // 📋 종합 문제 생성 (2단계 병렬 스트리밍)
  const handleGenerateComprehensive = async () => {
    setGeneratingComp(true);
    
    try {
      const selectedModel = localStorage.getItem('selectedGPTModel') || 'gpt-4.1';
      
      let passageText = '';
      if (editablePassage.passages && editablePassage.passages.length > 0) {
        editablePassage.passages.forEach((passage, index) => {
          passageText += `${passage.title}\n\n`;
          passageText += passage.paragraphs.join('\n\n');
          if (index < editablePassage.passages.length - 1) {
            passageText += '\n\n---\n\n';
          }
        });
      } else {
        passageText = `${editablePassage.title}\n\n${editablePassage.paragraphs.join('\n\n')}`;
      }
      
      // 문제 유형 배열 준비 (Random인 경우 4가지 유형 모두 사용)
      const questionTypes = selectedQuestionType === 'Random' 
        ? ['정보 확인', '주제 파악', '자료해석', '추론']
        : Array(questionCount).fill(selectedQuestionType);

      // Random이 아닌 경우 questionCount만큼 동일한 유형으로 채우기
      if (selectedQuestionType !== 'Random') {
        questionTypes.length = 0;
        for (let i = 0; i < questionCount; i++) {
          questionTypes.push(selectedQuestionType);
        }
      }
      
      console.log(`🚀 2단계 병렬 스트리밍으로 종합 문제 생성 시작`);
      console.log(`📋 1단계: 기본 문제 ${questionTypes.length}개 (유형: ${[...new Set(questionTypes)].join(', ')})`);
      if (includeSupplementary) {
        console.log(`📋 2단계: 보완 문제 ${questionTypes.length * 2}개 (각 기본 문제당 2개씩)`);
      }
      
      // ========== 1단계: 기본 문제 병렬 스트리밍 생성 ==========
      const initialProgress: Record<string, { progress: number; status: string }> = {};
      questionTypes.forEach((type, index) => {
        const key = `${type}_${index}`;
        initialProgress[key] = { progress: 0, status: '대기 중' };
      });
      setTypeProgress(initialProgress);
      setGenerationProgress(`1단계: ${questionTypes.length}개 기본 문제를 병렬 스트리밍으로 생성 중...`);
      
      // 1단계: 기본 문제 병렬 생성
      const basicGenerationPromises = questionTypes.map(async (questionType, index) => {
        const key = `${questionType}_${index}`;
        console.log(`🎯 1단계 병렬 스트리밍 시작 (${index + 1}/${questionTypes.length}): ${questionType}`);
        
        try {
          // 해당 유형 상태를 '생성 중'으로 업데이트
          setTypeProgress(prev => ({
            ...prev,
            [key]: { progress: 5, status: 'API 호출 중' }
          }));

          // 개별 문제 유형별 스트리밍 API 호출
          const response = await fetch('/api/generate-comprehensive-stream', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              passage: passageText,
              division: division,
              subject: subject || '사회',
              area: area || '일반사회',
              questionTypes: [questionType], // 개별 유형만 처리
              model: selectedModel
            }),
          });
          
          if (!response.ok) {
            console.error(`❌ ${questionType} 기본 문제 생성 실패:`, response.status, response.statusText);
            setTypeProgress(prev => ({
              ...prev,
              [key]: { progress: 0, status: `실패 (${response.status})` }
            }));
            return { questionType, questions: [], usedPrompt: '', success: false, index };
          }

          setTypeProgress(prev => ({
            ...prev,
            [key]: { progress: 10, status: '스트리밍 시작' }
          }));

          // 스트리밍 응답 처리
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let resultData: any = null;

          if (!reader) {
            throw new Error('스트리밍 응답을 읽을 수 없습니다.');
          }

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;
            
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
                      [key]: { progress: 15, status: '생성 시작됨' }
                    }));
                  } else if (parsed.type === 'progress') {
                    const progressPercent = Math.min(85, 20 + Math.floor((parsed.totalChars || 0) / 100));
                    setTypeProgress(prev => ({
                      ...prev,
                      [key]: { 
                        progress: progressPercent, 
                        status: `생성 중 (${parsed.totalChars || 0}자)` 
                      }
                    }));
                  } else if (parsed.type === 'complete') {
                    const questions = parsed.comprehensiveQuestions || [];
                    console.log(`✅ ${questionType} 기본 문제 ${questions.length}개 생성 완료`);
                    setTypeProgress(prev => ({
                      ...prev,
                      [key]: { 
                        progress: 100, 
                        status: `완료 (${questions.length}개)` 
                      }
                    }));
                    resultData = {
                      questionType,
                      questions: questions,
                      usedPrompt: parsed._metadata?.usedPrompt || '',
                      success: true,
                      index
                    };
                    break;
                  } else if (parsed.type === 'error') {
                    console.error(`❌ ${questionType} 스트리밍 오류:`, parsed.error);
                    setTypeProgress(prev => ({
                      ...prev,
                      [key]: { progress: 0, status: '오류' }
                    }));
                    resultData = { questionType, questions: [], usedPrompt: '', success: false, index };
                    break;
                  }
                } catch (e) {
                  // JSON 파싱 오류 무시
                }
              }
            }

            if (resultData) break;
          }

          return resultData || { questionType, questions: [], usedPrompt: '', success: false, index };
          
        } catch (error) {
          console.error(`❌ ${questionType} 기본 문제 생성 중 오류:`, error);
          setTypeProgress(prev => ({
            ...prev,
            [key]: { progress: 0, status: '오류' }
          }));
          return { questionType, questions: [], usedPrompt: '', success: false, index };
        }
      });
      
      // 1단계 완료 대기
      const basicResults = await Promise.all(basicGenerationPromises);
      
      // 기본 문제 결과 집계
      const basicQuestions: any[] = [];
      let lastUsedPrompt = '';
      let successCount = 0;
      
      for (const result of basicResults) {
        if (result.success && result.questions.length > 0) {
          basicQuestions.push(...result.questions);
          successCount++;
          
          if (!lastUsedPrompt && result.usedPrompt) {
            lastUsedPrompt = result.usedPrompt;
          }
        }
      }
      
      console.log(`🎉 1단계 완료: ${successCount}/${questionTypes.length}개 유형 성공, 총 ${basicQuestions.length}개 기본 문제 생성`);
      
      if (basicQuestions.length === 0) {
        throw new Error('기본 문제 생성에 실패했습니다.');
      }

      // 중간 결과 업데이트 (기본 문제만 표시) - isIntermediateUpdate = true로 설정
      setLocalQuestions(basicQuestions);
      onUpdate(basicQuestions, lastUsedPrompt, true);
      
      // ========== 2단계: 보완 문제 병렬 스트리밍 생성 ==========
      let finalQuestions = [...basicQuestions];
      
      if (includeSupplementary) {
        console.log('🔄 2단계: 보완 문제 병렬 스트리밍 생성 시작');
        setGenerationProgress(`1단계 완료! 2단계: ${basicQuestions.length}개 기본 문제 기반 보완 문제 생성 중...`);
        setGeneratingSupplementary(true);
        
        // 🚨 보완 문제 생성 시작 알림
        onSupplementaryStatusChange?.(true);
        
        // 보완 문제 진행률 초기화
        const supplementaryProgress: Record<string, { progress: number; status: string }> = {};
        basicQuestions.forEach((q, index) => {
          const key = `supplement_${q.type}_${index}`;
          supplementaryProgress[key] = { progress: 0, status: '대기 중' };
        });
        setTypeProgress(supplementaryProgress);
        
        try {
          // 2단계: 각 기본 문제마다 보완 문제 2개씩 병렬 스트리밍 생성
          const supplementaryPromises = basicQuestions.map(async (basicQuestion, index) => {
            const key = `supplement_${basicQuestion.type}_${index}`;
            console.log(`🎯 2단계 병렬 스트리밍 시작 (${index + 1}/${basicQuestions.length}): ${basicQuestion.type} 보완 문제`);
            
            try {
              // 해당 유형 상태를 '생성 중'으로 업데이트
              setTypeProgress(prev => ({
                ...prev,
                [key]: { progress: 5, status: '보완 문제 API 호출 중' }
              }));

              // 개별 보완 문제 유형별 스트리밍 API 호출
              const response = await fetch('/api/generate-comprehensive-supplementary-stream', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  passage: passageText,
                  division: division,
                  basicQuestions: [basicQuestion], // 개별 기본 문제 기반
                  model: selectedModel
                }),
              });
              
              if (!response.ok) {
                console.error(`❌ ${basicQuestion.type} 보완 문제 생성 실패:`, response.status, response.statusText);
                setTypeProgress(prev => ({
                  ...prev,
                  [key]: { progress: 0, status: `실패 (${response.status})` }
                }));
                return { success: false, questions: [], basicQuestion };
              }

              setTypeProgress(prev => ({
                ...prev,
                [key]: { progress: 10, status: '보완 문제 스트리밍 시작' }
              }));

              // 스트리밍 응답 처리
              const reader = response.body?.getReader();
              const decoder = new TextDecoder();
              let buffer = '';
              let resultData: any = null;

              if (!reader) {
                throw new Error('보완 문제 스트리밍 응답을 읽을 수 없습니다.');
              }

              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;
                
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
                          [key]: { progress: 15, status: '보완 문제 생성 시작됨' }
                        }));
                      } else if (parsed.type === 'progress') {
                        const progressPercent = Math.min(85, 20 + Math.floor((parsed.totalChars || 0) / 80));
                        setTypeProgress(prev => ({
                          ...prev,
                          [key]: { 
                            progress: progressPercent, 
                            status: `보완 문제 생성 중 (${parsed.totalChars || 0}자)` 
                          }
                        }));
                      } else if (parsed.type === 'complete') {
                        const questions = parsed.supplementaryQuestions || [];
                        console.log(`✅ ${basicQuestion.type} 보완 문제 ${questions.length}개 생성 완료`);
                        setTypeProgress(prev => ({
                          ...prev,
                          [key]: { 
                            progress: 100, 
                            status: `완료 (${questions.length}개)` 
                          }
                        }));
                        resultData = {
                          success: true,
                          questions: questions,
                          basicQuestion
                        };
                        break;
                      } else if (parsed.type === 'error') {
                        console.error(`❌ ${basicQuestion.type} 보완 문제 스트리밍 오류:`, parsed.error);
                        setTypeProgress(prev => ({
                          ...prev,
                          [key]: { progress: 0, status: '오류' }
                        }));
                        resultData = { success: false, questions: [], basicQuestion };
                        break;
                      }
                    } catch (e) {
                      // JSON 파싱 오류 무시
                    }
                  }
                }

                if (resultData) break;
              }

              return resultData || { success: false, questions: [], basicQuestion };
              
            } catch (error) {
              console.error(`❌ ${basicQuestion.type} 보완 문제 생성 중 오류:`, error);
              setTypeProgress(prev => ({
                ...prev,
                [key]: { progress: 0, status: '오류' }
              }));
              return { success: false, questions: [], basicQuestion };
            }
          });

          // 2단계 완료 대기
          const supplementaryResults = await Promise.all(supplementaryPromises);
          
          // 보완 문제 결과 집계
          const allSupplementaryQuestions: any[] = [];
          let supplementarySuccessCount = 0;
          
          for (const result of supplementaryResults) {
            if (result.success && result.questions.length > 0) {
              allSupplementaryQuestions.push(...result.questions);
              supplementarySuccessCount++;
            }
          }
          
          console.log(`🎉 2단계 완료: ${supplementarySuccessCount}/${basicQuestions.length}개 기본 문제에 대한 보완 문제 생성, 총 ${allSupplementaryQuestions.length}개 보완 문제`);
          
          // 최종 결과: 기본 문제 + 보완 문제
          finalQuestions = [...basicQuestions, ...allSupplementaryQuestions];
          
          setGenerationProgress(`🎉 완료! 기본 ${basicQuestions.length}개 + 보완 ${allSupplementaryQuestions.length}개 = 총 ${finalQuestions.length}개 → 잠시 후 8단계 검토로 이동`);
          
        } catch (error) {
          console.error('보완 문제 생성 중 오류:', error);
          setGenerationProgress(`기본 ${basicQuestions.length}개 완료 (보완 문제 생성 오류)`);
        } finally {
          setGeneratingSupplementary(false);
          setGeneratingComp(false); // 2단계 완료 시 전체 생성 상태 종료
          
          // 🚨 보완 문제 생성 완료 알림
          onSupplementaryStatusChange?.(false);
          
          // 상태 정리 및 8단계로 자동 이동
          setTimeout(() => {
            setGenerationProgress('');
            setTypeProgress({});
            // 2초 후 자동으로 8단계(검토 단계)로 이동
            setTimeout(() => {
              console.log('🚀 생성 완료! 8단계 검토 단계로 자동 이동');
              onNext(); // 8단계로 이동
            }, 2000);
          }, 3000);
        }
      } else {
        // 🚨 보완 문제가 체크되지 않은 경우에만 8단계로 이동
        setGenerationProgress(`🎉 생성 완료: 총 ${basicQuestions.length}개 기본 문제 → 잠시 후 8단계 검토로 이동`);
        setGeneratingComp(false); // 보완 문제가 없는 경우 여기서 상태 종료
        setTimeout(() => {
          setGenerationProgress('');
          setTypeProgress({});
          // 2초 후 자동으로 8단계(검토 단계)로 이동
          setTimeout(() => {
            console.log('🚀 기본 문제만 생성 완료! 8단계 검토 단계로 자동 이동');
            onNext(); // 8단계로 이동
          }, 2000);
        }, 3000);
      }
      
      // 최종 결과 업데이트 - isIntermediateUpdate = false (기본값)
      setLocalQuestions(finalQuestions);
      onUpdate(finalQuestions, lastUsedPrompt, false);
      
      console.log(`📋 종합 문제 생성 완료 - 총 ${finalQuestions.length}개 (기본: ${basicQuestions.length}, 보완: ${finalQuestions.length - basicQuestions.length})`);
      
    } catch (error) {
      console.error('❌ 종합 문제 생성 전체 오류:', error);
      
      // 자세한 오류 정보 로깅
      if (error instanceof Error) {
        console.error('오류 세부 정보:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
      
      // 진행률 상태 로깅
      console.log('생성 시점에서 typeProgress 상태:', typeProgress);
      
      let errorMessage = '종합 문제 생성 중 오류가 발생했습니다.';
      
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          errorMessage = '네트워크 연결 오류입니다. 인터넷 연결을 확인하고 다시 시도해 주세요.';
        } else if (error.message.includes('기본 문제 생성에 실패')) {
          errorMessage = '기본 문제 생성에 실패했습니다. 다시 시도해 주세요.';
        } else {
          errorMessage = `오류: ${error.message}`;
        }
      }
      
      alert(errorMessage);
      setGenerationProgress('');
      setTypeProgress({});
      setGeneratingComp(false);
      setGeneratingSupplementary(false);
    } finally {
      // 오류나 예외 상황에서 상태가 정리되지 않은 경우 대비
      // 정상 완료 시에는 각 단계에서 이미 상태 정리가 완료됨
    }
  };

  // 문제 수정
  const handleQuestionUpdate = (index: number, field: keyof ComprehensiveQuestion, value: string | string[]) => {
    const updated = [...localQuestions];
    updated[index] = { ...updated[index], [field]: value };
    setLocalQuestions(updated);
    onUpdate(updated); // 검토 단계에서는 기본값(false) 사용
  };

  // 문제 추가
  const addQuestion = () => {
    const newQuestion: ComprehensiveQuestion = {
      id: `comp_new_${Date.now()}`,
      type: '정보 확인',
      question: '질문을 입력하세요',
      options: ['선택지 1', '선택지 2', '선택지 3', '선택지 4', '선택지 5'],
      answer: '선택지 1',
      explanation: '해설을 입력하세요'
    };
    
    const updated = [...localQuestions, newQuestion];
    setLocalQuestions(updated);
    onUpdate(updated); // 검토 단계에서는 기본값(false) 사용
  };

  // 문제 삭제 (기본 문제 삭제 시 보완 문제도 함께 삭제)
  const removeQuestion = (index: number) => {
    if (localQuestions.length <= 1) {
      // 최소 1개의 문제는 있어야 하므로 삭제하지 않음
      return;
    }
    
    const questionToDelete = localQuestions[index];
    let updated = [...localQuestions];
    
    // 기본 문제인 경우, 해당 문제의 보완 문제들도 함께 삭제
    if (!questionToDelete.isSupplementary) {
      updated = localQuestions.filter((q, i) => {
        // 삭제하려는 문제 자체 제거
        if (i === index) return false;
        // 삭제하려는 문제의 보완 문제들 제거
        if (q.isSupplementary && q.originalQuestionId === questionToDelete.id) return false;
        return true;
      });
    } else {
      // 보완 문제인 경우, 해당 문제만 삭제
      updated = localQuestions.filter((_, i) => i !== index);
    }
    
    setLocalQuestions(updated);
    onUpdate(updated); // 검토 단계에서는 기본값(false) 사용
  };

  // 선택지 수정 (객관식 문제용)
  const handleOptionUpdate = (questionIndex: number, optionIndex: number, value: string) => {
    const updated = [...localQuestions];
    if (updated[questionIndex].options) {
      const oldOptionValue = updated[questionIndex].options![optionIndex];

      // 선택지 업데이트
      updated[questionIndex].options![optionIndex] = value;

      // 🔧 수정한 선택지가 현재 정답이라면, 정답도 함께 업데이트
      if (updated[questionIndex].answer === oldOptionValue) {
        updated[questionIndex].answer = value;
        console.log(`✅ 정답도 함께 업데이트: "${oldOptionValue}" → "${value}"`);
      }

      setLocalQuestions(updated);
      onUpdate(updated); // 검토 단계에서는 기본값(false) 사용
    }
  };

  // 선택지 추가 (객관식 문제용)
  const addOption = (questionIndex: number) => {
    const updated = [...localQuestions];
    if (!updated[questionIndex].options) {
      updated[questionIndex].options = [];
    }
    updated[questionIndex].options!.push('새로운 선택지');
    setLocalQuestions(updated);
    onUpdate(updated); // 검토 단계에서는 기본값(false) 사용
  };

  // 선택지 제거 (객관식 문제용)
  const removeOption = (questionIndex: number, optionIndex: number) => {
    const updated = [...localQuestions];
    if (updated[questionIndex].options && updated[questionIndex].options!.length > 2) {
      const removedOptionValue = updated[questionIndex].options![optionIndex];

      // 선택지 삭제
      updated[questionIndex].options!.splice(optionIndex, 1);

      // 🔧 삭제한 선택지가 현재 정답이라면, 정답을 첫 번째 남은 선택지로 업데이트
      if (updated[questionIndex].answer === removedOptionValue) {
        updated[questionIndex].answer = updated[questionIndex].options![0];
        console.log(`⚠️ 삭제된 선택지가 정답이었습니다. 정답을 첫 번째 선택지로 변경: "${removedOptionValue}" → "${updated[questionIndex].options![0]}"`);
      }

      setLocalQuestions(updated);
      onUpdate(updated); // 검토 단계에서는 기본값(false) 사용
    }
  };

    if (currentStep === 'generation') {
    return (
      <>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-bold text-gray-800">7단계: 종합 문제 생성</h2>
              <button
                onClick={handleGenerateComprehensive}
                disabled={generatingComp || generatingSupplementary}
                className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
              >
                {generatingComp 
                  ? '생성 중...' 
                  : generatingSupplementary 
                    ? '보완 문제 생성 중...'
                    : includeSupplementary 
                      ? `${questionCount + (questionCount * 2)}개 생성`
                      : `${questionCount}개 생성`
                }
              </button>
            </div>
            <span className="text-sm text-orange-600 bg-orange-50 px-3 py-1 rounded-full">
              문제 생성
            </span>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">문제 유형 선택</h3>
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                문제 형태 *
              </label>
              <select
                value={selectedQuestionType}
                onChange={(e) => setSelectedQuestionType(e.target.value as ComprehensiveQuestionType)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                {questionTypeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              
              <div className="mt-3 text-sm text-gray-600">
                <p><strong>선택된 유형:</strong> {selectedQuestionType}</p>
                {selectedQuestionType === 'Random' ? (
                  <p>• 4가지 유형을 각 {questionCount / 4}개씩 총 {questionCount}개 문제가 생성됩니다.</p>
                ) : (
                  <p>• {selectedQuestionType} 유형으로 {questionCount}개 문제가 생성됩니다.</p>
                )}
                {includeSupplementary && (
                  <p className="text-orange-600 font-medium">• 보완 문제 포함 시 총 {questionCount + (questionCount * 2)}개 문제가 생성됩니다. (기본 {questionCount}개 + 보완 {questionCount * 2}개)</p>
                )}
              </div>
            </div>
             
            {/* 문제 개수 선택 */}
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                문제 개수 *
              </label>
              <select
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                {questionCountOptions.map((count) => (
                  <option key={count} value={count}>
                    {count}개
                  </option>
                ))}
              </select>
              <div className="mt-1 text-xs text-gray-600">
                <p>• 선택된 유형으로 생성되는 기본 문제 개수입니다.</p>
                {includeSupplementary && (
                  <p>• 보완 문제 포함 시 총 문제 수: 기본 {questionCount}개 + 보완 {questionCount * 2}개 = <strong>{questionCount + (questionCount * 2)}개</strong></p>
                )}
              </div>
            </div>

            {/* 보완 문제 선택 */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="supplementary"
                  checked={includeSupplementary}
                  onChange={(e) => setIncludeSupplementary(e.target.checked)}
                  className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 mt-0.5"
                />
                <div className="flex-1">
                  <label htmlFor="supplementary" className="text-sm font-medium text-gray-800 cursor-pointer">
                    보완 문제 생성
                  </label>
                  <div className="mt-1 text-xs text-gray-600">
                    <p>• 오답 시 학습 강화를 위한 추가 문제를 생성합니다</p>
                    <p>• 각 기본 문제당 2개의 보완 문제가 추가로 생성됩니다</p>
                    <p>• 총 문제 수: 기본 {questionCount}개 + 보완 {questionCount * 2}개 = <strong>{questionCount + (questionCount * 2)}개</strong></p>
                  </div>
                </div>
              </div>
            </div>


            {/* 진행 상황 표시 */}
            {(generationProgress || generatingSupplementary) && (
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-800">
                      {generationProgress || '처리 중...'}
                    </p>
                    {generatingSupplementary && (
                      <p className="text-xs text-yellow-600 mt-1">
                        보완 문제는 백그라운드에서 생성 중입니다. 기본 문제부터 검토하실 수 있습니다.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleGenerateComprehensive}
              disabled={generatingComp || generatingSupplementary}
              className="bg-orange-600 text-white px-8 py-3 rounded-md hover:bg-orange-700 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {generatingComp 
                ? '종합 문제 생성 중...' 
                : generatingSupplementary 
                  ? '보완 문제 생성 중...'
                  : includeSupplementary 
                    ? `${questionCount + (questionCount * 2)}개 종합 문제 생성하기 (보완 문제 포함)`
                    : `${questionCount}개 종합 문제 생성하기`
              }
            </button>
          </div>
        </div>

        {/* 종합 문제 생성 병렬 처리 모달 */}
        {(generatingComp || generatingSupplementary) && (
          <div 
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
          >
            <div className="bg-white backdrop-blur-sm p-6 rounded-xl shadow-2xl border border-gray-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* 헤더 */}
              <div className="text-center mb-6">
                <div className={`w-12 h-12 border-3 border-gray-200 ${generatingSupplementary ? 'border-t-green-600' : 'border-t-orange-600'} rounded-full animate-spin mx-auto mb-3`}></div>
                <h3 className={`text-xl font-bold mb-2 ${generatingSupplementary ? 'text-green-800' : 'text-gray-800'}`}>
                  {generatingComp && !generatingSupplementary
                    ? '🚀 1단계: 기본 문제 병렬 생성 중'
                    : generatingSupplementary
                      ? '🔄 2단계: 보완 문제 병렬 생성 중'
                      : '종합 문제 생성 중'
                  }
                </h3>
                <p className="text-sm text-gray-600">
                  {generatingComp && !generatingSupplementary
                    ? `4가지 유형의 기본 문제를 동시에 병렬 스트리밍으로 생성합니다`
                    : generatingSupplementary
                      ? `각 기본 문제당 2개씩 보완 문제를 한 번에 병렬 생성합니다 (4번 GPT 통신)`
                      : '종합 문제를 생성하고 있습니다'
                  }
                </p>
              </div>

              {/* 전체 진행률 */}
              {generationProgress && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm font-medium text-blue-800 text-center">{generationProgress}</p>
                </div>
              )}

              {/* 병렬 처리 상태 표시 */}
              {Object.keys(typeProgress).length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">
                    {generatingComp && !generatingSupplementary
                      ? '📊 기본 문제 생성 진행 상황 (병렬 처리)'
                      : '📊 보완 문제 생성 진행 상황 (병렬 처리)'
                    }
                  </h4>
                  
                  <div className="grid grid-cols-1 gap-3">
                    {Object.entries(typeProgress).map(([key, progress]) => {
                      // key에서 문제 유형과 인덱스 추출
                      const isSupplementary = key.startsWith('supplement_');
                      const displayName = isSupplementary 
                        ? key.replace('supplement_', '').replace(/_\d+$/, '') + ' 보완 문제'
                        : key.replace(/_\d+$/, '');
                      
                      return (
                        <div key={key} className="bg-gray-50 p-3 rounded-lg border">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">
                              {displayName}
                            </span>
                            <span className="text-xs text-gray-500">
                              {progress.progress}%
                            </span>
                          </div>
                          
                          {/* 진행률 바 */}
                          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-300 ${
                                progress.progress === 100 
                                  ? 'bg-green-500' 
                                  : progress.progress === 0 && progress.status.includes('실패')
                                    ? 'bg-red-500'
                                    : isSupplementary
                                      ? 'bg-blue-500'
                                      : 'bg-orange-500'
                              }`}
                              style={{ width: `${progress.progress}%` }}
                            ></div>
                          </div>
                          
                          {/* 상태 메시지 */}
                          <p className={`text-xs ${
                            progress.progress === 100 
                              ? 'text-green-600' 
                              : progress.status.includes('실패') || progress.status.includes('오류')
                                ? 'text-red-600'
                                : 'text-gray-600'
                          }`}>
                            {progress.status === '대기 중' && '⏳ 대기 중...'}
                            {progress.status === 'API 호출 중' && '📡 API 호출 중...'}
                            {progress.status === '스트리밍 시작' && '🚀 스트리밍 시작...'}
                            {progress.status === '생성 시작됨' && '⚡ 생성 시작됨...'}
                            {progress.status.includes('생성 중') && `✍️ ${progress.status}`}
                            {progress.status.includes('완료') && `✅ ${progress.status}`}
                            {progress.status.includes('실패') && `❌ ${progress.status}`}
                            {progress.status.includes('오류') && `⚠️ ${progress.status}`}
                            {progress.status.includes('보완 문제') && `🔄 ${progress.status}`}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 단계 안내 */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-center space-x-4 text-xs text-gray-600">
                  <div className={`flex items-center space-x-1 ${generatingComp && !generatingSupplementary ? 'text-orange-600 font-medium' : ''}`}>
                    <span>1️⃣</span>
                    <span>기본 문제 생성</span>
                    {!generatingComp && !generatingSupplementary && <span className="text-green-600">✓</span>}
                  </div>
                  
                  {includeSupplementary && (
                    <>
                      <span>→</span>
                      <div className={`flex items-center space-x-1 ${generatingSupplementary ? 'text-blue-600 font-medium' : ''}`}>
                        <span>2️⃣</span>
                        <span>보완 문제 생성</span>
                        {!generatingSupplementary && !generatingComp && <span className="text-green-600">✓</span>}
                      </div>
                    </>
                  )}
                  
                  <span>→</span>
                  <div className="flex items-center space-x-1">
                    <span>8️⃣</span>
                    <span>검토 단계</span>
                  </div>
                </div>
              </div>

              {/* 하단 정보 */}
              <div className="mt-4 text-center">
                <p className="text-xs text-gray-500">
                  {generatingComp && !generatingSupplementary
                    ? `병렬 처리로 4개 유형을 동시에 생성하여 시간을 단축합니다`
                    : generatingSupplementary
                      ? `각 기본 문제를 기반으로 2개씩 보완 문제를 한 번에 생성합니다 (중복 방지)`
                      : '잠시만 기다려주세요...'
                  }
                </p>
              </div>
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
          <h2 className="text-xl font-bold text-gray-800">8단계: 종합 문제 검토 및 수정</h2>
          <button
            onClick={onNext}
            disabled={loading || localQuestions.length === 0}
            className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
          >
            {loading ? '처리 중...' : '9단계: 최종 저장하기'}
          </button>
        </div>
        <div className="flex items-center space-x-2">
          {lastUsedPrompt && (
            <button
              onClick={() => setShowPromptModal(true)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md transition-colors font-medium text-sm flex items-center space-x-1"
              title="종합 문제 생성에 사용된 프롬프트 확인"
            >
              <span>📋</span>
              <span>프롬프트 확인</span>
            </button>
          )}
          <span className="text-sm text-orange-600 bg-orange-50 px-3 py-1 rounded-full">
            검토 및 수정
          </span>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">
            종합 문제 ({localQuestions.length}개)
          </h3>
          <button
            onClick={addQuestion}
            className="bg-green-100 text-green-700 px-4 py-2 rounded-md hover:bg-green-200 transition-colors text-sm font-medium"
          >
            + 문제 추가
          </button>
        </div>

        {/* 문제 유형별 분류 표시 */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-2">문제 유형별 분포</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mb-3">
            {['정보 확인', '주제 파악', '자료해석', '추론'].map(type => {
              const count = localQuestions.filter(q => q.type === type).length;
              const supplementaryCount = localQuestions.filter(q => q.type === type && q.isSupplementary).length;
              const mainCount = count - supplementaryCount;
              return (
                <div key={type} className="bg-white p-2 rounded border">
                  <div className="font-medium text-gray-800">{type}</div>
                  <div className="text-gray-600 font-semibold">{count}개</div>
                  {count > 0 && (
                    <div className="mt-1 space-y-1">
                      <div className="flex items-center justify-center space-x-1">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800">
                          기본 {mainCount}
                        </span>
                        {supplementaryCount > 0 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs bg-orange-100 text-orange-800">
                            보완 {supplementaryCount}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 전체 통계 */}
          <div className="bg-white p-3 rounded border border-gray-200">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-800 mb-2">전체 문제 통계</div>
              <div className="flex justify-center items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 font-medium">
                    기본 문제 {localQuestions.filter(q => !q.isSupplementary).length}개
                  </span>
                  {localQuestions.some(q => q.isSupplementary) && (
                    <>
                      <span className="text-gray-400">+</span>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800 font-medium">
                        보완 문제 {localQuestions.filter(q => q.isSupplementary).length}개
                      </span>
                      <span className="text-gray-400">=</span>
                    </>
                  )}
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800 font-semibold">
                    총 {localQuestions.length}개
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 📚 문단별 탭 네비게이션 */}
        {(() => {
          const basicQuestions = localQuestions.filter(q => !q.isSupplementary);
          
          if (basicQuestions.length <= 1) {
            // 기본 문제가 1개 이하인 경우 탭 표시 안 함
            return null;
          }

          return (
            <div className="mb-6">
              <div className="flex flex-wrap gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700 mr-2">문제별 검토:</span>
                {basicQuestions.map((basicQ, index) => {
                  const supplementaryCount = localQuestions.filter(
                    q => q.isSupplementary && (
                      // edit 페이지: originalQuestionId끼리 비교
                      (basicQ.originalQuestionId && q.originalQuestionId === basicQ.originalQuestionId) ||
                      // 생성 페이지: 기본 문제 id와 보완 문제 originalQuestionId 비교
                      (!basicQ.originalQuestionId && q.originalQuestionId === basicQ.id)
                    )
                  ).length;
                  
                  return (
                    <button
                      key={basicQ.id}
                      onClick={() => setActiveQuestionTab(index)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        activeQuestionTab === index
                          ? 'bg-orange-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                      }`}
                    >
                      {basicQ.type} 문제
                      {supplementaryCount > 0 && (
                        <span className="ml-1 text-xs">
                          (+{supplementaryCount})
                        </span>
                      )}
                    </button>
                  );
                })}
                <button
                  onClick={() => setActiveQuestionTab(-1)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    activeQuestionTab === -1
                      ? 'bg-gray-700 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                  }`}
                >
                  전체 보기
                </button>
              </div>
            </div>
          );
        })()}

        <div className="space-y-6">
          {(() => {
            // 기본 문제와 해당 보완 문제들을 그룹으로 정렬
            const basicQuestions = localQuestions.filter(q => !q.isSupplementary);
            const supplementaryQuestions = localQuestions.filter(q => q.isSupplementary);
            
            // 디버깅 로그
            console.log('ComprehensiveQuestions Debug:', {
              totalQuestions: localQuestions.length,
              basicQuestions: basicQuestions.length,
              supplementaryQuestions: supplementaryQuestions.length,
              activeTab: activeQuestionTab,
              questions: localQuestions.map(q => ({
                id: q.id,
                type: q.type,
                isSupplementary: q.isSupplementary,
                originalQuestionId: q.originalQuestionId,
                question: q.question.substring(0, 30) + '...'
              }))
            });

            // 보완 문제 연결 관계 디버깅
            if (supplementaryQuestions.length > 0) {
              console.log('🔍 보완 문제 연결 관계 분석:');
              supplementaryQuestions.forEach((supQ, index) => {
                // original_question_id가 같은 기본 문제 찾기
                const relatedBasic = basicQuestions.find(basicQ =>
                  // edit 페이지: originalQuestionId끼리 비교
                  (basicQ.originalQuestionId && basicQ.originalQuestionId === supQ.originalQuestionId) ||
                  // 생성 페이지: 기본 문제 id와 보완 문제 originalQuestionId 비교
                  (!basicQ.originalQuestionId && basicQ.id === supQ.originalQuestionId)
                );
                console.log(`  보완${index + 1}: ${supQ.type} -> 연결된 기본문제: ${relatedBasic ? relatedBasic.type : 'NOT FOUND'} (original_question_id: ${supQ.originalQuestionId})`);
              });
            }
            
            let questionsToShow: ComprehensiveQuestion[] = [];
            
            if (activeQuestionTab === -1) {
              // 전체 보기: 기본 문제 순서대로 배치하되, 각 기본 문제 바로 뒤에 해당 보완 문제들 배치
              basicQuestions.forEach(basicQ => {
                questionsToShow.push(basicQ);
                const relatedSupplementary = supplementaryQuestions.filter(
                  supQ =>
                    // edit 페이지: originalQuestionId끼리 비교
                    (basicQ.originalQuestionId && supQ.originalQuestionId === basicQ.originalQuestionId) ||
                    // 생성 페이지: 기본 문제 id와 보완 문제 originalQuestionId 비교
                    (!basicQ.originalQuestionId && supQ.originalQuestionId === basicQ.id)
                );
                questionsToShow.push(...relatedSupplementary);
              });
            } else {
              // 특정 탭 선택: 해당 기본 문제와 보완 문제들만 표시
              const selectedBasicQuestion = basicQuestions[activeQuestionTab];
              console.log(`🎯 탭 ${activeQuestionTab} 선택됨:`, {
                selectedBasicQuestion: selectedBasicQuestion ? {
                  id: selectedBasicQuestion.id,
                  type: selectedBasicQuestion.type,
                  originalQuestionId: selectedBasicQuestion.originalQuestionId
                } : 'NOT FOUND'
              });

              if (selectedBasicQuestion) {
                questionsToShow.push(selectedBasicQuestion);
                const relatedSupplementary = supplementaryQuestions.filter(
                  supQ =>
                    // edit 페이지: originalQuestionId끼리 비교
                    (selectedBasicQuestion.originalQuestionId && supQ.originalQuestionId === selectedBasicQuestion.originalQuestionId) ||
                    // 생성 페이지: 기본 문제 id와 보완 문제 originalQuestionId 비교
                    (!selectedBasicQuestion.originalQuestionId && supQ.originalQuestionId === selectedBasicQuestion.id)
                );
                console.log(`🔗 연결된 보완 문제 수: ${relatedSupplementary.length}`, {
                  searchingFor: selectedBasicQuestion.originalQuestionId || selectedBasicQuestion.id,
                  foundSupplementary: relatedSupplementary.map(s => ({
                    type: s.type,
                    originalQuestionId: s.originalQuestionId
                  }))
                });
                questionsToShow.push(...relatedSupplementary);
              }
            }
            
            // 표시할 문제가 없는 경우 처리
            if (questionsToShow.length === 0) {
              return (
                <div className="text-center py-8 text-gray-500">
                  <p>표시할 문제가 없습니다.</p>
                  {activeQuestionTab !== -1 && (
                    <button
                      onClick={() => setActiveQuestionTab(-1)}
                      className="mt-2 text-orange-600 hover:text-orange-700 underline"
                    >
                      전체 보기로 돌아가기
                    </button>
                  )}
                </div>
              );
            }

            return questionsToShow.map((question) => {
              // 보완 문제인 경우 원본 문제 정보 표시
              const originalQuestion = question.isSupplementary 
                ? localQuestions.find(q => q.id === question.originalQuestionId)
                : null;
              
              // 기본 문제 번호 계산 (보완 문제는 기본 문제 번호를 참조)
              const basicQuestionNumber = question.isSupplementary
                ? basicQuestions.findIndex(q => q.id === question.originalQuestionId) + 1
                : basicQuestions.findIndex(q => q.id === question.id) + 1;
            
            return (
              <div key={question.id} className={`border rounded-lg p-4 ${
                question.isSupplementary 
                  ? 'border-blue-200 bg-blue-50 ml-6' 
                  : 'border-orange-200 bg-orange-50'
              }`}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <h4 className="text-md font-medium text-gray-800">
                      {question.isSupplementary 
                        ? `📚 보완 문제 (${originalQuestion?.type || '알 수 없음'} 유형)` 
                        : `🎯 기본 문제 ${basicQuestionNumber}`
                      }
                    </h4>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      {question.type}
                    </span>
                    {question.isSupplementary && (
                      <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded font-medium">
                        보완 문제
                      </span>
                    )}
                    {originalQuestion && (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                        → 기본 문제: {originalQuestion.question.substring(0, 20)}...
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      // 실제 localQuestions 배열에서의 인덱스를 찾아 삭제
                      const actualIndex = localQuestions.findIndex(q => q.id === question.id);
                      if (actualIndex !== -1) {
                        removeQuestion(actualIndex);
                      }
                    }}
                    className="text-red-500 hover:text-red-700 text-sm"
                    title="문제 삭제"
                  >
                    ✕ 삭제
                  </button>
                </div>

              {/* 문제 유형 변경 */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  문제 유형
                </label>
                <select
                  value={question.type}
                  onChange={(e) => {
                    const actualIndex = localQuestions.findIndex(q => q.id === question.id);
                    if (actualIndex !== -1) {
                      handleQuestionUpdate(actualIndex, 'type', e.target.value);
                    }
                  }}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                >
                  <option value="정보 확인">정보 확인</option>
                  <option value="주제 파악">주제 파악</option>
                  <option value="자료해석">자료해석</option>
                  <option value="추론">추론</option>
                </select>
              </div>

              {/* 질문 */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  질문
                </label>
                <textarea
                  value={question.question}
                  onChange={(e) => {
                    const actualIndex = localQuestions.findIndex(q => q.id === question.id);
                    if (actualIndex !== -1) {
                      handleQuestionUpdate(actualIndex, 'question', e.target.value);
                    }
                  }}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm min-h-[80px] resize-vertical"
                  placeholder="질문을 입력하세요"
                />
              </div>

              {/* 선택지 (새로운 유형들은 모두 객관식) */}
              <div className="mb-3">
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      선택지
                    </label>
                    <button
                      onClick={() => {
                        const actualIndex = localQuestions.findIndex(q => q.id === question.id);
                        if (actualIndex !== -1) {
                          addOption(actualIndex);
                        }
                      }}
                      className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                    >
                      + 선택지 추가
                    </button>
                  </div>
                  <div className="space-y-2">
                    {question.options?.map((option, oIndex) => (
                      <div key={oIndex} className="flex items-center gap-2">
                        <span className="text-sm text-gray-500 min-w-[20px]">
                          {oIndex + 1}.
                        </span>
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => {
                            const actualIndex = localQuestions.findIndex(q => q.id === question.id);
                            if (actualIndex !== -1) {
                              handleOptionUpdate(actualIndex, oIndex, e.target.value);
                            }
                          }}
                          className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                          placeholder={`선택지 ${oIndex + 1}`}
                        />
                        <button
                          onClick={() => {
                            const actualIndex = localQuestions.findIndex(q => q.id === question.id);
                            if (actualIndex !== -1) {
                              removeOption(actualIndex, oIndex);
                            }
                          }}
                          className="text-red-500 hover:text-red-700 text-sm px-2"
                          title="선택지 삭제"
                        >
                          ✕
                        </button>
                      </div>
                    )) || (
                      <button
                        onClick={() => {
                          const actualIndex = localQuestions.findIndex(q => q.id === question.id);
                          if (actualIndex !== -1) {
                            const updated = [...localQuestions];
                            updated[actualIndex].options = ['선택지 1', '선택지 2', '선택지 3', '선택지 4', '선택지 5'];
                            setLocalQuestions(updated);
                            onUpdate(updated); // 검토 단계에서는 기본값(false) 사용
                          }
                        }}
                        className="w-full p-2 border-2 border-dashed border-gray-300 rounded-md text-gray-500 hover:border-gray-400"
                      >
                        + 선택지 추가하기
                      </button>
                    )}
                  </div>
                </div>

              {/* 정답 */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  정답
                </label>
                <select
                  value={question.answer}
                  onChange={(e) => {
                    const actualIndex = localQuestions.findIndex(q => q.id === question.id);
                    if (actualIndex !== -1) {
                      handleQuestionUpdate(actualIndex, 'answer', e.target.value);
                    }
                  }}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                >
                  {question.options?.map((option, index) => (
                    <option key={index} value={option}>
                      {index + 1}. {option}
                    </option>
                  )) || <option value="">선택지를 먼저 추가해주세요</option>}
                </select>
              </div>

              {/* 해설 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  해설
                </label>
                <textarea
                  value={question.explanation}
                  onChange={(e) => {
                    const actualIndex = localQuestions.findIndex(q => q.id === question.id);
                    if (actualIndex !== -1) {
                      handleQuestionUpdate(actualIndex, 'explanation', e.target.value);
                    }
                  }}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm min-h-[60px] resize-vertical"
                  placeholder="해설을 입력하세요"
                />
              </div>
            </div>
          );
        });
          })()}
        </div>
      </div>

      {/* 다음 단계 버튼 */}
      <div className="flex justify-center pt-4 border-t">
        <button
          onClick={onNext}
          disabled={loading || localQuestions.length === 0}
          className="bg-orange-600 text-white px-6 py-2 rounded-md hover:bg-orange-700 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {loading ? '처리 중...' : '7단계: 최종 저장하기'}
        </button>
      </div>

      {/* 프롬프트 확인 모달 */}
      <PromptModal
        isOpen={showPromptModal}
        onClose={() => setShowPromptModal(false)}
        title="종합 문제 생성 프롬프트"
        prompt={lastUsedPrompt}
        stepName="8단계: 종합 문제 검토"
      />
    </div>
  );
}
