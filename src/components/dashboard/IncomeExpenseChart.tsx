import { useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { useLanguage } from '@/contexts/LanguageContext';
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
  const { language, t } = useLanguage();

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

    const incomeLabel = language === 'bn' ? 'মোট আয়' : 'Income';
    const expenseLabel = language === 'bn' ? 'মোট খরচ' : 'Expense';

    return months.map((m) => {
      const entry = monthMap.get(m.key) || { income: 0, expense: 0 };
      return {
        name: m.label,
        [incomeLabel]: entry.income,
        [expenseLabel]: entry.expense,
      };
    });
  }, [transactions, selectedMonth, selectedYear, language]);

  const incomeKey = language === 'bn' ? 'মোট আয়' : 'Income';
  const expenseKey = language === 'bn' ? 'মোট খরচ' : 'Expense';

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-gray-800 dark:bg-gray-800/90">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            {t('dash.income_vs_expense')}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {language === 'bn' ? 'বিগত ৬ মাসের আর্থিক তুলনা' : 'Past 6 months comparison'}
          </p>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
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
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
              }}
              cursor={{ fill: 'rgba(107, 114, 128, 0.08)' }}
            />
            <Legend
              wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
              iconType="circle"
            />
            <Bar dataKey={incomeKey} fill="url(#incomeBarGrad)" radius={[6, 6, 0, 0]} maxBarSize={30} />
            <Bar dataKey={expenseKey} fill="url(#expenseBarGrad)" radius={[6, 6, 0, 0]} maxBarSize={30} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
