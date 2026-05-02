import { useEffect, useState } from 'react';
import { collection, limit, onSnapshot, query, where } from '../firebase';
import { db } from '../firebase';
import type { Special4DSettlement } from '../types/special4d';

type FirestoreErrorHandler = (error: unknown, operation: 'get' | 'list', target: string) => void;

export function useSpecial4DSettlements({
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
  const [special4DSettlements, setSpecial4DSettlements] = useState<Special4DSettlement[]>([]);

  useEffect(() => {
    if (!enabled) {
      setSpecial4DSettlements([]);
      return;
    }
    if (!canAccessAllUsers && !sellerId) {
      setSpecial4DSettlements([]);
      return;
    }

    const qSettlements = canAccessAllUsers
      ? query(
        collection(db, 'special4_settlements'),
        where('date', '==', businessDayKey),
        limit(1000)
      )
      : query(
        collection(db, 'special4_settlements'),
        where('date', '==', businessDayKey),
        where('sellerId', '==', sellerId),
        limit(200)
      );

    const unsubscribe = onSnapshot(qSettlements, (snapshot) => {
      const docs = snapshot.docs
        .map((settlementDoc) => ({ id: settlementDoc.id, ...settlementDoc.data() } as Special4DSettlement))
        .sort((a, b) => {
          const aTime = a.timestamp?.toDate?.()?.getTime?.() ?? 0;
          const bTime = b.timestamp?.toDate?.()?.getTime?.() ?? 0;
          return bTime - aTime;
        });
      setSpecial4DSettlements(docs);
    }, (error) => {
      console.error('Error fetching Special 4D settlements:', error);
      onError?.(error, 'get', 'special4_settlements');
    });

    return unsubscribe;
  }, [businessDayKey, canAccessAllUsers, enabled, onError, sellerId]);

  return {
    special4DSettlements,
    setSpecial4DSettlements,
  };
}
