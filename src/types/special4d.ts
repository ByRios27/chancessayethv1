export interface Special4DTicket {
  id: string;
  number: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  date: string;
  timestamp: any;
  customerName?: string;
  sellerId: string;
  sellerCode?: string;
  sellerEmail?: string;
  sellerName: string;
  commissionRate: number;
  specialLotteryId: string;
  specialLotteryName: string;
  specialLotteryDrawTime?: string;
  sourceLotteryId?: string;
  sourceLotteryName?: string;
  sourceLotteryDrawTime?: string;
  specialName: string;
  drawTime?: string;
  closingTime?: string;
  status: 'active' | 'cancelled';
  liquidated?: boolean;
  settlementId?: string;
}

export interface Special4DWinningMatch {
  prizeRank: 1 | 2 | 3;
  position: 'first2' | 'last2';
  winningNumber: string;
  prize: number;
}

export interface Special4DPrizeResult {
  totalPrize: number;
  winningMatches: Special4DWinningMatch[];
}

export interface Special4DSettlement {
  id: string;
  sellerId?: string;
  userEmail: string;
  userName?: string;
  date: string;
  totalSales: number;
  totalCommissions: number;
  totalPrizes: number;
  netProfit: number;
  amountPaid: number;
  amountDirection: 'received' | 'sent';
  amountReceived: number;
  amountSent: number;
  pendingBefore: number;
  pendingAfter: number;
  ticketIds: string[];
  closed: boolean;
  status: 'liquidated';
  liquidatedBy: string;
  timestamp: any;
}

export interface Special4DFinancialSummary {
  tickets: Special4DTicket[];
  settlements: Special4DSettlement[];
  totalSales: number;
  totalCommissions: number;
  totalPrizes: number;
  netProfit: number;
  amountReceived: number;
  amountSent: number;
  totalLiquidated: number;
  pendingBalance: number;
}
