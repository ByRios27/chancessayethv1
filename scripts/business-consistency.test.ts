import assert from 'node:assert/strict';

import { buildFinancialSummary } from '../src/services/calculations/financial';
import { getTicketPrizesFromSource } from '../src/services/calculations/prizes';
import {
  calculateUserStats,
  getLotteryDayStats,
  getStatsByDraw,
  getUserLotteryDayStats,
} from '../src/services/calculations/stats';
import type { LotteryTicket } from '../src/types/bets';
import type { Injection } from '../src/types/finance';
import type { GlobalSettings } from '../src/types/lotteries';
import type { LotteryResult } from '../src/types/results';
import type { UserProfile } from '../src/types/users';
import { cleanText } from '../src/utils/text';

const businessDate = '2026-05-02';
const otherDate = '2026-05-01';
const timestamp = (iso: string) => ({ toDate: () => new Date(iso) });
const getTicketDateKey = (ticket: LotteryTicket) => {
  const date = ticket.timestamp?.toDate?.() ?? new Date();
  return date.toISOString().slice(0, 10);
};

const globalSettings: GlobalSettings = {
  id: 'global',
  chancePrices: [
    { price: 1, ch1: 80, ch2: 10, ch3: 5 },
    { price: 2, ch1: 160, ch2: 20, ch3: 10 },
  ],
  palesEnabled: true,
  billetesEnabled: true,
  pl12Multiplier: 1000,
  pl13Multiplier: 500,
  pl23Multiplier: 200,
  billeteMultipliers: {
    p1: { full4: 2000, first3: 200, last3: 200, first2: 20, last2: 20 },
    p2: { full4: 1000, first3: 100, last3: 100, first2: 10, last2: 10 },
    p3: { full4: 500, first3: 50, last3: 50, first2: 5, last2: 5 },
  },
};

const result: LotteryResult = {
  id: 'result-loteria-nacional',
  lotteryId: 'loteria-nacional',
  lotteryName: 'Loteria Nacional',
  date: businessDate,
  firstPrize: '0123',
  secondPrize: '6745',
  thirdPrize: '5567',
  timestamp: timestamp('2026-05-02T20:10:00Z'),
};

const ticket = (overrides: Partial<LotteryTicket>): LotteryTicket => ({
  id: 'ticket',
  bets: [],
  totalAmount: 0,
  chancePrice: 1,
  timestamp: timestamp('2026-05-02T15:00:00Z'),
  sellerId: 'v001',
  sellerCode: 'v001',
  sellerEmail: 'seller001@chancepro.local',
  sellerName: 'Vendedor 001',
  commissionRate: 10,
  status: 'active',
  customerName: 'Cliente Prueba',
  sequenceNumber: '001',
  liquidated: false,
  ...overrides,
});

const winningChanceTicket = ticket({
  id: 'chance-winning',
  bets: [
    { number: '23', lottery: 'Loteria Nacional', lotteryId: 'loteria-nacional', amount: 2, type: 'CH', quantity: 2 },
    { number: '45', lottery: 'Loteria Nacional', lotteryId: 'loteria-nacional', amount: 1, type: 'CH', quantity: 1 },
    { number: '67', lottery: 'Loteria Nacional', lotteryId: 'loteria-nacional', amount: 3, type: 'CH', quantity: 3 },
    { number: '99', lottery: 'Loteria Nacional', lotteryId: 'loteria-nacional', amount: 4, type: 'CH', quantity: 4 },
  ],
  totalAmount: 10,
});

const paleTicket = ticket({
  id: 'pale-winning',
  bets: [
    { number: '2345', lottery: 'Loteria Nacional', lotteryId: 'loteria-nacional', amount: 2, type: 'PL', quantity: 1 },
    { number: '2367', lottery: 'Loteria Nacional', lotteryId: 'loteria-nacional', amount: 1, type: 'PL', quantity: 1 },
    { number: '4567', lottery: 'Loteria Nacional', lotteryId: 'loteria-nacional', amount: 1, type: 'PL', quantity: 1 },
  ],
  totalAmount: 4,
});

