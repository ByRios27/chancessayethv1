export const RESULTS_DOMAIN_SPEC = {
  id: 'results',
  primaryAction: 'registerLotteryResults',
  secondaryActions: ['editResult', 'deleteResult', 'viewRecentResults'],
  prohibitedActions: ['manageUsers', 'manageLotteries', 'runLiquidation'],
  allowedRoles: ['ceo', 'admin', 'seller'] as const,
  emptyStates: {
    noResults: 'No hay resultados registrados para la fecha seleccionada.',
    noAvailableLotteries: 'Todos los sorteos ya tienen resultado para esta fecha.',
  },
  expectedErrors: {
    duplicateResult: 'Ese sorteo ya tiene resultado para esa fecha.',
    incompleteForm: 'Complete todos los campos del resultado.',
    unauthorizedAction: 'No tienes permisos para gestionar resultados.',
  },
  mobileRules: {
    compactResultInputs: true,
    keepSaveButtonVisible: true,
  },
} as const;

export const RESULTS_ACTION_PERMISSIONS = {
  createResult: ['ceo', 'admin'] as const,
  editResult: ['ceo', 'admin'] as const,
  deleteResult: ['ceo', 'admin'] as const,
  editHistoricalResult: ['ceo', 'admin'] as const,
} as const;

type ResultsAction = keyof typeof RESULTS_ACTION_PERMISSIONS;

export const canAccessResultsDomain = (role?: string | null) =>
  !!role && (RESULTS_DOMAIN_SPEC.allowedRoles as readonly string[]).includes(role);

export const canExecuteResultsAction = (role: string | null | undefined, action: ResultsAction) =>
  !!role && (RESULTS_ACTION_PERMISSIONS[action] as readonly string[]).includes(role);
