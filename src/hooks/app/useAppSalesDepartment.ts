import { useCallback, useMemo, useRef, useState } from 'react';

import { useSalesAvailability } from '../../domains/sales/hooks/useSalesAvailability';
import { useSalesCartActions } from '../../domains/sales/hooks/useSalesCartActions';
import { useSalesEntryInput } from '../../domains/sales/hooks/useSalesEntryInput';
import { useSalesSubmission } from '../../domains/sales/hooks/useSalesSubmission';
import { useTicketSalesActions } from '../../domains/sales/hooks/useTicketSalesActions';
import type { Bet } from '../../types/bets';
import type { Lottery } from '../../types/lotteries';
import { handleFirestoreError, OperationType } from '../../utils/firestoreError';

export function useAppSalesDepartment({
  editingTicketId,
  globalSettings,
  historyTickets,
  lotteries,
  operationalSellerId,
  results,
  reuseModal,
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
    return cart.reduce((acc, item) => acc + (item.type === 'CH' ? item.quantity * chancePrice : item.amount), 0);
  }, [cart, chancePrice]);
  const [multiLottery, setMultiLottery] = useState<string[]>([]);
  const [isMultipleMode, setIsMultipleMode] = useState(false);
  const [showMultiSelect, setShowMultiSelect] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [isSubmittingSale, setIsSubmittingSale] = useState(false);
  const [showFastEntryModal, setShowFastEntryModal] = useState(false);
  const saleInFlightRef = useRef(false);

  const { isLotteryOpenForSales, activeLotteries, findActiveLotteryByName } = useSalesAvailability({
    sortedLotteries,
    isMultipleMode,
    multiLottery,
    selectedLottery,
    setSelectedLottery,
    setMultiLottery,
    betType,
    setBetType,
    setNumber,
  });

  const fastEntrySelectedLotteries = useMemo(() => {
    const selectedKeys = isMultipleMode ? multiLottery : (selectedLottery ? [selectedLottery] : []);
    return selectedKeys
      .map((key) => findActiveLotteryByName(key))
      .filter(Boolean) as Lottery[];
  }, [findActiveLotteryByName, isMultipleMode, multiLottery, selectedLottery]);

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
    lotteries,
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
    lotteries,
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
    isLotteryOpenForSales,
    isMultipleMode,
    isSubmittingSale,
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
    setShowMultiSelect,
    showCheckoutModal,
    showFastEntryModal,
    showMultiSelect,
    updateCartItemAmount,
    updateCartItemQuantity,
  };
}
