import React from 'react';
import { motion } from 'motion/react';
import { Calendar, ChevronDown, LayoutDashboard, Plus, Trash2, Zap } from 'lucide-react';
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
  lotteriesLoading?: boolean;
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
  amountEntryStarted: boolean;
  setAmountEntryStarted: (value: boolean) => void;
  numberInputRef: React.RefObject<HTMLInputElement | null>;
  amountInputRef: React.RefObject<HTMLInputElement | null>;
  number: string;
  quantity: string;
  plAmount: string;
  handleKeyPress: (key: string) => void;
  handleBackspace: () => void;
  handleClear: () => void;
  addToCart: () => void;
  canSell: boolean;
  sellBlockedReason?: string | null;
  cart?: Bet[];
  clearCart: () => void;
  updateCartItemQuantity: (index: number, newQty: number) => void;
  updateCartItemAmount: (index: number, newAmount: number) => void;
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
    <div className="grid grid-cols-3 gap-2 w-full">
      {keys.map((key) => (
        <button
          key={key}
          onClick={() => (key === '⌫' ? onBackspace() : onKeyPress(key))}
          className="h-[60px] rounded-2xl border border-white/10 bg-black/30 text-2xl font-black flex items-center justify-center active:scale-[0.98] transition-transform"
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
    lotteriesLoading,
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
    amountEntryStarted,
    setAmountEntryStarted,
    findActiveLotteryByName,
    focusedField,
    numberInputRef,
    amountInputRef,
    number,
    quantity,
    plAmount,
    handleKeyPress,
    handleBackspace,
    handleClear,
    addToCart,
    canSell,
    sellBlockedReason,
    cart,
    clearCart,
    updateCartItemQuantity,
    updateCartItemAmount,
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
  const hasLoadedLotteries = !lotteriesLoading;
  const canOperateSales = canSell && hasActiveLotteries;

  if (import.meta.env.DEV) {
    const requiredCallbacks = {
      handleSell,
      addToCart,
      clearCart,
      cancelEdit,
      setShowFastEntryModal,
      updateCartItemQuantity,
      updateCartItemAmount,
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
      className="w-full max-w-md mx-auto px-1 sm:px-0 space-y-2.5 pb-24"
    >
      {!canSell && (
        <div className="surface-card p-4 border border-red-500/30 bg-red-500/10">
          <p className="text-xs font-black uppercase tracking-widest text-red-400">Ventas bloqueadas</p>
          <p className="text-xs text-muted-foreground mt-1">{sellBlockedReason}</p>
        </div>
      )}

      {hasLoadedLotteries && !hasActiveLotteries && (
        <div className="surface-card p-4 border border-amber-500/30 bg-amber-500/10">
          <p className="text-xs font-black uppercase tracking-widest text-amber-300">Sin sorteos activos</p>
          <p className="text-xs text-muted-foreground mt-1">No hay sorteos disponibles para vender en este momento.</p>
        </div>
      )}

      <div className="surface-panel border border-white/10 rounded-xl px-2.5 py-2 flex items-center justify-between relative z-30 gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <Calendar className="w-3 h-3 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-mono uppercase text-muted-foreground leading-none mb-0.5">Sorteo activo</p>
            {isMultipleMode ? (
              <div className="relative w-full">
                <button
                  onClick={() => setShowMultiSelect(!showMultiSelect)}
                  className="w-full text-left text-xs font-bold truncate flex items-center justify-between gap-1.5 min-h-[28px]"
                >
                  {safeMultiLottery.length === 0 ? 'Seleccione Sorteos' : `${safeMultiLottery.length} Sorteos`}
                  <ChevronDown className={`w-3 h-3 transition-transform ${showMultiSelect ? 'rotate-180' : ''}`} />
                </button>
                {showMultiSelect && (
                  <div className="absolute top-full left-0 mt-1 w-full surface-card border border-white/12 rounded-xl p-2 space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar z-40">
                    {safeActiveLotteries.length > 0 ? (
                      <>
                        <div className="flex items-center justify-between pb-1 border-b border-white/10">
                          <button
                            onClick={() => setMultiLottery(safeActiveLotteries.map((lottery) => lottery.id))}
                            className="px-2 py-1 text-[10px] font-bold uppercase text-primary hover:text-primary/80"
                          >
                            Todos
                          </button>
                          <button
                            onClick={() => setMultiLottery([])}
                            className="px-2 py-1 text-[10px] font-bold uppercase text-red-500 hover:text-red-400"
                          >
                            Ninguno
                          </button>
                        </div>
                        {safeActiveLotteries.map((lottery) => (
                          <label key={lottery.id} className="flex items-center gap-2 px-1.5 py-1.5 rounded-lg cursor-pointer hover:bg-white/5">
                            <input
                              type="checkbox"
                              checked={safeMultiLottery.includes(lottery.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setMultiLottery([...safeMultiLottery, lottery.id]);
                                } else {
                                  setMultiLottery(safeMultiLottery.filter((id) => id !== lottery.id));
                                }
                              }}
                              className="rounded border-border text-primary focus:ring-primary bg-transparent"
                            />
                            <span className="text-xs font-medium truncate">
                              {cleanText(lottery.name)} {lottery.drawTime ? `(${formatTime12h(lottery.drawTime)})` : ''}
                            </span>
                          </label>
                        ))}
                      </>
                    ) : (
                      <div className="py-3 text-center text-xs text-muted-foreground">
                        {lotteriesLoading ? 'Cargando sorteos...' : 'No hay sorteos disponibles'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <select
                value={selectedLottery}
                onChange={(e) => setSelectedLottery(e.target.value)}
                className="bg-transparent border-none p-0 font-bold text-xs sm:text-sm focus:outline-none w-full truncate min-h-[28px]"
                disabled={lotteriesLoading || !hasActiveLotteries}
              >
                <option key="default" value="" className="bg-background">
                  {lotteriesLoading ? 'Cargando sorteos...' : hasActiveLotteries ? 'Seleccione Sorteo' : 'Sin sorteos activos'}
                </option>
                {safeActiveLotteries.map((lottery) => (
                  <option key={lottery.id} value={lottery.id} className="bg-background">
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
            setShowMultiSelect(next);
          }}
          className={`px-2.5 py-1.5 min-h-[30px] rounded-lg text-[9px] font-bold uppercase transition-all border shrink-0 ${
            isMultipleMode ? 'bg-primary border-primary text-primary-foreground' : 'surface-panel text-muted-foreground'
          }`}
          disabled={!hasActiveLotteries}
        >
          Multi
        </button>
      </div>

      <div className="surface p-2 flex gap-1.5">
        <button
          onClick={() => {
            setBetType('CH');
            setNumber('');
            setQuantity('1');
            setFocusedField('number');
          }}
          className={`flex-1 min-w-0 py-3 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all ${
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
            className={`flex-1 min-w-0 py-3 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all ${
              betType === 'PL' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Pale
          </button>
        )}
        {globalSettings.billetesEnabled && (isMultipleMode ? safeMultiLottery.some((id) => findActiveLotteryByName(id)?.isFourDigits) : findActiveLotteryByName(selectedLottery)?.isFourDigits) && (
          <button
            onClick={() => {
              setBetType('BL');
              setNumber('');
              setQuantity('1');
              setFocusedField('number');
            }}
            className={`flex-1 min-w-0 py-3 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all ${
              betType === 'BL' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Billete
          </button>
        )}
      </div>

      <div className="surface p-2.5 grid grid-cols-2 gap-2">
        <div
          onClick={() => {
            setFocusedField('number');
            numberInputRef.current?.focus();
          }}
          className={`surface-card p-2 flex flex-col items-center justify-center gap-0.5 transition-all border-2 cursor-pointer ${
            focusedField === 'number' ? 'border-primary bg-primary/10' : 'border-white/10'
          }`}
        >
          <span className="text-[11px] font-mono uppercase text-muted-foreground font-medium">Numero</span>
          <div className="flex items-center justify-center min-h-[28px] relative w-full">
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
                    setAmountEntryStarted(false);
                    setTimeout(() => {
                      amountInputRef.current?.focus();
                    }, 0);
                  }
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && number.length === (betType === 'CH' ? 2 : 4)) {
                  setFocusedField('amount');
                  setAmountEntryStarted(false);
                  setTimeout(() => {
                    amountInputRef.current?.focus();
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
            setAmountEntryStarted(false);
            setTimeout(() => {
              amountInputRef.current?.focus();
            }, 0);
          }}
          className={`surface-card p-2 flex flex-col items-center justify-center gap-0.5 transition-all border-2 cursor-pointer ${
            focusedField === 'amount' ? 'border-primary' : 'border-white/10'
          }`}
        >
          <span className="text-[11px] font-mono uppercase text-muted-foreground font-medium">
            {betType === 'PL' ? 'Inversion' : 'Cantidad'}
          </span>
          <div className="flex items-center justify-center min-h-[28px] relative w-full">
            <input
              ref={amountInputRef}
              type="text"
              inputMode="none"
              value={(betType === 'CH' || betType === 'BL') ? (quantity === 'NaN' ? '' : quantity) : (plAmount === 'NaN' ? '' : plAmount)}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9.]/g, '');
                setAmountEntryStarted(val.length > 0);
                if (betType === 'CH' || betType === 'BL') {
                  if (betType === 'BL') {
                    const parsed = parseInt(val, 10);
                    if (!Number.isNaN(parsed) && parsed > 5) return;
                  }
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
                if (focusedField !== 'amount') {
                  setAmountEntryStarted(false);
                }
              }}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <span className="text-2xl font-bold">
              {(betType === 'CH' || betType === 'BL')
                ? (focusedField === 'amount' && !amountEntryStarted ? '' : quantity)
                : (focusedField === 'amount' && !amountEntryStarted ? '' : plAmount)}
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

      <div className="w-full -mx-1 sm:mx-0 py-0.5">
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
        <div className="surface-card p-2.5 space-y-2">
          <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Carrito ({safeCart.length})</h3>
            <button onClick={clearCart} className="text-[11px] font-bold uppercase text-red-500">Vaciar</button>
          </div>
          <div className="max-h-[42vh] overflow-y-auto space-y-0 custom-scrollbar pr-0.5">
            {Object.entries(
              safeCart.reduce((acc: Record<string, (Bet & { originalIdx: number })[]>, bet: Bet, idx: number) => {
                const groupKey = bet.lotteryId || bet.lottery;
                if (!acc[groupKey]) acc[groupKey] = [];
                acc[groupKey].push({ ...bet, originalIdx: idx });
                return acc;
              }, {})
            ).map(([lotteryName, bets]) => {
              const betList = bets as (Bet & { originalIdx: number })[];
              const firstBet = betList[0];
              return (
              <div key={lotteryName} className="border-b border-white/10 pb-0 last:border-b-0">
                <div className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-1 py-1 leading-none">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                  {cleanText(firstBet?.lottery || lotteryName)}
                  {firstBet?.lotteryDrawTime ? (
                    <span className="text-muted-foreground">({formatTime12h(firstBet.lotteryDrawTime)})</span>
                  ) : null}
                  <span className="text-muted-foreground ml-auto">({betList.length})</span>
                </div>
                <div>
                  {betList.map((bet) => (
                    <div key={`${bet.lottery}-${bet.number}-${bet.type}-${bet.originalIdx}`} className="grid grid-cols-[34px_minmax(0,1fr)_44px_64px_26px] items-center gap-1.5 h-8 border-b border-white/5">
                      <span className="font-mono font-bold text-primary text-[10px] leading-none">{bet.type}</span>
                      <span className="font-bold tracking-widest text-[11px] truncate leading-none">{bet.number}</span>
                      <input
                        type="text"
                        inputMode={bet.type === 'PL' ? 'decimal' : 'numeric'}
                        aria-label={bet.type === 'PL' ? 'Monto' : 'Cantidad'}
                        defaultValue={bet.type === 'PL' ? bet.amount.toFixed(2) : String(bet.quantity)}
                        onBlur={(event) => {
                          const raw = event.currentTarget.value.trim();

                          if (bet.type === 'PL') {
                            if (raw === '') {
                              event.currentTarget.value = bet.amount.toFixed(2);
                              return;
                            }
                            const parsed = Number.parseFloat(raw.replace(',', '.'));
                            if (!Number.isFinite(parsed) || Number.isNaN(parsed) || parsed < 0) {
                              event.currentTarget.value = bet.amount.toFixed(2);
                              return;
                            }
                            const minAmount = 0.1 * bet.quantity;
                            const maxAmount = 5 * bet.quantity;
                            const nextAmount = Math.max(minAmount, Math.min(maxAmount, parsed));
                            if (typeof updateCartItemAmount !== 'function') {
                              console.error('[SalesDomain] updateCartItemAmount is not a function', updateCartItemAmount);
                              return;
                            }
                            updateCartItemAmount(bet.originalIdx, nextAmount);
                            return;
                          }

                          if (raw === '') {
                            event.currentTarget.value = String(bet.quantity);
                            return;
                          }
                          const parsedQty = Number.parseInt(raw, 10);
                          if (!Number.isFinite(parsedQty) || Number.isNaN(parsedQty) || parsedQty < 1) {
                            event.currentTarget.value = String(bet.quantity);
                            return;
                          }
                          const clampedQty = bet.type === 'BL' ? Math.min(5, parsedQty) : parsedQty;
                          if (typeof updateCartItemQuantity !== 'function') {
                            console.error('[SalesDomain] updateCartItemQuantity is not a function', updateCartItemQuantity);
                            return;
                          }
                          updateCartItemQuantity(bet.originalIdx, clampedQty);
                        }}
                        className={`w-10 h-7 bg-transparent border-b border-white/20 text-center text-sm font-bold text-foreground leading-none outline-none focus:border-primary ${
                          bet.type === 'PL' ? 'pr-0.5' : ''
                        }`}
                      />
                      <span className="text-sm font-bold leading-none text-right">
                        ${(bet.type === 'PL' ? bet.amount : (bet.quantity * (bet.type === 'BL' ? 1 : chancePrice))).toFixed(2)}
                      </span>
                      <button onClick={() => removeFromCart(bet.originalIdx)} className="text-red-500/70 hover:text-red-500 p-1 transition-colors flex items-center justify-center">
                        <Trash2 className="w-4 h-4" />
                      </button>
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
        className="w-full py-3 surface-panel text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all flex items-center justify-center gap-2"
      >
        <Zap className="w-4 h-4" />
        Copiado rapido
      </button>

      {userProfile?.role === 'seller' && (
        <div className="surface-card p-4 space-y-4 border-primary/30 bg-primary/10">
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
