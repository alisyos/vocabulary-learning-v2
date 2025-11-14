import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import archiver from 'archiver';
import { Readable } from 'stream';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionNumberParam = searchParams.get('sessionNumber');
  const visibilityParam = searchParams.get('visibility');

  try {
    // 1. 필터링된 이미지 목록 조회
    let query = supabase.from('image_data').select('*');

    // 상태 필터링 (is_visible)
    if (visibilityParam === 'visible') {
      query = query.eq('is_visible', true);
    } else if (visibilityParam === 'hidden') {
      query = query.eq('is_visible', false);
    }

    // 정렬
    query = query.order('created_at', { ascending: false });

    const { data: allImages, error: imagesError } = await query;

    if (imagesError) {
      console.error('Error fetching images:', imagesError);
      return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 });
    }

    // 차시 필터링 (JavaScript에서 정수 비교)
    let images = allImages || [];
    if (sessionNumberParam) {
      const rangeMatch = sessionNumberParam.match(/^(\d+)-(\d+)$/);
      if (rangeMatch) {
        // 범위: "1-50" → 1부터 50까지
        const start = parseInt(rangeMatch[1], 10);
        const end = parseInt(rangeMatch[2], 10);
        images = images.filter(img => {
          const sessionNum = parseInt(img.session_number, 10);
          return !isNaN(sessionNum) && sessionNum >= start && sessionNum <= end;
        });
      } else {
        // 단일 값: "10" → 10만
        const singleValue = parseInt(sessionNumberParam, 10);
        if (!isNaN(singleValue)) {
          images = images.filter(img => {
            const sessionNum = parseInt(img.session_number, 10);
            return sessionNum === singleValue;
          });
        }
      }
    }

    if (!images || images.length === 0) {
      return NextResponse.json({ error: 'No images found with the specified filters' }, { status: 404 });
    }

    console.log(`Found ${images.length} images to download`);

    // 2. ZIP 파일 생성
    const archive = archiver('zip', {
      zlib: { level: 9 } // 최대 압축
    });

    // 에러 핸들링
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      throw err;
    });

    // 3. 각 이미지 파일 다운로드 및 ZIP에 추가
    let successCount = 0;
    let failCount = 0;

    for (const image of images) {
      try {
        // Supabase Storage에서 이미지 파일 다운로드
        const { data: fileData, error: downloadError } = await supabase
          .storage
          .from('images')
          .download(image.file_path);

        if (downloadError || !fileData) {
          console.error(`Failed to download ${image.file_name}:`, downloadError);
          failCount++;
          continue;
        }

        // ArrayBuffer를 Buffer로 변환
        const buffer = Buffer.from(await fileData.arrayBuffer());

        // 파일명에 차시 번호 포함 (session_number가 정수인 경우)
        let fileName = image.file_name;
        if (image.session_number !== null && image.session_number !== undefined) {
          // 확장자 분리
          const lastDotIndex = fileName.lastIndexOf('.');
          const name = lastDotIndex > -1 ? fileName.substring(0, lastDotIndex) : fileName;
          const ext = lastDotIndex > -1 ? fileName.substring(lastDotIndex) : '';

          // 차시_파일명.확장자 형식 (예: 15_image.png)
          fileName = `${image.session_number}_${name}${ext}`;
        }

        // ZIP 파일에 추가
        archive.append(buffer, { name: fileName });
        successCount++;

      } catch (error) {
        console.error(`Error processing ${image.file_name}:`, error);
        failCount++;
      }
    }

    console.log(`Successfully added ${successCount} images to ZIP (${failCount} failed)`);

    if (successCount === 0) {
      return NextResponse.json({ error: 'Failed to download any images' }, { status: 500 });
    }

    // 4. ZIP 파일 완료
    archive.finalize();

    // 5. ZIP 파일명 생성
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    let filename = 'images';
    if (sessionNumberParam) {
      // 범위 필터의 경우 그대로 사용 (예: "1-50"), 단일 값도 그대로 사용 (예: "10")
      filename += `_session_${sessionNumberParam}`;
    }
    if (visibilityParam && visibilityParam !== 'all') {
      filename += `_${visibilityParam}`;
    }
    filename += `_${timestamp}.zip`;

    // 6. ReadableStream으로 변환하여 응답
    const readableStream = Readable.toWeb(archive as unknown as Readable) as ReadableStream;

    return new NextResponse(readableStream, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      },
    });

  } catch (error) {
    console.error('Error downloading images:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
