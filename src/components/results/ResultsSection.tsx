import React from 'react';
import { motion } from 'motion/react';
import { Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type ResultsSectionProps = {
  canManageResults: boolean;
  editingResult: any;
  cancelResultEdition: () => void;
  isCeoUser: boolean;
  resultFormDate: string;
  setResultFormDate: (value: string) => void;
  setResultFormLotteryId: (value: string) => void;
  businessDayKey: string;
  resultFormLotteryId: string;
  availableResultLotteries: any[];
  cleanText: (value: string) => string;
  formatTime12h: (value: string) => string;
  lotteryById: Map<string, any>;
  resultFormFirstPrize: string;
  setResultFormFirstPrize: (value: string) => void;
  resultFormSecondPrize: string;
  setResultFormSecondPrize: (value: string) => void;
  resultFormThirdPrize: string;
  setResultFormThirdPrize: (value: string) => void;
  handleCreateResultFromForm: () => void;
  visibleResults: any[];
  resultStatusMap: Map<string, any>;
  getResultKey: (result: any) => string;
  setEditingResult: (result: any) => void;
  deleteResult: (id: string) => void;
};

export function ResultsSection({
  canManageResults,
  editingResult,
  cancelResultEdition,
  isCeoUser,
  resultFormDate,
  setResultFormDate,
  setResultFormLotteryId,
  businessDayKey,
  resultFormLotteryId,
  availableResultLotteries,
  cleanText,
  formatTime12h,
  lotteryById,
  resultFormFirstPrize,
  setResultFormFirstPrize,
  resultFormSecondPrize,
  setResultFormSecondPrize,
  resultFormThirdPrize,
  setResultFormThirdPrize,
  handleCreateResultFromForm,
  visibleResults,
  resultStatusMap,
  getResultKey,
  setEditingResult,
  deleteResult,
}: ResultsSectionProps) {
  return (
    <motion.div
      key="results"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      <div className="flex flex-col items-start justify-between gap-2">
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tighter neon-text uppercase">Resultados de Sorteos</h2>
          <p className="text-muted-foreground text-xs font-mono mt-1">
            {canManageResults ? 'INGRESO Y CONTROL DE RESULTADOS EN TIEMPO REAL' : 'ULTIMOS RESULTADOS PUBLICADOS'}
          </p>
        </div>
      </div>

      {canManageResults && (
        <div className="glass-card p-2.5 md:p-3 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
              {editingResult ? 'Editar Resultado' : 'Nuevo Resultado'}
            </h3>
            {editingResult && (
              <button
                onClick={cancelResultEdition}
                className="text-[10px] px-2 py-0.5 rounded-md border border-border text-muted-foreground hover:text-white hover:bg-white/5 uppercase tracking-wider font-bold"
              >
                Cancelar Edicion
              </button>
            )}
          </div>

          <div className="md:hidden space-y-2">
            <div className="grid grid-cols-1 gap-2">
              <div>
                <label className="text-[10px] font-mono uppercase text-muted-foreground">Fecha</label>
                {isCeoUser ? (
                  <input
                    type="date"
                    value={resultFormDate}
                    onChange={(e) => {
                      setResultFormDate(e.target.value);
                      setResultFormLotteryId('');
                    }}
                    className="mt-1 w-full bg-white/5 border border-border rounded px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                ) : (
                  <div className="mt-1 inline-flex items-center rounded px-2 py-1 text-[11px] font-mono bg-white/5 border border-border">
                    {businessDayKey}
                  </div>
                )}
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase text-muted-foreground">Sorteo</label>
                <select
                  value={resultFormLotteryId}
                  onChange={(e) => setResultFormLotteryId(e.target.value)}
                  disabled={availableResultLotteries.length === 0}
                  className="mt-1 w-full bg-white/5 border border-border rounded px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-primary appearance-none disabled:opacity-50"
                >
                  <option value="" className="bg-[#111827]">Seleccionar Sorteo</option>
                  {availableResultLotteries.map(lottery => (
                    <option key={lottery.id} value={lottery.id} className="bg-[#111827]">
                      {cleanText(lottery.name)} ({lottery.drawTime ? formatTime12h(lottery.drawTime) : '--:--'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <input
                type="text"
                maxLength={(lotteryById.get(resultFormLotteryId)?.isFourDigits ? 4 : 2)}
                value={resultFormFirstPrize}
                onChange={(e) => setResultFormFirstPrize(e.target.value.replace(/\D/g, ''))}
                className="w-full border border-yellow-400/50 bg-yellow-500/20 text-yellow-200 rounded px-1 py-1 text-xs font-black text-center focus:outline-none focus:ring-1 focus:ring-yellow-300"
                placeholder={(lotteryById.get(resultFormLotteryId)?.isFourDigits ? '0000' : '00')}
              />
              <input
                type="text"
                maxLength={(lotteryById.get(resultFormLotteryId)?.isFourDigits ? 4 : 2)}
                value={resultFormSecondPrize}
                onChange={(e) => setResultFormSecondPrize(e.target.value.replace(/\D/g, ''))}
                className="w-full border border-blue-400/50 bg-blue-500/20 text-blue-200 rounded px-1 py-1 text-xs font-black text-center focus:outline-none focus:ring-1 focus:ring-blue-300"
                placeholder={(lotteryById.get(resultFormLotteryId)?.isFourDigits ? '0000' : '00')}
              />
              <input
                type="text"
                maxLength={(lotteryById.get(resultFormLotteryId)?.isFourDigits ? 4 : 2)}
                value={resultFormThirdPrize}
                onChange={(e) => setResultFormThirdPrize(e.target.value.replace(/\D/g, ''))}
                className="w-full border border-orange-400/50 bg-orange-500/20 text-orange-200 rounded px-1 py-1 text-xs font-black text-center focus:outline-none focus:ring-1 focus:ring-orange-300"
                placeholder={(lotteryById.get(resultFormLotteryId)?.isFourDigits ? '0000' : '00')}
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleCreateResultFromForm}
                disabled={availableResultLotteries.length === 0 || !resultFormLotteryId || !resultFormFirstPrize || !resultFormSecondPrize || !resultFormThirdPrize}
                className="inline-flex items-center justify-center gap-1 px-2.5 py-1 bg-primary text-primary-foreground rounded font-bold uppercase tracking-wider text-[10px] disabled:opacity-50"
              >
                {editingResult ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-white/5">
                  <th className="p-1 text-[10px] font-mono uppercase text-muted-foreground">Fecha</th>
                  <th className="p-1 text-[10px] font-mono uppercase text-muted-foreground">Sorteo</th>
                  <th className="p-1 text-[10px] font-mono uppercase text-muted-foreground">1ro</th>
                  <th className="p-1 text-[10px] font-mono uppercase text-muted-foreground">2do</th>
                  <th className="p-1 text-[10px] font-mono uppercase text-muted-foreground">3ro</th>
                  <th className="p-1 text-[10px] font-mono uppercase text-muted-foreground text-right">Accion</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/70">
                  <td className="p-1 min-w-[92px]">
                    {isCeoUser ? (
                      <input
                        type="date"
                        value={resultFormDate}
                        onChange={(e) => {
                          setResultFormDate(e.target.value);
                          setResultFormLotteryId('');
                        }}
                        className="w-28 bg-white/5 border border-border rounded px-1 py-0.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    ) : (
                      <div className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono bg-white/5 border border-border">
                        {businessDayKey}
                      </div>
                    )}
                  </td>
                  <td className="p-1 min-w-[168px]">
                    <select
                      value={resultFormLotteryId}
                      onChange={(e) => setResultFormLotteryId(e.target.value)}
                      disabled={availableResultLotteries.length === 0}
                      className="w-full bg-white/5 border border-border rounded px-1.5 py-0.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-primary appearance-none disabled:opacity-50"
                    >
                      <option value="" className="bg-[#111827]">Seleccionar Sorteo</option>
                      {availableResultLotteries.map(lottery => (
                        <option key={lottery.id} value={lottery.id} className="bg-[#111827]">
                          {cleanText(lottery.name)} ({lottery.drawTime ? formatTime12h(lottery.drawTime) : '--:--'})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-1 min-w-[58px]">
                    <input
                      type="text"
                      maxLength={(lotteryById.get(resultFormLotteryId)?.isFourDigits ? 4 : 2)}
                      value={resultFormFirstPrize}
                      onChange={(e) => setResultFormFirstPrize(e.target.value.replace(/\D/g, ''))}
                      className="w-full border border-yellow-400/50 bg-yellow-500/20 text-yellow-200 rounded px-1 py-0.5 text-[11px] font-black text-center focus:outline-none focus:ring-1 focus:ring-yellow-300"
                      placeholder={(lotteryById.get(resultFormLotteryId)?.isFourDigits ? '0000' : '00')}
                    />
                  </td>
                  <td className="p-1 min-w-[58px]">
                    <input
                      type="text"
                      maxLength={(lotteryById.get(resultFormLotteryId)?.isFourDigits ? 4 : 2)}
                      value={resultFormSecondPrize}
                      onChange={(e) => setResultFormSecondPrize(e.target.value.replace(/\D/g, ''))}
                      className="w-full border border-blue-400/50 bg-blue-500/20 text-blue-200 rounded px-1 py-0.5 text-[11px] font-black text-center focus:outline-none focus:ring-1 focus:ring-blue-300"
                      placeholder={(lotteryById.get(resultFormLotteryId)?.isFourDigits ? '0000' : '00')}
                    />
                  </td>
                  <td className="p-1 min-w-[58px]">
                    <input
                      type="text"
                      maxLength={(lotteryById.get(resultFormLotteryId)?.isFourDigits ? 4 : 2)}
                      value={resultFormThirdPrize}
                      onChange={(e) => setResultFormThirdPrize(e.target.value.replace(/\D/g, ''))}
                      className="w-full border border-orange-400/50 bg-orange-500/20 text-orange-200 rounded px-1 py-0.5 text-[11px] font-black text-center focus:outline-none focus:ring-1 focus:ring-orange-300"
                      placeholder={(lotteryById.get(resultFormLotteryId)?.isFourDigits ? '0000' : '00')}
                    />
                  </td>
                  <td className="p-1 min-w-[82px] text-right">
                    <button
                      onClick={handleCreateResultFromForm}
                      disabled={availableResultLotteries.length === 0 || !resultFormLotteryId || !resultFormFirstPrize || !resultFormSecondPrize || !resultFormThirdPrize}
                      className="inline-flex items-center justify-center gap-1 px-2 py-0.5 bg-primary text-primary-foreground rounded font-bold uppercase tracking-wider text-[10px] disabled:opacity-50"
                    >
                      {editingResult ? 'Actualizar' : 'Guardar'}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {availableResultLotteries.length === 0 && (
            <div className="text-xs font-mono uppercase tracking-wider text-amber-300/90 bg-amber-500/10 border border-amber-400/20 rounded-xl px-3 py-2">
              Todos los sorteos ya tienen resultados para esta fecha
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
        {visibleResults.length === 0 ? (
          <div className="glass-card p-4 text-center text-muted-foreground font-mono uppercase text-xs md:col-span-2 xl:col-span-3">
            No hay resultados registrados
          </div>
        ) : (
          visibleResults.map((res) => {
            const stats = resultStatusMap.get(getResultKey(res));
            const isLoss = !!stats && stats.prizes > stats.sales && stats.prizes > 0;
            const hasWinners = !!stats && stats.hasWinners;
            const statusTone = canManageResults
              ? (isLoss ? 'loss' : (hasWinners ? 'winner' : 'neutral'))
              : 'neutral';
            const statusClasses = statusTone === 'loss'
              ? 'border-red-400/40 bg-red-500/10'
              : statusTone === 'winner'
                ? 'border-emerald-400/40 bg-emerald-500/10'
                : 'border-border bg-white/5';
            const lotteryInfo = lotteryById.get(res.lotteryId);

            return (
              <div key={res.id} className={`glass-card rounded-2xl p-1.5 md:p-2 border ${statusClasses}`}>
                <div className="flex items-start justify-between gap-1.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className="text-[11px] md:text-xs font-black uppercase tracking-wide leading-tight break-words">{cleanText(res.lotteryName)}</p>
                      <span className="text-[11px] md:text-xs font-black uppercase tracking-wide leading-tight text-muted-foreground shrink-0">
                        {lotteryInfo?.drawTime ? formatTime12h(lotteryInfo.drawTime) : '--:--'}
                      </span>
                    </div>
                  </div>
                  {canManageResults && (
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={() => {
                          if (!isCeoUser && res.date !== businessDayKey) {
                            toast.error('Solo el CEO puede editar resultados fuera de la fecha operativa');
                            return;
                          }
                          setEditingResult(res);
                        }}
                        disabled={!isCeoUser && res.date !== businessDayKey}
                        className="p-1 hover:bg-white/10 rounded-lg text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                        title="Editar resultado"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => {
                          if (!isCeoUser && res.date !== businessDayKey) {
                            toast.error('Solo el CEO puede eliminar resultados fuera de la fecha operativa');
                            return;
                          }
                          deleteResult(res.id);
                        }}
                        disabled={!isCeoUser && res.date !== businessDayKey}
                        className="p-1 hover:bg-red-400/10 rounded-lg text-red-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                        title="Eliminar resultado"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-1 mt-1">
                  <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/15 px-1 py-0.5 text-center">
                    <div className="text-[9px] font-mono uppercase text-yellow-300">1ro</div>
                    <div className="text-xs md:text-sm font-black text-yellow-200 leading-none">{res.firstPrize}</div>
                  </div>
                  <div className="rounded-xl border border-blue-500/40 bg-blue-500/15 px-1 py-0.5 text-center">
                    <div className="text-[9px] font-mono uppercase text-blue-300">2do</div>
                    <div className="text-xs md:text-sm font-black text-blue-200 leading-none">{res.secondPrize}</div>
                  </div>
                  <div className="rounded-xl border border-orange-500/40 bg-orange-500/15 px-1 py-0.5 text-center">
                    <div className="text-[9px] font-mono uppercase text-orange-300">3ro</div>
                    <div className="text-xs md:text-sm font-black text-orange-200 leading-none">{res.thirdPrize}</div>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}
