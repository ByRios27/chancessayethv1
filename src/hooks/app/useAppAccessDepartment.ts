import { useCallback, useEffect, useRef, useState } from 'react';

import { format } from 'date-fns';

import { useAppDataScopes, type AppTabId } from '../useAppDataScopes';
import { useAuthSession } from '../useAuthSession';
import { useOperationalClock } from '../useOperationalClock';
import { useResponsiveShellState } from '../useResponsiveShellState';
import type { ClosedLotteryCardsCacheEntry } from '../useHistoryDashboardData';
import type { HistoricalOperationalDataCacheEntry } from '../useHistoricalOperationalData';
import type { LotteryTicket } from '../../types/bets';
import type { Injection, Settlement } from '../../types/finance';
import type { Lottery } from '../../types/lotteries';
import type { LotteryResult } from '../../types/results';
import { getBusinessDate } from '../../utils/dates';
import { handleFirestoreError, OperationType } from '../../utils/firestoreError';
import { isCeoOwnerProfile } from '../../utils/roles';

export function useAppAccessDepartment() {
  const enforceSessionByOperationalDay = false;
  const autoResetStateOnBusinessDayChange = false;
  const { user, userProfile, setUserProfile, loading, handleLogout } = useAuthSession(enforceSessionByOperationalDay);
  const { tick, businessDayKey, getQuickOperationalDate, applyOperationalQuickDate } = useOperationalClock();
  const currentUserRole = userProfile?.role;
  const normalizedRole = String(userProfile?.role || '').toLowerCase();
  const canUseGlobalScope = normalizedRole === 'ceo' || normalizedRole === 'owner' || normalizedRole === 'admin';
  const [showGlobalScope, setShowGlobalScope] = useState(false);
  const [historyTickets, setHistoryTickets] = useState<LotteryTicket[]>([]);
  const [activeTab, setActiveTab] = useState<AppTabId>('sales');
  const [archiveUserEmail, setArchiveUserEmail] = useState('');
  const [archiveDate, setArchiveDate] = useState<string>(() => {
    const d = getBusinessDate();
    d.setDate(d.getDate() - 1);
    return format(d, 'yyyy-MM-dd');
  });
  const [archiveTickets, setArchiveTickets] = useState<LotteryTicket[]>([]);
  const [archiveInjections, setArchiveInjections] = useState<Injection[]>([]);
  const [isArchiveLoading, setIsArchiveLoading] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'TODO' | 'CHANCE' | 'BILLETE' | 'PALE'>('TODO');
  const [showTicketModal, setShowTicketModal] = useState<{ ticket: LotteryTicket; selectedLotteryName?: string } | null>(null);
  const [showLotteryModal, setShowLotteryModal] = useState<boolean>(false);
  const [historyDate, setHistoryDate] = useState(format(getBusinessDate(), 'yyyy-MM-dd'));
  const [editingLottery, setEditingLottery] = useState<Lottery | null>(null);
  const [expandedLotteries, setExpandedLotteries] = useState<string[]>([]);
  const [lotteryPages, setLotteryPages] = useState<Record<string, number>>({});
  const [editingTicketId, setEditingTicketId] = useState<string | null>(null);
  const [historyInjections, setHistoryInjections] = useState<Injection[]>([]);
  const [historySettlements, setHistorySettlements] = useState<Settlement[]>([]);
  const [liquidationTicketsSnapshot, setLiquidationTicketsSnapshot] = useState<LotteryTicket[]>([]);
  const [liquidationInjectionsSnapshot, setLiquidationInjectionsSnapshot] = useState<Injection[]>([]);
  const [liquidationResultsSnapshot, setLiquidationResultsSnapshot] = useState<LotteryResult[]>([]);
  const [liquidationSettlementsSnapshot, setLiquidationSettlementsSnapshot] = useState<Settlement[]>([]);
  const [isLiquidationDataLoading, setIsLiquidationDataLoading] = useState(false);
  const [selectedUserToLiquidate, setSelectedUserToLiquidate] = useState<string>('');
  const [liquidationDate, setLiquidationDate] = useState<string>(format(getBusinessDate(), 'yyyy-MM-dd'));

  useEffect(() => {
    if (!userProfile) return;
    setActiveTab('sales');
  }, [userProfile?.email]);

  useEffect(() => {
    if (!canUseGlobalScope && showGlobalScope) {
      setShowGlobalScope(false);
    }
  }, [canUseGlobalScope, showGlobalScope]);

  const {
    canAccessAllUsers,
    shouldLoadUsersList,
    needsRealtimeOperationalData,
    shouldLoadLotteries,
    shouldListenGlobalSettings,
    shouldListenResults,
    shouldListenInjections,
    shouldListenSettlements,
  } = useAppDataScopes({
    activeTab,
    userRole: userProfile?.role,
    canUseGlobalScope,
    showGlobalScope,
    historyDate,
    businessDayKey,
    archiveDate,
  });

  const { isMobile, isOnline, isSidebarOpen, setIsSidebarOpen } = useResponsiveShellState();
  const isPrimaryCeoUser = isCeoOwnerProfile(userProfile);
  const operationalSellerId = (
    userProfile?.sellerId ||
    userProfile?.email?.split('@')[0]?.toUpperCase() ||
    user?.email?.split('@')[0]?.toUpperCase() ||
    user?.uid ||
    ''
  ).trim();
  const historyDataCacheRef = useRef<Map<string, HistoricalOperationalDataCacheEntry>>(new Map());
  const closedLotteryCardsCacheRef = useRef<Map<string, ClosedLotteryCardsCacheEntry>>(new Map());

  const handleUsersHookError = useCallback((error: unknown, operation: 'get' | 'list', target: string) => {
    const op = operation === 'list' ? OperationType.LIST : OperationType.GET;
    handleFirestoreError(error, op, target);
  }, []);

  const handleOperationalHookError = useCallback((error: unknown, _operation: 'get' | 'list', target: string) => {
    handleFirestoreError(error, OperationType.GET, target);
  }, []);

  useEffect(() => {
    if (userProfile && userProfile.role === 'seller' && user?.email) {
      setSelectedUserToLiquidate(user.email || '');
      setArchiveUserEmail(user.email || '');
    }
  }, [userProfile, user?.email]);

  return {
    autoResetStateOnBusinessDayChange,
    user,
    userProfile,
    setUserProfile,
    loading,
    handleLogout,
    tick,
    businessDayKey,
    getQuickOperationalDate,
    applyOperationalQuickDate,
    currentUserRole,
    canUseGlobalScope,
    showGlobalScope,
    setShowGlobalScope,
    historyTickets,
    setHistoryTickets,
    activeTab,
    setActiveTab,
    archiveUserEmail,
    setArchiveUserEmail,
    archiveDate,
    setArchiveDate,
    archiveTickets,
    setArchiveTickets,
    archiveInjections,
    setArchiveInjections,
    isArchiveLoading,
    setIsArchiveLoading,
    historyFilter,
    setHistoryFilter,
    showTicketModal,
    setShowTicketModal,
    showLotteryModal,
    setShowLotteryModal,
    historyDate,
    setHistoryDate,
    canAccessAllUsers,
    shouldLoadUsersList,
    needsRealtimeOperationalData,
    shouldLoadLotteries,
    shouldListenGlobalSettings,
    shouldListenResults,
    shouldListenInjections,
    shouldListenSettlements,
    editingLottery,
    setEditingLottery,
    isMobile,
    isOnline,
    isSidebarOpen,
    setIsSidebarOpen,
    expandedLotteries,
    setExpandedLotteries,
    lotteryPages,
    setLotteryPages,
    editingTicketId,
    setEditingTicketId,
    historyInjections,
    setHistoryInjections,
    historySettlements,
    setHistorySettlements,
    liquidationTicketsSnapshot,
    setLiquidationTicketsSnapshot,
    liquidationInjectionsSnapshot,
    setLiquidationInjectionsSnapshot,
    liquidationResultsSnapshot,
    setLiquidationResultsSnapshot,
    liquidationSettlementsSnapshot,
    setLiquidationSettlementsSnapshot,
    isLiquidationDataLoading,
    setIsLiquidationDataLoading,
    selectedUserToLiquidate,
    setSelectedUserToLiquidate,
    liquidationDate,
    setLiquidationDate,
    isPrimaryCeoUser,
    operationalSellerId,
    historyDataCacheRef,
    closedLotteryCardsCacheRef,
    handleUsersHookError,
    handleOperationalHookError,
  };
}
