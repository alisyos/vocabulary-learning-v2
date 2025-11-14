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
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'visible' | 'hidden'>('all');
  const [editingImage, setEditingImage] = useState<ImageData | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [showDownloadSection, setShowDownloadSection] = useState(false); // 다운로드 섹션 표시 여부

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalImages, setTotalImages] = useState(0);
  const imagesPerPage = 30;

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
      if (visibilityFilter === 'visible') {
        params.append('visible_only', 'true');
      } else if (visibilityFilter === 'hidden') {
        params.append('hidden_only', 'true');
      }
      params.append('page', currentPage.toString());
      params.append('limit', imagesPerPage.toString());

      const response = await fetch(`/api/images?${params}`);
      const result = await response.json();

      if (result.success) {
        setImages(result.data);
        if (result.pagination) {
          setTotalPages(result.pagination.totalPages);
          setTotalImages(result.pagination.total);
        }
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
  }, [sessionNumberFilter, visibilityFilter, currentPage]);

  // 필터 변경 시 첫 페이지로 이동
  useEffect(() => {
    setCurrentPage(1);
  }, [sessionNumberFilter, visibilityFilter]);

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

      // 첫 페이지로 이동 후 목록 새로고침
      setCurrentPage(1);
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

  // 이미지 표시/숨김 토글
  const handleToggleVisibility = async (id: string, currentVisibility: boolean, fileName: string) => {
    const newVisibility = !currentVisibility;
    const action = newVisibility ? '표시' : '숨김';

    try {
      const response = await fetch(`/api/images/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          is_visible: newVisibility
        })
      });

      const result = await response.json();

      if (result.success) {
        alert(`'${fileName}' 이미지가 ${action} 상태로 변경되었습니다.`);
        loadImages();
      } else {
        alert(`상태 변경 실패: ${result.error}`);
      }
    } catch (error) {
      console.error('상태 변경 오류:', error);
      alert('이미지 상태 변경 중 오류가 발생했습니다.');
    }
  };

  // 파일 크기 포맷팅
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  // 이미지 ZIP 다운로드 핸들러
  const handleDownloadImages = async () => {
    setDownloading(true);

    try {
      // URL 파라미터 구성
      const params = new URLSearchParams();

      // 차시 필터
      if (sessionNumberFilter && sessionNumberFilter.trim() !== '') {
        params.append('sessionNumber', sessionNumberFilter.trim());
      }

      // 상태 필터
      if (visibilityFilter !== 'all') {
        params.append('visibility', visibilityFilter);
      }

      const response = await fetch(`/api/download-images?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'images.zip';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]*)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      link.download = filename;
      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Download error:', error);
      alert(error instanceof Error ? error.message : 'Download failed');
    } finally {
      setDownloading(false);
    }
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
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-4">🔍 이미지 목록</h2>

            {/* 필터 그룹 */}
            <div className="flex flex-wrap items-center gap-4">
              {/* 차시 필터 */}
              <div className="flex items-center">
                <label className="text-sm text-gray-600 mr-2 whitespace-nowrap">차시:</label>
                <input
                  type="text"
                  value={sessionNumberFilter}
                  onChange={(e) => setSessionNumberFilter(e.target.value)}
                  placeholder="예: 1-50 (범위) 또는 10 (단일)"
                  className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 w-48"
                />
              </div>

              {/* 표시 상태 필터 */}
              <div className="flex items-center">
                <label className="text-sm text-gray-600 mr-2 whitespace-nowrap">상태:</label>
                <select
                  value={visibilityFilter}
                  onChange={(e) => setVisibilityFilter(e.target.value as 'all' | 'visible' | 'hidden')}
                  className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">전체</option>
                  <option value="visible">표시만</option>
                  <option value="hidden">숨김만</option>
                </select>
              </div>

              {/* 필터 초기화 버튼 */}
              <button
                onClick={() => {
                  setSessionNumberFilter('');
                  setVisibilityFilter('all');
                }}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                필터 초기화
              </button>
            </div>
          </div>

          <div className="text-sm text-gray-600">
            총 <span className="font-semibold text-blue-600">{totalImages}</span>개의 이미지
            {totalPages > 1 && (
              <span className="ml-2">
                (페이지 {currentPage}/{totalPages})
              </span>
            )}
          </div>
        </div>

        {/* 이미지 ZIP 다운로드 섹션 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">📦 이미지 일괄 다운로드</h2>
            <button
              onClick={() => setShowDownloadSection(!showDownloadSection)}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium text-gray-700"
            >
              <span>{showDownloadSection ? '접기' : '펼치기'}</span>
              <svg
                className={`w-4 h-4 transition-transform ${showDownloadSection ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {showDownloadSection && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-start">
              <svg className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-blue-900 mb-1">다운로드 정보</h3>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• 현재 적용된 필터(차시, 상태)에 따라 이미지 파일들이 다운로드됩니다.</li>
                  <li>• <strong>차시 범위</strong>: "1-50" (1차시~50차시) 또는 "10" (10차시만)</li>
                  <li>• <strong>각 이미지 파일명에 차시 번호가 자동으로 포함됩니다.</strong> (예: 15_image.png)</li>
                  <li>• 모든 이미지는 ZIP 파일로 압축되어 다운로드됩니다.</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <div className="text-center space-y-4">
              <div>
                <h4 className="text-lg font-medium text-gray-900">
                  이미지 파일 ZIP 다운로드
                </h4>
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-gray-600">
                    필터링된 이미지 파일들을 ZIP으로 압축하여 다운로드합니다.
                  </p>
                  {(sessionNumberFilter || visibilityFilter !== 'all') && (
                    <div className="inline-flex items-center space-x-2 mt-2 px-3 py-1.5 bg-yellow-50 border border-yellow-200 rounded-md">
                      <svg className="h-4 w-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                      </svg>
                      <span className="text-xs font-medium text-yellow-800">
                        필터 적용됨:
                        {sessionNumberFilter && <span className="ml-1">차시 "{sessionNumberFilter}"</span>}
                        {sessionNumberFilter && visibilityFilter !== 'all' && <span className="mx-1">•</span>}
                        {visibilityFilter !== 'all' && <span>상태 "{visibilityFilter === 'visible' ? '표시만' : '숨김만'}"</span>}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={handleDownloadImages}
                disabled={downloading}
                className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white ${
                  downloading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
                }`}
              >
                {downloading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    다운로드 중...
                  </>
                ) : (
                  <>
                    <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    ZIP 다운로드
                  </>
                )}
              </button>
            </div>
          </div>
            </>
          )}
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
              <div
                key={image.id}
                className={`rounded-lg shadow-md overflow-hidden transition-all ${
                  image.is_visible !== false
                    ? 'bg-white'
                    : 'bg-gray-400 opacity-60'
                }`}
              >
                {/* 이미지 미리보기 */}
                <div className={`relative h-48 ${
                  image.is_visible !== false ? 'bg-gray-100' : 'bg-gray-500'
                }`}>
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
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 truncate flex-1" title={image.file_name}>
                      {image.file_name}
                    </h3>
                    {/* 표시 상태 뱃지 */}
                    <span className={`ml-2 px-2 py-0.5 text-xs font-semibold rounded-full whitespace-nowrap ${
                      image.is_visible !== false
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {image.is_visible !== false ? '표시' : '숨김'}
                    </span>
                  </div>

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
                  <div className="space-y-2">
                    {/* 표시/숨김 토글 버튼 */}
                    <button
                      onClick={() => image.id && handleToggleVisibility(image.id, image.is_visible !== false, image.file_name)}
                      className={`w-full px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        image.is_visible !== false
                          ? 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-300'
                          : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-300'
                      }`}
                      title={image.is_visible !== false ? '콘텐츠 페이지에서 숨기기' : '콘텐츠 페이지에 표시하기'}
                    >
                      {image.is_visible !== false ? '👁️ 숨기기' : '👁️‍🗨️ 표시하기'}
                    </button>

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
              </div>
            ))}
          </div>
        )}

        {/* 페이지네이션 컨트롤 */}
        {!loading && totalPages > 1 && (
          <div className="mt-8 flex justify-center items-center space-x-2">
            {/* 처음으로 */}
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-3 py-2 rounded-md bg-white border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="처음 페이지"
            >
              «
            </button>

            {/* 이전 페이지 */}
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 rounded-md bg-white border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="이전 페이지"
            >
              ‹
            </button>

            {/* 페이지 번호 */}
            <div className="flex items-center space-x-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => {
                  // 현재 페이지 주변 페이지만 표시
                  if (totalPages <= 7) return true;
                  if (page === 1 || page === totalPages) return true;
                  if (Math.abs(page - currentPage) <= 1) return true;
                  return false;
                })
                .map((page, index, array) => {
                  // 페이지 번호 사이에 ... 표시
                  const prevPage = array[index - 1];
                  const showEllipsis = prevPage && page - prevPage > 1;

                  return (
                    <div key={page} className="flex items-center space-x-1">
                      {showEllipsis && (
                        <span className="px-2 text-gray-400">...</span>
                      )}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          currentPage === page
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    </div>
                  );
                })}
            </div>

            {/* 다음 페이지 */}
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 rounded-md bg-white border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="다음 페이지"
            >
              ›
            </button>

            {/* 마지막으로 */}
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-3 py-2 rounded-md bg-white border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="마지막 페이지"
            >
              »
            </button>

            {/* 페이지 정보 */}
            <div className="ml-4 text-sm text-gray-600">
              {totalImages}개 중 {((currentPage - 1) * imagesPerPage) + 1}-{Math.min(currentPage * imagesPerPage, totalImages)}
            </div>
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
