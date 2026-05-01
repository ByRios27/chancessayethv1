import { useCallback } from 'react';

import { toast } from 'sonner';

import { createAppAlert, createCeoAdminAlert } from '../services/repositories/appAlertsRepo';
import type { UserProfile } from '../types/users';
import { toastSuccess } from '../utils/toast';

interface UseUserMessagesParams {
  userProfile?: UserProfile | null;
  refreshAppAlerts: () => void;
  onError: (error: unknown, target: string) => void;
}

export function useUserMessages({ userProfile, refreshAppAlerts, onError }: UseUserMessagesParams) {
  const sendUserMessage = useCallback(async ({
    message,
    targetUserEmail,
    global,
  }: {
    message: string;
    targetUserEmail?: string;
    global?: boolean;
  }) => {
    const normalizedRole = String(userProfile?.role || '').toLowerCase();
    if (normalizedRole !== 'ceo' && normalizedRole !== 'admin') {
      toast.error('No tienes permisos para enviar mensajes');
      return;
    }

    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      toast.error('Mensaje vacio');
      return;
    }

    const normalizedTargetEmail = String(targetUserEmail || '').toLowerCase();
    if (!global && !normalizedTargetEmail) {
      toast.error('Seleccione un usuario destino');
      return;
    }

    try {
      await createAppAlert({
        type: 'message',
        priority: 30,
        title: global ? 'Mensaje global' : 'Mensaje interno',
        message: trimmedMessage,
        createdByEmail: userProfile?.email,
        createdByRole: userProfile?.role,
        targetUserEmail: global ? '' : normalizedTargetEmail,
        global: global === true,
        readBy: [],
        metadata: {
          actorName: userProfile?.name || '',
          actorSellerId: userProfile?.sellerId || '',
          targetEmail: global ? '' : normalizedTargetEmail,
        },
      });
      if (normalizedRole === 'admin') {
        await createCeoAdminAlert({
          type: 'admin_message_sent',
          priority: 30,
          title: global ? 'Mensaje global enviado por admin' : 'Mensaje individual enviado por admin',
          message: `${userProfile?.name || userProfile?.email || 'Admin'} envio mensaje ${global ? 'global' : `a ${normalizedTargetEmail}`}: ${trimmedMessage}`,
          createdByEmail: userProfile?.email,
          createdByRole: userProfile?.role,
          metadata: {
            actorName: userProfile?.name || '',
            actorSellerId: userProfile?.sellerId || '',
            targetEmail: global ? '' : normalizedTargetEmail,
            global: global === true,
          },
          actionRef: global ? 'app_alerts/global-message' : `users/${normalizedTargetEmail}`,
        }).catch((error) => {
          console.error('App alert failed (message audit):', error);
        });
      }
      refreshAppAlerts();
      toastSuccess('Mensaje enviado');
    } catch (error) {
      onError(error, 'app_alerts');
    }
  }, [onError, refreshAppAlerts, userProfile]);

  return { sendUserMessage };
}
