import { addDoc, collection, db, deleteDoc, doc, updateDoc } from '../firebase/client';
import type { LotteryTicket } from '../../types/bets';

export const createTicket = async (payload: Omit<LotteryTicket, 'id'> & Record<string, any>) => {
  return addDoc(collection(db, 'tickets'), payload);
};

export const updateTicket = async (ticketId: string, payload: Partial<LotteryTicket> & Record<string, any>) => {
  return updateDoc(doc(db, 'tickets', ticketId), payload);
};

export const deleteTicket = async (ticketId: string) => {
  return deleteDoc(doc(db, 'tickets', ticketId));
};

export const markTicketLiquidated = async (ticketId: string, settlementId: string) => {
  return updateDoc(doc(db, 'tickets', ticketId), {
    liquidated: true,
    settlementId,
    status: 'winner'
  });
};
