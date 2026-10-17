import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { z } from 'zod';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  Loader2,
  AlertTriangle,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  X,
  Database,
  ArrowRight,
  Copy,
  Check,
} from 'lucide-react';
import clsx from 'clsx';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const { user, signIn, signInWithGoogle, isConfigured, enterDemoMode } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof LoginFormData, string>>>({});
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleEnterDemo = () => {
    enterDemoMode();
    navigate('/dashboard');
  };

  const handleCopyEnv = () => {
    navigator.clipboard.writeText(
      'VITE_SUPABASE_URL=https://your-project.supabase.co\nVITE_SUPABASE_ANON_KEY=your-anon-key'
    );
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof LoginFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    if (generalError) setGeneralError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');
    setErrors({});

    const result = loginSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof LoginFormData, string>> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof LoginFormData;
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    if (!isConfigured) {
      setGeneralError(
        'Supabase is not configured yet. Click "Explore Full App in Demo Mode" above to test immediately, or set up your .env credentials.'
      );
      return;
    }

    setLoading(true);
    try {
      await signIn(result.data.email, result.data.password);
      navigate('/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to sign in. Please try again.';
      setGeneralError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!isConfigured) {
      setGeneralError(
        'Supabase is not configured yet. Click "Explore Full App in Demo Mode" above to test immediately.'
      );
      return;
    }

    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to sign in with Google.';
      setGeneralError(message);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-50 via-gray-50 to-cyan-50 px-4 py-12 dark:from-gray-900 dark:via-gray-900 dark:to-teal-950">
      {/* Background pattern */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-teal-200/30 blur-3xl dark:bg-teal-800/20" />
        <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-cyan-200/30 blur-3xl dark:bg-cyan-800/20" />
        <div className="absolute left-1/2 top-1/3 h-60 w-60 -translate-x-1/2 rounded-full bg-teal-100/40 blur-3xl dark:bg-teal-900/20" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Branding */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 shadow-lg shadow-teal-500/25">
            <span className="text-3xl font-bold text-white">৳</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Money</h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Track, manage, and grow your finances
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-gray-200 bg-white/80 p-8 shadow-xl backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/80">
          <h2 className="mb-4 text-center text-xl font-semibold text-gray-900 dark:text-white">
            Welcome back
          </h2>

          {/* Database Unconfigured Status Banner */}
          {!isConfigured && (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-sm dark:border-amber-900/60 dark:bg-amber-950/40">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-amber-900 dark:text-amber-200">
                      Supabase Not Connected
                    </p>
                    <span className="rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-800 dark:text-amber-100">
                      OFFLINE
                    </span>
                  </div>
                  <p className="text-xs text-amber-800/90 dark:text-amber-300 leading-relaxed">
                    To enable permanent cloud sync, provide your Supabase URL & Key in <code className="rounded bg-amber-200/50 px-1 font-mono text-[11px] dark:bg-amber-900/50">.env</code>.
                  </p>
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowSetupModal(true)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 underline hover:text-teal-800 dark:text-teal-400"
                    >
                      <Database className="h-3.5 w-3.5" />
                      View 3-Step Setup Instructions
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-3.5 border-t border-amber-200/80 pt-3 dark:border-amber-900/50">
                <button
                  type="button"
                  onClick={handleEnterDemo}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-teal-700 active:scale-[0.99]"
                >
                  <Sparkles className="h-4 w-4" />
                  Explore Full App in Demo Mode
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {generalError && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
              {generalError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className={clsx(
                    'w-full rounded-lg border py-2.5 pl-10 pr-4 text-sm transition-colors',
                    'bg-white dark:bg-gray-700',
                    'text-gray-900 dark:text-white',
                    'placeholder-gray-400 dark:placeholder-gray-500',
                    'focus:outline-none focus:ring-2 focus:ring-teal-500/40',
                    errors.email
                      ? 'border-red-300 dark:border-red-600'
                      : 'border-gray-300 dark:border-gray-600'
                  )}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  className={clsx(
                    'w-full rounded-lg border py-2.5 pl-10 pr-10 text-sm transition-colors',
                    'bg-white dark:bg-gray-700',
                    'text-gray-900 dark:text-white',
                    'placeholder-gray-400 dark:placeholder-gray-500',
                    'focus:outline-none focus:ring-2 focus:ring-teal-500/40',
                    errors.password
                      ? 'border-red-300 dark:border-red-600'
                      : 'border-gray-300 dark:border-gray-600'
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.password}</p>
              )}
            </div>

            {/* Remember me & Forgot password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-teal-500 focus:ring-teal-500 dark:border-gray-600 dark:bg-gray-700"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">Remember me</span>
              </label>
              <Link
                to="/reset-password"
                className="text-sm font-medium text-teal-600 hover:text-teal-500 dark:text-teal-400"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={clsx(
                'flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-all',
                'bg-teal-500 hover:bg-teal-600 active:bg-teal-700',
                'focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:ring-offset-2 dark:focus:ring-offset-gray-800',
                'disabled:cursor-not-allowed disabled:opacity-60'
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
            <span className="text-xs text-gray-400 dark:text-gray-500">or continue with</span>
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
          </div>

          {/* Google Sign In */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className={clsx(
              'flex w-full items-center justify-center gap-3 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors',
              'border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
              'dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600',
              'focus:outline-none focus:ring-2 focus:ring-teal-500/40',
              'disabled:cursor-not-allowed disabled:opacity-60'
            )}
          >
            {googleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            )}
            Continue with Google
          </button>

          {/* Sign up link */}
          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Don&apos;t have an account?{' '}
            <Link
              to="/register"
              className="font-semibold text-teal-600 hover:text-teal-500 dark:text-teal-400"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>

      {/* Supabase Setup Modal */}
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
                  Follow these 3 easy steps for free permanent storage
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
                  Go to <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="font-medium text-teal-600 hover:underline inline-flex items-center gap-0.5">supabase.com <ExternalLink className="h-3 w-3" /></a> and start a new free PostgreSQL project.
                </p>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-3.5 dark:border-gray-700 dark:bg-gray-900/50">
                <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-500 text-xs text-white font-bold">2</span>
                  Run Database Migration SQL
                </p>
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                  In Supabase dashboard, click <strong>SQL Editor</strong> &gt; <strong>New Query</strong>. Copy and run the entire SQL schema from:
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
                  In Project Settings &gt; API, copy URL & anon key into <code className="font-mono">.env</code> in your project root:
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
                className="rounded-lg px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSetupModal(false);
                  handleEnterDemo();
                }}
                className="rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-700 shadow-sm"
              >
                Try Demo Mode First
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
