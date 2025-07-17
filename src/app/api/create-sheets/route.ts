import { NextRequest, NextResponse } from 'next/server';
import { getGoogleSheetsClient } from '@/lib/google-sheets';

export async function POST(request: NextRequest) {
  try {
    console.log('Creating required sheets...');
    
    const sheets = await getGoogleSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    
    if (!spreadsheetId) {
      return NextResponse.json({
        success: false,
        error: 'GOOGLE_SHEETS_SPREADSHEET_ID가 설정되지 않았습니다.'
      }, { status: 400 });
    }
    
    // 필요한 시트 정의
    const requiredSheets = [
      {
        name: 'final_sets',
        headers: [
          'timestamp', 'set_id', 'division', 'subject', 'grade', 'area', 
          'maintopic', 'subtopic', 'keyword', 'passage_title', 
          'vocabulary_count', 'comprehensive_count', 
          'input_json', 'passage_json', 'vocabulary_json', 'comprehensive_json'
        ]
      },
      {
        name: 'vocabulary_details', 
        headers: [
          'timestamp', 'set_id', 'question_id', 'term', 'question', 
          'options_json', 'answer', 'explanation'
        ]
      },
      {
        name: 'comprehensive_details',
        headers: [
          'timestamp', 'set_id', 'question_id', 'type', 'question', 
          'options_json', 'answer', 'explanation'
        ]
      },
      {
        name: 'question_type_stats',
        headers: ['timestamp', 'set_id', 'question_type', 'count']
      }
    ];
    
    // 현재 존재하는 시트들 확인
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const existingSheets = spreadsheet.data.sheets?.map(sheet => sheet.properties?.title) || [];
    
    console.log('Existing sheets:', existingSheets);
    
    const createdSheets: string[] = [];
    const skippedSheets: string[] = [];
    
    // 각 시트 생성
    for (const sheetConfig of requiredSheets) {
      if (existingSheets.includes(sheetConfig.name)) {
        skippedSheets.push(sheetConfig.name);
        console.log(`Sheet "${sheetConfig.name}" already exists, skipping...`);
        continue;
      }
      
      try {
        // 시트 생성
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [{
              addSheet: {
                properties: {
                  title: sheetConfig.name,
                  gridProperties: {
                    rowCount: 1000,
                    columnCount: sheetConfig.headers.length
                  }
                }
              }
            }]
          }
        });
        
        // 헤더 추가
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${sheetConfig.name}!A1:${String.fromCharCode(65 + sheetConfig.headers.length - 1)}1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [sheetConfig.headers]
          }
        });
        
        createdSheets.push(sheetConfig.name);
        console.log(`Sheet "${sheetConfig.name}" created successfully`);
        
      } catch (error) {
        console.error(`Error creating sheet "${sheetConfig.name}":`, error);
        throw new Error(`시트 "${sheetConfig.name}" 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `시트 생성이 완료되었습니다.`,
      created: createdSheets,
      skipped: skippedSheets,
      summary: {
        createdCount: createdSheets.length,
        skippedCount: skippedSheets.length,
        totalRequired: requiredSheets.length
      }
    });
    
  } catch (error) {
    console.error('Error creating sheets:', error);
    
    return NextResponse.json({
      success: false,
      error: '시트 생성 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
} 