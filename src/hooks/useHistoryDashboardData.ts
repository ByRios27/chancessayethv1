import { useMemo, type MutableRefObject } from 'react';

import { format } from 'date-fns';

import { calculateUserStats } from '../services/calculations/stats';
import type { LotteryTicket } from '../types/bets';
import type { Injection } from '../types/finance';
import type { Lottery } from '../types/lotteries';
import type { LotteryResult } from '../types/results';
import type { UserProfile } from '../types/users';
import { cleanText } from '../utils/text';

export type ClosedLotteryCardsCacheEntry = {
  sales: number;
  commissions: number;
  prizes: number;
  netProfit: number;
  sortedTicketsForLot: Array<{ t: LotteryTicket; prize: number }>;
};

type HistoryFilter = 'TODO' | 'CHANCE' | 'BILLETE' | 'PALE';

type PrizeResult = { totalPrize: number };

type FinancialSummary = {
  totalSales: number;
  totalCommissions: number;
  totalPrizes: number;
  totalInjections: number;
  netProfit: number;
};

type FinancialSummaryBuilder = (params: {
  tickets: LotteryTicket[];
  injections: Injection[];
  targetDate?: string;
  prizeResolver?: (ticket: LotteryTicket) => PrizeResult;
}) => FinancialSummary;

interface UseHistoryDashboardDataParams {
  activeTab: string;
  businessDayKey: string;
  tickets: LotteryTicket[];
  historyTickets: LotteryTicket[];
  injections: Injection[];
  historyInjections: Injection[];
  historyDate: string;
  historyFilter: HistoryFilter;
  canAccessAllUsers: boolean;
  operationalSellerId: string;
  userProfile?: UserProfile | null;
  currentUserEmail?: string | null;
  currentUserUid?: string | null;
  users: UserProfile[];
  results: LotteryResult[];
  sortedLotteries: Lottery[];
  lotteryPages: Record<string, number>;
  closedLotteryCardsCacheRef: MutableRefObject<Map<string, ClosedLotteryCardsCacheEntry>>;
  getTicketDateKey: (ticket: LotteryTicket) => string;
  getTicketPrizes: (ticket: LotteryTicket, filterLottery?: string, typeFilter?: string) => PrizeResult;
  buildFinancialSummary: FinancialSummaryBuilder;
  isLotteryOpenForSales: (lottery: Lottery) => boolean;
}

