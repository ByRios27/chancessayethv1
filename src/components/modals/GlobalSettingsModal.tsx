import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, Plus, ShieldCheck, SlidersHorizontal, Ticket, Trash2, X } from 'lucide-react';
import { normalizeSpecial4DSettings } from '../../config/special4d';
import type { ChancePriceConfig, GlobalSettings, Special4DSettings } from '../../types/lotteries';

type SettingsTab = 'chances' | 'palesBilletes' | 'operacion' | 'mantenimiento';
type Special4DPrizeKey = keyof Special4DSettings['payouts'];
type Special4DPayoutField = keyof Special4DSettings['payouts']['p1'];
type Special4DPayoutForm = Record<Special4DPrizeKey, Record<Special4DPayoutField, string>>;

const CONFIRM_DELETE_PHRASE = 'REINICIAR DIA';
const CONFIRM_HARD_RESET_PHRASE = 'RESET FIRESTORE';

const numberToInput = (value: number) => (Number.isFinite(value) ? String(value) : '');

const toNumber = (value: string, fallback = 0) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const buildSpecial4DPayoutForm = (settings: Special4DSettings): Special4DPayoutForm => ({
  p1: {
    first2: numberToInput(settings.payouts.p1.first2),
    last2: numberToInput(settings.payouts.p1.last2),
  },
  p2: {
    first2: numberToInput(settings.payouts.p2.first2),
    last2: numberToInput(settings.payouts.p2.last2),
  },
  p3: {
    first2: numberToInput(settings.payouts.p3.first2),
    last2: numberToInput(settings.payouts.p3.last2),
  },
});

