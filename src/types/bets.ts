export interface Bet {
  number: string;
  lottery: string;
  lotteryId?: string;
  lotteryDrawTime?: string;
  amount: number;
  type: 'CH' | 'PL' | 'BL';
  quantity: number;
}

export interface LotteryTicket {
  id: string;
  bets: Bet[];
  totalAmount: number;
  chancePrice?: number;
  timestamp: any;
  sellerId: string;
  sellerCode?: string;
  sellerEmail?: string;
  sellerName: string;
  commissionRate: number;
  status: 'active' | 'cancelled' | 'winner';
  customerName?: string;
  sequenceNumber?: string;
  liquidated?: boolean;
  settlementId?: string;
}
