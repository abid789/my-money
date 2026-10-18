import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { NotificationDrawer } from '@/components/notifications/NotificationDrawer';
import clsx from 'clsx';
import {
  Search,
  PlusCircle,
  Sun,
  Moon,
  Bell,
  ChevronDown,
  User,
  Settings,
  LogOut,
  Menu,
  Database,
  Check,
  Copy,
  ExternalLink,
  X,
  Languages,
  Cloud,
  CloudOff,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  Palette,
  Download,
  LogIn,
} from 'lucide-react';
import { usePwaInstall } from '@/lib/pwa';
import { InstallAppModal } from '@/components/pwa/InstallAppModal';

const routeTitles: Record<string, { en: string; bn: string }> = {
  '/dashboard': { en: 'Dashboard', bn: 'ড্যাশবোর্ড' },
  '/transactions': { en: 'Transactions', bn: 'লেনদেন তালিকা' },
  '/add-transaction': { en: 'Add Transaction', bn: 'নতুন লেনদেন' },
  '/budgets': { en: 'Budgets', bn: 'বাজেট পরিকল্পনা' },
  '/categories': { en: 'Categories', bn: 'ক্যাটাগরি' },
  '/accounts': { en: 'Accounts', bn: 'অ্যাকাউন্ট ও ওয়ালেট' },
  '/loans': { en: 'Loans & Lending', bn: 'ধার ও ঋণের হিসাব' },
  '/insights': { en: 'Insights', bn: 'স্মার্ট ইনসাইটস' },
  '/reports': { en: 'Reports', bn: 'রিপোর্ট ও PDF' },
  '/savings': { en: 'Savings Goals', bn: 'সঞ্চয় লক্ষ্য' },
  '/calendar': { en: 'Calendar', bn: 'ক্যালেন্ডার' },
  '/recurring': { en: 'Recurring', bn: 'নিয়মিত খরচ' },
  '/settings': { en: 'Settings', bn: 'সেটিংস' },
  '/data': { en: 'Data & Backup', bn: 'ডাটা ব্যাকআপ' },
};

interface HeaderProps {
  onToggleMobileSidebar?: () => void;
}

