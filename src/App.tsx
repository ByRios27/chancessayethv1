import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import {
  AlertTriangle,
  Archive,
  ArrowLeftRight,
  ArrowUpRight,
  Banknote,
  BarChart3,
  Bell,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Cloud,
  CloudOff,
  Copy,
  Database,
  Delete,
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
  Minus,
  Moon,
  Plus,
  PlusCircle,
  Printer,
  Repeat,
  RotateCcw,
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
import * as htmlToImage from 'html-to-image';
import { toPng } from 'html-to-image';

import {
  addDoc,
  auth,
  collection,
  createUserWithEmailAndPassword,
  db,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  googleProvider,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  secondaryAuth,
  sendPasswordResetEmail,
  serverTimestamp,
  setDoc,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateDoc,
  updatePassword,
  where,
  writeBatch,
} from './firebase';

import { useAuthSession } from './hooks/useAuthSession';
import { useInjections } from './hooks/useInjections';
import { useLiquidation } from './hooks/useLiquidation';
import { useLotteries } from './hooks/useLotteries';
import { useAppDataScopes, type AppTabId } from './hooks/useAppDataScopes';
import { useOperationalArchive } from './hooks/useOperationalArchive';
import { useOperationalClock } from './hooks/useOperationalClock';
import { useRecovery } from './hooks/useRecovery';
import { useResults } from './hooks/useResults';
import { useSettlements } from './hooks/useSettlements';
import { useTickets } from './hooks/useTickets';
import { useUsers } from './hooks/useUsers';

import { buildFinancialSummary as calculateFinancialSummary } from './services/calculations/financial';
import { shouldRunAutoCleanupNow } from './services/calculations/operationalArchive';
import { getTicketPrizesFromSource as calculateTicketPrizesFromSource } from './services/calculations/prizes';
import {
  getLotteryDayStats as calculateLotteryDayStats,
  getStatsByDraw as calculateStatsByDraw,
  getUserLotteryDayStats as calculateUserLotteryDayStats,
} from './services/calculations/stats';
import { createLottery, deleteLottery as deleteLotteryById, setLotteryActive, updateLottery } from './services/repositories/lotteriesRepo';
import {
  deleteRecoveryArchivedTicket,
  deleteRecoveryLiveTicket,
  updateRecoveryArchivedTicket,
  updateRecoveryLiveTicket,
} from './services/repositories/recoveryRepo';
import { createResult, deleteResult as deleteResultById, updateResult } from './services/repositories/resultsRepo';
import { createTicket, deleteTicket as deleteTicketById, updateTicket } from './services/repositories/ticketsRepo';
import { deleteUserProfile, reserveNextSellerId, saveUserProfile, updatePreferredChancePrice } from './services/repositories/usersRepo';

import { AdminSection } from './components/admin/AdminSection';
import { ArchiveSection } from './components/archive/ArchiveSection';
import { ConfigSection } from './components/config/ConfigSection';
import { HistorySection } from './components/history/HistorySection';
import { LiquidationSection } from './components/liquidation/LiquidationSection';
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
import { ResultsSection } from './components/results/ResultsSection';
import ErrorBoundary from './components/shared/ErrorBoundary';
import Login from './components/shared/Login';
import LotteryStatsCard from './components/shared/LotteryStatsCard';
import { UsersSection } from './components/users/UsersSection';

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
  toast.error(
    `Error al ${operationLabel} (${target})`,
    {
      description: `Código: ${firebaseCode} | Causa: ${firebaseMessage}`
    }
  );

  console.error('Firestore Error Details:', JSON.stringify(errInfo, null, 2));
  return errInfo;
}

