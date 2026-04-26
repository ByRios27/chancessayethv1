import type { DomainRole } from '../sales/domainSpec';

export const ARCHIVE_DOMAIN_SPEC = {
  id: 'archive',
  primaryAction: 'consultHistoricalData',
  secondaryActions: ['filterByDateAndUser', 'searchTickets', 'viewDailyAuditLogs', 'reviewLiquidations'],
  prohibitedActions: ['editHistoricalTickets', 'manageUsers', 'manageLotteries'],
  allowedRoles: ['ceo', 'admin', 'seller'] as const,
  emptyStates: {
    noFilters: 'Define filtros y consulta para cargar datos del archivo.',
    noHistoricalData: 'No hay datos historicos para los filtros seleccionados.',
  },
  expectedErrors: {
    unauthorizedAction: 'No tienes permisos para consultar archivo global.',
    missingFilters: 'Debe seleccionar al menos una fecha para consultar.',
  },
  mobileRules: {
    keepFiltersOnTop: true,
    collapseDetailedBreakdown: true,
  },
} as const;

export const canAccessArchiveDomain = (role?: string | null, canLiquidate?: boolean) => {
  if (!role) return false;
  if ((ARCHIVE_DOMAIN_SPEC.allowedRoles as readonly string[]).includes(role)) return true;
  return !!canLiquidate;
};
