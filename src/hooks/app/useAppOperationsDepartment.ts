import { useCallback, useMemo, useState } from 'react';

import { toast } from 'sonner';

import { SPECIAL4D_LOTTERY_ID } from '../../config/special4d';
import { useArchiveDomain } from '../../domains/archive/hooks/useArchiveDomain';
import { useLiquidationDomain } from '../../domains/liquidation/hooks/useLiquidationDomain';
import { serverTimestamp } from '../../firebase';
import {
  createSpecial4DSettlement,
  markSpecial4DTicketsLiquidated,
} from '../../services/repositories/special4dRepo';
import { useAutoOperationalCleanup } from '../useAutoOperationalCleanup';
import { useBusinessDayTransitionReset } from '../useBusinessDayTransitionReset';
import { useHistoricalOperationalData } from '../useHistoricalOperationalData';
import { useHistoryDashboardData } from '../useHistoryDashboardData';
import { useManualOperationalCleanup } from '../useManualOperationalCleanup';
import { useOperationalArchive } from '../useOperationalArchive';
import { useOperationalDateOptions } from '../useOperationalDateOptions';
import { useOperationalStateReset } from '../useOperationalStateReset';
import { handleFirestoreError, OperationType } from '../../utils/firestoreError';
import {
  getBusinessDayRange,
  getOperationalTimeSortValue,
  mergeTicketSnapshots,
} from '../../utils/tickets';

