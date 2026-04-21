import { addDoc, collection, db, deleteDoc, doc, updateDoc } from '../firebase/client';
import type { Lottery } from '../../types/lotteries';

export const createLottery = async (payload: Partial<Lottery> & Record<string, any>) => {
  return addDoc(collection(db, 'lotteries'), payload);
};

export const updateLottery = async (lotteryId: string, payload: Partial<Lottery> & Record<string, any>) => {
  return updateDoc(doc(db, 'lotteries', lotteryId), payload);
};

export const deleteLottery = async (lotteryId: string) => {
  return deleteDoc(doc(db, 'lotteries', lotteryId));
};

export const setLotteryActive = async (lotteryId: string, active: boolean) => {
  return updateDoc(doc(db, 'lotteries', lotteryId), { active });
};
