import { toast } from 'sonner';
import type { Lottery } from '../../../types/lotteries';
import { createLottery, deleteLottery as deleteLotteryById, setLotteryActive, updateLottery } from '../../../services/repositories/lotteriesRepo';
import { ADMIN_CONFIG_DOMAIN_SPEC, canExecuteAdminConfigAction } from '../domainSpec';

interface ConfirmModalState {
  show: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}

interface UseGeneralConfigDomainParams {
  userRole?: string;
  lotteries: Lottery[];
  editingLottery: Lottery | null;
  setEditingLottery: (value: Lottery | null) => void;
  setShowLotteryModal: (value: boolean) => void;
  setConfirmModal: (updater: (prev: ConfirmModalState) => ConfirmModalState) => void;
  normalizeLotteryName: (value: string) => string;
  onError: (error: unknown, operation: 'create' | 'update' | 'delete', path: string) => void;
}

export function useGeneralConfigDomain({
  userRole,
  lotteries,
  editingLottery,
  setEditingLottery,
  setShowLotteryModal,
  setConfirmModal,
  normalizeLotteryName,
  onError,
}: UseGeneralConfigDomainParams) {
  const saveLottery = async (lotteryData: Partial<Lottery>) => {
    const action = editingLottery ? 'editLottery' : 'createLottery';
    if (!canExecuteAdminConfigAction(userRole, action)) {
      toast.error(ADMIN_CONFIG_DOMAIN_SPEC.expectedErrors.unauthorizedAction);
      return;
    }

    try {
      const normalizedName = normalizeLotteryName(lotteryData.name || '');
      if (!normalizedName) {
        toast.error('Ingrese un nombre de sorteo valido');
        return;
      }

      const hasDuplicateName = lotteries.some(lottery => {
        if (editingLottery && lottery.id === editingLottery.id) return false;
        return normalizeLotteryName(lottery.name) === normalizedName;
      });

      if (hasDuplicateName) {
        toast.error(ADMIN_CONFIG_DOMAIN_SPEC.expectedErrors.duplicateLottery);
        return;
      }

      if (editingLottery) {
        await updateLottery(editingLottery.id, lotteryData);
        toast.success('Loteria actualizada');
      } else {
        await createLottery({ ...lotteryData, active: true });
        toast.success('Loteria agregada');
      }

      setShowLotteryModal(false);
      setEditingLottery(null);
    } catch (error) {
      onError(error, editingLottery ? 'update' : 'create', 'lotteries');
    }
  };

  const toggleLotteryActive = async (lottery: Lottery) => {
    if (!canExecuteAdminConfigAction(userRole, 'toggleLotteryActive')) {
      toast.error(ADMIN_CONFIG_DOMAIN_SPEC.expectedErrors.unauthorizedAction);
      return;
    }

    try {
      await setLotteryActive(lottery.id, !lottery.active);
      toast.success(`Loteria ${lottery.active ? 'pausada' : 'activada'}`);
    } catch (error) {
      onError(error, 'update', `lotteries/${lottery.id}`);
    }
  };

  const deleteLottery = async (id: string) => {
    if (!canExecuteAdminConfigAction(userRole, 'deleteLottery')) {
      toast.error(ADMIN_CONFIG_DOMAIN_SPEC.expectedErrors.unauthorizedAction);
      return;
    }

    setConfirmModal(prev => ({
      ...prev,
      show: true,
      title: 'Eliminar Loteria',
      message: 'Esta seguro de eliminar esta loteria? Esta accion no se puede deshacer.',
      onConfirm: async () => {
        try {
          await deleteLotteryById(id);
          toast.success('Loteria eliminada');
        } catch (error) {
          onError(error, 'delete', `lotteries/${id}`);
        }
      },
    }));
  };

  return {
    saveLottery,
    toggleLotteryActive,
    deleteLottery,
  };
}
