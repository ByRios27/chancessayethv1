import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import { stripEmojis } from '../../utils/text';

type ArchiveSectionProps = any;
type ArchiveTab = 'ventas' | 'tickets' | 'logs' | 'liquidaciones';
type RangeMode = 'dia' | 'rango';

export function ArchiveSection(props: ArchiveSectionProps) {
  const {
    archiveDate,
    setArchiveDate,
    userProfile,
    archiveUserEmail,
    setArchiveUserEmail,
    users,
    isArchiveLoading,
    auditLogs,
    auditLogsLoading,
    refreshAuditLogs,
    setShowTicketModal,
    cleanText,
    formatTime12h,
    fetchArchiveSalesReport,
    searchArchiveTickets,
    fetchArchiveLiquidations,
  } = props;

  const [activeTab, setActiveTab] = useState<ArchiveTab>('ventas');
  const [rangeMode, setRangeMode] = useState<RangeMode>('dia');
  const [rangeStart, setRangeStart] = useState(archiveDate);
  const [rangeEnd, setRangeEnd] = useState(archiveDate);
  const [reportData, setReportData] = useState<any | null>(null);
  const [ticketRows, setTicketRows] = useState<any[]>([]);
  const [settlementRows, setSettlementRows] = useState<any[]>([]);
  const [ticketSearch, setTicketSearch] = useState({
    customerName: '',
    ticketNumber: '',
    lotteryName: '',
  });
  const [logTypeFilter, setLogTypeFilter] = useState('TODOS');
  const [loadingSales, setLoadingSales] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [loadingLiquidations, setLoadingLiquidations] = useState(false);

  const safeString = (value: unknown) => (value ?? '').toString();
  const safeLower = (value: unknown) => safeString(value).toLowerCase();
  const safeFormatTicketTime = (value: unknown) => {
    if (typeof value === 'string') {
      return typeof formatTime12h === 'function' ? formatTime12h(value) : value;
    }
    if (value instanceof Date) {
      return value.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    if (typeof value === 'number') {
      const ms = value > 9999999999 ? value : value * 1000;
      return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    const seconds = Number((value as any)?.seconds ?? NaN);
    if (Number.isFinite(seconds) && seconds > 0) {
      return new Date(seconds * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    return '--:--';
  };

  const role = safeLower(userProfile?.role);
  const isCeo = role === 'ceo';
  const isAdmin = role === 'admin';
  const canViewGlobal = isCeo || (isAdmin && !!userProfile?.canLiquidate);
  const canViewLogs = isCeo;
  const ownEmail = safeLower(userProfile?.email);

  const safeUsers = Array.isArray(users) ? users : [];
  const safeAuditLogs = Array.isArray(auditLogs) ? auditLogs : [];

  const userOptions = useMemo(() => {
    if (!canViewGlobal) return safeUsers.filter((u) => safeLower(u?.email) === ownEmail);
    return safeUsers.filter((u) => u?.status === 'active' && u?.email);
  }, [canViewGlobal, ownEmail, safeUsers]);

  const effectiveUserEmail = useMemo(() => {
    if (canViewGlobal) return safeLower(archiveUserEmail) || undefined;
    return ownEmail || undefined;
  }, [archiveUserEmail, canViewGlobal, ownEmail]);

  const dateFrom = rangeMode === 'dia' ? archiveDate : rangeStart;
  const dateTo = rangeMode === 'dia' ? archiveDate : rangeEnd;

  const formatCurrency = (value: unknown) => `$${Number(value || 0).toFixed(2)}`;
  const formatPercent = (value: unknown) => `${Number(value || 0).toFixed(2)}%`;
  const documentText = (value: unknown) => stripEmojis(String(value ?? '-')) || '-';
  const formatEventDateTime = (value: any) => {
    const seconds = Number(value?.seconds ?? NaN);
    const date = Number.isFinite(seconds) && seconds > 0
      ? new Date(seconds * 1000)
      : value instanceof Date
        ? value
        : null;
    if (!date) return '--:--';
    return date.toLocaleString([], {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
    });
  };
  const safeFileName = (value: string) => value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90) || 'archivo';

  const createPdfWriter = (title: string, subtitle?: string) => {
    const pdf = new jsPDF({ unit: 'mm', format: 'letter', orientation: 'portrait' });
    const marginX = 8;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const contentWidth = pageWidth - (marginX * 2);
    let y = 11;

    const ensureSpace = (height = 8) => {
      if (y + height <= pageHeight - 9) return;
      pdf.addPage();
      y = 11;
    };

    const writeLine = (
      text: string,
      options: { size?: number; bold?: boolean; color?: [number, number, number]; indent?: number; gap?: number } = {}
    ) => {
      const size = options.size || 7;
      const indent = options.indent || 0;
      const gap = options.gap || 3.5;
      const lines = pdf.splitTextToSize(documentText(text), contentWidth - indent);
      ensureSpace(lines.length * gap + 1);
      pdf.setFont('helvetica', options.bold ? 'bold' : 'normal');
      pdf.setFontSize(size);
      pdf.setTextColor(...(options.color || [30, 30, 30]));
      lines.forEach((line: string) => {
        pdf.text(documentText(line), marginX + indent, y);
        y += gap;
      });
    };

    const writeSection = (label: string) => {
      ensureSpace(7);
      y += 1;
      pdf.setDrawColor(190);
      pdf.setLineWidth(0.12);
      pdf.line(marginX, y, pageWidth - marginX, y);
      y += 3.2;
      writeLine(label.toUpperCase(), { size: 7.3, bold: true, color: [20, 20, 20], gap: 3.4 });
    };

    const writeKeyValues = (items: Array<[string, string | number]>) => {
      items.forEach(([label, value]) => {
        writeLine(`${label}: ${value}`, { size: 6.8, gap: 3.2 });
      });
    };

    const writeTable = (headers: string[], rows: Array<Array<string | number>>, widths: number[]) => {
      ensureSpace(8);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(6.2);
      pdf.setTextColor(20, 20, 20);
      let x = marginX;
      headers.forEach((header, index) => {
        pdf.text(documentText(header), x, y);
        x += widths[index];
      });
      y += 3.2;
      pdf.setDrawColor(215);
      pdf.line(marginX, y - 1.1, pageWidth - marginX, y - 1.1);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6);
      rows.forEach((row) => {
        ensureSpace(4.4);
        let rowX = marginX;
        row.forEach((cell, index) => {
          const text = pdf.splitTextToSize(documentText(cell), widths[index] - 1)[0] || '';
          pdf.text(documentText(text), rowX, y);
          rowX += widths[index];
        });
        y += 3.35;
      });
    };

    writeLine(title, { size: 11, bold: true, color: [0, 0, 0], gap: 4.8 });
    if (subtitle) writeLine(subtitle, { size: 7, color: [70, 70, 70], gap: 3.5 });
    writeLine(`Generado: ${formatEventDateTime(new Date())}`, { size: 6.5, color: [85, 85, 85], gap: 3.2 });

    return { pdf, writeLine, writeSection, writeKeyValues, writeTable };
  };

  const sharePdf = async (pdf: jsPDF, title: string, fileBaseName: string) => {
    const fileName = `${safeFileName(fileBaseName)}.pdf`;
    try {
      const blob = pdf.output('blob');
      const file = new File([blob], fileName, { type: 'application/pdf' });
      const canShareFile = typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function' &&
        (!navigator.canShare || navigator.canShare({ files: [file] }));

      if (canShareFile) {
        await navigator.share({ title, files: [file] });
        toast.success('PDF compartido');
        return;
      }
      pdf.save(fileName);
      toast.success('PDF generado');
    } catch {
      toast.error('No se pudo generar el PDF');
    }
  };

  const resultToText = (result: any) => {
    if (!result) return 'sin datos';
    return `${result.firstPrize || '--'} / ${result.secondPrize || '--'} / ${result.thirdPrize || '--'}`;
  };

  const detailsToLines = (event: any) => {
    const details = event?.details || {};
    const type = String(event?.type || '');
    const lines: string[] = [];

    if (type === 'USER_CREATED' || type === 'USER_UPDATED') {
      const username = details.targetUsername || String(event?.targetEmail || '').split('@')[0] || '';
      if (username) lines.push(`Usuario local/email: ${username}`);
      lines.push(`Rol: ${details.previousRole ? `${details.previousRole} -> ` : ''}${details.nextRole || details.targetRole || '-'}`);
      lines.push(`Comision: ${details.previousCommissionRate !== undefined ? `${formatPercent(details.previousCommissionRate)} -> ` : ''}${formatPercent(details.nextCommissionRate ?? details.commissionRate)}`);
      if (details.previousName || details.nextName) lines.push(`Nombre: ${details.previousName || '-'} -> ${details.nextName || '-'}`);
      if (details.previousSellerId || details.nextSellerId) lines.push(`Seller ID: ${details.previousSellerId || '-'} -> ${details.nextSellerId || '-'}`);
      if (Array.isArray(details.updatedFields)) lines.push(`Campos: ${details.updatedFields.join(', ')}`);
      return lines;
    }

    if (type.startsWith('INJECTION_')) {
      if (details.amount !== undefined) lines.push(`Monto: ${formatCurrency(details.amount)}`);
      if (details.previousAmount !== undefined || details.nextAmount !== undefined) {
        lines.push(`Monto: ${formatCurrency(details.previousAmount)} -> ${formatCurrency(details.nextAmount)}`);
      }
      if (details.removedAmount !== undefined) lines.push(`Monto eliminado: ${formatCurrency(details.removedAmount)}`);
      if (details.injectionId) lines.push(`ID inyeccion: ${details.injectionId}`);
      if (details.injectionType) lines.push(`Tipo: ${details.injectionType}`);
      return lines;
    }

    if (type.startsWith('RESULT_')) {
      if (details.lotteryName) lines.push(`Sorteo: ${details.lotteryName}`);
      if (details.previousResult || details.nextResult) lines.push(`Resultado: ${resultToText(details.previousResult)} -> ${resultToText(details.nextResult)}`);
      return lines;
    }

    if (type === 'LOTTERY_UPDATED') {
      if (details.previousName || details.nextName) lines.push(`Nombre: ${details.previousName || '-'} -> ${details.nextName || '-'}`);
      if (details.previousActive !== undefined || details.nextActive !== undefined) lines.push(`Activo: ${details.previousActive ?? '-'} -> ${details.nextActive ?? '-'}`);
      if (details.migratedReferences !== undefined) lines.push(`Referencias migradas: ${details.migratedReferences}`);
      return lines;
    }

    Object.entries(details).slice(0, 8).forEach(([key, value]) => {
      const rendered = typeof value === 'object' ? JSON.stringify(value) : String(value ?? '-');
      lines.push(`${key}: ${rendered}`);
    });
    return lines;
  };

  const getLogSummary = (event: any) => ({
    time: formatEventDateTime(event?.createdAt),
    actor: event?.actorName || event?.actorEmail || '-',
    target: event?.targetName || event?.targetEmail || event?.targetSellerId || '-',
    details: detailsToLines(event),
  });

  const handleConsultSales = async () => {
    if (typeof fetchArchiveSalesReport !== 'function') return;
    setLoadingSales(true);
    try {
      const data = await fetchArchiveSalesReport({
        dateFrom,
        dateTo,
        userEmail: effectiveUserEmail,
      });
      setReportData(data);
      setTicketRows([]);
      setSettlementRows([]);
    } catch (error) {
      console.error('Archive sales query failed:', error);
      toast.error('No se pudo consultar el informe de ventas');
    } finally {
      setLoadingSales(false);
    }
  };

  const handleSearchTickets = async () => {
    if (typeof searchArchiveTickets !== 'function') return;
    setLoadingTickets(true);
    try {
      const rows = await searchArchiveTickets({
        dateFrom,
        dateTo,
        userEmail: effectiveUserEmail,
        customerName: ticketSearch.customerName,
        ticketNumber: ticketSearch.ticketNumber,
        lotteryName: ticketSearch.lotteryName,
      });
      setTicketRows(rows || []);
      setReportData(null);
      setSettlementRows([]);
    } catch (error) {
      console.error('Archive ticket search failed:', error);
      toast.error('No se pudo consultar tickets');
    } finally {
      setLoadingTickets(false);
    }
  };

  const handleConsultLiquidations = async () => {
    if (typeof fetchArchiveLiquidations !== 'function') return;
    setLoadingLiquidations(true);
    try {
      const rows = await fetchArchiveLiquidations({
        dateFrom,
        dateTo,
        userEmail: effectiveUserEmail,
      });
      setSettlementRows(rows || []);
      setReportData(null);
      setTicketRows([]);
    } catch (error) {
      console.error('Archive settlements query failed:', error);
      toast.error('No se pudo consultar liquidaciones');
    } finally {
      setLoadingLiquidations(false);
    }
  };

  const filteredLogs = useMemo(() => {
    if (logTypeFilter === 'TODOS') return safeAuditLogs;
    return safeAuditLogs.filter((item: any) => String(item.type || '') === logTypeFilter);
  }, [logTypeFilter, safeAuditLogs]);

  const pendingLiquidations = useMemo(() => {
    const candidates = safeUsers.filter((u) => Number(u?.currentDebt || 0) > 0);
    if (canViewGlobal) return candidates;
    return candidates.filter((u) => safeLower(u?.email) === ownEmail);
  }, [canViewGlobal, ownEmail, safeUsers]);

  const salesByLottery = useMemo(() => {
    if (!reportData?.tickets) return [];
    const map = new Map<string, { lottery: string; sales: number; bets: number }>();
    (reportData.tickets as any[]).forEach((ticket) => {
      (ticket?.bets || []).forEach((bet: any) => {
        const key = String(bet?.lottery || 'SIN SORTEO');
        const current = map.get(key) || { lottery: key, sales: 0, bets: 0 };
        current.sales += Number(bet?.amount || 0);
        current.bets += 1;
        map.set(key, current);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.sales - a.sales);
  }, [reportData]);

  const salesBySeller = useMemo(() => {
    if (!reportData?.tickets || !canViewGlobal) return [];
    const map = new Map<string, { seller: string; sales: number; tickets: number }>();
    (reportData.tickets as any[]).forEach((ticket) => {
      const label = String(ticket?.sellerName || ticket?.sellerId || ticket?.sellerEmail || 'Sin vendedor');
      const current = map.get(label) || { seller: label, sales: 0, tickets: 0 };
      current.sales += Number(ticket?.totalAmount || 0);
      current.tickets += 1;
      map.set(label, current);
    });
    return Array.from(map.values()).sort((a, b) => b.sales - a.sales);
  }, [canViewGlobal, reportData]);

  const shareSalesReportPdf = async () => {
    if (!reportData?.summary) return;
    const summary = reportData.summary;
    const scope = effectiveUserEmail ? `Usuario: ${effectiveUserEmail}` : 'Global';
    const writer = createPdfWriter('Informe de ventas', `${dateFrom} a ${dateTo} - ${scope}`);

    writer.writeSection('Resumen');
    writer.writeKeyValues([
      ['Ventas', formatCurrency(summary.totalSales)],
      ['Premios', formatCurrency(summary.totalPrizes)],
      ['Comisiones', formatCurrency(summary.totalCommissions)],
      ['Utilidad', formatCurrency(summary.netProfit)],
      ['Inyecciones', formatCurrency(summary.totalInjections)],
      ['Tickets', Number(summary.tickets?.length || 0)],
    ]);

    writer.writeSection('Resumen por sorteo');
    writer.writeTable(
      ['Sorteo', 'Jugadas', 'Ventas'],
      salesByLottery.map((row) => [
        typeof cleanText === 'function' ? cleanText(row.lottery) : row.lottery,
        row.bets,
        formatCurrency(row.sales),
      ]),
      [118, 28, 40]
    );

    if (canViewGlobal) {
      writer.writeSection('Resumen por usuario');
      writer.writeTable(
        ['Usuario', 'Tickets', 'Ventas'],
        salesBySeller.map((row) => [row.seller, row.tickets, formatCurrency(row.sales)]),
        [118, 28, 40]
      );
    }

    const ticketsForPdf = Array.isArray(reportData.tickets) ? reportData.tickets : [];
    writer.writeSection('Detalle de tickets');
    writer.writeTable(
      ['Hora', 'Ticket', 'Cliente', 'Usuario', 'Sorteos', 'Monto'],
      ticketsForPdf.slice(0, 260).map((ticket: any) => {
        const lotteryLabel = Array.isArray(ticket?.bets)
          ? Array.from(new Set(ticket.bets.map((bet: any) => String(bet?.lottery || '').trim()).filter(Boolean))).join(', ')
          : '-';
        return [
          safeFormatTicketTime(ticket?.timestamp),
          ticket?.sequenceNumber || ticket?.id || '-',
          ticket?.customerName || ticket?.clientName || 'General',
          ticket?.sellerName || ticket?.sellerId || ticket?.sellerEmail || '-',
          lotteryLabel || '-',
          formatCurrency(ticket?.totalAmount),
        ];
      }),
      [20, 30, 34, 38, 46, 20]
    );
    if (ticketsForPdf.length > 260) {
      writer.writeLine(`Nota: se incluyeron 260 de ${ticketsForPdf.length} tickets para mantener el PDF manejable.`, { size: 6.5 });
    }

    await sharePdf(writer.pdf, 'Informe de ventas', `informe-ventas-${dateFrom}-a-${dateTo}`);
  };

  const shareTicketPdf = async (ticket: any) => {
    const customerLabel = safeString(ticket?.customerName || ticket?.clientName || ticket?.sellerName || ticket?.sellerId || 'Cliente sin nombre');
    const ticketRef = safeString(ticket?.sequenceNumber || ticket?.id || '');
    const writer = createPdfWriter('Ticket archivado', `${dateFrom} a ${dateTo}`);

    writer.writeSection('Datos del ticket');
    writer.writeKeyValues([
      ['Ticket', ticketRef || ticket?.id || '-'],
      ['Cliente', customerLabel],
      ['Vendedor', ticket?.sellerName || ticket?.sellerId || ticket?.sellerEmail || '-'],
      ['Hora', safeFormatTicketTime(ticket?.timestamp)],
      ['Total', formatCurrency(ticket?.totalAmount)],
      ['Estado', ticket?.status || '-'],
    ]);

    writer.writeSection('Jugadas');
    writer.writeTable(
      ['Sorteo', 'Tipo', 'Numero', 'Cant.', 'Monto'],
      (ticket?.bets || []).map((bet: any) => [
        typeof cleanText === 'function' ? cleanText(String(bet?.lottery || '')) : String(bet?.lottery || ''),
        bet?.type || '-',
        bet?.number || '-',
        Number(bet?.quantity || 0),
        formatCurrency(bet?.amount),
      ]),
      [78, 20, 28, 22, 36]
    );

    await sharePdf(writer.pdf, 'Ticket archivado', `ticket-${ticketRef || ticket?.id || 'archivo'}`);
  };

  const shareLogPdf = async () => {
    const writer = createPdfWriter('Log diario', `${archiveDate} - ${logTypeFilter === 'TODOS' ? 'Todos los eventos' : logTypeFilter}`);
    writer.writeSection('Eventos');
    if (filteredLogs.length === 0) {
      writer.writeLine('Sin eventos para la fecha seleccionada.');
    }

    filteredLogs.slice(0, 180).forEach((event: any, index: number) => {
      const summary = getLogSummary(event);
      writer.writeLine(`${index + 1}. ${event.type || 'EVENTO'} - ${summary.time}`, { bold: true, size: 7.2 });
      writer.writeLine(`Actor: ${summary.actor} (${event.actorRole || '-'})`, { size: 6.7, indent: 3 });
      writer.writeLine(`Objetivo: ${summary.target}`, { size: 6.7, indent: 3 });
      summary.details.forEach((line) => writer.writeLine(line, { size: 6.5, indent: 3 }));
    });
    if (filteredLogs.length > 180) {
      writer.writeLine(`Nota: se incluyeron 180 de ${filteredLogs.length} eventos.`, { size: 6.5 });
    }

    await sharePdf(writer.pdf, 'Log diario', `log-${archiveDate}`);
  };

  const shareLiquidationsPdf = async () => {
    const writer = createPdfWriter('Informe de liquidaciones', `${dateFrom} a ${dateTo}`);
    writer.writeSection('Liquidaciones registradas');
    writer.writeTable(
      ['Fecha', 'Usuario', 'Ventas', 'Premios', 'Comision', 'Utilidad', 'Recibido', 'Enviado'],
      settlementRows.map((item: any) => [
        item?.date || '-',
        item?.userEmail || item?.sellerId || '-',
        formatCurrency(item?.totalSales ?? item?.sales),
        formatCurrency(item?.totalPrizes ?? item?.prizes),
        formatCurrency(item?.totalCommissions ?? item?.commission),
        formatCurrency(item?.dailyResult ?? item?.operationalProfit ?? item?.netProfit),
        formatCurrency(item?.amountReceived ?? item?.amountPaid),
        formatCurrency(item?.amountSent),
      ]),
      [18, 44, 22, 22, 22, 22, 24, 24]
    );

    await sharePdf(writer.pdf, 'Informe de liquidaciones', `liquidaciones-${dateFrom}-a-${dateTo}`);
  };

  return (
    <motion.div
      key="archivo"
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      className="space-y-3"
    >
      <div className="surface-panel p-3 space-y-3">
        <div className="grid grid-cols-4 gap-2 w-full">
          {(['ventas', 'tickets', 'logs', 'liquidaciones'] as ArchiveTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`w-full min-w-0 overflow-hidden whitespace-normal break-words px-1 py-2 rounded-lg text-[8px] min-[380px]:text-[9px] sm:text-[12px] leading-tight font-black uppercase tracking-normal sm:tracking-wide border transition ${
                activeTab === tab
                  ? 'bg-primary text-primary-foreground border-primary/60'
                  : 'bg-white/[0.03] border-white/10 text-white/85'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setRangeMode('dia')}
            className={`h-9 rounded-lg border text-[11px] font-bold uppercase ${
              rangeMode === 'dia' ? 'border-primary/60 text-primary' : 'border-white/10 text-white/70'
            }`}
          >
            Fecha
          </button>
          <button
            type="button"
            onClick={() => setRangeMode('rango')}
            className={`h-9 rounded-lg border text-[11px] font-bold uppercase ${
              rangeMode === 'rango' ? 'border-primary/60 text-primary' : 'border-white/10 text-white/70'
            }`}
          >
            Entre fechas
          </button>
        </div>

        {rangeMode === 'dia' ? (
          <input
            type="date"
            value={archiveDate}
            onChange={(event) => {
              setArchiveDate(event.target.value);
              setRangeStart(event.target.value);
              setRangeEnd(event.target.value);
            }}
            className="w-full h-11 rounded-lg border border-white/10 bg-black/30 px-3 text-sm"
          />
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={rangeStart}
              onChange={(event) => setRangeStart(event.target.value)}
              className="w-full h-11 rounded-lg border border-white/10 bg-black/30 px-3 text-sm"
            />
            <input
              type="date"
              value={rangeEnd}
              onChange={(event) => setRangeEnd(event.target.value)}
              className="w-full h-11 rounded-lg border border-white/10 bg-black/30 px-3 text-sm"
            />
          </div>
        )}

        {(canViewGlobal || activeTab !== 'logs') && (
          <select
            value={canViewGlobal ? archiveUserEmail : ownEmail}
            onChange={(event) => setArchiveUserEmail(event.target.value)}
            disabled={!canViewGlobal}
            className="w-full h-11 rounded-lg border border-white/10 bg-black/30 px-3 text-sm disabled:opacity-70"
          >
            {canViewGlobal && <option value="">Todos los usuarios</option>}
            {userOptions.map((u: any) => (
              <option key={u.email} value={u.email}>
                {u.name || u.sellerId || u.email}
              </option>
            ))}
          </select>
        )}

        {activeTab === 'ventas' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleConsultSales}
                disabled={loadingSales || isArchiveLoading}
                className="h-11 rounded-lg bg-primary text-primary-foreground font-bold uppercase text-[11px] disabled:opacity-60"
              >
                {loadingSales ? 'Consultando...' : 'Consultar'}
              </button>
              <button
                type="button"
                disabled={!reportData}
                onClick={() => void shareSalesReportPdf()}
                className="h-11 rounded-lg border border-white/10 bg-white/[0.04] text-white font-bold uppercase text-[11px] disabled:opacity-60"
              >
                Compartir PDF
              </button>
            </div>

            {!reportData ? (
              <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.02] p-4 text-xs text-white/65 uppercase tracking-wide">
                Consulta bajo demanda. Define filtros y toca consultar.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2">
                    <p className="text-[10px] text-white/60 uppercase">Ventas</p>
                    <p className="text-base font-black">${Number(reportData.summary.totalSales || 0).toFixed(2)}</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2">
                    <p className="text-[10px] text-white/60 uppercase">Premios</p>
                    <p className="text-base font-black text-red-400">${Number(reportData.summary.totalPrizes || 0).toFixed(2)}</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2">
                    <p className="text-[10px] text-white/60 uppercase">Utilidad</p>
                    <p className={`text-base font-black ${Number(reportData.summary.netProfit || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ${Number(reportData.summary.netProfit || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2">
                    <p className="text-[10px] text-white/60 uppercase">Inyecciones</p>
                    <p className="text-base font-black text-sky-300">${Number(reportData.summary.totalInjections || 0).toFixed(2)}</p>
                  </div>
                </div>

                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2">
                  <p className="text-[10px] text-white/60 uppercase mb-1">Resumen por sorteo</p>
                  {salesByLottery.length === 0 ? (
                    <p className="text-xs text-white/60">Sin sorteos para el rango seleccionado.</p>
                  ) : (
                    <div className="space-y-1">
                      {salesByLottery.slice(0, 12).map((row) => (
                        <div key={`lot-${row.lottery}`} className="flex items-center justify-between text-xs">
                          <span className="truncate">{typeof cleanText === 'function' ? cleanText(row.lottery) : row.lottery}</span>
                          <span className="text-white/70">{row.bets} jugadas · ${row.sales.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {canViewGlobal && (
                  <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2">
                    <p className="text-[10px] text-white/60 uppercase mb-1">Detalle por usuario</p>
                    {salesBySeller.length === 0 ? (
                      <p className="text-xs text-white/60">Sin datos por usuario.</p>
                    ) : (
                      <div className="space-y-1">
                        {salesBySeller.slice(0, 12).map((row) => (
                          <div key={`usr-${row.seller}`} className="flex items-center justify-between text-xs">
                            <span className="truncate">{row.seller}</span>
                            <span className="text-white/70">{row.tickets} tickets · ${row.sales.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'tickets' && (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <input
                value={ticketSearch.customerName}
                onChange={(event) => setTicketSearch((prev) => ({ ...prev, customerName: event.target.value }))}
                placeholder="Cliente"
                className="h-10 rounded-lg border border-white/10 bg-black/30 px-2 text-sm"
              />
              <input
                value={ticketSearch.ticketNumber}
                onChange={(event) => setTicketSearch((prev) => ({ ...prev, ticketNumber: event.target.value }))}
                placeholder="Ticket"
                className="h-10 rounded-lg border border-white/10 bg-black/30 px-2 text-sm"
              />
              <input
                value={ticketSearch.lotteryName}
                onChange={(event) => setTicketSearch((prev) => ({ ...prev, lotteryName: event.target.value }))}
                placeholder="Sorteo"
                className="h-10 rounded-lg border border-white/10 bg-black/30 px-2 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={handleSearchTickets}
              disabled={loadingTickets || isArchiveLoading}
              className="h-11 w-full rounded-lg bg-primary text-primary-foreground font-bold uppercase text-[11px] disabled:opacity-60"
            >
              {loadingTickets ? 'Buscando...' : 'Buscar ticket'}
            </button>

            {ticketRows.length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.02] p-4 text-xs text-white/65 uppercase tracking-wide">
                Sin resultados. Busca por cliente, ticket, sorteo o rango de fecha.
              </div>
            ) : (
              <div className="max-h-[52vh] overflow-y-auto rounded-lg border border-white/10 bg-white/[0.02]">
                {ticketRows.map((ticket: any) => {
                  const customerLabel = safeString(ticket?.customerName || ticket?.clientName || ticket?.sellerName || ticket?.sellerId || 'Cliente sin nombre');
                  const ticketRef = safeString(ticket?.sequenceNumber || ticket?.id || '');
                  const lotteryLabel = Array.isArray(ticket?.bets)
                    ? Array.from(new Set(ticket.bets.map((bet: any) => (typeof cleanText === 'function' ? cleanText(String(bet.lottery || '')) : String(bet.lottery || ''))))).join(', ')
                    : '-';
                  return (
                    <div key={`ticket-row-${ticket.id}`} className="border-b border-white/10 p-2 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold truncate">{customerLabel}</p>
                        <p className="text-xs text-white/65">${Number(ticket?.totalAmount || 0).toFixed(2)}</p>
                      </div>
                      <p className="text-[11px] text-white/60 truncate">{lotteryLabel}</p>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[10px] text-white/50 truncate">#{ticketRef || 'sin ref'}</p>
                        <p className="text-[10px] text-white/50 truncate">{safeFormatTicketTime(ticket?.timestamp)}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setShowTicketModal({ ticket })}
                          className="h-8 rounded-md border border-white/10 bg-white/[0.04] text-[10px] font-bold uppercase"
                        >
                          Ver
                        </button>
                        <button
                          type="button"
                          onClick={() => void shareTicketPdf(ticket)}
                          className="h-8 rounded-md border border-white/10 bg-white/[0.04] text-[10px] font-bold uppercase"
                        >
                          PDF
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-2">
            {!canViewLogs ? (
              <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.02] p-4 text-xs text-white/65 uppercase tracking-wide">
                Sin acceso al log diario global.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={logTypeFilter}
                    onChange={(event) => setLogTypeFilter(event.target.value)}
                    className="h-10 rounded-lg border border-white/10 bg-black/30 px-2 text-xs"
                  >
                    <option value="TODOS">Todos</option>
                    <option value="USER_CREATED">Usuario creado</option>
                    <option value="USER_UPDATED">Usuario editado</option>
                    <option value="INJECTION_CREATED">Inyección creada</option>
                    <option value="INJECTION_UPDATED">Inyección editada</option>
                    <option value="INJECTION_DELETED">Inyección eliminada</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof refreshAuditLogs === 'function') refreshAuditLogs();
                    }}
                    className="h-10 rounded-lg border border-white/10 bg-white/[0.04] text-[11px] font-bold uppercase"
                  >
                    Consultar log
                  </button>
                </div>
                <button
                  type="button"
                  disabled={filteredLogs.length === 0}
                  onClick={() => {
                    void shareLogPdf();
                  }}
                  className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.04] text-[11px] font-bold uppercase disabled:opacity-60"
                >
                  Compartir PDF
                </button>
                <div className="max-h-[52vh] overflow-y-auto rounded-lg border border-white/10 bg-white/[0.02] p-2">
                  {auditLogsLoading ? (
                    <p className="text-xs text-white/60">Cargando log...</p>
                  ) : filteredLogs.length === 0 ? (
                    <p className="text-xs text-white/60">Sin eventos para la fecha seleccionada.</p>
                  ) : (
                    filteredLogs.slice(0, 100).map((event: any) => (
                      <div key={`log-${event.id}`} className="py-1.5 border-b border-white/10">
                        <p className="text-xs font-bold">{event.type || 'EVENTO'}</p>
                        {(() => {
                          const summary = getLogSummary(event);
                          return (
                            <div className="mt-1 space-y-0.5">
                              <p className="text-[10px] text-white/50">{summary.time}</p>
                              <p className="text-[11px] text-white/75">
                                <span className="text-white/50">Actor:</span> {summary.actor} {event.actorRole ? `(${event.actorRole})` : ''}
                              </p>
                              <p className="text-[11px] text-white/75">
                                <span className="text-white/50">Objetivo:</span> {summary.target}
                              </p>
                              {summary.details.slice(0, 5).map((line, detailIndex) => (
                                <p key={`log-detail-${event.id}-${detailIndex}`} className="text-[10px] text-white/60 break-words">
                                  {line}
                                </p>
                              ))}
                            </div>
                          );
                        })()}
                        <p className="text-[11px] text-white/70 truncate">
                          {event.actorName || event.actorEmail || '-'} · {event.targetName || event.targetEmail || event.targetSellerId || '-'}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'liquidaciones' && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleConsultLiquidations}
              disabled={loadingLiquidations || isArchiveLoading}
              className="h-11 w-full rounded-lg bg-primary text-primary-foreground font-bold uppercase text-[11px] disabled:opacity-60"
            >
              {loadingLiquidations ? 'Consultando...' : 'Consultar liquidaciones'}
            </button>
            <button
              type="button"
              disabled={settlementRows.length === 0}
              onClick={() => {
                void shareLiquidationsPdf();
              }}
              className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.04] text-[11px] font-bold uppercase disabled:opacity-60"
            >
              Compartir PDF
            </button>

            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2">
              <p className="text-[10px] text-white/60 uppercase mb-1">Pendientes</p>
              {pendingLiquidations.length === 0 ? (
                <p className="text-xs text-white/60">Sin liquidaciones pendientes.</p>
              ) : (
                <div className="space-y-1">
                  {pendingLiquidations.slice(0, 10).map((u: any) => (
                    <div key={`pending-${u.email}`} className="flex items-center justify-between text-xs">
                      <span className="truncate">{u.name || u.sellerId || u.email}</span>
                      <span className="text-amber-300">${Number(u.currentDebt || 0).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="max-h-[45vh] overflow-y-auto rounded-lg border border-white/10 bg-white/[0.02] p-2">
              <p className="text-[10px] text-white/60 uppercase mb-1">Liquidaciones anteriores</p>
              {settlementRows.length === 0 ? (
                <p className="text-xs text-white/60">Sin liquidaciones en el rango seleccionado.</p>
              ) : (
                settlementRows.map((row: any) => (
                  <div key={`set-${row.id}`} className="py-1.5 border-b border-white/10">
                    <p className="text-xs font-bold truncate">{row.userEmail || row.sellerId || 'Usuario'}</p>
                    <p className="text-[11px] text-white/70">
                      {row.date || '-'} · Venta ${Number(row.totalSales || 0).toFixed(2)} · Pagado ${Number(row.amountPaid || 0).toFixed(2)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
