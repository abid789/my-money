import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency, formatDate, getDaysInMonth } from '@/lib/utils';
import { calculateForecast } from '@/lib/calculations';
import { BrandBadge, BrandIconBubble } from '@/components/ui/BrandBadge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { IncomeExpenseChart } from '@/components/dashboard/IncomeExpenseChart';
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
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import clsx from 'clsx';

export function SmartDashboard() {
  const {
    financialSummary,
    accounts,
    budgets,
    transactions,
    selectedMonth,
    selectedYear,
  } = useData();
  const { isPrivacyBlurEnabled, togglePrivacyBlur } = useTheme();
  const { language } = useLanguage();
  const navigate = useNavigate();

  // Current month transactions
  const monthTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
    });
  }, [transactions, selectedMonth, selectedYear]);

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

  // Active budgets with progress
  const activeBudgets = useMemo(() => {
    return budgets.filter((b) => b.is_active !== false).slice(0, 4);
  }, [budgets]);

  // Recent 6 transactions
  const recentTxns = useMemo(() => {
    return [...transactions].slice(0, 6);
  }, [transactions]);

  return (
    <div className="w-full max-w-full min-w-0 overflow-x-hidden space-y-6">
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
          </div>
        </div>
      </div>

      {/* ─── 2. Accounts & Wallets Strip (bKash, Nagad, Bank, Cash, etc.) ──── */}
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

      {/* ─── 4. Main Chart & Budget Cockpit ─────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Income vs Expenses Chart (Span 2 cols on xl) */}
        <div className="xl:col-span-2">
          <IncomeExpenseChart />
        </div>

        {/* Active Budgets Cockpit */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-800/90 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  {language === 'bn' ? 'বাজেট মনিটর' : 'Budget Cockpit'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => navigate('/budgets')}
                className="text-xs font-semibold text-teal-600 hover:underline dark:text-teal-400"
              >
                {language === 'bn' ? 'বিস্তারিত' : 'View All'}
              </button>
            </div>

            {activeBudgets.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400">
                {language === 'bn'
                  ? 'কোনো সক্রিয় বাজেট পাওয়া যায়নি।'
                  : 'No active budgets configured yet.'}
              </div>
            ) : (
              <div className="space-y-4">
                {activeBudgets.map((b) => {
                  const percent = b.amount > 0 ? (b.spent / b.amount) * 100 : 0;
                  return (
                    <div key={b.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                          {b.name}
                        </span>
                        <span className={clsx('font-bold', isPrivacyBlurEnabled && 'privacy-blur-target')}>
                          {isPrivacyBlurEnabled
                            ? '••••'
                            : `${formatCurrency(b.spent)} / ${formatCurrency(b.amount)}`}
                        </span>
                      </div>
                      <ProgressBar value={percent} size="sm" />
                      <div className="flex justify-between text-[10px] text-gray-400">
                        <span>
                          {percent >= 100
                            ? (language === 'bn' ? '⚠️ বাজেট অতিক্রম করেছে' : '⚠️ Limit Exceeded')
                            : percent >= 80
                            ? (language === 'bn' ? 'সতর্কতা: সীমা সন্নিকটে' : 'Warning: Approaching')
                            : (language === 'bn' ? 'বাজেট নিয়ন্ত্রণে' : 'Within budget')}
                        </span>
                        <span>{Math.round(percent)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
            <Button
              variant="outline"
              size="sm"
              fullWidth
              onClick={() => navigate('/budgets')}
              leftIcon={<PlusCircle className="h-4 w-4" />}
            >
              {language === 'bn' ? '+ নতুন বাজেট যোগ করুন' : '+ New Budget Plan'}
            </Button>
          </div>
        </div>
      </div>

      {/* ─── 5. Recent Transactions Stream ─────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-800/90">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              {language === 'bn' ? 'সাম্প্রতিক আর্থিক লেনদেন' : 'Recent Transaction Stream'}
            </h3>
            <p className="text-[11px] text-gray-500">
              {language === 'bn'
                ? 'আপনার ওয়ালেট ও ব্যাংক অ্যাকাউন্টের সর্বশেষ রেকর্ডসমূহ'
                : 'Real-time record stream across your accounts'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/transactions')}
          >
            {language === 'bn' ? 'সকল লেনদেন' : 'View Ledger'} &rarr;
          </Button>
        </div>

        {recentTxns.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-400">
            {language === 'bn'
              ? 'এখনও কোনো লেনদেন লিপিবদ্ধ করা হয়নি।'
              : 'No transactions recorded yet.'}
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {recentTxns.map((t) => {
              const isIncome = t.type === 'income' || t.type === 'refund';
              return (
                <div
                  key={t.id}
                  className="flex items-center justify-between py-3 transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-800/50 rounded-xl px-2"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <BrandIconBubble brand={t.payment_method || t.description} size="sm" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                        {t.description}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5">
                        <span>{formatDate(t.date)}</span>
                        <span>•</span>
                        <BrandBadge brand={t.payment_method || 'Cash'} size="sm" />
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={clsx(
                        'text-xs font-bold transition-all',
                        isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
                        isPrivacyBlurEnabled && 'privacy-blur-target'
                      )}
                    >
                      {isPrivacyBlurEnabled
                        ? '৳ •••••'
                        : `${isIncome ? '+' : '-'}${formatCurrency(Number(t.amount))}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