const GlobalSettingsModal = ({
  show,
  settings,
  onSave,
  onClose,
  allowDangerZone = false,
  onDeleteAllSalesData,
  onHardResetFirestoreData,
}: {
  show: boolean;
  settings: GlobalSettings;
  onSave: (data: GlobalSettings) => void;
  onClose: () => void;
  allowDangerZone?: boolean;
  onDeleteAllSalesData?: () => void;
  onHardResetFirestoreData?: (password: string) => Promise<void>;
}) => {
  const defaultBilletePrizes = useMemo(() => ({
    full4: 2000,
    first3: 200,
    last3: 200,
    first2: 20,
    last2: 20,
  }), []);
  const normalizedSpecial4d = useMemo(() => normalizeSpecial4DSettings(settings.special4d), [settings.special4d]);

  const [activeTab, setActiveTab] = useState<SettingsTab>('chances');
  const [deletePhrase, setDeletePhrase] = useState('');
  const [hardResetPhrase, setHardResetPhrase] = useState('');
  const [hardResetPassword, setHardResetPassword] = useState('');
  const [isHardResetting, setIsHardResetting] = useState(false);
  const [chancePrices, setChancePrices] = useState<ChancePriceConfig[]>(settings.chancePrices || []);
  const [palesEnabled, setPalesEnabled] = useState(settings.palesEnabled);
  const [billetesEnabled, setBilletesEnabled] = useState(settings.billetesEnabled);
  const [pl12, setPl12] = useState(settings.pl12Multiplier.toString());
  const [pl13, setPl13] = useState(settings.pl13Multiplier.toString());
  const [pl23, setPl23] = useState(settings.pl23Multiplier.toString());
  const [billeteMultipliers, setBilleteMultipliers] = useState(settings.billeteMultipliers || {
    p1: { ...defaultBilletePrizes },
    p2: { ...defaultBilletePrizes },
    p3: { ...defaultBilletePrizes },
  });
  const [special4dEnabled, setSpecial4dEnabled] = useState(normalizedSpecial4d.enabled);
  const [special4dName, setSpecial4dName] = useState(normalizedSpecial4d.name);
  const [special4dDrawTime, setSpecial4dDrawTime] = useState(normalizedSpecial4d.drawTime);
  const [special4dClosingTime, setSpecial4dClosingTime] = useState(normalizedSpecial4d.closingTime);
  const [special4dUnitPrice, setSpecial4dUnitPrice] = useState(numberToInput(normalizedSpecial4d.unitPrice));
  const [special4dCommissionRate, setSpecial4dCommissionRate] = useState(numberToInput(normalizedSpecial4d.commissionRate));
  const [special4dPayouts, setSpecial4dPayouts] = useState<Special4DPayoutForm>(buildSpecial4DPayoutForm(normalizedSpecial4d));

  useEffect(() => {
    const nextSpecial4d = normalizeSpecial4DSettings(settings.special4d);
    setChancePrices(settings.chancePrices || []);
    setPalesEnabled(settings.palesEnabled);
    setBilletesEnabled(settings.billetesEnabled);
    setPl12(settings.pl12Multiplier.toString());
    setPl13(settings.pl13Multiplier.toString());
    setPl23(settings.pl23Multiplier.toString());
    setBilleteMultipliers(settings.billeteMultipliers || {
      p1: { ...defaultBilletePrizes },
      p2: { ...defaultBilletePrizes },
      p3: { ...defaultBilletePrizes },
    });
    setSpecial4dEnabled(nextSpecial4d.enabled);
    setSpecial4dName(nextSpecial4d.name);
    setSpecial4dDrawTime(nextSpecial4d.drawTime);
    setSpecial4dClosingTime(nextSpecial4d.closingTime);
    setSpecial4dUnitPrice(numberToInput(nextSpecial4d.unitPrice));
    setSpecial4dCommissionRate(numberToInput(nextSpecial4d.commissionRate));
    setSpecial4dPayouts(buildSpecial4DPayoutForm(nextSpecial4d));
    setActiveTab('chances');
    setDeletePhrase('');
    setHardResetPhrase('');
    setHardResetPassword('');
    setIsHardResetting(false);
  }, [defaultBilletePrizes, settings, show]);

  if (!show) return null;

  const tabs: Array<{ id: SettingsTab; label: string; icon: React.ElementType }> = [
    { id: 'chances', label: 'Chances', icon: Ticket },
    { id: 'palesBilletes', label: 'Pales y billetes', icon: SlidersHorizontal },
    { id: 'operacion', label: 'Operacion', icon: ShieldCheck },
    { id: 'mantenimiento', label: 'Mantenimiento', icon: ShieldCheck },
  ];

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

  const handleSpecial4dPayoutChange = (prizeKey: Special4DPrizeKey, field: Special4DPayoutField, value: string) => {
    setSpecial4dPayouts((prev) => ({
      ...prev,
      [prizeKey]: {
        ...prev[prizeKey],
        [field]: value,
      },
    }));
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
      billeteMultipliers,
      special4d: normalizeSpecial4DSettings({
        enabled: special4dEnabled,
        name: special4dName,
        drawTime: special4dDrawTime,
        closingTime: special4dClosingTime,
        unitPrice: toNumber(special4dUnitPrice, normalizedSpecial4d.unitPrice),
        commissionRate: toNumber(special4dCommissionRate, normalizedSpecial4d.commissionRate),
        payouts: {
          p1: {
            first2: toNumber(special4dPayouts.p1.first2),
            last2: toNumber(special4dPayouts.p1.last2),
          },
          p2: {
            first2: toNumber(special4dPayouts.p2.first2),
            last2: toNumber(special4dPayouts.p2.last2),
          },
          p3: {
            first2: toNumber(special4dPayouts.p3.first2),
            last2: toNumber(special4dPayouts.p3.last2),
          },
        },
      }),
    });
  };

  const handleDangerDelete = () => {
    if (deletePhrase !== CONFIRM_DELETE_PHRASE || !allowDangerZone || !onDeleteAllSalesData) return;
    onDeleteAllSalesData();
    setDeletePhrase('');
  };

  const hardResetEnabled = Boolean(
    allowDangerZone &&
    onHardResetFirestoreData &&
    hardResetPhrase === CONFIRM_HARD_RESET_PHRASE &&
    hardResetPassword.trim() &&
    !isHardResetting
  );

  const handleHardReset = async () => {
    if (!hardResetEnabled || !onHardResetFirestoreData) return;
    setIsHardResetting(true);
    try {
      await onHardResetFirestoreData(hardResetPassword);
      setHardResetPhrase('');
      setHardResetPassword('');
    } finally {
      setIsHardResetting(false);
    }
  };

  const sectionTitle = activeTab === 'chances'
    ? 'Chances'
    : activeTab === 'palesBilletes'
      ? 'Pales y billetes'
      : activeTab === 'operacion'
        ? 'Operacion'
        : 'Mantenimiento';

  const sectionDescription = activeTab === 'chances'
    ? 'Costos, premios y limites de chances.'
    : activeTab === 'palesBilletes'
      ? 'Premios, multiplicadores y reglas especificas.'
      : activeTab === 'operacion'
        ? 'Parametros generales de funcionamiento.'
        : 'Herramientas sensibles y zona peligrosa.';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass-card w-full max-w-4xl max-h-[94vh] overflow-hidden flex flex-col"
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 p-3 sm:p-4">
          <div>
            <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white">Ajustes globales</h3>
            <p className="mt-0.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Parametros operativos, premios y mantenimiento seguro
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-white/5 active:scale-95 transition-all"
            aria-label="Cerrar ajustes globales"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[170px_1fr] min-h-0 flex-1">
          <div className="border-b md:border-b-0 md:border-r border-white/10 p-2.5 bg-black/15">
            <div className="grid grid-cols-2 md:grid-cols-1 gap-1.5">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`h-8 rounded-lg px-2 text-[8px] sm:text-[9px] font-black uppercase tracking-widest flex items-center justify-center md:justify-start gap-1.5 border transition-all active:scale-[0.98] ${
                      isActive
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-white/[0.035] border-white/10 text-muted-foreground hover:text-white hover:bg-white/[0.07]'
                    }`}
                    aria-label={`Ver ajustes de ${tab.label}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="truncate">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="min-h-0 overflow-y-auto custom-scrollbar p-3 sm:p-4 space-y-4">
            <div>
              <h4 className="text-xs sm:text-sm font-black uppercase tracking-widest text-white">{sectionTitle}</h4>
              <p className="text-[11px] text-muted-foreground">
                {sectionDescription}
              </p>
            </div>

            {activeTab === 'chances' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-white/10 pb-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-primary">Costos, premios y limites</p>
                    <p className="text-[11px] text-muted-foreground">Valores de chance por monto configurado.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddPrice}
                    className="h-8 px-3 rounded-lg bg-primary/15 text-primary border border-primary/25 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-primary/25 active:scale-[0.98] transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" /> Anadir precio
                  </button>
                </div>

                {chancePrices.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-white/15 bg-white/[0.03] p-4 text-xs text-muted-foreground">
                    No hay precios configurados. Anada uno para vender Chance.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {chancePrices.map((config, idx) => (
                      <div key={idx} className="rounded-xl border border-white/10 bg-white/[0.04] p-3 sm:p-4 relative">
                        <button
                          type="button"
                          onClick={() => handleRemovePrice(idx)}
                          className="absolute right-2 top-2 rounded-full bg-red-500/80 text-white p-1 shadow-lg hover:bg-red-500 active:scale-95 transition-all"
                          aria-label="Eliminar precio"
                          title="Eliminar precio"
                        >
                          <X className="w-3 h-3" />
                        </button>

                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 pr-7">
                          {([
                            ['price', 'Precio USD'],
                            ['ch1', '1er premio x'],
                            ['ch2', '2do premio x'],
                            ['ch3', '3er premio x'],
                          ] as Array<[keyof ChancePriceConfig, string]>).map(([field, label]) => (
                            <div key={field}>
                              <label className="text-[9px] font-mono uppercase text-muted-foreground block mb-1">{label}</label>
                              <input
                                type="number"
                                step={field === 'price' ? '0.01' : '1'}
                                value={Number.isNaN(config[field]) ? '' : config[field]}
                                onChange={(event) => handlePriceChange(idx, field, parseFloat(event.target.value))}
                                className="h-10 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'palesBilletes' && (
              <div className="space-y-5">
                <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-primary">Pales (PL)</p>
                      <p className="text-[11px] text-muted-foreground">Premios, multiplicadores y reglas por combinacion.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPalesEnabled(!palesEnabled)}
                      className={`shrink-0 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider border transition-all active:scale-95 ${
                        palesEnabled ? 'bg-green-500/15 border-green-400/30 text-green-300' : 'bg-amber-500/15 border-amber-400/30 text-amber-300'
                      }`}
                      aria-label={palesEnabled ? 'Desactivar pales' : 'Activar pales'}
                    >
                      {palesEnabled ? 'Activado' : 'Desactivado'}
                    </button>
                  </div>

                  {palesEnabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { label: '1ro con 2do', value: pl12, setValue: setPl12 },
                        { label: '1ro con 3ro', value: pl13, setValue: setPl13 },
                        { label: '2do con 3ro', value: pl23, setValue: setPl23 },
                      ].map((item) => (
                        <div key={item.label}>
                          <label className="text-[10px] font-mono uppercase text-muted-foreground block mb-1">{item.label}</label>
                          <input
                            type="number"
                            value={item.value === 'NaN' ? '' : item.value}
                            onChange={(event) => item.setValue(event.target.value)}
                            className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-primary">Billetes (BL)</p>
                      <p className="text-[11px] text-muted-foreground">Premios por cifras, posiciones y reglas especificas.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBilletesEnabled(!billetesEnabled)}
                      className={`shrink-0 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider border transition-all active:scale-95 ${
                        billetesEnabled ? 'bg-green-500/15 border-green-400/30 text-green-300' : 'bg-amber-500/15 border-amber-400/30 text-amber-300'
                      }`}
                      aria-label={billetesEnabled ? 'Desactivar billetes' : 'Activar billetes'}
                    >
                      {billetesEnabled ? 'Activado' : 'Desactivado'}
                    </button>
                  </div>

                  {billetesEnabled && (
                    <div className="space-y-4">
                      {[1, 2, 3].map((prizeNum) => {
                        const pKey = `p${prizeNum}` as keyof typeof billeteMultipliers;
                        const prizes = billeteMultipliers[pKey];
                        return (
                          <div key={prizeNum} className="rounded-xl border border-white/10 bg-black/15 p-3 space-y-3">
                            <h5 className="text-[10px] font-black uppercase tracking-widest text-white">{prizeNum}er premio</h5>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                              {([
                                ['full4', '4 cifras'],
                                ['first3', 'Primeras 3'],
                                ['last3', 'Ultimas 3'],
                                ['first2', 'Primeras 2'],
                                ['last2', 'Ultimas 2'],
                              ] as Array<[keyof typeof prizes, string]>).map(([field, label]) => (
                                <div key={field} className="rounded-lg bg-white/[0.04] p-2">
                                  <label className="text-[8px] font-mono uppercase text-muted-foreground block mb-1">{label}</label>
                                  <input
                                    type="number"
                                    value={Number.isNaN(prizes[field]) ? '' : prizes[field]}
                                    onChange={(event) => setBilleteMultipliers({
                                      ...billeteMultipliers,
                                      [pKey]: { ...prizes, [field]: parseFloat(event.target.value) },
                                    })}
                                    className="w-full bg-transparent border-none p-0 text-xs focus:outline-none focus:ring-0"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'operacion' && (
              <div className="space-y-4">
                <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <ShieldCheck className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-widest text-white">Especial Chances 4D</p>
                        <p className="text-[11px] text-muted-foreground">
                          Configuracion independiente para la modalidad especial.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSpecial4dEnabled(!special4dEnabled)}
                      className={`shrink-0 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider border transition-all active:scale-95 ${
                        special4dEnabled ? 'bg-green-500/15 border-green-400/30 text-green-300' : 'bg-amber-500/15 border-amber-400/30 text-amber-300'
                      }`}
                      aria-label={special4dEnabled ? 'Desactivar Especial Chances 4D' : 'Activar Especial Chances 4D'}
                    >
                      {special4dEnabled ? 'Activo' : 'Inactivo'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-mono uppercase text-muted-foreground block mb-1">Nombre visible</label>
                      <input
                        value={special4dName}
                        onChange={(event) => setSpecial4dName(event.target.value)}
                        className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono uppercase text-muted-foreground block mb-1">Hora de sorteo</label>
                      <input
                        type="time"
                        value={special4dDrawTime}
                        onChange={(event) => setSpecial4dDrawTime(event.target.value)}
                        className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono uppercase text-muted-foreground block mb-1">Hora de cierre</label>
                      <input
                        type="time"
                        value={special4dClosingTime}
                        onChange={(event) => setSpecial4dClosingTime(event.target.value)}
                        className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono uppercase text-muted-foreground block mb-1">Precio unitario USD</label>
                      <input
                        type="number"
                        step="0.01"
                        value={special4dUnitPrice}
                        onChange={(event) => setSpecial4dUnitPrice(event.target.value)}
                        className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono uppercase text-muted-foreground block mb-1">Comision especial %</label>
                      <input
                        type="number"
                        step="0.01"
                        value={special4dCommissionRate}
                        onChange={(event) => setSpecial4dCommissionRate(event.target.value)}
                        className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4 space-y-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-primary">Tabla de pago especial</p>
                    <p className="text-[11px] text-muted-foreground">Pagos separados para primeras 2 y ultimas 2 cifras.</p>
                  </div>

                  <div className="space-y-3">
                    {([
                      ['p1', '1er premio'],
                      ['p2', '2do premio'],
                      ['p3', '3er premio'],
                    ] as Array<[Special4DPrizeKey, string]>).map(([prizeKey, label]) => (
                      <div key={prizeKey} className="rounded-xl border border-white/10 bg-black/15 p-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white mb-3">{label}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[9px] font-mono uppercase text-muted-foreground block mb-1">Primeros 2 digitos</label>
                            <input
                              type="number"
                              step="0.01"
                              value={special4dPayouts[prizeKey].first2}
                              onChange={(event) => handleSpecial4dPayoutChange(prizeKey, 'first2', event.target.value)}
                              className="h-10 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-mono uppercase text-muted-foreground block mb-1">Ultimos 2 digitos</label>
                            <input
                              type="number"
                              step="0.01"
                              value={special4dPayouts[prizeKey].last2}
                              onChange={(event) => handleSpecial4dPayoutChange(prizeKey, 'last2', event.target.value)}
                              className="h-10 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'mantenimiento' && (
              <div className="space-y-4">
                <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-white">Mantenimiento avanzado</p>
                      <p className="text-[11px] text-muted-foreground">
                        Herramientas sensibles y zona peligrosa quedan separadas de la operacion diaria.
                      </p>
                    </div>
                  </div>
                </div>

                {allowDangerZone && (
                  <div className="rounded-xl border border-red-400/25 bg-red-500/8 p-4 sm:p-5 space-y-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-300 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-red-200">Acciones irreversibles</p>
                        <p className="text-sm font-black uppercase tracking-widest text-red-300">Reiniciar dia operativo</p>
                        <p className="mt-1 text-xs text-red-100/80">
                          Esta accion borra tickets, resultados, inyecciones, liquidaciones y alertas del dia actual sin crear archivo. El historial anterior se conserva.
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-red-400/20 bg-black/25 p-3 space-y-2">
                      <label className="text-[10px] font-mono uppercase tracking-widest text-red-200">
                        Escribe {CONFIRM_DELETE_PHRASE} para habilitar
                      </label>
                      <input
                        value={deletePhrase}
                        onChange={(event) => setDeletePhrase(event.target.value.toUpperCase())}
                        className="h-11 w-full rounded-xl border border-red-400/25 bg-black/30 px-3 font-mono text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-400/50"
                        placeholder={CONFIRM_DELETE_PHRASE}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleDangerDelete}
                      disabled={deletePhrase !== CONFIRM_DELETE_PHRASE}
                      className="h-10 w-full rounded-xl border border-red-400/30 bg-red-500/15 text-red-200 font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-red-500/25 active:scale-[0.98] transition-all"
                    >
                      <Trash2 className="w-4 h-4" /> Reiniciar dia
                    </button>
                  </div>
                )}

                {allowDangerZone && (
                  <div className="rounded-xl border border-red-500/35 bg-red-950/25 p-4 sm:p-5 space-y-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-200 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-red-200">Hard reset Firestore</p>
                        <p className="text-sm font-black uppercase tracking-widest text-red-300">Borrar base operativa completa</p>
                        <p className="mt-1 text-xs text-red-100/80">
                          Elimina tickets, resultados, inyecciones, liquidaciones, archivos diarios, logs y alertas. Conserva usuarios, sorteos y ajustes de premios.
                        </p>
                        <p className="mt-1 text-xs text-red-100/80">
                          Los usuarios se mantienen, pero sus saldos operativos se reinician en cero.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="rounded-xl border border-red-400/20 bg-black/25 p-3 space-y-2">
                        <label className="text-[10px] font-mono uppercase tracking-widest text-red-200">
                          Escribe {CONFIRM_HARD_RESET_PHRASE}
                        </label>
                        <input
                          value={hardResetPhrase}
                          onChange={(event) => setHardResetPhrase(event.target.value.toUpperCase())}
                          className="h-11 w-full rounded-xl border border-red-400/25 bg-black/30 px-3 font-mono text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-400/50"
                          placeholder={CONFIRM_HARD_RESET_PHRASE}
                          disabled={isHardResetting}
                        />
                      </div>

                      <div className="rounded-xl border border-red-400/20 bg-black/25 p-3 space-y-2">
                        <label className="text-[10px] font-mono uppercase tracking-widest text-red-200">
                          Contrasena CEO Owner
                        </label>
                        <input
                          type="password"
                          value={hardResetPassword}
                          onChange={(event) => setHardResetPassword(event.target.value)}
                          className="h-11 w-full rounded-xl border border-red-400/25 bg-black/30 px-3 font-mono text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-400/50"
                          placeholder="Contrasena"
                          autoComplete="current-password"
                          disabled={isHardResetting}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleHardReset()}
                      disabled={!hardResetEnabled}
                      className="h-10 w-full rounded-xl border border-red-300/40 bg-red-600/25 text-red-100 font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-red-600/35 active:scale-[0.98] transition-all"
                    >
                      <Trash2 className="w-4 h-4" /> {isHardResetting ? 'Ejecutando reset...' : 'Hard reset Firestore'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border-t border-white/10 p-3 bg-black/15">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl border border-white/10 font-black text-[10px] uppercase tracking-widest hover:bg-white/5 active:scale-[0.98] transition-all"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="h-10 rounded-xl bg-primary text-primary-foreground font-black text-[10px] uppercase tracking-widest hover:brightness-110 active:scale-[0.98] transition-all"
          >
            Guardar ajustes
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default GlobalSettingsModal;
