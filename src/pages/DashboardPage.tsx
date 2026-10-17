import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getGreeting, formatDate } from '@/lib/utils';
import { MonthSelector } from '@/components/dashboard/MonthSelector';
import { SmartDashboard } from '@/components/dashboard/SmartDashboard';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  PlusCircle,
  Sparkles,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const { loading, error, refreshData } = useData();
  const { isPrivacyBlurEnabled, togglePrivacyBlur } = useTheme();
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  const displayName =
    profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || (language === 'bn' ? 'আবিদ' : 'Abid');
  const greeting = getGreeting();
  const todayStr = formatDate(format(new Date(), 'yyyy-MM-dd'), 'EEEE, MMMM dd, yyyy');

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" text={language === 'bn' ? 'ড্যাশবোর্ড লোড হচ্ছে...' : 'Loading your financial dashboard...'} />
      </div>
    );
  }

  return (
    <div className="w-full max-w-full min-w-0 overflow-x-hidden space-y-6">
      {/* Top Welcome & Actions Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
              {language === 'bn' ? `স্বাগতম, ${displayName}!` : `${greeting}, ${displayName}!`}
            </h1>
            <Sparkles className="h-5 w-5 text-teal-500" />
          </div>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {language === 'bn'
              ? `${todayStr} • আপনার রিয়েল-টাইম ব্যক্তিগত আয়-ব্যয়ের হিসাব`
              : `${todayStr} • Here is your financial overview.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <MonthSelector />

          {/* Privacy Eye Toggle */}
          <button
            type="button"
            onClick={togglePrivacyBlur}
            className={clsx(
              'rounded-xl border p-2 transition-all shadow-xs',
              isPrivacyBlurEnabled
                ? 'border-teal-300 bg-teal-50 text-teal-700 dark:border-teal-800 dark:bg-teal-950/60 dark:text-teal-300'
                : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
            )}
            title={
              isPrivacyBlurEnabled
                ? language === 'bn'
                  ? 'ব্যালেন্স প্রদর্শন করুন'
                  : 'Reveal Balances'
                : language === 'bn'
                ? 'প্রাইভেসি ব্যালেন্স ব্লার'
                : 'Hide / Blur Balances'
            }
          >
            {isPrivacyBlurEnabled ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>

          <Button
            variant="primary"
            onClick={() => navigate('/add-transaction')}
            leftIcon={<PlusCircle className="h-4 w-4" />}
          >
            {t('txn.add_new')}
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
            <span>Database note: {error}</span>
          </div>
          <button
            onClick={() => refreshData()}
            className="font-semibold underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Unified Smart Cockpit Dashboard */}
      <SmartDashboard />
    </div>
  );
}
