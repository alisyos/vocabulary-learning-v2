'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useRef, useEffect } from 'react';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isSystemDropdownOpen, setIsSystemDropdownOpen] = useState(false);
  const [isDbDropdownOpen, setIsDbDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dbDropdownRef = useRef<HTMLDivElement>(null);

  // 사용자 역할 확인
  const userRole = user?.role || 'user';

  // 디버깅용 로그 (개발 환경에서만)
  if (process.env.NODE_ENV === 'development') {
    console.log('Current user role:', userRole, 'User:', user);
  }

  const navigation = [
    {
      name: '콘텐츠 생성',
      href: '/',
      icon: '✏️',
      description: '새로운 학습 콘텐츠 생성',
      allowedRoles: ['admin', 'user'] // reviewer는 콘텐츠 생성 불가
    },
    {
      name: '콘텐츠 관리',
      href: '/manage',
      icon: '📚',
      description: '저장된 콘텐츠 관리',
      allowedRoles: ['admin', 'user'] // reviewer는 콘텐츠 관리 불가
    }
  ];

  const systemMenuItems = [
    {
      name: '프롬프트 관리',
      href: '/prompts',
      icon: '📝',
      description: 'AI 생성 프롬프트 확인 및 수정',
      allowedRoles: ['admin'] // admin만 접근 가능
    },
    {
      name: '필드데이터 관리',
      href: '/curriculum-admin',
      icon: '🗂️',
      description: '교육과정 데이터 관리',
      allowedRoles: ['admin'] // admin만 접근 가능
    },
    {
      name: '이미지 데이터 관리',
      href: '/image-admin',
      icon: '🖼️',
      description: '학습 콘텐츠 이미지 등록 및 관리',
      allowedRoles: ['admin'] // admin만 접근 가능
    },
    {
      name: '진단평가 관리',
      href: '/assessment',
      icon: '📊',
      description: '어휘 문제 기반 진단평가 생성',
      allowedRoles: ['admin'] // admin만 접근 가능
    }
  ];

  const dbMenuItems = [
    {
      name: '콘텐츠 수정',
      href: '/edit',
      icon: '✏️',
      description: '기존 콘텐츠 세트 수정',
      allowedRoles: ['admin', 'user'] // admin과 user 접근 가능
    },
    {
      name: 'DB 다운로드',
      href: '/db-admin/download',
      icon: '💾',
      description: '데이터베이스 테이블 CSV 다운로드',
      allowedRoles: ['admin'] // admin만 접근 가능
    },
    {
      name: '어휘 DB 관리',
      href: '/db-admin/vocabulary',
      icon: '📚',
      description: '어휘 데이터 확인, 검수, 수정',
      allowedRoles: ['admin'] // admin만 접근 가능
    },
    {
      name: '어휘 데이터 검수',
      href: '/db-admin/fix-vocabulary',
      icon: '🔧',
      description: '어휘 파싱 오류 수정 및 데이터 정리',
      allowedRoles: ['admin'] // admin만 접근 가능
    },
    {
      name: '종결 어미 정규화',
      href: '/db-admin/normalize-endings',
      icon: '📝',
      description: '문제의 종결 어미 일괄 정규화 (~다 형태)',
      allowedRoles: ['admin'] // admin만 접근 가능
    },
    {
      name: '콘텐츠세트 검수',
      href: '/db-admin/review',
      icon: '✅',
      description: '검수완료 및 승인완료 콘텐츠 확인',
      allowedRoles: ['admin', 'reviewer'] // admin과 reviewer 접근 가능
    },
    {
      name: '최종 검수',
      href: '/db-admin/final-review',
      icon: '🔍',
      description: '데이터 품질 검수 및 자동 수정',
      allowedRoles: ['admin'] // admin만 접근 가능
    }
  ];

  // 사용자 역할에 따라 필터링된 메뉴
  const filteredNavigation = navigation.filter(item =>
    item.allowedRoles.includes(userRole)
  );
  const filteredSystemMenuItems = systemMenuItems.filter(item =>
    item.allowedRoles.includes(userRole)
  );
  const filteredDbMenuItems = dbMenuItems.filter(item =>
    item.allowedRoles.includes(userRole)
  );
  
  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  const isSystemMenuActive = () => {
    return pathname.startsWith('/prompts') || pathname.startsWith('/curriculum-admin') || pathname.startsWith('/image-admin') || pathname.startsWith('/assessment');
  };

  const isDbMenuActive = () => {
    return pathname.startsWith('/db-admin') || pathname.startsWith('/edit');
  };

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsSystemDropdownOpen(false);
      }
      if (dbDropdownRef.current && !dbDropdownRef.current.contains(event.target as Node)) {
        setIsDbDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
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
            {filteredNavigation.map((item) => (
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
            
            {/* 시스템 설정 드롭다운 - 권한이 있는 경우만 표시 */}
            {filteredSystemMenuItems.length > 0 && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsSystemDropdownOpen(!isSystemDropdownOpen)}
                className={`
                  group relative flex items-center px-3 py-2 text-sm font-medium transition-all duration-200 border-b-2
                  ${isSystemMenuActive()
                    ? 'text-blue-600 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900 border-transparent hover:border-gray-300'
                  }
                `}
                title="시스템 설정 메뉴"
              >
                <span className="mr-2">⚙️</span>
                <span>시스템 설정</span>
                <span className={`ml-1 transition-transform duration-200 ${isSystemDropdownOpen ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>
              
              {/* 드롭다운 메뉴 */}
              {isSystemDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-20">
                  {filteredSystemMenuItems.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsSystemDropdownOpen(false)}
                      className={`
                        flex items-center px-4 py-2 text-sm transition-colors border-l-4
                        ${isActive(item.href)
                          ? 'text-blue-600 bg-blue-50 border-blue-600'
                          : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50 border-transparent'
                        }
                      `}
                      title={item.description}
                    >
                      <span className="mr-3">{item.icon}</span>
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
            )}

            {/* DB 관리 드롭다운 - 권한이 있는 경우만 표시 */}
            {filteredDbMenuItems.length > 0 && (
            <div className="relative" ref={dbDropdownRef}>
              <button
                onClick={() => setIsDbDropdownOpen(!isDbDropdownOpen)}
                className={`
                  group relative flex items-center px-3 py-2 text-sm font-medium transition-all duration-200 border-b-2
                  ${isDbMenuActive()
                    ? 'text-blue-600 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900 border-transparent hover:border-gray-300'
                  }
                `}
                title="데이터베이스 관리"
              >
                <span className="mr-2">📊</span>
                <span>DB 관리</span>
                <span className={`ml-1 transition-transform duration-200 ${isDbDropdownOpen ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>
              
              {/* 드롭다운 메뉴 */}
              {isDbDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-20">
                  {filteredDbMenuItems.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsDbDropdownOpen(false)}
                      className={`
                        flex items-center px-4 py-2 text-sm transition-colors border-l-4
                        ${isActive(item.href)
                          ? 'text-blue-600 bg-blue-50 border-blue-600'
                          : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50 border-transparent'
                        }
                      `}
                      title={item.description}
                    >
                      <span className="mr-3">{item.icon}</span>
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
            )}
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
                  <Link href="/prompts" className="hover:text-gray-900">시스템 설정</Link>
                  <span className="mx-2">/</span>
                  <span className="text-gray-400">프롬프트 관리</span>
                </>
              )}
              {pathname.startsWith('/curriculum-admin') && (
                <>
                  <span className="mx-2">/</span>
                  <Link href="/curriculum-admin" className="hover:text-gray-900">시스템 설정</Link>
                  <span className="mx-2">/</span>
                  <span className="text-gray-400">필드데이터 관리</span>
                </>
              )}
              {pathname.startsWith('/image-admin') && (
                <>
                  <span className="mx-2">/</span>
                  <Link href="/image-admin" className="hover:text-gray-900">시스템 설정</Link>
                  <span className="mx-2">/</span>
                  <span className="text-gray-400">이미지 데이터 관리</span>
                </>
              )}
              {pathname.startsWith('/assessment') && (
                <>
                  <span className="mx-2">/</span>
                  <Link href="/assessment" className="hover:text-gray-900">시스템 설정</Link>
                  <span className="mx-2">/</span>
                  <span className="text-gray-400">진단평가 관리</span>
                </>
              )}
              {pathname.startsWith('/edit') && (
                <>
                  <span className="mx-2">/</span>
                  <span className="text-gray-600">DB 관리</span>
                  <span className="mx-2">/</span>
                  <span className="text-gray-400">콘텐츠 수정</span>
                </>
              )}
              {pathname.startsWith('/db-admin') && (
                <>
                  <span className="mx-2">/</span>
                  <Link href="/db-admin" className="hover:text-gray-900">DB 관리</Link>
                  {pathname.startsWith('/db-admin/download') && (
                    <>
                      <span className="mx-2">/</span>
                      <span className="text-gray-400">DB 다운로드</span>
                    </>
                  )}
                  {pathname.startsWith('/db-admin/vocabulary') && (
                    <>
                      <span className="mx-2">/</span>
                      <span className="text-gray-400">어휘 DB 관리</span>
                    </>
                  )}
                  {pathname.startsWith('/db-admin/fix-vocabulary') && (
                    <>
                      <span className="mx-2">/</span>
                      <span className="text-gray-400">어휘 데이터 검수</span>
                    </>
                  )}
                  {pathname.startsWith('/db-admin/normalize-endings') && (
                    <>
                      <span className="mx-2">/</span>
                      <span className="text-gray-400">종결 어미 정규화</span>
                    </>
                  )}
                  {pathname.startsWith('/db-admin/review') && (
                    <>
                      <span className="mx-2">/</span>
                      <span className="text-gray-400">콘텐츠세트 검수</span>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
} 