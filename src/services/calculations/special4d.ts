import { SPECIAL4D_LOTTERY_ID, normalizeSpecial4DSettings } from '../../config/special4d';
import type { Special4DSettings } from '../../types/lotteries';
import type { LotteryResult } from '../../types/results';
import type {
  Special4DFinancialSummary,
  Special4DPrizeResult,
  Special4DSettlement,
  Special4DTicket,
} from '../../types/special4d';

const getPrizeValue = (settings: Special4DSettings, rank: 1 | 2 | 3, position: 'first2' | 'last2') => {
  const key = `p${rank}` as keyof Special4DSettings['payouts'];
  return Number(settings.payouts[key]?.[position] || 0);
};

export const getSpecial4DTicketPrizes = ({
  ticket,
  resultsSource,
  settings,
}: {
  ticket: Special4DTicket;
  resultsSource: LotteryResult[];
  settings?: Partial<Special4DSettings> | null;
}): Special4DPrizeResult => {
  const normalizedSettings = normalizeSpecial4DSettings(settings);
  let totalPrize = 0;
  const winningMatches: Special4DPrizeResult['winningMatches'] = [];

  if (ticket.status === 'cancelled') return { totalPrize, winningMatches };

  const specialLotteryId = ticket.specialLotteryId || ticket.sourceLotteryId || SPECIAL4D_LOTTERY_ID;
  const result = resultsSource.find((item) => (
    item.date === ticket.date &&
    item.lotteryId === specialLotteryId
  ));
  if (!result) return { totalPrize, winningMatches };

  const playedNumber = String(ticket.number || '').slice(-2).padStart(2, '0');
  const quantity = Number(ticket.quantity || 0);
  const prizes: Array<{ rank: 1 | 2 | 3; value: string }> = [
    { rank: 1, value: result.firstPrize },
    { rank: 2, value: result.secondPrize },
    { rank: 3, value: result.thirdPrize },
  ];

  prizes.forEach(({ rank, value }) => {
    const winningNumber = String(value || '').replace(/\D/g, '');
    if (winningNumber.length < 4) return;

    const first2 = winningNumber.slice(0, 2);
    const last2 = winningNumber.slice(-2);

    if (playedNumber === first2) {
      const prize = getPrizeValue(normalizedSettings, rank, 'first2') * quantity;
      totalPrize += prize;
      winningMatches.push({ prizeRank: rank, position: 'first2', winningNumber, prize });
    }

    if (playedNumber === last2) {
      const prize = getPrizeValue(normalizedSettings, rank, 'last2') * quantity;
      totalPrize += prize;
      winningMatches.push({ prizeRank: rank, position: 'last2', winningNumber, prize });
    }
  });

  return { totalPrize, winningMatches };
};

export const buildSpecial4DFinancialSummary = ({
  tickets,
  settlements = [],
  resultsSource,
  settings,
  userEmail,
  targetDate,
}: {
  tickets: Special4DTicket[];
  settlements?: Special4DSettlement[];
  resultsSource: LotteryResult[];
  settings?: Partial<Special4DSettings> | null;
  userEmail?: string;
  targetDate?: string;
}): Special4DFinancialSummary => {
  const normalizedEmail = String(userEmail || '').toLowerCase();
  const matchesUser = (email?: string) => !normalizedEmail || String(email || '').toLowerCase() === normalizedEmail;

  const validTickets = tickets.filter((ticket) => {
    if (ticket.status === 'cancelled') return false;
    if (!matchesUser(ticket.sellerEmail)) return false;
    if (targetDate && ticket.date !== targetDate) return false;
    return true;
  });

  const validSettlements = settlements.filter((settlement) => {
    if (!matchesUser(settlement.userEmail)) return false;
    if (targetDate && settlement.date !== targetDate) return false;
    return true;
  });

  const totalSales = validTickets.reduce((sum, ticket) => sum + Number(ticket.totalAmount || 0), 0);
  const totalCommissions = validTickets.reduce((sum, ticket) => (
    sum + Number(ticket.totalAmount || 0) * (Number(ticket.commissionRate || 0) / 100)
  ), 0);
  const totalPrizes = validTickets.reduce((sum, ticket) => (
    sum + getSpecial4DTicketPrizes({ ticket, resultsSource, settings }).totalPrize
  ), 0);
  const amountReceived = validSettlements.reduce((sum, settlement) => sum + Number(settlement.amountReceived || 0), 0);
  const amountSent = validSettlements.reduce((sum, settlement) => sum + Number(settlement.amountSent || 0), 0);
  const netProfit = totalSales - totalCommissions - totalPrizes;
  const pendingBalance = netProfit - amountReceived + amountSent;

  return {
    tickets: validTickets,
    settlements: validSettlements,
    totalSales,
    totalCommissions,
    totalPrizes,
    netProfit,
    amountReceived,
    amountSent,
    totalLiquidated: amountReceived - amountSent,
    pendingBalance,
  };
};
