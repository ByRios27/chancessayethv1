import { useCallback, useEffect, useState } from 'react';
import { collection, limit, onSnapshot, query, where } from '../firebase';
import { db } from '../firebase';
import type { Injection } from '../types/finance';

type FirestoreErrorHandler = (error: unknown, operation: 'get' | 'list', target: string) => void;

export function useInjections({
  enabled,
  canAccessAllUsers,
  businessDayKey,
  sellerId,
  onError,
}: {
  enabled: boolean;
  canAccessAllUsers: boolean;
  businessDayKey: string;
  sellerId?: string;
  onError?: FirestoreErrorHandler;
}) {
  const [injections, setInjections] = useState<Injection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const refresh = useCallback(() => {
    setRefreshTick((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setError(null);
      return;
    }
    if (!canAccessAllUsers && !sellerId) {
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);

    const qInj = canAccessAllUsers
      ? query(
        collection(db, 'injections'),
        where('date', '==', businessDayKey),
        limit(500)
      )
      : query(
        collection(db, 'injections'),
        where('sellerId', '==', sellerId),
        where('date', '==', businessDayKey),
        limit(50)
      );

    const unsubscribe = onSnapshot(
      qInj,
      (snapshot) => {
        const docs = snapshot.docs.map((injDoc) => ({ id: injDoc.id, ...injDoc.data() } as Injection));
        setInjections(docs);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching injections:', error);
        const message = error instanceof Error ? error.message : 'No se pudieron cargar las inyecciones';
        setError(message);
        onError?.(error, 'get', 'injections');
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [enabled, canAccessAllUsers, businessDayKey, sellerId, onError, refreshTick]);

  return {
    injections,
    setInjections,
    loading,
    error,
    refresh,
  };
}
