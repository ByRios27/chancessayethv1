import { useCallback, type Dispatch, type RefObject, type SetStateAction } from 'react';
import { toast } from 'sonner';
import type { Bet, LotteryTicket } from '../../../types/bets';
import type { GlobalSettings, Lottery } from '../../../types/lotteries';
import type { UserProfile } from '../../../types/users';
import { toastSuccess } from '../../../utils/toast';
import { unifyBets } from '../../../utils/bets';
import { SALES_DOMAIN_SPEC } from '../domainSpec';
import { validateSalesAccess } from '../helpers/validation';

interface UseSalesCartActionsParams {
  userProfile?: UserProfile | null;
  operationalSellerId?: string;
  number: string;
  quantity: string;
  plAmount: string;
  betType: 'CH' | 'PL' | 'BL';
  chancePrice: number;
  globalSettings: GlobalSettings;
  isMultipleMode: boolean;
  multiLottery: string[];
  selectedLottery: string;
  findActiveLotteryByName: (name: string) => Lottery | undefined;
  cart: Bet[];
  setCart: Dispatch<SetStateAction<Bet[]>>;
  tickets: LotteryTicket[];
  setNumber: (value: string) => void;
  setQuantity: (value: string) => void;
  setPlAmount: (value: string) => void;
  setFocusedField: (value: 'number' | 'amount') => void;
  numberInputRef: RefObject<HTMLInputElement | null>;
}

