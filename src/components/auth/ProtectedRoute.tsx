import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export function ProtectedRoute() {
  const { user, loading, enterDemoMode } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      enterDemoMode();
    }
  }, [loading, user, enterDemoMode]);

  if (loading || !user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-teal-100 dark:border-teal-900" />
            <Loader2 className="absolute inset-0 h-16 w-16 animate-spin text-teal-500" />
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            লোডিং হচ্ছে...
          </p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
