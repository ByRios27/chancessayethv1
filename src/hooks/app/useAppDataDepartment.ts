import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { toast } from 'sonner';

import { useAppAlerts } from '../useAppAlerts';
import { useDailyAuditLogs } from '../useDailyAuditLogs';
import { useGlobalSettings } from '../useGlobalSettings';
import { useInjections } from '../useInjections';
import { useLotteries } from '../useLotteries';
import { usePunctualRefresh } from '../usePunctualRefresh';
import { useResults } from '../useResults';
import { useSettlements } from '../useSettlements';
import { useSpecial4DSettlements } from '../useSpecial4DSettlements';
import { useSpecial4DTickets } from '../useSpecial4DTickets';
import { useTicketFinancials } from '../useTicketFinancials';
import { useTickets } from '../useTickets';
import { useUsers } from '../useUsers';
import { useUserMessages } from '../useUserMessages';
import { buildSpecial4DLottery } from '../../config/special4d';
import {
  buildSpecial4DFinancialSummary as calculateSpecial4DFinancialSummary,
  getSpecial4DTicketPrizes as calculateSpecial4DTicketPrizes,
} from '../../services/calculations/special4d';
import { updateAppAlertPinned } from '../../services/repositories/appAlertsRepo';
import { handleFirestoreError, OperationType } from '../../utils/firestoreError';
import { getOperationalTimeSortValue } from '../../utils/tickets';

