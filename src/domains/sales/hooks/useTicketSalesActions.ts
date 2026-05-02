import { useCallback, type Dispatch, type SetStateAction } from 'react';

import { toast } from 'sonner';

import { serverTimestamp } from '../../../firebase';
import { deleteTicket as deleteTicketById, updateTicket } from '../../../services/repositories/ticketsRepo';
import type { Bet, LotteryTicket } from '../../../types/bets';
import type { Lottery } from '../../../types/lotteries';
import type { LotteryResult } from '../../../types/results';
import type { UserProfile } from '../../../types/users';
import { unifyBets } from '../../../utils/bets';
import { cleanText, normalizePlainText } from '../../../utils/text';
import { isTicketClosedForSales, ticketHasResults } from '../../../utils/tickets';
import { toastSuccess } from '../../../utils/toast';

interface UseTicketSalesActionsParams {
  user: any;
  userProfile?: UserProfile | null;
  operationalSellerId?: string;
  lotteries: Lottery[];
  results: LotteryResult[];
  tickets: LotteryTicket[];
  reuseModal: { show: boolean; ticket: LotteryTicket | null };
  setReuseModal: Dispatch<SetStateAction<{ show: boolean; ticket: LotteryTicket | null }>>;
  setCart: Dispatch<SetStateAction<Bet[]>>;
  setTickets: Dispatch<SetStateAction<LotteryTicket[]>>;
  setHistoryTickets: Dispatch<SetStateAction<LotteryTicket[]>>;
  setLiquidationTicketsSnapshot: Dispatch<SetStateAction<LotteryTicket[]>>;
  setEditingTicketId: Dispatch<SetStateAction<string | null>>;
  setCustomerName: Dispatch<SetStateAction<string>>;
  setIsMultipleMode: Dispatch<SetStateAction<boolean>>;
  setMultiLottery: Dispatch<SetStateAction<string[]>>;
  setSelectedLottery: Dispatch<SetStateAction<string>>;
  setActiveTab: Dispatch<SetStateAction<any>>;
  setConfirmModal: Dispatch<SetStateAction<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>>;
  setMultiDeleteModal: Dispatch<SetStateAction<{
    show: boolean;
    onDeleteLottery: () => void;
    onDeleteAll: () => void;
  }>>;
  onError: (error: unknown, operation: 'update' | 'delete', path: string) => void;
}

