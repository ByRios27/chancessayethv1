import { useCallback, type Dispatch, type FormEvent, type MutableRefObject, type SetStateAction } from 'react';

import { toast } from 'sonner';

import { serverTimestamp } from '../../../firebase';
import { createTicket, updateTicket } from '../../../services/repositories/ticketsRepo';
import type { Bet, LotteryTicket } from '../../../types/bets';
import type { Lottery } from '../../../types/lotteries';
import type { LotteryResult } from '../../../types/results';
import type { UserProfile } from '../../../types/users';
import { unifyBets } from '../../../utils/bets';
import { cleanText } from '../../../utils/text';
import { getDailyTicketSequence } from '../../../utils/tickets';
import { toastSuccess } from '../../../utils/toast';
import { SALES_DOMAIN_SPEC } from '../domainSpec';
import { validateLotterySellable, validateSalesAccess } from '../helpers/validation';

interface UseSalesSubmissionParams {
  user: any;
  userProfile?: UserProfile | null;
  operationalSellerId: string;
  isSubmittingSale: boolean;
  setIsSubmittingSale: Dispatch<SetStateAction<boolean>>;
  saleInFlightRef: MutableRefObject<boolean>;
  cart: Bet[];
  setCart: Dispatch<SetStateAction<Bet[]>>;
  tickets: LotteryTicket[];
  historyTickets: LotteryTicket[];
  lotteries: Lottery[];
  results: LotteryResult[];
  chancePrice: number;
  customerName: string;
  setCustomerName: Dispatch<SetStateAction<string>>;
  editingTicketId: string | null;
  setEditingTicketId: Dispatch<SetStateAction<string | null>>;
  setMultiLottery: Dispatch<SetStateAction<string[]>>;
  setShowCheckoutModal: Dispatch<SetStateAction<boolean>>;
  setShowTicketModal: Dispatch<SetStateAction<{ ticket: LotteryTicket; selectedLotteryName?: string } | null>>;
  isLotteryOpenForSales: (lottery: Lottery) => boolean;
  onError: (error: unknown, path: string) => void;
}

export function useSalesSubmission({
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
  onError,
}: UseSalesSubmissionParams) {
  const handleSell = useCallback((e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (isSubmittingSale || saleInFlightRef.current) {
      toast.error(SALES_DOMAIN_SPEC.expectedErrors.saleInProgress);
      return;
    }
    if (cart.length === 0) {
      toast.error(SALES_DOMAIN_SPEC.expectedErrors.emptyCart);
      return;
    }
    const salesAccessError = validateSalesAccess({ userProfile, operationalSellerId });
    if (salesAccessError) {
      toast.error(salesAccessError);
      return;
    }
    setShowCheckoutModal(true);
  }, [cart.length, isSubmittingSale, operationalSellerId, saleInFlightRef, setShowCheckoutModal, user, userProfile]);

  const confirmSale = useCallback(async () => {
    if (!user) return;
    if (saleInFlightRef.current) {
      toast.error(SALES_DOMAIN_SPEC.expectedErrors.saleInProgress);
      return;
    }
    if (cart.length === 0) {
      toast.error(SALES_DOMAIN_SPEC.expectedErrors.emptyCart);
      return;
    }

    const salesAccessError = validateSalesAccess({ userProfile, operationalSellerId });
    if (salesAccessError) {
      toast.error(salesAccessError);
      return;
    }

    const unifiedCart = unifyBets(cart);
    const totalAmount = unifiedCart.reduce((acc, item) => acc + item.amount, 0);
    const finalCustomerName = customerName.trim() || 'Cliente General';
    const sellerEmail = String(userProfile?.email || user?.email || '').toLowerCase();
    const sellerIdForTicket = (
      operationalSellerId ||
      userProfile?.sellerId ||
      sellerEmail.split('@')[0]?.toUpperCase() ||
      user?.uid ||
      ''
    ).trim();

    for (const bet of unifiedCart) {
      const lot = bet.lotteryId
        ? lotteries.find(l => l.id === bet.lotteryId)
        : lotteries.find(l => cleanText(l.name) === cleanText(bet.lottery));
      const sellableError = validateLotterySellable({
        lottery: lot,
        lotteryName: bet.lottery,
        isLotteryOpenForSales,
        results,
        cleanText,
      });
      if (sellableError) {
        toast.error(sellableError);
        return;
      }
    }

    saleInFlightRef.current = true;
    setIsSubmittingSale(true);

    try {
      if (editingTicketId) {
        await updateTicket(editingTicketId, {
          bets: unifiedCart,
          totalAmount,
          chancePrice,
          customerName: finalCustomerName,
          lastEditedAt: serverTimestamp()
        });

        const originalTicket = tickets.find(t => t.id === editingTicketId) || historyTickets.find(t => t.id === editingTicketId);

        const updatedTicket: LotteryTicket = {
          ...originalTicket!,
          bets: unifiedCart,
          totalAmount,
          chancePrice,
          customerName: finalCustomerName,
        };

        setEditingTicketId(null);
        setCart([]);
        setMultiLottery([]);
        setCustomerName('');
        setShowCheckoutModal(false);
        setShowTicketModal({ ticket: updatedTicket });
        toastSuccess('¡Venta actualizada con éxito!');
      } else {
        const sequenceNumber = getDailyTicketSequence(tickets);
        const docRef = await createTicket({
          bets: unifiedCart,
          totalAmount,
          chancePrice,
          timestamp: serverTimestamp(),
          sellerId: sellerIdForTicket,
          sellerCode: sellerIdForTicket,
          sellerEmail,
          userEmail: sellerEmail,
          userId: user?.uid || '',
          createdBy: user?.uid || '',
          createdByEmail: sellerEmail,
          sellerName: userProfile?.name || user.displayName || 'Vendedor',
          commissionRate: userProfile?.commissionRate || 0,
          status: 'active',
          customerName: finalCustomerName,
          sequenceNumber,
          liquidated: false
        });

        const newTicket: LotteryTicket = {
          id: docRef.id,
          bets: unifiedCart,
          totalAmount,
          chancePrice,
          timestamp: { toDate: () => new Date() },
          sellerId: sellerIdForTicket,
          sellerCode: sellerIdForTicket,
          sellerEmail,
          sellerName: userProfile?.name || user.displayName || 'Vendedor',
          commissionRate: userProfile?.commissionRate || 0,
          status: 'active',
          customerName: finalCustomerName,
          sequenceNumber
        };

        setCart([]);
        setMultiLottery([]);
        setCustomerName('');
        setShowCheckoutModal(false);
        setShowTicketModal({ ticket: newTicket });
        toastSuccess('¡Venta realizada con éxito!');
      }
    } catch (error) {
      onError(error, 'tickets');
    } finally {
      saleInFlightRef.current = false;
      setIsSubmittingSale(false);
    }
  }, [
    cart,
    chancePrice,
    customerName,
    editingTicketId,
    historyTickets,
    isLotteryOpenForSales,
    lotteries,
    onError,
    operationalSellerId,
    results,
    saleInFlightRef,
    setCart,
    setCustomerName,
    setEditingTicketId,
    setIsSubmittingSale,
    setMultiLottery,
    setShowCheckoutModal,
    setShowTicketModal,
    tickets,
    user,
    userProfile,
  ]);

  return { handleSell, confirmSale };
}
