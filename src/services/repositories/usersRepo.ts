import { deleteDoc, db, doc, runTransaction, setDoc, updateDoc } from '../firebase/client';
import type { UserProfile } from '../../types/users';

export const saveUserProfile = async (email: string, payload: Partial<UserProfile> & Record<string, any>) => {
  return setDoc(doc(db, 'users', email.toLowerCase()), payload);
};

export const deleteUserProfile = async (email: string) => {
  return deleteDoc(doc(db, 'users', email));
};

export const updateUserDebt = async (email: string, currentDebt: number) => {
  return updateDoc(doc(db, 'users', email.toLowerCase()), { currentDebt });
};

export const updatePreferredChancePrice = async (email: string, preferredChancePrice: number) => {
  return updateDoc(doc(db, 'users', email.toLowerCase()), { preferredChancePrice });
};

export const reserveNextSellerId = async (role: UserProfile['role']) => {
  return runTransaction(db, async (transaction) => {
    const settingsRef = doc(db, 'settings', 'global');
    const settingsDoc = await transaction.get(settingsRef);
    if (!settingsDoc.exists()) throw new Error('Configuración global no encontrada');

    const nextNum = settingsDoc.data().nextSellerNumber || 2;
    const rolePrefix =
      role === 'ceo'
        ? 'CEO'
        : role === 'admin'
          ? 'ADM'
          : 'VEND';

    const sellerId = `${rolePrefix}${nextNum.toString().padStart(2, '0')}`;
    transaction.update(settingsRef, { nextSellerNumber: nextNum + 1 });
    return sellerId;
  });
};
