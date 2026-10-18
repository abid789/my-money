import { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { LoanRecord, LoanType, LoanStatus, LoanRepayment } from '@/types';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Textarea } from '@/components/ui/Textarea';
import {
  HandCoins,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowUpDown,
  AlertTriangle,
  AlertCircle,
  PlusCircle,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  Phone,
  User,
  Wallet,
  Clock,
  History,
  Trash2,
  Edit,
  RotateCcw,
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';

export default function LoansPage() {
  const {
    loans,
    loanSummary,
    accounts,
    addLoan,
    updateLoan,
    deleteLoan,
    addLoanRepayment,
    deleteLoanRepayment,
    isDemoMode,
    resetDemoData,
  } = useData();
  const { language } = useLanguage();
  const { isPrivacyBlurEnabled } = useTheme();

  // Active view tab
  const [activeTab, setActiveTab] = useState<LoanType>('receivable');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | LoanStatus>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'dueDate' | 'amountDesc'>('newest');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<LoanRecord | null>(null);
  const [repayingLoan, setRepayingLoan] = useState<LoanRecord | null>(null);
  const [historyLoan, setHistoryLoan] = useState<LoanRecord | null>(null);
  const [deletingLoanId, setDeletingLoanId] = useState<string | null>(null);

  // Add / Edit Form State
  const [formType, setFormType] = useState<LoanType>('receivable');
  const [formPersonName, setFormPersonName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formStartDate, setFormStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [formDueDate, setFormDueDate] = useState('');
  const [formAccountId, setFormAccountId] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Repayment Form State
  const [repAmount, setRepAmount] = useState('');
  const [repDate, setRepDate] = useState(new Date().toISOString().slice(0, 10));
  const [repPaymentMethod, setRepPaymentMethod] = useState('Cash');
  const [repAccountId, setRepAccountId] = useState('');
  const [repNotes, setRepNotes] = useState('');
  const [repLoading, setRepLoading] = useState(false);

  // Filtered Loans for active tab
  const filteredLoans = useMemo(() => {
    return loans
      .filter((l) => l.type === activeTab)
      .filter((l) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          l.person_name.toLowerCase().includes(q) ||
          (l.phone_number && l.phone_number.includes(q)) ||
          (l.description && l.description.toLowerCase().includes(q))
        );
      })
      .filter((l) => {
        if (statusFilter === 'all') return true;
        return l.status === statusFilter;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.created_at || b.start_date).getTime() - new Date(a.created_at || a.start_date).getTime();
        }
        if (sortBy === 'dueDate') {
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        }
        if (sortBy === 'amountDesc') {
          return b.original_amount - a.original_amount;
        }
        return 0;
      });
  }, [loans, activeTab, searchQuery, statusFilter, sortBy]);

  // Open Add Modal
  const handleOpenAdd = (type: LoanType = activeTab) => {
    setFormType(type);
    setFormPersonName('');
    setFormPhone('');
    setFormAmount('');
    setFormStartDate(new Date().toISOString().slice(0, 10));
    setFormDueDate('');
    setFormAccountId(accounts[0]?.id || '');
    setFormDescription('');
    setEditingLoan(null);
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (loan: LoanRecord) => {
    setEditingLoan(loan);
    setFormType(loan.type);
    setFormPersonName(loan.person_name);
    setFormPhone(loan.phone_number || '');
    setFormAmount(String(loan.original_amount));
    setFormStartDate(loan.start_date || new Date().toISOString().slice(0, 10));
    setFormDueDate(loan.due_date || '');
    setFormAccountId(loan.account_id || '');
    setFormDescription(loan.description || '');
    setIsAddModalOpen(true);
  };

  // Save Loan (Create or Update)
  const handleSaveLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPersonName.trim()) {
      toast.error(language === 'bn' ? 'ব্যক্তির নাম দিন' : 'Person name is required');
      return;
    }
    const amountNum = parseFloat(formAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error(language === 'bn' ? 'সঠিক টাকার পরিমাণ দিন' : 'Enter a valid amount');
      return;
    }

    setFormLoading(true);
    try {
      if (editingLoan) {
        await updateLoan(editingLoan.id, {
          person_name: formPersonName.trim(),
          phone_number: formPhone.trim() || null,
          original_amount: amountNum,
          start_date: formStartDate,
          due_date: formDueDate || null,
          account_id: formAccountId || null,
          description: formDescription.trim() || null,
        });
      } else {
        await addLoan({
          type: formType,
          person_name: formPersonName.trim(),
          phone_number: formPhone.trim() || null,
          original_amount: amountNum,
          start_date: formStartDate,
          due_date: formDueDate || null,
          account_id: formAccountId || null,
          description: formDescription.trim() || null,
        });
      }
      setIsAddModalOpen(false);
      setEditingLoan(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save loan');
    } finally {
      setFormLoading(false);
    }
  };

  // Open Repay Modal
  const handleOpenRepay = (loan: LoanRecord) => {
    setRepayingLoan(loan);
    setRepAmount('');
    setRepDate(new Date().toISOString().slice(0, 10));
    setRepPaymentMethod('Cash');
    setRepAccountId(loan.account_id || accounts[0]?.id || '');
    setRepNotes('');
  };

  // Submit Repayment
  const handleSubmitRepayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repayingLoan) return;

    const amountNum = parseFloat(repAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error(language === 'bn' ? 'সঠিক কিস্তির পরিমাণ দিন' : 'Enter a valid repayment amount');
      return;
    }
    if (amountNum > repayingLoan.remaining_balance) {
      toast.error(
        language === 'bn'
          ? `কিস্তি বাকি টাকার (৳${repayingLoan.remaining_balance.toLocaleString()}) চেয়ে বেশি হতে পারে না`
          : `Amount cannot exceed remaining balance (৳${repayingLoan.remaining_balance.toLocaleString()})`
      );
      return;
    }

    setRepLoading(true);
    try {
      await addLoanRepayment(repayingLoan.id, {
        amount: amountNum,
        date: repDate,
        payment_method: repPaymentMethod,
        account_id: repAccountId || null,
        notes: repNotes.trim() || null,
      });
      setRepayingLoan(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to record repayment');
    } finally {
      setRepLoading(false);
    }
  };

  // Render Status Badge
  const renderStatusBadge = (status: LoanStatus) => {
    switch (status) {
      case 'paid':
        return (
          <Badge variant="success" size="sm">
            {language === 'bn' ? 'পরিশোধিত' : 'Paid'}
          </Badge>
        );
      case 'partially_paid':
        return (
          <Badge variant="info" size="sm">
            {language === 'bn' ? 'আংশিক পরিশোধ' : 'Partial'}
          </Badge>
        );
      case 'overdue':
        return (
          <Badge variant="danger" size="sm">
            {language === 'bn' ? 'মেয়াদোত্তীর্ণ' : 'Overdue'}
          </Badge>
        );
      case 'unpaid':
      default:
        return (
          <Badge variant="warning" size="sm">
            {language === 'bn' ? 'অপরিশোধিত' : 'Unpaid'}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Demo Mode Notice Banner */}
      {isDemoMode && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-teal-200 bg-teal-50/70 p-4 text-xs dark:border-teal-900/60 dark:bg-teal-950/40">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-600 font-bold text-white shadow-xs">
              🎯
            </span>
            <span className="font-semibold text-teal-900 dark:text-teal-200">
              {language === 'bn'
                ? 'ডেমো মোড সক্রিয়: আপনি নমুনা ঋণের হিসাব পরীক্ষা করছেন। কোনো রিয়েল ডাটা পরিবর্তন হবে না।'
                : 'Demo Mode Active: Exploring sample loans and repayments. Private data is safe.'}
            </span>
          </div>
          <button
            type="button"
            onClick={resetDemoData}
            className="flex items-center gap-1.5 self-start sm:self-auto rounded-lg bg-teal-600 hover:bg-teal-500 px-3 py-1.5 font-bold text-white transition-all shadow-xs"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{language === 'bn' ? 'ডেমো রিসেট' : 'Reset Demo'}</span>
          </button>
        </div>
      )}

      {/* ─── 1. 5 KPI Summary Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {/* Total Money Receivable */}
        <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-xs transition-all hover:shadow-md dark:border-emerald-950/50 dark:bg-gray-800/90">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
              {language === 'bn' ? 'মোট পাওনা টাকা' : 'Money Receivable'}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <HandCoins className="h-4 w-4" />
            </div>
          </div>
          <p className="text-[10px] text-gray-400 mt-1">
            {language === 'bn' ? 'মানুষ আমাকে দেবে' : 'People who owe me'}
          </p>
          <p
            className={clsx(
              'mt-2 text-lg sm:text-xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400',
              isPrivacyBlurEnabled && 'privacy-blur-target'
            )}
          >
            {isPrivacyBlurEnabled ? '৳ •••••' : formatCurrency(loanSummary.totalReceivable)}
          </p>
        </div>

        {/* Total Money Payable */}
        <div className="rounded-2xl border border-rose-100 bg-white p-4 shadow-xs transition-all hover:shadow-md dark:border-rose-950/50 dark:bg-gray-800/90">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
              {language === 'bn' ? 'মোট দেনা টাকা' : 'Money Payable'}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <p className="text-[10px] text-gray-400 mt-1">
            {language === 'bn' ? 'আমি মানুষকে দেব' : 'People I owe to'}
          </p>
          <p
            className={clsx(
              'mt-2 text-lg sm:text-xl font-extrabold tracking-tight text-rose-600 dark:text-rose-400',
              isPrivacyBlurEnabled && 'privacy-blur-target'
            )}
          >
            {isPrivacyBlurEnabled ? '৳ •••••' : formatCurrency(loanSummary.totalPayable)}
          </p>
        </div>

        {/* Net Lending Balance */}
        <div className="rounded-2xl border border-indigo-100 bg-white p-4 shadow-xs transition-all hover:shadow-md dark:border-indigo-950/50 dark:bg-gray-800/90">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
              {language === 'bn' ? 'নীট ধার ব্যালেন্স' : 'Net Lending Balance'}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <ArrowUpDown className="h-4 w-4" />
            </div>
          </div>
          <p className="text-[10px] text-gray-400 mt-1">
            {language === 'bn' ? 'পাওনা বিয়োগ দেনা' : 'Receivable minus Payable'}
          </p>
          <p
            className={clsx(
              'mt-2 text-lg sm:text-xl font-extrabold tracking-tight',
              loanSummary.netLendingBalance >= 0
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-amber-600 dark:text-amber-400',
              isPrivacyBlurEnabled && 'privacy-blur-target'
            )}
          >
            {isPrivacyBlurEnabled ? '৳ •••••' : formatCurrency(loanSummary.netLendingBalance)}
          </p>
        </div>

        {/* Overdue Receivables */}
        <div className="rounded-2xl border border-amber-100 bg-white p-4 shadow-xs transition-all hover:shadow-md dark:border-amber-950/50 dark:bg-gray-800/90">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
              {language === 'bn' ? 'মেয়াদোত্তীর্ণ পাওনা' : 'Overdue Receivable'}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <p className="text-[10px] text-gray-400 mt-1">
            {language === 'bn' ? 'সময় পার হয়ে গেছে' : 'Past due deadline'}
          </p>
          <p
            className={clsx(
              'mt-2 text-lg sm:text-xl font-extrabold tracking-tight text-amber-600 dark:text-amber-400',
              isPrivacyBlurEnabled && 'privacy-blur-target'
            )}
          >
            {isPrivacyBlurEnabled ? '৳ •••••' : formatCurrency(loanSummary.overdueReceivable)}
          </p>
        </div>

        {/* Overdue Payables */}
        <div className="col-span-2 sm:col-span-1 rounded-2xl border border-red-100 bg-white p-4 shadow-xs transition-all hover:shadow-md dark:border-red-950/50 dark:bg-gray-800/90">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
              {language === 'bn' ? 'মেয়াদোত্তীর্ণ দেনা' : 'Overdue Payable'}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <p className="text-[10px] text-gray-400 mt-1">
            {language === 'bn' ? 'দ্রুত পরিশোধ করুন' : 'Urgent to pay'}
          </p>
          <p
            className={clsx(
              'mt-2 text-lg sm:text-xl font-extrabold tracking-tight text-red-600 dark:text-red-400',
              isPrivacyBlurEnabled && 'privacy-blur-target'
            )}
          >
            {isPrivacyBlurEnabled ? '৳ •••••' : formatCurrency(loanSummary.overduePayable)}
          </p>
        </div>
      </div>

      {/* ─── 2. Controls & Tab Navigation ──────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Tab buttons */}
        <div className="flex rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
          <button
            type="button"
            onClick={() => setActiveTab('receivable')}
            className={clsx(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all',
              activeTab === 'receivable'
                ? 'bg-white text-emerald-600 shadow-sm dark:bg-gray-700 dark:text-emerald-400'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            )}
          >
            <HandCoins className="h-4 w-4" />
            <span>{language === 'bn' ? 'পাওনা টাকা (Receivable)' : 'Money Receivable'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('payable')}
            className={clsx(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all',
              activeTab === 'payable'
                ? 'bg-white text-rose-600 shadow-sm dark:bg-gray-700 dark:text-rose-400'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            )}
          >
            <ArrowUpRight className="h-4 w-4" />
            <span>{language === 'bn' ? 'দেনা টাকা (Payable)' : 'Money Payable'}</span>
          </button>
        </div>

        {/* Action Button */}
        <Button
          onClick={() => handleOpenAdd(activeTab)}
          leftIcon={<PlusCircle className="h-4 w-4" />}
          className={clsx(
            'shadow-md',
            activeTab === 'receivable'
              ? 'bg-emerald-600 hover:bg-emerald-500'
              : 'bg-rose-600 hover:bg-rose-500'
          )}
        >
          {activeTab === 'receivable'
            ? language === 'bn'
              ? '+ নতুন পাওনা যোগ'
              : '+ Add Receivable'
            : language === 'bn'
            ? '+ নতুন দেনা যোগ'
            : '+ Add Payable'}
        </Button>
      </div>

      {/* ─── 3. Search and Status Filters ───────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              language === 'bn'
                ? 'ব্যক্তির নাম, ফোন নম্বর বা নোট দিয়ে খুঁজুন...'
                : 'Search by person name, phone, or notes...'
            }
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-xs focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['all', 'unpaid', 'partially_paid', 'paid', 'overdue'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={clsx(
                'whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all',
                statusFilter === st
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              )}
            >
              {st === 'all' && (language === 'bn' ? 'সব' : 'All')}
              {st === 'unpaid' && (language === 'bn' ? 'অপরিশোধিত' : 'Unpaid')}
              {st === 'partially_paid' && (language === 'bn' ? 'আংশিক' : 'Partial')}
              {st === 'paid' && (language === 'bn' ? 'পরিশোধিত' : 'Paid')}
              {st === 'overdue' && (language === 'bn' ? 'মেয়াদোত্তীর্ণ' : 'Overdue')}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center justify-end">
          <select
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 focus:border-teal-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            <option value="newest">{language === 'bn' ? 'নতুন আগে' : 'Newest First'}</option>
            <option value="dueDate">{language === 'bn' ? 'পরিশোধের তারিখ অনুসারে' : 'Due Date'}</option>
            <option value="amountDesc">{language === 'bn' ? 'সর্বোচ্চ টাকা আগে' : 'Highest Amount'}</option>
          </select>
        </div>
      </div>

      {/* ─── 4. Loan Cards Grid ─────────────────────────────────────────── */}
      {filteredLoans.length === 0 ? (
        <EmptyState
          icon={HandCoins}
          title={
            activeTab === 'receivable'
              ? language === 'bn'
                ? 'কোনো পাওনা টাকার রেকর্ড নেই'
                : 'No Money Receivable'
              : language === 'bn'
              ? 'কোনো দেনা টাকার রেকর্ড নেই'
              : 'No Money Payable'
          }
          description={
            activeTab === 'receivable'
              ? language === 'bn'
                ? 'কাউকে ব্যক্তিগত ধার দিলে এখানে এন্ট্রি করে রাখুন।'
                : 'Record personal loans given to friends or relatives to track repayments.'
              : language === 'bn'
              ? 'কারো কাছ থেকে ধার নিলে এখানে লিখে রাখুন যাতে যথাসময়ে শোধ করতে পারেন।'
              : 'Keep track of money borrowed so you never miss a repayment deadline.'
          }
          action={{
            label:
              activeTab === 'receivable'
                ? language === 'bn'
                  ? '+ নতুন পাওনা যোগ'
                  : '+ Add Receivable'
                : language === 'bn'
                ? '+ নতুন দেনা যোগ'
                : '+ Add Payable',
            onClick: () => handleOpenAdd(activeTab),
          }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredLoans.map((loan) => {
            const pct = Math.min(
              100,
              Math.round(((loan.total_repaid || 0) / (loan.original_amount || 1)) * 100)
            );
            const isOverdue = loan.status === 'overdue';
            const linkedAcc = accounts.find((a) => a.id === loan.account_id);

            return (
              <div
                key={loan.id}
                className={clsx(
                  'group flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-xs transition-all hover:shadow-md dark:bg-gray-800/90',
                  isOverdue
                    ? 'border-red-300 dark:border-red-900/60'
                    : 'border-gray-100 hover:border-teal-200 dark:border-gray-700'
                )}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={clsx(
                          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold shadow-xs',
                          loan.type === 'receivable'
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                            : 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                        )}
                      >
                        {loan.person_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-gray-900 dark:text-white leading-tight">
                          {loan.person_name}
                        </h3>
                        {loan.phone_number ? (
                          <a
                            href={`tel:${loan.phone_number}`}
                            className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-teal-600 dark:text-gray-400"
                          >
                            <Phone className="h-3 w-3" />
                            <span>{loan.phone_number}</span>
                          </a>
                        ) : (
                          <span className="text-[11px] text-gray-400">
                            {formatDate(loan.start_date)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div>{renderStatusBadge(loan.status)}</div>
                  </div>

                  {/* Amount Breakdown */}
                  <div className="mt-4 rounded-xl bg-gray-50 p-3.5 dark:bg-gray-900/50">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">
                        {language === 'bn' ? 'মূল পরিমাণ' : 'Original Amount'}
                      </span>
                      <span className="font-bold text-gray-900 dark:text-white">
                        {formatCurrency(loan.original_amount)}
                      </span>
                    </div>

                    <div className="mt-1.5 flex items-center justify-between text-xs">
                      <span className="text-gray-500">
                        {language === 'bn' ? 'পরিশোধ হয়েছে' : 'Repaid Amount'}
                      </span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(loan.total_repaid || 0)} ({pct}%)
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-2.5">
                      <ProgressBar
                        value={pct}
                        colorScheme={loan.type === 'receivable' ? 'teal' : 'emerald'}
                        size="sm"
                      />
                    </div>

                    <div className="mt-3 flex items-baseline justify-between border-t border-gray-200/70 pt-2.5 dark:border-gray-800">
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                        {language === 'bn' ? 'বাকি ব্যালেন্স' : 'Remaining Balance'}
                      </span>
                      <span
                        className={clsx(
                          'text-base font-extrabold tracking-tight',
                          loan.remaining_balance > 0
                            ? loan.type === 'receivable'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                            : 'text-gray-400',
                          isPrivacyBlurEnabled && 'privacy-blur-target'
                        )}
                      >
                        {isPrivacyBlurEnabled
                          ? '৳ •••••'
                          : formatCurrency(loan.remaining_balance)}
                      </span>
                    </div>
                  </div>

                  {/* Metadata Row */}
                  <div className="mt-3 space-y-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                    {loan.due_date && (
                      <div
                        className={clsx(
                          'flex items-center gap-1.5 font-medium',
                          isOverdue && 'text-red-600 dark:text-red-400 font-bold'
                        )}
                      >
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          {language === 'bn' ? 'পরিশোধের শেষ সময়: ' : 'Due Date: '}
                          {formatDate(loan.due_date)}
                          {isOverdue && (
                            <span className="ml-1 text-[10px] uppercase tracking-wider text-red-500">
                              (Overdue!)
                            </span>
                          )}
                        </span>
                      </div>
                    )}

                    {linkedAcc && (
                      <div className="flex items-center gap-1.5">
                        <Wallet className="h-3.5 w-3.5 shrink-0 text-teal-600" />
                        <span>
                          {language === 'bn' ? 'সংযুক্ত ওয়ালেট: ' : 'Linked Wallet: '}
                          {linkedAcc.name}
                        </span>
                      </div>
                    )}

                    {loan.description && (
                      <p className="line-clamp-2 italic text-gray-600 dark:text-gray-300 pt-0.5">
                        "{loan.description}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setHistoryLoan(loan)}
                      className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                      title={language === 'bn' ? 'কিস্তির ইতিহাস' : 'Repayment History'}
                    >
                      <History className="h-3.5 w-3.5" />
                      <span>{loan.repayments?.length || 0}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(loan)}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                      title="Edit"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeletingLoanId(loan.id)}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {loan.remaining_balance > 0 ? (
                    <Button
                      size="sm"
                      onClick={() => handleOpenRepay(loan)}
                      className="bg-teal-600 hover:bg-teal-500 text-xs py-1"
                    >
                      {language === 'bn' ? 'কিস্তি জমা দিন' : 'Record Repayment'}
                    </Button>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>{language === 'bn' ? 'পরিশোধিত' : 'Fully Paid'}</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── 5. Add / Edit Loan Modal ───────────────────────────────────── */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={
          editingLoan
            ? language === 'bn'
              ? 'ঋণের হিসাব সম্পাদনা'
              : 'Edit Loan Record'
            : formType === 'receivable'
            ? language === 'bn'
              ? 'নতুন পাওনা যোগ করুন (Receivable)'
              : 'Add Money Receivable'
            : language === 'bn'
            ? 'নতুন দেনা যোগ করুন (Payable)'
            : 'Add Money Payable'
        }
      >
        <form onSubmit={handleSaveLoan} className="space-y-4">
          {!editingLoan && (
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
              <button
                type="button"
                onClick={() => setFormType('receivable')}
                className={clsx(
                  'rounded-lg py-2 text-xs font-bold transition-all',
                  formType === 'receivable'
                    ? 'bg-white text-emerald-600 shadow-sm dark:bg-gray-700 dark:text-emerald-400'
                    : 'text-gray-600 dark:text-gray-400'
                )}
              >
                {language === 'bn' ? 'পাওনা (মানুষ দেবে)' : 'Receivable'}
              </button>
              <button
                type="button"
                onClick={() => setFormType('payable')}
                className={clsx(
                  'rounded-lg py-2 text-xs font-bold transition-all',
                  formType === 'payable'
                    ? 'bg-white text-rose-600 shadow-sm dark:bg-gray-700 dark:text-rose-400'
                    : 'text-gray-600 dark:text-gray-400'
                )}
              >
                {language === 'bn' ? 'দেনা (আমি দেব)' : 'Payable'}
              </button>
            </div>
          )}

          {/* Person Name */}
          <Input
            label={language === 'bn' ? 'ব্যক্তির নাম *' : 'Person Name *'}
            placeholder={language === 'bn' ? 'উদা: রাহিম আহমেদ, বন্ধু রিয়াদ' : 'e.g. Rahim Ahmed'}
            value={formPersonName}
            onChange={(e) => setFormPersonName(e.target.value)}
            required
            leftIcon={<User className="h-4 w-4 text-gray-400" />}
          />

          {/* Phone Number */}
          <Input
            label={language === 'bn' ? 'ফোন নম্বর (ঐচ্ছিক)' : 'Phone Number (Optional)'}
            placeholder="017xxxxxxxx"
            value={formPhone}
            onChange={(e) => setFormPhone(e.target.value)}
            leftIcon={<Phone className="h-4 w-4 text-gray-400" />}
          />

          {/* Original Amount */}
          <Input
            label={language === 'bn' ? 'টাকার পরিমাণ (৳) *' : 'Principal Amount (৳) *'}
            type="number"
            min="1"
            placeholder="10000"
            value={formAmount}
            onChange={(e) => setFormAmount(e.target.value)}
            required
            leftIcon={<span className="text-sm font-bold text-gray-400">৳</span>}
          />

          {/* Dates Row */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label={
                formType === 'receivable'
                  ? language === 'bn'
                    ? 'ধার দেওয়ার তারিখ *'
                    : 'Date Lent *'
                  : language === 'bn'
                  ? 'ধার নেওয়ার তারিখ *'
                  : 'Date Borrowed *'
              }
              type="date"
              value={formStartDate}
              onChange={(e) => setFormStartDate(e.target.value)}
              required
            />

            <Input
              label={language === 'bn' ? 'পরিশোধের শেষ মেয়াদ (ঐচ্ছিক)' : 'Due Date (Optional)'}
              type="date"
              value={formDueDate}
              onChange={(e) => setFormDueDate(e.target.value)}
            />
          </div>

          {/* Source/Linked Account */}
          <Select
            label={
              formType === 'receivable'
                ? language === 'bn'
                  ? 'যে ওয়ালেট/অ্যাকাউন্ট থেকে টাকা দিয়েছেন'
                  : 'Account Money Lent From'
                : language === 'bn'
                ? 'যে ওয়ালেট/অ্যাকাউন্টে টাকা জমা হয়েছিল'
                : 'Account Money Deposited To'
            }
            value={formAccountId}
            onChange={(e) => setFormAccountId(e.target.value)}
            options={[
              { value: '', label: language === 'bn' ? 'কোনো অ্যাকাউন্ট যুক্ত নয় (হিসাবের বাইরে)' : 'No Account Linked' },
              ...accounts.map((acc) => ({
                value: acc.id,
                label: `${acc.name} (${formatCurrency(acc.current_balance)})`,
              })),
            ]}
          />

          {/* Description */}
          <Textarea
            label={language === 'bn' ? 'বিবরণ বা উদ্দেশ্য (ঐচ্ছিক)' : 'Description / Purpose (Optional)'}
            placeholder={
              language === 'bn'
                ? 'উদা: জরুরি পারিবারিক কাজে দেওয়া, ল্যাপটপ কেনার জন্য ধার...'
                : 'e.g. For emergency medical, moving advance...'
            }
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            rows={2}
          />

          <div className="flex items-center justify-end gap-3 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
            >
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button type="submit" loading={formLoading} className="bg-teal-600 hover:bg-teal-500">
              {editingLoan
                ? language === 'bn'
                  ? 'আপডেট করুন'
                  : 'Update'
                : language === 'bn'
                ? 'সংরক্ষণ করুন'
                : 'Save Loan'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ─── 6. Record Repayment Modal ──────────────────────────────────── */}
      {repayingLoan && (
        <Modal
          isOpen={true}
          onClose={() => setRepayingLoan(null)}
          title={
            repayingLoan.type === 'receivable'
              ? language === 'bn'
                ? `পাওনা টাকা আদায়: ${repayingLoan.person_name}`
                : `Record Repayment: ${repayingLoan.person_name}`
              : language === 'bn'
              ? `দেনা টাকা পরিশোধ: ${repayingLoan.person_name}`
              : `Repay Loan: ${repayingLoan.person_name}`
          }
        >
          <form onSubmit={handleSubmitRepayment} className="space-y-4">
            <div className="rounded-xl bg-teal-50 p-3 text-xs text-teal-900 dark:bg-teal-950/40 dark:text-teal-200">
              <div className="flex justify-between font-bold">
                <span>{language === 'bn' ? 'অবশিষ্ট বাকি:' : 'Remaining Balance:'}</span>
                <span className="text-base text-teal-700 dark:text-teal-300">
                  {formatCurrency(repayingLoan.remaining_balance)}
                </span>
              </div>
            </div>

            {/* Amount input */}
            <div>
              <Input
                label={language === 'bn' ? 'কিস্তির পরিমাণ (৳) *' : 'Repayment Amount (৳) *'}
                type="number"
                min="1"
                max={repayingLoan.remaining_balance}
                placeholder="5000"
                value={repAmount}
                onChange={(e) => setRepAmount(e.target.value)}
                required
                leftIcon={<span className="text-sm font-bold text-gray-400">৳</span>}
              />

              {/* Quick Percentage Chips */}
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setRepAmount(String(Math.round(repayingLoan.remaining_balance * 0.25)))
                  }
                  className="rounded-lg bg-gray-100 px-2 py-1 text-[11px] font-bold text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                >
                  25%
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setRepAmount(String(Math.round(repayingLoan.remaining_balance * 0.5)))
                  }
                  className="rounded-lg bg-gray-100 px-2 py-1 text-[11px] font-bold text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                >
                  50%
                </button>
                <button
                  type="button"
                  onClick={() => setRepAmount(String(repayingLoan.remaining_balance))}
                  className="rounded-lg bg-teal-100 px-2.5 py-1 text-[11px] font-extrabold text-teal-800 hover:bg-teal-200 dark:bg-teal-950/60 dark:text-teal-300"
                >
                  100% ({language === 'bn' ? 'সম্পূর্ণ শোধ' : 'Full Payoff'})
                </button>
              </div>
            </div>

            {/* Date */}
            <Input
              label={language === 'bn' ? 'পরিশোধের তারিখ *' : 'Payment Date *'}
              type="date"
              value={repDate}
              onChange={(e) => setRepDate(e.target.value)}
              required
            />

            {/* Payment Method / Account */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Select
                label={language === 'bn' ? 'পেমেন্ট মাধ্যম' : 'Payment Method'}
                value={repPaymentMethod}
                onChange={(e) => setRepPaymentMethod(e.target.value)}
                options={[
                  { value: 'Cash', label: 'Cash / নগদ' },
                  { value: 'bKash', label: 'bKash / বিকাশ' },
                  { value: 'Nagad', label: 'Nagad / নগদ' },
                  { value: 'Bank Transfer', label: 'Bank Transfer / ব্যাংক' },
                  { value: 'Other', label: 'Other / অন্যান্য' },
                ]}
              />

              <Select
                label={
                  repayingLoan.type === 'receivable'
                    ? language === 'bn'
                      ? 'টাকা যে অ্যাকাউন্টে জমা হয়েছে'
                      : 'Receiving Account'
                    : language === 'bn'
                    ? 'যে অ্যাকাউন্ট থেকে পরিশোধ করেছেন'
                    : 'Payment Source Account'
                }
                value={repAccountId}
                onChange={(e) => setRepAccountId(e.target.value)}
                options={[
                  { value: '', label: language === 'bn' ? 'হিসাবের বাইরে' : 'None' },
                  ...accounts.map((acc) => ({
                    value: acc.id,
                    label: `${acc.name} (${formatCurrency(acc.current_balance)})`,
                  })),
                ]}
              />
            </div>

            {/* Notes */}
            <Input
              label={language === 'bn' ? 'নোট (ঐচ্ছিক)' : 'Note (Optional)'}
              placeholder={language === 'bn' ? 'উদা: ১ম কিস্তি পরিশোধ' : 'e.g. 1st installment'}
              value={repNotes}
              onChange={(e) => setRepNotes(e.target.value)}
            />

            <div className="flex items-center justify-end gap-3 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRepayingLoan(null)}
              >
                {language === 'bn' ? 'বাতিল' : 'Cancel'}
              </Button>
              <Button type="submit" loading={repLoading} className="bg-teal-600 hover:bg-teal-500">
                {language === 'bn' ? 'কিস্তি জমা নিশ্চিত করুন' : 'Confirm Repayment'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ─── 7. Repayment History Modal ─────────────────────────────────── */}
      {historyLoan && (
        <Modal
          isOpen={true}
          onClose={() => setHistoryLoan(null)}
          title={
            language === 'bn'
              ? `${historyLoan.person_name} এর কিস্তির ইতিহাস`
              : `Repayment History: ${historyLoan.person_name}`
          }
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-gray-50 p-3 text-xs dark:bg-gray-800">
              <div>
                <p className="text-gray-400">{language === 'bn' ? 'মূল পরিমাণ' : 'Original'}</p>
                <p className="font-bold text-gray-900 dark:text-white">
                  {formatCurrency(historyLoan.original_amount)}
                </p>
              </div>
              <div>
                <p className="text-gray-400">{language === 'bn' ? 'মোট শোধ' : 'Repaid'}</p>
                <p className="font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(historyLoan.total_repaid || 0)}
                </p>
              </div>
              <div>
                <p className="text-gray-400">{language === 'bn' ? 'অবশিষ্ট' : 'Remaining'}</p>
                <p className="font-bold text-rose-600 dark:text-rose-400">
                  {formatCurrency(historyLoan.remaining_balance)}
                </p>
              </div>
            </div>

            {(!historyLoan.repayments || historyLoan.repayments.length === 0) ? (
              <p className="py-6 text-center text-xs text-gray-400">
                {language === 'bn'
                  ? 'এখনও কোনো কিস্তি পরিশোধ করা হয়নি।'
                  : 'No repayments recorded yet.'}
              </p>
            ) : (
              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {historyLoan.repayments.map((rep) => {
                  const repAcc = accounts.find((a) => a.id === rep.account_id);
                  return (
                    <div
                      key={rep.id}
                      className="flex items-center justify-between rounded-xl border border-gray-100 p-3 text-xs dark:border-gray-800 dark:bg-gray-900/40"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            +{formatCurrency(rep.amount)}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            ({rep.payment_method || 'Cash'})
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500">
                          {formatDate(rep.date)} {repAcc && `• ${repAcc.name}`}
                        </p>
                        {rep.notes && (
                          <p className="text-[11px] text-gray-600 dark:text-gray-300 italic">
                            "{rep.notes}"
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={async () => {
                          if (
                            confirm(
                              language === 'bn'
                                ? 'আপনি কি নিশ্চিতভাবে এই কিস্তির রেকর্ড মুছে ফেলতে চান?'
                                : 'Are you sure you want to delete this repayment record?'
                            )
                          ) {
                            await deleteLoanRepayment(historyLoan.id, rep.id);
                            // refresh active history loan
                            const updated = loans.find((l) => l.id === historyLoan.id);
                            if (updated) setHistoryLoan(updated);
                          }
                        }}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                        title="Delete repayment"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setHistoryLoan(null)}>
                {language === 'bn' ? 'বন্ধ করুন' : 'Close'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── 8. Confirm Delete Dialog ───────────────────────────────────── */}
      <ConfirmDialog
        isOpen={!!deletingLoanId}
        onClose={() => setDeletingLoanId(null)}
        onConfirm={async () => {
          if (deletingLoanId) {
            await deleteLoan(deletingLoanId);
            setDeletingLoanId(null);
          }
        }}
        title={language === 'bn' ? 'ঋণের হিসাব মুছে ফেলতে চান?' : 'Delete Loan Record?'}
        message={
          language === 'bn'
            ? 'এই ঋণের হিসাব মুছে ফেললে এর সাথে সম্পর্কিত কিস্তির রেকর্ড এবং অ্যাকাউন্ট ব্যালেন্স স্বয়ংক্রিয়ভাবে সমন্বয় করা হবে।'
            : 'Deleting this loan record will revert linked repayments and restore affected account balances.'
        }
        confirmText={language === 'bn' ? 'মুছে ফেলুন' : 'Delete'}
        variant="danger"
      />
    </div>
  );
}
