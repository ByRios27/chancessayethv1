import { useCallback } from 'react';

import { buildFinancialSummary as calculateFinancialSummary } from '../services/calculations/financial';
import { getTicketPrizesFromSource as calculateTicketPrizesFromSource } from '../services/calculations/prizes';
import type { LotteryTicket } from '../types/bets';
import type { Injection, Settlement } from '../types/finance';
import type { GlobalSettings } from '../types/lotteries';
import type { LotteryResult } from '../types/results';
import { getTicketDateKey as getTicketDateKeyForBusinessDay } from '../utils/tickets';
import { cleanText } from '../utils/text';

interface UseTicketFinancialsParams {
  businessDayKey: string;
  globalSettings: GlobalSettings;
  results: LotteryResult[];
  canAccessAllUsers: boolean;
  globalChancePriceFilter: string;
}

export function useTicketFinancials({
  businessDayKey,
  globalSettings,
  results,
  canAccessAllUsers,
  globalChancePriceFilter,
}: UseTicketFinancialsParams) {
  const getTicketDateKey = useCallback((ticket: LotteryTicket) => {
    return getTicketDateKeyForBusinessDay(ticket, businessDayKey);
  }, [businessDayKey]);

  const getTicketPrizesFromSource = useCallback((
    ticket: LotteryTicket,
    resultsSource: LotteryResult[],
    filterLottery?: string,
    typeFilter?: string
  ) => {
    return calculateTicketPrizesFromSource({
      ticket,
      resultsSource,
      globalSettings,
      getTicketDateKey,
      cleanText,
      filterLottery,
      typeFilter,
    });
  }, [getTicketDateKey, globalSettings]);

  const getTicketPrizes = useCallback((ticket: LotteryTicket, filterLottery?: string, typeFilter?: string) => {
    return getTicketPrizesFromSource(ticket, results, filterLottery, typeFilter);
  }, [getTicketPrizesFromSource, results]);

  const buildFinancialSummary = useCallback((params: {
    tickets: LotteryTicket[];
    injections: Injection[];
    settlements?: Settlement[];
    userEmail?: string;
    targetDate?: string;
    prizeResolver?: (ticket: LotteryTicket) => { totalPrize: number };
  }) => {
    const {
      tickets: sourceTickets,
      injections: sourceInjections,
      settlements: sourceSettlements = [],
      userEmail,
      targetDate,
      prizeResolver = (ticket: LotteryTicket) => getTicketPrizes(ticket),
    } = params;

    return calculateFinancialSummary({
      tickets: sourceTickets,
      injections: sourceInjections,
      settlements: sourceSettlements,
      userEmail,
      targetDate,
      prizeResolver,
      getTicketDateKey,
    });
  }, [getTicketDateKey, getTicketPrizes]);

  const getTicketChancePrice = useCallback((ticket: LotteryTicket): number | null => {
    if (typeof ticket.chancePrice === 'number' && !Number.isNaN(ticket.chancePrice)) {
      return ticket.chancePrice;
    }

    const chanceBet = (ticket.bets || []).find(b =>
      b.type === 'CH' && (b.quantity || 0) > 0 && (b.amount || 0) > 0
    );
    if (!chanceBet) return null;

    const inferredPrice = chanceBet.amount / chanceBet.quantity;
    const matchedPrice = globalSettings.chancePrices?.find(cp => Math.abs(cp.price - inferredPrice) < 0.001);
    return matchedPrice ? matchedPrice.price : Number(inferredPrice.toFixed(2));
  }, [globalSettings.chancePrices]);

  const ticketMatchesGlobalChancePrice = useCallback((ticket: LotteryTicket) => {
    if (!canAccessAllUsers || !globalChancePriceFilter) return true;
    const ticketPrice = getTicketChancePrice(ticket);
    if (ticketPrice === null) return false;
    return Math.abs(ticketPrice - parseFloat(globalChancePriceFilter)) < 0.001;
  }, [canAccessAllUsers, getTicketChancePrice, globalChancePriceFilter]);

  return {
    getTicketDateKey,
    getTicketPrizesFromSource,
    getTicketPrizes,
    buildFinancialSummary,
    getTicketChancePrice,
    ticketMatchesGlobalChancePrice,
  };
}
