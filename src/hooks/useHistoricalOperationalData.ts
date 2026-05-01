import { useEffect, type MutableRefObject, type Dispatch, type SetStateAction } from 'react';

import { collection, db, getDocs, limit, query, where } from '../firebase';
import type { LotteryTicket } from '../types/bets';
import type { Injection, Settlement } from '../types/finance';
import type { LotteryResult } from '../types/results';

export interface HistoricalOperationalDataCacheEntry {
  tickets: LotteryTicket[];
  injections: Injection[];
  settlements: Settlement[];
  results: LotteryResult[];
}

interface UseHistoricalOperationalDataParams {
  enabled: boolean;
  businessDayKey: string;
  historyDate: string;
  canAccessAllUsers: boolean;
  operationalSellerId: string;
  tickets: LotteryTicket[];
  injections: Injection[];
  settlements: Settlement[];
  results: LotteryResult[];
  historyDataCacheRef: MutableRefObject<Map<string, HistoricalOperationalDataCacheEntry>>;
  getBusinessDayRange: (day: string) => { start: Date; end: Date };
  mergeTicketSnapshots: (...snapshots: Array<{ docs: Array<{ id: string; data: () => unknown }> } | null>) => LotteryTicket[];
  setHistoryTickets: Dispatch<SetStateAction<LotteryTicket[]>>;
  setHistoryInjections: Dispatch<SetStateAction<Injection[]>>;
  setHistorySettlements: Dispatch<SetStateAction<Settlement[]>>;
  setResults: Dispatch<SetStateAction<LotteryResult[]>>;
  onError: (error: unknown, target: string) => void;
}

function mergeResultsByLotteryDateId(currentResults: LotteryResult[], incomingResults: LotteryResult[]) {
  const map = new Map(currentResults.map(item => [`${item.lotteryName}-${item.date}-${item.id}`, item]));
  let changed = false;
  incomingResults.forEach(item => {
    const key = `${item.lotteryName}-${item.date}-${item.id}`;
    if (map.get(key) === item) return;
    map.set(key, item);
    changed = true;
  });
  return changed ? Array.from(map.values()) : currentResults;
}

