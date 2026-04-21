import React from 'react';
import { motion } from 'motion/react';
import { ChevronRight, X } from 'lucide-react';
import type { Lottery } from '../../types/lotteries';
import { cleanText } from '../../utils/text';
import { formatTime12h } from '../../utils/time';

const LotterySelectorModal = ({ show, lotteries, onSelect, onClose }: {
  show: boolean;
  lotteries: Lottery[];
  onSelect: (lotteryName: string) => void;
  onClose: () => void;
}) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass-card max-w-md w-full p-4 md:p-8"
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black uppercase tracking-tighter italic">Seleccionar Sorteo</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-xs text-muted-foreground mb-6 uppercase font-mono tracking-widest">¿Para qué sorteo desea duplicar esta lista?</p>
        <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
          {lotteries.filter(l => l.active).map(lot => (
            <button
              key={lot.id}
              onClick={() => { onSelect(lot.name); onClose(); }}
              className="w-full p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all text-left group flex justify-between items-center"
            >
              <div className="flex flex-col">
                <span className="font-bold uppercase tracking-widest text-sm">{cleanText(lot.name)}</span>
                {lot.drawTime && <span className="text-[10px] font-mono opacity-50">S: {formatTime12h(lot.drawTime)}</span>}
              </div>
              <ChevronRight className="w-4 h-4 transition-opacity" />
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default LotterySelectorModal;
