import { lazy, Suspense } from 'react';

import { db, doc, setDoc } from '../../firebase';
import { unifyBets } from '../../utils/bets';
import { handleFirestoreError, OperationType } from '../../utils/firestoreError';
import { toastSuccess } from '../../utils/toast';
import type { Injection } from '../../types/finance';

const CheckoutModal = lazy(() => import('../modals/CheckoutModal'));
const ConfirmationModal = lazy(() => import('../modals/ConfirmationModal'));
const FastEntryModal = lazy(() => import('../modals/FastEntryModal'));
const GlobalSettingsModal = lazy(() => import('../modals/GlobalSettingsModal'));
const LotteryModal = lazy(() => import('../modals/LotteryModal'));
const LotterySelectorModal = lazy(() => import('../modals/LotterySelectorModal'));
const MultiDeleteTicketModal = lazy(() => import('../modals/MultiDeleteTicketModal'));
const TicketModal = lazy(() => import('../modals/TicketModal'));
const TransactionModal = lazy(() => import('../modals/TransactionModal'));
const UserModal = lazy(() => import('../modals/UserModal'));

interface AppModalsProps {
  showSettingsModal: boolean;
  setShowSettingsModal: (show: boolean) => void;
  globalSettings: any;
  setGlobalSettings: (settings: any) => void;
  isPrimaryCeoUser: boolean;
  handleDeleteAllSalesData: () => void;
  showFastEntryModal: boolean;
  setShowFastEntryModal: (show: boolean) => void;
  setCart: (updater: (prevCart: any[]) => any[]) => void;
  fastEntrySelectedLotteries: any[];
  chancePrice: number;
  plAmount: string;
  showTicketModal: any;
  setShowTicketModal: (value: any) => void;
  results: any[];
  lotteries: any[];
  users: any[];
  confirmModal: {
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  };
  setConfirmModal: (updater: (prev: any) => any) => void;
  multiDeleteModal: {
    show: boolean;
    onDeleteLottery: () => void;
    onDeleteAll: () => void;
  };
  setMultiDeleteModal: (updater: (prev: any) => any) => void;
  reuseModal: any;
  setReuseModal: (value: any) => void;
  activeLotteries: any[];
  handleReuseSelect: (lottery: any) => void;
  showCheckoutModal: boolean;
  setShowCheckoutModal: (show: boolean) => void;
  customerName: string;
  setCustomerName: (name: string) => void;
  confirmSale: () => void;
  isSubmittingSale: boolean;
  showLotteryModal: boolean;
  setShowLotteryModal: (show: boolean) => void;
  editingLottery: any;
  setEditingLottery: (lottery: any) => void;
  saveLottery: (lottery: any) => void;
  showUserModal: boolean;
  setShowUserModal: (show: boolean) => void;
  editingUser: any;
  setEditingUser: (user: any) => void;
  saveUser: (user: any) => void;
  currentUserRole?: string;
  isSavingUser: boolean;
  showInjectionModal: boolean;
  setShowInjectionModal: (show: boolean) => void;
  setIsInjectionOnly: (value: boolean) => void;
  setInjectionTargetUserEmail: (value: string) => void;
  setInjectionDefaultType: (value: 'injection' | 'payment' | 'debt') => void;
  setInjectionInitialAmount: (value: string) => void;
  currentUser: any;
  userProfile: any;
  injectionTargetUserEmail: string;
  injectionDefaultType: 'injection' | 'payment' | 'debt';
  injectionInitialAmount: string;
  isInjectionOnly: boolean;
  setInjections: (updater: (prev: Injection[]) => Injection[]) => void;
  refreshAuditLogs: () => void;
}