export function useAppOperationsDepartment({
  activeTab,
  archiveDate,
  archiveTickets,
  archiveUserEmail,
  autoResetStateOnBusinessDayChange,
  buildFinancialSummary,
  buildSpecial4DFinancialSummary,
  businessDayKey,
  canAccessAllUsers,
  closedLotteryCardsCacheRef,
  getQuickOperationalDate,
  getTicketDateKey,
  getTicketPrizes,
  getTicketPrizesFromSource,
  globalSettings,
  historyDataCacheRef,
  historyDate,
  historyFilter,
  historyInjections,
  historySettlements,
  historyTickets,
  injections,
  isLiquidationDataLoading,
  isLotteryOpenForSales,
  isPrimaryCeoUser,
  liquidationDate,
  liquidationInjectionsSnapshot,
  liquidationResultsSnapshot,
  liquidationSettlementsSnapshot,
  liquidationTicketsSnapshot,
  lotteryPages,
  lotteries,
  operationalSellerId,
  results,
  selectedUserToLiquidate,
  setArchiveDate,
  setArchiveInjections,
  setArchiveTickets,
  setArchiveUserEmail,
  setChancePrice,
  setConfirmModal,
  setHistoryDate,
  setHistoryInjections,
  setHistorySettlements,
  setHistoryTickets,
  setInjections,
  setIsArchiveLoading,
  setIsLiquidationDataLoading,
  setLiquidationDate,
  setLiquidationInjectionsSnapshot,
  setLiquidationResultsSnapshot,
  setLiquidationSettlementsSnapshot,
  setLiquidationTicketsSnapshot,
  setPersonalChancePrice,
  setResults,
  setSelectedUserToLiquidate,
  setSettlements,
  setSpecial4DSettlements,
  setSpecial4DTickets,
  setTickets,
  setUsers,
  settlements,
  special4DSettlements,
  special4DTickets,
  sortedLotteries,
  tickets,
  tick,
  user,
  userProfile,
  users,
}: any) {
  const [isLiquidatingSpecial4D, setIsLiquidatingSpecial4D] = useState(false);

  const { resetOperationalStateAfterArchive } = useOperationalStateReset({
    businessDayKey,
    globalSettings,
    userProfile,
    setChancePrice,
    setPersonalChancePrice,
    setTickets,
    setResults,
    setInjections,
    setHistoryTickets,
    setHistoryInjections,
    setLiquidationTicketsSnapshot,
    setLiquidationResultsSnapshot,
    setLiquidationInjectionsSnapshot,
    setLiquidationSettlementsSnapshot,
  });

  const { runOperationalArchiveAndCleanup } = useOperationalArchive({
    businessDayKey,
    getBusinessDayRange,
    archivedBy: (userProfile?.email || user?.email || '').toLowerCase(),
    onResetOperationalState: resetOperationalStateAfterArchive,
  });

  useAutoOperationalCleanup({
    tick,
    userUid: user?.uid,
    userRole: userProfile?.role,
    getQuickOperationalDate,
    runOperationalArchiveAndCleanup,
  });

  const handleHistoricalDataError = useCallback((error: unknown, target: string) => {
    handleFirestoreError(error, OperationType.GET, target);
  }, []);

  useHistoricalOperationalData({
    enabled: !!user?.uid && !!userProfile?.role && (activeTab === 'history' || activeTab === 'stats' || activeTab === 'cierres'),
    businessDayKey,
    historyDate,
    canAccessAllUsers,
    operationalSellerId,
    tickets,
    injections,
    settlements,
    results,
    historyDataCacheRef,
    getBusinessDayRange,
    mergeTicketSnapshots,
    setHistoryTickets,
    setHistoryInjections,
    setHistorySettlements,
    setResults,
    onError: handleHistoricalDataError,
  });

  const { recentOperationalDates, liquidationUsers } = useOperationalDateOptions({
    businessDayKey,
    tickets,
    historyTickets,
    archiveTickets,
    injections,
    historyInjections,
    settlements,
    historySettlements,
    users,
    userProfile,
    getQuickOperationalDate,
    getTicketDateKey,
  });

  const {
    consolidatedMode,
    setConsolidatedMode,
    consolidatedReportDate,
    setConsolidatedReportDate,
    consolidatedStartDate,
    setConsolidatedStartDate,
    consolidatedEndDate,
    setConsolidatedEndDate,
    isGeneratingYesterdayReport,
    liquidacionQuickDateOptions,
    amountPaid,
    setAmountPaid,
    amountDirection,
    setAmountDirection,
    selectedLiquidationSettlement,
    liquidationPreview,
    liquidationGlobalSummary,
    liquidationUserSummaries,
    liquidationRangeStartDate,
    setLiquidationRangeStartDate,
    liquidationRangeEndDate,
    setLiquidationRangeEndDate,
    liquidationRangeReport,
    isLiquidationRangeLoading,
    fetchLiquidationRangeReport,
    handleLiquidateRange,
    handleLiquidate,
    generateConsolidatedReport,
  } = useLiquidationDomain({
    businessDayKey,
    users: liquidationUsers,
    tickets,
    injections,
    results,
    lotteries,
    settlements,
    userProfile,
    isPrimaryCeoUser,
    getQuickOperationalDate,
    getOperationalTimeSortValue,
    recentOperationalDates,
    getBusinessDayRange,
    buildFinancialSummary,
    getTicketPrizesFromSource,
    liquidationDate,
    setLiquidationDate,
    selectedUserToLiquidate,
    setSelectedUserToLiquidate,
    liquidationTicketsSnapshot,
    liquidationInjectionsSnapshot,
    liquidationResultsSnapshot,
    liquidationSettlementsSnapshot,
    setLiquidationSettlementsSnapshot,
    setSettlements,
    setUsers,
    isLiquidationDataLoading,
    setTickets,
    setInjections,
    setConfirmModal,
    onError: handleFirestoreError,
  });

  const { handleDeleteAllSalesData } = useManualOperationalCleanup({
    userProfile,
    isPrimaryCeoUser,
    businessDayKey,
    setConfirmModal,
    runOperationalArchiveAndCleanup,
  });

  const {
    todayStr,
    todayStats,
    filteredTickets,
    historyTypeFilterCode,
    historyLotteryCards,
    userStats,
  } = useHistoryDashboardData({
    activeTab,
    businessDayKey,
    tickets,
    historyTickets,
    injections,
    historyInjections,
    historyDate,
    historyFilter,
    canAccessAllUsers,
    operationalSellerId,
    userProfile,
    currentUserEmail: user?.email,
    currentUserUid: user?.uid,
    users,
    results,
    sortedLotteries,
    lotteryPages,
    closedLotteryCardsCacheRef,
    getTicketDateKey,
    getTicketPrizes,
    buildFinancialSummary,
    isLotteryOpenForSales,
  });

  const special4DUserSummaries = useMemo(() => {
    return liquidationUsers.map((candidate: any) => {
      const summary = buildSpecial4DFinancialSummary({
        tickets: special4DTickets,
        settlements: special4DSettlements,
        userEmail: candidate.email,
        targetDate: liquidationDate,
      });
      return {
        user: candidate,
        summary,
        status: Math.abs(Number(summary.pendingBalance || 0)) <= 0.005 ? 'liquidated' : 'pending',
      };
    }).filter((row: any) => (
      row.user?.role === 'seller' ||
      row.summary.totalSales > 0 ||
      Math.abs(row.summary.pendingBalance || 0) > 0.005
    ));
  }, [buildSpecial4DFinancialSummary, liquidationDate, liquidationUsers, special4DSettlements, special4DTickets]);

  const special4DPreview = useMemo(() => {
    const targetUser = userProfile?.role === 'seller'
      ? userProfile
      : liquidationUsers.find((candidate: any) => String(candidate.email || '').toLowerCase() === String(selectedUserToLiquidate || '').toLowerCase());
    if (!targetUser?.email) return null;

    return {
      userToLiquidate: targetUser,
      financialSummary: buildSpecial4DFinancialSummary({
        tickets: special4DTickets,
        settlements: special4DSettlements,
        userEmail: targetUser.email,
        targetDate: liquidationDate,
      }),
    };
  }, [
    buildSpecial4DFinancialSummary,
    liquidationDate,
    liquidationUsers,
    selectedUserToLiquidate,
    special4DSettlements,
    special4DTickets,
    userProfile,
  ]);

  const handleLiquidateSpecial4D = useCallback(async () => {
    if (!(userProfile?.role === 'ceo' || userProfile?.role === 'admin')) {
      toast.error('No tienes permisos para liquidar Especial 4D');
      return;
    }
    const targetUser = special4DPreview?.userToLiquidate;
    const summary = special4DPreview?.financialSummary;
    if (!targetUser?.email || !summary) {
      toast.error('Seleccione un vendedor para Especial 4D');
      return;
    }

    const pending = Number(summary.pendingBalance || 0);
    const hasTicketsWithoutResult = (summary.tickets || []).some((ticket: any) => !results.some((result: any) => (
      result.date === ticket.date && result.lotteryId === (ticket.specialLotteryId || ticket.sourceLotteryId || SPECIAL4D_LOTTERY_ID)
    )));
    if (hasTicketsWithoutResult) {
      toast.error('Falta resultado del sorteo Especial 4D para liquidar');
      return;
    }

    if (Math.abs(pending) <= 0.005) {
      toast.info('Especial 4D no tiene pendiente por liquidar');
      return;
    }

    const ticketsToLiquidate = (summary.tickets || []).filter((ticket: any) => (
      ticket.status === 'active' && !ticket.liquidated && !ticket.settlementId
    ));
    if (ticketsToLiquidate.length === 0) {
      toast.info('No hay tickets Especial 4D pendientes');
      return;
    }

    setIsLiquidatingSpecial4D(true);
    try {
      const amountDirection: 'received' | 'sent' = pending < 0 ? 'sent' : 'received';
      const amountPaid = Math.abs(pending);
      const amountReceived = amountDirection === 'received' ? amountPaid : 0;
      const amountSent = amountDirection === 'sent' ? amountPaid : 0;
      const ticketIds = ticketsToLiquidate.map((ticket: any) => ticket.id);
      const settlementPayload = {
        sellerId: targetUser.sellerId || '',
        userEmail: targetUser.email.toLowerCase(),
        userName: targetUser.name || '',
        date: liquidationDate,
        totalSales: summary.totalSales,
        totalCommissions: summary.totalCommissions,
        totalPrizes: summary.totalPrizes,
        netProfit: summary.netProfit,
        amountPaid,
        amountDirection,
        amountReceived,
        amountSent,
        pendingBefore: pending,
        pendingAfter: 0,
        ticketIds,
        closed: true,
        status: 'liquidated' as const,
        liquidatedBy: userProfile.email || '',
        timestamp: serverTimestamp(),
      };

      const settlementRef = await createSpecial4DSettlement(settlementPayload);
      await markSpecial4DTicketsLiquidated(ticketIds, settlementRef.id);

      setSpecial4DSettlements((prev: any[]) => [{
        id: settlementRef.id,
        ...settlementPayload,
        timestamp: { toDate: () => new Date() },
      }, ...prev]);
      setSpecial4DTickets((prev: any[]) => prev.map((ticket) => (
        ticketIds.includes(ticket.id)
          ? { ...ticket, liquidated: true, settlementId: settlementRef.id }
          : ticket
      )));
      toast.success('Especial 4D liquidado');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'special4_settlements');
    } finally {
      setIsLiquidatingSpecial4D(false);
    }
  }, [
    liquidationDate,
    setSpecial4DSettlements,
    setSpecial4DTickets,
    special4DPreview,
    results,
    userProfile,
  ]);

  const { fetchArchiveData, fetchArchiveSalesReport, searchArchiveTickets, fetchArchiveLiquidations } = useArchiveDomain({
    activeTab,
    archiveDate,
    archiveUserEmail,
    businessDayKey,
    buildFinancialSummary,
    getBusinessDayRange,
    mergeTicketSnapshots,
    operationalSellerId,
    injections,
    settlements,
    tickets,
    liquidationDate,
    selectedUserToLiquidate,
    setArchiveInjections,
    setArchiveTickets,
    setIsArchiveLoading,
    setIsLiquidationDataLoading,
    setLiquidationInjectionsSnapshot,
    setLiquidationResultsSnapshot,
    setLiquidationSettlementsSnapshot,
    setLiquidationTicketsSnapshot,
    setResults,
  });

  useBusinessDayTransitionReset({
    enabled: autoResetStateOnBusinessDayChange,
    businessDayKey,
    historyDate,
    archiveDate,
    liquidationDate,
    userEmail: user?.email,
    userProfile,
    setHistoryDate,
    setArchiveDate,
    setLiquidationDate,
    setArchiveUserEmail,
    setSelectedUserToLiquidate,
    setTickets,
    setHistoryTickets,
    setArchiveTickets,
    setArchiveInjections,
    setInjections,
    setSettlements,
    setHistoryInjections,
    setHistorySettlements,
    setLiquidationTicketsSnapshot,
    setLiquidationInjectionsSnapshot,
    setLiquidationResultsSnapshot,
    historyDataCacheRef,
    closedLotteryCardsCacheRef,
  });

  return {
    amountDirection,
    amountPaid,
    archiveUserEmail,
    consolidatedEndDate,
    consolidatedMode,
    consolidatedReportDate,
    consolidatedStartDate,
    fetchArchiveData,
    fetchArchiveLiquidations,
    fetchArchiveSalesReport,
    fetchLiquidationRangeReport,
    filteredTickets,
    generateConsolidatedReport,
    handleDeleteAllSalesData,
    handleLiquidate,
    handleLiquidateRange,
    handleLiquidateSpecial4D,
    historyLotteryCards,
    historyTypeFilterCode,
    isGeneratingYesterdayReport,
    isLiquidationRangeLoading,
    isLiquidatingSpecial4D,
    liquidationGlobalSummary,
    liquidationPreview,
    liquidationRangeEndDate,
    liquidationRangeReport,
    liquidationRangeStartDate,
    liquidationUserSummaries,
    liquidationUsers,
    liquidacionQuickDateOptions,
    recentOperationalDates,
    searchArchiveTickets,
    selectedLiquidationSettlement,
    special4DPreview,
    special4DUserSummaries,
    setAmountDirection,
    setAmountPaid,
    setArchiveUserEmail,
    setConsolidatedEndDate,
    setConsolidatedMode,
    setConsolidatedReportDate,
    setConsolidatedStartDate,
    setLiquidationRangeEndDate,
    setLiquidationRangeStartDate,
    todayStats,
    todayStr,
    userStats,
  };
}
