import { NextResponse } from 'next/server';
import { getGoogleSheetsClient } from '@/lib/google-sheets';

export async function POST() {
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
        name: 'field',
        headers: ['subject', 'grade', 'area', 'maintopic', 'subtopic', 'keyword'],
        sampleData: [
          ['사회', '3학년', '일반사회', '우리나라의 정치', '민주주의와 시민 참여', '민주주의, 시민 참여, 선거'],
          ['사회', '4학년', '일반사회', '사회 제도와 기관', '지방 자치와 시민 생활', '지방자치, 시민참여, 공공서비스'],
          ['사회', '5학년', '지리', '우리나라의 자연환경', '산지와 평야', '산맥, 평야, 지형'],
          ['사회', '6학년', '역사', '조선시대의 문화', '과학 기술의 발달', '한글, 인쇄술, 측우기'],
          ['과학', '3학년', '생물', '동물의 생활', '동물의 특징', '서식지, 먹이, 생김새'],
          ['과학', '4학년', '물리', '물질의 상태', '물의 상태 변화', '고체, 액체, 기체'],
          ['과학', '5학년', '지구과학', '날씨와 기후', '구름과 비', '수증기, 응결, 강수'],
          ['과학', '6학년', '화학', '연소와 소화', '연소의 조건', '산소, 가연성물질, 발화점']
        ]
      },
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
        
        // 샘플 데이터 추가 (field 시트의 경우)
        if (sheetConfig.sampleData && sheetConfig.name === 'field') {
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${sheetConfig.name}!A2:${String.fromCharCode(65 + sheetConfig.headers.length - 1)}${sheetConfig.sampleData.length + 1}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
              values: sheetConfig.sampleData
            }
          });
          console.log(`Sample data added to "${sheetConfig.name}" sheet`);
        }
        
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