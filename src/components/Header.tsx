'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  
  const navigation = [
    {
      name: '콘텐츠 생성',
      href: '/',
      icon: '✏️',
      description: '새로운 학습 콘텐츠 생성'
    },
    {
      name: '콘텐츠 관리',
      href: '/manage',
      icon: '📚',
      description: '저장된 콘텐츠 관리'
    },
    {
      name: '프롬프트 관리',
      href: '/prompts',
      icon: '⚙️',
      description: 'AI 생성 프롬프트 확인 및 수정'
    }
  ];
  
  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };
  
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* 로고 */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">📖</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  학습 지문/문제 생성 시스템
                </h1>
                <p className="text-xs text-gray-500">AI 기반 교육 콘텐츠 생성 플랫폼</p>
              </div>
            </Link>
          </div>
          
          {/* 네비게이션 메뉴 */}
          <nav className="flex items-center space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  group relative flex items-center px-3 py-2 text-sm font-medium transition-all duration-200 border-b-2
                  ${isActive(item.href)
                    ? 'text-blue-600 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900 border-transparent hover:border-gray-300'
                  }
                `}
                title={item.description}
              >
                <span className="mr-2">{item.icon}</span>
                <span>{item.name}</span>
                
                {/* 호버 툴팁 */}
                <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                  {item.description}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 border-2 border-transparent border-b-gray-900"></div>
                </div>
              </Link>
            ))}
          </nav>
          
          {/* 사용자 정보 및 액션 */}
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                {/* 사용자 정보 */}
                <div className="hidden sm:flex items-center text-sm text-gray-700">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-2">
                    <span className="text-blue-600 font-medium text-xs">
                      {user.name.charAt(0)}
                    </span>
                  </div>
                  <span className="font-medium">{user.name}</span>
                  <span className="text-gray-500 ml-1">({user.userId})</span>
                </div>
                
                {/* 로그아웃 버튼 */}
                <button
                  onClick={async () => {
                    await logout();
                    router.push('/login');
                  }}
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:border-gray-400 transition-colors"
                  title="로그아웃"
                >
                  <span className="mr-1">🚪</span>
                  <span className="hidden sm:inline">로그아웃</span>
                </button>
              </>
            ) : (
              /* 로그인 버튼 */
              <Link
                href="/login"
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
              >
                <span className="mr-1">🔑</span>
                로그인
              </Link>
            )}
            
            {/* 연결 상태 표시 */}
            <div className="hidden lg:flex items-center text-xs text-gray-500">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
              <span>온라인</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* 현재 페이지 브레드크럼 (선택적으로 표시) */}
      {pathname !== '/' && (
        <div className="bg-gray-50 border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-10 text-sm text-gray-600">
              <Link href="/" className="hover:text-gray-900">홈</Link>
              {pathname.startsWith('/manage') && (
                <>
                  <span className="mx-2">/</span>
                  <Link href="/manage" className="hover:text-gray-900">콘텐츠 관리</Link>
                  {pathname !== '/manage' && (
                    <>
                      <span className="mx-2">/</span>
                      <span className="text-gray-400">상세보기</span>
                    </>
                  )}
                </>
              )}
              {pathname.startsWith('/prompts') && (
                <>
                  <span className="mx-2">/</span>
                  <span className="text-gray-400">프롬프트 관리</span>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
} 