import type { Transaction, Budget, Category, Insight } from '@/types';
import { formatCurrency, generateId } from '@/lib/utils';
import {
  calculateTotalIncome,
  calculateTotalExpenses,
  calculateSavingsRate,
  calculateCategoryBreakdown,
  calculateDailyAverage,
  calculateForecast,
  calculatePercentageUsed,
} from '@/lib/calculations';
import { getDaysInMonth } from 'date-fns';

// ─── Insight Generator ──────────────────────────────────────────────────────

/**
 * Generate rule-based financial insights from real transaction data.
 * Returns an array of typed Insight objects.
 */
export function generateInsights(
  transactions: Transaction[],
  budgets: Budget[],
  categories: Category[],
  currentMonth: { year: number; month: number }
): Insight[] {
  const insights: Insight[] = [];

  // Need a minimum of 5 transactions for meaningful insights
  if (transactions.length < 5) {
    insights.push({
      id: generateId(),
      type: 'info',
      title: 'More data needed',
      description:
        'Add at least 5 transactions to unlock personalised financial insights. Keep tracking your spending!',
      icon: 'BarChart3',
    });
    return insights;
  }

  const totalIncome = calculateTotalIncome(transactions);
  const totalExpenses = calculateTotalExpenses(transactions);
  const expenseTransactions = transactions.filter((t) => t.type === 'expense');
  const incomeTransactions = transactions.filter((t) => t.type === 'income');

  // ── 1. Biggest spending category ──────────────────────────────────────

  const breakdown = calculateCategoryBreakdown(transactions, categories);
  if (breakdown.length > 0) {
    const topCategory = breakdown[0];
    insights.push({
      id: generateId(),
      type: 'info',
      title: 'Top spending category',
      description: `${topCategory.category} is your biggest expense at ${formatCurrency(topCategory.amount)}, accounting for ${topCategory.percentage.toFixed(1)}% of total spending.`,
      value: formatCurrency(topCategory.amount),
      icon: 'PieChart',
    });
  }

  // ── 2. Average daily spending ─────────────────────────────────────────

  const today = new Date();
  const daysPassed = today.getDate();
  const daysInCurrentMonth = getDaysInMonth(new Date(currentMonth.year, currentMonth.month - 1));

  if (daysPassed > 0 && totalExpenses > 0) {
    const dailyAvg = calculateDailyAverage(totalExpenses, daysPassed);
    insights.push({
      id: generateId(),
      type: 'info',
      title: 'Daily spending average',
      description: `You are spending an average of ${formatCurrency(dailyAvg)} per day this month.`,
      value: formatCurrency(dailyAvg),
      icon: 'TrendingDown',
    });
  }

  // ── 3. Weekly spending average ────────────────────────────────────────

  if (daysPassed >= 7 && totalExpenses > 0) {
    const weeklyAvg = calculateDailyAverage(totalExpenses, daysPassed) * 7;
    insights.push({
      id: generateId(),
      type: 'info',
      title: 'Weekly spending pace',
      description: `Your weekly spending averages about ${formatCurrency(weeklyAvg)}.`,
      value: formatCurrency(weeklyAvg),
      icon: 'Calendar',
    });
  }

  // ── 4. Highest spending day ───────────────────────────────────────────

  if (expenseTransactions.length > 0) {
    const dailyTotals = new Map<string, number>();
    for (const txn of expenseTransactions) {
      const dateKey = txn.date.split('T')[0];
      dailyTotals.set(dateKey, (dailyTotals.get(dateKey) || 0) + Number(txn.amount));
    }

    let highestDay = '';
    let highestAmount = 0;
    let lowestDay = '';
    let lowestAmount = Infinity;

    for (const [day, amount] of dailyTotals.entries()) {
      if (amount > highestAmount) {
        highestAmount = amount;
        highestDay = day;
      }
      if (amount < lowestAmount) {
        lowestAmount = amount;
        lowestDay = day;
      }
    }

    if (highestDay) {
      const dayLabel = new Date(highestDay).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });
      insights.push({
        id: generateId(),
        type: 'warning',
        title: 'Highest spending day',
        description: `Your biggest spending day was ${dayLabel} with ${formatCurrency(highestAmount)}.`,
        value: formatCurrency(highestAmount),
        icon: 'ArrowUp',
      });
    }

    if (lowestDay && lowestDay !== highestDay) {
      const dayLabel = new Date(lowestDay).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });
      insights.push({
        id: generateId(),
        type: 'success',
        title: 'Lowest spending day',
        description: `Your most frugal day was ${dayLabel} with only ${formatCurrency(lowestAmount)}.`,
        value: formatCurrency(lowestAmount),
        icon: 'ArrowDown',
      });
    }
  }

  // ── 5. Savings rate ───────────────────────────────────────────────────

  if (totalIncome > 0) {
    const savingsRate = calculateSavingsRate(totalIncome, totalExpenses);
    const rateType: Insight['type'] = savingsRate >= 20 ? 'success' : savingsRate >= 0 ? 'tip' : 'warning';
    const message =
      savingsRate >= 20
        ? `Great job! You are saving ${savingsRate.toFixed(1)}% of your income this month.`
        : savingsRate >= 0
          ? `You are saving ${savingsRate.toFixed(1)}% of your income. Try to aim for at least 20%.`
          : `You are spending more than you earn. Your savings rate is ${savingsRate.toFixed(1)}%.`;

    insights.push({
      id: generateId(),
      type: rateType,
      title: 'Monthly savings rate',
      description: message,
      value: `${savingsRate.toFixed(1)}%`,
      icon: 'Percent',
    });
  }

  // ── 6. Budget categories at risk ──────────────────────────────────────

  const activeBudgets = budgets.filter((b) => b.is_active);
  for (const budget of activeBudgets) {
    const pctUsed = calculatePercentageUsed(Number(budget.spent), Number(budget.amount));

    if (pctUsed >= 100) {
      insights.push({
        id: generateId(),
        type: 'warning',
        title: `Budget exceeded: ${budget.name}`,
        description: `You have exceeded your ${budget.name} budget by ${formatCurrency(Number(budget.spent) - Number(budget.amount))}. Consider reviewing your spending.`,
        value: `${pctUsed.toFixed(0)}%`,
        icon: 'AlertTriangle',
      });
    } else if (pctUsed >= 90) {
      insights.push({
        id: generateId(),
        type: 'warning',
        title: `Budget almost full: ${budget.name}`,
        description: `You have used ${pctUsed.toFixed(1)}% of your ${budget.name} budget. Only ${formatCurrency(Number(budget.amount) - Number(budget.spent))} remaining.`,
        value: `${pctUsed.toFixed(0)}%`,
        icon: 'AlertCircle',
      });
    } else if (pctUsed >= 75) {
      insights.push({
        id: generateId(),
        type: 'tip',
        title: `Budget heads up: ${budget.name}`,
        description: `You have used ${pctUsed.toFixed(1)}% of your ${budget.name} budget with ${formatCurrency(Number(budget.amount) - Number(budget.spent))} left.`,
        value: `${pctUsed.toFixed(0)}%`,
        icon: 'Info',
      });
    }
  }

  // ── 7. Spending forecast ──────────────────────────────────────────────

  if (daysPassed > 0 && daysPassed < daysInCurrentMonth && totalExpenses > 0) {
    const forecast = calculateForecast(expenseTransactions, daysInCurrentMonth, daysPassed);
    insights.push({
      id: generateId(),
      type: forecast > totalIncome ? 'warning' : 'info',
      title: 'Month-end spending forecast',
      description:
        forecast > totalIncome
          ? `At this pace, you will spend about ${formatCurrency(forecast)} by month end, which exceeds your income of ${formatCurrency(totalIncome)}.`
          : `At this pace, you will spend about ${formatCurrency(forecast)} by month end.`,
      value: formatCurrency(forecast),
      icon: 'TrendingUp',
    });
  }

  // ── 8. Unusual / large transactions ───────────────────────────────────

  if (expenseTransactions.length >= 5) {
    // Calculate average expense amount
    const avgExpense = totalExpenses / expenseTransactions.length;

    // Find transactions that are more than 2× the average
    const unusualTxns = expenseTransactions.filter(
      (t) => Number(t.amount) > avgExpense * 2
    );

    if (unusualTxns.length > 0 && unusualTxns.length <= 5) {
      for (const txn of unusualTxns) {
        insights.push({
          id: generateId(),
          type: 'warning',
          title: 'Unusually large expense',
          description: `"${txn.description}" for ${formatCurrency(Number(txn.amount))} is more than 2× your average expense of ${formatCurrency(avgExpense)}.`,
          value: formatCurrency(Number(txn.amount)),
          icon: 'Zap',
        });
      }
    } else if (unusualTxns.length > 5) {
      insights.push({
        id: generateId(),
        type: 'warning',
        title: 'Multiple large expenses',
        description: `You have ${unusualTxns.length} expenses that are more than 2× your average. Consider reviewing your spending patterns.`,
        icon: 'Zap',
      });
    }
  }

  // ── 9. Income diversity ───────────────────────────────────────────────

  if (incomeTransactions.length > 0) {
    const uniqueDescriptions = new Set(incomeTransactions.map((t) => t.description.toLowerCase()));
    if (uniqueDescriptions.size === 1) {
      insights.push({
        id: generateId(),
        type: 'tip',
        title: 'Single income source',
        description:
          'All your income comes from one source. Consider diversifying your income streams for greater financial stability.',
        icon: 'Target',
      });
    }
  }

  // ── 10. No-spend encouragement ────────────────────────────────────────

  if (expenseTransactions.length > 0) {
    const datesWithExpenses = new Set(expenseTransactions.map((t) => t.date.split('T')[0]));
    const noSpendDays = daysPassed - datesWithExpenses.size;
    if (noSpendDays > 0 && noSpendDays >= 3) {
      insights.push({
        id: generateId(),
        type: 'success',
        title: 'No-spend days',
        description: `You had ${noSpendDays} no-spend day${noSpendDays > 1 ? 's' : ''} this month. Great discipline!`,
        value: `${noSpendDays} days`,
        icon: 'Award',
      });
    }
  }

  return insights;
}
