import { google } from 'googleapis';
import { PassageInput, QuestionInput } from '@/types';

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

// 지문 데이터 저장
export async function savePassageData(
  input: PassageInput,
  prompt: string,
  result: Record<string, unknown>
) {
  const timestamp = new Date().toISOString();
  const data = [
    [
      timestamp,
      input.division,      // 구분 (기존 grade)
      input.subject,
      input.grade,         // 새로운 학년
      input.area,
      input.length,
      input.maintopic,     // 대주제
      input.subtopic,      // 소주제
      input.keyword,       // 핵심 개념어
      input.textType || '-',   // 유형 (선택사항)
      prompt,
      JSON.stringify(result),
    ],
  ];

  return await saveToSheet('passages', data);
}

// 문제 데이터 저장
export async function saveQuestionData(
  input: QuestionInput,
  prompt: string,
  result: Record<string, unknown>
) {
  const timestamp = new Date().toISOString();
  const data = [
    [
      timestamp,
      input.division,      // 구분 (기존 grade)
      input.questionType,
      input.passage,
      prompt,
      JSON.stringify(result),
    ],
  ];

  return await saveToSheet('questions', data);
}

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