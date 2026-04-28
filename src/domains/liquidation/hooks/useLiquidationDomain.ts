import { useMemo, useState } from 'react';
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
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from '../../../firebase';
import { useLiquidation } from '../../../hooks/useLiquidation';
import type { Injection, Settlement } from '../../../types/finance';
import type { LotteryResult } from '../../../types/results';
import type { LotteryTicket } from '../../../types/bets';

export function useLiquidationDomain(params: any) {
  const {
    businessDayKey,
    users,
    tickets,
    injections,
    results,
    settlements,
    userProfile,
    getQuickOperationalDate,
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
      newTotalDebt,
      previousDebt,
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
      message: `Seguro de ${actionLabel} a ${userToLiquidate.name} para ${liquidationDate}?\n\nResultado del dia: USD ${operationalProfit.toFixed(2)}\nInyeccion diaria: USD ${totalInjections.toFixed(2)}\nSaldo anterior: USD ${previousDebt.toFixed(2)}\n${previewAmountDirection === 'sent' ? 'Monto enviado' : 'Monto recibido'}: USD ${paid.toFixed(2)}\nSaldo final: USD ${newTotalDebt.toFixed(2)}`,
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
          toastSuccess(existingSettlement ? 'Liquidacion actualizada correctamente' : 'Liquidacion guardada correctamente');
          setAmountPaid(String(paid));
          setAmountDirection(previewAmountDirection);
        } catch (error) {
          onError(error, 'write', 'settlements');
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
      const reportUsersMap = new Map<string, any>();

      const ensureUser = (key: string, fallback: any = {}) => {
        if (!reportUsersMap.has(key)) {
          reportUsersMap.set(key, {
            key,
            email: fallback.email || '',
            name: fallback.name || fallback.email || 'Usuario',
            sellerId: fallback.sellerId,
            tickets: [],
            summary: {
              totalSales: 0,
              totalCommissions: 0,
              totalPrizes: 0,
              totalInjections: 0,
              totalLiquidations: 0,
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

      reportUsersMap.forEach((u: any) => {
        const email = normalizeText(u.email);
        const userTickets = u.tickets as LotteryTicket[];
        const userInjections = email ? reportInjections.filter(inj => normalizeText(inj.userEmail) === email && (inj.type || 'injection') === 'injection') : [];
        const userSettlements = email ? reportSettlements.filter(st => normalizeText(st.userEmail) === email) : [];

        const totalSales = userTickets.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
        const totalCommissions = userTickets.reduce((sum, t) => sum + ((t.totalAmount || 0) * ((t.commissionRate || 0) / 100)), 0);
        const totalPrizes = userTickets.reduce((sum, t) => sum + (getTicketPrizesFromSource(t, reportResults).totalPrize || 0), 0);
        const totalInjections = userInjections.reduce((sum, i) => sum + (i.amount || 0), 0);
        const totalLiquidations = userSettlements.reduce((sum, s) => sum + (s.amountPaid || 0), 0);
        const operationalProfit = totalSales - totalCommissions - totalPrizes;
        const liquidationBalance = operationalProfit + totalInjections;
        u.summary = {
          totalSales,
          totalCommissions,
          totalPrizes,
          totalInjections,
          totalLiquidations,
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

      const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
      const marginX = 12;
      const maxWidth = 186;
      const pageHeight = pdf.internal.pageSize.getHeight();
      const lineHeight = 5;
      let y = 14;

      const ensureSpace = (lines = 1) => {
        if (y + (lines * lineHeight) > pageHeight - 12) {
          pdf.addPage();
          y = 14;
        }
      };

      const writeLine = (text: string, font: 'normal' | 'bold' = 'normal', size = 9) => {
        pdf.setFont('helvetica', font);
        pdf.setFontSize(size);
        const lines = pdf.splitTextToSize(text, maxWidth) as string[];
        lines.forEach((line: string) => {
          ensureSpace(1);
          pdf.text(line, marginX, y);
          y += lineHeight;
        });
      };

      const globalSales = reportUsers.reduce((acc: number, u: any) => acc + u.summary.totalSales, 0);
      const globalPrizes = reportUsers.reduce((acc: number, u: any) => acc + u.summary.totalPrizes, 0);
      const globalInjections = reportUsers.reduce((acc: number, u: any) => acc + u.summary.totalInjections, 0);
      const globalCommissions = reportUsers.reduce((acc: number, u: any) => acc + u.summary.totalCommissions, 0);
      const globalLiquidations = reportUsers.reduce((acc: number, u: any) => acc + u.summary.totalLiquidations, 0);
      const globalOperationalProfit = globalSales - globalCommissions - globalPrizes;

      writeLine('REPORTE CONSOLIDADO EJECUTIVO', 'bold', 15);
      writeLine(`Rango operativo: ${reportStartDate} -> ${reportEndDate}`, 'bold', 10);
      writeLine(`Generado: ${format(new Date(), 'dd/MM/yyyy hh:mm a')}`, 'normal', 9);
      writeLine('==================================================', 'normal', 8);
      writeLine('RESUMEN GLOBAL', 'bold', 11);
      writeLine(`Usuarios con actividad: ${reportUsers.length}`);
      writeLine(`Total ventas: USD ${globalSales.toFixed(2)}`);
      writeLine(`Total premios: USD ${globalPrizes.toFixed(2)}`);
      writeLine(`Total inyecciones: USD ${globalInjections.toFixed(2)}`);
      writeLine(`Total liquidaciones: USD ${globalLiquidations.toFixed(2)}`);
      writeLine(`Resultado operativo: USD ${globalOperationalProfit.toFixed(2)}`, 'bold', 10);

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
    handleLiquidate,
    generateConsolidatedReport,
  };
}
