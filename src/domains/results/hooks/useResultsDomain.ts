import { useCallback, useEffect, useMemo, useState } from 'react';
import { serverTimestamp } from '../../../firebase';
import { createResult, deleteResult as deleteResultById, updateResult } from '../../../services/repositories/resultsRepo';
import { createCeoAdminAlert } from '../../../services/repositories/appAlertsRepo';
import { logDailyAuditEvent, type DailyAuditEventType } from '../../../services/repositories/auditLogsRepo';
import { toast } from 'sonner';
import type { Lottery } from '../../../types/lotteries';
import type { LotteryResult } from '../../../types/results';
import type { LotteryTicket } from '../../../types/bets';
import type { UserProfile } from '../../../types/users';
import { toastSuccess } from '../../../utils/toast';
import { RESULTS_DOMAIN_SPEC, canExecuteResultsAction } from '../domainSpec';

interface ConfirmModalState {
  show: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}

interface UseResultsDomainParams {
  userRole?: string;
  businessDayKey: string;
  results: LotteryResult[];
  sortedLotteries: Lottery[];
  tickets: LotteryTicket[];
  currentUserProfile?: UserProfile | null;
  currentSellerId?: string;
  getOperationalTimeSortValue: (time: string) => number;
  cleanText: (value: string) => string;
  getResultKey: (result: LotteryResult) => string;
  getTicketDateKey: (ticket: LotteryTicket) => string;
  getTicketPrizesFromSource: (ticket: LotteryTicket, source: LotteryResult[], lotteryName: string) => { totalPrize: number };
  setConfirmModal: (updater: (prev: ConfirmModalState) => ConfirmModalState) => void;
  onError: (error: unknown, operation: 'create' | 'update' | 'delete', path: string) => void;
  onResultsMutated?: () => void;
}

