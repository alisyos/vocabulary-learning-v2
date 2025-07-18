import { NextRequest, NextResponse } from 'next/server';
import { getContentSetDetailsV2 } from '@/lib/google-sheets';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const setId = searchParams.get('setId');
    
    if (!setId) {
      return NextResponse.json({
        success: false,
        error: 'setId 파라미터가 필요합니다.',
        version: 'v2'
      }, { status: 400 });
    }

    console.log(`정규화된 구조에서 콘텐츠 세트 상세 정보를 조회합니다: ${setId}`);
    
    // 정규화된 구조에서 상세 데이터 조회
    const details = await getContentSetDetailsV2(setId);
    
    console.log(`✓ 세트 ${setId}의 상세 정보를 성공적으로 조회했습니다.`);
    
    return NextResponse.json({
      success: true,
      data: details,
      version: 'v2',
      message: '정규화된 구조에서 상세 정보를 성공적으로 조회했습니다.',
      structure: {
        contentSet: '기본 정보',
        passage: '지문 데이터 (분리된 테이블)',
        vocabularyTerms: '어휘/용어 데이터 (분리된 테이블)',
        vocabularyQuestions: '어휘 문제 (정규화된 구조)',
        comprehensiveQuestions: '종합 문제 (정규화된 구조)'
      },
      advantages: [
        'JSON 파싱 없이 구조화된 데이터',
        '관계형 DB로 직접 매핑 가능',
        '향후 확장성과 성능 보장'
      ]
    });
    
  } catch (error) {
    console.error('정규화된 구조에서 상세 정보 조회 중 오류:', error);
    
    // 세트를 찾을 수 없는 경우
    if (error instanceof Error && error.message.includes('콘텐츠 세트를 찾을 수 없습니다')) {
      return NextResponse.json({
        success: false,
        error: `콘텐츠 세트를 찾을 수 없습니다: ${searchParams.get('setId')}`,
        details: '정규화된 구조의 content_sets_v2 시트에서 해당 setId를 찾을 수 없습니다.',
        solution: [
          '1. setId가 올바른지 확인하세요.',
          '2. 마이그레이션이 완료되었는지 확인하세요.',
          '3. /api/get-saved-sets-v2 API로 사용 가능한 setId를 확인하세요.'
        ],
        version: 'v2'
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: false,
      error: '정규화된 구조에서 상세 정보를 가져오는 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류',
      version: 'v2'
    }, { status: 500 });
  }
}