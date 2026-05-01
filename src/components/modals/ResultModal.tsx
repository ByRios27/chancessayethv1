import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import type { Lottery } from '../../types/lotteries';
import type { LotteryResult } from '../../types/results';
import { getBusinessDate } from '../../utils/dates';
import { format } from 'date-fns';
import { cleanText } from '../../utils/text';

const ResultModal = ({ show, result, lotteries, onSave, onClose }: {
  show: boolean;
  result: LotteryResult | null;
  lotteries: Lottery[];
  onSave: (data: Partial<LotteryResult>) => void;
  onClose: () => void;
}) => {
  const [lotteryId, setLotteryId] = useState('');
  const [date, setDate] = useState(format(getBusinessDate(), 'yyyy-MM-dd'));
  const [firstPrize, setFirstPrize] = useState('');
  const [secondPrize, setSecondPrize] = useState('');
  const [thirdPrize, setThirdPrize] = useState('');

  useEffect(() => {
    if (result) {
      setLotteryId(result.lotteryId);
      setDate(result.date);
      setFirstPrize(result.firstPrize);
      setSecondPrize(result.secondPrize);
      setThirdPrize(result.thirdPrize);
    } else {
      setLotteryId('');
      setDate(format(getBusinessDate(), 'yyyy-MM-dd'));
      setFirstPrize('');
      setSecondPrize('');
      setThirdPrize('');
    }
  }, [result, show]);

  if (!show) return null;

  const selectedLottery = lotteries.find(l => l.id === lotteryId);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass-card max-w-md w-full p-4 md:p-8"
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black uppercase tracking-tighter italic">
            {result ? 'Editar Resultado' : 'Nuevo Resultado'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-mono uppercase text-muted-foreground block mb-1">Sorteo</label>
            <select 
              value={lotteryId}
              onChange={(e) => setLotteryId(e.target.value)}
              className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary appearance-none"
            >
              <option key="default" value="" className="bg-[#111827]">Seleccionar Sorteo</option>
              {lotteries.map(l => (
                <option key={l.id} value={l.id} className="bg-[#111827]">{cleanText(l.name)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-mono uppercase text-muted-foreground block mb-1">Fecha del Sorteo</label>
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-mono uppercase text-muted-foreground block mb-1">1er Premio</label>
              <input 
                type="text" 
                maxLength={selectedLottery?.isFourDigits ? 4 : 2}
                value={firstPrize === 'NaN' ? '' : firstPrize}
                onChange={(e) => setFirstPrize(e.target.value.replace(/\D/g, ''))}
                placeholder={selectedLottery?.isFourDigits ? "0000" : "00"}
                className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-sm font-bold text-center focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase text-muted-foreground block mb-1">2do Premio</label>
              <input 
                type="text" 
                maxLength={selectedLottery?.isFourDigits ? 4 : 2}
                value={secondPrize === 'NaN' ? '' : secondPrize}
                onChange={(e) => setSecondPrize(e.target.value.replace(/\D/g, ''))}
                placeholder={selectedLottery?.isFourDigits ? "0000" : "00"}
                className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-sm font-bold text-center focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase text-muted-foreground block mb-1">3er Premio</label>
              <input 
                type="text" 
                maxLength={selectedLottery?.isFourDigits ? 4 : 2}
                value={thirdPrize === 'NaN' ? '' : thirdPrize}
                onChange={(e) => setThirdPrize(e.target.value.replace(/\D/g, ''))}
                placeholder={selectedLottery?.isFourDigits ? "0000" : "00"}
                className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-sm font-bold text-center focus:outline-none focus:ring-1 focus:ring-primary"
              />
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
              onClick={() => {
                const name = selectedLottery?.name || lotteries.find(l => l.id === lotteryId)?.name || 'Sorteo Desconocido';
                onSave({ 
                  lotteryId, 
                  lotteryName: cleanText(name), 
                  date, 
                  firstPrize, 
                  secondPrize, 
                  thirdPrize 
                });
              }}
              disabled={!lotteryId || !date || !firstPrize || !secondPrize || !thirdPrize}
              className="py-3 px-6 rounded-xl bg-primary text-primary-foreground font-bold text-xs uppercase hover:brightness-110 transition-all disabled:opacity-50"
            >
              Guardar
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ResultModal;
