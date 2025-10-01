import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * 이미지 스토리지 설정 API
 *
 * 1. image_data 테이블 생성
 * 2. images Storage 버킷 생성 (public)
 */
export async function POST() {
  try {
    const results: string[] = [];
    const errors: string[] = [];

    // 1. image_data 테이블 생성
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS image_data (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        session_number TEXT,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL UNIQUE,
        file_size INTEGER,
        mime_type TEXT,
        source TEXT,
        memo TEXT,
        uploaded_by TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 인덱스 생성
      CREATE INDEX IF NOT EXISTS idx_image_data_session_number ON image_data(session_number);
      CREATE INDEX IF NOT EXISTS idx_image_data_created_at ON image_data(created_at DESC);

      -- updated_at 자동 업데이트 트리거
      CREATE OR REPLACE FUNCTION update_image_data_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trigger_update_image_data_updated_at ON image_data;
      CREATE TRIGGER trigger_update_image_data_updated_at
        BEFORE UPDATE ON image_data
        FOR EACH ROW
        EXECUTE FUNCTION update_image_data_updated_at();
    `;

    const { error: tableError } = await supabase.rpc('exec_sql', {
      sql: createTableSQL
    });

    if (tableError) {
      // RPC 함수가 없을 경우 직접 테이블 생성 시도
      console.warn('RPC exec_sql 함수를 사용할 수 없습니다. Supabase 대시보드에서 수동으로 테이블을 생성해주세요.');
      errors.push(`테이블 생성 실패: ${tableError.message}`);
    } else {
      results.push('✅ image_data 테이블 생성 완료');
    }

    // 2. Storage 버킷 상태 확인
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

    if (bucketsError) {
      errors.push(`Storage 버킷 조회 실패: ${bucketsError.message}`);
    } else {
      const imagesBucket = buckets.find(b => b.name === 'images');

      if (!imagesBucket) {
        // 버킷 생성
        const { error: createBucketError } = await supabase.storage.createBucket('images', {
          public: true, // 공개 버킷으로 설정
          fileSizeLimit: 31457280, // 30MB
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
        });

        if (createBucketError) {
          errors.push(`Storage 버킷 생성 실패: ${createBucketError.message}`);
        } else {
          results.push('✅ images Storage 버킷 생성 완료 (public)');
        }
      } else {
        results.push('ℹ️ images Storage 버킷이 이미 존재합니다');
      }
    }

    // 결과 반환
    if (errors.length > 0) {
      return NextResponse.json({
        success: false,
        message: '일부 설정 중 오류가 발생했습니다',
        results,
        errors,
        manualSteps: [
          '1. Supabase 대시보드 > SQL Editor로 이동',
          '2. 다음 SQL을 실행하여 테이블 생성:',
          createTableSQL,
          '3. Storage > Create a new bucket > "images" 버킷 생성 (Public)',
          '4. Storage > images > Policies > Insert, Update, Delete 정책 생성 (authenticated users)'
        ]
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '이미지 스토리지 설정이 완료되었습니다',
      results,
      nextSteps: [
        '✅ 모든 설정이 완료되었습니다',
        '🖼️ /image-admin 페이지에서 이미지를 업로드할 수 있습니다',
        '📊 Supabase 대시보드에서 image_data 테이블과 images 버킷을 확인하세요'
      ]
    });
  } catch (error) {
    console.error('이미지 스토리지 설정 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: '이미지 스토리지 설정 중 오류가 발생했습니다',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
