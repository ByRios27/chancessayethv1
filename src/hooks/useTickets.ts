import { useEffect, useState } from 'react';
import { collection, limit, onSnapshot, query, where } from '../firebase';
import { db } from '../firebase';
import type { LotteryTicket } from '../types/bets';
import { getStartOfBusinessDay } from '../utils/dates';

type FirestoreErrorHandler = (error: unknown, operation: 'get' | 'list', target: string) => void;

export function useTickets({
  enabled,
  canAccessAllUsers,
  businessDayKey,
  userUid,
  userEmail,
  userRole,
  userCanLiquidate,
  onError,
}: {
  enabled: boolean;
  canAccessAllUsers: boolean;
  businessDayKey: string;
  userUid?: string;
  userEmail?: string;
  userRole?: string;
  userCanLiquidate?: boolean;
  onError?: FirestoreErrorHandler;
}) {
  const [tickets, setTickets] = useState<LotteryTicket[]>([]);

  useEffect(() => {
    if (!enabled || !userUid || !userRole) return;

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

    console.log("Fetching today's tickets for user:", userUid);

    if (canAccessAllUsers) {
      const qToday = query(
        collection(db, 'tickets'),
        where('timestamp', '>=', startOfToday),
        limit(2000)
      );

      const unsubscribeTickets = onSnapshot(qToday, (snapshot) => {
        console.log("Today's tickets fetched successfully:", snapshot.size);
        setTickets(mergeTicketSnapshots(snapshot));
      }, (error) => {
        console.error("Error fetching today's tickets:", error);
        onError?.(error, 'get', 'tickets_today');
      });

      return () => unsubscribeTickets();
    }

    const sellerEmail = userEmail?.toLowerCase();
    const qTodayBySellerId = query(
      collection(db, 'tickets'),
      where('sellerId', '==', userUid),
      where('timestamp', '>=', startOfToday),
      limit(500)
    );
    const qTodayBySellerEmail = sellerEmail
      ? query(
          collection(db, 'tickets'),
          where('sellerEmail', '==', sellerEmail),
          where('timestamp', '>=', startOfToday),
          limit(500)
        )
      : null;

    let sellerIdSnapshot: { docs: Array<{ id: string; data: () => unknown }> } | null = null;
    let sellerEmailSnapshot: { docs: Array<{ id: string; data: () => unknown }> } | null = null;
    const publishSellerTickets = () => {
      const merged = mergeTicketSnapshots(sellerIdSnapshot, sellerEmailSnapshot);
      console.log("Today's seller tickets fetched successfully:", merged.length);
      setTickets(merged);
    };

    const unsubscribeTicketsById = onSnapshot(qTodayBySellerId, (snapshot) => {
      sellerIdSnapshot = snapshot;
      publishSellerTickets();
    }, (error) => {
      console.error("Error fetching today's tickets by sellerId:", error);
      onError?.(error, 'get', 'tickets_today_by_sellerId');
    });

    const unsubscribeTicketsByEmail = qTodayBySellerEmail
      ? onSnapshot(qTodayBySellerEmail, (snapshot) => {
          sellerEmailSnapshot = snapshot;
          publishSellerTickets();
        }, (error) => {
          console.error("Error fetching today's tickets by sellerEmail:", error);
          onError?.(error, 'get', 'tickets_today_by_sellerEmail');
        })
      : () => {};

    return () => {
      unsubscribeTicketsById();
      unsubscribeTicketsByEmail();
    };
  }, [enabled, canAccessAllUsers, businessDayKey, userUid, userEmail, userRole, userCanLiquidate, onError]);

  return {
    tickets,
    setTickets,
  };
}
