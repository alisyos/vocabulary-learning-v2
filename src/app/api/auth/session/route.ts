import { NextRequest, NextResponse } from 'next/server';
import { User } from '@/types';

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

    const user: User = JSON.parse(sessionCookie.value);
    
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