import { addDoc, collection, db, deleteDoc, doc, updateDoc } from '../firebase/client';
import type { LotteryResult } from '../../types/results';

export const createResult = async (payload: Partial<LotteryResult> & Record<string, any>) => {
  return addDoc(collection(db, 'results'), payload);
};

export const updateResult = async (resultId: string, payload: Partial<LotteryResult> & Record<string, any>) => {
  return updateDoc(doc(db, 'results', resultId), payload);
};

export const deleteResult = async (resultId: string) => {
  return deleteDoc(doc(db, 'results', resultId));
};
