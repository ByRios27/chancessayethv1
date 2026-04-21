import type { Bet } from '../types/bets';

export const unifyBets = (bets: Bet[]): Bet[] => {
  const unified: Bet[] = [];
  bets.forEach(bet => {
    const num = (bet.number || '').toString().trim();
    const lot = (bet.lottery || '').toString().trim();
    const type = bet.type;

    const existing = unified.find(u =>
      u.number.trim() === num &&
      u.lottery.trim() === lot &&
      u.type === type
    );

    if (existing) {
      existing.quantity += bet.quantity;
      existing.amount += bet.amount;
    } else {
      unified.push({ ...bet, number: num, lottery: lot });
    }
  });
  return unified;
};
