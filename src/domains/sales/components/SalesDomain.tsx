import React from 'react';
import { motion } from 'motion/react';
import { Calendar, ChevronDown, LayoutDashboard, Minus, Plus, Trash2, Zap } from 'lucide-react';
import type { Bet } from '../../../types/bets';

interface LotteryOption {
  id: string;
  name: string;
  drawTime?: string;
  isFourDigits?: boolean;
}

interface SalesDomainProps {
  isMultipleMode: boolean;
  setIsMultipleMode: (value: boolean) => void;
  showMultiSelect: boolean;
  setShowMultiSelect: (value: boolean) => void;
  multiLottery?: string[];
  setMultiLottery: (value: string[]) => void;
  activeLotteries?: LotteryOption[];
  selectedLottery: string;
  setSelectedLottery: (value: string) => void;
  cleanText: (value: string) => string;
  formatTime12h: (value: string) => string;
  globalSettings: { palesEnabled: boolean; billetesEnabled: boolean };
  betType: 'CH' | 'PL' | 'BL';
  setBetType: (value: 'CH' | 'PL' | 'BL') => void;
  setNumber: (value: string) => void;
  setQuantity: (value: string) => void;
  setPlAmount: (value: string) => void;
  setFocusedField: (value: 'number' | 'amount') => void;
  findActiveLotteryByName: (name: string) => LotteryOption | undefined;
  focusedField: 'number' | 'amount';
  numberInputRef: React.RefObject<HTMLInputElement | null>;
  amountInputRef: React.RefObject<HTMLInputElement | null>;
  number: string;
  quantity: string;
  plAmount: string;
  isAmountSelected: boolean;
  setIsAmountSelected: (value: boolean) => void;
  handleKeyPress: (key: string) => void;
  handleBackspace: () => void;
  handleClear: () => void;
  addToCart: () => void;
  canSell: boolean;
  sellBlockedReason?: string | null;
  cart?: Bet[];
  clearCart: () => void;
  updateCartItemQuantity: (index: number, newQty: number) => void;
  removeFromCart: (index: number) => void;
  chancePrice: number;
  editingTicketId: string | null;
  cancelEdit: () => void;
  cartTotal: number;
  handleSell: (e: React.FormEvent) => void;
  setShowFastEntryModal: (value: boolean) => void;
  userProfile?: { role?: string };
  todayStr: string;
  todayStats: { sales: number; injections: number; prizes: number; bankProfit: number; pendingDebt: number; netProfit: number };
}

const Cursor = () => <span className="w-[2px] h-6 bg-primary animate-blink inline-block align-middle ml-0.5" />;

function NumericKeyboard({
  onKeyPress,
  onBackspace,
  onClear,
}: {
  onKeyPress: (key: string) => void;
  onBackspace: () => void;
  onClear: () => void;
}) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];
  return (
    <div className="grid grid-cols-3 gap-2">
      {keys.map((key) => (
        <button
          key={key}
          onClick={() => (key === '⌫' ? onBackspace() : onKeyPress(key))}
          className="py-3 rounded-xl bg-white/5 border border-border text-sm font-black active:scale-95 transition-transform"
        >
          {key}
        </button>
      ))}
      <button
        onClick={onClear}
        className="col-span-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-black uppercase tracking-widest"
      >
        Limpiar
      </button>
    </div>
  );
}

