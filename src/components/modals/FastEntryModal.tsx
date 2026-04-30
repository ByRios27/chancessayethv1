import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { ArrowLeftRight, X } from 'lucide-react';
import type { Bet } from '../../types/bets';

interface SelectedLotteryOption {
  id: string;
  name: string;
  drawTime?: string;
}

const FastEntryModal = ({ show, onAdd, onClose, selectedLotteries, chancePrice, plAmount }: {
  show: boolean;
  onAdd: (bets: Bet[]) => void;
  onClose: () => void;
  selectedLotteries: SelectedLotteryOption[];
  chancePrice: number;
  plAmount: string;
}) => {
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<{valid: Bet[], invalid: string[]}>({valid: [], invalid: []});
  const [invertFormat, setInvertFormat] = useState(false);

  useEffect(() => {
    if (!show) {
      setText('');
      setPreview({valid: [], invalid: []});
      setInvertFormat(false);
    }
  }, [show]);

  const processText = () => {
    if (selectedLotteries.length === 0) {
      toast.error('Seleccione al menos un sorteo primero');
      return;
    }

    // Normalizar espacios alrededor de los separadores (- o .)
    const normalizedText = text.replace(/\s*([-.,])\s*/g, '$1');
    const tokens = normalizedText.split(/\s+/).filter(t => t.trim() !== '');
    const validBets: Bet[] = [];
    const invalidTokens: string[] = [];
    const plCostPerUnit = parseFloat(plAmount) || 1.00;

    tokens.forEach(token => {
      // Matches formats like 87-3, 5-34, 88.3, 1123-2, 8939.4, 87,3
      // We use a more generic regex to capture both sides, then assign based on invertFormat
      const match = token.match(/^(\d+(?:[.,]\d+)?)[-.,](\d+(?:[.,]\d+)?)$/);
      if (match) {
        let numStr = invertFormat ? match[2] : match[1];
        let qtyStrRaw = invertFormat ? match[1] : match[2];
        
        // Clean up numStr just in case it captured decimals (though numbers shouldn't have them)
        numStr = numStr.replace(/[.,].*$/, '');
        
        const qtyStr = qtyStrRaw.replace(',', '.');
        const quantity = parseInt(qtyStr, 10);

        if (quantity > 0 && numStr.length >= 1 && numStr.length <= 4) {
          let type: 'CH' | 'PL' = 'CH';
          let finalNumber = numStr;
          let calculatedAmount = 0;

          if (numStr.length <= 2) {
            type = 'CH';
            finalNumber = numStr.padStart(2, '0');
            calculatedAmount = quantity * chancePrice;
          } else {
            type = 'PL';
            finalNumber = numStr.padStart(4, '0');
            calculatedAmount = quantity * plCostPerUnit;
          }

          if (type === 'PL' && quantity > 5) {
            invalidTokens.push(`${token} (Máx 5 comb)`);
          } else {
            selectedLotteries.forEach(lottery => {
              const existingIdx = validBets.findIndex(b => 
                b.number === finalNumber && 
                b.lotteryId === lottery.id &&
                b.type === type
              );
              if (existingIdx !== -1) {
                validBets[existingIdx].quantity += quantity;
                validBets[existingIdx].amount += calculatedAmount;
              } else {
                validBets.push({
                  number: finalNumber,
                  lottery: lottery.name,
                  lotteryId: lottery.id,
                  lotteryDrawTime: lottery.drawTime || '',
                  amount: calculatedAmount,
                  type,
                  quantity
                });
              }
            });
          }
        } else {
          invalidTokens.push(token);
        }
      } else {
        invalidTokens.push(token);
      }
    });

    setPreview({ valid: validBets, invalid: invalidTokens });
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass-card max-w-2xl w-full p-4 md:p-8 max-h-[95vh] flex flex-col"
      >
        <div className="flex justify-between items-center mb-4 md:mb-6">
          <h3 className="text-lg md:text-xl font-black uppercase tracking-tighter italic">Copiado Rápido</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <p className="text-[10px] md:text-xs text-muted-foreground font-mono mb-4">
          Pegue su lista de números y montos. Formatos soportados: 87-3, 5-34, 88.3, 1123-2, 8939.4. Separados por espacios o saltos de línea.
        </p>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 bg-white/5 p-3 rounded-xl border border-border">
          <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Formato: {invertFormat ? 'Cantidad-Número' : 'Número-Cantidad'}
          </span>
          <button
            onClick={() => setInvertFormat(!invertFormat)}
            className={`w-full sm:w-auto flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
              invertFormat ? 'bg-primary text-primary-foreground' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <ArrowLeftRight className="w-3 h-3" />
            Invertir
          </button>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full h-32 bg-black/40 border border-border p-4 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-none mb-4"
          placeholder={invertFormat ? "Ejemplo: 3-87 2-56 2-1123..." : "Ejemplo: 87-3 56-2 1123-2..."}
        />

        <button 
          onClick={processText}
          className="w-full bg-white/10 text-white py-3 rounded-xl font-bold uppercase tracking-widest hover:bg-white/20 transition-all mb-6"
        >
          Procesar Texto
        </button>

        {preview.valid.length > 0 && (
          <div className="flex-1 overflow-y-auto mb-6 bg-black/20 rounded-xl p-4 border border-border/50">
            <h4 className="text-sm font-bold text-green-400 mb-2">Apuestas Válidas ({preview.valid.length / selectedLotteries.length} números x {selectedLotteries.length} sorteos)</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {preview.valid.slice(0, 20).map((bet, i) => (
                <div key={i} className="text-xs font-mono bg-white/5 p-2 rounded border border-border/50 flex justify-between items-center">
                  <span className="font-bold">{bet.number}</span>
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground mr-2">x{bet.quantity}</span>
                    <span className="text-primary">${bet.amount.toFixed(2)}</span>
                  </div>
                </div>
              ))}
              {preview.valid.length > 20 && (
                <div className="text-xs font-mono text-muted-foreground p-2 col-span-full">...y {preview.valid.length - 20} más</div>
              )}
            </div>
          </div>
        )}

        {preview.invalid.length > 0 && (
          <div className="mb-6 bg-red-500/10 rounded-xl p-4 border border-red-500/20">
            <h4 className="text-sm font-bold text-red-400 mb-2">Formatos Inválidos ({preview.invalid.length})</h4>
            <div className="flex flex-wrap gap-2">
              {preview.invalid.map((token, i) => (
                <span key={i} className="text-xs font-mono bg-red-500/20 text-red-300 px-2 py-1 rounded">{token}</span>
              ))}
            </div>
          </div>
        )}

        <button 
          onClick={() => {
            if (preview.valid.length > 0) {
              onAdd(preview.valid);
              onClose();
            } else {
              toast.error('No hay apuestas válidas para agregar');
            }
          }}
          disabled={preview.valid.length === 0}
          className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-bold uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50"
        >
          Agregar al Panel ({preview.valid.length})
        </button>
      </motion.div>
    </div>
  );
};

export default FastEntryModal;
