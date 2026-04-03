import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { historyId, contentSetId } = await request.json();

    if (!historyId || !contentSetId) {
      return NextResponse.json(
        { success: false, message: 'historyId와 contentSetId는 필수입니다.' },
        { status: 400 }
      );
    }

    // 1. 복원 전 현재 상태 백업
    try {
      await db.createContentSetSnapshot(contentSetId, '복원 전 자동 백업');
      console.log('📸 복원 전 스냅샷 저장 완료');
    } catch (snapshotError) {
      console.error('⚠️ 복원 전 스냅샷 저장 실패:', snapshotError);
      // 백업 실패 시에도 복원은 계속 진행
    }

    // 2. 히스토리 레코드 조회
    const historyRecord = await db.getContentSetSnapshot(historyId);
    if (!historyRecord) {
      return NextResponse.json(
        { success: false, message: '히스토리 레코드를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 3. 스냅샷으로 복원
    await db.restoreFromSnapshot(contentSetId, historyRecord.snapshot);

    console.log(`✅ 콘텐츠 세트 ${contentSetId} 복원 완료 (v${historyRecord.version_number})`);

    return NextResponse.json({
      success: true,
      message: `v${historyRecord.version_number} 버전으로 복원되었습니다.`,
      restoredVersion: historyRecord.version_number
    });
  } catch (error) {
    console.error('복원 오류:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : '복원 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
