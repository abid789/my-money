import { useState, useEffect } from 'react';
import clsx from 'clsx';
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
  Cloud,
  Database,
  Smartphone,
  Laptop,
  Share2,
  Copy,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { WeeklyEmailModal } from '@/components/reports/WeeklyEmailModal';
import { useNotifications } from '@/contexts/NotificationContext';
import {
  activeSupabaseUrl,
  isSupabaseConfigured,
  saveSupabaseCloudConfig,
  clearSupabaseCloudConfig,
  getDevicePairingUrl,
} from '@/lib/supabase';

export default function SettingsPage() {
  const { user, profile, updateProfile, updatePassword, deleteAccount } = useAuth();
  const { theme, setTheme } = useTheme();
  const { addNotification } = useNotifications();

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
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Delete Account
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Reset to Zero & Real-Time Sync
  const { resetToZero, isCloudConnected, migrateLocalToCloud, syncStatus, lastSyncedAt, triggerSync } = useData();
  const { language } = useLanguage();
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Cloud Database & Device Sync
  const [cloudUrlInput, setCloudUrlInput] = useState('');
  const [cloudKeyInput, setCloudKeyInput] = useState('');
  const [isSavingCloud, setIsSavingCloud] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [pairingCopied, setPairingCopied] = useState(false);
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);

  const handleSaveCloudConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cloudUrlInput.trim() || !cloudKeyInput.trim()) {
      toast.error(
        language === 'bn'
          ? 'Supabase URL এবং Anon Key উভয়ই প্রয়োজন'
          : 'Both Supabase URL and Anon Key are required'
      );
      return;
    }
    try {
      setIsSavingCloud(true);
      saveSupabaseCloudConfig(cloudUrlInput.trim(), cloudKeyInput.trim());
      toast.success(
        language === 'bn'
          ? 'ক্লাউড ডাটাবেস সফলভাবে সংযুক্ত হয়েছে!'
          : 'Cloud database connected successfully!'
      );
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save configuration');
      setIsSavingCloud(false);
    }
  };

  const handleCopyPairingLink = async () => {
    const url = getDevicePairingUrl();
    if (!url) {
      toast.error(
        language === 'bn'
          ? 'ক্লাউড ডাটাবেস এখনও কনফিগার করা হয়নি'
          : 'Cloud database is not configured yet'
      );
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setPairingCopied(true);
      toast.success(
        language === 'bn'
          ? 'ডিভাইস পেয়ারিং লিংক কপি হয়েছে! আপনার ফোন বা কম্পিউটারে এটি পেস্ট করুন।'
          : 'Device pairing link copied! Open it on phone or computer to sync instantly.'
      );
      setTimeout(() => setPairingCopied(false), 3000);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleMigrate = async () => {
    try {
      setIsMigrating(true);
      const res = await migrateLocalToCloud();
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Migration failed');
    } finally {
      setIsMigrating(false);
    }
  };

  // Weekly Digest & Server Test Email
  const [weeklyModalOpen, setWeeklyModalOpen] = useState(false);
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [testRecipient, setTestRecipient] = useState('abidasset@gmail.com');
  const [emailConfig, setEmailConfig] = useState<{
    configured: boolean;
    fromEmail: string;
    configuredRecipient: string;
    provider?: string;
  }>({
    configured: false,
    fromEmail: 'onboarding@resend.dev',
    configuredRecipient: 'abidasset@gmail.com',
  });
  const [testEmailStatus, setTestEmailStatus] = useState<{
    type: 'success' | 'error';
    message: string;
    id?: string;
    restriction?: string;
    allowedOwnerEmail?: string;
    reason?: string;
    resolution?: string;
  } | null>(null);

  const fetchEmailConfig = async () => {
    try {
      const res = await fetch('/api/test-email');
      if (res.ok) {
        const data = await res.json();
        setEmailConfig({
          configured: Boolean(data.configured),
          fromEmail: data.fromEmail || 'onboarding@resend.dev',
          configuredRecipient: data.configuredRecipient || 'abidasset@gmail.com',
          provider: data.provider || 'Resend',
        });
        if (data.configuredRecipient) {
          setTestRecipient(data.configuredRecipient);
        }
      }
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    fetchEmailConfig();
  }, []);

  const handleSendTestEmail = async (overrideRecipient?: string) => {
    const targetRecipient = (overrideRecipient || testRecipient || emailConfig.configuredRecipient).trim();
    try {
      setIsSendingTestEmail(true);
      setTestEmailStatus(null);
      const res = await fetch('/api/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: targetRecipient,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        setTestEmailStatus({
          type: 'success',
          id: data.id,
          message: data.message || `টেস্ট ইমেইল সফলভাবে ${targetRecipient}-এ পাঠানো হয়েছে!`,
        });
        toast.success(data.message || 'টেস্ট ইমেইল সফলভাবে পাঠানো হয়েছে!');
      } else {
        const isRestricted = data.restriction === 'resend_testing_restriction';
        const rawErr = typeof data.error === 'string' ? data.error : (data.error?.message || data.message);
        const resolvedMsg = rawErr || (res.status === 404 ? 'API route not found' : 'টেস্ট ইমেইল পাঠানো সম্ভব হয়নি');

        setTestEmailStatus({
          type: 'error',
          message: resolvedMsg,
          restriction: data.restriction,
          allowedOwnerEmail: data.allowedOwnerEmail,
          reason: data.reason || (resolvedMsg.includes('RESEND_API_KEY')
            ? 'সার্ভারে RESEND_API_KEY কনফিগার করা নেই। আপনি যদি Vercel বা অন্য হোস্টিংয়ে সাইটটি রান করেন, তবে হোস্টিং ড্যাশবোর্ডের Environment Variables-এ RESEND_API_KEY যোগ করতে হবে।'
            : resolvedMsg),
          resolution: data.resolution || (resolvedMsg.includes('RESEND_API_KEY')
            ? 'Vercel Dashboard -> Project Settings -> Environment Variables এ RESEND_API_KEY, RESEND_FROM_EMAIL, এবং WEEKLY_REPORT_TO যোগ করে Redeploy করুন।'
            : undefined),
        });
        toast.error(
          isRestricted
            ? 'Resend রেস্ট্রিকশন: টেস্ট সেন্ডার দিয়ে শুধুমাত্র ওনারের নিজস্ব ইমেইলে পাঠানো যায়।'
            : resolvedMsg,
          { duration: 6000 }
        );
      }
    } catch (err: any) {
      setTestEmailStatus({
        type: 'error',
        message: err?.message || 'সার্ভারে সংযোগ করতে ব্যর্থ হয়েছে।',
      });
      toast.error('সার্ভারে সংযোগ করতে সমস্যা হয়েছে');
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
      addNotification({
        type: 'profile_updated',
        title: language === 'bn' ? 'প্রোফাইল আপডেট' : 'Profile Updated',
        description:
          language === 'bn'
            ? `নাম পরিবর্তন করা হয়েছে: ${fullName.trim()}`
            : `Name changed successfully to: ${fullName.trim()}`,
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
    if (!currentPassword) {
      toast.error(language === 'bn' ? 'বর্তমান পাসওয়ার্ড প্রদান করুন' : 'Current password is required');
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      toast.error('নতুন পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('পাসওয়ার্ড দুটি মেলেনি');
      return;
    }

    try {
      setIsChangingPassword(true);
      await updatePassword(newPassword, currentPassword);
      toast.success('পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update password');
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
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              {language === 'bn' ? 'সাপ্তাহিক ইমেইল রিপোর্ট (Resend Email Integration)' : 'Weekly Email Digest (Resend Integration)'}
            </h2>
          </div>
          {emailConfig.configured ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {language === 'bn' ? 'Resend API সংযুক্ত' : 'Resend API Connected'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
              <AlertTriangle className="h-3.5 w-3.5" />
              {language === 'bn' ? 'API কী কনফিগার করুন' : 'API Key Missing'}
            </span>
          )}
        </div>

        <p className="text-xs text-gray-600 dark:text-gray-300">
          {language === 'bn'
            ? 'Resend API ব্যবহার করে প্রতি সপ্তাহের আর্থিক আয়-ব্যয় এবং ওয়ালেট ব্যালেন্সের সারসংক্ষেপ নিরাপদে আপনার ইমেইলে পৌঁছে যায়।'
            : 'Automate weekly financial summaries sent to your email address using Resend API.'}
        </p>

        {/* 3 Configuration Info Cards */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* Target Recipient */}
          <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3 dark:border-gray-700/60 dark:bg-gray-800/50">
            <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
              {language === 'bn' ? 'প্রাপক ইমেইল (WEEKLY_REPORT_TO)' : 'Recipient (WEEKLY_REPORT_TO)'}
            </div>
            <div className="mt-0.5 text-sm font-bold text-gray-900 dark:text-white truncate">
              {emailConfig.configuredRecipient}
            </div>
          </div>

          {/* Sender */}
          <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3 dark:border-gray-700/60 dark:bg-gray-800/50">
            <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
              {language === 'bn' ? 'প্রেরক (RESEND_FROM_EMAIL)' : 'Sender (RESEND_FROM_EMAIL)'}
            </div>
            <div className="mt-0.5 text-xs font-bold text-gray-900 dark:text-white truncate">
              {emailConfig.fromEmail}
            </div>
          </div>

          {/* Schedule */}
          <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3 dark:border-gray-700/60 dark:bg-gray-800/50">
            <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
              {language === 'bn' ? 'সময়সূচি (Schedule)' : 'Weekly Schedule'}
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-teal-700 dark:text-teal-300">
              <Clock className="h-3.5 w-3.5" />
              <span>প্রতি সোমবার সকাল ৯:০০ BST</span>
            </div>
          </div>
        </div>

        {/* Status Response Cards */}
        {testEmailStatus?.type === 'success' && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 text-xs dark:border-emerald-900/60 dark:bg-emerald-950/40">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="space-y-1">
                <div className="font-bold text-emerald-900 dark:text-emerald-200 text-sm">
                  {language === 'bn' ? '✅ টেস্ট ইমেইল সফলভাবে পাঠানো হয়েছে!' : '✅ Test Email Successfully Sent!'}
                </div>
                <p className="text-emerald-800 dark:text-emerald-300">
                  {language === 'bn'
                    ? 'Resend API সার্ভার সফলভাবে ডেলিভারি নিশ্চিত করেছে।'
                    : 'Resend API has accepted and dispatched the email.'}{' '}
                  {testEmailStatus.id && (
                    <span>
                      Resend ID: <code className="rounded bg-emerald-100 px-1.5 py-0.5 font-mono text-[11px] font-bold dark:bg-emerald-900/80">{testEmailStatus.id}</code>
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                  📬 {language === 'bn'
                    ? `অনুগ্রহ করে আপনার ইনবক্স (বা স্প্যাম ফোল্ডার) চেক করুন: ${emailConfig.configuredRecipient}`
                    : `Please check your inbox or spam folder at: ${emailConfig.configuredRecipient}`}
                </p>
              </div>
            </div>
          </div>
        )}

        {testEmailStatus?.type === 'error' && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-xs dark:border-amber-900/60 dark:bg-amber-950/40">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="font-bold text-amber-900 dark:text-amber-200 text-sm">
                  {testEmailStatus.restriction === 'resend_testing_restriction'
                    ? (language === 'bn' ? '⚠️ Resend ফ্রি টেস্টিং সীমাবদ্ধতা নোটিশ' : '⚠️ Resend Testing Policy Restriction')
                    : (language === 'bn' ? '❌ টেস্ট ইমেইল পাঠানো যায়নি' : '❌ Test Email Dispatch Failed')}
                </div>

                <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
                  {testEmailStatus.reason || testEmailStatus.message}
                </p>

                {testEmailStatus.restriction === 'resend_testing_restriction' && (
                  <div className="rounded-lg border border-amber-300 bg-white/90 p-3.5 dark:border-amber-800 dark:bg-gray-900/90 space-y-2.5">
                    <div className="font-bold text-gray-900 dark:text-white">
                      💡 {language === 'bn' ? 'সমাধানের উপায়সমূহ:' : 'How to Resolve:'}
                    </div>

                    <div className="space-y-2 text-[11px] text-gray-700 dark:text-gray-300 leading-relaxed">
                      <div>
                        <strong>১. {language === 'bn' ? 'তাত্ক্ষণিক ফ্রি টেস্ট (Instant Free Test):' : 'Instant Free Test:'}</strong>{' '}
                        {language === 'bn'
                          ? `Resend এর ফ্রি টেস্টিং ডোমেন (${emailConfig.fromEmail}) দিয়ে শুধুমাত্র আপনার Resend একাউন্ট তৈরির মূল ইমেইল (${testEmailStatus.allowedOwnerEmail || 'abidasset@gmail.com'}) ঠিকানায় কোনো ডোমেন ভেরিফিকেশন ছাড়াই সরাসরি টেস্ট পাঠানো যায়।`
                          : `With Resend's free test sender, you can immediately send test emails to your registered account address (${testEmailStatus.allowedOwnerEmail || 'abidasset@gmail.com'}) without needing a verified custom domain.`}
                      </div>

                      <div>
                        <strong>২. {language === 'bn' ? 'যেকোনো ঠিকানায় পাঠানোর জন্য (Custom Domain):' : 'Send to Any Email:'}</strong>{' '}
                        {language === 'bn'
                          ? 'আপনার অন্য কোনো জিমেইল বা গ্রাহকের ঠিকানায় পাঠাতে চাইলে resend.com/domains এ গিয়ে আপনার নিজস্ব ডোমেন ভেরিফাই করুন এবং .env ফাইলে RESEND_FROM_EMAIL এ সেই ডোমেনের ইমেইল দিন।'
                          : 'To send to any recipient, verify your custom domain at resend.com/domains and set RESEND_FROM_EMAIL to that domain in your .env file.'}
                      </div>
                    </div>

                    {testEmailStatus.allowedOwnerEmail && (
                      <div className="pt-1.5 flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          loading={isSendingTestEmail}
                          onClick={() => handleSendTestEmail(testEmailStatus.allowedOwnerEmail)}
                          leftIcon={<Send className="h-3.5 w-3.5" />}
                        >
                          {testEmailStatus.allowedOwnerEmail} {language === 'bn' ? 'এ টেস্ট পাঠান' : 'Send Test'}
                        </Button>
                        <span className="text-[11px] text-gray-500">
                          {language === 'bn' ? '(একাউন্টের মূল ইমেইলে সাথে সাথে পৌঁছাবে)' : '(Instantly verified with your Resend account)'}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Test Email Recipient Control */}
        <div className="mt-4 rounded-xl border border-gray-200/80 bg-gray-50/70 p-3.5 dark:border-gray-700/60 dark:bg-gray-800/40">
          <label className="block text-xs font-semibold text-gray-800 dark:text-gray-200">
            {language === 'bn' ? 'টেস্ট ইমেইল প্রাপক' : 'Test Email Recipient'}
          </label>
          <div className="mt-2 flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
              placeholder="e.g. abidasset@gmail.com"
              className="flex-1 rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs text-gray-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            <Button
              type="button"
              variant="primary"
              size="sm"
              loading={isSendingTestEmail}
              onClick={() => handleSendTestEmail(testRecipient)}
              leftIcon={<Send className="h-3.5 w-3.5" />}
            >
              {language === 'bn' ? 'টেস্ট ইমেইল পাঠান' : 'Send Test Email'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setWeeklyModalOpen(true)}
              leftIcon={<Mail className="h-3.5 w-3.5 text-teal-600" />}
            >
              {language === 'bn' ? 'সাপ্তাহিক রিপোর্ট প্রিভিউ' : 'Preview Digest'}
            </Button>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
            <span>{language === 'bn' ? 'দ্রুত টেস্ট করুন:' : 'Quick test:'}</span>
            <button
              type="button"
              onClick={() => {
                setTestRecipient('abidasset@gmail.com');
                handleSendTestEmail('abidasset@gmail.com');
              }}
              className="inline-flex items-center gap-1 rounded-md bg-teal-100/80 px-2 py-0.5 font-medium text-teal-800 hover:bg-teal-200 dark:bg-teal-950/60 dark:text-teal-300 transition-colors"
            >
              <CheckCircle2 className="h-3 w-3 text-teal-600" />
              abidasset@gmail.com ({language === 'bn' ? 'Resend ওনার - সরাসরি অনুমোদিত' : 'Owner - Direct Delivery'})
            </button>
            <button
              type="button"
              onClick={() => {
                setTestRecipient(emailConfig.configuredRecipient);
                handleSendTestEmail(emailConfig.configuredRecipient);
              }}
              className="inline-flex items-center gap-1 rounded-md bg-gray-200/80 px-2 py-0.5 font-medium text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 transition-colors"
            >
              {emailConfig.configuredRecipient} ({language === 'bn' ? '.env ফাইল' : '.env'})
            </button>
          </div>
        </div>
      </div>

      {/* Cloud Database & Cross-Device Sync */}
      <div className="rounded-2xl border border-sky-100 bg-white p-6 shadow-sm dark:border-sky-950/60 dark:bg-gray-800/90">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              {language === 'bn'
                ? 'ক্লাউড ডাটাবেস ও রিয়েল-টাইম ডিভাইস সিঙ্ক'
                : 'Cloud Database & Real-Time Sync'}
            </h2>
          </div>
          {isCloudConnected ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {language === 'bn' ? 'ক্লাউড কানেক্টেড' : 'Cloud Connected'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
              <AlertTriangle className="h-3.5 w-3.5" />
              {language === 'bn' ? 'লোকাল অফলাইন মোড' : 'Local Offline Mode'}
            </span>
          )}
        </div>

        <p className="text-xs text-gray-600 dark:text-gray-300">
          {language === 'bn'
            ? 'ফোন ও কম্পিউটারে একই সাথে রিয়েল-টাইমে আয়, ব্যয় ও একাউন্ট ব্যালেন্স দেখতে একটি ক্লাউড ডাটাবেস প্রয়োজন। মোবাইল থেকে টাকা অ্যাড করলে কম্পিউটারে স্বয়ংক্রিয়ভাবে আপডেট দেখতে নিচের অপশনগুলো ব্যবহার করুন।'
            : 'Synchronize your financial records in real-time across phone, tablet, and PC with Supabase Cloud.'}
        </p>

        {isCloudConnected ? (
          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4 dark:border-gray-700/60 dark:bg-gray-800/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                    {language === 'bn' ? 'সংযুক্ত ক্লাউড ডাটাবেস' : 'Active Supabase Database'}
                  </div>
                  <div className="mt-0.5 font-mono text-xs font-semibold text-teal-700 dark:text-teal-300">
                    {activeSupabaseUrl}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" style={{ animationDuration: '4s' }} />
                  <span>{language === 'bn' ? 'রিয়েল-টাইম সিঙ্ক সক্রিয়' : 'Live Sync Active'}</span>
                </div>
              </div>
            </div>

            {/* Device Pairing Section */}
            <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-4 dark:border-sky-900/40 dark:bg-sky-950/20">
              <div className="flex items-start gap-3">
                <div className="flex -space-x-1 pt-0.5">
                  <Smartphone className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                  <Laptop className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-semibold text-gray-900 dark:text-white">
                    {language === 'bn'
                      ? 'মোবাইল ও কম্পিউটারের সাথে কানেক্ট করুন (১-ক্লিক পেয়ারিং)'
                      : 'Pair with Phone & Computer (1-Click Sync)'}
                  </div>
                  <p className="mt-1 text-[11px] text-gray-600 dark:text-gray-300">
                    {language === 'bn'
                      ? 'নিচের বাটনে ক্লিক করে পেয়ারিং লিংক কপি করুন। এরপর আপনার ফোন বা কম্পিউটারের ব্রাউজারে লিংকটি খুললে সাথে সাথে একই ডাটাবেসে কানেক্ট হয়ে যাবে!'
                      : 'Copy the pairing link and open it on your phone or PC browser to instantly synchronize everything.'}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => triggerSync()}
                      leftIcon={<RefreshCw className={clsx('h-4 w-4', syncStatus === 'saving' && 'animate-spin')} />}
                    >
                      {language === 'bn' ? 'এখনই ক্লাউডে সিঙ্ক করুন' : 'Sync to Cloud Now'}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCopyPairingLink}
                      leftIcon={pairingCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    >
                      {pairingCopied
                        ? (language === 'bn' ? 'লিংক কপি হয়েছে!' : 'Link Copied!')
                        : (language === 'bn' ? 'ডিভাইস পেয়ারিং লিংক কপি করুন' : 'Copy Device Pairing Link')}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      loading={isMigrating}
                      onClick={handleMigrate}
                      leftIcon={<Cloud className="h-4 w-4 text-sky-600" />}
                    >
                      {language === 'bn' ? 'লোকাল ডাটা ক্লাউডে আপলোড করুন' : 'Upload Local Data to Cloud'}
                    </Button>
                  </div>
                  {lastSyncedAt && (
                    <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
                      {language === 'bn' ? `সর্বশেষ ক্লাউড সিঙ্ক: ${lastSyncedAt.toLocaleTimeString()}` : `Last synced: ${lastSyncedAt.toLocaleTimeString()}`}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDisconnectDialogOpen(true)}
                className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              >
                {language === 'bn' ? 'ক্লাউড সংযোগ বিচ্ছিন্ন করুন' : 'Disconnect Cloud Database'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
              <p>
                <strong>কেন ফোন এবং কম্পিউটারে ব্যালেন্স আলাদা দেখাচ্ছিল?</strong>
              </p>
              <p className="mt-1 text-[11px] text-amber-800 dark:text-amber-300">
                কারণ আপনার সাইটটি তখন ব্রাউজারের লোকাল মেমোরি (Local Storage) ব্যবহার করছিল। ফোনের ব্রাউজার এবং কম্পিউটারের ব্রাউজার আলাদা মেমোরিতে থাকে।
              </p>
            </div>

            {/* Device Pairing Section for Local Mode */}
            <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-4 dark:border-sky-900/40 dark:bg-sky-950/20">
              <div className="flex items-start gap-3">
                <div className="flex -space-x-1 pt-0.5">
                  <Smartphone className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                  <Laptop className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-semibold text-gray-900 dark:text-white">
                    {language === 'bn'
                      ? 'ফোন ও কম্পিউটারে একই একাউন্ট সিঙ্ক করুন (১-ক্লিক পেয়ারিং)'
                      : 'Pair Account with Phone & Computer (1-Click Sync)'}
                  </div>
                  <p className="mt-1 text-[11px] text-gray-600 dark:text-gray-300">
                    {language === 'bn'
                      ? 'নিচের বাটনে ক্লিক করে লিংকটি কপি করে আপনার কম্পিউটারে ওপেন করুন। সাথে সাথে আপনার ফোনের একাউন্ট ও সকল হিসাব পিসিতে লগইন হয়ে যাবে!'
                      : 'Copy this link and open it on your PC to instantly clone your account, login session, and records!'}
                  </p>
                  <div className="mt-3">
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={handleCopyPairingLink}
                      leftIcon={pairingCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    >
                      {pairingCopied
                        ? (language === 'bn' ? 'লিংক কপি হয়েছে!' : 'Link Copied!')
                        : (language === 'bn' ? '১-ক্লিক পেয়ারিং লিংক কপি করুন' : 'Copy 1-Click Pairing Link')}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveCloudConfig} className="space-y-3">
              <Input
                label={language === 'bn' ? 'Supabase Project URL' : 'Supabase Project URL'}
                placeholder="https://your-project.supabase.co"
                value={cloudUrlInput}
                onChange={(e) => setCloudUrlInput(e.target.value)}
                helperText="Supabase Dashboard -> Settings -> API -> Project URL"
              />

              <Input
                label={language === 'bn' ? 'Supabase Anon Public API Key' : 'Supabase Anon Public API Key'}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={cloudKeyInput}
                onChange={(e) => setCloudKeyInput(e.target.value)}
                helperText="Supabase Dashboard -> Settings -> API -> Project API keys (anon, public)"
              />

              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="submit"
                  variant="primary"
                  loading={isSavingCloud}
                  leftIcon={<Database className="h-4 w-4" />}
                >
                  {language === 'bn' ? 'ক্লাউড ডাটাবেস সংযুক্ত করুন' : 'Connect Cloud Database'}
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Change Password */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800/90">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              {language === 'bn' ? 'মাস্টার পাসওয়ার্ড পরিবর্তন' : 'Master Password & Security'}
            </h2>
          </div>
        </div>
        <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
          {language === 'bn'
            ? 'আপনার ওয়েবসাইটের একমাত্র মাস্টার লগইন পাসওয়ার্ড পরিবর্তন করুন। ইমেইল বা ওটিপি ছাড়া শুধুমাত্র এই পাসওয়ার্ড দিয়ে লগইন করা যায়।'
            : 'Update your single master access password. No email or OTP required.'}
        </p>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input
              type="password"
              label={language === 'bn' ? 'বর্তমান পাসওয়ার্ড' : 'Current Password'}
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />

            <Input
              type="password"
              label={language === 'bn' ? 'নতুন পাসওয়ার্ড' : 'New Password'}
              placeholder="Minimum 4 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />

            <Input
              type="password"
              label={language === 'bn' ? 'কনফার্ম পাসওয়ার্ড' : 'Confirm New Password'}
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              loading={isChangingPassword}
              disabled={!newPassword}
              leftIcon={<Save className="h-4 w-4" />}
            >
              {language === 'bn' ? 'পাসওয়ার্ড পরিবর্তন করুন' : 'Update Password'}
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

      <ConfirmDialog
        isOpen={disconnectDialogOpen}
        onClose={() => setDisconnectDialogOpen(false)}
        onConfirm={() => {
          clearSupabaseCloudConfig();
          setDisconnectDialogOpen(false);
        }}
        title={language === 'bn' ? 'ক্লাউড ডাটাবেস ডিসকানেক্ট করবেন?' : 'Disconnect Cloud Database?'}
        message={
          language === 'bn'
            ? 'ক্লাউড সংযোগ বিচ্ছিন্ন করলে ওয়েবসাইটটি লোকাল মোডে ফিরে যাবে। আপনি যেকোনো সময় আবার সংযোগ করতে পারবেন।'
            : 'Disconnecting will revert the application to local offline mode. You can reconnect anytime.'
        }
        confirmText={language === 'bn' ? 'ডিসকানেক্ট করুন' : 'Disconnect'}
        cancelText={language === 'bn' ? 'বাতিল' : 'Cancel'}
        variant="danger"
      />

      <WeeklyEmailModal
        isOpen={weeklyModalOpen}
        onClose={() => setWeeklyModalOpen(false)}
        defaultEmail={emailConfig.configuredRecipient || 'abidasset@gmail.com'}
      />
    </div>
  );
}
