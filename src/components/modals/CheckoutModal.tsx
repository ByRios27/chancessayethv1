import { motion } from 'motion/react';
import { X } from 'lucide-react';

const CheckoutModal = ({ show, customerName, setCustomerName, onConfirm, onClose, isSubmitting = false }: {
  show: boolean;
  customerName: string;
  setCustomerName: (val: string) => void;
  onConfirm: () => void;
  onClose: () => void;
  isSubmitting?: boolean;
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass-card max-w-sm w-full p-4 md:p-8"
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black uppercase tracking-tighter italic">Finalizar Venta</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              Nombre del Cliente
            </label>
            <input 
              type="text" 
              autoFocus
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Cliente General"
              disabled={isSubmitting}
              className="w-full bg-white/5 border border-border p-4 rounded-xl font-mono text-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all disabled:opacity-50"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isSubmitting) onConfirm();
              }}
            />
            <p className="text-[9px] font-mono text-muted-foreground italic">Deje en blanco para usar "Cliente General"</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={onClose}
              disabled={isSubmitting}
              className="py-4 px-6 rounded-xl border border-border font-bold text-xs uppercase hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button 
              onClick={onConfirm}
              disabled={isSubmitting}
              className="py-4 px-6 rounded-xl bg-primary text-primary-foreground font-bold text-xs uppercase hover:brightness-110 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Generando...' : 'Generar'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default CheckoutModal;
