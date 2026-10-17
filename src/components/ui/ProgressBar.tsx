import { clsx } from 'clsx';

interface ProgressBarProps {
  value: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showPercentage?: boolean;
  className?: string;
}

const sizeStyles: Record<string, string> = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

function getBarColor(value: number): string {
  if (value < 50) return 'bg-green-500 dark:bg-green-400';
  if (value < 75) return 'bg-amber-500 dark:bg-amber-400';
  if (value < 90) return 'bg-orange-500 dark:bg-orange-400';
  return 'bg-red-500 dark:bg-red-400';
}

export function ProgressBar({
  value,
  size = 'md',
  showLabel = false,
  showPercentage,
  className,
}: ProgressBarProps) {
  const shouldShowLabel = showLabel || (showPercentage ?? false);
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div className={clsx('w-full', className)}>
      {showLabel && (
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
            Progress
          </span>
          <span
            className={clsx(
              'text-xs font-semibold',
              clampedValue >= 90
                ? 'text-red-600 dark:text-red-400'
                : 'text-gray-700 dark:text-gray-300'
            )}
          >
            {Math.round(clampedValue)}%
          </span>
        </div>
      )}

      <div
        className={clsx(
          'w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700',
          sizeStyles[size]
        )}
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${Math.round(clampedValue)}% progress`}
      >
        <div
          className={clsx(
            'h-full rounded-full transition-all duration-500 ease-out',
            getBarColor(clampedValue)
          )}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
}
