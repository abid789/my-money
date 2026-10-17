import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency } from '@/lib/utils';
import type { Transaction, TransactionFilters as FilterType } from '@/types';
import { TransactionFilters } from '@/components/transactions/TransactionFilters';
import { TransactionList } from '@/components/transactions/TransactionList';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PlusCircle, Download, ArrowUpRight, ArrowDownLeft, ArrowUpDown, RotateCcw } from 'lucide-react';
import Papa from 'papaparse';
import { parseISO, isAfter, isBefore, isEqual } from 'date-fns';
import toast from 'react-hot-toast';

const defaultFilters: FilterType = {
  search: '',
  type: 'all',
  category_id: '',
  account_id: '',
  payment_method: '',
  date_from: '',
  date_to: '',
  amount_min: '',
  amount_max: '',
  sort_by: 'date_desc',
};

export default function TransactionsPage() {
  const { transactions, loading, resetToZero } = useData();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<FilterType>(defaultFilters);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleConfirmReset = async () => {
    try {
      setIsResetting(true);
      await resetToZero();
      setResetDialogOpen(false);
    } catch {
      toast.error('হিসেব রিসেট করতে সমস্যা হয়েছে');
    } finally {
      setIsResetting(false);
    }
  };

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((txn) => {
      // Search
      if (filters.search) {
        const query = filters.search.toLowerCase();
        const desc = (txn.description || '').toLowerCase();
        const merch = (txn.merchant || '').toLowerCase();
        const notes = (txn.notes || '').toLowerCase();
        if (!desc.includes(query) && !merch.includes(query) && !notes.includes(query)) {
          return false;
        }
      }

      // Type
      if (filters.type !== 'all' && txn.type !== filters.type) {
        return false;
      }

      // Category
      if (filters.category_id && txn.category_id !== filters.category_id) {
        return false;
      }

      // Account
      if (filters.account_id && txn.account_id !== filters.account_id) {
        return false;
      }

      // Payment method
      if (filters.payment_method && txn.payment_method !== filters.payment_method) {
        return false;
      }

      // Date range
      if (filters.date_from) {
        try {
          const tDate = parseISO(txn.date);
          const fDate = parseISO(filters.date_from);
          if (isBefore(tDate, fDate) && !isEqual(tDate, fDate)) return false;
        } catch {
          // ignore
        }
      }
      if (filters.date_to) {
        try {
          const tDate = parseISO(txn.date);
          const toDate = parseISO(filters.date_to);
          if (isAfter(tDate, toDate) && !isEqual(tDate, toDate)) return false;
        } catch {
          // ignore
        }
      }

      // Amount range
      const amt = Number(txn.amount);
      if (filters.amount_min && amt < parseFloat(filters.amount_min)) {
        return false;
      }
      if (filters.amount_max && amt > parseFloat(filters.amount_max)) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (filters.sort_by === 'date_desc') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      if (filters.sort_by === 'date_asc') {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      if (filters.sort_by === 'amount_desc') {
        return Number(b.amount) - Number(a.amount);
      }
      if (filters.sort_by === 'amount_asc') {
        return Number(a.amount) - Number(b.amount);
      }
      return 0;
    });
  }, [transactions, filters]);

  // Compute totals for current filtered set
  const filteredSummary = useMemo(() => {
    let income = 0;
    let expense = 0;
    filteredTransactions.forEach((t) => {
      if (t.type === 'income' || t.type === 'refund') income += Number(t.amount);
      if (t.type === 'expense') expense += Number(t.amount);
    });
    return {
      income,
      expense,
      net: income - expense,
      count: filteredTransactions.length,
    };
  }, [filteredTransactions]);

  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) {
      toast.error('No transactions to export');
      return;
    }

    const csvData = filteredTransactions.map((t) => ({
      Date: t.date,
      Type: t.type,
      Amount_BDT: t.amount,
      Description: t.description,
      Category: t.category?.name || '',
      Account: t.account?.name || '',
      PaymentMethod: t.payment_method || '',
      Merchant: t.merchant || '',
      Notes: t.notes || '',
      Tags: t.tags ? t.tags.join(', ') : '',
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `transactions_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Transactions exported to CSV');
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" text="Loading transaction history..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
            {language === 'bn' ? 'লেনদেন ইতিহাস ও তালিকা' : 'Transactions History'}
          </h1>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {language === 'bn'
              ? 'আপনার সকল আয়, ব্যয় ও ট্রান্সফারের বিবরণ খুঁজুন ও পরিচালনা করুন।'
              : 'View, search, filter, and organize all your financial records.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {transactions.length > 0 && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setResetDialogOpen(true)}
              leftIcon={<RotateCcw className="h-4 w-4" />}
            >
              {language === 'bn' ? 'সব মুছুন (৳০)' : 'Reset All'}
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            leftIcon={<Download className="h-4 w-4" />}
          >
            {language === 'bn' ? 'CSV ডাউনলোড' : 'Export CSV'}
          </Button>
          <Button
            variant="primary"
            onClick={() => navigate('/add-transaction')}
            leftIcon={<PlusCircle className="h-4 w-4" />}
          >
            {language === 'bn' ? '+ নতুন লেনদেন' : 'Add Transaction'}
          </Button>
        </div>
      </div>

      {/* Filtered Summary Mini Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-xs dark:border-gray-800 dark:bg-gray-800/80">
          <span className="text-[11px] font-medium text-gray-400">Records Found</span>
          <div className="text-base font-bold text-gray-900 dark:text-white sm:text-lg">
            {filteredSummary.count}
          </div>
        </div>

        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 shadow-xs dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <ArrowDownLeft className="h-3 w-3" /> Filtered Income
          </div>
          <div className="text-base font-bold text-emerald-700 dark:text-emerald-300 sm:text-lg">
            +{formatCurrency(filteredSummary.income)}
          </div>
        </div>

        <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-3 shadow-xs dark:border-rose-900/40 dark:bg-rose-950/20">
          <div className="flex items-center gap-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">
            <ArrowUpRight className="h-3 w-3" /> Filtered Expenses
          </div>
          <div className="text-base font-bold text-rose-700 dark:text-rose-300 sm:text-lg">
            -{formatCurrency(filteredSummary.expense)}
          </div>
        </div>

        <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-3 shadow-xs dark:border-teal-900/40 dark:bg-teal-950/20">
          <div className="flex items-center gap-1 text-[11px] font-medium text-teal-600 dark:text-teal-400">
            <ArrowUpDown className="h-3 w-3" /> Net Balance
          </div>
          <div className="text-base font-bold text-teal-700 dark:text-teal-300 sm:text-lg">
            {formatCurrency(filteredSummary.net)}
          </div>
        </div>
      </div>

      {/* Filter Component */}
      <TransactionFilters
        filters={filters}
        onChange={setFilters}
        onReset={() => setFilters(defaultFilters)}
      />

      {/* Transactions List */}
      <TransactionList
        transactions={filteredTransactions}
        onAddClick={() => navigate('/add-transaction')}
      />

      <ConfirmDialog
        isOpen={resetDialogOpen}
        onClose={() => setResetDialogOpen(false)}
        onConfirm={handleConfirmReset}
        title={language === 'bn' ? 'সব লেনদেন মুছে শূন্য করবেন?' : 'Reset All to ৳0?'}
        message={
          language === 'bn'
            ? 'আপনার সকল পূর্বের লেনদেন মুছে হিসাব শূন্য (৳০) করা হবে। আপনি একদম ফ্রেশভাবে নতুন হিসাব লিখতে পারবেন।'
            : 'All recorded transactions will be deleted and balances reset to ৳0.'
        }
        confirmText={language === 'bn' ? 'হ্যাঁ, সব মুছে শূন্য করুন' : 'Yes, Reset to ৳0'}
        variant="danger"
        loading={isResetting}
      />
    </div>
  );
}
