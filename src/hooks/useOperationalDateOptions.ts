import { useMemo } from 'react';

import type { LotteryTicket } from '../types/bets';
import type { Injection, Settlement } from '../types/finance';
import type { UserProfile } from '../types/users';

interface UseOperationalDateOptionsParams {
  businessDayKey: string;
  tickets: LotteryTicket[];
  historyTickets: LotteryTicket[];
  archiveTickets: LotteryTicket[];
  injections: Injection[];
  historyInjections: Injection[];
  settlements: Settlement[];
  historySettlements: Settlement[];
  users: UserProfile[];
  userProfile?: UserProfile | null;
  getQuickOperationalDate: (offset: number) => string;
  getTicketDateKey: (ticket: LotteryTicket) => string;
}

export function useOperationalDateOptions({
  businessDayKey,
  tickets,
  historyTickets,
  archiveTickets,
  injections,
  historyInjections,
  settlements,
  historySettlements,
  users,
  userProfile,
  getQuickOperationalDate,
  getTicketDateKey,
}: UseOperationalDateOptionsParams) {
  const recentOperationalDates = useMemo(() => {
    const collected = new Set<string>([
      businessDayKey,
      getQuickOperationalDate(-1),
      getQuickOperationalDate(-2),
      getQuickOperationalDate(-3),
    ]);

    const collectTicketDate = (ticket: LotteryTicket) => collected.add(getTicketDateKey(ticket));

    tickets.forEach(collectTicketDate);
    historyTickets.forEach(collectTicketDate);
    archiveTickets.forEach(collectTicketDate);
    injections.forEach(injection => injection.date && collected.add(injection.date));
    historyInjections.forEach(injection => injection.date && collected.add(injection.date));
    settlements.forEach(settlement => settlement.date && collected.add(settlement.date));
    historySettlements.forEach(settlement => settlement.date && collected.add(settlement.date));

    return Array.from(collected).sort((a, b) => b.localeCompare(a)).slice(0, 14);
  }, [
    archiveTickets,
    businessDayKey,
    getQuickOperationalDate,
    getTicketDateKey,
    historyInjections,
    historySettlements,
    historyTickets,
    injections,
    settlements,
    tickets,
  ]);

  const liquidationUsers = useMemo(() => {
    if (userProfile?.role === 'seller' && userProfile?.email) {
      return [userProfile];
    }
    return users;
  }, [userProfile, users]);

  return {
    recentOperationalDates,
    liquidationUsers,
  };
}
