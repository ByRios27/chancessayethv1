import { useCallback, useEffect, useMemo, useState } from 'react';
import { serverTimestamp } from '../../../firebase';
import { createResult, deleteResult as deleteResultById, updateResult } from '../../../services/repositories/resultsRepo';
import { toast } from 'sonner';
import type { Lottery } from '../../../types/lotteries';
import type { LotteryResult } from '../../../types/results';
import type { LotteryTicket } from '../../../types/bets';
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
  currentSellerId?: string;
  getOperationalTimeSortValue: (time: string) => number;
  cleanText: (value: string) => string;
  getResultKey: (result: LotteryResult) => string;
  getTicketDateKey: (ticket: LotteryTicket) => string;
  getTicketPrizesFromSource: (ticket: LotteryTicket, source: LotteryResult[], lotteryName: string) => { totalPrize: number };
  setConfirmModal: (updater: (prev: ConfirmModalState) => ConfirmModalState) => void;
  onError: (error: unknown, operation: 'create' | 'update' | 'delete', path: string) => void;
}

export function useResultsDomain({
  userRole,
  businessDayKey,
  results,
  sortedLotteries,
  tickets,
  currentSellerId,
  getOperationalTimeSortValue,
  cleanText,
  getResultKey,
  getTicketDateKey,
  getTicketPrizesFromSource,
  setConfirmModal,
  onError,
}: UseResultsDomainParams) {
  const [editingResult, setEditingResult] = useState<LotteryResult | null>(null);
  const [resultFormDate, setResultFormDate] = useState(businessDayKey);
  const [resultFormLotteryId, setResultFormLotteryId] = useState('');
  const [resultFormFirstPrize, setResultFormFirstPrize] = useState('');
  const [resultFormSecondPrize, setResultFormSecondPrize] = useState('');
  const [resultFormThirdPrize, setResultFormThirdPrize] = useState('');

  const canManageResults = canExecuteResultsAction(userRole, 'createResult');
  const isCeoUser = userRole === 'ceo' || userRole === 'programador';

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
      if (result.date === resultFormDate && result.lotteryId) {
        used.add(result.lotteryId);
      }
    });
    return used;
  }, [resultFormDate, sortedResults]);

  const availableResultLotteries = useMemo(() => {
    return sortedLotteries.filter(lottery =>
      (lottery.active || lottery.id === editingResult?.lotteryId) &&
      (!takenResultLotteryIdsForDate.has(lottery.id) || lottery.id === editingResult?.lotteryId)
    );
  }, [editingResult?.lotteryId, sortedLotteries, takenResultLotteryIdsForDate]);

  const resultStatusMap = useMemo(() => {
    const map = new Map<string, { sales: number; prizes: number; hasWinners: boolean }>();
    if (!canManageResults || !currentSellerId) return map;

    const ownTickets = tickets.filter(ticket =>
      (ticket.status === 'active' || ticket.status === 'winner') &&
      ticket.sellerId === currentSellerId
    );

    visibleResults.forEach(result => {
      let sales = 0;
      let prizes = 0;

      ownTickets.forEach(ticket => {
        if (getTicketDateKey(ticket) !== result.date) return;
        const matchingBets = (ticket.bets || []).filter(bet => cleanText(bet.lottery) === cleanText(result.lotteryName));
        if (!matchingBets.length) return;
        sales += matchingBets.reduce((sum, bet) => sum + (bet.amount || 0), 0);
        prizes += getTicketPrizesFromSource(ticket, [result], result.lotteryName).totalPrize;
      });

      map.set(getResultKey(result), { sales, prizes, hasWinners: prizes > 0 });
    });

    return map;
  }, [canManageResults, cleanText, currentSellerId, getResultKey, getTicketDateKey, getTicketPrizesFromSource, tickets, visibleResults]);

  const resetResultForm = useCallback(() => {
    setResultFormLotteryId('');
    setResultFormFirstPrize('');
    setResultFormSecondPrize('');
    setResultFormThirdPrize('');
  }, []);

  const cancelResultEdition = useCallback(() => {
    setEditingResult(null);
    setResultFormDate(businessDayKey);
    resetResultForm();
  }, [businessDayKey, resetResultForm]);

  useEffect(() => {
    if (!editingResult) return;
    setResultFormLotteryId(editingResult.lotteryId);
    setResultFormDate(isCeoUser ? editingResult.date : businessDayKey);
    setResultFormFirstPrize(editingResult.firstPrize);
    setResultFormSecondPrize(editingResult.secondPrize);
    setResultFormThirdPrize(editingResult.thirdPrize);
  }, [businessDayKey, editingResult, isCeoUser]);

  useEffect(() => {
    if (!canManageResults) return;
    if (!isCeoUser && resultFormDate !== businessDayKey) {
      setResultFormDate(businessDayKey);
    }
  }, [businessDayKey, canManageResults, isCeoUser, resultFormDate]);

  const saveResult = useCallback(async (resultData: Partial<LotteryResult>) => {
    if (!canManageResults) {
      toast.error(RESULTS_DOMAIN_SPEC.expectedErrors.unauthorizedAction);
      return false;
    }

    if (!isCeoUser && resultData.date !== businessDayKey) {
      toast.error('Solo el CEO puede guardar resultados fuera de la fecha operativa');
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
        toast.success('Resultado actualizado');
      } else {
        await createResult({
          ...resultData,
          timestamp: serverTimestamp(),
        });
        toast.success('Resultado ingresado');
      }

      setEditingResult(null);
      return true;
    } catch (error) {
      onError(error, editingResult ? 'update' : 'create', 'results');
      return false;
    }
  }, [businessDayKey, canManageResults, editingResult, isCeoUser, onError, results]);

  const handleCreateResultFromForm = useCallback(async () => {
    if (!canManageResults) {
      toast.error(RESULTS_DOMAIN_SPEC.expectedErrors.unauthorizedAction);
      return;
    }

    if (!resultFormLotteryId || !resultFormDate || !resultFormFirstPrize || !resultFormSecondPrize || !resultFormThirdPrize) {
      toast.error(RESULTS_DOMAIN_SPEC.expectedErrors.incompleteForm);
      return;
    }

    if (!isCeoUser && resultFormDate !== businessDayKey) {
      toast.error('Solo el CEO puede trabajar resultados fuera de la fecha operativa');
      setResultFormDate(businessDayKey);
      return;
    }

    const selectedLottery = sortedLotteries.find(lottery => lottery.id === resultFormLotteryId);
    if (!selectedLottery) {
      toast.error('Seleccione un sorteo valido');
      return;
    }

    const alreadyExists = results.some(result =>
      result.lotteryId === resultFormLotteryId &&
      result.date === resultFormDate &&
      result.id !== editingResult?.id
    );
    if (alreadyExists) {
      toast.error(RESULTS_DOMAIN_SPEC.expectedErrors.duplicateResult);
      return;
    }

    const saved = await saveResult({
      lotteryId: resultFormLotteryId,
      lotteryName: cleanText(selectedLottery.name),
      date: resultFormDate,
      firstPrize: resultFormFirstPrize,
      secondPrize: resultFormSecondPrize,
      thirdPrize: resultFormThirdPrize,
    });

    if (saved) {
      setResultFormDate(businessDayKey);
      resetResultForm();
      setEditingResult(null);
    }
  }, [businessDayKey, canManageResults, cleanText, editingResult?.id, isCeoUser, resetResultForm, resultFormDate, resultFormFirstPrize, resultFormLotteryId, resultFormSecondPrize, resultFormThirdPrize, results, saveResult, sortedLotteries]);

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
          await deleteResultById(id);
          toast.success('Resultado eliminado');
        } catch (error) {
          onError(error, 'delete', `results/${id}`);
        }
      },
    }));
  };

  return {
    canManageResults,
    isCeoUser,
    editingResult,
    setEditingResult,
    resultFormDate,
    setResultFormDate,
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
