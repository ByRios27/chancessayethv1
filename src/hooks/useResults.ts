import { useCallback, useEffect, useState } from 'react';
import { collection, getDocs, limit, query, where } from '../firebase';
import { db } from '../firebase';
import type { LotteryResult } from '../types/results';

type FirestoreErrorHandler = (error: unknown, operation: 'get' | 'list', target: string) => void;

export function useResults({
  enabled,
  businessDayKey,
  onError,
}: {
  enabled: boolean;
  businessDayKey: string;
  onError?: FirestoreErrorHandler;
}) {
  const [results, setResults] = useState<LotteryResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const refresh = useCallback(() => {
    setRefreshTick((prev) => prev + 1);
  }, []);

  const getResultKey = useCallback((result: LotteryResult) => {
    return result.id || `${result.lotteryId}|${result.date}|${result.firstPrize}|${result.secondPrize}|${result.thirdPrize}`;
  }, []);

  const sortResultsByRecency = useCallback((items: LotteryResult[]) => {
    return [...items].sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      const aTime = a.timestamp?.toDate?.()?.getTime?.() ?? (a.timestamp?.seconds ? a.timestamp.seconds * 1000 : 0);
      const bTime = b.timestamp?.toDate?.()?.getTime?.() ?? (b.timestamp?.seconds ? b.timestamp.seconds * 1000 : 0);
      return bTime - aTime;
    });
  }, []);

  const mergeResultsWithLiveFeed = useCallback((previous: LotteryResult[], liveResults: LotteryResult[]) => {
    const liveKeys = new Set(liveResults.map(getResultKey));
    const merged = new Map<string, LotteryResult>();

    liveResults.forEach((item) => {
      merged.set(getResultKey(item), item);
    });

    previous.forEach((item) => {
      const key = getResultKey(item);
      if (!liveKeys.has(key) && item.date !== businessDayKey) {
        merged.set(key, item);
      }
    });

    return sortResultsByRecency(Array.from(merged.values()));
  }, [businessDayKey, getResultKey, sortResultsByRecency]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    const qRes = query(
      collection(db, 'results'),
      where('date', '==', businessDayKey),
      limit(300)
    );

    const run = async () => {
      try {
        const snapshot = await getDocs(qRes);
        if (cancelled) return;
        const docs = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as LotteryResult));
        setResults((prev) => mergeResultsWithLiveFeed(prev, docs));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudieron cargar los resultados';
        setError(message);
        onError?.(error, 'get', 'results');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [businessDayKey, enabled, mergeResultsWithLiveFeed, onError, refreshTick]);

  return {
    results,
    setResults,
    getResultKey,
    sortResultsByRecency,
    loading,
    error,
    refresh,
  };
}