export function useSalesCartActions({
  userProfile,
  operationalSellerId,
  number,
  quantity,
  plAmount,
  betType,
  chancePrice,
  globalSettings,
  isMultipleMode,
  multiLottery,
  selectedLottery,
  findActiveLotteryByName,
  cart,
  setCart,
  tickets,
  setNumber,
  setQuantity,
  setPlAmount,
  setFocusedField,
  numberInputRef,
}: UseSalesCartActionsParams) {
  const BL_UNIT_PRICE = 1;
  const betMatchesLottery = (bet: Bet | undefined, lottery: Lottery) => {
    if (!bet) return false;
    return bet.lotteryId ? bet.lotteryId === lottery.id : bet.lottery === lottery.name;
  };

  const addToCart = useCallback(() => {
    const salesAccessError = validateSalesAccess({ userProfile, operationalSellerId });
    if (salesAccessError) {
      toast.error(salesAccessError);
      return;
    }

    if (!number || !quantity) {
      toast.error(SALES_DOMAIN_SPEC.expectedErrors.invalidBetInput);
      return;
    }

    const qInt = parseInt(quantity, 10);
    if (isNaN(qInt) || qInt <= 0) {
      toast.error('Cantidad invalida');
      return;
    }

    if (betType === 'CH' && number.length !== 2) {
      toast.error('Chance (CH) debe ser de 2 cifras');
      return;
    }
    if (betType === 'PL' && number.length !== 4) {
      toast.error('Pale (PL) debe ser de 4 cifras');
      return;
    }
    if (betType === 'BL' && number.length !== 4) {
      toast.error('Billete (BL) debe ser de 4 cifras');
      return;
    }

    if (betType === 'PL' && !globalSettings.palesEnabled) {
      toast.error('Pales desactivados');
      return;
    }
    if (betType === 'BL' && !globalSettings.billetesEnabled) {
      toast.error('Billetes desactivados');
      return;
    }

    const lotteriesToBuy = new Map<string, Lottery>();
    if (isMultipleMode) {
      multiLottery.forEach((lotteryKey) => {
        const lottery = findActiveLotteryByName(lotteryKey);
        if (betType === 'BL' && !lottery?.isFourDigits) return;
        if (lottery) lotteriesToBuy.set(lottery.id, lottery);
      });
    } else if (selectedLottery) {
      const lottery = findActiveLotteryByName(selectedLottery);
      if (betType === 'BL' && !lottery?.isFourDigits) {
        toast.error('Este sorteo no admite Billetes (4 cifras)');
        return;
      }
      if (lottery) lotteriesToBuy.set(lottery.id, lottery);
    }

    if (lotteriesToBuy.size === 0) {
      toast.error(SALES_DOMAIN_SPEC.expectedErrors.invalidLotterySelection);
      return;
    }

    if (betType === 'BL') {
      if (qInt > 5) {
        toast.error('Maximo 5 billetes por jugada');
        return;
      }
    } else if (betType === 'PL') {
      const costPerUnit = parseFloat(plAmount);
      if (isNaN(costPerUnit) || costPerUnit < 0.1 || costPerUnit > 5) {
        toast.error('Costo de Pale (PL) debe ser entre USD 0.10 y USD 5.00');
        return;
      }
      if (qInt > 5) {
        toast.error('Maximo 5 combinaciones por numero en Pale (PL)');
        return;
      }
    }

    const specialLottery = Array.from(lotteriesToBuy.values()).find((lottery) => lottery.isSpecial4D);
    if (specialLottery && betType !== 'CH') {
      toast.error('Especial 4D solo permite Chance Especial');
      return;
    }
    if (specialLottery) {
      const specialUnitPrice = Number(specialLottery.pricePerUnit || globalSettings.special4d?.unitPrice || 0);
      if (!Number.isFinite(specialUnitPrice) || specialUnitPrice <= 0) {
        toast.error('Configure el precio unitario del Especial 4D');
        return;
      }
    }

    for (const lot of lotteriesToBuy.values()) {
      if (betType !== 'PL') continue;

      const inCart = cart
        .filter((b) => b && b.number === number && betMatchesLottery(b, lot) && b.type === 'PL')
        .reduce((acc, b) => acc + b.quantity, 0);

      const inTickets = tickets
        .filter((ticket) => ticket.status === 'active' && ticket.bets)
        .flatMap((ticket) => ticket.bets)
        .filter((b) => b && b.number === number && betMatchesLottery(b, lot) && b.type === 'PL')
        .reduce((acc, b) => acc + b.quantity, 0);

      if (inCart + inTickets + qInt > 5) {
        toast.error(`Excede limite de 5 combinaciones para #${number} en ${lot.name}`);
        return;
      }
    }

    setCart((prevCart) => {
      const newBets: Bet[] = [];
      lotteriesToBuy.forEach((lottery) => {
        const unitPrice = betType === 'CH'
          ? Number(lottery.isSpecial4D ? (lottery.pricePerUnit || globalSettings.special4d?.unitPrice || 0) : chancePrice)
          : betType === 'BL'
            ? BL_UNIT_PRICE
            : parseFloat(plAmount);
        if (!Number.isFinite(unitPrice) || unitPrice <= 0) return;
        const calculatedAmount = qInt * unitPrice;
        newBets.push({
          number: number.trim(),
          lottery: lottery.name.trim(),
          lotteryId: lottery.id,
          lotteryDrawTime: lottery.drawTime || '',
          amount: calculatedAmount,
          type: betType,
          quantity: qInt,
        });
      });
      return unifyBets([...prevCart, ...newBets]);
    });

    toastSuccess('Jugada agregada al carrito');
    setNumber('');
    setQuantity('1');
    setPlAmount('1.00');
    setFocusedField('number');
    setTimeout(() => {
      numberInputRef.current?.focus();
    }, 0);
  }, [
    betType,
    cart,
    chancePrice,
    findActiveLotteryByName,
    globalSettings.billetesEnabled,
    globalSettings.palesEnabled,
    globalSettings.special4d?.unitPrice,
    isMultipleMode,
    multiLottery,
    number,
    numberInputRef,
    operationalSellerId,
    BL_UNIT_PRICE,
    plAmount,
    quantity,
    selectedLottery,
    setCart,
    setFocusedField,
    setNumber,
    setPlAmount,
    setQuantity,
    tickets,
    userProfile,
  ]);

  const removeFromCart = useCallback((index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  }, [setCart]);

  const updateCartItemQuantity = useCallback((index: number, newQty: number) => {
    if (newQty < 1) return;
    const item = cart[index];
    if (!item) return;

    if (item.type === 'PL') {
      const lottery = item.lotteryId ? findActiveLotteryByName(item.lotteryId) : findActiveLotteryByName(item.lottery);
      const lot = item.lottery;
      const num = item.number;

      const inCartOther = cart
        .filter((bet, i) => bet && i !== index && bet.number === num && (lottery ? betMatchesLottery(bet, lottery) : bet.lottery === lot) && bet.type === 'PL')
        .reduce((acc, bet) => acc + bet.quantity, 0);

      const inTickets = tickets
        .filter((ticket) => ticket.status === 'active' && ticket.bets)
        .flatMap((ticket) => ticket.bets)
        .filter((bet) => bet && bet.number === num && (lottery ? betMatchesLottery(bet, lottery) : bet.lottery === lot) && bet.type === 'PL')
        .reduce((acc, bet) => acc + bet.quantity, 0);

      if (inCartOther + inTickets + newQty > 5) {
        toast.error(`Excede limite de 5 combinaciones para #${num} en ${lot}`);
        return;
      }
    }

    setCart((prev) => prev.map((item, i) => {
      if (i !== index) return item;
      const unitAmount = item.type === 'BL' ? BL_UNIT_PRICE : item.amount / item.quantity;
      return { ...item, quantity: newQty, amount: unitAmount * newQty };
    }));
  }, [BL_UNIT_PRICE, cart, findActiveLotteryByName, setCart, tickets]);

  const updateCartItemAmount = useCallback((index: number, newAmount: number) => {
    if (newAmount < 0) return;
    setCart((prev) => prev.map((item, i) => (i === index ? { ...item, amount: newAmount } : item)));
  }, [setCart]);

  const clearCart = useCallback(() => {
    if (cart.length === 0) return;
    setCart([]);
    toastSuccess('Carrito limpiado');
  }, [cart.length, setCart]);

  return {
    addToCart,
    removeFromCart,
    updateCartItemQuantity,
    updateCartItemAmount,
    clearCart,
  };
}
