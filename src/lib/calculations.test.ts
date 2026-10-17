import { describe, it, expect } from 'vitest';
import {
  calculateTotalIncome,
  calculateTotalExpenses,
  calculateNetCashFlow,
  calculateAccountBalance,
  calculateRemainingBudget,
  calculateSavingsRate,
  calculatePercentageUsed,
  calculateDailyAverage,
  calculateMonthComparison,
  calculateCategoryBreakdown,
} from './calculations';
import type { Transaction, Account, Category, Budget } from '@/types';

describe('Financial Calculations Engine', () => {
  const dummyAccount: Account = {
    id: 'acc-1',
    user_id: 'user-1',
    name: 'Primary bKash',
    type: 'bKash',
    opening_balance: 1000,
    current_balance: 1000,
    currency: 'BDT',
    icon: 'Smartphone',
    color: '#ec4899',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  const dummyAccount2: Account = {
    id: 'acc-2',
    user_id: 'user-1',
    name: 'City Bank',
    type: 'Bank',
    opening_balance: 5000,
    current_balance: 5000,
    currency: 'BDT',
    icon: 'Building',
    color: '#3b82f6',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  const sampleTransactions: Transaction[] = [
    {
      id: 'txn-1',
      user_id: 'user-1',
      type: 'income',
      amount: 50000,
      date: '2026-10-01',
      time: null,
      description: 'Monthly Salary',
      category_id: 'cat-sal',
      subcategory: null,
      account_id: 'acc-1',
      to_account_id: null,
      payment_method: 'Bank Transfer',
      merchant: null,
      notes: null,
      tags: [],
      is_recurring: false,
      recurring_id: null,
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    },
    {
      id: 'txn-2',
      user_id: 'user-1',
      type: 'expense',
      amount: 15000,
      date: '2026-10-02',
      time: null,
      description: 'Rent',
      category_id: 'cat-rent',
      subcategory: null,
      account_id: 'acc-1',
      to_account_id: null,
      payment_method: 'Cash',
      merchant: null,
      notes: null,
      tags: [],
      is_recurring: false,
      recurring_id: null,
      created_at: '2026-10-02T00:00:00Z',
      updated_at: '2026-10-02T00:00:00Z',
    },
    {
      id: 'txn-3',
      user_id: 'user-1',
      type: 'expense',
      amount: 5000,
      date: '2026-10-03',
      time: null,
      description: 'Groceries',
      category_id: 'cat-food',
      subcategory: null,
      account_id: 'acc-1',
      to_account_id: null,
      payment_method: 'Cash',
      merchant: null,
      notes: null,
      tags: [],
      is_recurring: false,
      recurring_id: null,
      created_at: '2026-10-03T00:00:00Z',
      updated_at: '2026-10-03T00:00:00Z',
    },
    {
      id: 'txn-4',
      user_id: 'user-1',
      type: 'transfer',
      amount: 2000,
      date: '2026-10-04',
      time: null,
      description: 'Transfer to Bank',
      category_id: null,
      subcategory: null,
      account_id: 'acc-1',
      to_account_id: 'acc-2',
      payment_method: 'Transfer',
      merchant: null,
      notes: null,
      tags: [],
      is_recurring: false,
      recurring_id: null,
      created_at: '2026-10-04T00:00:00Z',
      updated_at: '2026-10-04T00:00:00Z',
    },
  ];

  it('calculates total income correctly', () => {
    const income = calculateTotalIncome(sampleTransactions);
    expect(income).toBe(50000);
  });

  it('calculates total expenses without counting transfers as expenses', () => {
    const expenses = calculateTotalExpenses(sampleTransactions);
    expect(expenses).toBe(20000); // 15000 + 5000, transfer (2000) must be excluded
  });

  it('calculates net cash flow correctly', () => {
    const income = calculateTotalIncome(sampleTransactions);
    const expenses = calculateTotalExpenses(sampleTransactions);
    const net = calculateNetCashFlow(income, expenses);
    expect(net).toBe(30000); // 50000 - 20000
  });

  it('calculates account balance accurately with inflows, outflows, and transfers', () => {
    // acc-1: opening 1000 + income 50000 - rent 15000 - groceries 5000 - transfer out 2000 = 29000
    const balance1 = calculateAccountBalance(dummyAccount, sampleTransactions);
    expect(balance1).toBe(29000);

    // acc-2: opening 5000 + transfer in 2000 = 7000
    const balance2 = calculateAccountBalance(dummyAccount2, sampleTransactions);
    expect(balance2).toBe(7000);
  });

  it('calculates remaining budget correctly', () => {
    const budget: Budget = {
      id: 'b-1',
      user_id: 'user-1',
      name: 'Food',
      amount: 8000,
      spent: 5000,
      category_id: 'cat-food',
      period: 'monthly',
      start_date: '2026-10-01',
      end_date: '2026-10-31',
      alert_threshold_50: true,
      alert_threshold_75: true,
      alert_threshold_90: true,
      alert_threshold_100: true,
      is_active: true,
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    };
    const remaining = calculateRemainingBudget(budget, 5000);
    expect(remaining).toBe(3000);
  });

  it('handles savings rate with zero-division safety', () => {
    expect(calculateSavingsRate(50000, 20000)).toBe(60); // ((50000-20000)/50000)*100
    expect(calculateSavingsRate(0, 0)).toBe(0);
    expect(calculateSavingsRate(0, 5000)).toBe(0);
  });

  it('handles percentage used with zero-division safety', () => {
    expect(calculatePercentageUsed(2500, 5000)).toBe(50);
    expect(calculatePercentageUsed(0, 0)).toBe(0);
    expect(calculatePercentageUsed(100, 0)).toBe(0);
  });

  it('calculates daily average with zero-days safety', () => {
    expect(calculateDailyAverage(3000, 10)).toBe(300);
    expect(calculateDailyAverage(3000, 0)).toBe(0);
  });

  it('calculates month-over-month comparison without dividing by zero', () => {
    expect(calculateMonthComparison(120, 100)).toBe(20);
    expect(calculateMonthComparison(80, 100)).toBe(-20);
    expect(calculateMonthComparison(500, 0)).toBe(100);
    expect(calculateMonthComparison(0, 0)).toBe(0);
  });

  it('breaks down spending by categories with correct sums and percentages', () => {
    const categories: Category[] = [
      {
        id: 'cat-rent',
        user_id: 'user-1',
        name: 'Rent',
        type: 'expense',
        icon: 'Home',
        color: '#ef4444',
        parent_id: null,
        sort_order: 1,
        is_default: true,
        created_at: '2026-01-01T00:00:00Z',
      },
      {
        id: 'cat-food',
        user_id: 'user-1',
        name: 'Food',
        type: 'expense',
        icon: 'ShoppingCart',
        color: '#f97316',
        parent_id: null,
        sort_order: 2,
        is_default: true,
        created_at: '2026-01-01T00:00:00Z',
      },
    ];

    const breakdown = calculateCategoryBreakdown(sampleTransactions, categories);
    expect(breakdown).toHaveLength(2);
    expect(breakdown[0].category).toBe('Rent');
    expect(breakdown[0].amount).toBe(15000);
    expect(breakdown[0].percentage).toBe(75);

    expect(breakdown[1].category).toBe('Food');
    expect(breakdown[1].amount).toBe(5000);
    expect(breakdown[1].percentage).toBe(25);
  });
});
