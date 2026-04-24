import { format } from 'date-fns';
import type { LotteryTicket } from '../../types/bets';

interface LotteryDayStatsParams {
  lotteryName: string;
  date: string;
  typeFilter?: string;
  businessDayKey: string;
  tickets: LotteryTicket[];
  historyTickets: LotteryTicket[];
  canAccessAllUsers: boolean;
  sellerId?: string;
  cleanText: (text: string) => string;
  getTicketPrizes: (ticket: LotteryTicket, filterLottery?: string, typeFilter?: string) => { totalPrize: number };
}

export const getLotteryDayStats = ({
  lotteryName,
  date,
  typeFilter,
  businessDayKey,
  tickets,
  historyTickets,
  canAccessAllUsers,
  sellerId,
  cleanText,
  getTicketPrizes,
}: LotteryDayStatsParams) => {
  const todayStr = businessDayKey;
  const sourceTickets = date === todayStr ? tickets : historyTickets;

  const dayTickets = sourceTickets.filter(t => {
    const tDateObj = t.timestamp?.toDate ? t.timestamp.toDate() : (t.timestamp?.seconds ? new Date(t.timestamp.seconds * 1000) : new Date());
    const tDate = format(tDateObj, 'yyyy-MM-dd');

    const matchesUser = canAccessAllUsers || (!!sellerId && t.sellerId === sellerId);

    return tDate === date && (t.status === 'active' || t.status === 'winner') && matchesUser && t.bets && t.bets.some(b => cleanText(b.lottery) === cleanText(lotteryName) && (!typeFilter || b.type === typeFilter));
  });

  const sales = dayTickets.reduce((acc, t) => {
    const lotBets = (t.bets || []).filter(b => b && b.lottery === lotteryName && (!typeFilter || b.type === typeFilter));
    return acc + lotBets.reduce((sum, b) => sum + (b.amount || 0), 0);
  }, 0);

  const commissions = dayTickets.reduce((acc, t) => {
    const lotBets = (t.bets || []).filter(b => b && b.lottery === lotteryName && (!typeFilter || b.type === typeFilter));
    const lotSales = lotBets.reduce((sum, b) => sum + (b.amount || 0), 0);
    return acc + (lotSales * (t.commissionRate || 0) / 100);
  }, 0);

  const prizes = dayTickets.reduce((acc, t) => {
    const { totalPrize } = getTicketPrizes(t, lotteryName, typeFilter);
    return acc + totalPrize;
  }, 0);

  const netProfit = sales - commissions - prizes;

  return { sales, commissions, prizes, netProfit, isLoss: netProfit < 0 };
};

interface StatsByDrawParams {
  lotteryName: string;
  date: string;
  businessDayKey: string;
  tickets: LotteryTicket[];
  historyTickets: LotteryTicket[];
  canAccessAllUsers: boolean;
  sellerId?: string;
  cleanText: (text: string) => string;
  getTicketPrizes: (ticket: LotteryTicket, filterLottery?: string, typeFilter?: string) => { totalPrize: number };
}

export const getStatsByDraw = ({
  lotteryName,
  date,
  businessDayKey,
  tickets,
  historyTickets,
  canAccessAllUsers,
  sellerId,
  cleanText,
  getTicketPrizes,
}: StatsByDrawParams) => {
  const todayStr = businessDayKey;
  const sourceTickets = date === todayStr ? tickets : historyTickets;

  const dayTickets = sourceTickets.filter(t => {
    const tDateObj = t.timestamp?.toDate ? t.timestamp.toDate() : (t.timestamp?.seconds ? new Date(t.timestamp.seconds * 1000) : new Date());
    const tDate = format(tDateObj, 'yyyy-MM-dd');

    const matchesUser = canAccessAllUsers || (!!sellerId && t.sellerId === sellerId);

    return tDate === date && (t.status === 'active' || t.status === 'winner') && matchesUser && t.bets && t.bets.some(b => cleanText(b.lottery) === cleanText(lotteryName));
  });

  const pzsVolume = dayTickets.reduce((acc, t) => {
    const lotBets = (t.bets || []).filter(b => b && b.lottery === lotteryName && b.type === 'CH');
    return acc + lotBets.reduce((sum, b) => sum + (b.quantity || 0), 0);
  }, 0);

  const totalMoneyVolume = dayTickets.reduce((acc, t) => {
    const lotBets = (t.bets || []).filter(b => b && b.lottery === lotteryName);
    return acc + lotBets.reduce((sum, b) => sum + (b.amount || 0), 0);
  }, 0);

  const totalPrize = dayTickets.reduce((acc, t) => {
    const { totalPrize } = getTicketPrizes(t, lotteryName);
    return acc + totalPrize;
  }, 0);

  return { pzsVolume, totalMoneyVolume, totalPrize, tickets: dayTickets };
};

interface UserLotteryDayStatsParams {
  sellerId: string;
  lotteryName: string;
  date: string;
  typeFilter?: string;
  businessDayKey: string;
  tickets: LotteryTicket[];
  historyTickets: LotteryTicket[];
  getTicketPrizes: (ticket: LotteryTicket, filterLottery?: string, typeFilter?: string) => { totalPrize: number };
}

export const getUserLotteryDayStats = ({
  sellerId,
  lotteryName,
  date,
  typeFilter,
  businessDayKey,
  tickets,
  historyTickets,
  getTicketPrizes,
}: UserLotteryDayStatsParams) => {
  const todayStr = businessDayKey;
  const sourceTickets = date === todayStr ? tickets : historyTickets;

  const dayTickets = sourceTickets.filter(t => {
    const tDate = t.timestamp?.toDate ? format(t.timestamp.toDate(), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
    return tDate === date && (t.status === 'active' || t.status === 'winner') && t.sellerId === sellerId && t.bets && t.bets.some(b => b.lottery === lotteryName && (!typeFilter || b.type === typeFilter));
  });

  const sales = dayTickets.reduce((acc, t) => {
    const lotBets = (t.bets || []).filter(b => b && b.lottery === lotteryName && (!typeFilter || b.type === typeFilter));
    return acc + lotBets.reduce((sum, b) => sum + (b.amount || 0), 0);
  }, 0);

  const commissions = dayTickets.reduce((acc, t) => {
    const lotBets = (t.bets || []).filter(b => b && b.lottery === lotteryName && (!typeFilter || b.type === typeFilter));
    const lotSales = lotBets.reduce((sum, b) => sum + (b.amount || 0), 0);
    return acc + (lotSales * (t.commissionRate || 0) / 100);
  }, 0);

  const prizes = dayTickets.reduce((acc, t) => {
    const { totalPrize } = getTicketPrizes(t, lotteryName, typeFilter);
    return acc + totalPrize;
  }, 0);

  const netProfit = sales - commissions - prizes;

  return { sales, commissions, prizes, netProfit, isLoss: netProfit < 0 };
};
