import { NextRequest, NextResponse } from 'next/server';
import { LoginRequest, LoginResponse, Account } from '@/types';

// 계정 정보 및 권한 설정
interface AccountWithRole extends Account {
  role?: 'admin' | 'reviewer' | 'user';
}

// 하드코딩된 계정 정보
const ACCOUNTS: AccountWithRole[] = [
  { userId: 'song', password: '0000', name: '송선생님', role: 'admin' },
  { userId: 'user1', password: '1111', name: '사용자1', role: 'admin' },
  { userId: 'user2', password: '2222', name: '사용자2', role: 'admin' },
  { userId: 'user3', password: '3333', name: '사용자3', role: 'admin' },
  { userId: 'user4', password: '4444', name: '사용자4', role: 'admin' },
  { userId: 'user5', password: '5555', name: '사용자5', role: 'admin' },
  { userId: 'ahn', password: '0000', name: '안선생님', role: 'admin' },
  { userId: 'kang', password: '4321', name: '강선생님', role: 'admin' },
  { userId: 'test', password: '0000', name: '테스트계정', role: 'admin' },
  { userId: 'almond', password: 'almond11@', name: '검수담당자', role: 'reviewer' },
];

export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json();
    const { userId, password } = body;

    // 계정 확인
    const account = ACCOUNTS.find(acc => acc.userId === userId && acc.password === password);
    
    if (!account) {
      const response: LoginResponse = {
        success: false,
        message: '아이디 또는 비밀번호가 올바르지 않습니다.'
      };
      return NextResponse.json(response, { status: 401 });
    }

    // 세션 생성 (쿠키 기반)
    const user = {
      userId: account.userId,
      name: account.name,
      isLoggedIn: true,
      role: account.role || 'user'
    };

    // 역할별 기본 리다이렉트 URL 설정
    let redirectUrl = '/';
    if (account.role === 'reviewer') {
      redirectUrl = '/db-admin/review';
    }

    const response: LoginResponse = {
      success: true,
      user,
      message: '로그인에 성공했습니다.',
      redirectUrl
    };

    const nextResponse = NextResponse.json(response);
    
    // 세션 쿠키 설정 (보안 옵션 포함)
    nextResponse.cookies.set('session', JSON.stringify(user), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7일
      path: '/'
    });

    return nextResponse;

  } catch (error) {
    console.error('로그인 API 오류:', error);
    const response: LoginResponse = {
      success: false,
      message: '서버 오류가 발생했습니다.'
    };
    return NextResponse.json(response, { status: 500 });
  }
} 