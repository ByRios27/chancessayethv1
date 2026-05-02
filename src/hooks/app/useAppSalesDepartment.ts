import { useCallback, useMemo, useRef, useState, type FormEvent } from 'react';

import { toast } from 'sonner';

import { buildSpecial4DLottery, SPECIAL4D_LOTTERY_ID } from '../../config/special4d';
import { useSalesAvailability } from '../../domains/sales/hooks/useSalesAvailability';
import { useSalesCartActions } from '../../domains/sales/hooks/useSalesCartActions';
import { useSalesEntryInput } from '../../domains/sales/hooks/useSalesEntryInput';
import { useSalesSubmission } from '../../domains/sales/hooks/useSalesSubmission';
import { useTicketSalesActions } from '../../domains/sales/hooks/useTicketSalesActions';
import { serverTimestamp } from '../../firebase';
import { createSpecial4DTicket } from '../../services/repositories/special4dRepo';
import type { Bet } from '../../types/bets';
import type { Lottery } from '../../types/lotteries';
import type { Special4DTicket } from '../../types/special4d';
import { handleFirestoreError, OperationType } from '../../utils/firestoreError';
import { getOperationalTimeSortValue } from '../../utils/tickets';
import { validateSalesAccess } from '../../domains/sales/helpers/validation';

