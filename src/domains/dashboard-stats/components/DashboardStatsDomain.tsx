import { motion } from 'motion/react';
import { ChevronDown, ChevronRight, Zap } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useDashboardStatsDomain } from '../hooks/useDashboardStatsDomain';
import { getTicketPrimaryLabel, getTicketSecondaryId } from '../../../utils/tickets';

export function DashboardStatsDomain(props: any) {
  const {
    mode,
    todayStats,
    todayStr,
    userProfile,
    injections,
    operationalSellerId,
    canUseGlobalScope,
    showGlobalScope,
    setShowGlobalScope,
    canAccessAllUsers,
    globalChancePriceFilter,
    setGlobalChancePriceFilter,
    globalSettings,
    historyDate,
    setHistoryDate,
    historyTickets,
    ticketMatchesGlobalChancePrice,
    lotteries,
    cleanText,
    formatTime12h,
    results,
    users,
    userStats,
    appAlerts,
    appAlertsLoading,
  } = props;

  const role = String(userProfile?.role ?? '').toLowerCase();
  const canViewInjections = role === 'ceo' || role === 'admin';
  const currentUserEmail = String(userProfile?.email || '').toLowerCase();
  const [selectedNumberDetail, setSelectedNumberDetail] = useState<{ lotteryName: string; number: string } | null>(null);

  const {
    expandedStats,
    setExpandedStats,
    statsLotteries,
  } = useDashboardStatsDomain({
    mode,
    historyTickets,
    lotteries,
    cleanText,
    formatTime12h,
    ticketMatchesGlobalChancePrice,
    injections,
    todayStr,
    operationalSellerId,
  });

  const safeInjections = injections ?? [];
  const safeResults = results ?? [];
  const safeUsers = users ?? [];
  const safeAppAlerts = appAlerts ?? [];
  const timestampMs = (value: any) => value?.toDate?.()?.getTime?.() ?? (value?.seconds ? value.seconds * 1000 : 0);
  const todayBusinessRange = useMemo(() => {
    const start = new Date(`${todayStr}T03:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { startMs: start.getTime(), endMs: end.getTime() };
  }, [todayStr]);

  const isSameOperationalDay = (item: any) => {
    const metadataDate = String(item?.metadata?.date || item?.date || '');
    if (metadataDate) return metadataDate === todayStr;
    const createdAtMs = timestampMs(item?.createdAt);
    return createdAtMs >= todayBusinessRange.startMs && createdAtMs < todayBusinessRange.endMs;
  };

  const isInjectionAlertType = (type: unknown) => String(type || '').toLowerCase().includes('injection');

  const todaysGlobalInjections = useMemo(() => {
    return safeInjections.filter((inj: any) => inj?.date === todayStr);
  }, [safeInjections, todayStr]);

  const todaysReceivedInjections = useMemo(() => {
    if (!operationalSellerId && !currentUserEmail) return [];

    if (canViewInjections) {
      return safeInjections.filter(
        (inj: any) =>
          inj?.date === todayStr &&
          ((!!operationalSellerId && inj?.sellerId === operationalSellerId) ||
            (currentUserEmail && String(inj?.userEmail || '').toLowerCase() === currentUserEmail))
      );
    }

    return safeInjections.filter(
      (inj: any) => inj?.date === todayStr && (!!operationalSellerId && inj?.sellerId === operationalSellerId)
    );
  }, [canViewInjections, currentUserEmail, operationalSellerId, safeInjections, todayStr]);

  const globalInjectionsTotal = useMemo(() => {
    return todaysGlobalInjections
      .filter((inj: any) => !inj?.type || inj.type === 'injection')
      .reduce((sum: number, inj: any) => sum + Number(inj?.amount || 0), 0);
  }, [todaysGlobalInjections]);

  const receivedInjectionsTotal = useMemo(() => {
    return todaysReceivedInjections
      .filter((inj: any) => !inj?.type || inj.type === 'injection')
      .reduce((sum: number, inj: any) => sum + Number(inj?.amount || 0), 0);
  }, [todaysReceivedInjections]);

  const latestResults = useMemo(() => {
    return [...safeResults]
      .sort((a: any, b: any) => {
        if (a?.date !== b?.date) return String(b?.date || '').localeCompare(String(a?.date || ''));
        const aTime = a?.timestamp?.toDate?.()?.getTime?.() ?? (a?.timestamp?.seconds ? a.timestamp.seconds * 1000 : 0);
        const bTime = b?.timestamp?.toDate?.()?.getTime?.() ?? (b?.timestamp?.seconds ? b.timestamp.seconds * 1000 : 0);
        return bTime - aTime;
      })
      .slice(0, 3);
  }, [safeResults]);

  const injectionNotifications = useMemo(() => {
    if (!canViewInjections) return [];

    return safeUsers
      .map((u: any) => {
        const email = String(u?.email || '').toLowerCase();
        const stats = userStats?.[email];
        const requiredAmount = Math.max(0, -1 * (Number(stats?.utility || 0) + Number(stats?.injections || 0)));
        if (requiredAmount <= 0.005) return null;

        return {
          email,
          name: u?.name || u?.email || 'Usuario',
          sellerId: u?.sellerId || '-',
          requiredAmount,
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => (Number(b.requiredAmount || 0) - Number(a.requiredAmount || 0)))
      .slice(0, 5);
  }, [canViewInjections, safeUsers, userStats]);

  const latestInjectionByTargetEmail = useMemo(() => {
    const grouped = new Map<string, any>();
    const sorted = [...todaysGlobalInjections].sort((a: any, b: any) => {
      const aTime = a?.timestamp?.toDate?.()?.getTime?.() ?? (a?.timestamp?.seconds ? a.timestamp.seconds * 1000 : 0);
      const bTime = b?.timestamp?.toDate?.()?.getTime?.() ?? (b?.timestamp?.seconds ? b.timestamp.seconds * 1000 : 0);
      return bTime - aTime;
    });
    sorted.forEach((inj: any) => {
      const key = String(inj?.userEmail || '').toLowerCase();
      if (key && !grouped.has(key)) {
        grouped.set(key, inj);
      }
    });
    return grouped;
  }, [todaysGlobalInjections]);

  const visibleDashboardAlerts = useMemo(() => {
    const visibleAppAlerts = safeAppAlerts.filter((alert: any) => (
      isSameOperationalDay(alert) && !isInjectionAlertType(alert?.type)
    ));

    const appAlertRows = visibleAppAlerts.map((alert: any) => ({
      id: `app-${alert.id || alert.actionRef || alert.title}`,
      priority: Number(alert.priority || 0),
      title: alert.title || 'Alerta',
      message: alert.message || '',
      createdAtMs: timestampMs(alert.createdAt),
    }));

    return appAlertRows
      .sort((a, b) => {
        const priorityDiff = Number(b.priority || 0) - Number(a.priority || 0);
        if (priorityDiff !== 0) return priorityDiff;
        return Number(b.createdAtMs || 0) - Number(a.createdAtMs || 0);
      })
      .slice(0, 3);
  }, [safeAppAlerts, todayBusinessRange.endMs, todayBusinessRange.startMs, todayStr]);

  useEffect(() => {
    if (mode !== 'stats') return;
    if (!todayStr || !historyDate) return;
    if (historyDate === todayStr) return;
    setHistoryDate(todayStr);
  }, [historyDate, mode, setHistoryDate, todayStr]);

  const statsSourceTickets = useMemo(() => {
    return (historyTickets || [])
      .filter((ticket: any) => ticket?.status !== 'cancelled')
      .filter((ticket: any) => ticketMatchesGlobalChancePrice(ticket));
  }, [historyTickets, ticketMatchesGlobalChancePrice]);

  const selectedNumberPayload = useMemo(() => {
    if (mode !== 'stats' || !selectedNumberDetail) return null;

    const normalizedLottery = cleanText(selectedNumberDetail.lotteryName);
    const isGlobalMode = !!canUseGlobalScope && !!showGlobalScope;

    const matchingRows = statsSourceTickets
      .map((ticket: any) => {
        const matchingBets = (ticket?.bets || []).filter(
          (bet: any) =>
            bet?.type === 'CH' &&
            bet?.number === selectedNumberDetail.number &&
            cleanText(bet?.lottery || '') === normalizedLottery
        );
        if (!matchingBets.length) return null;

        const qty = matchingBets.reduce((sum: number, bet: any) => sum + Number(bet?.quantity || 0), 0);
        const amount = matchingBets.reduce((sum: number, bet: any) => sum + Number(bet?.amount || 0), 0);
        const timestamp = ticket?.timestamp?.toDate?.();
        const timeLabel = timestamp
          ? formatTime12h(`${String(timestamp.getHours()).padStart(2, '0')}:${String(timestamp.getMinutes()).padStart(2, '0')}`)
          : '--:--';

        return {
          ticketId: ticket?.id,
          customerLabel: getTicketPrimaryLabel(ticket),
          secondaryId: getTicketSecondaryId(ticket),
          sellerId: ticket?.sellerId || '-',
          sellerName: ticket?.sellerName || ticket?.sellerEmail || 'Usuario',
          sellerEmail: ticket?.sellerEmail || '',
          qty,
          amount,
          timeLabel,
          lottery: matchingBets[0]?.lottery || selectedNumberDetail.lotteryName,
        };
      })
      .filter(Boolean) as Array<{ ticketId: string; customerLabel: string; secondaryId: string; sellerId: string; sellerName: string; sellerEmail: string; qty: number; amount: number; timeLabel: string; lottery: string }>;

    const totalQty = matchingRows.reduce((sum, row) => sum + row.qty, 0);
    const totalAmount = matchingRows.reduce((sum, row) => sum + row.amount, 0);

    if (!isGlobalMode) {
      return {
        mode: 'own' as const,
        totalQty,
        totalAmount,
        rows: matchingRows.slice(0, 12),
      };
    }

    const grouped = new Map<string, { sellerLabel: string; qty: number; amount: number }>();
    matchingRows.forEach((row) => {
      const key = `${row.sellerId}|${row.sellerEmail}`.toLowerCase();
      const current = grouped.get(key) ?? { sellerLabel: `${row.sellerName} (${row.sellerId})`, qty: 0, amount: 0 };
      current.qty += row.qty;
      current.amount += row.amount;
      grouped.set(key, current);
    });

    return {
      mode: 'global' as const,
      totalQty,
      totalAmount,
      rows: Array.from(grouped.values()).sort((a, b) => b.qty - a.qty).slice(0, 12),
    };
  }, [canUseGlobalScope, cleanText, formatTime12h, mode, selectedNumberDetail, showGlobalScope, statsSourceTickets]);

  if (mode === 'dashboard') {
    return (
      <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="card-mini">
            <div className="value text-white">${todayStats.sales.toFixed(2)}</div>
            <div className="label">{canViewInjections ? 'Ventas globales' : 'Mis ventas'}</div>
          </div>
          <div className="card-mini">
            <div className="value text-red-400">${todayStats.prizes.toFixed(2)}</div>
            <div className="label">{canViewInjections ? 'Premios globales' : 'Mis premios'}</div>
          </div>
          <div className="card-mini">
            <div className={`value ${todayStats.netProfit > 0 ? 'text-green-400' : todayStats.netProfit < 0 ? 'text-red-400' : 'text-white'}`}>
              ${todayStats.netProfit.toFixed(2)}
            </div>
            <div className="label">{canViewInjections ? 'Utilidad global' : 'Mi utilidad'}</div>
          </div>
          <div className="card-mini">
            <div className={`value ${todayStats.netProfit > 0 ? 'text-green-400' : todayStats.netProfit < 0 ? 'text-red-400' : 'text-white'}`}>
              ${todayStats.netProfit.toFixed(2)}
            </div>
            <div className="label">{canViewInjections ? 'Balance global' : 'Mi balance'}</div>
          </div>
          {canViewInjections && globalInjectionsTotal > 0 && (
            <div className="card-mini col-span-2 sm:col-span-1">
              <div className="value text-yellow-400">${globalInjectionsTotal.toFixed(2)}</div>
              <div className="label flex items-center gap-1">
                <Zap className="w-3 h-3 text-yellow-500" />
                Inyecciones
              </div>
            </div>
          )}
        </div>

        <div className={`dashboard-panel p-2.5 space-y-1.5 ${visibleDashboardAlerts.some((alert: any) => Number(alert.priority || 0) >= 80) ? 'border-yellow-400/35' : ''}`}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Alertas</p>
          {appAlertsLoading && visibleDashboardAlerts.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">Cargando alertas...</p>
          ) : visibleDashboardAlerts.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">Sin alertas</p>
          ) : (
            visibleDashboardAlerts.map((alert: any) => {
              const tone = Number(alert.priority || 0) >= 100
                ? 'text-red-300'
                : Number(alert.priority || 0) >= 80
                  ? 'text-yellow-300'
                  : Number(alert.priority || 0) >= 70
                    ? 'text-blue-300'
                    : 'text-white/90';
              return (
                <div key={alert.id} className="text-[11px] leading-snug">
                  <p className={`font-semibold truncate ${tone}`}>{alert.title}</p>
                  <p className="text-white/70 truncate">{alert.message}</p>
                </div>
              );
            })
          )}
        </div>

        {canViewInjections && (
          <div className={`dashboard-panel p-2.5 space-y-1.5 ${injectionNotifications.length > 0 ? 'border-red-400/35' : ''}`}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Notificaciones de inyeccion</p>
            {injectionNotifications.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">Sin usuarios pendientes</p>
            ) : (
              injectionNotifications.map((alert: any) => (
                <div key={`need-${alert.email}`} className="flex items-center justify-between gap-2 text-[11px] leading-snug">
                  <div className="min-w-0">
                    <p className="font-semibold text-red-300 truncate">{alert.name}</p>
                    <p className="text-white/65 truncate">{alert.sellerId}</p>
                  </div>
                  <span className="shrink-0 font-semibold text-red-300">${Number(alert.requiredAmount || 0).toFixed(2)}</span>
                </div>
              ))
            )}
          </div>
        )}

        {canViewInjections && (
          <div className="dashboard-panel p-2.5 space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Inyecciones globales</p>
            {todaysGlobalInjections.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">Sin inyecciones hoy</p>
            ) : (
              <>
                <p className="text-[11px] text-yellow-400 font-semibold">Total: ${globalInjectionsTotal.toFixed(2)}</p>
                {todaysGlobalInjections.slice(0, 3).map((inj: any) => (
                  <div key={`global-${inj.id}`} className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="truncate text-white/85">
                      {(inj?.sellerId || inj?.userEmail || 'Usuario')} · {inj?.timestamp?.toDate
                        ? formatTime12h(`${inj.timestamp.toDate().getHours().toString().padStart(2, '0')}:${inj.timestamp.toDate().getMinutes().toString().padStart(2, '0')}`)
                        : '--:--'}
                    </span>
                    <span className="font-semibold text-yellow-400">${Number(inj?.amount || 0).toFixed(2)}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        <div className="dashboard-panel p-2.5 space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Inyecciones recibidas</p>
          {todaysReceivedInjections.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">Sin inyecciones recibidas hoy</p>
          ) : (
            <>
              <p className="text-[11px] text-yellow-400 font-semibold">Total recibido: ${receivedInjectionsTotal.toFixed(2)}</p>
              {todaysReceivedInjections.slice(0, 3).map((inj: any) => (
                <div key={`received-${inj.id}`} className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">
                    {inj?.timestamp?.toDate
                      ? formatTime12h(`${inj.timestamp.toDate().getHours().toString().padStart(2, '0')}:${inj.timestamp.toDate().getMinutes().toString().padStart(2, '0')}`)
                      : '--:--'}
                  </span>
                  <span className="font-semibold text-yellow-400">${Number(inj?.amount || 0).toFixed(2)}</span>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="dashboard-panel p-2.5 space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ultimos resultados</p>
          {latestResults.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">Sin resultados recientes</p>
          ) : (
            latestResults.map((result: any) => (
              <div key={`result-${result.id || `${result.lotteryId}-${result.date}`}`} className="flex items-center justify-between gap-2 text-[11px]">
                <span className="truncate text-white/90">{cleanText(result.lotteryName || 'Sorteo')}</span>
                <div className="flex items-center gap-1">
                  <span className="dashboard-result-chip dashboard-result-chip-first">{result.firstPrize || '--'}</span>
                  <span className="dashboard-result-chip dashboard-result-chip-second">{result.secondPrize || '--'}</span>
                  <span className="dashboard-result-chip dashboard-result-chip-third">{result.thirdPrize || '--'}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="dashboard-panel p-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {canViewInjections ? 'Ganancia/Perdida global' : 'Ganancia/Perdida personal'}
          </p>
          <p className={`text-sm font-bold ${todayStats.netProfit > 0 ? 'text-green-400' : todayStats.netProfit < 0 ? 'text-red-400' : 'text-white'}`}>
            ${todayStats.netProfit.toFixed(2)}
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div key="stats" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-3">
      <div className="glass-card p-3 sm:p-4 border border-white/10 space-y-2">
        <div className="space-y-2">
          {canUseGlobalScope ? (
            <div className="w-full grid grid-cols-2 rounded-lg overflow-hidden border border-white/12 bg-[#0A0F1A]/90">
              <button onClick={() => setShowGlobalScope(false)} className={`h-8 text-[10px] font-bold uppercase tracking-wider transition-colors ${!showGlobalScope ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-white'}`}>
                Propio
              </button>
              <button onClick={() => setShowGlobalScope(true)} className={`h-8 text-[10px] font-bold uppercase tracking-wider transition-colors ${showGlobalScope ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-white'}`}>
                Global
              </button>
            </div>
          ) : (
            <div className="w-full h-8 rounded-lg border border-white/10 bg-[#0A0F1A]/90 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-center">
              Propio
            </div>
          )}

          {canAccessAllUsers && (
            <select value={globalChancePriceFilter} onChange={(e) => setGlobalChancePriceFilter(e.target.value)} className="h-8 w-full bg-[#0A0F1A]/90 border border-white/12 px-2 rounded text-[11px] text-white focus:outline-none focus:border-primary/60">
              <option value="">Todos los precios</option>
              {(globalSettings.chancePrices || []).map((config: any, index: number) => (
                <option key={`stats-price-${config.price}-${index}`} value={config.price}>
                  Chance USD {config.price.toFixed(2)}
                </option>
              ))}
            </select>
          )}
        </div>

        {statsLotteries.length === 0 ? (
          <div className="text-center py-6 text-[11px] text-muted-foreground border border-white/10 rounded bg-[#0A0F1A]/90">
            No hay ventas registradas para hoy.
          </div>
        ) : (
          statsLotteries.map((entry: any) => {
            const isExpanded = expandedStats.includes(entry.lotteryName);

            const qtyByNum: number[] = Array.from({ length: 100 }, (_, i) => {
              const num = i.toString().padStart(2, '0');
              return entry.bets
                .filter((b: any) => b.type === 'CH' && b.number === num)
                .reduce((sum: number, b: any) => sum + (b.quantity || 0), 0);
            });
            const maxQty = Math.max(...qtyByNum, 0);

            return (
              <div key={entry.lotteryName} className="border border-white/10 rounded bg-[#0A0F1A]/92 overflow-hidden mb-1.5">
                <button
                  onClick={() => {
                    setExpandedStats((prev) => prev.includes(entry.lotteryName) ? prev.filter((n) => n !== entry.lotteryName) : [...prev, entry.lotteryName]);
                    setSelectedNumberDetail(null);
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-2 bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
                >
                  <h3 className="text-xs font-semibold text-primary truncate">
                    {cleanText(entry.lotteryName)}{entry.timeStr}
                  </h3>
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                </button>

                {isExpanded && (
                  <div className="px-2.5 py-2 border-t border-white/8 space-y-2">
                    <div>
                      <h4 className="text-[10px] font-bold text-white/70 mb-1">Numeros (00-99) - Tiempos</h4>
                      <div className="grid grid-cols-10 gap-[2px]">
                        {qtyByNum.map((totalQty: number, i: number) => {
                          const num = i.toString().padStart(2, '0');
                          const isClickable = totalQty > 0;
                          const isSelected = selectedNumberDetail?.lotteryName === entry.lotteryName && selectedNumberDetail?.number === num;

                          let qtyTone = 'text-white/30';
                          if (totalQty > 0) {
                            if (maxQty > 0 && totalQty === maxQty) qtyTone = 'text-emerald-300';
                            else if (totalQty >= 6) qtyTone = 'text-emerald-400';
                            else if (totalQty >= 3) qtyTone = 'text-emerald-500';
                            else qtyTone = 'text-emerald-400';
                          }

                          const cellClass = `p-0.5 flex flex-col items-center justify-center rounded-[2px] border ${isSelected ? 'border-emerald-400/50 bg-emerald-400/10' : totalQty > 0 ? 'border-emerald-500/25 bg-emerald-500/8' : 'border-white/10 bg-[#0A0F1A]/95'}`;

                          if (!isClickable) {
                            return (
                              <div key={num} className={cellClass}>
                                <span className="text-[9px] text-muted-foreground leading-none mb-0.5">{num}</span>
                                <span className={`text-[10px] font-semibold leading-none ${qtyTone}`}>-</span>
                              </div>
                            );
                          }

                          return (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setSelectedNumberDetail((prev) => (prev?.lotteryName === entry.lotteryName && prev?.number === num ? null : { lotteryName: entry.lotteryName, number: num }))}
                              className={`${cellClass} cursor-pointer`}
                            >
                              <span className="text-[9px] text-muted-foreground leading-none mb-0.5">{num}</span>
                              <span className={`text-[10px] font-bold leading-none ${qtyTone}`}>{totalQty}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {selectedNumberDetail?.lotteryName === entry.lotteryName && selectedNumberPayload && (
                      <div className="dashboard-panel p-2 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Detalle {selectedNumberDetail.number}</p>
                            <p className="text-[11px] text-white/80">{selectedNumberPayload.mode === 'global' ? 'Usuarios con ventas' : 'Tickets propios con ventas'}</p>
                          </div>
                          <button type="button" onClick={() => setSelectedNumberDetail(null)} className="text-[10px] text-muted-foreground hover:text-white">Cerrar</button>
                        </div>

                        {selectedNumberPayload.rows.length === 0 ? (
                          <p className="text-[11px] text-muted-foreground">Sin datos para este numero.</p>
                        ) : selectedNumberPayload.mode === 'global' ? (
                          <>
                            {selectedNumberPayload.rows.map((row: any, idx: number) => (
                              <div key={`global-row-${idx}`} className="flex items-center justify-between text-[11px]">
                                <span className="truncate text-white/85">{row.sellerLabel}</span>
                                <span className="text-emerald-400 font-semibold">{row.qty}t • ${row.amount.toFixed(2)}</span>
                              </div>
                            ))}
                            <div className="border-t border-white/10 pt-1 flex items-center justify-between text-[11px]">
                              <span className="text-muted-foreground">Total numero</span>
                              <span className="font-semibold text-white">{selectedNumberPayload.totalQty}t • ${selectedNumberPayload.totalAmount.toFixed(2)}</span>
                            </div>
                          </>
                        ) : (
                          <>
                            {selectedNumberPayload.rows.map((row: any) => (
                              <div key={`own-row-${row.ticketId}`} className="flex items-center justify-between text-[11px] gap-2">
                                <span className="truncate text-white/85">{row.customerLabel} {row.secondaryId ? `• ${row.secondaryId}` : ''} • {row.timeLabel} • {cleanText(row.lottery)}</span>
                                <span className="text-emerald-400 font-semibold">{row.qty}t • ${row.amount.toFixed(2)}</span>
                              </div>
                            ))}
                            <div className="border-t border-white/10 pt-1 flex items-center justify-between text-[11px]">
                              <span className="text-muted-foreground">Total numero</span>
                              <span className="font-semibold text-white">{selectedNumberPayload.totalQty}t • ${selectedNumberPayload.totalAmount.toFixed(2)}</span>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    <div>
                      <h4 className="text-[10px] text-white/70 mb-1">Combinaciones - Monto</h4>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
                        {(() => {
                          const combos: Record<string, number> = {};
                          entry.bets.forEach((b: any) => {
                            if (b.type === 'PL' || b.type === 'BL') {
                              const key = `${b.type} ${b.number}`;
                              combos[key] = (combos[key] || 0) + (b.amount || 0);
                            }
                          });
                          const comboEntries = Object.entries(combos).sort((a, b) => b[1] - a[1]);
                          if (comboEntries.length === 0) {
                            return <div className="col-span-full text-center py-1.5 text-[10px] text-muted-foreground border border-white/10 rounded bg-[#0A0F1A]/90">No hay combinaciones</div>;
                          }
                          return comboEntries.map(([key, total]) => (
                            <div key={key} className="bg-primary/5 border border-primary/20 p-1 rounded-[2px] flex flex-col items-center justify-center">
                              <span className="text-[9px] text-muted-foreground leading-none mb-0.5">{key}</span>
                              <span className="text-[10px] font-semibold text-white leading-none">${total.toFixed(2)}</span>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}
