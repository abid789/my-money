import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { getGreeting, formatDate } from '@/lib/utils';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { MonthSelector } from '@/components/dashboard/MonthSelector';
import { IncomeExpenseChart } from '@/components/dashboard/IncomeExpenseChart';
import { SpendingTrendChart } from '@/components/dashboard/SpendingTrendChart';
import { CategoryBreakdownChart } from '@/components/dashboard/CategoryBreakdownChart';
import { BudgetUtilizationChart } from '@/components/dashboard/BudgetUtilizationChart';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PlusCircle, Sparkles, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function DashboardPage() {
  const { user } = useAuth();
  const { loading, error, refreshData } = useData();
  const navigate = useNavigate();

  const displayName =
    user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Friend';
  const greeting = getGreeting();
  const todayStr = formatDate(format(new Date(), 'yyyy-MM-dd'), 'EEEE, MMMM dd, yyyy');

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" text="Loading your financial dashboard..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Welcome & Actions Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
              {greeting}, {displayName}!
            </h1>
            <Sparkles className="h-5 w-5 text-teal-500" />
          </div>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {todayStr} • Here is your financial overview.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <MonthSelector />
          <Button
            variant="primary"
            onClick={() => navigate('/add-transaction')}
            leftIcon={<PlusCircle className="h-4 w-4" />}
          >
            Add Transaction
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
            <span>Database note: {error}</span>
          </div>
          <button
            onClick={() => refreshData()}
            className="font-semibold underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* 6 Financial Metric Summary Cards */}
      <SummaryCards />

      {/* Visualizations Row 1: Income vs Expenses & Category Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <IncomeExpenseChart />
        <CategoryBreakdownChart />
      </div>

      {/* Visualizations Row 2: Daily Spending Trend & Budget Utilization */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SpendingTrendChart />
        <BudgetUtilizationChart />
      </div>

      {/* Recent Transactions List */}
      <RecentTransactions />
    </div>
  );
}
