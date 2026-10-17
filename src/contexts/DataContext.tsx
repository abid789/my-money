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
  DEMO_SAMPLE_ACCOUNTS,
  DEMO_SAMPLE_TRANSACTIONS,
  DEMO_SAMPLE_BUDGETS,
  DEMO_SAMPLE_SAVINGS_GOALS,
  DEMO_SAMPLE_RECURRING,
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
} from '@/types';
import {
  calculateTotalIncome,
  calculateTotalExpenses,
  calculateNetCashFlow,
} from '@/lib/calculations';
import { getMonthRange } from '@/lib/utils';
import toast from 'react-hot-toast';
import { format, addDays, addWeeks, addMonths, addYears } from 'date-fns';

export type SyncStatus = 'saved' | 'saving' | 'offline' | 'error';

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

  // Data state
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('saved');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  // Period selection
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

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

function getLocal<T>(key: string, initial: T): T {
  try {
    const item = localStorage.getItem(`my-money-${key}`);
    return item ? JSON.parse(item) : initial;
  } catch {
    return initial;
  }
}

function setLocal<T>(key: string, data: T) {
  try {
    localStorage.setItem(`my-money-${key}`, JSON.stringify(data));
  } catch {
    // ignore
  }
}

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
    }) => {
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
          setSyncStatus('error');
        }
      } catch {
        setSyncStatus(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error');
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
    if (!user) return;
    setError(null);

    // Auto-migrate to zero start: clear out old demo dummy transactions & reset to 0
    const ZERO_INITIALIZED_KEY = 'my-money-zero-v3';
    const hasAutoReset = localStorage.getItem(ZERO_INITIALIZED_KEY) === 'true';
    if (!hasAutoReset) {
      setLocal('transactions', []);
      setLocal('accounts', INITIAL_ACCOUNTS);
      setLocal('budgets', []);
      setLocal('savings', []);
      setLocal('recurring', []);
      localStorage.setItem(ZERO_INITIALIZED_KEY, 'true');
    }

    let accs = getLocal<Account[]>('accounts', INITIAL_ACCOUNTS);
    let cats = getLocal<Category[]>('categories', INITIAL_CATEGORIES);
    let txns = getLocal<Transaction[]>('transactions', INITIAL_TRANSACTIONS);
    let bdgs = getLocal<Budget[]>('budgets', INITIAL_BUDGETS);
    let sgs = getLocal<SavingsGoal[]>('savings', INITIAL_SAVINGS_GOALS);
    let recs = getLocal<RecurringTransaction[]>('recurring', INITIAL_RECURRING);

    const hydrateAndSetState = (
      a: Account[],
      c: Category[],
      t: Transaction[],
      b: Budget[],
      s: SavingsGoal[],
      r: RecurringTransaction[]
    ) => {
      const catMap = new Map(c.map((cat) => [cat.id, cat]));
      const accMap = new Map(a.map((acc) => [acc.id, acc]));

      const hydratedTxns = t.map((txn) => ({
        ...txn,
        category: txn.category_id ? catMap.get(txn.category_id) : undefined,
        account: accMap.get(txn.account_id),
        to_account: txn.to_account_id ? accMap.get(txn.to_account_id) : undefined,
      }));

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
    };

    // 1. Instantly display local cache
    hydrateAndSetState(accs, cats, txns, bdgs, sgs, recs);

    // 2. Background check with cloud API
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

          if (cloudTxns.length >= txns.length) {
            accs = cloudAccs.length ? cloudAccs : accs;
            cats = cloudCats.length ? cloudCats : cats;
            txns = cloudTxns;
            bdgs = cloudBdgs.length ? cloudBdgs : bdgs;
            sgs = cloudSgs.length ? cloudSgs : sgs;
            recs = cloudRecs.length ? cloudRecs : recs;

            setLocal('accounts', accs);
            setLocal('categories', cats);
            setLocal('transactions', txns);
            setLocal('budgets', bdgs);
            setLocal('savings', sgs);
            setLocal('recurring', recs);

            hydrateAndSetState(accs, cats, txns, bdgs, sgs, recs);
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
          });
        }
        setSyncStatus('saved');
        setLastSyncedAt(new Date());
      } else {
        setSyncStatus('error');
      }
    } catch {
      setSyncStatus(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error');
    }
  }, [user, syncWithCloud]);

  // Fetch all data when user is authenticated
  useEffect(() => {
    if (user) {
      setLoading(true);
      refreshData().finally(() => setLoading(false));
    } else {
      // Clear all data on logout
      setAccounts([]);
      setCategories([]);
      setTransactions([]);
      setBudgets([]);
      setSavingsGoals([]);
      setRecurringTransactions([]);
      setLoading(false);
    }
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
      account.current_balance = balance;
      setLocal('accounts', accs);
      setAccounts([...accs]);
    },
    []
  );

  // ═══════════════════════════════════════════════════════════════════════
  // TRANSACTION CRUD
  // ═══════════════════════════════════════════════════════════════════════

  const addTransaction = useCallback(
    async (txn: Partial<Transaction>) => {
      if (!user) throw new Error('Not authenticated');

      const txns = getLocal<Transaction[]>('transactions', INITIAL_TRANSACTIONS);
      const newTxn: Transaction = {
        id: `txn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        user_id: user.id,
        type: txn.type || 'expense',
        amount: Number(txn.amount),
        date: txn.date || new Date().toISOString().slice(0, 10),
        time: txn.time || null,
        description: txn.description || '',
        category_id: txn.category_id || null,
        subcategory: txn.subcategory || null,
        account_id: txn.account_id || '',
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
      syncWithCloud();

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
    [user, categories, accounts, recalculateAccountBalance, refreshData, broadcastDataChange, syncWithCloud, addNotification]
  );

  const updateTransaction = useCallback(
    async (id: string, txn: Partial<Transaction>) => {
      if (!user) throw new Error('Not authenticated');

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
      syncWithCloud();

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
    [user, categories, accounts, recalculateAccountBalance, refreshData, broadcastDataChange, syncWithCloud, addNotification]
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      if (!user) throw new Error('Not authenticated');

      const txns = getLocal<Transaction[]>('transactions', INITIAL_TRANSACTIONS);
      const oldTxn = txns.find((t) => t.id === id);
      const filtered = txns.filter((t) => t.id !== id);
      setLocal('transactions', filtered);

      if (oldTxn?.account_id) await recalculateAccountBalance(oldTxn.account_id);
      if (oldTxn?.to_account_id) await recalculateAccountBalance(oldTxn.to_account_id);

      await refreshData();
      broadcastDataChange();
      syncWithCloud();

      if (oldTxn) {
        addNotification({
          type: oldTxn.type === 'income' ? 'income_deleted' : 'expense_deleted',
          title: oldTxn.type === 'income' ? 'Income Deleted' : 'Expense Deleted',
          description: oldTxn.description || 'Transaction deleted',
          amount: Number(oldTxn.amount),
          category: oldTxn.category?.name,
          account: oldTxn.account?.name,
        });
      }

      toast.success('Transaction deleted');
    },
    [user, recalculateAccountBalance, refreshData, broadcastDataChange, syncWithCloud, addNotification]
  );

  // ═══════════════════════════════════════════════════════════════════════
  // ACCOUNT CRUD
  // ═══════════════════════════════════════════════════════════════════════

  const addAccount = useCallback(
    async (account: Partial<Account>) => {
      if (!user) throw new Error('Not authenticated');

      const accs = getLocal<Account[]>('accounts', INITIAL_ACCOUNTS);
      const newAcc: Account = {
        id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        user_id: user.id,
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
      syncWithCloud();

      addNotification({
        type: 'balance_updated',
        title: 'Account / Wallet Added',
        description: newAcc.name,
        amount: newAcc.opening_balance,
        account: newAcc.name,
      });
      toast.success('Account added');
    },
    [user, refreshData, broadcastDataChange, syncWithCloud, addNotification]
  );

  const updateAccount = useCallback(
    async (id: string, account: Partial<Account>) => {
      if (!user) throw new Error('Not authenticated');

      const accs = getLocal<Account[]>('accounts', INITIAL_ACCOUNTS);
      const idx = accs.findIndex((a) => a.id === id);
      if (idx !== -1) {
        accs[idx] = { ...accs[idx], ...account, updated_at: new Date().toISOString() };
        setLocal('accounts', accs);
      }

      await refreshData();
      broadcastDataChange();
      syncWithCloud();

      addNotification({
        type: 'balance_updated',
        title: 'Wallet / Balance Updated',
        description: account.name ? `${account.name} balance updated` : 'Account updated',
        amount: account.current_balance !== undefined ? Number(account.current_balance) : undefined,
        account: account.name,
      });
      toast.success('Account updated');
    },
    [user, refreshData, broadcastDataChange, syncWithCloud, addNotification]
  );

  const deleteAccount = useCallback(
    async (id: string) => {
      if (!user) throw new Error('Not authenticated');

      const accs = getLocal<Account[]>('accounts', INITIAL_ACCOUNTS);
      const old = accs.find((a) => a.id === id);
      setLocal('accounts', accs.filter((a) => a.id !== id));

      await refreshData();
      broadcastDataChange();
      syncWithCloud();

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
    [user, refreshData, broadcastDataChange, syncWithCloud, addNotification]
  );

  // ═══════════════════════════════════════════════════════════════════════
  // CATEGORY CRUD
  // ═══════════════════════════════════════════════════════════════════════

  const addCategory = useCallback(
    async (category: Partial<Category>) => {
      if (!user) throw new Error('Not authenticated');

      const cats = getLocal<Category[]>('categories', INITIAL_CATEGORIES);
      const newCat: Category = {
        id: `cat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        user_id: user.id,
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
      syncWithCloud();

      toast.success('Category added');
    },
    [user, refreshData, broadcastDataChange, syncWithCloud]
  );

  const updateCategory = useCallback(
    async (id: string, category: Partial<Category>) => {
      if (!user) throw new Error('Not authenticated');

      const cats = getLocal<Category[]>('categories', INITIAL_CATEGORIES);
      const idx = cats.findIndex((c) => c.id === id);
      if (idx !== -1) {
        cats[idx] = { ...cats[idx], ...category };
        setLocal('categories', cats);
      }

      await refreshData();
      broadcastDataChange();
      syncWithCloud();

      toast.success('Category updated');
    },
    [user, refreshData, broadcastDataChange, syncWithCloud]
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      if (!user) throw new Error('Not authenticated');

      const cats = getLocal<Category[]>('categories', INITIAL_CATEGORIES);
      setLocal('categories', cats.filter((c) => c.id !== id));

      await refreshData();
      broadcastDataChange();
      syncWithCloud();

      toast.success('Category deleted');
    },
    [user, refreshData, broadcastDataChange, syncWithCloud]
  );

  // ═══════════════════════════════════════════════════════════════════════
  // BUDGET CRUD
  // ═══════════════════════════════════════════════════════════════════════

  const addBudget = useCallback(
    async (budget: Partial<Budget>) => {
      if (!user) throw new Error('Not authenticated');

      const bdgs = getLocal<Budget[]>('budgets', INITIAL_BUDGETS);
      const newBdg: Budget = {
        id: `bdg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        user_id: user.id,
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
      syncWithCloud();

      toast.success('Budget created');
    },
    [user, refreshData, broadcastDataChange, syncWithCloud]
  );

  const updateBudget = useCallback(
    async (id: string, budget: Partial<Budget>) => {
      if (!user) throw new Error('Not authenticated');

      const bdgs = getLocal<Budget[]>('budgets', INITIAL_BUDGETS);
      const idx = bdgs.findIndex((b) => b.id === id);
      if (idx !== -1) {
        bdgs[idx] = { ...bdgs[idx], ...budget, updated_at: new Date().toISOString() };
        setLocal('budgets', bdgs);
      }

      await refreshData();
      broadcastDataChange();
      syncWithCloud();

      toast.success('Budget updated');
    },
    [user, refreshData, broadcastDataChange, syncWithCloud]
  );

  const deleteBudget = useCallback(
    async (id: string) => {
      if (!user) throw new Error('Not authenticated');

      const bdgs = getLocal<Budget[]>('budgets', INITIAL_BUDGETS);
      setLocal('budgets', bdgs.filter((b) => b.id !== id));

      await refreshData();
      broadcastDataChange();
      syncWithCloud();

      toast.success('Budget deleted');
    },
    [user, refreshData, broadcastDataChange, syncWithCloud]
  );

  // ═══════════════════════════════════════════════════════════════════════
  // SAVINGS GOALS CRUD
  // ═══════════════════════════════════════════════════════════════════════

  const addSavingsGoal = useCallback(
    async (goal: Partial<SavingsGoal>) => {
      if (!user) throw new Error('Not authenticated');

      const sgs = getLocal<SavingsGoal[]>('savings', INITIAL_SAVINGS_GOALS);
      const newGoal: SavingsGoal = {
        id: `sg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        user_id: user.id,
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
      syncWithCloud();

      toast.success('Savings goal created');
    },
    [user, refreshData, broadcastDataChange, syncWithCloud]
  );

  const updateSavingsGoal = useCallback(
    async (id: string, goal: Partial<SavingsGoal>) => {
      if (!user) throw new Error('Not authenticated');

      const sgs = getLocal<SavingsGoal[]>('savings', INITIAL_SAVINGS_GOALS);
      const idx = sgs.findIndex((s) => s.id === id);
      if (idx !== -1) {
        sgs[idx] = { ...sgs[idx], ...goal, updated_at: new Date().toISOString() };
        setLocal('savings', sgs);
      }

      await refreshData();
      broadcastDataChange();
      syncWithCloud();

      toast.success('Savings goal updated');
    },
    [user, refreshData, broadcastDataChange, syncWithCloud]
  );

  const deleteSavingsGoal = useCallback(
    async (id: string) => {
      if (!user) throw new Error('Not authenticated');

      const sgs = getLocal<SavingsGoal[]>('savings', INITIAL_SAVINGS_GOALS);
      setLocal('savings', sgs.filter((s) => s.id !== id));

      await refreshData();
      broadcastDataChange();
      syncWithCloud();

      toast.success('Savings goal deleted');
    },
    [user, refreshData, broadcastDataChange, syncWithCloud]
  );

  const addContribution = useCallback(
    async (contribution: Partial<SavingsContribution>) => {
      if (!user) throw new Error('Not authenticated');

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
      syncWithCloud();

      toast.success(
        contribution.type === 'withdrawal' ? 'Withdrawal recorded' : 'Contribution added'
      );
    },
    [user, refreshData, broadcastDataChange, syncWithCloud]
  );

  // ═══════════════════════════════════════════════════════════════════════
  // RECURRING TRANSACTIONS CRUD
  // ═══════════════════════════════════════════════════════════════════════

  const addRecurring = useCallback(
    async (recurring: Partial<RecurringTransaction>) => {
      if (!user) throw new Error('Not authenticated');

      const recs = getLocal<RecurringTransaction[]>('recurring', INITIAL_RECURRING);
      const newRec: RecurringTransaction = {
        id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        user_id: user.id,
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
      syncWithCloud();

      toast.success('Recurring transaction created');
    },
    [user, refreshData, broadcastDataChange, syncWithCloud]
  );

  const updateRecurring = useCallback(
    async (id: string, recurring: Partial<RecurringTransaction>) => {
      if (!user) throw new Error('Not authenticated');

      const recs = getLocal<RecurringTransaction[]>('recurring', INITIAL_RECURRING);
      const idx = recs.findIndex((r) => r.id === id);
      if (idx !== -1) {
        recs[idx] = { ...recs[idx], ...recurring, updated_at: new Date().toISOString() };
        setLocal('recurring', recs);
      }

      await refreshData();
      broadcastDataChange();
      syncWithCloud();

      toast.success('Recurring transaction updated');
    },
    [user, refreshData, broadcastDataChange, syncWithCloud]
  );

  const deleteRecurring = useCallback(
    async (id: string) => {
      if (!user) throw new Error('Not authenticated');

      const recs = getLocal<RecurringTransaction[]>('recurring', INITIAL_RECURRING);
      setLocal('recurring', recs.filter((r) => r.id !== id));

      await refreshData();
      broadcastDataChange();
      syncWithCloud();

      toast.success('Recurring transaction deleted');
    },
    [user, refreshData, broadcastDataChange, syncWithCloud]
  );

  const markRecurringPaid = useCallback(
    async (id: string) => {
      if (!user) throw new Error('Not authenticated');

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
      syncWithCloud();

      toast.success('Recurring transaction marked as paid');
    },
    [user, addTransaction, refreshData, broadcastDataChange, syncWithCloud]
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
    localStorage.setItem(ZERO_INITIALIZED_KEY, 'true');

    setTransactions([]);
    setAccounts(INITIAL_ACCOUNTS);
    setBudgets([]);
    setSavingsGoals([]);
    setRecurringTransactions([]);

    broadcastDataChange();
    await syncWithCloud({
      accounts: INITIAL_ACCOUNTS,
      categories: getLocal<Category[]>('categories', INITIAL_CATEGORIES),
      transactions: [],
      budgets: [],
      savingsGoals: [],
      recurringTransactions: [],
    });

    toast.success('সব হিসেব রিসেট সম্পন্ন! একদম শূন্য (৳০) থেকে শুরু করতে পারেন।');
  }, [broadcastDataChange, syncWithCloud]);

  const loadDemoData = useCallback(async () => {
    const ZERO_INITIALIZED_KEY = 'my-money-zero-v3';
    setLocal('transactions', DEMO_SAMPLE_TRANSACTIONS);
    setLocal('accounts', DEMO_SAMPLE_ACCOUNTS);
    setLocal('budgets', DEMO_SAMPLE_BUDGETS);
    setLocal('savings', DEMO_SAMPLE_SAVINGS_GOALS);
    setLocal('recurring', DEMO_SAMPLE_RECURRING);
    localStorage.setItem(ZERO_INITIALIZED_KEY, 'demo');

    await refreshData();
    broadcastDataChange();
    await syncWithCloud({
      accounts: DEMO_SAMPLE_ACCOUNTS,
      categories: getLocal<Category[]>('categories', INITIAL_CATEGORIES),
      transactions: DEMO_SAMPLE_TRANSACTIONS,
      budgets: DEMO_SAMPLE_BUDGETS,
      savingsGoals: DEMO_SAMPLE_SAVINGS_GOALS,
      recurringTransactions: DEMO_SAMPLE_RECURRING,
    });
    toast.success('নমুনা ডেমো ডেটা লোড করা হয়েছে');
  }, [refreshData, broadcastDataChange, syncWithCloud]);

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

  // ═══════════════════════════════════════════════════════════════════════
  // FINANCIAL SUMMARY (computed from selected month/year)
  // ═══════════════════════════════════════════════════════════════════════

  const financialSummary = useMemo<FinancialSummary>(() => {
    const [startDate, endDate] = getMonthRange(selectedYear, selectedMonth);

    // Current month transactions
    const monthTxns = transactions.filter((t) => {
      const txnDate = t.date.split('T')[0];
      return txnDate >= startDate && txnDate <= endDate;
    });

    const totalIncome = calculateTotalIncome(monthTxns);
    const totalExpenses = calculateTotalExpenses(monthTxns);
    const netCashFlow = calculateNetCashFlow(totalIncome, totalExpenses);

    // Previous month
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

    // Available balance: sum of all active account balances
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
        const budgetExpenses = monthTxns
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
  }, [transactions, accounts, budgets, savingsGoals, selectedMonth, selectedYear]);

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
      financialSummary,

      // Transaction CRUD
      addTransaction,
      updateTransaction,
      deleteTransaction,

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
      loading,
      error,
      selectedMonth,
      selectedYear,
      financialSummary,
      addTransaction,
      updateTransaction,
      deleteTransaction,
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
