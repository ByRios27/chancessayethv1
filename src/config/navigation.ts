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
    if (item.permission === 'canLiquidate') {
      if (item.id === 'liquidaciones' && userProfile?.role === 'seller') return true;
      if (userProfile?.role === 'ceo') return true;
      return !!userProfile?.canLiquidate;
    }
    if (item.id === 'users' && item.role.includes('canLiquidate')) {
      return userProfile?.role === 'ceo';
    }
    return item.role.includes((userProfile?.role || '') as NavRole);
  });
}