export function SalesDomain(props: SalesDomainProps) {
  const {
    isMultipleMode,
    setIsMultipleMode,
    showMultiSelect,
    setShowMultiSelect,
    multiLottery,
    setMultiLottery,
    activeLotteries,
    selectedLottery,
    setSelectedLottery,
    cleanText,
    formatTime12h,
    globalSettings,
    betType,
    setBetType,
    setNumber,
    setQuantity,
    setPlAmount,
    setFocusedField,
    findActiveLotteryByName,
    focusedField,
    numberInputRef,
    amountInputRef,
    number,
    quantity,
    plAmount,
    isAmountSelected,
    setIsAmountSelected,
    handleKeyPress,
    handleBackspace,
    handleClear,
    addToCart,
    canSell,
    sellBlockedReason,
    cart,
    clearCart,
    updateCartItemQuantity,
    removeFromCart,
    chancePrice,
    editingTicketId,
    cancelEdit,
    cartTotal,
    handleSell,
    setShowFastEntryModal,
    userProfile,
    todayStr,
    todayStats,
  } = props;

  const safeActiveLotteries = activeLotteries ?? [];
  const safeMultiLottery = multiLottery ?? [];
  const safeCart = cart ?? [];

  const hasActiveLotteries = safeActiveLotteries.length > 0;
  const canOperateSales = canSell && hasActiveLotteries;

  if (import.meta.env.DEV) {
    const requiredCallbacks = {
      handleSell,
      addToCart,
      clearCart,
      cancelEdit,
      setShowFastEntryModal,
      updateCartItemQuantity,
      removeFromCart,
    };

    Object.entries(requiredCallbacks).forEach(([name, fn]) => {
      if (typeof fn !== 'function') {
        console.error(`[SalesDomain] Missing callback prop: ${name}`, fn);
      }
    });
  }

  return (
    <motion.div
      key="sales"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-md mx-auto space-y-4 pb-24"
    >
      {!canSell && (
        <div className="glass-card p-4 border border-red-500/20 bg-red-500/5">
          <p className="text-xs font-black uppercase tracking-widest text-red-400">Ventas bloqueadas</p>
          <p className="text-xs text-muted-foreground mt-1">{sellBlockedReason}</p>
        </div>
      )}

      {!hasActiveLotteries && (
        <div className="glass-card p-4 border border-amber-500/20 bg-amber-500/5">
          <p className="text-xs font-black uppercase tracking-widest text-amber-300">Sin sorteos activos</p>
          <p className="text-xs text-muted-foreground mt-1">No hay sorteos disponibles para vender en este momento.</p>
        </div>
      )}

      <div className="glass-card p-3 flex items-center justify-between relative z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-[11px] font-mono uppercase text-muted-foreground leading-none mb-1">Sorteo Activo</p>
            {isMultipleMode ? (
              <div className="relative">
                <button
                  onClick={() => setShowMultiSelect(!showMultiSelect)}
                  className="text-sm font-bold truncate flex items-center gap-1 w-full text-left"
                >
                  {safeMultiLottery.length === 0 ? 'Seleccione Sorteos' : `${safeMultiLottery.length} Sorteos`}
                  <ChevronDown className={`w-3 h-3 transition-transform ${showMultiSelect ? 'rotate-180' : ''}`} />
                </button>
                {showMultiSelect && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowMultiSelect(false)} />
                    <div className="fixed inset-x-3 bottom-24 bg-background border border-border rounded-xl shadow-2xl z-50 p-2 space-y-1 max-h-[60vh] overflow-y-auto sm:absolute sm:top-full sm:left-0 sm:bottom-auto sm:inset-x-auto sm:mt-2 sm:w-full sm:min-w-[240px] sm:max-h-80">
                      {safeActiveLotteries.length > 0 ? (
                        <>
                          <div className="flex items-center justify-between p-2 border-b border-white/10 mb-1">
                            <button
                              onClick={() => setMultiLottery(safeActiveLotteries.map((lottery) => lottery.name))}
                              className="text-[10px] font-bold uppercase text-primary hover:text-primary/80"
                            >
                              Todos
                            </button>
                            <button
                              onClick={() => setMultiLottery([])}
                              className="text-[10px] font-bold uppercase text-red-500 hover:text-red-400"
                            >
                              Ninguno
                            </button>
                          </div>
                          {safeActiveLotteries.map((lottery) => (
                            <label key={lottery.id} className="flex items-center gap-2 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
                              <input
                                type="checkbox"
                                checked={safeMultiLottery.includes(lottery.name)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setMultiLottery([...safeMultiLottery, lottery.name]);
                                  } else {
                                    setMultiLottery(safeMultiLottery.filter((name) => name !== lottery.name));
                                  }
                                }}
                                className="rounded border-border text-primary focus:ring-primary bg-transparent"
                              />
                              <span className="text-xs font-medium">{cleanText(lottery.name)}</span>
                            </label>
                          ))}
                        </>
                      ) : (
                        <div className="p-4 text-center text-xs text-muted-foreground">No hay sorteos disponibles</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <select
                value={selectedLottery}
                onChange={(e) => setSelectedLottery(e.target.value)}
                className="bg-transparent border-none p-0 font-bold text-sm focus:outline-none w-full truncate"
                disabled={!hasActiveLotteries}
              >
                <option key="default" value="" className="bg-background">
                  {hasActiveLotteries ? 'Seleccione Sorteo' : 'Sin sorteos activos'}
                </option>
                {safeActiveLotteries.map((lottery) => (
                  <option key={lottery.id} value={lottery.name} className="bg-background">
                    {cleanText(lottery.name)} {lottery.drawTime ? `(${formatTime12h(lottery.drawTime)})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
        <button
          onClick={() => {
            const next = !isMultipleMode;
            setIsMultipleMode(next);
            if (next) setShowMultiSelect(true);
          }}
          className={`px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase transition-all border ${
            isMultipleMode ? 'bg-primary border-primary text-primary-foreground' : 'bg-white/5 border-border text-muted-foreground'
          }`}
          disabled={!hasActiveLotteries}
        >
          Multi
        </button>
      </div>

      <div className="bg-white/5 border border-border rounded-2xl p-1 flex gap-1">
        <button
          onClick={() => {
            setBetType('CH');
            setNumber('');
            setQuantity('1');
            setFocusedField('number');
          }}
          className={`flex-1 py-3 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all ${
            betType === 'CH' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Chance
        </button>
        {globalSettings.palesEnabled && (
          <button
            onClick={() => {
              setBetType('PL');
              setNumber('');
              setQuantity('1');
              setPlAmount('1.00');
              setFocusedField('number');
            }}
            className={`flex-1 py-3 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all ${
              betType === 'PL' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Pale
          </button>
        )}
        {globalSettings.billetesEnabled && (isMultipleMode ? safeMultiLottery.some((name) => findActiveLotteryByName(name)?.isFourDigits) : findActiveLotteryByName(selectedLottery)?.isFourDigits) && (
          <button
            onClick={() => {
              setBetType('BL');
              setNumber('');
              setQuantity('1');
              setFocusedField('number');
            }}
            className={`flex-1 py-3 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all ${
              betType === 'BL' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Billete
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div
          onClick={() => {
            setFocusedField('number');
            numberInputRef.current?.focus();
          }}
          className={`glass-card p-2.5 flex flex-col items-center justify-center gap-0.5 transition-all border-2 cursor-pointer ${
            focusedField === 'number' ? 'border-primary bg-primary/5' : 'border-transparent'
          }`}
        >
          <span className="text-[11px] font-mono uppercase text-muted-foreground font-medium">Numero</span>
          <div className="flex items-center justify-center min-h-[32px] relative w-full">
            <input
              ref={numberInputRef}
              type="text"
              inputMode="none"
              value={number === 'NaN' ? '' : number}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                const maxLen = betType === 'CH' ? 2 : 4;
                if (val.length <= maxLen) {
                  setNumber(val);
                  if (val.length === maxLen) {
                    setFocusedField('amount');
                    setIsAmountSelected(true);
                    setTimeout(() => {
                      amountInputRef.current?.focus();
                      amountInputRef.current?.select();
                    }, 0);
                  }
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && number.length === (betType === 'CH' ? 2 : 4)) {
                  setFocusedField('amount');
                  setIsAmountSelected(true);
                  setTimeout(() => {
                    amountInputRef.current?.focus();
                    amountInputRef.current?.select();
                  }, 0);
                }
              }}
              onFocus={() => setFocusedField('number')}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <span className="text-2xl font-bold tracking-widest">{number || (betType === 'CH' ? '--' : '----')}</span>
            {focusedField === 'number' && <Cursor />}
          </div>
        </div>
        <div
          onClick={() => {
            setFocusedField('amount');
            setIsAmountSelected(true);
            setTimeout(() => {
              amountInputRef.current?.focus();
              amountInputRef.current?.select();
            }, 0);
          }}
          className={`glass-card p-2.5 flex flex-col items-center justify-center gap-0.5 transition-all border-2 cursor-pointer ${
            focusedField === 'amount' ? 'border-primary bg-primary/5' : 'border-transparent'
          }`}
        >
          <span className="text-[11px] font-mono uppercase text-muted-foreground font-medium">
            {betType === 'PL' ? 'Inversion' : 'Cantidad'}
          </span>
          <div className="flex items-center justify-center min-h-[32px] relative w-full">
            <input
              ref={amountInputRef}
              type="text"
              inputMode="none"
              value={(betType === 'CH' || betType === 'BL') ? (quantity === 'NaN' ? '' : quantity) : (plAmount === 'NaN' ? '' : plAmount)}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9.]/g, '');
                setIsAmountSelected(false);
                if (betType === 'CH' || betType === 'BL') {
                  setQuantity(val);
                } else {
                  setPlAmount(val);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addToCart();
              }}
              onFocus={() => {
                setFocusedField('amount');
                setIsAmountSelected(true);
              }}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <span className={`text-2xl font-bold ${isAmountSelected && focusedField === 'amount' ? 'bg-primary/30 text-primary px-1 rounded' : ''}`}>
              {(betType === 'CH' || betType === 'BL') ? quantity : plAmount}
            </span>
            {focusedField === 'amount' && <Cursor />}
          </div>
          <span className="text-[10px] font-mono text-muted-foreground">
            {betType === 'PL'
              ? 'USD'
              : `$${((parseFloat(quantity) || 0) * (betType === 'BL' ? 1 : chancePrice)).toFixed(2)}`}
          </span>
        </div>
      </div>

      <div className="py-2">
        <NumericKeyboard onKeyPress={handleKeyPress} onBackspace={handleBackspace} onClear={handleClear} />
      </div>

      <button
        onClick={addToCart}
        disabled={!canOperateSales}
        className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-widest text-base shadow-xl shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <Plus className="w-5 h-5" />
        Agregar al Ticket
      </button>

      {safeCart.length > 0 && (
        <div className="glass-card p-3 space-y-2">
          <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Carrito ({safeCart.length})</h3>
            <button onClick={clearCart} className="text-[11px] font-bold uppercase text-red-500">Vaciar</button>
          </div>
          <div className="max-h-32 overflow-y-auto space-y-2 custom-scrollbar pr-1">
            {Object.entries(
              safeCart.reduce((acc: Record<string, (Bet & { originalIdx: number })[]>, bet: Bet, idx: number) => {
                if (!acc[bet.lottery]) acc[bet.lottery] = [];
                acc[bet.lottery].push({ ...bet, originalIdx: idx });
                return acc;
              }, {})
            ).map(([lotteryName, bets]) => {
              const betList = bets as (Bet & { originalIdx: number })[];
              return (
              <div key={lotteryName} className="space-y-1.5 bg-black/20 p-2 rounded-xl border border-white/5">
                <div className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                  {cleanText(lotteryName)}
                  <span className="text-muted-foreground ml-auto bg-white/5 px-1.5 py-0.5 rounded">({betList.length})</span>
                </div>
                <div className="space-y-1">
                  {betList.map((bet) => (
                    <div key={`${bet.lottery}-${bet.number}-${bet.type}-${bet.originalIdx}`} className="flex items-center justify-between text-xs bg-white/5 p-1.5 rounded-lg border border-white/5">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="font-mono font-bold text-primary shrink-0">{bet.type}</span>
                        <span className="font-bold tracking-widest shrink-0">{bet.number}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1 bg-white/10 rounded-lg px-1.5 py-0.5 border border-white/10">
                          <button
                            onClick={() => updateCartItemQuantity(bet.originalIdx, bet.quantity - 1)}
                            className="p-1.5 text-muted-foreground hover:text-primary transition-colors active:scale-90"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <div className="flex flex-col items-center min-w-[50px] px-1">
                            <span className="text-[8px] font-mono opacity-50 leading-none mb-0.5">{`QTY:${bet.quantity}`}</span>
                            <span className="font-black text-[11px] leading-none">
                              ${(bet.type === 'PL' ? bet.amount : (bet.quantity * (bet.type === 'BL' ? 1 : chancePrice))).toFixed(2)}
                            </span>
                          </div>
                          <button
                            onClick={() => updateCartItemQuantity(bet.originalIdx, bet.quantity + 1)}
                            className="p-1.5 text-muted-foreground hover:text-primary transition-colors active:scale-90"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <button onClick={() => removeFromCart(bet.originalIdx)} className="text-red-500/70 hover:text-red-500 p-1.5 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              );
            })}
          </div>
          <div className="flex flex-col gap-3 pt-3 border-t border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Total</span>
                {editingTicketId && <span className="text-[9px] font-black text-primary uppercase animate-pulse">Editando Ticket</span>}
              </div>
              <span className="text-xl font-black text-primary">${cartTotal.toFixed(2)}</span>
            </div>
            <div className="flex gap-2">
              {editingTicketId && (
                <button
                  onClick={() => {
                    if (typeof cancelEdit !== 'function') {
                      console.error('[SalesDomain] cancelEdit is not a function', cancelEdit);
                      return;
                    }
                    cancelEdit();
                  }}
                  className="flex-1 py-3 bg-red-500/10 text-red-400 rounded-xl text-xs font-black uppercase tracking-widest active:scale-95 transition-transform border border-red-500/20"
                >
                  Cancelar
                </button>
              )}
              <button
                onClick={(event) => {
                  if (typeof handleSell !== 'function') {
                    console.error('[SalesDomain] handleSell is not a function', handleSell);
                    return;
                  }
                  handleSell(event);
                }}
                disabled={!canOperateSales}
                className="flex-1 py-3 bg-white text-black rounded-xl text-xs font-black uppercase tracking-widest active:scale-95 transition-transform disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {editingTicketId ? 'Actualizar Ticket' : 'Generar Ticket'}
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => {
          if (typeof setShowFastEntryModal !== 'function') {
            console.error('[SalesDomain] setShowFastEntryModal is not a function', setShowFastEntryModal);
            return;
          }
          setShowFastEntryModal(true);
        }}
        className="w-full py-3 bg-white/5 border border-border rounded-xl text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all flex items-center justify-center gap-2"
      >
        <Zap className="w-4 h-4" />
        Copiado rapido
      </button>

      {userProfile?.role === 'seller' && (
        <div className="glass-card p-4 space-y-4 border-primary/20 bg-primary/5">
          <div className="flex items-center justify-between border-b border-primary/10 pb-2">
            <div className="flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4 text-primary" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Resumen del Dia</h3>
            </div>
            <span className="text-[10px] font-mono opacity-50">{todayStr}</span>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <p className="text-[9px] uppercase text-muted-foreground font-bold tracking-wider mb-1">Ventas Brutas</p>
              <p className="text-sm font-black">${todayStats.sales.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase text-muted-foreground font-bold tracking-wider mb-1">Inyecciones</p>
              <p className="text-sm font-black text-blue-400">${todayStats.injections.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase text-muted-foreground font-bold tracking-wider mb-1">Premios</p>
              <p className="text-sm font-black text-red-400">${todayStats.prizes.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase text-muted-foreground font-bold tracking-wider mb-1">Utilidad Banca</p>
              <p className={`text-sm font-black ${todayStats.bankProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                ${todayStats.bankProfit.toFixed(2)}
              </p>
            </div>
          </div>
          <div className="pt-3 border-t border-primary/10 flex justify-between items-center">
            <div>
              <p className="text-[9px] uppercase text-muted-foreground font-bold tracking-wider">Deuda Pendiente</p>
              <p className="text-lg font-black text-red-500">${todayStats.pendingDebt.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] uppercase text-muted-foreground font-bold tracking-wider">Balance Neto</p>
              <p className={`text-lg font-black ${todayStats.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${todayStats.netProfit.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
