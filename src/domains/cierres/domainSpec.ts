export const CIERRES_DOMAIN_SPEC = {
  id: 'cierres',
  primaryAction: 'generateLotteryCloseReport',
  secondaryActions: ['filterByDate', 'filterByLottery', 'shareReport'],
  prohibitedActions: ['manageUsers', 'manageLotteries', 'editSalesData'],
  allowedRoles: ['ceo', 'admin'] as const,
  emptyStates: {
    noLotterySelected: 'Seleccione un sorteo para generar el cierre.',
    noSalesData: 'No hay ventas para el sorteo y fecha seleccionados.',
  },
  expectedErrors: {
    unauthorizedAction: 'No tienes permisos para generar cierres globales.',
    emptyLotterySelection: 'Seleccione un sorteo para continuar.',
  },
  mobileRules: {
    optimizeReportPreviewForSmallScreens: true,
    keepShareActionAccessible: true,
  },
} as const;

export const canAccessCierresDomain = (role?: string | null) =>
  !!role && (CIERRES_DOMAIN_SPEC.allowedRoles as readonly string[]).includes(role);
