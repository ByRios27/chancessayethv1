import { useMemo } from 'react';

export type AppTabId =
  | 'sales'
  | 'history'
  | 'admin'
  | 'dashboard'
  | 'results'
  | 'users'
  | 'liquidaciones'
  | 'config'
  | 'archivo'
  | 'stats'
  | 'cierres'
  | 'recovery';

interface UseAppDataScopesParams {
  activeTab: AppTabId;
  userRole?: string;
  canUseGlobalScope: boolean;
  showGlobalScope: boolean;
  historyDate: string;
  businessDayKey: string;
  archiveDate: string;
}

export function useAppDataScopes({
  activeTab,
  userRole,
  canUseGlobalScope,
  showGlobalScope,
  historyDate,
  businessDayKey,
  archiveDate,
}: UseAppDataScopesParams) {
  return useMemo(() => {
    const hasPrivilegedRole = userRole === 'ceo' || userRole === 'admin';
    const canAccessManagedUsersData =
      canUseGlobalScope && (activeTab === 'users' || activeTab === 'liquidaciones' || activeTab === 'archivo' || activeTab === 'dashboard');
    const canAccessAllUsers =
      canAccessManagedUsersData || (canUseGlobalScope && showGlobalScope && (activeTab === 'stats' || activeTab === 'cierres'));

    const shouldLoadUsersList =
      hasPrivilegedRole &&
      (
        activeTab === 'users' ||
        activeTab === 'liquidaciones' ||
        activeTab === 'archivo' ||
        activeTab === 'dashboard' ||
        ((activeTab === 'stats' || activeTab === 'cierres') && showGlobalScope)
      );

    const needsRealtimeOperationalData =
      activeTab === 'sales' ||
      activeTab === 'dashboard' ||
      activeTab === 'liquidaciones' ||
      ((activeTab === 'history' || activeTab === 'stats' || activeTab === 'cierres') && historyDate === businessDayKey) ||
      (activeTab === 'archivo' && archiveDate === businessDayKey);

    const shouldListenGlobalSettings = [
      'sales',
      'config',
      'admin',
      'dashboard',
      'history',
      'stats',
      'cierres',
      'liquidaciones',
      'archivo',
    ].includes(activeTab);

    const shouldLoadLotteries = [
      'sales',
      'history',
      'admin',
      'dashboard',
      'results',
      'liquidaciones',
      'archivo',
      'stats',
      'cierres',
      'recovery',
    ].includes(activeTab);

    const shouldListenResults =
      activeTab === 'sales' ||
      activeTab === 'results' ||
      activeTab === 'dashboard' ||
      activeTab === 'liquidaciones' ||
      ((activeTab === 'history' || activeTab === 'stats' || activeTab === 'cierres') && historyDate === businessDayKey);

    const shouldListenInjections =
      activeTab === 'sales' ||
      activeTab === 'users' ||
      activeTab === 'dashboard' ||
      activeTab === 'liquidaciones' ||
      ((activeTab === 'history' || activeTab === 'stats') && historyDate === businessDayKey) ||
      (activeTab === 'archivo' && archiveDate === businessDayKey);

    const shouldListenSettlements =
      activeTab === 'dashboard' ||
      activeTab === 'liquidaciones' ||
      (activeTab === 'history' && historyDate === businessDayKey) ||
      (activeTab === 'archivo' && archiveDate === businessDayKey);

    return {
      canAccessManagedUsersData,
      canAccessAllUsers,
      shouldLoadUsersList,
      needsRealtimeOperationalData,
      shouldLoadLotteries,
      shouldListenGlobalSettings,
      shouldListenResults,
      shouldListenInjections,
      shouldListenSettlements,
    };
  }, [activeTab, archiveDate, businessDayKey, canUseGlobalScope, historyDate, showGlobalScope, userRole]);
}
