import type { UserProfile } from '../types/users';
import type { AppTabId } from '../hooks/useAppDataScopes';
import type { LucideIcon } from 'lucide-react';

type NavRole = UserProfile['role'] | 'canLiquidate';

export interface NavItem {
  id: AppTabId;
  label: string;
  icon: LucideIcon;
  role?: NavRole[];
  permission?: 'canLiquidate';
}

export function getVisibleNavItems(allItems: NavItem[], userProfile: UserProfile | null | undefined) {
  return allItems.filter((item) => {
    if (!item.role) return true;
    const normalizedRole = String(userProfile?.role || '').toLowerCase();
    const effectiveRole = normalizedRole === 'owner' ? 'ceo' : normalizedRole;
    if (item.permission === 'canLiquidate') {
      if (item.id === 'liquidaciones' && effectiveRole === 'seller') return true;
      if (effectiveRole === 'ceo') return true;
      return !!userProfile?.canLiquidate;
    }
    if (item.id === 'users' && item.role.includes('canLiquidate')) {
      return effectiveRole === 'ceo';
    }
    return item.role.includes(effectiveRole as NavRole);
  });
}
