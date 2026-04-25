export interface UserProfile {
  email: string;
  name: string;
  role: 'ceo' | 'admin' | 'seller';
  commissionRate: number;
  status: 'active' | 'inactive';
  canLiquidate?: boolean;
  currentDebt?: number;
  sellerId?: string;
  preferredChancePrice?: number;
}
