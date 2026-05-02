import { useCallback, useEffect, type Dispatch, type SetStateAction } from 'react';
import { toast } from 'sonner';
import { collection, db, doc, getDoc, getDocs, limit, query, where } from '../../../firebase';
import type { LotteryTicket } from '../../../types/bets';
import type { Injection, Settlement } from '../../../types/finance';
import type { LotteryResult } from '../../../types/results';

interface ArchiveDomainParams {
  activeTab: string;
  archiveDate: string;
  archiveUserEmail: string;
  businessDayKey: string;
  buildFinancialSummary: (params: {
    tickets: LotteryTicket[];
    injections: Injection[];
    settlements?: Settlement[];
    userEmail?: string;
    targetDate?: string;
  }) => {
    tickets: LotteryTicket[];
    injections: Injection[];
  };
  getBusinessDayRange: (date: string) => { start: Date; end: Date };
  mergeTicketSnapshots: (...snapshots: Array<{ docs: Array<{ id: string; data: () => unknown }> } | null>) => LotteryTicket[];
  operationalSellerId: string;
  injections: Injection[];
  settlements: Settlement[];
  tickets: LotteryTicket[];
  liquidationDate: string;
  selectedUserToLiquidate: string;
  setArchiveInjections: (items: Injection[]) => void;
  setArchiveTickets: (items: LotteryTicket[]) => void;
  setIsArchiveLoading: (loading: boolean) => void;
  setIsLiquidationDataLoading: (loading: boolean) => void;
  setLiquidationInjectionsSnapshot: (items: Injection[]) => void;
  setLiquidationResultsSnapshot: (items: LotteryResult[]) => void;
  setLiquidationSettlementsSnapshot: (items: Settlement[]) => void;
  setLiquidationTicketsSnapshot: (items: LotteryTicket[]) => void;
  setResults: Dispatch<SetStateAction<LotteryResult[]>>;
}

