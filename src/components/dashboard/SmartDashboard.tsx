import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency, formatDate, getDaysInMonth } from '@/lib/utils';
import { calculateForecast } from '@/lib/calculations';
import { BrandBadge, BrandIconBubble } from '@/components/ui/BrandBadge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { IncomeExpenseChart } from '@/components/dashboard/IncomeExpenseChart';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { CashFlowOverview } from '@/components/dashboard/CashFlowOverview';
import { MonthComparisonSection } from '@/components/dashboard/MonthComparisonSection';
import { SpendingTrendChart } from '@/components/dashboard/SpendingTrendChart';
import { CategoryBreakdownChart } from '@/components/dashboard/CategoryBreakdownChart';
import { BudgetUtilizationChart } from '@/components/dashboard/BudgetUtilizationChart';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { MiniCalculator } from '@/components/dashboard/MiniCalculator';
import { Button } from '@/components/ui/Button';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  PlusCircle,
  Eye,
  EyeOff,
  PiggyBank,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  Target,
  FileBarChart,
  Calendar,
  AlertTriangle,
  AlertCircle,
  HandCoins,
  CheckCircle2,
  ChevronRight,
  Calculator,
  Download,
} from 'lucide-react';
import clsx from 'clsx';
import { usePwaInstall } from '@/lib/pwa';
import { InstallAppModal } from '@/components/pwa/InstallAppModal';

