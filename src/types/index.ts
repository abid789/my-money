// ─── Transaction Types ──────────────────────────────────────────────────────

export type TransactionType = 'income' | 'expense' | 'transfer' | 'refund';

// ─── Profile ────────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  default_currency: string;
  timezone: string;
  date_format: string;
  first_day_of_week: number;
  theme: 'light' | 'dark' | 'system';
  created_at: string;
  updated_at: string;
}

// ─── Account ────────────────────────────────────────────────────────────────

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: string;
  opening_balance: number;
  current_balance: number;
  currency: string;
  icon: string;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Category ───────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
  parent_id: string | null;
  sort_order: number;
  is_default: boolean;
  created_at: string;
}

// ─── Transaction ────────────────────────────────────────────────────────────

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  date: string;
  time: string | null;
  description: string;
  category_id: string | null;
  category?: Category;
  subcategory: string | null;
  account_id: string;
  account?: Account;
  to_account_id: string | null;
  to_account?: Account;
  payment_method: string | null;
  merchant: string | null;
  notes: string | null;
  tags: string[];
  is_recurring: boolean;
  recurring_id: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Budget ─────────────────────────────────────────────────────────────────

export interface Budget {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  spent: number;
  category_id: string | null;
  category?: Category;
  period: 'weekly' | 'monthly' | 'yearly' | 'custom';
  start_date: string;
  end_date: string;
  alert_threshold_50: boolean;
  alert_threshold_75: boolean;
  alert_threshold_90: boolean;
  alert_threshold_100: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Savings Goal ───────────────────────────────────────────────────────────

export interface SavingsGoal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  monthly_contribution: number | null;
  icon: string;
  color: string;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Savings Contribution ───────────────────────────────────────────────────

export interface SavingsContribution {
  id: string;
  goal_id: string;
  user_id: string;
  amount: number;
  type: 'contribution' | 'withdrawal';
  note: string | null;
  date: string;
  created_at: string;
}

// ─── Recurring Transaction ──────────────────────────────────────────────────

export interface RecurringTransaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  description: string;
  category_id: string | null;
  category?: Category;
  account_id: string;
  account?: Account;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  next_due_date: string;
  last_processed_date: string | null;
  is_active: boolean;
  auto_create: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Filters ────────────────────────────────────────────────────────────────

export interface TransactionFilters {
  search: string;
  type: TransactionType | 'all';
  category_id: string;
  account_id: string;
  payment_method: string;
  date_from: string;
  date_to: string;
  amount_min: string;
  amount_max: string;
  sort_by: 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc';
}

// ─── Financial Summary ─────────────────────────────────────────────────────

export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  availableBalance: number;
  totalSavings: number;
  remainingBudget: number;
  prevMonthIncome: number;
  prevMonthExpenses: number;
  prevMonthCashFlow: number;
}

// ─── Insights ───────────────────────────────────────────────────────────────

export interface Insight {
  id: string;
  type: 'info' | 'warning' | 'success' | 'tip';
  title: string;
  description: string;
  value?: string;
  icon: string;
}

// ─── Chart Data ─────────────────────────────────────────────────────────────

export interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
  cashFlow: number;
  savings: number;
}

export interface CategorySpending {
  category: string;
  amount: number;
  percentage: number;
  color: string;
  icon: string;
}

// ─── Notification History ───────────────────────────────────────────────────

export type NotificationType =
  | 'income_added'
  | 'income_updated'
  | 'income_deleted'
  | 'expense_added'
  | 'expense_updated'
  | 'expense_deleted'
  | 'transfer_added'
  | 'balance_updated'
  | 'profile_updated'
  | 'budget_updated'
  | 'category_updated';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  amount?: number;
  category?: string;
  account?: string;
  timestamp: string;
  formattedTime: string;
  read: boolean;
}

