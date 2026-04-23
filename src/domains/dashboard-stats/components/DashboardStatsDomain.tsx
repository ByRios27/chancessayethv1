import { motion } from 'motion/react';
import { ChevronDown, ChevronRight, LayoutDashboard, Zap } from 'lucide-react';
import { useDashboardStatsDomain } from '../hooks/useDashboardStatsDomain';

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
  } = props;

  const {
    expandedStats,
    setExpandedStats,
    recentInjections,
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

  if (mode === 'dashboard') {
    return (
      <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="glass-card p-3 border-white/5 bg-white/[0.02]">
              <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-0.5">Ventas del dia</p>
              <p className="text-lg font-medium text-white">${todayStats.sales.toFixed(2)}</p>
            </div>
            <div className="glass-card p-3 border-white/5 bg-white/[0.02]">
              <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-0.5">Utilidad neta</p>
              <p className={`text-lg font-medium ${todayStats.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${todayStats.netProfit.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="glass-card p-3 border-white/5 bg-white/[0.02]">
              <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-0.5">Premios pagados</p>
              <p className="text-lg font-medium text-white">${todayStats.prizes.toFixed(2)}</p>
            </div>
            <div className="glass-card p-3 border-white/5 bg-white/[0.02]">
              <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-0.5">Balance actual</p>
              <p className="text-lg font-medium text-white">${todayStats.netProfit.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className={`${userProfile?.role === 'seller' ? 'xl:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-6'}`}>
          <div className="glass-card p-6 border-white/5 bg-white/[0.02]">
            <h3 className="text-xs font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              Inyecciones Recibidas
            </h3>
            <div className="space-y-3">
              {recentInjections.map((inj: any) => (
                <div key={inj.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-white uppercase tracking-tighter">Inyeccion Recibida</span>
                    <span className="text-[9px] text-muted-foreground font-mono">
                      {inj.timestamp?.toDate ? formatTime12h(`${inj.timestamp.toDate().getHours().toString().padStart(2, '0')}:${inj.timestamp.toDate().getMinutes().toString().padStart(2, '0')}`) : ''}
                    </span>
                  </div>
                  <span className={`text-xs font-black ${inj.type === 'injection' ? 'text-yellow-400' : 'text-blue-400'}`}>
                    {inj.type === 'injection' ? '+' : '-'}${inj.amount.toFixed(2)}
                  </span>
                </div>
              ))}
              {((injections || []).filter((i: any) => i.date === todayStr && (!!operationalSellerId && i.sellerId === operationalSellerId)).length === 0) && (
                <p className="text-center py-4 text-[10px] text-muted-foreground uppercase font-bold">No hay inyecciones hoy</p>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div key="stats" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
      <div className="glass-card p-4 sm:p-6 border border-white/5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h2 className="text-xl font-light text-white">Estadisticas de Venta</h2>
            <p className="text-sm font-light text-muted-foreground mt-1">Fracciones y combinaciones por sorteo</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            {canUseGlobalScope && (
              <div className="flex bg-black/30 border border-white/10 rounded overflow-hidden">
                <button onClick={() => setShowGlobalScope(false)} className={`px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${!showGlobalScope ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-white'}`}>
                  Propio
                </button>
                <button onClick={() => setShowGlobalScope(true)} className={`px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${showGlobalScope ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-white'}`}>
                  Global
                </button>
              </div>
            )}
            {canAccessAllUsers && (
              <select value={globalChancePriceFilter} onChange={(e) => setGlobalChancePriceFilter(e.target.value)} className="bg-black/30 border border-white/10 p-2 rounded text-sm text-white focus:outline-none focus:border-primary/50 font-light">
                <option value="">Todos los precios</option>
                {(globalSettings.chancePrices || []).map((config: any, index: number) => (
                  <option key={`stats-price-${config.price}-${index}`} value={config.price}>
                    Chance USD {config.price.toFixed(2)}
                  </option>
                ))}
              </select>
            )}
            <input type="date" value={historyDate} onChange={(e) => setHistoryDate(e.target.value)} className="bg-black/30 border border-white/10 p-2 rounded text-sm text-white focus:outline-none focus:border-primary/50 font-light" />
          </div>
        </div>

        {statsLotteries.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground font-light border border-white/5 rounded bg-black/20">
            No hay ventas registradas para esta fecha.
          </div>
        ) : (
          statsLotteries.map((entry: any) => {
            const isExpanded = expandedStats.includes(entry.lotteryName);
            return (
              <div key={entry.lotteryName} className="mb-2 border border-white/10 rounded bg-black/20 overflow-hidden">
                <button
                  onClick={() => setExpandedStats((prev) => prev.includes(entry.lotteryName) ? prev.filter((n) => n !== entry.lotteryName) : [...prev, entry.lotteryName])}
                  className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <h3 className="text-sm font-light text-primary">{cleanText(entry.lotteryName)}{entry.timeStr}</h3>
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                </button>

                {isExpanded && (
                  <div className="p-3 border-t border-white/5">
                    <div className="mb-4">
                      <h4 className="text-xs font-light text-white/70 mb-2">Numeros (00-99) - Fracciones</h4>
                      <div className="grid grid-cols-10 gap-[2px]">
                        {Array.from({ length: 100 }).map((_, i) => {
                          const num = i.toString().padStart(2, '0');
                          const totalQty = entry.bets.filter((b: any) => b.type === 'CH' && b.number === num).reduce((s: number, b: any) => s + (b.quantity || 0), 0);
                          return (
                            <div key={num} className={`p-0.5 flex flex-col items-center justify-center rounded-[2px] ${totalQty > 0 ? 'bg-primary/10 border border-primary/20' : 'bg-black/40 border border-white/5'}`}>
                              <span className="text-[9px] font-light text-muted-foreground leading-none mb-0.5">{num}</span>
                              <span className={`text-[10px] font-light leading-none ${totalQty > 0 ? 'text-white' : 'text-white/20'}`}>{totalQty > 0 ? totalQty : '-'}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-light text-white/70 mb-2">Combinaciones - Monto</h4>
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
                            return <div className="col-span-full text-center py-2 text-[10px] font-light text-muted-foreground border border-white/5 rounded bg-black/20">No hay combinaciones</div>;
                          }
                          return comboEntries.map(([key, total]) => (
                            <div key={key} className="bg-primary/5 border border-primary/20 p-1.5 rounded-[2px] flex flex-col items-center justify-center">
                              <span className="text-[9px] font-light text-muted-foreground leading-none mb-0.5">{key}</span>
                              <span className="text-[10px] font-light text-white leading-none">${total.toFixed(2)}</span>
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
