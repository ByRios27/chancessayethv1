import React from 'react';
import { motion } from 'motion/react';

type ArchiveSectionProps = any;

export function ArchiveSection(props: ArchiveSectionProps) {
  const {
    archiveDate,
    setArchiveDate,
    applyOperationalQuickDate,
    recentOperationalDates,
    userProfile,
    archiveUserEmail,
    setArchiveUserEmail,
    users,
    fetchArchiveData,
    isArchiveLoading,
    archiveTickets,
    archiveInjections,
    buildFinancialSummary,
    setSelectedUserToLiquidate,
    setLiquidationDate,
    setActiveTab,
    setShowTicketModal,
    cleanText,
    formatTime12h,
  } = props;

  return (
              <motion.div
                key="archivo"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-8"
              >
                <div className="glass-card p-4 sm:p-6 md:p-10">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-6">
                    <div>
                      <h2 className="text-2xl font-black italic tracking-tighter neon-text uppercase">ARCHIVO HISTÓRICO</h2>
                      <p className="text-xs font-mono text-muted-foreground mt-1 uppercase tracking-widest">Consulta de Datos y Liquidaciones Pasadas</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Fecha a Consultar (por defecto: día anterior)</label>
                        <input 
                          type="date"
                          value={archiveDate}
                          onChange={(e) => setArchiveDate(e.target.value)}
                          className="w-full bg-black border border-border p-3 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                        />
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => applyOperationalQuickDate(setArchiveDate, 0)}
                            className="px-2 py-1 rounded-md bg-white/5 text-[10px] font-black uppercase tracking-widest"
                          >
                            Hoy
                          </button>
                          <button
                            type="button"
                            onClick={() => applyOperationalQuickDate(setArchiveDate, -1)}
                            className="px-2 py-1 rounded-md bg-white/5 text-[10px] font-black uppercase tracking-widest"
                          >
                            Ayer
                          </button>
                        </div>
                        <select
                          value={archiveDate}
                          onChange={(e) => setArchiveDate(e.target.value)}
                          className="w-full bg-black border border-border p-3 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                        >
                          {recentOperationalDates.map(dateValue => (
                            <option key={`archive-${dateValue}`} value={dateValue} className="bg-gray-900">{dateValue}</option>
                          ))}
                        </select>
                      </div>

                      {(userProfile?.role === 'ceo' || userProfile?.canLiquidate) ? (
                        <div className="space-y-2">
                          <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Seleccionar Usuario</label>
                          <select 
                            value={archiveUserEmail}
                            onChange={(e) => setArchiveUserEmail(e.target.value)}
                            className="w-full bg-black border border-border p-3 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                          >
                            <option key="default" value="" className="bg-gray-900">Seleccionar...</option>
                            {users.filter(u => {
                              if (!u || !u.email || !u.name || u.name.trim() === '') return false;
                              if (userProfile?.role === 'ceo' || userProfile?.role === 'admin' || userProfile?.role === 'programador') return true;
                              return u.email === userProfile?.email;
                            }).map((u, i) => (
                              <option key={u.email || `arch-${i}`} value={u.email} className="bg-gray-900">{u.name} ({u.email?.split('@')[0] || ''})</option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Usuario</p>
                          <p className="text-sm font-bold text-white">{userProfile?.name}</p>
                        </div>
                      )}

                      <button 
                        onClick={fetchArchiveData}
                        disabled={isArchiveLoading || !archiveUserEmail || !archiveDate}
                        className="w-full bg-primary text-primary-foreground font-black uppercase tracking-widest py-4 rounded-xl hover:brightness-110 transition-all mt-6 shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isArchiveLoading ? 'Cargando...' : 'Consultar Archivo'}
                      </button>
                    </div>

                    <div className="lg:col-span-2">
                      {archiveUserEmail && archiveTickets.length > 0 ? (() => {
                        const userToLiquidate = users.find(u => u.email === archiveUserEmail);
                        const summary = buildFinancialSummary({
                          tickets: archiveTickets,
                          injections: archiveInjections,
                          userEmail: archiveUserEmail,
                          targetDate: archiveDate
                        });

                        return (
                          <div className="glass-card p-8 space-y-8 bg-black border-white/10 relative overflow-hidden">
                            <div className="flex justify-between items-start border-b border-white/10 pb-6">
                              <div>
                                <h3 className="text-xl font-black uppercase tracking-tighter text-primary">REPORTE HISTÓRICO</h3>
                                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">{archiveDate}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-black text-white">{userToLiquidate?.name}</p>
                                <p className="text-[9px] font-mono text-muted-foreground uppercase">ID: {userToLiquidate?.sellerId}</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mb-1">Ventas Totales</p>
                                <p className="text-lg font-black text-white">${summary.totalSales.toFixed(2)}</p>
                              </div>
                              <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mb-1">Comisiones</p>
                                <p className="text-lg font-black text-orange-400">-${summary.totalCommissions.toFixed(2)}</p>
                              </div>
                              <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mb-1">Premios Pagados</p>
                                <p className="text-lg font-black text-red-400">-${summary.totalPrizes.toFixed(2)}</p>
                              </div>
                              <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mb-1">Inyecciones</p>
                                <p className="text-lg font-black text-blue-400">+${summary.totalInjections.toFixed(2)}</p>
                              </div>
                            </div>

                            <div className="bg-primary/10 p-6 rounded-2xl border border-primary/20 flex justify-between items-center">
                              <div>
                                <p className="text-[10px] font-mono text-primary uppercase tracking-widest mb-1">Utilidad Neta</p>
                                <p className={`text-3xl font-black ${summary.netProfit < 0 ? 'text-red-500' : 'text-green-400'}`}>
                                  ${summary.netProfit.toFixed(2)}
                                </p>
                              </div>
                            </div>

                            <div className="flex gap-4">
                              <button 
                                onClick={() => {
                                  setSelectedUserToLiquidate(archiveUserEmail);
                                  setLiquidationDate(archiveDate);
                                  setActiveTab('liquidaciones');
                                }}
                                className="flex-1 bg-primary text-primary-foreground font-black uppercase tracking-widest py-4 rounded-xl hover:brightness-110 transition-all shadow-lg shadow-primary/20"
                              >
                                Ir a Liquidar
                              </button>
                            </div>
                          </div>
                        );
                      })() : (
                        <div className="h-full flex items-center justify-center text-muted-foreground font-mono text-sm uppercase tracking-widest border-2 border-dashed border-border rounded-2xl p-10">
                          {isArchiveLoading ? 'Cargando datos...' : 'Seleccione usuario y fecha para consultar'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
  );
}

