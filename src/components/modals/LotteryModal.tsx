import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import type { Lottery, GlobalSettings } from '../../types/lotteries';
import { cleanText } from '../../utils/text';

const LotteryModal = ({ show, lottery, onSave, onClose, globalSettings }: {
  show: boolean;
  lottery: Lottery | null;
  onSave: (data: Partial<Lottery>) => void;
  onClose: () => void;
  globalSettings: GlobalSettings | null;
}) => {
  const [name, setName] = useState('');
  const [drawTime, setDrawTime] = useState('');
  const [closingTime, setClosingTime] = useState('');
  const [isFourDigits, setIsFourDigits] = useState(false);

  useEffect(() => {
    if (lottery) {
      setName(cleanText(lottery.name));
      setDrawTime(lottery.drawTime || '');
      setClosingTime(lottery.closingTime || '');
      setIsFourDigits(lottery.isFourDigits || false);
    } else {
      setName('');
      setDrawTime('');
      setClosingTime('');
      setIsFourDigits(false);
    }
  }, [lottery, show]);

  if (!show) return null;

  const handleSave = () => {
    onSave({
      name,
      drawTime,
      closingTime,
      isFourDigits
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass-card max-w-md w-full p-4 md:p-8 max-h-[90vh] overflow-y-auto custom-scrollbar"
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black uppercase tracking-tighter italic">
            {lottery ? 'Editar Sorteo' : 'Nuevo Sorteo'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        
        <div className="space-y-6">
          <div className="space-y-4">
            <h4 className="text-[10px] font-mono font-bold uppercase text-primary border-b border-white/10 pb-1">Información Básica</h4>
            <div>
              <label className="text-[10px] font-mono uppercase text-muted-foreground block mb-1">Nombre del Sorteo</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Lotería de Medellín"
                className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-mono uppercase text-muted-foreground block mb-1">Hora del Sorteo</label>
                <input 
                  type="time" 
                  value={drawTime}
                  onChange={(e) => setDrawTime(e.target.value)}
                  className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase text-muted-foreground block mb-1">Hora de Cierre</label>
                <input 
                  type="time" 
                  value={closingTime}
                  onChange={(e) => setClosingTime(e.target.value)}
                  className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer group">
                <div 
                  onClick={() => setIsFourDigits(!isFourDigits)}
                  className={`w-10 h-5 rounded-full transition-all relative ${isFourDigits ? 'bg-primary' : 'bg-white/10'}`}
                >
                  <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${isFourDigits ? 'left-6' : 'left-1'}`} />
                </div>
                <span className="text-[10px] font-mono uppercase text-muted-foreground group-hover:text-foreground transition-colors">Sorteo de 4 Cifras (Billete)</span>
              </label>
              <p className="text-[9px] text-muted-foreground mt-1 ml-12 italic">Habilita premios de 4 cifras y jugadas tipo Billete (BL).</p>
            </div>
          </div>
          
          <div className="pt-4 grid grid-cols-2 gap-4">
            <button 
              onClick={onClose}
              className="py-3 px-6 rounded-xl border border-border font-bold text-xs uppercase hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSave}
              disabled={!name || !drawTime || !closingTime}
              className="py-3 px-6 rounded-xl bg-primary text-primary-foreground font-bold text-xs uppercase hover:brightness-110 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              Guardar
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LotteryModal;
