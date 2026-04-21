import type { LotteryTicket } from '../../types/bets';
import type { Injection, Settlement } from '../../types/finance';

interface BuildFinancialSummaryParams {
  tickets: LotteryTicket[];
  injections: Injection[];
  settlements?: Settlement[];
  userEmail?: string;
  targetDate?: string;
  prizeResolver: (ticket: LotteryTicket) => { totalPrize: number };
  getTicketDateKey: (ticket: LotteryTicket) => string;
}

export const buildFinancialSummary = ({
  tickets: sourceTickets,
  injections: sourceInjections,
  settlements: sourceSettlements = [],
  userEmail,
  targetDate,
  prizeResolver,
  getTicketDateKey,
}: BuildFinancialSummaryParams) => {
  const normalizedEmail = userEmail?.toLowerCase();
  const matchesUser = (email?: string) => !normalizedEmail || (email || '').toLowerCase() === normalizedEmail;

  const validTickets = sourceTickets.filter(ticket => {
    if (ticket.status === 'cancelled') return false;
    if (!matchesUser(ticket.sellerEmail)) return false;
    if (!targetDate) return true;
    return getTicketDateKey(ticket) === targetDate;
  });

  const validInjections = sourceInjections.filter(injection => {
    if (!matchesUser(injection.userEmail)) return false;
    if (targetDate && injection.date !== targetDate) return false;
    return (injection.type || 'injection') === 'injection';
  });

  const validSettlements = sourceSettlements.filter(settlement => {
    if (!matchesUser(settlement.userEmail)) return false;
    if (targetDate && settlement.date !== targetDate) return false;
    return true;
  });

  const totalSales = validTickets.reduce((sum, ticket) => sum + (ticket.totalAmount || 0), 0);
  const totalCommissions = validTickets.reduce((sum, ticket) => sum + ((ticket.totalAmount || 0) * ((ticket.commissionRate || 0) / 100)), 0);
  const totalPrizes = validTickets.reduce((sum, ticket) => sum + (prizeResolver(ticket).totalPrize || 0), 0);
  const totalInjections = validInjections.reduce((sum, injection) => sum + (injection.amount || 0), 0);
  const totalLiquidations = validSettlements.reduce((sum, settlement) => sum + (settlement.amountPaid || 0), 0);
  const netProfit = totalSales - totalCommissions - totalPrizes + totalInjections;

  return {
    tickets: validTickets,
    injections: validInjections,
    settlements: validSettlements,
    totalSales,
    totalCommissions,
    totalPrizes,
    totalInjections,
    totalLiquidations,
    netProfit
  };
};
