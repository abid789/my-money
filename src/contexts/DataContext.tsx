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
import {
  INITIAL_ACCOUNTS,
  INITIAL_CATEGORIES,
  INITIAL_TRANSACTIONS,
  INITIAL_BUDGETS,
  INITIAL_SAVINGS_GOALS,
  INITIAL_RECURRING,
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

// ─── Types ──────────────────────────────────────────────────────────────────

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

  // Refresh
  refreshData: () => Promise<void>;
}

// ─── Context ────────────────────────────────────────────────────────────────

const DataContext = createContext<DataContextValue | undefined>(undefined);

// ─── Provider ───────────────────────────────────────────────────────────────

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  // Data state
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const refreshData = useCallback(async () => {
    if (!user) return;

    if (!isSupabaseConfigured()) {
      setError(null);
      const accs = getLocal<Account[]>('accounts', INITIAL_ACCOUNTS);
      const cats = getLocal<Category[]>('categories', INITIAL_CATEGORIES);
      const txns = getLocal<Transaction[]>('transactions', INITIAL_TRANSACTIONS);
      const bdgs = getLocal<Budget[]>('budgets', INITIAL_BUDGETS);
      const sgs = getLocal<SavingsGoal[]>('savings', INITIAL_SAVINGS_GOALS);
      const recs = getLocal<RecurringTransaction[]>('recurring', INITIAL_RECURRING);

      const catMap = new Map(cats.map((c) => [c.id, c]));
      const accMap = new Map(accs.map((a) => [a.id, a]));

      const hydratedTxns = txns.map((t) => ({
        ...t,
        category: t.category_id ? catMap.get(t.category_id) : undefined,
        account: accMap.get(t.account_id),
        to_account: t.to_account_id ? accMap.get(t.to_account_id) : undefined,
      }));

      setAccounts(accs);
      setCategories(cats);
      setTransactions(hydratedTxns);
      setBudgets(bdgs.map((b) => ({ ...b, category: b.category_id ? catMap.get(b.category_id) : undefined })));
      setSavingsGoals(sgs);
      setRecurringTransactions(recs.map((r) => ({
        ...r,
        category: r.category_id ? catMap.get(r.category_id) : undefined,
        account: accMap.get(r.account_id),
      })));
      return;
    }

    try {
      setError(null);
      await Promise.all([
        fetchAccounts(),
        fetchCategories(),
        fetchTransactions(),
        fetchBudgets(),
        fetchSavingsGoals(),
        fetchRecurringTransactions(),
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(message);
      console.error('Error fetching data:', err);
    }
  }, [
    user,
    fetchAccounts,
    fetchCategories,
    fetchTransactions,
    fetchBudgets,
    fetchSavingsGoals,
    fetchRecurringTransactions,
  ]);

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

  // ═══════════════════════════════════════════════════════════════════════
  // ACCOUNT BALANCE RECALCULATION
  // ═══════════════════════════════════════════════════════════════════════

  const recalculateAccountBalance = useCallback(
    async (accountId: string) => {
      if (!isSupabaseConfigured()) {
        const txns = getLocal<Transaction[]>('transactions', INITIAL_TRANSACTIONS);
        const accs = getLocal<Account[]>('accounts', INITIAL_ACCOUNTS);
        const account = accs.find((a) => a.id === accountId);
        if (!account) return;

        let balance = Number(account.opening_balance);
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
        return;
      }

      // Fetch all transactions for this account
      const { data: txns, error: txnError } = await supabase
        .from('transactions')
        .select('*')
        .or(`account_id.eq.${accountId},to_account_id.eq.${accountId}`);

      if (txnError) {
        console.error('Error fetching transactions for balance:', txnError);
        return;
      }

      const account = accounts.find((a) => a.id === accountId);
      if (!account) return;

      let balance = Number(account.opening_balance);

      for (const txn of txns || []) {
        const amount = Number(txn.amount);

        if (txn.account_id === accountId) {
          if (txn.type === 'income' || txn.type === 'refund') {
            balance += amount;
          } else if (txn.type === 'expense') {
            balance -= amount;
          } else if (txn.type === 'transfer') {
            balance -= amount;
          }
        }

        if (txn.to_account_id === accountId && txn.type === 'transfer') {
          balance += amount;
        }
      }

      // Update account balance in DB
      await supabase
        .from('accounts')
        .update({ current_balance: balance })
        .eq('id', accountId);
    },
    [accounts]
  );

  // ═══════════════════════════════════════════════════════════════════════
  // TRANSACTION CRUD
  // ═══════════════════════════════════════════════════════════════════════

  const addTransaction = useCallback(
    async (txn: Partial<Transaction>) => {
      if (!user) throw new Error('Not authenticated');

      if (!isSupabaseConfigured()) {
        const txns = getLocal<Transaction[]>('transactions', INITIAL_TRANSACTIONS);
        const newTxn: Transaction = {
          id: `txn-${Date.now()}`,
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
        toast.success('Transaction added');
        return;
      }

      const { error: err } = await supabase.from('transactions').insert({
        user_id: user.id,
        type: txn.type,
        amount: txn.amount,
        date: txn.date,
        time: txn.time || null,
        description: txn.description || '',
        category_id: txn.category_id || null,
        subcategory: txn.subcategory || null,
        account_id: txn.account_id,
        to_account_id: txn.to_account_id || null,
        payment_method: txn.payment_method || null,
        merchant: txn.merchant || null,
        notes: txn.notes || null,
        tags: txn.tags || [],
        is_recurring: txn.is_recurring || false,
        recurring_id: txn.recurring_id || null,
      });

      if (err) throw err;

      // Recalculate balances
      if (txn.account_id) await recalculateAccountBalance(txn.account_id);
      if (txn.to_account_id) await recalculateAccountBalance(txn.to_account_id);

      await refreshData();
      toast.success('Transaction added');
    },
    [user, recalculateAccountBalance, refreshData]
  );

  const updateTransaction = useCallback(
    async (id: string, txn: Partial<Transaction>) => {
      if (!user) throw new Error('Not authenticated');

      if (!isSupabaseConfigured()) {
        const txns = getLocal<Transaction[]>('transactions', INITIAL_TRANSACTIONS);
        const idx = txns.findIndex((t) => t.id === id);
        if (idx !== -1) {
          const old = txns[idx];
          txns[idx] = { ...old, ...txn, updated_at: new Date().toISOString() };
          setLocal('transactions', txns);
          if (old.account_id) await recalculateAccountBalance(old.account_id);
          if (old.to_account_id) await recalculateAccountBalance(old.to_account_id);
          if (txn.account_id) await recalculateAccountBalance(txn.account_id);
          if (txn.to_account_id) await recalculateAccountBalance(txn.to_account_id);
        }
        await refreshData();
        toast.success('Transaction updated');
        return;
      }

      // Get old transaction to know which accounts need rebalancing
      const oldTxn = transactions.find((t) => t.id === id);

      const { error: err } = await supabase
        .from('transactions')
        .update({
          type: txn.type,
          amount: txn.amount,
          date: txn.date,
          time: txn.time,
          description: txn.description,
          category_id: txn.category_id,
          subcategory: txn.subcategory,
          account_id: txn.account_id,
          to_account_id: txn.to_account_id,
          payment_method: txn.payment_method,
          merchant: txn.merchant,
          notes: txn.notes,
          tags: txn.tags,
          is_recurring: txn.is_recurring,
          recurring_id: txn.recurring_id,
        })
        .eq('id', id);

      if (err) throw err;

      // Recalculate balances for affected accounts
      const accountIds = new Set<string>();
      if (oldTxn?.account_id) accountIds.add(oldTxn.account_id);
      if (oldTxn?.to_account_id) accountIds.add(oldTxn.to_account_id);
      if (txn.account_id) accountIds.add(txn.account_id);
      if (txn.to_account_id) accountIds.add(txn.to_account_id);

      for (const accId of accountIds) {
        await recalculateAccountBalance(accId);
      }

      await refreshData();
      toast.success('Transaction updated');
    },
    [user, transactions, recalculateAccountBalance, refreshData]
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      if (!user) throw new Error('Not authenticated');

      if (!isSupabaseConfigured()) {
        const txns = getLocal<Transaction[]>('transactions', INITIAL_TRANSACTIONS);
        const oldTxn = txns.find((t) => t.id === id);
        const filtered = txns.filter((t) => t.id !== id);
        setLocal('transactions', filtered);
        if (oldTxn?.account_id) await recalculateAccountBalance(oldTxn.account_id);
        if (oldTxn?.to_account_id) await recalculateAccountBalance(oldTxn.to_account_id);
        await refreshData();
        toast.success('Transaction deleted');
        return;
      }

      const oldTxn = transactions.find((t) => t.id === id);

      const { error: err } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (err) throw err;

      // Recalculate balances
      if (oldTxn?.account_id) await recalculateAccountBalance(oldTxn.account_id);
      if (oldTxn?.to_account_id) await recalculateAccountBalance(oldTxn.to_account_id);

      await refreshData();
      toast.success('Transaction deleted');
    },
    [user, transactions, recalculateAccountBalance, refreshData]
  );

  // ═══════════════════════════════════════════════════════════════════════
  // ACCOUNT CRUD
  // ═══════════════════════════════════════════════════════════════════════

  const addAccount = useCallback(
    async (account: Partial<Account>) => {
      if (!user) throw new Error('Not authenticated');

      if (!isSupabaseConfigured()) {
        const accs = getLocal<Account[]>('accounts', INITIAL_ACCOUNTS);
        const newAcc: Account = {
          id: `acc-${Date.now()}`,
          user_id: user.id,
          name: account.name || 'Account',
          type: account.type || 'cash',
          opening_balance: account.opening_balance || 0,
          current_balance: account.opening_balance || 0,
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
        toast.success('Account added');
        return;
      }

      const { error: err } = await supabase.from('accounts').insert({
        user_id: user.id,
        name: account.name,
        type: account.type || 'cash',
        opening_balance: account.opening_balance || 0,
        current_balance: account.opening_balance || 0,
        currency: account.currency || 'BDT',
        icon: account.icon || 'Wallet',
        color: account.color || '#14b8a6',
        is_active: account.is_active !== undefined ? account.is_active : true,
      });

      if (err) throw err;
      await refreshData();
      toast.success('Account added');
    },
    [user, refreshData]
  );

  const updateAccount = useCallback(
    async (id: string, account: Partial<Account>) => {
      if (!user) throw new Error('Not authenticated');

      if (!isSupabaseConfigured()) {
        const accs = getLocal<Account[]>('accounts', INITIAL_ACCOUNTS);
        const idx = accs.findIndex((a) => a.id === id);
        if (idx !== -1) {
          accs[idx] = { ...accs[idx], ...account, updated_at: new Date().toISOString() };
          setLocal('accounts', accs);
        }
        await refreshData();
        toast.success('Account updated');
        return;
      }

      const { error: err } = await supabase
        .from('accounts')
        .update(account)
        .eq('id', id);

      if (err) throw err;
      await refreshData();
      toast.success('Account updated');
    },
    [user, refreshData]
  );

  const deleteAccount = useCallback(
    async (id: string) => {
      if (!user) throw new Error('Not authenticated');

      if (!isSupabaseConfigured()) {
        const accs = getLocal<Account[]>('accounts', INITIAL_ACCOUNTS);
        setLocal('accounts', accs.filter((a) => a.id !== id));
        await refreshData();
        toast.success('Account deleted');
        return;
      }

      const { error: err } = await supabase
        .from('accounts')
        .delete()
        .eq('id', id);

      if (err) throw err;
      await refreshData();
      toast.success('Account deleted');
    },
    [user, refreshData]
  );

  // ═══════════════════════════════════════════════════════════════════════
  // CATEGORY CRUD
  // ═══════════════════════════════════════════════════════════════════════

  const addCategory = useCallback(
    async (category: Partial<Category>) => {
      if (!user) throw new Error('Not authenticated');

      if (!isSupabaseConfigured()) {
        const cats = getLocal<Category[]>('categories', INITIAL_CATEGORIES);
        const newCat: Category = {
          id: `cat-${Date.now()}`,
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
        toast.success('Category added');
        return;
      }

      const { error: err } = await supabase.from('categories').insert({
        user_id: user.id,
        name: category.name,
        type: category.type || 'expense',
        icon: category.icon || 'Tag',
        color: category.color || '#6B7280',
        parent_id: category.parent_id || null,
        sort_order: category.sort_order || 0,
        is_default: false,
      });

      if (err) throw err;
      await refreshData();
      toast.success('Category added');
    },
    [user, refreshData]
  );

  const updateCategory = useCallback(
    async (id: string, category: Partial<Category>) => {
      if (!user) throw new Error('Not authenticated');

      if (!isSupabaseConfigured()) {
        const cats = getLocal<Category[]>('categories', INITIAL_CATEGORIES);
        const idx = cats.findIndex((c) => c.id === id);
        if (idx !== -1) {
          cats[idx] = { ...cats[idx], ...category };
          setLocal('categories', cats);
        }
        await refreshData();
        toast.success('Category updated');
        return;
      }

      const { error: err } = await supabase
        .from('categories')
        .update(category)
        .eq('id', id);

      if (err) throw err;
      await refreshData();
      toast.success('Category updated');
    },
    [user, refreshData]
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      if (!user) throw new Error('Not authenticated');

      if (!isSupabaseConfigured()) {
        const cats = getLocal<Category[]>('categories', INITIAL_CATEGORIES);
        setLocal('categories', cats.filter((c) => c.id !== id));
        await refreshData();
        toast.success('Category deleted');
        return;
      }

      const { error: err } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (err) throw err;
      await refreshData();
      toast.success('Category deleted');
    },
    [user, refreshData]
  );

  // ═══════════════════════════════════════════════════════════════════════
  // BUDGET CRUD
  // ═══════════════════════════════════════════════════════════════════════

  const addBudget = useCallback(
    async (budget: Partial<Budget>) => {
      if (!user) throw new Error('Not authenticated');

      if (!isSupabaseConfigured()) {
        const bdgs = getLocal<Budget[]>('budgets', INITIAL_BUDGETS);
        const newBdg: Budget = {
          id: `bdg-${Date.now()}`,
          user_id: user.id,
          name: budget.name || 'Budget',
          amount: budget.amount || 0,
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
        toast.success('Budget created');
        return;
      }

      const { error: err } = await supabase.from('budgets').insert({
        user_id: user.id,
        name: budget.name,
        amount: budget.amount,
        category_id: budget.category_id || null,
        period: budget.period || 'monthly',
        start_date: budget.start_date,
        end_date: budget.end_date,
        alert_threshold_50: budget.alert_threshold_50 ?? false,
        alert_threshold_75: budget.alert_threshold_75 ?? true,
        alert_threshold_90: budget.alert_threshold_90 ?? true,
        alert_threshold_100: budget.alert_threshold_100 ?? true,
        is_active: budget.is_active !== undefined ? budget.is_active : true,
      });

      if (err) throw err;
      await refreshData();
      toast.success('Budget created');
    },
    [user, refreshData]
  );

  const updateBudget = useCallback(
    async (id: string, budget: Partial<Budget>) => {
      if (!user) throw new Error('Not authenticated');

      if (!isSupabaseConfigured()) {
        const bdgs = getLocal<Budget[]>('budgets', INITIAL_BUDGETS);
        const idx = bdgs.findIndex((b) => b.id === id);
        if (idx !== -1) {
          bdgs[idx] = { ...bdgs[idx], ...budget, updated_at: new Date().toISOString() };
          setLocal('budgets', bdgs);
        }
        await refreshData();
        toast.success('Budget updated');
        return;
      }

      const { error: err } = await supabase
        .from('budgets')
        .update(budget)
        .eq('id', id);

      if (err) throw err;
      await refreshData();
      toast.success('Budget updated');
    },
    [user, refreshData]
  );

  const deleteBudget = useCallback(
    async (id: string) => {
      if (!user) throw new Error('Not authenticated');

      if (!isSupabaseConfigured()) {
        const bdgs = getLocal<Budget[]>('budgets', INITIAL_BUDGETS);
        setLocal('budgets', bdgs.filter((b) => b.id !== id));
        await refreshData();
        toast.success('Budget deleted');
        return;
      }

      const { error: err } = await supabase
        .from('budgets')
        .delete()
        .eq('id', id);

      if (err) throw err;
      await refreshData();
      toast.success('Budget deleted');
    },
    [user, refreshData]
  );

  // ═══════════════════════════════════════════════════════════════════════
  // SAVINGS GOALS CRUD
  // ═══════════════════════════════════════════════════════════════════════

  const addSavingsGoal = useCallback(
    async (goal: Partial<SavingsGoal>) => {
      if (!user) throw new Error('Not authenticated');

      if (!isSupabaseConfigured()) {
        const sgs = getLocal<SavingsGoal[]>('savings', INITIAL_SAVINGS_GOALS);
        const newGoal: SavingsGoal = {
          id: `sg-${Date.now()}`,
          user_id: user.id,
          name: goal.name || 'Savings Goal',
          target_amount: goal.target_amount || 0,
          current_amount: goal.current_amount || 0,
          target_date: goal.target_date || null,
          monthly_contribution: goal.monthly_contribution || null,
          icon: goal.icon || 'PiggyBank',
          color: goal.color || '#14b8a6',
          is_completed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        sgs.push(newGoal);
        setLocal('savings', sgs);
        await refreshData();
        toast.success('Savings goal created');
        return;
      }

      const { error: err } = await supabase.from('savings_goals').insert({
        user_id: user.id,
        name: goal.name,
        target_amount: goal.target_amount,
        current_amount: goal.current_amount || 0,
        target_date: goal.target_date || null,
        monthly_contribution: goal.monthly_contribution || null,
        icon: goal.icon || 'PiggyBank',
        color: goal.color || '#14b8a6',
        is_completed: false,
      });

      if (err) throw err;
      await refreshData();
      toast.success('Savings goal created');
    },
    [user, refreshData]
  );

  const updateSavingsGoal = useCallback(
    async (id: string, goal: Partial<SavingsGoal>) => {
      if (!user) throw new Error('Not authenticated');

      if (!isSupabaseConfigured()) {
        const sgs = getLocal<SavingsGoal[]>('savings', INITIAL_SAVINGS_GOALS);
        const idx = sgs.findIndex((s) => s.id === id);
        if (idx !== -1) {
          sgs[idx] = { ...sgs[idx], ...goal, updated_at: new Date().toISOString() };
          setLocal('savings', sgs);
        }
        await refreshData();
        toast.success('Savings goal updated');
        return;
      }

      const { error: err } = await supabase
        .from('savings_goals')
        .update(goal)
        .eq('id', id);

      if (err) throw err;
      await refreshData();
      toast.success('Savings goal updated');
    },
    [user, refreshData]
  );

  const deleteSavingsGoal = useCallback(
    async (id: string) => {
      if (!user) throw new Error('Not authenticated');

      if (!isSupabaseConfigured()) {
        const sgs = getLocal<SavingsGoal[]>('savings', INITIAL_SAVINGS_GOALS);
        setLocal('savings', sgs.filter((s) => s.id !== id));
        await refreshData();
        toast.success('Savings goal deleted');
        return;
      }

      const { error: err } = await supabase
        .from('savings_goals')
        .delete()
        .eq('id', id);

      if (err) throw err;
      await refreshData();
      toast.success('Savings goal deleted');
    },
    [user, refreshData]
  );

  const addContribution = useCallback(
    async (contribution: Partial<SavingsContribution>) => {
      if (!user) throw new Error('Not authenticated');

      if (!isSupabaseConfigured()) {
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
        toast.success(
          contribution.type === 'withdrawal' ? 'Withdrawal recorded' : 'Contribution added'
        );
        return;
      }

      // Insert the contribution record
      const { error: err } = await supabase.from('savings_contributions').insert({
        goal_id: contribution.goal_id,
        user_id: user.id,
        amount: contribution.amount,
        type: contribution.type || 'contribution',
        note: contribution.note || null,
        date: contribution.date || format(new Date(), 'yyyy-MM-dd'),
      });

      if (err) throw err;

      // Update the savings goal's current_amount
      const goal = savingsGoals.find((g) => g.id === contribution.goal_id);
      if (goal) {
        const delta =
          contribution.type === 'withdrawal'
            ? -Number(contribution.amount)
            : Number(contribution.amount);
        const newAmount = Math.max(0, Number(goal.current_amount) + delta);
        const isCompleted = newAmount >= Number(goal.target_amount);

        await supabase
          .from('savings_goals')
          .update({
            current_amount: newAmount,
            is_completed: isCompleted,
          })
          .eq('id', contribution.goal_id);
      }

      await refreshData();
      toast.success(
        contribution.type === 'withdrawal' ? 'Withdrawal recorded' : 'Contribution added'
      );
    },
    [user, savingsGoals, refreshData]
  );

  // ═══════════════════════════════════════════════════════════════════════
  // RECURRING TRANSACTIONS CRUD
  // ═══════════════════════════════════════════════════════════════════════

  const addRecurring = useCallback(
    async (recurring: Partial<RecurringTransaction>) => {
      if (!user) throw new Error('Not authenticated');

      if (!isSupabaseConfigured()) {
        const recs = getLocal<RecurringTransaction[]>('recurring', INITIAL_RECURRING);
        const newRec: RecurringTransaction = {
          id: `rec-${Date.now()}`,
          user_id: user.id,
          type: recurring.type || 'expense',
          amount: recurring.amount || 0,
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
        toast.success('Recurring transaction created');
        return;
      }

      const { error: err } = await supabase.from('recurring_transactions').insert({
        user_id: user.id,
        type: recurring.type || 'expense',
        amount: recurring.amount,
        description: recurring.description || '',
        category_id: recurring.category_id || null,
        account_id: recurring.account_id,
        frequency: recurring.frequency || 'monthly',
        next_due_date: recurring.next_due_date,
        is_active: recurring.is_active !== undefined ? recurring.is_active : true,
        auto_create: recurring.auto_create || false,
      });

      if (err) throw err;
      await refreshData();
      toast.success('Recurring transaction created');
    },
    [user, refreshData]
  );

  const updateRecurring = useCallback(
    async (id: string, recurring: Partial<RecurringTransaction>) => {
      if (!user) throw new Error('Not authenticated');

      if (!isSupabaseConfigured()) {
        const recs = getLocal<RecurringTransaction[]>('recurring', INITIAL_RECURRING);
        const idx = recs.findIndex((r) => r.id === id);
        if (idx !== -1) {
          recs[idx] = { ...recs[idx], ...recurring, updated_at: new Date().toISOString() };
          setLocal('recurring', recs);
        }
        await refreshData();
        toast.success('Recurring transaction updated');
        return;
      }

      const { error: err } = await supabase
        .from('recurring_transactions')
        .update(recurring)
        .eq('id', id);

      if (err) throw err;
      await refreshData();
      toast.success('Recurring transaction updated');
    },
    [user, refreshData]
  );

  const deleteRecurring = useCallback(
    async (id: string) => {
      if (!user) throw new Error('Not authenticated');

      if (!isSupabaseConfigured()) {
        const recs = getLocal<RecurringTransaction[]>('recurring', INITIAL_RECURRING);
        setLocal('recurring', recs.filter((r) => r.id !== id));
        await refreshData();
        toast.success('Recurring transaction deleted');
        return;
      }

      const { error: err } = await supabase
        .from('recurring_transactions')
        .delete()
        .eq('id', id);

      if (err) throw err;
      await refreshData();
      toast.success('Recurring transaction deleted');
    },
    [user, refreshData]
  );

  const markRecurringPaid = useCallback(
    async (id: string) => {
      if (!user) throw new Error('Not authenticated');

      const recurring = recurringTransactions.find((r) => r.id === id);
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

      if (!isSupabaseConfigured()) {
        const recs = getLocal<RecurringTransaction[]>('recurring', INITIAL_RECURRING);
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
        toast.success('Recurring transaction marked as paid');
        return;
      }

      // Update recurring transaction with new due date
      await supabase
        .from('recurring_transactions')
        .update({
          next_due_date: format(nextDue, 'yyyy-MM-dd'),
          last_processed_date: format(currentDue, 'yyyy-MM-dd'),
        })
        .eq('id', id);

      await refreshData();
      toast.success('Recurring transaction marked as paid');
    },
    [user, recurringTransactions, addTransaction, refreshData]
  );

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
        const budgetStart = b.start_date.split('T')[0];
        const budgetEnd = b.end_date.split('T')[0];
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

      // Refresh
      refreshData,
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
