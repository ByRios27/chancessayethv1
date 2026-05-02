import { useState } from 'react';

import { useAppAccessDepartment } from './app/useAppAccessDepartment';
import { useAppDataDepartment } from './app/useAppDataDepartment';
import { useAppManagementDepartment } from './app/useAppManagementDepartment';
import { useAppOperationsDepartment } from './app/useAppOperationsDepartment';
import { useAppSalesDepartment } from './app/useAppSalesDepartment';
import { useAppViewDepartment } from './app/useAppViewDepartment';
import type { LotteryTicket } from '../types/bets';
import type { UserProfile } from '../types/users';

export function useAppController() {
  const access = useAppAccessDepartment();
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [showInjectionModal, setShowInjectionModal] = useState(false);
  const [isInjectionOnly, setIsInjectionOnly] = useState(false);
  const [injectionTargetUserEmail, setInjectionTargetUserEmail] = useState<string>('');
  const [injectionDefaultType, setInjectionDefaultType] = useState<'injection' | 'payment' | 'debt'>('injection');
  const [injectionInitialAmount, setInjectionInitialAmount] = useState<string>('');
  const [confirmModal, setConfirmModal] = useState({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [multiDeleteModal, setMultiDeleteModal] = useState({
    show: false,
    onDeleteLottery: () => {},
    onDeleteAll: () => {},
  });
  const [reuseModal, setReuseModal] = useState<{
    show: boolean;
    ticket: LotteryTicket | null;
  }>({ show: false, ticket: null });
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const data = useAppDataDepartment({
    activeTab: access.activeTab,
    archiveDate: access.archiveDate,
    businessDayKey: access.businessDayKey,
    canAccessAllUsers: access.canAccessAllUsers,
    confirmModalShow: confirmModal.show,
    handleOperationalHookError: access.handleOperationalHookError,
    handleUsersHookError: access.handleUsersHookError,
    needsRealtimeOperationalData: access.needsRealtimeOperationalData,
    operationalSellerId: access.operationalSellerId,
    shouldListenGlobalSettings: access.shouldListenGlobalSettings,
    shouldListenInjections: access.shouldListenInjections,
    shouldListenResults: access.shouldListenResults,
    shouldListenSettlements: access.shouldListenSettlements,
    shouldLoadLotteries: access.shouldLoadLotteries,
    shouldLoadUsersList: access.shouldLoadUsersList,
    user: access.user,
    userProfile: access.userProfile,
  });

  const sales = useAppSalesDepartment({
    businessDayKey: access.businessDayKey,
    editingTicketId: access.editingTicketId,
    globalSettings: data.globalSettings,
    historyTickets: access.historyTickets,
    lotteries: data.lotteries,
    operationalSellerId: access.operationalSellerId,
    results: data.results,
    reuseModal,
    selectedLottery: data.selectedLottery,
    setSpecial4DTickets: data.setSpecial4DTickets,
    setActiveTab: access.setActiveTab,
    setConfirmModal,
    setEditingTicketId: access.setEditingTicketId,
    setHistoryTickets: access.setHistoryTickets,
    setLiquidationTicketsSnapshot: access.setLiquidationTicketsSnapshot,
    setMultiDeleteModal,
    setReuseModal,
    setSelectedLottery: data.setSelectedLottery,
    setShowTicketModal: access.setShowTicketModal,
    setTickets: data.setTickets,
    sortedLotteries: data.sortedLotteries,
    special4DTickets: data.special4DTickets,
    tickets: data.tickets,
    user: access.user,
    userProfile: access.userProfile,
  });

  const hasOwnUnliquidatedSalesInBusinessDay = data.tickets.some((ticket: LotteryTicket) =>
    !!access.operationalSellerId &&
    ticket.sellerId === access.operationalSellerId &&
    !ticket.liquidated
  );
  const canUpdatePersonalChancePrice = !hasOwnUnliquidatedSalesInBusinessDay;

  const management = useAppManagementDepartment({
    businessDayKey: access.businessDayKey,
    canUpdatePersonalChancePrice,
    editingLottery: access.editingLottery,
    editingUser,
    getResultKey: data.getResultKey,
    getSpecial4DTicketPrizes: data.getSpecial4DTicketPrizes,
    getTicketDateKey: data.getTicketDateKey,
    getTicketPrizesFromSource: data.getTicketPrizesFromSource,
    globalSettings: data.globalSettings,
    isPrimaryCeoUser: access.isPrimaryCeoUser,
    lotteries: data.lotteries,
    operationalSellerId: access.operationalSellerId,
    refreshResults: data.refreshResults,
    resultLotteries: data.resultLotteries,
    results: data.results,
    setChancePrice: sales.setChancePrice,
    setConfirmModal,
    setEditingLottery: access.setEditingLottery,
    setEditingUser,
    setInjections: data.setInjections,
    setShowLotteryModal: access.setShowLotteryModal,
    setShowUserModal,
    setUserProfile: access.setUserProfile,
    setUsers: data.setUsers,
    sortedLotteries: data.resultLotteries,
    special4DTickets: data.special4DTickets,
    tickets: data.tickets,
    user: access.user,
    userProfile: access.userProfile,
    users: data.users,
  });

  const operations = useAppOperationsDepartment({
    activeTab: access.activeTab,
    archiveDate: access.archiveDate,
    archiveTickets: access.archiveTickets,
    archiveUserEmail: access.archiveUserEmail,
    autoResetStateOnBusinessDayChange: access.autoResetStateOnBusinessDayChange,
    buildFinancialSummary: data.buildFinancialSummary,
    buildSpecial4DFinancialSummary: data.buildSpecial4DFinancialSummary,
    businessDayKey: access.businessDayKey,
    canAccessAllUsers: access.canAccessAllUsers,
    closedLotteryCardsCacheRef: access.closedLotteryCardsCacheRef,
    getQuickOperationalDate: access.getQuickOperationalDate,
    getTicketDateKey: data.getTicketDateKey,
    getTicketPrizes: data.getTicketPrizes,
    getTicketPrizesFromSource: data.getTicketPrizesFromSource,
    globalSettings: data.globalSettings,
    historyDataCacheRef: access.historyDataCacheRef,
    historyDate: access.historyDate,
    historyFilter: access.historyFilter,
    historyInjections: access.historyInjections,
    historySettlements: access.historySettlements,
    historyTickets: access.historyTickets,
    injections: data.injections,
    isLiquidationDataLoading: access.isLiquidationDataLoading,
    isLotteryOpenForSales: sales.isLotteryOpenForSales,
    isPrimaryCeoUser: access.isPrimaryCeoUser,
    liquidationDate: access.liquidationDate,
    liquidationInjectionsSnapshot: access.liquidationInjectionsSnapshot,
    liquidationResultsSnapshot: access.liquidationResultsSnapshot,
    liquidationSettlementsSnapshot: access.liquidationSettlementsSnapshot,
    liquidationTicketsSnapshot: access.liquidationTicketsSnapshot,
    lotteries: data.lotteries,
    lotteryPages: access.lotteryPages,
    operationalSellerId: access.operationalSellerId,
    results: data.results,
    selectedUserToLiquidate: access.selectedUserToLiquidate,
    setArchiveDate: access.setArchiveDate,
    setArchiveInjections: access.setArchiveInjections,
    setArchiveTickets: access.setArchiveTickets,
    setArchiveUserEmail: access.setArchiveUserEmail,
    setChancePrice: sales.setChancePrice,
    setConfirmModal,
    setHistoryDate: access.setHistoryDate,
    setHistoryInjections: access.setHistoryInjections,
    setHistorySettlements: access.setHistorySettlements,
    setHistoryTickets: access.setHistoryTickets,
    setInjections: data.setInjections,
    setIsArchiveLoading: access.setIsArchiveLoading,
    setIsLiquidationDataLoading: access.setIsLiquidationDataLoading,
    setLiquidationDate: access.setLiquidationDate,
    setLiquidationInjectionsSnapshot: access.setLiquidationInjectionsSnapshot,
    setLiquidationResultsSnapshot: access.setLiquidationResultsSnapshot,
    setLiquidationSettlementsSnapshot: access.setLiquidationSettlementsSnapshot,
    setLiquidationTicketsSnapshot: access.setLiquidationTicketsSnapshot,
    setPersonalChancePrice: management.setPersonalChancePrice,
    setResults: data.setResults,
    setSelectedUserToLiquidate: access.setSelectedUserToLiquidate,
    setSettlements: data.setSettlements,
    setTickets: data.setTickets,
    setUsers: data.setUsers,
    settlements: data.settlements,
    special4DSettlements: data.special4DSettlements,
    special4DTickets: data.special4DTickets,
    setSpecial4DSettlements: data.setSpecial4DSettlements,
    setSpecial4DTickets: data.setSpecial4DTickets,
    sortedLotteries: data.resultLotteries,
    tickets: data.tickets,
    tick: access.tick,
    user: access.user,
    userProfile: access.userProfile,
    users: data.users,
  });

  const ui = {
    canUpdatePersonalChancePrice,
    confirmModal,
    editingUser,
    injectionDefaultType,
    injectionInitialAmount,
    injectionTargetUserEmail,
    isInjectionOnly,
    multiDeleteModal,
    reuseModal,
    setConfirmModal,
    setEditingUser,
    setInjectionDefaultType,
    setInjectionInitialAmount,
    setInjectionTargetUserEmail,
    setIsInjectionOnly,
    setMultiDeleteModal,
    setReuseModal,
    setShowInjectionModal,
    setShowSettingsModal,
    setShowUserModal,
    showInjectionModal,
    showSettingsModal,
    showUserModal,
  };

  const view = useAppViewDepartment({
    access,
    data,
    management,
    operations,
    sales,
    ui,
  });

  return {
    loading: access.loading,
    user: access.user,
    userProfile: access.userProfile,
    handleLogoutFromUi: view.handleLogoutFromUi,
    modalsProps: view.modalsProps,
    sidebarProps: view.sidebarProps,
    mainContentProps: view.mainContentProps,
  };
}