export function useHistoricalOperationalData({
  enabled,
  businessDayKey,
  historyDate,
  canAccessAllUsers,
  operationalSellerId,
  tickets,
  injections,
  settlements,
  results,
  historyDataCacheRef,
  getBusinessDayRange,
  mergeTicketSnapshots,
  setHistoryTickets,
  setHistoryInjections,
  setHistorySettlements,
  setResults,
  onError,
}: UseHistoricalOperationalDataParams) {
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const loadHistoricalData = async () => {
      const { start, end } = getBusinessDayRange(historyDate);
      const scopeKey = canAccessAllUsers ? 'global' : `seller:${operationalSellerId || 'unknown'}`;
      const cacheKey = `${historyDate}|${scopeKey}`;
      const cachedData = historyDataCacheRef.current.get(cacheKey);

      if (cachedData && historyDate !== businessDayKey) {
        if (!cancelled) {
          setHistoryTickets(cachedData.tickets);
          setHistoryInjections(cachedData.injections);
          setHistorySettlements(cachedData.settlements);
          setResults(prev => mergeResultsByLotteryDateId(prev, cachedData.results));
        }
        return;
      }

      try {
        if (!canAccessAllUsers && !operationalSellerId) {
          if (!cancelled) {
            setHistoryTickets([]);
            setHistoryInjections([]);
            setHistorySettlements([]);
          }
          return;
        }

        if (historyDate === businessDayKey) {
          if (!cancelled) {
            setHistoryTickets(tickets);
            setHistoryInjections(injections.filter(i => i.date === historyDate));
            setHistorySettlements(settlements.filter(s => s.date === historyDate));
          }
          return;
        }

        if (canAccessAllUsers) {
          const [ticketSnap, injectionSnap, settlementSnap, resultSnap] = await Promise.all([
            getDocs(query(
              collection(db, 'tickets'),
              where('timestamp', '>=', start),
              where('timestamp', '<', end),
              limit(2500)
            )),
            getDocs(query(
              collection(db, 'injections'),
              where('date', '==', historyDate),
              limit(1500)
            )),
            getDocs(query(
              collection(db, 'settlements'),
              where('date', '==', historyDate),
              limit(1000)
            )),
            getDocs(query(
              collection(db, 'results'),
              where('date', '==', historyDate),
              limit(300)
            ))
          ]);

          if (!cancelled) {
            const loadedTickets = mergeTicketSnapshots(ticketSnap);
            const loadedInjections = injectionSnap.docs.map(d => ({ id: d.id, ...d.data() } as Injection));
            const loadedSettlements = settlementSnap.docs.map(d => ({ id: d.id, ...d.data() } as Settlement));
            const loadedResults = resultSnap.docs.map(d => ({ id: d.id, ...d.data() } as LotteryResult));
            setHistoryTickets(loadedTickets);
            setHistoryInjections(loadedInjections);
            setHistorySettlements(loadedSettlements);
            historyDataCacheRef.current.set(cacheKey, {
              tickets: loadedTickets,
              injections: loadedInjections,
              settlements: loadedSettlements,
              results: loadedResults
            });
            setResults(prev => mergeResultsByLotteryDateId(prev, loadedResults));
          }
          return;
        }

        const historyBySellerIdQ = query(
          collection(db, 'tickets'),
          where('sellerId', '==', operationalSellerId),
          where('timestamp', '>=', start),
          where('timestamp', '<', end),
          limit(600)
        );
        const [historyByIdSnap, injectionSnap, settlementSnap, resultSnap] = await Promise.all([
          getDocs(historyBySellerIdQ),
          operationalSellerId ? getDocs(query(
            collection(db, 'injections'),
            where('sellerId', '==', operationalSellerId),
            where('date', '==', historyDate),
            limit(500)
          )) : Promise.resolve(null),
          operationalSellerId ? getDocs(query(
            collection(db, 'settlements'),
            where('sellerId', '==', operationalSellerId),
            where('date', '==', historyDate),
            limit(300)
          )) : Promise.resolve(null),
          getDocs(query(
            collection(db, 'results'),
            where('date', '==', historyDate),
            limit(300)
          ))
        ]);

        if (!cancelled) {
          const loadedTickets = mergeTicketSnapshots(historyByIdSnap);
          const loadedInjections = injectionSnap ? injectionSnap.docs.map(d => ({ id: d.id, ...d.data() } as Injection)) : [];
          const loadedSettlements = settlementSnap ? settlementSnap.docs.map(d => ({ id: d.id, ...d.data() } as Settlement)) : [];
          const loadedResults = resultSnap.docs.map(d => ({ id: d.id, ...d.data() } as LotteryResult));
          setHistoryTickets(loadedTickets);
          setHistoryInjections(loadedInjections);
          setHistorySettlements(loadedSettlements);
          historyDataCacheRef.current.set(cacheKey, {
            tickets: loadedTickets,
            injections: loadedInjections,
            settlements: loadedSettlements,
            results: loadedResults
          });
          setResults(prev => mergeResultsByLotteryDateId(prev, loadedResults));
        }
      } catch (error) {
        onError(error, 'historical_data');
      }
    };

    void loadHistoricalData();

    return () => {
      cancelled = true;
    };
  }, [
    businessDayKey,
    canAccessAllUsers,
    enabled,
    getBusinessDayRange,
    historyDataCacheRef,
    historyDate,
    injections,
    mergeTicketSnapshots,
    onError,
    operationalSellerId,
    results,
    setHistoryInjections,
    setHistorySettlements,
    setHistoryTickets,
    setResults,
    settlements,
    tickets,
  ]);
}
