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
    </>
  );
}
