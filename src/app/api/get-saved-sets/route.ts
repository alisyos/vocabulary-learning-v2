import { NextRequest, NextResponse } from 'next/server';
import { getContentSetsV2 } from '@/lib/google-sheets';

export async function GET(request: NextRequest) {
  try {
    console.log('정규화된 구조에서 콘텐츠 세트 목록을 조회합니다...');
    
    // URL 파라미터에서 필터 옵션 추출
    const { searchParams } = new URL(request.url);
    const subject = searchParams.get('subject');
    const grade = searchParams.get('grade');
    const area = searchParams.get('area');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    
    const filters = {
      ...(subject && { subject }),
      ...(grade && { grade }),
      ...(area && { area }),
      ...(limit && { limit })
    };

    // 정규화된 구조에서 데이터 조회
    const result = await getContentSetsV2(filters);
    
    if (result.total === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        total: 0,
        message: '저장된 데이터가 없습니다. 먼저 마이그레이션을 실행하거나 새로운 v2 API로 데이터를 저장해주세요.',
        version: 'v2'
      });
    }
    
    console.log(`✓ 정규화된 구조에서 ${result.total}개 세트를 찾았습니다.`);
    
    return NextResponse.json({
      success: true,
      data: result.data,
      stats: result.stats,
      total: result.total,
      filtered: result.data.length,
      filters,
      version: 'v2',
      message: '정규화된 구조에서 데이터를 성공적으로 조회했습니다.',
      advantages: [
        '향후 DB 전환 시 직접 매핑 가능',
        'JSON 파싱 없이 빠른 데이터 조회',
        '관계형 구조로 데이터 무결성 보장'
      ]
    });
    
  } catch (error) {
    console.error('정규화된 구조에서 데이터 조회 중 오류:', error);
    
    // content_sets_v2 시트가 없는 경우 안내 메시지
    if (error instanceof Error && error.message.includes('content_sets_v2')) {
      return NextResponse.json({
        success: false,
        error: 'content_sets_v2 시트를 찾을 수 없습니다.',
        details: '정규화된 구조의 시트가 아직 생성되지 않았습니다.',
        solution: [
          '1. /api/migrate-sheets API를 호출하여 마이그레이션을 실행하세요.',
          '2. 또는 /api/save-final-v2 API를 사용하여 새로운 데이터를 저장하세요.',
          '3. 기존 데이터를 조회하려면 /api/get-saved-sets API를 사용하세요.'
        ],
        version: 'v2'
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: false,
      error: '정규화된 구조에서 데이터를 가져오는 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류',
      version: 'v2'
    }, { status: 500 });
  }
}