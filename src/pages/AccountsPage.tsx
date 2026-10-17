import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { useTheme } from '@/contexts/ThemeContext';
import { formatCurrency } from '@/lib/utils';
import type { Account } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { BrandBadge, BrandIconBubble } from '@/components/ui/BrandBadge';
import clsx from 'clsx';
import {
  Wallet,
  PlusCircle,
  Building,
  Smartphone,
  CreditCard,
  ArrowLeftRight,
  Edit2,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';

const ACCOUNT_TYPES = [
  { value: 'Cash', label: 'Cash (Physical Wallet)' },
  { value: 'bKash', label: 'bKash (Mobile Banking)' },
  { value: 'Nagad', label: 'Nagad (Mobile Banking)' },
  { value: 'Rocket', label: 'Rocket (Mobile Banking)' },
  { value: 'Bank', label: 'Bank Account' },
  { value: 'Debit Card', label: 'Debit Card' },
  { value: 'Credit Card', label: 'Credit Card' },
  { value: 'Other', label: 'Other Account' },
];

export default function AccountsPage() {
  const { accounts, addAccount, updateAccount, deleteAccount, financialSummary } = useData();
  const { isPrivacyBlurEnabled } = useTheme();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form
  const [name, setName] = useState('');
  const [type, setType] = useState('bKash');
  const [openingBalance, setOpeningBalance] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openCreateModal = () => {
    setEditingAccount(null);
    setName('');
    setType('bKash');
    setOpeningBalance('0');
    setModalOpen(true);
  };

  const openEditModal = (acc: Account) => {
    setEditingAccount(acc);
    setName(acc.name);
    setType(acc.type);
    setOpeningBalance(String(acc.opening_balance));
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Account name is required');
      return;
    }

    try {
      setIsSubmitting(true);
      const accData: Partial<Account> = {
        name: name.trim(),
        type,
        opening_balance: parseFloat(openingBalance) || 0,
        currency: 'BDT',
        icon: 'Wallet',
        color: '#14b8a6',
        is_active: true,
      };

      if (editingAccount) {
        await updateAccount(editingAccount.id, accData);
        toast.success('Account updated');
      } else {
        await addAccount(accData);
        toast.success('Account created');
      }
      setModalOpen(false);
    } catch {
      toast.error('Failed to save account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteAccount(deleteId);
      toast.success('Account deleted');
    } catch {
      toast.error('Failed to delete account');
    } finally {
      setDeleteId(null);
    }
  };

  const getAccountIcon = (accType: string) => {
    switch (accType.toLowerCase()) {
      case 'cash':
        return <Wallet className="h-5 w-5 text-emerald-500" />;
      case 'bank':
        return <Building className="h-5 w-5 text-blue-500" />;
      case 'bkash':
      case 'nagad':
      case 'rocket':
        return <Smartphone className="h-5 w-5 text-rose-500" />;
      case 'debit card':
      case 'credit card':
        return <CreditCard className="h-5 w-5 text-amber-500" />;
      default:
        return <Wallet className="h-5 w-5 text-teal-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
            Accounts & Payment Methods
          </h1>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Manage your physical cash, bKash, Nagad, bank balances, and cards.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => navigate('/add-transaction')}
            leftIcon={<ArrowLeftRight className="h-4 w-4" />}
          >
            Transfer Money
          </Button>
          <Button
            variant="primary"
            onClick={openCreateModal}
            leftIcon={<PlusCircle className="h-4 w-4" />}
          >
            Add Account
          </Button>
        </div>
      </div>

      {/* Total Balance Card */}
      <div className="rounded-2xl border border-teal-100 bg-gradient-to-r from-teal-50 to-emerald-50 p-6 dark:border-teal-900/60 dark:from-teal-950/30 dark:to-emerald-950/30">
        <span className="text-xs font-semibold text-teal-800 uppercase tracking-wider dark:text-teal-300">
          Total Net Available Balance
        </span>
        <div
          className={clsx(
            'mt-2 text-3xl font-extrabold tracking-tight text-teal-950 dark:text-white sm:text-4xl transition-all',
            isPrivacyBlurEnabled && 'privacy-blur-target'
          )}
        >
          {isPrivacyBlurEnabled ? '৳ ••••••••' : formatCurrency(financialSummary.availableBalance)}
        </div>
        <p className="mt-1 text-xs text-teal-700 dark:text-teal-400">
          Combined live balance across {accounts.length} active account{accounts.length === 1 ? '' : 's'}.
        </p>
      </div>

      {/* Account Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.map((acc) => (
          <div
            key={acc.id}
            className="flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-gray-800 dark:bg-gray-800/90"
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <BrandIconBubble brand={acc.name || acc.type} size="md" />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">
                      {acc.name}
                    </h3>
                    <div className="mt-1">
                      <BrandBadge brand={acc.type || acc.name} size="sm" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(acc)}
                    className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
                    title="Edit"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteId(acc.id)}
                    className="rounded p-1 text-gray-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-5">
                <span className="text-[11px] text-gray-400">Current Balance</span>
                <div
                  className={clsx(
                    'text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl transition-all',
                    isPrivacyBlurEnabled && 'privacy-blur-target'
                  )}
                >
                  {isPrivacyBlurEnabled ? '৳ •••••' : formatCurrency(Number(acc.current_balance))}
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-[11px] text-gray-400 dark:border-gray-700">
              <span className={clsx(isPrivacyBlurEnabled && 'privacy-blur-target')}>
                Opening: {isPrivacyBlurEnabled ? '••••' : formatCurrency(Number(acc.opening_balance))}
              </span>
              <span className="rounded bg-teal-50 px-2 py-0.5 font-medium text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
                {acc.currency || 'BDT'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingAccount ? 'Edit Account' : 'Add New Account'}
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Account Name *"
            placeholder="e.g. My Main bKash, City Bank Savings, Pocket Cash"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />

          <Select
            label="Account Type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            options={ACCOUNT_TYPES}
          />

          <Input
            type="number"
            step="0.01"
            label="Opening Balance (৳ BDT) *"
            placeholder="0.00"
            value={openingBalance}
            onChange={(e) => setOpeningBalance(e.target.value)}
            required
          />

          <div className="flex justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={isSubmitting}>
              {editingAccount ? 'Update' : 'Create Account'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Account"
        message="Are you sure you want to delete this account? Make sure no active transactions depend on it."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
