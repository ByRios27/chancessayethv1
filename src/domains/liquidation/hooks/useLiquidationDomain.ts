import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';
import { toastSuccess } from '../../../utils/toast';
import {
  addDoc,
  collection,
  db,
  doc,
  getDocs,
  getDoc,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from '../../../firebase';
import { useLiquidation } from '../../../hooks/useLiquidation';
import { findLatestSettlementForUserDate } from '../../../services/calculations/liquidation';
import { createCeoAdminAlert } from '../../../services/repositories/appAlertsRepo';
import type { Injection, Settlement } from '../../../types/finance';
import type { LotteryResult } from '../../../types/results';
import type { LotteryTicket } from '../../../types/bets';

const BALANCE_EPSILON = 0.005;

const getSettlementAmountReceived = (settlement: Settlement) => Number(settlement.amountReceived ?? settlement.amountPaid ?? 0);
const getSettlementAmountSent = (settlement: Settlement) => Number(settlement.amountSent ?? 0);

export function useLiquidationDomain(params: any) {
  const {
    businessDayKey,
    users,
    tickets,
    injections,
    results,
    lotteries = [],
    settlements,
    userProfile,
    getQuickOperationalDate,
    getOperationalTimeSortValue,
    recentOperationalDates,
    getBusinessDayRange,
    buildFinancialSummary,
    getTicketPrizesFromSource,
    liquidationDate,
    setLiquidationDate,
    selectedUserToLiquidate,
    setSelectedUserToLiquidate,
    liquidationTicketsSnapshot,
    liquidationInjectionsSnapshot,
    liquidationResultsSnapshot,
    liquidationSettlementsSnapshot,
    setLiquidationSettlementsSnapshot,
    setSettlements,
    setUsers,
    isLiquidationDataLoading,
    setTickets,
    setInjections,
    setConfirmModal,
    onError,
  } = params;

  const [consolidatedMode, setConsolidatedMode] = useState<'day' | 'range'>('day');
  const [consolidatedReportDate, setConsolidatedReportDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return format(d, 'yyyy-MM-dd');
  });
  const [consolidatedStartDate, setConsolidatedStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return format(d, 'yyyy-MM-dd');
  });
  const [consolidatedEndDate, setConsolidatedEndDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return format(d, 'yyyy-MM-dd');
  });
  const [isGeneratingYesterdayReport, setIsGeneratingYesterdayReport] = useState(false);
  const [liquidationRangeStartDate, setLiquidationRangeStartDate] = useState<string>(businessDayKey);
  const [liquidationRangeEndDate, setLiquidationRangeEndDate] = useState<string>(businessDayKey);
  const [liquidationRangeReport, setLiquidationRangeReport] = useState<any>(null);
  const [isLiquidationRangeLoading, setIsLiquidationRangeLoading] = useState(false);
  const skipFastRangeSettlementsQueryRef = useRef(false);

  const {
    amountPaid,
    setAmountPaid,
    amountDirection,
    setAmountDirection,
    selectedLiquidationSettlement,
    liquidationPreview,
    liquidationGlobalSummary,
    liquidationUserSummaries,
  } = useLiquidation({
    businessDayKey,
    selectedUserToLiquidate,
    liquidationDate,
    users,
    tickets,
    injections,
    results,
    liquidationTicketsSnapshot,
    liquidationInjectionsSnapshot,
    liquidationResultsSnapshot,
    settlements,
    liquidationSettlementsSnapshot,
    buildFinancialSummary,
    getTicketPrizesFromSource,
  });

  const liquidacionQuickDateOptions = useMemo(() => {
    const today = getQuickOperationalDate(0);
    const yesterday = getQuickOperationalDate(-1);

    return recentOperationalDates.map((dateValue: string) => {
      let label = dateValue;
      if (dateValue === today) label = `Hoy (${dateValue})`;
      if (dateValue === yesterday) label = `Ayer (${dateValue})`;
      return { value: dateValue, label };
    });
  }, [getQuickOperationalDate, recentOperationalDates]);

  const normalizeEmail = useCallback((value?: string | null) => (value || '').toLowerCase().trim(), []);
  const normalizedUserRole = String(userProfile?.role || '').toLowerCase();
  const isSellerUser = normalizedUserRole === 'seller';

  const getDatesInRange = useCallback((from: string, to: string) => {
    const safeFrom = from || to;
    const safeTo = to || from || safeFrom;
    const start = new Date(`${safeFrom}T00:00:00`);
    const end = new Date(`${safeTo}T00:00:00`);
    const dates: string[] = [];
    const cursor = new Date(start.getTime());
    let iterations = 0;

    while (cursor <= end && iterations < 62) {
      dates.push(format(cursor, 'yyyy-MM-dd'));
      cursor.setDate(cursor.getDate() + 1);
      iterations += 1;
    }

    return dates;
  }, []);

  const dedupeById = useCallback(<T extends { id?: string }>(items: T[]) => {
    const map = new Map<string, T>();
    items.forEach((item, index) => {
      const key = item?.id || `fallback-${index}`;
      if (!map.has(key)) map.set(key, item);
    });
    return Array.from(map.values());
  }, []);

  const fetchLiveSettlementsForDay = useCallback(async (targetDate: string, userEmail: string) => {
    const normalizedEmail = normalizeEmail(userEmail);
    const settlementsSnap = await getDocs(query(
      collection(db, 'settlements'),
      where('userEmail', '==', normalizedEmail),
      where('date', '==', targetDate),
      limit(500)
    ));

    return settlementsSnap.docs.map((docSnap: any) => ({ id: docSnap.id, ...docSnap.data() } as Settlement));
  }, [normalizeEmail]);

  const fetchLiveSettlementsForRange = useCallback(async (userEmail: string, startDate: string, endDate: string) => {
    if (skipFastRangeSettlementsQueryRef.current) return null;

    const normalizedEmail = normalizeEmail(userEmail);

    try {
      const settlementsSnap = await getDocs(query(
        collection(db, 'settlements'),
        where('userEmail', '==', normalizedEmail),
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        limit(3000)
      ));
      const byDate = new Map<string, Settlement[]>();
      settlementsSnap.docs.forEach((docSnap: any) => {
        const settlement = { id: docSnap.id, ...docSnap.data() } as Settlement;
        const dateValue = String(settlement.date || '');
        if (!dateValue) return;
        const list = byDate.get(dateValue) || [];
        list.push(settlement);
        byDate.set(dateValue, list);
      });
      return byDate;
    } catch (error) {
      skipFastRangeSettlementsQueryRef.current = true;
      console.warn('Fast range settlements query failed; falling back to day queries:', error);
      return null;
    }
  }, [normalizeEmail]);

  const fetchLiquidationDayData = useCallback(async (targetDate: string, userEmail: string, preloadedLiveSettlements?: Settlement[] | null) => {
    const normalizedEmail = normalizeEmail(userEmail);

    if (targetDate === businessDayKey) {
      return {
        tickets: tickets.filter((ticket: LotteryTicket) => normalizeEmail(ticket.sellerEmail) === normalizedEmail),
        injections: injections.filter((injection: Injection) => normalizeEmail(injection.userEmail) === normalizedEmail && injection.date === targetDate),
        settlements: preloadedLiveSettlements ?? settlements.filter((settlement: Settlement) => normalizeEmail(settlement.userEmail) === normalizedEmail && settlement.date === targetDate),
        results: results.filter((result: LotteryResult) => result.date === targetDate),
      };
    }

    if (isSellerUser) {
      const userArchiveSnap = await getDoc(doc(db, 'daily_archives', targetDate, 'users', normalizedEmail));
      if (userArchiveSnap.exists()) {
        const archive = userArchiveSnap.data() as {
          tickets?: LotteryTicket[];
          injections?: Injection[];
          settlements?: Settlement[];
          results?: LotteryResult[];
        };
        const liveSettlements = preloadedLiveSettlements ?? await fetchLiveSettlementsForDay(targetDate, normalizedEmail);

        return {
          tickets: archive.tickets || [],
          injections: (archive.injections || []).filter((injection) => injection.date === targetDate),
          settlements: dedupeById([
            ...liveSettlements,
            ...(archive.settlements || []).filter((settlement) => settlement.date === targetDate),
          ]),
          results: archive.results || [],
        };
      }
    }

    const archiveSnap = !isSellerUser ? await getDoc(doc(db, 'daily_archives', targetDate)) : null;
    if (archiveSnap?.exists()) {
      const archive = archiveSnap.data() as {
        tickets?: LotteryTicket[];
        injections?: Injection[];
        settlements?: Settlement[];
        results?: LotteryResult[];
      };
      const liveSettlements = preloadedLiveSettlements ?? await fetchLiveSettlementsForDay(targetDate, normalizedEmail);

      return {
        tickets: (archive.tickets || []).filter((ticket) => normalizeEmail(ticket.sellerEmail) === normalizedEmail),
        injections: (archive.injections || []).filter((injection) => normalizeEmail(injection.userEmail) === normalizedEmail && injection.date === targetDate),
        settlements: dedupeById([
          ...liveSettlements,
          ...(archive.settlements || []).filter((settlement) => normalizeEmail(settlement.userEmail) === normalizedEmail && settlement.date === targetDate),
        ]),
        results: archive.results || [],
      };
    }

    const { start, end } = getBusinessDayRange(targetDate);
    const settlementsPromise = preloadedLiveSettlements
      ? Promise.resolve(null)
      : getDocs(query(
          collection(db, 'settlements'),
          where('userEmail', '==', normalizedEmail),
          where('date', '==', targetDate),
          limit(500)
        ));

    const [ticketsSnap, injectionsSnap, settlementsSnap, resultsSnap] = await Promise.all([
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
      settlementsPromise,
      getDocs(query(
        collection(db, 'results'),
        where('date', '==', targetDate),
        limit(400)
      )),
    ]);

    return {
      tickets: ticketsSnap.docs.map((docSnap: any) => ({ id: docSnap.id, ...docSnap.data() } as LotteryTicket)),
      injections: injectionsSnap.docs.map((docSnap: any) => ({ id: docSnap.id, ...docSnap.data() } as Injection)),
      settlements: preloadedLiveSettlements ?? settlementsSnap?.docs.map((docSnap: any) => ({ id: docSnap.id, ...docSnap.data() } as Settlement)) ?? [],
      results: resultsSnap.docs.map((docSnap: any) => ({ id: docSnap.id, ...docSnap.data() } as LotteryResult)),
    };
  }, [
    businessDayKey,
    dedupeById,
    fetchLiveSettlementsForDay,
    getBusinessDayRange,
    injections,
    isSellerUser,
    normalizeEmail,
    results,
    settlements,
    tickets,
  ]);

  const fetchLiquidationRangeReport = useCallback(async () => {
    if (!selectedUserToLiquidate) {
      toast.error('Selecciona un vendedor para ver el rango');
      return;
    }

    if (!liquidationRangeStartDate || !liquidationRangeEndDate) {
      toast.error('Selecciona fecha inicio y fecha fin');
      return;
    }

    if (liquidationRangeStartDate > liquidationRangeEndDate) {
      toast.error('La fecha inicial no puede ser mayor que la final');
      return;
    }

    const userToLiquidate = users.find((userItem: any) => normalizeEmail(userItem.email) === normalizeEmail(selectedUserToLiquidate));
    if (!userToLiquidate) {
      toast.error('No se encontro el vendedor');
      return;
    }

    setIsLiquidationRangeLoading(true);

    try {
      const dates = getDatesInRange(liquidationRangeStartDate, liquidationRangeEndDate);
      const liveSettlementsByDate = await fetchLiveSettlementsForRange(
        selectedUserToLiquidate,
        liquidationRangeStartDate,
        liquidationRangeEndDate
      );

      const days = await Promise.all(dates.map(async (dateValue) => {
        const dayData = await fetchLiquidationDayData(
          dateValue,
          selectedUserToLiquidate,
          liveSettlementsByDate ? (liveSettlementsByDate.get(dateValue) || []) : undefined
        );
        const uniqueTickets = dedupeById<LotteryTicket>(dayData.tickets as LotteryTicket[]);
        const uniqueInjections = dedupeById<Injection>(dayData.injections as Injection[]);
        const uniqueSettlements = dedupeById<Settlement>(dayData.settlements as Settlement[]);
        const uniqueResults = dedupeById<LotteryResult>(dayData.results as LotteryResult[]);

        const summary = buildFinancialSummary({
          tickets: uniqueTickets,
          injections: uniqueInjections,
          settlements: uniqueSettlements,
          userEmail: selectedUserToLiquidate,
          targetDate: dateValue,
          prizeResolver: (ticketItem: LotteryTicket) => getTicketPrizesFromSource(ticketItem, uniqueResults),
        });

        const amountReceived = uniqueSettlements.reduce((sum, settlement) => sum + getSettlementAmountReceived(settlement), 0);
        const amountSent = uniqueSettlements.reduce((sum, settlement) => sum + getSettlementAmountSent(settlement), 0);
        const operationalProfit = Number(summary.operationalProfit ?? summary.netProfit ?? 0);
        const capital = operationalProfit + Number(summary.totalInjections || 0);
        const pending = capital - amountReceived + amountSent;

        return {
          date: dateValue,
          totalSales: summary.totalSales,
          totalPrizes: summary.totalPrizes,
          totalCommissions: summary.totalCommissions,
          totalInjections: summary.totalInjections,
          operationalProfit,
          capital,
          amountReceived,
          amountSent,
          pending,
          status: uniqueSettlements.length > 0 && Math.abs(pending) <= BALANCE_EPSILON ? 'liquidated' : 'pending',
        };
      }));

      const summary = days.reduce((acc, day) => ({
        totalSales: acc.totalSales + day.totalSales,
        totalPrizes: acc.totalPrizes + day.totalPrizes,
        totalCommissions: acc.totalCommissions + day.totalCommissions,
        totalInjections: acc.totalInjections + day.totalInjections,
        operationalProfit: acc.operationalProfit + day.operationalProfit,
        capital: acc.capital + day.capital,
        amountReceived: acc.amountReceived + day.amountReceived,
        amountSent: acc.amountSent + day.amountSent,
        pending: acc.pending + day.pending,
      }), {
        totalSales: 0,
        totalPrizes: 0,
        totalCommissions: 0,
        totalInjections: 0,
        operationalProfit: 0,
        capital: 0,
        amountReceived: 0,
        amountSent: 0,
        pending: 0,
      });

      setLiquidationRangeReport({
        startDate: liquidationRangeStartDate,
        endDate: liquidationRangeEndDate,
        user: userToLiquidate,
        days,
        summary,
      });
    } catch (error) {
      console.error('Error loading liquidation range:', error);
      toast.error('No se pudo cargar el rango de liquidacion');
    } finally {
      setIsLiquidationRangeLoading(false);
    }
  }, [
    buildFinancialSummary,
    dedupeById,
    fetchLiquidationDayData,
    fetchLiveSettlementsForRange,
    getDatesInRange,
    getTicketPrizesFromSource,
    liquidationRangeEndDate,
    liquidationRangeStartDate,
    normalizeEmail,
    selectedUserToLiquidate,
    users,
  ]);

  useEffect(() => {
    setLiquidationRangeReport(null);
  }, [liquidationRangeStartDate, liquidationRangeEndDate, selectedUserToLiquidate]);

  const handleLiquidate = async () => {
    if (!selectedUserToLiquidate) return;
    if (!userProfile || !['ceo', 'admin'].includes(userProfile.role)) {
      toast.error('No tienes permisos para liquidar');
      return;
    }
    if (liquidationDate !== businessDayKey && isLiquidationDataLoading) {
      toast.error('Espera a que termine la carga de datos historicos');
      return;
    }

    if (!liquidationPreview) return;

    const {
      userToLiquidate,
      isCurrentOperationalDate,
      financialSummary,
      ticketsToLiquidate,
      injectionsToLiquidate,
      paid,
      amountDirection: previewAmountDirection,
      netProfit,
      operationalProfit,
      liquidationBalance,
      debtAdded,
      actionLabel,
    } = liquidationPreview;

    const totalSales = financialSummary.totalSales;
    const totalCommissions = financialSummary.totalCommissions;
    const totalPrizes = financialSummary.totalPrizes;
    const totalInjections = financialSummary.totalInjections;

    setConfirmModal((prev: any) => ({
      ...prev,
      show: true,
      title: selectedLiquidationSettlement ? 'Actualizar Liquidacion' : 'Confirmar Liquidacion Diaria',
      message: `Seguro de ${actionLabel} a ${userToLiquidate.name} para ${liquidationDate}?\n\nResultado del dia: USD ${operationalProfit.toFixed(2)}\nInyeccion del dia: USD ${totalInjections.toFixed(2)}\nCapital del dia: USD ${liquidationBalance.toFixed(2)}\n${previewAmountDirection === 'sent' ? 'Monto enviado' : 'Monto recibido'}: USD ${paid.toFixed(2)}\nPendiente del dia: USD ${debtAdded.toFixed(2)}`,
      onConfirm: async () => {
        try {
          const normalizedUserEmail = userToLiquidate.email.toLowerCase();
          let existingSettlement = selectedLiquidationSettlement;

          if (!existingSettlement) {
            const settlementQueryByLower = await getDocs(query(
              collection(db, 'settlements'),
              where('userEmail', '==', normalizedUserEmail),
              where('date', '==', liquidationDate),
              limit(5)
            ));

            const lowerMatches = settlementQueryByLower.docs.map((docSnap: any) => ({ id: docSnap.id, ...docSnap.data() } as Settlement));
            existingSettlement = lowerMatches.sort((a: Settlement, b: Settlement) => {
              const aTime = a.timestamp?.toDate?.()?.getTime?.() ?? (a.timestamp?.seconds ? a.timestamp.seconds * 1000 : 0);
              const bTime = b.timestamp?.toDate?.()?.getTime?.() ?? (b.timestamp?.seconds ? b.timestamp.seconds * 1000 : 0);
              return bTime - aTime;
            })[0] || null;
          }

          const currentDebtValue = userToLiquidate.currentDebt || 0;
          const baselineDebt = currentDebtValue - (existingSettlement?.debtAdded || 0);
          const finalDebtAdded = liquidationBalance + (previewAmountDirection === 'sent' ? paid : -paid);
          const finalNewTotalDebt = baselineDebt + finalDebtAdded;
          const finalAmountReceived = previewAmountDirection === 'received' ? paid : 0;
          const finalAmountSent = previewAmountDirection === 'sent' ? paid : 0;
          const isUpdatingSettlement = !!existingSettlement;

          const settlementPayload = {
            userEmail: normalizedUserEmail,
            sellerEmail: normalizedUserEmail,
            sellerId: userToLiquidate.sellerId || null,
            date: liquidationDate,
            totalSales,
            totalCommissions,
            totalPrizes,
            totalInjections,
            sales: totalSales,
            prizes: totalPrizes,
            commission: totalCommissions,
            dailyResult: operationalProfit,
            dailyInjectionTotal: totalInjections,
            previousBalance: baselineDebt,
            finalBalance: finalNewTotalDebt,
            operationalProfit,
            liquidationBalance,
            netProfit,
            net: netProfit,
            amountPaid: finalAmountReceived,
            amountDirection: previewAmountDirection,
            amountReceived: finalAmountReceived,
            amountSent: finalAmountSent,
            amountEntered: paid,
            debtAdded: finalDebtAdded,
            previousDebt: baselineDebt,
            newTotalDebt: finalNewTotalDebt,
            status: 'closed',
            closed: true,
            closedAt: serverTimestamp(),
            closedByEmail: userProfile?.email,
            liquidatedBy: userProfile?.email,
            updatedAt: serverTimestamp(),
          };

          let settlementId = existingSettlement?.id || '';
          if (existingSettlement) {
            await updateDoc(doc(db, 'settlements', existingSettlement.id), settlementPayload);
          } else {
            const settlementRef = await addDoc(collection(db, 'settlements'), {
              ...settlementPayload,
              timestamp: serverTimestamp(),
            });
            settlementId = settlementRef.id;
          }

          const effectiveSettlementId = settlementId || existingSettlement?.id || '';

          await updateDoc(doc(db, 'users', userToLiquidate.email), { currentDebt: finalNewTotalDebt });
          if (typeof setUsers === 'function') {
            setUsers((prev: any[]) => prev.map((userItem) => (
              String(userItem.email || '').toLowerCase() === normalizedUserEmail
                ? { ...userItem, currentDebt: finalNewTotalDebt }
                : userItem
            )));
          }

          if (isCurrentOperationalDate && effectiveSettlementId) {
            if (ticketsToLiquidate.length > 0) {
              for (let i = 0; i < ticketsToLiquidate.length; i += 450) {
                const chunk = ticketsToLiquidate.slice(i, i + 450);
                const batch = writeBatch(db);
                chunk.forEach((ticket: LotteryTicket) => {
                  if (ticket.status !== 'active') return;
                  if (ticket.settlementId || ticket.liquidated) return;
                  batch.update(doc(db, 'tickets', ticket.id), {
                    status: 'liquidated',
                    liquidated: true,
                    settlementId: effectiveSettlementId,
                  });
                });
                await batch.commit();
              }
            }

            if (injectionsToLiquidate.length > 0) {
              for (let i = 0; i < injectionsToLiquidate.length; i += 500) {
                const chunk = injectionsToLiquidate.slice(i, i + 500);
                const batch = writeBatch(db);
                chunk.forEach((injection: Injection) => {
                  if (injection.settlementId || injection.liquidated) return;
                  batch.update(doc(db, 'injections', injection.id), {
                    liquidated: true,
                    settlementId: effectiveSettlementId,
                  });
                });
                await batch.commit();
              }
            }
          }

          const liquidatedTicketIds = new Set(ticketsToLiquidate.map((ticket: LotteryTicket) => ticket.id));
          const liquidatedInjectionIds = new Set(injectionsToLiquidate.map((injection: Injection) => injection.id));

          if (isCurrentOperationalDate && effectiveSettlementId) {
            setTickets((prev: LotteryTicket[]) => prev.map(ticket => (
              liquidatedTicketIds.has(ticket.id)
                ? { ...ticket, liquidated: true, settlementId: effectiveSettlementId, status: 'liquidated' as any }
                : ticket
            )));
            setInjections((prev: Injection[]) => prev.map(injection => (
              liquidatedInjectionIds.has(injection.id)
                ? { ...injection, liquidated: true, settlementId: effectiveSettlementId }
                : injection
            )));
          }

          const upsertSettlement = (items: Settlement[]) => {
            const idx = items.findIndex(item => item.id === effectiveSettlementId);
            const settlementRecord: Settlement = {
              id: effectiveSettlementId,
              userEmail: normalizedUserEmail,
              sellerEmail: normalizedUserEmail,
              sellerId: userToLiquidate.sellerId || null,
              date: liquidationDate,
              totalSales,
              totalCommissions,
              totalPrizes,
              totalInjections,
              sales: totalSales,
              prizes: totalPrizes,
              commission: totalCommissions,
              dailyResult: operationalProfit,
              dailyInjectionTotal: totalInjections,
              previousBalance: baselineDebt,
              finalBalance: finalNewTotalDebt,
              operationalProfit,
              liquidationBalance,
              netProfit,
              net: netProfit,
              amountPaid: finalAmountReceived,
              amountDirection: previewAmountDirection,
              amountReceived: finalAmountReceived,
              amountSent: finalAmountSent,
              amountEntered: paid,
              debtAdded: finalDebtAdded,
              previousDebt: baselineDebt,
              newTotalDebt: finalNewTotalDebt,
              status: 'closed',
              closed: true,
              closedByEmail: userProfile?.email,
              liquidatedBy: userProfile?.email,
              timestamp: existingSettlement?.timestamp,
            } as Settlement;

            if (idx >= 0) {
              const next = [...items];
              next[idx] = { ...next[idx], ...settlementRecord };
              return next;
            }
            return [settlementRecord, ...items];
          };

          setLiquidationSettlementsSnapshot((prev: Settlement[]) => upsertSettlement(prev));
          if (typeof setSettlements === 'function') {
            setSettlements((prev: Settlement[]) => upsertSettlement(prev));
          }

          const actorEmail = String(userProfile?.email || '').toLowerCase();
          const actorRole = String(userProfile?.role || '').toLowerCase();
          if (actorEmail && (actorRole === 'admin' || actorRole === 'ceo')) {
            await createCeoAdminAlert({
              type: `${actorRole}_${isUpdatingSettlement ? 'liquidation_updated' : 'liquidation_created'}`,
              priority: 75,
              title: isUpdatingSettlement ? 'Liquidacion actualizada' : 'Liquidacion registrada',
              message: `${userProfile?.name || actorEmail} ${isUpdatingSettlement ? 'actualizo' : 'registro'} liquidacion de ${userToLiquidate.name || normalizedUserEmail} para ${liquidationDate}: balance USD ${liquidationBalance.toFixed(2)}, ${previewAmountDirection === 'sent' ? 'enviado' : 'recibido'} USD ${paid.toFixed(2)}.`,
              createdByEmail: actorEmail,
              createdByRole: actorRole,
              metadata: {
                actorName: userProfile?.name || '',
                actorSellerId: userProfile?.sellerId || '',
                actorRole,
                targetEmail: normalizedUserEmail,
                targetName: userToLiquidate.name || '',
                targetSellerId: userToLiquidate.sellerId || '',
                date: liquidationDate,
                totalSales,
                totalCommissions,
                totalPrizes,
                totalInjections,
                operationalProfit,
                liquidationBalance,
                amountDirection: previewAmountDirection,
                amountReceived: finalAmountReceived,
                amountSent: finalAmountSent,
                amountEntered: paid,
                debtAdded: finalDebtAdded,
                newTotalDebt: finalNewTotalDebt,
                settlementId: effectiveSettlementId,
              },
              actionRef: `settlements/${effectiveSettlementId}`,
            }).catch((error) => {
              console.error('App alert failed (liquidation save):', error);
            });
          }

          toastSuccess(isUpdatingSettlement ? 'Liquidacion actualizada correctamente' : 'Liquidacion guardada correctamente');
          setAmountPaid(String(paid));
          setAmountDirection(previewAmountDirection);
        } catch (error) {
          onError(error, 'write', 'settlements');
        }
      },
    }));
  };

  const handleLiquidateRange = async (targetDate?: string) => {
    if (!selectedUserToLiquidate) {
      toast.error('Selecciona un vendedor para liquidar el rango');
      return;
    }

    if (!userProfile || !['ceo', 'admin'].includes(userProfile.role)) {
      toast.error('No tienes permisos para liquidar');
      return;
    }

    if (!liquidationRangeReport) {
      toast.error('Primero consulta el rango');
      return;
    }

    const userToLiquidate = users.find((userItem: any) => normalizeEmail(userItem.email) === normalizeEmail(selectedUserToLiquidate));
    if (!userToLiquidate) {
      toast.error('No se encontro el vendedor');
      return;
    }

    const targetDay = typeof targetDate === 'string' && targetDate ? targetDate : null;
    const pendingDays = (liquidationRangeReport.days || []).filter((day: any) => (
      Math.abs(Number(day?.pending || 0)) > BALANCE_EPSILON
    )).filter((day: any) => (
      targetDay ? String(day?.date || '') === targetDay : true
    ));

    if (pendingDays.length === 0) {
      toast.success(targetDay ? 'Ese dia no tiene pendiente' : 'El rango no tiene dias pendientes');
      return;
    }

    const totalToReceive = pendingDays.reduce((sum: number, day: any) => {
      const pending = Number(day.pending || 0);
      return pending > 0 ? sum + pending : sum;
    }, 0);
    const totalToSend = pendingDays.reduce((sum: number, day: any) => {
      const pending = Number(day.pending || 0);
      return pending < 0 ? sum + Math.abs(pending) : sum;
    }, 0);
    const rangeLabel = targetDay || `${liquidationRangeReport.startDate} a ${liquidationRangeReport.endDate}`;
    const scopeLabel = targetDay ? 'dia' : 'rango';

    setConfirmModal((prev: any) => ({
      ...prev,
      show: true,
      title: targetDay ? 'Confirmar Liquidacion del Dia' : 'Confirmar Liquidacion por Rango',
      message: `Seguro de liquidar por completo a ${userToLiquidate.name || userToLiquidate.email} del ${scopeLabel} ${rangeLabel}?\n\nDias pendientes: ${pendingDays.length}\nTotal a recibir: USD ${totalToReceive.toFixed(2)}\nTotal a enviar: USD ${totalToSend.toFixed(2)}\n\nEsta accion cerrara por completo ${targetDay ? 'el dia seleccionado' : 'cada dia pendiente dentro del rango mostrado'}.`,
      onConfirm: async () => {
        setIsLiquidationRangeLoading(true);
        try {
          const normalizedUserEmail = normalizeEmail(userToLiquidate.email);
          let rollingDebt = Number(userToLiquidate.currentDebt || 0);
          const settlementRecords: Settlement[] = [];
          const currentDayTicketSettlements = new Map<string, string>();
          const currentDayInjectionSettlements = new Map<string, string>();
          let appliedAmountReceived = 0;
          let appliedAmountSent = 0;
          const closedDayAdjustments = new Map<string, {
            received: number;
            sent: number;
            settlementId: string;
          }>();

          for (const reportDay of pendingDays) {
            const dateValue = String(reportDay.date || '');
            if (!dateValue) continue;

            const dayData = await fetchLiquidationDayData(dateValue, normalizedUserEmail);
            const uniqueTickets = dedupeById<LotteryTicket>(dayData.tickets as LotteryTicket[]);
            const uniqueInjections = dedupeById<Injection>(dayData.injections as Injection[]);
            const uniqueSettlements = dedupeById<Settlement>(dayData.settlements as Settlement[]);
            const uniqueResults = dedupeById<LotteryResult>(dayData.results as LotteryResult[]);

            const financialSummary = buildFinancialSummary({
              tickets: uniqueTickets,
              injections: uniqueInjections,
              settlements: uniqueSettlements,
              userEmail: normalizedUserEmail,
              targetDate: dateValue,
              prizeResolver: (ticketItem: LotteryTicket) => getTicketPrizesFromSource(ticketItem, uniqueResults),
            });

            const existingSettlement = findLatestSettlementForUserDate({
              settlements: uniqueSettlements,
              userEmail: normalizedUserEmail,
              targetDate: dateValue,
            });
            const otherSettlements = existingSettlement
              ? uniqueSettlements.filter((settlement) => settlement.id !== existingSettlement.id)
              : uniqueSettlements;
            const otherAmountReceived = otherSettlements.reduce((sum, settlement) => sum + getSettlementAmountReceived(settlement), 0);
            const otherAmountSent = otherSettlements.reduce((sum, settlement) => sum + getSettlementAmountSent(settlement), 0);
            const totalAmountReceived = uniqueSettlements.reduce((sum, settlement) => sum + getSettlementAmountReceived(settlement), 0);
            const totalAmountSent = uniqueSettlements.reduce((sum, settlement) => sum + getSettlementAmountSent(settlement), 0);
            const totalSales = Number(financialSummary.totalSales || 0);
            const totalCommissions = Number(financialSummary.totalCommissions || 0);
            const totalPrizes = Number(financialSummary.totalPrizes || 0);
            const totalInjections = Number(financialSummary.totalInjections || 0);
            const operationalProfit = Number(financialSummary.operationalProfit ?? financialSummary.netProfit ?? 0);
            const liquidationBalance = operationalProfit + totalInjections;
            const freshPending = liquidationBalance - totalAmountReceived + totalAmountSent;

            if (Math.abs(freshPending) <= BALANCE_EPSILON) continue;
            appliedAmountReceived += freshPending > 0 ? freshPending : 0;
            appliedAmountSent += freshPending < 0 ? Math.abs(freshPending) : 0;

            const finalSettlementNet = liquidationBalance - otherAmountReceived + otherAmountSent;
            const finalAmountDirection = finalSettlementNet < 0 ? 'sent' : 'received';
            const finalAmountReceived = finalSettlementNet >= 0 ? finalSettlementNet : 0;
            const finalAmountSent = finalSettlementNet < 0 ? Math.abs(finalSettlementNet) : 0;
            const finalAmountEntered = Math.abs(finalSettlementNet);
            const existingDebtImpact = Number(existingSettlement?.debtAdded || 0);
            const previousDebt = rollingDebt - existingDebtImpact;
            const finalDebtAdded = 0;
            const finalNewTotalDebt = previousDebt + finalDebtAdded;

            const settlementPayload = {
              userEmail: normalizedUserEmail,
              sellerEmail: normalizedUserEmail,
              sellerId: userToLiquidate.sellerId || null,
              date: dateValue,
              totalSales,
              totalCommissions,
              totalPrizes,
              totalInjections,
              sales: totalSales,
              prizes: totalPrizes,
              commission: totalCommissions,
              dailyResult: operationalProfit,
              dailyInjectionTotal: totalInjections,
              previousBalance: previousDebt,
              finalBalance: finalNewTotalDebt,
              operationalProfit,
              liquidationBalance,
              netProfit: operationalProfit,
              net: operationalProfit,
              amountPaid: finalAmountReceived,
              amountDirection: finalAmountDirection,
              amountReceived: finalAmountReceived,
              amountSent: finalAmountSent,
              amountEntered: finalAmountEntered,
              debtAdded: finalDebtAdded,
              previousDebt,
              newTotalDebt: finalNewTotalDebt,
              status: 'closed',
              closed: true,
              closedAt: serverTimestamp(),
              closedByEmail: userProfile?.email,
              liquidatedBy: userProfile?.email,
              updatedAt: serverTimestamp(),
            };

            let settlementId = existingSettlement?.id || '';
            if (existingSettlement) {
              await updateDoc(doc(db, 'settlements', existingSettlement.id), settlementPayload);
            } else {
              const settlementRef = await addDoc(collection(db, 'settlements'), {
                ...settlementPayload,
                timestamp: serverTimestamp(),
              });
              settlementId = settlementRef.id;
            }

            const effectiveSettlementId = settlementId || existingSettlement?.id || '';
            rollingDebt = finalNewTotalDebt;
            settlementRecords.push({
              id: effectiveSettlementId,
              userEmail: normalizedUserEmail,
              sellerId: userToLiquidate.sellerId || null,
              date: dateValue,
              totalSales,
              totalCommissions,
              totalPrizes,
              totalInjections,
              sales: totalSales,
              prizes: totalPrizes,
              commission: totalCommissions,
              dailyResult: operationalProfit,
              dailyInjectionTotal: totalInjections,
              previousBalance: previousDebt,
              finalBalance: finalNewTotalDebt,
              operationalProfit,
              liquidationBalance,
              netProfit: operationalProfit,
              net: operationalProfit,
              amountPaid: finalAmountReceived,
              amountDirection: finalAmountDirection,
              amountReceived: finalAmountReceived,
              amountSent: finalAmountSent,
              amountEntered: finalAmountEntered,
              debtAdded: finalDebtAdded,
              previousDebt,
              newTotalDebt: finalNewTotalDebt,
              status: 'closed',
              closed: true,
              closedByEmail: userProfile?.email,
              liquidatedBy: userProfile?.email,
              timestamp: existingSettlement?.timestamp,
            } as Settlement);

            closedDayAdjustments.set(dateValue, {
              received: freshPending > 0 ? freshPending : 0,
              sent: freshPending < 0 ? Math.abs(freshPending) : 0,
              settlementId: effectiveSettlementId,
            });

            if (dateValue === businessDayKey && effectiveSettlementId) {
              const ticketsToLiquidate = financialSummary.tickets.filter((ticket: LotteryTicket) =>
                ticket.status === 'active' && !ticket.settlementId && !ticket.liquidated
              );
              const injectionsToLiquidate = financialSummary.injections.filter((injection: Injection) =>
                !injection.settlementId && !injection.liquidated
              );

              for (let i = 0; i < ticketsToLiquidate.length; i += 450) {
                const chunk = ticketsToLiquidate.slice(i, i + 450);
                const batch = writeBatch(db);
                chunk.forEach((ticket: LotteryTicket) => {
                  currentDayTicketSettlements.set(ticket.id, effectiveSettlementId);
                  batch.update(doc(db, 'tickets', ticket.id), {
                    status: 'liquidated',
                    liquidated: true,
                    settlementId: effectiveSettlementId,
                  });
                });
                await batch.commit();
              }

              for (let i = 0; i < injectionsToLiquidate.length; i += 500) {
                const chunk = injectionsToLiquidate.slice(i, i + 500);
                const batch = writeBatch(db);
                chunk.forEach((injection: Injection) => {
                  currentDayInjectionSettlements.set(injection.id, effectiveSettlementId);
                  batch.update(doc(db, 'injections', injection.id), {
                    liquidated: true,
                    settlementId: effectiveSettlementId,
                  });
                });
                await batch.commit();
              }
            }
          }

          if (settlementRecords.length === 0) {
            toast.success('El rango ya estaba liquidado');
            return;
          }

          await updateDoc(doc(db, 'users', userToLiquidate.email), { currentDebt: rollingDebt });
          if (typeof setUsers === 'function') {
            setUsers((prev: any[]) => prev.map((userItem) => (
              normalizeEmail(userItem.email) === normalizedUserEmail
                ? { ...userItem, currentDebt: rollingDebt }
                : userItem
            )));
          }

          if (currentDayTicketSettlements.size > 0) {
            setTickets((prev: LotteryTicket[]) => prev.map(ticket => (
              currentDayTicketSettlements.has(ticket.id)
                ? { ...ticket, liquidated: true, settlementId: currentDayTicketSettlements.get(ticket.id), status: 'liquidated' as any }
                : ticket
            )));
          }
          if (currentDayInjectionSettlements.size > 0) {
            setInjections((prev: Injection[]) => prev.map(injection => (
              currentDayInjectionSettlements.has(injection.id)
                ? { ...injection, liquidated: true, settlementId: currentDayInjectionSettlements.get(injection.id) }
                : injection
            )));
          }

          const upsertSettlements = (items: Settlement[]) => {
            const map = new Map(items.map(item => [item.id, item]));
            settlementRecords.forEach((record) => {
              map.set(record.id, { ...(map.get(record.id) || {}), ...record });
            });
            return Array.from(map.values());
          };

          setLiquidationSettlementsSnapshot((prev: Settlement[]) => upsertSettlements(prev));
          if (typeof setSettlements === 'function') {
            setSettlements((prev: Settlement[]) => upsertSettlements(prev));
          }

          setLiquidationRangeReport((prev: any) => {
            if (!prev) return prev;
            const days = (prev.days || []).map((day: any) => {
              const adjustment = closedDayAdjustments.get(String(day.date || ''));
              if (!adjustment) return day;
              return {
                ...day,
                amountReceived: Number(day.amountReceived || 0) + adjustment.received,
                amountSent: Number(day.amountSent || 0) + adjustment.sent,
                pending: 0,
                settlementId: adjustment.settlementId,
                status: 'liquidated',
              };
            });
            const summary = days.reduce((acc: any, day: any) => ({
              totalSales: acc.totalSales + Number(day.totalSales || 0),
              totalPrizes: acc.totalPrizes + Number(day.totalPrizes || 0),
              totalCommissions: acc.totalCommissions + Number(day.totalCommissions || 0),
              totalInjections: acc.totalInjections + Number(day.totalInjections || 0),
              operationalProfit: acc.operationalProfit + Number(day.operationalProfit || 0),
              capital: acc.capital + Number(day.capital || 0),
              amountReceived: acc.amountReceived + Number(day.amountReceived || 0),
              amountSent: acc.amountSent + Number(day.amountSent || 0),
              pending: acc.pending + Number(day.pending || 0),
            }), {
              totalSales: 0,
              totalPrizes: 0,
              totalCommissions: 0,
              totalInjections: 0,
              operationalProfit: 0,
              capital: 0,
              amountReceived: 0,
              amountSent: 0,
              pending: 0,
            });

            return { ...prev, days, summary };
          });

          const actorEmail = String(userProfile?.email || '').toLowerCase();
          const actorRole = String(userProfile?.role || '').toLowerCase();
          if (actorEmail && (actorRole === 'admin' || actorRole === 'ceo')) {
            await createCeoAdminAlert({
              type: `${actorRole}_liquidation_range_closed`,
              priority: 78,
              title: targetDay ? 'Liquidacion de dia registrada' : 'Liquidacion por rango registrada',
              message: `${userProfile?.name || actorEmail} liquido ${scopeLabel} de ${userToLiquidate.name || normalizedUserEmail} del ${rangeLabel}: recibido USD ${appliedAmountReceived.toFixed(2)}, enviado USD ${appliedAmountSent.toFixed(2)}.`,
              createdByEmail: actorEmail,
              createdByRole: actorRole,
              metadata: {
                actorName: userProfile?.name || '',
                actorSellerId: userProfile?.sellerId || '',
                actorRole,
                targetEmail: normalizedUserEmail,
                targetName: userToLiquidate.name || '',
                targetSellerId: userToLiquidate.sellerId || '',
                startDate: liquidationRangeReport.startDate,
                endDate: liquidationRangeReport.endDate,
                date: targetDay || '',
                daysClosed: settlementRecords.length,
                amountReceived: appliedAmountReceived,
                amountSent: appliedAmountSent,
                settlementIds: settlementRecords.map((record) => record.id),
                newTotalDebt: rollingDebt,
              },
              actionRef: targetDay
                ? `settlements/range/${normalizedUserEmail}/${targetDay}`
                : `settlements/range/${normalizedUserEmail}/${liquidationRangeReport.startDate}/${liquidationRangeReport.endDate}`,
            }).catch((error) => {
              console.error('App alert failed (range liquidation save):', error);
            });
          }

          toastSuccess(targetDay
            ? `Dia ${targetDay} liquidado por completo`
            : `Rango liquidado por completo (${settlementRecords.length} dia${settlementRecords.length === 1 ? '' : 's'})`);
        } catch (error) {
          onError(error, 'write', 'settlements');
        } finally {
          setIsLiquidationRangeLoading(false);
        }
      },
    }));
  };

  const generateConsolidatedReport = async () => {
    const canGenerateConsolidatedReport = ['ceo', 'admin'].includes(String(userProfile?.role || '').toLowerCase());

    if (!canGenerateConsolidatedReport) {
      toast.error('Solo CEO o admin puede generar este reporte');
      return;
    }

    const reportStartDate = consolidatedMode === 'day' ? consolidatedReportDate : consolidatedStartDate;
    const reportEndDate = consolidatedMode === 'day' ? consolidatedReportDate : consolidatedEndDate;

    if (!reportStartDate || !reportEndDate) {
      toast.error('Selecciona el rango de fechas del consolidado');
      return;
    }

    if (reportStartDate > reportEndDate) {
      toast.error('La fecha inicial no puede ser mayor que la fecha final');
      return;
    }

    const { start } = getBusinessDayRange(reportStartDate);
    const { end } = getBusinessDayRange(reportEndDate);

    const toastId = toast.loading(`Generando consolidado ${reportStartDate} -> ${reportEndDate}...`);
    setIsGeneratingYesterdayReport(true);

    try {
      const [ticketsSnap, injectionsSnap, settlementsSnap, resultsSnap, archivesSnap] = await Promise.all([
        getDocs(query(collection(db, 'tickets'), where('timestamp', '>=', start), where('timestamp', '<', end), limit(5000))),
        getDocs(query(collection(db, 'injections'), where('date', '>=', reportStartDate), where('date', '<=', reportEndDate), limit(3000))),
        getDocs(query(collection(db, 'settlements'), where('date', '>=', reportStartDate), where('date', '<=', reportEndDate), limit(3000))),
        getDocs(query(collection(db, 'results'), where('date', '>=', reportStartDate), where('date', '<=', reportEndDate), limit(300))),
        getDocs(query(collection(db, 'daily_archives'), where('date', '>=', reportStartDate), where('date', '<=', reportEndDate), limit(120))),
      ]);

      const archivedPayload = archivesSnap.docs.map((d: any) => d.data() as {
        tickets?: LotteryTicket[];
        injections?: Injection[];
        settlements?: Settlement[];
        results?: LotteryResult[];
      });

      const dedupeById = <T extends { id?: string }>(items: T[]) => {
        const map = new Map<string, T>();
        items.forEach((item, index) => {
          const key = item?.id || `no-id-${index}`;
          if (!map.has(key)) map.set(key, item);
        });
        return Array.from(map.values());
      };

      const reportTickets = dedupeById([
        ...ticketsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as LotteryTicket)),
        ...archivedPayload.flatMap(item => item.tickets || []),
      ]).filter(t => String(t.status || '').toLowerCase() !== 'cancelled');

      const reportInjections = dedupeById([
        ...injectionsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as Injection)),
        ...archivedPayload.flatMap(item => item.injections || []),
      ]);

      const reportSettlements = dedupeById([
        ...settlementsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as Settlement)),
        ...archivedPayload.flatMap(item => item.settlements || []),
      ]);

      const reportResults = dedupeById([
        ...resultsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as LotteryResult)),
        ...archivedPayload.flatMap(item => item.results || []),
      ]);

      const normalizeText = (value?: string) => (value || '').toLowerCase().trim();
      const toDate = (value: any) => {
        if (!value) return null;
        if (typeof value.toDate === 'function') return value.toDate();
        if (value instanceof Date) return value;
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
      };
      const getTicketTime = (ticket: LotteryTicket) => {
        const ticketDate = toDate(ticket.timestamp);
        return ticketDate ? format(ticketDate, 'hh:mm a') : '--:--';
      };
      const getTicketSortValue = (ticket: LotteryTicket) => {
        const ticketDate = toDate(ticket.timestamp);
        return ticketDate ? ticketDate.getTime() : 0;
      };
      const fallbackTimeSortValue = (time?: string) => {
        const [h, m] = String(time || '00:00').split(':').map(Number);
        let value = (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
        if (value < 11 * 60) value += 24 * 60;
        return value;
      };
      const lotteryMetaByName = new Map<string, { name: string; drawTime: string; sortValue: number }>(
        (lotteries || []).map((lottery: any) => {
          const drawTime = lottery?.drawTime || '00:00';
          const sortValue = typeof getOperationalTimeSortValue === 'function'
            ? getOperationalTimeSortValue(drawTime)
            : fallbackTimeSortValue(drawTime);
          return [normalizeText(lottery?.name), {
            name: lottery?.name || 'Sorteo',
            drawTime,
            sortValue,
          }];
        })
      );
      const getLotteryMeta = (lotteryName?: string) => {
        const key = normalizeText(lotteryName);
        return lotteryMetaByName.get(key) || {
          name: lotteryName || 'Sorteo',
          drawTime: '--:--',
          sortValue: 99999,
        };
      };
      const usersByEmail = new Map<string, any>(
        (users || [])
          .filter((userItem: any) => userItem?.email)
          .map((userItem: any) => [normalizeText(userItem.email), userItem])
      );
      const reportUsersMap = new Map<string, any>();

      const ensureUser = (key: string, fallback: any = {}) => {
        const normalizedEmail = normalizeText(fallback.email);
        const knownUser = normalizedEmail ? usersByEmail.get(normalizedEmail) : null;
        if (!reportUsersMap.has(key)) {
          reportUsersMap.set(key, {
            key,
            email: normalizedEmail || fallback.email || '',
            name: knownUser?.name || fallback.name || fallback.email || 'Usuario',
            sellerId: knownUser?.sellerId || fallback.sellerId,
            tickets: [],
            summary: {
              totalSales: 0,
              totalCommissions: 0,
              totalPrizes: 0,
              totalInjections: 0,
              totalLiquidations: 0,
              totalReceived: 0,
              totalSent: 0,
              pending: 0,
              operationalProfit: 0,
              liquidationBalance: 0,
              netProfit: 0,
            },
          });
        }
        return reportUsersMap.get(key);
      };

      reportTickets.forEach(ticket => {
        const email = normalizeText(ticket.sellerEmail);
        const key = email ? `email:${email}` : `seller:${normalizeText(ticket.sellerId || ticket.sellerCode)}`;
        const u = ensureUser(key, {
          email,
          name: ticket.sellerName,
          sellerId: ticket.sellerId || ticket.sellerCode,
        });
        u.tickets.push(ticket);
      });

      reportInjections.forEach(injection => {
        const email = normalizeText(injection.userEmail);
        if (!email) return;
        ensureUser(`email:${email}`, {
          email,
          sellerId: injection.sellerId,
        });
      });

      reportSettlements.forEach(settlement => {
        const email = normalizeText(settlement.userEmail);
        if (!email) return;
        ensureUser(`email:${email}`, {
          email,
          sellerId: settlement.sellerId,
        });
      });

      reportUsersMap.forEach((u: any) => {
        const email = normalizeText(u.email);
        const userTickets = u.tickets as LotteryTicket[];
        const userInjections = email ? reportInjections.filter(inj => normalizeText(inj.userEmail) === email && (inj.type || 'injection') === 'injection') : [];
        const userSettlements = email ? reportSettlements.filter(st => normalizeText(st.userEmail) === email) : [];

        const totalSales = userTickets.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
        const totalCommissions = userTickets.reduce((sum, t) => sum + ((t.totalAmount || 0) * ((t.commissionRate || 0) / 100)), 0);
        const totalPrizes = userTickets.reduce((sum, t) => sum + (getTicketPrizesFromSource(t, reportResults).totalPrize || 0), 0);
        const totalInjections = userInjections.reduce((sum, i) => sum + (i.amount || 0), 0);
        const totalReceived = userSettlements.reduce((sum, s) => sum + Number(s.amountReceived ?? s.amountPaid ?? 0), 0);
        const totalSent = userSettlements.reduce((sum, s) => sum + Number(s.amountSent ?? 0), 0);
        const totalLiquidations = totalReceived - totalSent;
        const operationalProfit = totalSales - totalCommissions - totalPrizes;
        const liquidationBalance = operationalProfit;
        const pending = operationalProfit + totalInjections - totalReceived + totalSent;
        u.summary = {
          totalSales,
          totalCommissions,
          totalPrizes,
          totalInjections,
          totalLiquidations,
          totalReceived,
          totalSent,
          pending,
          operationalProfit,
          liquidationBalance,
          netProfit: operationalProfit,
        };
      });

      const reportUsers = Array.from(reportUsersMap.values()).filter((u: any) => (
        u.summary.totalSales > 0 ||
        u.summary.totalPrizes > 0 ||
        u.summary.totalInjections > 0 ||
        u.summary.totalLiquidations > 0
      )).sort((a: any, b: any) => a.name.localeCompare(b.name));

      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      const marginX = 6;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const maxWidth = pageWidth - (marginX * 2);
      const lineHeight = 3.55;
      let y = 8;

      const ensureSpace = (lines = 1) => {
        if (y + (lines * lineHeight) > pageHeight - 7) {
          pdf.addPage();
          y = 8;
        }
      };

      const fitText = (text: string, width: number, size = 6.7) => {
        pdf.setFontSize(size);
        const safeText = String(text || '-');
        if (pdf.getTextWidth(safeText) <= width) return safeText;

        let trimmed = safeText;
        while (trimmed.length > 4 && pdf.getTextWidth(`${trimmed}...`) > width) {
          trimmed = trimmed.slice(0, -1);
        }
        return `${trimmed}...`;
      };

      const formatCompactMoney = (value?: number) => Number(value || 0).toFixed(2);

      const writeLine = (text: string, font: 'normal' | 'bold' = 'normal', size = 7.5) => {
        pdf.setFont('helvetica', font);
        pdf.setFontSize(size);
        const lines = pdf.splitTextToSize(text, maxWidth) as string[];
        lines.forEach((line: string) => {
          ensureSpace(1);
          pdf.text(line, marginX, y);
          y += lineHeight;
        });
      };

      const writeSection = (title: string) => {
        ensureSpace(2);
        y += 1.2;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8.3);
        pdf.text(title, marginX, y);
        pdf.line(marginX, y + 1.3, pageWidth - marginX, y + 1.3);
        y += 4.2;
      };

      const writeMetricGrid = (metrics: Array<[string, string | number]>) => {
        const colWidth = maxWidth / 3;
        for (let i = 0; i < metrics.length; i += 3) {
          ensureSpace(1);
          metrics.slice(i, i + 3).forEach(([label, value], colIndex) => {
            const text = `${label}: ${value}`;
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(6.7);
            pdf.text(fitText(text, colWidth - 2, 6.7), marginX + (colIndex * colWidth), y);
          });
          y += 3.6;
        }
      };

      const writeTableRow = (
        cells: Array<string | number>,
        widths: number[],
        options: { bold?: boolean; size?: number; height?: number } = {}
      ) => {
        const size = options.size || 6.6;
        const rowHeight = options.height || 3.8;
        ensureSpace(1);
        pdf.setFont('helvetica', options.bold ? 'bold' : 'normal');
        pdf.setFontSize(size);
        let x = marginX;
        cells.forEach((cell, index) => {
          pdf.text(fitText(String(cell ?? '-'), widths[index] - 1.5, size), x, y);
          x += widths[index];
        });
        y += rowHeight;
      };

      const writeTicketRow = (
        cells: Array<string | number>,
        widths: number[],
        betSegments: Array<{ text: string; bold?: boolean }>
      ) => {
        const size = 6.1;
        const rowHeight = 3.3;
        const betSize = 5.8;
        const betLineHeight = 3.15;
        const separatorBottomSpace = 1.4;
        const betLineStart = marginX + 2;
        const betLineEnd = pageWidth - marginX;
        const betLineWidth = betLineEnd - betLineStart;
        const safeBetSegments = betSegments.length > 0 ? betSegments : [{ text: 'Jugadas: -' }];
        const getSegmentWidth = (segment: { text: string; bold?: boolean }) => {
          pdf.setFont('helvetica', segment.bold ? 'bold' : 'normal');
          pdf.setFontSize(betSize);
          return pdf.getTextWidth(segment.text);
        };
        let measuredLineWidth = 0;
        let measuredLines = 1;
        safeBetSegments.forEach((segment) => {
          const segmentWidth = getSegmentWidth(segment);
          if (measuredLineWidth > 0 && measuredLineWidth + segmentWidth > betLineWidth) {
            measuredLines += 1;
            measuredLineWidth = 0;
          }
          measuredLineWidth += segmentWidth;
        });

        ensureSpace(2 + measuredLines);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(size);

        let x = marginX;
        cells.forEach((cell, index) => {
          pdf.text(fitText(String(cell ?? '-'), widths[index] - 1.5, size), x, y);
          x += widths[index];
        });
        y += rowHeight;

        let betX = betLineStart;
        safeBetSegments.forEach((segment) => {
          const segmentWidth = getSegmentWidth(segment);
          if (betX > betLineStart && betX + segmentWidth > betLineEnd) {
            y += betLineHeight;
            betX = betLineStart;
          }
          pdf.setFont('helvetica', segment.bold ? 'bold' : 'normal');
          pdf.setFontSize(betSize);
          pdf.text(segment.text, betX, y);
          betX += segmentWidth;
        });
        y += betLineHeight;
        pdf.setDrawColor(190);
        pdf.setLineWidth(0.08);
        pdf.line(marginX, y - 0.65, pageWidth - marginX, y - 0.65);
        y += separatorBottomSpace;
      };

      const globalSales = reportUsers.reduce((acc: number, u: any) => acc + u.summary.totalSales, 0);
      const globalPrizes = reportUsers.reduce((acc: number, u: any) => acc + u.summary.totalPrizes, 0);
      const globalInjections = reportUsers.reduce((acc: number, u: any) => acc + u.summary.totalInjections, 0);
      const globalCommissions = reportUsers.reduce((acc: number, u: any) => acc + u.summary.totalCommissions, 0);
      const globalLiquidations = reportUsers.reduce((acc: number, u: any) => acc + u.summary.totalLiquidations, 0);
      const globalReceived = reportUsers.reduce((acc: number, u: any) => acc + u.summary.totalReceived, 0);
      const globalSent = reportUsers.reduce((acc: number, u: any) => acc + u.summary.totalSent, 0);
      const globalPending = reportUsers.reduce((acc: number, u: any) => acc + u.summary.pending, 0);
      const globalOperationalProfit = globalSales - globalCommissions - globalPrizes;

      writeLine('REPORTE CONSOLIDADO EJECUTIVO', 'bold', 12);
      writeLine(`Periodo: ${reportStartDate} -> ${reportEndDate} | Generado: ${format(new Date(), 'dd/MM/yyyy hh:mm a')} | Montos en USD`, 'normal', 7);
      writeSection('RESUMEN GLOBAL');
      writeMetricGrid([
        ['Usuarios', reportUsers.length],
        ['Ventas', formatCompactMoney(globalSales)],
        ['Premios', formatCompactMoney(globalPrizes)],
        ['Comisiones', formatCompactMoney(globalCommissions)],
        ['Utilidad', formatCompactMoney(globalOperationalProfit)],
        ['Inyecciones', formatCompactMoney(globalInjections)],
        ['Recibido', formatCompactMoney(globalReceived)],
        ['Enviado', formatCompactMoney(globalSent)],
        ['Liquidado neto', formatCompactMoney(globalLiquidations)],
        ['Por liquidar', formatCompactMoney(globalPending)],
      ]);

      writeSection('RESUMEN GLOBAL POR USUARIO');
      if (reportUsers.length === 0) {
        writeLine('Sin usuarios con actividad en el periodo seleccionado.');
      }

      const userSummaryWidths = [7, 44, 20, 20, 18, 20, 18, 17, 17, 17];
      writeTableRow(
        ['#', 'Usuario', 'Ventas', 'Premios', 'Comis.', 'Utilidad', 'Iny.', 'Recib.', 'Env.', 'Pend.'],
        userSummaryWidths,
        { bold: true, size: 5.9, height: 3.5 }
      );
      reportUsers.forEach((u: any, index: number) => {
        const s = u.summary;
        writeTableRow(
          [
            index + 1,
            `${u.sellerId || 'SIN ID'} ${u.name || u.email || ''}`,
            formatCompactMoney(s.totalSales),
            formatCompactMoney(s.totalPrizes),
            formatCompactMoney(s.totalCommissions),
            formatCompactMoney(s.operationalProfit),
            formatCompactMoney(s.totalInjections),
            formatCompactMoney(s.totalReceived),
            formatCompactMoney(s.totalSent),
            formatCompactMoney(s.pending),
          ],
          userSummaryWidths,
          { size: 5.8, height: 3.35 }
        );
      });

      if (consolidatedMode === 'day') {
        writeSection('DETALLE DE VENTAS POR USUARIO');
        const ticketWidths = [7, 54, 55, 27, 27, 28];
        reportUsers.forEach((u: any) => {
          const userTickets = (u.tickets as LotteryTicket[])
            .slice()
            .sort((a, b) => getTicketSortValue(a) - getTicketSortValue(b));

          if (userTickets.length === 0) return;

          ensureSpace(3);
          y += 1;
          writeLine(`${u.sellerId || 'SIN ID'} - ${u.name || u.email || 'Usuario'} (${userTickets.length} ticket${userTickets.length === 1 ? '' : 's'})`, 'bold', 7.2);
          writeTableRow(
            ['#', 'Ticket / Hora', 'Cliente', 'Total', 'Premio', 'Comis.'],
            ticketWidths,
            { bold: true, size: 6.2, height: 3.5 }
          );

          const groupsByLottery = new Map<string, {
            name: string;
            drawTime: string;
            sortValue: number;
            rows: Array<{ ticket: LotteryTicket; bets: Array<{ bet: any; idx: number }> }>;
          }>();

          userTickets.forEach((ticket) => {
            const ticketBets = (ticket.bets || []).map((bet, idx) => ({ bet, idx }));
            const lotteryNames = Array.from(new Set(ticketBets.map(({ bet }) => bet.lottery).filter(Boolean)));
            lotteryNames.forEach((lotteryName) => {
              const meta = getLotteryMeta(lotteryName);
              const key = normalizeText(lotteryName);
              if (!groupsByLottery.has(key)) {
                groupsByLottery.set(key, {
                  name: meta.name,
                  drawTime: meta.drawTime,
                  sortValue: meta.sortValue,
                  rows: [],
                });
              }
              groupsByLottery.get(key)?.rows.push({
                ticket,
                bets: ticketBets.filter(({ bet }) => normalizeText(bet.lottery) === key),
              });
            });
          });

          Array.from(groupsByLottery.values())
            .sort((a, b) => a.sortValue - b.sortValue || a.name.localeCompare(b.name))
            .forEach((group) => {
              ensureSpace(2);
              pdf.setFont('helvetica', 'bold');
              pdf.setFontSize(6.8);
              pdf.text(`Sorteo: ${group.name} (${group.drawTime || '--:--'})`, marginX, y);
              y += 3.6;

              group.rows
                .sort((a, b) => getTicketSortValue(a.ticket) - getTicketSortValue(b.ticket))
                .forEach(({ ticket, bets }, ticketIndex) => {
                  const ticketAmount = bets.reduce((sum, row) => sum + Number(row.bet.amount || 0), 0);
                  const ticketPrizes = getTicketPrizesFromSource(ticket, reportResults, group.name);
                  const ticketPrize = ticketPrizes.totalPrize || 0;
                  const winningIndexes = new Set((ticketPrizes.winningBets || []).map((winningBet: any) => winningBet.idx));
                  const ticketCommission = ticketAmount * (Number(ticket.commissionRate || 0) / 100);
                  const ticketRef = ticket.sequenceNumber || ticket.id || `Ticket ${ticketIndex + 1}`;
                  const betSegments: Array<{ text: string; bold?: boolean }> = [{ text: 'Jugadas: ' }];
                  bets.forEach(({ bet, idx }, betIndex) => {
                    const suffix = `${betIndex < bets.length - 1 ? ' ; ' : ''}`;
                    if (winningIndexes.has(idx)) {
                      betSegments.push({
                        text: `${bet.type} ${bet.number} x${Number(bet.quantity || 1)}=${formatCompactMoney(bet.amount)}`,
                        bold: true,
                      });
                      if (suffix) {
                        betSegments.push({ text: suffix });
                      }
                    } else {
                      betSegments.push({ text: `${bet.type} ${bet.number} x${Number(bet.quantity || 1)}=${formatCompactMoney(bet.amount)}${suffix}` });
                    }
                  });
                  writeTicketRow(
                    [
                      ticketIndex + 1,
                      `${ticketRef} / ${getTicketTime(ticket)}`,
                      ticket.customerName || 'General',
                      formatCompactMoney(ticketAmount),
                      formatCompactMoney(ticketPrize),
                      formatCompactMoney(ticketCommission),
                    ],
                    ticketWidths,
                    betSegments
                  );
                });
          });
        });
      } else {
        y += 1.5;
        writeLine('Modo rango: resumen global y resumen global por usuario entre las fechas seleccionadas.', 'normal', 6.8);
      }

      pdf.save(`Reporte-Consolidado-${reportStartDate}-a-${reportEndDate}.pdf`);
      toastSuccess(`Reporte consolidado listo (${reportStartDate} -> ${reportEndDate})`, { id: toastId });
    } catch (error) {
      toast.error('No se pudo generar el reporte consolidado', { id: toastId });
    } finally {
      setIsGeneratingYesterdayReport(false);
    }
  };

  return {
    consolidatedMode,
    setConsolidatedMode,
    consolidatedReportDate,
    setConsolidatedReportDate,
    consolidatedStartDate,
    setConsolidatedStartDate,
    consolidatedEndDate,
    setConsolidatedEndDate,
    isGeneratingYesterdayReport,
    liquidationDate,
    setLiquidationDate,
    selectedUserToLiquidate,
    setSelectedUserToLiquidate,
    amountPaid,
    setAmountPaid,
    amountDirection,
    setAmountDirection,
    selectedLiquidationSettlement,
    liquidationPreview,
    liquidationGlobalSummary,
    liquidationUserSummaries,
    liquidacionQuickDateOptions,
    liquidationRangeStartDate,
    setLiquidationRangeStartDate,
    liquidationRangeEndDate,
    setLiquidationRangeEndDate,
    liquidationRangeReport,
    isLiquidationRangeLoading,
    fetchLiquidationRangeReport,
    handleLiquidateRange,
    handleLiquidate,
    generateConsolidatedReport,
  };
}
