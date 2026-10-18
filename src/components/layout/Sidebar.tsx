import { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import clsx from 'clsx';
import {
  LayoutDashboard,
  ArrowLeftRight,
  PlusCircle,
  Target,
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
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  LogIn,
} from 'lucide-react';
import { usePwaInstall } from '@/lib/pwa';
import { InstallAppModal } from '@/components/pwa/InstallAppModal';

const navItems = [
  { path: '/dashboard', key: 'nav.dashboard', icon: LayoutDashboard },
  { path: '/transactions', key: 'nav.transactions', icon: ArrowLeftRight },
  { path: '/add-transaction', key: 'nav.add_transaction', icon: PlusCircle },
  { path: '/budgets', key: 'nav.budgets', icon: Target },
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

export function Sidebar() {
  const { user, profile, signOut } = useAuth();
  const { isDemoMode } = useData();
  const { t, language } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
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

  // Persist collapsed state
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved !== null) {
      setCollapsed(saved === 'true');
    }
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('sidebar-collapsed', String(next));
  };

  const displayName =
    profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || (language === 'bn' ? 'আবিদ' : 'Abid');
  const avatarInitial = displayName.charAt(0).toUpperCase();

  return (
    <aside
      className={clsx(
        'fixed left-0 top-0 z-30 flex h-screen flex-col border-r border-gray-200 bg-white transition-all duration-300 dark:border-gray-700 dark:bg-gray-800',
        collapsed ? 'w-[72px]' : 'w-[260px]'
      )}
    >
      {/* Logo */}
      <div
        className={clsx(
          'flex h-16 shrink-0 items-center border-b border-gray-200 px-4 dark:border-gray-700',
          collapsed ? 'justify-center' : 'gap-3'
        )}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 shadow-md shadow-teal-500/20">
          <span className="text-lg font-bold text-white">৳</span>
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold text-gray-900 dark:text-white">
              {language === 'bn' ? 'আমার টাকা' : 'My Money'}
            </h1>
            <p className="text-[10px] text-gray-400 font-medium -mt-0.5">
              Personal Finance
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            const itemLabel = t(item.key);

            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  title={collapsed ? itemLabel : undefined}
                  className={clsx(
                    'group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                    collapsed ? 'justify-center' : 'gap-3',
                    isActive
                      ? 'bg-teal-500 text-white shadow-sm shadow-teal-500/25'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white'
                  )}
                >
                  <Icon
                    className={clsx(
                      'h-5 w-5 shrink-0',
                      isActive
                        ? 'text-white'
                        : 'text-gray-400 group-hover:text-gray-600 dark:text-gray-400 dark:group-hover:text-gray-300'
                    )}
                  />
                  {!collapsed && <span className="truncate">{itemLabel}</span>}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* PWA Download / Install Button */}
      {!isInstalled && (
        <div className="border-t border-gray-200 p-2.5 dark:border-gray-700">
          <button
            type="button"
            onClick={handleInstallClick}
            className={clsx(
              'flex w-full items-center gap-2.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/30 px-3 py-2 text-xs font-bold transition-all shadow-xs active:scale-95',
              collapsed && 'justify-center px-0'
            )}
            title={language === 'bn' ? 'অ্যাপ ডাউনলোড ও ইনস্টল করুন' : 'Download / Install App'}
          >
            <Download className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" />
            {!collapsed && <span>{language === 'bn' ? 'অ্যাপ ডাউনলোড' : 'Download App'}</span>}
          </button>
        </div>
      )}

      {/* Collapse toggle */}
      <div className="border-t border-gray-200 px-3 py-2 dark:border-gray-700">
        <button
          onClick={toggleCollapsed}
          className="flex w-full items-center justify-center rounded-lg px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronsRight className="h-5 w-5" />
          ) : (
            <>
              <ChevronsLeft className="h-5 w-5 mr-2" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>

      {/* User profile */}
      <div
        className={clsx(
          'shrink-0 border-t border-gray-200 p-3 dark:border-gray-700',
          collapsed ? 'flex flex-col items-center gap-2' : ''
        )}
      >
        {isDemoMode ? (
          collapsed ? (
            <button
              onClick={() => navigate('/login')}
              title={language === 'bn' ? 'লগইন' : 'Login'}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500 text-white shadow-sm hover:bg-teal-600 transition-all"
            >
              <LogIn className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-500 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-600 transition-all active:scale-95"
            >
              <LogIn className="h-4 w-4" />
              <span>{language === 'bn' ? 'মাস্টার লগইন' : 'Master Login'}</span>
            </button>
          )
        ) : (
          <div
            className={clsx(
              'flex items-center',
              collapsed ? 'flex-col gap-2' : 'gap-3'
            )}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-semibold text-teal-700 dark:bg-teal-900/50 dark:text-teal-300">
              {avatarInitial}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                  {displayName}
                </p>
                <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                  {user?.email || ''}
                </p>
              </div>
            )}
            <button
              onClick={signOut}
              title="Sign out"
              className={clsx(
                'shrink-0 rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400',
                collapsed ? '' : ''
              )}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <InstallAppModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
      />
    </aside>
  );
}
