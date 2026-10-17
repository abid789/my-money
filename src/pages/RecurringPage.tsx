import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { RecurringTransaction, TransactionType } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Repeat,
  PlusCircle,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Trash2,
  Pause,
  Play,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';
import { format, addMonths } from 'date-fns';
import clsx from 'clsx';
import toast from 'react-hot-toast';

export default function RecurringPage() {
  const {
    recurringTransactions,
    categories,
    accounts,
    addRecurring,
    updateRecurring,
    deleteRecurring,
    markRecurringPaid,
  } = useData();

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form
  const [description, setDescription] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [nextDueDate, setNextDueDate] = useState(format(addMonths(new Date(), 1), 'yyyy-MM-01'));
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openCreateModal = () => {
    setDescription('');
    setType('expense');
    setAmount('');
    setFrequency('monthly');
    setNextDueDate(format(addMonths(new Date(), 1), 'yyyy-MM-01'));
    setCategoryId('');
    setAccountId(accounts[0]?.id || '');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount || parseFloat(amount) <= 0 || !accountId) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setIsSubmitting(true);
      await addRecurring({
        description: description.trim(),
        type,
        amount: parseFloat(amount),
        frequency,
        next_due_date: nextDueDate,
        category_id: categoryId || null,
        account_id: accountId,
        is_active: true,
        auto_create: false,
      });

      toast.success('Recurring transaction rule saved');
      setModalOpen(false);
    } catch {
      toast.error('Failed to save recurring schedule');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkPaid = async (id: string) => {
    try {
      await markRecurringPaid(id);
      toast.success('Payment recorded and due date advanced!');
    } catch {
      toast.error('Failed to record payment');
    }
  };

  const handleToggleActive = async (rule: RecurringTransaction) => {
    try {
      await updateRecurring(rule.id, { is_active: !rule.is_active });
      toast.success(rule.is_active ? 'Recurring paused' : 'Recurring resumed');
    } catch {
      toast.error('Failed to toggle status');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteRecurring(deleteId);
      toast.success('Recurring schedule removed');
    } catch {
      toast.error('Failed to delete schedule');
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
            Recurring Bills & Regular Income
          </h1>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Track repeating bills, rent, WiFi subscriptions, salary, and tuition.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={openCreateModal}
          leftIcon={<PlusCircle className="h-4 w-4" />}
        >
          Add Recurring Rule
        </Button>
      </div>

      {recurringTransactions.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-800/90">
          <EmptyState
            icon={<Repeat className="h-10 w-10 text-gray-300 dark:text-gray-600" />}
            title="No recurring transactions set"
            description="Add recurring rules like monthly WiFi bill, apartment rent, tuition salary, or Netflix subscription."
            action={{
              label: 'Add Recurring Rule',
              onClick: openCreateModal,
            }}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {recurringTransactions.map((rule) => {
            const isExpense = rule.type === 'expense';

            return (
              <div
                key={rule.id}
                className={clsx(
                  'flex flex-col justify-between gap-4 rounded-2xl border bg-white p-4 shadow-sm transition-all sm:flex-row sm:items-center dark:bg-gray-800/90',
                  rule.is_active
                    ? 'border-gray-100 dark:border-gray-800'
                    : 'border-dashed border-gray-300 opacity-60 dark:border-gray-700'
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={clsx(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                      isExpense ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40'
                    )}
                  >
                    {isExpense ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownLeft className="h-5 w-5" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {rule.description}
                      </h4>
                      <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                        {rule.frequency}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Next Due: {formatDate(rule.next_due_date)}
                      </span>
                      <span>•</span>
                      <span>{rule.account?.name || 'Account'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 border-t border-gray-100 pt-3 sm:border-0 sm:pt-0">
                  <div className="text-left sm:text-right">
                    <span
                      className={clsx(
                        'text-base font-bold',
                        isExpense
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      )}
                    >
                      {isExpense ? '-' : '+'}
                      {formatCurrency(Number(rule.amount))}
                    </span>
                    <div className="text-[11px] text-gray-400">
                      {rule.category?.name || 'General'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleMarkPaid(rule.id)}
                      leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                    >
                      Mark Paid
                    </Button>

                    <button
                      onClick={() => handleToggleActive(rule)}
                      className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                      title={rule.is_active ? 'Pause' : 'Resume'}
                    >
                      {rule.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 text-emerald-500" />}
                    </button>

                    <button
                      onClick={() => setDeleteId(rule.id)}
                      className="rounded-lg p-2 text-gray-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Recurring Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Recurring Payment / Income"
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Description *"
            placeholder="e.g. WiFi Bill, Home Rent, Salary"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            autoFocus
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Type"
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              options={[
                { value: 'expense', label: 'Expense (Bill)' },
                { value: 'income', label: 'Income (Salary/Tuition)' },
              ]}
            />

            <Input
              type="number"
              step="0.01"
              min="1"
              label="Amount (৳ BDT) *"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Frequency"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as any)}
              options={[
                { value: 'monthly', label: 'Monthly' },
                { value: 'weekly', label: 'Weekly' },
                { value: 'daily', label: 'Daily' },
                { value: 'yearly', label: 'Yearly' },
              ]}
            />

            <Input
              type="date"
              label="Next Due Date *"
              value={nextDueDate}
              onChange={(e) => setNextDueDate(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              options={[
                { value: '', label: 'Select Category' },
                ...categories
                  .filter((c) => c.type === type)
                  .map((c) => ({ value: c.id, label: c.name })),
              ]}
            />

            <Select
              label="Account *"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              options={[
                { value: '', label: 'Select Account' },
                ...accounts.map((a) => ({ value: a.id, label: a.name })),
              ]}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={isSubmitting}>
              Create Schedule
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Recurring Schedule"
        message="Are you sure you want to delete this recurring schedule? Already recorded payments will remain in history."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
