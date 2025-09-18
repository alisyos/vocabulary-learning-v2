import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    console.log('Checking status constraint in database...');

    // 1. 현재 content_sets 테이블의 체크 제약조건 확인
    const { data: constraints, error: constraintError } = await supabase
      .rpc('get_check_constraints', {
        table_name: 'content_sets'
      })
      .single();

    if (constraintError) {
      // RPC 함수가 없을 수 있으므로, 직접 SQL 쿼리로 시도
      const { data: sqlConstraints, error: sqlError } = await supabase
        .from('information_schema.check_constraints')
        .select('constraint_name, check_clause')
        .eq('constraint_schema', 'public')
        .like('constraint_name', '%content_sets%status%');

      if (sqlError) {
        console.log('제약조건 직접 조회도 실패, 수동으로 테스트합니다.');

        // 실제로 어떤 값들이 작동하는지 테스트
        const testStatuses = [
          '검수 전',
          '검수전',
          '검수완료',
          '검수 완료',
          '승인완료',
          '승인 완료',
          'pending',
          'review',
          'reviewed',
          'approved',
          'complete'
        ];

        const workingStatuses = [];

        // 먼저 샘플 레코드 하나 가져오기
        const { data: sampleRecord } = await supabase
          .from('content_sets')
          .select('id, status')
          .limit(1)
          .single();

        if (sampleRecord) {
          console.log('현재 저장된 status 예시:', sampleRecord.status);

          // 각 상태값을 테스트 (실제로 업데이트하지 않고 드라이런)
          for (const testStatus of testStatuses) {
            try {
              // 드라이런: 실제로 업데이트하지 않고 유효성만 체크
              const { error: testError } = await supabase
                .from('content_sets')
                .update({ status: testStatus })
                .eq('id', 'test-id-that-does-not-exist')
                .single();

              // 레코드가 없어서 실패한 경우는 상태값은 유효함
              if (testError && testError.code === 'PGRST116') {
                workingStatuses.push(testStatus);
              }
            } catch (e) {
              // 체크 제약조건 위반이 아닌 경우 상태값은 유효할 수 있음
            }
          }
        }

        return NextResponse.json({
          success: false,
          message: '제약조건 정보를 직접 가져올 수 없지만 테스트 결과입니다',
          sampleStatus: sampleRecord?.status,
          possibleStatuses: workingStatuses,
          recommendation: '데이터베이스 관리자에게 content_sets_status_check 제약조건 확인 요청'
        });
      }

      return NextResponse.json({
        success: true,
        constraints: sqlConstraints
      });
    }

    return NextResponse.json({
      success: true,
      constraints
    });

  } catch (error) {
    console.error('체크 제약조건 확인 중 오류:', error);

    // 실제 데이터에서 사용 중인 status 값들 확인
    const { data: actualStatuses, error: statusError } = await supabase
      .from('content_sets')
      .select('status')
      .limit(10);

    if (!statusError && actualStatuses) {
      const uniqueStatuses = [...new Set(actualStatuses.map(item => item.status))];

      return NextResponse.json({
        success: false,
        error: '제약조건을 직접 확인할 수 없습니다',
        actualStatusesInUse: uniqueStatuses,
        message: '현재 데이터베이스에서 사용 중인 상태값들입니다. 이 값들을 사용해보세요.'
      });
    }

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
}