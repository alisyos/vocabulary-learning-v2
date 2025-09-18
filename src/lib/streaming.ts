// 스트리밍 응답을 처리하기 위한 유틸리티

export interface StreamingMessage {
  type: 'start' | 'progress' | 'complete' | 'error';
  message?: string;
  content?: string;
  result?: any;
  error?: string;
  isComplete?: boolean;
  timestamp: string;
}

export interface StreamingCallbacks {
  onStart?: (message: StreamingMessage) => void;
  onProgress?: (message: StreamingMessage) => void;
  onComplete?: (message: StreamingMessage) => void;
  onError?: (message: StreamingMessage) => void;
}

/**
 * Server-Sent Events를 통한 스트리밍 응답 처리
 * @param url API 엔드포인트 URL
 * @param data 전송할 데이터
 * @param callbacks 각 이벤트에 대한 콜백 함수들
 */
export async function handleStreamingRequest(
  url: string, 
  data: any, 
  callbacks: StreamingCallbacks
): Promise<void> {
  try {
    console.log('🚀 스트리밍 요청 시작:', { url, data });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('스트리밍을 지원하지 않는 브라우저입니다.');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('📡 스트리밍 완료');
          break;
        }

        // 청크 디코딩
        buffer += decoder.decode(value, { stream: true });
        
        // 완성된 메시지들 처리
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || ''; // 마지막 불완전한 라인 보관

        for (const line of lines) {
          if (line.trim() && line.startsWith('data: ')) {
            try {
              const messageData = line.slice(6); // 'data: ' 제거
              const message: StreamingMessage = JSON.parse(messageData);
              
              console.log('📨 스트리밍 메시지 수신:', message.type, message.message);

              // 메시지 타입에 따른 콜백 호출
              switch (message.type) {
                case 'start':
                  callbacks.onStart?.(message);
                  break;
                case 'progress':
                  callbacks.onProgress?.(message);
                  break;
                case 'complete':
                  callbacks.onComplete?.(message);
                  return; // 완료 시 종료
                case 'error':
                  callbacks.onError?.(message);
                  return; // 에러 시 종료
                default:
                  console.warn('알 수 없는 메시지 타입:', message.type);
              }
            } catch (parseError) {
              console.error('메시지 파싱 오류:', parseError, 'Raw data:', line);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

  } catch (error) {
    console.error('스트리밍 요청 오류:', error);
    
    // 네트워크 오류나 기타 오류 처리
    const errorMessage: StreamingMessage = {
      type: 'error',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    };
    
    callbacks.onError?.(errorMessage);
  }
}

/**
 * 스트리밍 상태를 관리하기 위한 Hook에서 사용할 수 있는 유틸리티
 */
export interface StreamingState {
  isStreaming: boolean;
  message: string;
  progress: string;
  error: string | null;
  result: any | null;
}

export const initialStreamingState: StreamingState = {
  isStreaming: false,
  message: '',
  progress: '',
  error: null,
  result: null
};

/**
 * 스트리밍 상태 업데이트 헬퍼 함수들
 */
export const streamingStateUpdaters = {
  start: (state: StreamingState, message: StreamingMessage): StreamingState => ({
    ...state,
    isStreaming: true,
    message: message.message || '시작 중...',
    progress: '',
    error: null,
    result: null
  }),
  
  progress: (state: StreamingState, message: StreamingMessage): StreamingState => ({
    ...state,
    message: message.message || '진행 중...',
    progress: message.content || state.progress
  }),
  
  complete: (state: StreamingState, message: StreamingMessage): StreamingState => ({
    ...state,
    isStreaming: false,
    message: message.message || '완료되었습니다.',
    result: message.result
  }),
  
  error: (state: StreamingState, message: StreamingMessage): StreamingState => ({
    ...state,
    isStreaming: false,
    error: message.error || '알 수 없는 오류가 발생했습니다.',
    message: '오류가 발생했습니다.'
  })
};