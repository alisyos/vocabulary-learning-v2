'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user?.isLoggedIn) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // 로딩 중일 때 표시할 스피너
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로그인 상태를 확인하고 있습니다...</p>
        </div>
      </div>
    );
  }

  // 로그인되지 않은 경우 fallback 또는 빈 화면 표시
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

  // 로그인된 경우 children 렌더링
  return <>{children}</>;
} 