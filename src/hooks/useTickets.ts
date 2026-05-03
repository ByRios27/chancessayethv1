import { useEffect, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query, where } from '../firebase';
import { db } from '../firebase';
import type { LotteryTicket } from '../types/bets';
import { getStartOfBusinessDay } from '../utils/dates';

type FirestoreErrorHandler = (error: unknown, operation: 'get' | 'list', target: string) => void;

export function useTickets({
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
  const [tickets, setTickets] = useState<LotteryTicket[]>([]);

  useEffect(() => {
    if (!enabled) return;
    if (!canAccessAllUsers && !sellerId) return;

    const startOfToday = getStartOfBusinessDay();

    const mergeTicketSnapshots = (...snapshots: Array<{ docs: Array<{ id: string; data: () => unknown }> } | null>) => {
      const merged = new Map<string, LotteryTicket>();
      snapshots.forEach((snapshot) => {
        snapshot?.docs.forEach((ticketDoc) => {
          merged.set(ticketDoc.id, { id: ticketDoc.id, ...(ticketDoc.data() as Omit<LotteryTicket, 'id'>) });
        });
      });
      return Array.from(merged.values()).sort((a, b) => {
        const aTime = a.timestamp?.toDate?.()?.getTime?.() ?? 0;
        const bTime = b.timestamp?.toDate?.()?.getTime?.() ?? 0;
        return bTime - aTime;
      });
    };

    if (canAccessAllUsers) {
      const qToday = query(
        collection(db, 'tickets'),
        where('timestamp', '>=', startOfToday),
        orderBy('timestamp', 'desc'),
        limit(2000)
      );

      const unsubscribeTickets = onSnapshot(qToday, (snapshot) => {
        setTickets(mergeTicketSnapshots(snapshot));
      }, (error) => {
        console.error("Error fetching today's tickets:", error);
        onError?.(error, 'get', 'tickets_today');
      });

      return () => unsubscribeTickets();
    }

    const qTodayBySellerId = query(
      collection(db, 'tickets'),
      where('sellerId', '==', sellerId),
      where('timestamp', '>=', startOfToday),
      orderBy('timestamp', 'desc'),
      limit(500)
    );

    let sellerIdSnapshot: { docs: Array<{ id: string; data: () => unknown }> } | null = null;
    const publishSellerTickets = () => {
      const merged = mergeTicketSnapshots(sellerIdSnapshot);
      setTickets(merged);
    };

    const unsubscribeTicketsById = onSnapshot(qTodayBySellerId, (snapshot) => {
      sellerIdSnapshot = snapshot;
      publishSellerTickets();
    }, (error) => {
      console.error("Error fetching today's tickets by sellerId:", error);
      onError?.(error, 'get', 'tickets_today_by_sellerId');
    });

    return () => {
      unsubscribeTicketsById();
    };
  }, [enabled, canAccessAllUsers, businessDayKey, sellerId, onError]);

  return {
    tickets,
    setTickets,
  };
}
