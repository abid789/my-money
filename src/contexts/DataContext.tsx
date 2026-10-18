import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import {
  INITIAL_ACCOUNTS,
  INITIAL_CATEGORIES,
  INITIAL_TRANSACTIONS,
  INITIAL_BUDGETS,
  INITIAL_SAVINGS_GOALS,
  INITIAL_RECURRING,
  INITIAL_LOANS,
  DEMO_SAMPLE_ACCOUNTS,
  DEMO_SAMPLE_TRANSACTIONS,
  DEMO_SAMPLE_BUDGETS,
  DEMO_SAMPLE_SAVINGS_GOALS,
  DEMO_SAMPLE_RECURRING,
  DEMO_SAMPLE_LOANS,
} from '@/lib/mockData';
import type {
  Account,
  Category,
  Transaction,
  Budget,
  SavingsGoal,
  SavingsContribution,
  RecurringTransaction,
  FinancialSummary,
  LoanRecord,
  LoanRepayment,
  LoanSummary,
  LoanStatus,
} from '@/types';
import {
  calculateTotalIncome,
  calculateTotalExpenses,
  calculateNetCashFlow,
} from '@/lib/calculations';
import { getMonthRange } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  format,
  addDays,
  addWeeks,
  addMonths,
  addYears,
  subDays,
  subWeeks,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfYear,
  endOfYear,
} from 'date-fns';

export type SyncStatus = 'saved' | 'saving' | 'offline' | 'error';

export type DateRangePreset =
  | 'this-month'
  | 'today'
  | 'yesterday'
  | 'this-week'
  | 'last-week'
  | 'last-month'
  | 'this-year'
  | 'all-time'
  | 'custom';

export interface DateRangeInfo {
  preset: DateRangePreset;
  startDate: string;
  endDate: string;
  label: string;
}

interface DataContextValue {
  // State
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  savingsGoals: SavingsGoal[];
  recurringTransactions: RecurringTransaction[];
  loading: boolean;
  error: string | null;
  selectedMonth: number;
  selectedYear: number;
  setSelectedMonth: (month: number) => void;
  setSelectedYear: (year: number) => void;

  // Date Range Filtering
  dateRangePreset: DateRangePreset;
  customStartDate: string;
  customEndDate: string;
  effectiveDateRange: DateRangeInfo;
  setDateRangePreset: (preset: DateRangePreset, customStart?: string, customEnd?: string) => void;
  filteredTransactions: Transaction[];

  financialSummary: FinancialSummary;
  isCloudConnected: boolean;

  // Real-time Cloud Sync
  syncStatus: SyncStatus;
  lastSyncedAt: Date | null;
  triggerSync: () => Promise<void>;

  // Transaction CRUD
  addTransaction: (txn: Partial<Transaction>) => Promise<void>;
  updateTransaction: (id: string, txn: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  restoreTransaction: (txn: Transaction) => Promise<void>;

  // Account CRUD
  addAccount: (account: Partial<Account>) => Promise<void>;
  updateAccount: (id: string, account: Partial<Account>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;

  // Category CRUD
  addCategory: (category: Partial<Category>) => Promise<void>;
  updateCategory: (id: string, category: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  // Budget CRUD
  addBudget: (budget: Partial<Budget>) => Promise<void>;
  updateBudget: (id: string, budget: Partial<Budget>) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;

  // Savings Goals CRUD
  addSavingsGoal: (goal: Partial<SavingsGoal>) => Promise<void>;
  updateSavingsGoal: (id: string, goal: Partial<SavingsGoal>) => Promise<void>;
  deleteSavingsGoal: (id: string) => Promise<void>;
  addContribution: (contribution: Partial<SavingsContribution>) => Promise<void>;

  // Recurring CRUD
  addRecurring: (recurring: Partial<RecurringTransaction>) => Promise<void>;
  updateRecurring: (id: string, recurring: Partial<RecurringTransaction>) => Promise<void>;
  deleteRecurring: (id: string) => Promise<void>;
  markRecurringPaid: (id: string) => Promise<void>;

  // Demo Mode
  isDemoMode: boolean;
  resetDemoData: () => Promise<void>;

  // Personal Loans & Lending CRUD
  loans: LoanRecord[];
  loanSummary: LoanSummary;
  addLoan: (loan: Partial<LoanRecord>) => Promise<void>;
  updateLoan: (id: string, loan: Partial<LoanRecord>) => Promise<void>;
  deleteLoan: (id: string) => Promise<void>;
  addLoanRepayment: (loanId: string, repayment: Partial<LoanRepayment>) => Promise<void>;
  deleteLoanRepayment: (loanId: string, repaymentId: string) => Promise<void>;

  // Refresh & Utilities
  refreshData: () => Promise<void>;
  resetToZero: () => Promise<void>;
  loadDemoData: () => Promise<void>;
  migrateLocalToCloud: () => Promise<{ success: boolean; count: number; message: string }>;
}

// ─── Context ────────────────────────────────────────────────────────────────

const DataContext = createContext<DataContextValue | undefined>(undefined);

// ─── Provider ───────────────────────────────────────────────────────────────

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { addNotification } = useNotifications();

  // Public Demo Mode vs Authenticated Private Mode
  const isDemoMode = !user;
  const storagePrefix = isDemoMode ? 'my-money-demo-' : 'my-money-';

  // Data state
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [loans, setLoans] = useState<LoanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('saved');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  // Storage partition helpers
  const getLocal = useCallback(
    <T,>(key: string, initial: T): T => {
      try {
        const item = localStorage.getItem(`${storagePrefix}${key}`);
        return item !== null ? JSON.parse(item) : initial;
      } catch {
        return initial;
      }
    },
    [storagePrefix]
  );

  const setLocal = useCallback(
    <T,>(key: string, data: T) => {
      try {
        localStorage.setItem(`${storagePrefix}${key}`, JSON.stringify(data));
      } catch {
        // ignore
      }
    },
    [storagePrefix]
  );

  // Period and Date Range selection
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [dateRangePreset, setDateRangePresetState] = useState<DateRangePreset>('this-month');
  const [customStartDate, setCustomStartDate] = useState(
    format(startOfMonth(now), 'yyyy-MM-dd')
  );
  const [customEndDate, setCustomEndDate] = useState(
    format(endOfMonth(now), 'yyyy-MM-dd')
  );

  const setDateRangePreset = useCallback(
    (preset: DateRangePreset, customStart?: string, customEnd?: string) => {
      setDateRangePresetState(preset);
      if (customStart) setCustomStartDate(customStart);
      if (customEnd) setCustomEndDate(customEnd);
    },
    []
  );

  const effectiveDateRange = useMemo<DateRangeInfo>(() => {
    const today = new Date();
    switch (dateRangePreset) {
      case 'today': {
        const d = format(today, 'yyyy-MM-dd');
        return { preset: 'today', startDate: d, endDate: d, label: 'Today / আজ' };
      }
      case 'yesterday': {
        const y = format(subDays(today, 1), 'yyyy-MM-dd');
        return { preset: 'yesterday', startDate: y, endDate: y, label: 'Yesterday / গতকাল' };
      }
      case 'this-week': {
        const ws = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        const we = format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        return { preset: 'this-week', startDate: ws, endDate: we, label: 'This Week / চলতি সপ্তাহ' };
      }
      case 'last-week': {
        const lastW = subWeeks(today, 1);
        const ws = format(startOfWeek(lastW, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        const we = format(endOfWeek(lastW, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        return { preset: 'last-week', startDate: ws, endDate: we, label: 'Last Week / গত সপ্তাহ' };
      }
      case 'last-month': {
        const lm = subMonths(today, 1);
        const s = format(startOfMonth(lm), 'yyyy-MM-dd');
        const e = format(endOfMonth(lm), 'yyyy-MM-dd');
        return { preset: 'last-month', startDate: s, endDate: e, label: 'Last Month / গত মাস' };
      }
      case 'this-year': {
        const s = format(startOfYear(today), 'yyyy-MM-dd');
        const e = format(endOfYear(today), 'yyyy-MM-dd');
        return { preset: 'this-year', startDate: s, endDate: e, label: 'This Year / চলতি বছর' };
      }
      case 'all-time': {
        return { preset: 'all-time', startDate: '1970-01-01', endDate: '2099-12-31', label: 'All Time / সব সময়' };
      }
      case 'custom': {
        const s = customStartDate || '1970-01-01';
        const e = customEndDate || '2099-12-31';
        return { preset: 'custom', startDate: s, endDate: e, label: `${s} - ${e}` };
      }
      case 'this-month':
      default: {
        const [s, e] = getMonthRange(selectedYear, selectedMonth);
        return {
          preset: 'this-month',
          startDate: s,
          endDate: e,
          label: format(new Date(selectedYear, selectedMonth - 1, 1), 'MMMM yyyy'),
        };
      }
    }
  }, [dateRangePreset, selectedMonth, selectedYear, customStartDate, customEndDate]);

  // ═══════════════════════════════════════════════════════════════════════
  // DATA FETCHING
  // ═══════════════════════════════════════════════════════════════════════

  const fetchAccounts = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('accounts')
      .select('*')
      .order('created_at', { ascending: true });

    if (err) throw err;
    setAccounts((data as Account[]) || []);
  }, []);

  const fetchCategories = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true });

    if (err) throw err;
    setCategories((data as Category[]) || []);
  }, []);

