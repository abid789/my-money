import { clsx } from 'clsx';
import { ReactNode } from 'react';

export interface TabItem {
  label: string;
  value: string;
  icon?: ReactNode;
}

interface TabsProps {
  items: TabItem[];
  activeTab: string;
  onChange: (value: string) => void;
  className?: string;
}

export function Tabs({ items, activeTab, onChange, className }: TabsProps) {
  return (
    <div
      className={clsx(
        'border-b border-gray-200 dark:border-gray-700',
        className
      )}
      role="tablist"
    >
      <nav className="-mb-px flex gap-1 overflow-x-auto scrollbar-hide" aria-label="Tabs">
        {items.map((item) => {
          const isActive = item.value === activeTab;

          return (
            <button
              key={item.value}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${item.value}`}
              onClick={() => onChange(item.value)}
              className={clsx(
                'inline-flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors duration-150',
                isActive
                  ? 'border-teal-500 text-teal-600 dark:border-teal-400 dark:text-teal-400'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-300'
              )}
            >
              {item.icon && (
                <span className="shrink-0" aria-hidden="true">
                  {item.icon}
                </span>
              )}
              {item.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

interface TabPanelProps {
  value: string;
  activeTab: string;
  children: ReactNode;
  className?: string;
}

export function TabPanel({ value, activeTab, children, className }: TabPanelProps) {
  if (value !== activeTab) return null;

  return (
    <div
      id={`tabpanel-${value}`}
      role="tabpanel"
      aria-labelledby={value}
      className={className}
    >
      {children}
    </div>
  );
}
