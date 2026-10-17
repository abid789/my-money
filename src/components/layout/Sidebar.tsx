import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import clsx from 'clsx';
import {
  LayoutDashboard,
  ArrowLeftRight,
  PlusCircle,
  Target,
  Tag,
  Wallet,
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
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { path: '/add-transaction', label: 'Add Transaction', icon: PlusCircle },
  { path: '/budgets', label: 'Budgets', icon: Target },
  { path: '/categories', label: 'Categories', icon: Tag },
  { path: '/accounts', label: 'Accounts', icon: Wallet },
  { path: '/insights', label: 'Insights', icon: Lightbulb },
  { path: '/reports', label: 'Reports', icon: FileBarChart },
  { path: '/savings', label: 'Savings Goals', icon: PiggyBank },
  { path: '/calendar', label: 'Calendar', icon: CalendarDays },
  { path: '/recurring', label: 'Recurring', icon: Repeat },
  { path: '/settings', label: 'Settings', icon: Settings },
  { path: '/data', label: 'Data & Backup', icon: Download },
];

export function Sidebar() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

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
    user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
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
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-teal-400 to-teal-600">
          <span className="text-lg font-bold text-white">৳</span>
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-gray-900 dark:text-white">My Money</h1>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  title={collapsed ? item.label : undefined}
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
                        : 'text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300'
                    )}
                  />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

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
      </div>
    </aside>
  );
}
