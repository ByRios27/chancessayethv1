import { useCallback, useEffect, useState } from 'react';
import { collection, limit, onSnapshot, query, where } from '../firebase';
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
    if (!enabled) return;

    const qRes = query(
      collection(db, 'results'),
      where('date', '==', businessDayKey),
      limit(300)
    );

    const unsubscribe = onSnapshot(qRes, (snapshot) => {
      const docs = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as LotteryResult));
      setResults((prev) => mergeResultsWithLiveFeed(prev, docs));
    }, (error) => {
      onError?.(error, 'get', 'results');
    });

    return () => unsubscribe();
  }, [businessDayKey, enabled, mergeResultsWithLiveFeed, onError]);

  return {
    results,
    setResults,
    getResultKey,
    sortResultsByRecency,
  };
}
