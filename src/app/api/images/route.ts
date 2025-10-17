import { NextRequest, NextResponse } from 'next/server';
import { getImageDataList } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionNumber = searchParams.get('session_number') || undefined;
    const visibleOnly = searchParams.get('visible_only') === 'true';
    const hiddenOnly = searchParams.get('hidden_only') === 'true';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '30', 10);

    const filters: {
      session_number?: string;
      is_visible?: boolean;
    } = {};

    if (sessionNumber) {
      filters.session_number = sessionNumber;
    }

    if (visibleOnly) {
      filters.is_visible = true;
    } else if (hiddenOnly) {
      filters.is_visible = false;
    }

    const images = await getImageDataList(Object.keys(filters).length > 0 ? filters : undefined);

    // 페이지네이션 적용
    const total = images.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedImages = images.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      data: paginatedImages,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
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
