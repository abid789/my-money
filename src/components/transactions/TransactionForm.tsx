import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import type { Transaction, TransactionType } from '@/types';
import { format } from 'date-fns';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  RotateCcw,
  Sparkles,
  Repeat,
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';

interface TransactionFormProps {
  initialData?: Transaction;
  isEdit?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const PAYMENT_METHODS = [
  { value: 'Cash', label: 'Cash' },
  { value: 'bKash', label: 'bKash' },
  { value: 'Nagad', label: 'Nagad' },
  { value: 'Rocket', label: 'Rocket' },
  { value: 'Bank Transfer', label: 'Bank Transfer' },
  { value: 'Debit Card', label: 'Debit Card' },
  { value: 'Credit Card', label: 'Credit Card' },
  { value: 'Other', label: 'Other' },
];

export function TransactionForm({
  initialData,
  isEdit = false,
  onSuccess,
  onCancel,
}: TransactionFormProps) {
  const { user } = useAuth();
  const {
    accounts,
    categories,
    addTransaction,
    updateTransaction,
    addRecurring,
  } = useData();
  const navigate = useNavigate();

  const [type, setType] = useState<TransactionType>(initialData?.type || 'expense');
  const [amount, setAmount] = useState<string>(initialData ? String(initialData.amount) : '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [date, setDate] = useState(initialData?.date || format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState(initialData?.time || format(new Date(), 'HH:mm'));
  const [categoryId, setCategoryId] = useState(initialData?.category_id || '');
  const [subCategory, setSubCategory] = useState(initialData?.subcategory || '');
  const [accountId, setAccountId] = useState(initialData?.account_id || '');
  const [toAccountId, setToAccountId] = useState(initialData?.to_account_id || '');
  const [paymentMethod, setPaymentMethod] = useState(initialData?.payment_method || 'Cash');
  const [merchant, setMerchant] = useState(initialData?.merchant || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [tags, setTags] = useState(initialData?.tags?.join(', ') || '');

  // Recurring options
  const [isRecurring, setIsRecurring] = useState(initialData?.is_recurring || false);
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Filter categories matching current transaction type
  const availableCategories = categories.filter((cat) => {
    if (type === 'income') return cat.type === 'income';
    if (type === 'expense') return cat.type === 'expense';
    return true; // For transfer/refund, show all or let user pick
  });

  const validate = () => {
    const errs: Record<string, string> = {};
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      errs.amount = 'Please enter a valid amount greater than 0';
    }
    if (!date) {
      errs.date = 'Date is required';
    }
    // Only transfers require source and destination accounts
    if (type === 'transfer') {
      if (!accountId) {
        errs.accountId = 'Please select source account for transfer';
      }
      if (!toAccountId) {
        errs.toAccountId = 'Please select destination account';
      } else if (toAccountId === accountId) {
        errs.toAccountId = 'Source and destination accounts must be different';
      }
    }
    // Note: description, category, and account are optional for income/expense/refund transactions!
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setLoading(true);

      const parsedTags = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const txnData: Partial<Transaction> = {
        type,
        amount: parseFloat(amount),
        description: description.trim() || null,
        date,
        time: time || null,
        category_id: type === 'transfer' ? null : categoryId || null,
        subcategory: subCategory.trim() || null,
        account_id: accountId || null,
        to_account_id: type === 'transfer' ? toAccountId : null,
        payment_method: paymentMethod || null,
        merchant: merchant.trim() || null,
        notes: notes.trim() || null,
        tags: parsedTags,
        is_recurring: isRecurring,
      };

      if (isEdit && initialData) {
        await updateTransaction(initialData.id, txnData);
        toast.success('Transaction updated successfully');
      } else {
        await addTransaction(txnData);

        // If recurring was ticked, also create a recurring schedule
        if (isRecurring && user) {
          await addRecurring({
            type,
            amount: parseFloat(amount),
            description: description.trim(),
            category_id: type === 'transfer' ? null : categoryId || null,
            account_id: accountId,
            frequency,
            next_due_date: date,
            is_active: true,
            auto_create: false,
          });
        }

        toast.success('Transaction recorded successfully');
      }

      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/transactions');
      }
    } catch (err: unknown) {
      console.error(err);
      toast.error('Failed to save transaction. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Type Selector Tabs */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { key: 'expense', label: 'Expense', icon: ArrowUpRight, color: 'text-rose-600 bg-rose-50 border-rose-300 dark:bg-rose-950/40 dark:border-rose-700' },
          { key: 'income', label: 'Income', icon: ArrowDownLeft, color: 'text-emerald-600 bg-emerald-50 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-700' },
          { key: 'transfer', label: 'Transfer', icon: ArrowLeftRight, color: 'text-blue-600 bg-blue-50 border-blue-300 dark:bg-blue-950/40 dark:border-blue-700' },
          { key: 'refund', label: 'Refund', icon: RotateCcw, color: 'text-teal-600 bg-teal-50 border-teal-300 dark:bg-teal-950/40 dark:border-teal-700' },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = type === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setType(tab.key as TransactionType);
                setCategoryId(''); // Reset category on type switch
              }}
              className={clsx(
                'flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-semibold transition-all sm:text-sm',
                isSelected
                  ? tab.color + ' ring-2 ring-offset-1 ring-teal-500'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Amount Input */}
      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-600 uppercase tracking-wider dark:text-gray-300">
          Amount (BDT ৳) *
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-2xl font-bold text-gray-400">
            ৳
          </span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              if (errors.amount) setErrors((prev) => ({ ...prev, amount: '' }));
            }}
            placeholder="0.00"
            className={clsx(
              'w-full rounded-2xl border bg-white py-3.5 pl-12 pr-4 text-2xl font-bold text-gray-900 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white',
              errors.amount ? 'border-rose-500 ring-rose-500' : 'border-gray-200 dark:border-gray-700'
            )}
            autoFocus={!isEdit}
          />
        </div>
        {errors.amount && (
          <p className="mt-1 text-xs text-rose-500">{errors.amount}</p>
        )}
      </div>

