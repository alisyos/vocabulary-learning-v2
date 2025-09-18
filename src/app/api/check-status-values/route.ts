import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    console.log('Checking actual status values in database...');

    // 1. 현재 데이터베이스에서 사용 중인 모든 status 값 확인
    const { data: statusData, error: statusError } = await supabase
      .from('content_sets')
      .select('status')
      .not('status', 'is', null);

    if (statusError) {
      throw statusError;
    }

    // 유니크한 status 값들 추출
    const uniqueStatuses = [...new Set(statusData.map(item => item.status))];

    // 각 status 값의 개수 계산
    const statusCounts: Record<string, number> = {};
    statusData.forEach(item => {
      statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
    });

    // 2. 테스트: 각 값으로 업데이트 시도
    const testResults: Record<string, boolean> = {};
    const testStatuses = ['검수 전', '검수전', '검수완료', '검수 완료', '승인완료', '승인 완료'];

    // 실제 레코드 하나 가져와서 테스트
    const { data: testRecord } = await supabase
      .from('content_sets')
      .select('id, status')
      .limit(1)
      .single();

    if (testRecord) {
      for (const testStatus of testStatuses) {
        try {
          // 실제로 업데이트 시도 (트랜잭션처럼 원복)
          const { error: updateError } = await supabase
            .from('content_sets')
            .update({ status: testStatus })
            .eq('id', testRecord.id);

          testResults[testStatus] = !updateError;

          if (!updateError) {
            // 성공했으면 원래 값으로 복원
            await supabase
              .from('content_sets')
              .update({ status: testRecord.status })
              .eq('id', testRecord.id);
          } else {
            console.log(`Status '${testStatus}' 실패:`, updateError.message);
          }
        } catch (e) {
          testResults[testStatus] = false;
          console.error(`Status '${testStatus}' 테스트 중 오류:`, e);
        }
      }
    }

    return NextResponse.json({
      success: true,
      currentlyUsedStatuses: uniqueStatuses,
      statusCounts,
      testResults,
      recommendation: testResults['검수완료'] && testResults['승인완료']
        ? '검수완료, 승인완료 사용 가능'
        : `사용 가능한 값: ${Object.entries(testResults).filter(([_, v]) => v).map(([k]) => k).join(', ')}`
    });

  } catch (error) {
    console.error('Status 값 확인 중 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
}