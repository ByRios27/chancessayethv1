import type { LotteryTicket } from '../../types/bets';
import type { LotteryResult } from '../../types/results';
import type { GlobalSettings } from '../../types/lotteries';
import { SPECIAL4D_LOTTERY_ID, normalizeSpecial4DSettings } from '../../config/special4d';

export interface TicketWinningBet {
  idx: number;
  prize: number;
  rank: number;
  lotteryName: string;
  winningNumber: string;
  matchType?: string;
}

export interface TicketPrizeResult {
  totalPrize: number;
  winningBets: TicketWinningBet[];
}

interface GetTicketPrizesFromSourceParams {
  ticket: LotteryTicket;
  resultsSource: LotteryResult[];
  globalSettings: GlobalSettings;
  getTicketDateKey: (ticket: LotteryTicket) => string;
  cleanText: (text: string) => string;
  filterLottery?: string;
  typeFilter?: string;
}

export const getTicketPrizesFromSource = ({
  ticket,
  resultsSource,
  globalSettings,
  getTicketDateKey,
  cleanText,
  filterLottery,
  typeFilter,
}: GetTicketPrizesFromSourceParams): TicketPrizeResult => {
  let totalPrize = 0;
  const winningBets: TicketWinningBet[] = [];

  if (ticket.status === 'cancelled') return { totalPrize, winningBets };

  const ticketDate = getTicketDateKey(ticket);

  (ticket.bets || []).forEach((bet, idx) => {
    if (filterLottery) {
      const matchesFilter = bet.lotteryId === filterLottery || cleanText(bet.lottery) === cleanText(filterLottery);
      if (!matchesFilter) return;
    }
    if (typeFilter && bet.type !== typeFilter) return;

    const result = resultsSource.find(r => (
      r.date === ticketDate &&
      (bet.lotteryId ? r.lotteryId === bet.lotteryId : cleanText(r.lotteryName) === cleanText(bet.lottery))
    ));
    if (!result) return;

    const last2 = bet.number.slice(-2);

    if (bet.type === 'CH') {
      const quantity = bet.quantity || 1;
      const isSpecial4DChance = bet.lotteryId === SPECIAL4D_LOTTERY_ID;

      if (isSpecial4DChance) {
        const specialSettings = normalizeSpecial4DSettings(globalSettings.special4d);
        const prizes: Array<{ rank: 1 | 2 | 3; value: string; payouts: { first2: number; last2: number } }> = [
          { rank: 1, value: result.firstPrize, payouts: specialSettings.payouts.p1 },
          { rank: 2, value: result.secondPrize, payouts: specialSettings.payouts.p2 },
          { rank: 3, value: result.thirdPrize, payouts: specialSettings.payouts.p3 },
        ];

        prizes.forEach(({ rank, value, payouts }) => {
          const winningNumber = String(value || '').replace(/\D/g, '');
          if (winningNumber.length < 4) return;

          if (last2 === winningNumber.slice(0, 2)) {
            const p = Number(payouts.first2 || 0) * quantity;
            totalPrize += p;
            winningBets.push({
              idx,
              prize: p,
              rank,
              lotteryName: bet.lottery,
              winningNumber,
              matchType: '2 Primeras',
            });
          }

          if (last2 === winningNumber.slice(-2)) {
            const p = Number(payouts.last2 || 0) * quantity;
            totalPrize += p;
            winningBets.push({
              idx,
              prize: p,
              rank,
              lotteryName: bet.lottery,
              winningNumber,
              matchType: '2 Ultimas',
            });
          }
        });
        return;
      }

      const pricePerChance = (bet.amount || 0) / quantity;

      const priceConfig = globalSettings.chancePrices?.find(cp => Math.abs(cp.price - pricePerChance) < 0.001);

      if (last2 === result.firstPrize.slice(-2)) {
        const mult = priceConfig ? priceConfig.ch1 : 0;
        const p = mult * quantity;
        totalPrize += p;
        winningBets.push({ idx, prize: p, rank: 1, lotteryName: bet.lottery, winningNumber: result.firstPrize });
      }

      if (result.secondPrize && last2 === result.secondPrize.slice(-2)) {
        const mult = priceConfig ? priceConfig.ch2 : 0;
        const p = mult * quantity;
        totalPrize += p;
        winningBets.push({ idx, prize: p, rank: 2, lotteryName: bet.lottery, winningNumber: result.secondPrize });
      }

      if (result.thirdPrize && last2 === result.thirdPrize.slice(-2)) {
        const mult = priceConfig ? priceConfig.ch3 : 0;
        const p = mult * quantity;
        totalPrize += p;
        winningBets.push({ idx, prize: p, rank: 3, lotteryName: bet.lottery, winningNumber: result.thirdPrize });
      }
    } else if (bet.type === 'PL' && globalSettings.palesEnabled) {
      const n1 = bet.number.slice(0, 2);
      const n2 = bet.number.slice(2, 4);
      const r1 = result.firstPrize.slice(-2);
      const r2 = result.secondPrize.slice(-2);
      const r3 = result.thirdPrize.slice(-2);

      if ((n1 === r1 && n2 === r2) || (n1 === r2 && n2 === r1)) {
        const mult = globalSettings.pl12Multiplier || 1000;
        const p = (bet.amount || 0) * mult;
        totalPrize += p;
        winningBets.push({ idx, prize: p, rank: 1, lotteryName: bet.lottery, winningNumber: r1 + '-' + r2, matchType: 'Palé' });
      }
      if ((n1 === r1 && n2 === r3) || (n1 === r3 && n2 === r1)) {
        const mult = globalSettings.pl13Multiplier || 1000;
        const p = (bet.amount || 0) * mult;
        totalPrize += p;
        winningBets.push({ idx, prize: p, rank: 1, lotteryName: bet.lottery, winningNumber: r1 + '-' + r3, matchType: 'Palé' });
      }
      if ((n1 === r2 && n2 === r3) || (n1 === r3 && n2 === r2)) {
        const mult = globalSettings.pl23Multiplier || 200;
        const p = (bet.amount || 0) * mult;
        totalPrize += p;
        winningBets.push({ idx, prize: p, rank: 2, lotteryName: bet.lottery, winningNumber: r2 + '-' + r3, matchType: 'Palé' });
      }
    } else if (bet.type === 'BL' && globalSettings.billetesEnabled) {
      const defaultPrizes = { full4: 2000, first3: 200, last3: 200, first2: 20, last2: 20 };
      const multipliers = globalSettings.billeteMultipliers || {
        p1: { ...defaultPrizes },
        p2: { ...defaultPrizes },
        p3: { ...defaultPrizes }
      };

      const checkPrize = (winningNum: string, prizeRank: number) => {
        if (winningNum.length !== 4) return;

        const pKey = `p${prizeRank}` as keyof typeof multipliers;
        const prizeMults = multipliers[pKey] || defaultPrizes;
        const betNum = bet.number;
        const amount = bet.amount || 0;

        if (betNum === winningNum) {
          const p = amount * prizeMults.full4;
          totalPrize += p;
          winningBets.push({ idx, prize: p, rank: prizeRank, lotteryName: bet.lottery, winningNumber: winningNum, matchType: '4 Cifras' });
          return;
        }

        if (betNum.slice(0, 3) === winningNum.slice(0, 3)) {
          const p = amount * prizeMults.first3;
          totalPrize += p;
          winningBets.push({ idx, prize: p, rank: prizeRank, lotteryName: bet.lottery, winningNumber: winningNum, matchType: '3 Primeras' });
        } else if (betNum.slice(0, 2) === winningNum.slice(0, 2)) {
          const p = amount * prizeMults.first2;
          totalPrize += p;
          winningBets.push({ idx, prize: p, rank: prizeRank, lotteryName: bet.lottery, winningNumber: winningNum, matchType: '2 Primeras' });
        }

        if (betNum.slice(1, 4) === winningNum.slice(1, 4)) {
          const p = amount * prizeMults.last3;
          totalPrize += p;
          winningBets.push({ idx, prize: p, rank: prizeRank, lotteryName: bet.lottery, winningNumber: winningNum, matchType: '3 últimas' });
        } else if (betNum.slice(2, 4) === winningNum.slice(2, 4)) {
          const p = amount * prizeMults.last2;
          totalPrize += p;
          winningBets.push({ idx, prize: p, rank: prizeRank, lotteryName: bet.lottery, winningNumber: winningNum, matchType: '2 últimas' });
        }
      };

      checkPrize(result.firstPrize, 1);
      checkPrize(result.secondPrize, 2);
      checkPrize(result.thirdPrize, 3);
    }
  });

  return { totalPrize, winningBets };
};