export function useTicketSalesActions({
  user,
  userProfile,
  operationalSellerId,
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
  onError,
}: UseTicketSalesActionsParams) {
  const isTicketClosed = useCallback((ticket: LotteryTicket) => isTicketClosedForSales(ticket, lotteries), [lotteries]);
  const isTicketHasResults = useCallback((ticket: LotteryTicket) => ticketHasResults(ticket, results), [results]);
  const ticketBelongsToCurrentUser = useCallback((ticket: LotteryTicket) => {
    const currentEmail = String(userProfile?.email || user?.email || '').toLowerCase();
    const currentSellerId = String(operationalSellerId || userProfile?.sellerId || '').toLowerCase();
    const currentUid = String(user?.uid || '').toLowerCase();

    return Boolean(
      (currentEmail && String(ticket.sellerEmail || '').toLowerCase() === currentEmail) ||
      (currentEmail && String((ticket as any).userEmail || '').toLowerCase() === currentEmail) ||
      (currentEmail && String((ticket as any).createdByEmail || '').toLowerCase() === currentEmail) ||
      (currentSellerId && String(ticket.sellerId || '').toLowerCase() === currentSellerId) ||
      (currentSellerId && String(ticket.sellerCode || '').toLowerCase() === currentSellerId) ||
      (currentUid && String((ticket as any).userId || '').toLowerCase() === currentUid) ||
      (currentUid && String((ticket as any).createdBy || '').toLowerCase() === currentUid)
    );
  }, [operationalSellerId, user?.email, user?.uid, userProfile?.email, userProfile?.sellerId]);

  const cancelTicket = useCallback(async (ticketOrId: LotteryTicket | string, selectedLotteryName?: string) => {
    const ticket = typeof ticketOrId === 'string'
      ? tickets.find(t => t.id === ticketOrId)
      : ticketOrId;
    if (!ticket) return;
    const id = ticket.id;

    if (!ticketBelongsToCurrentUser(ticket)) {
      toast.error('No tienes permiso para borrar esta venta. Solo el vendedor original puede hacerlo.');
      return;
    }

    if (isTicketClosed(ticket)) {
      toast.error('No se puede borrar esta venta: El sorteo ya ha cerrado.');
      return;
    }

    if (isTicketHasResults(ticket)) {
      toast.error('No se puede borrar esta venta: El sorteo ya tiene resultados.');
      return;
    }

    const allBets = ticket.bets || [];
    const lotKey = normalizePlainText(selectedLotteryName || '');
    const uniqueLotteries = Array.from(new Set(allBets.map((bet) => normalizePlainText(bet?.lottery || '')).filter(Boolean)));
    const canDoPartialDelete = Boolean(lotKey) && uniqueLotteries.length > 1;

    if (canDoPartialDelete) {
      const deleteCompleteTicket = () => {
        setConfirmModal({
          show: true,
          title: 'Borrar Ticket Completo',
          message: '¿Está seguro de borrar el ticket completo? Se eliminarán todos sus sorteos.',
          onConfirm: async () => {
            try {
              await deleteTicketById(id);
              toastSuccess('Ticket completo eliminado correctamente');
            } catch (error) {
              onError(error, 'delete', `tickets/${id}`);
            }
          }
        });
      };

      const deleteSelectedLottery = async () => {
        const remainingBets = allBets.filter((bet) => normalizePlainText(bet?.lottery || '') !== lotKey);
        if (remainingBets.length === 0) {
          setConfirmModal({
            show: true,
            title: 'Borrar Ticket',
            message: 'Al eliminar este sorteo, el ticket queda sin apuestas. ¿Deseas eliminar el ticket completo?',
            onConfirm: async () => {
              try {
                await deleteTicketById(id);
                toastSuccess('Ticket eliminado correctamente');
              } catch (error) {
                onError(error, 'delete', `tickets/${id}`);
              }
            }
          });
          return;
        }

        const recalculatedTotal = remainingBets.reduce((sum, bet) => sum + (bet?.amount || 0), 0);
        try {
          await updateTicket(id, {
            bets: remainingBets,
            totalAmount: recalculatedTotal,
            updatedAt: serverTimestamp(),
            updateReason: `partial-delete:${lotKey}`,
          } as any);

          const patchLocalTicket = (prev: LotteryTicket[]) => prev.map((row) => {
            if (row.id !== id) return row;
            return {
              ...row,
              bets: remainingBets,
              totalAmount: recalculatedTotal,
            };
          });
          setTickets((prev) => patchLocalTicket(prev));
          setHistoryTickets((prev) => patchLocalTicket(prev));
          setLiquidationTicketsSnapshot((prev) => patchLocalTicket(prev));

          toastSuccess('Se eliminó solo el sorteo seleccionado del ticket');
        } catch (error) {
          onError(error, 'update', `tickets/${id}`);
        }
      };

      setMultiDeleteModal({
        show: true,
        onDeleteLottery: () => {
          void deleteSelectedLottery();
        },
        onDeleteAll: () => {
          deleteCompleteTicket();
        },
      });
      return;
    }

    setConfirmModal({
      show: true,
      title: 'Borrar Venta',
      message: '¿Está seguro de borrar esta venta? Se eliminará permanentemente de la base de datos.',
      onConfirm: async () => {
        try {
          await deleteTicketById(id);
          toastSuccess('Venta eliminada correctamente');
        } catch (error) {
          onError(error, 'delete', `tickets/${id}`);
        }
      }
    });
  }, [
    isTicketClosed,
    isTicketHasResults,
    onError,
    setConfirmModal,
    setHistoryTickets,
    setLiquidationTicketsSnapshot,
    setMultiDeleteModal,
    setTickets,
    ticketBelongsToCurrentUser,
    tickets,
  ]);

  const reuseTicket = useCallback((ticket: LotteryTicket) => {
    if (!ticketBelongsToCurrentUser(ticket)) {
      toast.error('No tienes permiso para reutilizar esta venta. Solo el seller original puede hacerlo.');
      return;
    }
    setReuseModal({ show: true, ticket });
  }, [setReuseModal, ticketBelongsToCurrentUser]);

  const handleReuseSelect = useCallback((lotteryId: string) => {
    if (!reuseModal.ticket) return;
    const targetLottery = lotteries.find((lottery) => lottery.id === lotteryId);
    if (!targetLottery) {
      toast.error('Sorteo no encontrado');
      return;
    }
    const newBets = reuseModal.ticket.bets.map(b => ({
      ...b,
      lottery: targetLottery.name,
      lotteryId: targetLottery.id,
      lotteryDrawTime: targetLottery.drawTime || '',
    }));

    setCart(prevCart => {
      const combined = [...prevCart, ...newBets];
      return unifyBets(combined);
    });

    setActiveTab('sales');
    toast.info(`Lista duplicada y unificada para ${cleanText(targetLottery.name)}`);
  }, [lotteries, reuseModal.ticket, setActiveTab, setCart]);

  const editTicket = useCallback(async (ticket: LotteryTicket) => {
    if (!ticketBelongsToCurrentUser(ticket)) {
      toast.error('No tienes permiso para editar esta venta. Solo el vendedor original puede hacerlo.');
      return;
    }

    if (isTicketClosed(ticket)) {
      toast.error('No se puede editar esta venta: El sorteo ya ha cerrado.');
      return;
    }

    if (isTicketHasResults(ticket)) {
      toast.error('No se puede editar esta venta: El sorteo ya tiene resultados.');
      return;
    }

    setConfirmModal({
      show: true,
      title: 'Editar Venta',
      message: 'Se cargarán las apuestas al carrito para modificarlas. El ticket original se mantendrá hasta que confirmes los cambios. ¿Continuar?',
      onConfirm: () => {
        const uniqueTicketLotteries = Array.from(new Set(
          (ticket.bets || [])
            .map(b => (b?.lottery || '').trim())
            .filter(Boolean)
        ));

        setCart(ticket.bets);
        setEditingTicketId(ticket.id);
        setCustomerName(ticket.customerName || '');
        if (uniqueTicketLotteries.length > 1) {
          setIsMultipleMode(true);
          setMultiLottery(uniqueTicketLotteries);
          setSelectedLottery('');
        } else {
          setIsMultipleMode(false);
          setMultiLottery([]);
          setSelectedLottery(uniqueTicketLotteries[0] || '');
        }
        setActiveTab('sales');
        toast.info('Modo edicion activado. Realice los cambios y genere el ticket para actualizar.');
      }
    });
  }, [
    isTicketClosed,
    isTicketHasResults,
    setActiveTab,
    setCart,
    setConfirmModal,
    setCustomerName,
    setEditingTicketId,
    setIsMultipleMode,
    setMultiLottery,
    setSelectedLottery,
    ticketBelongsToCurrentUser,
  ]);

  const cancelEdit = useCallback(() => {
    setEditingTicketId(null);
    setCart([]);
    setCustomerName('');
    toast.info('Edición cancelada');
  }, [setCart, setCustomerName, setEditingTicketId]);

  return {
    cancelTicket,
    reuseTicket,
    handleReuseSelect,
    editTicket,
    cancelEdit,
    isTicketClosed,
    isTicketHasResults,
  };
}
