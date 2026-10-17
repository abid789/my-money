import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useLanguage } from '@/contexts/LanguageContext';
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
  const { loading, error, refreshData, transactions } = useData();
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  const displayName =
    user?.user_metadata?.full_name || user?.email?.split('@')[0] || (language === 'bn' ? 'আবিদ' : 'Abid');
  const greeting = getGreeting();
  const todayStr = formatDate(format(new Date(), 'yyyy-MM-dd'), 'EEEE, MMMM dd, yyyy');

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" text={language === 'bn' ? 'ড্যাশবোর্ড লোড হচ্ছে...' : 'Loading your financial dashboard...'} />
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
              {language === 'bn' ? `স্বাগতম, ${displayName}!` : `${greeting}, ${displayName}!`}
            </h1>
            <Sparkles className="h-5 w-5 text-teal-500" />
          </div>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {language === 'bn'
              ? `${todayStr} • আপনার রিয়েল-টাইম ব্যক্তিগত আয়-ব্যয়ের হিসাব`
              : `${todayStr} • Here is your financial overview.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <MonthSelector />
          <Button
            variant="primary"
            onClick={() => navigate('/add-transaction')}
            leftIcon={<PlusCircle className="h-4 w-4" />}
          >
            {t('txn.add_new')}
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

      {/* Fresh Start Zero-Data Banner */}
      {transactions.length === 0 && (
        <div className="relative overflow-hidden rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50 via-emerald-50 to-cyan-50 p-5 shadow-xs dark:border-teal-900/60 dark:from-teal-950/40 dark:via-emerald-950/30 dark:to-cyan-950/40">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-teal-900 dark:text-teal-200 font-bold text-sm">
                <span>🎯 {language === 'bn' ? 'সম্পূর্ণ নতুন ও শূন্য (৳০) থেকে শুরু!' : 'Fresh Start with Zero Data!'}</span>
              </div>
              <p className="text-xs text-teal-800 dark:text-teal-300">
                {language === 'bn'
                  ? 'আপনার ক্যাশ, বিকাশ ও ব্যাংক অ্যাকাউন্ট শূন্য ব্যালেন্সে প্রস্তুত। আপনার ব্যক্তিগত প্রকৃত হিসাব রাখতে প্রথম লেনদেন যোগ করুন।'
                  : 'Your accounts are initialized with ৳0 balance. Click "+ Add Transaction" to start recording your personal finances.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/add-transaction')}
                leftIcon={<PlusCircle className="h-4 w-4" />}
              >
                {language === 'bn' ? '+ লেনদেন যোগ করুন' : 'Add Transaction'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/accounts')}
              >
                {language === 'bn' ? 'অ্যাকাউন্টস' : 'Accounts'}
              </Button>
            </div>
          </div>
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
