import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency, formatRelativeDate } from '@/lib/utils';
import type { Transaction } from '@/types';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  RotateCcw,
  ChevronRight,
  Trash2,
  Edit2,
  FileText,
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';

export function RecentTransactions() {
  const { transactions, deleteTransaction } = useData();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Take top 8 latest transactions
  const recent = transactions.slice(0, 8);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setIsDeleting(true);
      await deleteTransaction(deleteId);
    } catch {
      toast.error(language === 'bn' ? 'মুছে ফেলতে সমস্যা হয়েছে' : 'Failed to delete transaction');
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const getTypeIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'income':
        return <ArrowDownLeft className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      case 'expense':
        return <ArrowUpRight className="h-4 w-4 text-rose-600 dark:text-rose-400" />;
      case 'transfer':
        return <ArrowLeftRight className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      case 'refund':
        return <RotateCcw className="h-4 w-4 text-teal-600 dark:text-teal-400" />;
    }
  };

  const getTypeBadge = (type: Transaction['type'], amount: number) => {
    switch (type) {
      case 'income':
        return (
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            +{formatCurrency(amount)}
          </span>
        );
      case 'expense':
        return (
          <span className="font-semibold text-rose-600 dark:text-rose-400">
            -{formatCurrency(amount)}
          </span>
        );
      case 'transfer':
        return (
          <span className="font-semibold text-blue-600 dark:text-blue-400">
            {formatCurrency(amount)}
          </span>
        );
      case 'refund':
        return (
          <span className="font-semibold text-teal-600 dark:text-teal-400">
            +{formatCurrency(amount)}
          </span>
        );
    }
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-gray-800 dark:bg-gray-800/90">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            {t('dash.recent_transactions')}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {language === 'bn' ? 'সকল অ্যাকাউন্টের সাম্প্রতিক লেনদেন ও খরচ' : 'Latest activities across all accounts'}
          </p>
        </div>
        <Link
          to="/transactions"
          className="flex items-center gap-0.5 text-xs font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400"
        >
          {t('dash.view_all')} <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {recent.length === 0 ? (
        <div className="py-8 text-center text-xs text-gray-400">
          {language === 'bn'
            ? 'এখনো কোনো লেনদেন যুক্ত করা হয়নি। উপরে "+ নতুন যোগ করুন" বাটনে ক্লিক করে হিসাব শুরু করুন।'
            : 'No transactions yet. Click "+ Add Transaction" to create your first entry.'}
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {recent.map((txn) => (
            <div
              key={txn.id}
              className="group flex items-center justify-between py-3 transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-700/30 -mx-2 px-2 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <div
                  className={clsx(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                    txn.type === 'income' && 'bg-emerald-50 dark:bg-emerald-950/40',
                    txn.type === 'expense' && 'bg-rose-50 dark:bg-rose-950/40',
                    txn.type === 'transfer' && 'bg-blue-50 dark:bg-blue-950/40',
                    txn.type === 'refund' && 'bg-teal-50 dark:bg-teal-950/40'
                  )}
                >
                  {getTypeIcon(txn.type)}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className={clsx(
                      'truncate text-xs sm:text-sm',
                      txn.description
                        ? 'font-semibold text-gray-900 dark:text-white'
                        : 'italic text-gray-400 dark:text-gray-500'
                    )}>
                      {txn.description || (language === 'bn' ? 'বিবরণ নেই' : 'No description')}
                    </p>
                    {txn.notes && (
                      <span title={txn.notes}>
                        <FileText className="h-3 w-3 text-gray-400" />
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                    <span>{formatRelativeDate(txn.date)}</span>
                    <span>•</span>
                    <span className="truncate">
                      {txn.category?.name || (txn.type === 'transfer' ? 'Transfer' : (language === 'bn' ? 'শ্রেণীহীন' : 'Uncategorized'))}
                    </span>
                    {txn.payment_method && (
                      <>
                        <span>•</span>
                        <span className="rounded bg-gray-100 px-1 py-0.2 text-[10px] text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                          {txn.payment_method}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right text-xs sm:text-sm">
                  {getTypeBadge(txn.type, Number(txn.amount))}
                  <div className="text-[11px] text-gray-400">
                    {txn.account?.name || (language === 'bn' ? 'অ্যাকাউন্ট নেই' : 'No account')}
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => navigate(`/add-transaction?edit=${txn.id}`)}
                    className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                    title="Edit"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteId(txn.id)}
                    className="rounded p-1 text-gray-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction? This action will update your account balances and dashboard summaries."
        confirmText="Delete"
        variant="danger"
        loading={isDeleting}
      />
    </div>
  );
}
