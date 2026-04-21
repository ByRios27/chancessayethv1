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
    netProfit: number;
  };
  getTicketPrizesFromSource: (ticket: LotteryTicket, source: LotteryResult[]) => { totalPrize: number };
}) {
  const [amountPaid, setAmountPaid] = useState('');

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
      return;
    }
    if (selectedLiquidationSettlement) {
      setAmountPaid(String(selectedLiquidationSettlement.amountPaid ?? 0));
      return;
    }
    setAmountPaid('');
  }, [liquidationDate, selectedLiquidationSettlement?.amountPaid, selectedLiquidationSettlement?.id, selectedUserToLiquidate]);

  const liquidationPreview = useMemo(() => {
    if (!selectedUserToLiquidate) return null;

    const userToLiquidate = users.find((userItem) => userItem.email === selectedUserToLiquidate);
    if (!userToLiquidate) return null;

    const isCurrentOperationalDate = liquidationDate === businessDayKey;
    const liquidationTicketsSource = isCurrentOperationalDate ? tickets : liquidationTicketsSnapshot;
    const liquidationInjectionsSource = isCurrentOperationalDate ? injections : liquidationInjectionsSnapshot;
    const liquidationResultsSource = isCurrentOperationalDate ? results : liquidationResultsSnapshot;

    const financialSummary = buildFinancialSummary({
      tickets: liquidationTicketsSource,
      injections: liquidationInjectionsSource,
      userEmail: selectedUserToLiquidate,
      targetDate: liquidationDate,
      prizeResolver: (ticketItem: LotteryTicket) => getTicketPrizesFromSource(ticketItem, liquidationResultsSource),
    });

    const ticketsToLiquidate = financialSummary.tickets.filter((ticketItem) =>
      ticketItem.status === 'active' && !ticketItem.settlementId && !ticketItem.liquidated
    );
    const injectionsToLiquidate = financialSummary.injections.filter((injectionItem) =>
      !injectionItem.settlementId && !injectionItem.liquidated
    );

    const paid = Number(amountPaid) || 0;
    const currentDebt = userToLiquidate.currentDebt || 0;
    const existingDebtImpact = selectedLiquidationSettlement?.debtAdded || 0;
    const debtMetrics = buildLiquidationDebtMetrics({
      totalSales: financialSummary.totalSales,
      totalCommissions: financialSummary.totalCommissions,
      totalPrizes: financialSummary.totalPrizes,
      totalInjections: financialSummary.totalInjections,
      amountPaid: paid,
      currentDebt,
      existingDebtImpact,
    });

    return {
      userToLiquidate,
      isCurrentOperationalDate,
      liquidationResultsSource,
      financialSummary,
      ticketsToLiquidate,
      injectionsToLiquidate,
      paid,
      currentDebt,
      existingDebtImpact,
      ...debtMetrics,
      actionLabel: selectedLiquidationSettlement ? 'actualizar' : 'liquidar',
    };
  }, [
    amountPaid,
    businessDayKey,
    buildFinancialSummary,
    getTicketPrizesFromSource,
    injections,
    liquidationDate,
    liquidationInjectionsSnapshot,
    liquidationResultsSnapshot,
    liquidationTicketsSnapshot,
    results,
    selectedLiquidationSettlement,
    selectedUserToLiquidate,
    tickets,
    users,
  ]);

  return {
    amountPaid,
    setAmountPaid,
    selectedLiquidationSettlement,
    liquidationPreview,
  };
}
