import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { Header } from '@/components/layout/Header';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import clsx from 'clsx';

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Sync with sidebar's local storage state
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved !== null) {
      setSidebarCollapsed(saved === 'true');
    }

    // Listen for storage changes (in case sidebar updates it)
    const handleStorage = () => {
      const val = localStorage.getItem('sidebar-collapsed');
      setSidebarCollapsed(val === 'true');
    };

    // Poll briefly to sync (sidebar and layout share the storage key)
    const interval = setInterval(() => {
      const val = localStorage.getItem('sidebar-collapsed');
      const current = val === 'true';
      setSidebarCollapsed((prev) => (prev !== current ? current : prev));
    }, 300);

    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Main content area */}
      <div
        className={clsx(
          'flex min-h-screen flex-col transition-all duration-300',
          'lg:ml-[260px]',
          sidebarCollapsed && 'lg:ml-[72px]'
        )}
      >
        {/* Header */}
        <Header />

        {/* Page content */}
        <main className="flex-1 px-4 py-6 lg:px-6 lg:py-8">
          <div className="mx-auto max-w-7xl">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>

        {/* Bottom padding for mobile nav */}
        <div className="h-20 lg:hidden" />
      </div>

      {/* Mobile bottom navigation */}
      <div className="lg:hidden">
        <MobileNav />
      </div>
    </div>
  );
}
