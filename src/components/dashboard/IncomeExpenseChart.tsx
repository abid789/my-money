import { useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { formatCurrency } from '@/lib/utils';
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
import { subMonths, format, parseISO } from 'date-fns';

export function IncomeExpenseChart() {
  const { transactions, selectedMonth, selectedYear } = useData();

  const chartData = useMemo(() => {
    // Generate the last 6 months list relative to selectedMonth/Year
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
          if (txn.type === 'income') {
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
        Income: entry.income,
        Expense: entry.expense,
      };
    });
  }, [transactions, selectedMonth, selectedYear]);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800/90">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Income vs. Expenses
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Past 6 months comparison
          </p>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.15} />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
            />
            <Tooltip
              formatter={(val: number) => [formatCurrency(val), '']}
              contentStyle={{
                backgroundColor: '#1f2937',
                borderColor: '#374151',
                borderRadius: '0.75rem',
                color: '#fff',
                fontSize: '12px',
              }}
              cursor={{ fill: 'rgba(107, 114, 128, 0.08)' }}
            />
            <Legend
              wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
              iconType="circle"
            />
            <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={32} />
            <Bar dataKey="Expense" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
