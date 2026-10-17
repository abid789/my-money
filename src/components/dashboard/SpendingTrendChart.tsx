import { useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
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
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800/90">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Daily Spending Trend
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Expenses per day for selected month
          </p>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="spendingGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.15} />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
            />
            <Tooltip
              formatter={(val: number) => [formatCurrency(val), 'Daily Spending']}
              labelFormatter={(label) => `Day ${label}`}
              contentStyle={{
                backgroundColor: '#1f2937',
                borderColor: '#374151',
                borderRadius: '0.75rem',
                color: '#fff',
                fontSize: '12px',
              }}
            />
            <Area
              type="monotone"
              dataKey="daily"
              stroke="#14b8a6"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#spendingGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
