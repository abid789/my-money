import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { formatCurrency, formatRelativeDate } from '@/lib/utils';
import { MonthSelector } from '@/components/dashboard/MonthSelector';
import { Button } from '@/components/ui/Button';
import {
  Calendar as CalendarIcon,
  PlusCircle,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  format,
  parseISO,
} from 'date-fns';
import clsx from 'clsx';

export default function CalendarPage() {
  const { transactions, selectedMonth, selectedYear } = useData();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const monthDate = useMemo(() => {
    return new Date(selectedYear, selectedMonth - 1, 1);
  }, [selectedYear, selectedMonth]);

  // Calendar matrix days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [monthDate]);

  // Daily totals map
  const dailyTotals = useMemo(() => {
    const map = new Map<string, { income: number; expense: number; count: number }>();

    transactions.forEach((txn) => {
      try {
        const key = txn.date;
        const current = map.get(key) || { income: 0, expense: 0, count: 0 };
        const amt = Number(txn.amount);
        if (txn.type === 'income' || txn.type === 'refund') {
          current.income += amt;
        } else if (txn.type === 'expense') {
          current.expense += amt;
        }
        current.count += 1;
        map.set(key, current);
      } catch {
        // ignore
      }
    });

    return map;
  }, [transactions]);

  // Transactions on selected date
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const dayTransactions = transactions.filter((t) => t.date === selectedDateStr);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
            Calendar Expense View
          </h1>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Explore daily cash inflows and outflows by date.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <MonthSelector />
          <Button
            variant="primary"
            onClick={() => navigate(`/add-transaction`)}
            leftIcon={<PlusCircle className="h-4 w-4" />}
          >
            Add Transaction
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Calendar Grid (2 cols on large screen) */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800/90 lg:col-span-2">
          {/* Day Names */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-400">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="py-2">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar Cells */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const totals = dailyTotals.get(dateStr);
              const isCurrentMonth = isSameMonth(day, monthDate);
              const isSelected = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(day)}
                  className={clsx(
                    'flex min-h-[70px] flex-col justify-between rounded-xl p-2 text-left transition-all sm:min-h-[80px]',
                    !isCurrentMonth && 'opacity-30',
                    isSelected
                      ? 'bg-teal-50 ring-2 ring-teal-500 dark:bg-teal-950/50'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-750',
                    isToday && !isSelected && 'border border-teal-400'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={clsx(
                        'text-xs font-semibold',
                        isToday
                          ? 'rounded-full bg-teal-600 px-1.5 py-0.2 text-white'
                          : isSelected
                          ? 'text-teal-700 dark:text-teal-300'
                          : 'text-gray-700 dark:text-gray-300'
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                    {totals && totals.count > 0 && (
                      <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                    )}
                  </div>

                  <div className="mt-1 space-y-0.5 text-[10px]">
                    {totals && totals.income > 0 && (
                      <div className="truncate font-semibold text-emerald-600 dark:text-emerald-400">
                        +{totals.income >= 1000 ? `${(totals.income / 1000).toFixed(0)}k` : totals.income}
                      </div>
                    )}
                    {totals && totals.expense > 0 && (
                      <div className="truncate font-semibold text-rose-600 dark:text-rose-400">
                        -{totals.expense >= 1000 ? `${(totals.expense / 1000).toFixed(0)}k` : totals.expense}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Date Details Panel */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800/90">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-700">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {format(selectedDate, 'MMMM d, yyyy')}
              </h3>
              <p className="text-xs text-gray-400">
                {dayTransactions.length} transaction{dayTransactions.length === 1 ? '' : 's'} recorded
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/add-transaction')}
              leftIcon={<PlusCircle className="h-3.5 w-3.5" />}
            >
              Add
            </Button>
          </div>

          <div className="mt-4 space-y-3">
            {dayTransactions.length === 0 ? (
              <p className="py-8 text-center text-xs text-gray-400">
                No transactions recorded for this day.
              </p>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {dayTransactions.map((txn) => {
                  const isExpense = txn.type === 'expense';
                  return (
                    <div key={txn.id} className="py-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-gray-900 dark:text-white truncate max-w-[150px]">
                          {txn.description}
                        </span>
                        <span
                          className={clsx(
                            'text-xs font-bold',
                            isExpense
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          )}
                        >
                          {isExpense ? '-' : '+'}
                          {formatCurrency(Number(txn.amount))}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-gray-400">
                        <span>{txn.category?.name || 'General'}</span>
                        <span>•</span>
                        <span>{txn.account?.name || 'Account'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
