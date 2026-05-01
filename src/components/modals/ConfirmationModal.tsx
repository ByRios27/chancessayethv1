import { motion } from 'motion/react';
import { Trash2 } from 'lucide-react';

const ConfirmationModal = ({ show, title, message, onConfirm, onClose }: { 
  show: boolean; 
  title: string; 
  message: string; 
  onConfirm: () => void; 
  onClose: () => void; 
}) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass-card max-w-sm w-full p-4 md:p-8 text-center"
      >
        <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <Trash2 className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-black uppercase tracking-tighter mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-8">{message}</p>
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={onClose}
            className="py-3 px-6 rounded-xl border border-border font-bold text-xs uppercase hover:bg-white/5 transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={() => { onConfirm(); onClose(); }}
            className="py-3 px-6 rounded-xl bg-red-600 text-white font-bold text-xs uppercase hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
          >
            Confirmar
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ConfirmationModal;
