'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  PassageInput, 
  EditablePassage, 
  VocabularyQuestion,
  ParagraphQuestionWorkflow,
  ComprehensiveQuestion 
} from '@/types';

interface FinalSaveProps {
  input: PassageInput;
  editablePassage: EditablePassage;
  vocabularyQuestions: VocabularyQuestion[];
  paragraphQuestions: ParagraphQuestionWorkflow[];
  comprehensiveQuestions: ComprehensiveQuestion[];
  onComplete: () => void;
}

interface SaveResult {
  success: boolean;
  message?: string;
  data?: {
    contentSetId: string;
    contentSet: {
      id: string;
      title: string;
      grade: string;
      subject: string;
      area: string;
      total_passages: number;
      total_vocabulary_terms: number;
      total_vocabulary_questions: number;
      total_paragraph_questions: number;
      total_comprehensive_questions: number;
      created_at?: string;
    };
  };
  error?: string;
  localBackup?: {
    input: PassageInput;
    editablePassage: EditablePassage;
    vocabularyQuestions: VocabularyQuestion[];
    paragraphQuestions: ParagraphQuestionWorkflow[];
    comprehensiveQuestions: ComprehensiveQuestion[];
  };
}

export default function FinalSave({
  input,
  editablePassage,
  vocabularyQuestions,
  paragraphQuestions,
  comprehensiveQuestions,
  onComplete
}: FinalSaveProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<SaveResult | null>(null);
  const [testingSupabase, setTestingSupabase] = useState(false);
  const [supabaseTest, setSupabaseTest] = useState<{
    success: boolean;
    message?: string;
    error?: string;
    details?: string;
    manualSetupRequired?: boolean;
    manualInstructions?: string[];
  } | null>(null);
  const [settingUpSchema, setSettingUpSchema] = useState(false);
  const [schemaSetup, setSchemaSetup] = useState<{
    success: boolean;
    message?: string;
    error?: string;
    manualSetupRequired?: boolean;
    manualInstructions?: string[];
    details?: any;
  } | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
    data?: any;
  } | null>(null);

  // 데이터 요약 계산 (2개 지문 형식 지원)
  const summary = {
    passageTitle: editablePassage?.passages?.[0]?.title || editablePassage?.title || '',
    paragraphCount: editablePassage?.passages?.length > 0 
      ? editablePassage.passages.reduce((total, p) => total + (p.paragraphs?.length || 0), 0)
      : (editablePassage?.paragraphs?.length || 0),
    footnoteCount: editablePassage?.passages?.length > 0
      ? editablePassage.passages.reduce((total, p) => total + (p.footnote?.length || 0), 0)
      : (editablePassage?.footnote?.length || 0),
    vocabularyCount: vocabularyQuestions?.length || 0,
    paragraphQuestionCount: paragraphQuestions?.length || 0,
    comprehensiveCount: comprehensiveQuestions?.length || 0,
    paragraphTypeDistribution: paragraphQuestions && paragraphQuestions.length > 0 ? {
      '빈칸 채우기': paragraphQuestions.filter(q => q.type === '빈칸 채우기').length,
      '주관식 단답형': paragraphQuestions.filter(q => q.type === '주관식 단답형').length,
      '어절 순서 맞추기': paragraphQuestions.filter(q => q.type === '어절 순서 맞추기').length,
      'OX문제': paragraphQuestions.filter(q => q.type === 'OX문제').length
    } : null,
    typeDistribution: comprehensiveQuestions && comprehensiveQuestions.length > 0 ? {
      '정보 확인': comprehensiveQuestions.filter(q => q.type === '정보 확인').length,
      '주제 파악': comprehensiveQuestions.filter(q => q.type === '주제 파악').length,
      '자료해석': comprehensiveQuestions.filter(q => q.type === '자료해석').length,
      '추론': comprehensiveQuestions.filter(q => q.type === '추론').length
    } : null
  };

  // Supabase 연결 테스트
  const handleTestSupabase = async () => {
    setTestingSupabase(true);
    
    try {
      const response = await fetch('/api/test-supabase-connection', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      setSupabaseTest(result);
      
      if (result.success) {
        console.log('Supabase connection test successful:', result);
      } else {
        console.error('Supabase connection test failed:', result.error);
      }
      
    } catch (error) {
      console.error('Error during Supabase connection test:', error);
      setSupabaseTest({
        success: false,
        error: 'Supabase 연결 테스트 중 네트워크 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      });
    } finally {
      setTestingSupabase(false);
    }
  };

  // Supabase 스키마 설정
  const handleSetupSchema = async () => {
    setSettingUpSchema(true);
    
    try {
      const response = await fetch('/api/setup-supabase-schema', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      setSchemaSetup(result);
      
      if (result.success) {
        console.log('Supabase schema setup successful:', result);
        // 스키마 설정 후 연결 테스트 재실행
        setTimeout(() => {
          handleTestSupabase();
        }, 1000);
      } else {
        console.error('Supabase schema setup failed:', result.error);
      }
      
    } catch (error) {
      console.error('Error during Supabase schema setup:', error);
      setSchemaSetup({
        success: false,
        error: 'Supabase 스키마 설정 중 네트워크 오류가 발생했습니다.',
        manualSetupRequired: true,
        manualInstructions: [
          '1. Supabase 대시보드에서 SQL Editor로 이동하세요.',
          '2. 프로젝트 루트의 supabase-schema.sql 파일 내용을 복사하세요.',
          '3. SQL Editor에서 실행하여 테이블을 생성하세요.'
        ]
      });
    } finally {
      setSettingUpSchema(false);
    }
  };

  // Google Sheets에서 Supabase로 마이그레이션
  const handleMigrateFromSheets = async () => {
    setMigrating(true);
    
    try {
      const response = await fetch('/api/migrate-to-supabase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'migrate-all' })
      });

      const result = await response.json();
      setMigrationResult(result);
      
      if (result.success) {
        console.log('Migration successful:', result);
      } else {
        console.error('Migration failed:', result.error);
      }
      
    } catch (error) {
      console.error('Error during migration:', error);
      setMigrationResult({
        success: false,
        error: '마이그레이션 중 네트워크 오류가 발생했습니다.'
      });
    } finally {
      setMigrating(false);
    }
  };



  // 최종 저장 실행
  const handleFinalSave = async () => {
    setSaving(true);
    
    try {
      // 저장 전 데이터 확인
      console.log('🔍 저장할 데이터 확인:');
      console.log('  - 문단 문제 수:', paragraphQuestions?.length || 0);
      console.log('  - 문단 문제 데이터:', JSON.stringify(paragraphQuestions, null, 2));
      
      // Supabase를 기본으로 사용
      const endpoint = '/api/save-final-supabase';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input,
          editablePassage,
          vocabularyQuestions,
          paragraphQuestions,
          comprehensiveQuestions,
          userId: user?.userId || ''
        }),
      });

      const result = await response.json();
      setSaveResult(result);

      if (result.success) {
        console.log('Final save successful:', result.data?.contentSetId);
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
          paragraphQuestions,
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
      paragraphQuestions,
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
                  ✨ Supabase PostgreSQL에 저장됨
                </span>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg mb-6 text-left">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">저장된 데이터 요약</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p><strong>세트 ID:</strong> {saveResult.data?.contentSetId || 'N/A'}</p>
                    <p><strong>저장 시간:</strong> {new Date().toLocaleString('ko-KR')}</p>
                    <p><strong>지문 제목:</strong> {summary.passageTitle || 'N/A'}</p>
                  </div>
                  <div>
                    <p><strong>어휘 문제:</strong> {summary.vocabularyCount}개</p>
                    <p><strong>문단 문제:</strong> {summary.paragraphQuestionCount}개</p>
                    <p><strong>종합 문제:</strong> {summary.comprehensiveCount}개</p>
                    <p><strong>총 문제 수:</strong> {summary.vocabularyCount + summary.paragraphQuestionCount + summary.comprehensiveCount}개</p>
                  </div>
                </div>
                
                {/* 문단 문제 유형별 분포 */}
                {summary.paragraphTypeDistribution && (
                  <div className="mt-4">
                    <h4 className="font-medium text-gray-800 mb-2">문단 문제 유형별 분포</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      {Object.entries(summary.paragraphTypeDistribution).map(([type, count]) => (
                        <div key={type} className="bg-yellow-100 p-2 rounded text-center">
                          <div className="font-medium">{type}</div>
                          <div className="text-gray-600">{count}개</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* 종합 문제 유형별 분포 */}
                {summary.typeDistribution && (
                  <div className="mt-4">
                    <h4 className="font-medium text-gray-800 mb-2">종합 문제 유형별 분포</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      {Object.entries(summary.typeDistribution).map(([type, count]) => (
                        <div key={type} className="bg-orange-100 p-2 rounded text-center">
                          <div className="font-medium">{type}</div>
                          <div className="text-gray-600">{count}개</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
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
          <h2 className="text-xl font-bold text-gray-800">9단계: 최종 저장</h2>
          <button
            onClick={handleFinalSave}
            disabled={saving}
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
              <p><strong>지문 길이:</strong> {input.length}</p>
              <p><strong>유형:</strong> {input.textType || '선택 안함'}</p>
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

          {/* 문단 문제 */}
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-800 mb-3">문단 문제</h4>
            <div className="space-y-2 text-sm">
              <p><strong>총 문제 수:</strong> {summary.paragraphQuestionCount}개</p>
              {summary.paragraphTypeDistribution && (
                <div>
                  <p><strong>유형별 분포:</strong></p>
                  <ul className="ml-4 space-y-1">
                    {Object.entries(summary.paragraphTypeDistribution).map(([type, count]) => (
                      <li key={type}>• {type}: {count as number}개</li>
                    ))}
                  </ul>
                </div>
              )}
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
            <strong>총 {summary.vocabularyCount + summary.paragraphQuestionCount + summary.comprehensiveCount}개 문제</strong>가 포함된 학습 콘텐츠 세트가 완성되었습니다.
          </p>
        </div>
      </div>

      {/* Supabase 연결 테스트 결과 */}
      {supabaseTest && (
        <div className={`mb-6 p-4 rounded-lg border ${
          supabaseTest.success 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
              supabaseTest.success ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {supabaseTest.success ? (
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
                supabaseTest.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {supabaseTest.success ? 'Supabase 연결 성공' : 'Supabase 연결 실패'}
              </h4>
              <p className={`text-sm mt-1 ${
                supabaseTest.success ? 'text-green-700' : 'text-red-700'
              }`}>
                {supabaseTest.message || supabaseTest.error}
              </p>
              
              {!supabaseTest.success && (
                <div className="mt-2">
                  <p className="text-red-700 font-medium text-sm">해결 방법:</p>
                  {supabaseTest.manualInstructions ? (
                    <ul className="list-disc list-inside text-xs text-red-600 mt-1">
                      {supabaseTest.manualInstructions.map((instruction, index) => (
                        <li key={index}>{instruction}</li>
                      ))}
                    </ul>
                  ) : (
                    <ul className="list-disc list-inside text-xs text-red-600 mt-1">
                      <li>Supabase 환경 변수가 올바르게 설정되었는지 확인하세요</li>
                      <li>Supabase 프로젝트가 활성화되었는지 확인하세요</li>
                      <li>데이터베이스 스키마가 올바르게 설정되었는지 확인하세요</li>
                    </ul>
                  )}
                  
                  {supabaseTest.manualSetupRequired && (
                    <div className="mt-3 space-x-2">
                      <button
                        onClick={handleSetupSchema}
                        disabled={settingUpSchema}
                        className="bg-orange-600 text-white px-3 py-1 rounded text-xs hover:bg-orange-700 disabled:opacity-50"
                      >
                        {settingUpSchema ? '스키마 설정 중...' : '자동 스키마 설정'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Supabase 스키마 설정 결과 */}
      {schemaSetup && (
        <div className={`mb-6 p-4 rounded-lg border ${
          schemaSetup.success 
            ? 'bg-green-50 border-green-200' 
            : 'bg-orange-50 border-orange-200'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
              schemaSetup.success ? 'bg-green-100' : 'bg-orange-100'
            }`}>
              {schemaSetup.success ? (
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <h4 className={`font-medium ${
                schemaSetup.success ? 'text-green-800' : 'text-orange-800'
              }`}>
                {schemaSetup.success ? 'Supabase 스키마 설정 성공' : 'Supabase 스키마 설정 안내'}
              </h4>
              <p className={`text-sm mt-1 ${
                schemaSetup.success ? 'text-green-700' : 'text-orange-700'
              }`}>
                {schemaSetup.message || schemaSetup.error}
              </p>
              
              {schemaSetup.manualSetupRequired && schemaSetup.manualInstructions && (
                <div className="mt-2">
                  <p className="text-orange-700 font-medium text-sm">수동 설정 방법:</p>
                  <ol className="list-decimal list-inside text-xs text-orange-600 mt-1">
                    {schemaSetup.manualInstructions.map((instruction, index) => (
                      <li key={index}>{instruction}</li>
                    ))}
                  </ol>
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
                {migrationResult.success ? 'Google Sheets → Supabase 마이그레이션 성공' : '마이그레이션 실패'}
              </h4>
              <p className={`text-sm mt-1 ${
                migrationResult.success ? 'text-green-700' : 'text-red-700'
              }`}>
                {migrationResult.message || migrationResult.error}
              </p>
              
              {migrationResult.success && migrationResult.data && (
                <div className="mt-2 text-xs text-green-600">
                  <p>성공: {migrationResult.data.success?.length || 0}개, 실패: {migrationResult.data.failed?.length || 0}개</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 저장 및 다운로드 버튼 */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={handleTestSupabase}
          disabled={testingSupabase}
          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {testingSupabase ? 'Supabase 연결 테스트 중...' : 'Supabase 연결 테스트'}
        </button>
        
        <button
          onClick={handleSetupSchema}
          disabled={settingUpSchema}
          className="bg-orange-600 text-white px-6 py-2 rounded-md hover:bg-orange-700 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {settingUpSchema ? '스키마 설정 중...' : 'DB 스키마 설정'}
        </button>
        
        <button
          onClick={handleFinalSave}
          disabled={saving}
          className="bg-green-600 text-white px-8 py-3 rounded-md hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-lg"
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
        <p>💡 저장 전에 Supabase 연결 테스트를 실행하고 로컬 다운로드로 백업본을 만들어두는 것을 권장합니다.</p>
        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded text-blue-700">
          <p className="font-medium">✨ Supabase 데이터베이스 저장 가이드</p>
          <p className="text-xs mt-1">
            1. &apos;Supabase 연결 테스트&apos;로 데이터베이스 연결 상태 확인<br/>
            2. 연결 실패 시: &apos;DB 스키마 설정&apos;으로 데이터베이스 테이블 생성<br/>
            3. &apos;저장하기&apos; 버튼으로 콘텐츠를 데이터베이스에 저장<br/>
            4. &apos;로컬파일 다운로드&apos;로 백업 파일 생성 (권장)
          </p>
        </div>
      </div>
    </div>
  );
} 