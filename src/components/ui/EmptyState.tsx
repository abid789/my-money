import { clsx } from 'clsx';
import { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';

interface EmptyStateProps {
  icon?: any;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  action,
  className,
}: EmptyStateProps) {
  const effectiveLabel = actionLabel || action?.label;
  const effectiveAction = onAction || action?.onClick;

  const renderIcon = () => {
    if (!icon) return null;
    if (typeof icon === 'function') {
      const IconComponent = icon;
      return <IconComponent className="h-10 w-10 text-gray-300 dark:text-gray-600" />;
    }
    return icon;
  };

  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center px-6 py-12 text-center',
        className
      )}
    >
      {icon && (
        <div className="mb-4 text-gray-300 dark:text-gray-600" aria-hidden="true">
          {renderIcon()}
        </div>
      )}

      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        {title}
      </h3>

      {description && (
        <p className="mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-400">
          {description}
        </p>
      )}

      {effectiveLabel && effectiveAction && (
        <div className="mt-6">
          <Button variant="primary" onClick={effectiveAction}>
            {effectiveLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
