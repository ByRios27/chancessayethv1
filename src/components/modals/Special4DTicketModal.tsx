import { motion } from 'motion/react';
import { X } from 'lucide-react';
import type { Special4DPrizeResult, Special4DTicket } from '../../types/special4d';

const formatTicketDate = (ticket: Special4DTicket) => {
  const date = ticket.timestamp?.toDate?.();
  return date ? date.toLocaleString() : ticket.date;
};

const Special4DTicketModal = ({
  ticket,
  prizeResult,
  onClose,
}: {
  ticket: Special4DTicket | null;
  prizeResult?: Special4DPrizeResult;
  onClose: () => void;
}) => {
  if (!ticket) return null;
  const lotteryName = ticket.specialLotteryName || ticket.specialName || ticket.sourceLotteryName || 'Especial Chances 4D';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass-card max-w-sm w-full p-4"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-black uppercase tracking-tighter italic">Ticket Especial 4D</h3>
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{ticket.id.slice(0, 8)}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="rounded-xl bg-white text-black p-4 space-y-3">
          <div className="text-center border-b border-black/10 pb-2">
            <p className="text-xl font-black italic tracking-tight">CHANCE PRO</p>
            <p className="text-[10px] font-black uppercase tracking-widest">{lotteryName}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <span className="text-black/60">Fecha</span>
            <strong className="text-right">{formatTicketDate(ticket)}</strong>
            <span className="text-black/60">Cliente</span>
            <strong className="text-right">{ticket.customerName || 'Cliente General'}</strong>
            <span className="text-black/60">Vendedor</span>
            <strong className="text-right">{ticket.sellerCode || ticket.sellerId}</strong>
            <span className="text-black/60">Sorteo especial</span>
            <strong className="text-right">{lotteryName}</strong>
          </div>

          <div className="rounded-lg border border-black/10 p-3 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-black/60">Numero jugado</p>
            <p className="text-4xl font-black tracking-widest">{ticket.number}</p>
            <p className="text-[11px] font-black uppercase tracking-widest">
              {ticket.quantity} x USD {ticket.unitPrice.toFixed(2)}
            </p>
          </div>

          <div className="flex items-center justify-between border-t border-black/10 pt-2">
            <span className="text-[11px] font-black uppercase tracking-widest">Total</span>
            <strong className="text-xl">USD {ticket.totalAmount.toFixed(2)}</strong>
          </div>

          {prizeResult && prizeResult.totalPrize > 0 && (
            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-800">
              <p className="text-[10px] font-black uppercase tracking-widest">Premio</p>
              <p className="text-lg font-black">USD {prizeResult.totalPrize.toFixed(2)}</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Special4DTicketModal;
