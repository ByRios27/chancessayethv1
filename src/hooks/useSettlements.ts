import { useCallback, useEffect, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query, where } from '../firebase';
import { db } from '../firebase';
import type { Settlement } from '../types/finance';

type FirestoreErrorHandler = (error: unknown, operation: 'get' | 'list', target: string) => void;

export function useSettlements({
  enabled,
  canAccessAllUsers,
  sellerId,
  onError,
}: {
  enabled: boolean;
  canAccessAllUsers: boolean;
  sellerId?: string;
  onError?: FirestoreErrorHandler;
}) {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
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

    const qSettlements = canAccessAllUsers
      ? query(
        collection(db, 'settlements'),
        orderBy('timestamp', 'desc'),
        limit(120)
      )
      : query(
        collection(db, 'settlements'),
        where('sellerId', '==', sellerId),
        limit(50)
      );

    const unsubscribe = onSnapshot(
      qSettlements,
      (snapshot) => {
        const docs = snapshot.docs.map((settlementDoc) => ({ id: settlementDoc.id, ...settlementDoc.data() } as Settlement));
        setSettlements(docs);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching settlements:', error);
        const message = error instanceof Error ? error.message : 'No se pudieron cargar las liquidaciones';
        setError(message);
        onError?.(error, 'get', 'settlements');
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [enabled, canAccessAllUsers, sellerId, onError, refreshTick]);

  return {
    settlements,
    setSettlements,
    loading,
    error,
    refresh,
  };
}