export function useHistoryDashboardData({
  activeTab,
  businessDayKey,
  tickets,
  historyTickets,
  injections,
  historyInjections,
  historyDate,
  historyFilter,
  canAccessAllUsers,
  operationalSellerId,
  userProfile,
  currentUserEmail,
  currentUserUid,
  users,
  results,
  sortedLotteries,
  lotteryPages,
  closedLotteryCardsCacheRef,
  getTicketDateKey,
  getTicketPrizes,
  buildFinancialSummary,
  isLotteryOpenForSales,
}: UseHistoryDashboardDataParams) {
  const todayStr = businessDayKey;

  const todayStats = useMemo(() => {
    const todayTickets = tickets.filter(t => {
      const tDate = getTicketDateKey(t);
      const matchesDate = tDate === todayStr;
      const matchesUser = canAccessAllUsers || (!!operationalSellerId && t.sellerId === operationalSellerId);
      return matchesDate && matchesUser && t.status !== 'cancelled';
    });
    const todayInjections = injections.filter(i =>
      i.date === todayStr && (canAccessAllUsers || (!!operationalSellerId && i.sellerId === operationalSellerId))
    );
    const summary = buildFinancialSummary({
      tickets: todayTickets,
      injections: todayInjections,
      targetDate: todayStr,
    });
    const bankProfit = summary.totalSales - summary.totalCommissions - summary.totalPrizes;
    const pendingDebt = userProfile?.currentDebt || 0;

    return {
      sales: summary.totalSales,
      commissions: summary.totalCommissions,
      prizes: summary.totalPrizes,
      injections: summary.totalInjections,
      bankProfit,
      netProfit: summary.netProfit,
      pendingDebt,
    };
  }, [buildFinancialSummary, canAccessAllUsers, getTicketDateKey, injections, operationalSellerId, tickets, todayStr, userProfile?.currentDebt]);

  const filteredTickets = useMemo(() => {
    const source = activeTab === 'history'
      ? (historyDate === todayStr ? tickets : historyTickets)
      : tickets;

    return source.filter(t => {
      const tDate = t.timestamp?.toDate
        ? t.timestamp.toDate()
        : (t.timestamp?.seconds ? new Date(t.timestamp.seconds * 1000) : new Date());
      const ticketDate = format(tDate, 'yyyy-MM-dd');
      const matchesDate = activeTab === 'history' ? ticketDate === historyDate : true;
      const matchesUser = canAccessAllUsers || (!!operationalSellerId && t.sellerId === operationalSellerId);

      return matchesDate && matchesUser;
    }).sort((a, b) => {
      const timeA = a.timestamp?.seconds || 0;
      const timeB = b.timestamp?.seconds || 0;
      return timeB - timeA;
    });
  }, [activeTab, canAccessAllUsers, historyDate, historyTickets, operationalSellerId, tickets, todayStr]);

  const historyTypeFilterCode = useMemo(() => {
    return historyFilter === 'CHANCE' ? 'CH' :
           historyFilter === 'BILLETE' ? 'BL' :
           historyFilter === 'PALE' ? 'PL' : undefined;
  }, [historyFilter]);

  const historyLotteryCards = useMemo(() => {
    if (activeTab !== 'history') return [];

    return sortedLotteries.map(lot => {
      const ticketsForLot = filteredTickets.filter(ticket =>
        ticket.bets && ticket.bets.some(bet =>
          bet && cleanText(bet.lottery) === cleanText(lot.name) && (!historyTypeFilterCode || bet.type === historyTypeFilterCode)
        )
      );
      if (!ticketsForLot.length) return null;

      const resultForLottery = results.find(result => result.lotteryId === lot.id && result.date === historyDate);
      const isClosedWithResult = !isLotteryOpenForSales(lot) && !!resultForLottery;
      const resultSignature = resultForLottery
        ? `${resultForLottery.firstPrize}-${resultForLottery.secondPrize}-${resultForLottery.thirdPrize}`
        : 'no-result';
      const scopeSignature = canAccessAllUsers ? 'global' : `seller:${(currentUserEmail || currentUserUid || '').toLowerCase()}`;
      const cacheKey = `${historyDate}|${lot.id}|${historyTypeFilterCode || 'ALL'}|${scopeSignature}|${resultSignature}`;

      let cachedCard = isClosedWithResult ? closedLotteryCardsCacheRef.current.get(cacheKey) : undefined;
      if (!cachedCard) {
        const sales = ticketsForLot.reduce((acc, ticket) => {
          const lotBets = (ticket.bets || []).filter(bet =>
            bet && cleanText(bet.lottery) === cleanText(lot.name) && (!historyTypeFilterCode || bet.type === historyTypeFilterCode)
          );
          return acc + lotBets.reduce((sum, bet) => sum + (bet.amount || 0), 0);
        }, 0);
        const commissions = ticketsForLot.reduce((acc, ticket) => {
          const lotBets = (ticket.bets || []).filter(bet =>
            bet && cleanText(bet.lottery) === cleanText(lot.name) && (!historyTypeFilterCode || bet.type === historyTypeFilterCode)
          );
          const lotSales = lotBets.reduce((sum, bet) => sum + (bet.amount || 0), 0);
          return acc + (lotSales * (ticket.commissionRate || 0) / 100);
        }, 0);
        const sortedTicketsForLot = ticketsForLot
          .map(ticket => ({ t: ticket, prize: getTicketPrizes(ticket, lot.name, historyTypeFilterCode).totalPrize }))
          .sort((a, b) => b.prize - a.prize);
        const prizes = sortedTicketsForLot.reduce((sum, item) => sum + item.prize, 0);
        const netProfit = sales - commissions - prizes;

        cachedCard = { sales, commissions, prizes, netProfit, sortedTicketsForLot };
        if (isClosedWithResult) {
          closedLotteryCardsCacheRef.current.set(cacheKey, cachedCard);
        }
      }

      const currentPage = lotteryPages[lot.id] || 1;
      const itemsPerPage = 4;
      const totalPages = Math.max(1, Math.ceil(cachedCard.sortedTicketsForLot.length / itemsPerPage));
      const paginatedTickets = cachedCard.sortedTicketsForLot.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

      return {
        lot,
        ticketsForLot,
        resultForLottery,
        isClosedWithResult,
        sales: cachedCard.sales,
        prizes: cachedCard.prizes,
        netProfit: cachedCard.netProfit,
        isLoss: cachedCard.netProfit < 0,
        sortedTicketsForLot: cachedCard.sortedTicketsForLot,
        currentPage,
        totalPages,
        paginatedTickets,
      };
    }).filter((item): item is NonNullable<typeof item> => !!item);
  }, [
    activeTab,
    canAccessAllUsers,
    closedLotteryCardsCacheRef,
    currentUserEmail,
    currentUserUid,
    filteredTickets,
    getTicketPrizes,
    historyDate,
    historyTypeFilterCode,
    isLotteryOpenForSales,
    lotteryPages,
    results,
    sortedLotteries,
  ]);

  const userStats = useMemo(() => {
    if (!['users', 'history', 'dashboard', 'liquidaciones'].includes(activeTab)) return {};

    return calculateUserStats({
      users,
      tickets: activeTab === 'history' ? historyTickets : tickets,
      injections: activeTab === 'history' ? historyInjections : injections,
      targetDate: activeTab === 'history' ? historyDate : businessDayKey,
      getTicketPrizes,
    });
  }, [activeTab, businessDayKey, getTicketPrizes, historyDate, historyInjections, historyTickets, injections, tickets, users]);

  return {
    todayStr,
    todayStats,
    filteredTickets,
    historyTypeFilterCode,
    historyLotteryCards,
    userStats,
  };
}