export function SmartDashboard() {
  const {
    financialSummary,
    accounts,
    budgets,
    transactions,
    filteredTransactions,
    selectedMonth,
    selectedYear,
    loanSummary,
  } = useData();
  const { isPrivacyBlurEnabled, togglePrivacyBlur } = useTheme();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const { canInstall, isInstalled, promptInstall } = usePwaInstall();
  const [showInstallModal, setShowInstallModal] = useState(false);

  const handleInstallClick = async () => {
    if (canInstall) {
      const accepted = await promptInstall();
      if (!accepted) {
        setShowInstallModal(true);
      }
    } else {
      setShowInstallModal(true);
    }
  };

  // Active period transactions (filtered by active date range)
  const monthTransactions = filteredTransactions || transactions;

  // Savings rate
  const savingsRate = useMemo(() => {
    if (financialSummary.totalIncome <= 0) return 0;
    return Math.max(
      0,
      Math.min(
        100,
        ((financialSummary.totalIncome - financialSummary.totalExpenses) /
          financialSummary.totalIncome) *
          100
      )
    );
  }, [financialSummary.totalIncome, financialSummary.totalExpenses]);

  // Days in selected month
  const now = new Date();
  const isCurrentMonth =
    now.getMonth() + 1 === selectedMonth && now.getFullYear() === selectedYear;
  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
  const daysPassed = isCurrentMonth ? now.getDate() : daysInMonth;

  // Forecast & Burn Rate
  const forecastExpense = useMemo(() => {
    return calculateForecast(monthTransactions, daysInMonth, daysPassed);
  }, [monthTransactions, daysInMonth, daysPassed]);

  const dailyBurnRate = useMemo(() => {
    if (daysPassed <= 0) return 0;
    return financialSummary.totalExpenses / daysPassed;
  }, [financialSummary.totalExpenses, daysPassed]);

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

      {/* ─── 1. Hero Cockpit & Net Balance Card ─────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-teal-500/20 bg-gradient-to-br from-teal-900 via-slate-900 to-gray-950 p-6 text-white shadow-xl dark:border-teal-400/20">
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          {/* Balance & Inflow/Outflow */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-teal-300">
              <span className="flex h-2 w-2 rounded-full bg-teal-400 animate-pulse" />
              <span>{language === 'bn' ? 'মোট উপলব্ধ ব্যালেন্স (নেট ওর্থ)' : 'Available Total Balance'}</span>
              <button
                type="button"
                onClick={togglePrivacyBlur}
                className="ml-1 rounded-md p-1 hover:bg-white/10 transition-colors"
                title={isPrivacyBlurEnabled ? 'Reveal Balance' : 'Hide / Blur Balance'}
              >
                {isPrivacyBlurEnabled ? (
                  <EyeOff className="h-4 w-4 text-teal-300" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-300" />
                )}
              </button>
            </div>

            <div className="flex items-baseline gap-3">
              <span
                className={clsx(
                  'text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl transition-all',
                  isPrivacyBlurEnabled && 'privacy-blur-target'
                )}
              >
                {isPrivacyBlurEnabled ? '৳ ••••••••' : formatCurrency(financialSummary.availableBalance)}
              </span>
            </div>

            {/* Micro stats banner */}
            <div className="grid grid-cols-3 gap-3 pt-2 text-xs sm:gap-6">
              <div className="border-l-2 border-emerald-400 pl-3">
                <p className="text-gray-400">{language === 'bn' ? 'চলতি মাস আয়' : 'This Month Income'}</p>
                <p className={clsx('mt-0.5 font-bold text-emerald-400', isPrivacyBlurEnabled && 'privacy-blur-target')}>
                  {isPrivacyBlurEnabled ? '৳ •••' : formatCurrency(financialSummary.totalIncome)}
                </p>
              </div>

              <div className="border-l-2 border-rose-400 pl-3">
                <p className="text-gray-400">{language === 'bn' ? 'চলতি মাস ব্যয়' : 'This Month Expense'}</p>
                <p className={clsx('mt-0.5 font-bold text-rose-400', isPrivacyBlurEnabled && 'privacy-blur-target')}>
                  {isPrivacyBlurEnabled ? '৳ •••' : formatCurrency(financialSummary.totalExpenses)}
                </p>
              </div>

              <div className="border-l-2 border-teal-400 pl-3">
                <p className="text-gray-400">{language === 'bn' ? 'সঞ্চয় হার' : 'Savings Rate'}</p>
                <p className="mt-0.5 font-bold text-teal-300">
                  {savingsRate.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => navigate('/add-transaction?type=income')}
              className="flex items-center gap-2 rounded-2xl bg-emerald-600/90 hover:bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md transition-all active:scale-95"
            >
              <ArrowDownLeft className="h-4 w-4" />
              <span>{language === 'bn' ? '+ আয়' : '+ Income'}</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/add-transaction?type=expense')}
              className="flex items-center gap-2 rounded-2xl bg-rose-600/90 hover:bg-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-md transition-all active:scale-95"
            >
              <ArrowUpRight className="h-4 w-4" />
              <span>{language === 'bn' ? '- ব্যয়' : '- Expense'}</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/add-transaction?type=transfer')}
              className="flex items-center gap-2 rounded-2xl bg-indigo-600/90 hover:bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md transition-all active:scale-95"
            >
              <ArrowLeftRight className="h-4 w-4" />
              <span>{language === 'bn' ? 'ট্রান্সফার' : 'Transfer'}</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/reports')}
              className="flex items-center gap-2 rounded-2xl bg-white/10 hover:bg-white/20 px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm transition-all"
            >
              <FileBarChart className="h-4 w-4 text-teal-300" />
              <span>{language === 'bn' ? 'রিপোর্ট' : 'Reports'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCalculatorOpen(true)}
              className="flex items-center gap-2 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 px-3.5 py-2.5 text-xs font-semibold text-amber-200 shadow-sm transition-all active:scale-95"
              title={language === 'bn' ? 'মিনি ক্যালকুলেটর খুলুন' : 'Open Mini Calculator'}
            >
              <Calculator className="h-4 w-4 text-amber-300" />
              <span>{language === 'bn' ? 'হিসাব' : 'Calculator'}</span>
            </button>

            {!isInstalled && (
              <button
                type="button"
                onClick={handleInstallClick}
                className="flex items-center gap-2 rounded-2xl bg-teal-500/20 hover:bg-teal-500/30 border border-teal-400/40 px-3.5 py-2.5 text-xs font-semibold text-teal-200 shadow-sm transition-all active:scale-95"
                title={language === 'bn' ? 'অ্যাপ ডাউনলোড করুন' : 'Download App'}
              >
                <Download className="h-4 w-4 text-teal-300" />
                <span>{language === 'bn' ? 'অ্যাপ ডাউনলোড' : 'Download App'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── 2. 6 Financial Summary KPI Cards ──────────────────────────────── */}
      <SummaryCards />

      {/* ─── 3. Accounts & Wallets Strip (bKash, Nagad, Bank, Cash, etc.) ──── */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">
              {language === 'bn' ? 'অ্যাকাউন্ট ও ডিজিটাল ওয়ালেট' : 'Accounts & Digital Wallets'}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => navigate('/accounts')}
            className="flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400"
          >
            <span>{language === 'bn' ? 'সবগুলো দেখুন' : 'Manage All'}</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {accounts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-xs text-gray-500 dark:border-gray-700">
            {language === 'bn'
              ? 'কোনো অ্যাকাউন্ট যুক্ত নেই। ক্যাশ, বিকাশ বা ব্যাংক অ্যাকাউন্ট তৈরি করুন।'
              : 'No accounts configured. Click to add your Cash, bKash, or Bank.'}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                onClick={() => navigate('/accounts')}
                className="group cursor-pointer rounded-2xl border border-gray-100 bg-white p-3.5 shadow-xs transition-all hover:border-teal-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800/90"
              >
                <div className="flex items-center justify-between">
                  <BrandIconBubble brand={acc.name || acc.type} size="sm" />
                  <BrandBadge brand={acc.name || acc.type} size="sm" showLabel={false} />
                </div>
                <div className="mt-2.5 truncate text-xs font-bold text-gray-800 dark:text-gray-100 group-hover:text-teal-600">
                  {acc.name}
                </div>
                <div
                  className={clsx(
                    'mt-1 font-bold text-sm tracking-tight text-gray-900 dark:text-white transition-all',
                    isPrivacyBlurEnabled && 'privacy-blur-target'
                  )}
                >
                  {isPrivacyBlurEnabled ? '৳ •••••' : formatCurrency(acc.current_balance)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Personal Loans, Receivables & Payables Strip ──────────────────── */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HandCoins className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">
              {language === 'bn' ? 'ধার-দেনা ও লেন্ডিং হিসাব (লোন)' : 'Personal Loans & Lending'}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => navigate('/loans')}
            className="flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400"
          >
            <span>{language === 'bn' ? 'বিস্তারিত হিসাব' : 'Manage Loans'}</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {/* 1. Total Receivable */}
          <div
            onClick={() => navigate('/loans?tab=receivable')}
            className="cursor-pointer rounded-2xl border border-emerald-100 bg-emerald-50/40 p-3.5 shadow-xs transition-all hover:border-emerald-300 hover:shadow-md dark:border-emerald-900/40 dark:bg-emerald-950/20"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                {language === 'bn' ? 'টাকা পাবো (পাওনা)' : 'Total Receivable'}
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                <ArrowDownLeft className="h-4 w-4" />
              </div>
            </div>
            <div
              className={clsx(
                'mt-2 text-base font-extrabold text-emerald-700 dark:text-emerald-300 tracking-tight sm:text-lg transition-all',
                isPrivacyBlurEnabled && 'privacy-blur-target'
              )}
            >
              {isPrivacyBlurEnabled ? '৳ •••••' : formatCurrency(loanSummary.totalReceivable)}
            </div>
            <p className="mt-0.5 text-[10px] text-emerald-600/70 dark:text-emerald-400/70">
              {language === 'bn' ? 'অন্যরা ফেরত দেবে' : 'People owe you'}
            </p>
          </div>

          {/* 2. Total Payable */}
          <div
            onClick={() => navigate('/loans?tab=payable')}
            className="cursor-pointer rounded-2xl border border-rose-100 bg-rose-50/40 p-3.5 shadow-xs transition-all hover:border-rose-300 hover:shadow-md dark:border-rose-900/40 dark:bg-rose-950/20"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">
                {language === 'bn' ? 'টাকা দেবো (দেনা)' : 'Total Payable'}
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300">
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </div>
            <div
              className={clsx(
                'mt-2 text-base font-extrabold text-rose-700 dark:text-rose-300 tracking-tight sm:text-lg transition-all',
                isPrivacyBlurEnabled && 'privacy-blur-target'
              )}
            >
              {isPrivacyBlurEnabled ? '৳ •••••' : formatCurrency(loanSummary.totalPayable)}
            </div>
            <p className="mt-0.5 text-[10px] text-rose-600/70 dark:text-rose-400/70">
              {language === 'bn' ? 'আপনাকে পরিশোধ করতে হবে' : 'You owe others'}
            </p>
          </div>

          {/* 3. Net Balance */}
          <div
            onClick={() => navigate('/loans')}
            className="cursor-pointer rounded-2xl border border-teal-100 bg-teal-50/40 p-3.5 shadow-xs transition-all hover:border-teal-300 hover:shadow-md dark:border-teal-900/40 dark:bg-teal-950/20"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-teal-700 dark:text-teal-300">
                {language === 'bn' ? 'নীট লেন্ডিং ব্যালেন্স' : 'Net Lending Balance'}
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-900/60 dark:text-teal-300">
                <ArrowUpDown className="h-4 w-4" />
              </div>
            </div>
            <div
              className={clsx(
                'mt-2 text-base font-extrabold tracking-tight sm:text-lg transition-all',
                loanSummary.netLendingBalance >= 0
                  ? 'text-teal-700 dark:text-teal-300'
                  : 'text-amber-700 dark:text-amber-300',
                isPrivacyBlurEnabled && 'privacy-blur-target'
              )}
            >
              {isPrivacyBlurEnabled
                ? '৳ •••••'
                : `${loanSummary.netLendingBalance < 0 ? '-' : '+'}${formatCurrency(Math.abs(loanSummary.netLendingBalance))}`}
            </div>
            <p className="mt-0.5 text-[10px] text-teal-600/70 dark:text-teal-400/70">
              {language === 'bn' ? 'পাওনা - দেনা' : 'Receivable - Payable'}
            </p>
          </div>

          {/* 4. Overdue Receivable */}
          <div
            onClick={() => navigate('/loans?tab=receivable')}
            className={clsx(
              'cursor-pointer rounded-2xl border p-3.5 shadow-xs transition-all hover:shadow-md',
              loanSummary.overdueReceivable > 0
                ? 'border-amber-200 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20 hover:border-amber-300'
                : 'border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-800/90'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                {language === 'bn' ? 'মেয়াদোত্তীর্ণ পাওনা' : 'Overdue Receivable'}
              </span>
              <div
                className={clsx(
                  'flex h-7 w-7 items-center justify-center rounded-lg',
                  loanSummary.overdueReceivable > 0
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300'
                    : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-400'
                )}
              >
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <div
              className={clsx(
                'mt-2 text-base font-extrabold tracking-tight sm:text-lg transition-all',
                loanSummary.overdueReceivable > 0
                  ? 'text-amber-700 dark:text-amber-300'
                  : 'text-gray-400 dark:text-gray-500',
                isPrivacyBlurEnabled && 'privacy-blur-target'
              )}
            >
              {isPrivacyBlurEnabled ? '৳ •••••' : formatCurrency(loanSummary.overdueReceivable)}
            </div>
            <p className="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">
              {language === 'bn' ? 'তাগাদা দেওয়ার বাকি' : 'Needs collection'}
            </p>
          </div>

          {/* 5. Overdue Payable */}
          <div
            onClick={() => navigate('/loans?tab=payable')}
            className={clsx(
              'cursor-pointer rounded-2xl border p-3.5 shadow-xs transition-all hover:shadow-md col-span-2 sm:col-span-1 lg:col-span-1',
              loanSummary.overduePayable > 0
                ? 'border-red-200 bg-red-50/50 dark:border-red-900/40 dark:bg-red-950/20 hover:border-red-300'
                : 'border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-800/90'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                {language === 'bn' ? 'মেয়াদোত্তীর্ণ দেনা' : 'Overdue Payable'}
              </span>
              <div
                className={clsx(
                  'flex h-7 w-7 items-center justify-center rounded-lg',
                  loanSummary.overduePayable > 0
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300'
                    : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-400'
                )}
              >
                <AlertCircle className="h-4 w-4" />
              </div>
            </div>
            <div
              className={clsx(
                'mt-2 text-base font-extrabold tracking-tight sm:text-lg transition-all',
                loanSummary.overduePayable > 0
                  ? 'text-red-700 dark:text-red-300'
                  : 'text-gray-400 dark:text-gray-500',
                isPrivacyBlurEnabled && 'privacy-blur-target'
              )}
            >
              {isPrivacyBlurEnabled ? '৳ •••••' : formatCurrency(loanSummary.overduePayable)}
            </div>
            <p className="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">
              {language === 'bn' ? 'দ্রুত পরিশোধ করুন' : 'Due for repayment'}
            </p>
          </div>
        </div>
      </div>

      {/* ─── 3. Financial Health & Forecast Row ────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Savings Health */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-800/90">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-600 dark:text-gray-400">
              {language === 'bn' ? 'সঞ্চয় অনুপাত লক্ষ্য' : 'Monthly Savings Gauge'}
            </span>
            <PiggyBank className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-gray-900 dark:text-white">
              {savingsRate.toFixed(0)}%
            </span>
            <span className="text-xs text-gray-500">
              {savingsRate >= 20 ? (language === 'bn' ? 'অসাধারণ সঞ্চয়' : 'Healthy') : (language === 'bn' ? 'সতর্ক' : 'Low')}
            </span>
          </div>
          <div className="mt-3">
            <ProgressBar value={savingsRate} colorScheme="teal" size="sm" />
          </div>
          <p className="mt-2 text-[11px] text-gray-400">
            {language === 'bn'
              ? `নেট উদ্বৃত্ত: ${formatCurrency(financialSummary.netCashFlow)}`
              : `Net surplus: ${formatCurrency(financialSummary.netCashFlow)}`}
          </p>
        </div>

        {/* Daily Burn Rate */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-800/90">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-600 dark:text-gray-400">
              {language === 'bn' ? 'দৈনিক গড় খরচ (Burn Rate)' : 'Daily Burn Rate'}
            </span>
            <TrendingDown className="h-4 w-4 text-rose-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={clsx('text-2xl font-black text-gray-900 dark:text-white', isPrivacyBlurEnabled && 'privacy-blur-target')}>
              {isPrivacyBlurEnabled ? '৳ •••' : formatCurrency(dailyBurnRate)}
            </span>
            <span className="text-xs text-gray-500">{language === 'bn' ? '/দিন' : '/day'}</span>
          </div>
          <div className="mt-3">
            <ProgressBar
              value={Math.min(100, (daysPassed / daysInMonth) * 100)}
              size="sm"
            />
          </div>
          <p className="mt-2 text-[11px] text-gray-400">
            {language === 'bn'
              ? `মাসের ${daysPassed}/${daysInMonth} দিন অতিক্রান্ত`
              : `${daysPassed} of ${daysInMonth} days elapsed`}
          </p>
        </div>

        {/* Projected Month-End Forecast */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-800/90">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-600 dark:text-gray-400">
              {language === 'bn' ? 'মাস শেষে আনুমানিক ব্যয়' : 'Projected Month-End'}
            </span>
            <Target className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={clsx('text-2xl font-black text-indigo-600 dark:text-indigo-400', isPrivacyBlurEnabled && 'privacy-blur-target')}>
              {isPrivacyBlurEnabled ? '৳ •••' : formatCurrency(forecastExpense)}
            </span>
          </div>
          <div className="mt-3">
            <div className="h-1.5 w-full rounded-full bg-indigo-100 dark:bg-indigo-950/60 overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full"
                style={{ width: `${Math.min(100, (financialSummary.totalExpenses / (forecastExpense || 1)) * 100)}%` }}
              />
            </div>
          </div>
          <p className="mt-2 text-[11px] text-gray-400">
            {language === 'bn' ? 'বর্তমান ব্যয়ের গতির ভিত্তিতে হিসাব' : 'Estimated based on current daily spending'}
          </p>
        </div>
      </div>

      {/* ─── 5. Cash Flow Overview ────────────────────────────────────────── */}
      <CashFlowOverview />

      {/* ─── 6. Visualizations Row 1: Income vs Expenses & Month Comparison ── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="w-full min-w-0">
          <IncomeExpenseChart />
        </div>
        <div className="w-full min-w-0">
          <MonthComparisonSection />
        </div>
      </div>

      {/* ─── 7. Visualizations Row 2: Daily Spending Trend & Category Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="w-full min-w-0">
          <SpendingTrendChart />
        </div>
        <div className="w-full min-w-0">
          <CategoryBreakdownChart />
        </div>
      </div>

      {/* ─── 8. Budget Utilization ────────────────────────────────────────── */}
      <BudgetUtilizationChart />

      {/* ─── 9. Recent Transactions ───────────────────────────────────────── */}
      <RecentTransactions />

      {/* ─── 10. Mini Calculator Modal ────────────────────────────────────── */}
      <MiniCalculator
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
      />

      <InstallAppModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
      />
    </div>
  );
}
