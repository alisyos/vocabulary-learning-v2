import { NextRequest, NextResponse } from 'next/server';
import { getGoogleSheetsClient } from '@/lib/google-sheets';

export async function POST(request: NextRequest) {
  try {
    console.log('v2 정규화된 시트들을 생성합니다...');
    
    // 환경 변수 검증
    if (!process.env.GOOGLE_SHEETS_CLIENT_EMAIL || 
        !process.env.GOOGLE_SHEETS_PRIVATE_KEY || 
        !process.env.GOOGLE_SHEETS_SPREADSHEET_ID) {
      return NextResponse.json({
        success: false,
        error: 'Google Sheets 환경 변수가 설정되지 않았습니다.',
        details: 'GOOGLE_SHEETS_CLIENT_EMAIL, GOOGLE_SHEETS_PRIVATE_KEY, GOOGLE_SHEETS_SPREADSHEET_ID가 필요합니다.'
      }, { status: 500 });
    }

    const sheets = await getGoogleSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    // 새로운 시트들의 헤더 정의
    const newSheets = {
      'content_sets_v2': [
        'timestamp', 'set_id', 'user_id', 'division', 'subject', 'grade', 'area', 
        'main_topic', 'sub_topic', 'keywords', 'passage_title', 'passage_length', 'text_type',
        'paragraph_count', 'vocabulary_words_count', 'vocabulary_question_count', 'comprehensive_question_count', 
        'status', 'created_at', 'updated_at'
      ],
      'passages_v2': [
        'id', 'content_set_id', 'title', 'paragraph_1', 'paragraph_2', 'paragraph_3', 
        'paragraph_4', 'paragraph_5', 'paragraph_6', 'paragraph_7', 'paragraph_8', 
        'paragraph_9', 'paragraph_10', 'created_at', 'updated_at'
      ],
      'vocabulary_terms_v2': [
        'id', 'content_set_id', 'term', 'definition', 'example_sentence', 'order_index', 'created_at'
      ],
      'vocabulary_questions_v2': [
        'id', 'content_set_id', 'vocabulary_term_id', 'question_id', 'term', 'question', 
        'option_1', 'option_2', 'option_3', 'option_4', 'option_5', 'correct_answer', 
        'explanation', 'created_at'
      ],
      'comprehensive_questions_v2': [
        'id', 'content_set_id', 'question_id', 'question_type', 'question', 'question_format',
        'option_1', 'option_2', 'option_3', 'option_4', 'option_5', 'correct_answer', 
        'explanation', 'is_supplementary', 'original_question_id', 'question_set_number', 'created_at'
      ],
      'ai_generation_logs_v2': [
        'id', 'content_set_id', 'generation_type', 'prompt_used', 'ai_response', 
        'generation_time_ms', 'tokens_used', 'cost_usd', 'created_at'
      ],
      'system_prompts': [
        'id', 'prompt_id', 'category', 'sub_category', 'name', 'key', 'prompt_text', 
        'description', 'is_active', 'is_default', 'version', 'created_at', 'updated_at', 
        'created_by', 'updated_by'
      ]
    };

    // 기존 시트 목록 확인
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    const existingSheetNames = spreadsheet.data.sheets?.map(sheet => sheet.properties?.title).filter(Boolean) || [];
    const createdSheets: string[] = [];
    const existingSheets: string[] = [];
    const updatedSheets: string[] = [];

    // 각 시트 생성
    for (const [sheetName, headers] of Object.entries(newSheets)) {
      try {
        // 시트가 이미 존재하는지 확인
        if (!existingSheetNames.includes(sheetName)) {
          // 새 시트 생성
          console.log(`${sheetName} 시트를 생성합니다...`);
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
              requests: [{
                addSheet: {
                  properties: {
                    title: sheetName
                  }
                }
              }]
            }
          });
          
          // 헤더 추가
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${sheetName}!A1`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
              values: [headers]
            }
          });
          
          createdSheets.push(sheetName);
          console.log(`✓ ${sheetName} 시트 생성 및 헤더 추가 완료`);
          
        } else {
          // 기존 시트의 스키마 확인 및 업데이트
          console.log(`${sheetName} 시트가 이미 존재합니다. 스키마를 확인합니다...`);
          
          // 현재 헤더 확인
          const currentHeaderResponse = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${sheetName}!1:1`
          });
          
          const currentHeaders = currentHeaderResponse.data.values?.[0] || [];
          console.log(`현재 ${sheetName} 헤더:`, currentHeaders);
          console.log(`필요한 ${sheetName} 헤더:`, headers);
          
          // 헤더 순서 및 누락된 컬럼 확인
          const missingHeaders = headers.filter(header => !currentHeaders.includes(header));
          const headerOrderMatches = JSON.stringify(currentHeaders.slice(0, headers.length)) === JSON.stringify(headers);
          
          if (missingHeaders.length > 0 || !headerOrderMatches) {
            console.log(`${sheetName}에 누락된 컬럼들:`, missingHeaders);
            console.log(`${sheetName} 헤더 순서 확인:`, headerOrderMatches ? '일치' : '불일치');
            
            // 전체 헤더를 올바른 순서로 재배치
            // 기존 데이터는 유지하면서 헤더만 정확한 순서로 설정
            const updatedHeaders = [...headers]; // 정확한 순서의 헤더 사용
            
            // 헤더 업데이트
            await sheets.spreadsheets.values.update({
              spreadsheetId,
              range: `${sheetName}!A1:${String.fromCharCode(65 + updatedHeaders.length - 1)}1`,
              valueInputOption: 'USER_ENTERED',
              requestBody: {
                values: [updatedHeaders]
              }
            });
            
            if (missingHeaders.length > 0) {
              updatedSheets.push(`${sheetName} (${missingHeaders.length}개 컬럼 추가: ${missingHeaders.join(', ')})`);
            } else {
              updatedSheets.push(`${sheetName} (헤더 순서 재정렬)`);
            }
            console.log(`✓ ${sheetName} 시트 스키마 업데이트 완료`);
          } else {
            existingSheets.push(sheetName);
            console.log(`${sheetName} 시트는 이미 최신 스키마입니다.`);
          }
        }
        
        // API 제한 방지를 위한 잠시 대기
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch (error) {
        console.error(`✗ ${sheetName} 시트 생성 실패:`, error);
        // 개별 시트 생성 실패해도 계속 진행
      }
    }

    return NextResponse.json({
      success: true,
      message: 'v2 정규화된 시트 동기화가 완료되었습니다.',
      createdSheets,
      existingSheets,
      updatedSheets, // 스키마 업데이트된 시트들 추가
      totalSheets: Object.keys(newSheets).length,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
      nextSteps: [
        createdSheets.length > 0 ? '1. 새로 생성된 시트들을 확인해주세요.' : '',
        updatedSheets.length > 0 ? '2. 스키마가 업데이트된 시트들을 확인해주세요.' : '',
        '3. 이제 v2 구조로 콘텐츠를 저장할 수 있습니다.',
        '4. 기존 데이터는 자동으로 유지됩니다.'
      ].filter(Boolean)
    });

  } catch (error) {
    console.error('v2 시트 생성 중 오류 발생:', error);
    
    return NextResponse.json({
      success: false,
      error: 'v2 시트 생성 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류',
      troubleshooting: [
        '1. Google Sheets API 권한을 확인해주세요.',
        '2. 스프레드시트 ID가 올바른지 확인해주세요.',
        '3. 서비스 계정이 스프레드시트에 편집 권한이 있는지 확인해주세요.'
      ]
    }, { status: 500 });
  }
}