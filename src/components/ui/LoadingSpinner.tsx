import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  fullPage?: boolean;
  inline?: boolean;
  label?: string;
  text?: string;
  className?: string;
}

const spinnerSizes: Record<string, number> = {
  sm: 16,
  md: 24,
  lg: 40,
};

const labelSizes: Record<string, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

export function LoadingSpinner({
  size = 'md',
  fullPage = false,
  inline = false,
  label,
  text,
  className,
}: LoadingSpinnerProps) {
  const effectiveLabel = label || text;
  const spinner = (
    <div
      className={clsx(
        'flex items-center gap-2',
        inline ? 'inline-flex' : 'flex-col justify-center',
        className
      )}
      role="status"
      aria-label={effectiveLabel || 'Loading'}
    >
      <Loader2
        size={spinnerSizes[size]}
        className="animate-spin text-teal-500 dark:text-teal-400"
        aria-hidden="true"
      />
      {effectiveLabel && (
        <span
          className={clsx(
            'font-medium text-gray-500 dark:text-gray-400',
            labelSizes[size]
          )}
        >
          {effectiveLabel}
        </span>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm dark:bg-gray-900/80">
        {spinner}
      </div>
    );
  }

  return spinner;
}
