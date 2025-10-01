'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import RoleAuthGuard from '@/components/RoleAuthGuard';
import { ImageData } from '@/types';
import { getImagePublicUrl } from '@/lib/supabase';

export default function ImageAdminPage() {
  const [images, setImages] = useState<ImageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [sessionNumberFilter, setSessionNumberFilter] = useState('');
  const [editingImage, setEditingImage] = useState<ImageData | null>(null);

  // 이미지 업로드 폼 상태
  interface FileWithMetadata {
    file: File;
    session_number: string;
    source: string;
    memo: string;
  }

  const [filesWithMetadata, setFilesWithMetadata] = useState<FileWithMetadata[]>([]);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // 이미지 목록 로드
  const loadImages = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (sessionNumberFilter) {
        params.append('session_number', sessionNumberFilter);
      }

      const response = await fetch(`/api/images?${params}`);
      const result = await response.json();

      if (result.success) {
        setImages(result.data);
      } else {
        alert('이미지 목록을 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('이미지 로드 오류:', error);
      alert('이미지 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadImages();
  }, [sessionNumberFilter]);

  // 파일 처리 공통 함수
  const processFiles = (files: FileList | File[]) => {
    const filesArray = Array.from(files);
    // 이미지 파일만 필터링
    const imageFiles = filesArray.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length === 0) {
      alert('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    if (imageFiles.length !== filesArray.length) {
      alert(`${filesArray.length - imageFiles.length}개의 파일이 이미지가 아니어서 제외되었습니다.`);
    }

    const newFilesWithMetadata = imageFiles.map(file => ({
      file,
      session_number: '',
      source: '',
      memo: ''
    }));
    setFilesWithMetadata(newFilesWithMetadata);
  };

  // 파일 선택 핸들러
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  // 드래그 앤 드롭 핸들러
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (uploading) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
  };

  // 파일 제거 핸들러
  const handleRemoveFile = (index: number) => {
    setFilesWithMetadata(prev => prev.filter((_, i) => i !== index));
  };

  // 파일별 메타데이터 업데이트
  const updateFileMetadata = (index: number, field: 'session_number' | 'source' | 'memo', value: string) => {
    setFilesWithMetadata(prev => prev.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    ));
  };

  // 이미지 업로드 (다중 파일)
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (filesWithMetadata.length === 0) {
      alert('파일을 선택해주세요.');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress({ current: 0, total: filesWithMetadata.length });

      let successCount = 0;
      let failCount = 0;
      const errors: string[] = [];

      // 각 파일을 순차적으로 업로드
      for (let i = 0; i < filesWithMetadata.length; i++) {
        const fileData = filesWithMetadata[i];
        setUploadProgress({ current: i + 1, total: filesWithMetadata.length });

        try {
          const formData = new FormData();
          formData.append('file', fileData.file);
          formData.append('session_number', fileData.session_number);
          formData.append('source', fileData.source);
          formData.append('memo', fileData.memo);

          const response = await fetch('/api/images/upload', {
            method: 'POST',
            body: formData
          });

          const result = await response.json();

          if (result.success) {
            successCount++;
          } else {
            failCount++;
            errors.push(`${fileData.file.name}: ${result.error}`);
          }
        } catch (error) {
          failCount++;
          errors.push(`${fileData.file.name}: 업로드 중 오류 발생`);
          console.error(`파일 업로드 오류 (${fileData.file.name}):`, error);
        }
      }

      // 결과 메시지
      let message = `업로드 완료!\n성공: ${successCount}개`;
      if (failCount > 0) {
        message += `\n실패: ${failCount}개`;
        if (errors.length > 0) {
          message += `\n\n실패 상세:\n${errors.join('\n')}`;
        }
      }
      alert(message);

      // 폼 초기화
      setFilesWithMetadata([]);
      setUploadProgress({ current: 0, total: 0 });

      // 파일 입력 초기화
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      // 목록 새로고침
      loadImages();
    } catch (error) {
      console.error('업로드 오류:', error);
      alert('이미지 업로드 중 오류가 발생했습니다.');
    } finally {
      setUploading(false);
      setUploadProgress({ current: 0, total: 0 });
    }
  };

  // 이미지 수정
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingImage?.id) return;

    try {
      const response = await fetch(`/api/images/${editingImage.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_number: editingImage.session_number,
          source: editingImage.source,
          memo: editingImage.memo
        })
      });

      const result = await response.json();

      if (result.success) {
        alert('이미지 정보가 수정되었습니다.');
        setEditingImage(null);
        loadImages();
      } else {
        alert(`수정 실패: ${result.error}`);
      }
    } catch (error) {
      console.error('수정 오류:', error);
      alert('이미지 수정 중 오류가 발생했습니다.');
    }
  };

  // 이미지 삭제
  const handleDelete = async (id: string, fileName: string) => {
    if (!confirm(`'${fileName}' 이미지를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/images/${id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        alert('이미지가 삭제되었습니다.');
        loadImages();
      } else {
        alert(`삭제 실패: ${result.error}`);
      }
    } catch (error) {
      console.error('삭제 오류:', error);
      alert('이미지 삭제 중 오류가 발생했습니다.');
    }
  };

  // 파일 크기 포맷팅
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <RoleAuthGuard allowedRoles={['admin']}>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 페이지 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">📷 이미지 데이터 관리</h1>
          <p className="mt-2 text-gray-600">
            학습 콘텐츠에 사용되는 이미지를 등록, 수정, 삭제할 수 있습니다.
          </p>
          <p className="mt-1 text-sm text-gray-500">
            지원 형식: JPEG, PNG, GIF, WebP, SVG | 최대 파일 크기: 30MB
          </p>
        </div>

        {/* 이미지 업로드 폼 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">📤 이미지 업로드</h2>
          <form onSubmit={handleUpload} className="space-y-4">
            {/* 드래그 앤 드롭 영역 */}
            <div
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-lg p-4 text-center transition-all ${
                isDragging
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
              } ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              onClick={() => {
                if (!uploading) {
                  document.getElementById('file-input')?.click();
                }
              }}
            >
              <input
                id="file-input"
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
                disabled={uploading}
              />

              {isDragging ? (
                <p className="text-base font-medium text-blue-600">
                  파일을 여기에 놓으세요
                </p>
              ) : (
                <div className="flex items-center justify-center space-x-3">
                  <p className="text-sm text-gray-700">
                    이미지 파일을 드래그하여 놓거나
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      document.getElementById('file-input')?.click();
                    }}
                    className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                  >
                    파일 선택
                  </button>
                  <span className="text-xs text-gray-400">
                    (JPEG, PNG, GIF, WebP, SVG • 최대 30MB)
                  </span>
                </div>
              )}
            </div>

            {/* 선택된 파일 목록 및 개별 메타데이터 입력 */}
            {filesWithMetadata.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    선택된 파일 ({filesWithMetadata.length}개)
                  </h3>
                  <p className="text-sm text-gray-500">
                    총 크기: {formatFileSize(filesWithMetadata.reduce((sum, f) => sum + f.file.size, 0))}
                  </p>
                </div>

                <div className="space-y-4 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-4">
                  {filesWithMetadata.map((fileData, index) => (
                    <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-semibold">
                              {index + 1}
                            </span>
                            <h4 className="font-medium text-gray-900 truncate" title={fileData.file.name}>
                              {fileData.file.name}
                            </h4>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatFileSize(fileData.file.size)} • {fileData.file.type}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(index)}
                          disabled={uploading}
                          className="ml-2 text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="파일 제거"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            차시 번호
                          </label>
                          <input
                            type="text"
                            value={fileData.session_number}
                            onChange={(e) => updateFileMetadata(index, 'session_number', e.target.value)}
                            placeholder="예: 1-1, 2-3"
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            disabled={uploading}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            출처
                          </label>
                          <input
                            type="text"
                            value={fileData.source}
                            onChange={(e) => updateFileMetadata(index, 'source', e.target.value)}
                            placeholder="예: 공공데이터포털"
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            disabled={uploading}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            메모
                          </label>
                          <input
                            type="text"
                            value={fileData.memo}
                            onChange={(e) => updateFileMetadata(index, 'memo', e.target.value)}
                            placeholder="이미지 설명"
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            disabled={uploading}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 업로드 버튼 */}
            {filesWithMetadata.length > 0 && (
              <div className="flex justify-end items-center space-x-4 pt-2 border-t">
                {uploading && uploadProgress.total > 0 && (
                  <div className="flex items-center space-x-2">
                    <div className="w-48 bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600">
                      {uploadProgress.current} / {uploadProgress.total}
                    </span>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {uploading ? '업로드 중...' : `업로드 시작 (${filesWithMetadata.length}개)`}
                </button>
              </div>
            )}
          </form>
        </div>

        {/* 필터 및 통계 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">🔍 이미지 목록</h2>
            <div className="flex items-center space-x-4">
              <div>
                <label className="text-sm text-gray-600 mr-2">차시 필터:</label>
                <input
                  type="text"
                  value={sessionNumberFilter}
                  onChange={(e) => setSessionNumberFilter(e.target.value)}
                  placeholder="예: 1-1"
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <button
                onClick={() => setSessionNumberFilter('')}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                필터 초기화
              </button>
            </div>
          </div>

          <div className="text-sm text-gray-600">
            총 <span className="font-semibold text-blue-600">{images.length}</span>개의 이미지
          </div>
        </div>

        {/* 이미지 목록 */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
            <p className="mt-2 text-gray-600">로딩 중...</p>
          </div>
        ) : images.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-500 text-lg">등록된 이미지가 없습니다.</p>
            <p className="text-gray-400 text-sm mt-2">위 폼을 사용하여 이미지를 업로드하세요.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {images.map((image) => (
              <div key={image.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                {/* 이미지 미리보기 */}
                <div className="relative h-48 bg-gray-100">
                  <img
                    src={getImagePublicUrl(image.file_path)}
                    alt={image.file_name}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBOb3QgRm91bmQ8L3RleHQ+PC9zdmc+';
                    }}
                  />
                </div>

                {/* 이미지 정보 */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 truncate mb-2" title={image.file_name}>
                    {image.file_name}
                  </h3>

                  <div className="space-y-1 text-sm text-gray-600 mb-3">
                    {image.session_number && (
                      <div className="flex items-center">
                        <span className="font-medium w-16">차시:</span>
                        <span>{image.session_number}</span>
                      </div>
                    )}
                    {image.source && (
                      <div className="flex items-center">
                        <span className="font-medium w-16">출처:</span>
                        <span className="truncate" title={image.source}>{image.source}</span>
                      </div>
                    )}
                    {image.memo && (
                      <div className="flex items-start">
                        <span className="font-medium w-16">메모:</span>
                        <span className="flex-1">{image.memo}</span>
                      </div>
                    )}
                    <div className="flex items-center">
                      <span className="font-medium w-16">크기:</span>
                      <span>{formatFileSize(image.file_size)}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="font-medium w-16">등록:</span>
                      <span>{new Date(image.created_at || '').toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* 액션 버튼 */}
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setEditingImage(image)}
                      className="flex-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 text-sm font-medium transition-colors"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => image.id && handleDelete(image.id, image.file_name)}
                      className="flex-1 px-3 py-1.5 bg-red-50 text-red-700 rounded-md hover:bg-red-100 text-sm font-medium transition-colors"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 수정 모달 */}
        {editingImage && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-semibold mb-4">이미지 정보 수정</h2>
              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    파일명
                  </label>
                  <input
                    type="text"
                    value={editingImage.file_name}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    차시 번호
                  </label>
                  <input
                    type="text"
                    value={editingImage.session_number || ''}
                    onChange={(e) => setEditingImage({ ...editingImage, session_number: e.target.value || null })}
                    placeholder="예: 1-1, 2-3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    출처
                  </label>
                  <input
                    type="text"
                    value={editingImage.source || ''}
                    onChange={(e) => setEditingImage({ ...editingImage, source: e.target.value })}
                    placeholder="예: 공공데이터포털, AI 생성"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    메모
                  </label>
                  <textarea
                    value={editingImage.memo || ''}
                    onChange={(e) => setEditingImage({ ...editingImage, memo: e.target.value })}
                    placeholder="이미지 설명 또는 메모"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setEditingImage(null)}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    저장
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        </main>
      </div>
    </RoleAuthGuard>
  );
}
