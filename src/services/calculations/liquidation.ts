import type { Settlement } from '../../types/finance';

export const getSettlementTimestampMs = (settlement: Settlement) => {
  return settlement.timestamp?.toDate?.()?.getTime?.() ?? (settlement.timestamp?.seconds ? settlement.timestamp.seconds * 1000 : 0);
};

export const getLatestSettlement = (items: Settlement[]) => {
  if (items.length === 0) return null;
  return [...items].sort((a, b) => getSettlementTimestampMs(b) - getSettlementTimestampMs(a))[0];
};

export const findLatestSettlementForUserDate = ({
  settlements,
  userEmail,
  targetDate,
}: {
  settlements: Settlement[];
  userEmail: string;
  targetDate: string;
}) => {
  const normalizedEmail = userEmail.toLowerCase();
  const matches = settlements.filter((settlement) =>
    (settlement.userEmail || '').toLowerCase() === normalizedEmail && settlement.date === targetDate
  );
  return getLatestSettlement(matches);
};

export const buildLiquidationDebtMetrics = ({
  totalSales,
  totalCommissions,
  totalPrizes,
  totalInjections,
  amountPaid,
  amountDirection = 'received',
  currentDebt,
  existingDebtImpact,
}: {
  totalSales: number;
  totalCommissions: number;
  totalPrizes: number;
  totalInjections: number;
  amountPaid: number;
  amountDirection?: 'received' | 'sent';
  currentDebt: number;
  existingDebtImpact: number;
}) => {
  const operationalProfit = totalSales - totalCommissions - totalPrizes;
  const liquidationBalance = operationalProfit + totalInjections;
  const netProfit = operationalProfit;
  const previousDebt = currentDebt - existingDebtImpact;
  const amountEffect = amountDirection === 'sent' ? amountPaid : -amountPaid;
  const debtAdded = liquidationBalance + amountEffect;
  const newTotalDebt = previousDebt + debtAdded;

  return {
    netProfit,
    operationalProfit,
    liquidationBalance,
    previousDebt,
    debtAdded,
    newTotalDebt,
  };
};
