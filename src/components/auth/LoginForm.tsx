import { useState } from 'react';
import { useNavigate, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Lock, Eye, EyeOff, ArrowRight, Loader2, KeyRound, Sparkles, Check } from 'lucide-react';
import clsx from 'clsx';

export default function LoginForm() {
  const { user, loginWithPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);

  // If already authenticated, redirect straight to dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleQuickFill = () => {
    setPassword('11223344');
    setAutoFilled(true);
    setError('');
    setTimeout(() => setAutoFilled(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password.trim()) {
      setError('অনুগ্রহ করে পাসওয়ার্ড দিন');
      return;
    }

    setLoading(true);
    try {
      await loginWithPassword(password.trim());
      const destination = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(destination, { replace: true });
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'ভুল পাসওয়ার্ড! অনুগ্রহ করে সঠিক পাসওয়ার্ড দিন।';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-900 sm:px-6 lg:px-8">
      {/* Background ambient gradient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-teal-200/40 blur-3xl dark:bg-teal-800/20" />
        <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-emerald-200/40 blur-3xl dark:bg-emerald-800/20" />
        <div className="absolute left-1/2 top-1/3 h-60 w-60 -translate-x-1/2 rounded-full bg-teal-100/50 blur-3xl dark:bg-teal-900/20" />
      </div>

      <div className="relative w-full max-w-md">
        {/* App Logo & Branding */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-teal-500 to-emerald-400 shadow-xl shadow-teal-500/25">
            <span className="text-4xl font-extrabold text-white">৳</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            My Money
          </h1>
          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
            সুরক্ষিত ব্যক্তিগত আর্থিক হিসাব ও রিয়েল-টাইম ক্লাউড ব্যাকআপ
          </p>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-gray-200/80 bg-white/90 p-8 shadow-2xl backdrop-blur-md dark:border-gray-700/80 dark:bg-gray-800/90 sm:p-10">
          <div className="mb-6 text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
              <KeyRound className="h-3.5 w-3.5" />
              <span>পাসওয়ার্ড-অনলি সিকিউরিটি</span>
            </div>
            <h2 className="mt-3 text-xl font-bold text-gray-900 dark:text-white">
              লগইন করতে পাসওয়ার্ড দিন
            </h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              আপনার আর্থিক হিসাবসমূহ সম্পূর্ণ ব্যক্তিগত ও পাসওয়ার্ড দ্বারা সুরক্ষিত
            </p>
          </div>

          {/* Default Password Quick Hint & 1-Click Paste */}
          <div className="mb-6 rounded-2xl border border-teal-200 bg-teal-50/70 p-3.5 dark:border-teal-800/60 dark:bg-teal-950/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                <span className="text-xs font-medium text-teal-900 dark:text-teal-200">
                  ডিফল্ট পাসওয়ার্ড: <strong className="font-mono text-sm tracking-wider">11223344</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={handleQuickFill}
                className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600"
              >
                {autoFilled ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>বসানো হয়েছে</span>
                  </>
                ) : (
                  <span>স্বয়ংক্রিয় বসান</span>
                )}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50/90 p-3.5 text-xs font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 animate-in fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Password Input */}
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300"
              >
                পাসওয়ার্ড (Password)
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  autoFocus
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="পাসওয়ার্ড লিখুন (যেমন: 11223344)"
                  className={clsx(
                    'w-full rounded-2xl border py-3.5 pl-11 pr-12 text-sm transition-all',
                    'bg-white dark:bg-gray-700/80',
                    'text-gray-900 dark:text-white',
                    'placeholder-gray-400 dark:placeholder-gray-500',
                    'focus:outline-none focus:ring-4 focus:ring-teal-500/20',
                    error
                      ? 'border-red-300 dark:border-red-600 focus:border-red-500'
                      : 'border-gray-300 dark:border-gray-600 focus:border-teal-500'
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={clsx(
                'group relative flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white shadow-lg transition-all',
                'bg-gradient-to-r from-teal-500 via-teal-600 to-emerald-600 hover:from-teal-600 hover:to-emerald-700',
                'shadow-teal-500/25 hover:shadow-teal-500/40 hover:-translate-y-0.5 active:translate-y-0',
                'focus:outline-none focus:ring-4 focus:ring-teal-500/30',
                loading && 'opacity-80 cursor-wait'
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>যাচাই করা হচ্ছে...</span>
                </>
              ) : (
                <>
                  <span>লগইন করুন</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          {/* Security Guarantee Note */}
          <div className="mt-6 border-t border-gray-100 pt-4 text-center dark:border-gray-700/60">
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              🔒 একবার লগইন করলে এই ডিভাইসে ৩০ দিন পর্যন্ত সেশন সুরক্ষিত থাকবে। বারবার পাসওয়ার্ড দিতে হবে না।
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
