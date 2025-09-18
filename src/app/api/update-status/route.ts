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

    console.log('상태 변경 요청 받음:', { setId, status });

    // 입력값 검증
    if (!setId || !status) {
      console.error('필수 파라미터 누락:', { setId, status });
      return NextResponse.json({
        success: false,
        error: 'setId와 status가 필요합니다.'
      }, { status: 400 });
    }

    if (status !== '검수 전' && status !== '검수완료' && status !== '승인완료') {
      return NextResponse.json({
        success: false,
        error: '올바르지 않은 상태값입니다. "검수 전", "검수완료" 또는 "승인완료"만 가능합니다.'
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
      // updated_at 필드를 제거하고 status만 업데이트
      const updatedContentSet = await db.updateContentSet(setId, {
        status: status
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

      // 더 상세한 에러 정보 추출
      let errorDetails = '알 수 없는 오류';
      if (updateError instanceof Error) {
        errorDetails = updateError.message;
        // Supabase 에러인 경우 더 상세한 정보 포함
        if ('code' in updateError) {
          errorDetails += ` (코드: ${(updateError as any).code})`;
        }
        if ('hint' in updateError) {
          errorDetails += ` (힌트: ${(updateError as any).hint})`;
        }
      }

      return NextResponse.json({
        success: false,
        error: 'Supabase에서 상태값 업데이트 중 오류가 발생했습니다.',
        details: errorDetails,
        setId,
        attemptedStatus: status
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