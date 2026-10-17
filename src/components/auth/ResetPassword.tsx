import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { z } from 'zod';
import { Mail, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';

const resetSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export default function ResetPassword() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const result = resetSchema.safeParse({ email });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    setLoading(true);
    try {
      await resetPassword(result.data.email);
      setSent(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to send reset link. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
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
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-gray-200 bg-white/80 p-8 shadow-xl backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/80">
          {sent ? (
            /* Success State */
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="h-7 w-7 text-green-500" />
              </div>
              <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
                Check your email
              </h2>
              <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
                We&apos;ve sent a password reset link to{' '}
                <span className="font-medium text-gray-700 dark:text-gray-300">{email}</span>.
                Please check your inbox and follow the instructions.
              </p>
              <Link
                to="/login"
                className={clsx(
                  'inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-all',
                  'bg-teal-500 hover:bg-teal-600',
                  'focus:outline-none focus:ring-2 focus:ring-teal-500/40'
                )}
              >
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Link>
            </div>
          ) : (
            /* Form State */
            <>
              <h2 className="mb-2 text-center text-xl font-semibold text-gray-900 dark:text-white">
                Reset your password
              </h2>
              <p className="mb-6 text-center text-sm text-gray-500 dark:text-gray-400">
                Enter your email address and we&apos;ll send you a link to reset your password.
              </p>

              {error && (
                <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div>
                  <label
                    htmlFor="reset-email"
                    className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      id="reset-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError('');
                      }}
                      placeholder="you@example.com"
                      className={clsx(
                        'w-full rounded-lg border py-2.5 pl-10 pr-4 text-sm transition-colors',
                        'bg-white dark:bg-gray-700',
                        'text-gray-900 dark:text-white',
                        'placeholder-gray-400 dark:placeholder-gray-500',
                        'focus:outline-none focus:ring-2 focus:ring-teal-500/40',
                        error
                          ? 'border-red-300 dark:border-red-600'
                          : 'border-gray-300 dark:border-gray-600'
                      )}
                    />
                  </div>
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
                      Sending link...
                    </>
                  ) : (
                    'Send reset link'
                  )}
                </button>
              </form>

              {/* Back to login */}
              <div className="mt-6 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1 text-sm font-medium text-teal-600 hover:text-teal-500 dark:text-teal-400"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
