import React, { useMemo } from 'react';
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
const formatAmount = (value?: number) => Number(value || 0).toFixed(2);

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
    label: 'Sin Datos',
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
    liquidationGlobalSummary,
    liquidationUserSummaries = [],
    amountPaid,
    setAmountPaid,
    amountDirection = 'received',
    setAmountDirection,
    handleLiquidate,
    liquidationPreview,
    shareImageDataUrl,
    downloadDataUrlFile,
  } = props;

  const canManageDailyLiquidation = userProfile?.role === 'ceo' || userProfile?.role === 'admin';
  const canAccessDomain = canAccessLiquidationDomain(userProfile?.role, userProfile?.canLiquidate);
  const canGenerateConsolidated = canManageDailyLiquidation;
  const isSeller = userProfile?.role === 'seller';

  const userToLiquidate = liquidationPreview?.userToLiquidate;
  const summary = liquidationPreview?.financialSummary;
  const hasReport = !!summary && (!!selectedUserToLiquidate || !!userToLiquidate?.email || isSeller);
  const isClosed = !!selectedLiquidationSettlement;

  const globalOperationalProfit = getOperationalProfit(liquidationGlobalSummary);
  const operationalProfit = getOperationalProfit(summary);
  const dailyInjectionTotal = Number(summary?.totalInjections || 0);
  const previewInjectionTotal = Number(
    liquidationPreview?.previousInjectionTotal ??
    0
  );
  const previousBalance = Number(
    liquidationPreview?.previousDebt ??
    selectedLiquidationSettlement?.previousBalance ??
    selectedLiquidationSettlement?.previousDebt ??
    userToLiquidate?.currentDebt ??
    0
  );
  const amountEntered = Number(amountPaid) || 0;
  const amountMovementLabel = amountDirection === 'sent' ? 'Monto enviado' : 'Monto recibido';
  const dailyInjectionUtilityTotal = operationalProfit + dailyInjectionTotal;
  const finalBalance = Number(
    liquidationPreview?.newTotalDebt ??
    (previousBalance + operationalProfit + dailyInjectionTotal + (amountDirection === 'sent' ? amountEntered : -amountEntered))
  );
  const resultDirection = getBalanceDirection(operationalProfit);
  const finalDirection = getBalanceDirection(finalBalance);

  const sellerOptions = useMemo(() => {
    return (liquidationUserSummaries || [])
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
  }, [liquidationUserSummaries]);

  const globalSummaryItems = [
    { label: 'Ventas totales', value: formatAmount(liquidationGlobalSummary?.totalSales), tone: 'text-white' },
    { label: 'Premios pagados', value: formatAmount(liquidationGlobalSummary?.totalPrizes), tone: 'text-red-300' },
    { label: 'Comisiones', value: formatAmount(liquidationGlobalSummary?.totalCommissions), tone: 'text-amber-300' },
    { label: 'utilidad total', value: formatAmount(globalOperationalProfit), tone: getResultTone(globalOperationalProfit) },
    { label: 'Inyecciones', value: formatAmount(liquidationGlobalSummary?.totalInjections), tone: 'text-sky-300' },
  ];

  const dayRows = [
    { label: 'Ventas del dia', value: formatCurrency(summary?.totalSales), tone: 'text-white' },
    { label: 'Premios del dia', value: formatCurrency(summary?.totalPrizes), tone: 'text-red-300' },
    { label: 'Comision del dia', value: formatCurrency(summary?.totalCommissions), tone: 'text-amber-300' },
    { label: 'Inyecciones Recibidas', value: formatCurrency(dailyInjectionTotal), tone: 'text-sky-300' },
    { label: 'Utilidad', value: formatSignedCurrency(operationalProfit), tone: getResultTone(operationalProfit) },
    { label: 'Total inyeccion/utilidad', value: formatSignedCurrency(dailyInjectionUtilityTotal), tone: 'text-orange-400', emphasis: true, nowrap: true },
  ];

  const balanceRows = [
    { label: 'Inyecciones anteriores', value: formatCurrency(previewInjectionTotal), tone: 'text-sky-300' },
    { label: 'Saldo anterior', value: formatCurrency(previousBalance), tone: previousBalance >= 0 ? 'text-amber-300' : 'text-emerald-300' },
    { label: amountMovementLabel, value: formatCurrency(amountEntered), tone: amountDirection === 'sent' ? 'text-sky-300' : 'text-white' },
    { label: 'Saldo final', value: formatCurrency(finalBalance), tone: 'text-orange-400', emphasis: true },
  ];

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
      className="space-y-2"
    >
      {canManageDailyLiquidation && (
        <section className="mx-auto max-w-4xl rounded-md border border-white/10 bg-white/[0.018] px-2 py-1 text-center">
          <div className="flex flex-wrap justify-center gap-x-2 gap-y-0.5 text-[10px] leading-5">
            {globalSummaryItems.map((item, index) => (
              <span key={item.label} className="whitespace-nowrap">
                {index > 0 && <span className="mr-2 text-muted-foreground/60">.</span>}
                <span className="font-mono uppercase text-muted-foreground">{item.label}</span>{' '}
                <span className={`font-black ${item.tone}`}>{item.value}</span>
              </span>
            ))}
          </div>
        </section>
      )}

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

          {canManageDailyLiquidation ? (
            <select
              value={selectedUserToLiquidate || ''}
              onChange={(event) => setSelectedUserToLiquidate(event.target.value)}
              className="h-8 min-w-[190px] flex-1 rounded-md border border-white/10 bg-black/25 px-2 text-xs font-bold text-white outline-none focus:border-white/20"
            >
              <option value="">Seleccionar vendedor</option>
              {sellerOptions.map((row: any) => {
                const user = row.user;
                const label = `${row.status === 'liquidated' ? '✓ ' : ''}${user.sellerId || user.email?.split('@')[0]} - ${user.name || user.email}`;
                return (
                  <option key={user.email} value={user.email}>
                    {label}
                  </option>
                );
              })}
            </select>
          ) : (
            <span className="h-8 rounded-md border border-white/10 bg-black/25 px-2 text-[9px] font-black uppercase tracking-widest text-white inline-flex items-center">
              Tu cierre
            </span>
          )}
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
            {isClosed && (
              <span className="shrink-0 rounded border border-emerald-400/30 bg-emerald-500/10 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-emerald-300 inline-flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Cerrado
              </span>
            )}
          </div>

          <section className={`mt-2 rounded-md border px-2 py-1.5 ${resultDirection.box}`}>
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">Resultado del dia</p>
                <p className={`text-[11px] font-black uppercase tracking-widest ${resultDirection.tone}`}>{resultDirection.label}</p>
              </div>
              <span className={`text-lg font-black ${resultDirection.tone}`}>{formatSignedCurrency(operationalProfit)}</span>
            </div>
          </section>

          <div className="mt-2 grid grid-cols-1 gap-2 lg:grid-cols-2">
            <section className="rounded-md border border-white/10 bg-white/[0.025]">
              <div className="border-b border-white/10 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-white">
                Cierre del dia
              </div>
              {dayRows.map((row) => (
                <div key={row.label} className={`flex items-center justify-between gap-2 border-b border-white/10 px-2 py-1.5 last:border-b-0 ${row.emphasis ? 'bg-white/[0.035]' : ''} ${row.nowrap ? 'min-w-0' : ''}`}>
                  <span className={`font-mono uppercase tracking-widest ${row.emphasis ? 'text-[11px] font-black text-white' : 'text-[10px] text-muted-foreground'} ${row.nowrap ? 'min-w-0 flex-1 truncate whitespace-nowrap text-[9px] tracking-normal sm:text-[11px] sm:tracking-widest' : ''}`}>{row.label}</span>
                  <span className={`${row.emphasis ? 'text-sm' : 'text-xs'} font-black ${row.tone} ${row.nowrap ? 'shrink-0 whitespace-nowrap text-xs sm:text-sm' : ''}`}>{row.value}</span>
                </div>
              ))}
            </section>

            <section className="rounded-md border border-white/10 bg-white/[0.025]">
              <div className="border-b border-white/10 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-white">
                Saldos
              </div>
              {balanceRows.map((row) => (
                <div key={row.label} className={`flex items-center justify-between gap-2 border-b border-white/10 px-2 py-1.5 last:border-b-0 ${row.emphasis ? 'bg-white/[0.035]' : ''}`}>
                  <span className={`font-mono uppercase tracking-widest ${row.emphasis ? 'text-[11px] font-black text-white' : 'text-[10px] text-muted-foreground'}`}>{row.label}</span>
                  <span className={`${row.emphasis ? 'text-sm' : 'text-xs'} font-black ${row.tone}`}>{row.value}</span>
                </div>
              ))}
            </section>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
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
                  Liquidar
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
    </motion.div>
  );
}
