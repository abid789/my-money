import { describe, it, expect } from 'vitest';
import {
  generateWeeklyReportData,
  generateWeeklyHtmlEmail,
  generateWeeklyPlainText,
} from './emailReport';
import type { Transaction, Account, Category } from '@/types';
import { format } from 'date-fns';

describe('Weekly Email Digest Generator', () => {
  const dummyAccount: Account = {
    id: 'acc-1',
    user_id: 'user-1',
    name: 'Cash / bKash',
    type: 'bKash',
    opening_balance: 5000,
    current_balance: 8500,
    currency: 'BDT',
    icon: 'Smartphone',
    color: '#ec4899',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  const dummyCategory: Category = {
    id: 'cat-food',
    user_id: 'user-1',
    name: 'Food & Dining',
    type: 'expense',
    icon: 'Utensils',
    color: '#ef4444',
    parent_id: null,
    sort_order: 1,
    is_default: true,
    created_at: '2026-01-01T00:00:00Z',
  };

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const sampleTransactions: Transaction[] = [
    {
      id: 'txn-1',
      user_id: 'user-1',
      type: 'income',
      amount: 15000,
      date: todayStr,
      time: null,
      description: 'Freelance Payout',
      category_id: null,
      subcategory: null,
      account_id: 'acc-1',
      to_account_id: null,
      payment_method: 'bKash',
      merchant: null,
      notes: null,
      tags: [],
      is_recurring: false,
      recurring_id: null,
      created_at: '2026-10-10T00:00:00Z',
      updated_at: '2026-10-10T00:00:00Z',
    },
    {
      id: 'txn-2',
      user_id: 'user-1',
      type: 'expense',
      amount: 3500,
      date: todayStr,
      time: null,
      description: 'Grocery Shopping',
      category_id: 'cat-food',
      category: dummyCategory,
      subcategory: null,
      account_id: 'acc-1',
      to_account_id: null,
      payment_method: 'Cash',
      merchant: null,
      notes: null,
      tags: [],
      is_recurring: false,
      recurring_id: null,
      created_at: '2026-10-11T00:00:00Z',
      updated_at: '2026-10-11T00:00:00Z',
    },
  ];

  it('generates accurate 7-day financial calculations for abidasset@gmail.com', () => {
    const report = generateWeeklyReportData(
      sampleTransactions,
      [dummyCategory],
      [dummyAccount],
      'abidasset@gmail.com'
    );

    expect(report.recipientEmail).toBe('abidasset@gmail.com');
    expect(report.totalIncome).toBe(15000);
    expect(report.totalExpenses).toBe(3500);
    expect(report.netCashFlow).toBe(11500);
    expect(report.transactionCount).toBe(2);
    expect(report.accounts[0].name).toBe('Cash / bKash');
    expect(report.accounts[0].balance).toBe(8500);
  });

  it('generates valid HTML email template containing Bangladeshi Taka ৳ and user email', () => {
    const report = generateWeeklyReportData(
      sampleTransactions,
      [dummyCategory],
      [dummyAccount],
      'abidasset@gmail.com'
    );
    const html = generateWeeklyHtmlEmail(report);

    expect(html).toContain('abidasset@gmail.com');
    expect(html).toContain('৳ My Money');
    expect(html).toContain('মোট আয়');
    expect(html).toContain('মোট ব্যয়');
    expect(html).toContain('Cash / bKash');
  });

  it('generates clean plain text template suitable for mailto drafts', () => {
    const report = generateWeeklyReportData(
      sampleTransactions,
      [dummyCategory],
      [dummyAccount],
      'abidasset@gmail.com'
    );
    const plain = generateWeeklyPlainText(report);

    expect(plain).toContain('abidasset@gmail.com');
    expect(plain).toContain('মোট আয়: +৳15,000.00');
    expect(plain).toContain('মোট ব্যয়: -৳3,500.00');
    expect(plain).toContain('নীট ব্যালেন্স: ৳11,500.00');
  });

  it('gracefully handles empty transactions with zero amounts', () => {
    const report = generateWeeklyReportData([], [], [dummyAccount], 'abidasset@gmail.com');

    expect(report.totalIncome).toBe(0);
    expect(report.totalExpenses).toBe(0);
    expect(report.netCashFlow).toBe(0);
    expect(report.savingsRate).toBe(0);
    expect(report.transactionCount).toBe(0);

    const html = generateWeeklyHtmlEmail(report);
    expect(html).toContain('চলতি সপ্তাহে কোনো ব্যয়ের রেকর্ড নেই');
  });
});
