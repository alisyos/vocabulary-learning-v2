import { google } from 'googleapis';

// Google Sheets 클라이언트 초기화
export async function getGoogleSheetsClient() {
  try {
    // 방법 1: JSON 파일 사용 (선호)
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const auth = new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
      const sheets = google.sheets({ version: 'v4', auth });
      return sheets;
    }

    // 방법 2: 개별 환경 변수 사용
    // 환경 변수 검증
    if (!process.env.GOOGLE_SHEETS_CLIENT_EMAIL) {
      throw new Error('GOOGLE_SHEETS_CLIENT_EMAIL is not configured');
    }
    
    if (!process.env.GOOGLE_SHEETS_PRIVATE_KEY) {
      throw new Error('GOOGLE_SHEETS_PRIVATE_KEY is not configured');
    }

    if (!process.env.GOOGLE_SHEETS_SPREADSHEET_ID) {
      throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID is not configured');
    }

    // private key 처리 개선
    let privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;
    
    try {
      // 1. 앞뒤 따옴표 제거
      privateKey = privateKey.replace(/^["']|["']$/g, '');
      
      // 2. JSON 문자열에서 이스케이프된 줄바꿈 처리
      privateKey = privateKey.replace(/\\n/g, '\n');
      
      // 3. 혹시 모를 추가 공백 제거
      privateKey = privateKey.trim();
      
      // 4. private key가 BEGIN/END로 감싸져 있는지 확인
      if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
        throw new Error('Invalid private key format. Must include BEGIN/END markers.');
      }
      
      // 5. 변환된 키 로깅 (디버깅용 - 실제 키는 보이지 않게)
      console.log('Private key processed successfully. Starts with:', privateKey.substring(0, 50) + '...');

      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
          private_key: privateKey,
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      const sheets = google.sheets({ version: 'v4', auth });
      return sheets;
    } catch (keyError) {
      console.error('Private key processing details:', {
        originalLength: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.length,
        processedLength: privateKey?.length,
        startsWithBegin: privateKey?.startsWith('-----BEGIN'),
        endsWithEnd: privateKey?.endsWith('-----'),
      });
      throw new Error(`Private key processing failed: ${keyError instanceof Error ? keyError.message : keyError}`);
    }
  } catch (error) {
    console.error('Google Sheets authentication failed:', error);
    throw new Error(`Google Sheets authentication failed: ${error instanceof Error ? error.message : error}`);
  }
}

// 스프레드시트에 데이터 저장
export async function saveToSheet(
  sheetName: string,
  data: (string | number)[][],
  range?: string
) {
  try {
    const sheets = await getGoogleSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID is not configured');
    }

    const fullRange = range ? `${sheetName}!${range}` : `${sheetName}!A:Z`;

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: fullRange,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: data,
      },
    });

    return response.data;
  } catch (error) {
    console.error('Error saving to Google Sheets:', error);
    throw error;
  }
}

// 스프레드시트에서 데이터 읽기
export async function readFromSheet(
  sheetName: string,
  range?: string
) {
  try {
    const sheets = await getGoogleSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID is not configured');
    }

    const fullRange = range ? `${sheetName}!${range}` : `${sheetName}!A:Z`;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: fullRange,
    });

    return response.data.values || [];
  } catch (error) {
    console.error('Error reading from Google Sheets:', error);
    throw error;
  }
}

// v1 savePassageData 함수 제거됨 - v2에서는 saveContentSetV2, savePassageV2 사용

// v1 saveQuestionData 함수 제거됨 - v2에서는 saveVocabularyQuestionsV2, saveComprehensiveQuestionsV2 사용

// 필드 데이터 읽기 (계층적 선택을 위한)
export async function getFieldData() {
  try {
    const data = await readFromSheet('field');
    
    // 헤더 제외하고 데이터 파싱
    const [headers, ...rows] = data;
    
    if (!headers || headers.length < 6) {
      throw new Error('Field sheet must have at least 6 columns: subject, grade, area, maintopic, subtopic, keyword');
    }
    
    const fieldData = rows.map(row => ({
      subject: row[0] || '',
      grade: row[1] || '',
      area: row[2] || '',
      maintopic: row[3] || '',
      subtopic: row[4] || '',
      keyword: row[5] || ''
    }));
    
    return fieldData;
  } catch (error) {
    console.error('Error reading field data:', error);
    // 기본값 반환 (Google Sheets 연결 실패 시)
    return [];
  }
}

