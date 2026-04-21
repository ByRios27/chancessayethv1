export interface UserProfile {
  email: string;
  name: string;
  role: 'ceo' | 'admin' | 'seller' | 'programador';
  commissionRate: number;
  status: 'active' | 'inactive';
  canLiquidate?: boolean;
  currentDebt?: number;
  sessionTimeoutMinutes?: number;
  sellerId?: string;
  preferredChancePrice?: number;
}
