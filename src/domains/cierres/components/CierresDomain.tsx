import { motion } from 'motion/react';
import { Share2 } from 'lucide-react';
import { format } from 'date-fns';
import type { Lottery } from '../../../types/lotteries';
import { useCierresDomain } from '../hooks/useCierresDomain';
import { CIERRES_DOMAIN_SPEC } from '../domainSpec';

interface CierresDomainProps {
  canUseGlobalScope: boolean;
  showGlobalScope: boolean;
  setShowGlobalScope: (value: boolean) => void;
  canAccessAllUsers: boolean;
  globalChancePriceFilter: string;
  setGlobalChancePriceFilter: (value: string) => void;
  globalSettings: { chancePrices?: Array<{ price: number }> };
  historyDate: string;
  setHistoryDate: (value: string) => void;
  lotteries?: Lottery[];
  cleanText: (value: string) => string;
  userProfile?: { name?: string; sellerId?: string };
  user?: { displayName?: string; email?: string };
  formatTime12h: (value: string) => string;
  historyTickets: unknown[];
  operationalSellerId?: string;
  ticketMatchesGlobalChancePrice: (ticket: unknown) => boolean;
  shareImageDataUrl: (params: {
    dataUrl: string;
    fileName: string;
    title: string;
    text: string;
    dialogTitle: string;
  }) => Promise<boolean>;
  downloadDataUrlFile: (dataUrl: string, fileName: string) => void;
}

