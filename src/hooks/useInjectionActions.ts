import { useCallback, type Dispatch, type SetStateAction } from 'react';

import { toast } from 'sonner';

import { db, deleteDoc, doc, serverTimestamp, updateDoc } from '../firebase';
import { logDailyAuditEvent } from '../services/repositories/auditLogsRepo';
import type { Injection } from '../types/finance';
import type { UserProfile } from '../types/users';
import { toastSuccess } from '../utils/toast';

interface UseInjectionActionsParams {
  user?: { uid?: string | null } | null;
  userProfile?: UserProfile | null;
  users: UserProfile[];
  businessDayKey: string;
  isPrimaryCeoUser: boolean;
  setInjections: Dispatch<SetStateAction<Injection[]>>;
  setConfirmModal: Dispatch<SetStateAction<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>>;
  onError: (error: unknown, operation: 'update' | 'delete', path: string) => void;
}

export function useInjectionActions({
  user,
  userProfile,
  users,
  businessDayKey,
  isPrimaryCeoUser,
  setInjections,
  setConfirmModal,
  onError,
}: UseInjectionActionsParams) {
  const canMutateInjection = useCallback((injection: Injection) => {
    if (!userProfile || !user) return false;
    const normalizedRole = String(userProfile.role || '').toLowerCase();
    if (normalizedRole !== 'ceo' && normalizedRole !== 'admin') return false;

    const actorEmail = String(userProfile.email || '').toLowerCase();
    const actorSellerId = String(userProfile.sellerId || '').toLowerCase();
    const actorUid = String(user.uid || '');

    const createdByEmail = String(injection.createdByEmail || injection.actorEmail || '').toLowerCase();
    const createdBySellerId = String(injection.createdBySellerId || injection.actorSellerId || '').toLowerCase();
    const createdByUid = String(injection.createdBy || injection.addedBy || '');
    const hasAuthor = !!createdByEmail || !!createdBySellerId || !!createdByUid;

    if (!hasAuthor) {
      return !!isPrimaryCeoUser;
    }

    return (
      (createdByEmail && createdByEmail === actorEmail) ||
      (createdBySellerId && createdBySellerId === actorSellerId) ||
      (createdByUid && createdByUid === actorUid)
    );
  }, [isPrimaryCeoUser, user, userProfile]);

  const updateInjectionAmount = useCallback(async (injection: Injection, nextAmount: number) => {
    if (!canMutateInjection(injection)) {
      toast.error('No tienes permiso para editar esta inyeccion');
      return;
    }
    const normalizedAmount = Number(nextAmount);
    if (!Number.isFinite(normalizedAmount) || normalizedAmount < 0) {
      toast.error('Monto invalido para inyeccion');
      return;
    }

    try {
      await updateDoc(doc(db, 'injections', injection.id), {
        amount: normalizedAmount,
        updatedAt: serverTimestamp(),
        updatedByEmail: String(userProfile?.email || '').toLowerCase(),
      });
      setInjections((prev) => prev.map((item) => (
        item.id === injection.id
          ? { ...item, amount: normalizedAmount, updatedByEmail: String(userProfile?.email || '').toLowerCase(), updatedAt: new Date() }
          : item
      )));

      if (userProfile?.role === 'admin' || userProfile?.role === 'ceo') {
        await logDailyAuditEvent({
          type: 'INJECTION_UPDATED',
          actor: {
            email: userProfile?.email,
            sellerId: userProfile?.sellerId,
            name: userProfile?.name,
            role: userProfile?.role,
          },
          target: {
            email: injection.userEmail,
            sellerId: injection.sellerId,
            name: users.find((u) => String(u.email || '').toLowerCase() === String(injection.userEmail || '').toLowerCase())?.name || '',
          },
          details: {
            injectionId: injection.id,
            previousAmount: Number(injection.amount || 0),
            nextAmount: normalizedAmount,
          },
          date: injection.date || businessDayKey,
        }).catch((error) => {
          console.error('Daily audit log failed (injection update):', error);
        });
      }

      toastSuccess('Inyeccion actualizada');
    } catch (error) {
      onError(error, 'update', `injections/${injection.id}`);
    }
  }, [businessDayKey, canMutateInjection, onError, setInjections, userProfile, users]);

  const deleteInjection = useCallback((injection: Injection) => {
    if (!canMutateInjection(injection)) {
      toast.error('No tienes permiso para borrar esta inyeccion');
      return;
    }

    setConfirmModal({
      show: true,
      title: 'Eliminar Inyeccion',
      message: 'Esta accion eliminara la inyeccion seleccionada. Desea continuar?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'injections', injection.id));
          setInjections((prev) => prev.filter((item) => item.id !== injection.id));

          if (userProfile?.role === 'admin' || userProfile?.role === 'ceo') {
            await logDailyAuditEvent({
              type: 'INJECTION_DELETED',
              actor: {
                email: userProfile?.email,
                sellerId: userProfile?.sellerId,
                name: userProfile?.name,
                role: userProfile?.role,
              },
              target: {
                email: injection.userEmail,
                sellerId: injection.sellerId,
                name: users.find((u) => String(u.email || '').toLowerCase() === String(injection.userEmail || '').toLowerCase())?.name || '',
              },
              details: {
                injectionId: injection.id,
                removedAmount: Number(injection.amount || 0),
              },
              date: injection.date || businessDayKey,
            }).catch((error) => {
              console.error('Daily audit log failed (injection delete):', error);
            });
          }

          toastSuccess('Inyeccion eliminada');
        } catch (error) {
          onError(error, 'delete', `injections/${injection.id}`);
        }
      },
    });
  }, [businessDayKey, canMutateInjection, onError, setConfirmModal, setInjections, userProfile, users]);

  return {
    canMutateInjection,
    updateInjectionAmount,
    deleteInjection,
  };
}
