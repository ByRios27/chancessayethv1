import { useEffect, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query, where } from '../firebase';
import { db } from '../firebase';
import type { Settlement } from '../types/finance';

type FirestoreErrorHandler = (error: unknown, operation: 'get' | 'list', target: string) => void;

export function useSettlements({
  enabled,
  canAccessAllUsers,
  userEmail,
  onError,
}: {
  enabled: boolean;
  canAccessAllUsers: boolean;
  userEmail?: string;
  onError?: FirestoreErrorHandler;
}) {
  const [settlements, setSettlements] = useState<Settlement[]>([]);

  useEffect(() => {
    if (!enabled) return;

    console.log('Fetching settlements for user:', userEmail?.toLowerCase());

    if (canAccessAllUsers) {
      const qSettlements = query(
        collection(db, 'settlements'),
        orderBy('timestamp', 'desc'),
        limit(120)
      );
      const unsubscribeSettlements = onSnapshot(qSettlements, (snapshot) => {
        console.log('Settlements fetched successfully:', snapshot.size);
        const docs = snapshot.docs.map((settlementDoc) => ({ id: settlementDoc.id, ...settlementDoc.data() } as Settlement));
        setSettlements(docs);
      }, (error) => {
        console.error('Error fetching settlements:', error);
        onError?.(error, 'get', 'settlements');
      });

      return () => unsubscribeSettlements();
    }

    const qSettlements = query(
      collection(db, 'settlements'),
      where('userEmail', '==', userEmail?.toLowerCase()),
      limit(50)
    );
    const unsubscribeSettlements = onSnapshot(qSettlements, (snapshot) => {
      console.log('Settlements fetched successfully:', snapshot.size);
      const docs = snapshot.docs.map((settlementDoc) => ({ id: settlementDoc.id, ...settlementDoc.data() } as Settlement));
      setSettlements(docs);
    }, (error) => {
      console.error('Error fetching settlements:', error);
      onError?.(error, 'get', 'settlements');
    });

    return () => unsubscribeSettlements();
  }, [enabled, canAccessAllUsers, userEmail, onError]);

  return {
    settlements,
    setSettlements,
  };
}
