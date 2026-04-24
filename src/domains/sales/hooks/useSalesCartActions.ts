import { useCallback, type Dispatch, type RefObject, type SetStateAction } from 'react';
import { toast } from 'sonner';
import type { Bet, LotteryTicket } from '../../../types/bets';
import type { GlobalSettings } from '../../../types/lotteries';
import type { UserProfile } from '../../../types/users';
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
  findActiveLotteryByName: (name: string) => any;
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

    const lotteriesToBuy = new Set<string>();
    if (isMultipleMode) {
      multiLottery.forEach((lotteryName) => {
        const lottery = findActiveLotteryByName(lotteryName);
        if (betType === 'BL' && !lottery?.isFourDigits) return;
        lotteriesToBuy.add((lottery?.name || lotteryName).trim());
      });
    } else if (selectedLottery) {
      const lottery = findActiveLotteryByName(selectedLottery);
      if (betType === 'BL' && !lottery?.isFourDigits) {
        toast.error('Este sorteo no admite Billetes (4 cifras)');
        return;
      }
      lotteriesToBuy.add((lottery?.name || selectedLottery).trim());
    }

    if (lotteriesToBuy.size === 0) {
      toast.error(SALES_DOMAIN_SPEC.expectedErrors.invalidLotterySelection);
      return;
    }

    let calculatedAmount = 0;
    if (betType === 'CH') {
      calculatedAmount = qInt * chancePrice;
    } else if (betType === 'BL') {
      calculatedAmount = parseFloat(plAmount);
      if (isNaN(calculatedAmount) || calculatedAmount < 0.1) {
        toast.error('Inversion minima para Billete (BL) es USD 0.10');
        return;
      }
    } else {
      const costPerUnit = parseFloat(plAmount);
      if (isNaN(costPerUnit) || costPerUnit < 0.1 || costPerUnit > 5) {
        toast.error('Costo de Pale (PL) debe ser entre USD 0.10 y USD 5.00');
        return;
      }
      if (qInt > 5) {
        toast.error('Maximo 5 combinaciones por numero en Pale (PL)');
        return;
      }
      calculatedAmount = qInt * costPerUnit;
    }

    for (const lot of lotteriesToBuy) {
      if (betType !== 'PL') continue;

      const inCart = cart
        .filter((b) => b && b.number === number && b.lottery === lot && b.type === 'PL')
        .reduce((acc, b) => acc + b.quantity, 0);

      const inTickets = tickets
        .filter((ticket) => ticket.status === 'active' && ticket.bets)
        .flatMap((ticket) => ticket.bets)
        .filter((b) => b && b.number === number && b.lottery === lot && b.type === 'PL')
        .reduce((acc, b) => acc + b.quantity, 0);

      if (inCart + inTickets + qInt > 5) {
        toast.error(`Excede limite de 5 combinaciones para #${number} en ${lot}`);
        return;
      }
    }

    setCart((prevCart) => {
      const newBets: Bet[] = [];
      lotteriesToBuy.forEach((lotteryName) => {
        newBets.push({
          number: number.trim(),
          lottery: lotteryName.trim(),
          amount: calculatedAmount,
          type: betType,
          quantity: qInt,
        });
      });
      return unifyBets([...prevCart, ...newBets]);
    });

    toast.success('Jugada agregada al carrito');
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
    isMultipleMode,
    multiLottery,
    number,
    numberInputRef,
    operationalSellerId,
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
      const lot = item.lottery;
      const num = item.number;

      const inCartOther = cart
        .filter((bet, i) => bet && i !== index && bet.number === num && bet.lottery === lot && bet.type === 'PL')
        .reduce((acc, bet) => acc + bet.quantity, 0);

      const inTickets = tickets
        .filter((ticket) => ticket.status === 'active' && ticket.bets)
        .flatMap((ticket) => ticket.bets)
        .filter((bet) => bet && bet.number === num && bet.lottery === lot && bet.type === 'PL')
        .reduce((acc, bet) => acc + bet.quantity, 0);

      if (inCartOther + inTickets + newQty > 5) {
        toast.error(`Excede limite de 5 combinaciones para #${num} en ${lot}`);
        return;
      }
    }

    setCart((prev) => prev.map((item, i) => {
      if (i !== index) return item;
      const unitAmount = item.amount / item.quantity;
      return { ...item, quantity: newQty, amount: unitAmount * newQty };
    }));
  }, [cart, setCart, tickets]);

  const updateCartItemAmount = useCallback((index: number, newAmount: number) => {
    if (newAmount < 0) return;
    setCart((prev) => prev.map((item, i) => (i === index ? { ...item, amount: newAmount } : item)));
  }, [setCart]);

  const clearCart = useCallback(() => {
    if (cart.length === 0) return;
    setCart([]);
    toast.success('Carrito limpiado');
  }, [cart.length, setCart]);

  return {
    addToCart,
    removeFromCart,
    updateCartItemQuantity,
    updateCartItemAmount,
    clearCart,
  };
}
