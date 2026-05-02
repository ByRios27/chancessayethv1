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
  special4dEnabled?: boolean;
  isPrimaryCeo?: boolean;
  createdBy?: string;
  createdByEmail?: string;
  createdByRole?: 'ceo' | 'admin' | 'seller';
  createdBySellerId?: string;
  createdAt?: any;
  updatedBy?: string;
  updatedByEmail?: string;
  updatedByRole?: 'ceo' | 'admin' | 'seller';
  updatedBySellerId?: string;
  updatedAt?: any;
}
