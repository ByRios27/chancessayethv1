import { useCallback, type Dispatch, type SetStateAction } from 'react';

import { toast } from 'sonner';

import type { UserProfile } from '../types/users';
import { toastSuccess } from '../utils/toast';

interface UseManualOperationalCleanupParams {
  userProfile?: UserProfile | null;
  isPrimaryCeoUser: boolean;
  businessDayKey: string;
  setConfirmModal: Dispatch<SetStateAction<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>>;
  runOperationalDeleteOnly: (params: {
    targetBusinessDay: string;
  }) => Promise<{
    deletedCount: number;
  }>;
}

export function useManualOperationalCleanup({
  userProfile,
  isPrimaryCeoUser,
  businessDayKey,
  setConfirmModal,
  runOperationalDeleteOnly,
}: UseManualOperationalCleanupParams) {
  const handleDeleteAllSalesData = useCallback(() => {
    if (!userProfile || !isPrimaryCeoUser) {
      toast.error('No tienes permisos para reiniciar el dia operativo');
      return;
    }

    setConfirmModal({
      show: true,
      title: 'Reiniciar Dia Operativo',
      message: 'Se borraran los datos vivos del dia operativo actual sin crear archivo historico. Usuarios, sorteos, configuracion de premios e historial anterior se conservan. Deseas continuar?',
      onConfirm: async () => {
        try {
          const result = await runOperationalDeleteOnly({
            targetBusinessDay: businessDayKey,
          });

          if (result.deletedCount > 0) {
            toastSuccess('Dia operativo reiniciado correctamente');
          } else {
            toast.info('No habia datos vivos del dia para borrar');
          }
        } catch (error) {
          console.error('Error reiniciando dia operativo:', error);
          toast.error('No se pudo reiniciar el dia operativo.');
        }
      },
    });
  }, [businessDayKey, isPrimaryCeoUser, runOperationalDeleteOnly, setConfirmModal, userProfile]);

  return { handleDeleteAllSalesData };
}
