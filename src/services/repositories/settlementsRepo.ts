import { addDoc, collection, db, doc, updateDoc } from '../firebase/client';
import type { Settlement } from '../../types/finance';

export const createSettlement = async (payload: Partial<Settlement> & Record<string, any>) => {
  return addDoc(collection(db, 'settlements'), payload);
};

export const updateSettlement = async (settlementId: string, payload: Partial<Settlement> & Record<string, any>) => {
  return updateDoc(doc(db, 'settlements', settlementId), payload);
};
