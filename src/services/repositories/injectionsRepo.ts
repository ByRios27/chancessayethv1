import { addDoc, collection, db, doc, updateDoc } from '../firebase/client';
import type { Injection } from '../../types/finance';

export const createInjectionTransaction = async (payload: Partial<Injection> & Record<string, any>) => {
  return addDoc(collection(db, 'injections'), payload);
};

export const markInjectionLiquidated = async (injectionId: string, settlementId: string) => {
  return updateDoc(doc(db, 'injections', injectionId), { liquidated: true, settlementId });
};
