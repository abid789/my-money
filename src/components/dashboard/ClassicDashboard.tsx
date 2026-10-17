import { useNavigate } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { IncomeExpenseChart } from '@/components/dashboard/IncomeExpenseChart';
import { CashFlowOverview } from '@/components/dashboard/CashFlowOverview';
import { MonthComparisonSection } from '@/components/dashboard/MonthComparisonSection';
import { SpendingTrendChart } from '@/components/dashboard/SpendingTrendChart';
import { CategoryBreakdownChart } from '@/components/dashboard/CategoryBreakdownChart';
import { BudgetUtilizationChart } from '@/components/dashboard/BudgetUtilizationChart';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { Button } from '@/components/ui/Button';
import { PlusCircle } from 'lucide-react';

export function ClassicDashboard() {
  const { transactions } = useData();
  const { language } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="w-full max-w-full min-w-0 overflow-x-hidden space-y-6">
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

      {/* Cash Flow Overview */}
      <CashFlowOverview />

      {/* Visualizations Row 1: Income vs Expenses & Month-to-Month Comparison */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="w-full min-w-0">
          <IncomeExpenseChart />
        </div>
        <div className="w-full min-w-0">
          <MonthComparisonSection />
        </div>
      </div>

      {/* Visualizations Row 2: Daily Spending Trend & Category Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="w-full min-w-0">
          <SpendingTrendChart />
        </div>
        <div className="w-full min-w-0">
          <CategoryBreakdownChart />
        </div>
      </div>

      {/* Budget Utilization */}
      <BudgetUtilizationChart />

      {/* Recent Transactions List */}
      <RecentTransactions />
    </div>
  );
}
