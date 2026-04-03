import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contentSetId = searchParams.get('contentSetId');
    const historyId = searchParams.get('historyId');

    // 단건 스냅샷 상세 조회
    if (historyId) {
      const snapshot = await db.getContentSetSnapshot(historyId);
      if (!snapshot) {
        return NextResponse.json(
          { success: false, message: '히스토리 레코드를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, snapshot: snapshot.snapshot });
    }

    // 목록 조회
    if (!contentSetId) {
      return NextResponse.json(
        { success: false, message: 'contentSetId 또는 historyId는 필수입니다.' },
        { status: 400 }
      );
    }

    const history = await db.getContentSetHistory(contentSetId);

    return NextResponse.json({ success: true, history });
  } catch (error) {
    console.error('히스토리 조회 오류:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : '알 수 없는 오류' },
      { status: 500 }
    );
  }
}
