import { useCallback, useEffect, useState } from 'react';
import { collection, db, limit, onSnapshot, query, where } from '../firebase';
import type { AppAlert } from '../types/alerts';

type FirestoreErrorHandler = (error: unknown, operation: 'get' | 'list', target: string) => void;

const timestampMs = (value: any) => value?.toDate?.()?.getTime?.() ?? (value?.seconds ? value.seconds * 1000 : 0);

export function useAppAlerts({
  enabled,
  userEmail,
  userRole,
  limitCount = 30,
  onError,
}: {
  enabled: boolean;
  userEmail?: string;
  userRole?: string;
  limitCount?: number;
  onError?: FirestoreErrorHandler;
}) {
  const [alerts, setAlerts] = useState<AppAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const refresh = useCallback(() => {
    setRefreshTick((prev) => prev + 1);
  }, []);

  useEffect(() => {
    const normalizedEmail = String(userEmail || '').toLowerCase();
    const normalizedRole = String(userRole || '').toLowerCase();
    if (!enabled || (!normalizedEmail && !normalizedRole)) {
      setAlerts([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const alertQueries = [
      {
        key: 'global',
        queryRef: query(collection(db, 'app_alerts'), where('global', '==', true), limit(limitCount)),
      },
    ];

    if (normalizedEmail) {
      alertQueries.push({
        key: `email:${normalizedEmail}`,
        queryRef: query(collection(db, 'app_alerts'), where('targetUserEmail', '==', normalizedEmail), limit(limitCount)),
      });
    }
    if (normalizedRole) {
      alertQueries.push({
        key: `role:${normalizedRole}`,
        queryRef: query(collection(db, 'app_alerts'), where('targetRole', '==', normalizedRole), limit(limitCount)),
      });
    }

    const sourceAlerts = new Map<string, AppAlert[]>();
    let receivedInitialSnapshots = 0;

    const publishAlerts = () => {
      const merged = new Map<string, AppAlert>();
      const now = Date.now();
      sourceAlerts.forEach((alertsForSource) => {
        alertsForSource.forEach((alert) => {
          const expiresAtMs = timestampMs(alert.expiresAt);
          if (expiresAtMs && expiresAtMs < now) return;
          merged.set(alert.id, alert);
        });
      });

      setAlerts(Array.from(merged.values()).sort((a, b) => {
        const priorityDiff = Number(b.priority || 0) - Number(a.priority || 0);
        if (priorityDiff !== 0) return priorityDiff;
        return timestampMs(b.createdAt) - timestampMs(a.createdAt);
      }));

      if (receivedInitialSnapshots >= alertQueries.length) {
        setLoading(false);
      }
    };

    const unsubscribes = alertQueries.map(({ key, queryRef }) =>
      onSnapshot(queryRef, (snapshot) => {
        if (!sourceAlerts.has(key)) receivedInitialSnapshots += 1;
        sourceAlerts.set(key, snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as AppAlert)));
        publishAlerts();
      }, (error) => {
        console.error('Error fetching app alerts:', error);
        const message = error instanceof Error ? error.message : 'No se pudieron cargar las alertas';
        setError(message);
        onError?.(error, 'get', 'app_alerts');
        setLoading(false);
      })
    );

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [enabled, limitCount, onError, refreshTick, userEmail, userRole]);

  return {
    alerts,
    loading,
    error,
    refresh,
  };
}
