import { useCallback, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';

import { toast } from 'sonner';

import { auth, updatePassword } from '../firebase';
import { updatePreferredChancePrice, updateSpecial4DPreference } from '../services/repositories/usersRepo';
import type { GlobalSettings } from '../types/lotteries';
import type { UserProfile } from '../types/users';
import { toastSuccess } from '../utils/toast';

interface UseAccountSettingsParams {
  userProfile?: UserProfile | null;
  globalSettings: GlobalSettings;
  canUpdatePersonalChancePrice: boolean;
  setUserProfile: Dispatch<SetStateAction<UserProfile | null | undefined>>;
  setChancePrice: Dispatch<SetStateAction<number>>;
  setConfirmModal?: (updater: (prev: any) => any) => void;
}

export function useAccountSettings({
  userProfile,
  globalSettings,
  canUpdatePersonalChancePrice,
  setUserProfile,
  setChancePrice,
  setConfirmModal,
}: UseAccountSettingsParams) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [personalChancePrice, setPersonalChancePrice] = useState<number>(0.20);
  const [isUpdatingChancePrice, setIsUpdatingChancePrice] = useState(false);
  const [isUpdatingSpecial4dPreference, setIsUpdatingSpecial4dPreference] = useState(false);

  const handleUpdatePassword = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      toast.error('Por favor, complete todos los campos');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      if (!auth.currentUser) throw new Error('No hay un usuario autenticado');

      await updatePassword(auth.currentUser, newPassword);
      toastSuccess('Contraseña actualizada correctamente');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error updating password:', error);
      if (error.code === 'auth/requires-recent-login') {
        toast.error('Por seguridad, debe cerrar sesión e iniciarla de nuevo para cambiar su contraseña.');
      } else {
        toast.error(`Error: ${error.message || 'No se pudo actualizar la contraseña'}`);
      }
    } finally {
      setIsUpdatingPassword(false);
    }
  }, [confirmPassword, newPassword]);

  const handleUpdateChancePrice = useCallback(async (e: FormEvent) => {
    e.preventDefault();

    if (!userProfile?.email) {
      toast.error('No hay un usuario autenticado');
      return;
    }

    if (!canUpdatePersonalChancePrice) {
      toast.error('Solo puedes cambiar este precio antes de tu primera venta del día o después de ser liquidado');
      return;
    }

    const selectedConfig = globalSettings.chancePrices?.find(cp => Math.abs(cp.price - personalChancePrice) < 0.001);
    if (!selectedConfig) {
      toast.error('Seleccione un precio de chance válido');
      return;
    }

    setIsUpdatingChancePrice(true);
    try {
      await updatePreferredChancePrice(userProfile.email.toLowerCase(), selectedConfig.price);

      const updatedProfile = {
        ...userProfile,
        preferredChancePrice: selectedConfig.price
      };

      setUserProfile(updatedProfile);
      setChancePrice(selectedConfig.price);
      setPersonalChancePrice(selectedConfig.price);
      toastSuccess('Precio de chance actualizado');
    } catch (error: any) {
      console.error('Error updating chance price:', error);
      toast.error(`Error: ${error.message || 'No se pudo actualizar el precio de chance'}`);
    } finally {
      setIsUpdatingChancePrice(false);
    }
  }, [
    canUpdatePersonalChancePrice,
    globalSettings.chancePrices,
    personalChancePrice,
    setChancePrice,
    setUserProfile,
    userProfile,
  ]);

  const updateSpecial4dPreference = useCallback(async (enabled: boolean) => {
    if (!userProfile?.email) {
      toast.error('No hay un usuario autenticado');
      return;
    }

    setIsUpdatingSpecial4dPreference(true);
    try {
      await updateSpecial4DPreference(userProfile.email.toLowerCase(), enabled);
      setUserProfile({
        ...userProfile,
        special4dEnabled: enabled,
      });
      toastSuccess(enabled ? 'Especial Chances 4D activado' : 'Especial Chances 4D desactivado');
    } catch (error: any) {
      console.error('Error updating Special 4D preference:', error);
      toast.error(`Error: ${error.message || 'No se pudo actualizar Especial Chances 4D'}`);
    } finally {
      setIsUpdatingSpecial4dPreference(false);
    }
  }, [setUserProfile, userProfile]);

  const requestSpecial4dPreferenceChange = useCallback(() => {
    if (!userProfile?.email || isUpdatingSpecial4dPreference) return;

    const currentEnabled = userProfile.special4dEnabled !== false;
    const nextEnabled = !currentEnabled;
    const title = nextEnabled ? 'Activar Especial 4D' : 'Desactivar Especial 4D';
    const message = nextEnabled
      ? 'Confirma que deseas mostrar Especial Chances 4D en ventas cuando este activo globalmente.'
      : 'Confirma que deseas ocultar Especial Chances 4D de tu pantalla de ventas.';

    if (!setConfirmModal) {
      if (window.confirm(message)) void updateSpecial4dPreference(nextEnabled);
      return;
    }

    setConfirmModal(() => ({
      show: true,
      title,
      message,
      onConfirm: () => {
        void updateSpecial4dPreference(nextEnabled);
      },
    }));
  }, [
    isUpdatingSpecial4dPreference,
    setConfirmModal,
    updateSpecial4dPreference,
    userProfile?.email,
    userProfile?.special4dEnabled,
  ]);

  return {
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    isUpdatingPassword,
    handleUpdatePassword,
    personalChancePrice,
    setPersonalChancePrice,
    isUpdatingChancePrice,
    handleUpdateChancePrice,
    isUpdatingSpecial4dPreference,
    requestSpecial4dPreferenceChange,
  };
}
