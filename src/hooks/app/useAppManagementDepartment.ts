import { useCallback } from 'react';

import { useGeneralConfigDomain } from '../../domains/admin-config/hooks/useGeneralConfigDomain';
import { useResultsDomain } from '../../domains/results/hooks/useResultsDomain';
import { useUsersDomain } from '../../domains/users/hooks/useUsersDomain';
import { useAccountSettings } from '../useAccountSettings';
import { useInjectionActions } from '../useInjectionActions';
import { handleFirestoreError, OperationType } from '../../utils/firestoreError';
import { cleanText, normalizeLotteryName } from '../../utils/text';
import { getOperationalTimeSortValue } from '../../utils/tickets';

export function useAppManagementDepartment({
  businessDayKey,
  canUpdatePersonalChancePrice,
  editingLottery,
  editingUser,
  getResultKey,
  getSpecial4DTicketPrizes,
  getTicketDateKey,
  getTicketPrizesFromSource,
  globalSettings,
  isPrimaryCeoUser,
  lotteries,
  operationalSellerId,
  refreshResults,
  resultLotteries,
  results,
  setChancePrice,
  setConfirmModal,
  setEditingLottery,
  setEditingUser,
  setInjections,
  setShowLotteryModal,
  setShowUserModal,
  setUserProfile,
  setUsers,
  sortedLotteries,
  special4DTickets,
  tickets,
  user,
  userProfile,
  users,
}: any) {
  const { selectedManageUserEmail, setSelectedManageUserEmail, saveUser, deleteUser, isSavingUser } = useUsersDomain({
    users,
    userRole: userProfile?.role,
    currentUserEmail: userProfile?.email,
    currentUserProfile: userProfile ?? null,
    editingUser,
    setEditingUser,
    setShowUserModal,
    setUsers,
    setUserProfile,
    setConfirmModal,
    onDeleteError: (error, path) => handleFirestoreError(error, OperationType.DELETE, path),
  });

  const handleInjectionActionError = useCallback((error: unknown, operation: 'update' | 'delete', path: string) => {
    handleFirestoreError(error, operation === 'update' ? OperationType.UPDATE : OperationType.DELETE, path);
  }, []);

  const { canMutateInjection, updateInjectionAmount, deleteInjection } = useInjectionActions({
    user,
    userProfile,
    users,
    businessDayKey,
    isPrimaryCeoUser,
    setInjections,
    setConfirmModal,
    onError: handleInjectionActionError,
  });

  const {
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
  } = useAccountSettings({
    userProfile,
    globalSettings,
    canUpdatePersonalChancePrice,
    setUserProfile,
    setChancePrice,
    setConfirmModal,
  });

  const {
    canManageResults,
    isCeoUser,
    editingResult,
    setEditingResult,
    resultFormLotteryId,
    setResultFormLotteryId,
    resultFormFirstPrize,
    setResultFormFirstPrize,
    resultFormSecondPrize,
    setResultFormSecondPrize,
    resultFormThirdPrize,
    setResultFormThirdPrize,
    availableResultLotteries,
    visibleResults,
    resultStatusMap,
    cancelResultEdition,
    handleCreateResultFromForm,
    deleteResult,
    lotteryById,
  } = useResultsDomain({
    userRole: userProfile?.role,
    businessDayKey,
    results,
    sortedLotteries: resultLotteries || sortedLotteries,
    tickets,
    special4DTickets,
    currentUserProfile: userProfile ?? null,
    currentSellerId: operationalSellerId,
    getOperationalTimeSortValue,
    cleanText,
    getResultKey,
    getTicketDateKey,
    getTicketPrizesFromSource,
    getSpecial4DTicketPrizes,
    setConfirmModal,
    onResultsMutated: refreshResults,
    onError: (error, operation, path) => {
      const op = operation === 'create'
        ? OperationType.CREATE
        : operation === 'update'
          ? OperationType.UPDATE
          : OperationType.DELETE;
      handleFirestoreError(error, op, path);
    },
  });

  const { saveLottery, toggleLotteryActive, deleteLottery } = useGeneralConfigDomain({
    userRole: userProfile?.role,
    currentUserProfile: userProfile ?? null,
    lotteries,
    editingLottery,
    setEditingLottery,
    setShowLotteryModal,
    setConfirmModal: updater => setConfirmModal(prev => updater(prev)),
    normalizeLotteryName,
    onError: (error, operation, path) => {
      const op = operation === 'create'
        ? OperationType.CREATE
        : operation === 'update'
          ? OperationType.UPDATE
          : OperationType.DELETE;
      handleFirestoreError(error, op, path);
    },
  });

  return {
    availableResultLotteries,
    canManageResults,
    canMutateInjection,
    confirmPassword,
    deleteInjection,
    deleteLottery,
    deleteResult,
    deleteUser,
    editingResult,
    handleCreateResultFromForm,
    handleUpdateChancePrice,
    handleUpdatePassword,
    isCeoUser,
    isSavingUser,
    isUpdatingChancePrice,
    isUpdatingSpecial4dPreference,
    isUpdatingPassword,
    lotteryById,
    newPassword,
    personalChancePrice,
    resultFormFirstPrize,
    resultFormLotteryId,
    resultFormSecondPrize,
    resultFormThirdPrize,
    resultStatusMap,
    saveLottery,
    saveUser,
    selectedManageUserEmail,
    setConfirmPassword,
    setEditingResult,
    setNewPassword,
    setPersonalChancePrice,
    requestSpecial4dPreferenceChange,
    setResultFormFirstPrize,
    setResultFormLotteryId,
    setResultFormSecondPrize,
    setResultFormThirdPrize,
    setSelectedManageUserEmail,
    toggleLotteryActive,
    updateInjectionAmount,
    visibleResults,
    cancelResultEdition,
  };
}
