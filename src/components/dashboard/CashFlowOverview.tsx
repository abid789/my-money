import React, { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency } from '@/lib/utils';
import { calculateSavingsRate, calculateMonthComparison } from '@/lib/calculations';
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  subDays,
  subMonths,
  format,
  parseISO,
  isWithinInterval,
  startOfDay,
  endOfDay,
} from 'date-fns';
import {
  ArrowDownRight,
  ArrowUpRight,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  Layers,
  Activity,
  PiggyBank,
} from 'lucide-react';

type TimeRange = '7d' | '30d' | '90d' | '12m';

export function CashFlowOverview() {
  const { transactions } = useData();
  const { language } = useLanguage();
  const [range, setRange] = useState<TimeRange>('30d');

  // Labels
  const inflowLabel = language === 'bn' ? 'মোট ইনফ্লো (আয়)' : 'Cash Inflow';
  const outflowLabel = language === 'bn' ? 'মোট আউটফ্লো (খরচ)' : 'Cash Outflow';
  const netLabel = language === 'bn' ? 'নীট ক্যাশ ফ্লো' : 'Net Cash Flow';

  // Calculate intervals and points
  const { chartData, currentTotals, prevTotals } = useMemo(() => {
    const now = new Date();
    let daysCount = 30;
    let isMonthlyGrouping = false;

    if (range === '7d') daysCount = 7;
    else if (range === '30d') daysCount = 30;
    else if (range === '90d') daysCount = 90;
    else if (range === '12m') {
      daysCount = 365;
      isMonthlyGrouping = true;
    }

    const currentStartDate = startOfDay(subDays(now, daysCount - 1));
    const currentEndDate = endOfDay(now);

    const prevStartDate = startOfDay(subDays(currentStartDate, daysCount));
    const prevEndDate = endOfDay(subDays(currentStartDate, 1));

    // Exclude internal transfers to avoid double-counting
    const nonTransferTxns = transactions.filter((t) => t.type !== 'transfer');

    // Aggregate totals for current period vs previous period
    let currIn = 0;
    let currOut = 0;
    let prevIn = 0;
    let prevOut = 0;

    nonTransferTxns.forEach((txn) => {
      try {
        const txnDate = parseISO(txn.date);
        const amt = Number(txn.amount);
        const isIncome = txn.type === 'income' || txn.type === 'refund';
        const isExpense = txn.type === 'expense';

        if (isWithinInterval(txnDate, { start: currentStartDate, end: currentEndDate })) {
          if (isIncome) currIn += amt;
          else if (isExpense) currOut += amt;
        } else if (isWithinInterval(txnDate, { start: prevStartDate, end: prevEndDate })) {
          if (isIncome) prevIn += amt;
          else if (isExpense) prevOut += amt;
        }
      } catch {
        // ignore invalid dates
      }
    });

    // Build timeline points for chart
    let points: Array<{
      dateStr: string;
      label: string;
      [key: string]: string | number;
    }> = [];

    if (isMonthlyGrouping) {
      // 12 monthly slots
      for (let i = 11; i >= 0; i--) {
        const d = subMonths(now, i);
        const key = format(d, 'yyyy-MM');
        points.push({
          dateStr: key,
          label: format(d, 'MMM yy'),
          [inflowLabel]: 0,
          [outflowLabel]: 0,
          [netLabel]: 0,
        });
      }

      const map = new Map<string, { in: number; out: number }>();
      points.forEach((p) => map.set(p.dateStr, { in: 0, out: 0 }));

      nonTransferTxns.forEach((txn) => {
        try {
          const d = parseISO(txn.date);
          const key = format(d, 'yyyy-MM');
          if (map.has(key)) {
            const entry = map.get(key)!;
            const amt = Number(txn.amount);
            if (txn.type === 'income' || txn.type === 'refund') entry.in += amt;
            else if (txn.type === 'expense') entry.out += amt;
          }
        } catch {
          // ignore
        }
      });

      points = points.map((p) => {
        const entry = map.get(p.dateStr) || { in: 0, out: 0 };
        return {
          ...p,
          [inflowLabel]: entry.in,
          [outflowLabel]: entry.out,
          [netLabel]: entry.in - entry.out,
        };
      });
    } else {
      // Daily slots
      for (let i = daysCount - 1; i >= 0; i--) {
        const d = subDays(now, i);
        const key = format(d, 'yyyy-MM-dd');
        points.push({
          dateStr: key,
          label: daysCount <= 14 ? format(d, 'dd MMM') : format(d, 'd MMM'),
          [inflowLabel]: 0,
          [outflowLabel]: 0,
          [netLabel]: 0,
        });
      }

      const map = new Map<string, { in: number; out: number }>();
      points.forEach((p) => map.set(p.dateStr, { in: 0, out: 0 }));

      nonTransferTxns.forEach((txn) => {
        const key = txn.date;
        if (map.has(key)) {
          const entry = map.get(key)!;
          const amt = Number(txn.amount);
          if (txn.type === 'income' || txn.type === 'refund') entry.in += amt;
          else if (txn.type === 'expense') entry.out += amt;
        }
      });

      points = points.map((p) => {
        const entry = map.get(p.dateStr) || { in: 0, out: 0 };
        return {
          ...p,
          [inflowLabel]: entry.in,
          [outflowLabel]: entry.out,
          [netLabel]: entry.in - entry.out,
        };
      });
    }

    return {
      chartData: points,
      currentTotals: {
        inflow: currIn,
        outflow: currOut,
        net: currIn - currOut,
        savingsRate: calculateSavingsRate(currIn, currOut),
      },
      prevTotals: {
        inflow: prevIn,
        outflow: prevOut,
        net: prevIn - prevOut,
      },
    };
  }, [transactions, range, inflowLabel, outflowLabel, netLabel]);

  // Percentage changes vs previous period
  const inflowChange = calculateMonthComparison(currentTotals.inflow, prevTotals.inflow);
  const outflowChange = calculateMonthComparison(currentTotals.outflow, prevTotals.outflow);

  const hasData = currentTotals.inflow > 0 || currentTotals.outflow > 0;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-gray-800 dark:bg-gray-800/90">
      {/* Header with Title and Range Picker */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400">
              <Activity className="h-4 w-4" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              {language === 'bn' ? 'ক্যাশ ফ্লো ওভারভিউ' : 'Cash Flow Overview'}
            </h3>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
              {language === 'bn' ? 'রিয়েল-টাইম গতিপ্রকৃতি' : 'Real-Time Dynamics'}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {language === 'bn'
              ? 'ব্যক্তিগত তহবিলে অর্থের প্রবেশ (ইনফ্লো) ও বহির্গমন (আউটফ্লো)-এর নিখুঁত পর্যবেক্ষণ'
              : 'Tracking incoming cash inflows vs outgoing cash outflows (excludes transfers)'}
          </p>
        </div>

        {/* Time-Range Selector Buttons */}
        <div className="flex rounded-xl border border-gray-200 bg-gray-50/90 p-0.5 text-xs font-semibold dark:border-gray-700 dark:bg-gray-900/50">
          {(
            [
              { key: '7d', bn: '৭ দিন', en: '7 Days' },
              { key: '30d', bn: '৩০ দিন', en: '30 Days' },
              { key: '90d', bn: '৯০ দিন', en: '90 Days' },
              { key: '12m', bn: '১২ মাস', en: '12 Months' },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setRange(t.key)}
              className={`rounded-lg px-2.5 py-1 text-xs transition-all ${
                range === t.key
                  ? 'bg-teal-600 text-white shadow-xs font-bold'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              {language === 'bn' ? t.bn : t.en}
            </button>
          ))}
        </div>
      </div>

      {/* 4 Summary Stat Mini-Cards */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* Total Inflow */}
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3 dark:border-emerald-950/40 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span className="font-medium text-emerald-800 dark:text-emerald-300">
              {language === 'bn' ? 'মোট ইনফ্লো (আয়)' : 'Total Inflow'}
            </span>
            <ArrowDownRight className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-1 text-base font-bold text-gray-900 dark:text-white sm:text-lg">
            +{formatCurrency(currentTotals.inflow)}
          </div>
          <div className="mt-0.5 flex items-center gap-1 text-[11px]">
            {inflowChange >= 0 ? (
              <span className="flex items-center font-semibold text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="mr-0.5 h-3 w-3" /> +{inflowChange}%
              </span>
            ) : (
              <span className="flex items-center font-semibold text-rose-500">
                <TrendingDown className="mr-0.5 h-3 w-3" /> {inflowChange}%
              </span>
            )}
            <span className="text-gray-400">
              {language === 'bn' ? 'আগের সময়ের চেয়ে' : 'vs prev period'}
            </span>
          </div>
        </div>

        {/* Total Outflow */}
        <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-3 dark:border-rose-950/40 dark:bg-rose-950/20">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span className="font-medium text-rose-800 dark:text-rose-300">
              {language === 'bn' ? 'মোট আউটফ্লো (খরচ)' : 'Total Outflow'}
            </span>
            <ArrowUpRight className="h-4 w-4 text-rose-500" />
          </div>
          <div className="mt-1 text-base font-bold text-gray-900 dark:text-white sm:text-lg">
            -{formatCurrency(currentTotals.outflow)}
          </div>
          <div className="mt-0.5 flex items-center gap-1 text-[11px]">
            {outflowChange <= 0 ? (
              <span className="flex items-center font-semibold text-emerald-600 dark:text-emerald-400">
                <TrendingDown className="mr-0.5 h-3 w-3" /> {outflowChange}%
              </span>
            ) : (
              <span className="flex items-center font-semibold text-rose-500">
                <TrendingUp className="mr-0.5 h-3 w-3" /> +{outflowChange}%
              </span>
            )}
            <span className="text-gray-400">
              {language === 'bn' ? 'আগের সময়ের চেয়ে' : 'vs prev period'}
            </span>
          </div>
        </div>

        {/* Net Cash Flow */}
        <div className="rounded-xl border border-teal-100 bg-teal-50/40 p-3 dark:border-teal-950/40 dark:bg-teal-950/20">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span className="font-medium text-teal-800 dark:text-teal-300">
              {language === 'bn' ? 'নীট ক্যাশ ফ্লো' : 'Net Cash Flow'}
            </span>
            <ArrowUpDown className="h-4 w-4 text-teal-500" />
          </div>
          <div
            className={`mt-1 text-base font-bold sm:text-lg ${
              currentTotals.net >= 0
                ? 'text-teal-700 dark:text-teal-300'
                : 'text-amber-600 dark:text-amber-400'
            }`}
          >
            {formatCurrency(currentTotals.net)}
          </div>
          <div className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
            {currentTotals.net >= 0
              ? language === 'bn' ? '🟢 পজিটিভ সারপ্লাস' : '🟢 Positive Surplus'
              : language === 'bn' ? '🔴 ঘাটতি (Deficit)' : '🔴 Deficit Outflow'}
          </div>
        </div>

        {/* Cash Retention / Savings Rate */}
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 dark:border-indigo-950/40 dark:bg-indigo-950/20">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span className="font-medium text-indigo-800 dark:text-indigo-300">
              {language === 'bn' ? 'ক্যাশ রিটেনশন রেট' : 'Cash Retention'}
            </span>
            <PiggyBank className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-1 text-base font-bold text-indigo-700 dark:text-indigo-300 sm:text-lg">
            {currentTotals.savingsRate}%
          </div>
          <div className="mt-0.5 text-[11px] text-gray-400">
            {language === 'bn' ? 'আয়ের যত অংশ সংরক্ষিত' : 'of income retained'}
          </div>
        </div>
      </div>

      {/* Area Chart Canvas */}
      {!hasData ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-6 text-center dark:border-gray-700 dark:bg-gray-900/30">
          <Activity className="h-8 w-8 text-gray-300 dark:text-gray-600 mb-2" />
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">
            {language === 'bn' ? 'নির্বাচিত সময়ে কোনো ক্যাশ ফ্লো রেকর্ড নেই' : 'No cash flow activity for this period'}
          </p>
          <p className="mt-0.5 text-[11px] text-gray-400">
            {language === 'bn'
              ? 'টাকা জমা বা খরচের হিসাব দিলে স্বয়ংক্রিয়ভাবে কার্ভ তৈরি হবে।'
              : 'Add an income or expense to see the visual cash curve.'}
          </p>
        </div>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="cfInflowGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="cfOutflowGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="cfNetGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#374151"
                opacity={0.12}
              />

              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                interval={range === '30d' ? 4 : range === '90d' ? 12 : 0}
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const dp = payload[0].payload;
                    const inf = Number(dp[inflowLabel]) || 0;
                    const out = Number(dp[outflowLabel]) || 0;
                    const net = inf - out;

                    return (
                      <div className="rounded-xl border border-gray-700 bg-gray-900/95 p-3 text-xs text-white shadow-xl backdrop-blur-md">
                        <div className="mb-2 border-b border-gray-800 pb-1 font-bold text-gray-200">
                          📅 {dp.dateStr || dp.label}
                        </div>
                        <div className="flex items-center justify-between gap-4 py-0.5">
                          <span className="flex items-center gap-1.5 font-medium text-emerald-400">
                            <span className="h-2 w-2 rounded-full bg-emerald-400" />
                            {inflowLabel}:
                          </span>
                          <span className="font-bold text-emerald-400">
                            +{formatCurrency(inf)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4 py-0.5">
                          <span className="flex items-center gap-1.5 font-medium text-rose-400">
                            <span className="h-2 w-2 rounded-full bg-rose-400" />
                            {outflowLabel}:
                          </span>
                          <span className="font-bold text-rose-400">
                            -{formatCurrency(out)}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-4 border-t border-gray-800 pt-1">
                          <span className="flex items-center gap-1.5 font-semibold text-cyan-300">
                            <span className="h-2 w-2 rounded-full bg-cyan-400" />
                            {netLabel}:
                          </span>
                          <span
                            className={`font-bold ${
                              net >= 0 ? 'text-cyan-300' : 'text-amber-400'
                            }`}
                          >
                            {formatCurrency(net)}
                          </span>
                        </div>
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

              <Area
                type="monotone"
                dataKey={inflowLabel}
                stroke="#10b981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#cfInflowGrad)"
              />

              <Area
                type="monotone"
                dataKey={outflowLabel}
                stroke="#f43f5e"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#cfOutflowGrad)"
              />

              <Line
                type="monotone"
                dataKey={netLabel}
                stroke="#06b6d4"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
