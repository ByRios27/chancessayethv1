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
  currentDebt,
  existingDebtImpact,
}: {
  totalSales: number;
  totalCommissions: number;
  totalPrizes: number;
  totalInjections: number;
  amountPaid: number;
  currentDebt: number;
  existingDebtImpact: number;
}) => {
  const netProfit = totalSales - totalCommissions - totalPrizes + totalInjections;
  const previousDebt = currentDebt - existingDebtImpact;
  const debtAdded = netProfit - amountPaid;
  const newTotalDebt = previousDebt + debtAdded;

  return {
    netProfit,
    previousDebt,
    debtAdded,
    newTotalDebt,
  };
};
