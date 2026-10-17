import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component tree:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/dashboard';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center p-6 text-center">
          <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-8 shadow-sm dark:border-rose-900/40 dark:bg-rose-950/30 max-w-lg">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-900/60 dark:text-rose-400">
              <AlertTriangle className="h-6 w-6" />
            </div>

            <h2 className="mt-4 text-base font-bold text-rose-900 dark:text-rose-200 sm:text-lg">
              একটি সমস্যা দেখা দিয়েছে / Something went wrong
            </h2>
            <p className="mt-2 text-xs text-rose-700 dark:text-rose-300">
              পৃষ্ঠাটি লোড করতে অপ্রত্যাশিত সমস্যা হয়েছে। অনুগ্রহ করে পেজটি রিলোড করুন অথবা ড্যাশবোর্ডে ফিরে যান।
            </p>

            {this.state.error && (
              <pre className="mt-3 overflow-x-auto rounded-lg bg-rose-100/50 p-2 text-left text-[11px] text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">
                {this.state.error.message}
              </pre>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button
                variant="primary"
                size="sm"
                onClick={this.handleReset}
                leftIcon={<RefreshCw className="h-4 w-4" />}
              >
                রিলোড করুন (Reload)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleGoHome}
                leftIcon={<Home className="h-4 w-4" />}
              >
                ড্যাশবোর্ডে যান (Dashboard)
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
