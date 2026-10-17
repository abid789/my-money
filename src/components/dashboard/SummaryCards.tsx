import { useData } from '@/contexts/DataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency, getPercentageChange } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Wallet,
  PiggyBank,
  Target,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import clsx from 'clsx';

export function SummaryCards() {
  const { financialSummary } = useData();
  const { t, language } = useLanguage();

  const incomeChange = getPercentageChange(
    financialSummary.totalIncome,
    financialSummary.prevMonthIncome
  );
  const expenseChange = getPercentageChange(
    financialSummary.totalExpenses,
    financialSummary.prevMonthExpenses
  );
  const cashFlowChange = getPercentageChange(
    financialSummary.netCashFlow,
    financialSummary.prevMonthCashFlow
  );

  const cards = [
    {
      title: t('dash.total_income'),
      amount: financialSummary.totalIncome,
      icon: TrendingUp,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
      borderColor: 'border-emerald-200 dark:border-emerald-800/40',
      change: incomeChange,
      isPositive: incomeChange >= 0,
      showChange: financialSummary.prevMonthIncome > 0,
    },
    {
      title: t('dash.total_expenses'),
      amount: financialSummary.totalExpenses,
      icon: TrendingDown,
      color: 'text-rose-600 dark:text-rose-400',
      bgColor: 'bg-rose-50 dark:bg-rose-950/40',
      borderColor: 'border-rose-200 dark:border-rose-800/40',
      change: expenseChange,
      isPositive: expenseChange <= 0,
      showChange: financialSummary.prevMonthExpenses > 0,
    },
    {
      title: t('dash.net_cashflow'),
      amount: financialSummary.netCashFlow,
      icon: ArrowUpDown,
      color: 'text-teal-600 dark:text-teal-400',
      bgColor: 'bg-teal-50 dark:bg-teal-950/40',
      borderColor: 'border-teal-200 dark:border-teal-800/40',
      change: cashFlowChange,
      isPositive: financialSummary.netCashFlow >= 0,
      showChange: financialSummary.prevMonthCashFlow !== 0,
    },
    {
      title: t('dash.available_balance'),
      amount: financialSummary.availableBalance,
      icon: Wallet,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950/40',
      borderColor: 'border-blue-200 dark:border-blue-800/40',
      subtitle: language === 'bn' ? 'সকল অ্যাকাউন্টের মোট জমা' : 'Across all accounts',
    },
    {
      title: t('dash.total_savings'),
      amount: financialSummary.totalSavings,
      icon: PiggyBank,
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-50 dark:bg-indigo-950/40',
      borderColor: 'border-indigo-200 dark:border-indigo-800/40',
      subtitle: language === 'bn' ? 'সঞ্চয় লক্ষ্যসমূহে জমা' : 'In savings goals',
    },
    {
      title: t('dash.remaining_budget'),
      amount: financialSummary.remainingBudget,
      icon: Target,
      color: financialSummary.remainingBudget < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400',
      bgColor: financialSummary.remainingBudget < 0 ? 'bg-rose-50 dark:bg-rose-950/40' : 'bg-amber-50 dark:bg-amber-950/40',
      borderColor: financialSummary.remainingBudget < 0 ? 'border-rose-200 dark:border-rose-800/40' : 'border-amber-200 dark:border-amber-800/40',
      subtitle: financialSummary.remainingBudget < 0
        ? (language === 'bn' ? 'বাজেট অতিরিক্ত খরচ!' : 'Over budget!')
        : (language === 'bn' ? 'চলতি মাসের বাকি বাজেট' : 'For this month'),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className={clsx(
              'relative flex flex-col justify-between rounded-2xl border p-4 shadow-sm transition-all hover:shadow-md dark:bg-gray-800/80',
              card.borderColor
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {card.title}
              </span>
              <div className={clsx('rounded-xl p-2', card.bgColor)}>
                <Icon className={clsx('h-4 w-4', card.color)} />
              </div>
            </div>

            <div className="mt-3">
              <div className="text-lg font-bold tracking-tight text-gray-900 dark:text-white sm:text-xl">
                {formatCurrency(card.amount)}
              </div>

              {card.showChange !== undefined && card.showChange ? (
                <div className="mt-1 flex items-center gap-1 text-xs font-medium">
                  {card.isPositive ? (
                    <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <ArrowDownRight className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                  )}
                  <span
                    className={
                      card.isPositive
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }
                  >
                    {Math.abs(card.change || 0).toFixed(1)}%
                  </span>
                  <span className="text-gray-400 dark:text-gray-500">vs last mo</span>
                </div>
              ) : (
                <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  {card.subtitle || 'Current period'}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
