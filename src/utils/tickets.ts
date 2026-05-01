import { format } from 'date-fns';

import type { LotteryTicket } from '../types/bets';
import type { Lottery } from '../types/lotteries';
import type { LotteryResult } from '../types/results';
import { cleanText } from './text';

type TicketLike = {
  id?: string;
  customerName?: string;
  clientName?: string;
  sellerName?: string;
  sellerId?: string;
  sellerCode?: string;
  sellerEmail?: string;
};

export function getTicketPrimaryLabel(ticket: TicketLike | null | undefined): string {
  const customerName = (ticket?.customerName || ticket?.clientName || '').trim();
  if (customerName) return customerName;

  const sellerName = (ticket?.sellerName || '').trim();
  if (sellerName) return sellerName;

  const sellerId = (ticket?.sellerId || ticket?.sellerCode || '').trim();
  if (sellerId) return sellerId;

  const sellerEmail = (ticket?.sellerEmail || '').trim();
  if (sellerEmail) return sellerEmail.split('@')[0] || sellerEmail;

  return 'Cliente sin nombre';
}

export function getTicketSecondaryId(ticket: TicketLike | null | undefined): string {
  const id = (ticket?.id || '').trim();
  if (!id) return '';
  return `#${id.slice(0, 8).toUpperCase()}`;
}

export function getBusinessDayRange(day: string) {
  const start = new Date(`${day}T03:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export function getTicketDateKey(ticket: LotteryTicket, fallbackDateKey: string) {
  if (ticket.timestamp?.toDate) return format(ticket.timestamp.toDate(), 'yyyy-MM-dd');
  if (ticket.timestamp?.seconds) return format(new Date(ticket.timestamp.seconds * 1000), 'yyyy-MM-dd');
  const parsed = new Date(ticket.timestamp ?? Date.now());
  return isNaN(parsed.getTime()) ? fallbackDateKey : format(parsed, 'yyyy-MM-dd');
}

export function mergeTicketSnapshots(...snapshots: Array<{ docs: Array<{ id: string; data: () => unknown }> } | null>) {
  const merged = new Map<string, LotteryTicket>();
  snapshots.forEach(snapshot => {
    snapshot?.docs.forEach(ticketDoc => {
      merged.set(ticketDoc.id, { id: ticketDoc.id, ...(ticketDoc.data() as Omit<LotteryTicket, 'id'>) });
    });
  });
  return Array.from(merged.values()).sort((a, b) => {
    const aTime = a.timestamp?.toDate?.()?.getTime?.() ?? 0;
    const bTime = b.timestamp?.toDate?.()?.getTime?.() ?? 0;
    return bTime - aTime;
  });
}

export function getOperationalTimeSortValue(time: string) {
  const [h, m] = time.split(':').map(Number);
  let val = h * 60 + m;
  if (val < 11 * 60) {
    val += 24 * 60;
  }
  return val;
}

export function getDailyTicketSequence(tickets: LotteryTicket[], now = new Date()) {
  const startOfDay = new Date(now);
  if (now.getHours() < 1) {
    startOfDay.setDate(now.getDate() - 1);
  }
  startOfDay.setHours(1, 0, 0, 0);

  const dailyTickets = tickets.filter(ticket => {
    const ticketDate = ticket.timestamp?.toDate ? ticket.timestamp.toDate() : new Date();
    return ticketDate >= startOfDay;
  });

  const nextSeq = dailyTickets.length + 1;
  return nextSeq.toString().padStart(3, '0');
}

export function isTicketClosedForSales(ticket: LotteryTicket, lotteries: Lottery[]) {
  if (!ticket.timestamp) return true;
  const ticketDate = ticket.timestamp?.toDate
    ? ticket.timestamp.toDate()
    : (ticket.timestamp ? new Date(ticket.timestamp) : new Date());
  if (isNaN(ticketDate.getTime())) return true;

  const now = new Date();
  const getLotteryDay = (date: Date) => {
    const d = new Date(date);
    d.setHours(d.getHours() - 1);
    return format(d, 'yyyy-MM-dd');
  };

  if (getLotteryDay(ticketDate) !== getLotteryDay(now)) return true;

  return (ticket.bets || []).some(bet => {
    const lot = bet.lotteryId
      ? lotteries.find(lottery => lottery.id === bet.lotteryId)
      : lotteries.find(lottery => cleanText(lottery.name) === cleanText(bet.lottery));
    if (!lot || !lot.closingTime) return false;

    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    const adjustedHour = currentHour < 1 ? currentHour + 24 : currentHour;
    const currentTimeVal = adjustedHour * 60 + currentMinutes;

    const [closeH, closeM] = lot.closingTime.split(':').map(Number);
    const adjustedCloseH = closeH < 1 ? closeH + 24 : closeH;
    const closeTimeVal = adjustedCloseH * 60 + closeM;

    return currentTimeVal >= closeTimeVal;
  });
}

export function ticketHasResults(ticket: LotteryTicket, results: LotteryResult[]) {
  const ticketDate = ticket.timestamp?.toDate ? format(ticket.timestamp.toDate(), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
  return (ticket.bets || []).some(bet => {
    return results.some(result => (
      result.date === ticketDate &&
      (bet.lotteryId ? result.lotteryId === bet.lotteryId : cleanText(result.lotteryName) === cleanText(bet.lottery))
    ));
  });
}
