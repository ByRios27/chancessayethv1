export interface UserProfile {
  email: string;
  name: string;
  role: 'ceo' | 'admin' | 'seller';
  commissionRate: number;
  status: 'active' | 'inactive';
  canLiquidate?: boolean;
  currentDebt?: number;
  requiresInjection?: boolean;
  sellerId?: string;
  preferredChancePrice?: number;
}
