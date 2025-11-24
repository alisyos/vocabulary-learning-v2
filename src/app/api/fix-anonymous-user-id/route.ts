import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { dryRun = true, newUserId = 'user1' } = await request.json();

    console.log('🚀 anonymous user_id 수정 시작...');
    console.log(`📋 모드: ${dryRun ? '드라이런 (미리보기)' : '실제 업데이트'}`);
    console.log(`👤 변경할 user_id: anonymous → ${newUserId}`);

    // 1. anonymous인 레코드 개수 조회
    const { count, error: countError } = await supabase
      .from('content_sets')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', 'anonymous');

    if (countError) {
      console.error('❌ 레코드 개수 조회 실패:', countError);
      throw countError;
    }

    console.log(`📊 anonymous user_id를 가진 레코드: ${count}개`);

    // 2. 드라이런 모드
    if (dryRun) {
      // 샘플 레코드 조회
      const { data: samples, error: sampleError } = await supabase
        .from('content_sets')
        .select('id, title, main_topic, sub_topic, user_id, created_at')
        .eq('user_id', 'anonymous')
        .limit(10);

      if (sampleError) {
        console.error('❌ 샘플 조회 실패:', sampleError);
        throw sampleError;
      }

      return NextResponse.json({
        success: true,
        dryRun: true,
        message: `드라이런 모드: ${count}개 레코드가 'anonymous' → '${newUserId}'로 변경됩니다.`,
        stats: {
          totalAnonymous: count,
          newUserId
        },
        samples: samples || []
      });
    }

    // 3. 실제 업데이트
    console.log('💾 실제 업데이트 시작...');

    const { data, error: updateError } = await supabase
      .from('content_sets')
      .update({ user_id: newUserId })
      .eq('user_id', 'anonymous')
      .select();

    if (updateError) {
      console.error('❌ 업데이트 실패:', updateError);
      throw updateError;
    }

    const updatedCount = data?.length || 0;
    console.log(`🎉 업데이트 완료: ${updatedCount}개 레코드`);

    return NextResponse.json({
      success: true,
      dryRun: false,
      message: `업데이트 완료: ${updatedCount}개 레코드를 'anonymous' → '${newUserId}'로 변경했습니다.`,
      stats: {
        updatedCount,
        newUserId
      }
    });

  } catch (error) {
    console.error('❌ 일괄 수정 중 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      details: error instanceof Error ? error.stack : String(error)
    }, { status: 500 });
  }
}
