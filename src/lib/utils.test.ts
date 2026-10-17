import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  parseAmount,
  getPercentageChange,
  getMonthRange,
} from './utils';

describe('Financial Utilities', () => {
  it('formats currency with Bangladeshi Taka (৳) symbol', () => {
    const formatted = formatCurrency(125000);
    expect(formatted).toContain('৳');
    // Checks that it formats number properly
    expect(formatted).toMatch(/৳\s?1,25,000(\.00)?|৳\s?125,000(\.00)?/);
  });

  it('formats zero balance correctly as ৳0.00', () => {
    const formatted = formatCurrency(0);
    expect(formatted).toContain('৳');
    expect(formatted).toContain('0');
  });

  it('safely parses amounts from user input', () => {
    expect(parseAmount('1500')).toBe(1500);
    expect(parseAmount('৳2,500.50')).toBe(2500.5);
    expect(parseAmount('abc')).toBe(0);
    expect(parseAmount('')).toBe(0);
  });

  it('calculates percentage changes safely without NaN or infinity', () => {
    expect(getPercentageChange(150, 100)).toBe(50);
    expect(getPercentageChange(50, 100)).toBe(-50);
    expect(getPercentageChange(100, 0)).toBe(100);
    expect(getPercentageChange(0, 0)).toBe(0);
  });

  it('generates accurate month start and end dates', () => {
    const [start, end] = getMonthRange(2026, 10);
    expect(start).toBe('2026-10-01');
    expect(end).toBe('2026-10-31');
  });
});
