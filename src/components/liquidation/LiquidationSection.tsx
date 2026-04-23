import React from 'react';
import { motion } from 'motion/react';
import { Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { canAccessLiquidationDomain } from '../../domains/liquidation/domainSpec';

type LiquidationSectionProps = any;

export function LiquidationSection(props: LiquidationSectionProps) {
  const {
    isPrimaryCeoUser,
    setConsolidatedMode,
    consolidatedMode,
    consolidatedReportDate,
    setConsolidatedReportDate,
    setConsolidatedStartDate,
    setConsolidatedEndDate,
    consolidatedStartDate,
    consolidatedEndDate,
    recentOperationalDates,
    generateConsolidatedReport,
    isGeneratingYesterdayReport,
    liquidationDate,
    setLiquidationDate,
    applyOperationalQuickDate,
    liquidacionQuickDateOptions,
    businessDayKey,
    isLiquidationDataLoading,
    userProfile,
    selectedUserToLiquidate,
    setSelectedUserToLiquidate,
    users,
    selectedLiquidationSettlement,
    amountPaid,
    setAmountPaid,
    handleLiquidate,
    liquidationPreview,
    shareImageDataUrl,
    downloadDataUrlFile,
  } = props;
  const canAccessDomain = canAccessLiquidationDomain(userProfile?.role, userProfile?.canLiquidate);
  const canGenerateConsolidated = isPrimaryCeoUser;
  const canManageDailyLiquidation = canAccessDomain;

  return (
    <motion.div
      key="liquidaciones"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-8"
    >
      <div className="glass-card p-4 sm:p-6 md:p-10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-6">
          <div>
            <h2 className="text-2xl font-black italic tracking-tighter neon-text uppercase">LIQUIDACIONES</h2>
            <p className="text-xs font-mono text-muted-foreground mt-1 uppercase tracking-widest">Cierre de caja y reporte de ventas</p>
          </div>
          {canGenerateConsolidated && (
            // TODO(remodel): split this block into its own "Ver consolidado" section in next visual phase.
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setConsolidatedMode('day')}
                  className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${consolidatedMode === 'day' ? 'bg-primary text-primary-foreground' : 'bg-white/5 text-muted-foreground'}`}
                >
                  Un Día
                </button>
                <button
                  onClick={() => setConsolidatedMode('range')}
                  className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${consolidatedMode === 'range' ? 'bg-primary text-primary-foreground' : 'bg-white/5 text-muted-foreground'}`}
                >
                  Rango
                </button>
              </div>
              {consolidatedMode === 'day' ? (
                <input
                  type="date"
                  value={consolidatedReportDate}
                  onChange={(e) => {
                    setConsolidatedReportDate(e.target.value);
                    setConsolidatedStartDate(e.target.value);
                    setConsolidatedEndDate(e.target.value);
                  }}
                  className="bg-black border border-border p-3 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                />
              ) : (
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="date"
                    value={consolidatedStartDate}
                    onChange={(e) => setConsolidatedStartDate(e.target.value)}
                    className="bg-black border border-border p-3 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  />
                  <input
                    type="date"
                    value={consolidatedEndDate}
                    onChange={(e) => setConsolidatedEndDate(e.target.value)}
                    className="bg-black border border-border p-3 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  />
                </div>
              )}
              <select
                value={consolidatedMode === 'day' ? consolidatedReportDate : consolidatedEndDate}
                onChange={(e) => {
                  if (consolidatedMode === 'day') {
                    setConsolidatedReportDate(e.target.value);
                  } else {
                    setConsolidatedEndDate(e.target.value);
                  }
                }}
                className="bg-black border border-border p-3 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              >
                {recentOperationalDates.map((dateValue: string) => (
                  <option key={`consolidated-${dateValue}`} value={dateValue} className="bg-gray-900">{dateValue}</option>
                ))}
              </select>
              <button
                onClick={generateConsolidatedReport}
                disabled={
                  isGeneratingYesterdayReport ||
                  (consolidatedMode === 'day' && !consolidatedReportDate) ||
                  (consolidatedMode === 'range' && (!consolidatedStartDate || !consolidatedEndDate))
                }
                className="bg-primary text-primary-foreground font-black uppercase tracking-widest px-4 py-3 rounded-xl hover:brightness-110 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isGeneratingYesterdayReport ? 'Generando PDF...' : 'Descargar Consolidado'}
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Fecha de Liquidación</label>
              <input
                type="date"
                value={liquidationDate}
                onChange={(e) => setLiquidationDate(e.target.value)}
                className="w-full bg-black border border-border p-3 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => applyOperationalQuickDate(setLiquidationDate, 0)}
                  className="px-2 py-1 rounded-md bg-white/5 text-[10px] font-black uppercase tracking-widest"
                >
                  Hoy
                </button>
                <button
                  type="button"
                  onClick={() => applyOperationalQuickDate(setLiquidationDate, -1)}
                  className="px-2 py-1 rounded-md bg-white/5 text-[10px] font-black uppercase tracking-widest"
                >
                  Ayer
                </button>
              </div>
              <select
                value={liquidationDate}
                onChange={(e) => setLiquidationDate(e.target.value)}
                className="w-full bg-black border border-border p-3 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              >
                {liquidacionQuickDateOptions.map((option: any) => (
                  <option key={`liq-${option.value}`} value={option.value} className="bg-gray-900">{option.label}</option>
                ))}
              </select>
              {liquidationDate !== businessDayKey && isLiquidationDataLoading && (
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Cargando datos históricos...</p>
              )}
            </div>

            {canManageDailyLiquidation ? (
              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Seleccionar Usuario</label>
                <select
                  value={selectedUserToLiquidate}
                  onChange={(e) => setSelectedUserToLiquidate(e.target.value)}
                  className="w-full bg-black border border-border p-3 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                >
                  <option key="default" value="" className="bg-gray-900">Seleccionar...</option>
                  {users.filter((u: any) => {
                    if (!u || !u.email || !u.name || u.name.trim() === '') return false;
                    if (userProfile?.role === 'ceo' || userProfile?.role === 'admin' || userProfile?.role === 'programador') return true;
                    return u.email === userProfile?.email;
                  }).map((u: any, i: number) => (
                    <option key={u.email || `liq-${i}`} value={u.email} className="bg-gray-900">{u.name} ({u.email?.split('@')[0] || ''})</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Usuario</p>
                <p className="text-sm font-bold text-white">{userProfile?.name}</p>
              </div>
            )}

            {selectedUserToLiquidate && canManageDailyLiquidation && (
              <>
                {selectedLiquidationSettlement && (
                  <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">
                      LIQUIDADO
                    </p>
                    <p className="text-[10px] font-mono text-emerald-200">
                      Monto registrado: USD {(selectedLiquidationSettlement.amountPaid || 0).toFixed(2)}
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Monto Entregado (USD)</label>
                  <input
                    type="number"
                    value={amountPaid === 'NaN' ? '' : amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    placeholder="Ej: 150.00"
                    className="w-full bg-white/5 border border-border p-3 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  />
                </div>

                <button
                  onClick={handleLiquidate}
                  className="w-full bg-primary text-primary-foreground font-black uppercase tracking-widest py-4 rounded-xl hover:brightness-110 transition-all mt-6 shadow-lg shadow-primary/20"
                >
                  {selectedLiquidationSettlement ? `Actualizar liquidación ${liquidationDate}` : `Liquidar día ${liquidationDate}`}
                </button>
              </>
            )}
          </div>

          <div className="lg:col-span-2">
            {selectedUserToLiquidate ? (() => {
              const userToLiquidate = liquidationPreview?.userToLiquidate;
              const summary = liquidationPreview?.financialSummary;
              if (!summary) return null;
              const previousDebt = selectedLiquidationSettlement
                ? selectedLiquidationSettlement.previousDebt
                : (userToLiquidate?.currentDebt || 0);

              return (
                <div id="liquidation-report" className="glass-card p-8 space-y-8 bg-black border-white/10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl" />

                  <div className="flex justify-between items-start border-b border-white/10 pb-6">
                    <div>
                      <h3 className="text-xl font-black uppercase tracking-tighter text-primary">REPORTE DE VENTAS</h3>
                      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">{liquidationDate}</p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-xs font-black text-white">{userToLiquidate?.name}</p>
                      <p className="text-[9px] font-mono text-muted-foreground uppercase">ID: {userToLiquidate?.sellerId}</p>
                      {selectedLiquidationSettlement && (
                        <span className="inline-block rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-300">
                          LIQUIDADO
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                      <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Ventas Totales</span>
                      <span className="text-sm font-bold text-white">USD {summary.totalSales.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                      <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Comisiones Generadas</span>
                      <span className="text-sm font-bold text-amber-400">USD {summary.totalCommissions.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                      <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Premios a Pagar</span>
                      <span className="text-sm font-bold text-red-400">USD {summary.totalPrizes.toFixed(2)}</span>
                    </div>
                    {summary.totalInjections !== 0 && (
                      <div className="flex justify-between items-center py-2 border-b border-white/5">
                        <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Inyecciones/Ajustes</span>
                        <span className="text-sm font-bold text-blue-400">USD {summary.totalInjections.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="bg-primary/5 p-6 rounded-2xl border border-primary/20 flex justify-between items-center">
                      <div>
                        <p className="text-[10px] font-mono text-primary uppercase tracking-widest mb-1">Balance Neto del Día</p>
                        <p className="text-xs text-muted-foreground uppercase tracking-tighter">Monto a entregar a la casa</p>
                      </div>
                      <p className="text-3xl font-black text-primary">USD {summary.netProfit.toFixed(2)}</p>
                    </div>

                    <div className="pt-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Deuda Acumulada</span>
                        <span className="text-sm font-bold text-white">USD {previousDebt.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-8 flex gap-4 no-print">
                    <button
                      onClick={async () => {
                        const reportEl = document.getElementById('liquidation-report');
                        if (!reportEl) return;

                        const toastId = toast.loading('Generando reporte...');
                        try {
                          await document.fonts.ready;
                          await new Promise(resolve => setTimeout(resolve, 300));

                          const lib = await import('html-to-image');
                          const dataUrl = await lib.toPng(reportEl, {
                            backgroundColor: '#0f172a',
                            pixelRatio: 2,
                            style: {
                              transform: 'scale(1)',
                              transformOrigin: 'top left'
                            }
                          });

                          const fileName = `Reporte-${userToLiquidate?.name || 'Usuario'}-${liquidationDate}.png`;

                          const shared = await shareImageDataUrl({
                            dataUrl,
                            fileName,
                            title: 'Reporte de Liquidación',
                            text: `Reporte de ventas de ${userToLiquidate?.name || 'Usuario'} para el día ${liquidationDate}`,
                            dialogTitle: 'Compartir Reporte'
                          });

                          if (shared) {
                            toast.success('Reporte compartido', { id: toastId });
                          } else {
                            downloadDataUrlFile(dataUrl, fileName);
                            toast.info('Tu dispositivo no permite compartir imágenes adjuntas. Se descargó para envío manual.', { id: toastId });
                          }

                        } catch (error) {
                          console.error('Error generating report:', error);
                          toast.error('Error al generar el reporte', { id: toastId });
                        }
                      }}
                      className="flex-1 bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                    >
                      <Share2 className="w-4 h-4" /> Compartir Reporte
                    </button>
                  </div>
                </div>
              );
            })() : (
              <div className="h-full flex items-center justify-center text-muted-foreground font-mono text-sm uppercase tracking-widest border-2 border-dashed border-border rounded-2xl p-10">
                Seleccione un usuario para ver su reporte detallado
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
