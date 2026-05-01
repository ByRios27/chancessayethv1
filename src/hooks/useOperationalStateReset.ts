import { useCallback, useEffect, type Dispatch, type SetStateAction } from 'react';

import type { LotteryTicket } from '../types/bets';
import type { Injection, Settlement } from '../types/finance';
import type { GlobalSettings } from '../types/lotteries';
import type { LotteryResult } from '../types/results';
import type { UserProfile } from '../types/users';

interface UseOperationalStateResetParams {
  businessDayKey: string;
  globalSettings: GlobalSettings;
  userProfile?: UserProfile | null;
  setChancePrice: Dispatch<SetStateAction<number>>;
  setPersonalChancePrice: Dispatch<SetStateAction<number>>;
  setTickets: Dispatch<SetStateAction<LotteryTicket[]>>;
  setResults: Dispatch<SetStateAction<LotteryResult[]>>;
  setInjections: Dispatch<SetStateAction<Injection[]>>;
  setHistoryTickets: Dispatch<SetStateAction<LotteryTicket[]>>;
  setHistoryInjections: Dispatch<SetStateAction<Injection[]>>;
  setLiquidationTicketsSnapshot: Dispatch<SetStateAction<LotteryTicket[]>>;
  setLiquidationResultsSnapshot: Dispatch<SetStateAction<LotteryResult[]>>;
  setLiquidationInjectionsSnapshot: Dispatch<SetStateAction<Injection[]>>;
  setLiquidationSettlementsSnapshot: Dispatch<SetStateAction<Settlement[]>>;
}

export function useOperationalStateReset({
  businessDayKey,
  globalSettings,
  userProfile,
  setChancePrice,
  setPersonalChancePrice,
  setTickets,
  setResults,
  setInjections,
  setHistoryTickets,
  setHistoryInjections,
  setLiquidationTicketsSnapshot,
  setLiquidationResultsSnapshot,
  setLiquidationInjectionsSnapshot,
  setLiquidationSettlementsSnapshot,
}: UseOperationalStateResetParams) {
  const resolvePreferredChancePrice = useCallback(() => {
    const availablePrices = (globalSettings.chancePrices || [])
      .map(cp => Number(cp.price))
      .filter(price => Number.isFinite(price));
    if (availablePrices.length === 0) return null;

    const preferredPrice = Number(userProfile?.preferredChancePrice);
    const hasPreferredPrice = Number.isFinite(preferredPrice) &&
      availablePrices.some(price => Math.abs(price - preferredPrice) < 0.001);

    return hasPreferredPrice ? preferredPrice : availablePrices[0];
  }, [globalSettings.chancePrices, userProfile?.preferredChancePrice]);

  const syncChancePriceFromPreference = useCallback(() => {
    const nextPrice = resolvePreferredChancePrice();
    if (nextPrice === null) return;

    setChancePrice(currentPrice => (
      Math.abs(currentPrice - nextPrice) >= 0.001 ? nextPrice : currentPrice
    ));
    setPersonalChancePrice(currentPrice => (
      Math.abs(currentPrice - nextPrice) >= 0.001 ? nextPrice : currentPrice
    ));
  }, [resolvePreferredChancePrice, setChancePrice, setPersonalChancePrice]);

  const resetOperationalStateAfterArchive = useCallback(() => {
    setTickets([]);
    setResults([]);
    setInjections([]);
    setHistoryTickets([]);
    setHistoryInjections([]);
    setLiquidationTicketsSnapshot([]);
    setLiquidationResultsSnapshot([]);
    setLiquidationInjectionsSnapshot([]);
    setLiquidationSettlementsSnapshot([]);
    syncChancePriceFromPreference();
  }, [
    setHistoryInjections,
    setHistoryTickets,
    setInjections,
    setLiquidationInjectionsSnapshot,
    setLiquidationResultsSnapshot,
    setLiquidationSettlementsSnapshot,
    setLiquidationTicketsSnapshot,
    setResults,
    setTickets,
    syncChancePriceFromPreference,
  ]);

  useEffect(() => {
    syncChancePriceFromPreference();
  }, [businessDayKey, syncChancePriceFromPreference]);

  return {
    resetOperationalStateAfterArchive,
  };
}
