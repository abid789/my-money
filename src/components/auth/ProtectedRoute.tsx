import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-teal-100 dark:border-teal-900" />
            <Loader2 className="absolute inset-0 h-16 w-16 animate-spin text-teal-500" />
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            নিরাপত্তা যাচাই করা হচ্ছে...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Redirect unauthenticated visitor to /login, remembering the attempted URL
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
