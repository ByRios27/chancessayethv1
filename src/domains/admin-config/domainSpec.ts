import type { DomainRole } from '../sales/domainSpec';

export const ADMIN_CONFIG_DOMAIN_SPEC = {
  id: 'admin-config',
  primaryAction: 'manageLotteries',
  secondaryActions: ['createLottery', 'editLottery', 'toggleLotteryActive', 'deleteLottery', 'updateGlobalSettings'],
  prohibitedActions: ['manageUsers', 'sellTickets', 'runLiquidation'],
  allowedRoles: ['ceo', 'admin', 'programador'] as const,
  emptyStates: {
    noLotteries: 'No hay sorteos configurados.',
  },
  expectedErrors: {
    unauthorizedAction: 'No tienes permisos para esta accion de configuracion.',
    duplicateLottery: 'Ya existe un sorteo con ese nombre.',
  },
  mobileRules: {
    useStackedLotteryCards: true,
    keepActionsCompact: true,
  },
} as const;

export const ADMIN_CONFIG_ACTION_PERMISSIONS = {
  createLottery: ['ceo', 'programador'] as const,
  editLottery: ['ceo', 'programador'] as const,
  deleteLottery: ['ceo', 'programador'] as const,
  updateGlobalSettings: ['ceo', 'programador'] as const,
  toggleLotteryActive: ['ceo', 'admin', 'programador'] as const,
  accessDangerZone: ['ceo', 'programador'] as const,
} as const;

type AdminConfigAction = keyof typeof ADMIN_CONFIG_ACTION_PERMISSIONS;

export const canAccessAdminConfigDomain = (role?: string | null) =>
  !!role && (ADMIN_CONFIG_DOMAIN_SPEC.allowedRoles as readonly string[]).includes(role);

export const canExecuteAdminConfigAction = (role: string | null | undefined, action: AdminConfigAction) =>
  !!role && (ADMIN_CONFIG_ACTION_PERMISSIONS[action] as readonly string[]).includes(role);
