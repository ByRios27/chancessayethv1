import type { Bet } from './bets';

export interface RecoveryTicketRecord {
  rowId: string;
  source: 'tickets' | 'daily_archives';
  archiveDate?: string;
  id: string;
  sellerId?: string;
  sellerCode?: string;
  sellerName?: string;
  sellerEmail?: string;
  timestamp: any;
  status?: string;
  totalAmount?: number;
  bets: Bet[];
  raw: Record<string, any>;
}
