import { useEffect, useState } from 'react';
import { collection, limit, onSnapshot, query, where } from '../firebase';
import { db } from '../firebase';
import type { Special4DTicket } from '../types/special4d';

type FirestoreErrorHandler = (error: unknown, operation: 'get' | 'list', target: string) => void;

export function useSpecial4DTickets({
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
  const [special4DTickets, setSpecial4DTickets] = useState<Special4DTicket[]>([]);

  useEffect(() => {
    if (!enabled) {
      setSpecial4DTickets([]);
      return;
    }
    if (!canAccessAllUsers && !sellerId) {
      setSpecial4DTickets([]);
      return;
    }

    const qTickets = canAccessAllUsers
      ? query(
        collection(db, 'special4_tickets'),
        where('date', '==', businessDayKey),
        limit(2000)
      )
      : query(
        collection(db, 'special4_tickets'),
        where('date', '==', businessDayKey),
        where('sellerId', '==', sellerId),
        limit(500)
      );

    const unsubscribe = onSnapshot(qTickets, (snapshot) => {
      const docs = snapshot.docs
        .map((ticketDoc) => ({ id: ticketDoc.id, ...ticketDoc.data() } as Special4DTicket))
        .sort((a, b) => {
          const aTime = a.timestamp?.toDate?.()?.getTime?.() ?? 0;
          const bTime = b.timestamp?.toDate?.()?.getTime?.() ?? 0;
          return bTime - aTime;
        });
      setSpecial4DTickets(docs);
    }, (error) => {
      console.error('Error fetching Special 4D tickets:', error);
      onError?.(error, 'get', 'special4_tickets');
    });

    return unsubscribe;
  }, [businessDayKey, canAccessAllUsers, enabled, onError, sellerId]);

  return {
    special4DTickets,
    setSpecial4DTickets,
  };
}