const billeteTicket = ticket({
  id: 'billete-winning',
  bets: [
    { number: '0123', lottery: 'Loteria Nacional', lotteryId: 'loteria-nacional', amount: 1, type: 'BL', quantity: 1 },
    { number: '6740', lottery: 'Loteria Nacional', lotteryId: 'loteria-nacional', amount: 1, type: 'BL', quantity: 1 },
    { number: '0067', lottery: 'Loteria Nacional', lotteryId: 'loteria-nacional', amount: 1, type: 'BL', quantity: 1 },
  ],
  totalAmount: 3,
});

const sellerTwoTicket = ticket({
  id: 'seller-two',
  sellerId: 'v002',
  sellerCode: 'v002',
  sellerEmail: 'seller002@chancepro.local',
  sellerName: 'Vendedor 002',
  commissionRate: 15,
  bets: [
    { number: '11', lottery: 'Loteria Nacional', lotteryId: 'loteria-nacional', amount: 5, type: 'CH', quantity: 5 },
  ],
  totalAmount: 5,
});

const cancelledTicket = ticket({
  id: 'cancelled',
  status: 'cancelled',
  bets: [
    { number: '23', lottery: 'Loteria Nacional', lotteryId: 'loteria-nacional', amount: 50, type: 'CH', quantity: 50 },
  ],
  totalAmount: 50,
});

const oldTicket = ticket({
  id: 'old-ticket',
  timestamp: timestamp('2026-05-01T15:00:00Z'),
  bets: [
    { number: '23', lottery: 'Loteria Nacional', lotteryId: 'loteria-nacional', amount: 30, type: 'CH', quantity: 30 },
  ],
  totalAmount: 30,
});

const tickets = [winningChanceTicket, paleTicket, billeteTicket, sellerTwoTicket, cancelledTicket, oldTicket];
const results = [result];
const users: UserProfile[] = [
  { email: 'seller001@chancepro.local', name: 'Vendedor 001', role: 'seller', commissionRate: 10, status: 'active', sellerId: 'v001' },
  { email: 'seller002@chancepro.local', name: 'Vendedor 002', role: 'seller', commissionRate: 15, status: 'active', sellerId: 'v002' },
];
const injections: Injection[] = [
  {
    id: 'inj-1',
    sellerId: 'v001',
    userEmail: 'seller001@chancepro.local',
    amount: 25,
    type: 'injection',
    date: businessDate,
    timestamp: timestamp('2026-05-02T16:00:00Z'),
    addedBy: 'ceo',
  },
  {
    id: 'payment-ignored',
    sellerId: 'v001',
    userEmail: 'seller001@chancepro.local',
    amount: 99,
    type: 'payment',
    date: businessDate,
    timestamp: timestamp('2026-05-02T17:00:00Z'),
    addedBy: 'ceo',
  },
  {
    id: 'inj-old',
    sellerId: 'v001',
    userEmail: 'seller001@chancepro.local',
    amount: 10,
    type: 'injection',
    date: otherDate,
    timestamp: timestamp('2026-05-01T17:00:00Z'),
    addedBy: 'ceo',
  },
];

const getPrizes = (targetTicket: LotteryTicket, filterLottery?: string, typeFilter?: string) =>
  getTicketPrizesFromSource({
    ticket: targetTicket,
    resultsSource: results,
    globalSettings,
    getTicketDateKey,
    cleanText,
    filterLottery,
    typeFilter,
  });

const assertMoney = (actual: number, expected: number, label: string) => {
  assert.equal(Number(actual.toFixed(2)), Number(expected.toFixed(2)), label);
};

const chancePrizes = getPrizes(winningChanceTicket);
assertMoney(chancePrizes.totalPrize, 185, 'CH prizes should match first, second and third payouts');
assert.equal(chancePrizes.winningBets.length, 3, 'CH should have 3 winning bets');

const palePrizes = getPrizes(paleTicket);
assertMoney(palePrizes.totalPrize, 2700, 'PL prizes should match 12, 13 and 23 multipliers');

const billetePrizes = getPrizes(billeteTicket);
assertMoney(billetePrizes.totalPrize, 2105, 'BL prizes should match full4, first3 and last2 payouts');

assertMoney(getPrizes(cancelledTicket).totalPrize, 0, 'cancelled ticket should not pay prizes');
assertMoney(getPrizes(winningChanceTicket, 'Loteria Nacional', 'PL').totalPrize, 0, 'type filter should exclude non matching bets');

