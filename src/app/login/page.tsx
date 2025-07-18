'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const [credentials, setCredentials] = useState({
    userId: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login, user } = useAuth();
  const router = useRouter();

  // 이미 로그인된 경우 메인 페이지로 리다이렉트
  useEffect(() => {
    if (user?.isLoggedIn) {
      router.push('/');
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!credentials.userId || !credentials.password) {
      setError('아이디와 비밀번호를 입력해주세요.');
      setIsLoading(false);
      return;
    }

    try {
      const result = await login(credentials);
      
      if (result.success) {
        router.push('/');
      } else {
        setError(result.message || '로그인에 실패했습니다.');
      }
    } catch {
      setError('로그인 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: 'userId' | 'password', value: string) => {
    setCredentials(prev => ({
      ...prev,
      [field]: value
    }));
    if (error) setError(''); // 에러 메시지 초기화
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* 헤더 */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mb-4">
            <span className="text-white text-xl">📖</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            로그인
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            학습 지문/문제 생성 시스템에 로그인하세요
          </p>
        </div>

        {/* 로그인 폼 */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* 아이디 입력 */}
            <div>
              <label htmlFor="userId" className="block text-sm font-medium text-gray-700 mb-2">
                아이디
              </label>
              <input
                id="userId"
                type="text"
                value={credentials.userId}
                onChange={(e) => handleInputChange('userId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="아이디를 입력하세요"
                disabled={isLoading}
              />
            </div>

            {/* 비밀번호 입력 */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                비밀번호
              </label>
              <input
                id="password"
                type="password"
                value={credentials.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="비밀번호를 입력하세요"
                disabled={isLoading}
              />
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <span className="text-red-400">⚠️</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* 로그인 버튼 */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  로그인 중...
                </div>
              ) : (
                '로그인'
              )}
            </button>
          </form>

          {/* 계정 정보 안내 */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-3">이용 가능한 계정:</h3>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
              <div className="bg-gray-50 p-2 rounded">
                <span className="font-medium">song</span> / 0000
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <span className="font-medium">user1</span> / 1111
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <span className="font-medium">user2</span> / 2222
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <span className="font-medium">user3</span> / 3333
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <span className="font-medium">user4</span> / 4444
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <span className="font-medium">user5</span> / 5555
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <span className="font-medium">ahn</span> / 0000
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <span className="font-medium">test</span> / 0000
              </div>
            </div>
            
            {/* 안내 문구 */}
            <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
              <p className="text-xs text-red-600 font-medium">
                ** ID 지정이 안된 사용자는 &apos;test&apos; 계정을 사용해주세요.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 