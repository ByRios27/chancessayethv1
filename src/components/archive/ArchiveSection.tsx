import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

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

  const shareText = async (title: string, text: string) => {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({ title, text });
        return;
      }
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        toast.success('Informe copiado al portapapeles');
        return;
      }
      toast.error('No se pudo compartir en este dispositivo');
    } catch {
      toast.error('No se pudo compartir el informe');
    }
  };

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
              className={`w-full min-w-0 whitespace-nowrap px-1.5 py-2 rounded-lg text-[10px] sm:text-[12px] leading-none font-black uppercase tracking-wide border transition ${
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
                onClick={() => {
                  if (!reportData?.summary) return;
                  const summary = reportData.summary;
                  const scope = effectiveUserEmail ? `Usuario: ${effectiveUserEmail}` : 'Global';
                  const text =
                    `Informe de ventas (${dateFrom} a ${dateTo})\n` +
                    `${scope}\n` +
                    `Ventas: $${Number(summary.totalSales || 0).toFixed(2)}\n` +
                    `Premios: $${Number(summary.totalPrizes || 0).toFixed(2)}\n` +
                    `Utilidad: $${Number(summary.netProfit || 0).toFixed(2)}\n` +
                    `Inyecciones: $${Number(summary.totalInjections || 0).toFixed(2)}\n` +
                    `Tickets: ${Number(summary.tickets?.length || 0)}`;
                  void shareText('Informe de ventas', text);
                }}
                className="h-11 rounded-lg border border-white/10 bg-white/[0.04] text-white font-bold uppercase text-[11px] disabled:opacity-60"
              >
                Compartir informe
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
                          onClick={() => {
                            const text =
                              `${customerLabel}\n` +
                              `Ticket: ${ticketRef || ticket?.id || '-'}\n` +
                              `Monto: $${Number(ticket?.totalAmount || 0).toFixed(2)}\n` +
                              `Sorteo: ${lotteryLabel}`;
                            void shareText('Ticket', text);
                          }}
                          className="h-8 rounded-md border border-white/10 bg-white/[0.04] text-[10px] font-bold uppercase"
                        >
                          Compartir
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
                    const text = filteredLogs
                      .slice(0, 30)
                      .map((item: any) => {
                        const actor = item.actorName || item.actorEmail || '-';
                        const target = item.targetName || item.targetEmail || item.targetSellerId || '-';
                        return `${item.type || 'EVENTO'} · ${actor} -> ${target}`;
                      })
                      .join('\n');
                    void shareText('Log diario', text || 'Sin eventos');
                  }}
                  className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.04] text-[11px] font-bold uppercase disabled:opacity-60"
                >
                  Compartir log
                </button>
                <div className="max-h-[52vh] overflow-y-auto rounded-lg border border-white/10 bg-white/[0.02] p-2">
                  {auditLogsLoading ? (
                    <p className="text-xs text-white/60">Cargando log...</p>
                  ) : filteredLogs.length === 0 ? (
                    <p className="text-xs text-white/60">Sin eventos para la fecha seleccionada.</p>
                  ) : (
                    filteredLogs.slice(0, 60).map((event: any) => (
                      <div key={`log-${event.id}`} className="py-1.5 border-b border-white/10">
                        <p className="text-xs font-bold">{event.type || 'EVENTO'}</p>
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
                const text = settlementRows
                  .slice(0, 30)
                  .map((item: any) =>
                    `${item.userEmail || item.sellerId || '-'} · ${item.date || '-'} · Pagado $${Number(item.amountPaid || 0).toFixed(2)}`
                  )
                  .join('\n');
                void shareText('Liquidaciones', text || 'Sin liquidaciones');
              }}
              className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.04] text-[11px] font-bold uppercase disabled:opacity-60"
            >
              Compartir informe
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
