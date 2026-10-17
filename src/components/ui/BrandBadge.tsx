import { clsx } from 'clsx';
import {
  Wallet,
  Building,
  CreditCard,
  Banknote,
  Smartphone,
  CircleDollarSign,
  HelpCircle,
} from 'lucide-react';

export type BrandType =
  | 'bkash'
  | 'nagad'
  | 'rocket'
  | 'upay'
  | 'bank'
  | 'cash'
  | 'card'
  | 'debit card'
  | 'credit card'
  | 'other';

interface BrandBadgeProps {
  brand: string | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

interface BrandConfig {
  name: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  iconBg: string;
  iconColor: string;
  IconComponent: any;
  customLogo?: string;
}

export function detectBrand(rawName: string | null | undefined): string {
  if (!rawName) return 'cash';
  const lower = rawName.toLowerCase();
  if (lower.includes('bkash') || lower.includes('বিকাশ')) return 'bkash';
  if (lower.includes('nagad') || lower.includes('নগদ')) return 'nagad';
  if (lower.includes('rocket') || lower.includes('রকেট')) return 'rocket';
  if (lower.includes('upay') || lower.includes('উপায়')) return 'upay';
  if (lower.includes('bank') || lower.includes('ব্যাংক') || lower.includes('city') || lower.includes('brac') || lower.includes('dutch')) return 'bank';
  if (lower.includes('card') || lower.includes('কার্ড') || lower.includes('visa') || lower.includes('mastercard')) return 'card';
  if (lower.includes('cash') || lower.includes('ক্যাশ') || lower.includes('নগদ টাকা')) return 'cash';
  return 'other';
}

const BRAND_CONFIGS: Record<string, BrandConfig> = {
  bkash: {
    name: 'bKash',
    badgeBg: 'bg-pink-50 dark:bg-pink-950/40',
    badgeText: 'text-[#e2136e] dark:text-pink-400',
    badgeBorder: 'border-pink-200 dark:border-pink-900/50',
    iconBg: 'bg-[#e2136e]',
    iconColor: 'text-white',
    IconComponent: Smartphone,
  },
  nagad: {
    name: 'Nagad',
    badgeBg: 'bg-orange-50 dark:bg-orange-950/40',
    badgeText: 'text-orange-600 dark:text-orange-400',
    badgeBorder: 'border-orange-200 dark:border-orange-900/50',
    iconBg: 'bg-orange-600',
    iconColor: 'text-white',
    IconComponent: Smartphone,
  },
  rocket: {
    name: 'Rocket',
    badgeBg: 'bg-purple-50 dark:bg-purple-950/40',
    badgeText: 'text-purple-700 dark:text-purple-300',
    badgeBorder: 'border-purple-200 dark:border-purple-900/50',
    iconBg: 'bg-purple-600',
    iconColor: 'text-white',
    IconComponent: Smartphone,
  },
  upay: {
    name: 'Upay',
    badgeBg: 'bg-blue-50 dark:bg-blue-950/40',
    badgeText: 'text-blue-700 dark:text-blue-300',
    badgeBorder: 'border-blue-200 dark:border-blue-900/50',
    iconBg: 'bg-blue-700',
    iconColor: 'text-white',
    IconComponent: Smartphone,
  },
  bank: {
    name: 'Bank',
    badgeBg: 'bg-sky-50 dark:bg-sky-950/40',
    badgeText: 'text-sky-700 dark:text-sky-300',
    badgeBorder: 'border-sky-200 dark:border-sky-900/50',
    iconBg: 'bg-sky-600',
    iconColor: 'text-white',
    IconComponent: Building,
  },
  cash: {
    name: 'Cash',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    badgeBorder: 'border-emerald-200 dark:border-emerald-900/50',
    iconBg: 'bg-emerald-600',
    iconColor: 'text-white',
    IconComponent: Banknote,
  },
  card: {
    name: 'Card',
    badgeBg: 'bg-indigo-50 dark:bg-indigo-950/40',
    badgeText: 'text-indigo-700 dark:text-indigo-300',
    badgeBorder: 'border-indigo-200 dark:border-indigo-900/50',
    iconBg: 'bg-indigo-600',
    iconColor: 'text-white',
    IconComponent: CreditCard,
  },
  other: {
    name: 'Other',
    badgeBg: 'bg-gray-100 dark:bg-gray-800',
    badgeText: 'text-gray-700 dark:text-gray-300',
    badgeBorder: 'border-gray-200 dark:border-gray-700',
    iconBg: 'bg-gray-600',
    iconColor: 'text-white',
    IconComponent: CircleDollarSign,
  },
};

export function BrandBadge({
  brand,
  size = 'md',
  showLabel = true,
  className,
}: BrandBadgeProps) {
  const brandKey = detectBrand(brand);
  const cfg = BRAND_CONFIGS[brandKey] || BRAND_CONFIGS.other;
  const Icon = cfg.IconComponent;

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2',
  }[size];

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
  }[size];

  return (
    <span
      className={clsx(
        'inline-flex items-center font-semibold rounded-full border shadow-xs transition-colors select-none',
        cfg.badgeBg,
        cfg.badgeText,
        cfg.badgeBorder,
        sizeClasses,
        className
      )}
      title={brand || cfg.name}
    >
      <Icon className={clsx(iconSizes, 'shrink-0')} />
      {showLabel && (
        <span className="truncate">{brand && brandKey !== 'other' ? brand : cfg.name}</span>
      )}
    </span>
  );
}

export function BrandIconBubble({
  brand,
  size = 'md',
  className,
}: {
  brand: string | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const brandKey = detectBrand(brand);
  const cfg = BRAND_CONFIGS[brandKey] || BRAND_CONFIGS.other;
  const Icon = cfg.IconComponent;

  const bubbleSizes = {
    sm: 'h-7 w-7 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
  }[size];

  const iconSizes = {
    sm: 'h-3.5 w-3.5',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  }[size];

  return (
    <div
      className={clsx(
        'flex items-center justify-center rounded-xl shadow-xs shrink-0',
        cfg.iconBg,
        cfg.iconColor,
        bubbleSizes,
        className
      )}
    >
      <Icon className={iconSizes} />
    </div>
  );
}
