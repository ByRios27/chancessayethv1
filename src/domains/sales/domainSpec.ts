export type DomainRole = 'ceo' | 'admin' | 'seller';

export const SALES_DOMAIN_SPEC = {
  id: 'sales',
  primaryAction: 'createTicket',
  secondaryActions: ['addBetToCart', 'removeBetFromCart', 'shareTicket', 'viewTicketDetail'],
  prohibitedActions: ['manageUsers', 'manageLotteries', 'manageResults', 'runLiquidation', 'viewGlobalReports'],
  allowedRoles: ['ceo', 'admin', 'seller'] as const,
  emptyStates: {
    noActiveLotteries: 'No hay sorteos activos para vender.',
    emptyCart: 'Agrega una jugada para confirmar el ticket.',
  },
  expectedErrors: {
    missingSellerId: 'Perfil sin sellerId operativo. Contacta al administrador.',
    inactiveSeller: 'Tu usuario esta inactivo. Contacta al administrador.',
    invalidBetInput: 'Completa numero y monto antes de agregar al carrito.',
    invalidLotterySelection: 'Selecciona al menos un sorteo activo.',
    emptyCart: 'Agrega al menos una jugada al carrito para generar ticket.',
    saleInProgress: 'Ya hay una venta en proceso. Espera a que termine.',
    closedLottery: 'El sorteo seleccionado ya esta cerrado.',
    lotteryWithResults: 'El sorteo seleccionado ya tiene resultados para hoy.',
    lotteryNotFound: 'El sorteo seleccionado no existe.',
  },
  mobileRules: {
    keepPrimaryCtaVisible: true,
    compactSummaryCards: true,
    avoidHeavyTables: true,
  },
} as const;

export type SalesAction = (typeof SALES_DOMAIN_SPEC.secondaryActions)[number] | typeof SALES_DOMAIN_SPEC.primaryAction;

export const canAccessSalesDomain = (role?: string | null) =>
  !!role && SALES_DOMAIN_SPEC.allowedRoles.includes(role as DomainRole);
