import { useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { formatCurrency } from '@/lib/utils';
import { calculateCategoryBreakdown } from '@/lib/calculations';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = [
  '#14b8a6', // teal
  '#f59e0b', // amber
  '#3b82f6', // blue
  '#ec4899', // pink
  '#8b5cf6', // purple
  '#10b981', // green
  '#f97316', // orange
  '#6366f1', // indigo
  '#ef4444', // red
  '#06b6d4', // cyan
];

export function CategoryBreakdownChart() {
  const { transactions, categories } = useData();

  const spendingData = useMemo(() => {
    return calculateCategoryBreakdown(transactions, categories);
  }, [transactions, categories]);

  const totalExpense = useMemo(() => {
    return spendingData.reduce((sum, item) => sum + item.amount, 0);
  }, [spendingData]);

  if (spendingData.length === 0) {
    return (
      <div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm dark:border-gray-800 dark:bg-gray-800/90">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
          No expense transactions recorded for this period.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800/90">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Expenses by Category
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Breakdown of total {formatCurrency(totalExpense)}
        </p>
      </div>

      <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-2">
        <div className="relative h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={spendingData}
                dataKey="amount"
                nameKey="category"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
              >
                {spendingData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color || COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(val: number) => [formatCurrency(val), 'Amount']}
                contentStyle={{
                  backgroundColor: '#1f2937',
                  borderColor: '#374151',
                  borderRadius: '0.75rem',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
              Total
            </span>
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              {formatCurrency(totalExpense)}
            </span>
          </div>
        </div>

        <div className="flex max-h-56 flex-col gap-2 overflow-y-auto pr-1 text-xs">
          {spendingData.map((item, index) => (
            <div key={item.category} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: item.color || COLORS[index % COLORS.length] }}
                />
                <span className="truncate font-medium text-gray-700 dark:text-gray-300">
                  {item.category}
                </span>
              </div>
              <div className="flex items-center gap-2 text-right">
                <span className="font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(item.amount)}
                </span>
                <span className="text-[11px] text-gray-400">
                  ({item.percentage.toFixed(0)}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
