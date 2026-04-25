import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { format } from 'date-fns';
import {
  AlertTriangle,
  Archive,
  ArrowLeftRight,
  ArrowUpRight,
  Banknote,
  BarChart3,
  Bell,
  Check,
  CheckCircle2,
  ChevronRight,
  Cloud,
  CloudOff,
  Copy,
  DollarSign,
  Edit2,
  Flag,
  History,
  LayoutDashboard,
  Layers,
  Lock,
  LogOut,
  Menu,
  MessageCircle,
  Moon,
  Plus,
  PlusCircle,
  Printer,
  Search,
  Settings,
  Share2,
  ShieldCheck,
  Star,
  Sun,
  Ticket as TicketIcon,
  Trash2,
  TrendingUp,
  Trophy,
  User as UserIcon,
  Users,
  Wallet,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import QRCode from 'react-qr-code';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Toaster, toast } from 'sonner';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

import {
  addDoc,
  auth,
  collection,
  db,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  googleProvider,
  increment,
  limit,
  orderBy,
  query,
  runTransaction,
  sendPasswordResetEmail,
  serverTimestamp,
  setDoc,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateDoc,
  updatePassword,
  where,
  writeBatch,
} from './firebase';

import { useAuthSession } from './hooks/useAuthSession';
import { useInjections } from './hooks/useInjections';
import { useLotteries } from './hooks/useLotteries';
import { useAppDataScopes, type AppTabId } from './hooks/useAppDataScopes';
import { useOperationalArchive } from './hooks/useOperationalArchive';
import { useOperationalClock } from './hooks/useOperationalClock';
import { useRecovery } from './hooks/useRecovery';
import { useArchiveDomain } from './domains/archive/hooks/useArchiveDomain';
import { useGeneralConfigDomain } from './domains/admin-config/hooks/useGeneralConfigDomain';
import { useLiquidationDomain } from './domains/liquidation/hooks/useLiquidationDomain';
import { useResultsDomain } from './domains/results/hooks/useResultsDomain';
import { useUsersDomain } from './domains/users/hooks/useUsersDomain';
import { useResults } from './hooks/useResults';
import { useSettlements } from './hooks/useSettlements';
import { useTickets } from './hooks/useTickets';
import { useUsers } from './hooks/useUsers';

import { buildFinancialSummary as calculateFinancialSummary } from './services/calculations/financial';
import { shouldRunAutoCleanupNow } from './services/calculations/operationalArchive';
import { getTicketPrizesFromSource as calculateTicketPrizesFromSource } from './services/calculations/prizes';
import {
  deleteRecoveryArchivedTicket,
  deleteRecoveryLiveTicket,
  updateRecoveryArchivedTicket,
  updateRecoveryLiveTicket,
} from './services/repositories/recoveryRepo';
import { createTicket, deleteTicket as deleteTicketById, updateTicket } from './services/repositories/ticketsRepo';
import { updatePreferredChancePrice } from './services/repositories/usersRepo';

import { GeneralConfigDomain } from './domains/admin-config/components/GeneralConfigDomain';
import { ConfigSection } from './components/config/ConfigSection';
import { HistorySection } from './components/history/HistorySection';
import CheckoutModal from './components/modals/CheckoutModal';
import ConfirmationModal from './components/modals/ConfirmationModal';
import FastEntryModal from './components/modals/FastEntryModal';
import GlobalSettingsModal from './components/modals/GlobalSettingsModal';
import LotteryModal from './components/modals/LotteryModal';
import LotterySelectorModal from './components/modals/LotterySelectorModal';
import ResultModal from './components/modals/ResultModal';
import TicketModal from './components/modals/TicketModal';
import TransactionModal from './components/modals/TransactionModal';
import UserModal from './components/modals/UserModal';
import { RecoverySection } from './components/recovery/RecoverySection';
import { ResultsDomain } from './domains/results/components/ResultsDomain';
import ErrorBoundary from './components/shared/ErrorBoundary';
import Login from './components/shared/Login';
import { UsersDomain } from './domains/users/components/UsersDomain';
import { ARCHIVE_DOMAIN_SPEC, canAccessArchiveDomain } from './domains/archive/domainSpec';
import { ADMIN_CONFIG_DOMAIN_SPEC, canAccessAdminConfigDomain } from './domains/admin-config/domainSpec';
import { CIERRES_DOMAIN_SPEC, canAccessCierresDomain } from './domains/cierres/domainSpec';
import { LIQUIDATION_DOMAIN_SPEC, canAccessLiquidationDomain } from './domains/liquidation/domainSpec';
import { RESULTS_DOMAIN_SPEC, canAccessResultsDomain } from './domains/results/domainSpec';
import { SALES_DOMAIN_SPEC, type DomainRole } from './domains/sales/domainSpec';
import { SalesDomain } from './domains/sales/components/SalesDomain';
import { validateLotterySellable, validateSalesAccess } from './domains/sales/helpers/validation';
import { useSalesAvailability } from './domains/sales/hooks/useSalesAvailability';
import { useSalesCartActions } from './domains/sales/hooks/useSalesCartActions';
import { USERS_DOMAIN_SPEC, canAccessUsersDomain } from './domains/users/domainSpec';

import type { RecoveryTicketRecord } from './types/archive';
import type { Bet, LotteryTicket } from './types/bets';
import type { Injection, Settlement } from './types/finance';
import type { Lottery, BilletePrizeMultipliers, ChancePriceConfig, GlobalSettings } from './types/lotteries';
import type { LotteryResult } from './types/results';
import type { UserProfile } from './types/users';
import { getBusinessDate, getEndOfBusinessDay } from './utils/dates';
import { unifyBets } from './utils/bets';
import { cleanText, normalizeLotteryName, normalizePlainText } from './utils/text';
import { formatTime12h } from './utils/time';
import { getVisibleNavItems, type NavItem } from './config/navigation';
// --- Error Boundary ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  code: string;
  cause: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const firebaseCode = (error as { code?: string })?.code || 'unknown';
  const firebaseMessage = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: firebaseMessage,
    code: firebaseCode,
    cause: firebaseMessage,
    authInfo: {
      userId: auth.currentUser?.uid || 'no-uid',
      email: auth.currentUser?.email || 'no-email',
      emailVerified: auth.currentUser?.emailVerified || false,
      isAnonymous: auth.currentUser?.isAnonymous || false,
      tenantId: auth.currentUser?.tenantId || 'no-tenant',
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName || 'no-display-name',
        email: provider.email || 'no-email',
        photoUrl: provider.photoURL || 'no-photo'
      })) || []
    },
    operationType,
    path
  }

  const operationLabel = ({
    [OperationType.CREATE]: 'crear',
    [OperationType.UPDATE]: 'actualizar',
    [OperationType.DELETE]: 'eliminar',
    [OperationType.LIST]: 'listar',
    [OperationType.GET]: 'leer',
    [OperationType.WRITE]: 'guardar'
  } as Record<OperationType, string>)[operationType];

  const target = path || 'documento';
  const humanHint = firebaseCode === 'permission-denied'
    ? 'No tienes permisos para esta acción.'
    : firebaseCode === 'failed-precondition'
      ? 'Falta un requisito previo para completar la operación.'
      : firebaseCode === 'unavailable'
        ? 'Servicio temporalmente no disponible. Intenta nuevamente.'
        : `Causa: ${firebaseMessage}`;

  toast.error(
    `Error al ${operationLabel} (${target})`,
    {
      description: `Código: ${firebaseCode} | ${humanHint}`
    }
  );

  console.error('Firestore Error Details:', JSON.stringify(errInfo, null, 2));
  return errInfo;
}

const ArchiveDomainLazy = lazy(() =>
  import('./domains/archive/components/ArchiveDomain').then((mod) => ({ default: mod.ArchiveDomain }))
);
const LiquidationDomainLazy = lazy(() =>
  import('./domains/liquidation/components/LiquidationDomain').then((mod) => ({ default: mod.LiquidationDomain }))
);
const CierresDomainLazy = lazy(() =>
  import('./domains/cierres/components/CierresDomain').then((mod) => ({ default: mod.CierresDomain }))
);
const DashboardStatsDomainLazy = lazy(() =>
  import('./domains/dashboard-stats/components/DashboardStatsDomain').then((mod) => ({ default: mod.DashboardStatsDomain }))
);

