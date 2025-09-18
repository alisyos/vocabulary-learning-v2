import React, { useState, useRef } from 'react';

interface ComprehensiveCSVUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (questions: ParsedQuestion[]) => void;
  contentSetId: string;
}

interface ParsedQuestion {
  questionType: string;
  questionFormat: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  isSupplementary: boolean;
}

const ComprehensiveCSVUploadModal: React.FC<ComprehensiveCSVUploadModalProps> = ({
  isOpen,
  onClose,
  onUpload,
  contentSetId
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  // CSV 템플릿 생성 및 다운로드
  const downloadTemplate = () => {
    const headers = [
      '문제유형',
      '문제형식',
      '문제내용',
      '선택지1',
      '선택지2',
      '선택지3',
      '선택지4',
      '선택지5',
      '정답',
      '해설',
      '보완문제여부'
    ];

    const sampleData = [
      [
        '자료해석',
        'multiple_choice',
        '다음 중 본문에서 설명한 내용으로 옳은 것은?',
        '선택지 1번',
        '선택지 2번',
        '선택지 3번',
        '선택지 4번',
        '선택지 5번',
        '2',
        '정답은 2번입니다. 본문에서...',
        'N'
      ],
      [
        '자료해석',
        'multiple_choice',
        '본문에서 언급된 주요 개념을 고르시오',
        '선택지 1번',
        '선택지 2번',
        '선택지 3번',
        '선택지 4번',
        '선택지 5번',
        '2',
        '정답은 2번입니다. 본문에서...',
        'Y'
      ],
      [
        '자료해석',
        'multiple_choice',
        '본문의 핵심 용어를 선택하시오.',
        '선택지 1번',
        '선택지 2번',
        '선택지 3번',
        '선택지 4번',
        '선택지 5번',
        '2',
        '정답은 2번입니다. 본문에서...',
        'Y'
      ]
    ];

    // BOM 추가하여 한글 인코딩 문제 방지
    const BOM = '\uFEFF';
    const csvContent = BOM + [
      headers.join(','),
      ...sampleData.map(row => 
        row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `종합문제_템플릿_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  // CSV 파일 파싱
  const parseCSV = (text: string): ParsedQuestion[] => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error('CSV 파일에 데이터가 없습니다.');
    }

    const questions: ParsedQuestion[] = [];
    
    // 헤더 건너뛰기
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      
      if (values.length < 11) {
        console.warn(`Line ${i + 1}: 필드 수가 부족합니다. 건너뜁니다.`);
        continue;
      }

      const questionFormat = values[1].toLowerCase().trim();
      const isMultipleChoice = questionFormat === 'multiple_choice';

      questions.push({
        questionType: values[0].trim(),
        questionFormat: questionFormat,
        question: values[2].trim(),
        options: isMultipleChoice ? [
          values[3].trim(),
          values[4].trim(),
          values[5].trim(),
          values[6].trim(),
          values[7].trim()
        ].filter(opt => opt) : [],
        correctAnswer: values[8].trim(),
        explanation: values[9].trim(),
        isSupplementary: values[10].toUpperCase() === 'Y'
      });
    }

    return questions;
  };

  // CSV 라인 파싱 (따옴표 처리)
  const parseCSVLine = (text: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result;
  };

  // 파일 선택 처리
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  // 파일 처리 공통 함수
  const processFile = (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.csv')) {
      setError('CSV 파일만 업로드 가능합니다.');
      return;
    }
    setFile(selectedFile);
    setError(null);
  };

  // 드래그 앤 드롭 처리
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  // 파일 업로드 처리
  const handleUpload = async () => {
    if (!file) {
      setError('파일을 선택해주세요.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const text = await file.text();
      const parsedQuestions = parseCSV(text);

      if (parsedQuestions.length === 0) {
        throw new Error('유효한 문제가 없습니다.');
      }

      // 문제 세트 검증
      const questionSets = groupQuestionsBySet(parsedQuestions);
      validateQuestionSets(questionSets);

      onUpload(parsedQuestions);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '파일 처리 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 문제를 세트로 그룹화
  const groupQuestionsBySet = (questions: ParsedQuestion[]) => {
    const sets: ParsedQuestion[][] = [];
    let currentSet: ParsedQuestion[] = [];

    questions.forEach(q => {
      if (!q.isSupplementary) {
        if (currentSet.length > 0) {
          sets.push(currentSet);
        }
        currentSet = [q];
      } else {
        currentSet.push(q);
      }
    });

    if (currentSet.length > 0) {
      sets.push(currentSet);
    }

    return sets;
  };

  // 문제 세트 검증
  const validateQuestionSets = (sets: ParsedQuestion[][]) => {
    sets.forEach((set, index) => {
      if (set.length !== 3) {
        throw new Error(`세트 ${index + 1}: 각 세트는 기본문제 1개와 보완문제 2개로 구성되어야 합니다.`);
      }
      
      const mainQuestions = set.filter(q => !q.isSupplementary);
      const supplementaryQuestions = set.filter(q => q.isSupplementary);

      if (mainQuestions.length !== 1) {
        throw new Error(`세트 ${index + 1}: 기본문제가 정확히 1개여야 합니다.`);
      }

      if (supplementaryQuestions.length !== 2) {
        throw new Error(`세트 ${index + 1}: 보완문제가 정확히 2개여야 합니다.`);
      }

      // 모든 문제의 유형이 같은지 확인
      const questionType = set[0].questionType;
      if (!set.every(q => q.questionType === questionType)) {
        throw new Error(`세트 ${index + 1}: 한 세트 내 모든 문제의 유형이 동일해야 합니다.`);
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">종합문제 CSV 업로드</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            {/* 안내 사항 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">업로드 안내</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• 각 세트는 <strong>기본문제 1개 + 보완문제 2개</strong>로 구성되어야 합니다</li>
                <li>• 문제유형: 정보 확인, 주제 파악, 자료해석, 추론 중 1개를 선택하세요.</li>
                <li>• 문제형식: 객관식 문제는 <strong>multiple_choice</strong>로 고정합니다.</li>
                <li>• 보완문제여부: 기본문제는 <strong>N</strong>으로 보완문제는 <strong>Y</strong>로 입력하세요.</li>
              </ul>
            </div>

            {/* 템플릿 다운로드 */}
            <div className="flex justify-center">
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
                CSV 템플릿 다운로드
              </button>
            </div>

            {/* 파일 선택 */}
            <div 
              ref={dropZoneRef}
              className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
                isDragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              {file ? (
                <div className="text-center">
                  <svg className="mx-auto h-12 w-12 text-green-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-gray-900 font-medium">{file.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{(file.size / 1024).toFixed(2)} KB</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-3 text-sm text-blue-600 hover:text-blue-800"
                  >
                    다른 파일 선택
                  </button>
                </div>
              ) : (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="text-center cursor-pointer"
                >
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-sm text-gray-600">클릭하여 CSV 파일 선택</p>
                  <p className="text-xs text-gray-500 mt-1">또는 파일을 드래그하여 업로드</p>
                </div>
              )}
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* 액션 버튼 */}
            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleUpload}
                disabled={!file || isProcessing}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  !file || isProcessing
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isProcessing ? '처리 중...' : '업로드'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComprehensiveCSVUploadModal;