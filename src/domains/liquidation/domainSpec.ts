import type { DomainRole } from '../sales/domainSpec';

export const LIQUIDATION_DOMAIN_SPEC = {
  id: 'liquidation',
  primaryAction: 'liquidateDailyBalance',
  secondaryActions: ['updatePaymentAmount', 'viewSellerSummary', 'generateConsolidatedReport'],
  prohibitedActions: ['manageUsers', 'manageLotteries', 'editArchiveData'],
  allowedRoles: ['ceo', 'admin', 'programador'] as const,
  emptyStates: {
    noUserSelected: 'Seleccione un usuario para liquidar.',
    noDataAvailable: 'No hay datos disponibles para liquidar en la fecha seleccionada.',
  },
  expectedErrors: {
    unauthorizedAction: 'No tienes permisos para liquidar usuarios.',
    missingPaymentAmount: 'Ingrese un monto valido antes de liquidar.',
  },
  mobileRules: {
    keepSummaryCardsReadable: true,
    separateConsolidatedControls: true,
  },
} as const;

export const canAccessLiquidationDomain = (role?: string | null, canLiquidate?: boolean) => {
  if (!role) return false;
  if ((LIQUIDATION_DOMAIN_SPEC.allowedRoles as readonly string[]).includes(role)) return true;
  return !!canLiquidate;
};
