import React, { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency, getDaysInMonth } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { subMonths, format, parseISO, getDate, getMonth, getYear } from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight, BarChart3, CalendarDays } from 'lucide-react';

const MONTH_NAMES_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const MONTH_NAMES_BN = [
  'জানুয়ারি',
  'ফেব্রুয়ারি',
  'মার্চ',
  'এপ্রিল',
  'মে',
  'জুন',
  'জুলাই',
  'আগস্ট',
  'সেপ্টেম্বর',
  'অক্টোবর',
  'নভেম্বর',
  'ডিসেম্বর',
];

export function IncomeExpenseChart() {
  const { transactions, selectedMonth, selectedYear, setSelectedMonth, setSelectedYear } = useData();
  const { language, t } = useLanguage();

  // Mode: 'monthly' (6 months comparison) or 'daily' (selected month daily breakdown)
  const [chartMode, setChartMode] = useState<'monthly' | 'daily'>('monthly');

  // Local month/year for the daily view (defaults to global selectedMonth/selectedYear)
  const [dailyMonth, setDailyMonth] = useState<number>(selectedMonth);
  const [dailyYear, setDailyYear] = useState<number>(selectedYear);

  // Sync with global month when global changes
  React.useEffect(() => {
    setDailyMonth(selectedMonth);
    setDailyYear(selectedYear);
  }, [selectedMonth, selectedYear]);

  // Labels
  const incomeLabel = language === 'bn' ? 'মোট আয়' : 'Income';
  const expenseLabel = language === 'bn' ? 'মোট খরচ' : 'Expense';

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. MONTHLY CHART DATA (Past 6 Months)
  // ─────────────────────────────────────────────────────────────────────────────
  const monthlyChartData = useMemo(() => {
    const currentDate = new Date(selectedYear, selectedMonth - 1, 1);
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(currentDate, i);
      months.push({
        key: format(d, 'yyyy-MM'),
        label: format(d, 'MMM yy'),
        income: 0,
        expense: 0,
      });
    }

    const monthMap = new Map<string, { income: number; expense: number }>();
    months.forEach((m) => monthMap.set(m.key, { income: 0, expense: 0 }));

    transactions.forEach((txn) => {
      try {
        const d = parseISO(txn.date);
        const key = format(d, 'yyyy-MM');
        if (monthMap.has(key)) {
          const entry = monthMap.get(key)!;
          const amt = Number(txn.amount);
          if (txn.type === 'income' || txn.type === 'refund') {
            entry.income += amt;
          } else if (txn.type === 'expense') {
            entry.expense += amt;
          }
        }
      } catch {
        // ignore parse errors
      }
    });

    return months.map((m) => {
      const entry = monthMap.get(m.key) || { income: 0, expense: 0 };
      return {
        name: m.label,
        [incomeLabel]: entry.income,
        [expenseLabel]: entry.expense,
      };
    });
  }, [transactions, selectedMonth, selectedYear, incomeLabel, expenseLabel]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. DAILY BREAKDOWN CHART DATA (For selected dailyMonth & dailyYear)
  // ─────────────────────────────────────────────────────────────────────────────
  const dailyChartData = useMemo(() => {
    const daysInMonth = getDaysInMonth(dailyYear, dailyMonth);
    const days = [];

    // Initialize all days of the month with 0
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        dayNum: day,
        dayStr: `${day < 10 ? '0' : ''}${day}`,
        fullDate: `${dailyYear}-${dailyMonth < 10 ? '0' : ''}${dailyMonth}-${day < 10 ? '0' : ''}${day}`,
        [incomeLabel]: 0,
        [expenseLabel]: 0,
      });
    }

    const dailyMap = new Map<number, { income: number; expense: number }>();
    for (let day = 1; day <= daysInMonth; day++) {
      dailyMap.set(day, { income: 0, expense: 0 });
    }

    transactions.forEach((txn) => {
      try {
        const d = parseISO(txn.date);
        const txnMonth = getMonth(d) + 1;
        const txnYear = getYear(d);
        const txnDay = getDate(d);

        if (txnMonth === dailyMonth && txnYear === dailyYear && dailyMap.has(txnDay)) {
          const entry = dailyMap.get(txnDay)!;
          const amt = Number(txn.amount);
          if (txn.type === 'income' || txn.type === 'refund') {
            entry.income += amt;
          } else if (txn.type === 'expense') {
            entry.expense += amt;
          }
        }
      } catch {
        // ignore parse errors
      }
    });

    return days.map((d) => {
      const entry = dailyMap.get(d.dayNum) || { income: 0, expense: 0 };
      return {
        name: d.dayStr,
        fullDate: d.fullDate,
        [incomeLabel]: entry.income,
        [expenseLabel]: entry.expense,
        net: entry.income - entry.expense,
      };
    });
  }, [transactions, dailyMonth, dailyYear, incomeLabel, expenseLabel]);

  // Month navigation helpers for daily view
  const handlePrevMonth = () => {
    if (dailyMonth === 1) {
      setDailyMonth(12);
      setDailyYear((y) => y - 1);
    } else {
      setDailyMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (dailyMonth === 12) {
      setDailyMonth(1);
      setDailyYear((y) => y + 1);
    } else {
      setDailyMonth((m) => m + 1);
    }
  };

  const currentMonthName =
    language === 'bn'
      ? `${MONTH_NAMES_BN[dailyMonth - 1]} ${dailyYear}`
      : `${MONTH_NAMES_EN[dailyMonth - 1]} ${dailyYear}`;

  // Totals for daily view header
  const totalDailyIncome = dailyChartData.reduce((acc, curr) => acc + (curr[incomeLabel] as number), 0);
  const totalDailyExpense = dailyChartData.reduce((acc, curr) => acc + (curr[expenseLabel] as number), 0);
  const totalDailyNet = totalDailyIncome - totalDailyExpense;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-gray-800 dark:bg-gray-800/90">
      {/* Header with Title and Mode Switcher */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              {t('dash.income_vs_expense')}
            </h3>
            <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-700 dark:bg-teal-950/50 dark:text-teal-300">
              {chartMode === 'monthly'
                ? language === 'bn'
                  ? 'মাসিক তুলনা'
                  : 'Monthly Overview'
                : language === 'bn'
                ? 'দৈনিক বিশ্লেষণ'
                : 'Daily Breakdown'}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {chartMode === 'monthly'
              ? language === 'bn'
                ? 'বিগত ৬ মাসের মাসিক আয় ও খরচের তুলনা'
                : 'Past 6 months income vs expenses comparison'
              : language === 'bn'
              ? `${currentMonthName}-এর প্রতিদিনের আয় ও খরচের বিস্তারিত হিসাব`
              : `Day-by-day income and expense breakdown for ${currentMonthName}`}
          </p>
        </div>

        {/* View Mode Toggle Pill */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-gray-200 bg-gray-50/90 p-0.5 text-xs font-semibold dark:border-gray-700 dark:bg-gray-900/50">
            <button
              type="button"
              onClick={() => setChartMode('monthly')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${
                chartMode === 'monthly'
                  ? 'bg-white text-gray-900 shadow-xs dark:bg-gray-700 dark:text-white'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>{language === 'bn' ? 'মাসিক' : 'Monthly'}</span>
            </button>

            <button
              type="button"
              onClick={() => setChartMode('daily')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${
                chartMode === 'daily'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              <span>{language === 'bn' ? 'দৈনিক চার্ট' : 'Daily Chart'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Month Selector for Daily View */}
      {chartMode === 'daily' && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-teal-100 bg-teal-50/50 p-3 dark:border-teal-950/40 dark:bg-teal-950/20">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevMonth}
              className="rounded-lg border border-gray-200 bg-white p-1 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              title="Previous Month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {/* Select Dropdown for Months */}
            <select
              value={dailyMonth}
              onChange={(e) => setDailyMonth(Number(e.target.value))}
              className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-900 shadow-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-hidden"
            >
              {(language === 'bn' ? MONTH_NAMES_BN : MONTH_NAMES_EN).map((name, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>

            {/* Select Dropdown for Years */}
            <select
              value={dailyYear}
              onChange={(e) => setDailyYear(Number(e.target.value))}
              className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-900 shadow-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-hidden"
            >
              {[2024, 2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            <button
              onClick={handleNextMonth}
              className="rounded-lg border border-gray-200 bg-white p-1 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              title="Next Month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Month Summary Metrics */}
          <div className="flex items-center gap-3 text-xs">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              +{formatCurrency(totalDailyIncome)}
            </span>
            <span className="font-semibold text-rose-600 dark:text-rose-400">
              -{formatCurrency(totalDailyExpense)}
            </span>
            <span className="font-bold text-teal-700 dark:text-teal-300">
              = {formatCurrency(totalDailyNet)}
            </span>
          </div>
        </div>
      )}

      {/* Chart Canvas */}
      <div className="h-68 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartMode === 'monthly' ? monthlyChartData : dailyChartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="incomeBarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
              </linearGradient>
              <linearGradient id="expenseBarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity={1} />
                <stop offset="100%" stopColor="#e11d48" stopOpacity={0.8} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.12} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: chartMode === 'daily' ? 10 : 11, fill: '#9ca3af' }}
              interval={chartMode === 'daily' ? 1 : 0}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const dataPoint = payload[0].payload;
                  const inc = dataPoint[incomeLabel] || 0;
                  const exp = dataPoint[expenseLabel] || 0;
                  const dateTitle =
                    chartMode === 'daily' && dataPoint.fullDate
                      ? `${dataPoint.fullDate}`
                      : `${label}`;

                  return (
                    <div className="rounded-xl border border-gray-700 bg-gray-900/95 p-3 text-xs text-white shadow-xl backdrop-blur-sm">
                      <div className="mb-2 font-bold text-gray-300 border-b border-gray-800 pb-1">
                        📅 {dateTitle}
                      </div>
                      <div className="flex items-center justify-between gap-4 py-0.5">
                        <span className="text-emerald-400 font-medium">● {incomeLabel}:</span>
                        <span className="font-bold text-emerald-400">+{formatCurrency(inc)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 py-0.5">
                        <span className="text-rose-400 font-medium">● {expenseLabel}:</span>
                        <span className="font-bold text-rose-400">-{formatCurrency(exp)}</span>
                      </div>
                      {chartMode === 'daily' && (
                        <div className="mt-1 flex items-center justify-between gap-4 border-t border-gray-800 pt-1">
                          <span className="text-teal-300 font-semibold"> নীট:</span>
                          <span className="font-bold text-teal-300">
                            {formatCurrency(inc - exp)}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              }}
              cursor={{ fill: 'rgba(107, 114, 128, 0.08)' }}
            />
            <Legend
              wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
              iconType="circle"
            />
            <Bar
              dataKey={incomeLabel}
              fill="url(#incomeBarGrad)"
              radius={[4, 4, 0, 0]}
              maxBarSize={chartMode === 'daily' ? 14 : 32}
            />
            <Bar
              dataKey={expenseLabel}
              fill="url(#expenseBarGrad)"
              radius={[4, 4, 0, 0]}
              maxBarSize={chartMode === 'daily' ? 14 : 32}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
