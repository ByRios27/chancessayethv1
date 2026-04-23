import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { Lottery } from '../types/lotteries';
import type { RecoveryTicketRecord } from '../types/archive';
import {
  fetchRecoveryDailyArchive,
  fetchRecoveryLiveTickets,
} from '../services/repositories/recoveryRepo';

export function useRecovery({
  userRole,
  activeTab,
  initialRecoveryDate,
  lotteries,
  getOperationalTimeSortValue,
  getBusinessDayRange,
  cleanText,
  normalizePlainText,
}: {
  userRole?: string;
  activeTab: string;
  initialRecoveryDate: string;
  lotteries: Lottery[];
  getOperationalTimeSortValue: (time: string) => number;
  getBusinessDayRange: (day: string) => { start: Date; end: Date };
  cleanText: (text: string) => string;
  normalizePlainText: (text: string) => string;
}) {
  const [recoveryDate, setRecoveryDate] = useState(initialRecoveryDate);
  const [recoveryTickets, setRecoveryTickets] = useState<RecoveryTicketRecord[]>([]);
  const [isRecoveryLoading, setIsRecoveryLoading] = useState(false);
  const [recoverySavingRowId, setRecoverySavingRowId] = useState<string | null>(null);
  const [recoveryDeletingRowId, setRecoveryDeletingRowId] = useState<string | null>(null);
  const [recoverySellerFilter, setRecoverySellerFilter] = useState('');
  const [recoveryLotteryFilter, setRecoveryLotteryFilter] = useState('');
  const [recoveryTicketIdFilter, setRecoveryTicketIdFilter] = useState('');
  const [recoveryStatusFilter, setRecoveryStatusFilter] = useState<'ALL' | 'active' | 'winner' | 'cancelled' | 'liquidated'>('ALL');
  const [recoverySortOrder, setRecoverySortOrder] = useState<'asc' | 'desc'>('asc');
  const [recoveryTargetLotteryByRow, setRecoveryTargetLotteryByRow] = useState<Record<string, string>>({});
  const [recoveryTargetLotteryMapByRow, setRecoveryTargetLotteryMapByRow] = useState<Record<string, Record<string, string>>>({});

  const parseTicketTimestampMs = useCallback((value: any) => {
    if (!value) return 0;
    if (value?.toDate) return value.toDate().getTime();
    if (value?.seconds) return value.seconds * 1000;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  }, []);

  const getRecoveryTicketLotteryLabel = useCallback((ticket: RecoveryTicketRecord) => {
    const names = Array.from(new Set((ticket.bets || []).map((bet) => cleanText(bet.lottery || '').trim()).filter(Boolean)));
    if (names.length > 0) return names.join(' | ');
    const raw = ticket.raw || {};
    return cleanText(raw.lotteryName || raw.drawName || raw.lottery || raw.draw || '-');
  }, [cleanText]);

  const getRecoveryTicketLotteryNames = useCallback((ticket: RecoveryTicketRecord) => {
    const seen = new Set<string>();
    const names: string[] = [];
    (ticket.bets || []).forEach((bet) => {
      const rawName = (bet?.lottery || '').trim();
      const key = normalizePlainText(rawName);
      if (!key || seen.has(key)) return;
      seen.add(key);
      names.push(rawName);
    });
    return names;
  }, [normalizePlainText]);

  const recoveryAvailableLotteries = useMemo(() => {
    return [...lotteries].sort((a, b) => {
      const at = getOperationalTimeSortValue(a.drawTime || '00:00');
      const bt = getOperationalTimeSortValue(b.drawTime || '00:00');
      return at - bt;
    });
  }, [getOperationalTimeSortValue, lotteries]);

  const fetchRecoveryData = useCallback(async () => {
    if (userRole !== 'programador' || !recoveryDate) return;
    setIsRecoveryLoading(true);
    try {
      const { start, end } = getBusinessDayRange(recoveryDate);
      const [ticketsSnapshot, archiveSnapshot] = await Promise.all([
        fetchRecoveryLiveTickets({ start, end }),
        fetchRecoveryDailyArchive(recoveryDate),
      ]);

      const liveRows: RecoveryTicketRecord[] = ticketsSnapshot.docs.map((docSnap) => {
        const data = docSnap.data() as Record<string, any>;
        return {
          rowId: `tickets:${docSnap.id}`,
          source: 'tickets',
          id: docSnap.id,
          sellerId: data.sellerId || '',
          sellerCode: data.sellerCode || '',
          sellerName: data.sellerName || '',
          sellerEmail: data.sellerEmail || '',
          timestamp: data.timestamp || null,
          status: data.status || '',
          totalAmount: Number(data.totalAmount || 0),
          bets: Array.isArray(data.bets) ? data.bets : [],
          raw: data,
        };
      });

      const archiveRows: RecoveryTicketRecord[] = archiveSnapshot.exists()
        ? (((archiveSnapshot.data()?.tickets || []) as any[]).map((ticket: any) => ({
            rowId: `daily_archives:${recoveryDate}:${ticket.id}`,
            source: 'daily_archives' as const,
            archiveDate: recoveryDate,
            id: ticket.id,
            sellerId: ticket.sellerId || '',
            sellerCode: ticket.sellerCode || '',
            sellerName: ticket.sellerName || '',
            sellerEmail: ticket.sellerEmail || '',
            timestamp: ticket.timestamp || null,
            status: ticket.status || '',
            totalAmount: Number(ticket.totalAmount || 0),
            bets: Array.isArray(ticket.bets) ? ticket.bets : [],
            raw: ticket,
          })))
        : [];

      const merged = [...liveRows, ...archiveRows].sort((a, b) => parseTicketTimestampMs(a.timestamp) - parseTicketTimestampMs(b.timestamp));
      setRecoveryTickets(merged);

      const nextSelection: Record<string, string> = {};
      const nextMultiSelection: Record<string, Record<string, string>> = {};
      merged.forEach((row) => {
        const ticketLotteries = getRecoveryTicketLotteryNames(row);
        if (ticketLotteries.length <= 1) {
          const guessedLotteryName = ticketLotteries[0] || ((row.bets || [])[0]?.lottery || '').trim();
          const match = recoveryAvailableLotteries.find((lottery) => normalizePlainText(lottery.name) === normalizePlainText(guessedLotteryName));
          if (match) nextSelection[row.rowId] = match.id;
          return;
        }

        const rowSelection: Record<string, string> = {};
        ticketLotteries.forEach((sourceLottery) => {
          const match = recoveryAvailableLotteries.find((lottery) => normalizePlainText(lottery.name) === normalizePlainText(sourceLottery));
          if (match) rowSelection[sourceLottery] = match.id;
        });
        nextMultiSelection[row.rowId] = rowSelection;
      });
      setRecoveryTargetLotteryByRow(nextSelection);
      setRecoveryTargetLotteryMapByRow(nextMultiSelection);
    } catch (error) {
      console.error('Error fetching recovery data:', error);
      toast.error('No se pudieron cargar tickets para recuperación');
    } finally {
      setIsRecoveryLoading(false);
    }
  }, [getBusinessDayRange, getRecoveryTicketLotteryNames, normalizePlainText, parseTicketTimestampMs, recoveryAvailableLotteries, recoveryDate, userRole]);

  useEffect(() => {
    if (activeTab !== 'recovery' || userRole !== 'programador') return;
    fetchRecoveryData();
  }, [activeTab, fetchRecoveryData, userRole]);

  const filteredRecoveryTickets = useMemo(() => {
    const sellerFilter = recoverySellerFilter.trim().toLowerCase();
    const lotteryFilter = recoveryLotteryFilter.trim().toLowerCase();
    const ticketIdFilter = recoveryTicketIdFilter.trim().toLowerCase();

    const filtered = recoveryTickets.filter((ticket) => {
      const sellerText = `${ticket.sellerName || ''} ${ticket.sellerId || ''} ${ticket.sellerCode || ''} ${ticket.sellerEmail || ''}`.toLowerCase();
      const lotteryText = getRecoveryTicketLotteryLabel(ticket).toLowerCase();
      const ticketIdText = (ticket.id || '').toLowerCase();
      const statusText = (ticket.status || '').toLowerCase();

      if (sellerFilter && !sellerText.includes(sellerFilter)) return false;
      if (lotteryFilter && !lotteryText.includes(lotteryFilter)) return false;
      if (ticketIdFilter && !ticketIdText.includes(ticketIdFilter)) return false;
      if (recoveryStatusFilter !== 'ALL' && statusText !== recoveryStatusFilter) return false;
      return true;
    });

    return filtered.sort((a, b) => {
      const diff = parseTicketTimestampMs(a.timestamp) - parseTicketTimestampMs(b.timestamp);
      return recoverySortOrder === 'asc' ? diff : -diff;
    });
  }, [getRecoveryTicketLotteryLabel, parseTicketTimestampMs, recoveryLotteryFilter, recoverySellerFilter, recoverySortOrder, recoveryStatusFilter, recoveryTicketIdFilter, recoveryTickets]);

  return {
    recoveryDate,
    setRecoveryDate,
    recoveryTickets,
    setRecoveryTickets,
    isRecoveryLoading,
    recoverySavingRowId,
    setRecoverySavingRowId,
    recoveryDeletingRowId,
    setRecoveryDeletingRowId,
    recoverySellerFilter,
    setRecoverySellerFilter,
    recoveryLotteryFilter,
    setRecoveryLotteryFilter,
    recoveryTicketIdFilter,
    setRecoveryTicketIdFilter,
    recoveryStatusFilter,
    setRecoveryStatusFilter,
    recoverySortOrder,
    setRecoverySortOrder,
    recoveryTargetLotteryByRow,
    setRecoveryTargetLotteryByRow,
    recoveryTargetLotteryMapByRow,
    setRecoveryTargetLotteryMapByRow,
    recoveryAvailableLotteries,
    filteredRecoveryTickets,
    getRecoveryTicketLotteryLabel,
    getRecoveryTicketLotteryNames,
    parseTicketTimestampMs,
    fetchRecoveryData,
  };
}
