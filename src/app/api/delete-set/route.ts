import { NextRequest, NextResponse } from 'next/server';
import { getGoogleSheetsClient } from '@/lib/google-sheets';

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const setId = searchParams.get('setId');
    
    if (!setId) {
      return NextResponse.json({
        success: false,
        error: 'setId 파라미터가 필요합니다.'
      }, { status: 400 });
    }

    console.log(`콘텐츠 세트 삭제 시작: ${setId}`);
    
    const sheets = await getGoogleSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    
    if (!spreadsheetId) {
      return NextResponse.json({
        success: false,
        error: 'Google Sheets 설정이 올바르지 않습니다.'
      }, { status: 500 });
    }

    const deletedFromSheets: string[] = [];
    const errors: string[] = [];

    // v1 구조에서 삭제 (final_sets)
    try {
      const finalSetsData = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'final_sets!A:B'
      });

      const rows = finalSetsData.data.values || [];
      const targetRowIndex = rows.findIndex((row, index) => 
        index > 0 && row[1] === setId // setId는 B열 (인덱스 1)
      );

      if (targetRowIndex > 0) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [{
              deleteDimension: {
                range: {
                  sheetId: 0, // final_sets 시트 ID (보통 첫 번째 시트는 0)
                  dimension: 'ROWS',
                  startIndex: targetRowIndex,
                  endIndex: targetRowIndex + 1
                }
              }
            }]
          }
        });
        deletedFromSheets.push('final_sets');
      }
    } catch (error) {
      console.error('final_sets 삭제 중 오류:', error);
      errors.push(`final_sets: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }

    // v2 구조에서 삭제 (content_sets_v2, passages_v2, vocabulary_terms_v2, etc.)
    const v2Sheets = [
      'content_sets_v2',
      'passages_v2', 
      'vocabulary_terms_v2',
      'vocabulary_questions_v2',
      'comprehensive_questions_v2',
      'ai_generation_logs_v2'
    ];

    for (const sheetName of v2Sheets) {
      try {
        const sheetData = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${sheetName}!A:B`
        });

        const rows = sheetData.data.values || [];
        const rowsToDelete: number[] = [];

        // content_sets_v2는 set_id(B열), 나머지는 content_set_id(B열)에서 찾기
        rows.forEach((row, index) => {
          if (index > 0 && row[1] === setId) {
            rowsToDelete.push(index);
          }
        });

        // 역순으로 삭제 (인덱스 변경 방지)
        for (const rowIndex of rowsToDelete.reverse()) {
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
              requests: [{
                deleteDimension: {
                  range: {
                    sheetId: await getSheetId(sheets, spreadsheetId, sheetName),
                    dimension: 'ROWS',
                    startIndex: rowIndex,
                    endIndex: rowIndex + 1
                  }
                }
              }]
            }
          });
        }

        if (rowsToDelete.length > 0) {
          deletedFromSheets.push(`${sheetName} (${rowsToDelete.length}개 행)`);
        }
      } catch (error) {
        console.error(`${sheetName} 삭제 중 오류:`, error);
        errors.push(`${sheetName}: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
      }
    }

    console.log(`콘텐츠 세트 ${setId} 삭제 완료`);

    return NextResponse.json({
      success: true,
      setId,
      message: '콘텐츠 세트가 성공적으로 삭제되었습니다.',
      deletedFrom: deletedFromSheets,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('콘텐츠 세트 삭제 중 오류:', error);
    return NextResponse.json({
      success: false,
      error: '콘텐츠 세트 삭제 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
}

// 시트 ID를 가져오는 헬퍼 함수
async function getSheetId(sheets: Awaited<ReturnType<typeof getGoogleSheetsClient>>, spreadsheetId: string, sheetName: string): Promise<number> {
  try {
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = spreadsheet.data.sheets?.find((s) => s.properties?.title === sheetName);
    return sheet?.properties?.sheetId || 0;
  } catch (error) {
    console.error(`시트 ID 조회 실패 (${sheetName}):`, error);
    return 0; // 기본값
  }
} 