export function useResultsDomain({
  userRole,
  businessDayKey,
  results,
  sortedLotteries,
  tickets,
  currentUserProfile,
  currentSellerId,
  getOperationalTimeSortValue,
  cleanText,
  getResultKey,
  getTicketDateKey,
  getTicketPrizesFromSource,
  setConfirmModal,
  onError,
  onResultsMutated,
}: UseResultsDomainParams) {
  const [editingResult, setEditingResult] = useState<LotteryResult | null>(null);
  const [resultFormLotteryId, setResultFormLotteryId] = useState('');
  const [resultFormFirstPrize, setResultFormFirstPrize] = useState('');
  const [resultFormSecondPrize, setResultFormSecondPrize] = useState('');
  const [resultFormThirdPrize, setResultFormThirdPrize] = useState('');

  const canManageResults = canExecuteResultsAction(userRole, 'createResult');

  const sortedResults = useMemo(() => {
    return [...results].sort((a, b) => {
      const dateComparison = b.date.localeCompare(a.date);
      if (dateComparison !== 0) return dateComparison;
      const aTime = a.timestamp?.seconds || 0;
      const bTime = b.timestamp?.seconds || 0;
      return bTime - aTime;
    });
  }, [results]);

  const operationalResults = useMemo(() => {
    return sortedResults.filter(result => result.date === businessDayKey);
  }, [businessDayKey, sortedResults]);

  const lotteryById = useMemo(() => {
    return new Map(sortedLotteries.map(lottery => [lottery.id, lottery]));
  }, [sortedLotteries]);

  const visibleResults = useMemo(() => {
    const orderedByDrawTime = [...operationalResults].sort((a, b) => {
      const aTime = lotteryById.get(a.lotteryId)?.drawTime || '00:00';
      const bTime = lotteryById.get(b.lotteryId)?.drawTime || '00:00';
      const timeDiff = getOperationalTimeSortValue(aTime) - getOperationalTimeSortValue(bTime);
      if (timeDiff !== 0) return timeDiff;
      return (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0);
    });

    return canManageResults ? orderedByDrawTime.slice(0, 200) : orderedByDrawTime.slice(0, 80);
  }, [canManageResults, getOperationalTimeSortValue, lotteryById, operationalResults]);

  const takenResultLotteryIdsForDate = useMemo(() => {
    const used = new Set<string>();
    sortedResults.forEach(result => {
      if (result.date === businessDayKey && result.lotteryId) {
        used.add(result.lotteryId);
      }
    });
    return used;
  }, [businessDayKey, sortedResults]);

  const availableResultLotteries = useMemo(() => {
    return sortedLotteries.filter(lottery =>
      (lottery.active || lottery.id === editingResult?.lotteryId) &&
      (!takenResultLotteryIdsForDate.has(lottery.id) || lottery.id === editingResult?.lotteryId)
    );
  }, [editingResult?.lotteryId, sortedLotteries, takenResultLotteryIdsForDate]);

  const resultStatusMap = useMemo(() => {
    const map = new Map<string, { sales: number; prizes: number; hasWinners: boolean }>();
    const relevantTickets = tickets.filter(ticket => {
      if (ticket.status !== 'active' && ticket.status !== 'winner') return false;
      if (canManageResults) return true;
      return currentSellerId ? ticket.sellerId === currentSellerId : true;
    });

    visibleResults.forEach(result => {
      let sales = 0;
      let prizes = 0;
      relevantTickets.forEach(ticket => {
        if (getTicketDateKey(ticket) !== result.date) return;
        const matchingBets = (ticket.bets || []).filter(bet => (
          bet.lotteryId ? bet.lotteryId === result.lotteryId : cleanText(bet.lottery) === cleanText(result.lotteryName)
        ));
        if (!matchingBets.length) return;
        sales += matchingBets.reduce((sum, bet) => sum + (bet.amount || 0), 0);
        prizes += getTicketPrizesFromSource(ticket, [result], result.lotteryName).totalPrize;
      });

      map.set(getResultKey(result), { sales, prizes, hasWinners: prizes > 0 });
    });

    return map;
  }, [
    canManageResults,
    cleanText,
    currentSellerId,
    getResultKey,
    getTicketDateKey,
    getTicketPrizesFromSource,
    lotteryById,
    tickets,
    visibleResults,
  ]);

  const resetResultForm = useCallback(() => {
    setResultFormLotteryId('');
    setResultFormFirstPrize('');
    setResultFormSecondPrize('');
    setResultFormThirdPrize('');
  }, []);

  const cancelResultEdition = useCallback(() => {
    setEditingResult(null);
    resetResultForm();
  }, [resetResultForm]);

  useEffect(() => {
    if (!editingResult) return;
    setResultFormLotteryId(editingResult.lotteryId);
    setResultFormFirstPrize(editingResult.firstPrize);
    setResultFormSecondPrize(editingResult.secondPrize);
    setResultFormThirdPrize(editingResult.thirdPrize);
  }, [editingResult]);

  const logAdminResultChange = useCallback(async ({
    eventType,
    actionLabel,
    previousResult,
    nextResult,
    actionRef,
  }: {
    eventType: DailyAuditEventType;
    actionLabel: string;
    previousResult?: Partial<LotteryResult> | null;
    nextResult?: Partial<LotteryResult> | null;
    actionRef?: string;
  }) => {
    const actorRole = String(currentUserProfile?.role || userRole || '').toLowerCase();
    if (actorRole !== 'admin' && actorRole !== 'ceo') return;

    const actorEmail = currentUserProfile?.email || '';
    const lotteryName = String(nextResult?.lotteryName || previousResult?.lotteryName || 'Sorteo');
    const lotteryId = String(nextResult?.lotteryId || previousResult?.lotteryId || '');
    const resultDate = String(nextResult?.date || previousResult?.date || businessDayKey);
    const previousSummary = previousResult
      ? `${previousResult.firstPrize || '--'} / ${previousResult.secondPrize || '--'} / ${previousResult.thirdPrize || '--'}`
      : 'sin resultado previo';
    const nextSummary = nextResult
      ? `${nextResult.firstPrize || '--'} / ${nextResult.secondPrize || '--'} / ${nextResult.thirdPrize || '--'}`
      : 'resultado eliminado';

    const details = {
      lotteryId,
      lotteryName,
      previousResult: previousResult || null,
      nextResult: nextResult || null,
    };

    await Promise.all([
      logDailyAuditEvent({
        type: eventType,
        actor: {
          email: actorEmail,
          sellerId: currentUserProfile?.sellerId,
          name: currentUserProfile?.name,
          role: actorRole,
        },
        target: {
          name: lotteryName,
        },
        details,
        date: resultDate,
      }).catch((error) => {
        console.error('Daily audit log failed (result change):', error);
      }),
      createCeoAdminAlert({
        type: `${actorRole}_${eventType.toLowerCase()}`,
        priority: 60,
        title: `Resultado ${actionLabel}`,
        message: `${currentUserProfile?.name || actorEmail || 'Admin'} ${actionLabel} ${lotteryName}: ${previousSummary} -> ${nextSummary}`,
        createdByEmail: actorEmail,
        createdByRole: actorRole,
        metadata: {
          ...details,
          date: resultDate,
          actorName: currentUserProfile?.name || '',
          actorSellerId: currentUserProfile?.sellerId || '',
          actorRole,
        },
        actionRef,
      }).catch((error) => {
        console.error('App alert failed (result change):', error);
      }),
    ]);
  }, [businessDayKey, currentUserProfile, userRole]);

  const saveResult = useCallback(async (resultData: Partial<LotteryResult>) => {
    if (!canManageResults) {
      toast.error(RESULTS_DOMAIN_SPEC.expectedErrors.unauthorizedAction);
      return false;
    }

    const duplicate = results.some(result =>
      result.lotteryId === resultData.lotteryId &&
      result.date === resultData.date &&
      result.id !== editingResult?.id
    );

    if (duplicate) {
      toast.error(RESULTS_DOMAIN_SPEC.expectedErrors.duplicateResult);
      return false;
    }

    try {
      if (editingResult) {
        await updateResult(editingResult.id, {
          ...resultData,
          timestamp: serverTimestamp(),
        });
        await logAdminResultChange({
          eventType: 'RESULT_UPDATED',
          actionLabel: 'actualizo',
          previousResult: editingResult,
          nextResult: { ...editingResult, ...resultData },
          actionRef: `results/${editingResult.id}`,
        });
        onResultsMutated?.();
        toastSuccess('Resultado actualizado');
      } else {
        const resultRef = await createResult({
          ...resultData,
          timestamp: serverTimestamp(),
        });
        await logAdminResultChange({
          eventType: 'RESULT_CREATED',
          actionLabel: 'creo',
          previousResult: null,
          nextResult: resultData,
          actionRef: `results/${resultRef.id}`,
        });
        onResultsMutated?.();
        toastSuccess('Resultado ingresado');
      }

      setEditingResult(null);
      return true;
    } catch (error) {
      onError(error, editingResult ? 'update' : 'create', 'results');
      return false;
    }
  }, [canManageResults, editingResult, logAdminResultChange, onError, onResultsMutated, results]);

  const handleCreateResultFromForm = useCallback(async () => {
    if (!canManageResults) {
      toast.error(RESULTS_DOMAIN_SPEC.expectedErrors.unauthorizedAction);
      return;
    }

    if (!resultFormLotteryId || !resultFormFirstPrize || !resultFormSecondPrize || !resultFormThirdPrize) {
      toast.error(RESULTS_DOMAIN_SPEC.expectedErrors.incompleteForm);
      return;
    }

    const selectedLottery = sortedLotteries.find(lottery => lottery.id === resultFormLotteryId);
    if (!selectedLottery) {
      toast.error('Seleccione un sorteo valido');
      return;
    }

    const alreadyExists = results.some(result =>
      result.lotteryId === resultFormLotteryId &&
      result.date === businessDayKey &&
      result.id !== editingResult?.id
    );
    if (alreadyExists) {
      toast.error(RESULTS_DOMAIN_SPEC.expectedErrors.duplicateResult);
      return;
    }

    const saved = await saveResult({
      lotteryId: resultFormLotteryId,
      lotteryName: cleanText(selectedLottery.name),
      date: businessDayKey,
      firstPrize: resultFormFirstPrize,
      secondPrize: resultFormSecondPrize,
      thirdPrize: resultFormThirdPrize,
    });

    if (saved) {
      resetResultForm();
      setEditingResult(null);
    }
  }, [businessDayKey, canManageResults, cleanText, editingResult?.id, resetResultForm, resultFormFirstPrize, resultFormLotteryId, resultFormSecondPrize, resultFormThirdPrize, results, saveResult, sortedLotteries]);

  const deleteResult = async (id: string) => {
    if (!canManageResults) {
      toast.error(RESULTS_DOMAIN_SPEC.expectedErrors.unauthorizedAction);
      return;
    }

    setConfirmModal(prev => ({
      ...prev,
      show: true,
      title: 'Eliminar Resultado',
      message: 'Esta seguro de eliminar este resultado? Esta accion no se puede deshacer.',
      onConfirm: async () => {
        try {
          const deletedResult = results.find(result => result.id === id) || null;
          await deleteResultById(id);
          await logAdminResultChange({
            eventType: 'RESULT_DELETED',
            actionLabel: 'elimino',
            previousResult: deletedResult,
            nextResult: null,
            actionRef: `results/${id}`,
          });
          onResultsMutated?.();
          toastSuccess('Resultado eliminado');
        } catch (error) {
          onError(error, 'delete', `results/${id}`);
        }
      },
    }));
  };

  return {
    canManageResults,
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
    saveResult,
    deleteResult,
    lotteryById,
  };
}