export function CierresDomain(props: CierresDomainProps) {
  const {
    canUseGlobalScope,
    showGlobalScope,
    setShowGlobalScope,
    canAccessAllUsers,
    globalChancePriceFilter,
    setGlobalChancePriceFilter,
    globalSettings,
    historyDate,
    lotteries,
    cleanText,
    userProfile,
    user,
    formatTime12h,
    historyTickets,
    operationalSellerId,
    ticketMatchesGlobalChancePrice,
    shareImageDataUrl,
    downloadDataUrlFile,
  } = props;
  const safeLotteries = lotteries ?? [];

  const safeSetShowGlobalScope = (value: boolean) => {
    if (typeof setShowGlobalScope !== 'function') {
      console.error('[CierresDomain] Callback invalido: setShowGlobalScope', setShowGlobalScope);
      return;
    }
    setShowGlobalScope(value);
  };

  const safeSetGlobalChancePriceFilter = (value: string) => {
    if (typeof setGlobalChancePriceFilter !== 'function') {
      console.error('[CierresDomain] Callback invalido: setGlobalChancePriceFilter', setGlobalChancePriceFilter);
      return;
    }
    setGlobalChancePriceFilter(value);
  };

  const safeSetCierreLottery = (value: string) => {
    if (typeof setCierreLottery !== 'function') {
      console.error('[CierresDomain] Callback invalido: setCierreLottery', setCierreLottery);
      return;
    }
    setCierreLottery(value);
  };

  const safeHandleDownloadCierre = () => {
    if (typeof handleDownloadCierre !== 'function') {
      console.error('[CierresDomain] Callback invalido: handleDownloadCierre', handleDownloadCierre);
      return;
    }
    handleDownloadCierre();
  };

  const {
    cierreLottery,
    setCierreLottery,
    cierreRef,
    cierreData,
    handleDownloadCierre,
  } = useCierresDomain({
    historyTickets,
    lotteries,
    cleanText,
    canAccessAllUsers,
    operationalSellerId,
    ticketMatchesGlobalChancePrice,
    historyDate,
    shareImageDataUrl,
    downloadDataUrlFile,
  });

  return (
    <motion.div
      key="cierres"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-6"
    >
      <div className="glass-card p-3 sm:p-4 border border-white/10 space-y-3">
        <div className="space-y-2">
          {canUseGlobalScope && (
            <div className="w-full grid grid-cols-2 rounded-lg overflow-hidden border border-white/12 bg-black/25">
              <button
                onClick={() => safeSetShowGlobalScope(false)}
                className={`h-8 text-[10px] font-bold uppercase tracking-wider transition-colors ${!showGlobalScope ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-white'}`}
              >
                Propio
              </button>
              <button
                onClick={() => safeSetShowGlobalScope(true)}
                className={`h-8 text-[10px] font-bold uppercase tracking-wider transition-colors ${showGlobalScope ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-white'}`}
              >
                Global
              </button>
            </div>
          )}
          {!canUseGlobalScope && (
            <div className="w-full h-8 rounded-lg border border-white/10 bg-black/25 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-center">
              Propio
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2">
            {canAccessAllUsers && (
              <select
                value={globalChancePriceFilter}
                onChange={(e) => safeSetGlobalChancePriceFilter(e.target.value)}
                className="h-8 bg-black/25 border border-white/12 px-2 rounded text-[11px] text-white focus:outline-none focus:border-primary/60 w-full"
              >
                <option value="">Todos los precios</option>
                {(globalSettings.chancePrices || []).map((config, index) => (
                  <option key={`cierre-price-${config.price}-${index}`} value={config.price}>
                    Chance USD {config.price.toFixed(2)}
                  </option>
                ))}
              </select>
            )}
            <select
              value={cierreLottery}
              onChange={(e) => safeSetCierreLottery(e.target.value)}
              className="h-8 bg-black/25 border border-white/12 px-2 rounded text-[11px] text-white focus:outline-none focus:border-primary/60 w-full"
            >
              <option value="">Seleccione un sorteo</option>
              {safeLotteries.map((l) => (
                <option key={l.id} value={l.name}>{cleanText(l.name)}</option>
              ))}
            </select>
            <button
              onClick={safeHandleDownloadCierre}
              disabled={!cierreLottery}
              className="h-8 px-3 flex items-center justify-center gap-1.5 bg-primary/20 hover:bg-primary/30 text-primary rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-[11px] font-semibold"
              title="Compartir"
            >
              <Share2 className="w-3.5 h-3.5" />
              Compartir
            </button>
          </div>
        </div>

        {cierreLottery && cierreData ? (
          <>
            <div className="w-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-3 space-y-3">
              <div className="space-y-1">
                <p className="text-xs font-black uppercase tracking-wider text-white">CIERRE · {cleanText(cierreLottery)}</p>
                <p className="text-[10px] text-muted-foreground">
                  {cierreData.lotteryInfo?.drawTime ? formatTime12h(cierreData.lotteryInfo.drawTime) : '--:--'} · {canUseGlobalScope && showGlobalScope ? 'Global' : 'Propio'}
                </p>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded-md border border-white/10 bg-black/20 px-2 py-1.5">
                    <p className="text-muted-foreground">Total vendido</p>
                    <p className="font-semibold text-white">${cierreData.totalVendido.toFixed(2)}</p>
                  </div>
                  <div className="rounded-md border border-white/10 bg-black/20 px-2 py-1.5">
                    <p className="text-muted-foreground">Tiempos</p>
                    <p className="font-semibold text-white">{cierreData.totalTiempos}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-1.5">
                {Array.from({ length: 100 }).map((_, index) => {
                  const num = index.toString().padStart(2, '0');
                  const qty = cierreData.getQty(num);
                  return (
                    <div key={`preview-num-${num}`} className="rounded-md border border-white/10 bg-black/20 px-2 py-1 text-center text-xs">
                      <p className="text-white/80 font-semibold leading-none">{num}</p>
                      <p className="text-muted-foreground leading-none mt-1">{qty}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div aria-hidden="true" className="absolute -left-[9999px] top-0 pointer-events-none">
              <div ref={cierreRef} className="bg-white w-full max-w-3xl mx-auto" style={{ padding: '20px', color: '#000' }}>
                <div className="mb-6">
                  <h1 className="text-2xl font-bold mb-2">Cierre: {cleanText(cierreLottery)}</h1>
                  <div className="text-sm mb-1">
                    <span className="font-semibold">Fecha:</span> {historyDate} <span className="font-semibold ml-4">Horario:</span> {cierreData.lotteryInfo?.drawTime ? formatTime12h(cierreData.lotteryInfo.drawTime) : '--:--'}
                  </div>
                  <div className="text-sm mb-4">
                    <span className="font-semibold">Operador:</span> {userProfile?.name || user?.displayName || 'Vendedor'} ({userProfile?.sellerId || user?.email})
                  </div>
                  {canAccessAllUsers && globalChancePriceFilter && (
                    <div className="text-sm mb-2">
                      <span className="font-semibold">Precio Chance:</span> USD {parseFloat(globalChancePriceFilter).toFixed(2)}
                    </div>
                  )}
                  <div className="flex justify-between items-center text-lg font-bold border-b-2 border-black pb-2">
                    <span>Total Tiempos: {cierreData.totalTiempos}</span>
                    <span>Total Vendido: ${cierreData.totalVendido.toFixed(2)}</span>
                  </div>
                </div>

                <table className="w-full text-sm border-collapse mb-6">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border p-2 text-center w-1/6">Num</th>
                      <th className="border p-2 text-center w-1/6">Tiempos</th>
                      <th className="border p-2 text-center w-1/6">Num</th>
                      <th className="border p-2 text-center w-1/6">Tiempos</th>
                      <th className="border p-2 text-center w-1/6">Num</th>
                      <th className="border p-2 text-center w-1/6">Tiempos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 34 }).map((_, i) => (
                      <tr key={i} className="even:bg-gray-50">
                        <td className="border p-1.5 text-center font-semibold">{cierreData.col1[i]}</td>
                        <td className="border p-1.5 text-center text-gray-600">{cierreData.getQty(cierreData.col1[i])}</td>
                        <td className="border p-1.5 text-center font-semibold">{cierreData.col2[i]}</td>
                        <td className="border p-1.5 text-center text-gray-600">{cierreData.getQty(cierreData.col2[i])}</td>
                        <td className="border p-1.5 text-center font-semibold">{cierreData.col3[i] || ''}</td>
                        <td className="border p-1.5 text-center text-gray-600">{cierreData.col3[i] ? cierreData.getQty(cierreData.col3[i]) : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {cierreData.comboEntries.length > 0 && (
                  <div>
                    <h2 className="text-lg font-bold mb-3 border-b border-gray-300 pb-1">Combinaciones (Pale / Billete)</h2>
                    <div className="grid grid-cols-4 gap-4">
                      {cierreData.comboEntries.map(([key, total]: [string, number]) => (
                        <div key={key} className="border border-gray-200 p-2 rounded text-center bg-gray-50">
                          <div className="font-semibold text-sm">{key}</div>
                          <div className="text-gray-700 text-sm">${total.toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-8 text-right text-xs text-gray-400">
                  Generado: {format(new Date(), 'dd/MM/yyyy, hh:mm:ss a')}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-[11px] text-muted-foreground border border-white/8 rounded bg-black/20">
            {CIERRES_DOMAIN_SPEC.emptyStates.noLotterySelected}
          </div>
        )}
      </div>
    </motion.div>
  );
}
