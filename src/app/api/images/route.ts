import { NextRequest, NextResponse } from 'next/server';
import { getImageDataList } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionNumber = searchParams.get('session_number') || undefined;

    const filters = sessionNumber ? { session_number: sessionNumber } : undefined;

    const images = await getImageDataList(filters);

    return NextResponse.json({
      success: true,
      data: images,
      total: images.length
    });
  } catch (error) {
    console.error('이미지 목록 조회 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: '이미지 목록 조회 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
