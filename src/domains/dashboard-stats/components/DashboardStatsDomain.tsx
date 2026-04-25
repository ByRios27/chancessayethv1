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

  const role = String(userProfile?.role ?? '').toLowerCase();
  const canViewInjections = role === 'ceo' || role === 'admin';

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
      <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
        <div className="grid grid-cols-2 gap-3">
          <div className="card-mini">
            <div className="value text-white">${todayStats.sales.toFixed(2)}</div>
            <div className="label">Ventas</div>
          </div>
          <div className="card-mini">
            <div className="value text-white">${todayStats.prizes.toFixed(2)}</div>
            <div className="label">Premios</div>
          </div>
          <div className="card-mini">
            <div className={`value ${todayStats.netProfit > 0 ? 'text-green-400' : todayStats.netProfit < 0 ? 'text-red-400' : 'text-white'}`}>
              ${todayStats.netProfit.toFixed(2)}
            </div>
            <div className="label">Utilidad</div>
          </div>
          <div className="card-mini">
            <div className={`value ${todayStats.netProfit > 0 ? 'text-green-400' : todayStats.netProfit < 0 ? 'text-red-400' : 'text-white'}`}>
              ${todayStats.netProfit.toFixed(2)}
            </div>
            <div className="label">Balance</div>
          </div>
          {canViewInjections && recentInjections.length > 0 && (
            <div className="card-mini col-span-2 sm:col-span-1">
              <div className="value text-yellow-400">
                ${recentInjections.reduce((sum: number, inj: any) => sum + (inj.amount || 0), 0).toFixed(2)}
              </div>
              <div className="label flex items-center gap-1">
                <Zap className="w-3 h-3 text-yellow-500" />
                Inyecciones
              </div>
            </div>
          )}
        </div>

        {canViewInjections && recentInjections.length === 0 && (
          <span className="block px-1 text-[11px] text-muted-foreground">Sin inyecciones hoy</span>
        )}
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
