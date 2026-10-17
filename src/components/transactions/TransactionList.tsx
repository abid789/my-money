import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { formatCurrency, formatRelativeDate } from '@/lib/utils';
import type { Transaction } from '@/types';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  RotateCcw,
  Edit2,
  Trash2,
  FileText,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  PlusCircle,
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';

interface TransactionListProps {
  transactions: Transaction[];
  onAddClick?: () => void;
}

const ITEMS_PER_PAGE = 15;

export function TransactionList({ transactions, onAddClick }: TransactionListProps) {
  const { deleteTransaction } = useData();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const totalPages = Math.ceil(transactions.length / ITEMS_PER_PAGE) || 1;
  const paginatedTransactions = transactions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setIsDeleting(true);
      await deleteTransaction(deleteId);
      toast.success('Transaction deleted');
    } catch {
      toast.error('Failed to delete transaction');
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

  if (transactions.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-800/90">
        <EmptyState
          icon={CreditCard}
          title="No transactions found"
          description="Try adjusting your search or filter parameters, or add a new transaction."
          action={
            onAddClick
              ? {
                  label: 'Add Transaction',
                  onClick: onAddClick,
                }
              : undefined
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Transaction Table / List */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-800/90">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/70 text-xs font-semibold text-gray-400 uppercase tracking-wider dark:border-gray-800 dark:bg-gray-800/60">
              <tr>
                <th className="px-4 py-3.5 sm:px-6">Details</th>
                <th className="hidden px-4 py-3.5 md:table-cell">Category</th>
                <th className="hidden px-4 py-3.5 sm:table-cell">Account</th>
                <th className="hidden px-4 py-3.5 lg:table-cell">Date</th>
                <th className="px-4 py-3.5 text-right sm:px-6">Amount</th>
                <th className="px-4 py-3.5 text-right sm:px-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {paginatedTransactions.map((txn) => {
                const isExpense = txn.type === 'expense';
                const isIncome = txn.type === 'income' || txn.type === 'refund';
                const isTransfer = txn.type === 'transfer';

                return (
                  <tr
                    key={txn.id}
                    className="group transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-750/30"
                  >
                    <td className="px-4 py-3.5 sm:px-6">
                      <div className="flex items-center gap-3">
                        <div
                          className={clsx(
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                            isIncome && 'bg-emerald-50 dark:bg-emerald-950/40',
                            isExpense && 'bg-rose-50 dark:bg-rose-950/40',
                            isTransfer && 'bg-blue-50 dark:bg-blue-950/40'
                          )}
                        >
                          {getTypeIcon(txn.type)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {txn.description}
                            </span>
                            {txn.notes && (
                              <span title={txn.notes}>
                                <FileText className="h-3 w-3 text-gray-400" />
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-400 md:hidden">
                            <span>{txn.category?.name || (isTransfer ? 'Transfer' : 'General')}</span>
                            <span>•</span>
                            <span>{formatRelativeDate(txn.date)}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="hidden px-4 py-3.5 text-xs text-gray-600 dark:text-gray-300 md:table-cell">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium dark:bg-gray-700 dark:text-gray-200">
                        {txn.category?.name || (isTransfer ? 'Transfer' : 'Uncategorized')}
                      </span>
                    </td>

                    <td className="hidden px-4 py-3.5 text-xs text-gray-600 dark:text-gray-300 sm:table-cell">
                      <div className="font-medium text-gray-800 dark:text-gray-200">
                        {txn.account?.name || 'Account'}
                      </div>
                      {txn.payment_method && (
                        <div className="text-[11px] text-gray-400">
                          {txn.payment_method}
                        </div>
                      )}
                    </td>

                    <td className="hidden px-4 py-3.5 text-xs text-gray-500 dark:text-gray-400 lg:table-cell">
                      {formatRelativeDate(txn.date)}
                    </td>

                    <td className="px-4 py-3.5 text-right font-semibold sm:px-6">
                      <span
                        className={clsx(
                          isIncome && 'text-emerald-600 dark:text-emerald-400',
                          isExpense && 'text-rose-600 dark:text-rose-400',
                          isTransfer && 'text-blue-600 dark:text-blue-400'
                        )}
                      >
                        {isExpense ? '-' : isIncome ? '+' : ''}
                        {formatCurrency(Number(txn.amount))}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-right sm:px-6">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => navigate(`/add-transaction?edit=${txn.id}`)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteId(txn.id)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 dark:border-gray-800 sm:px-6">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
              {Math.min(currentPage * ITEMS_PER_PAGE, transactions.length)} of{' '}
              {transactions.length} records
            </span>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-3 text-xs font-semibold text-gray-700 dark:text-gray-300">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Transaction"
        message="Are you sure you want to permanently delete this transaction? Your balances will be automatically recalculated."
        confirmText="Delete"
        variant="danger"
        loading={isDeleting}
      />
    </div>
  );
}
