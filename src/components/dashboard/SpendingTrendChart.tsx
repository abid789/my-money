import { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency, getDaysInMonth } from '@/lib/utils';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { parseISO, getDate, getMonth, getYear } from 'date-fns';

export function SpendingTrendChart() {
  const { transactions, selectedMonth, selectedYear } = useData();
  const { language, t } = useLanguage();
  const [viewMode, setViewMode] = useState<'daily' | 'cumulative'>('daily');

  const chartData = useMemo(() => {
    const daysCount = getDaysInMonth(selectedYear, selectedMonth);
    const dailySpending = new Array(daysCount).fill(0);

    transactions.forEach((txn) => {
      if (txn.type === 'expense') {
        try {
          const d = parseISO(txn.date);
          if (getMonth(d) + 1 === selectedMonth && getYear(d) === selectedYear) {
            const dayNum = getDate(d);
            if (dayNum >= 1 && dayNum <= daysCount) {
              dailySpending[dayNum - 1] += Number(txn.amount);
            }
          }
        } catch {
          // ignore date parse errors
        }
      }
    });

    let cumulative = 0;
    return dailySpending.map((amt, idx) => {
      cumulative += amt;
      return {
        day: `${idx + 1}`,
        daily: amt,
        cumulative,
      };
    });
  }, [transactions, selectedMonth, selectedYear]);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-gray-800 dark:bg-gray-800/90">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            {t('dash.spending_trend')}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {language === 'bn' ? 'চলতি মাসের প্রতিদিনের খরচের ওঠানামা' : 'Expenses per day for selected month'}
          </p>
        </div>

        {/* View Switcher Pill */}
        <div className="flex rounded-lg border border-gray-200 bg-gray-50/90 p-0.5 text-xs font-semibold dark:border-gray-700 dark:bg-gray-900/50">
          <button
            type="button"
            onClick={() => setViewMode('daily')}
            className={`rounded-md px-2.5 py-1 transition-all ${
              viewMode === 'daily'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            {language === 'bn' ? 'দৈনিক' : 'Daily'}
          </button>
          <button
            type="button"
            onClick={() => setViewMode('cumulative')}
            className={`rounded-md px-2.5 py-1 transition-all ${
              viewMode === 'cumulative'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            {language === 'bn' ? 'ক্রমপুঞ্জিত' : 'Cumulative'}
          </button>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="spendingGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.12} />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => (Number(v) % 3 === 0 || Number(v) === 1 ? v : '')}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
            />
            <Tooltip
              formatter={(val: number) => [
                formatCurrency(val),
                viewMode === 'daily'
                  ? (language === 'bn' ? 'দৈনিক খরচ' : 'Daily Spending')
                  : (language === 'bn' ? 'মোট পুঞ্জিত খরচ' : 'Cumulative Spending')
              ]}
              labelFormatter={(label) => (language === 'bn' ? `${label} তারিখ` : `Day ${label}`)}
              contentStyle={{
                backgroundColor: '#1f2937',
                borderColor: '#374151',
                borderRadius: '0.75rem',
                color: '#fff',
                fontSize: '12px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
              }}
            />
            <Area
              type="monotone"
              dataKey={viewMode}
              stroke="#06b6d4"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#spendingGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