export function Header({ onToggleMobileSidebar }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut, isConfigured } = useAuth();
  const { syncStatus, lastSyncedAt, triggerSync, isDemoMode } = useData();
  const {
    theme,
    toggleTheme,
    isPrivacyBlurEnabled,
    togglePrivacyBlur,
    isPinEnabled,
    lockApp,
  } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();
  const { unreadCount } = useNotifications();
  const { canInstall, isInstalled, promptInstall } = usePwaInstall();
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const handleInstallClick = async () => {
    if (canInstall) {
      const accepted = await promptInstall();
      if (!accepted) {
        setShowInstallModal(true);
      }
    } else {
      setShowInstallModal(true);
    }
  };

  const titleObj = routeTitles[location.pathname];
  const pageTitle = titleObj ? titleObj[language] : (language === 'bn' ? 'আমার টাকা' : 'My Money');

  const displayName =
    profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || (language === 'bn' ? 'আবিদ' : 'Abid');
  const avatarInitial = displayName.charAt(0).toUpperCase();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopyEnv = () => {
    navigator.clipboard.writeText(
      'VITE_SUPABASE_URL=https://your-project.supabase.co\nVITE_SUPABASE_ANON_KEY=your-anon-key'
    );
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  return (
    <header className="sticky top-0 z-20 w-full max-w-full border-b border-gray-200 bg-white/80 backdrop-blur-lg dark:border-gray-700 dark:bg-gray-800/80">
      <div className="flex h-16 w-full max-w-full items-center justify-between px-2.5 sm:px-4 lg:px-6 pl-safe pr-safe">
        {/* Left side */}
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 shrink">
          {/* Mobile menu button */}
          {onToggleMobileSidebar && (
            <button
              onClick={onToggleMobileSidebar}
              className="rounded-lg p-1.5 sm:p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 lg:hidden shrink-0"
              title="Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          <h1 className="truncate text-sm sm:text-base md:text-lg lg:text-xl font-bold text-gray-900 dark:text-white">
            {pageTitle}
          </h1>
        </div>

        {/* Right side - strictly responsive & overflow-proof */}
        <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 shrink-0">
          {/* Real-Time Cloud Sync Pill or Demo Indicator */}
          {isDemoMode ? (
            <div
              className="flex items-center gap-1 sm:gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[11px] sm:text-xs font-bold text-teal-800 shadow-xs dark:border-teal-900/60 dark:bg-teal-950/60 dark:text-teal-300 shrink-0"
              title={language === 'bn' ? 'পাবলিক ডেমো মোড (নমুনা ডাটা)' : 'Public Demo Mode (Sample Data)'}
            >
              <span className="h-2 w-2 rounded-full bg-teal-500 animate-pulse shrink-0" />
              <span className="hidden sm:inline">
                {language === 'bn' ? '🎯 ডেমো মোড' : '🎯 Demo Mode'}
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => triggerSync()}
              title={
                syncStatus === 'saved'
                  ? lastSyncedAt
                    ? `ক্লাউডে সংরক্ষিত (${lastSyncedAt.toLocaleTimeString()}) - সিঙ্ক করতে ক্লিক করুন`
                    : 'ক্লাউডে সংরক্ষিত'
                  : syncStatus === 'saving'
                  ? 'ক্লাউডে সেভ হচ্ছে...'
                  : syncStatus === 'offline'
                  ? 'অফলাইন মোড: ইন্টারনেট পেলে স্বয়ংক্রিয় সিঙ্ক হবে'
                  : 'সিঙ্ক ত্রুটি! পুনরায় চেষ্টা করতে ক্লিক করুন'
              }
              className={clsx(
                'flex items-center gap-1 sm:gap-1.5 rounded-full px-2 py-0.5 sm:px-2.5 sm:py-1 text-[11px] sm:text-xs font-semibold shadow-sm transition-all shrink-0',
                syncStatus === 'saved' &&
                  'border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300',
                syncStatus === 'saving' &&
                  'border border-amber-200 bg-amber-50 text-amber-800 animate-pulse dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-300',
                syncStatus === 'offline' &&
                  'border border-gray-200 bg-gray-100 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300',
                syncStatus === 'error' &&
                  'border border-red-200 bg-red-50 text-red-800 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300'
              )}
            >
              {syncStatus === 'saved' && (
                <>
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="hidden sm:inline">{language === 'bn' ? 'সংরক্ষিত' : 'Saved'}</span>
                </>
              )}
              {syncStatus === 'saving' && (
                <>
                  <Loader2 className="h-3 w-3 animate-spin text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="hidden sm:inline">{language === 'bn' ? 'সংরক্ষণ হচ্ছে...' : 'Saving...'}</span>
                </>
              )}
              {syncStatus === 'offline' && (
                <>
                  <CloudOff className="h-3 w-3 text-gray-500 shrink-0" />
                  <span className="hidden sm:inline">{language === 'bn' ? 'অফলাইন' : 'Offline'}</span>
                </>
              )}
              {syncStatus === 'error' && (
                <>
                  <AlertCircle className="h-3 w-3 text-red-600 dark:text-red-400 shrink-0" />
                  <span className="hidden sm:inline">{language === 'bn' ? 'সিঙ্ক ব্যর্থ' : 'Sync Failed'}</span>
                </>
              )}
            </button>
          )}

          {/* Language Switcher Button */}
          <button
            type="button"
            onClick={toggleLanguage}
            className="flex items-center gap-1 rounded-lg border border-teal-200 bg-teal-50/70 p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-bold text-teal-800 shadow-sm transition-all hover:bg-teal-100 dark:border-teal-900/60 dark:bg-teal-950/60 dark:text-teal-300 dark:hover:bg-teal-900/50 shrink-0"
            title={language === 'bn' ? 'Switch to English' : 'বাংলায় দেখুন'}
          >
            <Languages className="h-3.5 w-3.5 shrink-0 text-teal-600 dark:text-teal-400" />
            <span className="hidden sm:inline">{language === 'bn' ? 'বাংলা' : 'English'}</span>
          </button>

          {/* Theme toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-lg p-1.5 sm:p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300 shrink-0"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 sm:h-5 sm:w-5 text-slate-700 dark:text-gray-300" />
            )}
          </button>

          {/* Privacy Balance Blur Toggle (hidden on small mobile; available in Options menu & Dashboard) */}
          <button
            type="button"
            onClick={togglePrivacyBlur}
            className={clsx(
              'hidden sm:flex rounded-lg p-1.5 sm:p-2 transition-colors shrink-0',
              isPrivacyBlurEnabled
                ? 'bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300'
            )}
            title={
              isPrivacyBlurEnabled
                ? language === 'bn'
                  ? 'ব্যালেন্স প্রদর্শন করুন (প্রাইভেসি ব্লার বন্ধ)'
                  : 'Reveal Balances (Privacy Blur Active)'
                : language === 'bn'
                ? 'ব্যালেন্স গোপন করুন (প্রাইভেসি ব্লার চালু)'
                : 'Hide Sensitive Balances (Privacy Blur)'
            }
          >
            {isPrivacyBlurEnabled ? (
              <EyeOff className="h-4 w-4 sm:h-5 sm:w-5 text-teal-600 dark:text-teal-400" />
            ) : (
              <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
            )}
          </button>

          {/* Quick PIN Lock Button (Only when PIN is enabled, hidden on small mobile) */}
          {isPinEnabled && (
            <button
              type="button"
              onClick={lockApp}
              className="hidden sm:flex rounded-lg p-1.5 sm:p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-teal-600 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-teal-400 shrink-0"
              title={language === 'bn' ? 'কুইক পিন দিয়ে এখনই লক করুন' : 'Lock App with Quick PIN'}
            >
              <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-teal-600 dark:text-teal-400" />
            </button>
          )}

          {/* PWA Install / Download Button - Always fully visible and responsive */}
          {!isInstalled && (
            <button
              type="button"
              onClick={handleInstallClick}
              className="flex items-center gap-1 sm:gap-1.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 border border-teal-500/30 px-2 py-1.5 sm:px-2.5 sm:py-1.5 text-xs font-bold transition-all shadow-xs active:scale-95 shrink-0"
              title={language === 'bn' ? 'অ্যাপ ডাউনলোড ও ইনস্টল করুন' : 'Download / Install App'}
            >
              <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-teal-600 dark:text-teal-400" />
              <span className="text-[11px] sm:text-xs font-bold">{language === 'bn' ? 'অ্যাপ' : 'App'}</span>
              <span className="hidden md:inline font-bold">{language === 'bn' ? ' ডাউনলোড' : ' Download'}</span>
            </button>
          )}

          {/* Quick add button - hidden on mobile (they have the FAB) */}
          <button
            onClick={() => navigate('/add-transaction')}
            className="hidden items-center gap-2 rounded-lg bg-teal-500 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-600 sm:flex shrink-0"
          >
            <PlusCircle className="h-4 w-4" />
            <span className="hidden md:inline">{t('dash.quick_add')}</span>
          </button>

          {/* Notifications */}
          <button
            type="button"
            onClick={() => setShowNotifications(true)}
            className="relative rounded-lg p-1.5 sm:p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300 shrink-0"
            title="Notifications"
          >
            <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-0.5 top-0.5 sm:right-1 sm:top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* User menu or Login button (Options) */}
          {isDemoMode ? (
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-1 sm:gap-1.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-white px-2 py-1.5 sm:px-3 sm:py-1.5 text-xs font-bold shadow-sm transition-all active:scale-95 shrink-0"
              title={language === 'bn' ? 'মাস্টার পাসওয়ার্ড দিয়ে লগইন করুন' : 'Login with Master Password'}
            >
              <LogIn className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="text-[11px] sm:text-xs">{language === 'bn' ? 'লগইন' : 'Login'}</span>
            </button>
          ) : (
            <div className="relative shrink-0" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-1 rounded-lg p-1 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Options"
              >
                <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-teal-100 text-xs sm:text-sm font-semibold text-teal-700 dark:bg-teal-900/50 dark:text-teal-300">
                  {avatarInitial}
                </div>
                <ChevronDown
                  className={clsx(
                    'hidden h-3.5 w-3.5 text-gray-400 transition-transform sm:block',
                    showUserMenu && 'rotate-180'
                  )}
                />
              </button>

              {/* Dropdown */}
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 max-w-[calc(100vw-1.5rem)] rounded-xl border border-gray-200 bg-white py-1.5 shadow-lg dark:border-gray-700 dark:bg-gray-800 z-50">
                  {/* User info */}
                  <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-700">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                      {displayName}
                    </p>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                      {user?.email || ''}
                    </p>
                  </div>

                  {/* Menu items */}
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        navigate('/settings');
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      <User className="h-4 w-4 text-gray-400" />
                      Profile
                    </button>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        navigate('/settings');
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      <Settings className="h-4 w-4 text-gray-400" />
                      {language === 'bn' ? 'সেটিংস' : 'Settings'}
                    </button>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        navigate('/settings?tab=theme');
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      <Palette className="h-4 w-4 text-indigo-500" />
                      {language === 'bn' ? 'থিম ও অ্যাপিয়ারেন্স' : 'Theme Settings'}
                    </button>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        togglePrivacyBlur();
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      {isPrivacyBlurEnabled ? (
                        <>
                          <EyeOff className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                          <span>{language === 'bn' ? 'ব্যালেন্স প্রদর্শন করুন' : 'Show Balances'}</span>
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 text-gray-400" />
                          <span>{language === 'bn' ? 'ব্যালেন্স গোপন করুন (ব্লার)' : 'Hide Balances (Privacy)'}</span>
                        </>
                      )}
                    </button>
                    {isPinEnabled && (
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          lockApp();
                        }}
                        className="flex w-full items-center gap-3 px-4 py-2 text-sm text-teal-600 transition-colors hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-950/40"
                      >
                        <Lock className="h-4 w-4" />
                        {language === 'bn' ? 'কুইক পিন দিয়ে লক করুন' : 'Lock App (Quick PIN)'}
                      </button>
                    )}
                    {!isInstalled && (
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          handleInstallClick();
                        }}
                        className="flex w-full items-center gap-3 px-4 py-2 text-sm text-teal-600 font-medium transition-colors hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-950/40"
                      >
                        <Download className="h-4 w-4" />
                        {language === 'bn' ? 'অ্যাপ ডাউনলোড ও ইনস্টল' : 'Download / Install App'}
                      </button>
                    )}
                  </div>

                  {/* Logout */}
                  <div className="border-t border-gray-100 pt-1 dark:border-gray-700">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        signOut();
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Supabase Connection Setup Guide Modal */}
      {showSetupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-800">
            <button
              onClick={() => setShowSetupModal(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Connect Supabase Cloud Database
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Switch from local storage to permanent PostgreSQL cloud sync
                </p>
              </div>
            </div>

            <div className="space-y-3.5 text-sm text-gray-600 dark:text-gray-300">
              <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-3.5 dark:border-gray-700 dark:bg-gray-900/50">
                <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-500 text-xs text-white font-bold">1</span>
                  Create Free Supabase Project
                </p>
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                  Visit <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="font-medium text-teal-600 hover:underline inline-flex items-center gap-0.5">supabase.com <ExternalLink className="h-3 w-3" /></a> and create a free project.
                </p>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-3.5 dark:border-gray-700 dark:bg-gray-900/50">
                <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-500 text-xs text-white font-bold">2</span>
                  Run Database Migration SQL
                </p>
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                  In Supabase dashboard, click <strong>SQL Editor</strong> &gt; <strong>New Query</strong>. Run:
                </p>
                <code className="mt-1.5 block rounded bg-gray-200/70 p-1.5 font-mono text-[11px] text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                  supabase/migrations/001_initial_schema.sql
                </code>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-3.5 dark:border-gray-700 dark:bg-gray-900/50">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-500 text-xs text-white font-bold">3</span>
                    Add Credentials to .env
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyEnv}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-600 hover:text-teal-700 dark:text-teal-400"
                  >
                    {copiedEnv ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                    {copiedEnv ? 'Copied' : 'Copy format'}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                  In Project Settings &gt; API, copy your project URL and anon key into <code className="font-mono">.env</code>:
                </p>
                <pre className="mt-1.5 rounded bg-gray-900 p-2 font-mono text-[11px] text-teal-300">
VITE_SUPABASE_URL=https://xyz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
                </pre>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setShowSetupModal(false)}
                className="rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-700 shadow-sm"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      <NotificationDrawer
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />

      <InstallAppModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
      />
    </header>
  );
}
