import React from 'react';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import { getTicketPrimaryLabel, getTicketSecondaryId } from '../../utils/tickets';

type RecoverySectionProps = any;

export function RecoverySection(props: RecoverySectionProps) {
  const {
    fetchRecoveryData,
    isRecoveryLoading,
    recoveryDate,
    setRecoveryDate,
    recoverySellerFilter,
    setRecoverySellerFilter,
    recoveryLotteryFilter,
    setRecoveryLotteryFilter,
    recoveryTicketIdFilter,
    setRecoveryTicketIdFilter,
    recoveryStatusFilter,
    setRecoveryStatusFilter,
    recoverySortOrder,
    setRecoverySortOrder,
    filteredRecoveryTickets,
    recoveryTickets,
    parseTicketTimestampMs,
    getRecoveryTicketLotteryNames,
    recoveryTargetLotteryMapByRow,
    getRecoveryTicketLotteryLabel,
    recoveryTargetLotteryByRow,
    setRecoveryTargetLotteryByRow,
    setRecoveryTargetLotteryMapByRow,
    recoveryAvailableLotteries,
    cleanText,
    formatTime12h,
    saveRecoveryLotteryChange,
    recoverySavingRowId,
    recoveryDeletingRowId,
    deleteRecoveryTicket,
  } = props;

  return (
    <motion.div
      key="recovery"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-8"
    >
      <div className="glass-card p-4 sm:p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-black italic tracking-tighter neon-text uppercase">RECUPERACIÓN</h2>
            <p className="text-xs font-mono text-muted-foreground mt-1 uppercase tracking-widest">
              Corrección manual de sorteo por ticket (live + archivo diario)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchRecoveryData}
              disabled={isRecoveryLoading}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-60"
            >
              {isRecoveryLoading ? 'Cargando...' : 'Recargar'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Fecha operativa</label>
            <input
              type="date"
              value={recoveryDate}
              onChange={(e) => setRecoveryDate(e.target.value)}
              className="w-full bg-black border border-border p-2 rounded-lg font-mono text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Usuario / Seller</label>
            <input
              type="text"
              value={recoverySellerFilter}
              onChange={(e) => setRecoverySellerFilter(e.target.value)}
              placeholder="nombre, correo, sellerId"
              className="w-full bg-black border border-border p-2 rounded-lg font-mono text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Sorteo guardado</label>
            <input
              type="text"
              value={recoveryLotteryFilter}
              onChange={(e) => setRecoveryLotteryFilter(e.target.value)}
              placeholder="texto libre"
              className="w-full bg-black border border-border p-2 rounded-lg font-mono text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Ticket ID</label>
            <input
              type="text"
              value={recoveryTicketIdFilter}
              onChange={(e) => setRecoveryTicketIdFilter(e.target.value)}
              placeholder="id ticket"
              className="w-full bg-black border border-border p-2 rounded-lg font-mono text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Estado</label>
            <select
              value={recoveryStatusFilter}
              onChange={(e) => setRecoveryStatusFilter(e.target.value as 'ALL' | 'active' | 'winner' | 'cancelled' | 'liquidated')}
              className="w-full bg-black border border-border p-2 rounded-lg font-mono text-xs"
            >
              <option value="ALL">Todos</option>
              <option value="active">active</option>
              <option value="winner">winner</option>
              <option value="cancelled">cancelled</option>
              <option value="liquidated">liquidated</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Orden creación</label>
            <select
              value={recoverySortOrder}
              onChange={(e) => setRecoverySortOrder(e.target.value as 'asc' | 'desc')}
              className="w-full bg-black border border-border p-2 rounded-lg font-mono text-xs"
            >
              <option value="asc">Ascendente</option>
              <option value="desc">Descendente</option>
            </select>
          </div>
        </div>

        <div className="mb-4 text-xs font-mono text-muted-foreground uppercase tracking-widest">
          Tickets mostrados: {filteredRecoveryTickets.length} / {recoveryTickets.length}
        </div>

        <div className="space-y-3">
          {filteredRecoveryTickets.map((ticket: any) => {
            const timestampMs = parseTicketTimestampMs(ticket.timestamp);
            const createdAt = timestampMs ? format(new Date(timestampMs), 'yyyy-MM-dd hh:mm:ss a') : '-';
            const ticketLotteryNames = getRecoveryTicketLotteryNames(ticket);
            const isMultipleTicket = ticketLotteryNames.length > 1;
            const selectedMultiMap = recoveryTargetLotteryMapByRow[ticket.rowId] || {};
            const canSaveTicket = isMultipleTicket
              ? ticketLotteryNames.every((sourceLottery: string) => Boolean(selectedMultiMap[sourceLottery]))
              : Boolean(recoveryTargetLotteryByRow[ticket.rowId]);
            return (
              <div key={ticket.rowId} className="rounded-xl border border-white/10 bg-black/40 p-3">
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 items-end">
                  <div className="xl:col-span-3">
                    <p className="text-[10px] font-mono uppercase text-muted-foreground">Ticket</p>
                    <p className="text-xs font-black break-all">{getTicketPrimaryLabel(ticket)}</p>
                    {getTicketSecondaryId(ticket) && (
                      <p className="text-[10px] font-mono text-muted-foreground">{getTicketSecondaryId(ticket)}</p>
                    )}
                    <p className="text-[10px] font-mono text-muted-foreground mt-1">{ticket.source === 'tickets' ? 'LIVE' : `ARCHIVO ${ticket.archiveDate}`}</p>
                  </div>
                  <div className="xl:col-span-2">
                    <p className="text-[10px] font-mono uppercase text-muted-foreground">Usuario</p>
                    <p className="text-xs font-bold">{ticket.sellerName || ticket.sellerId || '-'}</p>
                    <p className="text-[10px] font-mono text-muted-foreground break-all">{ticket.sellerEmail || '-'}</p>
                  </div>
                  <div className="xl:col-span-2">
                    <p className="text-[10px] font-mono uppercase text-muted-foreground">Creación</p>
                    <p className="text-xs font-mono">{createdAt}</p>
                    <p className="text-[10px] font-mono text-muted-foreground">Estado: {ticket.status || '-'}</p>
                  </div>
                  <div className="xl:col-span-2">
                    <p className="text-[10px] font-mono uppercase text-muted-foreground">Sorteo actual</p>
                    <p className="text-xs font-bold">{getRecoveryTicketLotteryLabel(ticket)}</p>
                    <p className="text-[10px] font-mono text-muted-foreground">Total: USD {(ticket.totalAmount || 0).toFixed(2)}</p>
                  </div>
                  <div className="xl:col-span-2">
                    <p className="text-[10px] font-mono uppercase text-muted-foreground">Nuevo sorteo</p>
                    {isMultipleTicket ? (
                      <div className="space-y-1.5">
                        {ticketLotteryNames.map((sourceLottery: string) => (
                          <div key={`${ticket.rowId}-${sourceLottery}`} className="space-y-1">
                            <p className="text-[9px] font-mono text-muted-foreground">De: {sourceLottery}</p>
                            <select
                              value={selectedMultiMap[sourceLottery] || ''}
                              onChange={(e) => setRecoveryTargetLotteryMapByRow((prev: any) => ({
                                ...prev,
                                [ticket.rowId]: {
                                  ...(prev[ticket.rowId] || {}),
                                  [sourceLottery]: e.target.value
                                }
                              }))}
                              className="w-full bg-black border border-border p-2 rounded-lg font-mono text-xs"
                            >
                              <option value="">Seleccionar...</option>
                              {recoveryAvailableLotteries.map((lot: any) => (
                                <option key={`${ticket.rowId}-${sourceLottery}-${lot.id}`} value={lot.id}>
                                  {cleanText(lot.name)} ({formatTime12h(lot.drawTime)}) {lot.active ? '' : '[INACTIVO]'}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <select
                        value={recoveryTargetLotteryByRow[ticket.rowId] || ''}
                        onChange={(e) => setRecoveryTargetLotteryByRow((prev: any) => ({ ...prev, [ticket.rowId]: e.target.value }))}
                        className="w-full bg-black border border-border p-2 rounded-lg font-mono text-xs"
                      >
                        <option value="">Seleccionar...</option>
                        {recoveryAvailableLotteries.map((lot: any) => (
                          <option key={`${ticket.rowId}-${lot.id}`} value={lot.id}>
                            {cleanText(lot.name)} ({formatTime12h(lot.drawTime)}) {lot.active ? '' : '[INACTIVO]'}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="xl:col-span-1 space-y-1">
                    <button
                      onClick={() => saveRecoveryLotteryChange(ticket)}
                      disabled={recoverySavingRowId === ticket.rowId || recoveryDeletingRowId === ticket.rowId || !canSaveTicket}
                      className="w-full bg-primary text-primary-foreground p-2 rounded-lg text-[10px] font-black uppercase tracking-widest disabled:opacity-60"
                    >
                      {recoverySavingRowId === ticket.rowId ? 'Guardando' : 'Guardar'}
                    </button>
                    <button
                      onClick={() => deleteRecoveryTicket(ticket)}
                      disabled={recoverySavingRowId === ticket.rowId || recoveryDeletingRowId === ticket.rowId}
                      className="w-full bg-red-500/20 text-red-400 border border-red-500/30 p-2 rounded-lg text-[10px] font-black uppercase tracking-widest disabled:opacity-60"
                    >
                      {recoveryDeletingRowId === ticket.rowId ? 'Eliminando' : 'Eliminar'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {filteredRecoveryTickets.length === 0 && (
            <div className="h-40 flex items-center justify-center text-muted-foreground font-mono text-xs uppercase tracking-widest border-2 border-dashed border-border rounded-xl">
              No hay tickets con esos filtros
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
