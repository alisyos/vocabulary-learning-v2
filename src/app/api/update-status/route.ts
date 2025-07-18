import { NextRequest, NextResponse } from 'next/server';
import { getGoogleSheetsClient } from '@/lib/google-sheets';
import { ContentStatus } from '@/types';

interface UpdateStatusRequest {
  setId: string;
  status: ContentStatus;
}

export async function POST(request: NextRequest) {
  try {
    const body: UpdateStatusRequest = await request.json();
    const { setId, status } = body;

    // 입력값 검증
    if (!setId || !status) {
      return NextResponse.json({
        success: false,
        error: 'setId와 status가 필요합니다.'
      }, { status: 400 });
    }

    if (status !== '검수 전' && status !== '검수완료') {
      return NextResponse.json({
        success: false,
        error: '올바르지 않은 상태값입니다. "검수 전" 또는 "검수완료"만 가능합니다.'
      }, { status: 400 });
    }

    const sheets = await getGoogleSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID is not configured');
    }

    // content_sets_v2 시트에서 해당 setId의 행 찾기
    const range = 'content_sets_v2!A:R'; // 전체 데이터 범위 (created_by 제거로 R열까지)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values || [];
    
    if (rows.length <= 1) {
      return NextResponse.json({
        success: false,
        error: '저장된 콘텐츠가 없습니다.'
      }, { status: 404 });
    }

    // 헤더 행 제외하고 데이터 찾기
    const dataRows = rows.slice(1);
    const setIdColumnIndex = 1; // B열: set_id

    // 해당 setId의 행 인덱스 찾기
    const targetRowIndex = dataRows.findIndex(row => row[setIdColumnIndex] === setId);
    
    if (targetRowIndex === -1) {
      return NextResponse.json({
        success: false,
        error: `setId '${setId}'에 해당하는 콘텐츠를 찾을 수 없습니다.`
      }, { status: 404 });
    }

    // 실제 시트에서의 행 번호 (헤더 포함하여 +2)
    const actualRowNumber = targetRowIndex + 2;
    const timestamp = new Date().toISOString();

    // 상태값과 updated_at 업데이트
    const updateRanges = [
      {
        range: `content_sets_v2!P${actualRowNumber}`, // status 컬럼 (created_by 제거로 P열로 변경)
        values: [[status]]
      },
      {
        range: `content_sets_v2!R${actualRowNumber}`, // updated_at 컬럼
        values: [[timestamp]]
      }
    ];

    // 배치 업데이트 실행
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: updateRanges
      }
    });

    return NextResponse.json({
      success: true,
      message: `콘텐츠 상태가 '${status}'로 변경되었습니다.`,
      setId,
      status,
      updatedAt: timestamp
    });

  } catch (error) {
    console.error('상태 업데이트 API 오류:', error);
    return NextResponse.json({
      success: false,
      error: '서버 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
} 