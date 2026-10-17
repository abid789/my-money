import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import type { TransactionFilters as FilterType } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Search, Filter, X, ArrowUpDown } from 'lucide-react';
import clsx from 'clsx';

interface TransactionFiltersProps {
  filters: FilterType;
  onChange: (filters: FilterType) => void;
  onReset: () => void;
}

export function TransactionFilters({
  filters,
  onChange,
  onReset,
}: TransactionFiltersProps) {
  const { categories, accounts } = useData();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleChange = (key: keyof FilterType, value: any) => {
    onChange({
      ...filters,
      [key]: value,
    });
  };

  const hasActiveFilters =
    filters.search ||
    filters.type !== 'all' ||
    filters.category_id ||
    filters.account_id ||
    filters.payment_method ||
    filters.date_from ||
    filters.date_to ||
    filters.amount_min ||
    filters.amount_max ||
    filters.sort_by !== 'date_desc';

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-800/90">
      {/* Top Search & Toggle Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => handleChange('search', e.target.value)}
            placeholder="Search by description, merchant, or notes..."
            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2 pl-9 pr-4 text-xs text-gray-900 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white sm:text-sm"
          />
          {filters.search && (
            <button
              onClick={() => handleChange('search', '')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Type Filter Tabs */}
          <div className="flex rounded-xl bg-gray-100 p-1 dark:bg-gray-700/60">
            {[
              { key: 'all', label: 'All' },
              { key: 'income', label: 'Income' },
              { key: 'expense', label: 'Expense' },
              { key: 'transfer', label: 'Transfer' },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleChange('type', tab.key)}
                className={clsx(
                  'rounded-lg px-2.5 py-1 text-xs font-semibold transition-all',
                  filters.type === tab.key
                    ? 'bg-white text-gray-900 shadow-xs dark:bg-gray-800 dark:text-white'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            leftIcon={<Filter className="h-3.5 w-3.5" />}
          >
            Filters
            {hasActiveFilters && (
              <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-teal-500" />
            )}
          </Button>

          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="text-gray-400 hover:text-rose-500"
              title="Reset all filters"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Advanced Filter Collapse */}
      {showAdvanced && (
        <div className="mt-4 grid grid-cols-1 gap-3 border-t border-gray-100 pt-4 dark:border-gray-800 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            label="Category"
            value={filters.category_id}
            onChange={(e) => handleChange('category_id', e.target.value)}
            options={[
              { value: '', label: 'All Categories' },
              ...categories.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />

          <Select
            label="Account"
            value={filters.account_id}
            onChange={(e) => handleChange('account_id', e.target.value)}
            options={[
              { value: '', label: 'All Accounts' },
              ...accounts.map((a) => ({ value: a.id, label: a.name })),
            ]}
          />

          <Select
            label="Sort By"
            value={filters.sort_by}
            onChange={(e) => handleChange('sort_by', e.target.value as any)}
            options={[
              { value: 'date_desc', label: 'Newest First' },
              { value: 'date_asc', label: 'Oldest First' },
              { value: 'amount_desc', label: 'Highest Amount' },
              { value: 'amount_asc', label: 'Lowest Amount' },
            ]}
          />

          <Select
            label="Payment Method"
            value={filters.payment_method}
            onChange={(e) => handleChange('payment_method', e.target.value)}
            options={[
              { value: '', label: 'All Payment Methods' },
              { value: 'Cash', label: 'Cash' },
              { value: 'bKash', label: 'bKash' },
              { value: 'Nagad', label: 'Nagad' },
              { value: 'Rocket', label: 'Rocket' },
              { value: 'Bank Transfer', label: 'Bank Transfer' },
              { value: 'Debit Card', label: 'Debit Card' },
              { value: 'Credit Card', label: 'Credit Card' },
            ]}
          />

          <Input
            type="date"
            label="From Date"
            value={filters.date_from}
            onChange={(e) => handleChange('date_from', e.target.value)}
          />

          <Input
            type="date"
            label="To Date"
            value={filters.date_to}
            onChange={(e) => handleChange('date_to', e.target.value)}
          />

          <Input
            type="number"
            label="Min Amount (৳)"
            placeholder="0"
            value={filters.amount_min}
            onChange={(e) => handleChange('amount_min', e.target.value)}
          />

          <Input
            type="number"
            label="Max Amount (৳)"
            placeholder="Max"
            value={filters.amount_max}
            onChange={(e) => handleChange('amount_max', e.target.value)}
          />
        </div>
      )}
    </div>
  );
}
