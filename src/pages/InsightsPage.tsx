import { useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { formatCurrency } from '@/lib/utils';
import { generateInsights } from '@/lib/insights';
import { MonthSelector } from '@/components/dashboard/MonthSelector';
import {
  Lightbulb,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Info,
  Calendar,
  Sparkles,
  PieChart,
  Target,
  ArrowUpRight,
} from 'lucide-react';
import clsx from 'clsx';

export default function InsightsPage() {
  const { transactions, budgets, categories, selectedMonth, selectedYear } = useData();

  const insights = useMemo(() => {
    return generateInsights(transactions, budgets, categories, {
      month: selectedMonth,
      year: selectedYear,
    });
  }, [transactions, budgets, categories, selectedMonth, selectedYear]);

  // Compute forecast
  const currentMonthTransactions = transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
  });

  const spentSoFar = currentMonthTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const today = new Date();
  const currentDay =
    today.getMonth() + 1 === selectedMonth && today.getFullYear() === selectedYear
      ? today.getDate()
      : daysInMonth;

  const dailyAvg = currentDay > 0 ? spentSoFar / currentDay : 0;
  const estimatedEndOfMonth = dailyAvg * daysInMonth;

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-emerald-500" />;
      case 'tip':
        return <Sparkles className="h-5 w-5 text-indigo-500" />;
      default:
        return <Info className="h-5 w-5 text-teal-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
              Smart Financial Insights
            </h1>
            <Sparkles className="h-5 w-5 text-teal-500" />
          </div>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Real automated observations and smart recommendations based on your records.
          </p>
        </div>

        <MonthSelector />
      </div>

      {/* Spending Forecast Card */}
      <div className="rounded-2xl border border-teal-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800/90">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Smart Spending Forecast
            </h3>
          </div>
          <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
            Estimate
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-700 dark:bg-gray-750">
            <span className="text-xs text-gray-400">Actual Spending to Date</span>
            <div className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(spentSoFar)}
            </div>
            <p className="mt-1 text-[11px] text-gray-400">
              Through day {currentDay} of {daysInMonth}
            </p>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-700 dark:bg-gray-750">
            <span className="text-xs text-gray-400">Estimated Month-End Spending</span>
            <div className="mt-1 text-xl font-bold text-teal-600 dark:text-teal-400">
              {formatCurrency(estimatedEndOfMonth)}
            </div>
            <p className="mt-1 text-[11px] text-gray-400">
              Based on {formatCurrency(dailyAvg)}/day pace
            </p>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-700 dark:bg-gray-750">
            <span className="text-xs text-gray-400">Average Daily Spending</span>
            <div className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(dailyAvg)}
            </div>
            <p className="mt-1 text-[11px] text-gray-400">
              Weekly average: ~{formatCurrency(dailyAvg * 7)}
            </p>
          </div>
        </div>

        <p className="mt-4 text-[11px] text-gray-400 italic">
          * Forecasts are mathematical projections based on daily velocity. They are designed to assist budgeting, not guarantee future outcomes.
        </p>
      </div>

      {/* Generated Insights Grid */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Key Observations & Advice
        </h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {insights.map((insight) => (
            <div
              key={insight.id}
              className={clsx(
                'flex items-start gap-4 rounded-2xl border p-5 shadow-xs transition-all hover:shadow-sm dark:bg-gray-800/90',
                insight.type === 'warning' && 'border-amber-200 bg-amber-50/30 dark:border-amber-900/40',
                insight.type === 'success' && 'border-emerald-200 bg-emerald-50/30 dark:border-emerald-900/40',
                insight.type === 'tip' && 'border-indigo-200 bg-indigo-50/30 dark:border-indigo-900/40',
                insight.type === 'info' && 'border-gray-100 bg-white dark:border-gray-800'
              )}
            >
              <div className="mt-0.5 rounded-xl bg-white p-2 shadow-xs dark:bg-gray-700">
                {getInsightIcon(insight.type)}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {insight.title}
                  </h4>
                  {insight.value && (
                    <span className="rounded bg-teal-50 px-1.5 py-0.5 text-[11px] font-bold text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
                      {insight.value}
                    </span>
                  )}
                </div>
                <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-300">
                  {insight.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
