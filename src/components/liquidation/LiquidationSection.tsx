import React, { useState } from 'react';
import { motion } from 'motion/react';
import { CalendarDays, CheckCircle2, Download, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { canAccessLiquidationDomain } from '../../domains/liquidation/domainSpec';

type LiquidationSectionProps = any;

const formatCurrency = (value?: number) => `USD ${Number(value || 0).toFixed(2)}`;
const formatSignedCurrency = (value?: number) => {
  const amount = Number(value || 0);
  return `${amount < 0 ? '-' : ''}USD ${Math.abs(amount).toFixed(2)}`;
};
const formatInputAmount = (value?: number) => Number(value || 0).toFixed(2);
const BALANCE_EPSILON = 0.005;

const getOperationalProfit = (summary: any) => Number(summary?.operationalProfit ?? summary?.netProfit ?? 0);

const getResultTone = (value: number) => {
  if (value > 0) return 'text-emerald-300';
  if (value < 0) return 'text-red-500';
  return 'text-slate-200';
};

const getBalanceDirection = (value: number) => {
  if (value > 0) return {
    label: 'Ganancia',
    tone: 'text-emerald-300',
    box: 'border-emerald-400/25 bg-emerald-500/10',
  };
  if (value < 0) return {
    label: 'Perdida',
    tone: 'text-red-500',
    box: 'border-red-500/30 bg-red-500/10',
  };
  return {
    label: 'Sin datos',
    tone: 'text-slate-200',
    box: 'border-white/10 bg-white/[0.04]',
  };
};

const hasDailyMovement = (summary: any) => (
  Math.abs(Number(summary?.totalSales || 0)) > 0 ||
  Math.abs(Number(summary?.totalPrizes || 0)) > 0 ||
  Math.abs(Number(summary?.totalCommissions || 0)) > 0 ||
  Math.abs(Number(summary?.totalInjections || 0)) > 0 ||
  Math.abs(getOperationalProfit(summary)) > 0
);

export function LiquidationSection(props: LiquidationSectionProps) {
  const {
    setConsolidatedMode,
    consolidatedMode,
    consolidatedReportDate,
    setConsolidatedReportDate,
    setConsolidatedStartDate,
    setConsolidatedEndDate,
    consolidatedStartDate,
    consolidatedEndDate,
    generateConsolidatedReport,
    isGeneratingYesterdayReport,
    liquidationDate,
    setLiquidationDate,
    businessDayKey,
    isLiquidationDataLoading,
    userProfile,
    selectedUserToLiquidate,
    setSelectedUserToLiquidate,
    selectedLiquidationSettlement,
    liquidationUserSummaries = [],
    amountPaid,
    setAmountPaid,
    amountDirection = 'received',
    setAmountDirection,
    handleLiquidate,
    liquidationPreview,
    shareImageDataUrl,
    downloadDataUrlFile,
    liquidationRangeStartDate,
    setLiquidationRangeStartDate,
    liquidationRangeEndDate,
    setLiquidationRangeEndDate,
    liquidationRangeReport,
    isLiquidationRangeLoading,
    fetchLiquidationRangeReport,
  } = props;

  const [liquidationMode, setLiquidationMode] = useState<'daily' | 'range'>('daily');
  const [rangeViewMode, setRangeViewMode] = useState<'global' | 'daily'>('global');

  const canManageDailyLiquidation = userProfile?.role === 'ceo' || userProfile?.role === 'admin';
  const canAccessDomain = canAccessLiquidationDomain(userProfile?.role, userProfile?.canLiquidate);
  const canGenerateConsolidated = canManageDailyLiquidation;
  const isSeller = userProfile?.role === 'seller';

  const userToLiquidate = liquidationPreview?.userToLiquidate;
  const summary = liquidationPreview?.financialSummary;
  const hasReport = !!summary && (!!selectedUserToLiquidate || !!userToLiquidate?.email || isSeller);
  const isClosed = !!selectedLiquidationSettlement;

  const operationalProfit = getOperationalProfit(summary);
  const dailyInjectionTotal = Number(summary?.totalInjections || 0);
  const dayCapital = operationalProfit + dailyInjectionTotal;
  const amountEntered = Number(amountPaid) || 0;
  const amountMovementLabel = amountDirection === 'sent' ? 'Monto enviado' : 'Monto recibido';
  const amountEffect = amountDirection === 'sent' ? amountEntered : -amountEntered;
  const dailyRemainingBalance = dayCapital + amountEffect;
  const resultDirection = getBalanceDirection(operationalProfit);
  const isDailyLiquidated = isClosed && Math.abs(dailyRemainingBalance) <= BALANCE_EPSILON;
  const hasDailyPending = hasReport && Math.abs(dailyRemainingBalance) > BALANCE_EPSILON;
  const dailyStatus = isDailyLiquidated
    ? {
      label: 'Liquidado',
      className: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300',
      icon: true,
    }
    : hasDailyPending
      ? {
        label: 'Pendiente',
        className: 'border-orange-400/30 bg-orange-500/10 text-orange-300',
        icon: false,
      }
      : null;

  const sellerOptions = (liquidationUserSummaries || [])
    .filter((row: any) => {
      const user = row?.user;
      if (!user?.email) return false;
      return user.role === 'seller' || !!user.sellerId || hasDailyMovement(row.summary);
    })
    .sort((a: any, b: any) => {
      const aClosed = a.status === 'liquidated' ? 1 : 0;
      const bClosed = b.status === 'liquidated' ? 1 : 0;
      if (aClosed !== bClosed) return aClosed - bClosed;
      return String(a.user.sellerId || a.user.name || a.user.email).localeCompare(
        String(b.user.sellerId || b.user.name || b.user.email)
      );
    });

  const dayRows: Array<{ label: string; value: string; tone: string; emphasis?: boolean }> = [
    { label: 'Ventas', value: formatCurrency(summary?.totalSales), tone: 'text-white' },
    { label: 'Premios', value: formatCurrency(summary?.totalPrizes), tone: 'text-red-300' },
    { label: 'Comision', value: formatCurrency(summary?.totalCommissions), tone: 'text-amber-300' },
    { label: 'Utilidad', value: formatSignedCurrency(operationalProfit), tone: getResultTone(operationalProfit), emphasis: true },
    { label: 'Inyeccion del dia', value: formatCurrency(dailyInjectionTotal), tone: 'text-sky-300' },
  ];

  const paymentRows: Array<{ label: string; value: string; tone: string; emphasis?: boolean }> = [
    { label: amountMovementLabel, value: formatCurrency(amountEntered), tone: amountDirection === 'sent' ? 'text-sky-300' : 'text-white' },
    { label: 'Liquidacion total', value: formatSignedCurrency(dailyRemainingBalance), tone: 'text-orange-400', emphasis: true },
  ];

  const rangeSummary = liquidationRangeReport?.summary;
  const rangeDays = liquidationRangeReport?.days || [];
  const rangeUser = liquidationRangeReport?.user;

  const rangeRows: Array<{ label: string; value: string; tone: string; emphasis?: boolean }> = [
    { label: 'Ventas acumuladas', value: formatCurrency(rangeSummary?.totalSales), tone: 'text-white' },
    { label: 'Premios acumulados', value: formatCurrency(rangeSummary?.totalPrizes), tone: 'text-red-300' },
    { label: 'Comision acumulada', value: formatCurrency(rangeSummary?.totalCommissions), tone: 'text-amber-300' },
    { label: 'Utilidad acumulada', value: formatSignedCurrency(rangeSummary?.operationalProfit), tone: getResultTone(Number(rangeSummary?.operationalProfit || 0)), emphasis: true },
    { label: 'Inyecciones acumuladas', value: formatCurrency(rangeSummary?.totalInjections), tone: 'text-sky-300' },
    { label: 'Pagos recibidos', value: formatCurrency(rangeSummary?.amountReceived), tone: 'text-white' },
    { label: 'Pagos enviados', value: formatCurrency(rangeSummary?.amountSent), tone: 'text-sky-300' },
    { label: 'Pendiente acumulado', value: formatSignedCurrency(rangeSummary?.pending), tone: 'text-orange-400', emphasis: true },
  ];

  const applyDailyClosureAmount = () => {
    setAmountDirection(dayCapital < 0 ? 'sent' : 'received');
    setAmountPaid(formatInputAmount(Math.abs(dayCapital)));
  };

  const renderSellerSelector = (compact = false) => (
    canManageDailyLiquidation ? (
      <select
        value={selectedUserToLiquidate || ''}
        onChange={(event) => setSelectedUserToLiquidate(event.target.value)}
        className={`${compact ? 'h-8' : 'h-9'} min-w-[190px] flex-1 rounded-md border border-white/10 bg-black/25 px-2 text-xs font-bold text-white outline-none focus:border-white/20`}
      >
        <option value="">Seleccionar vendedor</option>
        {sellerOptions.map((row: any) => {
          const user = row.user;
          const label = `${row.status === 'liquidated' ? 'OK ' : ''}${user.sellerId || user.email?.split('@')[0]} - ${user.name || user.email}`;
          return (
            <option key={user.email} value={user.email}>
              {label}
            </option>
          );
        })}
      </select>
    ) : (
      <span className={`${compact ? 'h-8' : 'h-9'} rounded-md border border-white/10 bg-black/25 px-2 text-[9px] font-black uppercase tracking-widest text-white inline-flex items-center`}>
        Tu cierre
      </span>
    )
  );

  const handleShareReport = async () => {
    const reportEl = document.getElementById('liquidation-report');
    if (!reportEl || !hasReport) return;

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
          transformOrigin: 'top left',
        },
      });

      const fileName = `Cierre-${userToLiquidate?.name || 'Usuario'}-${liquidationDate}.png`;
      const shared = await shareImageDataUrl({
        dataUrl,
        fileName,
        title: 'Cierre de caja',
        text: `Cierre de ${userToLiquidate?.name || 'Usuario'} para ${liquidationDate}`,
        dialogTitle: 'Compartir cierre',
      });

      if (shared) {
        toast.success('Reporte compartido', { id: toastId });
      } else {
        downloadDataUrlFile(dataUrl, fileName);
        toast.info('Imagen descargada para envio manual', { id: toastId });
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Error al generar el reporte', { id: toastId });
    }
  };

  if (!canAccessDomain) return null;

  return (
    <motion.div
      key="liquidaciones"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-3"
    >
      <section className="grid grid-cols-2 gap-1 rounded-md border border-white/10 bg-black/25 p-1">
        <button
          type="button"
          onClick={() => setLiquidationMode('daily')}
          className={`h-8 rounded text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
            liquidationMode === 'daily' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-white/[0.06]'
          }`}
        >
          Diaria
        </button>
        <button
          type="button"
          onClick={() => setLiquidationMode('range')}
          className={`h-8 rounded text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
            liquidationMode === 'range' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-white/[0.06]'
          }`}
        >
          Rango
        </button>
      </section>

      {liquidationMode === 'daily' ? (
        <>
          {canGenerateConsolidated && (
            <section className="rounded-md border border-primary/20 bg-primary/[0.04] p-1.5">
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-widest text-primary">Consolidado general</p>
                  <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">Todos los usuarios por fecha o rango</p>
                </div>
                <button
                  type="button"
                  onClick={generateConsolidatedReport}
                  disabled={
                    isGeneratingYesterdayReport ||
                    (consolidatedMode === 'day' && !consolidatedReportDate) ||
                    (consolidatedMode === 'range' && (!consolidatedStartDate || !consolidatedEndDate))
                  }
                  title="Descargar consolidado general"
                  aria-label="Descargar consolidado general"
                  className="h-8 rounded-md border border-primary/25 bg-primary/10 px-2 text-[8px] font-black uppercase tracking-widest text-primary transition-all hover:bg-primary/15 active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 inline-flex items-center gap-1.5"
                >
                  <Download className="h-3 w-3" />
                  {isGeneratingYesterdayReport ? 'PDF' : 'Descargar'}
                </button>
              </div>

              <details className="mt-1.5 rounded-md border border-white/10 bg-black/20 px-2 py-1">
                <summary className="cursor-pointer text-[8px] font-black uppercase tracking-widest text-muted-foreground">
                  Fecha/rango del consolidado
                </summary>
                <div className="mt-1.5 grid grid-cols-1 gap-1.5 sm:grid-cols-[120px_1fr]">
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      onClick={() => setConsolidatedMode('day')}
                      className={`h-7 rounded text-[8px] font-black uppercase tracking-widest transition-all active:scale-95 ${consolidatedMode === 'day' ? 'bg-primary text-primary-foreground' : 'bg-white/[0.05] text-muted-foreground'}`}
                    >
                      Dia
                    </button>
                    <button
                      type="button"
                      onClick={() => setConsolidatedMode('range')}
                      className={`h-7 rounded text-[8px] font-black uppercase tracking-widest transition-all active:scale-95 ${consolidatedMode === 'range' ? 'bg-primary text-primary-foreground' : 'bg-white/[0.05] text-muted-foreground'}`}
                    >
                      Rango
                    </button>
                  </div>
                  {consolidatedMode === 'day' ? (
                    <input
                      type="date"
                      value={consolidatedReportDate}
                      onChange={(event) => {
                        setConsolidatedReportDate(event.target.value);
                        setConsolidatedStartDate(event.target.value);
                        setConsolidatedEndDate(event.target.value);
                      }}
                      className="h-7 w-full rounded border border-white/10 bg-black/35 px-2 font-mono text-[11px] outline-none"
                    />
                  ) : (
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="date"
                        value={consolidatedStartDate}
                        onChange={(event) => setConsolidatedStartDate(event.target.value)}
                        className="h-7 w-full rounded border border-white/10 bg-black/35 px-2 font-mono text-[11px] outline-none"
                      />
                      <input
                        type="date"
                        value={consolidatedEndDate}
                        onChange={(event) => setConsolidatedEndDate(event.target.value)}
                        className="h-7 w-full rounded border border-white/10 bg-black/35 px-2 font-mono text-[11px] outline-none"
                      />
                    </div>
                  )}
                </div>
              </details>
            </section>
          )}

          <section className="rounded-md border border-white/10 bg-white/[0.018] p-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <label className="inline-flex h-8 min-w-[145px] items-center gap-1.5 px-1">
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="date"
                  value={liquidationDate}
                  onChange={(event) => setLiquidationDate(event.target.value)}
                  className="h-8 min-w-0 flex-1 border-0 bg-transparent p-0 font-mono text-[11px] text-white [box-shadow:none] [outline:none]"
                />
              </label>
              {renderSellerSelector(true)}
            </div>

            {liquidationDate !== businessDayKey && isLiquidationDataLoading && (
              <p className="mt-1 text-[8px] font-mono uppercase tracking-widest text-muted-foreground">Cargando historico...</p>
            )}
          </section>

          {hasReport ? (
            <article id="liquidation-report" className="rounded-lg border border-white/10 bg-black p-2.5">
              <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-2">
                <div className="min-w-0">
                  <p className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground">{liquidationDate}</p>
                  <p className="truncate text-sm font-black text-white">{userToLiquidate?.name || userToLiquidate?.email}</p>
                  <p className="text-[9px] font-mono uppercase text-muted-foreground">{userToLiquidate?.sellerId || 'SIN ID'}</p>
                </div>
                {dailyStatus && (
                  <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest inline-flex items-center gap-1 ${dailyStatus.className}`}>
                    {dailyStatus.icon && <CheckCircle2 className="h-3 w-3" />}
                    {dailyStatus.label}
                  </span>
                )}
              </div>

              <section className={`mt-2 rounded-md border px-2 py-2 ${resultDirection.box}`}>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">Resultado hoy</p>
                    <p className={`text-[11px] font-black uppercase tracking-widest ${resultDirection.tone}`}>{resultDirection.label}</p>
                  </div>
                  <span className={`text-lg font-black ${resultDirection.tone}`}>{formatSignedCurrency(operationalProfit)}</span>
                </div>
              </section>

              <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
                <section className="rounded-md border border-white/10 bg-white/[0.025]">
                  <div className="border-b border-white/10 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-white">
                    Detalle
                  </div>
                  {dayRows.map((row) => (
                    <div key={row.label} className={`flex items-center justify-between gap-2 border-b border-white/10 px-2 py-1.5 last:border-b-0 ${row.emphasis ? 'bg-white/[0.035]' : ''}`}>
                      <span className={`font-mono uppercase tracking-widest ${row.tone === 'text-orange-400' ? 'text-[11px] font-black text-orange-400' : row.emphasis ? 'text-[11px] font-black text-white' : 'text-[10px] text-muted-foreground'}`}>{row.label}</span>
                      <span className={`${row.emphasis ? 'text-sm' : 'text-xs'} font-black ${row.tone}`}>{row.value}</span>
                    </div>
                  ))}
                </section>

                <section className="rounded-md border border-white/10 bg-white/[0.025]">
                  <div className="border-b border-white/10 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-white">
                    Pago del dia
                  </div>
                  {paymentRows.map((row) => (
                    <div key={row.label} className={`flex items-center justify-between gap-2 border-b border-white/10 px-2 py-1.5 last:border-b-0 ${row.emphasis ? 'bg-white/[0.035]' : ''}`}>
                      <span className={`font-mono uppercase tracking-widest ${row.tone === 'text-orange-400' ? 'text-[11px] font-black text-orange-400' : row.emphasis ? 'text-[11px] font-black text-white' : 'text-[10px] text-muted-foreground'}`}>{row.label}</span>
                      <span className={`${row.emphasis ? 'text-sm' : 'text-xs'} font-black ${row.tone}`}>{row.value}</span>
                    </div>
                  ))}
                </section>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleShareReport}
                  className="h-8 rounded-md border border-white/10 bg-white/[0.06] px-2 text-[8px] font-black uppercase tracking-widest text-white transition-all hover:bg-white/[0.1] active:scale-95 inline-flex items-center gap-1.5"
                >
                  <Share2 className="h-3 w-3" />
                  Compartir
                </button>
                {canManageDailyLiquidation && (
                  <>
                    <button
                      type="button"
                      onClick={applyDailyClosureAmount}
                      disabled={!summary}
                      title="Rellenar monto para cerrar solo el dia seleccionado"
                      className="h-8 rounded-md border border-emerald-400/20 bg-emerald-500/10 px-2 text-[8px] font-black uppercase tracking-widest text-emerald-300 transition-all hover:bg-emerald-500/15 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Cerrar dia
                    </button>
                    <div className="grid h-8 grid-cols-2 rounded-md border border-white/10 bg-black/35 p-0.5">
                      {(['received', 'sent'] as const).map((direction) => (
                        <button
                          key={direction}
                          type="button"
                          onClick={() => setAmountDirection(direction)}
                          className={`rounded px-2 text-[8px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                            amountDirection === direction
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:bg-white/[0.06]'
                          }`}
                        >
                          {direction === 'received' ? 'Recibido' : 'Enviado'}
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      value={amountPaid === 'NaN' ? '' : amountPaid}
                      onChange={(event) => setAmountPaid(event.target.value)}
                      placeholder={amountMovementLabel}
                      className="h-8 min-w-[128px] flex-1 rounded-md border border-white/10 bg-black/35 px-2 font-mono text-[11px] outline-none focus:ring-2 focus:ring-primary/60"
                    />
                    <button
                      type="button"
                      onClick={handleLiquidate}
                      disabled={!summary}
                      className="h-8 rounded-md bg-primary px-2 text-[8px] font-black uppercase tracking-widest text-primary-foreground transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      Liquidar dia
                    </button>
                  </>
                )}
              </div>
            </article>
          ) : (
            <div className="min-h-[110px] rounded-lg border border-dashed border-white/15 bg-white/[0.02] p-4 flex items-center justify-center text-center">
              <div>
                <CheckCircle2 className="mx-auto mb-2 h-5 w-5 text-primary/80" />
                <p className="text-[11px] font-black uppercase tracking-widest text-white">
                  {isSeller ? 'Cargando tu cierre' : 'Seleccione un vendedor'}
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {isSeller ? 'Revise la fecha.' : 'Use el menu de vendedores.'}
                </p>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <section className="rounded-md border border-white/10 bg-white/[0.018] p-1.5">
            <div className="grid grid-cols-1 gap-1.5 md:grid-cols-[1fr_1fr_1.3fr_auto]">
              <label className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/10 bg-black/25 px-2">
                <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Desde</span>
                <input
                  type="date"
                  value={liquidationRangeStartDate}
                  onChange={(event) => setLiquidationRangeStartDate(event.target.value)}
                  className="h-7 min-w-0 flex-1 border-0 bg-transparent p-0 font-mono text-[11px] text-white [box-shadow:none] [outline:none]"
                />
              </label>
              <label className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/10 bg-black/25 px-2">
                <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Hasta</span>
                <input
                  type="date"
                  value={liquidationRangeEndDate}
                  onChange={(event) => setLiquidationRangeEndDate(event.target.value)}
                  className="h-7 min-w-0 flex-1 border-0 bg-transparent p-0 font-mono text-[11px] text-white [box-shadow:none] [outline:none]"
                />
              </label>
              {renderSellerSelector(true)}
              <button
                type="button"
                onClick={fetchLiquidationRangeReport}
                disabled={isLiquidationRangeLoading || !selectedUserToLiquidate}
                className="h-8 rounded-md bg-primary px-2 text-[8px] font-black uppercase tracking-widest text-primary-foreground transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {isLiquidationRangeLoading ? 'Cargando' : 'Ver rango'}
              </button>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-1 rounded-md border border-white/10 bg-black/25 p-1">
            <button
              type="button"
              onClick={() => setRangeViewMode('global')}
              className={`h-8 rounded text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                rangeViewMode === 'global' ? 'bg-white text-black' : 'text-muted-foreground hover:bg-white/[0.06]'
              }`}
            >
              Globalizado
            </button>
            <button
              type="button"
              onClick={() => setRangeViewMode('daily')}
              className={`h-8 rounded text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                rangeViewMode === 'daily' ? 'bg-white text-black' : 'text-muted-foreground hover:bg-white/[0.06]'
              }`}
            >
              Desglosado por dia
            </button>
          </section>

          {liquidationRangeReport ? (
            <article className="rounded-lg border border-white/10 bg-black p-2.5">
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-white/10 pb-2">
                <div className="min-w-0">
                  <p className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground">
                    {liquidationRangeReport.startDate} / {liquidationRangeReport.endDate}
                  </p>
                  <p className="truncate text-sm font-black text-white">{rangeUser?.name || rangeUser?.email}</p>
                  <p className="text-[9px] font-mono uppercase text-muted-foreground">{rangeUser?.sellerId || 'SIN ID'}</p>
                </div>
                <span className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-muted-foreground">
                  {rangeDays.length} dia{rangeDays.length === 1 ? '' : 's'}
                </span>
              </div>

              {rangeViewMode === 'global' ? (
                <section className="mt-2 rounded-md border border-white/10 bg-white/[0.025]">
                  <div className="border-b border-white/10 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-white">
                    Resumen del rango
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2">
                    {rangeRows.map((row) => (
                      <div key={row.label} className={`flex items-center justify-between gap-2 border-b border-white/10 px-2 py-1.5 sm:odd:border-r ${row.emphasis ? 'bg-white/[0.035]' : ''}`}>
                        <span className={`font-mono uppercase tracking-widest ${row.emphasis ? 'text-[11px] font-black text-white' : 'text-[10px] text-muted-foreground'}`}>{row.label}</span>
                        <span className={`${row.emphasis ? 'text-sm' : 'text-xs'} font-black ${row.tone}`}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                </section>
              ) : (
                <section className="mt-2 space-y-1.5">
                  {rangeDays.length === 0 && (
                    <p className="rounded border border-dashed border-white/10 px-2 py-3 text-center text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                      Sin dias en este rango
                    </p>
                  )}
                  {rangeDays.map((day: any) => {
                    const dayLiquidatedAmount = Number(day.amountReceived || 0) - Number(day.amountSent || 0);
                    const dayHasSales = Math.abs(Number(day.totalSales || 0)) > BALANCE_EPSILON;
                    const dayStatusLabel = !dayHasSales ? 'Sin Ventas' : day.status === 'liquidated' ? 'Liquidado' : 'Pendiente';
                    const dayStatusClass = !dayHasSales
                      ? 'border-slate-400/25 bg-white/[0.04] text-slate-300'
                      : day.status === 'liquidated'
                        ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
                        : 'border-orange-400/30 bg-orange-500/10 text-orange-300';

                    return (
                    <div key={day.date} className="rounded-md border border-white/10 bg-white/[0.025] px-2 py-1.5">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] font-black uppercase tracking-widest text-white">{day.date}</span>
                        <span className={`rounded border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest ${dayStatusClass}`}>
                          {dayStatusLabel}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9px] sm:grid-cols-3">
                        <span className="flex justify-between gap-1 text-muted-foreground">
                          Ventas <strong className="text-white">{formatCurrency(day.totalSales)}</strong>
                        </span>
                        <span className="flex justify-between gap-1 text-muted-foreground">
                          Premios <strong className="text-red-300">{formatCurrency(day.totalPrizes)}</strong>
                        </span>
                        <span className="flex justify-between gap-1 text-muted-foreground">
                          Comision <strong className="text-amber-300">{formatCurrency(day.totalCommissions)}</strong>
                        </span>
                        <span className="flex justify-between gap-1 text-muted-foreground">
                          Utilidad <strong className={getResultTone(Number(day.operationalProfit || 0))}>{formatSignedCurrency(day.operationalProfit)}</strong>
                        </span>
                        <span className="flex justify-between gap-1 text-muted-foreground">
                          Inyeccion <strong className="text-sky-300">{formatCurrency(day.totalInjections)}</strong>
                        </span>
                        <span className="flex justify-between gap-1 text-muted-foreground">
                          Liquidado <strong className={getResultTone(dayLiquidatedAmount)}>{formatSignedCurrency(dayLiquidatedAmount)}</strong>
                        </span>
                        <span className="flex justify-between gap-1 text-muted-foreground">
                          Por liquidar <strong className={getResultTone(Number(day.pending || 0))}>{formatSignedCurrency(day.pending)}</strong>
                        </span>
                      </div>
                    </div>
                    );
                  })}
                </section>
              )}
            </article>
          ) : (
            <div className="min-h-[110px] rounded-lg border border-dashed border-white/15 bg-white/[0.02] p-4 flex items-center justify-center text-center">
              <div>
                <CalendarDays className="mx-auto mb-2 h-5 w-5 text-primary/80" />
                <p className="text-[11px] font-black uppercase tracking-widest text-white">Seleccione un rango</p>
                <p className="mt-1 text-[10px] text-muted-foreground">El rango muestra acumulados e historial por vendedor.</p>
              </div>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
