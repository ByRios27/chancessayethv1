import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Plus, Trash2, X } from 'lucide-react';
import type { ChancePriceConfig, GlobalSettings } from '../../types/lotteries';

const GlobalSettingsModal = ({ show, settings, onSave, onClose }: {
  show: boolean;
  settings: GlobalSettings;
  onSave: (data: GlobalSettings) => void;
  onClose: () => void;
}) => {
  const [chancePrices, setChancePrices] = useState<ChancePriceConfig[]>(settings.chancePrices || []);
  const [palesEnabled, setPalesEnabled] = useState(settings.palesEnabled);
  const [billetesEnabled, setBilletesEnabled] = useState(settings.billetesEnabled);
  const [pl12, setPl12] = useState(settings.pl12Multiplier.toString());
  const [pl13, setPl13] = useState(settings.pl13Multiplier.toString());
  const [pl23, setPl23] = useState(settings.pl23Multiplier.toString());
  const defaultBilletePrizes = {
    full4: 2000,
    first3: 200,
    last3: 200,
    first2: 20,
    last2: 20
  };
  const [billeteMultipliers, setBilleteMultipliers] = useState(settings.billeteMultipliers || {
    p1: { ...defaultBilletePrizes },
    p2: { ...defaultBilletePrizes },
    p3: { ...defaultBilletePrizes }
  });

  useEffect(() => {
    setChancePrices(settings.chancePrices || []);
    setPalesEnabled(settings.palesEnabled);
    setBilletesEnabled(settings.billetesEnabled);
    setPl12(settings.pl12Multiplier.toString());
    setPl13(settings.pl13Multiplier.toString());
    setPl23(settings.pl23Multiplier.toString());
    setBilleteMultipliers(settings.billeteMultipliers || {
      p1: { ...defaultBilletePrizes },
      p2: { ...defaultBilletePrizes },
      p3: { ...defaultBilletePrizes }
    });
  }, [settings, show]);

  if (!show) return null;

  const handleAddPrice = () => {
    setChancePrices([...chancePrices, { price: 0, ch1: 0, ch2: 0, ch3: 0 }]);
  };

  const handleRemovePrice = (index: number) => {
    setChancePrices(chancePrices.filter((_, i) => i !== index));
  };

  const handlePriceChange = (index: number, field: keyof ChancePriceConfig, value: number) => {
    const newPrices = [...chancePrices];
    newPrices[index] = { ...newPrices[index], [field]: value };
    setChancePrices(newPrices);
  };

  const handleSave = () => {
    onSave({
      ...settings,
      chancePrices,
      palesEnabled,
      billetesEnabled,
      pl12Multiplier: parseFloat(pl12),
      pl13Multiplier: parseFloat(pl13),
      pl23Multiplier: parseFloat(pl23),
      billeteMultipliers
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass-card max-w-2xl w-full p-4 md:p-8 max-h-[90vh] overflow-y-auto custom-scrollbar"
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black uppercase tracking-tighter italic">
            Configuración Global de Premios
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        
        <div className="space-y-8">
          {/* Chance Prices Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-white/10 pb-1">
              <h4 className="text-[10px] font-mono font-bold uppercase text-primary">Precios y Premios de Chance (CH)</h4>
              <button 
                onClick={handleAddPrice}
                className="flex items-center gap-1 text-[9px] font-bold uppercase bg-primary/20 text-primary px-2 py-1 rounded hover:bg-primary/30 transition-colors"
              >
                <Plus className="w-3 h-3" /> Añadir Precio
              </button>
            </div>
            
            <div className="space-y-4">
              {chancePrices.length === 0 && (
                <p className="text-xs text-muted-foreground italic text-center py-4">No hay precios configurados. Añada uno para vender Chance.</p>
              )}
              {chancePrices.map((config, idx) => (
                <div key={idx} className="bg-white/5 border border-border rounded-xl p-4 relative group">
                  <button 
                    onClick={() => handleRemovePrice(idx)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full transition-opacity shadow-lg"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="text-[9px] font-mono uppercase text-muted-foreground block mb-1">Precio (USD)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={Number.isNaN(config.price) ? '' : config.price}
                        onChange={(e) => handlePriceChange(idx, 'price', parseFloat(e.target.value))}
                        className="w-full bg-black/20 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-mono uppercase text-muted-foreground block mb-1">1er Premio (x)</label>
                      <input 
                        type="number" 
                        value={Number.isNaN(config.ch1) ? '' : config.ch1}
                        onChange={(e) => handlePriceChange(idx, 'ch1', parseFloat(e.target.value))}
                        className="w-full bg-black/20 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-mono uppercase text-muted-foreground block mb-1">2do Premio (x)</label>
                      <input 
                        type="number" 
                        value={Number.isNaN(config.ch2) ? '' : config.ch2}
                        onChange={(e) => handlePriceChange(idx, 'ch2', parseFloat(e.target.value))}
                        className="w-full bg-black/20 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-mono uppercase text-muted-foreground block mb-1">3er Premio (x)</label>
                      <input 
                        type="number" 
                        value={Number.isNaN(config.ch3) ? '' : config.ch3}
                        onChange={(e) => handlePriceChange(idx, 'ch3', parseFloat(e.target.value))}
                        className="w-full bg-black/20 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pales Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-white/10 pb-1">
              <h4 className="text-[10px] font-mono font-bold uppercase text-primary">Configuración de Pales (PL)</h4>
              <button 
                onClick={() => setPalesEnabled(!palesEnabled)}
                className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase transition-all border ${
                  palesEnabled ? 'bg-green-500/20 border-green-500 text-green-500' : 'bg-red-500/20 border-red-500 text-red-500'
                }`}
              >
                {palesEnabled ? 'Sí Activado' : 'Desactivado'}
              </button>
            </div>
            
            {palesEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-mono uppercase text-muted-foreground block mb-1">1ro con 2do (x)</label>
                  <input 
                    type="number" 
                    value={pl12 === 'NaN' ? '' : pl12}
                    onChange={(e) => setPl12(e.target.value)}
                    className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-muted-foreground block mb-1">1ro con 3ro (x)</label>
                  <input 
                    type="number" 
                    value={pl13 === 'NaN' ? '' : pl13}
                    onChange={(e) => setPl13(e.target.value)}
                    className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-muted-foreground block mb-1">2do con 3ro (x)</label>
                  <input 
                    type="number" 
                    value={pl23 === 'NaN' ? '' : pl23}
                    onChange={(e) => setPl23(e.target.value)}
                    className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            )}
          </div>
          
          {/* Billete Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-white/10 pb-1">
              <h4 className="text-[10px] font-mono font-bold uppercase text-primary">Configuración de Billetes (BL - 4 Cifras)</h4>
              <button 
                onClick={() => setBilletesEnabled(!billetesEnabled)}
                className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase transition-all border ${
                  billetesEnabled ? 'bg-green-500/20 border-green-500 text-green-500' : 'bg-red-500/20 border-red-500 text-red-500'
                }`}
              >
                {billetesEnabled ? 'Sí Activado' : 'Desactivado'}
              </button>
            </div>
            
            {billetesEnabled && (
              <div className="space-y-6">
                {[1, 2, 3].map((prizeNum) => {
                  const pKey = `p${prizeNum}` as keyof typeof billeteMultipliers;
                  const prizes = billeteMultipliers[pKey];
                  return (
                    <div key={prizeNum} className="bg-white/5 border border-border p-4 rounded-xl space-y-3">
                      <h5 className="text-[9px] font-mono font-bold uppercase text-muted-foreground">{prizeNum}er Premio</h5>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <div className="bg-black/20 p-2 rounded-lg">
                          <label className="text-[8px] font-mono uppercase text-muted-foreground block mb-1">4 Cifras (Full)</label>
                          <input 
                            type="number" 
                            value={Number.isNaN(prizes.full4) ? '' : prizes.full4}
                            onChange={(e) => setBilleteMultipliers({
                              ...billeteMultipliers, 
                              [pKey]: { ...prizes, full4: parseFloat(e.target.value) }
                            })}
                            className="w-full bg-transparent border-none p-0 text-xs focus:outline-none focus:ring-0"
                          />
                        </div>
                        <div className="bg-black/20 p-2 rounded-lg">
                          <label className="text-[8px] font-mono uppercase text-muted-foreground block mb-1">Primeras 3</label>
                          <input 
                            type="number" 
                            value={Number.isNaN(prizes.first3) ? '' : prizes.first3}
                            onChange={(e) => setBilleteMultipliers({
                              ...billeteMultipliers, 
                              [pKey]: { ...prizes, first3: parseFloat(e.target.value) }
                            })}
                            className="w-full bg-transparent border-none p-0 text-xs focus:outline-none focus:ring-0"
                          />
                        </div>
                        <div className="bg-black/20 p-2 rounded-lg">
                          <label className="text-[8px] font-mono uppercase text-muted-foreground block mb-1">?ltimas 3</label>
                          <input 
                            type="number" 
                            value={Number.isNaN(prizes.last3) ? '' : prizes.last3}
                            onChange={(e) => setBilleteMultipliers({
                              ...billeteMultipliers, 
                              [pKey]: { ...prizes, last3: parseFloat(e.target.value) }
                            })}
                            className="w-full bg-transparent border-none p-0 text-xs focus:outline-none focus:ring-0"
                          />
                        </div>
                        <div className="bg-black/20 p-2 rounded-lg">
                          <label className="text-[8px] font-mono uppercase text-muted-foreground block mb-1">Primeras 2</label>
                          <input 
                            type="number" 
                            value={Number.isNaN(prizes.first2) ? '' : prizes.first2}
                            onChange={(e) => setBilleteMultipliers({
                              ...billeteMultipliers, 
                              [pKey]: { ...prizes, first2: parseFloat(e.target.value) }
                            })}
                            className="w-full bg-transparent border-none p-0 text-xs focus:outline-none focus:ring-0"
                          />
                        </div>
                        <div className="bg-black/20 p-2 rounded-lg">
                          <label className="text-[8px] font-mono uppercase text-muted-foreground block mb-1">?ltimas 2</label>
                          <input 
                            type="number" 
                            value={Number.isNaN(prizes.last2) ? '' : prizes.last2}
                            onChange={(e) => setBilleteMultipliers({
                              ...billeteMultipliers, 
                              [pKey]: { ...prizes, last2: parseFloat(e.target.value) }
                            })}
                            className="w-full bg-transparent border-none p-0 text-xs focus:outline-none focus:ring-0"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
                <p className="text-[9px] text-muted-foreground italic">Multiplicadores por cada $1.00 invertido en Billete.</p>
              </div>
            )}
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
              className="py-3 px-6 rounded-xl bg-primary text-primary-foreground font-bold text-xs uppercase hover:brightness-110 transition-all shadow-lg shadow-primary/20"
            >
              Guardar Ajustes
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default GlobalSettingsModal;
