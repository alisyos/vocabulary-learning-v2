import { NextRequest, NextResponse } from 'next/server';
import { getImageDataById, updateImageData, deleteImageData } from '@/lib/supabase';

// 이미지 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const imageData = await getImageDataById(params.id);

    if (!imageData) {
      return NextResponse.json(
        { success: false, error: '이미지를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: imageData
    });
  } catch (error) {
    console.error('이미지 조회 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: '이미지 조회 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// 이미지 메타데이터 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { session_number, source, memo } = body;

    const updatedImage = await updateImageData(params.id, {
      session_number,
      source,
      memo
    });

    return NextResponse.json({
      success: true,
      data: updatedImage,
      message: '이미지 정보가 수정되었습니다.'
    });
  } catch (error) {
    console.error('이미지 수정 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: '이미지 수정 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// 이미지 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 먼저 이미지 데이터 조회 (file_path 필요)
    const imageData = await getImageDataById(params.id);

    if (!imageData) {
      return NextResponse.json(
        { success: false, error: '이미지를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // Storage 파일 및 DB 메타데이터 삭제
    await deleteImageData(params.id, imageData.file_path);

    return NextResponse.json({
      success: true,
      message: '이미지가 삭제되었습니다.'
    });
  } catch (error) {
    console.error('이미지 삭제 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: '이미지 삭제 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
