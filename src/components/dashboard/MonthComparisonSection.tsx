import React, { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency } from '@/lib/utils';
import { calculateSavingsRate, calculateMonthComparison } from '@/lib/calculations';
import {
  BarChart,
  Bar,
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
  format,
  parseISO,
  getYear,
  getMonth,
} from 'date-fns';
import {
  CalendarRange,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  GitCompare,
  PiggyBank,
  Wallet,
  Scale,
} from 'lucide-react';

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTH_NAMES_BN = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর',
];

type ComparisonMode = 'trend' | 'sideBySide';

export function MonthComparisonSection() {
  const { transactions, selectedMonth, selectedYear } = useData();
  const { language } = useLanguage();

  const [mode, setMode] = useState<ComparisonMode>('trend');
  const [trendMonths, setTrendMonths] = useState<6 | 12>(6);

  // For Side-by-Side mode: Month A (current) and Month B (comparison)
  const [monthA, setMonthA] = useState({ month: selectedMonth, year: selectedYear });
  const [monthB, setMonthB] = useState(() => {
    const prev = subMonths(new Date(selectedYear, selectedMonth - 1, 1), 1);
    return { month: getMonth(prev) + 1, year: getYear(prev) };
  });

  React.useEffect(() => {
    setMonthA({ month: selectedMonth, year: selectedYear });
    const prev = subMonths(new Date(selectedYear, selectedMonth - 1, 1), 1);
    setMonthB({ month: getMonth(prev) + 1, year: getYear(prev) });
  }, [selectedMonth, selectedYear]);

  // Dynamic series labels
  const incomeLabel = language === 'bn' ? 'আয়' : 'Income';
  const expenseLabel = language === 'bn' ? 'খরচ' : 'Expense';
  const savingsLabel = language === 'bn' ? 'সঞ্চয়' : 'Savings';

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. CHRONOLOGICAL MULTI-MONTH DATA (Last 6 or 12 Months)
  // ─────────────────────────────────────────────────────────────────────────────
  const monthlyTimeline = useMemo(() => {
    const currentDate = new Date(selectedYear, selectedMonth - 1, 1);
    const months = [];
    const count = trendMonths;

    for (let i = count - 1; i >= 0; i--) {
      const d = subMonths(currentDate, i);
      const mNum = getMonth(d) + 1;
      const yNum = getYear(d);
      months.push({
        key: format(d, 'yyyy-MM'),
        label: format(d, 'MMM yy'),
        fullLabel: language === 'bn' ? `${MONTH_NAMES_BN[mNum - 1]} ${yNum}` : `${MONTH_NAMES_EN[mNum - 1]} ${yNum}`,
        monthNum: mNum,
        yearNum: yNum,
        income: 0,
        expense: 0,
      });
    }

    const monthMap = new Map<string, { income: number; expense: number }>();
    months.forEach((m) => monthMap.set(m.key, { income: 0, expense: 0 }));

    transactions.forEach((txn) => {
      try {
        if (txn.type === 'transfer') return; // exclude transfers
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

    return months.map((m, idx, arr) => {
      const entry = monthMap.get(m.key) || { income: 0, expense: 0 };
      const net = entry.income - entry.expense;
      const prev = idx > 0 ? arr[idx - 1] : null;
      const prevEntry = prev ? monthMap.get(prev.key) : null;

      const incChange = prevEntry ? calculateMonthComparison(entry.income, prevEntry.income) : 0;
      const expChange = prevEntry ? calculateMonthComparison(entry.expense, prevEntry.expense) : 0;
      const netChange = prevEntry
        ? calculateMonthComparison(net, prevEntry.income - prevEntry.expense)
        : 0;

      return {
        key: m.key,
        name: m.label,
        fullLabel: m.fullLabel,
        [incomeLabel]: entry.income,
        [expenseLabel]: entry.expense,
        [savingsLabel]: net,
        savingsRate: calculateSavingsRate(entry.income, entry.expense),
        incChange,
        expChange,
        netChange,
      };
    });
  }, [transactions, selectedMonth, selectedYear, trendMonths, language, incomeLabel, expenseLabel, savingsLabel]);

  // Current focus month (the last element of monthlyTimeline)
  const currentMonthData = monthlyTimeline[monthlyTimeline.length - 1];

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. DIRECT SIDE-BY-SIDE DATA (Month A vs Month B)
  // ─────────────────────────────────────────────────────────────────────────────
  const sideBySideData = useMemo(() => {
    const calcMonth = (m: number, y: number) => {
      let income = 0;
      let expense = 0;
      transactions.forEach((txn) => {
        try {
          if (txn.type === 'transfer') return;
          const d = parseISO(txn.date);
          if (getMonth(d) + 1 === m && getYear(d) === y) {
            const amt = Number(txn.amount);
            if (txn.type === 'income' || txn.type === 'refund') income += amt;
            else if (txn.type === 'expense') expense += amt;
          }
        } catch {
          // ignore
        }
      });
      return {
        income,
        expense,
        savings: income - expense,
        savingsRate: calculateSavingsRate(income, expense),
      };
    };

    const dataA = calcMonth(monthA.month, monthA.year);
    const dataB = calcMonth(monthB.month, monthB.year);

    const labelA = language === 'bn'
      ? `${MONTH_NAMES_BN[monthA.month - 1]} ${monthA.year}`
      : `${MONTH_NAMES_EN[monthA.month - 1]} ${monthA.year}`;

    const labelB = language === 'bn'
      ? `${MONTH_NAMES_BN[monthB.month - 1]} ${monthB.year}`
      : `${MONTH_NAMES_EN[monthB.month - 1]} ${monthB.year}`;

    // Differences: Month A vs Month B
    const incDiff = dataA.income - dataB.income;
    const expDiff = dataA.expense - dataB.expense;
    const savDiff = dataA.savings - dataB.savings;

    const incPct = calculateMonthComparison(dataA.income, dataB.income);
    const expPct = calculateMonthComparison(dataA.expense, dataB.expense);
    const savPct = calculateMonthComparison(dataA.savings, dataB.savings);

    const chartPoints = [
      {
        name: labelB,
        [incomeLabel]: dataB.income,
        [expenseLabel]: dataB.expense,
        [savingsLabel]: dataB.savings,
      },
      {
        name: labelA,
        [incomeLabel]: dataA.income,
        [expenseLabel]: dataA.expense,
        [savingsLabel]: dataA.savings,
      },
    ];

    return {
      labelA,
      labelB,
      dataA,
      dataB,
      incDiff,
      expDiff,
      savDiff,
      incPct,
      expPct,
      savPct,
      chartPoints,
    };
  }, [transactions, monthA, monthB, language, incomeLabel, expenseLabel, savingsLabel]);

  // Year options for dropdown
  const yearOptions = [2024, 2025, 2026, 2027, 2028];

  return (
    <div className="w-full max-w-full min-w-0 overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-gray-800 dark:bg-gray-800/90">
      {/* Header */}
      <div className="mb-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
            <GitCompare className="h-4 w-4" />
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            {language === 'bn' ? 'মাসিক তুলনা' : 'Month-to-Month Comparison'}
          </h3>
          <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
            {mode === 'trend'
              ? language === 'bn' ? 'ধারাবাহিক ট্রেন্ড' : 'Trend Analysis'
              : language === 'bn' ? 'মুখোমুখি তুলনা' : 'Side-by-Side'}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          {mode === 'trend'
            ? language === 'bn'
              ? 'বিগত মাসগুলোর সাথে আয়, ব্যয় ও সঞ্চয়ের শতাংশিক পরিবর্তন'
              : 'Month-over-month growth, expense fluctuations, and net savings rate'
            : language === 'bn'
            ? `${sideBySideData.labelA} বনাম ${sideBySideData.labelB}-এর সরাসরি অর্থনৈতিক পার্থক্য`
            : `Direct comparison between ${sideBySideData.labelA} and ${sideBySideData.labelB}`}
        </p>
      </div>

      {/* View Toggle Pill */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl border border-gray-200 bg-gray-50/90 p-0.5 text-xs font-semibold dark:border-gray-700 dark:bg-gray-900/50">
          <button
            type="button"
            onClick={() => setMode('trend')}
            className={`rounded-lg px-2.5 py-1 text-xs transition-all ${
              mode === 'trend'
                ? 'bg-indigo-600 text-white shadow-xs font-bold'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            {language === 'bn' ? 'মাসিক ট্রেন্ড' : 'Monthly Trend'}
          </button>
          <button
            type="button"
            onClick={() => setMode('sideBySide')}
            className={`rounded-lg px-2.5 py-1 text-xs transition-all ${
              mode === 'sideBySide'
                ? 'bg-indigo-600 text-white shadow-xs font-bold'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            {language === 'bn' ? 'মুখোমুখি তুলনা' : 'Compare 2 Months'}
          </button>
        </div>
      </div>

      {/* Mode 1: Month vs Month Pickers */}
      {mode === 'sideBySide' && (
        <div className="mb-5 grid grid-cols-1 gap-3 rounded-xl border border-indigo-100 bg-indigo-50/40 p-3.5 dark:border-indigo-950/40 dark:bg-indigo-950/20 sm:grid-cols-2">
          {/* Target Month A */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
              {language === 'bn' ? 'মূল মাস (A):' : 'Month A:'}
            </span>
            <select
              value={monthA.month}
              onChange={(e) => setMonthA((prev) => ({ ...prev, month: Number(e.target.value) }))}
              className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              {(language === 'bn' ? MONTH_NAMES_BN : MONTH_NAMES_EN).map((n, i) => (
                <option key={i + 1} value={i + 1}>
                  {n}
                </option>
              ))}
            </select>
            <select
              value={monthA.year}
              onChange={(e) => setMonthA((prev) => ({ ...prev, year: Number(e.target.value) }))}
              className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Comparison Month B */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
              {language === 'bn' ? 'তুলনার মাস (B):' : 'Compare With (B):'}
            </span>
            <select
              value={monthB.month}
              onChange={(e) => setMonthB((prev) => ({ ...prev, month: Number(e.target.value) }))}
              className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              {(language === 'bn' ? MONTH_NAMES_BN : MONTH_NAMES_EN).map((n, i) => (
                <option key={i + 1} value={i + 1}>
                  {n}
                </option>
              ))}
            </select>
            <select
              value={monthB.year}
              onChange={(e) => setMonthB((prev) => ({ ...prev, year: Number(e.target.value) }))}
              className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Mode 2: Trend Duration Buttons */}
      {mode === 'trend' && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
            <span>{language === 'bn' ? 'পর্যবেক্ষণ সীমা:' : 'Display Span:'}</span>
            <button
              type="button"
              onClick={() => setTrendMonths(6)}
              className={`rounded-md px-2 py-0.5 font-semibold transition ${
                trendMonths === 6
                  ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200'
                  : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              6 {language === 'bn' ? 'মাস' : 'Months'}
            </button>
            <button
              type="button"
              onClick={() => setTrendMonths(12)}
              className={`rounded-md px-2 py-0.5 font-semibold transition ${
                trendMonths === 12
                  ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200'
                  : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              12 {language === 'bn' ? 'মাস' : 'Months'}
            </button>
          </div>

          {currentMonthData && (
            <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
              {language === 'bn' ? 'বর্তমান মাস:' : 'Current Focus:'}{' '}
              <span className="font-bold text-gray-900 dark:text-white">
                {currentMonthData.fullLabel}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Summary Cards: MoM Comparison Metrics */}
      {mode === 'trend' && currentMonthData && (
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {/* Income Comparison */}
          <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3 dark:border-gray-700/60 dark:bg-gray-900/40">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {incomeLabel} ({currentMonthData.name})
            </div>
            <div className="mt-1 text-base font-bold text-gray-900 dark:text-white sm:text-lg">
              {formatCurrency(Number(currentMonthData[incomeLabel]) || 0)}
            </div>
            <div className="mt-0.5 flex items-center gap-1 text-[11px]">
              {currentMonthData.incChange >= 0 ? (
                <span className="flex items-center font-semibold text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="mr-0.5 h-3 w-3" /> +{currentMonthData.incChange}%
                </span>
              ) : (
                <span className="flex items-center font-semibold text-rose-500">
                  <TrendingDown className="mr-0.5 h-3 w-3" /> {currentMonthData.incChange}%
                </span>
              )}
              <span className="text-gray-400">{language === 'bn' ? 'আগের মাস হতে' : 'vs last mo'}</span>
            </div>
          </div>

          {/* Expense Comparison */}
          <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3 dark:border-gray-700/60 dark:bg-gray-900/40">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {expenseLabel} ({currentMonthData.name})
            </div>
            <div className="mt-1 text-base font-bold text-gray-900 dark:text-white sm:text-lg">
              {formatCurrency(Number(currentMonthData[expenseLabel]) || 0)}
            </div>
            <div className="mt-0.5 flex items-center gap-1 text-[11px]">
              {currentMonthData.expChange <= 0 ? (
                <span className="flex items-center font-semibold text-emerald-600 dark:text-emerald-400">
                  <TrendingDown className="mr-0.5 h-3 w-3" /> {currentMonthData.expChange}%
                </span>
              ) : (
                <span className="flex items-center font-semibold text-rose-500">
                  <TrendingUp className="mr-0.5 h-3 w-3" /> +{currentMonthData.expChange}%
                </span>
              )}
              <span className="text-gray-400">
                {currentMonthData.expChange <= 0
                  ? language === 'bn' ? 'খরচ হ্রাস (ভালো)' : 'less spent'
                  : language === 'bn' ? 'খরচ বৃদ্ধি' : 'more spent'}
              </span>
            </div>
          </div>

          {/* Net Savings */}
          <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3 dark:border-gray-700/60 dark:bg-gray-900/40">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {savingsLabel} ({currentMonthData.name})
            </div>
            <div
              className={`mt-1 text-base font-bold sm:text-lg ${
                (Number(currentMonthData[savingsLabel]) || 0) >= 0
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              {formatCurrency(Number(currentMonthData[savingsLabel]) || 0)}
            </div>
            <div className="mt-0.5 flex items-center gap-1 text-[11px]">
              {(Number(currentMonthData[savingsLabel]) || 0) >= 0 ? (
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  🟢 {language === 'bn' ? 'সারপ্লাস' : 'Surplus'}
                </span>
              ) : (
                <span className="font-semibold text-amber-500">
                  🔴 {language === 'bn' ? 'ঘাটতি' : 'Deficit'}
                </span>
              )}
              <span className="text-gray-400">({currentMonthData.savingsRate}%)</span>
            </div>
          </div>

          {/* Savings Rate */}
          <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3 dark:border-gray-700/60 dark:bg-gray-900/40">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {language === 'bn' ? 'সঞ্চয়ের হার (Savings Rate)' : 'Savings Rate'}
            </div>
            <div className="mt-1 text-base font-bold text-teal-700 dark:text-teal-300 sm:text-lg">
              {currentMonthData.savingsRate}%
            </div>
            <div className="mt-0.5 text-[11px] text-gray-400">
              {language === 'bn' ? 'আয়ের যত শতাংশ অবশিষ্ট' : 'of monthly income saved'}
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards: Side-by-Side Differences */}
      {mode === 'sideBySide' && (
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* Income Delta */}
          <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3 dark:border-gray-700/60 dark:bg-gray-900/40">
            <span className="text-xs text-gray-500 dark:text-gray-400">{incomeLabel} পার্থক্য</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-base font-bold text-gray-900 dark:text-white">
                {sideBySideData.incDiff >= 0 ? '+' : ''}
                {formatCurrency(sideBySideData.incDiff)}
              </span>
              <span
                className={`text-xs font-semibold ${
                  sideBySideData.incPct >= 0 ? 'text-emerald-500' : 'text-rose-500'
                }`}
              >
                ({sideBySideData.incPct >= 0 ? '+' : ''}{sideBySideData.incPct}%)
              </span>
            </div>
            <div className="text-[11px] text-gray-400">
              {sideBySideData.labelB}-এর তুলনায় {sideBySideData.labelA}-তে
            </div>
          </div>

          {/* Expense Delta */}
          <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3 dark:border-gray-700/60 dark:bg-gray-900/40">
            <span className="text-xs text-gray-500 dark:text-gray-400">{expenseLabel} পার্থক্য</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-base font-bold text-gray-900 dark:text-white">
                {sideBySideData.expDiff >= 0 ? '+' : ''}
                {formatCurrency(sideBySideData.expDiff)}
              </span>
              <span
                className={`text-xs font-semibold ${
                  sideBySideData.expPct <= 0 ? 'text-emerald-500' : 'text-rose-500'
                }`}
              >
                ({sideBySideData.expPct >= 0 ? '+' : ''}{sideBySideData.expPct}%)
              </span>
            </div>
            <div className="text-[11px] text-gray-400">
              {sideBySideData.expDiff <= 0
                ? 'খরচ কমেছে (ইতিবাচক)'
                : 'খরচ বৃদ্ধি পেয়েছে'}
            </div>
          </div>

          {/* Savings Delta */}
          <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3 dark:border-gray-700/60 dark:bg-gray-900/40">
            <span className="text-xs text-gray-500 dark:text-gray-400">{savingsLabel} পার্থক্য</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-base font-bold text-gray-900 dark:text-white">
                {sideBySideData.savDiff >= 0 ? '+' : ''}
                {formatCurrency(sideBySideData.savDiff)}
              </span>
              <span
                className={`text-xs font-semibold ${
                  sideBySideData.savPct >= 0 ? 'text-indigo-500' : 'text-amber-500'
                }`}
              >
                ({sideBySideData.savPct >= 0 ? '+' : ''}{sideBySideData.savPct}%)
              </span>
            </div>
            <div className="text-[11px] text-gray-400">
              {sideBySideData.savDiff >= 0 ? 'সঞ্চয় বৃদ্ধি পেয়েছে' : 'সঞ্চয় হ্রাস পেয়েছে'}
            </div>
          </div>
        </div>
      )}

      {/* Bar Chart Canvas */}
      <div className="h-72 w-full min-w-0 overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={mode === 'trend' ? monthlyTimeline : sideBySideData.chartPoints}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="compIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                <stop offset="100%" stopColor="#059669" stopOpacity={0.85} />
              </linearGradient>
              <linearGradient id="compExpense" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity={1} />
                <stop offset="100%" stopColor="#e11d48" stopOpacity={0.85} />
              </linearGradient>
              <linearGradient id="compSavings" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                <stop offset="100%" stopColor="#2563eb" stopOpacity={0.85} />
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
              tick={{ fontSize: 11, fill: '#9ca3af' }}
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
                  const dp = payload[0].payload;
                  const inc = Number(dp[incomeLabel]) || 0;
                  const exp = Number(dp[expenseLabel]) || 0;
                  const sav = Number(dp[savingsLabel]) || 0;

                  return (
                    <div className="rounded-xl border border-gray-700 bg-gray-900/95 p-3 text-xs text-white shadow-xl backdrop-blur-md">
                      <div className="mb-2 border-b border-gray-800 pb-1 font-bold text-gray-200">
                        📊 {dp.fullLabel || label}
                      </div>
                      <div className="flex items-center justify-between gap-4 py-0.5">
                        <span className="flex items-center gap-1.5 font-medium text-emerald-400">
                          <span className="h-2 w-2 rounded-full bg-emerald-400" />
                          {incomeLabel}:
                        </span>
                        <span className="font-bold text-emerald-400">+{formatCurrency(inc)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 py-0.5">
                        <span className="flex items-center gap-1.5 font-medium text-rose-400">
                          <span className="h-2 w-2 rounded-full bg-rose-400" />
                          {expenseLabel}:
                        </span>
                        <span className="font-bold text-rose-400">-{formatCurrency(exp)}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-4 border-t border-gray-800 pt-1">
                        <span className="flex items-center gap-1.5 font-semibold text-blue-300">
                          <span className="h-2 w-2 rounded-full bg-blue-400" />
                          {savingsLabel}:
                        </span>
                        <span
                          className={`font-bold ${
                            sav >= 0 ? 'text-blue-300' : 'text-amber-400'
                          }`}
                        >
                          {formatCurrency(sav)}
                        </span>
                      </div>
                      {dp.savingsRate !== undefined && inc > 0 && (
                        <div className="mt-1 text-[10px] text-gray-400">
                          সঞ্চয়ের হার: <strong className="text-teal-300">{dp.savingsRate}%</strong>
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />

            <Legend
              wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
              iconType="circle"
            />

            <Bar
              dataKey={incomeLabel}
              fill="url(#compIncome)"
              radius={[4, 4, 0, 0]}
              maxBarSize={mode === 'sideBySide' ? 36 : 20}
            />

            <Bar
              dataKey={expenseLabel}
              fill="url(#compExpense)"
              radius={[4, 4, 0, 0]}
              maxBarSize={mode === 'sideBySide' ? 36 : 20}
            />

            <Bar
              dataKey={savingsLabel}
              fill="url(#compSavings)"
              radius={[4, 4, 0, 0]}
              maxBarSize={mode === 'sideBySide' ? 36 : 20}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
