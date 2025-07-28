import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../lib/supabase';

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const setId = searchParams.get('setId');
    
    if (!setId) {
      return NextResponse.json({
        success: false,
        error: 'setId 파라미터가 필요합니다.'
      }, { status: 400 });
    }

    console.log(`Supabase에서 콘텐츠 세트 삭제 시작: ${setId}`);
    
    // 1. 먼저 콘텐츠 세트가 존재하는지 확인
    const contentSet = await db.getContentSetById(setId);
    
    if (!contentSet) {
      return NextResponse.json({
        success: false,
        error: '삭제하려는 콘텐츠 세트를 찾을 수 없습니다.'
      }, { status: 404 });
    }

    // 2. 상태 확인 (검수완료 상태는 삭제 불가)
    if (contentSet.status === '검수완료') {
      return NextResponse.json({
        success: false,
        error: '검수완료 상태의 콘텐츠는 삭제할 수 없습니다. 먼저 상태를 "검수 전"으로 변경해주세요.'
      }, { status: 403 });
    }

    // 3. Supabase에서 삭제 (CASCADE 설정으로 관련 데이터 자동 삭제됨)
    try {
      await db.deleteContentSet(setId);
      
      console.log(`✅ Supabase에서 콘텐츠 세트 ${setId} 삭제 완료`);

      return NextResponse.json({
        success: true,
        setId,
        message: '콘텐츠 세트가 성공적으로 삭제되었습니다.',
        deletedFrom: ['supabase'],
        details: {
          deletedContentSet: contentSet.title,
          deletedAt: new Date().toISOString()
        }
      });

    } catch (deleteError) {
      console.error('Supabase 삭제 중 오류:', deleteError);
      return NextResponse.json({
        success: false,
        error: 'Supabase에서 콘텐츠 삭제 중 오류가 발생했습니다.',
        details: deleteError instanceof Error ? deleteError.message : '알 수 없는 오류'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('콘텐츠 세트 삭제 중 오류:', error);
    return NextResponse.json({
      success: false,
      error: '콘텐츠 세트 삭제 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
} 