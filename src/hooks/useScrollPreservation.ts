import { useRef, useCallback } from 'react';

/**
 * 스크롤 위치 및 포커스 보존을 위한 커스텀 Hook
 * 액션 수행 전후로 스크롤 위치를 저장하고 복원하며, 포커스 관리도 수행합니다.
 */
export const useScrollPreservation = () => {
  const scrollPositionRef = useRef<number>(0);
  const preservationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActiveElementRef = useRef<Element | null>(null);

  /**
   * 현재 스크롤 위치와 포커스 상태를 저장합니다.
   */
  const saveScrollPosition = useCallback(() => {
    scrollPositionRef.current = window.scrollY;
    lastActiveElementRef.current = document.activeElement;
    console.log('💾 스크롤 위치 저장:', scrollPositionRef.current);
    console.log('👁️ 활성 요소 저장:', lastActiveElementRef.current?.tagName, lastActiveElementRef.current?.className);
  }, []);

  /**
   * 현재 포커스된 요소에서 포커스를 해제합니다.
   */
  const blurActiveElement = useCallback(() => {
    if (document.activeElement && document.activeElement instanceof HTMLElement) {
      console.log('🔍 포커스 해제:', document.activeElement.tagName, document.activeElement.className);
      document.activeElement.blur();
    }
  }, []);

  /**
   * 브라우저의 자동 스크롤을 방지합니다.
   */
  const preventAutoScroll = useCallback(() => {
    const currentScrollY = window.scrollY;
    const targetScrollY = scrollPositionRef.current;

    // 스크롤 위치가 예상과 다르면 강제로 복원
    if (Math.abs(currentScrollY - targetScrollY) > 10) {
      console.log('🚫 자동 스크롤 감지, 강제 복원:', currentScrollY, '→', targetScrollY);
      window.scrollTo({
        top: targetScrollY,
        behavior: 'auto'
      });
    }
  }, []);

  /**
   * 저장된 스크롤 위치로 복원하고 포커스 관리를 수행합니다.
   * @param delay 복원 지연 시간 (밀리초, 기본값: 0)
   * @param forceBlur 포커스 해제 강제 실행 여부
   * @param skipRestore 복원을 건너뛸지 여부 (새 위치 업데이트 모드)
   */
  const restoreScrollPosition = useCallback((delay: number = 0, forceBlur: boolean = true, skipRestore: boolean = false) => {
    // 복원 건너뛰기 모드인 경우
    if (skipRestore) {
      console.log('🚫 스크롤 복원 건너뛰기 (새 위치 유지)');
      return;
    }

    // 기존 타이머가 있다면 취소
    if (preservationTimeoutRef.current) {
      clearTimeout(preservationTimeoutRef.current);
    }

    const restore = () => {
      const targetPosition = scrollPositionRef.current;
      console.log('🔄 스크롤 위치 복원:', targetPosition);

      // 1. 포커스 해제 (자동 스크롤 방지)
      if (forceBlur) {
        blurActiveElement();
      }

      // 2. 스크롤 위치 복원
      window.scrollTo({
        top: targetPosition,
        behavior: 'auto' // 'smooth' 대신 'auto' 사용
      });

      // 3. 브라우저 자동 스크롤 감지 및 재보정
      setTimeout(preventAutoScroll, 50);
      setTimeout(preventAutoScroll, 100);
      setTimeout(preventAutoScroll, 200);
    };

    if (delay > 0) {
      preservationTimeoutRef.current = setTimeout(restore, delay);
    } else {
      // requestAnimationFrame을 사용하여 DOM 업데이트 후 실행
      requestAnimationFrame(restore);
    }
  }, [blurActiveElement, preventAutoScroll]);

  /**
   * 액션 실행 전후로 스크롤 위치를 자동으로 보존하는 래퍼 함수
   * @param action 실행할 액션 함수
   * @param options 복원 옵션
   */
  const withScrollPreservation = useCallback(
    <T extends (...args: any[]) => any>(
      action: T,
      options: {
        delay?: number;
        forceBlur?: boolean;
        beforeAction?: () => void;
        afterAction?: () => void;
        allowScrollUpdate?: boolean; // 🆕 스크롤이 많이 움직인 경우 새 위치로 업데이트 허용
      } = {}
    ) => {
      return ((...args: Parameters<T>) => {
        const { delay = 10, forceBlur = true, beforeAction, afterAction, allowScrollUpdate = false } = options;

        // 1. 현재 스크롤 위치 확인 (새 옵션용)
        const currentScrollY = window.scrollY;
        const savedScrollY = scrollPositionRef.current;
        const scrollMovement = Math.abs(currentScrollY - savedScrollY);

        // 2. 스크롤이 많이 움직였다면 새 위치로 업데이트 (100px 이상 이동 시)
        if (allowScrollUpdate && scrollMovement > 100) {
          console.log('🔄 스크롤 위치 업데이트:', savedScrollY, '→', currentScrollY, '(이동:', scrollMovement, 'px)');
          scrollPositionRef.current = currentScrollY; // 새 위치로 업데이트
        } else {
          // 3. 기존 방식: 스크롤 위치 및 포커스 상태 저장
          saveScrollPosition();
        }

        // 4. 액션 실행 전 포커스 해제 (옵션)
        if (forceBlur) {
          blurActiveElement();
        }

        // 5. 액션 실행 전 콜백
        beforeAction?.();

        // 6. 액션 실행
        const result = action(...args);

        // 7. 스크롤 복원 여부 결정
        const shouldSkipRestore = allowScrollUpdate && scrollMovement > 100;

        // 8. 비동기 액션인 경우 처리
        if (result instanceof Promise) {
          return result.then((value) => {
            afterAction?.();
            restoreScrollPosition(delay, forceBlur, shouldSkipRestore);
            return value;
          }).catch((error) => {
            afterAction?.();
            restoreScrollPosition(delay, forceBlur, shouldSkipRestore);
            throw error;
          });
        } else {
          // 9. 동기 액션인 경우
          afterAction?.();
          restoreScrollPosition(delay, forceBlur, shouldSkipRestore);
          return result;
        }
      }) as T;
    },
    [saveScrollPosition, restoreScrollPosition, blurActiveElement]
  );

  /**
   * 컴포넌트 언마운트 시 타이머 정리
   */
  const cleanup = useCallback(() => {
    if (preservationTimeoutRef.current) {
      clearTimeout(preservationTimeoutRef.current);
      preservationTimeoutRef.current = null;
    }
  }, []);

  return {
    saveScrollPosition,
    restoreScrollPosition,
    withScrollPreservation,
    blurActiveElement,
    preventAutoScroll,
    cleanup
  };
};

