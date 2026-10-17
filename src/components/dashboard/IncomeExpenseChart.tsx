import React, { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency, getDaysInMonth } from '@/lib/utils';
import { calculateSavingsRate } from '@/lib/calculations';
import {
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  subMonths,
  subWeeks,
  format,
  parseISO,
  getDate,
  getMonth,
  getYear,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  CalendarDays,
  CalendarRange,
  Layers,
  Sparkles,
} from 'lucide-react';

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

type PeriodMode = 'daily' | 'weekly' | 'monthly' | 'yearly';

export function IncomeExpenseChart() {
  const { transactions, selectedMonth, selectedYear } = useData();
  const { language, t } = useLanguage();

  // Active period mode: daily, weekly, monthly, yearly
  const [periodMode, setPeriodMode] = useState<PeriodMode>('monthly');

  // Toggle third series: Net Savings / Cash Flow
  const [showNetSavings, setShowNetSavings] = useState(true);

  // Range for monthly view: 6 months or 12 months
  const [monthlySpan, setMonthlySpan] = useState<6 | 12>(6);

  // Local month/year for daily view
  const [dailyMonth, setDailyMonth] = useState<number>(selectedMonth);
  const [dailyYear, setDailyYear] = useState<number>(selectedYear);

  React.useEffect(() => {
    setDailyMonth(selectedMonth);
    setDailyYear(selectedYear);
  }, [selectedMonth, selectedYear]);

  // Dynamic series labels based on language
  const incomeLabel = language === 'bn' ? 'মোট আয়' : 'Income';
  const expenseLabel = language === 'bn' ? 'মোট খরচ' : 'Expense';
  const netLabel = language === 'bn' ? 'নীট সঞ্চয়' : 'Net Savings';

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. DAILY CHART DATA (Day-by-Day for selected month)
  // ─────────────────────────────────────────────────────────────────────────────
  const dailyChartData = useMemo(() => {
    const daysInMonth = getDaysInMonth(dailyYear, dailyMonth);
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
        // ignore invalid dates
      }
    });

    const result = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const entry = dailyMap.get(day) || { income: 0, expense: 0 };
      const dayStr = `${day < 10 ? '0' : ''}${day}`;
      const fullDate = `${dailyYear}-${dailyMonth < 10 ? '0' : ''}${dailyMonth}-${dayStr}`;
      result.push({
        name: dayStr,
        fullDate,
        [incomeLabel]: entry.income,
        [expenseLabel]: entry.expense,
        [netLabel]: entry.income - entry.expense,
      });
    }
    return result;
  }, [transactions, dailyMonth, dailyYear, incomeLabel, expenseLabel, netLabel]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. WEEKLY CHART DATA (Past 8 Weeks)
  // ─────────────────────────────────────────────────────────────────────────────
  const weeklyChartData = useMemo(() => {
    const weeks: Array<{
      label: string;
      fullLabel: string;
      startStr: string;
      endStr: string;
      income: number;
      expense: number;
    }> = [];
    const now = new Date();
    for (let i = 7; i >= 0; i--) {
      const targetDate = subWeeks(now, i);
      const start = startOfWeek(targetDate, { weekStartsOn: 1 });
      const end = endOfWeek(targetDate, { weekStartsOn: 1 });
      weeks.push({
        label: `${format(start, 'dd MMM')}`,
        fullLabel: `${format(start, 'dd MMM')} - ${format(end, 'dd MMM')}`,
        startStr: format(start, 'yyyy-MM-dd'),
        endStr: format(end, 'yyyy-MM-dd'),
        income: 0,
        expense: 0,
      });
    }

    transactions.forEach((txn) => {
      try {
        const dateStr = txn.date;
        const amt = Number(txn.amount);
        for (const wk of weeks) {
          if (dateStr >= wk.startStr && dateStr <= wk.endStr) {
            if (txn.type === 'income' || txn.type === 'refund') {
              wk.income += amt;
            } else if (txn.type === 'expense') {
              wk.expense += amt;
            }
            break;
          }
        }
      } catch {
        // ignore
      }
    });

    return weeks.map((w) => ({
      name: w.label,
      fullLabel: w.fullLabel,
      [incomeLabel]: w.income,
      [expenseLabel]: w.expense,
      [netLabel]: w.income - w.expense,
    }));
  }, [transactions, incomeLabel, expenseLabel, netLabel]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. MONTHLY CHART DATA (Past 6 or 12 Months)
  // ─────────────────────────────────────────────────────────────────────────────
  const monthlyChartData = useMemo(() => {
    const currentDate = new Date(selectedYear, selectedMonth - 1, 1);
    const months = [];
    const span = monthlySpan;
    for (let i = span - 1; i >= 0; i--) {
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
        // ignore
      }
    });

    return months.map((m) => {
      const entry = monthMap.get(m.key) || { income: 0, expense: 0 };
      return {
        name: m.label,
        [incomeLabel]: entry.income,
        [expenseLabel]: entry.expense,
        [netLabel]: entry.income - entry.expense,
      };
    });
  }, [transactions, selectedMonth, selectedYear, monthlySpan, incomeLabel, expenseLabel, netLabel]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. YEARLY CHART DATA (All Years with Data)
  // ─────────────────────────────────────────────────────────────────────────────
  const yearlyChartData = useMemo(() => {
    const yearsSet = new Set<number>();
    const currentYear = new Date().getFullYear();
    yearsSet.add(currentYear);
    yearsSet.add(currentYear - 1);
    yearsSet.add(currentYear - 2);

    transactions.forEach((txn) => {
      try {
        const d = parseISO(txn.date);
        yearsSet.add(getYear(d));
      } catch {
        // ignore
      }
    });

    const sortedYears = Array.from(yearsSet).sort((a, b) => a - b);
    const yearMap = new Map<number, { income: number; expense: number }>();
    sortedYears.forEach((y) => yearMap.set(y, { income: 0, expense: 0 }));

    transactions.forEach((txn) => {
      try {
        const d = parseISO(txn.date);
        const y = getYear(d);
        if (yearMap.has(y)) {
          const entry = yearMap.get(y)!;
          const amt = Number(txn.amount);
          if (txn.type === 'income' || txn.type === 'refund') {
            entry.income += amt;
          } else if (txn.type === 'expense') {
            entry.expense += amt;
          }
        }
      } catch {
        // ignore
      }
    });

    return sortedYears.map((y) => {
      const entry = yearMap.get(y) || { income: 0, expense: 0 };
      return {
        name: String(y),
        [incomeLabel]: entry.income,
        [expenseLabel]: entry.expense,
        [netLabel]: entry.income - entry.expense,
      };
    });
  }, [transactions, incomeLabel, expenseLabel, netLabel]);

  // Current active dataset
  const activeChartData = useMemo(() => {
    switch (periodMode) {
      case 'daily':
        return dailyChartData;
      case 'weekly':
        return weeklyChartData;
      case 'yearly':
        return yearlyChartData;
      case 'monthly':
      default:
        return monthlyChartData;
    }
  }, [periodMode, dailyChartData, weeklyChartData, monthlyChartData, yearlyChartData]);

  // Aggregate totals for the active view
  const totals = useMemo(() => {
    let inc = 0;
    let exp = 0;
    activeChartData.forEach((item) => {
      inc += (item[incomeLabel] as number) || 0;
      exp += (item[expenseLabel] as number) || 0;
    });
    return {
      income: inc,
      expense: exp,
      net: inc - exp,
      savingsRate: calculateSavingsRate(inc, exp),
    };
  }, [activeChartData, incomeLabel, expenseLabel]);

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

  const hasData = totals.income > 0 || totals.expense > 0;

  return (
    <div className="w-full max-w-full min-w-0 overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-gray-800 dark:bg-gray-800/90">
      {/* Top Header: Title, Period Mode Badge, & Description */}
      <div className="mb-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            {t('dash.income_vs_expense')}
          </h3>
          <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-[10px] font-semibold text-teal-700 dark:bg-teal-950/50 dark:text-teal-300">
            {periodMode === 'daily'
              ? language === 'bn' ? 'দৈনিক' : 'Daily'
              : periodMode === 'weekly'
              ? language === 'bn' ? 'সাপ্তাহিক' : 'Weekly'
              : periodMode === 'yearly'
              ? language === 'bn' ? 'বার্ষিক' : 'Yearly'
              : language === 'bn' ? 'মাসিক' : 'Monthly'}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          {periodMode === 'daily'
            ? language === 'bn'
              ? `${currentMonthName}-এর দিনভিত্তিক আয় ও খরচের হিসাব`
              : `Day-by-day income and expenses for ${currentMonthName}`
            : periodMode === 'weekly'
            ? language === 'bn'
              ? 'বিগত ৮ সপ্তাহের আয় ও ব্যয়ের গতিপ্রকৃতি'
              : 'Weekly income vs expenses across past 8 weeks'
            : periodMode === 'yearly'
            ? language === 'bn'
              ? 'বছরভিত্তিক সামগ্রিক আয় ও খরচের তুলনা'
              : 'Year-by-year income vs expenses comparison'
            : language === 'bn'
            ? `বিগত ${monthlySpan} মাসের আয়, ব্যয় ও সঞ্চয় তুলনা`
            : `Income, expenses, and savings across past ${monthlySpan} months`}
        </p>
      </div>

      {/* Controls Toolbar: Time Frame Switcher, Monthly Span, & Net Savings Line Toggle */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Time Frame selector */}
          <div className="flex rounded-xl border border-gray-200 bg-gray-50/90 p-0.5 text-xs font-semibold dark:border-gray-700 dark:bg-gray-900/50">
            {(['daily', 'weekly', 'monthly', 'yearly'] as PeriodMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setPeriodMode(mode)}
                className={`rounded-lg px-2.5 py-1 text-xs transition-all ${
                  periodMode === mode
                    ? 'bg-teal-600 text-white shadow-xs font-bold'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                {mode === 'daily'
                  ? language === 'bn' ? 'দৈনিক' : 'Daily'
                  : mode === 'weekly'
                  ? language === 'bn' ? 'সাপ্তাহিক' : 'Weekly'
                  : mode === 'monthly'
                  ? language === 'bn' ? 'মাসিক' : 'Monthly'
                  : language === 'bn' ? 'বার্ষিক' : 'Yearly'}
              </button>
            ))}
          </div>

          {/* Monthly Span Switcher (6M / 12M) */}
          {periodMode === 'monthly' && (
            <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-50/90 p-0.5 text-xs font-semibold dark:border-gray-700 dark:bg-gray-900/50">
              <button
                type="button"
                onClick={() => setMonthlySpan(6)}
                className={`rounded-lg px-2 py-1 text-xs transition-all ${
                  monthlySpan === 6
                    ? 'bg-teal-600 text-white shadow-xs font-bold'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                6 {language === 'bn' ? 'মাস' : 'Mo'}
              </button>
              <button
                type="button"
                onClick={() => setMonthlySpan(12)}
                className={`rounded-lg px-2 py-1 text-xs transition-all ${
                  monthlySpan === 12
                    ? 'bg-teal-600 text-white shadow-xs font-bold'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                12 {language === 'bn' ? 'মাস' : 'Mo'}
              </button>
            </div>
          )}
        </div>

        {/* Toggle Line / Net Savings Series */}
        <button
          type="button"
          onClick={() => setShowNetSavings(!showNetSavings)}
          className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-semibold transition-all shrink-0 ${
            showNetSavings
              ? 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300'
              : 'border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400'
          }`}
          title="Toggle Net Savings Series"
        >
          <span
            className={`h-2 w-2 rounded-full ${
              showNetSavings ? 'bg-indigo-500' : 'bg-gray-400'
            }`}
          />
          <span>{language === 'bn' ? 'নীট সঞ্চয় লাইন' : 'Net Savings Line'}</span>
        </button>
      </div>

      {/* Daily Month/Year Navigator (Only in Daily view) */}
      {periodMode === 'daily' && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-xl border border-teal-100 bg-teal-50/50 p-1.5 dark:border-teal-950/40 dark:bg-teal-950/20">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="rounded-lg border border-gray-200 bg-white p-1 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              title="Previous Month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <select
              value={dailyMonth}
              onChange={(e) => setDailyMonth(Number(e.target.value))}
              className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-900 shadow-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              {(language === 'bn' ? MONTH_NAMES_BN : MONTH_NAMES_EN).map((name, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>

            <select
              value={dailyYear}
              onChange={(e) => setDailyYear(Number(e.target.value))}
              className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-900 shadow-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              {[2023, 2024, 2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleNextMonth}
              className="rounded-lg border border-gray-200 bg-white p-1 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              title="Next Month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Dedicated Responsive Totals Summary Strip */}
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-gray-100 bg-gray-50/80 px-3.5 py-2.5 text-xs dark:border-gray-800 dark:bg-gray-900/60">
        {/* Total Income */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
            {language === 'bn' ? 'মোট আয়:' : 'Total Income:'}
          </span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400">
            +{formatCurrency(totals.income)}
          </span>
        </div>

        {/* Total Expense */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
            {language === 'bn' ? 'মোট ব্যয়:' : 'Total Expense:'}
          </span>
          <span className="font-bold text-rose-600 dark:text-rose-400">
            -{formatCurrency(totals.expense)}
          </span>
        </div>

        {/* Net Total */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
            {language === 'bn' ? 'নীট ব্যালেন্স:' : 'Net Total:'}
          </span>
          <span
            className={`font-bold ${
              totals.net >= 0
                ? 'text-teal-700 dark:text-teal-300'
                : 'text-amber-600 dark:text-amber-400'
            }`}
          >
            {totals.net >= 0 ? '+' : ''}{formatCurrency(totals.net)}
          </span>
        </div>

        {/* Savings Rate */}
        {totals.income > 0 && (
          <div className="sm:ml-auto flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
            <span>{language === 'bn' ? 'সঞ্চয় হার:' : 'Savings Rate:'}</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">
              {totals.savingsRate}%
            </span>
          </div>
        )}
      </div>

      {/* Chart Canvas or Empty State */}
      {!hasData ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-6 text-center dark:border-gray-700 dark:bg-gray-900/30">
          <BarChart3 className="mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">
            {language === 'bn' ? 'নির্বাচিত সময়ে কোনো লেনদেন নেই' : 'No transactions recorded for this period'}
          </p>
          <p className="mt-0.5 text-[11px] text-gray-400">
            {language === 'bn'
              ? 'নতুন আয় বা খরচের হিসাব যোগ করলে চার্টটি স্বয়ংক্রিয়ভাবে আপডেট হবে।'
              : 'Add an income or expense transaction to see your financial trends.'}
          </p>
        </div>
      ) : (
        <div className="h-68 w-full min-w-0 overflow-hidden">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={activeChartData}
              margin={{ top: 12, right: 12, left: -16, bottom: 0 }}
            >
              <defs>
                {/* Income Gradient */}
                <linearGradient id="modernIncomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={0.85} />
                </linearGradient>
                {/* Expense Gradient */}
                <linearGradient id="modernExpenseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity={1} />
                  <stop offset="100%" stopColor="#e11d48" stopOpacity={0.85} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#374151"
                opacity={0.12}
              />

              <XAxis
                dataKey="name"
                tick={{ fontSize: periodMode === 'daily' ? 10 : 11, fill: '#9ca3af' }}
                interval={periodMode === 'daily' ? 1 : 0}
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
              />

              <ReferenceLine y={0} stroke="#9ca3af" strokeWidth={1} strokeOpacity={0.4} />

              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const dataPoint = payload[0].payload;
                    const inc = Number(dataPoint[incomeLabel]) || 0;
                    const exp = Number(dataPoint[expenseLabel]) || 0;
                    const net = inc - exp;
                    const savingsRate = calculateSavingsRate(inc, exp);
                    const title =
                      dataPoint.fullDate ||
                      dataPoint.fullLabel ||
                      label;

                    return (
                      <div className="rounded-xl border border-gray-700 bg-gray-900/95 p-3 text-xs text-white shadow-xl backdrop-blur-md">
                        <div className="mb-2 border-b border-gray-800 pb-1 font-bold text-gray-200">
                          📅 {title}
                        </div>
                        <div className="flex items-center justify-between gap-4 py-0.5">
                          <span className="flex items-center gap-1.5 font-medium text-emerald-400">
                            <span className="h-2 w-2 rounded-full bg-emerald-400" />
                            {incomeLabel}:
                          </span>
                          <span className="font-bold text-emerald-400">
                            +{formatCurrency(inc)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4 py-0.5">
                          <span className="flex items-center gap-1.5 font-medium text-rose-400">
                            <span className="h-2 w-2 rounded-full bg-rose-400" />
                            {expenseLabel}:
                          </span>
                          <span className="font-bold text-rose-400">
                            -{formatCurrency(exp)}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-4 border-t border-gray-800 pt-1">
                          <span className="flex items-center gap-1.5 font-semibold text-indigo-300">
                            <span className="h-2 w-2 rounded-full bg-indigo-400" />
                            {netLabel}:
                          </span>
                          <span
                            className={`font-bold ${
                              net >= 0 ? 'text-indigo-300' : 'text-amber-400'
                            }`}
                          >
                            {formatCurrency(net)}
                          </span>
                        </div>
                        {inc > 0 && (
                          <div className="mt-1 flex items-center justify-between gap-4 text-[10px] text-gray-400">
                            <span>{language === 'bn' ? 'সঞ্চয়ের হার:' : 'Savings Rate:'}</span>
                            <span className="font-semibold text-teal-300">{savingsRate}%</span>
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
                fill="url(#modernIncomeGrad)"
                radius={[4, 4, 0, 0]}
                maxBarSize={periodMode === 'daily' ? 12 : 24}
              />

              <Bar
                dataKey={expenseLabel}
                fill="url(#modernExpenseGrad)"
                radius={[4, 4, 0, 0]}
                maxBarSize={periodMode === 'daily' ? 12 : 24}
              />

              {showNetSavings && (
                <Line
                  type="monotone"
                  dataKey={netLabel}
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  dot={{ r: periodMode === 'daily' ? 1.5 : 3, fill: '#6366f1' }}
                  activeDot={{ r: 5 }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
