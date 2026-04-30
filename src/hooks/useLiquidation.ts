import { useEffect, useMemo, useState } from 'react';
import type { LotteryTicket } from '../types/bets';
import type { Injection, Settlement } from '../types/finance';
import type { LotteryResult } from '../types/results';
import type { UserProfile } from '../types/users';
import {
  buildLiquidationDebtMetrics,
  findLatestSettlementForUserDate,
  getSettlementTimestampMs,
} from '../services/calculations/liquidation';

const ZERO_BALANCE_EPSILON = 0.005;

const getSettlementFinalBalance = (settlement: Settlement) => {
  const balance = Number(settlement.finalBalance ?? settlement.newTotalDebt);
  return Number.isFinite(balance) ? balance : null;
};

const getNumericValue = (...values: unknown[]) => {
  for (const value of values) {
    const numericValue = Number(value);
    if (Number.isFinite(numericValue)) return numericValue;
  }
  return 0;
};

const getNullableNumericValue = (...values: unknown[]) => {
  for (const value of values) {
    const numericValue = Number(value);
    if (Number.isFinite(numericValue)) return numericValue;
  }
  return null;
};

const getSettlementDayBalance = (settlement: Settlement) => {
  const savedDayBalance = getNullableNumericValue(settlement.debtAdded);
  if (savedDayBalance !== null) return savedDayBalance;

  const operationalProfit = getNullableNumericValue(
    settlement.operationalProfit,
    settlement.dailyResult,
    settlement.netProfit
  );
  const totalInjections = getNullableNumericValue(
    settlement.dailyInjectionTotal,
    settlement.totalInjections
  );

  if (operationalProfit !== null && totalInjections !== null) {
    const amountReceived = getNumericValue(settlement.amountReceived, settlement.amountPaid);
    const amountSent = getNumericValue(settlement.amountSent);
    return operationalProfit - amountReceived + amountSent;
  }

  return getSettlementFinalBalance(settlement);
};

const hasLiveSettlementBalance = (settlement: Settlement) => {
  const balance = getSettlementDayBalance(settlement);
  return balance === null || Math.abs(balance) > ZERO_BALANCE_EPSILON;
};

