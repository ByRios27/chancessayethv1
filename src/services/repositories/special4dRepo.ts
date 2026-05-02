import {
  addDoc,
  collection,
  db,
  doc,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from '../firebase/client';
import type { Special4DSettlement, Special4DTicket } from '../../types/special4d';

export const createSpecial4DTicket = async (payload: Omit<Special4DTicket, 'id'> & Record<string, any>) => {
  return addDoc(collection(db, 'special4_tickets'), payload);
};

export const updateSpecial4DTicket = async (ticketId: string, payload: Partial<Special4DTicket> & Record<string, any>) => {
  return updateDoc(doc(db, 'special4_tickets', ticketId), payload);
};

export const createSpecial4DSettlement = async (payload: Omit<Special4DSettlement, 'id'> & Record<string, any>) => {
  return addDoc(collection(db, 'special4_settlements'), payload);
};

export const markSpecial4DTicketsLiquidated = async (ticketIds: string[], settlementId: string) => {
  for (let i = 0; i < ticketIds.length; i += 450) {
    const batch = writeBatch(db);
    ticketIds.slice(i, i + 450).forEach((ticketId) => {
      batch.update(doc(db, 'special4_tickets', ticketId), {
        liquidated: true,
        settlementId,
        status: 'active',
        liquidatedAt: serverTimestamp(),
      });
    });
    await batch.commit();
  }
};