// ============================================================================
// 새로운 정규화된 구조를 위한 함수들 (향후 DB 연동 준비)
// ============================================================================

// 정규화된 콘텐츠 세트 데이터 저장
export async function saveContentSetV2(contentSetData: {
  setId: string;
  userId?: string;
  division: string;
  subject: string;
  grade: string;
  area: string;
  mainTopic: string;
  subTopic: string;
  keywords: string;
  passageTitle: string;
  passageLength: string; // 지문 길이 정보 추가
  textType?: string; // 지문 유형 정보 추가 (선택사항)
  paragraphCount: number;
  vocabularyWordsCount: number;
  vocabularyQuestionCount: number;
  comprehensiveQuestionCount: number;
  status?: string;
}) {
  const timestamp = new Date().toISOString();
  const data = [
    [
      timestamp,
      contentSetData.setId,
      contentSetData.userId || '',
      contentSetData.division,
      contentSetData.subject,
      contentSetData.grade,
      contentSetData.area,
      contentSetData.mainTopic,
      contentSetData.subTopic,
      contentSetData.keywords,
      contentSetData.passageTitle,
      contentSetData.passageLength, // 지문 길이 추가
      contentSetData.textType || '선택안함', // 지문 유형 추가 (선택 안함일 경우 '선택안함')
      contentSetData.paragraphCount,
      contentSetData.vocabularyWordsCount,
      contentSetData.vocabularyQuestionCount,
      contentSetData.comprehensiveQuestionCount,
      contentSetData.status || '검수 전', // 기본값을 '검수 전'으로 변경
      timestamp, // created_at
      timestamp  // updated_at
    ]
  ];

  return await saveToSheet('content_sets_v2', data);
}

// 정규화된 지문 데이터 저장
export async function savePassageV2(passageData: {
  contentSetId: string;
  title: string;
  paragraphs: string[];
}) {
  const timestamp = new Date().toISOString();
  
  // 최대 10개 단락까지 지원
  const paddedParagraphs = [...passageData.paragraphs.slice(0, 10)];
  while (paddedParagraphs.length < 10) {
    paddedParagraphs.push('');
  }

  const data = [
    [
      '', // id (자동 생성)
      passageData.contentSetId,
      passageData.title,
      ...paddedParagraphs,
      timestamp, // created_at
      timestamp  // updated_at
    ]
  ];

  return await saveToSheet('passages_v2', data);
}

// 정규화된 어휘 용어 데이터 저장
export async function saveVocabularyTermsV2(termsData: {
  contentSetId: string;
  terms: Array<{
    term: string;
    definition: string;
    exampleSentence?: string;
    orderIndex: number;
  }>;
}) {
  const timestamp = new Date().toISOString();
  
  const data = termsData.terms.map(term => [
    '', // id (자동 생성)
    termsData.contentSetId,
    term.term,
    term.definition,
    term.exampleSentence || '',
    term.orderIndex,
    timestamp // created_at
  ]);

  return await saveToSheet('vocabulary_terms_v2', data);
}

// 정규화된 어휘 문제 데이터 저장
export async function saveVocabularyQuestionsV2(questionsData: {
  contentSetId: string;
  questions: Array<{
    questionId: string;
    term: string;
    question: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
    vocabularyTermId?: string;
  }>;
}) {
  const timestamp = new Date().toISOString();
  
  const data = questionsData.questions.map(q => [
    '', // id (자동 생성)
    questionsData.contentSetId,
    q.vocabularyTermId || '', // vocabulary_term_id
    q.questionId,
    q.term,
    q.question,
    q.options[0] || '',
    q.options[1] || '',
    q.options[2] || '',
    q.options[3] || '',
    q.options[4] || '',
    q.correctAnswer,
    q.explanation,
    timestamp // created_at
  ]);

  return await saveToSheet('vocabulary_questions_v2', data);
}

// 정규화된 종합 문제 데이터 저장
export async function saveComprehensiveQuestionsV2(questionsData: {
  contentSetId: string;
  questions: Array<{
    questionId: string;
    questionType: string;
    question: string;
    options?: string[];
    correctAnswer: string;
    explanation: string;
    isSupplementary?: boolean;
    originalQuestionId?: string;
    questionSetNumber?: number;
  }>;
}) {
  const timestamp = new Date().toISOString();
  
  const data = questionsData.questions.map(q => [
    '', // id (자동 생성)
    questionsData.contentSetId,
    q.questionId,
    q.questionType,
    q.question,
    q.options && q.options.length > 0 ? 'multiple_choice' : 'short_answer', // question_format
    q.options?.[0] || '',
    q.options?.[1] || '',
    q.options?.[2] || '',
    q.options?.[3] || '',
    q.options?.[4] || '',
    q.correctAnswer,
    q.explanation,
    q.isSupplementary ? 'TRUE' : 'FALSE',
    q.originalQuestionId || '',
    q.questionSetNumber || 1,
    timestamp // created_at
  ]);

  return await saveToSheet('comprehensive_questions_v2', data);
}

