import { NextResponse } from 'next/server';
import { getGoogleSheetsClient } from '@/lib/google-sheets';

export async function POST() {
  try {
    console.log('Updating final_sets sheet schema...');
    
    const sheets = await getGoogleSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    
    if (!spreadsheetId) {
      return NextResponse.json({
        success: false,
        error: 'GOOGLE_SHEETS_SPREADSHEET_ID가 설정되지 않았습니다.'
      }, { status: 400 });
    }

    // 현재 final_sets 시트의 헤더 확인
    const currentData = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'final_sets!1:1'
    });

    const currentHeaders = currentData.data.values?.[0] || [];
    console.log('Current headers:', currentHeaders);

    // 새로운 헤더가 이미 있는지 확인
    if (currentHeaders.includes('paragraphCount') && currentHeaders.includes('vocabularyWordsCount')) {
      return NextResponse.json({
        success: true,
        message: '스키마가 이미 최신 상태입니다.',
        currentHeaders
      });
    }

    // 새로운 헤더 추가
    const updatedHeaders = [...currentHeaders];
    
    if (!updatedHeaders.includes('paragraphCount')) {
      updatedHeaders.push('paragraphCount');
    }
    
    if (!updatedHeaders.includes('vocabularyWordsCount')) {
      updatedHeaders.push('vocabularyWordsCount');
    }

    // 헤더 업데이트
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `final_sets!A1:${String.fromCharCode(65 + updatedHeaders.length - 1)}1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [updatedHeaders]
      }
    });

    console.log('Schema updated successfully');

    return NextResponse.json({
      success: true,
      message: 'final_sets 시트 스키마가 성공적으로 업데이트되었습니다.',
      oldHeaders: currentHeaders,
      newHeaders: updatedHeaders,
      addedColumns: updatedHeaders.slice(currentHeaders.length)
    });

  } catch (error) {
    console.error('Error updating sheet schema:', error);
    return NextResponse.json({
      success: false,
      error: '시트 스키마 업데이트 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
} 