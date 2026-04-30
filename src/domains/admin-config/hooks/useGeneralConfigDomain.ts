import { toast } from 'sonner';
import type { Lottery } from '../../../types/lotteries';
import type { UserProfile } from '../../../types/users';
import { createCeoAdminAlert } from '../../../services/repositories/appAlertsRepo';
import { createLottery, deleteLottery as deleteLotteryById, renameLotteryReferences, setLotteryActive, updateLottery } from '../../../services/repositories/lotteriesRepo';
import { ADMIN_CONFIG_DOMAIN_SPEC, canExecuteAdminConfigAction } from '../domainSpec';

interface ConfirmModalState {
  show: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}

interface UseGeneralConfigDomainParams {
  userRole?: string;
  currentUserProfile?: UserProfile | null;
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
  currentUserProfile,
  lotteries,
  editingLottery,
  setEditingLottery,
  setShowLotteryModal,
  setConfirmModal,
  normalizeLotteryName,
  onError,
}: UseGeneralConfigDomainParams) {
  const notifyLotteryChange = async ({
    type,
    title,
    message,
    lottery,
    previousActive,
    nextActive,
  }: {
    type: string;
    title: string;
    message: string;
    lottery: Partial<Lottery> & { id?: string };
    previousActive?: boolean;
    nextActive?: boolean;
  }) => {
    const actorRole = String(currentUserProfile?.role || userRole || '').toLowerCase();
    if (actorRole !== 'admin' && actorRole !== 'ceo') return;

    await createCeoAdminAlert({
      type: `${actorRole}_${type}`,
      priority: 60,
      title,
      message,
      createdByEmail: currentUserProfile?.email,
      createdByRole: actorRole,
      metadata: {
        actorName: currentUserProfile?.name || '',
        actorSellerId: currentUserProfile?.sellerId || '',
        actorRole,
        lotteryId: lottery.id || '',
        lotteryName: lottery.name || '',
        previousActive: previousActive ?? null,
        nextActive: nextActive ?? null,
      },
      actionRef: lottery.id ? `lotteries/${lottery.id}` : 'lotteries',
    }).catch((error) => {
      console.error('App alert failed (lottery change):', error);
    });
  };

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
        const previousName = editingLottery.name || '';
        const nextName = String(lotteryData.name || '').trim();
        const shouldRenameReferences = normalizeLotteryName(previousName) !== normalizedName;

        await updateLottery(editingLottery.id, lotteryData);
        let renameSummary: Awaited<ReturnType<typeof renameLotteryReferences>> | null = null;

        if (shouldRenameReferences) {
          renameSummary = await renameLotteryReferences({
            lotteryId: editingLottery.id,
            previousName,
            nextName,
          });
        }

        await notifyLotteryChange({
          type: 'lottery_updated',
          title: 'Sorteo editado',
          message: shouldRenameReferences
            ? `${currentUserProfile?.name || currentUserProfile?.email || 'Usuario'} renombro sorteo ${previousName} a ${nextName}.`
            : `${currentUserProfile?.name || currentUserProfile?.email || 'Usuario'} edito sorteo ${normalizedName}.`,
          lottery: { ...editingLottery, ...lotteryData, id: editingLottery.id },
          previousActive: editingLottery.active,
          nextActive: lotteryData.active ?? editingLottery.active,
        });
        const migratedItems = renameSummary
          ? renameSummary.liveTicketBets + renameSummary.archivedTicketBets + renameSummary.liveResults + renameSummary.archivedResults
          : 0;
        toast.success(shouldRenameReferences
          ? `Loteria actualizada. Referencias migradas: ${migratedItems}`
          : 'Loteria actualizada');
      } else {
        const lotteryRef = await createLottery({ ...lotteryData, active: true });
        await notifyLotteryChange({
          type: 'lottery_created',
          title: 'Sorteo creado',
          message: `${currentUserProfile?.name || currentUserProfile?.email || 'Usuario'} creo sorteo ${normalizedName}.`,
          lottery: { ...lotteryData, id: lotteryRef.id, active: true },
          nextActive: true,
        });
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
      await notifyLotteryChange({
        type: 'lottery_toggled',
        title: lottery.active ? 'Sorteo desactivado' : 'Sorteo activado',
        message: `${currentUserProfile?.name || currentUserProfile?.email || 'Usuario'} ${lottery.active ? 'desactivo' : 'activo'} sorteo ${lottery.name}.`,
        lottery,
        previousActive: lottery.active,
        nextActive: !lottery.active,
      });
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
