import { clsx } from 'clsx';

interface ProgressBarProps {
  value: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showPercentage?: boolean;
  className?: string;
  colorScheme?: 'budget' | 'teal' | 'emerald';
}

const sizeStyles: Record<string, string> = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

/**
 * Standard Budget & Progress Thresholds:
 * < 80%: Healthy green/teal
 * 80% - 99.9%: Warning amber/yellow
 * >= 100%: Over-budget red
 */
function getBarColor(value: number, scheme?: 'budget' | 'teal' | 'emerald'): string {
  if (scheme === 'teal') {
    return 'bg-teal-500 dark:bg-teal-400';
  }
  if (scheme === 'emerald') {
    return 'bg-emerald-500 dark:bg-emerald-400';
  }
  if (value < 80) return 'bg-teal-500 dark:bg-teal-400';
  if (value < 100) return 'bg-amber-500 dark:bg-amber-400';
  return 'bg-red-500 dark:bg-red-400';
}

export function ProgressBar({
  value,
  size = 'md',
  showLabel = false,
  showPercentage,
  className,
  colorScheme = 'budget',
}: ProgressBarProps) {
  const shouldShowLabel = showLabel || (showPercentage ?? false);
  const clampedValue = Math.max(0, value);
  const displayPercentage = Math.round(value);
  const barWidth = Math.min(100, clampedValue);

  return (
    <div className={clsx('w-full', className)}>
      {shouldShowLabel && (
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
            Progress
          </span>
          <span
            className={clsx(
              'text-xs font-semibold',
              value >= 100
                ? 'text-red-600 dark:text-red-400 font-bold'
                : value >= 80
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-gray-700 dark:text-gray-300'
            )}
          >
            {displayPercentage}%
          </span>
        </div>
      )}

      <div
        className={clsx(
          'w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700',
          sizeStyles[size]
        )}
        role="progressbar"
        aria-valuenow={Math.min(100, Math.round(clampedValue))}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${displayPercentage}% progress`}
      >
        <div
          className={clsx(
            'h-full rounded-full transition-all duration-500 ease-out',
            getBarColor(value, colorScheme)
          )}
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </div>
  );
}