export function AppModals({
  showSettingsModal,
  setShowSettingsModal,
  globalSettings,
  setGlobalSettings,
  isPrimaryCeoUser,
  handleDeleteAllSalesData,
  showFastEntryModal,
  setShowFastEntryModal,
  setCart,
  fastEntrySelectedLotteries,
  chancePrice,
  plAmount,
  showTicketModal,
  setShowTicketModal,
  results,
  lotteries,
  users,
  confirmModal,
  setConfirmModal,
  multiDeleteModal,
  setMultiDeleteModal,
  reuseModal,
  setReuseModal,
  activeLotteries,
  handleReuseSelect,
  showCheckoutModal,
  setShowCheckoutModal,
  customerName,
  setCustomerName,
  confirmSale,
  isSubmittingSale,
  showLotteryModal,
  setShowLotteryModal,
  editingLottery,
  setEditingLottery,
  saveLottery,
  showUserModal,
  setShowUserModal,
  editingUser,
  setEditingUser,
  saveUser,
  currentUserRole,
  isSavingUser,
  showInjectionModal,
  setShowInjectionModal,
  setIsInjectionOnly,
  setInjectionTargetUserEmail,
  setInjectionDefaultType,
  setInjectionInitialAmount,
  currentUser,
  userProfile,
  injectionTargetUserEmail,
  injectionDefaultType,
  injectionInitialAmount,
  isInjectionOnly,
  setInjections,
  refreshAuditLogs,
}: AppModalsProps) {
  return (
    <Suspense fallback={null}>
      {showSettingsModal && (
        <GlobalSettingsModal
          show={showSettingsModal}
          settings={globalSettings}
          onSave={async (data) => {
            try {
              await setDoc(doc(db, 'settings', 'global'), data);
              setGlobalSettings(data);
              toastSuccess('Ajustes globales guardados');
              setShowSettingsModal(false);
            } catch (error) {
              handleFirestoreError(error, OperationType.WRITE, 'settings/global');
            }
          }}
          onClose={() => setShowSettingsModal(false)}
          allowDangerZone={isPrimaryCeoUser}
          onDeleteAllSalesData={handleDeleteAllSalesData}
        />
      )}

      {showFastEntryModal && (
        <FastEntryModal
          show={showFastEntryModal}
          onAdd={(bets) => {
            setCart(prevCart => {
              const combined = [...prevCart, ...bets];
              return unifyBets(combined);
            });
            toastSuccess('Apuestas agregadas y unificadas');
          }}
          onClose={() => setShowFastEntryModal(false)}
          selectedLotteries={fastEntrySelectedLotteries}
          chancePrice={chancePrice}
          plAmount={plAmount}
        />
      )}

      {showTicketModal && (
        <TicketModal
          ticket={showTicketModal.ticket}
          selectedLotteryName={showTicketModal.selectedLotteryName}
          results={results}
          lotteries={lotteries}
          globalSettings={globalSettings}
          users={users}
          onClose={() => setShowTicketModal(null)}
        />
      )}

      {confirmModal.show && (
        <ConfirmationModal
          show={confirmModal.show}
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onClose={() => setConfirmModal(prev => ({ ...prev, show: false }))}
        />
      )}

      {multiDeleteModal.show && (
        <MultiDeleteTicketModal
          show={multiDeleteModal.show}
          onDeleteLottery={multiDeleteModal.onDeleteLottery}
          onDeleteAll={multiDeleteModal.onDeleteAll}
          onClose={() => setMultiDeleteModal(prev => ({ ...prev, show: false }))}
        />
      )}

      {reuseModal.show && (
        <LotterySelectorModal
          show={reuseModal.show}
          lotteries={activeLotteries}
          onSelect={handleReuseSelect}
          onClose={() => setReuseModal({ show: false, ticket: null })}
        />
      )}

      {showCheckoutModal && (
        <CheckoutModal
          show={showCheckoutModal}
          customerName={customerName}
          setCustomerName={setCustomerName}
          onConfirm={confirmSale}
          onClose={() => setShowCheckoutModal(false)}
          isSubmitting={isSubmittingSale}
        />
      )}

      {showLotteryModal && (
        <LotteryModal
          show={showLotteryModal}
          lottery={editingLottery}
          onSave={saveLottery}
          onClose={() => { setShowLotteryModal(false); setEditingLottery(null); }}
        />
      )}

      {showUserModal && (
        <UserModal
          show={showUserModal}
          userProfile={editingUser}
          onSave={saveUser}
          onClose={() => { setShowUserModal(false); setEditingUser(null); }}
          currentUserRole={currentUserRole}
          isSaving={isSavingUser}
        />
      )}

      {showInjectionModal && (
        <TransactionModal
          show={showInjectionModal}
          onClose={() => {
            setShowInjectionModal(false);
            setIsInjectionOnly(false);
            setInjectionTargetUserEmail('');
            setInjectionDefaultType('injection');
            setInjectionInitialAmount('');
          }}
          users={users}
          currentUser={currentUser}
          userProfile={userProfile}
          targetUserEmail={injectionTargetUserEmail}
          defaultType={injectionDefaultType}
          initialAmount={injectionInitialAmount}
          allowOnlyInjection={isInjectionOnly}
          onInjectionSaved={(payload) => {
            setInjections(prev => ([payload as unknown as Injection, ...prev]));
            refreshAuditLogs();
          }}
        />
      )}
    </Suspense>
  );
}
