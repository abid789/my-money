import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency, calculatePercentageUsed } from '@/lib/utils';
import type { Budget } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Target,
  PlusCircle,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  Trash2,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import clsx from 'clsx';
import toast from 'react-hot-toast';

export default function BudgetsPage() {
  const { budgets, categories, addBudget, updateBudget, deleteBudget, loading } = useData();
  const { language } = useLanguage();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [period, setPeriod] = useState<'monthly' | 'weekly' | 'yearly' | 'custom'>('monthly');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-01'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-28'));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openCreateModal = () => {
    setEditingBudget(null);
    setName('');
    setAmount('');
    setCategoryId('');
    setPeriod('monthly');
    setStartDate(format(new Date(), 'yyyy-MM-01'));
    setEndDate(format(new Date(), 'yyyy-MM-28'));
    setModalOpen(true);
  };

  const openEditModal = (b: Budget) => {
    setEditingBudget(b);
    setName(b.name);
    setAmount(String(b.amount));
    setCategoryId(b.category_id || '');
    setPeriod(b.period);
    setStartDate(b.start_date || format(new Date(), 'yyyy-MM-01'));
    setEndDate(b.end_date || format(new Date(), 'yyyy-MM-28'));
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amount || parseFloat(amount) <= 0) {
      toast.error(
        language === 'bn'
          ? 'অনুগ্রহ করে সঠিক নাম এবং বাজেটের পরিমাণ লিখুন'
          : 'Please enter a valid name and amount'
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const budgetData: Partial<Budget> = {
        name: name.trim(),
        amount: parseFloat(amount),
        category_id: categoryId || null,
        period,
        start_date: startDate,
        end_date: endDate,
        alert_threshold_50: true,
        alert_threshold_75: true,
        alert_threshold_90: true,
        alert_threshold_100: true,
        is_active: true,
      };

      if (editingBudget) {
        await updateBudget(editingBudget.id, budgetData);
        toast.success(language === 'bn' ? 'বাজেট আপডেট করা হয়েছে' : 'Budget updated');
      } else {
        await addBudget(budgetData);
        toast.success(language === 'bn' ? 'নতুন বাজেট সফলভাবে তৈরি হয়েছে' : 'Budget created');
      }
      setModalOpen(false);
    } catch {
      toast.error(language === 'bn' ? 'বাজেট সংরক্ষণ করতে ব্যর্থ হয়েছে' : 'Failed to save budget');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteBudget(deleteId);
      toast.success(language === 'bn' ? 'বাজেট মুছে ফেলা হয়েছে' : 'Budget removed');
    } catch {
      toast.error(language === 'bn' ? 'মুছে ফেলতে সমস্যা হয়েছে' : 'Failed to remove budget');
    } finally {
      setDeleteId(null);
    }
  };

  // Exceeded budgets warning list
  const exceededBudgets = budgets.filter((b) => Number(b.spent || 0) > Number(b.amount));

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
            {language === 'bn' ? 'স্মার্ট বাজেট পরিকল্পনা' : 'Smart Budget Management'}
          </h1>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {language === 'bn'
              ? 'খাতভিত্তিক বা মাসিক খরচের সর্বোচ্চ সীমা নির্ধারণ করুন এবং ট্র্যাক রাখুন।'
              : 'Set and track spending limits by category, month, or custom period.'}
          </p>
        </div>

        <Button
          variant="primary"
          onClick={openCreateModal}
          leftIcon={<PlusCircle className="h-4 w-4" />}
        >
          {language === 'bn' ? '+ নতুন বাজেট যোগ করুন' : 'Add Budget'}
        </Button>
      </div>

      {/* Alert Banner for Over-Budget Categories */}
      {exceededBudgets.length > 0 && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/60 dark:bg-rose-950/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-rose-900 dark:text-rose-200">
                {language === 'bn'
                  ? `বাজেট সতর্কতা: ${exceededBudgets.length}টি খাতে খরচের সীমা অতিক্রান্ত!`
                  : `Budget Alert: ${exceededBudgets.length} limit${exceededBudgets.length > 1 ? 's' : ''} exceeded!`}
              </h4>
              <p className="text-xs text-rose-700 dark:text-rose-300">
                {exceededBudgets
                  .map((b) => {
                    const over = Number(b.spent || 0) - Number(b.amount);
                    return `"${b.name}" ${language === 'bn' ? 'সীমা ছাড়িয়েছে' : 'is over budget by'} ${formatCurrency(over)}`;
                  })
                  .join(' • ')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Budgets Grid */}
      {budgets.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-800/90">
          <EmptyState
            icon={<Target className="h-10 w-10 text-gray-300 dark:text-gray-600" />}
            title={language === 'bn' ? 'কোনো বাজেট তৈরি করা হয়নি' : 'No budgets set yet'}
            description={
              language === 'bn'
                ? 'বাজার, রেস্টুরেন্ট, বাসা ভাড়া বা সম্পূর্ণ মাসের জন্য আপনার প্রথম বাজেট সীমা তৈরি করুন।'
                : 'Create your first budget limit for Groceries, Dining, Rent, or an overall monthly limit.'
            }
            action={{
              label: language === 'bn' ? '+ বাজেট তৈরি করুন' : 'Create Budget',
              onClick: openCreateModal,
            }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {budgets.map((budget) => {
            const spent = Number(budget.spent || 0);
            const limit = Number(budget.amount || 1);
            const remaining = limit - spent;
            const pct = calculatePercentageUsed(spent, limit);
            const isExceeded = spent > limit;

            let daysLeft = 0;
            try {
              if (budget.end_date) {
                daysLeft = Math.max(0, differenceInDays(parseISO(budget.end_date), new Date()));
              }
            } catch {
              daysLeft = 0;
            }

            return (
              <div
                key={budget.id}
                className={clsx(
                  'flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-md dark:bg-gray-800/90',
                  isExceeded
                    ? 'border-rose-300 dark:border-rose-800/60'
                    : pct >= 80
                    ? 'border-amber-300 dark:border-amber-800/60'
                    : 'border-gray-100 dark:border-gray-800'
                )}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {budget.name}
                      </h3>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                        <span className="capitalize">{budget.period}</span>
                        <span>•</span>
                        <span>{budget.category?.name || (language === 'bn' ? 'সকল খাত' : 'All Categories')}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(budget)}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
                        title={language === 'bn' ? 'সম্পাদনা' : 'Edit'}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteId(budget.id)}
                        className="rounded p-1 text-gray-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                        title={language === 'bn' ? 'মুছে ফেলুন' : 'Delete'}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-gray-500 dark:text-gray-400">
                        {language === 'bn' ? 'খরচ:' : 'Spent:'}{' '}
                        <strong className="text-gray-900 dark:text-white">
                          {formatCurrency(spent)}
                        </strong>
                      </span>
                      <span className="font-bold text-gray-900 dark:text-white">
                        {language === 'bn' ? 'সীমা:' : 'Limit:'} {formatCurrency(limit)}
                      </span>
                    </div>

                    <ProgressBar value={pct} size="md" showPercentage={false} />

                    <div className="flex items-center justify-between text-xs">
                      <span
                        className={clsx(
                          'font-medium',
                          isExceeded
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-gray-500 dark:text-gray-400'
                        )}
                      >
                        {isExceeded
                          ? (language === 'bn'
                              ? `সীমা ছাড়িয়েছে: ${formatCurrency(Math.abs(remaining))}`
                              : `Exceeded by ${formatCurrency(Math.abs(remaining))}`)
                          : (language === 'bn'
                              ? `অবশিষ্ট: ${formatCurrency(remaining)}`
                              : `Remaining: ${formatCurrency(remaining)}`)}
                      </span>
                      <span
                        className={clsx(
                          'font-bold',
                          isExceeded
                            ? 'text-rose-600 dark:text-rose-400'
                            : pct >= 80
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-teal-600 dark:text-teal-400'
                        )}
                      >
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-3 text-[11px] text-gray-400 dark:border-gray-700">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {daysLeft > 0
                      ? (language === 'bn' ? `${daysLeft} দিন বাকি` : `${daysLeft} days remaining`)
                      : (language === 'bn' ? 'মেয়াদ সমাপ্ত' : 'Period ended')}
                  </span>
                  {isExceeded ? (
                    <span className="flex items-center gap-1 font-semibold text-rose-500">
                      <AlertCircle className="h-3 w-3" /> {language === 'bn' ? 'সীমার বাইরে' : 'Over limit'}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" /> {language === 'bn' ? 'নিয়ন্ত্রণে আছে' : 'On track'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          editingBudget
            ? (language === 'bn' ? 'বাজেট সম্পাদনা' : 'Edit Budget')
            : (language === 'bn' ? 'নতুন বাজেট তৈরি করুন' : 'Create New Budget')
        }
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label={language === 'bn' ? 'বাজেটের নাম *' : 'Budget Name *'}
            placeholder={language === 'bn' ? 'যেমন: মাসিক বাজার ও খাবার খরচ' : 'e.g. Monthly Food & Dining, Total Monthly'}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            type="number"
            step="1"
            min="1"
            label={language === 'bn' ? 'বাজেট সীমা (৳ BDT) *' : 'Budget Limit (৳ BDT) *'}
            placeholder="e.g. 5000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />

          <Select
            label={language === 'bn' ? 'নির্দিষ্ট খাতের বাজেট (ঐচ্ছিক)' : 'Apply to Category (Optional)'}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            options={[
              { value: '', label: language === 'bn' ? 'সকল খাত (সার্বিক মাসিক বাজেট)' : 'All Categories (Overall Budget)' },
              ...categories
                .filter((c) => c.type === 'expense')
                .map((c) => ({ value: c.id, label: c.name })),
            ]}
          />

          <Select
            label={language === 'bn' ? 'মেয়াদ' : 'Period'}
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
            options={[
              { value: 'monthly', label: language === 'bn' ? 'মাসিক (Monthly)' : 'Monthly' },
              { value: 'weekly', label: language === 'bn' ? 'সাপ্তাহিক (Weekly)' : 'Weekly' },
              { value: 'yearly', label: language === 'bn' ? 'বার্ষিক (Yearly)' : 'Yearly' },
              { value: 'custom', label: language === 'bn' ? 'কাস্টম তারিখ' : 'Custom Date Range' },
            ]}
          />

          {period === 'custom' && (
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="date"
                label={language === 'bn' ? 'শুরুর তারিখ' : 'Start Date'}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <Input
                type="date"
                label={language === 'bn' ? 'শেষ তারিখ' : 'End Date'}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
            >
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button type="submit" variant="primary" loading={isSubmitting}>
              {editingBudget
                ? (language === 'bn' ? 'পরিবর্তন সংরক্ষণ' : 'Save Changes')
                : (language === 'bn' ? 'বাজেট তৈরি করুন' : 'Create Budget')}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title={language === 'bn' ? 'বাজেট মুছে ফেলবেন?' : 'Remove Budget'}
        message={
          language === 'bn'
            ? 'আপনি কি নিশ্চিত যে এই বাজেট সীমাটি মুছে ফেলতে চান? আপনার সংরক্ষিত পূর্বের কোনো লেনদেন মোছা হবে না।'
            : 'Are you sure you want to remove this budget? Your recorded transactions will not be deleted.'
        }
        confirmText={language === 'bn' ? 'হ্যাঁ, মুছে ফেলুন' : 'Remove'}
        variant="danger"
      />
    </div>
  );
}