// AI 생성 로그 저장
export async function saveAIGenerationLogV2(logData: {
  contentSetId: string;
  generationType: 'passage' | 'vocabulary' | 'comprehensive';
  promptUsed: string;
  aiResponse: Record<string, unknown>;
  generationTimeMs?: number;
  tokensUsed?: number;
  costUsd?: number;
}) {
  const timestamp = new Date().toISOString();
  
  const data = [
    [
      '', // id (자동 생성)
      logData.contentSetId,
      logData.generationType,
      logData.promptUsed,
      JSON.stringify(logData.aiResponse),
      logData.generationTimeMs || 0,
      logData.tokensUsed || 0,
      logData.costUsd || 0,
      timestamp // created_at
    ]
  ];

  return await saveToSheet('ai_generation_logs_v2', data);
}

// 정규화된 콘텐츠 세트 목록 조회
export async function getContentSetsV2(filters?: {
  subject?: string;
  grade?: string;
  area?: string;
  limit?: number;
}) {
  try {
    const rawData = await readFromSheet('content_sets_v2');
    
    if (!rawData || rawData.length <= 1) {
      return { data: [], total: 0 };
    }

    const [headers, ...rows] = rawData;
    
    let contentSets = rows
      .filter(row => row.length >= 12)
      .map(row => ({
        timestamp: row[0],
        setId: row[1],
        userId: row[2],
        division: row[3],
        subject: row[4],
        grade: row[5],
        area: row[6],
        mainTopic: row[7],
        subTopic: row[8],
        keywords: row[9],
        passageTitle: row[10],
        passageLength: row[11], // 지문 길이 추가
        textType: row[12] || null, // 지문 유형 추가 (선택사항이므로 null 허용)
        paragraphCount: parseInt(row[13]) || 0,
        vocabularyWordsCount: parseInt(row[14]) || 0,
        vocabularyQuestionCount: parseInt(row[15]) || 0,
        comprehensiveQuestionCount: parseInt(row[16]) || 0,
        status: row[17] || 'completed',
        createdAt: row[18],
        updatedAt: row[19]
      }));

    // 필터 적용
    if (filters) {
      if (filters.subject) {
        contentSets = contentSets.filter(item => item.subject === filters.subject);
      }
      if (filters.grade) {
        contentSets = contentSets.filter(item => item.grade === filters.grade);
      }
      if (filters.area) {
        contentSets = contentSets.filter(item => item.area === filters.area);
      }
    }

    // 최신순 정렬
    contentSets.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // 제한 적용
    const limitedData = filters?.limit ? contentSets.slice(0, filters.limit) : contentSets;

    return {
      data: limitedData,
      total: contentSets.length,
      stats: {
        total: contentSets.length,
        totalSets: contentSets.length,
        totalVocabularyWords: contentSets.reduce((sum, item) => sum + (item.vocabularyWordsCount || 0), 0),
        totalVocabularyQuestions: contentSets.reduce((sum, item) => sum + (item.vocabularyQuestionCount || 0), 0),
        totalComprehensiveQuestions: contentSets.reduce((sum, item) => sum + (item.comprehensiveQuestionCount || 0), 0),
        subjects: [...new Set(contentSets.map(item => item.subject))],
        grades: [...new Set(contentSets.map(item => item.grade))],
        areas: [...new Set(contentSets.map(item => item.area))],
        mostRecentUpdate: contentSets.length > 0 ? contentSets[0].timestamp : null
      }
    };
  } catch (error) {
    console.error('Error reading content sets v2:', error);
    throw error;
  }
}

