import { Link } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { formatCurrency, calculatePercentageUsed } from '@/lib/utils';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { AlertCircle, ChevronRight, Target } from 'lucide-react';

export function BudgetUtilizationChart() {
  const { budgets } = useData();
  const activeBudgets = budgets.filter((b) => b.is_active);

  if (activeBudgets.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800/90">
        <div className="flex items-center justify-between pb-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Budget Utilization
          </h3>
          <Link
            to="/budgets"
            className="flex items-center text-xs font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400"
          >
            Manage <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="py-8 text-center">
          <Target className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" />
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            No budgets created yet. Set a monthly or category budget to track limits.
          </p>
          <Link
            to="/budgets"
            className="mt-3 inline-block rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-100 dark:bg-teal-950/60 dark:text-teal-300"
          >
            Create Budget
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800/90">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Budget Utilization
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Track spending against your set limits
          </p>
        </div>
        <Link
          to="/budgets"
          className="flex items-center text-xs font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400"
        >
          View all <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="space-y-4">
        {activeBudgets.slice(0, 4).map((budget) => {
          const spent = Number(budget.spent || 0);
          const limit = Number(budget.amount);
          const percentage = calculatePercentageUsed ? calculatePercentageUsed(spent, limit) : (spent / limit) * 100;
          const isOver = spent > limit;

          return (
            <div key={budget.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  {budget.name}
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  <strong className={isOver ? 'text-rose-600 dark:text-rose-400' : 'text-gray-900 dark:text-white'}>
                    {formatCurrency(spent)}
                  </strong>{' '}
                  / {formatCurrency(limit)}
                </span>
              </div>

              <ProgressBar value={percentage} size="sm" showPercentage={false} />

              <div className="flex items-center justify-between text-[11px]">
                <span className="text-gray-400">
                  {isOver ? (
                    <span className="flex items-center gap-1 font-medium text-rose-600 dark:text-rose-400">
                      <AlertCircle className="h-3 w-3" />
                      Over by {formatCurrency(spent - limit)}
                    </span>
                  ) : (
                    <span>Remaining: {formatCurrency(limit - spent)}</span>
                  )}
                </span>
                <span className={percentage >= 90 ? 'font-bold text-rose-600' : 'text-gray-400'}>
                  {percentage.toFixed(0)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
