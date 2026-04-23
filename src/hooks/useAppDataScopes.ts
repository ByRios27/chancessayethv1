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
    const hasPrivilegedRole = userRole === 'ceo' || userRole === 'admin' || userRole === 'programador';
    const canAccessManagedUsersData =
      canUseGlobalScope && (activeTab === 'users' || activeTab === 'liquidaciones' || activeTab === 'archivo' || activeTab === 'recovery');
    const canAccessAllUsers =
      canAccessManagedUsersData || (canUseGlobalScope && showGlobalScope && (activeTab === 'stats' || activeTab === 'cierres'));

    const shouldLoadUsersList =
      hasPrivilegedRole &&
      (
        activeTab === 'users' ||
        activeTab === 'liquidaciones' ||
        activeTab === 'archivo' ||
        activeTab === 'recovery' ||
        ((activeTab === 'stats' || activeTab === 'cierres') && showGlobalScope)
      );

    const needsRealtimeOperationalData =
      activeTab === 'sales' ||
      activeTab === 'dashboard' ||
      activeTab === 'liquidaciones' ||
      ((activeTab === 'history' || activeTab === 'stats' || activeTab === 'cierres') && historyDate === businessDayKey) ||
      (activeTab === 'archivo' && archiveDate === businessDayKey);

    const shouldLoadResults = ['sales', 'history', 'stats', 'cierres', 'results', 'dashboard', 'liquidaciones'].includes(activeTab);
    const shouldLoadLotteries = activeTab !== 'recovery';

    return {
      canAccessManagedUsersData,
      canAccessAllUsers,
      shouldLoadUsersList,
      needsRealtimeOperationalData,
      shouldLoadResults,
      shouldLoadLotteries,
    };
  }, [activeTab, archiveDate, businessDayKey, canUseGlobalScope, historyDate, showGlobalScope, userRole]);
}