export function useAppDataDepartment({
  activeTab,
  archiveDate,
  businessDayKey,
  canAccessAllUsers,
  confirmModalShow,
  handleOperationalHookError,
  handleUsersHookError,
  needsRealtimeOperationalData,
  operationalSellerId,
  shouldListenGlobalSettings,
  shouldListenInjections,
  shouldListenResults,
  shouldListenSettlements,
  shouldLoadLotteries,
  shouldLoadUsersList,
  user,
  userProfile,
}: any) {
  const [selectedLottery, setSelectedLottery] = useState('');
  const [globalChancePriceFilter, setGlobalChancePriceFilter] = useState<string>('');
  const notifiedMessageAlertIdsRef = useRef<Set<string>>(new Set());
  const hasLoadedMessageAlertsRef = useRef(false);
  const { users, setUsers } = useUsers({
    role: userProfile?.role,
    enabled: shouldLoadUsersList,
    onError: handleUsersHookError
  });

  useEffect(() => {
    notifiedMessageAlertIdsRef.current = new Set();
    hasLoadedMessageAlertsRef.current = false;
  }, [userProfile?.email]);
  const ticketsRealtimeEnabled = !!user?.uid && !!userProfile?.role && needsRealtimeOperationalData;
  const injectionsRealtimeEnabled = !!user?.uid && !!userProfile?.role && shouldListenInjections;
  const settlementsRealtimeEnabled = !!user?.uid && !!userProfile?.role && shouldListenSettlements;

  const { tickets, setTickets } = useTickets({
    enabled: ticketsRealtimeEnabled,
    canAccessAllUsers,
    businessDayKey,
    sellerId: operationalSellerId,
    onError: handleOperationalHookError,
  });

  const {
    injections,
    setInjections,
    error: injectionsError,
  } = useInjections({
    enabled: injectionsRealtimeEnabled,
    canAccessAllUsers,
    businessDayKey,
    sellerId: operationalSellerId,
    onError: handleOperationalHookError,
  });

  const {
    settlements,
    setSettlements,
    error: settlementsError,
  } = useSettlements({
    enabled: settlementsRealtimeEnabled,
    canAccessAllUsers,
    sellerId: operationalSellerId,
    onError: handleOperationalHookError,
  });

  const { lotteries, loading: lotteriesLoading } = useLotteries({
    enabled: !!user?.uid && !!userProfile?.role && shouldLoadLotteries,
    onlyActive: activeTab === 'sales',
    setSelectedLottery,
    onError: handleOperationalHookError
  });

  const {
    results,
    setResults,
    getResultKey,
    error: resultsError,
    refresh: refreshResults,
  } = useResults({
    enabled: !!user?.uid && !!userProfile?.role && shouldListenResults,
    businessDayKey,
    onError: handleOperationalHookError
  });

  const auditLogsDateScope = activeTab === 'archivo' ? archiveDate : businessDayKey;
  const canReadAuditLogs = userProfile?.role === 'ceo';
  const auditLogsEnabled = !!user?.uid && !!userProfile?.role && canReadAuditLogs && (activeTab === 'dashboard' || activeTab === 'archivo');
  const {
    logs: dailyAuditLogs,
    loading: auditLogsLoading,
    error: auditLogsError,
    refresh: refreshAuditLogs,
  } = useDailyAuditLogs({
    enabled: auditLogsEnabled,
    date: auditLogsDateScope,
    limitCount: activeTab === 'archivo' ? 200 : 40,
    onError: handleOperationalHookError,
  });

  const {
    alerts: appAlerts,
    loading: appAlertsLoading,
    error: appAlertsError,
    refresh: refreshAppAlerts,
  } = useAppAlerts({
    enabled: !!user?.uid && !!userProfile?.role,
    userEmail: userProfile?.email,
    userRole: userProfile?.role,
    onError: handleOperationalHookError,
  });

  const {
    mainScrollRef,
    handleMainTouchStart,
    handleMainTouchMove,
    handleMainTouchEnd,
  } = usePunctualRefresh({
    enabled: auditLogsEnabled,
    confirmModalShow,
    refreshAuditLogs,
  });

  useEffect(() => {
    if (resultsError) toast.error(`Resultados: ${resultsError}`);
  }, [resultsError]);

  useEffect(() => {
    if (injectionsError) toast.error(`Inyecciones: ${injectionsError}`);
  }, [injectionsError]);

  useEffect(() => {
    if (appAlertsError) toast.error(`Alertas: ${appAlertsError}`);
  }, [appAlertsError]);

  useEffect(() => {
    if (appAlertsLoading) return;

    const normalizedCurrentEmail = String(userProfile?.email || '').toLowerCase();
    const messageAlerts = (appAlerts || []).filter((alert: any) => String(alert?.type || '') === 'message');
    const nextIds = new Set<string>();

    messageAlerts.forEach((alert: any) => {
      const id = String(alert?.id || alert?.actionRef || `${alert?.title || ''}-${alert?.createdAt?.seconds || ''}`);
      if (!id) return;
      nextIds.add(id);

      if (!hasLoadedMessageAlertsRef.current) return;
      if (notifiedMessageAlertIdsRef.current.has(id)) return;
      if (String(alert?.createdByEmail || '').toLowerCase() === normalizedCurrentEmail) return;

      toast.info(alert?.title || 'Mensaje interno', {
        description: alert?.message || '',
        duration: 6500,
      });
    });

    notifiedMessageAlertIdsRef.current = new Set([...notifiedMessageAlertIdsRef.current, ...nextIds]);
    hasLoadedMessageAlertsRef.current = true;
  }, [appAlerts, appAlertsLoading, userProfile?.email]);

  useEffect(() => {
    if (settlementsError) toast.error(`Liquidaciones: ${settlementsError}`);
  }, [settlementsError]);

  useEffect(() => {
    if (auditLogsError) toast.error(`Auditoria: ${auditLogsError}`);
  }, [auditLogsError]);

  const handleUserMessageError = useCallback((error: unknown, target: string) => {
    handleFirestoreError(error, OperationType.CREATE, target);
  }, []);

  const { sendUserMessage } = useUserMessages({
    userProfile,
    businessDayKey,
    refreshAppAlerts,
    onError: handleUserMessageError,
  });

  const handleUnpinAppAlert = useCallback(async (alertId: string) => {
    if (!alertId) return;
    try {
      await updateAppAlertPinned({ alertId, pinned: false });
      refreshAppAlerts();
      toast.success('Mensaje desfijado');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'app_alerts');
    }
  }, [refreshAppAlerts]);

  const handleGlobalSettingsError = useCallback((error: unknown, operation: 'get' | 'write', target: string) => {
    handleFirestoreError(error, operation === 'write' ? OperationType.WRITE : OperationType.GET, target);
  }, []);

  const { globalSettings, setGlobalSettings } = useGlobalSettings({
    enabled: !!user?.uid && !!userProfile?.role && shouldListenGlobalSettings,
    userRole: userProfile?.role,
    onError: handleGlobalSettingsError,
  });

  const special4DDataEnabled = false;

  const { special4DTickets, setSpecial4DTickets } = useSpecial4DTickets({
    enabled: special4DDataEnabled,
    canAccessAllUsers,
    businessDayKey,
    sellerId: operationalSellerId,
    onError: handleOperationalHookError,
  });

  const { special4DSettlements, setSpecial4DSettlements } = useSpecial4DSettlements({
    enabled: special4DDataEnabled,
    canAccessAllUsers,
    businessDayKey,
    sellerId: operationalSellerId,
    onError: handleOperationalHookError,
  });

  const sortedLotteries = useMemo(() => [...lotteries].sort((a, b) => {
    return getOperationalTimeSortValue(a.drawTime || '00:00') - getOperationalTimeSortValue(b.drawTime || '00:00');
  }), [lotteries]);

  const resultLotteries = useMemo(() => {
    const base = [...sortedLotteries];
    base.push(buildSpecial4DLottery(globalSettings.special4d));
    return base.sort((a, b) => (
      getOperationalTimeSortValue(a.drawTime || '00:00') - getOperationalTimeSortValue(b.drawTime || '00:00')
    ));
  }, [globalSettings.special4d, sortedLotteries]);

  const {
    getTicketDateKey,
    getTicketPrizesFromSource,
    getTicketPrizes,
    buildFinancialSummary,
    ticketMatchesGlobalChancePrice,
  } = useTicketFinancials({
    businessDayKey,
    globalSettings,
    results,
    canAccessAllUsers,
    globalChancePriceFilter,
  });

  const getSpecial4DTicketPrizes = useCallback((ticket: any, resultsSource = results) => {
    return calculateSpecial4DTicketPrizes({
      ticket,
      resultsSource,
      settings: globalSettings.special4d,
    });
  }, [globalSettings.special4d, results]);

  const buildSpecial4DFinancialSummary = useCallback((params: {
    tickets?: any[];
    settlements?: any[];
    resultsSource?: any[];
    userEmail?: string;
    targetDate?: string;
  }) => calculateSpecial4DFinancialSummary({
    tickets: params.tickets || special4DTickets,
    settlements: params.settlements || special4DSettlements,
    resultsSource: params.resultsSource || results,
    settings: globalSettings.special4d,
    userEmail: params.userEmail,
    targetDate: params.targetDate,
  }), [globalSettings.special4d, results, special4DSettlements, special4DTickets]);

  return {
    appAlerts,
    appAlertsLoading,
    auditLogsLoading,
    buildFinancialSummary,
    dailyAuditLogs,
    getResultKey,
    getTicketDateKey,
    getTicketPrizes,
    getTicketPrizesFromSource,
    globalChancePriceFilter,
    globalSettings,
    handleUnpinAppAlert,
    handleMainTouchEnd,
    handleMainTouchMove,
    handleMainTouchStart,
    injections,
    lotteries,
    lotteriesLoading,
    mainScrollRef,
    refreshAuditLogs,
    refreshResults,
    results,
    resultLotteries,
    selectedLottery,
    sendUserMessage,
    setGlobalChancePriceFilter,
    setGlobalSettings,
    setInjections,
    setResults,
    setSelectedLottery,
    setSettlements,
    setSpecial4DSettlements,
    setSpecial4DTickets,
    setTickets,
    setUsers,
    settlements,
    special4DSettlements,
    special4DTickets,
    sortedLotteries,
    buildSpecial4DFinancialSummary,
    getSpecial4DTicketPrizes,
    ticketMatchesGlobalChancePrice,
    tickets,
    users,
  };
}
