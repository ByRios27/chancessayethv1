import { useEffect, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';

import { toast } from 'sonner';

import type { LotteryTicket } from '../types/bets';
import type { Injection, Settlement } from '../types/finance';
import type { LotteryResult } from '../types/results';
import type { UserProfile } from '../types/users';

interface UseBusinessDayTransitionResetParams {
  enabled: boolean;
  businessDayKey: string;
  historyDate: string;
  archiveDate: string;
  liquidationDate: string;
  userEmail?: string | null;
  userProfile?: UserProfile | null;
  setHistoryDate: Dispatch<SetStateAction<string>>;
  setArchiveDate: Dispatch<SetStateAction<string>>;
  setLiquidationDate: Dispatch<SetStateAction<string>>;
  setArchiveUserEmail: Dispatch<SetStateAction<string>>;
  setSelectedUserToLiquidate: Dispatch<SetStateAction<string>>;
  setTickets: Dispatch<SetStateAction<LotteryTicket[]>>;
  setHistoryTickets: Dispatch<SetStateAction<LotteryTicket[]>>;
  setArchiveTickets: Dispatch<SetStateAction<LotteryTicket[]>>;
  setArchiveInjections: Dispatch<SetStateAction<Injection[]>>;
  setInjections: Dispatch<SetStateAction<Injection[]>>;
  setSettlements: Dispatch<SetStateAction<Settlement[]>>;
  setHistoryInjections: Dispatch<SetStateAction<Injection[]>>;
  setHistorySettlements: Dispatch<SetStateAction<Settlement[]>>;
  setLiquidationTicketsSnapshot: Dispatch<SetStateAction<LotteryTicket[]>>;
  setLiquidationInjectionsSnapshot: Dispatch<SetStateAction<Injection[]>>;
  setLiquidationResultsSnapshot: Dispatch<SetStateAction<LotteryResult[]>>;
  historyDataCacheRef: MutableRefObject<Map<string, unknown>>;
  closedLotteryCardsCacheRef: MutableRefObject<Map<string, unknown>>;
}

export function useBusinessDayTransitionReset({
  enabled,
  businessDayKey,
  historyDate,
  archiveDate,
  liquidationDate,
  userEmail,
  userProfile,
  setHistoryDate,
  setArchiveDate,
  setLiquidationDate,
  setArchiveUserEmail,
  setSelectedUserToLiquidate,
  setTickets,
  setHistoryTickets,
  setArchiveTickets,
  setArchiveInjections,
  setInjections,
  setSettlements,
  setHistoryInjections,
  setHistorySettlements,
  setLiquidationTicketsSnapshot,
  setLiquidationInjectionsSnapshot,
  setLiquidationResultsSnapshot,
  historyDataCacheRef,
  closedLotteryCardsCacheRef,
}: UseBusinessDayTransitionResetParams) {
  const previousBusinessDayRef = useRef(businessDayKey);

  useEffect(() => {
    if (!enabled) {
      previousBusinessDayRef.current = businessDayKey;
      return;
    }
    if (previousBusinessDayRef.current === businessDayKey) return;

    const previousBusinessDay = previousBusinessDayRef.current;
    previousBusinessDayRef.current = businessDayKey;

    setTickets([]);
    setHistoryTickets([]);
    setArchiveTickets([]);
    setArchiveInjections([]);
    setInjections([]);
    setSettlements([]);
    setHistoryInjections([]);
    setHistorySettlements([]);
    setLiquidationTicketsSnapshot([]);
    setLiquidationInjectionsSnapshot([]);
    setLiquidationResultsSnapshot([]);
    historyDataCacheRef.current.clear();
    closedLotteryCardsCacheRef.current.clear();

    if (historyDate === previousBusinessDay) setHistoryDate(businessDayKey);
    if (archiveDate === previousBusinessDay) setArchiveDate(businessDayKey);
    if (liquidationDate === previousBusinessDay) setLiquidationDate(businessDayKey);

    if (userProfile?.role === 'seller' && userEmail) {
      const normalizedEmail = userEmail.toLowerCase();
      setArchiveUserEmail(normalizedEmail);
      setSelectedUserToLiquidate(normalizedEmail);
    }

    toast.info(`Nuevo día operativo iniciado: ${businessDayKey}`);
  }, [
    archiveDate,
    businessDayKey,
    enabled,
    historyDate,
    liquidationDate,
    userEmail,
    userProfile?.role,
    setArchiveDate,
    setArchiveInjections,
    setArchiveTickets,
    setArchiveUserEmail,
    setHistoryDate,
    setHistoryInjections,
    setHistorySettlements,
    setHistoryTickets,
    setInjections,
    setLiquidationDate,
    setLiquidationInjectionsSnapshot,
    setLiquidationResultsSnapshot,
    setLiquidationTicketsSnapshot,
    setSelectedUserToLiquidate,
    setSettlements,
    setTickets,
    historyDataCacheRef,
    closedLotteryCardsCacheRef,
  ]);
}
