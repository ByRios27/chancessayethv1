import { useEffect, useMemo, type Dispatch, type SetStateAction } from 'react';

import {
  Archive,
  BarChart3,
  CheckCircle2,
  DollarSign,
  History,
  LayoutDashboard,
  Plus,
  Printer,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react';

import { ADMIN_CONFIG_DOMAIN_SPEC, canAccessAdminConfigDomain } from '../domains/admin-config/domainSpec';
import { ARCHIVE_DOMAIN_SPEC, canAccessArchiveDomain } from '../domains/archive/domainSpec';
import { CIERRES_DOMAIN_SPEC, canAccessCierresDomain } from '../domains/cierres/domainSpec';
import { LIQUIDATION_DOMAIN_SPEC, canAccessLiquidationDomain } from '../domains/liquidation/domainSpec';
import { RESULTS_DOMAIN_SPEC, canAccessResultsDomain } from '../domains/results/domainSpec';
import { SALES_DOMAIN_SPEC, type DomainRole } from '../domains/sales/domainSpec';
import { validateSalesAccess } from '../domains/sales/helpers/validation';
import { USERS_DOMAIN_SPEC, canAccessUsersDomain } from '../domains/users/domainSpec';
import { getVisibleNavItems, type NavItem } from '../config/navigation';
import type { UserProfile } from '../types/users';
import type { AppTabId } from './useAppDataScopes';

interface UseNavigationStateParams {
  activeTab: AppTabId;
  setActiveTab: Dispatch<SetStateAction<AppTabId>>;
  currentUserRole?: string;
  userProfile?: UserProfile | null;
  operationalSellerId: string;
}

export function useNavigationState({
  activeTab,
  setActiveTab,
  currentUserRole,
  userProfile,
  operationalSellerId,
}: UseNavigationStateParams) {
  const canAccessDashboard = currentUserRole === 'ceo' || currentUserRole === 'admin' || currentUserRole === 'seller';
  const canAccessStats = currentUserRole === 'ceo' || currentUserRole === 'admin';
  const canAccessCierres = canAccessCierresDomain(currentUserRole);
  const canAccessResults = canAccessResultsDomain(currentUserRole);
  const canAccessUsers = canAccessUsersDomain(currentUserRole);
  const canAccessArchive = canAccessArchiveDomain(currentUserRole, userProfile?.canLiquidate);
  const canAccessAdminConfig = canAccessAdminConfigDomain(currentUserRole);
  const canAccessLiquidation = canAccessLiquidationDomain(currentUserRole, userProfile?.canLiquidate);

  const navigationItems = useMemo<NavItem[]>(() => [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, role: ['ceo', 'admin', 'seller'] },
    { id: 'sales', label: 'Nueva Venta', icon: Plus },
    { id: 'history', label: 'Resumen de ventas', icon: History },
    { id: 'stats', label: 'Estadisticas', icon: BarChart3, role: ['ceo', 'admin'] },
    { id: 'cierres', label: 'Cierres', icon: Printer, role: [...CIERRES_DOMAIN_SPEC.allowedRoles] as DomainRole[] },
    { id: 'results', label: 'Resultados', icon: CheckCircle2, role: [...RESULTS_DOMAIN_SPEC.allowedRoles] as DomainRole[] },
    { id: 'users', label: 'Usuarios', icon: Users, role: [...USERS_DOMAIN_SPEC.allowedRoles] as DomainRole[] },
    { id: 'archivo', label: 'Archivo', icon: Archive, role: [...ARCHIVE_DOMAIN_SPEC.allowedRoles] as DomainRole[] },
    { id: 'admin', label: 'Config. General', icon: ShieldCheck, role: [...ADMIN_CONFIG_DOMAIN_SPEC.allowedRoles] as DomainRole[] },
    { id: 'liquidaciones', label: 'Liquidaciones', icon: DollarSign, role: [...LIQUIDATION_DOMAIN_SPEC.allowedRoles] as DomainRole[], permission: 'canLiquidate' },
    { id: 'config', label: 'Mi cuenta', icon: Settings, role: [...SALES_DOMAIN_SPEC.allowedRoles] as DomainRole[] },
  ], []);

  const visibleNavigationItems = useMemo(
    () => getVisibleNavItems(navigationItems, userProfile),
    [navigationItems, userProfile]
  );

  const salesAccessError = validateSalesAccess({ userProfile, operationalSellerId });
  const canSell = !salesAccessError;

  useEffect(() => {
    if (!userProfile) return;
    if (visibleNavigationItems.some((item) => item.id === activeTab)) return;
    setActiveTab('sales');
  }, [activeTab, setActiveTab, userProfile, visibleNavigationItems]);

  return {
    canAccessDashboard,
    canAccessStats,
    canAccessCierres,
    canAccessResults,
    canAccessUsers,
    canAccessArchive,
    canAccessAdminConfig,
    canAccessLiquidation,
    visibleNavigationItems,
    salesAccessError,
    canSell,
  };
}
