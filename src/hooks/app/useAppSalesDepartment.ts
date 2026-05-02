import { useCallback, useMemo, useRef, useState } from 'react';

import { buildSpecial4DLottery } from '../../config/special4d';
import { useSalesAvailability } from '../../domains/sales/hooks/useSalesAvailability';
import { useSalesCartActions } from '../../domains/sales/hooks/useSalesCartActions';
import { useSalesEntryInput } from '../../domains/sales/hooks/useSalesEntryInput';
import { useSalesSubmission } from '../../domains/sales/hooks/useSalesSubmission';
import { useTicketSalesActions } from '../../domains/sales/hooks/useTicketSalesActions';
import type { Bet } from '../../types/bets';
import type { Lottery } from '../../types/lotteries';
import { handleFirestoreError, OperationType } from '../../utils/firestoreError';
import { getOperationalTimeSortValue } from '../../utils/tickets';

export function useAppSalesDepartment({
  editingTicketId,
  globalSettings,
  historyTickets,
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
    return cart.reduce((acc, item) => acc + Number(item.amount || 0), 0);
  }, [cart]);
  const [multiLottery, setMultiLottery] = useState<string[]>([]);
  const [isMultipleMode, setIsMultipleMode] = useState(false);
  const [showMultiSelect, setShowMultiSelect] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [isSubmittingSale, setIsSubmittingSale] = useState(false);
  const [showFastEntryModal, setShowFastEntryModal] = useState(false);
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
    isLotteryOpenForSales,
    isMultipleMode,
    isSpecial4DSelected,
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
    special4DUnitPrice,
    updateCartItemAmount,
    updateCartItemQuantity,
  };
}
