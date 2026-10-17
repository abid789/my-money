import clsx, { type ClassValue } from 'clsx';
import {
  format,
  parseISO,
  isToday,
  isYesterday,
  differenceInDays,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  getDaysInMonth as fnsGetDaysInMonth,
} from 'date-fns';

// ─── Class Name Merge ───────────────────────────────────────────────────────

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

// ─── Currency Formatting ────────────────────────────────────────────────────

/**
 * Format a number as BDT currency with Bangladeshi/Indian grouping.
 * Example: 123456.50 → ৳1,23,456.50
 */
export function formatCurrency(amount: number, currency: string = 'BDT'): string {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  // Use en-IN locale for the Bangladeshi/Indian comma grouping (1,23,456.00)
  const formatter = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const formatted = formatter.format(absAmount);
  const symbol = currency === 'BDT' ? '৳' : currency;

  return isNegative ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
}

// ─── Date Formatting ────────────────────────────────────────────────────────

/**
 * Format a date string using date-fns format tokens.
 * Default format: "MMM dd, yyyy" (e.g., "Oct 17, 2026")
 */
export function formatDate(date: string, formatStr: string = 'MMM dd, yyyy'): string {
  try {
    const parsed = parseISO(date);
    return format(parsed, formatStr);
  } catch {
    return date;
  }
}

/**
 * Format a date as "Today", "Yesterday", or the formatted date.
 */
export function formatRelativeDate(date: string): string {
  try {
    const parsed = parseISO(date);
    if (isToday(parsed)) return 'Today';
    if (isYesterday(parsed)) return 'Yesterday';
    return format(parsed, 'MMM dd, yyyy');
  } catch {
    return date;
  }
}

// ─── Percentage Calculation ─────────────────────────────────────────────────

/**
 * Calculate percentage change between current and previous values.
 * Returns 0 if previous is 0 to avoid Infinity.
 */
export function getPercentageChange(current: number, previous: number): number {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }
  return ((current - previous) / Math.abs(previous)) * 100;
}

/**
 * Calculate percentage used: (spent / total) * 100.
 */
export function calculatePercentageUsed(spent: number, total: number): number {
  if (total <= 0) return 0;
  const pct = (spent / total) * 100;
  return Math.round(pct * 100) / 100;
}

// ─── Date Ranges ────────────────────────────────────────────────────────────

/**
 * Get the start and end date of a given month.
 * @returns [startDate, endDate] as ISO date strings (YYYY-MM-DD)
 */
export function getMonthRange(year: number, month: number): [string, string] {
  const date = new Date(year, month - 1, 1);
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  return [format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd')];
}

/**
 * Get the start and end of the week containing the given date.
 * @returns [startDate, endDate] as ISO date strings (YYYY-MM-DD)
 */
export function getWeekRange(date: Date): [string, string] {
  const start = startOfWeek(date, { weekStartsOn: 0 });
  const end = endOfWeek(date, { weekStartsOn: 0 });
  return [format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd')];
}

// ─── ID Generation ──────────────────────────────────────────────────────────

/**
 * Generate a random UUID.
 */
export function generateId(): string {
  return crypto.randomUUID();
}

// ─── Async Helpers ──────────────────────────────────────────────────────────

/**
 * Promise-based sleep utility.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Debounce ───────────────────────────────────────────────────────────────

/**
 * Create a debounced version of a function.
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

// ─── String Utilities ───────────────────────────────────────────────────────

/**
 * Truncate a string and add ellipsis if it exceeds the given length.
 */
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '…';
}

// ─── Number Parsing ─────────────────────────────────────────────────────────

/**
 * Safely parse a string into a number. Returns 0 for invalid values.
 */
export function parseAmount(value: string): number {
  if (!value || value.trim() === '') return 0;
  // Remove currency symbols, commas, and spaces
  const cleaned = value.replace(/[৳,$\s,]/g, '').trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

// ─── Date Utilities ─────────────────────────────────────────────────────────

/**
 * Get the number of days in a given month.
 */
export function getDaysInMonth(year: number, month: number): number {
  return fnsGetDaysInMonth(new Date(year, month - 1, 1));
}

/**
 * Get the number of days between two date strings.
 */
export function getDaysBetween(start: string, end: string): number {
  try {
    const startDate = parseISO(start);
    const endDate = parseISO(end);
    return Math.abs(differenceInDays(endDate, startDate));
  } catch {
    return 0;
  }
}

// ─── Greeting ───────────────────────────────────────────────────────────────

/**
 * Returns a time-of-day greeting based on the current hour.
 */
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return 'Good night';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
}
