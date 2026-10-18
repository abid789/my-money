import { useState, useEffect, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import clsx from 'clsx';
import {
  LayoutDashboard,
  ArrowLeftRight,
  PlusCircle,
  Target,
  MoreHorizontal,
  Tag,
  Wallet,
  HandCoins,
  Lightbulb,
  FileBarChart,
  PiggyBank,
  CalendarDays,
  Repeat,
  Settings,
  Download,
  X,
} from 'lucide-react';
import { usePwaInstall } from '@/lib/pwa';
import { InstallAppModal } from '@/components/pwa/InstallAppModal';

const mainTabs = [
  { path: '/dashboard', key: 'nav.dashboard', icon: LayoutDashboard },
  { path: '/transactions', key: 'nav.transactions', icon: ArrowLeftRight },
  { path: '/add-transaction', key: 'nav.add_transaction', icon: PlusCircle, isCenter: true },
  { path: '/budgets', key: 'nav.budgets', icon: Target },
];

const moreItems = [
  { path: '/categories', key: 'nav.categories', icon: Tag },
  { path: '/accounts', key: 'nav.accounts', icon: Wallet },
  { path: '/loans', key: 'nav.loans', icon: HandCoins },
  { path: '/insights', key: 'nav.insights', icon: Lightbulb },
  { path: '/reports', key: 'nav.reports', icon: FileBarChart },
  { path: '/savings', key: 'nav.savings', icon: PiggyBank },
  { path: '/calendar', key: 'nav.calendar', icon: CalendarDays },
  { path: '/recurring', key: 'nav.recurring', icon: Repeat },
  { path: '/settings', key: 'nav.settings', icon: Settings },
  { path: '/data', key: 'nav.data', icon: Download },
];

export function MobileNav() {
  const [showMore, setShowMore] = useState(false);
  const { t, language } = useLanguage();
  const location = useLocation();
  const { canInstall, isInstalled, promptInstall } = usePwaInstall();
  const [showInstallModal, setShowInstallModal] = useState(false);

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

  // Close "more" menu on route change
  useEffect(() => {
    setShowMore(false);
  }, [location.pathname]);

  // Prevent body scroll when more menu is open
  useEffect(() => {
    if (showMore) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showMore]);

  const isMoreActive = moreItems.some((item) => location.pathname === item.path);

  const handleClose = useCallback(() => setShowMore(false), []);

  return (
    <>
      {/* More slide-up panel */}
      {showMore && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Panel */}
          <div className="fixed inset-x-0 bottom-0 z-50 animate-slide-up rounded-t-2xl border-t border-gray-200 bg-white pb-safe dark:border-gray-700 dark:bg-gray-800">
            {/* Handle */}
            <div className="flex items-center justify-between px-4 py-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {language === 'bn' ? 'সকল মেনু' : 'All Menus'}
              </h3>
              <button
                onClick={handleClose}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* PWA App Download Card for Mobile Users */}
            {!isInstalled && (
              <div className="px-4 pb-2.5">
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    handleInstallClick();
                  }}
                  className="flex w-full items-center justify-between rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50 via-emerald-50 to-teal-50 p-3 shadow-xs dark:border-teal-900/60 dark:from-teal-950/40 dark:via-emerald-950/30 dark:to-teal-950/40 text-left transition-all active:scale-98"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500 text-white shadow-sm">
                      <Download className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900 dark:text-white">
                        {language === 'bn' ? 'মাই মানি অ্যাপ ডাউনলোড' : 'Download My Money App'}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        {language === 'bn' ? 'হোমস্ক্রিনে ১-ক্লিকে ইনস্টল করুন' : 'Install on your Home Screen'}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-lg bg-teal-500 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs">
                    {language === 'bn' ? 'ইনস্টল' : 'Install'}
                  </span>
                </button>
              </div>
            )}

            {/* Menu items */}
            <nav className="scrollbar-thin max-h-[60vh] overflow-y-auto px-2 pb-4">
              <ul className="grid grid-cols-3 gap-1">
                {moreItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  const itemLabel = t(item.key);

                  return (
                    <li key={item.path}>
                      <NavLink
                        to={item.path}
                        className={clsx(
                          'flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-center transition-colors',
                          isActive
                            ? 'bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400'
                            : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700'
                        )}
                      >
                        <Icon
                          className={clsx(
                            'h-5 w-5',
                            isActive
                              ? 'text-teal-500'
                              : 'text-gray-400 dark:text-gray-500'
                          )}
                        />
                        <span className="text-xs font-medium leading-tight">{itemLabel}</span>
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </>
      )}

      {/* Bottom Tab Bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 pb-safe backdrop-blur-lg dark:border-gray-700 dark:bg-gray-800/95">
        <div className="flex items-end justify-around px-2">
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = location.pathname === tab.path;
            const tabLabel = t(tab.key);

            if (tab.isCenter) {
              return (
                <NavLink
                  key={tab.path}
                  to={tab.path}
                  className="relative -mt-4 flex flex-col items-center"
                >
                  <div
                    className={clsx(
                      'flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all',
                      isActive
                        ? 'bg-teal-500 shadow-teal-500/30 scale-110'
                        : 'bg-teal-500 shadow-teal-500/25 hover:shadow-teal-500/40'
                    )}
                  >
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <span
                    className={clsx(
                      'mt-1 text-[10px] font-semibold',
                      isActive ? 'text-teal-600 dark:text-teal-400' : 'text-gray-500 dark:text-gray-400'
                    )}
                  >
                    {tabLabel}
                  </span>
                </NavLink>
              );
            }

            return (
              <NavLink
                key={tab.path}
                to={tab.path}
                className="flex flex-col items-center px-1 py-2"
              >
                <Icon
                  className={clsx(
                    'h-5 w-5 transition-colors',
                    isActive
                      ? 'text-teal-500'
                      : 'text-gray-400 dark:text-gray-500'
                  )}
                />
                <span
                  className={clsx(
                    'mt-1 text-[10px] font-medium transition-colors',
                    isActive
                      ? 'text-teal-600 dark:text-teal-400'
                      : 'text-gray-500 dark:text-gray-400'
                  )}
                >
                  {tabLabel}
                </span>
                {isActive && (
                  <div className="absolute top-0 h-0.5 w-8 rounded-full bg-teal-500" />
                )}
              </NavLink>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setShowMore(true)}
            className="flex flex-col items-center px-1 py-2"
          >
            <MoreHorizontal
              className={clsx(
                'h-5 w-5 transition-colors',
                isMoreActive || showMore
                  ? 'text-teal-500'
                  : 'text-gray-400 dark:text-gray-500'
              )}
            />
            <span
              className={clsx(
                'mt-1 text-[10px] font-medium transition-colors',
                isMoreActive || showMore
                  ? 'text-teal-600 dark:text-teal-400'
                  : 'text-gray-500 dark:text-gray-400'
              )}
            >
              {language === 'bn' ? 'আরও' : 'More'}
            </span>
          </button>
        </div>
      </nav>

      {/* Inline animation style */}
      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        .pb-safe {
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }
      `}</style>

      <InstallAppModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
      />
    </>
  );
}