// 특정 콘텐츠 세트의 상세 정보 조회 (정규화된 구조)
export async function getContentSetDetailsV2(setId: string) {
  try {
    // 1. 콘텐츠 세트 기본 정보
    const contentSetsData = await readFromSheet('content_sets_v2');
    const contentSet = contentSetsData.find(row => row[1] === setId);
    
    if (!contentSet) {
      throw new Error(`콘텐츠 세트를 찾을 수 없습니다: ${setId}`);
    }

    // 2. 지문 데이터
    const passagesData = await readFromSheet('passages_v2');
    const passage = passagesData.find(row => row[1] === setId);

    // 3. 어휘 용어 데이터
    const vocabularyTermsData = await readFromSheet('vocabulary_terms_v2');
    const vocabularyTerms = vocabularyTermsData.filter(row => row[1] === setId);

    // 4. 어휘 문제 데이터
    const vocabularyQuestionsData = await readFromSheet('vocabulary_questions_v2');
    const vocabularyQuestions = vocabularyQuestionsData.filter(row => row[1] === setId);

    // 5. 종합 문제 데이터
    const comprehensiveQuestionsData = await readFromSheet('comprehensive_questions_v2');
    const comprehensiveQuestions = comprehensiveQuestionsData.filter(row => row[1] === setId);

    return {
      contentSet: {
        setId: contentSet[1],
        division: contentSet[3],
        subject: contentSet[4],
        grade: contentSet[5],
        area: contentSet[6],
        mainTopic: contentSet[7],
        subTopic: contentSet[8],
        keywords: contentSet[9],
        passageTitle: contentSet[10],
        passageLength: contentSet[11], // 지문 길이 추가
        textType: contentSet[12] || null, // 지문 유형 추가 (선택사항)
        status: contentSet[17],
        createdAt: contentSet[18]
      },
      passage: passage ? {
        title: passage[2],
        paragraphs: passage.slice(3, 13).filter(p => p && p.trim())
      } : null,
      vocabularyTerms: vocabularyTerms.map(term => ({
        id: term[0],
        term: term[2],
        definition: term[3],
        exampleSentence: term[4],
        orderIndex: parseInt(term[5]) || 0
      })),
      vocabularyQuestions: vocabularyQuestions.map(q => ({
        id: q[0],
        questionId: q[3],
        term: q[4],
        question: q[5],
        options: [q[6], q[7], q[8], q[9], q[10]].filter(o => o && o.trim()),
        correctAnswer: q[11],
        explanation: q[12]
      })),
      comprehensiveQuestions: comprehensiveQuestions.map(q => ({
        id: q[0],
        questionId: q[2],
        questionType: q[3],
        question: q[4],
        questionFormat: q[5],
        options: q[5] === 'multiple_choice' ? [q[6], q[7], q[8], q[9], q[10]].filter(o => o && o.trim()) : undefined,
        correctAnswer: q[11],
        explanation: q[12],
        isSupplementary: q[13] === 'TRUE',
        originalQuestionId: q[14] || undefined,
        questionSetNumber: parseInt(q[15]) || 1
      }))
    };
  } catch (error) {
    console.error('Error reading content set details v2:', error);
    throw error;
  }
}

// ============================================================================
// 프롬프트 관리 시스템 함수들
// ============================================================================

// 프롬프트 시트에서 모든 프롬프트 데이터 조회
export async function getSystemPrompts() {
  try {
    const data = await readFromSheet('system_prompts');
    
    return data.slice(1).map(row => ({
      id: parseInt(row[0]) || undefined,
      promptId: row[1] || '',
      category: row[2] || '',
      subCategory: row[3] || '',
      name: row[4] || '',
      key: row[5] || '',
      promptText: row[6] || '',
      description: row[7] || '',
      isActive: row[8] === 'TRUE',
      isDefault: row[9] === 'TRUE',
      version: parseInt(row[10]) || 1,
      createdAt: row[11] || '',
      updatedAt: row[12] || '',
      createdBy: row[13] || '',
      updatedBy: row[14] || ''
    }));
  } catch (error) {
    console.error('Error reading system prompts:', error);
    // 시트가 없거나 오류가 발생하면 빈 배열 반환 (초기화 필요 상태)
    return [];
  }
}

// 특정 카테고리의 프롬프트 조회
export async function getPromptsByCategory(category: string) {
  try {
    const allPrompts = await getSystemPrompts();
    return allPrompts.filter(prompt => prompt.category === category && prompt.isActive);
  } catch (error) {
    console.error('Error reading prompts by category:', error);
    throw error;
  }
}