      {/* Description & Category */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Description (Optional)"
          placeholder="e.g. Grocery, Salary (Leave empty if not needed)"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            if (errors.description) setErrors((prev) => ({ ...prev, description: '' }));
          }}
          error={errors.description}
        />

        {type !== 'transfer' ? (
          <div>
            <Select
              label="Category (Optional)"
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                if (errors.categoryId) setErrors((prev) => ({ ...prev, categoryId: '' }));
              }}
              error={errors.categoryId}
              options={[
                { value: '', label: 'Uncategorized / শ্রেণীহীন' },
                ...availableCategories.map((c) => ({
                  value: c.id,
                  label: c.name,
                })),
              ]}
            />
          </div>
        ) : (
          <div>
            <Select
              label="Transfer To Account *"
              value={toAccountId}
              onChange={(e) => {
                setToAccountId(e.target.value);
                if (errors.toAccountId) setErrors((prev) => ({ ...prev, toAccountId: '' }));
              }}
              error={errors.toAccountId}
              options={[
                { value: '', label: 'Select destination account' },
                ...accounts
                  .filter((a) => a.id !== accountId)
                  .map((a) => ({
                    value: a.id,
                    label: `${a.name} (${a.type})`,
                  })),
              ]}
            />
          </div>
        )}
      </div>

      {/* Account & Payment Method */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select
          label={type === 'transfer' ? 'From Account *' : 'Account (Optional)'}
          value={accountId}
          onChange={(e) => {
            setAccountId(e.target.value);
            if (errors.accountId) setErrors((prev) => ({ ...prev, accountId: '' }));
          }}
          error={errors.accountId}
          options={[
            { value: '', label: type === 'transfer' ? 'Select source account' : 'No Account / একাউন্ট ছাড়া' },
            ...accounts.map((a) => ({
              value: a.id,
              label: `${a.name} (${a.type})`,
            })),
          ]}
        />

        <Select
          label="Payment Method"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          options={PAYMENT_METHODS}
        />
      </div>

      {/* Date & Time */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          type="date"
          label="Date *"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            if (errors.date) setErrors((prev) => ({ ...prev, date: '' }));
          }}
          error={errors.date}
        />

        <Input
          type="time"
          label="Time (Optional)"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
      </div>

      {/* Optional: Merchant & Subcategory */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Merchant / Recipient (Optional)"
          placeholder="e.g. Shwapno, Pathao, Aarong"
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
        />

        <Input
          label="Subcategory / Label (Optional)"
          placeholder="e.g. Vegetables, Dinner, Subscription"
          value={subCategory}
          onChange={(e) => setSubCategory(e.target.value)}
        />
      </div>

      {/* Notes & Tags */}
      <div className="space-y-4">
        <Textarea
          label="Notes (Optional)"
          placeholder="Additional details about this transaction..."
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <Input
          label="Tags (Optional, comma-separated)"
          placeholder="e.g. Eid, Vacation, Urgent, Medical"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />
      </div>

      {/* Recurring Transaction Toggle */}
      {!isEdit && (
        <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-gray-800/40">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            <div className="flex items-center gap-2">
              <Repeat className="h-4 w-4 text-teal-600" />
              <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                Repeat this transaction automatically
              </span>
            </div>
          </label>

          {isRecurring && (
            <div className="mt-3 pl-7">
              <Select
                label="Frequency"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as any)}
                options={[
                  { value: 'daily', label: 'Daily' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'monthly', label: 'Monthly' },
                  { value: 'yearly', label: 'Yearly' },
                ]}
              />
            </div>
          )}
        </div>
      )}

      {/* Submit / Cancel Buttons */}
      <div className="flex items-center justify-end gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          loading={loading}
          leftIcon={<Sparkles className="h-4 w-4" />}
        >
          {isEdit ? 'Update Transaction' : 'Save Transaction'}
        </Button>
      </div>
    </form>
  );
}
