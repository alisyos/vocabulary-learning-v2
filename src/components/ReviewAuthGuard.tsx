'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface ReviewAuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function ReviewAuthGuard({ children, fallback }: ReviewAuthGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading) {
      // 로그인 체크
      if (!user?.isLoggedIn) {
        router.push('/login');
        return;
      }

      // reviewer 권한 체크 (reviewer와 admin만 접근 가능)
      const userRole = user.role || 'user';
      if (userRole !== 'reviewer' && userRole !== 'admin') {
        // 권한이 없는 경우 메인 페이지로 리다이렉트
        alert('검수 페이지 접근 권한이 없습니다.');
        router.push('/');
      }
    }
  }, [user, isLoading, router]);

  // 로딩 중일 때 표시할 스피너
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">권한을 확인하고 있습니다...</p>
        </div>
      </div>
    );
  }

  // 로그인되지 않은 경우
  if (!user?.isLoggedIn) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-gray-500 text-2xl">🔒</span>
          </div>
          <p className="text-gray-600">로그인이 필요한 페이지입니다.</p>
          <p className="text-sm text-gray-500 mt-2">잠시 후 로그인 페이지로 이동합니다...</p>
        </div>
      </div>
    );
  }

  // 권한이 없는 경우
  const userRole = user?.role || 'user';
  if (userRole !== 'reviewer' && userRole !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-500 text-2xl">⛔</span>
          </div>
          <p className="text-gray-800 font-semibold">접근 권한이 없습니다</p>
          <p className="text-sm text-gray-600 mt-2">검수 담당자만 접근 가능한 페이지입니다.</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            메인으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // 권한이 있는 경우 children 렌더링
  return <>{children}</>;
}