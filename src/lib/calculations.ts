import type { Transaction, Category, Account, Budget, CategorySpending } from '@/types';

// ─── Income / Expense Totals ────────────────────────────────────────────────

/**
 * Sum all income-type transactions.
 */
export function calculateTotalIncome(transactions: Transaction[]): number {
  return transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);
}

/**
 * Sum all expense-type transactions (excludes transfers).
 */
export function calculateTotalExpenses(transactions: Transaction[]): number {
  return transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);
}

// ─── Net Cash Flow ──────────────────────────────────────────────────────────

/**
 * Calculate net cash flow: income minus expenses.
 */
export function calculateNetCashFlow(income: number, expenses: number): number {
  return income - expenses;
}

// ─── Account Balance ────────────────────────────────────────────────────────

/**
 * Calculate account balance based on opening balance and transaction history.
 * Inflows: income into this account, transfers TO this account, refunds into this account.
 * Outflows: expenses from this account, transfers FROM this account.
 */
export function calculateAccountBalance(
  account: Account,
  transactions: Transaction[]
): number {
  let balance = Number(account.opening_balance);

  for (const txn of transactions) {
    const amount = Number(txn.amount);

    if (txn.account_id === account.id) {
      // This is the source account
      if (txn.type === 'income' || txn.type === 'refund') {
        balance += amount;
      } else if (txn.type === 'expense') {
        balance -= amount;
      } else if (txn.type === 'transfer') {
        balance -= amount;
      }
    }

    if (txn.to_account_id === account.id && txn.type === 'transfer') {
      // This account receives the transfer
      balance += amount;
    }
  }

  return balance;
}

// ─── Budget Remaining ───────────────────────────────────────────────────────

/**
 * Calculate remaining budget: budgeted amount minus spent.
 */
export function calculateRemainingBudget(budget: Budget, expenses: number): number {
  return Number(budget.amount) - expenses;
}

// ─── Savings Rate ───────────────────────────────────────────────────────────

/**
 * Savings rate as a percentage: ((income - expenses) / income) × 100.
 * Returns 0 when income is 0.
 */
export function calculateSavingsRate(income: number, expenses: number): number {
  if (income === 0) return 0;
  const rate = ((income - expenses) / income) * 100;
  return Math.round(rate * 100) / 100;
}

// ─── Percentage Used ────────────────────────────────────────────────────────

/**
 * Calculate percentage used: (spent / total) × 100.
 * Returns 0 when total is 0.
 */
export function calculatePercentageUsed(spent: number, total: number): number {
  if (total === 0) return 0;
  const pct = (spent / total) * 100;
  return Math.round(pct * 100) / 100;
}

// ─── Daily Average ──────────────────────────────────────────────────────────

/**
 * Calculate daily average: total / days.
 * Returns 0 when days is 0.
 */
export function calculateDailyAverage(total: number, days: number): number {
  if (days === 0) return 0;
  return Math.round((total / days) * 100) / 100;
}

// ─── Month Comparison ───────────────────────────────────────────────────────

/**
 * Calculate month-over-month percentage change.
 * Returns 0 if previous is 0, 100 if only current exists.
 */
export function calculateMonthComparison(current: number, previous: number): number {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }
  return Math.round(((current - previous) / Math.abs(previous)) * 100 * 100) / 100;
}

// ─── Category Breakdown ─────────────────────────────────────────────────────

/**
 * Group expense transactions by category, computing amount and percentage.
 */
export function calculateCategoryBreakdown(
  transactions: Transaction[],
  categories: Category[]
): CategorySpending[] {
  const expenses = transactions.filter((t) => t.type === 'expense');
  const totalExpenses = expenses.reduce((sum, t) => sum + Number(t.amount), 0);

  if (totalExpenses === 0) return [];

  // Build category map
  const categoryMap = new Map<string, Category>();
  for (const cat of categories) {
    categoryMap.set(cat.id, cat);
  }

  // Accumulate by category
  const spendingMap = new Map<string, number>();
  for (const txn of expenses) {
    const catId = txn.category_id || 'uncategorised';
    const current = spendingMap.get(catId) || 0;
    spendingMap.set(catId, current + Number(txn.amount));
  }

  // Convert to CategorySpending array
  const result: CategorySpending[] = [];
  for (const [catId, amount] of spendingMap.entries()) {
    const cat = categoryMap.get(catId);
    result.push({
      category: cat?.name || 'Uncategorised',
      amount,
      percentage: Math.round((amount / totalExpenses) * 100 * 100) / 100,
      color: cat?.color || '#6B7280',
      icon: cat?.icon || 'HelpCircle',
    });
  }

  // Sort by amount descending
  result.sort((a, b) => b.amount - a.amount);
  return result;
}

// ─── Daily Spending ─────────────────────────────────────────────────────────

/**
 * Compute daily spending totals between two dates (inclusive).
 * Returns an array of { date: string, amount: number }.
 */
export function calculateDailySpending(
  transactions: Transaction[],
  startDate: string,
  endDate: string
): { date: string; amount: number }[] {
  const expenses = transactions.filter((t) => t.type === 'expense');

  // Build map of date → total
  const dailyMap = new Map<string, number>();

  // Pre-fill every day in the range
  const start = new Date(startDate);
  const end = new Date(endDate);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().split('T')[0];
    dailyMap.set(key, 0);
  }

  for (const txn of expenses) {
    const key = txn.date.split('T')[0];
    if (dailyMap.has(key)) {
      dailyMap.set(key, (dailyMap.get(key) || 0) + Number(txn.amount));
    }
  }

  const result: { date: string; amount: number }[] = [];
  for (const [date, amount] of dailyMap.entries()) {
    result.push({ date, amount });
  }

  result.sort((a, b) => a.date.localeCompare(b.date));
  return result;
}

// ─── Weekly Totals ──────────────────────────────────────────────────────────

/**
 * Calculate weekly income and expense sums.
 * Returns array of { week: number, income: number, expenses: number }.
 */
export function calculateWeeklyTotals(
  transactions: Transaction[]
): { week: number; income: number; expenses: number }[] {
  const weeklyMap = new Map<number, { income: number; expenses: number }>();

  for (const txn of transactions) {
    const date = new Date(txn.date);
    // ISO week number calculation
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const dayOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / 86400000) + 1;
    const weekNum = Math.ceil(dayOfYear / 7);

    if (!weeklyMap.has(weekNum)) {
      weeklyMap.set(weekNum, { income: 0, expenses: 0 });
    }

    const entry = weeklyMap.get(weekNum)!;
    const amount = Number(txn.amount);

    if (txn.type === 'income') {
      entry.income += amount;
    } else if (txn.type === 'expense') {
      entry.expenses += amount;
    }
  }

  const result: { week: number; income: number; expenses: number }[] = [];
  for (const [week, totals] of weeklyMap.entries()) {
    result.push({ week, ...totals });
  }

  result.sort((a, b) => a.week - b.week);
  return result;
}

// ─── Forecast ───────────────────────────────────────────────────────────────

/**
 * Estimate end-of-month spending based on current spending pace.
 * forecast = (totalSpent / daysPassed) × daysInMonth
 */
export function calculateForecast(
  transactions: Transaction[],
  daysInMonth: number,
  daysPassed: number
): number {
  if (daysPassed === 0) return 0;

  const totalSpent = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const dailyRate = totalSpent / daysPassed;
  return Math.round(dailyRate * daysInMonth * 100) / 100;
}
