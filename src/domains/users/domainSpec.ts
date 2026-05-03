export const USERS_DOMAIN_SPEC = {
  id: 'users',
  primaryAction: 'manageUserProfiles',
  secondaryActions: ['createUser', 'editUser', 'deleteUser', 'injectCapital'],
  prohibitedActions: ['sellTickets', 'manageLotteries', 'manageResults', 'runLiquidation'],
  allowedRoles: ['ceo', 'admin'] as const,
  emptyStates: {
    noSelection: 'Seleccione un usuario para ver su perfil.',
    noUsers: 'No hay usuarios disponibles para administrar.',
  },
  expectedErrors: {
    unauthorizedAction: 'No tienes permisos para administrar usuarios.',
    invalidUserData: 'Completa los datos del usuario antes de guardar.',
  },
  mobileRules: {
    prioritizeProfileSummary: true,
    collapseStatsGrid: true,
  },
} as const;

export const USERS_ACTION_PERMISSIONS = {
  createUser: ['ceo', 'admin'] as const,
  editUser: ['ceo'] as const,
  deleteUser: ['ceo'] as const,
  injectCapital: ['ceo', 'admin'] as const,
} as const;

type UsersAction = keyof typeof USERS_ACTION_PERMISSIONS;

const normalizeUsersRole = (role?: string | null) => {
  const normalizedRole = String(role || '').toLowerCase();
  return normalizedRole === 'owner' ? 'ceo' : normalizedRole;
};

export const canAccessUsersDomain = (role?: string | null) =>
  !!role && (USERS_DOMAIN_SPEC.allowedRoles as readonly string[]).includes(normalizeUsersRole(role));

export const canExecuteUsersAction = (role: string | null | undefined, action: UsersAction) =>
  !!role && (USERS_ACTION_PERMISSIONS[action] as readonly string[]).includes(normalizeUsersRole(role));
