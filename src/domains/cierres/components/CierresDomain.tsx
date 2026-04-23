import { motion } from 'motion/react';
import { Share2 } from 'lucide-react';
import { format } from 'date-fns';
import { useCierresDomain } from '../hooks/useCierresDomain';

export function CierresDomain(props: any) {
  const {
    canUseGlobalScope,
    showGlobalScope,
    setShowGlobalScope,
    canAccessAllUsers,
    globalChancePriceFilter,
    setGlobalChancePriceFilter,
    globalSettings,
    historyDate,
    setHistoryDate,
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
      <div className="glass-card p-4 sm:p-6 border border-white/5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h2 className="text-xl font-light text-white">Cierres de Sorteo</h2>
            <p className="text-sm font-light text-muted-foreground mt-1">Genera y comparte el reporte de ventas por sorteo</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            {canUseGlobalScope && (
              <div className="flex bg-black/30 border border-white/10 rounded overflow-hidden">
                <button
                  onClick={() => setShowGlobalScope(false)}
                  className={`px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${!showGlobalScope ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-white'}`}
                >
                  Propio
                </button>
                <button
                  onClick={() => setShowGlobalScope(true)}
                  className={`px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${showGlobalScope ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-white'}`}
                >
                  Global
                </button>
              </div>
            )}
            {canAccessAllUsers && (
              <select
                value={globalChancePriceFilter}
                onChange={(e) => setGlobalChancePriceFilter(e.target.value)}
                className="bg-black/30 border border-white/10 p-2 rounded text-sm text-white focus:outline-none focus:border-primary/50 font-light w-full sm:w-auto"
              >
                <option value="">Todos los precios</option>
                {(globalSettings.chancePrices || []).map((config: any, index: number) => (
                  <option key={`cierre-price-${config.price}-${index}`} value={config.price}>
                    Chance USD {config.price.toFixed(2)}
                  </option>
                ))}
              </select>
            )}
            <input
              type="date"
              value={historyDate}
              onChange={(e) => setHistoryDate(e.target.value)}
              className="bg-black/30 border border-white/10 p-2 rounded text-sm text-white focus:outline-none focus:border-primary/50 font-light w-full sm:w-auto"
            />
            <select
              value={cierreLottery}
              onChange={(e) => setCierreLottery(e.target.value)}
              className="bg-black/30 border border-white/10 p-2 rounded text-sm text-white focus:outline-none focus:border-primary/50 font-light w-full sm:w-auto"
            >
              <option value="">Seleccione un sorteo</option>
              {lotteries.map((l: any) => (
                <option key={l.id} value={l.name}>{cleanText(l.name)}</option>
              ))}
            </select>
            <button
              onClick={handleDownloadCierre}
              disabled={!cierreLottery}
              className="flex items-center justify-center gap-2 bg-primary/20 hover:bg-primary/30 text-primary p-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Compartir"
            >
              <Share2 className="w-4 h-4" />
              <span className="sm:hidden">Compartir</span>
            </button>
          </div>
        </div>

        {cierreLottery && cierreData ? (
          <div className="overflow-x-auto bg-white rounded p-4 sm:p-8" style={{ color: '#000' }}>
            <div ref={cierreRef} className="bg-white w-full max-w-3xl mx-auto" style={{ padding: '20px' }}>
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
        ) : (
          <div className="text-center py-12 text-muted-foreground font-light border border-white/5 rounded bg-black/20">
            Seleccione un sorteo para ver el cierre.
          </div>
        )}
      </div>
    </motion.div>
  );
}
