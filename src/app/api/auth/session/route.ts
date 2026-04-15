import { NextRequest, NextResponse } from 'next/server';
import { User } from '@/types';

// 세션 검증용 계정 버전 정보 (login/route.ts의 ACCOUNTS와 동기화 필요)
const ACCOUNT_VERSIONS: Record<string, number> = {
  'song': 1,
  'user1': 1,
  'user2': 1,
  'user3': 1,
  'user4': 1,
  'user5': 1,
  'ahn': 1,
  'kang': 1,
  'test': 1,
  'almond': 2,
};

function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set('session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/'
  });
  return response;
}

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session');

    if (!sessionCookie) {
      return NextResponse.json({
        success: false,
        user: null,
        message: '로그인이 필요합니다.'
      });
    }

    const user: User & { passwordVersion?: number } = JSON.parse(sessionCookie.value);

    // passwordVersion 검증: 계정이 삭제되었거나 버전이 불일치하면 세션 무효화
    const currentVersion = ACCOUNT_VERSIONS[user.userId];
    if (currentVersion === undefined || user.passwordVersion !== currentVersion) {
      const response = NextResponse.json({
        success: false,
        user: null,
        message: '세션이 만료되었습니다. 다시 로그인해주세요.'
      });
      return clearSessionCookie(response);
    }

    return NextResponse.json({
      success: true,
      user,
      message: '세션이 유효합니다.'
    });

  } catch (error) {
    console.error('세션 확인 API 오류:', error);
    return NextResponse.json({
      success: false,
      user: null,
      message: '세션 확인 중 오류가 발생했습니다.'
    }, { status: 500 });
  }
} 