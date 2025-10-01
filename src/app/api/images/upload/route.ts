import { NextRequest, NextResponse } from 'next/server';
import { createImageData, uploadImageToStorage } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const file = formData.get('file') as File;
    const sessionNumber = formData.get('session_number') as string || null;
    const source = formData.get('source') as string || '';
    const memo = formData.get('memo') as string || '';

    if (!file) {
      return NextResponse.json(
        { success: false, error: '파일이 제공되지 않았습니다.' },
        { status: 400 }
      );
    }

    // 파일 형식 검증
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: '이미지 파일만 업로드할 수 있습니다.' },
        { status: 400 }
      );
    }

    // 파일 크기 검증 (30MB 제한)
    const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: '파일 크기는 30MB를 초과할 수 없습니다.' },
        { status: 400 }
      );
    }

    // 파일명 생성 (UUID + 원본 확장자)
    const fileExtension = file.name.split('.').pop();
    const uniqueFileName = `${uuidv4()}.${fileExtension}`;

    // 1. Storage에 파일 업로드
    const filePath = await uploadImageToStorage(file, uniqueFileName);

    // 2. DB에 메타데이터 저장
    const imageData = await createImageData({
      session_number: sessionNumber,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.type,
      source: source,
      memo: memo,
      uploaded_by: 'system' // TODO: 실제 사용자 ID로 교체
    });

    return NextResponse.json({
      success: true,
      data: imageData,
      message: '이미지가 성공적으로 업로드되었습니다.'
    });
  } catch (error) {
    console.error('이미지 업로드 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: '이미지 업로드 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