// 특정 키에 해당하는 프롬프트 조회
export async function getPromptByKey(category: string, subCategory: string, key: string) {
  try {
    const allPrompts = await getSystemPrompts();
    return allPrompts.find(prompt => 
      prompt.category === category && 
      prompt.subCategory === subCategory && 
      prompt.key === key && 
      prompt.isActive
    );
  } catch (error) {
    console.error('Error reading prompt by key:', error);
    throw error;
  }
}

// 프롬프트 업데이트
export async function updateSystemPrompt(promptId: string, promptText: string, changeReason?: string) {
  try {
    const allPrompts = await getSystemPrompts();
    const existingPrompt = allPrompts.find(p => p.promptId === promptId);
    
    if (!existingPrompt) {
      throw new Error(`프롬프트를 찾을 수 없습니다: ${promptId}`);
    }

    const newVersion = existingPrompt.version + 1;
    const updatedAt = new Date().toISOString();

    // 기존 프롬프트 업데이트
    const sheets = await getGoogleSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;
    
    // 해당 행 찾기 (id 기준)
    const data = await readFromSheet('system_prompts');
    const rowIndex = data.findIndex(row => row[1] === promptId);
    
    if (rowIndex === -1) {
      throw new Error(`프롬프트 행을 찾을 수 없습니다: ${promptId}`);
    }

    // 프롬프트 텍스트, 버전, 수정일 업데이트
    const updateRange = `system_prompts!G${rowIndex + 1}:L${rowIndex + 1}`;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: updateRange,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[
          promptText,     // G: promptText
          existingPrompt.description, // H: description 
          'TRUE',         // I: isActive
          existingPrompt.isDefault ? 'TRUE' : 'FALSE', // J: isDefault
          newVersion,     // K: version
          updatedAt       // L: updatedAt
        ]]
      }
    });

    // 프롬프트 히스토리에 기록 (선택사항 - 향후 구현)
    // await addPromptHistory(promptId, newVersion, promptText, changeReason);

    return {
      success: true,
      promptId,
      newVersion,
      message: '프롬프트가 성공적으로 업데이트되었습니다.'
    };
  } catch (error) {
    console.error('Error updating system prompt:', error);
    throw error;
  }
}

// 새 프롬프트 추가
export async function addSystemPrompt(promptData: {
  promptId: string;
  category: string;
  subCategory: string;
  name: string;
  key: string;
  promptText: string;
  description?: string;
  isDefault?: boolean;
}) {
  try {
    const now = new Date().toISOString();
    
    const newRow = [
      '', // id (자동 생성)
      promptData.promptId,
      promptData.category,
      promptData.subCategory,
      promptData.name,
      promptData.key,
      promptData.promptText,
      promptData.description || '',
      'TRUE', // isActive
      promptData.isDefault ? 'TRUE' : 'FALSE',
      1, // version
      now, // createdAt
      now, // updatedAt
      '', // createdBy
      ''  // updatedBy
    ];

    await saveToSheet('system_prompts', [newRow]);
    
    return {
      success: true,
      promptId: promptData.promptId,
      message: '새 프롬프트가 성공적으로 추가되었습니다.'
    };
  } catch (error) {
    console.error('Error adding system prompt:', error);
    throw error;
  }
}

// 프롬프트 시트 초기화 (기본 프롬프트들 삽입)
export async function initializeSystemPrompts() {
  try {
    // 시트가 이미 존재하는지 확인
    const existingPrompts = await getSystemPrompts();
    if (existingPrompts.length > 0) {
      console.log('System prompts already initialized');
      return {
        success: true,
        message: '프롬프트가 이미 초기화되어 있습니다.',
        count: existingPrompts.length
      };
    }

    // lib/prompts.ts에서 기본 프롬프트들을 가져와서 DB에 삽입
    const { getDefaultPrompts } = await import('./prompts');
    const defaultPrompts = getDefaultPrompts();
    
    const now = new Date().toISOString();
    const rows = defaultPrompts.map(prompt => [
      '', // id (자동 생성)
      prompt.promptId,
      prompt.category,
      prompt.subCategory,
      prompt.name,
      prompt.key,
      prompt.promptText,
      prompt.description || '',
      'TRUE', // isActive
      'TRUE', // isDefault
      1, // version
      now, // createdAt
      now, // updatedAt
      'system', // createdBy
      'system'  // updatedBy
    ]);

    await saveToSheet('system_prompts', rows);
    
    return {
      success: true,
      message: '기본 프롬프트가 성공적으로 초기화되었습니다.',
      count: rows.length
    };
  } catch (error) {
    console.error('Error initializing system prompts:', error);
    throw error;
  }
}