/**
 * 간단한 스크롤 위치 보존 Hook (기본 버전)
 */
export const useSimpleScrollPreservation = () => {
  const scrollY = useRef<number>(0);

  const preserve = useCallback(() => {
    scrollY.current = window.scrollY;

    // 다음 프레임에서 복원
    requestAnimationFrame(() => {
      window.scrollTo(0, scrollY.current);
    });
  }, []);

  return preserve;
};

/**
 * 클릭 이벤트에 포커스 관리 및 스크롤 보존 기능을 추가하는 헬퍼 함수
 * @param element 클릭된 요소
 * @param callback 실행할 콜백 함수
 * @param options 옵션
 */
export const handleClickWithFocusManagement = (
  element: HTMLElement | null,
  callback: () => void,
  options: {
    preventScroll?: boolean;
    focusElement?: boolean;
  } = {}
) => {
  const { preventScroll = true, focusElement = true } = options;

  return (event: React.MouseEvent) => {
    // 1. 기본 동작 방지
    event.preventDefault();
    event.stopPropagation();

    // 2. 현재 포커스 해제
    if (document.activeElement && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    // 3. 클릭된 요소에 포커스 설정 (옵션)
    if (focusElement && element) {
      element.focus({ preventScroll });
    }

    // 4. 콜백 실행
    callback();
  };
};

/**
 * 입력 요소의 포커스 아웃 시 스크롤 위치 보정 헬퍼 함수
 */
export const handleInputBlurWithScrollCheck = (
  preventAutoScroll: () => void
) => {
  return () => {
    // 포커스 해제 후 잠시 후 스크롤 위치 재확인
    setTimeout(preventAutoScroll, 50);
  };
};

export default useScrollPreservation;