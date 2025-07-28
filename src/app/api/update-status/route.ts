import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../lib/supabase';
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

    console.log(`Supabase에서 상태값 변경 시작: ${setId} -> ${status}`);

    // 1. 먼저 콘텐츠 세트가 존재하는지 확인
    const existingContentSet = await db.getContentSetById(setId);
    
    if (!existingContentSet) {
      return NextResponse.json({
        success: false,
        error: `setId '${setId}'에 해당하는 콘텐츠를 찾을 수 없습니다.`
      }, { status: 404 });
    }

    // 2. Supabase에서 상태값 업데이트
    try {
      const updatedContentSet = await db.updateContentSet(setId, {
        status: status,
        updated_at: new Date().toISOString()
      });

      console.log(`✅ Supabase에서 상태값 변경 완료: ${setId} -> ${status}`);

      return NextResponse.json({
        success: true,
        message: `콘텐츠 상태가 '${status}'로 변경되었습니다.`,
        setId,
        status,
        updatedAt: updatedContentSet.updated_at,
        contentSet: updatedContentSet
      });

    } catch (updateError) {
      console.error('Supabase 상태값 업데이트 중 오류:', updateError);
      return NextResponse.json({
        success: false,
        error: 'Supabase에서 상태값 업데이트 중 오류가 발생했습니다.',
        details: updateError instanceof Error ? updateError.message : '알 수 없는 오류'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('상태 업데이트 API 오류:', error);
    return NextResponse.json({
      success: false,
      error: '서버 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
} 