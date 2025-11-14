import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionNumber = searchParams.get('session_number') || undefined;
    const visibleOnly = searchParams.get('visible_only') === 'true';
    const hiddenOnly = searchParams.get('hidden_only') === 'true';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '30', 10);

    // Supabase 쿼리 구성
    let query = supabase.from('image_data').select('*', { count: 'exact' });

    // 상태 필터링
    if (visibleOnly) {
      query = query.eq('is_visible', true);
    } else if (hiddenOnly) {
      query = query.eq('is_visible', false);
    }

    // 정렬
    query = query.order('created_at', { ascending: false });

    const { data: allImages, error, count: totalCount } = await query;

    if (error) {
      console.error('Supabase 쿼리 오류:', error);
      throw error;
    }

    // 차시 필터링 (JavaScript에서 정수 비교)
    let filteredImages = allImages || [];
    if (sessionNumber) {
      const rangeMatch = sessionNumber.match(/^(\d+)-(\d+)$/);
      if (rangeMatch) {
        // 범위: "1-50" → 1부터 50까지
        const start = parseInt(rangeMatch[1], 10);
        const end = parseInt(rangeMatch[2], 10);
        filteredImages = filteredImages.filter(img => {
          const sessionNum = parseInt(img.session_number, 10);
          return !isNaN(sessionNum) && sessionNum >= start && sessionNum <= end;
        });
      } else {
        // 단일 값: "10" → 10만
        const singleValue = parseInt(sessionNumber, 10);
        if (!isNaN(singleValue)) {
          filteredImages = filteredImages.filter(img => {
            const sessionNum = parseInt(img.session_number, 10);
            return sessionNum === singleValue;
          });
        }
      }
    }

    // 페이지네이션 (필터링 후)
    const total = filteredImages.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedImages = filteredImages.slice(offset, offset + limit);

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
