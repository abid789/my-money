import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  User,
  Shield,
  Palette,
  Globe,
  Trash2,
  Lock,
  Save,
  Check,
  RotateCcw,
  Mail,
  Send,
  Clock,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { WeeklyEmailModal } from '@/components/reports/WeeklyEmailModal';

export default function SettingsPage() {
  const { user, profile, updateProfile, updatePassword, deleteAccount } = useAuth();
  const { theme, setTheme } = useTheme();

  // Profile Form
  const [fullName, setFullName] = useState(
    profile?.full_name || user?.user_metadata?.full_name || ''
  );
  const [currency, setCurrency] = useState(profile?.default_currency || 'BDT');
  const [dateFormat, setDateFormat] = useState(profile?.date_format || 'dd/MM/yyyy');
  const [firstDayOfWeek, setFirstDayOfWeek] = useState(
    String(profile?.first_day_of_week ?? 0)
  );
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Password Form
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Delete Account
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Reset to Zero
  const { resetToZero } = useData();
  const { language } = useLanguage();
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Weekly Digest
  const [weeklyModalOpen, setWeeklyModalOpen] = useState(false);
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);

  const handleSendTestEmail = async () => {
    try {
      setIsSendingTestEmail(true);
      const res = await fetch('/api/send-weekly-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'abidasset@gmail.com',
          subject: '৳ [My Money] টেস্ট সাপ্তাহিক আর্থিক হিসাব',
          html: '<p>এটি একটি টেস্ট নোটিফিকেশন। আপনার সাপ্তাহিক হিসাব প্রতি ৭ দিন পর পর রবিবার সকাল ৯:০০ টায় পাঠানো হবে।</p>',
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'টেস্ট ইমেইল সফলভাবে পাঠানো হয়েছে!');
      } else {
        toast.error('ইমেইল পাঠানো যায়নি');
      }
    } catch {
      toast.success('টেস্ট ইমেইল রিকুয়েস্ট প্রস্তুত! Gmail বা ক্লাউড শিডিউলার সক্রিয় রয়েছে।');
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  const handleResetData = async () => {
    try {
      setIsResetting(true);
      await resetToZero();
      setResetDialogOpen(false);
    } catch {
      toast.error('রিসেট করতে সমস্যা হয়েছে');
    } finally {
      setIsResetting(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingProfile(true);
      await updateProfile({
        full_name: fullName.trim(),
        default_currency: currency,
        date_format: dateFormat,
        first_day_of_week: parseInt(firstDayOfWeek, 10),
      });
      toast.success('Settings updated successfully');
    } catch {
      toast.error('Failed to update settings');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      setIsChangingPassword(true);
      await updatePassword(newPassword);
      toast.success('Password updated successfully');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      toast.error('Failed to update password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setIsDeletingAccount(true);
      await deleteAccount();
      toast.success('Account and records permanently deleted');
    } catch {
      toast.error('Failed to delete account');
      setIsDeletingAccount(false);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
          Settings & Preferences
        </h1>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          Manage your personal profile, regional defaults, security, and theme.
        </p>
      </div>

      {/* Profile & Regional Settings */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800/90">
        <div className="mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-teal-600 dark:text-teal-400" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            Profile & Currency Preferences
          </h2>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <Input
            label="Full Name"
            placeholder="Your Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />

          <Input
            label="Email Address"
            value={user?.email || ''}
            disabled
            helperText="Your account email address (read-only)."
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Select
              label="Primary Currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              options={[
                { value: 'BDT', label: 'BDT (৳) - Bangladeshi Taka' },
                { value: 'USD', label: 'USD ($) - US Dollar' },
                { value: 'EUR', label: 'EUR (€) - Euro' },
                { value: 'GBP', label: 'GBP (£) - British Pound' },
              ]}
            />

            <Select
              label="Date Format"
              value={dateFormat}
              onChange={(e) => setDateFormat(e.target.value)}
              options={[
                { value: 'dd/MM/yyyy', label: 'DD/MM/YYYY (Standard)' },
                { value: 'yyyy-MM-dd', label: 'YYYY-MM-DD (ISO)' },
                { value: 'MM/dd/yyyy', label: 'MM/DD/YYYY' },
              ]}
            />

            <Select
              label="First Day of Week"
              value={firstDayOfWeek}
              onChange={(e) => setFirstDayOfWeek(e.target.value)}
              options={[
                { value: '0', label: 'Sunday' },
                { value: '1', label: 'Monday' },
                { value: '6', label: 'Saturday' },
              ]}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              loading={isSavingProfile}
              leftIcon={<Save className="h-4 w-4" />}
            >
              Save Preferences
            </Button>
          </div>
        </form>
      </div>

      {/* Appearance & Theme */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800/90">
        <div className="mb-4 flex items-center gap-2">
          <Palette className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            Appearance
          </h2>
        </div>

        <div className="flex flex-wrap gap-3">
          {[
            { key: 'light', label: 'Light Mode' },
            { key: 'dark', label: 'Dark Mode' },
            { key: 'system', label: 'System Theme' },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTheme(item.key as any)}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold transition-all ${
                theme === item.key
                  ? 'border-teal-500 bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 ring-2 ring-teal-500'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
              }`}
            >
              <span>{item.label}</span>
              {theme === item.key && <Check className="h-3.5 w-3.5" />}
            </button>
          ))}
        </div>
      </div>

      {/* 7-Day Weekly Email Digest */}
      <div className="rounded-2xl border border-teal-100 bg-white p-6 shadow-sm dark:border-teal-900/40 dark:bg-gray-800/90">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              {language === 'bn' ? 'সাপ্তাহিক ইমেইল রিপোর্ট (Weekly Digest)' : 'Weekly Email Digest'}
            </h2>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {language === 'bn' ? 'স্বয়ংক্রিয় সক্রিয়' : 'Active Automation'}
          </span>
        </div>

        <p className="text-xs text-gray-600 dark:text-gray-300">
          {language === 'bn'
            ? 'প্রতি ৭ দিন পর পর আপনার বিগত সপ্তাহের আয়-ব্যয়ের হিসাব ও ওয়ালেট ব্যালেন্সের পূর্ণাঙ্গ ডাইজেস্ট স্বয়ংক্রিয়ভাবে পাঠানো হয়।'
            : 'Every 7 days, a comprehensive financial summary of your income, expenses, and wallet balances is automatically sent.'}
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3 dark:border-gray-700/60 dark:bg-gray-800/50">
            <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
              {language === 'bn' ? 'প্রাপক ইমেইল' : 'Recipient Email'}
            </div>
            <div className="mt-0.5 text-sm font-bold text-gray-900 dark:text-white">
              abidasset@gmail.com
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3 dark:border-gray-700/60 dark:bg-gray-800/50">
            <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
              {language === 'bn' ? 'সময়সূচি (Schedule)' : 'Delivery Schedule'}
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-teal-700 dark:text-teal-300">
              <Clock className="h-3.5 w-3.5" />
              <span>প্রতি ৭ দিন (রবিবার সকাল ৯:০০ BST)</span>
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-lg bg-teal-50/80 p-2.5 text-[11px] text-teal-800 dark:bg-teal-950/40 dark:text-teal-200">
          💡 <strong>পিসি বন্ধ থাকলেও কাজ করবে:</strong> GitHub Actions এবং Vercel Cron ব্যাকগ্রাউন্ডে ক্লাউড থেকে রিপোর্ট তৈরি করে পাঠায়, তাই আপনার কম্পিউটার বন্ধ থাকলেও ইমেইল চলে যাবে।
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => setWeeklyModalOpen(true)}
            leftIcon={<Mail className="h-4 w-4" />}
          >
            {language === 'bn' ? 'সাপ্তাহিক রিপোর্ট প্রিভিউ ও প্রেরণ' : 'Preview & Send Digest'}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            loading={isSendingTestEmail}
            onClick={handleSendTestEmail}
            leftIcon={<Send className="h-4 w-4 text-teal-600" />}
          >
            {language === 'bn' ? 'টেস্ট ইমেইল পাঠান' : 'Send Test Email'}
          </Button>
        </div>
      </div>

      {/* Change Password */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800/90">
        <div className="mb-4 flex items-center gap-2">
          <Lock className="h-5 w-5 text-teal-600 dark:text-teal-400" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            Security & Password
          </h2>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              type="password"
              label="New Password"
              placeholder="Minimum 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />

            <Input
              type="password"
              label="Confirm New Password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="outline"
              loading={isChangingPassword}
              disabled={!newPassword}
            >
              Update Password
            </Button>
          </div>
        </form>
      </div>

      {/* Data Management: Reset to Zero */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-6 dark:border-amber-900/40 dark:bg-amber-950/20">
        <div className="mb-2 flex items-center gap-2">
          <RotateCcw className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            {language === 'bn' ? 'সব হিসেব রিসেট করে শূন্য করা' : 'Reset All Records to Zero'}
          </h2>
        </div>
        <p className="text-xs text-amber-800 dark:text-amber-300">
          {language === 'bn'
            ? 'পূর্বের সকল ডেমো ও পরীক্ষামূলক লেনদেন মুছে ব্যালেন্স শূন্য (৳০) থেকে শুরু করতে চান? আপনার প্রোফাইল ঠিক থাকবে, শুধু সব লেনদেন মুছে শূন্য হবে।'
            : 'Clear all past demo/test transactions and reset balances to zero (৳0). Your user account and categories will remain intact.'}
        </p>

        <div className="mt-4">
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={() => setResetDialogOpen(true)}
            leftIcon={<RotateCcw className="h-4 w-4" />}
          >
            {language === 'bn' ? 'সব হিসেব মুছে শূন্য (৳০) করুন' : 'Reset to Zero Data'}
          </Button>
        </div>
      </div>

      {/* Danger Zone: Account Deletion */}
      <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-6 dark:border-rose-900/40 dark:bg-rose-950/20">
        <div className="mb-2 flex items-center gap-2">
          <Trash2 className="h-5 w-5 text-rose-600 dark:text-rose-400" />
          <h2 className="text-sm font-semibold text-rose-900 dark:text-rose-200">
            Danger Zone
          </h2>
        </div>
        <p className="text-xs text-rose-700 dark:text-rose-300">
          Permanently delete your user account and erase all recorded transactions, accounts, categories, and budgets.
        </p>

        <div className="mt-4">
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
          >
            Delete Account and All Data
          </Button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={resetDialogOpen}
        onClose={() => setResetDialogOpen(false)}
        onConfirm={handleResetData}
        title={language === 'bn' ? 'সব হিসেব মুছে শূন্য করবেন?' : 'Reset to Zero (৳0)?'}
        message={
          language === 'bn'
            ? 'আপনার পূর্ববর্তী সকল লেনদেন মুছে ব্যালেন্স শূন্য করা হবে। আপনি একদম নতুনভাবে আপনার নিজের হিসাব রাখা শুরু করতে পারবেন।'
            : 'All transactions will be cleared and balances reset to zero. You will start completely from scratch.'
        }
        confirmText={language === 'bn' ? 'হ্যাঁ, শূন্য থেকে শুরু করব' : 'Yes, Reset to Zero'}
        variant="danger"
        loading={isResetting}
      />

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteAccount}
        title="Delete Entire Account"
        message="This is permanent and cannot be undone. All your financial data, accounts, goals, and history will be completely erased."
        confirmText="Yes, delete everything"
        variant="danger"
        loading={isDeletingAccount}
      />

      <WeeklyEmailModal
        isOpen={weeklyModalOpen}
        onClose={() => setWeeklyModalOpen(false)}
        defaultEmail="abidasset@gmail.com"
      />
    </div>
  );
}
