import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
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
} from 'lucide-react';
import toast from 'react-hot-toast';

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
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteAccount}
        title="Delete Entire Account"
        message="This is permanent and cannot be undone. All your financial data, accounts, goals, and history will be completely erased."
        confirmText="Yes, delete everything"
        variant="danger"
        loading={isDeletingAccount}
      />
    </div>
  );
}
