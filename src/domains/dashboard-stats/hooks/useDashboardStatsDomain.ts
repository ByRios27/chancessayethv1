import { useMemo, useState } from 'react';
import type { Bet, LotteryTicket } from '../../../types/bets';

export function useDashboardStatsDomain(params: any) {
  const {
    mode,
    historyTickets,
    lotteries,
    cleanText,
    formatTime12h,
    ticketMatchesGlobalChancePrice,
    injections,
    todayStr,
    operationalSellerId,
  } = params;

  const [expandedStats, setExpandedStats] = useState<string[]>([]);

  const recentInjections = useMemo(() => {
    return (injections || [])
      .filter((i: any) => i.date === todayStr && (!!operationalSellerId && i.sellerId === operationalSellerId))
      .slice(0, 5);
  }, [injections, operationalSellerId, todayStr]);

  const statsLotteries = useMemo(() => {
    if (mode !== 'stats') return [];

    const betsByLottery: Record<string, Bet[]> = {};
    (historyTickets as LotteryTicket[])
      .filter((ticket) => ticketMatchesGlobalChancePrice(ticket))
      .forEach((ticket) => {
        if (ticket.status === 'cancelled') return;
        (ticket.bets || []).forEach((bet) => {
          if (!betsByLottery[bet.lottery]) {
            betsByLottery[bet.lottery] = [];
          }
          betsByLottery[bet.lottery].push(bet);
        });
      });

    const lotteryNames = Object.keys(betsByLottery).sort();

    return lotteryNames.map((lotteryName) => {
      const lotteryInfo = lotteries.find((l: any) => cleanText(l.name) === cleanText(lotteryName));
      const timeStr = lotteryInfo?.drawTime ? ` - ${formatTime12h(lotteryInfo.drawTime)}` : '';
      const bets = betsByLottery[lotteryName] || [];

      return {
        lotteryName,
        timeStr,
        bets,
      };
    });
  }, [cleanText, formatTime12h, historyTickets, lotteries, mode, ticketMatchesGlobalChancePrice]);

  return {
    expandedStats,
    setExpandedStats,
    recentInjections,
    statsLotteries,
  };
}
