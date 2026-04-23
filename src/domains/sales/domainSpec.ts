export type DomainRole = 'ceo' | 'admin' | 'seller' | 'programador';

export const SALES_DOMAIN_SPEC = {
  id: 'sales',
  primaryAction: 'createTicket',
  secondaryActions: ['addBetToCart', 'removeBetFromCart', 'shareTicket', 'viewTicketDetail'],
  prohibitedActions: ['manageUsers', 'manageLotteries', 'manageResults', 'runLiquidation', 'viewGlobalReports'],
  allowedRoles: ['ceo', 'admin', 'seller', 'programador'] as const,
  emptyStates: {
    noActiveLotteries: 'No hay sorteos activos para vender.',
    emptyCart: 'Agrega una jugada para confirmar el ticket.',
  },
  expectedErrors: {
    missingSellerId: 'Perfil sin sellerId operativo. Contacta al administrador.',
    invalidBetInput: 'Completa numero y monto antes de agregar al carrito.',
    closedLottery: 'El sorteo seleccionado ya esta cerrado.',
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