export function useAppSalesDepartment({
  businessDayKey,
  editingTicketId,
  globalSettings,
  historyTickets,
  lotteries,
  operationalSellerId,
  results,
  reuseModal,
  setSpecial4DTickets,
  setActiveTab,
  setConfirmModal,
  setEditingTicketId,
  setHistoryTickets,
  setLiquidationTicketsSnapshot,
  setMultiDeleteModal,
  setReuseModal,
  setSelectedLottery,
  setShowTicketModal,
  setTickets,
  selectedLottery,
  sortedLotteries,
  special4DTickets,
  tickets,
  user,
  userProfile,
}: any) {
  const {
    number,
    setNumber,
    quantity,
    setQuantity,
    amountEntryStarted,
    setAmountEntryStarted,
    plAmount,
    setPlAmount,
    betType,
    setBetType,
    focusedField,
    setFocusedField,
    numberInputRef,
    amountInputRef,
    handleKeyPress,
    handleBackspace,
    handleClear,
  } = useSalesEntryInput();
  const [chancePrice, setChancePrice] = useState<number>(0.20);
  const [cart, setCart] = useState<Bet[]>([]);
  const cartTotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + Number(item.amount || 0), 0);
  }, [cart]);
  const [multiLottery, setMultiLottery] = useState<string[]>([]);
  const [isMultipleMode, setIsMultipleMode] = useState(false);
  const [showMultiSelect, setShowMultiSelect] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [isSubmittingSale, setIsSubmittingSale] = useState(false);
  const [showFastEntryModal, setShowFastEntryModal] = useState(false);
  const [showSpecial4DCheckoutModal, setShowSpecial4DCheckoutModal] = useState(false);
  const [showSpecial4DTicketModal, setShowSpecial4DTicketModal] = useState<Special4DTicket | null>(null);
  const [isSubmittingSpecial4D, setIsSubmittingSpecial4D] = useState(false);
  const saleInFlightRef = useRef(false);

  const special4DPreferenceEnabled = userProfile ? userProfile.special4dEnabled !== false : false;
  const canSeeSpecial4D = Boolean(globalSettings.special4d?.enabled && special4DPreferenceEnabled);
  const salesSortedLotteries = useMemo(() => {
    const baseLotteries = Array.isArray(sortedLotteries) ? [...sortedLotteries] : [];
    if (canSeeSpecial4D) {
      baseLotteries.push(buildSpecial4DLottery(globalSettings.special4d));
    }
    return baseLotteries.sort((a, b) => (
      getOperationalTimeSortValue(a.drawTime || '00:00') - getOperationalTimeSortValue(b.drawTime || '00:00')
    ));
  }, [canSeeSpecial4D, globalSettings.special4d, sortedLotteries]);

  const { isLotteryOpenForSales, activeLotteries, findActiveLotteryByName } = useSalesAvailability({
    sortedLotteries: salesSortedLotteries,
    isMultipleMode,
    multiLottery,
    selectedLottery,
    setSelectedLottery,
    setMultiLottery,
    betType,
    setBetType,
    setNumber,
  });

  const selectedSalesLottery = useMemo(() => {
    if (isMultipleMode || !selectedLottery) return undefined;
    return findActiveLotteryByName(selectedLottery);
  }, [findActiveLotteryByName, isMultipleMode, selectedLottery]);

  const isSpecial4DSelected = Boolean(selectedSalesLottery?.isSpecial4D);
  const special4DUnitPrice = Number(globalSettings.special4d?.unitPrice || 0);

  const fastEntrySelectedLotteries = useMemo(() => {
    const selectedKeys = isMultipleMode ? multiLottery : (selectedLottery ? [selectedLottery] : []);
    return selectedKeys
      .map((key) => findActiveLotteryByName(key))
      .filter((lottery) => !lottery?.isSpecial4D)
      .filter(Boolean) as Lottery[];
  }, [findActiveLotteryByName, isMultipleMode, multiLottery, selectedLottery]);

  const handleSpecial4DSell = useCallback((event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    if (isSubmittingSpecial4D) {
      toast.error('Venta Especial 4D en proceso');
      return;
    }
    const salesAccessError = validateSalesAccess({ userProfile, operationalSellerId });
    if (salesAccessError) {
      toast.error(salesAccessError);
      return;
    }
    if (!canSeeSpecial4D || !selectedSalesLottery?.isSpecial4D) {
      toast.error('Seleccione el sorteo Especial Chances 4D');
      return;
    }
    if (!isLotteryOpenForSales(selectedSalesLottery)) {
      toast.error('Especial Chances 4D ya cerro ventas');
      return;
    }
    if (special4DUnitPrice <= 0) {
      toast.error('Configure el precio unitario del Especial 4D');
      return;
    }
    if (!/^\d{2}$/.test(number)) {
      toast.error('Chance especial debe jugarse con 2 cifras');
      return;
    }
    const parsedQuantity = Number.parseInt(quantity, 10);
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      toast.error('Cantidad invalida');
      return;
    }
    if (results.some((result: any) => result.date === businessDayKey && result.lotteryId === SPECIAL4D_LOTTERY_ID)) {
      toast.error('Este sorteo especial ya tiene resultado registrado');
      return;
    }
    setShowSpecial4DCheckoutModal(true);
  }, [
    businessDayKey,
    canSeeSpecial4D,
    isLotteryOpenForSales,
    isSubmittingSpecial4D,
    number,
    operationalSellerId,
    quantity,
    results,
    selectedSalesLottery,
    special4DUnitPrice,
    user,
    userProfile,
  ]);

  const confirmSpecial4DSale = useCallback(async () => {
    if (!user || !userProfile?.email) return;
    if (isSubmittingSpecial4D) return;
    if (!canSeeSpecial4D) {
      toast.error('Especial Chances 4D no esta activo para este usuario');
      return;
    }
    const specialLottery = selectedSalesLottery?.isSpecial4D
      ? selectedSalesLottery
      : buildSpecial4DLottery(globalSettings.special4d);

    if (!specialLottery.active || !isLotteryOpenForSales(specialLottery)) {
      toast.error('Especial Chances 4D ya cerro ventas');
      return;
    }
    if (special4DUnitPrice <= 0) {
      toast.error('Configure el precio unitario del Especial 4D');
      return;
    }
    if (!/^\d{2}$/.test(number)) {
      toast.error('Chance especial debe jugarse con 2 cifras');
      return;
    }
    const parsedQuantity = Number.parseInt(quantity, 10);
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      toast.error('Cantidad invalida');
      return;
    }
    const alreadyHasResult = results.some((result: any) => (
      result.date === businessDayKey && result.lotteryId === SPECIAL4D_LOTTERY_ID
    ));
    if (alreadyHasResult) {
      toast.error('Este sorteo especial ya tiene resultado registrado');
      return;
    }

    setIsSubmittingSpecial4D(true);
    try {
      const unitPrice = special4DUnitPrice;
      const totalAmount = unitPrice * parsedQuantity;
      const specialName = globalSettings.special4d?.name || specialLottery.name || 'Especial Chances 4D';
      const payload: Omit<Special4DTicket, 'id'> = {
        number,
        quantity: parsedQuantity,
        unitPrice,
        totalAmount,
        date: businessDayKey,
        timestamp: serverTimestamp(),
        customerName: customerName.trim() || 'Cliente General',
        sellerId: operationalSellerId,
        sellerCode: operationalSellerId,
        sellerEmail: userProfile.email.toLowerCase(),
        sellerName: userProfile.name || user.displayName || 'Vendedor',
        commissionRate: Number(globalSettings.special4d?.commissionRate || 0),
        specialLotteryId: SPECIAL4D_LOTTERY_ID,
        specialLotteryName: specialName,
        specialLotteryDrawTime: specialLottery.drawTime || '',
        specialName,
        drawTime: specialLottery.drawTime || '',
        closingTime: specialLottery.closingTime || '',
        status: 'active',
        liquidated: false,
      };
      const docRef = await createSpecial4DTicket(payload);
      const newTicket: Special4DTicket = {
        id: docRef.id,
        ...payload,
        timestamp: { toDate: () => new Date() },
      };

      setSpecial4DTickets((prev: Special4DTicket[]) => [newTicket, ...prev]);
      setShowSpecial4DCheckoutModal(false);
      setShowSpecial4DTicketModal(newTicket);
      setCustomerName('');
      setNumber('');
      setQuantity('1');
      setFocusedField('number');
      toast.success('Venta Especial 4D generada');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'special4_tickets');
    } finally {
      setIsSubmittingSpecial4D(false);
    }
  }, [
    businessDayKey,
    canSeeSpecial4D,
    globalSettings.special4d,
    isSubmittingSpecial4D,
    isLotteryOpenForSales,
    number,
    operationalSellerId,
    quantity,
    results,
    selectedSalesLottery,
    setFocusedField,
    setNumber,
    setQuantity,
    setSpecial4DTickets,
    special4DUnitPrice,
    customerName,
    user,
    userProfile,
  ]);

  const {
    addToCart,
    removeFromCart,
    updateCartItemQuantity,
    updateCartItemAmount,
    clearCart,
  } = useSalesCartActions({
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
  });

  const handleSalesSubmissionError = useCallback((error: unknown, path: string) => {
    handleFirestoreError(error, OperationType.WRITE, path);
  }, []);

  const { handleSell, confirmSale } = useSalesSubmission({
    user,
    userProfile,
    operationalSellerId,
    isSubmittingSale,
    setIsSubmittingSale,
    saleInFlightRef,
    cart,
    setCart,
    tickets,
    historyTickets,
    lotteries: salesSortedLotteries,
    results,
    chancePrice,
    customerName,
    setCustomerName,
    editingTicketId,
    setEditingTicketId,
    setMultiLottery,
    setShowCheckoutModal,
    setShowTicketModal,
    isLotteryOpenForSales,
    onError: handleSalesSubmissionError,
  });

  const handleTicketSalesActionError = useCallback((error: unknown, operation: 'update' | 'delete', path: string) => {
    const op = operation === 'update' ? OperationType.UPDATE : OperationType.DELETE;
    handleFirestoreError(error, op, path);
  }, []);

  const {
    cancelTicket,
    reuseTicket,
    handleReuseSelect,
    editTicket,
    cancelEdit,
    isTicketClosed,
    isTicketHasResults,
  } = useTicketSalesActions({
    user,
    lotteries: salesSortedLotteries,
    results,
    tickets,
    reuseModal,
    setReuseModal,
    setCart,
    setTickets,
    setHistoryTickets,
    setLiquidationTicketsSnapshot,
    setEditingTicketId,
    setCustomerName,
    setIsMultipleMode,
    setMultiLottery,
    setSelectedLottery,
    setActiveTab,
    setConfirmModal,
    setMultiDeleteModal,
    onError: handleTicketSalesActionError,
  });

  return {
    activeLotteries,
    addToCart,
    amountEntryStarted,
    amountInputRef,
    betType,
    cancelEdit,
    cancelTicket,
    cart,
    cartTotal,
    chancePrice,
    clearCart,
    confirmSale,
    customerName,
    editTicket,
    fastEntrySelectedLotteries,
    findActiveLotteryByName,
    focusedField,
    handleBackspace,
    handleClear,
    handleKeyPress,
    handleReuseSelect,
    handleSell,
    handleSpecial4DSell,
    confirmSpecial4DSale,
    isLotteryOpenForSales,
    isMultipleMode,
    isSpecial4DSelected,
    isSubmittingSale,
    isSubmittingSpecial4D,
    isTicketClosed,
    isTicketHasResults,
    multiLottery,
    number,
    numberInputRef,
    plAmount,
    quantity,
    removeFromCart,
    reuseTicket,
    selectedLottery,
    setAmountEntryStarted,
    setBetType,
    setCart,
    setChancePrice,
    setCustomerName,
    setFocusedField,
    setIsMultipleMode,
    setMultiLottery,
    setNumber,
    setPlAmount,
    setQuantity,
    setSelectedLottery,
    setShowCheckoutModal,
    setShowFastEntryModal,
    setShowSpecial4DCheckoutModal,
    setShowSpecial4DTicketModal,
    setShowMultiSelect,
    showCheckoutModal,
    showFastEntryModal,
    showSpecial4DCheckoutModal,
    showSpecial4DTicketModal,
    showMultiSelect,
    special4DUnitPrice,
    special4DTickets,
    canSeeSpecial4D,
    updateCartItemAmount,
    updateCartItemQuantity,
  };
}