function App() {
  // Session and scope wiring
  const enforceSessionByOperationalDay = false;
  const autoResetStateOnBusinessDayChange = false;
  const { user, userProfile, setUserProfile, loading, handleLogout } = useAuthSession(enforceSessionByOperationalDay);
  const { tick, businessDayKey, getQuickOperationalDate, applyOperationalQuickDate } = useOperationalClock();
  const currentUserRole = userProfile?.role;
  const canUseGlobalScope = userProfile?.role === 'ceo' || !!userProfile?.canLiquidate;
  const [showGlobalScope, setShowGlobalScope] = useState(false);

  // Top-level app state
  const [historyTickets, setHistoryTickets] = useState<LotteryTicket[]>([]);
  const [activeTab, setActiveTab] = useState<AppTabId>('sales');
  const [archiveUserEmail, setArchiveUserEmail] = useState('');
  const [archiveDate, setArchiveDate] = useState<string>(() => {
    const d = getBusinessDate();
    d.setDate(d.getDate() - 1);
    return format(d, 'yyyy-MM-dd');
  });
  const [archiveTickets, setArchiveTickets] = useState<LotteryTicket[]>([]);
  const [archiveInjections, setArchiveInjections] = useState<Injection[]>([]);
  const [isArchiveLoading, setIsArchiveLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isUpdatingChancePrice, setIsUpdatingChancePrice] = useState(false);

  // Access scope guards
  useEffect(() => {
    if (!userProfile) return;
    setActiveTab('sales');
  }, [userProfile?.email]);

  useEffect(() => {
    if (!canUseGlobalScope && showGlobalScope) {
      setShowGlobalScope(false);
    }
  }, [canUseGlobalScope, showGlobalScope]);

  const [historyFilter, setHistoryFilter] = useState<'TODO' | 'CHANCE' | 'BILLETE' | 'PALE'>('TODO');
  const [showTicketModal, setShowTicketModal] = useState<{ ticket: LotteryTicket, selectedLotteryName?: string } | null>(null);
  const [showLotteryModal, setShowLotteryModal] = useState<boolean>(false);
  const [historyDate, setHistoryDate] = useState(format(getBusinessDate(), 'yyyy-MM-dd'));
  const {
    canAccessManagedUsersData,
    canAccessAllUsers,
    shouldLoadUsersList,
    shouldLoadResults,
    shouldLoadLotteries,
  } = useAppDataScopes({
    activeTab,
    userRole: userProfile?.role,
    canUseGlobalScope,
    showGlobalScope,
    historyDate,
    businessDayKey,
    archiveDate,
  });
  const [editingLottery, setEditingLottery] = useState<Lottery | null>(null);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 1024 : false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof window !== 'undefined' ? window.navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setIsSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [expandedLotteries, setExpandedLotteries] = useState<string[]>([]);
  const [lotteryPages, setLotteryPages] = useState<Record<string, number>>({});
  const [editingTicketId, setEditingTicketId] = useState<string | null>(null);
  const handleUsersHookError = useCallback((error: unknown, operation: 'get' | 'list', target: string) => {
    const op = operation === 'list' ? OperationType.LIST : OperationType.GET;
    handleFirestoreError(error, op, target);
  }, []);
  const handleOperationalHookError = useCallback((error: unknown, _operation: 'get' | 'list', target: string) => {
    handleFirestoreError(error, OperationType.GET, target);
  }, []);
  const { users, setUsers } = useUsers({
    role: userProfile?.role,
    enabled: shouldLoadUsersList,
    onError: handleUsersHookError
  });
  
  const selectableUsers = useMemo(() => {
    return users.filter(u => {
      if (!u || !u.email || !u.name || u.name.trim() === '' || u.status !== 'active') return false;

      const currentEmail = userProfile?.email?.toLowerCase();
      const targetEmail = u.email?.toLowerCase();

      if (userProfile?.role === 'ceo') {
        return ['ceo', 'admin', 'seller'].includes(u.role) && targetEmail !== currentEmail;
      }

      if (userProfile?.role === 'admin') {
        return ['ceo', 'admin', 'seller'].includes(u.role) && targetEmail !== currentEmail;
      }

      return false;
    });
  }, [users, userProfile]);

  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [showInjectionModal, setShowInjectionModal] = useState(false);
  const [isInjectionOnly, setIsInjectionOnly] = useState(false);
  const [injectionTargetUserEmail, setInjectionTargetUserEmail] = useState<string>('');
  const [injectionDefaultType, setInjectionDefaultType] = useState<'injection' | 'payment' | 'debt'>('injection');
  const [injectionInitialAmount, setInjectionInitialAmount] = useState<string>('');
  const [historyInjections, setHistoryInjections] = useState<Injection[]>([]);
  const [historySettlements, setHistorySettlements] = useState<Settlement[]>([]);
  const [historyResults, setHistoryResults] = useState<LotteryResult[]>([]);
  const [liquidationTicketsSnapshot, setLiquidationTicketsSnapshot] = useState<LotteryTicket[]>([]);
  const [liquidationInjectionsSnapshot, setLiquidationInjectionsSnapshot] = useState<Injection[]>([]);
  const [liquidationResultsSnapshot, setLiquidationResultsSnapshot] = useState<LotteryResult[]>([]);
  const [liquidationSettlementsSnapshot, setLiquidationSettlementsSnapshot] = useState<Settlement[]>([]);
  const [isLiquidationDataLoading, setIsLiquidationDataLoading] = useState(false);
  const [selectedUserToLiquidate, setSelectedUserToLiquidate] = useState<string>('');
  const [liquidationDate, setLiquidationDate] = useState<string>(format(getBusinessDate(), 'yyyy-MM-dd'));
  const primaryCeoEmail = (import.meta.env.VITE_CEO_EMAIL || 'zsayeth09@gmail.com').toLowerCase();
  const isPrimaryCeoUser = (userProfile?.email || '').toLowerCase() === primaryCeoEmail;
  const operationalSellerId = (userProfile?.sellerId || '').trim();
  const historyDataCacheRef = useRef<Map<string, {
    tickets: LotteryTicket[];
    injections: Injection[];
    settlements: Settlement[];
    results: LotteryResult[];
  }>>(new Map());
  const autoCleanupRunningRef = useRef(false);
  const closedLotteryCardsCacheRef = useRef<Map<string, {
    sales: number;
    commissions: number;
    prizes: number;
    netProfit: number;
    sortedTicketsForLot: Array<{ t: LotteryTicket; prize: number }>;
  }>>(new Map());
  const ticketsRealtimeEnabled = !!user?.uid && !!userProfile?.role && activeTab === 'sales';
  const injectionsRealtimeEnabled = false;
  const settlementsRealtimeEnabled = false;

  const { tickets, setTickets } = useTickets({
    enabled: ticketsRealtimeEnabled,
    canAccessAllUsers,
    businessDayKey,
    sellerId: operationalSellerId,
    onError: handleOperationalHookError,
  });

  const {
    injections,
    setInjections,
    loading: injectionsLoading,
    error: injectionsError,
    refresh: refreshInjections,
  } = useInjections({
    enabled: injectionsRealtimeEnabled,
    canAccessAllUsers,
    businessDayKey,
    sellerId: operationalSellerId,
    onError: handleOperationalHookError,
  });

  const {
    settlements,
    setSettlements,
    loading: settlementsLoading,
    error: settlementsError,
    refresh: refreshSettlements,
  } = useSettlements({
    enabled: settlementsRealtimeEnabled,
    canAccessAllUsers,
    sellerId: operationalSellerId,
    onError: handleOperationalHookError,
  });

  useEffect(() => {
    if (userProfile && userProfile.role === 'seller' && user?.email) {
      setSelectedUserToLiquidate(user?.email || '');
      setArchiveUserEmail(user?.email || '');
    }
  }, [userProfile, user?.email]);

  const previousBusinessDayRef = useRef(businessDayKey);

  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ show: false, title: '', message: '', onConfirm: () => {} });
  const [reuseModal, setReuseModal] = useState<{
    show: boolean;
    ticket: LotteryTicket | null;
  }>({ show: false, ticket: null });
  const { selectedManageUserEmail, setSelectedManageUserEmail, saveUser, deleteUser } = useUsersDomain({
    users,
    userRole: userProfile?.role,
    currentUserEmail: userProfile?.email,
    editingUser,
    setEditingUser,
    setShowUserModal,
    setUserProfile,
    setConfirmModal,
    onDeleteError: (error, path) => handleFirestoreError(error, OperationType.DELETE, path),
  });

  // Form state
  const [number, setNumber] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [isAmountSelected, setIsAmountSelected] = useState(false);
  const [amountEntryStarted, setAmountEntryStarted] = useState(false);
  const [plAmount, setPlAmount] = useState('1.00');
  const [betType, setBetType] = useState<'CH' | 'PL' | 'BL'>('CH');
  const [chancePrice, setChancePrice] = useState<number>(0.20);
  const [personalChancePrice, setPersonalChancePrice] = useState<number>(0.20);
  const [globalChancePriceFilter, setGlobalChancePriceFilter] = useState<string>('');
  const [selectedLottery, setSelectedLottery] = useState('');
  const { lotteries } = useLotteries({
    enabled: !!user?.uid && !!userProfile?.role && shouldLoadLotteries,
    onlyActive: activeTab === 'sales',
    selectedLottery,
    setSelectedLottery,
    onError: handleOperationalHookError
  });
  const {
    results,
    setResults,
    getResultKey,
    loading: resultsLoading,
    error: resultsError,
    refresh: refreshResults,
  } = useResults({
    enabled: !!user?.uid && !!userProfile?.role && shouldLoadResults,
    businessDayKey,
    onError: handleOperationalHookError
  });

  const queryTabs = useMemo(
    () => (['results', 'stats', 'dashboard', 'history', 'liquidaciones', 'archivo', 'cierres'] as AppTabId[]),
    []
  );
  const tabNeedsPunctualRefresh = queryTabs.includes(activeTab);
  const punctualDataLoading = resultsLoading || injectionsLoading || settlementsLoading;
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);

  const runAutoRefresh = useCallback(() => {
    if (!tabNeedsPunctualRefresh) return;
    setIsAutoRefreshing(true);
    refreshResults();
    refreshInjections();
    refreshSettlements();
    window.setTimeout(() => setIsAutoRefreshing(false), 600);
  }, [refreshInjections, refreshResults, refreshSettlements, tabNeedsPunctualRefresh]);

  useEffect(() => {
    if (resultsError) toast.error(`Resultados: ${resultsError}`);
  }, [resultsError]);

  useEffect(() => {
    if (injectionsError) toast.error(`Inyecciones: ${injectionsError}`);
  }, [injectionsError]);

  useEffect(() => {
    if (settlementsError) toast.error(`Liquidaciones: ${settlementsError}`);
  }, [settlementsError]);

  useEffect(() => {
    if (!tabNeedsPunctualRefresh) return;
    runAutoRefresh();
  }, [activeTab, tabNeedsPunctualRefresh, runAutoRefresh]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        runAutoRefresh();
      }
    };
    const onOnlineRefresh = () => runAutoRefresh();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnlineRefresh);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnlineRefresh);
    };
  }, [runAutoRefresh]);

  useEffect(() => {
    if (!confirmModal.show) {
      runAutoRefresh();
    }
  }, [confirmModal.show, runAutoRefresh]);

  const mainScrollRef = useRef<HTMLElement | null>(null);
  const pullStartYRef = useRef(0);
  const pullDistanceRef = useRef(0);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const canUsePullToRefresh = tabNeedsPunctualRefresh && activeTab !== 'sales';
  const handleMainTouchStart = useCallback((event: React.TouchEvent<HTMLElement>) => {
    if (!canUsePullToRefresh || isPullRefreshing) return;
    const el = mainScrollRef.current;
    if (!el || el.scrollTop > 0) return;
    pullStartYRef.current = event.touches[0]?.clientY ?? 0;
    pullDistanceRef.current = 0;
  }, [canUsePullToRefresh, isPullRefreshing]);

  const handleMainTouchMove = useCallback((event: React.TouchEvent<HTMLElement>) => {
    if (!canUsePullToRefresh || isPullRefreshing || !pullStartYRef.current) return;
    const currentY = event.touches[0]?.clientY ?? 0;
    const delta = currentY - pullStartYRef.current;
    if (delta > 0) {
      pullDistanceRef.current = delta;
    }
  }, [canUsePullToRefresh, isPullRefreshing]);

  const handleMainTouchEnd = useCallback(() => {
    if (!canUsePullToRefresh || isPullRefreshing) return;
    if (pullDistanceRef.current > 72) {
      setIsPullRefreshing(true);
      runAutoRefresh();
      window.setTimeout(() => setIsPullRefreshing(false), 700);
    }
    pullStartYRef.current = 0;
    pullDistanceRef.current = 0;
  }, [canUsePullToRefresh, isPullRefreshing, runAutoRefresh]);

  const [cart, setCart] = useState<Bet[]>([]);
  const cartTotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + (item.type === 'CH' ? item.quantity * chancePrice : item.amount), 0);
  }, [cart, chancePrice]);
  const [multiLottery, setMultiLottery] = useState<string[]>([]);
  const [isMultipleMode, setIsMultipleMode] = useState(false);
  const [showMultiSelect, setShowMultiSelect] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [isSubmittingSale, setIsSubmittingSale] = useState(false);
  const [showFastEntryModal, setShowFastEntryModal] = useState(false);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({
    id: 'global',
    chancePrices: [
      { price: 0.20, ch1: 14, ch2: 3, ch3: 2 },
      { price: 0.25, ch1: 11, ch2: 3, ch3: 2 }
    ],
    palesEnabled: true,
    billetesEnabled: true,
    pl12Multiplier: 1000,
    pl13Multiplier: 1000,
    pl23Multiplier: 200,
    nextSellerNumber: 2
  });
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Refs for auto-focus
  const numberInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const saleInFlightRef = useRef(false);

  const [focusedField, setFocusedField] = useState<'number' | 'amount'>('number');

  const handleKeyPress = (key: string) => {
    if (focusedField === 'number') {
      if (key === '.') return; // No decimals in lottery numbers
      const maxLen = betType === 'CH' ? 2 : 4;
      if (number.length < maxLen) {
        const newNumber = number + key;
        setNumber(newNumber);
        if (newNumber.length === maxLen) {
          setFocusedField('amount');
          setAmountEntryStarted(false);
          setTimeout(() => {
            amountInputRef.current?.focus();
          }, 0);
        }
      }
    } else {
      // For amount/quantity
      const useQuantity = betType === 'CH' || betType === 'BL';
      if (key === '.') {
        const currentVal = useQuantity ? quantity : plAmount;
        if (currentVal.includes('.') || currentVal === '') return;
      }
      
      if (useQuantity) {
        if (betType === 'BL' && key === '.') return;
        if (!amountEntryStarted) {
          setQuantity(key === '.' ? '0.' : key);
          setAmountEntryStarted(true);
        } else {
          const nextQuantity = quantity + key;
          if (betType === 'BL') {
            const parsed = parseInt(nextQuantity, 10);
            if (!isNaN(parsed) && parsed > 5) return;
          }
          setQuantity(nextQuantity);
          setAmountEntryStarted(true);
        }
      } else {
        if (!amountEntryStarted) {
          setPlAmount(key === '.' ? '0.' : key);
          setAmountEntryStarted(true);
        } else {
          setPlAmount(plAmount + key);
          setAmountEntryStarted(true);
        }
      }
    }
  };

  const handleBackspace = () => {
    if (focusedField === 'number') {
      setNumber(number.slice(0, -1));
    } else {
      if (betType === 'CH' || betType === 'BL') {
        const newVal = quantity.slice(0, -1);
        setQuantity(newVal || '');
        setAmountEntryStarted(newVal.length > 0);
      } else {
        const newVal = plAmount.slice(0, -1);
        setPlAmount(newVal || '');
        setAmountEntryStarted(newVal.length > 0);
      }
    }
  };

  const handleClear = () => {
    setNumber('');
    if (betType === 'CH' || betType === 'BL') setQuantity('1');
    else setPlAmount('1.00');
    setAmountEntryStarted(false);
    setFocusedField('number');
  };

  const getBusinessDayRange = useCallback((day: string) => {
    const start = new Date(`${day}T03:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }, []);

  const getTicketDateKey = useCallback((ticket: LotteryTicket) => {
    if (ticket.timestamp?.toDate) return format(ticket.timestamp.toDate(), 'yyyy-MM-dd');
    if (ticket.timestamp?.seconds) return format(new Date(ticket.timestamp.seconds * 1000), 'yyyy-MM-dd');
    const parsed = new Date(ticket.timestamp ?? Date.now());
    return isNaN(parsed.getTime()) ? businessDayKey : format(parsed, 'yyyy-MM-dd');
  }, [businessDayKey]);

  const mergeTicketSnapshots = useCallback((...snapshots: Array<{ docs: Array<{ id: string; data: () => unknown }> } | null>) => {
    const merged = new Map<string, LotteryTicket>();
    snapshots.forEach(snapshot => {
      snapshot?.docs.forEach(ticketDoc => {
        merged.set(ticketDoc.id, { id: ticketDoc.id, ...(ticketDoc.data() as Omit<LotteryTicket, 'id'>) });
      });
    });
    return Array.from(merged.values()).sort((a, b) => {
      const aTime = a.timestamp?.toDate?.()?.getTime?.() ?? 0;
      const bTime = b.timestamp?.toDate?.()?.getTime?.() ?? 0;
      return bTime - aTime;
    });
  }, []);

  const resetOperationalStateAfterArchive = useCallback(() => {
    setTickets([]);
    setResults([]);
    setInjections([]);
    setHistoryTickets([]);
    setHistoryResults([]);
    setHistoryInjections([]);
    setLiquidationTicketsSnapshot([]);
    setLiquidationResultsSnapshot([]);
    setLiquidationInjectionsSnapshot([]);
    setLiquidationSettlementsSnapshot([]);
  }, [setInjections, setResults, setTickets]);

  const { runOperationalArchiveAndCleanup } = useOperationalArchive({
    businessDayKey,
    getBusinessDayRange,
    archivedBy: (userProfile?.email || user?.email || '').toLowerCase(),
    onResetOperationalState: resetOperationalStateAfterArchive,
  });

  useEffect(() => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const autoCleanupExecutionMinutes = 4 * 60 + 30;
    const todayKey = format(now, 'yyyy-MM-dd');
    const autoCleanupStorageKey = 'autoCleanupLastRunDate';
    const shouldRunNow = shouldRunAutoCleanupNow({
      userUid: user?.uid,
      userRole: userProfile?.role,
      isAlreadyRunning: autoCleanupRunningRef.current,
      currentMinutes,
      executionMinutes: autoCleanupExecutionMinutes,
      lastRunDate: localStorage.getItem(autoCleanupStorageKey),
      todayKey,
    });
    if (!shouldRunNow) return;

    autoCleanupRunningRef.current = true;

    (async () => {
      try {
        const targetBusinessDay = getQuickOperationalDate(-1);
        const result = await runOperationalArchiveAndCleanup({
          targetBusinessDay,
          trigger: 'automatic'
        });

        localStorage.setItem(autoCleanupStorageKey, todayKey);

        // Silencioso: no mostrar notificaciones operativas de limpieza automática al usuario.
      } catch (error) {
        console.error('Error en limpieza automática 4:30 AM:', error);
      } finally {
        autoCleanupRunningRef.current = false;
      }
    })();
  }, [getQuickOperationalDate, runOperationalArchiveAndCleanup, user?.uid, userProfile?.role, tick]);

  // 1. Static/Global Data
  useEffect(() => {
    if (!user?.uid || !userProfile?.role) return;

    let cancelled = false;
    const loadGlobalSettings = async () => {
      try {
        const snapshot = await getDoc(doc(db, 'settings', 'global'));
        if (cancelled) return;

        if (snapshot.exists()) {
          const data = snapshot.id ? { id: snapshot.id, ...snapshot.data() } as GlobalSettings : snapshot.data() as GlobalSettings;
          setGlobalSettings(data);
          return;
        }

        if (userProfile.role === 'ceo') {
          const initialSettings: GlobalSettings = {
            id: 'global',
            chancePrices: [
              { price: 5, ch1: 300, ch2: 50, ch3: 10 },
              { price: 10, ch1: 600, ch2: 100, ch3: 20 },
              { price: 20, ch1: 1200, ch2: 200, ch3: 40 }
            ],
            palesEnabled: true,
            billetesEnabled: true,
            pl12Multiplier: 1000,
            pl13Multiplier: 1000,
            pl23Multiplier: 200,
            nextSellerNumber: 1
          };
          await setDoc(doc(db, 'settings', 'global'), initialSettings);
          await setDoc(doc(db, 'public', 'connectivity'), { lastTested: serverTimestamp() });
          if (!cancelled) setGlobalSettings(initialSettings);
        }
      } catch (error) {
        console.error("Error fetching global settings:", error);
        handleFirestoreError(error, OperationType.GET, 'settings/global');
      }
    };

    void loadGlobalSettings();

    return () => {
      cancelled = true;
    };
  }, [user?.uid, userProfile?.role]);

  // 4. History Data (Conditional on Date)
  useEffect(() => {
    if (!user?.uid || !userProfile?.role || (activeTab !== 'history' && activeTab !== 'stats' && activeTab !== 'cierres')) return;
    let cancelled = false;

    const loadHistoricalData = async () => {
      const { start, end } = getBusinessDayRange(historyDate);
      const scopeKey = canAccessAllUsers ? 'global' : `seller:${operationalSellerId || 'unknown'}`;
      const cacheKey = `${historyDate}|${scopeKey}`;
      const cachedData = historyDataCacheRef.current.get(cacheKey);

      if (cachedData && historyDate !== businessDayKey) {
        if (!cancelled) {
          setHistoryTickets(cachedData.tickets);
          setHistoryInjections(cachedData.injections);
          setHistorySettlements(cachedData.settlements);
          setHistoryResults(cachedData.results);
          setResults(prev => {
            const map = new Map(prev.map(item => [`${item.lotteryName}-${item.date}-${item.id}`, item]));
            cachedData.results.forEach(item => map.set(`${item.lotteryName}-${item.date}-${item.id}`, item));
            return Array.from(map.values());
          });
        }
        return;
      }

      try {
        if (!canAccessAllUsers && !operationalSellerId) {
          if (!cancelled) {
            setHistoryTickets([]);
            setHistoryInjections([]);
            setHistorySettlements([]);
            setHistoryResults([]);
          }
          return;
        }

        if (historyDate === businessDayKey) {
          if (!cancelled) {
            setHistoryTickets(tickets);
            setHistoryInjections(injections.filter(i => i.date === historyDate));
            setHistorySettlements(settlements.filter(s => s.date === historyDate));
            setHistoryResults(results.filter(r => r.date === historyDate));
          }
          return;
        }

        if (canAccessAllUsers) {
          const [ticketSnap, injectionSnap, settlementSnap, resultSnap] = await Promise.all([
            getDocs(query(
              collection(db, 'tickets'),
              where('timestamp', '>=', start),
              where('timestamp', '<', end),
              limit(2500)
            )),
            getDocs(query(
              collection(db, 'injections'),
              where('date', '==', historyDate),
              limit(1500)
            )),
            getDocs(query(
              collection(db, 'settlements'),
              where('date', '==', historyDate),
              limit(1000)
            )),
            getDocs(query(
              collection(db, 'results'),
              where('date', '==', historyDate),
              limit(300)
            ))
          ]);

          if (!cancelled) {
            const loadedTickets = mergeTicketSnapshots(ticketSnap);
            const loadedInjections = injectionSnap.docs.map(d => ({ id: d.id, ...d.data() } as Injection));
            const loadedSettlements = settlementSnap.docs.map(d => ({ id: d.id, ...d.data() } as Settlement));
            const loadedResults = resultSnap.docs.map(d => ({ id: d.id, ...d.data() } as LotteryResult));
            setHistoryTickets(loadedTickets);
            setHistoryInjections(loadedInjections);
            setHistorySettlements(loadedSettlements);
            setHistoryResults(loadedResults);
            historyDataCacheRef.current.set(cacheKey, {
              tickets: loadedTickets,
              injections: loadedInjections,
              settlements: loadedSettlements,
              results: loadedResults
            });
            setResults(prev => {
              const map = new Map(prev.map(item => [`${item.lotteryName}-${item.date}-${item.id}`, item]));
              loadedResults.forEach(item => map.set(`${item.lotteryName}-${item.date}-${item.id}`, item));
              return Array.from(map.values());
            });
          }
          return;
        }

        const historyBySellerIdQ = query(
          collection(db, 'tickets'),
          where('sellerId', '==', operationalSellerId),
          where('timestamp', '>=', start),
          where('timestamp', '<', end),
          limit(600)
        );
        const [historyByIdSnap, injectionSnap, settlementSnap, resultSnap] = await Promise.all([
          getDocs(historyBySellerIdQ),
          operationalSellerId ? getDocs(query(
            collection(db, 'injections'),
            where('sellerId', '==', operationalSellerId),
            where('date', '==', historyDate),
            limit(500)
          )) : Promise.resolve(null),
          operationalSellerId ? getDocs(query(
            collection(db, 'settlements'),
            where('sellerId', '==', operationalSellerId),
            where('date', '==', historyDate),
            limit(300)
          )) : Promise.resolve(null),
          getDocs(query(
            collection(db, 'results'),
            where('date', '==', historyDate),
            limit(300)
          ))
        ]);

        if (!cancelled) {
          const loadedTickets = mergeTicketSnapshots(historyByIdSnap);
          const loadedInjections = injectionSnap ? injectionSnap.docs.map(d => ({ id: d.id, ...d.data() } as Injection)) : [];
          const loadedSettlements = settlementSnap ? settlementSnap.docs.map(d => ({ id: d.id, ...d.data() } as Settlement)) : [];
          const loadedResults = resultSnap.docs.map(d => ({ id: d.id, ...d.data() } as LotteryResult));
          setHistoryTickets(loadedTickets);
          setHistoryInjections(loadedInjections);
          setHistorySettlements(loadedSettlements);
          setHistoryResults(loadedResults);
          historyDataCacheRef.current.set(cacheKey, {
            tickets: loadedTickets,
            injections: loadedInjections,
            settlements: loadedSettlements,
            results: loadedResults
          });
          setResults(prev => {
            const map = new Map(prev.map(item => [`${item.lotteryName}-${item.date}-${item.id}`, item]));
            loadedResults.forEach(item => map.set(`${item.lotteryName}-${item.date}-${item.id}`, item));
            return Array.from(map.values());
          });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'historical_data');
      }
    };

    void loadHistoricalData();

    return () => {
      cancelled = true;
    };
  }, [
    activeTab,
    businessDayKey,
    canAccessAllUsers,
    getBusinessDayRange,
    historyDate,
    injections,
    mergeTicketSnapshots,
    settlements,
    tickets,
    operationalSellerId,
    userProfile?.role
  ]);

  useEffect(() => {
    if (!globalSettings.chancePrices || globalSettings.chancePrices.length === 0) return;

    const availablePrices = globalSettings.chancePrices.map(cp => cp.price);
    const hasPrice = (value: number | undefined) => value !== undefined && availablePrices.some(price => Math.abs(price - value) < 0.001);
    const preferredPrice = userProfile?.preferredChancePrice;
    const fallbackPrice = availablePrices[0];
    const nextPrice = hasPrice(preferredPrice) ? preferredPrice! : fallbackPrice;

    setChancePrice(currentPrice => (
      Math.abs(currentPrice - nextPrice) >= 0.001 ? nextPrice : currentPrice
    ));
    setPersonalChancePrice(currentPrice => (
      Math.abs(currentPrice - nextPrice) >= 0.001 ? nextPrice : currentPrice
    ));
  }, [globalSettings.chancePrices, userProfile?.preferredChancePrice]);

  const getTicketChancePrice = (ticket: LotteryTicket): number | null => {
    if (typeof ticket.chancePrice === 'number' && !Number.isNaN(ticket.chancePrice)) {
      return ticket.chancePrice;
    }

    const chanceBet = (ticket.bets || []).find(b => b.type === 'CH' && (b.quantity || 0) > 0 && (b.amount || 0) > 0);
    if (!chanceBet) return null;

    const inferredPrice = chanceBet.amount / chanceBet.quantity;
    const matchedPrice = globalSettings.chancePrices?.find(cp => Math.abs(cp.price - inferredPrice) < 0.001);
    return matchedPrice ? matchedPrice.price : Number(inferredPrice.toFixed(2));
  };

  const ticketMatchesGlobalChancePrice = (ticket: LotteryTicket) => {
    if (!canAccessAllUsers || !globalChancePriceFilter) return true;
    const ticketPrice = getTicketChancePrice(ticket);
    if (ticketPrice === null) return false;
    return Math.abs(ticketPrice - parseFloat(globalChancePriceFilter)) < 0.001;
  };

  const hasOwnUnliquidatedSalesInBusinessDay = tickets.some(t =>
    !!operationalSellerId && t.sellerId === operationalSellerId &&
    !t.liquidated
  );

  const canUpdatePersonalChancePrice = !hasOwnUnliquidatedSalesInBusinessDay;

  const getDailySequence = () => {
    const now = new Date();
    const startOfDay = new Date(now);
    // Reset at 1 AM
    if (now.getHours() < 1) {
      startOfDay.setDate(now.getDate() - 1);
    }
    startOfDay.setHours(1, 0, 0, 0);

    const dailyTickets = tickets.filter(t => {
      const tDate = t.timestamp?.toDate ? t.timestamp.toDate() : new Date();
      return tDate >= startOfDay;
    });

    const nextSeq = dailyTickets.length + 1;
    return nextSeq.toString().padStart(3, '0');
  };

  const handleSell = (e: React.FormEvent) => {
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
  };

  const confirmSale = async () => {
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

    saleInFlightRef.current = true;
    setIsSubmittingSale(true);

    const unifiedCart = unifyBets(cart);
    const totalAmount = unifiedCart.reduce((acc, item) => acc + item.amount, 0);
    const finalCustomerName = customerName.trim() || 'Cliente General';

    // Verify if any lottery in the cart is closed or has results
    for (const bet of unifiedCart) {
      const lot = lotteries.find(l => cleanText(l.name) === cleanText(bet.lottery));
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

    try {
      if (editingTicketId) {
        // Update existing ticket
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
        toast.success('¡Venta actualizada con éxito!');
      } else {
        // Create new ticket
        const sequenceNumber = getDailySequence();
        const docRef = await createTicket({
          bets: unifiedCart,
          totalAmount,
          chancePrice,
          timestamp: serverTimestamp(),
          sellerId: operationalSellerId,
          sellerCode: operationalSellerId,
          sellerEmail: user?.email?.toLowerCase(),
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
          sellerId: operationalSellerId,
          sellerCode: operationalSellerId,
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
        toast.success('¡Venta realizada con éxito!');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'tickets');
    } finally {
      saleInFlightRef.current = false;
      setIsSubmittingSale(false);
    }
  };

  const isTicketClosed = (ticket: LotteryTicket) => {
    if (!ticket.timestamp) return true;
    const ticketDate = ticket.timestamp?.toDate 
      ? ticket.timestamp.toDate() 
      : (ticket.timestamp ? new Date(ticket.timestamp) : new Date());
    if (isNaN(ticketDate.getTime())) return true; // Treat invalid dates as closed
    const now = new Date();
    
    // Definir el "día del sorteo" (que empieza a la 1 AM)
    const getLotteryDay = (date: Date) => {
      const d = new Date(date);
      d.setHours(d.getHours() - 1);
      return format(d, 'yyyy-MM-dd');
    };

    // Si no es el mismo "día de sorteo", está cerrado
    if (getLotteryDay(ticketDate) !== getLotteryDay(now)) return true;

    // Verificar cada apuesta del ticket
    return (ticket.bets || []).some(bet => {
      const lot = lotteries.find(l => cleanText(l.name) === cleanText(bet.lottery));
      if (!lot || !lot.closingTime) return false;

      let currentHour = now.getHours();
      const currentMinutes = now.getMinutes();
      const adjustedHour = currentHour < 1 ? currentHour + 24 : currentHour;
      const currentTimeVal = adjustedHour * 60 + currentMinutes;

      let [closeH, closeM] = lot.closingTime.split(':').map(Number);
      const adjustedCloseH = closeH < 1 ? closeH + 24 : closeH;
      const closeTimeVal = adjustedCloseH * 60 + closeM;

      return currentTimeVal >= closeTimeVal;
    });
  };

  const isTicketHasResults = (ticket: LotteryTicket) => {
    const ticketDate = ticket.timestamp?.toDate ? format(ticket.timestamp.toDate(), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
    return (ticket.bets || []).some(bet => {
      return results.some(r => cleanText(r.lotteryName) === cleanText(bet.lottery) && r.date === ticketDate);
    });
  };

  const getTicketPrizesFromSource = useCallback((
    ticket: LotteryTicket,
    resultsSource: LotteryResult[],
    filterLottery?: string,
    typeFilter?: string
  ) => {
    return calculateTicketPrizesFromSource({
      ticket,
      resultsSource,
      globalSettings,
      getTicketDateKey,
      cleanText,
      filterLottery,
      typeFilter,
    });
  }, [getTicketDateKey, globalSettings, cleanText]);

  const getTicketPrizes = useCallback((ticket: LotteryTicket, filterLottery?: string, typeFilter?: string) => {
    return getTicketPrizesFromSource(ticket, results, filterLottery, typeFilter);
  }, [getTicketPrizesFromSource, results]);

  const buildFinancialSummary = useCallback((params: {
    tickets: LotteryTicket[];
    injections: Injection[];
    settlements?: Settlement[];
    userEmail?: string;
    targetDate?: string;
    prizeResolver?: (ticket: LotteryTicket) => { totalPrize: number };
  }) => {
    const {
      tickets: sourceTickets,
      injections: sourceInjections,
      settlements: sourceSettlements = [],
      userEmail,
      targetDate,
      prizeResolver = (ticket: LotteryTicket) => getTicketPrizes(ticket)
    } = params;

    return calculateFinancialSummary({
      tickets: sourceTickets,
      injections: sourceInjections,
      settlements: sourceSettlements,
      userEmail,
      targetDate,
      prizeResolver,
      getTicketDateKey,
    });
  }, [getTicketDateKey, getTicketPrizes]);

  const getOperationalTimeSortValue = useCallback((time: string) => {
    const [h, m] = time.split(':').map(Number);
    let val = h * 60 + m;
    if (val < 11 * 60) {
      val += 24 * 60; // Keep early-morning draws after late-night draws
    }
    return val;
  }, []);

  const sortedLotteries = [...lotteries].sort((a, b) => {
    return getOperationalTimeSortValue(a.drawTime || '00:00') - getOperationalTimeSortValue(b.drawTime || '00:00');
  });
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
  const {
    canManageResults,
    isCeoUser,
    editingResult,
    setEditingResult,
    resultFormDate,
    setResultFormDate,
    resultFormLotteryId,
    setResultFormLotteryId,
    resultFormFirstPrize,
    setResultFormFirstPrize,
    resultFormSecondPrize,
    setResultFormSecondPrize,
    resultFormThirdPrize,
    setResultFormThirdPrize,
    availableResultLotteries,
    visibleResults,
    resultStatusMap,
    cancelResultEdition,
    handleCreateResultFromForm,
    deleteResult,
    lotteryById,
  } = useResultsDomain({
    userRole: userProfile?.role,
    businessDayKey,
    results,
    sortedLotteries,
    tickets,
    currentSellerId: operationalSellerId,
    getOperationalTimeSortValue,
    cleanText,
    getResultKey,
    getTicketDateKey,
    getTicketPrizesFromSource,
    setConfirmModal,
    onError: (error, operation, path) => {
      const op = operation === 'create'
        ? OperationType.CREATE
        : operation === 'update'
          ? OperationType.UPDATE
          : OperationType.DELETE;
      handleFirestoreError(error, op, path);
    },
  });

  const cancelTicket = async (ticketOrId: LotteryTicket | string, selectedLotteryName?: string) => {
    const ticket = typeof ticketOrId === 'string'
      ? tickets.find(t => t.id === ticketOrId)
      : ticketOrId;
    if (!ticket) return;
    const id = ticket.id;

    if (ticket.sellerEmail?.toLowerCase() !== user?.email?.toLowerCase()) {
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
      const selectedBets = allBets.filter((bet) => normalizePlainText(bet?.lottery || '') === lotKey);
      if (selectedBets.length === 0) {
        setConfirmModal({
          show: true,
          title: 'Borrar Venta',
          message: '¿Está seguro de borrar esta venta? Se eliminará permanentemente de la base de datos.',
          onConfirm: async () => {
            try {
              await deleteTicketById(id);
              toast.success('Venta eliminada correctamente');
            } catch (error) {
              handleFirestoreError(error, OperationType.DELETE, `tickets/${id}`);
            }
          }
        });
        return;
      }

      const choice = window.prompt(
        `Ticket multiple detectado para ${cleanText(selectedLotteryName || '')}.\n` +
        `1 = Eliminar solo este sorteo\n` +
        `2 = Eliminar ticket completo\n` +
        `Escribe 1 o 2`
      );

      if (choice === null) return;
      const normalizedChoice = choice.trim();

      if (normalizedChoice === '1') {
        const remainingBets = allBets.filter((bet) => normalizePlainText(bet?.lottery || '') !== lotKey);
        if (remainingBets.length === 0) {
          setConfirmModal({
            show: true,
            title: 'Borrar Ticket',
            message: 'Al eliminar este sorteo, el ticket queda sin apuestas. ¿Deseas eliminar el ticket completo?',
            onConfirm: async () => {
              try {
                await deleteTicketById(id);
                toast.success('Ticket eliminado correctamente');
              } catch (error) {
                handleFirestoreError(error, OperationType.DELETE, `tickets/${id}`);
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

          toast.success('Se eliminó solo el sorteo seleccionado del ticket');
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `tickets/${id}`);
        }
        return;
      }

      if (normalizedChoice === '2') {
        setConfirmModal({
          show: true,
          title: 'Borrar Ticket Completo',
          message: '¿Está seguro de borrar el ticket completo? Se eliminarán todos sus sorteos.',
          onConfirm: async () => {
            try {
              await deleteTicketById(id);
              toast.success('Ticket completo eliminado correctamente');
            } catch (error) {
              handleFirestoreError(error, OperationType.DELETE, `tickets/${id}`);
            }
          }
        });
        return;
      }

      toast.error('Opcion invalida. Escribe 1 o 2.');
      return;
    }

    setConfirmModal({
      show: true,
      title: 'Borrar Venta',
      message: '¿Está seguro de borrar esta venta? Se eliminará permanentemente de la base de datos.',
      onConfirm: async () => {
        try {
          await deleteTicketById(id);
          toast.success('Venta eliminada correctamente');
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `tickets/${id}`);
        }
      }
    });
  };

  const handleNativeShare = async (ticket: LotteryTicket, lotteryName?: string) => {
    if (!ticket) return;
    
    const ticketId = ticket.id.slice(0, 8).toUpperCase();
    const date = ticket.timestamp && typeof ticket.timestamp.toDate === 'function' 
      ? format(ticket.timestamp.toDate(), 'dd/MM/yyyy HH:mm') 
      : format(new Date(), 'dd/MM/yyyy HH:mm');
    
    let message = `*CHANCE PRO - TICKET DE LOTERÍA*\n`;
    message += `--------------------------------\n`;
    message += `*Ticket:* #${ticketId}\n`;
    message += `*Vendedor:* ${ticket.sellerCode || '---'}\n`;
    message += `*Fecha:* ${date}\n`;
    message += `--------------------------------\n`;
    
    const betsToShare = lotteryName
      ? (ticket.bets || []).filter(b => b.lottery === lotteryName)
      : (ticket.bets || []);

    if (betsToShare.length === 0) return;

    betsToShare.forEach((bet, idx) => {
      message += `${idx + 1}. ${cleanText(bet.lottery)} - ${bet.type} ${bet.number} - $${bet.amount}\n`;
    });
    
    const totalAmount = betsToShare.reduce((sum, b) => sum + (b.amount || 0), 0);
    
    message += `--------------------------------\n`;
    message += `*TOTAL:* $${totalAmount.toFixed(2)} USD\n`;
    message += `--------------------------------\n`;
    message += `_¡Buena Suerte!_`;

    const shareData = {
      title: 'Ticket de Lotería - Chance Pro',
      text: message
    };

    const fallbackToWhatsApp = async () => {
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
      try {
        await navigator.clipboard.writeText(message);
        toast.success('Abriendo WhatsApp... (Texto copiado)');
      } catch (err) {
        // Ignore clipboard error
      }
    };

    if (navigator.share && (navigator.canShare ? navigator.canShare(shareData) : true)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error(err);
          await fallbackToWhatsApp();
        }
      }
    } else {
      await fallbackToWhatsApp();
    }
  };

  const reuseTicket = (ticket: LotteryTicket) => {
    if (ticket.sellerEmail?.toLowerCase() !== user?.email?.toLowerCase()) {
      toast.error('No tienes permiso para reutilizar esta venta. Solo el seller original puede hacerlo.');
      return;
    }
    setReuseModal({ show: true, ticket });
  };

  const handleReuseSelect = (lotteryName: string) => {
    if (!reuseModal.ticket) return;
    const newBets = reuseModal.ticket.bets.map(b => ({ ...b, lottery: lotteryName }));
    
    setCart(prevCart => {
      const combined = [...prevCart, ...newBets];
      return unifyBets(combined);
    });
    
    setActiveTab('sales');
    toast.info(`Lista duplicada y unificada para ${cleanText(lotteryName)}`);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      toast.error('Por favor, complete todos los campos');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
        toast.success('Contraseña actualizada correctamente');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        throw new Error('No hay un usuario autenticado');
      }
    } catch (error: any) {
      console.error('Error updating password:', error);
      if (error.code === 'auth/requires-recent-login') {
        toast.error('Por seguridad, debe cerrar sesión e iniciarla de nuevo para cambiar su contraseña.');
      } else {
        toast.error(`Error: ${error.message || 'No se pudo actualizar la contraseña'}`);
      }
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleUpdateChancePrice = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userProfile?.email) {
      toast.error('No hay un usuario autenticado');
      return;
    }

     if (!canUpdatePersonalChancePrice) {
      toast.error('Solo puedes cambiar este precio antes de tu primera venta del día o después de ser liquidado');
      return;
    }

    const selectedConfig = globalSettings.chancePrices?.find(cp => Math.abs(cp.price - personalChancePrice) < 0.001);
    if (!selectedConfig) {
      toast.error('Seleccione un precio de chance válido');
      return;
    }

    setIsUpdatingChancePrice(true);
    try {
      await updatePreferredChancePrice(userProfile.email.toLowerCase(), selectedConfig.price);

      const updatedProfile = {
        ...userProfile,
        preferredChancePrice: selectedConfig.price
      };

      setUserProfile(updatedProfile);
      setChancePrice(selectedConfig.price);
      setPersonalChancePrice(selectedConfig.price);
      toast.success('Precio de chance actualizado');
    } catch (error: any) {
      console.error('Error updating chance price:', error);
      toast.error(`Error: ${error.message || 'No se pudo actualizar el precio de chance'}`);
    } finally {
      setIsUpdatingChancePrice(false);
    }
  };
  const editTicket = async (ticket: LotteryTicket) => {
    if (ticket.sellerEmail?.toLowerCase() !== user?.email?.toLowerCase()) {
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
        toast.info('Modo edici?n activado. Realice los cambios y genere el ticket para actualizar.');
      }
    });
  };

  const cancelEdit = () => {
    setEditingTicketId(null);
    setCart([]);
    setCustomerName('');
    toast.info('Edición cancelada');
  };

  const editCartItem = (idx: number) => {
    const item = cart[idx];
    setNumber(item.number);
    setBetType(item.type);
    if (item.type === 'CH') {
      setQuantity(item.quantity.toString());
      setChancePrice((item.amount / item.quantity) as 0.20 | 0.25);
    } else {
      setPlAmount((item.amount / item.quantity).toString());
      setQuantity(item.quantity.toString());
    }
    setSelectedLottery(item.lottery);
    removeFromCart(idx);
    toast.info('Apuesta cargada para editar');
  };

  const { saveLottery, toggleLotteryActive, deleteLottery } = useGeneralConfigDomain({
    userRole: userProfile?.role,
    lotteries,
    editingLottery,
    setEditingLottery,
    setShowLotteryModal,
    setConfirmModal: updater => setConfirmModal(prev => updater(prev)),
    normalizeLotteryName,
    onError: (error, operation, path) => {
      const op = operation === 'create'
        ? OperationType.CREATE
        : operation === 'update'
          ? OperationType.UPDATE
          : OperationType.DELETE;
      handleFirestoreError(error, op, path);
    },
  });

  const recentOperationalDates = useMemo(() => {
    const collected = new Set<string>([
      businessDayKey,
      getQuickOperationalDate(-1),
      getQuickOperationalDate(-2),
      getQuickOperationalDate(-3)
    ]);

    const collectTicketDate = (ticket: LotteryTicket) => collected.add(getTicketDateKey(ticket));

    tickets.forEach(collectTicketDate);
    historyTickets.forEach(collectTicketDate);
    archiveTickets.forEach(collectTicketDate);
    injections.forEach(injection => injection.date && collected.add(injection.date));
    historyInjections.forEach(injection => injection.date && collected.add(injection.date));
    settlements.forEach(settlement => settlement.date && collected.add(settlement.date));
    historySettlements.forEach(settlement => settlement.date && collected.add(settlement.date));

    return Array.from(collected).sort((a, b) => b.localeCompare(a)).slice(0, 14);
  }, [
    archiveTickets,
    businessDayKey,
    getQuickOperationalDate,
    getTicketDateKey,
    historyInjections,
    historySettlements,
    historyTickets,
    injections,
    settlements,
    tickets
  ]);

  const {
    consolidatedMode,
    setConsolidatedMode,
    consolidatedReportDate,
    setConsolidatedReportDate,
    consolidatedStartDate,
    setConsolidatedStartDate,
    consolidatedEndDate,
    setConsolidatedEndDate,
    isGeneratingYesterdayReport,
    liquidacionQuickDateOptions,
    amountPaid,
    setAmountPaid,
    selectedLiquidationSettlement,
    liquidationPreview,
    handleLiquidate,
    generateConsolidatedReport,
  } = useLiquidationDomain({
    businessDayKey,
    users,
    tickets,
    injections,
    results,
    settlements,
    userProfile,
    isPrimaryCeoUser,
    getQuickOperationalDate,
    recentOperationalDates,
    getBusinessDayRange,
    buildFinancialSummary,
    getTicketPrizesFromSource,
    liquidationDate,
    setLiquidationDate,
    selectedUserToLiquidate,
    setSelectedUserToLiquidate,
    liquidationTicketsSnapshot,
    liquidationInjectionsSnapshot,
    liquidationResultsSnapshot,
    liquidationSettlementsSnapshot,
    setLiquidationSettlementsSnapshot,
    isLiquidationDataLoading,
    setTickets,
    setInjections,
    setConfirmModal,
    onError: handleFirestoreError,
  });

  const handleDeleteAllSalesData = () => {
    if (!userProfile || !['ceo', 'admin'].includes(userProfile.role)) {
      alert('No tienes permisos para ejecutar limpieza operativa');
      return;
    }

    setConfirmModal({
      show: true,
      title: 'Archivar y Limpiar Día Operativo',
      message: 'Se archivarán los datos del día operativo actual y luego se limpiarán tickets, resultados e inyecciones operativas. ¿Deseas continuar?',
      onConfirm: async () => {
        try {
          const result = await runOperationalArchiveAndCleanup({
            targetBusinessDay: businessDayKey,
            trigger: 'manual'
          });

          if (result.deletedCount > 0 || !result.archiveAlreadyExists) {
            toast.success('Archivo diario creado y limpieza operativa completada');
          } else {
            toast.info('El archivo diario ya existía y no había datos pendientes por limpiar');
          }
        } catch (error) {
          console.error('Error archivando datos operativos:', error);
          toast.error('No se pudo crear el archivo diario. No se realizó limpieza.');
        }
      }
    });
  };

  const applyLotteryToCart = (lotteryName: string) => {
    if (!lotteryName) return;
    setCart(cart.map(item => ({ ...item, lottery: lotteryName })));
    toast.success(`Lotería ${cleanText(lotteryName)} aplicada a todo el pedido`);
  };

  const downloadDataUrlFile = (dataUrl: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = fileName;
    link.click();
  };

  const shareImageDataUrl = async ({
    dataUrl,
    fileName,
    title,
    text,
    dialogTitle
  }: {
    dataUrl: string;
    fileName: string;
    title: string;
    text: string;
    dialogTitle: string;
  }) => {
    let shared = false;

    if (Capacitor.isNativePlatform()) {
      try {
        const imageBase64 = dataUrl.split(',')[1];
        const savedFile = await Filesystem.writeFile({
          path: fileName,
          data: imageBase64,
          directory: Directory.Cache
        });

        try {
          await Share.share({
            title,
            text,
            files: [savedFile.uri],
            dialogTitle
          });
          shared = true;
        } catch (shareWithFilesErr) {
          console.log('Native share with files failed, trying url fallback', shareWithFilesErr);
          await Share.share({
            title,
            text,
            url: savedFile.uri,
            dialogTitle
          });
          shared = true;
        }
      } catch (nativeErr) {
        console.log('Native image share unavailable', nativeErr);
      }
    }

    if (!shared && typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const mimeType = blob.type || (fileName.toLowerCase().endsWith('.jpg') || fileName.toLowerCase().endsWith('.jpeg') ? 'image/jpeg' : 'image/png');
        const extension = mimeType === 'image/jpeg' ? 'jpg' : 'png';
        const normalizedName = fileName.toLowerCase().endsWith(`.${extension}`) ? fileName : `${fileName}.${extension}`;
        const file = new File([blob], normalizedName, { type: mimeType });
        const payload = { title, text, files: [file] };

        if (!navigator.canShare || navigator.canShare(payload)) {
          await navigator.share(payload);
          shared = true;
        }
      } catch (webErr) {
        console.log('Web share with files unavailable', webErr);
      }
    }

    return shared;
  };

  const todayStr = businessDayKey;

  const todayStats = useMemo(() => {
    const todayTickets = tickets.filter(t => {
      const tDate = getTicketDateKey(t);
      const matchesDate = tDate === todayStr;
      const matchesUser = canAccessAllUsers || (!!operationalSellerId && t.sellerId === operationalSellerId);
      // Keep daily fixed markers stable through liquidations: include any non-cancelled ticket.
      return matchesDate && matchesUser && t.status !== 'cancelled';
    });
    const todayInjections = injections.filter(i => i.date === todayStr && (canAccessAllUsers || (!!operationalSellerId && i.sellerId === operationalSellerId)));
    const summary = buildFinancialSummary({
      tickets: todayTickets,
      injections: todayInjections,
      targetDate: todayStr
    });
    const bankProfit = summary.totalSales - summary.totalCommissions - summary.totalPrizes;
    const pendingDebt = userProfile?.currentDebt || 0;

    return {
      sales: summary.totalSales,
      commissions: summary.totalCommissions,
      prizes: summary.totalPrizes,
      injections: summary.totalInjections,
      bankProfit,
      netProfit: summary.netProfit,
      pendingDebt
    };
  }, [buildFinancialSummary, canAccessAllUsers, getTicketDateKey, injections, tickets, todayStr, operationalSellerId, userProfile]);

  const groupedSettlements = useMemo(() => {
    const groups: { [email: string]: { [date: string]: Settlement[] } } = {};
    settlements.forEach(s => {
      if (!groups[s.userEmail]) groups[s.userEmail] = {};
      if (!groups[s.userEmail][s.date]) groups[s.userEmail][s.date] = [];
      groups[s.userEmail][s.date].push(s);
    });
    return groups;
  }, [settlements]);

  const filteredTickets = useMemo(() => {
    const todayStr = businessDayKey;
    const source = activeTab === 'history' 
      ? (historyDate === todayStr ? tickets : historyTickets)
      : tickets;

    return source.filter(t => {
      const tDate = t.timestamp?.toDate ? t.timestamp.toDate() : (t.timestamp?.seconds ? new Date(t.timestamp.seconds * 1000) : new Date());
      const ticketDate = format(tDate, 'yyyy-MM-dd');
      const matchesDate = activeTab === 'history' ? ticketDate === historyDate : true;
      
      const matchesUser = canAccessAllUsers || (!!operationalSellerId && t.sellerId === operationalSellerId);

      const matchesSearch = t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.bets && t.bets.some(b => b && b.number && b.number.includes(searchTerm))) ||
        (t.bets && t.bets.some(b => b && b.lottery && b.lottery.toLowerCase().includes(searchTerm.toLowerCase())));
      return matchesDate && matchesSearch && matchesUser;
    }).sort((a, b) => {
      const timeA = a.timestamp?.seconds || 0;
      const timeB = b.timestamp?.seconds || 0;
      return timeB - timeA;
    });
  }, [activeTab, businessDayKey, canAccessAllUsers, historyTickets, tickets, historyDate, searchTerm, userProfile, user?.uid, user?.email]);

  const historyTypeFilterCode = useMemo(() => {
    return historyFilter === 'CHANCE' ? 'CH' :
           historyFilter === 'BILLETE' ? 'BL' :
           historyFilter === 'PALE' ? 'PL' : undefined;
  }, [historyFilter]);

  const historyLotteryCards = useMemo(() => {
    if (activeTab !== 'history') return [];

    return sortedLotteries.map(lot => {
      const ticketsForLot = filteredTickets.filter(ticket =>
        ticket.bets && ticket.bets.some(bet => bet && cleanText(bet.lottery) === cleanText(lot.name) && (!historyTypeFilterCode || bet.type === historyTypeFilterCode))
      );
      if (!ticketsForLot.length) return null;

      const resultForLottery = results.find(result => result.lotteryId === lot.id && result.date === historyDate);
      const isClosedWithResult = !isLotteryOpenForSales(lot) && !!resultForLottery;
      const resultSignature = resultForLottery
        ? `${resultForLottery.firstPrize}-${resultForLottery.secondPrize}-${resultForLottery.thirdPrize}`
        : 'no-result';
      const scopeSignature = canAccessAllUsers ? 'global' : `seller:${(user?.email || user?.uid || '').toLowerCase()}`;
      const cacheKey = `${historyDate}|${lot.id}|${historyTypeFilterCode || 'ALL'}|${scopeSignature}|${resultSignature}`;

      let cachedCard = isClosedWithResult ? closedLotteryCardsCacheRef.current.get(cacheKey) : undefined;
      if (!cachedCard) {
        const sales = ticketsForLot.reduce((acc, ticket) => {
          const lotBets = (ticket.bets || []).filter(bet => bet && cleanText(bet.lottery) === cleanText(lot.name) && (!historyTypeFilterCode || bet.type === historyTypeFilterCode));
          return acc + lotBets.reduce((sum, bet) => sum + (bet.amount || 0), 0);
        }, 0);
        const commissions = ticketsForLot.reduce((acc, ticket) => {
          const lotBets = (ticket.bets || []).filter(bet => bet && cleanText(bet.lottery) === cleanText(lot.name) && (!historyTypeFilterCode || bet.type === historyTypeFilterCode));
          const lotSales = lotBets.reduce((sum, bet) => sum + (bet.amount || 0), 0);
          return acc + (lotSales * (ticket.commissionRate || 0) / 100);
        }, 0);
        const sortedTicketsForLot = ticketsForLot
          .map(ticket => ({ t: ticket, prize: getTicketPrizes(ticket, lot.name, historyTypeFilterCode).totalPrize }))
          .sort((a, b) => b.prize - a.prize);
        const prizes = sortedTicketsForLot.reduce((sum, item) => sum + item.prize, 0);
        const netProfit = sales - commissions - prizes;

        cachedCard = { sales, commissions, prizes, netProfit, sortedTicketsForLot };
        if (isClosedWithResult) {
          closedLotteryCardsCacheRef.current.set(cacheKey, cachedCard);
        }
      }

      const currentPage = lotteryPages[lot.id] || 1;
      const itemsPerPage = 4;
      const totalPages = Math.max(1, Math.ceil(cachedCard.sortedTicketsForLot.length / itemsPerPage));
      const paginatedTickets = cachedCard.sortedTicketsForLot.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

      return {
        lot,
        ticketsForLot,
        resultForLottery,
        isClosedWithResult,
        sales: cachedCard.sales,
        prizes: cachedCard.prizes,
        netProfit: cachedCard.netProfit,
        isLoss: cachedCard.netProfit < 0,
        sortedTicketsForLot: cachedCard.sortedTicketsForLot,
        currentPage,
        totalPages,
        paginatedTickets
      };
    }).filter((item): item is NonNullable<typeof item> => !!item);
  }, [activeTab, canAccessAllUsers, filteredTickets, getTicketPrizes, historyDate, historyTypeFilterCode, isLotteryOpenForSales, lotteryPages, results, sortedLotteries, user?.email, user?.uid]);

  const historyStats = useMemo(() => {
    if (activeTab !== 'history') return null;
    
    const hTickets = filteredTickets.filter(t => (t.status === 'active' || t.status === 'winner'));
    
    const sales = hTickets.reduce((acc, t) => {
      const lotBets = (t.bets || []);
      return acc + lotBets.reduce((sum, b) => sum + (b.amount || 0), 0);
    }, 0);

    const commissions = hTickets.reduce((acc, t) => {
      const lotBets = (t.bets || []);
      const lotSales = lotBets.reduce((sum, b) => sum + (b.amount || 0), 0);
      return acc + (lotSales * (t.commissionRate || 0) / 100);
    }, 0);

    const prizes = hTickets.reduce((acc, t) => {
      const { totalPrize } = getTicketPrizes(t);
      return acc + (totalPrize || 0);
    }, 0);

    const summary = buildFinancialSummary({
      tickets: hTickets,
      injections: historyInjections,
      targetDate: historyDate
    });
    const bankProfit = summary.totalSales - summary.totalCommissions - summary.totalPrizes;

    return {
      sales: summary.totalSales,
      commissions: summary.totalCommissions,
      prizes: summary.totalPrizes,
      injections: summary.totalInjections,
      bankProfit,
      netProfit: summary.netProfit
    };
  }, [activeTab, buildFinancialSummary, filteredTickets, historyDate, historyInjections]);

  const { fetchArchiveData, fetchUserOperationalDataByDate } = useArchiveDomain({
    activeTab,
    archiveDate,
    archiveUserEmail,
    businessDayKey,
    buildFinancialSummary,
    getBusinessDayRange,
    mergeTicketSnapshots,
    operationalSellerId,
    injections,
    settlements,
    tickets,
    liquidationDate,
    selectedUserToLiquidate,
    setArchiveInjections,
    setArchiveTickets,
    setIsArchiveLoading,
    setIsLiquidationDataLoading,
    setLiquidationInjectionsSnapshot,
    setLiquidationResultsSnapshot,
    setLiquidationSettlementsSnapshot,
    setLiquidationTicketsSnapshot,
    setResults,
  });

  const {
    recoveryDate,
    setRecoveryDate,
    recoveryTickets,
    setRecoveryTickets,
    isRecoveryLoading,
    recoverySavingRowId,
    setRecoverySavingRowId,
    recoveryDeletingRowId,
    setRecoveryDeletingRowId,
    recoverySellerFilter,
    setRecoverySellerFilter,
    recoveryLotteryFilter,
    setRecoveryLotteryFilter,
    recoveryTicketIdFilter,
    setRecoveryTicketIdFilter,
    recoveryStatusFilter,
    setRecoveryStatusFilter,
    recoverySortOrder,
    setRecoverySortOrder,
    recoveryTargetLotteryByRow,
    setRecoveryTargetLotteryByRow,
    recoveryTargetLotteryMapByRow,
    setRecoveryTargetLotteryMapByRow,
    recoveryAvailableLotteries,
    filteredRecoveryTickets,
    getRecoveryTicketLotteryLabel,
    getRecoveryTicketLotteryNames,
    parseTicketTimestampMs,
    fetchRecoveryData,
  } = useRecovery({
    userRole: userProfile?.role,
    activeTab,
    initialRecoveryDate: businessDayKey,
    lotteries,
    getOperationalTimeSortValue,
    getBusinessDayRange,
    cleanText,
    normalizePlainText,
  });

  useEffect(() => {
    if (!autoResetStateOnBusinessDayChange) {
      previousBusinessDayRef.current = businessDayKey;
      return;
    }
    if (previousBusinessDayRef.current === businessDayKey) return;

    const previousBusinessDay = previousBusinessDayRef.current;
    previousBusinessDayRef.current = businessDayKey;

    setTickets([]);
    setHistoryTickets([]);
    setArchiveTickets([]);
    setArchiveInjections([]);
    setInjections([]);
    setSettlements([]);
    setHistoryInjections([]);
    setHistorySettlements([]);
    setHistoryResults([]);
    setLiquidationTicketsSnapshot([]);
    setLiquidationInjectionsSnapshot([]);
    setLiquidationResultsSnapshot([]);
    historyDataCacheRef.current.clear();
    closedLotteryCardsCacheRef.current.clear();

    if (historyDate === previousBusinessDay) setHistoryDate(businessDayKey);
    if (archiveDate === previousBusinessDay) setArchiveDate(businessDayKey);
    if (liquidationDate === previousBusinessDay) setLiquidationDate(businessDayKey);
    if (recoveryDate === previousBusinessDay) setRecoveryDate(businessDayKey);

    if (userProfile?.role === 'seller' && user?.email) {
      setArchiveUserEmail(user.email.toLowerCase());
      setSelectedUserToLiquidate(user.email.toLowerCase());
    }

    toast.info(`Nuevo día operativo iniciado: ${businessDayKey}`);
  }, [archiveDate, autoResetStateOnBusinessDayChange, businessDayKey, historyDate, liquidationDate, recoveryDate, user?.email, userProfile?.role, setInjections, setRecoveryDate, setSettlements, setTickets]);

  const saveRecoveryLotteryChange = useCallback(async (ticket: RecoveryTicketRecord) => {
    if (userProfile?.role !== 'ceo') {
      toast.error('Acceso restringido');
      return;
    }

    const ticketLotteries = getRecoveryTicketLotteryNames(ticket);
    const isMultipleTicket = ticketLotteries.length > 1;

    const targetBySource = new Map<string, Lottery>();
    if (isMultipleTicket) {
      const selectedMap = recoveryTargetLotteryMapByRow[ticket.rowId] || {};
      for (const sourceLottery of ticketLotteries) {
        const selectedLotteryId = selectedMap[sourceLottery];
        if (!selectedLotteryId) {
          toast.error('Debes seleccionar destino para cada sorteo del ticket multiple');
          return;
        }
        const selectedLottery = recoveryAvailableLotteries.find(l => l.id === selectedLotteryId);
        if (!selectedLottery) {
          toast.error(`Sorteo destino invalido para ${sourceLottery}`);
          return;
        }
        targetBySource.set(sourceLottery, selectedLottery);
      }
    } else {
      const targetLotteryId = recoveryTargetLotteryByRow[ticket.rowId];
      if (!targetLotteryId) {
        toast.error('Selecciona un sorteo destino');
        return;
      }
      const targetLottery = recoveryAvailableLotteries.find(l => l.id === targetLotteryId);
      if (!targetLottery) {
        toast.error('El sorteo destino no existe');
        return;
      }
      const sourceLottery = ticketLotteries[0] || ((ticket.bets || [])[0]?.lottery || '').trim();
      targetBySource.set(sourceLottery, targetLottery);
    }

    setRecoverySavingRowId(ticket.rowId);
    try {
      const targetBySourceKey = new Map<string, Lottery>();
      targetBySource.forEach((targetLottery, sourceLottery) => {
        targetBySourceKey.set(normalizePlainText(sourceLottery), targetLottery);
      });

      const updatedBets = (ticket.bets || []).map(bet => {
        const sourceLotteryKey = normalizePlainText(bet.lottery || '');
        const mappedLottery = targetBySourceKey.get(sourceLotteryKey);
        if (!mappedLottery) return bet;
        return { ...bet, lottery: mappedLottery.name };
      });

      const uniqueTargetIds = Array.from(new Set(Array.from(targetBySource.values()).map(lottery => lottery.id)));
      const singleTargetLottery = uniqueTargetIds.length === 1
        ? recoveryAvailableLotteries.find(l => l.id === uniqueTargetIds[0]) || null
        : null;

      const optionalFields: Record<string, any> = {};
      const textFields = ['lotteryName', 'drawName', 'lottery', 'draw', 'selectedLottery', 'lotteryLabel', 'drawLabel'];
      const idFields = ['lotteryId', 'drawId', 'selectedLotteryId'];
      const timeFields = ['lotteryTime', 'drawTime'];

      if (singleTargetLottery) {
        textFields.forEach(field => {
          if (Object.prototype.hasOwnProperty.call(ticket.raw, field)) optionalFields[field] = singleTargetLottery.name;
        });
        idFields.forEach(field => {
          if (Object.prototype.hasOwnProperty.call(ticket.raw, field)) optionalFields[field] = singleTargetLottery.id;
        });
        timeFields.forEach(field => {
          if (Object.prototype.hasOwnProperty.call(ticket.raw, field)) optionalFields[field] = singleTargetLottery.drawTime || '';
        });
      }

      const updatePayload = {
        bets: updatedBets,
        ...optionalFields,
        recoveryUpdatedAt: serverTimestamp(),
        recoveryUpdatedBy: userProfile.email || ''
      };

      if (ticket.source === 'tickets') {
        await updateRecoveryLiveTicket(ticket.id, updatePayload);
      } else {
        if (!ticket.archiveDate) throw new Error('archiveDate requerido para editar ticket archivado');
        await updateRecoveryArchivedTicket({
          archiveDate: ticket.archiveDate,
          ticketId: ticket.id,
          updatePayload,
          updatedBy: userProfile.email || '',
        });
      }

      setRecoveryTickets(prev => prev.map(item => (
        item.rowId === ticket.rowId
          ? {
              ...item,
              bets: updatedBets,
              raw: { ...item.raw, ...optionalFields, bets: updatedBets }
            }
          : item
      )));

      const applyTicketUpdate = (row: LotteryTicket): LotteryTicket => (
        row.id === ticket.id
          ? { ...row, bets: updatedBets, ...optionalFields }
          : row
      );
      setTickets(prev => prev.map(applyTicketUpdate));
      setHistoryTickets(prev => prev.map(applyTicketUpdate));
      setArchiveTickets(prev => prev.map(applyTicketUpdate));
      setLiquidationTicketsSnapshot(prev => prev.map(applyTicketUpdate));

      historyDataCacheRef.current.clear();
      closedLotteryCardsCacheRef.current.clear();
      await fetchRecoveryData();

      if (singleTargetLottery) {
        toast.success(`Ticket ${ticket.id.slice(0, 8)} movido a ${cleanText(singleTargetLottery.name)}`);
      } else {
        toast.success(`Ticket ${ticket.id.slice(0, 8)} actualizado (multi-sorteo) y sistema recalculado`);
      }
    } catch (error) {
      console.error('Error updating recovery ticket:', error);
      toast.error('No se pudo guardar el cambio de sorteo');
    } finally {
      setRecoverySavingRowId(null);
    }
  }, [fetchRecoveryData, getRecoveryTicketLotteryNames, recoveryAvailableLotteries, recoveryTargetLotteryByRow, recoveryTargetLotteryMapByRow, userProfile?.email, userProfile?.role]);

  const deleteRecoveryTicket = useCallback((ticket: RecoveryTicketRecord) => {
    if (userProfile?.role !== 'ceo') {
      toast.error('Acceso restringido');
      return;
    }

    setConfirmModal({
      show: true,
      title: 'Eliminar Ticket',
      message: `Se eliminará el ticket ${ticket.id.slice(0, 8)} de ${ticket.source === 'tickets' ? 'LIVE' : `ARCHIVO ${ticket.archiveDate}`}. ¿Deseas continuar?`,
      onConfirm: async () => {
        setRecoveryDeletingRowId(ticket.rowId);
        try {
          if (ticket.source === 'tickets') {
            await deleteRecoveryLiveTicket(ticket.id);
          } else {
            if (!ticket.archiveDate) throw new Error('archiveDate requerido para eliminar ticket archivado');
            await deleteRecoveryArchivedTicket({
              archiveDate: ticket.archiveDate,
              ticketId: ticket.id,
              updatedBy: userProfile.email || '',
            });
          }

          setRecoveryTickets(prev => prev.filter(item => item.rowId !== ticket.rowId));
          setRecoveryTargetLotteryByRow(prev => {
            const next = { ...prev };
            delete next[ticket.rowId];
            return next;
          });
          setRecoveryTargetLotteryMapByRow(prev => {
            const next = { ...prev };
            delete next[ticket.rowId];
            return next;
          });

          if (ticket.source === 'tickets') {
            setTickets(prev => prev.filter(item => item.id !== ticket.id));
            setHistoryTickets(prev => prev.filter(item => item.id !== ticket.id));
            setLiquidationTicketsSnapshot(prev => prev.filter(item => item.id !== ticket.id));
          } else {
            setArchiveTickets(prev => prev.filter(item => item.id !== ticket.id));
          }

          historyDataCacheRef.current.clear();
          closedLotteryCardsCacheRef.current.clear();
          await fetchRecoveryData();

          toast.success(`Ticket ${ticket.id.slice(0, 8)} eliminado correctamente`);
        } catch (error) {
          console.error('Error deleting recovery ticket:', error);
          toast.error('No se pudo eliminar el ticket');
        } finally {
          setRecoveryDeletingRowId(null);
        }
      }
    });
  }, [fetchRecoveryData, userProfile?.email, userProfile?.role]);

  

  const userStats = useMemo(() => {
    if (!['users', 'history', 'dashboard', 'liquidaciones'].includes(activeTab)) return {};

    const stats: Record<string, { sales: number, commissions: number, prizes: number, injections: number, utility: number }> = {};
    
    // Initialize stats for all users
    users.forEach(u => {
      if (u.email) {
        stats[u.email.toLowerCase()] = { sales: 0, commissions: 0, prizes: 0, injections: 0, utility: 0 };
      }
    });

    // Calculate from tickets
    const sourceTickets = activeTab === 'history' ? historyTickets : tickets;
    
    sourceTickets.forEach(t => {
      if (t.status === 'cancelled') return;
      const email = t.sellerEmail?.toLowerCase();
      if (email && stats[email]) {
        const lotBets = (t.bets || []);
        const lotSales = lotBets.reduce((sum, b) => sum + (b.amount || 0), 0);
        stats[email].sales += lotSales;
        stats[email].commissions += (lotSales * (t.commissionRate || 0) / 100);
        const { totalPrize } = getTicketPrizes(t);
        stats[email].prizes += (totalPrize || 0);
      }
    });

    // Calculate from injections
    const sourceInjections = activeTab === 'history' ? historyInjections : injections;

    sourceInjections.forEach(i => {
      const email = i.userEmail?.toLowerCase();
      if (email && stats[email] && i.date === (activeTab === 'history' ? historyDate : businessDayKey)) {
        stats[email].injections += i.amount;
      }
    });

    // Final utility calculation: sales - commissions - prizes + injections
    Object.keys(stats).forEach(email => {
      const s = stats[email];
      s.utility = s.sales - s.commissions - s.prizes + s.injections;
    });

    return stats;
  }, [activeTab, businessDayKey, users, tickets, historyTickets, injections, historyInjections, historyDate, getTicketPrizes]);
  const handleLogoutFromUi = useCallback(() => {
    handleLogout();
    toast.info('Sesión cerrada');
  }, [handleLogout]);

  const canAccessDashboard = currentUserRole === 'ceo' || currentUserRole === 'admin';
  const canAccessStats = currentUserRole === 'ceo' || currentUserRole === 'admin';
  const canAccessCierres = canAccessCierresDomain(currentUserRole);
  const canAccessResults = canAccessResultsDomain(currentUserRole);
  const canAccessUsers = canAccessUsersDomain(currentUserRole);
  const canAccessArchive = canAccessArchiveDomain(currentUserRole, userProfile?.canLiquidate);
  const canAccessAdminConfig = canAccessAdminConfigDomain(currentUserRole);
  const canAccessLiquidation = canAccessLiquidationDomain(currentUserRole, userProfile?.canLiquidate);

  const navigationItems = useMemo<NavItem[]>(() => [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, role: ['ceo', 'admin'] },
    { id: 'sales', label: 'Nueva Venta', icon: Plus },
    { id: 'history', label: 'Resumen de ventas', icon: History },
    { id: 'stats', label: 'Estadisticas', icon: BarChart3, role: ['ceo', 'admin'] },
    { id: 'cierres', label: 'Cierres', icon: Printer, role: [...CIERRES_DOMAIN_SPEC.allowedRoles] as DomainRole[] },
    { id: 'results', label: 'Resultados', icon: CheckCircle2, role: [...RESULTS_DOMAIN_SPEC.allowedRoles] as DomainRole[] },
    { id: 'users', label: 'Usuarios', icon: Users, role: [...USERS_DOMAIN_SPEC.allowedRoles] as DomainRole[] },
    { id: 'archivo', label: 'Archivo', icon: Archive, role: [...ARCHIVE_DOMAIN_SPEC.allowedRoles] as DomainRole[] },
    { id: 'admin', label: 'Config. General', icon: ShieldCheck, role: [...ADMIN_CONFIG_DOMAIN_SPEC.allowedRoles] as DomainRole[] },
    { id: 'liquidaciones', label: 'Liquidaciones', icon: DollarSign, role: [...LIQUIDATION_DOMAIN_SPEC.allowedRoles] as DomainRole[], permission: 'canLiquidate' },
    
    { id: 'config', label: 'Mi cuenta', icon: Settings, role: [...SALES_DOMAIN_SPEC.allowedRoles] as DomainRole[] },
  ], []);
  const visibleNavigationItems = useMemo(
    () => getVisibleNavItems(navigationItems, userProfile),
    [navigationItems, userProfile]
  );
  const salesAccessError = validateSalesAccess({ userProfile, operationalSellerId });
  const canSell = !salesAccessError;

  useEffect(() => {
    if (!userProfile) return;
    if (visibleNavigationItems.some((item) => item.id === activeTab)) return;
    setActiveTab('sales');
  }, [activeTab, userProfile, visibleNavigationItems]);

  return (
    <>
      <Toaster position="top-right" richColors duration={2000} />
      {loading || (user && userProfile === undefined) ? (
        <div key="loading" className="min-h-screen bg-background flex items-center justify-center font-mono">
          <span>CARGANDO SISTEMA...</span>
        </div>
      ) : !user ? (
        <Login key="login" />
      ) : !userProfile ? (
        <div key="access-denied" className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
          <div className="glass-card p-8 max-w-md w-full text-center space-y-6">
            <ShieldCheck className="w-16 h-16 text-destructive mx-auto" />
            <h1 className="text-2xl font-black italic tracking-tighter">
              <span>ACCESO DENEGADO</span>
            </h1>
            <p className="text-muted-foreground font-mono text-sm">
              <span>Tu cuenta ({user?.email}) no tiene permisos asignados en el sistema. Contacta al administrador.</span>
            </p>
            <button 
              onClick={handleLogoutFromUi}
              className="w-full btn-secondary py-3 font-bold uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" /> Cerrar Sesión
            </button>
          </div>
        </div>
      ) : (
        <div className="min-h-screen bg-background text-foreground font-sans flex flex-col lg:flex-row overflow-hidden">
          <GlobalSettingsModal 
            show={showSettingsModal}
            settings={globalSettings}
            onSave={async (data) => {
              try {
                await setDoc(doc(db, 'settings', 'global'), data);
                toast.success('Ajustes globales guardados');
                setShowSettingsModal(false);
              } catch (error) {
                handleFirestoreError(error, OperationType.WRITE, 'settings/global');
              }
            }}
            onClose={() => setShowSettingsModal(false)}
          />

      <FastEntryModal
        show={showFastEntryModal}
        onAdd={(bets) => {
          setCart(prevCart => {
            const combined = [...prevCart, ...bets];
            return unifyBets(combined);
          });
          toast.success('Apuestas agregadas y unificadas');
        }}
        onClose={() => setShowFastEntryModal(false)}
        selectedLotteries={isMultipleMode ? multiLottery : (selectedLottery ? [selectedLottery] : [])}
        chancePrice={chancePrice}
        plAmount={plAmount}
      />

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

      <ConfirmationModal 
        show={confirmModal.show}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal(prev => ({ ...prev, show: false }))}
      />

      <LotterySelectorModal 
        show={reuseModal.show}
        lotteries={activeLotteries}
        onSelect={handleReuseSelect}
        onClose={() => setReuseModal({ show: false, ticket: null })}
      />

      <CheckoutModal 
        show={showCheckoutModal}
        customerName={customerName}
        setCustomerName={setCustomerName}
        onConfirm={confirmSale}
        onClose={() => setShowCheckoutModal(false)}
        isSubmitting={isSubmittingSale}
      />

      <LotteryModal 
        show={showLotteryModal}
        lottery={editingLottery}
        onSave={saveLottery}
        onClose={() => { setShowLotteryModal(false); setEditingLottery(null); }}
        globalSettings={globalSettings}
      />

      <UserModal
        show={showUserModal}
        userProfile={editingUser}
        onSave={saveUser}
        onClose={() => { setShowUserModal(false); setEditingUser(null); }}
        currentUserRole={userProfile?.role}
      />

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
        currentUser={user}
        userProfile={userProfile}
        targetUserEmail={injectionTargetUserEmail}
        defaultType={injectionDefaultType}
        initialAmount={injectionInitialAmount}
        allowOnlyInjection={isInjectionOnly}
      />

      {/* Sidebar Overlay for Mobile */}
      <AnimatePresence>
        {isMobile && isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ 
          width: isMobile ? (isSidebarOpen ? 280 : 0) : (isSidebarOpen ? 280 : 80),
          x: isMobile && !isSidebarOpen ? -280 : 0
        }}
        className={`surface border-r border-border h-screen flex flex-col overflow-hidden z-50 ${isMobile ? 'fixed inset-y-0 left-0' : 'relative'}`}
      >
        <div className="px-4 py-4 flex items-center gap-3 shrink-0">
          <div className="bg-primary p-2 rounded-lg neon-border">
            <TicketIcon className="w-6 h-6 text-primary-foreground" />
          </div>
          {isSidebarOpen && (
            <motion.h1 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xl font-black italic tracking-tighter neon-text"
            >
              CHANCE PRO
            </motion.h1>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-3 pt-2 pb-[max(12px,env(safe-area-inset-bottom))] custom-scrollbar">
          <nav className="space-y-1.5">
            {visibleNavigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full h-11 px-3 rounded-lg border flex items-center gap-2.5 transition-all ${
                  activeTab === item.id
                    ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20'
                    : 'text-muted-foreground border-white/10 hover:text-foreground hover:border-white/20'
                }`}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {isSidebarOpen && (
                  <span className="text-xs font-bold uppercase tracking-wide whitespace-nowrap truncate">
                    {item.label}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="mt-3 pt-3 border-t border-border space-y-1.5">
            <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border border-white/10 transition-all ${isOnline ? 'text-emerald-400' : 'text-red-400'}`}>
              {isOnline ? <Cloud className="w-4 h-4 flex-shrink-0" /> : <CloudOff className="w-4 h-4 flex-shrink-0" />}
              {isSidebarOpen && (
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-widest leading-none whitespace-nowrap truncate">
                    {isOnline ? 'Sincronizado' : 'Sin Conexión'}
                  </span>
                  <span className="text-[9px] font-mono opacity-60 uppercase leading-none mt-0.5 whitespace-nowrap truncate">
                    {isOnline ? 'Nube Activa' : 'Modo Local'}
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={handleLogoutFromUi}
              className="w-full h-11 px-3 rounded-lg border border-red-500/25 text-red-400 hover:bg-red-400/10 flex items-center gap-2.5 transition-all"
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              {isSidebarOpen && (
                <span className="text-xs font-bold uppercase tracking-wide whitespace-nowrap truncate">
                  Cerrar Sesión
                </span>
              )}
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative min-w-0">
        {/* Top Header */}
        <header className="h-16 surface border-b border-border px-3 flex items-center justify-between shrink-0 gap-2">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 surface-soft rounded-lg text-muted-foreground shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="flex-1 flex items-center justify-around md:justify-center md:gap-12">
            <div className="flex flex-col items-center">
              <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Ventas</span>
              <span className="text-xs font-black text-white">${todayStats.sales.toFixed(2)}</span>
            </div>
            <div className="w-px h-6 bg-white/10 hidden sm:block"></div>
            <div className="flex flex-col items-center">
              <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Comisión</span>
              <span className="text-xs font-black text-primary">${todayStats.commissions.toFixed(2)}</span>
            </div>
            <div className="w-px h-6 bg-white/10 hidden sm:block"></div>
            <div className="flex flex-col items-center">
              <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Premios</span>
              <span className="text-xs font-black text-red-400">${todayStats.prizes.toFixed(2)}</span>
            </div>
            <div className="w-px h-6 bg-white/10 hidden sm:block"></div>
            <div className="flex flex-col items-center">
              <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Balance</span>
              <span className={`text-xs font-black ${todayStats.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${todayStats.netProfit.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button 
              onClick={handleLogoutFromUi}
              className="p-2 hover:bg-red-500/10 rounded-lg text-red-400"
              title="Cerrar Sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Scrollable Area */}
        <main
          ref={(node) => {
            mainScrollRef.current = node;
          }}
          onTouchStart={handleMainTouchStart}
          onTouchMove={handleMainTouchMove}
          onTouchEnd={handleMainTouchEnd}
          className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-8 custom-scrollbar min-w-0"
        >
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && canAccessDashboard && (
              <Suspense fallback={<div className="text-xs text-muted-foreground">Cargando dashboard...</div>}>
                <DashboardStatsDomainLazy
                  mode="dashboard"
                  todayStats={todayStats}
                  todayStr={todayStr}
                  userProfile={userProfile}
                  injections={injections}
                  operationalSellerId={operationalSellerId}
                  historyTickets={historyTickets}
                  ticketMatchesGlobalChancePrice={ticketMatchesGlobalChancePrice}
                  lotteries={lotteries}
                  cleanText={cleanText}
                  formatTime12h={formatTime12h}
                />
              </Suspense>
            )}

            {activeTab === 'sales' && (
              <SalesDomain
                isMultipleMode={isMultipleMode}
                setIsMultipleMode={setIsMultipleMode}
                showMultiSelect={showMultiSelect}
                setShowMultiSelect={setShowMultiSelect}
                multiLottery={multiLottery}
                setMultiLottery={setMultiLottery}
                activeLotteries={activeLotteries}
                selectedLottery={selectedLottery}
                setSelectedLottery={setSelectedLottery}
                cleanText={cleanText}
                formatTime12h={formatTime12h}
                globalSettings={globalSettings}
                betType={betType}
                setBetType={setBetType}
                setNumber={setNumber}
                setQuantity={setQuantity}
                setPlAmount={setPlAmount}
                setFocusedField={setFocusedField}
                findActiveLotteryByName={findActiveLotteryByName}
                focusedField={focusedField}
                numberInputRef={numberInputRef}
                amountInputRef={amountInputRef}
                number={number}
                quantity={quantity}
                plAmount={plAmount}
                amountEntryStarted={amountEntryStarted}
                setAmountEntryStarted={setAmountEntryStarted}
                isAmountSelected={isAmountSelected}
                setIsAmountSelected={setIsAmountSelected}
                handleKeyPress={handleKeyPress}
                handleBackspace={handleBackspace}
                handleClear={handleClear}
                addToCart={addToCart}
                canSell={canSell}
                sellBlockedReason={salesAccessError}
                cart={cart}
                clearCart={clearCart}
                updateCartItemQuantity={updateCartItemQuantity}
                updateCartItemAmount={updateCartItemAmount}
                removeFromCart={removeFromCart}
                chancePrice={chancePrice}
                editingTicketId={editingTicketId}
                cancelEdit={cancelEdit}
                cartTotal={cartTotal}
                handleSell={handleSell}
                setShowFastEntryModal={setShowFastEntryModal}
                userProfile={userProfile}
                todayStr={todayStr}
                todayStats={todayStats}
              />
            )}
            {activeTab === 'history' && (
              <HistorySection
                historyDate={historyDate}
                setHistoryDate={setHistoryDate}
                applyOperationalQuickDate={applyOperationalQuickDate}
                recentOperationalDates={recentOperationalDates}
                historyFilter={historyFilter}
                setHistoryFilter={setHistoryFilter}
                users={users}
                userProfile={userProfile}
                selectedUserToLiquidate={selectedUserToLiquidate}
                setSelectedUserToLiquidate={setSelectedUserToLiquidate}
                selectedManageUserEmail={selectedManageUserEmail}
                setSelectedManageUserEmail={setSelectedManageUserEmail}
                showGlobalScope={showGlobalScope}
                setShowGlobalScope={setShowGlobalScope}
                canUseGlobalScope={canUseGlobalScope}
                historyTickets={historyTickets}
                historyLotteryCards={historyLotteryCards}
                historyInjections={historyInjections}
                historySettlements={historySettlements}
                historyResults={historyResults}
                filteredTickets={filteredTickets}
                getTicketPrizes={getTicketPrizes}
                globalSettings={globalSettings}
                chancePrice={chancePrice}
                setExpandedLotteries={setExpandedLotteries}
                expandedLotteries={expandedLotteries}
                lotteryPages={lotteryPages}
                setLotteryPages={setLotteryPages}
                isLotteryOpenForSales={isLotteryOpenForSales}
                historyTypeFilterCode={historyTypeFilterCode}
                formatTime12h={formatTime12h}
                cleanText={cleanText}
                sortedLotteries={sortedLotteries}
                setShowTicketModal={setShowTicketModal}
                setEditingTicketId={setEditingTicketId}
                editingTicketId={editingTicketId}
                cancelTicket={cancelTicket}
                isTicketClosed={isTicketClosed}
                isTicketHasResults={isTicketHasResults}
                user={user}
                editTicket={editTicket}
                reuseTicket={reuseTicket}
                showUserModal={showUserModal}
                setShowUserModal={setShowUserModal}
                setEditingUser={setEditingUser}
                setShowInjectionModal={setShowInjectionModal}
                setInjectionTargetUserEmail={setInjectionTargetUserEmail}
                setInjectionDefaultType={setInjectionDefaultType}
                setIsInjectionOnly={setIsInjectionOnly}
                canManageResults={canManageResults}
                isCeoUser={isCeoUser}
                businessDayKey={businessDayKey}
                setEditingResult={setEditingResult}
                deleteResult={deleteResult}
                availableResultLotteries={availableResultLotteries}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              />
            )}
            {activeTab === 'stats' && canAccessStats && (
              <Suspense fallback={<div className="text-xs text-muted-foreground">Cargando estadisticas...</div>}>
                <DashboardStatsDomainLazy
                  mode="stats"
                  canUseGlobalScope={canUseGlobalScope}
                  showGlobalScope={showGlobalScope}
                  setShowGlobalScope={setShowGlobalScope}
                  canAccessAllUsers={canAccessAllUsers}
                  globalChancePriceFilter={globalChancePriceFilter}
                  setGlobalChancePriceFilter={setGlobalChancePriceFilter}
                  globalSettings={globalSettings}
                  historyDate={historyDate}
                  setHistoryDate={setHistoryDate}
                  historyTickets={historyTickets}
                  ticketMatchesGlobalChancePrice={ticketMatchesGlobalChancePrice}
                  lotteries={lotteries}
                  cleanText={cleanText}
                  formatTime12h={formatTime12h}
                  injections={injections}
                  todayStr={todayStr}
                  operationalSellerId={operationalSellerId}
                />
              </Suspense>
            )}

            {activeTab === 'cierres' && canAccessCierres && (
              <Suspense fallback={<div className="text-xs text-muted-foreground">Cargando cierres...</div>}>
                <CierresDomainLazy
                  canUseGlobalScope={canUseGlobalScope}
                  showGlobalScope={showGlobalScope}
                  setShowGlobalScope={setShowGlobalScope}
                  canAccessAllUsers={canAccessAllUsers}
                  globalChancePriceFilter={globalChancePriceFilter}
                  setGlobalChancePriceFilter={setGlobalChancePriceFilter}
                  globalSettings={globalSettings}
                  historyDate={historyDate}
                  setHistoryDate={setHistoryDate}
                  lotteries={lotteries}
                  cleanText={cleanText}
                  userProfile={userProfile}
                  user={user}
                  formatTime12h={formatTime12h}
                  historyTickets={historyTickets}
                  operationalSellerId={operationalSellerId}
                  ticketMatchesGlobalChancePrice={ticketMatchesGlobalChancePrice}
                  shareImageDataUrl={shareImageDataUrl}
                  downloadDataUrlFile={downloadDataUrlFile}
                />
              </Suspense>
            )}

            {activeTab === 'results' && canAccessResults && (
              <ResultsDomain
                canManageResults={canManageResults}
                editingResult={editingResult}
                cancelResultEdition={cancelResultEdition}
                isCeoUser={isCeoUser}
                resultFormDate={resultFormDate}
                setResultFormDate={setResultFormDate}
                setResultFormLotteryId={setResultFormLotteryId}
                businessDayKey={businessDayKey}
                resultFormLotteryId={resultFormLotteryId}
                availableResultLotteries={availableResultLotteries}
                cleanText={cleanText}
                formatTime12h={formatTime12h}
                lotteryById={lotteryById}
                resultFormFirstPrize={resultFormFirstPrize}
                setResultFormFirstPrize={setResultFormFirstPrize}
                resultFormSecondPrize={resultFormSecondPrize}
                setResultFormSecondPrize={setResultFormSecondPrize}
                resultFormThirdPrize={resultFormThirdPrize}
                setResultFormThirdPrize={setResultFormThirdPrize}
                handleCreateResultFromForm={handleCreateResultFromForm}
                visibleResults={visibleResults}
                resultStatusMap={resultStatusMap}
                getResultKey={getResultKey}
                setEditingResult={setEditingResult}
                deleteResult={deleteResult}
              />
            )}
            {activeTab === 'admin' && canAccessAdminConfig && (
              <GeneralConfigDomain
                userProfile={userProfile}
                setShowSettingsModal={setShowSettingsModal}
                setEditingLottery={setEditingLottery}
                setShowLotteryModal={setShowLotteryModal}
                sortedLotteries={sortedLotteries}
                formatTime12h={formatTime12h}
                cleanText={cleanText}
                toggleLotteryActive={toggleLotteryActive}
                setEditingResult={setEditingResult}
                setEditingUser={setEditingUser}
                setShowUserModal={setShowUserModal}
                deleteLottery={deleteLottery}
                globalSettings={globalSettings}

                setGlobalChancePriceFilter={setGlobalChancePriceFilter}
                globalChancePriceFilter={globalChancePriceFilter}
                setGlobalSettings={setGlobalSettings}
                showGlobalScope={showGlobalScope}
                setShowGlobalScope={setShowGlobalScope}
                handleDeleteAllSalesData={handleDeleteAllSalesData}
              />
            )}
            {activeTab === 'users' && canAccessUsers && (
              <UsersDomain
                selectedManageUserEmail={selectedManageUserEmail}
                setSelectedManageUserEmail={setSelectedManageUserEmail}
                users={users}
                userProfile={userProfile}
                userStats={userStats}
                setEditingUser={setEditingUser}
                setShowUserModal={setShowUserModal}
                setInjectionTargetUserEmail={setInjectionTargetUserEmail}
                setInjectionDefaultType={setInjectionDefaultType}
                setIsInjectionOnly={setIsInjectionOnly}
                setShowInjectionModal={setShowInjectionModal}
                deleteUser={deleteUser}
              />
            )}
            {activeTab === 'liquidaciones' && canAccessLiquidation && (
              <Suspense fallback={<div className="text-xs text-muted-foreground">Cargando liquidaciones...</div>}>
                <LiquidationDomainLazy
                  isPrimaryCeoUser={isPrimaryCeoUser}
                  setConsolidatedMode={setConsolidatedMode}
                  consolidatedMode={consolidatedMode}
                  consolidatedReportDate={consolidatedReportDate}
                  setConsolidatedReportDate={setConsolidatedReportDate}
                  setConsolidatedStartDate={setConsolidatedStartDate}
                  setConsolidatedEndDate={setConsolidatedEndDate}
                  consolidatedStartDate={consolidatedStartDate}
                  consolidatedEndDate={consolidatedEndDate}
                  recentOperationalDates={recentOperationalDates}
                  generateConsolidatedReport={generateConsolidatedReport}
                  isGeneratingYesterdayReport={isGeneratingYesterdayReport}
                  liquidationDate={liquidationDate}
                  setLiquidationDate={setLiquidationDate}
                  applyOperationalQuickDate={applyOperationalQuickDate}
                  liquidacionQuickDateOptions={liquidacionQuickDateOptions}
                  businessDayKey={businessDayKey}
                  isLiquidationDataLoading={isLiquidationDataLoading}
                  userProfile={userProfile}
                  selectedUserToLiquidate={selectedUserToLiquidate}
                  setSelectedUserToLiquidate={setSelectedUserToLiquidate}
                  users={users}
                  selectedLiquidationSettlement={selectedLiquidationSettlement}
                  amountPaid={amountPaid}
                  setAmountPaid={setAmountPaid}
                  handleLiquidate={handleLiquidate}
                  liquidationPreview={liquidationPreview}
                  shareImageDataUrl={shareImageDataUrl}
                  downloadDataUrlFile={downloadDataUrlFile}
                />
              </Suspense>
            )}
            {activeTab === 'archivo' && canAccessArchive && (
              <Suspense fallback={<div className="text-xs text-muted-foreground">Cargando archivo...</div>}>
                <ArchiveDomainLazy
                  archiveDate={archiveDate}
                  setArchiveDate={setArchiveDate}
                  applyOperationalQuickDate={applyOperationalQuickDate}
                  recentOperationalDates={recentOperationalDates}
                  userProfile={userProfile}
                  archiveUserEmail={archiveUserEmail}
                  setArchiveUserEmail={setArchiveUserEmail}
                  users={users}
                  fetchArchiveData={fetchArchiveData}
                  isArchiveLoading={isArchiveLoading}
                  archiveTickets={archiveTickets}
                  archiveInjections={archiveInjections}
                  buildFinancialSummary={buildFinancialSummary}
                  setSelectedUserToLiquidate={setSelectedUserToLiquidate}
                  setLiquidationDate={setLiquidationDate}
                  setActiveTab={setActiveTab}
                  setShowTicketModal={setShowTicketModal}
                  cleanText={cleanText}
                  formatTime12h={formatTime12h}
                />
              </Suspense>
            )}
            {false && activeTab === 'recovery' && (
              <RecoverySection
                fetchRecoveryData={fetchRecoveryData}
                isRecoveryLoading={isRecoveryLoading}
                recoveryDate={recoveryDate}
                setRecoveryDate={setRecoveryDate}
                recoverySellerFilter={recoverySellerFilter}
                setRecoverySellerFilter={setRecoverySellerFilter}
                recoveryLotteryFilter={recoveryLotteryFilter}
                setRecoveryLotteryFilter={setRecoveryLotteryFilter}
                recoveryTicketIdFilter={recoveryTicketIdFilter}
                setRecoveryTicketIdFilter={setRecoveryTicketIdFilter}
                recoveryStatusFilter={recoveryStatusFilter}
                setRecoveryStatusFilter={setRecoveryStatusFilter}
                recoverySortOrder={recoverySortOrder}
                setRecoverySortOrder={setRecoverySortOrder}
                filteredRecoveryTickets={filteredRecoveryTickets}
                recoveryTickets={recoveryTickets}
                parseTicketTimestampMs={parseTicketTimestampMs}
                getRecoveryTicketLotteryNames={getRecoveryTicketLotteryNames}
                recoveryTargetLotteryMapByRow={recoveryTargetLotteryMapByRow}
                getRecoveryTicketLotteryLabel={getRecoveryTicketLotteryLabel}
                recoveryTargetLotteryByRow={recoveryTargetLotteryByRow}
                setRecoveryTargetLotteryByRow={setRecoveryTargetLotteryByRow}
                setRecoveryTargetLotteryMapByRow={setRecoveryTargetLotteryMapByRow}
                recoveryAvailableLotteries={recoveryAvailableLotteries}
                cleanText={cleanText}
                formatTime12h={formatTime12h}
                setSelectedUserToLiquidate={setSelectedUserToLiquidate}
                setLiquidationDate={setLiquidationDate}
                saveRecoveryLotteryChange={saveRecoveryLotteryChange}
                recoverySavingRowId={recoverySavingRowId}
                recoveryDeletingRowId={recoveryDeletingRowId}
                deleteRecoveryTicket={deleteRecoveryTicket}
              />
            )}
            {activeTab === 'config' && (
              <ConfigSection
                handleUpdateChancePrice={handleUpdateChancePrice}
                personalChancePrice={personalChancePrice}
                setPersonalChancePrice={setPersonalChancePrice}
                globalSettings={globalSettings}
                canUpdatePersonalChancePrice={canUpdatePersonalChancePrice}
                isUpdatingChancePrice={isUpdatingChancePrice}
                handleUpdatePassword={handleUpdatePassword}
                newPassword={newPassword}
                setNewPassword={setNewPassword}
                confirmPassword={confirmPassword}
                setConfirmPassword={setConfirmPassword}
                isUpdatingPassword={isUpdatingPassword}
              />
            )}
          </AnimatePresence>
        </main>

        {/* Footer */}
        <footer className="h-auto min-h-12 surface border-t border-border px-3 sm:px-8 py-2 flex items-center justify-between gap-2 shrink-0 text-[8px] sm:text-[9px] font-mono text-muted-foreground uppercase tracking-[0.12em] sm:tracking-[0.2em]">
          <p>© 2026 CHANCE PRO SYSTEMS • TERMINAL {user.uid.slice(0, 8)}</p>
          <div className="flex gap-3 sm:gap-8 flex-wrap justify-end">
            <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-500" /> SERVER: OK</span>
            <span>V1.2.0-STABLE</span>
          </div>
        </footer>
      </div>
        </div>
      )}
    </>
  );
}

export default function AppWrapper() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}




























