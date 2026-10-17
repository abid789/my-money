import { clsx } from 'clsx';
import { X } from 'lucide-react';
import { HTMLAttributes } from 'react';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'danger' | 'warning' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  dot?: boolean;
  removable?: boolean;
  onRemove?: () => void;
}

const variantStyles: Record<string, string> = {
  success:
    'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  danger:
    'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  warning:
    'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  info:
    'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
  neutral:
    'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

const dotColorStyles: Record<string, string> = {
  success: 'bg-green-500',
  danger: 'bg-red-500',
  warning: 'bg-amber-500',
  info: 'bg-teal-500',
  neutral: 'bg-gray-500',
};

const sizeStyles: Record<string, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
};

export function Badge({
  variant = 'neutral',
  size = 'sm',
  dot = false,
  removable = false,
  onRemove,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={clsx('h-1.5 w-1.5 shrink-0 rounded-full', dotColorStyles[variant])}
          aria-hidden="true"
        />
      )}
      {children}
      {removable && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
          aria-label="Remove"
          className={clsx(
            '-mr-0.5 ml-0.5 inline-flex shrink-0 items-center justify-center rounded-full p-0.5 transition-colors',
            'hover:bg-black/10 dark:hover:bg-white/10'
          )}
        >
          <X size={size === 'sm' ? 12 : 14} />
        </button>
      )}
    </span>
  );
}
