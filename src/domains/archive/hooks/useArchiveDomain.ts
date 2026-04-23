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
  const fetchUserOperationalDataByDate = useCallback(async (targetDate: string, userEmail: string) => {
    const normalizedEmail = userEmail.toLowerCase().trim();
    const { start, end } = getBusinessDayRange(targetDate);
    const archiveSnap = await getDoc(doc(db, 'daily_archives', targetDate));
    if (archiveSnap.exists()) {
      const archive = archiveSnap.data() as {
        tickets?: LotteryTicket[];
        injections?: Injection[];
        settlements?: Settlement[];
        results?: LotteryResult[];
      };

      const archivedTickets = (archive.tickets || []).filter(ticket =>
        (ticket.sellerEmail || '').toLowerCase() === normalizedEmail
      );
      const archivedInjections = (archive.injections || []).filter(injection =>
        (injection.userEmail || '').toLowerCase() === normalizedEmail
      );
      const archivedSettlements = (archive.settlements || []).filter(settlement =>
        (settlement.userEmail || '').toLowerCase() === normalizedEmail &&
        settlement.date === targetDate
      );

      return {
        tickets: archivedTickets,
        injections: archivedInjections,
        settlements: archivedSettlements,
        results: archive.results || [],
      };
    }

    const [ticketsByEmailSnap, injectionsSnap, settlementsSnap, resultsSnap] = await Promise.all([
      getDocs(query(
        collection(db, 'tickets'),
        where('sellerEmail', '==', normalizedEmail),
        where('timestamp', '>=', start),
        where('timestamp', '<', end),
        limit(1200)
      )),
      getDocs(query(
        collection(db, 'injections'),
        where('userEmail', '==', normalizedEmail),
        where('date', '==', targetDate),
        limit(500)
      )),
      getDocs(query(
        collection(db, 'settlements'),
        where('userEmail', '==', normalizedEmail),
        where('date', '==', targetDate),
        limit(300)
      )),
      getDocs(query(
        collection(db, 'results'),
        where('date', '==', targetDate),
        limit(300)
      )),
    ]);

    return {
      tickets: mergeTicketSnapshots(ticketsByEmailSnap),
      injections: injectionsSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Injection)),
      settlements: settlementsSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Settlement)),
      results: resultsSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as LotteryResult)),
    };
  }, [getBusinessDayRange, mergeTicketSnapshots]);

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
  };
}
