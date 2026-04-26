import { useCallback, useEffect, useState } from 'react';
import { collection, db, getDocs, limit, orderBy, query } from '../firebase';

type FirestoreErrorHandler = (error: unknown, operation: 'get' | 'list', target: string) => void;

export interface DailyAuditLogEvent {
  id: string;
  type: string;
  date: string;
  createdAt?: any;
  actorEmail?: string;
  actorSellerId?: string;
  actorName?: string;
  actorRole?: string;
  targetEmail?: string;
  targetSellerId?: string;
  targetName?: string;
  details?: Record<string, unknown>;
}

export function useDailyAuditLogs({
  enabled,
  date,
  limitCount = 40,
  onError,
}: {
  enabled: boolean;
  date: string;
  limitCount?: number;
  onError?: FirestoreErrorHandler;
}) {
  const [logs, setLogs] = useState<DailyAuditLogEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const refresh = useCallback(() => {
    setRefreshTick((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!enabled || !date) {
      setLogs([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const run = async () => {
      try {
        const logsQuery = query(
          collection(db, 'daily_audit_logs', date, 'events'),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );
        const snapshot = await getDocs(logsQuery);
        if (cancelled) return;
        setLogs(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as DailyAuditLogEvent)));
      } catch (error) {
        console.error('Error fetching daily audit logs:', error);
        const message = error instanceof Error ? error.message : 'No se pudo cargar la auditoria diaria';
        setError(message);
        onError?.(error, 'get', `daily_audit_logs/${date}/events`);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [enabled, date, limitCount, onError, refreshTick]);

  return {
    logs,
    setLogs,
    loading,
    error,
    refresh,
  };
}