function App() {
  // Session and scope wiring
  const enforceSessionByOperationalDay = false;
  const autoResetStateOnBusinessDayChange = false;
  const { user, userProfile, setUserProfile, loading, handleLogout } = useAuthSession(enforceSessionByOperationalDay);
  const { tick, businessDayKey, getQuickOperationalDate, applyOperationalQuickDate } = useOperationalClock();
  const canUseGlobalScope = userProfile?.role === 'ceo' || userProfile?.role === 'programador' || !!userProfile?.canLiquidate;
  const [showGlobalScope, setShowGlobalScope] = useState(false);

  // Top-level app state
  const [historyTickets, setHistoryTickets] = useState<LotteryTicket[]>([]);
  const [activeTab, setActiveTab] = useState<AppTabId>('sales');
  const [expandedStats, setExpandedStats] = useState<string[]>([]);
  const [cierreLottery, setCierreLottery] = useState<string>('');
  const cierreRef = useRef<HTMLDivElement>(null);
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
    if (userProfile?.role === 'ceo' || userProfile?.role === 'admin' || userProfile?.role === 'programador') {
      setActiveTab('dashboard');
    } else {
      setActiveTab('sales');
    }
  }, [userProfile?.role]);

  useEffect(() => {
    if (!canUseGlobalScope && showGlobalScope) {
      setShowGlobalScope(false);
    }
  }, [canUseGlobalScope, showGlobalScope]);

  const [historyFilter, setHistoryFilter] = useState<'TODO' | 'CHANCE' | 'BILLETE' | 'PALE'>('TODO');
  const [showTicketModal, setShowTicketModal] = useState<{ ticket: LotteryTicket, selectedLotteryName?: string } | null>(null);
  const [showLotteryModal, setShowLotteryModal] = useState<boolean>(false);
  const [editingResult, setEditingResult] = useState<LotteryResult | null>(null);
  const [resultFormDate, setResultFormDate] = useState(format(getBusinessDate(), 'yyyy-MM-dd'));
  const [resultFormLotteryId, setResultFormLotteryId] = useState('');
  const [resultFormFirstPrize, setResultFormFirstPrize] = useState('');
  const [resultFormSecondPrize, setResultFormSecondPrize] = useState('');
  const [resultFormThirdPrize, setResultFormThirdPrize] = useState('');
  const [historyDate, setHistoryDate] = useState(format(getBusinessDate(), 'yyyy-MM-dd'));
  const {
    canAccessManagedUsersData,
    canAccessAllUsers,
    shouldLoadUsersList,
    needsRealtimeOperationalData,
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
  const { users, setUsers } = useUsers({
    role: userProfile?.role,
    enabled: shouldLoadUsersList,
    onError: (error, operation, target) => {
      const op = operation === 'list' ? OperationType.LIST : OperationType.GET;
      handleFirestoreError(error, op, target);
    }
  });
  
  const selectableUsers = useMemo(() => {
    return users.filter(u => {
      if (!u || !u.email || !u.name || u.name.trim() === '' || u.status !== 'active') return false;

      const currentEmail = userProfile?.email?.toLowerCase();
      const targetEmail = u.email?.toLowerCase();

      if (userProfile?.role === 'ceo' || userProfile?.role === 'programador') {
        return ['ceo', 'admin', 'seller', 'programador'].includes(u.role) && targetEmail !== currentEmail;
      }

      if (userProfile?.role === 'admin') {
        return ['ceo', 'admin', 'seller', 'programador'].includes(u.role) && targetEmail !== currentEmail;
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
  const [selectedManageUserEmail, setSelectedManageUserEmail] = useState<string>('');
  const [liquidationDate, setLiquidationDate] = useState<string>(format(getBusinessDate(), 'yyyy-MM-dd'));
  const [isGeneratingYesterdayReport, setIsGeneratingYesterdayReport] = useState(false);
  const [consolidatedMode, setConsolidatedMode] = useState<'day' | 'range'>('day');
  const [consolidatedReportDate, setConsolidatedReportDate] = useState<string>(() => {
    const d = getBusinessDate();
    d.setDate(d.getDate() - 1);
    return format(d, 'yyyy-MM-dd');
  });
  const [consolidatedStartDate, setConsolidatedStartDate] = useState<string>(() => {
    const d = getBusinessDate();
    d.setDate(d.getDate() - 1);
    return format(d, 'yyyy-MM-dd');
  });
  const [consolidatedEndDate, setConsolidatedEndDate] = useState<string>(() => {
    const d = getBusinessDate();
    d.setDate(d.getDate() - 1);
    return format(d, 'yyyy-MM-dd');
  });
  const primaryCeoEmail = (import.meta.env.VITE_CEO_EMAIL || 'zsayeth09@gmail.com').toLowerCase();
  const isPrimaryCeoUser = (userProfile?.email || '').toLowerCase() === primaryCeoEmail;
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

  const { tickets, setTickets } = useTickets({
    enabled: !!user?.uid && !!userProfile?.role && needsRealtimeOperationalData,
    canAccessAllUsers,
    businessDayKey,
    userUid: user?.uid,
    userEmail: user?.email,
    userRole: userProfile?.role,
    userCanLiquidate: userProfile?.canLiquidate,
    onError: (error, _operation, target) => handleFirestoreError(error, OperationType.GET, target),
  });

  const { injections, setInjections } = useInjections({
    enabled: !!user?.uid && !!userProfile?.role && needsRealtimeOperationalData,
    canAccessAllUsers,
    businessDayKey,
    userEmail: user?.email,
    onError: (error, _operation, target) => handleFirestoreError(error, OperationType.GET, target),
  });

  const { settlements, setSettlements } = useSettlements({
    enabled: !!user?.uid && !!userProfile?.role && needsRealtimeOperationalData,
    canAccessAllUsers,
    userEmail: user?.email,
    onError: (error, _operation, target) => handleFirestoreError(error, OperationType.GET, target),
  });

  useEffect(() => {
    if (userProfile && userProfile.role === 'seller' && user?.email) {
      setSelectedUserToLiquidate(user?.email || '');
      setArchiveUserEmail(user?.email || '');
    }
  }, [userProfile, user?.email]);

  const previousBusinessDayRef = useRef(businessDayKey);


  // Inactivity timeout logic
  useEffect(() => {
    if (!user) return;

    let timeoutId: NodeJS.Timeout;
    const timeoutMinutes = userProfile?.role === 'ceo' ? (userProfile.sessionTimeoutMinutes || 60) : 60;
    const timeoutMs = timeoutMinutes * 60 * 1000;

    const resetTimeout = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        handleLogout();
        toast.error('Sesión cerrada por inactividad');
      }, timeoutMs);
    };

    // Set initial timeout
    resetTimeout();

    // Listeners for user activity
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    events.forEach(event => window.addEventListener(event, resetTimeout));

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => window.removeEventListener(event, resetTimeout));
    };
  }, [user, userProfile?.sessionTimeoutMinutes, userProfile?.role]);

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

  // Form state
  const [number, setNumber] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [isAmountSelected, setIsAmountSelected] = useState(false);
  const [plAmount, setPlAmount] = useState('1.00');
  const [betType, setBetType] = useState<'CH' | 'PL' | 'BL'>('CH');
  const [chancePrice, setChancePrice] = useState<number>(0.20);
  const [personalChancePrice, setPersonalChancePrice] = useState<number>(0.20);
  const [globalChancePriceFilter, setGlobalChancePriceFilter] = useState<string>('');
  const [selectedLottery, setSelectedLottery] = useState('');
  const { lotteries } = useLotteries({
    enabled: !!user?.uid && !!userProfile?.role && shouldLoadLotteries,
    selectedLottery,
    setSelectedLottery,
    onError: (error, _operation, target) => handleFirestoreError(error, OperationType.GET, target)
  });
  const { results, setResults, getResultKey, sortResultsByRecency } = useResults({
    enabled: !!user?.uid && !!userProfile?.role && shouldLoadResults,
    businessDayKey,
    onError: (error, _operation, target) => handleFirestoreError(error, OperationType.GET, target)
  });
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

  const Cursor = () => <span className="w-[2px] h-6 bg-primary animate-blink inline-block align-middle ml-0.5" />;

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
          setIsAmountSelected(true);
          setTimeout(() => {
            amountInputRef.current?.focus();
            amountInputRef.current?.select();
          }, 0);
        }
      }
    } else {
      // For amount/quantity
      if (key === '.') {
        const currentVal = betType === 'CH' ? quantity : plAmount;
        if (currentVal.includes('.') || currentVal === '') return;
      }
      
      if (betType === 'CH') {
        if (isAmountSelected) {
          setQuantity(key === '.' ? '0.' : key);
          setIsAmountSelected(false);
        } else {
          setQuantity(quantity + key);
        }
      } else {
        if (isAmountSelected) {
          setPlAmount(key === '.' ? '0.' : key);
          setIsAmountSelected(false);
        } else if (plAmount === '1.00' && key !== '.') {
          setPlAmount(key);
        } else {
          setPlAmount(plAmount + key);
        }
      }
    }
  };

  const handleBackspace = () => {
    if (focusedField === 'number') {
      setNumber(number.slice(0, -1));
    } else {
      if (isAmountSelected) {
        if (betType === 'CH') setQuantity('');
        else setPlAmount('');
        setIsAmountSelected(false);
        return;
      }
      if (betType === 'CH') {
        const newVal = quantity.slice(0, -1);
        setQuantity(newVal || '');
      } else {
        const newVal = plAmount.slice(0, -1);
        setPlAmount(newVal || '1.00');
      }
    }
  };

  const handleClear = () => {
    setNumber('');
    if (betType === 'CH') setQuantity('1');
    else setPlAmount('1.00');
    setFocusedField('number');
  };

  const NumericKeyboard = ({ onKeyPress, onBackspace, onClear }: { 
    onKeyPress: (key: string) => void; 
    onBackspace: () => void;
    onClear: () => void;
  }) => {
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0'];
    
    return (
      <div className="grid grid-cols-3 gap-1.5 w-full max-w-md mx-auto">
        {keys.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => onKeyPress(key)}
            className="h-14 md:h-16 bg-white/5 border border-border rounded-xl text-xl font-bold hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center"
          >
            {key}
          </button>
        ))}
        <button
          type="button"
          onClick={onBackspace}
          className="h-14 md:h-16 bg-white/5 border border-border rounded-xl text-xl font-bold hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center"
        >
          <Delete className="w-6 h-6" />
        </button>
        <div className="col-span-3 flex justify-center mt-1">
          <button
            type="button"
            onClick={onClear}
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };
  const handleNumberChange = (val: string) => {
    const cleanVal = val.replace(/\D/g, '');
    setNumber(cleanVal);
    
    // Auto-focus logic
    const maxLength = betType === 'CH' ? 2 : 4;
    if (cleanVal.length === maxLength) {
      amountInputRef.current?.focus();
      amountInputRef.current?.select();
    }
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

        if (result.deletedCount > 0 || !result.archiveAlreadyExists) {
          toast.success(`Limpieza autom?tica 4:30 AM completada (${targetBusinessDay})`);
        } else {
          toast.info(`Limpieza autom?tica validada (${targetBusinessDay}, sin cambios pendientes)`);
        }
      } catch (error) {
        console.error('Error en limpieza autom?tica 4:30 AM:', error);
        toast.error('Fall? la limpieza autom?tica de las 4:30 AM. Se reintentar? autom?ticamente.');
      } finally {
        autoCleanupRunningRef.current = false;
      }
    })();
  }, [getQuickOperationalDate, runOperationalArchiveAndCleanup, user?.uid, userProfile?.role, tick]);

  // 1. Static/Global Data
  useEffect(() => {
    if (!user?.uid || !userProfile?.role) return;

    // Fetch global settings
    console.log("Fetching global settings for role:", userProfile.role);
    const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'global'), async (snapshot) => {
      if (snapshot.exists()) {
        console.log("Global settings fetched successfully");
        const data = snapshot.id ? { id: snapshot.id, ...snapshot.data() } as GlobalSettings : snapshot.data() as GlobalSettings;
        setGlobalSettings(data);
      } else {
        console.warn("Global settings document not found");
        // If CEO is logged in and settings are missing, initialize them
        if (userProfile.role === 'ceo') {
          console.log("Initializing global settings for the first time...");
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
          try {
            await setDoc(doc(db, 'settings', 'global'), initialSettings);
            console.log("Global settings initialized successfully");
            // Also initialize connectivity doc for testing
            await setDoc(doc(db, 'public', 'connectivity'), { lastTested: serverTimestamp() });
          } catch (err) {
            console.error("Error initializing global settings:", err);
          }
        }
      }
    }, (error) => {
      console.error("Error fetching global settings:", error);
      handleFirestoreError(error, OperationType.GET, 'settings/global');
    });

    return () => {
      unsubscribeSettings();
    };
  }, [user?.uid, userProfile?.role]);

  // 4. History Data (Conditional on Date)
  useEffect(() => {
    if (!user?.uid || !userProfile?.role || (activeTab !== 'history' && activeTab !== 'stats' && activeTab !== 'cierres')) return;
    let cancelled = false;

    const loadHistoricalData = async () => {
      const { start, end } = getBusinessDayRange(historyDate);
      const sellerEmail = user.email?.toLowerCase();
      const scopeKey = canAccessAllUsers ? 'global' : `seller:${sellerEmail || user.uid}`;
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
          where('sellerId', '==', user.uid),
          where('timestamp', '>=', start),
          where('timestamp', '<', end),
          limit(600)
        );
        const historyBySellerEmailQ = sellerEmail
          ? query(
              collection(db, 'tickets'),
              where('sellerEmail', '==', sellerEmail),
              where('timestamp', '>=', start),
              where('timestamp', '<', end),
              limit(600)
            )
          : null;

        const [historyByIdSnap, historyByEmailSnap, injectionSnap, settlementSnap, resultSnap] = await Promise.all([
          getDocs(historyBySellerIdQ),
          historyBySellerEmailQ ? getDocs(historyBySellerEmailQ) : Promise.resolve(null),
          sellerEmail ? getDocs(query(
            collection(db, 'injections'),
            where('userEmail', '==', sellerEmail),
            where('date', '==', historyDate),
            limit(500)
          )) : Promise.resolve(null),
          sellerEmail ? getDocs(query(
            collection(db, 'settlements'),
            where('userEmail', '==', sellerEmail),
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
          const loadedTickets = mergeTicketSnapshots(historyByIdSnap, historyByEmailSnap);
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
    user?.uid,
    user?.email,
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
    (t.sellerId === user?.uid || t.sellerEmail?.toLowerCase() === user?.email?.toLowerCase()) &&
    !t.liquidated
  );

  const canUpdatePersonalChancePrice = !hasOwnUnliquidatedSalesInBusinessDay;

  const addToCart = () => {
    if (!number || !quantity) {
      toast.error('Ingrese número y cantidad');
      return;
    }

    const qInt = parseInt(quantity);
    if (isNaN(qInt) || qInt <= 0) {
      toast.error('Cantidad inválida');
      return;
    }

    // Validate number length
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
      toast.error('Pales están desactivados');
      return;
    }
    if (betType === 'BL' && !globalSettings.billetesEnabled) {
      toast.error('Billetes están desactivados');
      return;
    }

    const lotteriesToBuy = new Set<string>();
    if (isMultipleMode) {
      multiLottery.forEach(l => {
        const lottery = findActiveLotteryByName(l);
        if (betType === 'BL' && !lottery?.isFourDigits) {
          toast.error(`Sorteo ${l} no admite Billetes (4 cifras)`);
          return;
        }
        lotteriesToBuy.add((lottery?.name || l).trim());
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
      toast.error('Seleccione al menos un sorteo válido');
      return;
    }

    let calculatedAmount = 0;
    if (betType === 'CH') {
      calculatedAmount = qInt * chancePrice;
    } else if (betType === 'BL') {
      calculatedAmount = parseFloat(plAmount); // Reusing plAmount for BL investment
      if (isNaN(calculatedAmount) || calculatedAmount < 0.10) {
        toast.error('Inversión mínima para Billete (BL) es USD 0.10');
        return;
      }
    } else {
      // For PL, quantity is units (max 5), plAmount is price per unit
      const costPerUnit = parseFloat(plAmount);
      if (isNaN(costPerUnit) || costPerUnit < 0.10 || costPerUnit > 5.00) {
        toast.error('Costo de Pale (PL) debe ser entre USD 0.10 y USD 5.00');
        return;
      }
      if (qInt > 5) {
        toast.error('Máximo 5 combinaciones por número en Pale (PL)');
        return;
      }
      calculatedAmount = qInt * costPerUnit;
    }

    // Check existing quantity for this number/lottery in cart and active tickets
    for (const lot of lotteriesToBuy) {
      if (betType === 'PL') {
        const inCart = cart
          .filter(b => b && b.number === number && b.lottery === lot && b.type === 'PL')
          .reduce((acc, b) => acc + b.quantity, 0);
        
        const inTickets = tickets
          .filter(t => t.status === 'active' && t.bets)
          .flatMap(t => t.bets)
          .filter(b => b && b.number === number && b.lottery === lot && b.type === 'PL')
          .reduce((acc, b) => acc + b.quantity, 0);

        if (inCart + inTickets + qInt > 5) {
          toast.error(`Excede límite de 5 combinaciones para #${number} en ${lot}`);
          return;
        }
      }
    }

    setCart(prevCart => {
      const newBets: Bet[] = [];
      lotteriesToBuy.forEach(lot => {
        newBets.push({
          number: number.trim(),
          lottery: lot.trim(),
          amount: calculatedAmount,
          type: betType,
          quantity: qInt
        });
      });
      return unifyBets([...prevCart, ...newBets]);
    });

    setNumber('');
    setQuantity('1');
    setPlAmount('1.00');
    setFocusedField('number');
    setTimeout(() => {
      numberInputRef.current?.focus();
    }, 0);
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const updateCartItemQuantity = (index: number, newQty: number) => {
    if (newQty < 1) return;
    const item = cart[index];
    if (!item) return;

    if (item.type === 'PL') {
      const lot = item.lottery;
      const num = item.number;
      
      const inCartOther = cart
        .filter((b, i) => b && i !== index && b.number === num && b.lottery === lot && b.type === 'PL')
        .reduce((acc, b) => acc + b.quantity, 0);
      
      const inTickets = tickets
        .filter(t => t.status === 'active' && t.bets)
        .flatMap(t => t.bets)
        .filter(b => b && b.number === num && b.lottery === lot && b.type === 'PL')
        .reduce((acc, b) => acc + b.quantity, 0);

      if (inCartOther + inTickets + newQty > 5) {
        toast.error(`Excede límite de 5 combinaciones para #${num} en ${lot}`);
        return;
      }
    }

    setCart(prev => prev.map((item, i) => {
      if (i !== index) return item;
      const unitAmount = item.amount / item.quantity;
      return { ...item, quantity: newQty, amount: unitAmount * newQty };
    }));
  };

  const updateCartItemAmount = (index: number, newAmount: number) => {
    if (newAmount < 0) return;
    setCart(prev => prev.map((item, i) => i === index ? { ...item, amount: newAmount } : item));
  };

  const clearCart = () => {
    if (cart.length === 0) return;
    setCart([]);
    toast.success('Panel limpiado');
  };

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
    if (!user || cart.length === 0 || isSubmittingSale || saleInFlightRef.current) return;
    setShowCheckoutModal(true);
  };

  const confirmSale = async () => {
    if (!user || cart.length === 0 || saleInFlightRef.current) return;

    saleInFlightRef.current = true;
    setIsSubmittingSale(true);

    const unifiedCart = unifyBets(cart);
    const totalAmount = unifiedCart.reduce((acc, item) => acc + item.amount, 0);
    const finalCustomerName = customerName.trim() || 'Cliente General';

    // Verify if any lottery in the cart is closed or has results
    const now = new Date();
    const todayStr = format(now, 'yyyy-MM-dd');
    for (const bet of unifiedCart) {
      const lot = lotteries.find(l => cleanText(l.name) === cleanText(bet.lottery));
      if (!lot) {
        toast.error(`Sorteo no encontrado: ${bet.lottery}`);
        return;
      }
      if (!isLotteryOpenForSales(lot)) {
        toast.error(`El sorteo ${bet.lottery} ya está cerrado.`);
        return;
      }
      const hasResult = results.some(r => cleanText(r.lotteryName) === cleanText(bet.lottery) && r.date === todayStr);
      if (hasResult) {
        toast.error(`El sorteo ${bet.lottery} ya tiene resultados.`);
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
          sellerId: user.uid,
          sellerCode: userProfile?.sellerId || '---',
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
          sellerId: user.uid,
          sellerCode: userProfile?.sellerId || '---',
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

  const isLotteryOpenForSales = (lot: Lottery) => {
    if (!lot.active) return false;
    if (!lot.closingTime) return true;
    
    try {
      const now = new Date();
      let currentHour = now.getHours();
      const currentMinutes = now.getMinutes();
      
      // Ajustar para el ciclo de 1 AM a 1 AM
      // Si es antes de la 1 AM, lo tratamos como horas 24, 25, 26
      const adjustedHour = currentHour < 1 ? currentHour + 24 : currentHour;
      const currentTimeVal = adjustedHour * 60 + currentMinutes;

      // Parse closing time safely
      const timeParts = lot.closingTime.match(/(\d+):(\d+)/);
      if (!timeParts) {
        console.warn(`Invalid closing time format for ${lot.name}: ${lot.closingTime}`);
        return true; // Default to open if format is weird
      }
      
      let closeH = parseInt(timeParts[1]);
      let closeM = parseInt(timeParts[2]);
      
      // Si la hora de cierre es antes de la 1 AM, también la ajustamos
      const adjustedCloseH = closeH < 1 ? closeH + 24 : closeH;
      const closeTimeVal = adjustedCloseH * 60 + closeM;

      const isOpen = currentTimeVal < closeTimeVal;
      return isOpen;
    } catch (e) {
      console.error(`Error in isLotteryOpenForSales for ${lot.name}:`, e);
      return true;
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

  const getLotteryDayStats = useCallback((lotteryName: string, date: string, typeFilter?: string) => {
    return calculateLotteryDayStats({
      lotteryName,
      date,
      typeFilter,
      businessDayKey,
      tickets,
      historyTickets,
      canAccessAllUsers,
      userUid: user?.uid,
      userEmail: user?.email,
      cleanText,
      getTicketPrizes,
    });
  }, [businessDayKey, tickets, historyTickets, canAccessAllUsers, user?.uid, user?.email, getTicketPrizes, cleanText]);

  const getStatsByDraw = useCallback((lotteryName: string, date: string) => {
    return calculateStatsByDraw({
      lotteryName,
      date,
      businessDayKey,
      tickets,
      historyTickets,
      canAccessAllUsers,
      userUid: user?.uid,
      userEmail: user?.email,
      cleanText,
      getTicketPrizes,
    });
  }, [businessDayKey, tickets, historyTickets, canAccessAllUsers, user?.uid, user?.email, getTicketPrizes, cleanText]);

  const getUserLotteryDayStats = (userEmail: string, lotteryName: string, date: string, typeFilter?: string) => {
    return calculateUserLotteryDayStats({
      userEmail,
      lotteryName,
      date,
      typeFilter,
      businessDayKey,
      tickets,
      historyTickets,
      getTicketPrizes,
    });
  };

  const globalStats = useMemo(() => {
    const typeFilterCode = historyFilter === 'CHANCE' ? 'CH' : 
                          historyFilter === 'BILLETE' ? 'BL' : 
                          historyFilter === 'PALE' ? 'PL' : undefined;
    
    let totalSales = 0;
    let totalCommissions = 0;
    let totalPrizes = 0;

    lotteries.forEach(lot => {
      const { sales, commissions, prizes } = getLotteryDayStats(lot.name, historyDate, typeFilterCode);
      totalSales += sales;
      totalCommissions += commissions;
      totalPrizes += prizes;
    });

    const totalInjections = injections
      .filter(i => {
        const matchesUser = canAccessAllUsers || i.userEmail?.toLowerCase() === user?.email?.toLowerCase();
        
        return matchesUser && i.date === historyDate;
      })
      .reduce((acc, i) => acc + i.amount, 0);

    const totalNetProfit = totalSales - totalCommissions - totalPrizes + totalInjections;
    const totalBankProfit = totalSales - totalCommissions - totalPrizes;
    
    return { 
      sales: totalSales, 
      commissions: totalCommissions, 
      prizes: totalPrizes, 
      injections: totalInjections,
      bankProfit: totalBankProfit,
      netProfit: totalNetProfit,
      isLoss: totalNetProfit < 0 
    };
  }, [lotteries, getLotteryDayStats, historyDate, historyFilter, injections, userProfile]);

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
  const activeLotteries = useMemo(() => {
    const seenNames = new Set<string>();
    return sortedLotteries
      .filter(l => isLotteryOpenForSales(l))
      .filter(lottery => {
        const key = normalizeLotteryName(lottery.name);
        if (!key || seenNames.has(key)) return false;
        seenNames.add(key);
        return true;
      });
  }, [sortedLotteries]);
  const findActiveLotteryByName = useCallback((name: string) => {
    const key = normalizeLotteryName(name);
    return activeLotteries.find(l => normalizeLotteryName(l.name) === key);
  }, [activeLotteries]);
  const canManageResults = userProfile?.role === 'ceo' || userProfile?.role === 'admin' || userProfile?.role === 'programador';
  const isCeoUser = userProfile?.role === 'ceo' || userProfile?.role === 'programador';
  const sortedResults = useMemo(() => sortResultsByRecency(results), [results, sortResultsByRecency]);
  const operationalResults = useMemo(() => {
    return sortedResults.filter(result => result.date === businessDayKey);
  }, [businessDayKey, sortedResults]);
  const lotteryById = useMemo(() => {
    return new Map(sortedLotteries.map(lottery => [lottery.id, lottery]));
  }, [sortedLotteries]);
  const visibleResults = useMemo(() => {
    const orderedByDrawTime = [...operationalResults].sort((a, b) => {
      const aTime = lotteryById.get(a.lotteryId)?.drawTime || '00:00';
      const bTime = lotteryById.get(b.lotteryId)?.drawTime || '00:00';
      const timeDiff = getOperationalTimeSortValue(aTime) - getOperationalTimeSortValue(bTime);
      if (timeDiff !== 0) return timeDiff;
      return (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0);
    });
    return canManageResults ? orderedByDrawTime.slice(0, 200) : orderedByDrawTime.slice(0, 80);
  }, [canManageResults, getOperationalTimeSortValue, lotteryById, operationalResults]);

  const takenResultLotteryIdsForDate = useMemo(() => {
    const used = new Set<string>();
    sortedResults.forEach(result => {
      if (result.date === resultFormDate && result.lotteryId) {
        used.add(result.lotteryId);
      }
    });
    return used;
  }, [resultFormDate, sortedResults]);

  const availableResultLotteries = useMemo(() => {
    return sortedLotteries.filter(lottery =>
      (
        lottery.active ||
        lottery.id === editingResult?.lotteryId
      ) &&
      (
        !takenResultLotteryIdsForDate.has(lottery.id) ||
        lottery.id === editingResult?.lotteryId
      )
    );
  }, [editingResult?.lotteryId, sortedLotteries, takenResultLotteryIdsForDate]);

  const resultStatusMap = useMemo(() => {
    const map = new Map<string, { sales: number; prizes: number; hasWinners: boolean }>();
    if (!canManageResults || !user?.uid) return map;

    const currentEmail = (user.email || '').toLowerCase();
    const ownTickets = tickets.filter(ticket =>
      (ticket.status === 'active' || ticket.status === 'winner') &&
      (
        ticket.sellerId === user.uid ||
        (ticket.sellerEmail || '').toLowerCase() === currentEmail
      )
    );

    visibleResults.forEach(result => {
      let sales = 0;
      let prizes = 0;

      ownTickets.forEach(ticket => {
        if (getTicketDateKey(ticket) !== result.date) return;
        const matchingBets = (ticket.bets || []).filter(bet => cleanText(bet.lottery) === cleanText(result.lotteryName));
        if (!matchingBets.length) return;
        sales += matchingBets.reduce((sum, bet) => sum + (bet.amount || 0), 0);
        prizes += getTicketPrizesFromSource(ticket, [result], result.lotteryName).totalPrize;
      });

      map.set(getResultKey(result), { sales, prizes, hasWinners: prizes > 0 });
    });

    return map;
  }, [canManageResults, getResultKey, getTicketDateKey, getTicketPrizesFromSource, tickets, user?.email, user?.uid, visibleResults]);

  // Auto-select first active lottery if none selected or current is closed
  useEffect(() => {
    if (activeLotteries.length > 0) {
      if (!isMultipleMode) {
        if (!selectedLottery || !findActiveLotteryByName(selectedLottery)) {
          setSelectedLottery(activeLotteries[0].name);
        }
      } else {
        // Filter closed lotteries from multiLottery
        const validMulti = multiLottery.filter(name => !!findActiveLotteryByName(name));
        if (validMulti.length !== multiLottery.length) {
          setMultiLottery(validMulti);
        }
      }
    } else {
      if (selectedLottery !== '') setSelectedLottery('');
      if (multiLottery.length > 0) setMultiLottery([]);
    }
  }, [activeLotteries, findActiveLotteryByName, isMultipleMode, selectedLottery, multiLottery]);

  useEffect(() => {
    if (betType === 'BL') {
      const supportsBL = isMultipleMode 
        ? multiLottery.some(name => findActiveLotteryByName(name)?.isFourDigits)
        : findActiveLotteryByName(selectedLottery)?.isFourDigits;
      
      if (!supportsBL) {
        setBetType('CH');
        setNumber('');
      }
    }
  }, [betType, findActiveLotteryByName, isMultipleMode, multiLottery, selectedLottery]);

  const cancelTicket = async (id: string) => {
    const ticket = tickets.find(t => t.id === id);
    if (!ticket) return;

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
  const saveUser = async (userProfileData: UserProfile, password?: string) => {
    const rawEmail = userProfileData.email.toLowerCase();
    const authEmail = rawEmail.includes('@') ? rawEmail : `${rawEmail}@chancepro.local`;

    if (userProfileData.role === 'admin') {
      const adminCount = users.filter(u => u.role === 'admin' && u.email !== authEmail).length;
      if (adminCount >= 5) {
        toast.error('Límite máximo de 5 administradores alcanzado');
        return;
      }
    }

    if (userProfileData.role === 'ceo') {
      const ceoCount = users.filter(u => u.role === 'ceo' && u.email !== authEmail).length;
      if (ceoCount >= 3) {
        toast.error('Límite máximo de 3 CEO alcanzado');
        return;
      }
    }

    try {
      // Automate sellerId generation for new users (all roles)
      if (!userProfileData.sellerId) {
        const newSellerId = await reserveNextSellerId(userProfileData.role);
        userProfileData.sellerId = newSellerId;
        userProfileData.name = newSellerId;
      }

      if (password) {
        if (!secondaryAuth) {
          throw new Error('Servicio de autenticación secundaria no disponible');
        }
        // Create user in Firebase Auth using secondary app to avoid signing out the CEO
        try {
          await signOut(secondaryAuth).catch(() => undefined);
          await createUserWithEmailAndPassword(secondaryAuth, authEmail, password);
        } catch (authError: any) {
          if (authError.code === 'auth/email-already-in-use') {
            toast.info('El usuario ya existe en el sistema. Actualizando su perfil...');
          } else {
            throw authError;
          }
        } finally {
          await signOut(secondaryAuth).catch(() => undefined);
        }
        // Ensure the email saved in Firestore is the one used for auth
        userProfileData.email = authEmail;
      } else if (!userProfileData.email.includes('@')) {
        userProfileData.email = authEmail;
      }

      if (editingUser?.preferredChancePrice !== undefined && userProfileData.preferredChancePrice === undefined) {
        userProfileData.preferredChancePrice = editingUser.preferredChancePrice;
      }

      // Firestore does not support undefined values. Strip them out.
      const normalizedFirestoreEmail = (userProfileData.email || authEmail).toLowerCase();
      userProfileData.email = normalizedFirestoreEmail;
      const cleanData = Object.fromEntries(
        Object.entries(userProfileData).filter(([_, v]) => v !== undefined)
      );

      await saveUserProfile(normalizedFirestoreEmail, cleanData);
      
      if (editingUser?.email?.toLowerCase() === userProfile?.email?.toLowerCase()) {
        setUserProfile(cleanData as UserProfile);
      }
      
      toast.success('Usuario guardado correctamente');
      setShowUserModal(false);
      setEditingUser(null);
    } catch (error: any) {
      console.error('Error saving user:', error);
      if (error.code === 'auth/email-already-in-use') {
        toast.error('El usuario ya existe');
      } else if (error.code === 'auth/invalid-email') {
        toast.error('El formato del usuario es inválido');
      } else if (error.code === 'auth/weak-password') {
        toast.error('La contraseña es muy débil');
      } else if (error.code === 'auth/admin-restricted-operation') {
        toast.error('Error: El registro de usuarios está restringido. Por favor, habilite "Permitir que los usuarios se registren" en la consola de Firebase (Authentication > Settings > User actions).');
      } else if (error.code === 'auth/operation-not-allowed') {
        toast.error('El registro de usuarios no está habilitado en Firebase');
      } else {
        toast.error(`Error: ${error.message || 'No se pudo guardar el usuario'}`);
      }
    }
  };

  const deleteUser = async (email: string) => {
    setConfirmModal({
      show: true,
      title: 'Eliminar Usuario',
      message: '¿Está seguro de eliminar este usuario? Perderá acceso al sistema.',
      onConfirm: async () => {
        try {
          await deleteUserProfile(email);
          toast.success('Usuario eliminado correctamente');
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `users/${email}`);
        }
      }
    });
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

  const saveLottery = async (lotteryData: Partial<Lottery>) => {
    try {
      const normalizedName = normalizeLotteryName(lotteryData.name || '');
      if (!normalizedName) {
        toast.error('Ingrese un nombre de sorteo válido');
        return;
      }

      const hasDuplicateName = lotteries.some(lottery => {
        if (editingLottery && lottery.id === editingLottery.id) return false;
        return normalizeLotteryName(lottery.name) === normalizedName;
      });

      if (hasDuplicateName) {
        toast.error('Ya existe un sorteo con ese nombre. Use un nombre único.');
        return;
      }

      if (editingLottery) {
        await updateLottery(editingLottery.id, lotteryData);
        toast.success('Lotería actualizada');
      } else {
        await createLottery({
          ...lotteryData,
          active: true
        });
        toast.success('Lotería agregada');
      }
      setShowLotteryModal(false);
      setEditingLottery(null);
    } catch (error) {
      handleFirestoreError(error, editingLottery ? OperationType.UPDATE : OperationType.CREATE, 'lotteries');
    }
  };

  const toggleLotteryActive = async (lottery: Lottery) => {
    try {
      await setLotteryActive(lottery.id, !lottery.active);
      toast.success(`Lotería ${lottery.active ? 'pausada' : 'activada'}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `lotteries/${lottery.id}`);
    }
  };

  const deleteLottery = async (id: string) => {
    setConfirmModal({
      show: true,
      title: 'Eliminar Lotería',
      message: '¿Está seguro de eliminar esta lotería? Esta acción no se puede deshacer.',
      onConfirm: async () => {
        try {
          await deleteLotteryById(id);
          toast.success('Lotería eliminada');
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `lotteries/${id}`);
        }
      }
    });
  };

  const resetResultForm = useCallback(() => {
    setResultFormLotteryId('');
    setResultFormFirstPrize('');
    setResultFormSecondPrize('');
    setResultFormThirdPrize('');
  }, []);

  const cancelResultEdition = useCallback(() => {
    setEditingResult(null);
    setResultFormDate(businessDayKey);
    resetResultForm();
  }, [businessDayKey, resetResultForm]);

  useEffect(() => {
    if (!editingResult) return;
    setResultFormLotteryId(editingResult.lotteryId);
    setResultFormDate(isCeoUser ? editingResult.date : businessDayKey);
    setResultFormFirstPrize(editingResult.firstPrize);
    setResultFormSecondPrize(editingResult.secondPrize);
    setResultFormThirdPrize(editingResult.thirdPrize);
  }, [businessDayKey, editingResult, isCeoUser]);

  useEffect(() => {
    if (!canManageResults) return;
    if (!isCeoUser && resultFormDate !== businessDayKey) {
      setResultFormDate(businessDayKey);
    }
  }, [businessDayKey, canManageResults, isCeoUser, resultFormDate]);

  const handleCreateResultFromForm = useCallback(async () => {
    if (!canManageResults) {
      toast.error('No tiene permisos para ingresar resultados');
      return;
    }
    if (!resultFormLotteryId || !resultFormDate || !resultFormFirstPrize || !resultFormSecondPrize || !resultFormThirdPrize) {
      toast.error('Complete todos los campos del resultado');
      return;
    }

    if (!isCeoUser && resultFormDate !== businessDayKey) {
      toast.error('Solo el CEO puede trabajar resultados fuera de la fecha operativa');
      setResultFormDate(businessDayKey);
      return;
    }

    const selectedLottery = sortedLotteries.find(lottery => lottery.id === resultFormLotteryId);
    if (!selectedLottery) {
      toast.error('Seleccione un sorteo válido');
      return;
    }

    const alreadyExists = results.some(result =>
      result.lotteryId === resultFormLotteryId &&
      result.date === resultFormDate &&
      result.id !== editingResult?.id
    );
    if (alreadyExists) {
      toast.error('Ese sorteo ya tiene resultado para la fecha seleccionada');
      return;
    }

    const saved = await saveResult({
      lotteryId: resultFormLotteryId,
      lotteryName: cleanText(selectedLottery.name),
      date: resultFormDate,
      firstPrize: resultFormFirstPrize,
      secondPrize: resultFormSecondPrize,
      thirdPrize: resultFormThirdPrize
    });

    if (saved) {
      setResultFormDate(businessDayKey);
      resetResultForm();
      setEditingResult(null);
    }
  }, [businessDayKey, canManageResults, editingResult?.id, isCeoUser, resetResultForm, resultFormDate, resultFormFirstPrize, resultFormLotteryId, resultFormSecondPrize, resultFormThirdPrize, results, sortedLotteries]);

  const saveResult = async (resultData: Partial<LotteryResult>) => {
    if (!canManageResults) {
      toast.error('No tiene permisos para guardar resultados');
      return false;
    }

    if (!isCeoUser && resultData.date !== businessDayKey) {
      toast.error('Solo el CEO puede guardar resultados fuera de la fecha operativa');
      return false;
    }

    const duplicate = results.some(result =>
      result.lotteryId === resultData.lotteryId &&
      result.date === resultData.date &&
      result.id !== editingResult?.id
    );
    if (duplicate) {
      toast.error('Ese sorteo ya tiene resultado para esa fecha');
      return false;
    }

    try {
      if (editingResult) {
        await updateResult(editingResult.id, {
          ...resultData,
          timestamp: serverTimestamp()
        });
        toast.success('Resultado actualizado');
      } else {
        await createResult({
          ...resultData,
          timestamp: serverTimestamp()
        });
        toast.success('Resultado ingresado');
      }
      setEditingResult(null);
      return true;
    } catch (error) {
      handleFirestoreError(error, editingResult ? OperationType.UPDATE : OperationType.CREATE, 'results');
      return false;
    }
  };

  const deleteResult = async (id: string) => {
    if (!canManageResults) {
      toast.error('No tiene permisos para eliminar resultados');
      return;
    }
    setConfirmModal({
      show: true,
      title: 'Eliminar Resultado',
      message: '¿Está seguro de eliminar este resultado? Esta acción no se puede deshacer.',
      onConfirm: async () => {
        try {
          await deleteResultById(id);
          toast.success('Resultado eliminado');
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `results/${id}`);
        }
      }
    });
  };

  const {
    amountPaid,
    setAmountPaid,
    selectedLiquidationSettlement,
    liquidationPreview,
  } = useLiquidation({
    businessDayKey,
    selectedUserToLiquidate,
    liquidationDate,
    users,
    tickets,
    injections,
    results,
    liquidationTicketsSnapshot,
    liquidationInjectionsSnapshot,
    liquidationResultsSnapshot,
    settlements,
    liquidationSettlementsSnapshot,
    buildFinancialSummary,
    getTicketPrizesFromSource,
  });

  const handleLiquidate = async () => {
    if (!selectedUserToLiquidate) return;
    if (!userProfile || !['ceo', 'admin', 'programador'].includes(userProfile.role)) {
      alert('No tienes permisos para liquidar');
      return;
    }
    if (liquidationDate !== businessDayKey && isLiquidationDataLoading) {
      toast.error('Espera a que termine la carga de datos históricos');
      return;
    }

    if (!liquidationPreview) return;
    const {
      userToLiquidate,
      isCurrentOperationalDate,
      financialSummary,
      ticketsToLiquidate,
      injectionsToLiquidate,
      paid,
      netProfit,
      debtAdded,
      newTotalDebt,
      actionLabel,
    } = liquidationPreview;
    const totalSales = financialSummary.totalSales;
    const totalCommissions = financialSummary.totalCommissions;
    const totalPrizes = financialSummary.totalPrizes;
    const totalInjections = financialSummary.totalInjections;

    setConfirmModal({
      show: true,
      title: selectedLiquidationSettlement ? 'Actualizar Liquidación' : 'Confirmar Liquidación Diaria',
      message: `¿Está seguro de ${actionLabel} a ${userToLiquidate.name} para el día ${liquidationDate}? \
\
Utilidad Neta: USD ${netProfit.toFixed(2)}\
Monto Entregado: USD ${paid.toFixed(2)}\
Deuda Añadida: USD ${debtAdded.toFixed(2)}\
Nueva Deuda Total: USD ${newTotalDebt.toFixed(2)}`,
      onConfirm: async () => {
        try {
          const normalizedUserEmail = userToLiquidate.email.toLowerCase();
          let existingSettlement = selectedLiquidationSettlement;

          if (!existingSettlement) {
            const settlementQueryByLower = await getDocs(query(
              collection(db, 'settlements'),
              where('userEmail', '==', normalizedUserEmail),
              where('date', '==', liquidationDate),
              limit(5)
            ));
            const lowerMatches = settlementQueryByLower.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Settlement));
            if (lowerMatches.length > 1) {
              console.warn('Se encontraron múltiples settlements para el mismo usuario+fecha. Se actualizará el más reciente.', lowerMatches.map(item => item.id));
            }
            existingSettlement = lowerMatches.sort((a, b) => {
              const aTime = a.timestamp?.toDate?.()?.getTime?.() ?? (a.timestamp?.seconds ? a.timestamp.seconds * 1000 : 0);
              const bTime = b.timestamp?.toDate?.()?.getTime?.() ?? (b.timestamp?.seconds ? b.timestamp.seconds * 1000 : 0);
              return bTime - aTime;
            })[0] || null;
          }

          const currentDebtValue = userToLiquidate.currentDebt || 0;
          const baselineDebt = currentDebtValue - (existingSettlement?.debtAdded || 0);
          const finalDebtAdded = netProfit - paid;
          const finalNewTotalDebt = baselineDebt + finalDebtAdded;

          const settlementPayload = {
            userEmail: normalizedUserEmail,
            sellerEmail: normalizedUserEmail,
            sellerId: userToLiquidate.sellerId || null,
            date: liquidationDate,
            totalSales,
            totalCommissions,
            totalPrizes,
            totalInjections,
            netProfit,
            net: netProfit,
            amountPaid: paid,
            debtAdded: finalDebtAdded,
            previousDebt: baselineDebt,
            newTotalDebt: finalNewTotalDebt,
            liquidatedBy: userProfile?.email,
            updatedAt: serverTimestamp()
          };

          let settlementId = existingSettlement?.id || '';
          if (existingSettlement) {
            await updateDoc(doc(db, 'settlements', existingSettlement.id), settlementPayload);
          } else {
            const settlementRef = await addDoc(collection(db, 'settlements'), {
              ...settlementPayload,
              timestamp: serverTimestamp()
            });
            settlementId = settlementRef.id;
          }

          const effectiveSettlementId = settlementId || existingSettlement?.id || '';
          console.log('Settlement guardado:', effectiveSettlementId);
          console.log('Tickets a liquidar (solo día actual):', ticketsToLiquidate.length);

          const userRef = doc(db, 'users', userToLiquidate.email);
          await updateDoc(userRef, { currentDebt: finalNewTotalDebt });

          const secondaryWarnings: string[] = [];

          if (isCurrentOperationalDate && effectiveSettlementId) {
            if (ticketsToLiquidate.length > 0) {
              try {
                for (let i = 0; i < ticketsToLiquidate.length; i += 450) {
                  const chunk = ticketsToLiquidate.slice(i, i + 450);
                  const batch = writeBatch(db);
                  chunk.forEach(ticket => {
                    if (ticket.status !== 'active') return;
                    if (ticket.settlementId || ticket.liquidated) return;
                    batch.update(doc(db, 'tickets', ticket.id), {
                      status: 'liquidated',
                      liquidated: true,
                      settlementId: effectiveSettlementId
                    });
                  });
                  await batch.commit();
                }
              } catch (ticketUpdateError) {
                console.error('Error actualizando tickets:', ticketUpdateError);
                secondaryWarnings.push('tickets');
              }
            }

            if (injectionsToLiquidate.length > 0) {
              try {
                for (let i = 0; i < injectionsToLiquidate.length; i += 500) {
                  const chunk = injectionsToLiquidate.slice(i, i + 500);
                  const batch = writeBatch(db);
                  chunk.forEach(injection => {
                    if (injection.settlementId || injection.liquidated) return;
                    batch.update(doc(db, 'injections', injection.id), {
                      liquidated: true,
                      settlementId: effectiveSettlementId
                    });
                  });
                  await batch.commit();
                }
              } catch (injectionUpdateError) {
                console.error('Error actualizando inyecciones:', injectionUpdateError);
                secondaryWarnings.push('inyecciones');
              }
            }
          }

          const liquidatedTicketIds = new Set(ticketsToLiquidate.map(ticket => ticket.id));
          const liquidatedInjectionIds = new Set(injectionsToLiquidate.map(injection => injection.id));

          if (isCurrentOperationalDate && effectiveSettlementId) {
            setTickets(prev => prev.map(ticket => (
              liquidatedTicketIds.has(ticket.id)
                ? { ...ticket, liquidated: true, settlementId: effectiveSettlementId, status: 'liquidated' as any }
                : ticket
            )));
            setInjections(prev => prev.map(injection => (
              liquidatedInjectionIds.has(injection.id)
                ? { ...injection, liquidated: true, settlementId: effectiveSettlementId }
                : injection
            )));
          }

          setUsers(prev => prev.map(userItem => (
            userItem.email === userToLiquidate.email
              ? { ...userItem, currentDebt: finalNewTotalDebt }
              : userItem
          )));

          const settlementStateItem: Settlement = {
            id: effectiveSettlementId,
            userEmail: normalizedUserEmail,
            date: liquidationDate,
            totalSales,
            totalCommissions,
            totalPrizes,
            totalInjections,
            netProfit,
            amountPaid: paid,
            debtAdded: finalDebtAdded,
            previousDebt: baselineDebt,
            newTotalDebt: finalNewTotalDebt,
            liquidatedBy: userProfile?.email || '',
            timestamp: existingSettlement?.timestamp || (new Date() as any)
          };

          const upsertSettlement = (list: Settlement[]) => {
            const idx = list.findIndex(item => item.id === settlementStateItem.id);
            if (idx === -1) return [settlementStateItem, ...list];
            const next = [...list];
            next[idx] = settlementStateItem;
            return next;
          };

          setSettlements(prev => upsertSettlement(prev));
          if (!isCurrentOperationalDate) {
            setLiquidationSettlementsSnapshot(prev => upsertSettlement(prev));
          }

          if (secondaryWarnings.length > 0 && isCurrentOperationalDate) {
            toast.warning(`Liquidación guardada. Hubo incidencias secundarias en: ${secondaryWarnings.join(', ')}`);
          } else {
            toast.success(existingSettlement ? 'Liquidación actualizada correctamente' : 'Liquidación guardada correctamente');
          }

          setAmountPaid(String(paid));
        } catch (error) {
          console.error('ERROR LIQUIDACION:', error);
          alert('Error al guardar la liquidación. Revisa conexión o permisos.');
          handleFirestoreError(error, OperationType.WRITE, 'settlements');
        }
      }
    });
  };
  const generateConsolidatedReport = async () => {
    if (!isPrimaryCeoUser) {
      toast.error('Solo el CEO propietario puede generar este reporte');
      return;
    }

    const reportStartDate = consolidatedMode === 'day' ? consolidatedReportDate : consolidatedStartDate;
    const reportEndDate = consolidatedMode === 'day' ? consolidatedReportDate : consolidatedEndDate;

    if (!reportStartDate || !reportEndDate) {
      toast.error('Selecciona el rango de fechas del consolidado');
      return;
    }

    if (reportStartDate > reportEndDate) {
      toast.error('La fecha inicial no puede ser mayor que la fecha final');
      return;
    }

    const { start } = getBusinessDayRange(reportStartDate);
    const { end } = getBusinessDayRange(reportEndDate);

    const toastId = toast.loading(`Generando consolidado ${reportStartDate} -> ${reportEndDate}...`);
    setIsGeneratingYesterdayReport(true);

    try {
      const [ticketsSnap, injectionsSnap, settlementsSnap, resultsSnap, archivesSnap] = await Promise.all([
        getDocs(query(
          collection(db, 'tickets'),
          where('timestamp', '>=', start),
          where('timestamp', '<', end),
          limit(5000)
        )),
        getDocs(query(
          collection(db, 'injections'),
          where('date', '>=', reportStartDate),
          where('date', '<=', reportEndDate),
          limit(3000)
        )),
        getDocs(query(
          collection(db, 'settlements'),
          where('date', '>=', reportStartDate),
          where('date', '<=', reportEndDate),
          limit(3000)
        )),
        getDocs(query(
          collection(db, 'results'),
          where('date', '>=', reportStartDate),
          where('date', '<=', reportEndDate),
          limit(300)
        )),
        getDocs(query(
          collection(db, 'daily_archives'),
          where('date', '>=', reportStartDate),
          where('date', '<=', reportEndDate),
          limit(120)
        ))
      ]);

      const archivedPayload = archivesSnap.docs.map(d => d.data() as {
        date?: string;
        tickets?: LotteryTicket[];
        injections?: Injection[];
        settlements?: Settlement[];
        results?: LotteryResult[];
      });
      const archivedTickets = archivedPayload.flatMap(item => item.tickets || []);
      const archivedInjections = archivedPayload.flatMap(item => item.injections || []);
      const archivedSettlements = archivedPayload.flatMap(item => item.settlements || []);
      const archivedResults = archivedPayload.flatMap(item => item.results || []);

      const dedupeById = <T extends { id?: string }>(items: T[]) => {
        const map = new Map<string, T>();
        items.forEach((item, index) => {
          const key = item?.id || `no-id-${index}`;
          if (!map.has(key)) map.set(key, item);
        });
        return Array.from(map.values());
      };

      const reportTickets = dedupeById([
        ...ticketsSnap.docs.map(d => ({ id: d.id, ...d.data() } as LotteryTicket)),
        ...archivedTickets
      ])
        .filter(t => {
          const normalizedStatus = String(t.status || '').toLowerCase();
          return normalizedStatus !== 'cancelled';
        });
      const reportInjections = dedupeById([
        ...injectionsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Injection)),
        ...archivedInjections
      ]);
      const reportSettlements = dedupeById([
        ...settlementsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Settlement)),
        ...archivedSettlements
      ]);
      const reportResults = dedupeById([
        ...resultsSnap.docs.map(d => ({ id: d.id, ...d.data() } as LotteryResult)),
        ...archivedResults
      ]);

      type ReportUserData = {
        key: string;
        email: string;
        name: string;
        sellerId?: string;
        summary: ReturnType<typeof buildFinancialSummary>;
        tickets: LotteryTicket[];
      };
      const reportUsersMap = new Map<string, ReportUserData>();
      const normalizeText = (value?: string) => (value || '').toLowerCase().trim();
      const findUserProfileByEmail = (email: string) => users.find(u => normalizeText(u.email) === normalizeText(email));
      const findUserProfileBySeller = (sellerId?: string, fallbackName?: string) => {
        const seller = normalizeText(sellerId);
        if (seller) {
          const bySeller = users.find(u => normalizeText(u.sellerId) === seller);
          if (bySeller) return bySeller;
        }
        const fallback = normalizeText(fallbackName);
        if (fallback) {
          return users.find(u => normalizeText(u.name) === fallback);
        }
        return undefined;
      };
      const createEmptySummary = () => ({
        tickets: [] as LotteryTicket[],
        injections: [] as Injection[],
        settlements: [] as Settlement[],
        totalSales: 0,
        totalCommissions: 0,
        totalPrizes: 0,
        totalInjections: 0,
        totalLiquidations: 0,
        netProfit: 0
      });
      const ensureReportUser = (identity: {
        key: string;
        email?: string;
        fallbackName?: string;
        fallbackSellerId?: string;
      }) => {
        if (!reportUsersMap.has(identity.key)) {
          const email = normalizeText(identity.email);
          const profile = email
            ? findUserProfileByEmail(email)
            : findUserProfileBySeller(identity.fallbackSellerId, identity.fallbackName);
          reportUsersMap.set(identity.key, {
            key: identity.key,
            email: email || normalizeText(profile?.email),
            name: profile?.name || identity.fallbackName || email || 'Usuario',
            sellerId: profile?.sellerId || identity.fallbackSellerId,
            summary: createEmptySummary(),
            tickets: []
          });
        }
        return reportUsersMap.get(identity.key)!;
      };

      const getTicketIdentity = (ticket: LotteryTicket) => {
        const email = normalizeText(ticket.sellerEmail);
        const sellerRef = normalizeText(ticket.sellerId || ticket.sellerCode);
        const nameRef = normalizeText(ticket.sellerName);
        if (email) {
          return { key: `email:${email}`, email, fallbackName: ticket.sellerName, fallbackSellerId: ticket.sellerCode || ticket.sellerId };
        }
        if (sellerRef) {
          return { key: `seller:${sellerRef}`, email: '', fallbackName: ticket.sellerName, fallbackSellerId: ticket.sellerCode || ticket.sellerId };
        }
        return { key: `name:${nameRef || 'sin-nombre'}`, email: '', fallbackName: ticket.sellerName || 'Sin nombre', fallbackSellerId: ticket.sellerCode || ticket.sellerId };
      };

      reportTickets.forEach(ticket => {
        const identity = getTicketIdentity(ticket);
        const userData = ensureReportUser(identity);
        userData.tickets.push(ticket);
      });
      reportInjections.forEach(inj => {
        const email = normalizeText(inj.userEmail);
        ensureReportUser({ key: `email:${email || 'sin-correo'}`, email });
      });
      reportSettlements.forEach(settlement => {
        const email = normalizeText(settlement.userEmail);
        ensureReportUser({ key: `email:${email || 'sin-correo'}`, email });
      });

      reportUsersMap.forEach((userData) => {
        const userTickets = [...userData.tickets].sort((a, b) => {
          const aTime = (a.timestamp as any)?.toDate?.()?.getTime?.() ?? 0;
          const bTime = (b.timestamp as any)?.toDate?.()?.getTime?.() ?? 0;
          return aTime - bTime;
        });
        const normalizedUserEmail = normalizeText(userData.email);
        const userInjections = normalizedUserEmail
          ? reportInjections.filter(injection => normalizeText(injection.userEmail) === normalizedUserEmail && (injection.type || 'injection') === 'injection')
          : [];
        const userSettlements = normalizedUserEmail
          ? reportSettlements.filter(settlement => normalizeText(settlement.userEmail) === normalizedUserEmail)
          : [];

        const totalSales = userTickets.reduce((sum, ticket) => sum + (ticket.totalAmount || 0), 0);
        const totalCommissions = userTickets.reduce((sum, ticket) => sum + ((ticket.totalAmount || 0) * ((ticket.commissionRate || 0) / 100)), 0);
        const totalPrizes = userTickets.reduce((sum, ticket) => sum + (getTicketPrizesFromSource(ticket, reportResults).totalPrize || 0), 0);
        const totalInjections = userInjections.reduce((sum, injection) => sum + (injection.amount || 0), 0);
        const totalLiquidations = userSettlements.reduce((sum, settlement) => sum + (settlement.amountPaid || 0), 0);
        const netProfit = totalSales - totalCommissions - totalPrizes + totalInjections;

        userData.summary = {
          tickets: userTickets,
          injections: userInjections,
          settlements: userSettlements,
          totalSales,
          totalCommissions,
          totalPrizes,
          totalInjections,
          totalLiquidations,
          netProfit
        };
        userData.tickets = userTickets;
      });

      const reportUsers = Array.from(reportUsersMap.values())
        .filter(userData => (
          userData.summary.totalSales > 0 ||
          userData.summary.totalPrizes > 0 ||
          userData.summary.totalInjections > 0 ||
          userData.summary.totalLiquidations > 0
        ))
        .sort((a, b) => a.name.localeCompare(b.name));

      const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
      const marginX = 12;
      const maxWidth = 186;
      const pageHeight = pdf.internal.pageSize.getHeight();
      const lineHeight = 5;
      let y = 14;

      const ensureSpace = (lines = 1) => {
        if (y + (lines * lineHeight) > pageHeight - 12) {
          pdf.addPage();
          y = 14;
        }
      };

      const writeLine = (text: string, font: 'normal' | 'bold' = 'normal', size = 9) => {
        pdf.setFont('helvetica', font);
        pdf.setFontSize(size);
        const lines = pdf.splitTextToSize(text, maxWidth) as string[];
        lines.forEach(line => {
          ensureSpace(1);
          pdf.text(line, marginX, y);
          y += lineHeight;
        });
      };

      const separator = () => {
        writeLine('==================================================', 'normal', 8);
      };

      const globalSales = reportUsers.reduce((acc, u) => acc + u.summary.totalSales, 0);
      const globalPrizes = reportUsers.reduce((acc, u) => acc + u.summary.totalPrizes, 0);
      const globalInjections = reportUsers.reduce((acc, u) => acc + u.summary.totalInjections, 0);
      const globalCommissions = reportUsers.reduce((acc, u) => acc + u.summary.totalCommissions, 0);
      const globalLiquidations = reportUsers.reduce((acc, u) => acc + u.summary.totalLiquidations, 0);
      const globalNet = globalSales - globalCommissions - globalPrizes + globalInjections;

      writeLine('REPORTE CONSOLIDADO EJECUTIVO', 'bold', 15);
      writeLine(`Rango operativo: ${reportStartDate} -> ${reportEndDate}`, 'bold', 10);
      writeLine(`Generado: ${format(new Date(), 'dd/MM/yyyy hh:mm a')}`, 'normal', 9);
      separator();
      writeLine('RESUMEN GLOBAL', 'bold', 11);
      writeLine(`Usuarios con actividad: ${reportUsers.length}`);
      writeLine(`Total ventas: USD ${globalSales.toFixed(2)}`);
      writeLine(`Total premios: USD ${globalPrizes.toFixed(2)}`);
      writeLine(`Total inyecciones: USD ${globalInjections.toFixed(2)}`);
      writeLine(`Total liquidaciones (monto pagado): USD ${globalLiquidations.toFixed(2)}`);
      writeLine(`Neto global estimado: USD ${globalNet.toFixed(2)}`, 'bold', 10);
      separator();

      if (reportUsers.length === 0) writeLine('Sin datos para el rango seleccionado.', 'bold', 10);

      reportUsers.forEach((ru) => {
        ensureSpace(6);
        separator();
        writeLine(`USUARIO: ${ru.name}`, 'bold', 11);
        writeLine(`Correo: ${ru.email}`);
        writeLine(`SellerId: ${ru.sellerId || '-'}`);

        writeLine('SUBTOTALES POR USUARIO', 'bold', 10);
        writeLine(`Total ventas: USD ${ru.summary.totalSales.toFixed(2)}`);
        writeLine(`Total comisiones: USD ${ru.summary.totalCommissions.toFixed(2)}`);
        writeLine(`Total premios: USD ${ru.summary.totalPrizes.toFixed(2)}`);
        writeLine(`Total inyecciones: USD ${ru.summary.totalInjections.toFixed(2)}`);
        writeLine(`Total liquidaciones (monto pagado): USD ${ru.summary.totalLiquidations.toFixed(2)}`);
        writeLine(`Neto estimado/final: USD ${ru.summary.netProfit.toFixed(2)}`, 'bold', 10);
        writeLine(`Tickets vendidos: ${ru.tickets.length}`);
        if (ru.tickets.length > 0) {
          writeLine('DETALLE DE TICKETS', 'bold', 10);
          ru.tickets.forEach((ticket, index) => {
            const ticketDate = (ticket.timestamp as any)?.toDate?.()
              ? format((ticket.timestamp as any).toDate(), 'dd/MM/yyyy hh:mm a')
              : '-';
            const statusLabel = ticket.status === 'winner' ? 'GANADOR' : (ticket.status || 'active').toUpperCase();
            const isWinner = ticket.status === 'winner';
            writeLine(
              `${index + 1}. Ticket ${ticket.id?.slice(0, 8) || '-'} | Fecha: ${ticketDate} | Estado: ${statusLabel}${isWinner ? ' *' : ''}`
            );
            const betsSummary = (ticket.bets || [])
              .map((bet) => `${bet.number}-${bet.lottery} x${bet.amount}`)
              .join(' | ');
            if (betsSummary) {
              writeLine(`   Jugadas: ${betsSummary}`);
            }
            writeLine(`   Total ticket: USD ${(ticket.totalAmount || 0).toFixed(2)}`);
          });
        }
        separator();
      });

      pdf.save(`Reporte-Consolidado-${reportStartDate}-a-${reportEndDate}.pdf`);
      toast.success(`Reporte consolidado listo (${reportStartDate} -> ${reportEndDate})`, { id: toastId });
    } catch (error) {
      console.error('Error generating consolidated report:', error);
      toast.error('No se pudo generar el reporte consolidado', { id: toastId });
    } finally {
      setIsGeneratingYesterdayReport(false);
    }
  };

  const handleDeleteAllSalesData = () => {
    if (!userProfile || !['ceo', 'admin', 'programador'].includes(userProfile.role)) {
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
            toast.info('El archivo diario ya exist?a y no hab?a datos pendientes por limpiar');
          }
        } catch (error) {
          console.error('Error archivando datos operativos:', error);
          toast.error('No se pudo crear el archivo diario. No se realiz? limpieza.');
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

  const handleDownloadCierre = async () => {
    if (!cierreRef.current || !cierreLottery) return;
    const toastId = toast.loading('Generando imagen...');
    const cierreNode = cierreRef.current;
    const isAndroid = Capacitor.getPlatform() === 'android';
    const originalWidth = cierreNode.style.width;
    const originalMaxWidth = cierreNode.style.maxWidth;
    const originalMinHeight = cierreNode.style.minHeight;
    const originalMargin = cierreNode.style.margin;
    const originalBackgroundColor = cierreNode.style.backgroundColor;
    try {
      const exportWidthPx = isAndroid ? 640 : 720;
      const exportHeightPx = Math.max(900, cierreNode.scrollHeight);
      const pixelRatio = isAndroid ? 1 : 1.5;
      const imageQuality = isAndroid ? 0.82 : 0.9;
      const fileName = `Cierre-${cleanText(cierreLottery)}-${historyDate}.jpg`;

      cierreNode.style.width = `${exportWidthPx}px`;
      cierreNode.style.maxWidth = 'none';
      cierreNode.style.minHeight = `${exportHeightPx}px`;
      cierreNode.style.margin = '0 auto';
      cierreNode.style.backgroundColor = '#ffffff';

      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const exportOptions = {
        backgroundColor: '#ffffff',
        cacheBust: true,
        pixelRatio,
        width: exportWidthPx,
        height: Math.max(exportHeightPx, cierreNode.scrollHeight),
        style: {
          width: `${exportWidthPx}px`,
          maxWidth: 'none',
          minHeight: `${exportHeightPx}px`,
          margin: '0 auto',
          backgroundColor: '#ffffff'
        }
      };

      const dataUrl = await htmlToImage.toJpeg(cierreNode, {
        ...exportOptions,
        quality: imageQuality
      });
      const shared = await shareImageDataUrl({
        dataUrl,
        fileName,
        title: `Cierre ${cleanText(cierreLottery)}`,
        text: `Reporte de cierre de ${cleanText(cierreLottery)} para el día ${historyDate}`,
        dialogTitle: 'Compartir Cierre'
      });

      if (shared) {
        toast.success('Cierre compartido', { id: toastId });
      } else {
        downloadDataUrlFile(dataUrl, fileName);
        toast.info('Tu dispositivo no permite compartir imágenes adjuntas. Se descargó para envío manual.', { id: toastId });
      }
    } catch (err) {
      console.error('Error generating cierre image', err);
      toast.error('Error al generar la imagen', { id: toastId });
    } finally {
      cierreNode.style.width = originalWidth;
      cierreNode.style.maxWidth = originalMaxWidth;
      cierreNode.style.minHeight = originalMinHeight;
      cierreNode.style.margin = originalMargin;
      cierreNode.style.backgroundColor = originalBackgroundColor;
    }
  };

  const todayStr = businessDayKey;

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

  const liquidacionQuickDateOptions = useMemo(() => {
    const today = getQuickOperationalDate(0);
    const yesterday = getQuickOperationalDate(-1);

    return recentOperationalDates.map(dateValue => {
      let label = dateValue;
      if (dateValue === today) label = `Hoy (${dateValue})`;
      if (dateValue === yesterday) label = `Ayer (${dateValue})`;
      return { value: dateValue, label };
    });
  }, [getQuickOperationalDate, recentOperationalDates]);
  
  const todayStats = useMemo(() => {
    const todayTickets = tickets.filter(t => {
      const tDate = getTicketDateKey(t);
      const matchesDate = tDate === todayStr;
      const matchesUser = canAccessAllUsers || t.sellerId === user?.uid || t.sellerEmail?.toLowerCase() === user?.email?.toLowerCase();
      // Keep daily fixed markers stable through liquidations: include any non-cancelled ticket.
      return matchesDate && matchesUser && t.status !== 'cancelled';
    });
    const todayInjections = injections.filter(i => i.date === todayStr && (canAccessAllUsers || i.userEmail?.toLowerCase() === user?.email?.toLowerCase()));
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
  }, [buildFinancialSummary, canAccessAllUsers, getTicketDateKey, injections, tickets, todayStr, user?.email, user?.uid, userProfile]);

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
      
      const matchesUser = canAccessAllUsers || t.sellerId === user?.uid || t.sellerEmail?.toLowerCase() === user?.email?.toLowerCase();

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

  const fetchUserOperationalDataByDate = useCallback(async (targetDate: string, userEmail: string) => {
    const normalizedEmail = userEmail.toLowerCase().trim();
    const { start, end } = getBusinessDayRange(targetDate);
    const archiveSnap = await getDoc(doc(db, 'daily_archives', targetDate));
    if (archiveSnap.exists()) {
      const archive = archiveSnap.data() as {
        tickets?: LotteryTicket[];
        injections?: Injection[];
        settlements?: Settlement[];
        results?: LotteryResult[];
      };

      const archivedTickets = (archive.tickets || []).filter(ticket =>
        (ticket.sellerEmail || '').toLowerCase() === normalizedEmail
      );
      const archivedInjections = (archive.injections || []).filter(injection =>
        (injection.userEmail || '').toLowerCase() === normalizedEmail
      );
      const archivedSettlements = (archive.settlements || []).filter(settlement =>
        (settlement.userEmail || '').toLowerCase() === normalizedEmail &&
        settlement.date === targetDate
      );

      return {
        tickets: archivedTickets,
        injections: archivedInjections,
        settlements: archivedSettlements,
        results: archive.results || []
      };
    }

    const [ticketsByEmailSnap, injectionsSnap, settlementsSnap, resultsSnap] = await Promise.all([
      getDocs(query(
        collection(db, 'tickets'),
        where('sellerEmail', '==', normalizedEmail),
        where('timestamp', '>=', start),
        where('timestamp', '<', end),
        limit(1200)
      )),
      getDocs(query(
        collection(db, 'injections'),
        where('userEmail', '==', normalizedEmail),
        where('date', '==', targetDate),
        limit(500)
      )),
      getDocs(query(
        collection(db, 'settlements'),
        where('userEmail', '==', normalizedEmail),
        where('date', '==', targetDate),
        limit(300)
      )),
      getDocs(query(
        collection(db, 'results'),
        where('date', '==', targetDate),
        limit(300)
      ))
    ]);

    return {
      tickets: mergeTicketSnapshots(ticketsByEmailSnap),
      injections: injectionsSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Injection)),
      settlements: settlementsSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Settlement)),
      results: resultsSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as LotteryResult))
    };
  }, [getBusinessDayRange, mergeTicketSnapshots]);

  const fetchArchiveData = useCallback(async () => {
    if (!archiveUserEmail || !archiveDate) return;
    setIsArchiveLoading(true);
    try {
      if (archiveDate === businessDayKey) {
        const currentSummary = buildFinancialSummary({
          tickets,
          injections,
          settlements,
          userEmail: archiveUserEmail,
          targetDate: archiveDate
        });
        setArchiveTickets(currentSummary.tickets);
        setArchiveInjections(currentSummary.injections);
      } else {
        const archiveData = await fetchUserOperationalDataByDate(archiveDate, archiveUserEmail);
        setArchiveTickets(archiveData.tickets);
        setArchiveInjections(archiveData.injections);
        setResults(prev => {
          const map = new Map(prev.map(item => [`${item.lotteryName}-${item.date}-${item.id}`, item]));
          archiveData.results.forEach(item => map.set(`${item.lotteryName}-${item.date}-${item.id}`, item));
          return Array.from(map.values());
        });
      }

    } catch (error) {
      console.error("Error fetching archive data:", error);
      toast.error("Error al cargar datos del archivo");
    } finally {
      setIsArchiveLoading(false);
    }
  }, [archiveUserEmail, archiveDate, buildFinancialSummary, businessDayKey, fetchUserOperationalDataByDate, injections, settlements, tickets]);

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
    if (userProfile?.role !== 'programador') {
      toast.error('Acceso restringido a rol programador');
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
    if (userProfile?.role !== 'programador') {
      toast.error('Acceso restringido a rol programador');
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

  useEffect(() => {
    if (activeTab !== 'liquidaciones' || !selectedUserToLiquidate || !liquidationDate) {
      setLiquidationTicketsSnapshot([]);
      setLiquidationInjectionsSnapshot([]);
      setLiquidationResultsSnapshot([]);
      setLiquidationSettlementsSnapshot([]);
      return;
    }

    if (liquidationDate === businessDayKey) {
      setLiquidationTicketsSnapshot([]);
      setLiquidationInjectionsSnapshot([]);
      setLiquidationResultsSnapshot([]);
      setLiquidationSettlementsSnapshot([]);
      return;
    }

    let cancelled = false;
    setIsLiquidationDataLoading(true);

    fetchUserOperationalDataByDate(liquidationDate, selectedUserToLiquidate)
      .then(dayData => {
        if (cancelled) return;
        setLiquidationTicketsSnapshot(dayData.tickets);
        setLiquidationInjectionsSnapshot(dayData.injections);
        setLiquidationResultsSnapshot(dayData.results);
        setLiquidationSettlementsSnapshot(dayData.settlements);
      })
      .catch(error => {
        if (cancelled) return;
        console.error('Error loading liquidation source data:', error);
        toast.error('No se pudieron cargar los datos históricos para liquidación');
      })
      .finally(() => {
        if (!cancelled) setIsLiquidationDataLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, businessDayKey, fetchUserOperationalDataByDate, liquidationDate, selectedUserToLiquidate]);

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

  const navigationItems = useMemo<NavItem[]>(() => [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, role: ['ceo', 'admin', 'seller', 'programador'] },
    { id: 'sales', label: 'Nueva Venta', icon: Plus },
    { id: 'history', label: 'Resumen de ventas', icon: History },
    { id: 'stats', label: 'Estadísticas', icon: BarChart3, role: ['ceo', 'admin', 'seller', 'programador'] },
    { id: 'cierres', label: 'Cierres', icon: Printer, role: ['ceo', 'admin', 'seller', 'programador'] },
    { id: 'results', label: 'Resultados', icon: CheckCircle2, role: ['ceo', 'admin', 'seller', 'programador'] },
    { id: 'users', label: 'Usuarios', icon: Users, role: ['ceo', 'programador', 'canLiquidate'] },
    { id: 'archivo', label: 'Archivo', icon: Archive, role: ['ceo', 'admin', 'programador'] },
    { id: 'admin', label: 'Loterías', icon: ShieldCheck, role: ['ceo', 'programador'] },
    { id: 'liquidaciones', label: 'Liquidaciones', icon: DollarSign, role: ['ceo', 'admin', 'seller', 'programador'], permission: 'canLiquidate' },
    { id: 'recovery', label: 'Recuperación', icon: Database, role: ['programador'] },
    { id: 'config', label: 'Configuración', icon: Settings, role: ['ceo', 'admin', 'seller', 'programador'] },
  ], []);
  const visibleNavigationItems = useMemo(
    () => getVisibleNavItems(navigationItems, userProfile),
    [navigationItems, userProfile]
  );

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
              className="w-full bg-white/10 text-white py-3 rounded-xl font-bold uppercase tracking-widest hover:bg-white/20 transition-all flex items-center justify-center gap-2"
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
        canCreateProgramador={isPrimaryCeoUser}
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
        className={`glass border-r border-border h-screen flex flex-col z-50 ${isMobile ? 'fixed inset-y-0 left-0' : 'relative'}`}
      >
        <div className="p-6 flex items-center gap-3">
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

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {visibleNavigationItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.id 
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' 
                  : 'hover:bg-white/5 text-muted-foreground hover:text-foreground'
              }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {isSidebarOpen && <span className="text-sm font-bold uppercase tracking-wider">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-border space-y-2">
          <div className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-all ${isOnline ? 'text-emerald-400' : 'text-red-400'}`}>
            {isOnline ? <Cloud className="w-5 h-5 flex-shrink-0" /> : <CloudOff className="w-5 h-5 flex-shrink-0" />}
            {isSidebarOpen && (
              <div className="flex flex-col">
                <span className="text-[11px] font-black uppercase tracking-widest leading-none">
                  {isOnline ? 'Sincronizado' : 'Sin Conexión'}
                </span>
                <span className="text-[9px] font-mono opacity-60 uppercase">
                  {isOnline ? 'Nube Activa' : 'Modo Local'}
                </span>
              </div>
            )}
          </div>
          <button 
            onClick={handleLogoutFromUi}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-400/10 transition-all"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {isSidebarOpen && <span className="text-sm font-bold uppercase tracking-wider">Cerrar Sesión</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative min-w-0">
        {/* Top Header */}
        <header className="h-16 glass border-b border-border px-3 flex items-center justify-between shrink-0 gap-2">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-white/5 rounded-lg text-muted-foreground shrink-0"
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
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 custom-scrollbar min-w-0">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  {/* Block 1 (2 columns) */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="glass-card p-3 border-white/5 bg-white/[0.02]">
                      <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-0.5">Ventas del día</p>
                      <p className="text-lg font-medium text-white">${todayStats.sales.toFixed(2)}</p>
                    </div>
                    <div className="glass-card p-3 border-white/5 bg-white/[0.02]">
                      <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-0.5">Utilidad neta</p>
                      <p className={`text-lg font-medium ${todayStats.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        ${todayStats.netProfit.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Block 2 (2 columns) */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="glass-card p-3 border-white/5 bg-white/[0.02]">
                      <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-0.5">Premios pagados</p>
                      <p className="text-lg font-medium text-white">${todayStats.prizes.toFixed(2)}</p>
                    </div>
                    <div className="glass-card p-3 border-white/5 bg-white/[0.02]">
                      <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-0.5">Balance actual</p>
                      <p className="text-lg font-medium text-white">
                        ${todayStats.netProfit.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                  {/* Right Column: Lottery Sales & Injections & Detailed List */}
                  <div className={`${userProfile?.role === 'seller' ? 'xl:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-6'}`}>
                    {/* Recent Injections */}
                    <div className="glass-card p-6 border-white/5 bg-white/[0.02]">
                      <h3 className="text-xs font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-yellow-500" />
                        Inyecciones Recibidas
                      </h3>
                      <div className="space-y-3">
                        {injections.filter(i => i.date === todayStr && i.userEmail?.toLowerCase() === user?.email?.toLowerCase()).slice(0, 5).map((inj) => (
                          <div key={inj.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black text-white uppercase tracking-tighter">
                                Inyección Recibida
                              </span>
                              <span className="text-[9px] text-muted-foreground font-mono">
                                {inj.timestamp?.toDate 
                                  ? format(inj.timestamp.toDate(), 'HH:mm') 
                                  : (inj.timestamp ? format(new Date(inj.timestamp), 'HH:mm') : '')}
                              </span>
                            </div>
                            <span className={`text-xs font-black ${inj.type === 'injection' ? 'text-yellow-400' : 'text-blue-400'}`}>
                              {inj.type === 'injection' ? '+' : '-'}${inj.amount.toFixed(2)}
                            </span>
                          </div>
                        ))}
                        {injections.filter(i => i.date === todayStr && i.userEmail?.toLowerCase() === user?.email?.toLowerCase()).length === 0 && (
                          <p className="text-center py-4 text-[10px] text-muted-foreground uppercase font-bold">No hay inyecciones hoy</p>
                        )}
                      </div>
                    </div>

                  </div>
              </motion.div>
            )}

            {activeTab === 'sales' && (
              <motion.div
                key="sales"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-md mx-auto space-y-4 pb-24"
              >
                {/* Lottery Selector */}
                <div className="glass-card p-3 flex items-center justify-between relative z-30">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[11px] font-mono uppercase text-muted-foreground leading-none mb-1">Sorteo Activo</p>
                      {isMultipleMode ? (
                        <div className="relative">
                          <button 
                            onClick={() => setShowMultiSelect(!showMultiSelect)}
                            className="text-sm font-bold truncate flex items-center gap-1 w-full text-left"
                          >
                            {multiLottery.length === 0 ? 'Seleccione Sorteos' : `${multiLottery.length} Sorteos`}
                            <ChevronDown className={`w-3 h-3 transition-transform ${showMultiSelect ? 'rotate-180' : ''}`} />
                          </button>
                          
                              {showMultiSelect && (
                                <>
                                  <div 
                                    className="fixed inset-0 z-40" 
                                    onClick={() => setShowMultiSelect(false)}
                                  />
                                  <div className="fixed inset-x-3 bottom-24 bg-background border border-border rounded-xl shadow-2xl z-50 p-2 space-y-1 max-h-[60vh] overflow-y-auto sm:absolute sm:top-full sm:left-0 sm:bottom-auto sm:inset-x-auto sm:mt-2 sm:w-full sm:min-w-[240px] sm:max-h-80">
                                    {activeLotteries.length > 0 ? (
                                      <>
                                        <div className="flex items-center justify-between p-2 border-b border-white/10 mb-1">
                                          <button 
                                            onClick={() => setMultiLottery(activeLotteries.map(l => l.name))}
                                            className="text-[10px] font-bold uppercase text-primary hover:text-primary/80"
                                          >
                                            Todos
                                          </button>
                                          <button 
                                            onClick={() => setMultiLottery([])}
                                            className="text-[10px] font-bold uppercase text-red-500 hover:text-red-400"
                                          >
                                            Ninguno
                                          </button>
                                        </div>
                                        {activeLotteries.map(l => (
                                          <label key={l.id} className="flex items-center gap-2 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
                                            <input 
                                              type="checkbox" 
                                              checked={multiLottery.includes(l.name)}
                                              onChange={(e) => {
                                                if (e.target.checked) {
                                                  setMultiLottery([...multiLottery, l.name]);
                                                } else {
                                                  setMultiLottery(multiLottery.filter(name => name !== l.name));
                                                }
                                              }}
                                              className="rounded border-border text-primary focus:ring-primary bg-transparent"
                                            />
                                            <span className="text-xs font-medium">{cleanText(l.name)}</span>
                                          </label>
                                        ))}
                                      </>
                                    ) : (
                                      <div className="p-4 text-center text-xs text-muted-foreground">
                                        No hay sorteos disponibles
                                      </div>
                                    )}
                                  </div>
                                </>
                              )}
                        </div>
                      ) : (
                        <select 
                          value={selectedLottery}
                          onChange={(e) => setSelectedLottery(e.target.value)}
                          className="bg-transparent border-none p-0 font-bold text-sm focus:outline-none w-full truncate"
                        >
                          <option key="default" value="" className="bg-background">
                            {activeLotteries.length > 0 ? "Seleccione Sorteo" : "Sin sorteos activos"}
                          </option>
                          {activeLotteries.map(l => (
                            <option key={l.id} value={l.name} className="bg-background">
                              {cleanText(l.name)} {l.drawTime ? `(${formatTime12h(l.drawTime)})` : ''}
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
                      if (next) setShowMultiSelect(true);
                    }}
                    className={`px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase transition-all border ${
                      isMultipleMode ? 'bg-primary border-primary text-primary-foreground' : 'bg-white/5 border-border text-muted-foreground'
                    }`}
                  >
                    Multi
                  </button>
                </div>

                {/* Bet Type Selector */}
                <div className="bg-white/5 border border-border rounded-2xl p-1 flex gap-1">
                  <button
                    onClick={() => {
                      setBetType('CH');
                      setNumber('');
                      setQuantity('1');
                      setFocusedField('number');
                    }}
                    className={`flex-1 py-3 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all ${
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
                      className={`flex-1 py-3 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all ${
                        betType === 'PL' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Palé
                    </button>
                  )}
                  {globalSettings.billetesEnabled && (isMultipleMode ? multiLottery.some(name => findActiveLotteryByName(name)?.isFourDigits) : findActiveLotteryByName(selectedLottery)?.isFourDigits) && (
                    <button
                      onClick={() => {
                        setBetType('BL');
                        setNumber('');
                        setQuantity('1');
                        setPlAmount('1.00');
                        setFocusedField('number');
                      }}
                      className={`flex-1 py-3 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all ${
                        betType === 'BL' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Billete
                    </button>
                  )}
                </div>

                {/* Input Boxes */}
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => {
                      setFocusedField('number');
                      numberInputRef.current?.focus();
                    }}
                    className={`glass-card p-2.5 flex flex-col items-center justify-center gap-0.5 transition-all border-2 cursor-pointer ${
                      focusedField === 'number' ? 'border-primary bg-primary/5' : 'border-transparent'
                    }`}
                  >
                    <span className="text-[11px] font-mono uppercase text-muted-foreground font-medium">Número</span>
                    <div className="flex items-center justify-center min-h-[32px] relative w-full">
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
                              setIsAmountSelected(true);
                              setTimeout(() => {
                                amountInputRef.current?.focus();
                                amountInputRef.current?.select();
                              }, 0);
                            }
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && number.length === (betType === 'CH' ? 2 : 4)) {
                            setFocusedField('amount');
                            setIsAmountSelected(true);
                            setTimeout(() => {
                              amountInputRef.current?.focus();
                              amountInputRef.current?.select();
                            }, 0);
                          }
                        }}
                        onFocus={() => setFocusedField('number')}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <span className="text-2xl font-bold tracking-widest">
                        {number || (betType === 'CH' ? '--' : '----')}
                      </span>
                      {focusedField === 'number' && <Cursor />}
                    </div>
                  </div>
                  <div
                    onClick={() => {
                      setFocusedField('amount');
                      setIsAmountSelected(true);
                      setTimeout(() => {
                        amountInputRef.current?.focus();
                        amountInputRef.current?.select();
                      }, 0);
                    }}
                    className={`glass-card p-2.5 flex flex-col items-center justify-center gap-0.5 transition-all border-2 cursor-pointer ${
                      focusedField === 'amount' ? 'border-primary bg-primary/5' : 'border-transparent'
                    }`}
                  >
                    <span className="text-[11px] font-mono uppercase text-muted-foreground font-medium">
                      {betType === 'CH' ? 'Cantidad' : 'Inversión'}
                    </span>
                    <div className="flex items-center justify-center min-h-[32px] relative w-full">
                      <input
                        ref={amountInputRef}
                        type="text"
                        inputMode="none"
                        value={betType === 'CH' ? (quantity === 'NaN' ? '' : quantity) : (plAmount === 'NaN' ? '' : plAmount)}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9.]/g, '');
                          setIsAmountSelected(false);
                          if (betType === 'CH') {
                            setQuantity(val);
                          } else {
                            setPlAmount(val);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            addToCart();
                          }
                        }}
                        onFocus={() => {
                          setFocusedField('amount');
                          setIsAmountSelected(true);
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <span className={`text-2xl font-bold ${isAmountSelected && focusedField === 'amount' ? 'bg-primary/30 text-primary px-1 rounded' : ''}`}>
                        {betType === 'CH' ? quantity : plAmount}
                      </span>
                      {focusedField === 'amount' && <Cursor />}
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {betType === 'CH' ? `$${(parseFloat(quantity) * chancePrice || 0).toFixed(2)}` : `USD`}
                    </span>
                  </div>
                </div>

                {/* Numeric Keyboard */}
                <div className="py-2">
                  <NumericKeyboard 
                    onKeyPress={handleKeyPress}
                    onBackspace={handleBackspace}
                    onClear={handleClear}
                  />
                </div>

                {/* Add Button */}
                <button
                  onClick={addToCart}
                  className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-widest text-base shadow-xl shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  <Plus className="w-5 h-5" />
                  Agregar al Ticket
                </button>

                {/* Cart Preview (Compact) */}
                {cart.length > 0 && (
                  <div className="glass-card p-3 space-y-2">
                    <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                      <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Carrito ({cart.length})</h3>
                      <button onClick={clearCart} className="text-[11px] font-bold uppercase text-red-500">Vaciar</button>
                    </div>
                    <div className="max-h-32 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                      {Object.entries(
                        cart.reduce((acc, bet, idx) => {
                          if (!acc[bet.lottery]) acc[bet.lottery] = [];
                          acc[bet.lottery].push({ ...bet, originalIdx: idx });
                          return acc;
                        }, {} as Record<string, (Bet & { originalIdx: number })[]>)
                      ).map(([lotteryName, bets]) => {
                        const betList = bets as (Bet & { originalIdx: number })[];
                        return (
                        <div key={lotteryName} className="space-y-1.5 bg-black/20 p-2 rounded-xl border border-white/5">
                          <div className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                            {cleanText(lotteryName)}
                            <span className="text-muted-foreground ml-auto bg-white/5 px-1.5 py-0.5 rounded">({betList.length})</span>
                          </div>
                          <div className="space-y-1">
                            {betList.map((bet) => (
                              <div key={`${bet.lottery}-${bet.number}-${bet.type}-${bet.originalIdx}`} className="flex items-center justify-between text-xs bg-white/5 p-1.5 rounded-lg border border-white/5">
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <span className="font-mono font-bold text-primary shrink-0">{bet.type}</span>
                                  <span className="font-bold tracking-widest shrink-0">{bet.number}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <div className="flex items-center gap-1 bg-white/10 rounded-lg px-1.5 py-0.5 border border-white/10">
                                    <button 
                                      onClick={() => bet.type === 'BL' ? updateCartItemAmount(bet.originalIdx, Math.max(0.1, bet.amount - 0.1)) : updateCartItemQuantity(bet.originalIdx, bet.quantity - 1)}
                                      className="p-1.5 text-muted-foreground hover:text-primary transition-colors active:scale-90"
                                    >
                                      <Minus className="w-3.5 h-3.5" />
                                    </button>
                                    <div className="flex flex-col items-center min-w-[50px] px-1">
                                      <span className="text-[8px] font-mono opacity-50 leading-none mb-0.5">
                                        {bet.type === 'BL' ? 'INV' : `QTY:${bet.quantity}`}
                                      </span>
                                      <span className="font-black text-[11px] leading-none">
                                        ${(bet.type === 'CH' ? bet.quantity * chancePrice : bet.amount).toFixed(2)}
                                      </span>
                                    </div>
                                    <button 
                                      onClick={() => bet.type === 'BL' ? updateCartItemAmount(bet.originalIdx, bet.amount + 0.1) : updateCartItemQuantity(bet.originalIdx, bet.quantity + 1)}
                                      className="p-1.5 text-muted-foreground hover:text-primary transition-colors active:scale-90"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                  <button onClick={() => removeFromCart(bet.originalIdx)} className="text-red-500/70 hover:text-red-500 p-1.5 transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
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
                          {editingTicketId && (
                            <span className="text-[9px] font-black text-primary uppercase animate-pulse">Editando Ticket</span>
                          )}
                        </div>
                        <span className="text-xl font-black text-primary">${cartTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex gap-2">
                        {editingTicketId && (
                          <button 
                            onClick={cancelEdit}
                            className="flex-1 py-3 bg-red-500/10 text-red-400 rounded-xl text-xs font-black uppercase tracking-widest active:scale-95 transition-transform border border-red-500/20"
                          >
                            Cancelar
                          </button>
                        )}
                        <button 
                          onClick={handleSell}
                          className="flex-1 py-3 bg-white text-black rounded-xl text-xs font-black uppercase tracking-widest active:scale-95 transition-transform"
                        >
                          {editingTicketId ? 'Actualizar Ticket' : 'Generar Ticket'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Fast Entry Button */}
                <button 
                  onClick={() => setShowFastEntryModal(true)}
                  className="w-full py-3 bg-white/5 border border-border rounded-xl text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  Copiado Rápido
                </button>

                {/* Seller Daily Balance Summary */}
                {userProfile?.role === 'seller' && (
                  <div className="glass-card p-4 space-y-4 border-primary/20 bg-primary/5">
                    <div className="flex items-center justify-between border-b border-primary/10 pb-2">
                      <div className="flex items-center gap-2">
                        <LayoutDashboard className="w-4 h-4 text-primary" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Resumen del Día</h3>
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
                toPng={toPng}
                toast={toast}
                jsPDF={jsPDF}
              />
            )}
            {activeTab === 'stats' && (
              <motion.div
                key="stats"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="glass-card p-4 sm:p-6 border border-white/5">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <div>
                      <h2 className="text-xl font-light text-white">Estadísticas de Venta</h2>
                      <p className="text-sm font-light text-muted-foreground mt-1">Fracciones y combinaciones por sorteo</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                      {canUseGlobalScope && (
                        <div className="flex bg-black/30 border border-white/10 rounded overflow-hidden">
                          <button
                            onClick={() => setShowGlobalScope(false)}
                            className={`px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${!showGlobalScope ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-white'}`}
                          >
                            Propio
                          </button>
                          <button
                            onClick={() => setShowGlobalScope(true)}
                            className={`px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${showGlobalScope ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-white'}`}
                          >
                            Global
                          </button>
                        </div>
                      )}
                      {canAccessAllUsers && (
                        <select
                          value={globalChancePriceFilter}
                          onChange={(e) => setGlobalChancePriceFilter(e.target.value)}
                          className="bg-black/30 border border-white/10 p-2 rounded text-sm text-white focus:outline-none focus:border-primary/50 font-light"
                        >
                          <option value="">Todos los precios</option>
                          {(globalSettings.chancePrices || []).map((config, index) => (
                            <option key={`stats-price-${config.price}-${index}`} value={config.price}>
                              Chance USD {config.price.toFixed(2)}
                            </option>
                          ))}
                        </select>
                      )}
                      <input 
                        type="date" 
                        value={historyDate}
                        onChange={(e) => setHistoryDate(e.target.value)}
                        className="bg-black/30 border border-white/10 p-2 rounded text-sm text-white focus:outline-none focus:border-primary/50 font-light"
                      />
                    </div>
                  </div>
                  
                  {(() => {
                    const betsByLottery: Record<string, Bet[]> = {};
                    historyTickets.filter(ticketMatchesGlobalChancePrice).forEach(t => {
                      if (t.status === 'cancelled') return;
                      (t.bets || []).forEach(b => {
                        if (!betsByLottery[b.lottery]) {
                          betsByLottery[b.lottery] = [];
                        }
                        betsByLottery[b.lottery].push(b);
                      });
                    });

                    const lotteryNames = Object.keys(betsByLottery).sort();

                    if (lotteryNames.length === 0) {
                      return (
                        <div className="text-center py-12 text-muted-foreground font-light border border-white/5 rounded bg-black/20">
                          No hay ventas registradas para esta fecha.
                        </div>
                      );
                    }

                    return lotteryNames.map(lotteryName => {
                      const lotteryInfo = lotteries.find(l => cleanText(l.name) === cleanText(lotteryName));
                      const timeStr = lotteryInfo?.drawTime ? ` - ${formatTime12h(lotteryInfo.drawTime)}` : '';
                      const bets = betsByLottery[lotteryName];
                      const isExpanded = expandedStats.includes(lotteryName);

                      return (
                        <div key={lotteryName} className="mb-2 border border-white/10 rounded bg-black/20 overflow-hidden">
                          <button 
                            onClick={() => setExpandedStats(prev => prev.includes(lotteryName) ? prev.filter(n => n !== lotteryName) : [...prev, lotteryName])}
                            className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 transition-colors"
                          >
                            <h3 className="text-sm font-light text-primary">
                              {cleanText(lotteryName)}{timeStr}
                            </h3>
                            {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                          </button>
                          
                          {isExpanded && (
                            <div className="p-3 border-t border-white/5">
                              <div className="mb-4">
                                <h4 className="text-xs font-light text-white/70 mb-2">Números (00-99) - Fracciones</h4>
                                <div className="grid grid-cols-10 gap-[2px]">
                                  {Array.from({ length: 100 }).map((_, i) => {
                                    const num = i.toString().padStart(2, '0');
                                    const totalQty = bets.filter(b => b.type === 'CH' && b.number === num).reduce((s, b) => s + (b.quantity || 0), 0);
                                    
                                    return (
                                      <div key={num} className={`p-0.5 flex flex-col items-center justify-center rounded-[2px] ${totalQty > 0 ? 'bg-primary/10 border border-primary/20' : 'bg-black/40 border border-white/5'}`}>
                                        <span className="text-[9px] font-light text-muted-foreground leading-none mb-0.5">{num}</span>
                                        <span className={`text-[10px] font-light leading-none ${totalQty > 0 ? 'text-white' : 'text-white/20'}`}>
                                          {totalQty > 0 ? totalQty : '-'}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              <div>
                                <h4 className="text-xs font-light text-white/70 mb-2">Combinaciones - Monto</h4>
                                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
                                  {(() => {
                                    const combos: Record<string, number> = {};
                                    bets.forEach(b => {
                                      if (b.type === 'PL' || b.type === 'BL') {
                                        const key = `${b.type} ${b.number}`;
                                        combos[key] = (combos[key] || 0) + (b.amount || 0);
                                      }
                                    });
                                    
                                    const comboEntries = Object.entries(combos).sort((a, b) => b[1] - a[1]);
                                    
                                    if (comboEntries.length === 0) {
                                      return (
                                        <div className="col-span-full text-center py-2 text-[10px] font-light text-muted-foreground border border-white/5 rounded bg-black/20">
                                          No hay combinaciones
                                        </div>
                                      );
                                    }

                                    return comboEntries.map(([key, total]) => (
                                      <div key={key} className="bg-primary/5 border border-primary/20 p-1.5 rounded-[2px] flex flex-col items-center justify-center">
                                        <span className="text-[9px] font-light text-muted-foreground leading-none mb-0.5">{key}</span>
                                        <span className="text-[10px] font-light text-white leading-none">${total.toFixed(2)}</span>
                                      </div>
                                    ));
                                  })()}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </motion.div>
            )}

            {activeTab === 'cierres' && (
              <motion.div
                key="cierres"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="glass-card p-4 sm:p-6 border border-white/5">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <div>
                      <h2 className="text-xl font-light text-white">Cierres de Sorteo</h2>
                      <p className="text-sm font-light text-muted-foreground mt-1">Genera y comparte el reporte de ventas por sorteo</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                      {canUseGlobalScope && (
                        <div className="flex bg-black/30 border border-white/10 rounded overflow-hidden">
                          <button
                            onClick={() => setShowGlobalScope(false)}
                            className={`px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${!showGlobalScope ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-white'}`}
                          >
                            Propio
                          </button>
                          <button
                            onClick={() => setShowGlobalScope(true)}
                            className={`px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${showGlobalScope ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-white'}`}
                          >
                            Global
                          </button>
                        </div>
                      )}
                      {canAccessAllUsers && (
                        <select
                          value={globalChancePriceFilter}
                          onChange={(e) => setGlobalChancePriceFilter(e.target.value)}
                          className="bg-black/30 border border-white/10 p-2 rounded text-sm text-white focus:outline-none focus:border-primary/50 font-light w-full sm:w-auto"
                        >
                          <option value="">Todos los precios</option>
                          {(globalSettings.chancePrices || []).map((config, index) => (
                            <option key={`cierre-price-${config.price}-${index}`} value={config.price}>
                              Chance USD {config.price.toFixed(2)}
                            </option>
                          ))}
                        </select>
                      )}
                      <input 
                        type="date" 
                        value={historyDate}
                        onChange={(e) => setHistoryDate(e.target.value)}
                        className="bg-black/30 border border-white/10 p-2 rounded text-sm text-white focus:outline-none focus:border-primary/50 font-light w-full sm:w-auto"
                      />
                      <select
                        value={cierreLottery}
                        onChange={(e) => setCierreLottery(e.target.value)}
                        className="bg-black/30 border border-white/10 p-2 rounded text-sm text-white focus:outline-none focus:border-primary/50 font-light w-full sm:w-auto"
                      >
                        <option value="">Seleccione un sorteo</option>
                        {lotteries.map(l => (
                          <option key={l.id} value={l.name}>{cleanText(l.name)}</option>
                        ))}
                      </select>
                      <button
                        onClick={handleDownloadCierre}
                        disabled={!cierreLottery}
                        className="flex items-center justify-center gap-2 bg-primary/20 hover:bg-primary/30 text-primary p-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Compartir"
                      >
                        <Share2 className="w-4 h-4" />
                        <span className="sm:hidden">Compartir</span>
                      </button>
                    </div>
                  </div>

                  {cierreLottery ? (() => {
                    const scopedTickets = historyTickets.filter(t => {
                      if (t.status === 'cancelled') return false;
                      if (!ticketMatchesGlobalChancePrice(t)) return false;
                      if (canAccessAllUsers) return true;
                      return t.sellerId === user?.uid || t.sellerEmail?.toLowerCase() === user?.email?.toLowerCase();
                    });
                    const bets = scopedTickets.flatMap(t => t.bets || []).filter(b => cleanText(b.lottery) === cleanText(cierreLottery));
                    const lotteryInfo = lotteries.find(l => cleanText(l.name) === cleanText(cierreLottery));
                    
                    const totalTiempos = bets.filter(b => b.type === 'CH').reduce((sum, b) => sum + (b.quantity || 0), 0);
                    const totalVendido = bets.filter(b => b.type === 'CH').reduce((sum, b) => sum + (b.amount || 0), 0);

                    const col1 = Array.from({ length: 34 }).map((_, i) => i.toString().padStart(2, '0'));
                    const col2 = Array.from({ length: 34 }).map((_, i) => (i + 34).toString().padStart(2, '0'));
                    const col3 = Array.from({ length: 32 }).map((_, i) => (i + 68).toString().padStart(2, '0'));

                    const getQty = (num: string) => {
                      const qty = bets.filter(b => b.type === 'CH' && b.number === num).reduce((s, b) => s + (b.quantity || 0), 0);
                      return qty > 0 ? qty : '-';
                    };

                    const combos: Record<string, number> = {};
                    bets.forEach(b => {
                      if (b.type === 'PL' || b.type === 'BL') {
                        const key = `${b.type} ${b.number}`;
                        combos[key] = (combos[key] || 0) + (b.amount || 0);
                      }
                    });
                    const comboEntries = Object.entries(combos).sort((a, b) => b[1] - a[1]);

                    return (
                      <div className="overflow-x-auto bg-white rounded p-4 sm:p-8" style={{ color: '#000' }}>
                        <div ref={cierreRef} className="bg-white w-full max-w-3xl mx-auto" style={{ padding: '20px' }}>
                          <div className="mb-6">
                            <h1 className="text-2xl font-bold mb-2">Cierre: {cleanText(cierreLottery)}</h1>
                            <div className="text-sm mb-1">
                              <span className="font-semibold">Fecha:</span> {historyDate} <span className="font-semibold ml-4">Horario:</span> {lotteryInfo?.drawTime ? formatTime12h(lotteryInfo.drawTime) : '--:--'}
                            </div>
                            <div className="text-sm mb-4">
                              <span className="font-semibold">Operador:</span> {userProfile?.name || user?.displayName || 'Vendedor'} ({userProfile?.sellerId || user?.email})
                            </div>
                            {canAccessAllUsers && globalChancePriceFilter && (
                              <div className="text-sm mb-2">
                                <span className="font-semibold">Precio Chance:</span> USD {parseFloat(globalChancePriceFilter).toFixed(2)}
                              </div>
                            )}
                            <div className="flex justify-between items-center text-lg font-bold border-b-2 border-black pb-2">
                              <span>Total Tiempos: {totalTiempos}</span>
                              <span>Total Vendido: ${totalVendido.toFixed(2)}</span>
                            </div>
                          </div>

                          <table className="w-full text-sm border-collapse mb-6">
                            <thead>
                              <tr className="bg-gray-100">
                                <th className="border p-2 text-center w-1/6">Núm</th>
                                <th className="border p-2 text-center w-1/6">Tiempos</th>
                                <th className="border p-2 text-center w-1/6">Núm</th>
                                <th className="border p-2 text-center w-1/6">Tiempos</th>
                                <th className="border p-2 text-center w-1/6">Núm</th>
                                <th className="border p-2 text-center w-1/6">Tiempos</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Array.from({ length: 34 }).map((_, i) => (
                                <tr key={i} className="even:bg-gray-50">
                                  <td className="border p-1.5 text-center font-semibold">{col1[i]}</td>
                                  <td className="border p-1.5 text-center text-gray-600">{getQty(col1[i])}</td>
                                  <td className="border p-1.5 text-center font-semibold">{col2[i]}</td>
                                  <td className="border p-1.5 text-center text-gray-600">{getQty(col2[i])}</td>
                                  <td className="border p-1.5 text-center font-semibold">{col3[i] || ''}</td>
                                  <td className="border p-1.5 text-center text-gray-600">{col3[i] ? getQty(col3[i]) : ''}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>

                          {comboEntries.length > 0 && (
                            <div>
                              <h2 className="text-lg font-bold mb-3 border-b border-gray-300 pb-1">Combinaciones (Pale / Billete)</h2>
                              <div className="grid grid-cols-4 gap-4">
                                {comboEntries.map(([key, total]) => (
                                  <div key={key} className="border border-gray-200 p-2 rounded text-center bg-gray-50">
                                    <div className="font-semibold text-sm">{key}</div>
                                    <div className="text-gray-700 text-sm">${total.toFixed(2)}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <div className="mt-8 text-right text-xs text-gray-400">
                            Generado: {format(new Date(), 'dd/MM/yyyy, hh:mm:ss a')}
                          </div>
                        </div>
                      </div>
                    );
                  })() : (
                    <div className="text-center py-12 text-muted-foreground font-light border border-white/5 rounded bg-black/20">
                      Seleccione un sorteo para ver el cierre.
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'results' && (
              <ResultsSection
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
            {activeTab === 'admin' && (
              <AdminSection
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
            {activeTab === 'users' && (
              <UsersSection
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
            {activeTab === 'liquidaciones' && (
              <LiquidationSection
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
            )}
            {activeTab === 'archivo' && (
              <ArchiveSection
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
            )}
            {activeTab === 'recovery' && userProfile?.role === 'programador' && (
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
        <footer className="h-auto min-h-12 glass border-t border-border px-3 sm:px-8 py-2 flex items-center justify-between gap-2 shrink-0 text-[8px] sm:text-[9px] font-mono text-muted-foreground uppercase tracking-[0.12em] sm:tracking-[0.2em]">
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
