export function useArchiveDomain({
  activeTab,
  archiveDate,
  archiveUserEmail,
  businessDayKey,
  buildFinancialSummary,
  getBusinessDayRange,
  mergeTicketSnapshots,
  operationalSellerId,
  injections,
  settlements,
  tickets,
  liquidationDate,
  selectedUserToLiquidate,
  setArchiveInjections,
  setArchiveTickets,
  setIsArchiveLoading,
  setIsLiquidationDataLoading,
  setLiquidationInjectionsSnapshot,
  setLiquidationResultsSnapshot,
  setLiquidationSettlementsSnapshot,
  setLiquidationTicketsSnapshot,
  setResults,
}: ArchiveDomainParams) {
  const normalizeEmail = useCallback((value?: string | null) => (value || '').toLowerCase().trim(), []);

  const toDateRange = useCallback((date: string) => {
    const { start, end } = getBusinessDayRange(date);
    return { start, end };
  }, [getBusinessDayRange]);

  const getDatesInRange = useCallback((from: string, to: string) => {
    const safeFrom = from || to;
    const safeTo = to || from || safeFrom;
    const start = new Date(`${safeFrom}T00:00:00`);
    const end = new Date(`${safeTo}T00:00:00`);
    const dates: string[] = [];
    const cursor = new Date(start.getTime());
    let iterations = 0;
    while (cursor <= end && iterations < 31) {
      const yyyy = cursor.getFullYear();
      const mm = String(cursor.getMonth() + 1).padStart(2, '0');
      const dd = String(cursor.getDate()).padStart(2, '0');
      dates.push(`${yyyy}-${mm}-${dd}`);
      cursor.setDate(cursor.getDate() + 1);
      iterations += 1;
    }
    return dates;
  }, []);

  const dedupeById = useCallback(<T extends { id?: string }>(items: T[]) => {
    const map = new Map<string, T>();
    items.forEach((item, index) => {
      const key = item?.id || `fallback-${index}`;
      map.set(key, item);
    });
    return Array.from(map.values());
  }, []);

  const fetchLiveSettlementsByDate = useCallback(async (targetDate: string, userEmail?: string | null) => {
    const normalizedEmail = normalizeEmail(userEmail);
    const settlementsQuery = normalizedEmail
      ? query(
          collection(db, 'settlements'),
          where('userEmail', '==', normalizedEmail),
          where('date', '==', targetDate),
          limit(500)
        )
      : query(
          collection(db, 'settlements'),
          where('date', '==', targetDate),
          limit(500)
        );
    const settlementsSnap = await getDocs(settlementsQuery);
    return settlementsSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Settlement));
  }, [normalizeEmail]);

  const fetchScopedDataByDate = useCallback(async (targetDate: string, userEmail?: string | null) => {
    const normalizedEmail = normalizeEmail(userEmail);
    const archiveSnap = await getDoc(doc(db, 'daily_archives', targetDate));

    if (archiveSnap.exists()) {
      const archive = archiveSnap.data() as {
        tickets?: LotteryTicket[];
        injections?: Injection[];
        settlements?: Settlement[];
        results?: LotteryResult[];
      };
      const liveSettlements = await fetchLiveSettlementsByDate(targetDate, userEmail);

      const scopedTickets = (archive.tickets || []).filter(ticket =>
        !normalizedEmail || normalizeEmail(ticket.sellerEmail) === normalizedEmail
      );
      const scopedInjections = (archive.injections || []).filter(injection =>
        !normalizedEmail || normalizeEmail(injection.userEmail) === normalizedEmail
      );
      const scopedSettlements = (archive.settlements || []).filter(settlement =>
        (!normalizedEmail || normalizeEmail(settlement.userEmail) === normalizedEmail) &&
        settlement.date === targetDate
      );

      return {
        tickets: scopedTickets,
        injections: scopedInjections,
        settlements: dedupeById([...scopedSettlements, ...liveSettlements]),
        results: archive.results || [],
      };
    }

    const { start, end } = toDateRange(targetDate);
    const ticketsByEmailQuery = normalizedEmail
      ? query(
          collection(db, 'tickets'),
          where('sellerEmail', '==', normalizedEmail),
          where('timestamp', '>=', start),
          where('timestamp', '<', end),
          limit(1200)
        )
      : query(
          collection(db, 'tickets'),
          where('timestamp', '>=', start),
          where('timestamp', '<', end),
          limit(1200)
        );
    const injectionsQuery = normalizedEmail
      ? query(
          collection(db, 'injections'),
          where('userEmail', '==', normalizedEmail),
          where('date', '==', targetDate),
          limit(500)
        )
      : query(
          collection(db, 'injections'),
          where('date', '==', targetDate),
          limit(500)
        );
    const settlementsQuery = normalizedEmail
      ? query(
          collection(db, 'settlements'),
          where('userEmail', '==', normalizedEmail),
          where('date', '==', targetDate),
          limit(500)
        )
      : query(
          collection(db, 'settlements'),
          where('date', '==', targetDate),
          limit(500)
        );
    const resultsQuery = query(
      collection(db, 'results'),
      where('date', '==', targetDate),
      limit(400)
    );

    const [ticketsSnap, injectionsSnap, settlementsSnap, resultsSnap] = await Promise.all([
      getDocs(ticketsByEmailQuery),
      getDocs(injectionsQuery),
      getDocs(settlementsQuery),
      getDocs(resultsQuery),
    ]);

    return {
      tickets: mergeTicketSnapshots(ticketsSnap),
      injections: injectionsSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Injection)),
      settlements: settlementsSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Settlement)),
      results: resultsSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as LotteryResult)),
    };
  }, [dedupeById, fetchLiveSettlementsByDate, mergeTicketSnapshots, normalizeEmail, toDateRange]);

  const fetchUserOperationalDataByDate = useCallback(async (targetDate: string, userEmail: string) => {
    return fetchScopedDataByDate(targetDate, userEmail);
  }, [fetchScopedDataByDate]);

  const fetchArchiveSalesReport = useCallback(async ({
    dateFrom,
    dateTo,
    userEmail,
  }: {
    dateFrom: string;
    dateTo: string;
    userEmail?: string | null;
  }) => {
    const dates = getDatesInRange(dateFrom, dateTo);
    if (dates.length === 0) {
      return null;
    }

    const ticketsBucket: LotteryTicket[] = [];
    const injectionsBucket: Injection[] = [];
    const settlementsBucket: Settlement[] = [];
    const resultsBucket: LotteryResult[] = [];

    for (const date of dates) {
      const dayData = await fetchScopedDataByDate(date, userEmail);
      ticketsBucket.push(...dayData.tickets);
      injectionsBucket.push(...dayData.injections);
      settlementsBucket.push(...dayData.settlements);
      resultsBucket.push(...dayData.results);
    }

    const uniqueTickets = dedupeById(ticketsBucket);
    const uniqueInjections = dedupeById(injectionsBucket);
    const uniqueSettlements = dedupeById(settlementsBucket);
    const uniqueResults = dedupeById(resultsBucket);

    const summary = buildFinancialSummary({
      tickets: uniqueTickets,
      injections: uniqueInjections,
      settlements: uniqueSettlements,
      userEmail: normalizeEmail(userEmail) || undefined,
      targetDate: dates.length === 1 ? dates[0] : undefined,
    });

    return {
      dates,
      summary,
      tickets: uniqueTickets,
      injections: uniqueInjections,
      settlements: uniqueSettlements,
      results: uniqueResults,
    };
  }, [buildFinancialSummary, dedupeById, fetchScopedDataByDate, getDatesInRange, normalizeEmail]);

  const searchArchiveTickets = useCallback(async ({
    dateFrom,
    dateTo,
    userEmail,
    customerName,
    ticketNumber,
    lotteryName,
  }: {
    dateFrom: string;
    dateTo: string;
    userEmail?: string | null;
    customerName?: string;
    ticketNumber?: string;
    lotteryName?: string;
  }) => {
    const report = await fetchArchiveSalesReport({ dateFrom, dateTo, userEmail });
    if (!report) return [];

    const normalizedCustomer = (customerName || '').toLowerCase().trim();
    const normalizedTicketNumber = (ticketNumber || '').toLowerCase().trim();
    const normalizedLottery = (lotteryName || '').toLowerCase().trim();

    return report.tickets
      .filter((ticket) => {
        const clientName = String((ticket as any).clientName || ticket.customerName || '').toLowerCase();
        const ticketRef = String(ticket.sequenceNumber || ticket.id || '').toLowerCase();
        const hasLottery = !normalizedLottery || ticket.bets?.some((bet) =>
          String(bet.lottery || '').toLowerCase().includes(normalizedLottery)
        );

        return (
          (!normalizedCustomer || clientName.includes(normalizedCustomer)) &&
          (!normalizedTicketNumber || ticketRef.includes(normalizedTicketNumber)) &&
          hasLottery
        );
      })
      .sort((a, b) => {
        const timeA = Number((a.timestamp as any)?.seconds || 0);
        const timeB = Number((b.timestamp as any)?.seconds || 0);
        return timeB - timeA;
      })
      .slice(0, 300);
  }, [fetchArchiveSalesReport]);

  const fetchArchiveLiquidations = useCallback(async ({
    dateFrom,
    dateTo,
    userEmail,
  }: {
    dateFrom: string;
    dateTo: string;
    userEmail?: string | null;
  }) => {
    const dates = getDatesInRange(dateFrom, dateTo);
    const settlementsBucket: Settlement[] = [];

    for (const date of dates) {
      const dayData = await fetchScopedDataByDate(date, userEmail);
      settlementsBucket.push(...dayData.settlements);
    }

    return dedupeById(settlementsBucket).sort((a, b) => {
      const timeA = Number((a.timestamp as any)?.seconds || 0);
      const timeB = Number((b.timestamp as any)?.seconds || 0);
      return timeB - timeA;
    });
  }, [dedupeById, fetchScopedDataByDate, getDatesInRange]);

  const fetchArchiveData = useCallback(async () => {
    if (!archiveUserEmail || !archiveDate) return;
    setIsArchiveLoading(true);
    try {
      if (archiveDate === businessDayKey) {
        const currentSummary = buildFinancialSummary({
          tickets,
          injections,
          settlements,
          userEmail: archiveUserEmail,
          targetDate: archiveDate,
        });
        setArchiveTickets(currentSummary.tickets);
        setArchiveInjections(currentSummary.injections);
      } else {
        const archiveData = await fetchUserOperationalDataByDate(archiveDate, archiveUserEmail);
        setArchiveTickets(archiveData.tickets);
        setArchiveInjections(archiveData.injections);
        setResults(prev => {
          const map = new Map(prev.map(item => [`${item.lotteryName}-${item.date}-${item.id}`, item]));
          archiveData.results.forEach(item => map.set(`${item.lotteryName}-${item.date}-${item.id}`, item));
          return Array.from(map.values());
        });
      }
    } catch (error) {
      console.error('Error fetching archive data:', error);
      toast.error('Error al cargar datos del archivo');
    } finally {
      setIsArchiveLoading(false);
    }
  }, [
    archiveUserEmail,
    archiveDate,
    buildFinancialSummary,
    businessDayKey,
    fetchUserOperationalDataByDate,
    injections,
    settlements,
    tickets,
    setArchiveInjections,
    setArchiveTickets,
    setIsArchiveLoading,
    setResults,
  ]);

  useEffect(() => {
    if (activeTab !== 'liquidaciones' || !selectedUserToLiquidate || !liquidationDate) {
      setLiquidationTicketsSnapshot([]);
      setLiquidationInjectionsSnapshot([]);
      setLiquidationResultsSnapshot([]);
      setLiquidationSettlementsSnapshot([]);
      return;
    }

    if (liquidationDate === businessDayKey) {
      setLiquidationTicketsSnapshot([]);
      setLiquidationInjectionsSnapshot([]);
      setLiquidationResultsSnapshot([]);
      setLiquidationSettlementsSnapshot([]);
      return;
    }

    if (!operationalSellerId) return;

    let cancelled = false;
    setIsLiquidationDataLoading(true);

    fetchUserOperationalDataByDate(liquidationDate, selectedUserToLiquidate)
      .then((dayData) => {
        if (cancelled) return;
        setLiquidationTicketsSnapshot(dayData.tickets);
        setLiquidationInjectionsSnapshot(dayData.injections);
        setLiquidationResultsSnapshot(dayData.results);
        setLiquidationSettlementsSnapshot(dayData.settlements);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('Error loading liquidation source data:', error);
        toast.error('No se pudieron cargar los datos históricos para liquidación');
      })
      .finally(() => {
        if (!cancelled) setIsLiquidationDataLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    activeTab,
    businessDayKey,
    fetchUserOperationalDataByDate,
    liquidationDate,
    operationalSellerId,
    selectedUserToLiquidate,
    setIsLiquidationDataLoading,
    setLiquidationInjectionsSnapshot,
    setLiquidationResultsSnapshot,
    setLiquidationSettlementsSnapshot,
    setLiquidationTicketsSnapshot,
  ]);

  return {
    fetchArchiveData,
    fetchUserOperationalDataByDate,
    fetchArchiveSalesReport,
    searchArchiveTickets,
    fetchArchiveLiquidations,
  };
}
