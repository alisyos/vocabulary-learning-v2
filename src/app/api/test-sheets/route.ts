import { NextResponse } from 'next/server';
import { getGoogleSheetsClient } from '@/lib/google-sheets';

export async function GET() {
  try {
    console.log('Testing Google Sheets connection...');
    
    // 환경 변수 확인
    const envCheck = {
      GOOGLE_SHEETS_CLIENT_EMAIL: !!process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      GOOGLE_SHEETS_PRIVATE_KEY: !!process.env.GOOGLE_SHEETS_PRIVATE_KEY,
      GOOGLE_SHEETS_SPREADSHEET_ID: !!process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
      GOOGLE_APPLICATION_CREDENTIALS: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
    };
    
    console.log('Environment variables check:', envCheck);
    
    // 누락된 환경 변수 확인
    const missingVars = Object.entries(envCheck)
      .filter(([key, exists]) => !exists && key !== 'GOOGLE_APPLICATION_CREDENTIALS')
      .map(([key]) => key);
    
    if (missingVars.length > 0 && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      return NextResponse.json({
        success: false,
        error: 'Google Sheets 환경 변수가 설정되지 않았습니다.',
        missingVariables: missingVars,
        envCheck,
        message: '다음 환경 변수들을 .env.local 파일에 설정해주세요:\n' +
                'GOOGLE_SHEETS_CLIENT_EMAIL\n' +
                'GOOGLE_SHEETS_PRIVATE_KEY\n' +
                'GOOGLE_SHEETS_SPREADSHEET_ID'
      }, { status: 400 });
    }
    
    // Google Sheets 클라이언트 연결 테스트
    const sheets = await getGoogleSheetsClient();
    console.log('Google Sheets client created successfully');
    
    // 스프레드시트 접근 테스트
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    const response = await sheets.spreadsheets.get({
      spreadsheetId: spreadsheetId!,
    });
    
    const sheetNames = response.data.sheets?.map(sheet => sheet.properties?.title) || [];
    
    console.log('Spreadsheet access successful. Available sheets:', sheetNames);
    
    // 필요한 시트들이 존재하는지 확인
    const requiredSheets = ['field', 'final_sets', 'vocabulary_details', 'comprehensive_details', 'question_type_stats'];
    const missingSheets = requiredSheets.filter(sheet => !sheetNames.includes(sheet));
    
    return NextResponse.json({
      success: true,
      message: 'Google Sheets 연결이 성공적으로 확인되었습니다.',
      spreadsheetInfo: {
        title: response.data.properties?.title,
        locale: response.data.properties?.locale,
        timeZone: response.data.properties?.timeZone,
      },
      availableSheets: sheetNames,
      requiredSheets,
      missingSheets,
      envCheck,
      recommendations: missingSheets.length > 0 ? 
        `다음 시트들을 스프레드시트에 추가해주세요: ${missingSheets.join(', ')}` :
        '모든 필요한 시트가 존재합니다.'
    });
    
  } catch (error) {
    console.error('Google Sheets connection test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Google Sheets 연결 테스트 실패',
      details: error instanceof Error ? error.message : '알 수 없는 오류',
      stack: error instanceof Error ? error.stack : undefined,
      recommendations: [
        '1. .env.local 파일에 Google Sheets API 환경 변수를 정확히 설정했는지 확인하세요.',
        '2. Google Cloud Console에서 Sheets API가 활성화되어 있는지 확인하세요.',
        '3. 서비스 계정에 스프레드시트 편집 권한이 있는지 확인하세요.',
        '4. 스프레드시트 ID가 정확한지 확인하세요.'
      ]
    }, { status: 500 });
  }
} 