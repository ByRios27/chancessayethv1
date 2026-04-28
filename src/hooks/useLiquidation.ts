import { useEffect, useMemo, useState } from 'react';
import type { LotteryTicket } from '../types/bets';
import type { Injection, Settlement } from '../types/finance';
import type { LotteryResult } from '../types/results';
import type { UserProfile } from '../types/users';
import {
  buildLiquidationDebtMetrics,
  findLatestSettlementForUserDate,
} from '../services/calculations/liquidation';

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
      liquidationBalance: financialSummary.liquidationBalance ?? ((financialSummary.operationalProfit ?? financialSummary.netProfit) + financialSummary.totalInjections),
    };
    const normalizedUserEmail = selectedUserToLiquidate.toLowerCase();
    const previousInjectionTotal = liquidationSettlementsSource
      .filter((settlement) =>
        (settlement.userEmail || '').toLowerCase() === normalizedUserEmail &&
        !!settlement.date &&
        settlement.date < liquidationDate
      )
      .reduce((sum, settlement) => sum + Number(settlement.dailyInjectionTotal ?? settlement.totalInjections ?? 0), 0);

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
      liquidationBalance: summary.liquidationBalance ?? ((summary.operationalProfit ?? summary.netProfit) + summary.totalInjections),
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
        const liquidationBalance = summary.liquidationBalance ?? (operationalProfit + summary.totalInjections);
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
