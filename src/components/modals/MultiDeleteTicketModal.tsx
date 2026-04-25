import { motion } from 'motion/react';
import { Layers, Trash2 } from 'lucide-react';

interface MultiDeleteTicketModalProps {
  show: boolean;
  onClose: () => void;
  onDeleteLottery: () => void;
  onDeleteAll: () => void;
}

export default function MultiDeleteTicketModal({
  show,
  onClose,
  onDeleteLottery,
  onDeleteAll,
}: MultiDeleteTicketModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="surface-card max-w-sm w-full p-4 border border-white/10"
      >
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-black uppercase tracking-wide">Eliminar venta múltiple</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Este ticket contiene jugadas en varios sorteos. ¿Qué deseas eliminar?
        </p>

        <div className="space-y-2">
          <button
            onClick={() => {
              onDeleteLottery();
              onClose();
            }}
            className="w-full py-3 rounded-xl border border-white/10 text-xs font-black uppercase tracking-wide bg-white/5 hover:bg-white/10 transition-colors"
          >
            Eliminar solo este sorteo
          </button>
          <button
            onClick={() => {
              onDeleteAll();
              onClose();
            }}
            className="w-full py-3 rounded-xl border border-red-500/30 text-red-400 text-xs font-black uppercase tracking-wide bg-red-500/10 hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Eliminar toda la venta
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl border border-white/10 text-xs font-black uppercase tracking-wide hover:bg-white/5 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </motion.div>
    </div>
  );
}

