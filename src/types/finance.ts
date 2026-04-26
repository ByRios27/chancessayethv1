export interface Injection {
  id: string;
  sellerId?: string;
  userEmail: string;
  amount: number;
  type?: 'injection' | 'payment' | 'debt';
  date: string;
  timestamp: any;
  addedBy: string;
  createdBy?: string;
  createdByEmail?: string;
  createdBySellerId?: string;
  createdByName?: string;
  actorEmail?: string;
  actorSellerId?: string;
  actorName?: string;
  createdAt?: any;
  updatedAt?: any;
  updatedByEmail?: string;
  liquidated?: boolean;
  settlementId?: string;
}

export interface Settlement {
  id: string;
  sellerId?: string;
  userEmail: string;
  date: string;
  totalSales: number;
  totalCommissions: number;
  totalPrizes: number;
  totalInjections: number;
  netProfit: number;
  amountPaid: number;
  debtAdded: number;
  previousDebt: number;
  newTotalDebt: number;
  liquidatedBy: string;
  timestamp: any;
}
