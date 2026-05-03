import { useCallback } from 'react';

import { toast } from 'sonner';

import { useArchiveDomain } from '../../domains/archive/hooks/useArchiveDomain';
import { useLiquidationDomain } from '../../domains/liquidation/hooks/useLiquidationDomain';
import { hardResetFirestoreData } from '../../services/repositories/hardResetRepo';
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
import { toastSuccess } from '../../utils/toast';

export function useAppOperationsDepartment({
  activeTab,
  archiveDate,
  archiveTickets,
  archiveUserEmail,
  autoResetStateOnBusinessDayChange,
  buildFinancialSummary,
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
  setTickets,
  setUsers,
  settlements,
  sortedLotteries,
  tickets,
  tick,
  user,
  userProfile,
  users,
}: any) {
  const { resetOperationalStateAfterArchive } = useOperationalStateReset({
    businessDayKey,
    globalSettings,
    userProfile,
    setChancePrice,
    setPersonalChancePrice,
    setTickets,
    setResults,
    setInjections,
    setSettlements,
    setHistoryTickets,
    setHistoryInjections,
    setHistorySettlements,
    setLiquidationTicketsSnapshot,
    setLiquidationResultsSnapshot,
    setLiquidationInjectionsSnapshot,
    setLiquidationSettlementsSnapshot,
  });

  const { runOperationalArchiveAndCleanup, runOperationalDeleteOnly } = useOperationalArchive({
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
    runOperationalDeleteOnly,
  });

  const resetLocalStateAfterHardReset = useCallback(() => {
    setTickets([]);
    setResults([]);
    setInjections([]);
    setSettlements([]);
    setHistoryTickets([]);
    setHistoryInjections([]);
    setHistorySettlements([]);
    setArchiveTickets([]);
    setArchiveInjections([]);
    setLiquidationTicketsSnapshot([]);
    setLiquidationInjectionsSnapshot([]);
    setLiquidationResultsSnapshot([]);
    setLiquidationSettlementsSnapshot([]);
    historyDataCacheRef.current?.clear?.();
    closedLotteryCardsCacheRef.current?.clear?.();
    setUsers((prevUsers: any[]) => (
      Array.isArray(prevUsers)
        ? prevUsers.map((userItem) => ({
          ...userItem,
          currentDebt: 0,
          requiresInjection: false,
        }))
        : prevUsers
    ));
  }, [
    closedLotteryCardsCacheRef,
    historyDataCacheRef,
    setArchiveInjections,
    setArchiveTickets,
    setHistoryInjections,
    setHistorySettlements,
    setHistoryTickets,
    setInjections,
    setLiquidationInjectionsSnapshot,
    setLiquidationResultsSnapshot,
    setLiquidationSettlementsSnapshot,
    setLiquidationTicketsSnapshot,
    setResults,
    setSettlements,
    setTickets,
    setUsers,
  ]);

  const handleHardResetFirestoreData = useCallback(async (password: string) => {
    if (!user || !userProfile || !isPrimaryCeoUser) {
      toast.error('Solo el CEO Owner puede ejecutar el hard reset');
      return;
    }

    try {
      const summary = await hardResetFirestoreData({
        currentUser: user,
        password,
      });
      resetLocalStateAfterHardReset();
      const deletedTotal =
        summary.tickets +
        summary.results +
        summary.injections +
        summary.settlements +
        summary.appAlerts +
        summary.dailyArchiveDocs +
        summary.dailyArchiveUserDocs +
        summary.dailyAuditLogDocs +
        summary.dailyAuditEventDocs +
        summary.supportDocs;

      toastSuccess(`Hard reset completado: ${deletedTotal} documentos eliminados`);
      if (summary.usersNormalized > 0) {
        toast.info(`${summary.usersNormalized} usuarios conservados con saldo operativo en cero`);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'firestore/hard-reset');
      throw error;
    }
  }, [isPrimaryCeoUser, resetLocalStateAfterHardReset, user, userProfile]);

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
    userProfile,
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
    handleHardResetFirestoreData,
    handleLiquidate,
    handleLiquidateRange,
    historyLotteryCards,
    historyTypeFilterCode,
    isGeneratingYesterdayReport,
    isLiquidationRangeLoading,
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