export function useLiquidation({
  businessDayKey,
  selectedUserToLiquidate,
  liquidationDate,
  users,
  tickets,
  injections,
  results,
  liquidationTicketsSnapshot,
  liquidationInjectionsSnapshot,
  liquidationResultsSnapshot,
  settlements,
  liquidationSettlementsSnapshot,
  buildFinancialSummary,
  getTicketPrizesFromSource,
}: {
  businessDayKey: string;
  selectedUserToLiquidate: string;
  liquidationDate: string;
  users: UserProfile[];
  tickets: LotteryTicket[];
  injections: Injection[];
  results: LotteryResult[];
  liquidationTicketsSnapshot: LotteryTicket[];
  liquidationInjectionsSnapshot: Injection[];
  liquidationResultsSnapshot: LotteryResult[];
  settlements: Settlement[];
  liquidationSettlementsSnapshot: Settlement[];
  buildFinancialSummary: (params: {
    tickets: LotteryTicket[];
    injections: Injection[];
    settlements?: Settlement[];
    userEmail?: string;
    targetDate?: string;
    prizeResolver?: (ticket: LotteryTicket) => { totalPrize: number };
  }) => {
    tickets: LotteryTicket[];
    injections: Injection[];
    settlements: Settlement[];
    totalSales: number;
    totalCommissions: number;
    totalPrizes: number;
    totalInjections: number;
    totalLiquidations: number;
    operationalProfit: number;
    liquidationBalance: number;
    netProfit: number;
  };
  getTicketPrizesFromSource: (ticket: LotteryTicket, source: LotteryResult[]) => { totalPrize: number };
}) {
  const [amountPaid, setAmountPaid] = useState('');
  const [amountDirection, setAmountDirection] = useState<'received' | 'sent'>('received');

  const selectedLiquidationSettlement = useMemo(() => {
    if (!selectedUserToLiquidate || !liquidationDate) return null;
    const sourceSettlements = liquidationDate === businessDayKey ? settlements : liquidationSettlementsSnapshot;
    return findLatestSettlementForUserDate({
      settlements: sourceSettlements,
      userEmail: selectedUserToLiquidate,
      targetDate: liquidationDate,
    });
  }, [businessDayKey, liquidationDate, liquidationSettlementsSnapshot, selectedUserToLiquidate, settlements]);

  useEffect(() => {
    if (!selectedUserToLiquidate || !liquidationDate) {
      setAmountPaid('');
      setAmountDirection('received');
      return;
    }
    if (selectedLiquidationSettlement) {
      const storedDirection = selectedLiquidationSettlement.amountDirection ||
        (Number(selectedLiquidationSettlement.amountSent || 0) > 0 ? 'sent' : 'received');
      const storedAmount = storedDirection === 'sent'
        ? selectedLiquidationSettlement.amountSent ?? selectedLiquidationSettlement.amountEntered ?? 0
        : selectedLiquidationSettlement.amountReceived ?? selectedLiquidationSettlement.amountPaid ?? selectedLiquidationSettlement.amountEntered ?? 0;
      setAmountDirection(storedDirection);
      setAmountPaid(String(storedAmount));
      return;
    }
    setAmountDirection('received');
    setAmountPaid('');
  }, [
    liquidationDate,
    selectedLiquidationSettlement?.amountDirection,
    selectedLiquidationSettlement?.amountEntered,
    selectedLiquidationSettlement?.amountPaid,
    selectedLiquidationSettlement?.amountReceived,
    selectedLiquidationSettlement?.amountSent,
    selectedLiquidationSettlement?.id,
    selectedUserToLiquidate,
  ]);

  const liquidationPreview = useMemo(() => {
    if (!selectedUserToLiquidate) return null;

    const userToLiquidate = users.find((userItem) => userItem.email === selectedUserToLiquidate);
    if (!userToLiquidate) return null;

    const isCurrentOperationalDate = liquidationDate === businessDayKey;
    const liquidationTicketsSource = isCurrentOperationalDate ? tickets : liquidationTicketsSnapshot;
    const liquidationInjectionsSource = isCurrentOperationalDate ? injections : liquidationInjectionsSnapshot;
    const liquidationResultsSource = isCurrentOperationalDate ? results : liquidationResultsSnapshot;
    const liquidationSettlementsSource = isCurrentOperationalDate ? settlements : liquidationSettlementsSnapshot;

    const financialSummary = buildFinancialSummary({
      tickets: liquidationTicketsSource,
      injections: liquidationInjectionsSource,
      settlements: liquidationSettlementsSource,
      userEmail: selectedUserToLiquidate,
      targetDate: liquidationDate,
      prizeResolver: (ticketItem: LotteryTicket) => getTicketPrizesFromSource(ticketItem, liquidationResultsSource),
    });
    const normalizedFinancialSummary = {
      ...financialSummary,
      operationalProfit: financialSummary.operationalProfit ?? financialSummary.netProfit,
      liquidationBalance: financialSummary.operationalProfit ?? financialSummary.netProfit,
    };
    const normalizedUserEmail = selectedUserToLiquidate.toLowerCase();
    const livePreviousSettlementsByDate = liquidationSettlementsSource
      .filter((settlement) =>
        (settlement.userEmail || '').toLowerCase() === normalizedUserEmail &&
        !!settlement.date &&
        settlement.date < liquidationDate &&
        hasLiveSettlementBalance(settlement)
      )
      .reduce((byDate, settlement) => {
        const previousSettlement = byDate.get(settlement.date);
        if (!previousSettlement || getSettlementTimestampMs(settlement) > getSettlementTimestampMs(previousSettlement)) {
          byDate.set(settlement.date, settlement);
        }
        return byDate;
      }, new Map<string, Settlement>());
    const pendingBalanceDetails = Array.from(livePreviousSettlementsByDate.values())
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      .map((settlement) => {
        const totalSales = getNumericValue(settlement.totalSales, settlement.sales);
        const totalPrizes = getNumericValue(settlement.totalPrizes, settlement.prizes);
        const totalCommissions = getNumericValue(settlement.totalCommissions, settlement.commission);
        const totalInjections = getNumericValue(settlement.dailyInjectionTotal, settlement.totalInjections);
        const operationalProfit = getNumericValue(
          settlement.operationalProfit,
          settlement.dailyResult,
          settlement.netProfit,
          totalSales - totalPrizes - totalCommissions
        );
        const amountReceived = getNumericValue(settlement.amountReceived, settlement.amountPaid);
        const amountSent = getNumericValue(settlement.amountSent);
        const dayBalance = getNumericValue(
          getSettlementDayBalance(settlement),
          operationalProfit - amountReceived + amountSent
        );

        return {
          id: settlement.id,
          date: settlement.date,
          totalSales,
          totalPrizes,
          totalCommissions,
          totalInjections,
          operationalProfit,
          amountReceived,
          amountSent,
          dayBalance,
        };
      });
    const previousInjectionTotal = pendingBalanceDetails
      .reduce((sum, settlement) => sum + settlement.totalInjections, 0);

    const ticketsToLiquidate = normalizedFinancialSummary.tickets.filter((ticketItem) =>
      ticketItem.status === 'active' && !ticketItem.settlementId && !ticketItem.liquidated
    );
    const injectionsToLiquidate = normalizedFinancialSummary.injections.filter((injectionItem) =>
      !injectionItem.settlementId && !injectionItem.liquidated
    );

    const paid = Number(amountPaid) || 0;
    const amountReceived = amountDirection === 'received' ? paid : 0;
    const amountSent = amountDirection === 'sent' ? paid : 0;
    const currentDebt = userToLiquidate.currentDebt || 0;
    const existingDebtImpact = selectedLiquidationSettlement?.debtAdded || 0;
    const debtMetrics = buildLiquidationDebtMetrics({
      totalSales: normalizedFinancialSummary.totalSales,
      totalCommissions: normalizedFinancialSummary.totalCommissions,
      totalPrizes: normalizedFinancialSummary.totalPrizes,
      totalInjections: normalizedFinancialSummary.totalInjections,
      amountPaid: paid,
      amountDirection,
      currentDebt,
      existingDebtImpact,
    });

    return {
      userToLiquidate,
      isCurrentOperationalDate,
      liquidationResultsSource,
      financialSummary: normalizedFinancialSummary,
      ticketsToLiquidate,
      injectionsToLiquidate,
      paid,
      amountDirection,
      amountReceived,
      amountSent,
      currentDebt,
      existingDebtImpact,
      previousInjectionTotal,
      pendingBalanceDetails,
      ...debtMetrics,
      actionLabel: selectedLiquidationSettlement ? 'actualizar' : 'liquidar',
    };
  }, [
    amountPaid,
    amountDirection,
    businessDayKey,
    buildFinancialSummary,
    getTicketPrizesFromSource,
    injections,
    liquidationDate,
    liquidationInjectionsSnapshot,
    liquidationResultsSnapshot,
    liquidationSettlementsSnapshot,
    liquidationTicketsSnapshot,
    results,
    selectedLiquidationSettlement,
    selectedUserToLiquidate,
    tickets,
    users,
  ]);

  const liquidationGlobalSummary = useMemo(() => {
    const isCurrentOperationalDate = liquidationDate === businessDayKey;
    const liquidationTicketsSource = isCurrentOperationalDate ? tickets : liquidationTicketsSnapshot;
    const liquidationInjectionsSource = isCurrentOperationalDate ? injections : liquidationInjectionsSnapshot;
    const liquidationResultsSource = isCurrentOperationalDate ? results : liquidationResultsSnapshot;
    const liquidationSettlementsSource = isCurrentOperationalDate ? settlements : liquidationSettlementsSnapshot;

    const summary = buildFinancialSummary({
      tickets: liquidationTicketsSource,
      injections: liquidationInjectionsSource,
      settlements: liquidationSettlementsSource,
      targetDate: liquidationDate,
      prizeResolver: (ticketItem: LotteryTicket) => getTicketPrizesFromSource(ticketItem, liquidationResultsSource),
    });

    return {
      ...summary,
      operationalProfit: summary.operationalProfit ?? summary.netProfit,
      liquidationBalance: summary.operationalProfit ?? summary.netProfit,
    };
  }, [
    buildFinancialSummary,
    businessDayKey,
    getTicketPrizesFromSource,
    injections,
    liquidationDate,
    liquidationInjectionsSnapshot,
    liquidationResultsSnapshot,
    liquidationSettlementsSnapshot,
    liquidationTicketsSnapshot,
    results,
    settlements,
    tickets,
  ]);

  const liquidationUserSummaries = useMemo(() => {
    const isCurrentOperationalDate = liquidationDate === businessDayKey;
    const liquidationTicketsSource = isCurrentOperationalDate ? tickets : liquidationTicketsSnapshot;
    const liquidationInjectionsSource = isCurrentOperationalDate ? injections : liquidationInjectionsSnapshot;
    const liquidationResultsSource = isCurrentOperationalDate ? results : liquidationResultsSnapshot;
    const liquidationSettlementsSource = isCurrentOperationalDate ? settlements : liquidationSettlementsSnapshot;

    return users
      .filter((userItem) => !!userItem?.email)
      .map((userItem) => {
        const summary = buildFinancialSummary({
          tickets: liquidationTicketsSource,
          injections: liquidationInjectionsSource,
          settlements: liquidationSettlementsSource,
          userEmail: userItem.email,
          targetDate: liquidationDate,
          prizeResolver: (ticketItem: LotteryTicket) => getTicketPrizesFromSource(ticketItem, liquidationResultsSource),
        });
        const operationalProfit = summary.operationalProfit ?? summary.netProfit;
        const liquidationBalance = operationalProfit;
        const settlement = findLatestSettlementForUserDate({
          settlements: liquidationSettlementsSource,
          userEmail: userItem.email,
          targetDate: liquidationDate,
        });

        return {
          user: userItem,
          summary: {
            ...summary,
            operationalProfit,
            liquidationBalance,
          },
          settlement,
          status: settlement ? 'liquidated' : 'pending',
        };
      });
  }, [
    buildFinancialSummary,
    businessDayKey,
    getTicketPrizesFromSource,
    injections,
    liquidationDate,
    liquidationInjectionsSnapshot,
    liquidationResultsSnapshot,
    liquidationSettlementsSnapshot,
    liquidationTicketsSnapshot,
    results,
    settlements,
    tickets,
    users,
  ]);

  return {
    amountPaid,
    setAmountPaid,
    amountDirection,
    setAmountDirection,
    selectedLiquidationSettlement,
    liquidationPreview,
    liquidationGlobalSummary,
    liquidationUserSummaries,
  };
}
