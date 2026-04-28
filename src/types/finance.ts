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
  sales?: number;
  prizes?: number;
  commission?: number;
  dailyResult?: number;
  dailyInjectionTotal?: number;
  previousBalance?: number;
  finalBalance?: number;
  operationalProfit?: number;
  liquidationBalance?: number;
  netProfit: number;
  net?: number;
  amountPaid: number;
  amountDirection?: 'received' | 'sent';
  amountReceived?: number;
  amountSent?: number;
  amountEntered?: number;
  debtAdded: number;
  previousDebt: number;
  newTotalDebt: number;
  status?: string;
  closed?: boolean;
  closedAt?: any;
  closedByEmail?: string;
  liquidatedBy: string;
  timestamp: any;
}
