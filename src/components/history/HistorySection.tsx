import React from 'react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { normalizePlainText } from '../../utils/text';
import { unifyBets } from '../../utils/bets';
import { Edit2, History, Layers, Lock, Minus, Moon, Plus, Repeat, Ticket as TicketIcon, Trophy, XCircle } from 'lucide-react';

type HistorySectionProps = any;

export function HistorySection(props: HistorySectionProps) {
  const {
    historyDate,
    setHistoryDate,
    applyOperationalQuickDate,
    recentOperationalDates,
    historyFilter,
    setHistoryFilter,
    users,
    userProfile,
    selectedUserToLiquidate,
    setSelectedUserToLiquidate,
    selectedManageUserEmail,
    setSelectedManageUserEmail,
    showGlobalScope,
    setShowGlobalScope,
    canUseGlobalScope,
    historyTickets,
    historyLotteryCards,
    historyInjections,
    historySettlements,
    historyResults,
    filteredTickets,
    getTicketPrizes,
    globalSettings,
    chancePrice,
    setExpandedLotteries,
    expandedLotteries,
    lotteryPages,
    setLotteryPages,
    isLotteryOpenForSales,
    historyTypeFilterCode,
    getLotteryStats,
    formatTime12h,
    cleanText,
    sortedLotteries,
    setShowTicketModal,
    setEditingTicketId,
    editingTicketId,
    editingTicketAmount,
    setEditingTicketAmount,
    updateTicketAmount,
    cancelTicket,
    isTicketClosed,
    isTicketHasResults,
    user,
    editTicket,
    reuseTicket,
    showUserModal,
    setShowUserModal,
    setEditingUser,
    setShowInjectionModal,
    setInjectionTargetUserEmail,
    setInjectionDefaultType,
    setIsInjectionOnly,
    canManageResults,
    getResultByLotteryName,
    isCeoUser,
    businessDayKey,
    setEditingResult,
    deleteResult,
    shareTicket,
    printTicket,
    duplicateTicketToCart,
    ticketSearchTerm,
    setTicketSearchTerm,
    onExportHistory,
    selectedDateSummary,
    availableResultLotteries,
    canManageTickets,
    canManageLotteries,
    canManageUsers,
    canManageSales,
    canManageArchives,
    userStats,
    activeTab,
    setActiveTab,
    toPng,
    toast,
    jsPDF,
  } = props;

  return (
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="space-y-6"
              >
                {/* Filters */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
                    <div className="flex items-center gap-3">
                      <h2 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">RESUMEN DE VENTAS</h2>
                    </div>
                    <div className="flex gap-1 bg-black/40 p-1 rounded-full border border-white/5 overflow-x-auto custom-scrollbar">
                      {['TODO', 'CHANCE', 'BILLETE', 'PALE'].map((f) => (
                        <button
                          key={f}
                          onClick={() => setHistoryFilter(f as any)}
                          className={`px-4 py-2.5 rounded-full text-[10px] font-black transition-all whitespace-nowrap ${
                            historyFilter === f 
                              ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Tickets List */}
                <div className="space-y-4">
                  {historyLotteryCards.map(card => {
                    const {
                      lot,
                      resultForLottery,
                      sales,
                      netProfit,
                      isLoss,
                      paginatedTickets,
                      totalPages,
                      currentPage
                    } = card;
                    const isExpanded = expandedLotteries.includes(lot.id);

                    return (
                      <div key={lot.id} className={`overflow-hidden rounded-xl border transition-all ${isLoss ? 'bg-red-900/20 border-red-900/50' : 'bg-[#111827] border-gray-800'} group`}>
                        <div 
                          onClick={() => {
                            setExpandedLotteries(prev => 
                              prev.includes(lot.id) ? prev.filter(id => id !== lot.id) : [...prev, lot.id]
                            );
                          }}
                          className={`w-full px-3 py-2 flex items-center justify-between transition-all hover:bg-white/[0.02] cursor-pointer ${isExpanded ? 'bg-white/[0.02]' : ''}`}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-white/5 text-white/60 flex items-center justify-center">
                              {isExpanded ? <Minus className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                            </div>
                            <div className="flex flex-col items-start">
                              <div className="flex items-center gap-1">
                                {!isLotteryOpenForSales(lot) && <Lock className="w-2.5 h-2.5 text-red-500" />}
                                <span className="text-xs font-black uppercase tracking-tight text-white/90">
                                  {lot.name}
                                </span>
                              </div>
                              <span className="text-[9px] font-bold text-muted-foreground opacity-60">
                                {lot.drawTime ? formatTime12h(lot.drawTime) : ''}
                              </span>
                            </div>
                          </div>

                          {resultForLottery && (
                            <div className="flex gap-0.5">
                              {[resultForLottery.firstPrize, resultForLottery.secondPrize, resultForLottery.thirdPrize].map((num, i) => (
                                <span key={i} className="text-[9px] font-black bg-orange-500/20 text-orange-400 px-1 py-0.5 rounded">
                                  {lot.isFourDigits ? num : num.slice(-2)}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="text-right flex items-center gap-2">
                            <div className="flex flex-col items-end">
                              <span className="text-[8px] font-bold text-muted-foreground uppercase">Vendido</span>
                              <span className="text-xs font-black text-white">${sales.toFixed(2)}</span>
                            </div>
                            <div className="flex flex-col items-end">
                              <span className="text-[8px] font-bold text-muted-foreground uppercase">Utilidad</span>
                              <span className={`text-xs font-black ${isLoss ? 'text-red-500' : 'text-green-500'}`}>${netProfit.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                        
                        {isExpanded && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden bg-black/30 border-t border-white/5"
                          >
                                <div className="space-y-3 p-4">
                                  {paginatedTickets.map(({ t: ticket }) => {
                                    const { totalPrize, winningBets } = getTicketPrizes(ticket, lot.name, historyTypeFilterCode);

                                    return (
                                      <div key={ticket.id} className={`glass-card p-2 border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-all relative overflow-hidden ${totalPrize > 0 ? 'ring-1 ring-green-500/30' : ''}`}>
                                        {/* Header */}
                                        <div className="flex justify-between items-start mb-1">
                                          <div className="space-y-0.5">
                                            <div className="flex items-center gap-2">
                                              <h3 className="text-xs font-black tracking-tight text-white/90">
                                                {ticket.id.slice(0, 8).toUpperCase()}
                                              </h3>
                                              <span className="text-[9px] font-bold text-muted-foreground bg-white/5 px-1 rounded">
                                                {ticket.sellerName || ticket.sellerCode || '---'}
                                              </span>
                                              {new Set(ticket.bets.map(b => b.lottery)).size > 1 && (
                                                <Layers className="w-3 h-3 text-muted-foreground" />
                                              )}
                                            </div>
                                            
                                            <div className="flex items-center gap-1 py-0.5">
                                              {ticket.status === 'active' && !isTicketClosed(ticket) && !isTicketHasResults(ticket) && ticket.sellerEmail?.toLowerCase() === user?.email?.toLowerCase() && (
                                                <button 
                                                  onClick={() => editTicket(ticket)}
                                                  className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-muted-foreground hover:text-white transition-colors"
                                                  title="Editar Ticket"
                                                >
                                                  <Edit2 className="w-3 h-3" />
                                                </button>
                                              )}
                                              {ticket.sellerEmail?.toLowerCase() === user?.email?.toLowerCase() && (
                                                <button 
                                                  onClick={() => reuseTicket(ticket)}
                                                  className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-muted-foreground hover:text-white transition-colors"
                                                  title="Reutilizar Ticket"
                                                >
                                                  <Repeat className="w-3 h-3" />
                                                </button>
                                              )}
                                              <button 
                                                onClick={() => setShowTicketModal({ ticket, selectedLotteryName: lot.name })}
                                                className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-muted-foreground hover:text-white transition-colors"
                                                title="Previsualizar Ticket"
                                              >
                                                <TicketIcon className="w-3 h-3" />
                                              </button>
                                              {ticket.status === 'active' && !isTicketClosed(ticket) && !isTicketHasResults(ticket) && ticket.sellerEmail?.toLowerCase() === user?.email?.toLowerCase() && (
                                                <button 
                                                  onClick={() => cancelTicket(ticket.id)}
                                                  className="p-1.5 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors"
                                                >
                                                  <XCircle className="w-3 h-3" />
                                                </button>
                                              )}
                                            </div>

                                            <div className="flex flex-col gap-0 text-[9px] font-mono text-muted-foreground">
                                              <div className="flex items-center gap-1">
                                                <Moon className="w-2.5 h-2.5" />
                                                <span>{ticket.timestamp?.toDate ? format(ticket.timestamp.toDate(), 'h:mm:ss a') : '...'}</span>
                                              </div>
                                              <p className="uppercase tracking-tighter">TX: {ticket.id.toUpperCase()}</p>
                                            </div>
                                          </div>

                                          <div className="text-right">
                                            <span className="text-xs font-black text-primary">${(ticket.totalAmount || 0).toFixed(2)}</span>
                                            {totalPrize > 0 && (
                                              <div className="flex items-center justify-end gap-1 text-green-400">
                                                <Trophy className="w-2.5 h-2.5" />
                                                <span className="text-[9px] font-black tracking-tighter">${totalPrize.toFixed(2)}</span>
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        {/* Bets Grid */}
                                        <div className="grid grid-cols-3 md:grid-cols-4 gap-1 mt-1">
                                          {(() => {
                                            const lotKey = normalizePlainText(lot.name || '');
                                            return unifyBets(
                                              (ticket.bets || []).filter(b => (
                                                b &&
                                                normalizePlainText(b.lottery || '') === lotKey &&
                                                (!historyTypeFilterCode || b.type === historyTypeFilterCode)
                                              ))
                                            ).map((b, i) => {
                                              const hasWinningBet = winningBets.some(wb => {
                                                const original = (ticket.bets || [])[wb.idx];
                                                return Boolean(
                                                  original &&
                                                  original.number === b.number &&
                                                  original.type === b.type &&
                                                  normalizePlainText(original.lottery || '') === lotKey
                                                );
                                              });

                                              return (
                                                <div key={`${ticket.id}-${lot.id}-${b.type}-${b.number}-${i}`} className={`flex justify-center items-center px-1.5 py-1 rounded border transition-all ${hasWinningBet ? 'border-green-500/50 bg-green-500/20' : 'border-white/5 bg-black/40'}`}>
                                                  <div className="flex items-center gap-1">
                                                    <span className="text-xs font-black text-white">{b.number}</span>
                                                    <span className="text-[9px] font-bold text-muted-foreground">x{b.quantity}</span>
                                                  </div>
                                                </div>
                                              );
                                            });
                                          })()}
                                        </div>
                                      </div>
                                    );
                                  })}
                                  
                                  {totalPages > 1 && (
                                    <div className="flex items-center justify-between pt-2 border-t border-white/5 mt-2">
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setLotteryPages(prev => ({ ...prev, [lot.id]: Math.max(1, (prev[lot.id] || 1) - 1) }));
                                        }}
                                        disabled={currentPage === 1}
                                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded text-[10px] font-bold uppercase tracking-wider transition-colors"
                                      >
                                        Anterior
                                      </button>
                                      <span className="text-[10px] font-mono text-muted-foreground">
                                        PÃ¡gina {currentPage} de {totalPages}
                                      </span>
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setLotteryPages(prev => ({ ...prev, [lot.id]: Math.min(totalPages, (prev[lot.id] || 1) + 1) }));
                                        }}
                                        disabled={currentPage === totalPages}
                                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded text-[10px] font-bold uppercase tracking-wider transition-colors"
                                      >
                                        Siguiente
                                      </button>
                                    </div>
                                  )}
                                </div>
                            </motion.div>
                          )}
                        </div>
                      );
                    })}
                </div>

                {filteredTickets.length === 0 && (
                  <div className="glass-card p-20 text-center text-muted-foreground">
                    <History className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="text-sm font-mono uppercase">No se encontraron registros</p>
                  </div>
                )}
              </motion.div>
  );
}

