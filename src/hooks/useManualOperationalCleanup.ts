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
  runOperationalArchiveAndCleanup: (params: {
    targetBusinessDay: string;
    trigger: 'manual' | 'automatic';
  }) => Promise<{
    deletedCount: number;
    archiveAlreadyExists: boolean;
  }>;
}

export function useManualOperationalCleanup({
  userProfile,
  isPrimaryCeoUser,
  businessDayKey,
  setConfirmModal,
  runOperationalArchiveAndCleanup,
}: UseManualOperationalCleanupParams) {
  const handleDeleteAllSalesData = useCallback(() => {
    if (!userProfile || !isPrimaryCeoUser) {
      toast.error('No tienes permisos para ejecutar limpieza operativa');
      return;
    }

    setConfirmModal({
      show: true,
      title: 'Archivar y Limpiar Día Operativo',
      message: 'Se archivarán los datos del día operativo actual y luego se limpiarán tickets, resultados e inyecciones operativas. ¿Deseas continuar?',
      onConfirm: async () => {
        try {
          const result = await runOperationalArchiveAndCleanup({
            targetBusinessDay: businessDayKey,
            trigger: 'manual',
          });

          if (result.deletedCount > 0 || !result.archiveAlreadyExists) {
            toastSuccess('Archivo diario creado y limpieza operativa completada');
          } else {
            toast.info('El archivo diario ya existía y no había datos pendientes por limpiar');
          }
        } catch (error) {
          console.error('Error archivando datos operativos:', error);
          toast.error('No se pudo crear el archivo diario. No se realizó limpieza.');
        }
      },
    });
  }, [businessDayKey, isPrimaryCeoUser, runOperationalArchiveAndCleanup, setConfirmModal, userProfile]);

  return { handleDeleteAllSalesData };
}
