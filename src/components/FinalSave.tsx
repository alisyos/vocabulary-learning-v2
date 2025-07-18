'use client';

import { useState } from 'react';
import { 
  PassageInput, 
  EditablePassage, 
  VocabularyQuestion, 
  ComprehensiveQuestion 
} from '@/types';

interface FinalSaveProps {
  input: PassageInput;
  editablePassage: EditablePassage;
  vocabularyQuestions: VocabularyQuestion[];
  comprehensiveQuestions: ComprehensiveQuestion[];
  onComplete: () => void;
}

interface SaveResult {
  success: boolean;
  setId?: string;
  message?: string;
  savedData?: {
    timestamp: string;
    setId: string;
    passageTitle: string;
    vocabularyCount: number;
    comprehensiveCount: number;
    typeDistribution: Record<string, number>;
  };
  error?: string;
  localBackup?: {
    input: PassageInput;
    editablePassage: EditablePassage;
    vocabularyQuestions: VocabularyQuestion[];
    comprehensiveQuestions: ComprehensiveQuestion[];
  };
}

export default function FinalSave({
  input,
  editablePassage,
  vocabularyQuestions,
  comprehensiveQuestions,
  onComplete
}: FinalSaveProps) {
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<SaveResult | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  // v2만 지원하므로 saveVersion 상태 제거
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
    details?: string;
    createdSheets?: string[];
    existingSheets?: string[];
    spreadsheetUrl?: string;
  } | null>(null);
  const [connectionTest, setConnectionTest] = useState<{
    success: boolean;
    message?: string;
    error?: string;
    details?: string;
    missingSheets?: string[];
    recommendations?: string | string[];
  } | null>(null);
  const [creatingSheets, setCreatingSheets] = useState(false);
  const [sheetCreation, setSheetCreation] = useState<{
    success: boolean;
    message?: string;
    error?: string;
    details?: string;
    created?: string[];
  } | null>(null);

  // 데이터 요약 계산 (안전한 처리)
  const summary = {
    passageTitle: editablePassage?.title || '',
    paragraphCount: editablePassage?.paragraphs?.length || 0,
    footnoteCount: editablePassage?.footnote?.length || 0,
    vocabularyCount: vocabularyQuestions?.length || 0,
    comprehensiveCount: comprehensiveQuestions?.length || 0,
    typeDistribution: comprehensiveQuestions && comprehensiveQuestions.length > 0 ? {
      '단답형': comprehensiveQuestions.filter(q => q.type === '단답형').length,
      '문단별 순서 맞추기': comprehensiveQuestions.filter(q => q.type === '문단별 순서 맞추기').length,
      '핵심 내용 요약': comprehensiveQuestions.filter(q => q.type === '핵심 내용 요약').length,
      '핵심어/핵심문장 찾기': comprehensiveQuestions.filter(q => q.type === '핵심어/핵심문장 찾기').length
    } : null
  };

  // v2 구조 시트 생성 실행
  const handleMigration = async () => {
    setMigrating(true);
    
    try {
      const response = await fetch('/api/create-v2-sheets-backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      setMigrationResult(result);
      
      if (result.success) {
        console.log('v2 sheets creation successful:', result);
      } else {
        console.error('v2 sheets creation failed:', result.error);
      }
      
    } catch (error) {
      console.error('Error during v2 sheets creation:', error);
      setMigrationResult({
        success: false,
        error: 'v2 시트 생성 중 네트워크 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      });
    } finally {
      setMigrating(false);
    }
  };

  // Google Sheets 연결 테스트
  const handleTestConnection = async () => {
    setTestingConnection(true);
    
    try {
      const response = await fetch('/api/test-sheets');
      const result = await response.json();
      setConnectionTest(result);
      
      if (result.success) {
        console.log('Connection test successful:', result);
      } else {
        console.error('Connection test failed:', result);
      }
      
    } catch (error) {
      console.error('Error during connection test:', error);
      setConnectionTest({
        success: false,
        error: '연결 테스트 중 네트워크 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      });
    } finally {
      setTestingConnection(false);
    }
  };

  // Google Sheets 시트 생성
  const handleCreateSheets = async () => {
    setCreatingSheets(true);
    
    try {
      const response = await fetch('/api/create-sheets', {
        method: 'POST',
      });
      const result = await response.json();
      setSheetCreation(result);
      
      if (result.success) {
        console.log('Sheets creation successful:', result);
        // 시트 생성 후 연결 테스트 다시 실행
        setTimeout(() => {
          handleTestConnection();
        }, 1000);
      } else {
        console.error('Sheets creation failed:', result);
      }
      
    } catch (error) {
      console.error('Error during sheets creation:', error);
      setSheetCreation({
        success: false,
        error: '시트 생성 중 네트워크 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      });
    } finally {
      setCreatingSheets(false);
    }
  };

  // 최종 저장 실행
  const handleFinalSave = async () => {
    setSaving(true);
    
    try {
      // v2 구조를 기본으로 사용
      const endpoint = '/api/save-final';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input,
          editablePassage,
          vocabularyQuestions,
          comprehensiveQuestions
        }),
      });

      const result = await response.json();
      setSaveResult(result);

      if (result.success) {
        console.log('Final save successful:', result.setId);
      } else {
        console.error('Final save failed:', result.error);
      }
      
    } catch (error) {
      console.error('Error during final save:', error);
      setSaveResult({
        success: false,
        error: '저장 중 네트워크 오류가 발생했습니다.',
        localBackup: {
          input,
          editablePassage,
          vocabularyQuestions,
          comprehensiveQuestions
        }
      });
    } finally {
      setSaving(false);
    }
  };

  // 새로운 세트 시작
  const handleStartNew = () => {
    setSaveResult(null);
    onComplete();
  };

  // 로컬 다운로드 (백업용)
  const handleLocalDownload = () => {
    const data = {
      timestamp: new Date().toISOString(),
      input,
      editablePassage,
      vocabularyQuestions,
      comprehensiveQuestions,
      summary
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `학습콘텐츠_${editablePassage.title.substring(0, 10)}_${new Date().getTime()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 저장 완료 후 화면
  if (saveResult) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          {saveResult.success ? (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">저장 완료!</h2>
              <p className="text-gray-600 mb-2">{saveResult.message}</p>
              <div className="mb-4">
                <span className="inline-block bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                  ✨ v2 정규화된 구조로 저장됨
                </span>
              </div>
              
              {saveResult.savedData && (
                <div className="bg-gray-50 p-4 rounded-lg mb-6 text-left">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">저장된 데이터 요약</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong>세트 ID:</strong> {saveResult.savedData.setId || 'N/A'}</p>
                      <p><strong>저장 시간:</strong> {saveResult.savedData.timestamp ? new Date(saveResult.savedData.timestamp).toLocaleString('ko-KR') : 'N/A'}</p>
                      <p><strong>지문 제목:</strong> {saveResult.savedData.passageTitle || 'N/A'}</p>
                    </div>
                    <div>
                      <p><strong>어휘 문제:</strong> {saveResult.savedData.vocabularyCount || 0}개</p>
                      <p><strong>종합 문제:</strong> {saveResult.savedData.comprehensiveCount || 0}개</p>
                      <p><strong>총 문제 수:</strong> {(saveResult.savedData.vocabularyCount || 0) + (saveResult.savedData.comprehensiveCount || 0)}개</p>
                    </div>
                  </div>
                  
                  {saveResult.savedData.typeDistribution && (
                    <div className="mt-4">
                      <h4 className="font-medium text-gray-800 mb-2">종합 문제 유형별 분포</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        {Object.entries(saveResult.savedData.typeDistribution).map(([type, count]) => (
                          <div key={type} className="bg-white p-2 rounded text-center">
                            <div className="font-medium">{type}</div>
                            <div className="text-gray-600">{count}개</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">저장 실패</h2>
              <p className="text-gray-600 mb-4">{saveResult.error}</p>
              
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-4">
                <p className="text-sm text-yellow-800">
                  데이터가 손실되지 않도록 로컬 파일로 다운로드할 수 있습니다.
                </p>
              </div>
            </>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleStartNew}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors font-medium"
            >
              새로운 콘텐츠 생성하기
            </button>
            
            <button
              onClick={handleLocalDownload}
              className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors font-medium"
            >
              로컬 파일로 다운로드
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 저장 전 확인 화면
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-bold text-gray-800">7단계: 최종 저장</h2>
          <button
            onClick={handleFinalSave}
            disabled={saving || (connectionTest !== null && !connectionTest.success)}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
          >
            {saving ? '저장 중...' : '저장하기'}
          </button>
        </div>
        <span className="text-sm text-red-600 bg-red-50 px-3 py-1 rounded-full">
          최종 저장
        </span>
      </div>

      {/* 데이터 요약 */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">생성된 콘텐츠 요약</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 기본 정보 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-800 mb-3">기본 정보</h4>
            <div className="space-y-2 text-sm">
              <p><strong>구분:</strong> {input.division}</p>
              <p><strong>과목:</strong> {input.subject}</p>
              <p><strong>학년:</strong> {input.grade}</p>
              <p><strong>영역:</strong> {input.area}</p>
              <p><strong>대주제:</strong> {input.maintopic}</p>
              <p><strong>소주제:</strong> {input.subtopic}</p>
              <p><strong>핵심 개념어:</strong> {input.keyword}</p>
            </div>
          </div>

          {/* 지문 정보 */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-800 mb-3">지문 정보</h4>
            <div className="space-y-2 text-sm">
              <p><strong>제목:</strong> {summary.passageTitle}</p>
              <p><strong>단락 수:</strong> {summary.paragraphCount}개</p>
              <p><strong>용어 설명:</strong> {summary.footnoteCount}개</p>
            </div>
          </div>

          {/* 어휘 문제 */}
          <div className="bg-purple-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-800 mb-3">어휘 문제</h4>
            <div className="space-y-2 text-sm">
              <p><strong>총 문제 수:</strong> {summary.vocabularyCount}개</p>
              <p><strong>문제 형태:</strong> 객관식 (5지선다)</p>
            </div>
          </div>

          {/* 종합 문제 */}
          <div className="bg-orange-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-800 mb-3">종합 문제</h4>
            <div className="space-y-2 text-sm">
              <p><strong>총 문제 수:</strong> {summary.comprehensiveCount}개</p>
              {summary.typeDistribution && (
                <div className="mt-3">
                  <p className="font-medium mb-1">유형별 분포:</p>
                  {Object.entries(summary.typeDistribution).map(([type, count]) => (
                    <p key={type} className="text-xs">• {type}: {count}개</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 총계 */}
      <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-green-800 mb-2">전체 콘텐츠 요약</h3>
          <p className="text-green-700">
            <strong>총 {summary.vocabularyCount + summary.comprehensiveCount}개 문제</strong>가 포함된 학습 콘텐츠 세트가 완성되었습니다.
          </p>
        </div>
      </div>

      {/* 연결 테스트 결과 */}
      {connectionTest && (
        <div className={`mb-6 p-4 rounded-lg border ${
          connectionTest.success 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
              connectionTest.success ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {connectionTest.success ? (
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <h4 className={`font-medium ${
                connectionTest.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {connectionTest.success ? '연결 성공' : '연결 실패'}
              </h4>
              <p className={`text-sm mt-1 ${
                connectionTest.success ? 'text-green-700' : 'text-red-700'
              }`}>
                {connectionTest.message || connectionTest.error}
              </p>
              
              {connectionTest.success && connectionTest.missingSheets && connectionTest.missingSheets.length > 0 && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                  <p className="text-yellow-800 font-medium">주의사항:</p>
                  <p className="text-yellow-700">{connectionTest.recommendations}</p>
                  <button
                    onClick={handleCreateSheets}
                    disabled={creatingSheets}
                    className="mt-2 bg-yellow-600 text-white px-3 py-1 rounded text-xs hover:bg-yellow-700 disabled:opacity-50"
                  >
                    {creatingSheets ? '시트 생성 중...' : '필요한 시트 자동 생성'}
                  </button>
                </div>
              )}
              
              {sheetCreation && (
                <div className={`mt-2 p-2 rounded text-sm ${
                  sheetCreation.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  <p className={`font-medium ${sheetCreation.success ? 'text-green-800' : 'text-red-800'}`}>
                    {sheetCreation.success ? '시트 생성 완료' : '시트 생성 실패'}
                  </p>
                  <p className={`text-xs ${sheetCreation.success ? 'text-green-700' : 'text-red-700'}`}>
                    {sheetCreation.message || sheetCreation.error}
                  </p>
                  {sheetCreation.success && sheetCreation.created && sheetCreation.created.length > 0 && (
                    <p className="text-xs text-green-600 mt-1">
                      생성된 시트: {sheetCreation.created.join(', ')}
                    </p>
                  )}
                </div>
              )}
              
              {!connectionTest.success && connectionTest.recommendations && (
                <div className="mt-2">
                  <p className="text-red-700 font-medium text-sm">해결 방법:</p>
                  <ul className="list-disc list-inside text-xs text-red-600 mt-1">
                    {Array.isArray(connectionTest.recommendations) 
                      ? connectionTest.recommendations.map((rec: string, index: number) => (
                          <li key={index}>{rec}</li>
                        ))
                      : <li>{connectionTest.recommendations}</li>
                    }
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 마이그레이션 결과 */}
      {migrationResult && (
        <div className={`mb-6 p-4 rounded-lg border ${
          migrationResult.success 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
              migrationResult.success ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {migrationResult.success ? (
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <h4 className={`font-medium ${
                migrationResult.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {migrationResult.success ? 'v2 시트 생성 성공' : 'v2 시트 생성 실패'}
              </h4>
              <p className={`text-sm mt-1 ${
                migrationResult.success ? 'text-green-700' : 'text-red-700'
              }`}>
                {migrationResult.message || migrationResult.error}
              </p>
              
              {migrationResult.success && (
                <div className="mt-2 space-y-2">
                  {migrationResult.createdSheets && migrationResult.createdSheets.length > 0 && (
                    <div className="p-2 bg-green-100 border border-green-200 rounded text-sm">
                      <p className="text-green-800 font-medium">새로 생성된 시트:</p>
                      <ul className="list-disc list-inside text-green-700 mt-1">
                        {migrationResult.createdSheets.map((sheet: string, index: number) => (
                          <li key={index}>{sheet}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {migrationResult.existingSheets && migrationResult.existingSheets.length > 0 && (
                    <div className="p-2 bg-blue-100 border border-blue-200 rounded text-sm">
                      <p className="text-blue-800 font-medium">이미 존재하는 시트:</p>
                      <ul className="list-disc list-inside text-blue-700 mt-1">
                        {migrationResult.existingSheets.map((sheet: string, index: number) => (
                          <li key={index}>{sheet}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {migrationResult.spreadsheetUrl && (
                    <div className="p-2 bg-gray-100 border border-gray-200 rounded text-sm">
                      <a 
                        href={migrationResult.spreadsheetUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        📊 Google Sheets에서 확인하기
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}



      {/* 저장 및 다운로드 버튼 */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={handleMigration}
          disabled={migrating}
          className="bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {migrating ? 'Data 시트 동기화 중...' : 'Data 시트 동기화'}
        </button>
        
        <button
          onClick={handleTestConnection}
          disabled={testingConnection}
          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {testingConnection ? '연결 테스트 중...' : '연결 테스트'}
        </button>
        
        <button
          onClick={handleFinalSave}
          disabled={saving || (connectionTest !== null && !connectionTest.success)}
          className="bg-blue-600 text-white px-8 py-3 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-lg"
        >
          {saving ? '저장 중...' : '저장하기'}
        </button>
        
        <button
          onClick={handleLocalDownload}
          className="bg-gray-600 text-white px-6 py-3 rounded-md hover:bg-gray-700 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors font-medium"
        >
          로컬파일 다운로드
        </button>
      </div>

      <div className="mt-4 text-center text-sm text-gray-600">
        <p>💡 저장 전에 연결 테스트를 실행하고 로컬 다운로드로 백업본을 만들어두는 것을 권장합니다.</p>
        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded text-blue-700">
          <p className="font-medium">✨ 정규화된 구조 사용 가이드</p>
          <p className="text-xs mt-1">
            1. 첫 사용 시: &apos;Data 시트 동기화&apos; 버튼으로 새로운 6개 시트 생성<br/>
            2. 연결 테스트로 Google Sheets 상태 확인<br/>
            3. &apos;저장하기&apos; 클릭
          </p>
        </div>
      </div>
    </div>
  );
} 