const summary = buildFinancialSummary({
  tickets,
  injections,
  targetDate: businessDate,
  prizeResolver: getPrizes,
  getTicketDateKey,
});
assert.equal(summary.tickets.map((row) => row.id).sort().join(','), 'billete-winning,chance-winning,pale-winning,seller-two', 'summary should include only active tickets from target date');
assertMoney(summary.totalSales, 22, 'summary total sales');
assertMoney(summary.totalCommissions, 2.45, 'summary total commissions');
assertMoney(summary.totalPrizes, 4990, 'summary total prizes');
assertMoney(summary.totalInjections, 25, 'summary injections should include injection only');
assertMoney(summary.netProfit, -4970.45, 'summary net profit');

const sellerOneSummary = buildFinancialSummary({
  tickets,
  injections,
  userEmail: 'seller001@chancepro.local',
  targetDate: businessDate,
  prizeResolver: getPrizes,
  getTicketDateKey,
});
assertMoney(sellerOneSummary.totalSales, 17, 'seller 1 sales');
assertMoney(sellerOneSummary.totalCommissions, 1.7, 'seller 1 commissions');
assertMoney(sellerOneSummary.totalPrizes, 4990, 'seller 1 prizes');

const lotteryStats = getLotteryDayStats({
  lotteryName: 'Loteria Nacional',
  date: businessDate,
  businessDayKey: businessDate,
  tickets,
  historyTickets: [],
  canAccessAllUsers: true,
  cleanText,
  getTicketPrizes: getPrizes,
});
assertMoney(lotteryStats.sales, 22, 'lottery stats sales');
assertMoney(lotteryStats.commissions, 2.45, 'lottery stats commissions');
assertMoney(lotteryStats.prizes, 4990, 'lottery stats prizes');
assert.equal(lotteryStats.isLoss, true, 'lottery stats should flag loss');

const sellerLotteryStats = getUserLotteryDayStats({
  sellerId: 'v001',
  lotteryName: 'Loteria Nacional',
  date: businessDate,
  businessDayKey: businessDate,
  tickets,
  historyTickets: [],
  getTicketPrizes: getPrizes,
});
assertMoney(sellerLotteryStats.sales, 17, 'seller lottery stats sales');
assertMoney(sellerLotteryStats.prizes, 4990, 'seller lottery stats prizes');

const drawStats = getStatsByDraw({
  lotteryName: 'Loteria Nacional',
  date: businessDate,
  businessDayKey: businessDate,
  tickets,
  historyTickets: [],
  canAccessAllUsers: true,
  cleanText,
  getTicketPrizes: getPrizes,
});
assertMoney(drawStats.pzsVolume, 15, 'draw stats CH quantity volume');
assertMoney(drawStats.totalMoneyVolume, 22, 'draw stats money volume');
assertMoney(drawStats.totalPrize, 4990, 'draw stats prizes');

const userStats = calculateUserStats({
  users,
  tickets: tickets.filter((row) => getTicketDateKey(row) === businessDate),
  injections,
  targetDate: businessDate,
  getTicketPrizes: getPrizes,
});
assertMoney(userStats['seller001@chancepro.local'].sales, 17, 'user stats seller 1 sales');
assertMoney(userStats['seller001@chancepro.local'].commissions, 1.7, 'user stats seller 1 commissions');
assertMoney(userStats['seller001@chancepro.local'].prizes, 4990, 'user stats seller 1 prizes');
assertMoney(userStats['seller001@chancepro.local'].injections, 25, 'user stats should include injection rows only');
assertMoney(userStats['seller001@chancepro.local'].utility, -4974.7, 'user stats seller 1 utility');
assertMoney(userStats['seller002@chancepro.local'].sales, 5, 'user stats seller 2 sales');
assertMoney(userStats['seller002@chancepro.local'].commissions, 0.75, 'user stats seller 2 commissions');
assertMoney(userStats['seller002@chancepro.local'].utility, 4.25, 'user stats seller 2 utility');

console.log('Business consistency checks passed');
console.log(JSON.stringify({
  chancePrizes: chancePrizes.totalPrize,
  palePrizes: palePrizes.totalPrize,
  billetePrizes: billetePrizes.totalPrize,
  summary: {
    sales: summary.totalSales,
    commissions: summary.totalCommissions,
    prizes: summary.totalPrizes,
    injections: summary.totalInjections,
    netProfit: summary.netProfit,
  },
}, null, 2));
