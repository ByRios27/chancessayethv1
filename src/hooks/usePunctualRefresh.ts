import { useCallback, useEffect, useRef, useState, type TouchEvent } from 'react';

interface UsePunctualRefreshParams {
  enabled: boolean;
  confirmModalShow: boolean;
  refreshAuditLogs: () => void;
}

export function usePunctualRefresh({
  enabled,
  confirmModalShow,
  refreshAuditLogs,
}: UsePunctualRefreshParams) {
  const mainScrollRef = useRef<HTMLElement | null>(null);
  const pullStartYRef = useRef(0);
  const pullDistanceRef = useRef(0);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);

  const runAutoRefresh = useCallback(() => {
    if (!enabled) return;
    setIsAutoRefreshing(true);
    refreshAuditLogs();
    window.setTimeout(() => setIsAutoRefreshing(false), 600);
  }, [enabled, refreshAuditLogs]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        runAutoRefresh();
      }
    };
    const onOnlineRefresh = () => runAutoRefresh();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnlineRefresh);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnlineRefresh);
    };
  }, [runAutoRefresh]);

  useEffect(() => {
    if (!confirmModalShow) {
      runAutoRefresh();
    }
  }, [confirmModalShow, runAutoRefresh]);

  const handleMainTouchStart = useCallback((event: TouchEvent<HTMLElement>) => {
    if (!enabled || isPullRefreshing) return;
    const el = mainScrollRef.current;
    if (!el || el.scrollTop > 0) return;
    pullStartYRef.current = event.touches[0]?.clientY ?? 0;
    pullDistanceRef.current = 0;
  }, [enabled, isPullRefreshing]);

  const handleMainTouchMove = useCallback((event: TouchEvent<HTMLElement>) => {
    if (!enabled || isPullRefreshing || !pullStartYRef.current) return;
    const currentY = event.touches[0]?.clientY ?? 0;
    const delta = currentY - pullStartYRef.current;
    if (delta > 0) {
      pullDistanceRef.current = delta;
    }
  }, [enabled, isPullRefreshing]);

  const handleMainTouchEnd = useCallback(() => {
    if (!enabled || isPullRefreshing) return;
    if (pullDistanceRef.current > 72) {
      setIsPullRefreshing(true);
      runAutoRefresh();
      window.setTimeout(() => setIsPullRefreshing(false), 700);
    }
    pullStartYRef.current = 0;
    pullDistanceRef.current = 0;
  }, [enabled, isPullRefreshing, runAutoRefresh]);

  return {
    mainScrollRef,
    isAutoRefreshing,
    isPullRefreshing,
    handleMainTouchStart,
    handleMainTouchMove,
    handleMainTouchEnd,
  };
}