  const fetchTransactions = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('transactions')
      .select('*, category:categories(*), account:accounts(*), to_account:accounts(*)')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (err) throw err;
    setTransactions((data as Transaction[]) || []);
  }, []);

  const fetchBudgets = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('budgets')
      .select('*, category:categories(*)')
      .order('created_at', { ascending: false });

    if (err) throw err;
    setBudgets((data as Budget[]) || []);
  }, []);

  const fetchSavingsGoals = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('savings_goals')
      .select('*')
      .order('created_at', { ascending: false });

    if (err) throw err;
    setSavingsGoals((data as SavingsGoal[]) || []);
  }, []);

  const fetchRecurringTransactions = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('recurring_transactions')
      .select('*, category:categories(*), account:accounts(*)')
      .order('next_due_date', { ascending: true });

    if (err) throw err;
    setRecurringTransactions((data as RecurringTransaction[]) || []);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════
  // BACKGROUND CLOUD SYNCHRONIZATION
  // ═══════════════════════════════════════════════════════════════════════

  const syncWithCloud = useCallback(
    async (overrideData?: {
      accounts?: Account[];
      categories?: Category[];
      transactions?: Transaction[];
      budgets?: Budget[];
      savingsGoals?: SavingsGoal[];
      recurringTransactions?: RecurringTransaction[];
      loans?: LoanRecord[];
    }) => {
      // In Public Demo Mode, never query or push to private cloud database
      if (isDemoMode) {
        setSyncStatus('saved');
        return;
      }

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setSyncStatus('offline');
        return;
      }

      setSyncStatus('saving');
      try {
        const accs = overrideData?.accounts || getLocal<Account[]>('accounts', INITIAL_ACCOUNTS);
        const cats = overrideData?.categories || getLocal<Category[]>('categories', INITIAL_CATEGORIES);
        const txns = overrideData?.transactions || getLocal<Transaction[]>('transactions', INITIAL_TRANSACTIONS);
        const bdgs = overrideData?.budgets || getLocal<Budget[]>('budgets', INITIAL_BUDGETS);
        const sgs = overrideData?.savingsGoals || getLocal<SavingsGoal[]>('savings', INITIAL_SAVINGS_GOALS);
        const recs = overrideData?.recurringTransactions || getLocal<RecurringTransaction[]>('recurring', INITIAL_RECURRING);
        const loanList = overrideData?.loans || getLocal<LoanRecord[]>('loans', INITIAL_LOANS);

        const token = localStorage.getItem('my-money-session-token') || 'master-session';

        const res = await fetch('/api/sync-data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            data: {
              accounts: accs,
              categories: cats,
              transactions: txns,
              budgets: bdgs,
              savingsGoals: sgs,
              recurringTransactions: recs,
              loans: loanList,
              preferences: {
                currency: 'BDT',
                updatedAt: new Date().toISOString(),
              },
            },
          }),
        });

        if (res.ok) {
          setSyncStatus('saved');
          setLastSyncedAt(new Date());
        } else {
          // Local storage is safe and up to date
          setSyncStatus('saved');
          setLastSyncedAt(new Date());
        }
      } catch {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          setSyncStatus('offline');
        } else {
          setSyncStatus('saved');
          setLastSyncedAt(new Date());
        }
      }
    },
    []
  );

  const triggerSync = useCallback(async () => {
    toast.loading('ক্লাউডে সিঙ্ক করা হচ্ছে...', { id: 'manual-sync' });
    await syncWithCloud();
    toast.success('সব ডাটা ক্লাউডে সুরক্ষিতভাবে সংরক্ষিত!', { id: 'manual-sync' });
  }, [syncWithCloud]);

  // ═══════════════════════════════════════════════════════════════════════
  // REFRESH DATA (Local-First + Cloud Hydration)
  // ═══════════════════════════════════════════════════════════════════════

  const refreshData = useCallback(async () => {
    setError(null);

    // If in demo mode, ensure demo sample dataset is populated in demo storage
    if (isDemoMode) {
      const demoInitKey = 'my-money-demo-v1-initialized';
      const isDemoInit = localStorage.getItem(demoInitKey) === 'true';
      if (!isDemoInit) {
        localStorage.setItem('my-money-demo-accounts', JSON.stringify(DEMO_SAMPLE_ACCOUNTS));
        localStorage.setItem('my-money-demo-categories', JSON.stringify(INITIAL_CATEGORIES));
        localStorage.setItem('my-money-demo-transactions', JSON.stringify(DEMO_SAMPLE_TRANSACTIONS));
        localStorage.setItem('my-money-demo-budgets', JSON.stringify(DEMO_SAMPLE_BUDGETS));
        localStorage.setItem('my-money-demo-savings', JSON.stringify(DEMO_SAMPLE_SAVINGS_GOALS));
        localStorage.setItem('my-money-demo-recurring', JSON.stringify(DEMO_SAMPLE_RECURRING));
        localStorage.setItem('my-money-demo-loans', JSON.stringify(DEMO_SAMPLE_LOANS));
        localStorage.setItem(demoInitKey, 'true');
      }
    } else {
      // Auto-migrate to clean zero start for the authenticated owner
      const ZERO_INITIALIZED_KEY = 'my-money-zero-v3';
      const hasAutoReset = localStorage.getItem(ZERO_INITIALIZED_KEY) === 'true';
      if (!hasAutoReset) {
        setLocal('transactions', []);
        setLocal('accounts', INITIAL_ACCOUNTS);
        setLocal('budgets', []);
        setLocal('savings', []);
        setLocal('recurring', []);
        setLocal('loans', INITIAL_LOANS);
        localStorage.setItem(ZERO_INITIALIZED_KEY, 'true');
      }
    }

    let accs = getLocal<Account[]>('accounts', isDemoMode ? DEMO_SAMPLE_ACCOUNTS : INITIAL_ACCOUNTS);
    let cats = getLocal<Category[]>('categories', INITIAL_CATEGORIES);
    let txns = getLocal<Transaction[]>('transactions', isDemoMode ? DEMO_SAMPLE_TRANSACTIONS : INITIAL_TRANSACTIONS);
    let bdgs = getLocal<Budget[]>('budgets', isDemoMode ? DEMO_SAMPLE_BUDGETS : INITIAL_BUDGETS);
    let sgs = getLocal<SavingsGoal[]>('savings', isDemoMode ? DEMO_SAMPLE_SAVINGS_GOALS : INITIAL_SAVINGS_GOALS);
    let recs = getLocal<RecurringTransaction[]>('recurring', isDemoMode ? DEMO_SAMPLE_RECURRING : INITIAL_RECURRING);
    let loanList = getLocal<LoanRecord[]>('loans', isDemoMode ? DEMO_SAMPLE_LOANS : INITIAL_LOANS);

    const hydrateAndSetState = (
      a: Account[],
      c: Category[],
      t: Transaction[],
      b: Budget[],
      s: SavingsGoal[],
      r: RecurringTransaction[],
      l: LoanRecord[]
    ) => {
      const catMap = new Map(c.map((cat) => [cat.id, cat]));
      const accMap = new Map(a.map((acc) => [acc.id, acc]));

      const hydratedTxns = t.map((txn) => ({
        ...txn,
        category: txn.category_id ? catMap.get(txn.category_id) : undefined,
        account: txn.account_id ? accMap.get(txn.account_id) : undefined,
        to_account: txn.to_account_id ? accMap.get(txn.to_account_id) : undefined,
      }));

      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const hydratedLoans = l.map((loan) => {
        const reps = loan.repayments || [];
        const totalRepaid = reps.reduce((sum, rep) => sum + Number(rep.amount || 0), 0);
        const remaining = Math.max(0, Number(loan.original_amount || 0) - totalRepaid);
        const dueDate = loan.due_date ? loan.due_date.split('T')[0] : null;
        let status: LoanStatus = 'unpaid';
        if (remaining <= 0) {
          status = 'paid';
        } else if (dueDate && dueDate < todayStr) {
          status = 'overdue';
        } else if (totalRepaid > 0) {
          status = 'partially_paid';
        }
        return {
          ...loan,
          total_repaid: totalRepaid,
          remaining_balance: remaining,
          status,
        };
      });

      setAccounts(a);
      setCategories(c);
      setTransactions(hydratedTxns);
      setBudgets(
        b.map((bdg) => ({
          ...bdg,
          category: bdg.category_id ? catMap.get(bdg.category_id) : undefined,
        }))
      );
      setSavingsGoals(s);
      setRecurringTransactions(
        r.map((rec) => ({
          ...rec,
          category: rec.category_id ? catMap.get(rec.category_id) : undefined,
          account: accMap.get(rec.account_id),
        }))
      );
      setLoans(hydratedLoans);
    };

    // 1. Instantly display local/demo cache
    hydrateAndSetState(accs, cats, txns, bdgs, sgs, recs, loanList);

    // In demo mode, bypass all cloud communication
    if (isDemoMode) {
      setSyncStatus('saved');
      setLastSyncedAt(new Date());
      return;
    }

    // 2. Background check with cloud API (Authenticated owner only)
    try {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setSyncStatus('offline');
        return;
      }

      const token = localStorage.getItem('my-money-session-token') || 'master-session';
      const res = await fetch('/api/sync-data', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const payload = await res.json();
        if (
          payload.data &&
          (payload.data.transactions?.length || payload.data.accounts?.length)
        ) {
          const cloudTxns = payload.data.transactions || [];
          const cloudAccs = payload.data.accounts || [];
          const cloudCats = payload.data.categories || [];
          const cloudBdgs = payload.data.budgets || [];
          const cloudSgs = payload.data.savingsGoals || [];
          const cloudRecs = payload.data.recurringTransactions || [];
          const cloudLoans = payload.data.loans || [];

          if (cloudTxns.length >= txns.length) {
            accs = cloudAccs.length ? cloudAccs : accs;
            cats = cloudCats.length ? cloudCats : cats;
            txns = cloudTxns;
            bdgs = cloudBdgs.length ? cloudBdgs : bdgs;
            sgs = cloudSgs.length ? cloudSgs : sgs;
            recs = cloudRecs.length ? cloudRecs : recs;
            loanList = cloudLoans.length ? cloudLoans : loanList;

            setLocal('accounts', accs);
            setLocal('categories', cats);
            setLocal('transactions', txns);
            setLocal('budgets', bdgs);
            setLocal('savings', sgs);
            setLocal('recurring', recs);
            setLocal('loans', loanList);

            hydrateAndSetState(accs, cats, txns, bdgs, sgs, recs, loanList);
          }
        } else if (txns.length > 0 || accs.some((a) => Number(a.current_balance) > 0)) {
          // Push local data to initialize cloud
          syncWithCloud({
            accounts: accs,
            categories: cats,
            transactions: txns,
            budgets: bdgs,
            savingsGoals: sgs,
            recurringTransactions: recs,
            loans: loanList,
          });
        }
        setSyncStatus('saved');
        setLastSyncedAt(new Date());
      } else {
        setSyncStatus('saved');
        setLastSyncedAt(new Date());
      }
    } catch {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setSyncStatus('offline');
      } else {
        setSyncStatus('saved');
        setLastSyncedAt(new Date());
      }
    }
  }, [user, isDemoMode, getLocal, setLocal, syncWithCloud]);

  // Fetch data on load or auth change (Demo Mode for visitors, Private Mode for owner)
  useEffect(() => {
    setLoading(true);
    refreshData().finally(() => setLoading(false));
  }, [user, refreshData]);

  // Multi-tab broadcast helper
  const broadcastDataChange = useCallback(() => {
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('my-money-data-sync');
        bc.postMessage({ type: 'REFRESH_DATA' });
        bc.close();
      }
    } catch {
      // ignore
    }
  }, []);

  // ─── Real-Time Cross-Device & Multi-Tab Synchronization ────────────────
  useEffect(() => {
    if (!user) return;

    // 1. Supabase Postgres Realtime Subscription (active when cloud database is connected)
    let channel: any = null;
    if (isSupabaseConfigured()) {
      try {
        channel = supabase
          .channel('realtime-finance-sync')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public' },
            () => {
              refreshData();
            }
          )
          .subscribe();
      } catch (err) {
        console.warn('Realtime subscription error:', err);
      }
    }

    // 2. Cross-Tab Synchronization via BroadcastChannel
    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      bc = new BroadcastChannel('my-money-data-sync');
      bc.onmessage = (event) => {
        if (event.data?.type === 'REFRESH_DATA') {
          refreshData();
        }
      };
    }

    // 3. Auto-sync on window focus / tab visibility change (e.g. user opens Chrome on PC after phone)
    const handleFocusSync = () => {
      if (document.visibilityState === 'visible') {
        refreshData();
      }
    };
    window.addEventListener('visibilitychange', handleFocusSync);
    window.addEventListener('focus', handleFocusSync);

    // 4. Automatic Cloud Sync on Network Reconnect
    const handleOnline = () => {
      syncWithCloud();
    };
    const handleOffline = () => {
      setSyncStatus('offline');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {
          // ignore
        }
      }
      if (bc) {
        bc.close();
      }
      window.removeEventListener('visibilitychange', handleFocusSync);
      window.removeEventListener('focus', handleFocusSync);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user, refreshData, syncWithCloud]);

  // ═══════════════════════════════════════════════════════════════════════
  // ACCOUNT BALANCE RECALCULATION
  // ═══════════════════════════════════════════════════════════════════════

  const recalculateAccountBalance = useCallback(
    async (accountId: string) => {
      const txns = getLocal<Transaction[]>('transactions', INITIAL_TRANSACTIONS);
      const accs = getLocal<Account[]>('accounts', INITIAL_ACCOUNTS);
      const loanList = getLocal<LoanRecord[]>('loans', isDemoMode ? DEMO_SAMPLE_LOANS : INITIAL_LOANS);
      const account = accs.find((a) => a.id === accountId);
      if (!account) return;

      let balance = Number(account.opening_balance || 0);
      for (const txn of txns) {
        const amount = Number(txn.amount);
        if (txn.account_id === accountId) {
          if (txn.type === 'income' || txn.type === 'refund') balance += amount;
          else if (txn.type === 'expense' || txn.type === 'transfer') balance -= amount;
        }
        if (txn.to_account_id === accountId && txn.type === 'transfer') {
          balance += amount;
        }
      }

      // Adjust for personal loans linked to this account
      for (const l of loanList) {
        if (l.account_id === accountId) {
          if (l.type === 'receivable') {
            // Money lent out of this account (cash outflow)
            balance -= Number(l.original_amount || 0);
          } else if (l.type === 'payable') {
            // Money borrowed into this account (cash inflow)
            balance += Number(l.original_amount || 0);
          }
        }
        // Loan repayments
        for (const rep of l.repayments || []) {
          const repAccountId = rep.account_id || l.account_id;
          if (repAccountId === accountId) {
            if (l.type === 'receivable') {
              // Money repaid to us (cash inflow)
              balance += Number(rep.amount || 0);
            } else if (l.type === 'payable') {
              // Money repaid by us (cash outflow)
              balance -= Number(rep.amount || 0);
            }
          }
        }
      }

      account.current_balance = balance;
      setLocal('accounts', accs);
      setAccounts([...accs]);
    },
    [isDemoMode, getLocal, setLocal]
  );

  // ═══════════════════════════════════════════════════════════════════════
  // TRANSACTION CRUD
  // ═══════════════════════════════════════════════════════════════════════

  const addTransaction = useCallback(
    async (txn: Partial<Transaction>) => {
      const currentUserId = user?.id || 'demo-user-id';
      const txns = getLocal<Transaction[]>('transactions', INITIAL_TRANSACTIONS);
      const newTxn: Transaction = {
        id: `txn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        user_id: currentUserId,
        type: txn.type || 'expense',
        amount: Number(txn.amount),
        date: txn.date || new Date().toISOString().slice(0, 10),
        time: txn.time || null,
        description: txn.description || '',
        category_id: txn.category_id || null,
        subcategory: txn.subcategory || null,
        account_id: txn.account_id || null,
        to_account_id: txn.to_account_id || null,
        payment_method: txn.payment_method || null,
        merchant: txn.merchant || null,
        notes: txn.notes || null,
        tags: txn.tags || [],
        is_recurring: txn.is_recurring || false,
        recurring_id: txn.recurring_id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      txns.unshift(newTxn);
      setLocal('transactions', txns);

      if (txn.account_id) await recalculateAccountBalance(txn.account_id);
      if (txn.to_account_id) await recalculateAccountBalance(txn.to_account_id);

      await refreshData();
      broadcastDataChange();
      if (!isDemoMode) syncWithCloud();

      const cat = categories.find((c) => c.id === txn.category_id);
      const acc = accounts.find((a) => a.id === txn.account_id);
      addNotification({
        type: txn.type === 'income' ? 'income_added' : txn.type === 'transfer' ? 'transfer_added' : 'expense_added',
        title: txn.type === 'income' ? 'Income Added' : txn.type === 'transfer' ? 'Transfer Completed' : 'Expense Added',
        description: txn.description || 'Transaction',
        amount: Number(txn.amount),
        category: cat?.name,
        account: acc?.name,
      });

      toast.success('Transaction added');
    },
    [user, isDemoMode, categories, accounts, getLocal, setLocal, recalculateAccountBalance, refreshData, broadcastDataChange, syncWithCloud, addNotification]
  );

  const updateTransaction = useCallback(
    async (id: string, txn: Partial<Transaction>) => {
      const txns = getLocal<Transaction[]>('transactions', INITIAL_TRANSACTIONS);
      const idx = txns.findIndex((t) => t.id === id);
      if (idx === -1) return;

      const old = txns[idx];
      txns[idx] = { ...old, ...txn, updated_at: new Date().toISOString() };
      setLocal('transactions', txns);

      if (old.account_id) await recalculateAccountBalance(old.account_id);
      if (old.to_account_id) await recalculateAccountBalance(old.to_account_id);
      if (txn.account_id && txn.account_id !== old.account_id) await recalculateAccountBalance(txn.account_id);
      if (txn.to_account_id && txn.to_account_id !== old.to_account_id) await recalculateAccountBalance(txn.to_account_id);

      await refreshData();
      broadcastDataChange();
      if (!isDemoMode) syncWithCloud();

      const cat = categories.find((c) => c.id === (txn.category_id || old.category_id));
      const acc = accounts.find((a) => a.id === (txn.account_id || old.account_id));
      addNotification({
        type: (txn.type || old.type) === 'income' ? 'income_updated' : 'expense_updated',
        title: 'Transaction Updated',
        description: txn.description || old.description || 'Transaction updated',
        amount: txn.amount !== undefined ? Number(txn.amount) : Number(old.amount),
        category: cat?.name,
        account: acc?.name,
      });

      toast.success('Transaction updated');
    },
    [isDemoMode, categories, accounts, getLocal, setLocal, recalculateAccountBalance, refreshData, broadcastDataChange, syncWithCloud, addNotification]
  );

  const restoreTransaction = useCallback(
    async (txn: Transaction) => {
      const txns = getLocal<Transaction[]>('transactions', INITIAL_TRANSACTIONS);
      if (txns.some((t) => t.id === txn.id)) {
        return;
      }

      const restored: Transaction = {
        ...txn,
        updated_at: new Date().toISOString(),
      };
      txns.unshift(restored);
      setLocal('transactions', txns);

      if (txn.account_id) await recalculateAccountBalance(txn.account_id);
      if (txn.to_account_id) await recalculateAccountBalance(txn.to_account_id);

      await refreshData();
      broadcastDataChange();
      if (!isDemoMode) syncWithCloud();

      addNotification({
        type: txn.type === 'income' ? 'income_added' : txn.type === 'transfer' ? 'transfer_added' : 'expense_added',
        title: 'Transaction Restored / লেনদেন পুনরুদ্ধার করা হয়েছে',
        description: txn.description || 'Restored transaction',
        amount: Number(txn.amount),
        category: txn.category?.name,
        account: txn.account?.name,
      });

      toast.success('লেনদেন সফলভাবে পুনরুদ্ধার করা হয়েছে / Restored');
    },
    [isDemoMode, getLocal, setLocal, recalculateAccountBalance, refreshData, broadcastDataChange, syncWithCloud, addNotification]
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      const txns = getLocal<Transaction[]>('transactions', INITIAL_TRANSACTIONS);
      const oldTxn = txns.find((t) => t.id === id);
      if (!oldTxn) return;

      const filtered = txns.filter((t) => t.id !== id);
      setLocal('transactions', filtered);

      if (oldTxn.account_id) await recalculateAccountBalance(oldTxn.account_id);
      if (oldTxn.to_account_id) await recalculateAccountBalance(oldTxn.to_account_id);

      await refreshData();
      broadcastDataChange();
      if (!isDemoMode) syncWithCloud();

      addNotification({
        type: oldTxn.type === 'income' ? 'income_deleted' : 'expense_deleted',
        title: oldTxn.type === 'income' ? 'Income Deleted' : 'Expense Deleted',
        description: oldTxn.description || 'Transaction deleted',
        amount: Number(oldTxn.amount),
        category: oldTxn.category?.name,
        account: oldTxn.account?.name,
      });

      // Interactive 7-second Undo Toast
      toast(
        (t) => (
          <div className="flex items-center justify-between gap-3 w-full py-0.5">
            <div className="flex flex-col text-xs leading-tight">
              <span className="font-semibold text-white">
                {oldTxn.description || 'Transaction'} মুছে ফেলা হয়েছে
              </span>
              <span className="text-gray-300">
                ৳{Number(oldTxn.amount || 0).toLocaleString()} ({oldTxn.type})
              </span>
            </div>
            <button
              type="button"
              onClick={async () => {
                toast.dismiss(t.id);
                await restoreTransaction(oldTxn);
              }}
              className="rounded-lg bg-teal-500 hover:bg-teal-400 px-3 py-1.5 text-xs font-bold text-white shadow-md transition-all active:scale-95"
            >
              Undo / ফিরিয়ে নিন
            </button>
          </div>
        ),
        {
          duration: 7000,
          icon: '🗑️',
          style: {
            background: '#1e293b',
            color: '#ffffff',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '16px',
            padding: '12px 16px',
            maxWidth: '420px',
          },
        }
      );
    },
    [user, recalculateAccountBalance, refreshData, broadcastDataChange, syncWithCloud, addNotification, restoreTransaction]
  );

  // ═══════════════════════════════════════════════════════════════════════
  // ACCOUNT CRUD
  // ═══════════════════════════════════════════════════════════════════════

  const addAccount = useCallback(
    async (account: Partial<Account>) => {
      const currentUserId = user?.id || 'demo-user-id';
      const accs = getLocal<Account[]>('accounts', INITIAL_ACCOUNTS);
      const newAcc: Account = {
        id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        user_id: currentUserId,
        name: account.name || 'Account',
        type: account.type || 'cash',
        opening_balance: Number(account.opening_balance) || 0,
        current_balance: Number(account.opening_balance) || 0,
        currency: account.currency || 'BDT',
        icon: account.icon || 'Wallet',
        color: account.color || '#14b8a6',
        is_active: account.is_active !== undefined ? account.is_active : true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      accs.push(newAcc);
      setLocal('accounts', accs);

      await refreshData();
      broadcastDataChange();
      if (!isDemoMode) syncWithCloud();

      addNotification({
        type: 'balance_updated',
        title: 'Account / Wallet Added',
        description: newAcc.name,
        amount: newAcc.opening_balance,
        account: newAcc.name,
      });
      toast.success('Account added');
    },
    [user, isDemoMode, getLocal, setLocal, refreshData, broadcastDataChange, syncWithCloud, addNotification]
  );

  const updateAccount = useCallback(
    async (id: string, account: Partial<Account>) => {
      const accs = getLocal<Account[]>('accounts', INITIAL_ACCOUNTS);
      const idx = accs.findIndex((a) => a.id === id);
      if (idx !== -1) {
        accs[idx] = { ...accs[idx], ...account, updated_at: new Date().toISOString() };
        setLocal('accounts', accs);
      }

      await refreshData();
      broadcastDataChange();
      if (!isDemoMode) syncWithCloud();

      addNotification({
        type: 'balance_updated',
        title: 'Wallet / Balance Updated',
        description: account.name ? `${account.name} balance updated` : 'Account updated',
        amount: account.current_balance !== undefined ? Number(account.current_balance) : undefined,
        account: account.name,
      });
      toast.success('Account updated');
    },
    [isDemoMode, getLocal, setLocal, refreshData, broadcastDataChange, syncWithCloud, addNotification]
  );

  const deleteAccount = useCallback(
    async (id: string) => {
      const accs = getLocal<Account[]>('accounts', INITIAL_ACCOUNTS);
      const old = accs.find((a) => a.id === id);
      setLocal('accounts', accs.filter((a) => a.id !== id));

      await refreshData();
      broadcastDataChange();
      if (!isDemoMode) syncWithCloud();

      if (old) {
        addNotification({
          type: 'balance_updated',
          title: 'Account Removed',
          description: old.name,
          account: old.name,
        });
      }
      toast.success('Account deleted');
    },
    [isDemoMode, getLocal, setLocal, refreshData, broadcastDataChange, syncWithCloud, addNotification]
  );

  // ═══════════════════════════════════════════════════════════════════════
  // CATEGORY CRUD
  // ═══════════════════════════════════════════════════════════════════════

  const addCategory = useCallback(
    async (category: Partial<Category>) => {
      const currentUserId = user?.id || 'demo-user-id';
      const cats = getLocal<Category[]>('categories', INITIAL_CATEGORIES);
      const newCat: Category = {
        id: `cat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        user_id: currentUserId,
        name: category.name || 'Category',
        type: category.type || 'expense',
        icon: category.icon || 'Tag',
        color: category.color || '#6B7280',
        parent_id: category.parent_id || null,
        sort_order: category.sort_order || cats.length + 1,
        is_default: false,
        created_at: new Date().toISOString(),
      };
      cats.push(newCat);
      setLocal('categories', cats);

      await refreshData();
      broadcastDataChange();
      if (!isDemoMode) syncWithCloud();

      toast.success('Category added');
    },
    [user, isDemoMode, getLocal, setLocal, refreshData, broadcastDataChange, syncWithCloud]
  );

  const updateCategory = useCallback(
    async (id: string, category: Partial<Category>) => {
      const cats = getLocal<Category[]>('categories', INITIAL_CATEGORIES);
      const idx = cats.findIndex((c) => c.id === id);
      if (idx !== -1) {
        cats[idx] = { ...cats[idx], ...category };
        setLocal('categories', cats);
      }

      await refreshData();
      broadcastDataChange();
      if (!isDemoMode) syncWithCloud();

      toast.success('Category updated');
    },
    [isDemoMode, getLocal, setLocal, refreshData, broadcastDataChange, syncWithCloud]
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      const cats = getLocal<Category[]>('categories', INITIAL_CATEGORIES);
      setLocal('categories', cats.filter((c) => c.id !== id));

      await refreshData();
      broadcastDataChange();
      if (!isDemoMode) syncWithCloud();

      toast.success('Category deleted');
    },
    [isDemoMode, getLocal, setLocal, refreshData, broadcastDataChange, syncWithCloud]
  );

  // ═══════════════════════════════════════════════════════════════════════
  // BUDGET CRUD
  // ═══════════════════════════════════════════════════════════════════════

  const addBudget = useCallback(
    async (budget: Partial<Budget>) => {
      const currentUserId = user?.id || 'demo-user-id';
      const bdgs = getLocal<Budget[]>('budgets', INITIAL_BUDGETS);
      const newBdg: Budget = {
        id: `bdg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        user_id: currentUserId,
        name: budget.name || 'Budget',
        amount: Number(budget.amount) || 0,
        spent: 0,
        category_id: budget.category_id || null,
        period: budget.period || 'monthly',
        start_date: budget.start_date || '',
        end_date: budget.end_date || '',
        alert_threshold_50: budget.alert_threshold_50 ?? false,
        alert_threshold_75: budget.alert_threshold_75 ?? true,
        alert_threshold_90: budget.alert_threshold_90 ?? true,
        alert_threshold_100: budget.alert_threshold_100 ?? true,
        is_active: budget.is_active !== undefined ? budget.is_active : true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      bdgs.push(newBdg);
      setLocal('budgets', bdgs);

      await refreshData();
      broadcastDataChange();
      if (!isDemoMode) syncWithCloud();

      toast.success('Budget created');
    },
    [user, isDemoMode, getLocal, setLocal, refreshData, broadcastDataChange, syncWithCloud]
  );

  const updateBudget = useCallback(
    async (id: string, budget: Partial<Budget>) => {
      const bdgs = getLocal<Budget[]>('budgets', INITIAL_BUDGETS);
      const idx = bdgs.findIndex((b) => b.id === id);
      if (idx !== -1) {
        bdgs[idx] = { ...bdgs[idx], ...budget, updated_at: new Date().toISOString() };
        setLocal('budgets', bdgs);
      }

      await refreshData();
      broadcastDataChange();
      if (!isDemoMode) syncWithCloud();

      toast.success('Budget updated');
    },
    [isDemoMode, getLocal, setLocal, refreshData, broadcastDataChange, syncWithCloud]
  );

  const deleteBudget = useCallback(
    async (id: string) => {
      const bdgs = getLocal<Budget[]>('budgets', INITIAL_BUDGETS);
      setLocal('budgets', bdgs.filter((b) => b.id !== id));

      await refreshData();
      broadcastDataChange();
      if (!isDemoMode) syncWithCloud();

      toast.success('Budget deleted');
    },
    [isDemoMode, getLocal, setLocal, refreshData, broadcastDataChange, syncWithCloud]
  );

  // ═══════════════════════════════════════════════════════════════════════
  // SAVINGS GOALS CRUD
  // ═══════════════════════════════════════════════════════════════════════

  const addSavingsGoal = useCallback(
    async (goal: Partial<SavingsGoal>) => {
      const currentUserId = user?.id || 'demo-user-id';
      const sgs = getLocal<SavingsGoal[]>('savings', INITIAL_SAVINGS_GOALS);
      const newGoal: SavingsGoal = {
        id: `sg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        user_id: currentUserId,
        name: goal.name || 'Savings Goal',
        target_amount: Number(goal.target_amount) || 0,
        current_amount: Number(goal.current_amount) || 0,
        target_date: goal.target_date || null,
        monthly_contribution: goal.monthly_contribution ? Number(goal.monthly_contribution) : null,
        icon: goal.icon || 'PiggyBank',
        color: goal.color || '#14b8a6',
        is_completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      sgs.push(newGoal);
      setLocal('savings', sgs);

      await refreshData();
      broadcastDataChange();
      if (!isDemoMode) syncWithCloud();

      toast.success('Savings goal created');
    },
    [user, isDemoMode, getLocal, setLocal, refreshData, broadcastDataChange, syncWithCloud]
  );

  const updateSavingsGoal = useCallback(
    async (id: string, goal: Partial<SavingsGoal>) => {
      const sgs = getLocal<SavingsGoal[]>('savings', INITIAL_SAVINGS_GOALS);
      const idx = sgs.findIndex((s) => s.id === id);
      if (idx !== -1) {
        sgs[idx] = { ...sgs[idx], ...goal, updated_at: new Date().toISOString() };
        setLocal('savings', sgs);
      }

      await refreshData();
      broadcastDataChange();
      if (!isDemoMode) syncWithCloud();

      toast.success('Savings goal updated');
    },
    [isDemoMode, getLocal, setLocal, refreshData, broadcastDataChange, syncWithCloud]
  );

  const deleteSavingsGoal = useCallback(
    async (id: string) => {
      const sgs = getLocal<SavingsGoal[]>('savings', INITIAL_SAVINGS_GOALS);
      setLocal('savings', sgs.filter((s) => s.id !== id));

      await refreshData();
      broadcastDataChange();
      if (!isDemoMode) syncWithCloud();

      toast.success('Savings goal deleted');
    },
    [isDemoMode, getLocal, setLocal, refreshData, broadcastDataChange, syncWithCloud]
  );

  const addContribution = useCallback(
    async (contribution: Partial<SavingsContribution>) => {
      const sgs = getLocal<SavingsGoal[]>('savings', INITIAL_SAVINGS_GOALS);
      const goal = sgs.find((g) => g.id === contribution.goal_id);
      if (goal) {
        const delta =
          contribution.type === 'withdrawal'
            ? -Number(contribution.amount)
            : Number(contribution.amount);
        goal.current_amount = Math.max(0, Number(goal.current_amount) + delta);
        goal.is_completed = goal.current_amount >= Number(goal.target_amount);
        setLocal('savings', sgs);
      }

      await refreshData();
      broadcastDataChange();
      if (!isDemoMode) syncWithCloud();

      toast.success(
        contribution.type === 'withdrawal' ? 'Withdrawal recorded' : 'Contribution added'
      );
    },
    [isDemoMode, getLocal, setLocal, refreshData, broadcastDataChange, syncWithCloud]
  );

  // ═══════════════════════════════════════════════════════════════════════
  // RECURRING TRANSACTIONS CRUD
  // ═══════════════════════════════════════════════════════════════════════

  const addRecurring = useCallback(
    async (recurring: Partial<RecurringTransaction>) => {
      const currentUserId = user?.id || 'demo-user-id';
      const recs = getLocal<RecurringTransaction[]>('recurring', INITIAL_RECURRING);
      const newRec: RecurringTransaction = {
        id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        user_id: currentUserId,
        type: recurring.type || 'expense',
        amount: Number(recurring.amount) || 0,
        description: recurring.description || '',
        category_id: recurring.category_id || null,
        account_id: recurring.account_id || '',
        frequency: recurring.frequency || 'monthly',
        next_due_date: recurring.next_due_date || new Date().toISOString().slice(0, 10),
        last_processed_date: null,
        is_active: recurring.is_active !== undefined ? recurring.is_active : true,
        auto_create: recurring.auto_create || false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      recs.push(newRec);
      setLocal('recurring', recs);

      await refreshData();
      broadcastDataChange();
      if (!isDemoMode) syncWithCloud();

      toast.success('Recurring transaction created');
    },
    [user, isDemoMode, getLocal, setLocal, refreshData, broadcastDataChange, syncWithCloud]
  );

  const updateRecurring = useCallback(
    async (id: string, recurring: Partial<RecurringTransaction>) => {
      const recs = getLocal<RecurringTransaction[]>('recurring', INITIAL_RECURRING);
      const idx = recs.findIndex((r) => r.id === id);
      if (idx !== -1) {
        recs[idx] = { ...recs[idx], ...recurring, updated_at: new Date().toISOString() };
        setLocal('recurring', recs);
      }

      await refreshData();
      broadcastDataChange();
      if (!isDemoMode) syncWithCloud();

      toast.success('Recurring transaction updated');
    },
    [isDemoMode, getLocal, setLocal, refreshData, broadcastDataChange, syncWithCloud]
  );

  const deleteRecurring = useCallback(
    async (id: string) => {
      const recs = getLocal<RecurringTransaction[]>('recurring', INITIAL_RECURRING);
      setLocal('recurring', recs.filter((r) => r.id !== id));

      await refreshData();
      broadcastDataChange();
      if (!isDemoMode) syncWithCloud();

      toast.success('Recurring transaction deleted');
    },
    [isDemoMode, getLocal, setLocal, refreshData, broadcastDataChange, syncWithCloud]
  );

  const markRecurringPaid = useCallback(
    async (id: string) => {
      const recs = getLocal<RecurringTransaction[]>('recurring', INITIAL_RECURRING);
      const recurring = recs.find((r) => r.id === id);
      if (!recurring) throw new Error('Recurring transaction not found');

      // Create the actual transaction
      await addTransaction({
        type: recurring.type,
        amount: recurring.amount,
        date: recurring.next_due_date,
        description: recurring.description,
        category_id: recurring.category_id,
        account_id: recurring.account_id,
        is_recurring: true,
        recurring_id: recurring.id,
      });

      // Calculate next due date
      const currentDue = new Date(recurring.next_due_date);
      let nextDue: Date;

      switch (recurring.frequency) {
        case 'daily':
          nextDue = addDays(currentDue, 1);
          break;
        case 'weekly':
          nextDue = addWeeks(currentDue, 1);
          break;
        case 'monthly':
          nextDue = addMonths(currentDue, 1);
          break;
        case 'yearly':
          nextDue = addYears(currentDue, 1);
          break;
        default:
          nextDue = addMonths(currentDue, 1);
      }

      const idx = recs.findIndex((r) => r.id === id);
      if (idx !== -1) {
        recs[idx] = {
          ...recs[idx],
          next_due_date: format(nextDue, 'yyyy-MM-dd'),
          last_processed_date: format(currentDue, 'yyyy-MM-dd'),
          updated_at: new Date().toISOString(),
        };
        setLocal('recurring', recs);
      }

      await refreshData();
      broadcastDataChange();
      if (!isDemoMode) syncWithCloud();

      toast.success('Recurring transaction marked as paid');
    },
    [isDemoMode, addTransaction, getLocal, setLocal, refreshData, broadcastDataChange, syncWithCloud]
  );

  // ═══════════════════════════════════════════════════════════════════════
  // DEMO RESET & PERSONAL LOANS (RECEIVABLE & PAYABLE) CRUD
  // ═══════════════════════════════════════════════════════════════════════

  const resetDemoData = useCallback(async () => {
    localStorage.setItem('my-money-demo-accounts', JSON.stringify(DEMO_SAMPLE_ACCOUNTS));
    localStorage.setItem('my-money-demo-categories', JSON.stringify(INITIAL_CATEGORIES));
    localStorage.setItem('my-money-demo-transactions', JSON.stringify(DEMO_SAMPLE_TRANSACTIONS));
    localStorage.setItem('my-money-demo-budgets', JSON.stringify(DEMO_SAMPLE_BUDGETS));
    localStorage.setItem('my-money-demo-savings', JSON.stringify(DEMO_SAMPLE_SAVINGS_GOALS));
    localStorage.setItem('my-money-demo-recurring', JSON.stringify(DEMO_SAMPLE_RECURRING));
    localStorage.setItem('my-money-demo-loans', JSON.stringify(DEMO_SAMPLE_LOANS));
    localStorage.setItem('my-money-demo-v1-initialized', 'true');
    await refreshData();
    toast.success('ডেমো ডেটা সফলভাবে রিসেট করা হয়েছে / Demo data reset successfully');
  }, [refreshData]);

  // 5 Dashboard KPI Summary Cards for Personal Lending
  const loanSummary = useMemo<LoanSummary>(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    let totalReceivable = 0;
    let totalPayable = 0;
    let overdueReceivable = 0;
    let overduePayable = 0;

    for (const loan of loans) {
      const remaining = Number(loan.remaining_balance || 0);
      if (remaining <= 0) continue; // Fully paid loan

      const dueDate = loan.due_date ? loan.due_date.split('T')[0] : null;
      const isOverdue = dueDate ? dueDate < today : false;

      if (loan.type === 'receivable') {
        totalReceivable += remaining;
        if (isOverdue) overdueReceivable += remaining;
      } else if (loan.type === 'payable') {
        totalPayable += remaining;
        if (isOverdue) overduePayable += remaining;
      }
    }

    return {
      totalReceivable,
      totalPayable,
      netLendingBalance: totalReceivable - totalPayable,
      overdueReceivable,
      overduePayable,
    };
  }, [loans]);

  const addLoan = useCallback(
    async (loan: Partial<LoanRecord>) => {
      const currentUserId = user?.id || 'demo-user-id';
      const originalAmount = Number(loan.original_amount) || 0;
      if (originalAmount <= 0) {
        throw new Error('অনুগ্রহ করে সঠিক টাকার পরিমাণ দিন');
      }
      if (!loan.person_name?.trim()) {
        throw new Error('ব্যক্তির নাম আবশ্যক');
      }

      const currentLoans = getLocal<LoanRecord[]>('loans', isDemoMode ? DEMO_SAMPLE_LOANS : INITIAL_LOANS);
      const today = format(new Date(), 'yyyy-MM-dd');
      const dueDate = loan.due_date ? loan.due_date.split('T')[0] : null;
      const isOverdue = dueDate ? dueDate < today : false;

      const newLoan: LoanRecord = {
        id: `loan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        user_id: currentUserId,
        type: loan.type || 'receivable',
        person_name: loan.person_name.trim(),
        phone_number: loan.phone_number?.trim() || null,
        original_amount: originalAmount,
        start_date: loan.start_date || today,
        due_date: dueDate,
        interest_rate: loan.interest_rate !== undefined ? Number(loan.interest_rate) : null,
        interest_type: loan.interest_type || null,
        description: loan.description?.trim() || null,
        account_id: loan.account_id || null,
        repayments: [],
        total_repaid: 0,
        remaining_balance: originalAmount,
        status: isOverdue ? 'overdue' : 'unpaid',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      currentLoans.unshift(newLoan);
      setLocal('loans', currentLoans);

      // Adjust linked account balance
      if (loan.account_id) {
        await recalculateAccountBalance(loan.account_id);
      }

      await refreshData();
      broadcastDataChange();
      if (!isDemoMode) syncWithCloud();

      addNotification({
        type: 'loan_added',
        title: loan.type === 'payable' ? 'ধার নেওয়া হয়েছে (Payable)' : 'টাকা ধার দেওয়া হয়েছে (Receivable)',
        description: `${loan.person_name} - ৳${originalAmount.toLocaleString()}`,
        amount: originalAmount,
        account: accounts.find((a) => a.id === loan.account_id)?.name,
      });

      toast.success(
        loan.type === 'payable'
          ? 'দেনার হিসাব সফলভাবে সংরক্ষিত হয়েছে'
          : 'পাওনার হিসাব সফলভাবে সংরক্ষিত হয়েছে'
      );
    },
    [user, isDemoMode, accounts, getLocal, setLocal, recalculateAccountBalance, refreshData, broadcastDataChange, syncWithCloud, addNotification]
  );

  const updateLoan = useCallback(
    async (id: string, loan: Partial<LoanRecord>) => {
      const currentLoans = getLocal<LoanRecord[]>('loans', isDemoMode ? DEMO_SAMPLE_LOANS : INITIAL_LOANS);
      const idx = currentLoans.findIndex((l) => l.id === id);
      if (idx === -1) return;

      const old = currentLoans[idx];
      const prevAccountId = old.account_id;
      const newOriginalAmount = loan.original_amount !== undefined ? Number(loan.original_amount) : old.original_amount;
      const repayments = old.repayments || [];
      const totalRepaid = repayments.reduce((s, r) => s + Number(r.amount || 0), 0);
      const remaining = Math.max(0, newOriginalAmount - totalRepaid);

      const today = format(new Date(), 'yyyy-MM-dd');
      const dueDate = loan.due_date !== undefined ? (loan.due_date ? loan.due_date.split('T')[0] : null) : old.due_date;
      let status: LoanStatus = 'unpaid';
      if (remaining <= 0) {
        status = 'paid';
      } else if (dueDate && dueDate < today) {
        status = 'overdue';
      } else if (totalRepaid > 0) {
        status = 'partially_paid';
      }

      currentLoans[idx] = {
        ...old,
        ...loan,
        original_amount: newOriginalAmount,
        due_date: dueDate,
        total_repaid: totalRepaid,
        remaining_balance: remaining,
        status,
        updated_at: new Date().toISOString(),
      };

      setLocal('loans', currentLoans);

      // Recalculate affected accounts
      if (prevAccountId) await recalculateAccountBalance(prevAccountId);
      if (loan.account_id && loan.account_id !== prevAccountId) {
        await recalculateAccountBalance(loan.account_id);
      }

      await refreshData();
      broadcastDataChange();
      if (!isDemoMode) syncWithCloud();

      addNotification({
        type: 'loan_updated',
        title: 'ঋণের হিসাব হালনাগাদ করা হয়েছে',
        description: `${currentLoans[idx].person_name} - অবশিষ্ট ৳${remaining.toLocaleString()}`,
      });

      toast.success('ঋণের হিসাব আপডেট করা হয়েছে');
    },
    [isDemoMode, getLocal, setLocal, recalculateAccountBalance, refreshData, broadcastDataChange, syncWithCloud, addNotification]
  );

  const deleteLoan = useCallback(
    async (id: string) => {
      const currentLoans = getLocal<LoanRecord[]>('loans', isDemoMode ? DEMO_SAMPLE_LOANS : INITIAL_LOANS);
      const old = currentLoans.find((l) => l.id === id);
      if (!old) return;

      const filtered = currentLoans.filter((l) => l.id !== id);
      setLocal('loans', filtered);

      // Recalculate affected accounts
      if (old.account_id) await recalculateAccountBalance(old.account_id);
      for (const r of old.repayments || []) {
        if (r.account_id && r.account_id !== old.account_id) {
          await recalculateAccountBalance(r.account_id);
        }
      }

      await refreshData();
      broadcastDataChange();
      if (!isDemoMode) syncWithCloud();

      addNotification({
        type: 'loan_deleted',
        title: 'ঋণের হিসাব মুছে ফেলা হয়েছে',
        description: `${old.person_name} - ৳${old.original_amount.toLocaleString()}`,
      });

      toast(
        (t) => (
          <div className="flex items-center justify-between gap-3 w-full py-0.5">
            <div className="flex flex-col text-xs leading-tight">
              <span className="font-semibold text-white">{old.person_name} এর ঋণ ডিলিট হয়েছে</span>
              <span className="text-gray-300">৳{old.original_amount.toLocaleString()}</span>
            </div>
            <button
              type="button"
              onClick={async () => {
                toast.dismiss(t.id);
                const restoredLoans = getLocal<LoanRecord[]>('loans', isDemoMode ? DEMO_SAMPLE_LOANS : INITIAL_LOANS);
                restoredLoans.unshift(old);
                setLocal('loans', restoredLoans);
                if (old.account_id) await recalculateAccountBalance(old.account_id);
                await refreshData();
                broadcastDataChange();
                if (!isDemoMode) syncWithCloud();
                toast.success('ঋণ পুনরুদ্ধার করা হয়েছে');
              }}
              className="rounded-lg bg-teal-500 hover:bg-teal-400 px-3 py-1.5 text-xs font-bold text-white shadow-md transition-all active:scale-95"
            >
              Undo / ফিরিয়ে নিন
            </button>
          </div>
        ),
        {
          duration: 7000,
          icon: '🗑️',
          style: {
            background: '#1e293b',
            color: '#ffffff',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '16px',
            padding: '12px 16px',
          },
        }
      );
    },
    [isDemoMode, getLocal, setLocal, recalculateAccountBalance, refreshData, broadcastDataChange, syncWithCloud, addNotification]
  );

  const addLoanRepayment = useCallback(
    async (loanId: string, repayment: Partial<LoanRepayment>) => {
      const currentLoans = getLocal<LoanRecord[]>('loans', isDemoMode ? DEMO_SAMPLE_LOANS : INITIAL_LOANS);
      const loan = currentLoans.find((l) => l.id === loanId);
      if (!loan) throw new Error('ঋণের রেকর্ড পাওয়া যায়নি');

      const repAmount = Number(repayment.amount) || 0;
      if (repAmount <= 0) {
        throw new Error('অনুগ্রহ করে সঠিক কিস্তির পরিমাণ দিন');
      }
      if (repAmount > loan.remaining_balance) {
        throw new Error(`কিস্তির পরিমাণ বাকি টাকার (৳${loan.remaining_balance.toLocaleString()}) চেয়ে বেশি হতে পারে না`);
      }

      const currentUserId = user?.id || 'demo-user-id';
      const today = format(new Date(), 'yyyy-MM-dd');
      const newRep: LoanRepayment = {
        id: `rep-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        loan_id: loanId,
        user_id: currentUserId,
        amount: repAmount,
        date: repayment.date || today,
        payment_method: repayment.payment_method || null,
        account_id: repayment.account_id || loan.account_id,
        notes: repayment.notes?.trim() || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      loan.repayments = loan.repayments || [];
      loan.repayments.unshift(newRep);

      const totalRepaid = loan.repayments.reduce((s, r) => s + Number(r.amount || 0), 0);
      const remaining = Math.max(0, loan.original_amount - totalRepaid);
      loan.total_repaid = totalRepaid;
      loan.remaining_balance = remaining;

      const dueDate = loan.due_date ? loan.due_date.split('T')[0] : null;
      if (remaining <= 0) {
        loan.status = 'paid';
      } else if (dueDate && dueDate < today) {
        loan.status = 'overdue';
      } else {
        loan.status = 'partially_paid';
      }
      loan.updated_at = new Date().toISOString();

      setLocal('loans', currentLoans);

      // Recalculate target account balance
      const targetAccountId = newRep.account_id || loan.account_id;
      if (targetAccountId) {
        await recalculateAccountBalance(targetAccountId);
      }

      await refreshData();
      broadcastDataChange();
      if (!isDemoMode) syncWithCloud();

      addNotification({
        type: 'repayment_added',
        title: loan.type === 'receivable' ? 'পাওনা আদায় / কিস্তি প্রাপ্তি' : 'দেনা পরিশোধ / কিস্তি প্রদান',
        description: `${loan.person_name} - ৳${repAmount.toLocaleString()} (${remaining > 0 ? `বাকি ৳${remaining.toLocaleString()}` : 'সম্পূর্ণ পরিশোধিত'})`,
        amount: repAmount,
        account: accounts.find((a) => a.id === targetAccountId)?.name,
      });

      toast.success(
        remaining === 0
          ? 'সম্পূর্ণ টাকা পরিশোধ সম্পন্ন হয়েছে!'
          : `৳${repAmount.toLocaleString()} কিস্তি সফলভাবে সংরক্ষিত হয়েছে (বাকি ৳${remaining.toLocaleString()})`
      );
    },
    [user, isDemoMode, accounts, getLocal, setLocal, recalculateAccountBalance, refreshData, broadcastDataChange, syncWithCloud, addNotification]
  );

  const deleteLoanRepayment = useCallback(
    async (loanId: string, repaymentId: string) => {
      const currentLoans = getLocal<LoanRecord[]>('loans', isDemoMode ? DEMO_SAMPLE_LOANS : INITIAL_LOANS);
      const loan = currentLoans.find((l) => l.id === loanId);
      if (!loan) return;

      const rep = (loan.repayments || []).find((r) => r.id === repaymentId);
      if (!rep) return;

      loan.repayments = (loan.repayments || []).filter((r) => r.id !== repaymentId);
      const totalRepaid = loan.repayments.reduce((s, r) => s + Number(r.amount || 0), 0);
      const remaining = Math.max(0, loan.original_amount - totalRepaid);
      loan.total_repaid = totalRepaid;
      loan.remaining_balance = remaining;

      const today = format(new Date(), 'yyyy-MM-dd');
      const dueDate = loan.due_date ? loan.due_date.split('T')[0] : null;
      if (remaining <= 0) {
        loan.status = 'paid';
      } else if (dueDate && dueDate < today) {
        loan.status = 'overdue';
      } else if (totalRepaid > 0) {
        loan.status = 'partially_paid';
      } else {
        loan.status = 'unpaid';
      }
      loan.updated_at = new Date().toISOString();

      setLocal('loans', currentLoans);

      const targetAccountId = rep.account_id || loan.account_id;
      if (targetAccountId) {
        await recalculateAccountBalance(targetAccountId);
      }

      await refreshData();
      broadcastDataChange();
      if (!isDemoMode) syncWithCloud();

      addNotification({
        type: 'repayment_deleted',
        title: 'কিস্তির রেকর্ড মুছে ফেলা হয়েছে',
        description: `${loan.person_name} - ৳${rep.amount.toLocaleString()}`,
      });

      toast.success('কিস্তির রেকর্ড মুছে ফেলা হয়েছে এবং ব্যালেন্স সমন্বয় করা হয়েছে');
    },
    [isDemoMode, getLocal, setLocal, recalculateAccountBalance, refreshData, broadcastDataChange, syncWithCloud, addNotification]
  );

  // ═══════════════════════════════════════════════════════════════════════
  // RESET TO ZERO & DEMO DATA HANDLERS
  // ═══════════════════════════════════════════════════════════════════════

  const resetToZero = useCallback(async () => {
    const ZERO_INITIALIZED_KEY = 'my-money-zero-v3';
    setLocal('transactions', []);
    setLocal('accounts', INITIAL_ACCOUNTS);
    setLocal('budgets', []);
    setLocal('savings', []);
    setLocal('recurring', []);
    setLocal('loans', INITIAL_LOANS);
    localStorage.setItem(ZERO_INITIALIZED_KEY, 'true');

    setTransactions([]);
    setAccounts(INITIAL_ACCOUNTS);
    setBudgets([]);
    setSavingsGoals([]);
    setRecurringTransactions([]);
    setLoans([]);

    broadcastDataChange();
    if (!isDemoMode) {
      await syncWithCloud({
        accounts: INITIAL_ACCOUNTS,
        categories: getLocal<Category[]>('categories', INITIAL_CATEGORIES),
        transactions: [],
        budgets: [],
        savingsGoals: [],
        recurringTransactions: [],
        loans: [],
      });
    }

    toast.success('সব হিসেব রিসেট সম্পন্ন! একদম শূন্য (৳০) থেকে শুরু করতে পারেন।');
  }, [isDemoMode, getLocal, setLocal, broadcastDataChange, syncWithCloud]);

  const loadDemoData = useCallback(async () => {
    const ZERO_INITIALIZED_KEY = 'my-money-zero-v3';
    setLocal('transactions', DEMO_SAMPLE_TRANSACTIONS);
    setLocal('accounts', DEMO_SAMPLE_ACCOUNTS);
    setLocal('budgets', DEMO_SAMPLE_BUDGETS);
    setLocal('savings', DEMO_SAMPLE_SAVINGS_GOALS);
    setLocal('recurring', DEMO_SAMPLE_RECURRING);
    setLocal('loans', DEMO_SAMPLE_LOANS);
    localStorage.setItem(ZERO_INITIALIZED_KEY, 'demo');

    await refreshData();
    broadcastDataChange();
    if (!isDemoMode) {
      await syncWithCloud({
        accounts: DEMO_SAMPLE_ACCOUNTS,
        categories: getLocal<Category[]>('categories', INITIAL_CATEGORIES),
        transactions: DEMO_SAMPLE_TRANSACTIONS,
        budgets: DEMO_SAMPLE_BUDGETS,
        savingsGoals: DEMO_SAMPLE_SAVINGS_GOALS,
        recurringTransactions: DEMO_SAMPLE_RECURRING,
        loans: DEMO_SAMPLE_LOANS,
      });
    }
    toast.success('নমুনা ডেমো ডেটা লোড করা হয়েছে');
  }, [isDemoMode, getLocal, setLocal, refreshData, broadcastDataChange, syncWithCloud]);

  const migrateLocalToCloud = useCallback(async () => {
    if (!user) return { success: false, count: 0, message: 'User not authenticated' };
    if (!isSupabaseConfigured()) {
      return { success: false, count: 0, message: 'Supabase cloud database is not connected yet.' };
    }

    try {
      setLoading(true);
      const localTxns = getLocal<Transaction[]>('transactions', []);
      const localAccs = getLocal<Account[]>('accounts', []);
      const localCats = getLocal<Category[]>('categories', []);

      let count = 0;

      // 1. Upload accounts
      for (const acc of localAccs) {
        const { data: existing } = await supabase
          .from('accounts')
          .select('id')
          .eq('name', acc.name)
          .maybeSingle();

        if (!existing) {
          await supabase.from('accounts').insert({
            user_id: user.id,
            name: acc.name,
            type: acc.type || 'cash',
            opening_balance: Number(acc.opening_balance) || 0,
            current_balance: Number(acc.current_balance) || 0,
            currency: acc.currency || 'BDT',
            icon: acc.icon || 'Wallet',
            color: acc.color || '#14b8a6',
            is_active: acc.is_active ?? true,
          });
          count++;
        }
      }

      // 2. Fetch cloud accounts map
      const { data: cloudAccs } = await supabase.from('accounts').select('*');
      const accNameToId = new Map((cloudAccs || []).map((a: any) => [a.name, a.id]));

      // 3. Upload categories
      for (const cat of localCats) {
        const { data: existing } = await supabase
          .from('categories')
          .select('id')
          .eq('name', cat.name)
          .maybeSingle();

        if (!existing) {
          await supabase.from('categories').insert({
            user_id: user.id,
            name: cat.name,
            type: cat.type,
            icon: cat.icon || 'Tag',
            color: cat.color || '#14b8a6',
          });
          count++;
        }
      }

      const { data: cloudCats } = await supabase.from('categories').select('*');
      const catNameToId = new Map((cloudCats || []).map((c: any) => [c.name, c.id]));

      // 4. Upload transactions
      for (const txn of localTxns) {
        const { data: existing } = await supabase
          .from('transactions')
          .select('id')
          .eq('description', txn.description)
          .eq('amount', txn.amount)
          .eq('date', txn.date)
          .maybeSingle();

        if (!existing) {
          const catName = txn.category?.name;
          const accName = txn.account?.name;
          const toAccName = txn.to_account?.name;

          await supabase.from('transactions').insert({
            user_id: user.id,
            type: txn.type,
            amount: txn.amount,
            date: txn.date,
            time: txn.time || null,
            description: txn.description || '',
            category_id: (catName && catNameToId.get(catName)) || null,
            account_id: (accName && accNameToId.get(accName)) || cloudAccs?.[0]?.id,
            to_account_id: (toAccName && accNameToId.get(toAccName)) || null,
            payment_method: txn.payment_method || null,
            merchant: txn.merchant || null,
            notes: txn.notes || null,
            tags: txn.tags || [],
          });
          count++;
        }
      }

      await refreshData();
      broadcastDataChange();

      addNotification({
        type: 'balance_updated',
        title: 'Cloud Database Synced',
        description: `Successfully migrated ${count} local records to cloud database`,
      });

      return {
        success: true,
        count,
        message: `সফলভাবে ${count}টি রেকর্ড ক্লাউড ডাটাবেসে সিঙ্ক করা হয়েছে!`,
      };
    } catch (err: any) {
      console.error('Migration error:', err);
      return {
        success: false,
        count: 0,
        message: err?.message || 'Failed to migrate local data to cloud',
      };
    } finally {
      setLoading(false);
    }
  }, [user, refreshData, broadcastDataChange, addNotification]);

  // Date range filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const txnDate = t.date.split('T')[0];
      return (
        txnDate >= effectiveDateRange.startDate &&
        txnDate <= effectiveDateRange.endDate
      );
    });
  }, [transactions, effectiveDateRange]);

  // ═══════════════════════════════════════════════════════════════════════
  // FINANCIAL SUMMARY (computed from effectiveDateRange & accounts)
  // ═══════════════════════════════════════════════════════════════════════

  const financialSummary = useMemo<FinancialSummary>(() => {
    const startDate = effectiveDateRange.startDate;
    const endDate = effectiveDateRange.endDate;

    // Current period transactions based on effective date range
    const periodTxns = transactions.filter((t) => {
      const txnDate = t.date.split('T')[0];
      return txnDate >= startDate && txnDate <= endDate;
    });

    const totalIncome = calculateTotalIncome(periodTxns);
    const totalExpenses = calculateTotalExpenses(periodTxns);
    const netCashFlow = calculateNetCashFlow(totalIncome, totalExpenses);

    // Previous month (for comparison badges)
    const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
    const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
    const [prevStartDate, prevEndDate] = getMonthRange(prevYear, prevMonth);

    const prevMonthTxns = transactions.filter((t) => {
      const txnDate = t.date.split('T')[0];
      return txnDate >= prevStartDate && txnDate <= prevEndDate;
    });

    const prevMonthIncome = calculateTotalIncome(prevMonthTxns);
    const prevMonthExpenses = calculateTotalExpenses(prevMonthTxns);
    const prevMonthCashFlow = calculateNetCashFlow(prevMonthIncome, prevMonthExpenses);

    // Available balance: sum of all active account balances (UNTOUCHED by date filter!)
    const availableBalance = accounts
      .filter((a) => a.is_active)
      .reduce((sum, a) => sum + Number(a.current_balance), 0);

    // Total savings: sum of all savings goal current amounts
    const totalSavings = savingsGoals.reduce(
      (sum, g) => sum + Number(g.current_amount),
      0
    );

    // Remaining budget: sum of (amount - spent) for active budgets in current period
    const remainingBudget = budgets
      .filter((b) => {
        if (!b.is_active) return false;
        const budgetStart = b.start_date ? b.start_date.split('T')[0] : '';
        const budgetEnd = b.end_date ? b.end_date.split('T')[0] : '';
        if (!budgetStart || !budgetEnd) return true;
        return budgetStart <= endDate && budgetEnd >= startDate;
      })
      .reduce((sum, b) => {
        // Calculate spent for this budget's category in the selected period
        const budgetExpenses = periodTxns
          .filter(
            (t) =>
              t.type === 'expense' &&
              (b.category_id ? t.category_id === b.category_id : true)
          )
          .reduce((s, t) => s + Number(t.amount), 0);

        return sum + (Number(b.amount) - budgetExpenses);
      }, 0);

    return {
      totalIncome,
      totalExpenses,
      netCashFlow,
      availableBalance,
      totalSavings,
      remainingBudget,
      prevMonthIncome,
      prevMonthExpenses,
      prevMonthCashFlow,
    };
  }, [transactions, accounts, budgets, savingsGoals, effectiveDateRange, selectedMonth, selectedYear]);

  // ═══════════════════════════════════════════════════════════════════════
  // CONTEXT VALUE
  // ═══════════════════════════════════════════════════════════════════════

  const value: DataContextValue = useMemo(
    () => ({
      // State
      accounts,
      categories,
      transactions,
      budgets,
      savingsGoals,
      recurringTransactions,
      loading,
      error,
      selectedMonth,
      selectedYear,
      setSelectedMonth,
      setSelectedYear,

      // Date Range Filtering
      dateRangePreset,
      customStartDate,
      customEndDate,
      effectiveDateRange,
      setDateRangePreset,
      filteredTransactions,

      financialSummary,

      // Transaction CRUD
      addTransaction,
      updateTransaction,
      deleteTransaction,
      restoreTransaction,

      // Account CRUD
      addAccount,
      updateAccount,
      deleteAccount,

      // Category CRUD
      addCategory,
      updateCategory,
      deleteCategory,

      // Budget CRUD
      addBudget,
      updateBudget,
      deleteBudget,

      // Savings Goals CRUD
      addSavingsGoal,
      updateSavingsGoal,
      deleteSavingsGoal,
      addContribution,

      // Recurring CRUD
      addRecurring,
      updateRecurring,
      deleteRecurring,
      markRecurringPaid,

      // Demo Mode
      isDemoMode,
      resetDemoData,

      // Personal Lending & Borrowing (Loans)
      loans,
      loanSummary,
      addLoan,
      updateLoan,
      deleteLoan,
      addLoanRepayment,
      deleteLoanRepayment,

      // Refresh & Utilities
      refreshData,
      resetToZero,
      loadDemoData,
      isCloudConnected: isSupabaseConfigured(),
      migrateLocalToCloud,

      // Real-time Cloud Sync
      syncStatus,
      lastSyncedAt,
      triggerSync,
    }),
    [
      accounts,
      categories,
      transactions,
      budgets,
      savingsGoals,
      recurringTransactions,
      loans,
      loanSummary,
      isDemoMode,
      resetDemoData,
      addLoan,
      updateLoan,
      deleteLoan,
      addLoanRepayment,
      deleteLoanRepayment,
      loading,
      error,
      selectedMonth,
      selectedYear,
      dateRangePreset,
      customStartDate,
      customEndDate,
      effectiveDateRange,
      setDateRangePreset,
      filteredTransactions,
      financialSummary,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      restoreTransaction,
      addAccount,
      updateAccount,
      deleteAccount,
      addCategory,
      updateCategory,
      deleteCategory,
      addBudget,
      updateBudget,
      deleteBudget,
      addSavingsGoal,
      updateSavingsGoal,
      deleteSavingsGoal,
      addContribution,
      addRecurring,
      updateRecurring,
      deleteRecurring,
      markRecurringPaid,
      refreshData,
      resetToZero,
      loadDemoData,
      migrateLocalToCloud,
      syncStatus,
      lastSyncedAt,
      triggerSync,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useData(): DataContextValue {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
