import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { setIds, status } = await request.json();

    if (!setIds || !Array.isArray(setIds) || setIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid set IDs' },
        { status: 400 }
      );
    }

    if (!status) {
      return NextResponse.json(
        { success: false, error: 'Status is required' },
        { status: 400 }
      );
    }

    // 유효한 상태값인지 확인
    const validStatuses = ['검수 전', '1차검수', '2차검수', '검수완료', '승인완료', '복제'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status value' },
        { status: 400 }
      );
    }

    console.log(`[일괄 상태변경] 요청 - 대상: ${setIds.length}개, 상태: ${status}`);

    let updatedCount = 0;
    const errors: string[] = [];

    // 각 세트의 상태를 개별적으로 업데이트
    for (const setId of setIds) {
      try {
        const { data, error } = await supabase
          .from('content_sets')
          .update({
            status: status,
            updated_at: new Date().toISOString()
          })
          .eq('id', setId)
          .select();

        if (error) {
          console.error(`[일괄 상태변경] 세트 ${setId} 업데이트 실패:`, error);
          errors.push(`Set ${setId}: ${error.message}`);
        } else if (data && data.length > 0) {
          updatedCount++;
          console.log(`[일괄 상태변경] 세트 ${setId} -> ${status} 완료`);
        } else {
          errors.push(`Set ${setId}: 세트를 찾을 수 없습니다`);
        }
      } catch (error) {
        console.error(`[일괄 상태변경] 세트 ${setId} 처리 중 오류:`, error);
        errors.push(`Set ${setId}: 알 수 없는 오류`);
      }
    }

    console.log(`[일괄 상태변경] 완료 - 성공: ${updatedCount}개, 실패: ${errors.length}개`);

    return NextResponse.json({
      success: true,
      updatedCount,
      totalCount: setIds.length,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    console.error('Batch update status error:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}