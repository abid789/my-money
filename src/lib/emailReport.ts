import type { Transaction, Category, Account } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { calculateCategoryBreakdown } from '@/lib/calculations';
import { subDays, format } from 'date-fns';

export interface WeeklyReportData {
  startDate: string;
  endDate: string;
  recipientEmail: string;
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  savingsRate: number;
  categorySpending: { category: string; amount: number; percentage: number }[];
  topExpenses: { description: string; amount: number; category: string; date: string }[];
  accounts: { name: string; balance: number }[];
  transactionCount: number;
  prevWeek?: {
    startDate: string;
    endDate: string;
    totalIncome: number;
    totalExpenses: number;
    netCashFlow: number;
    incomeChange: number;
    expenseChange: number;
  };
}

/**
 * Generate weekly summary data from recorded transactions and accounts.
 */
export function generateWeeklyReportData(
  transactions: Transaction[],
  categories: Category[],
  accounts: Account[],
  recipientEmail: string = 'abidasset@gmail.com',
  customStartDate?: string,
  customEndDate?: string
): WeeklyReportData {
  const now = new Date();
  const defaultStartDate = format(subDays(now, 7), 'yyyy-MM-dd');
  const defaultEndDate = format(now, 'yyyy-MM-dd');

  const startDateStr = customStartDate || defaultStartDate;
  const endDateStr = customEndDate || defaultEndDate;

  // Calculate previous week range for comparison (same number of days prior)
  const startD = new Date(startDateStr);
  const endD = new Date(endDateStr);
  const diffTime = Math.abs(endD.getTime() - startD.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  const prevEndD = new Date(startD);
  prevEndD.setDate(prevEndD.getDate() - 1);
  const prevStartD = new Date(prevEndD);
  prevStartD.setDate(prevEndD.getDate() - (diffDays - 1));

  const prevStartDateStr = format(prevStartD, 'yyyy-MM-dd');
  const prevEndDateStr = format(prevEndD, 'yyyy-MM-dd');

  // Filter current period transactions
  const weeklyTxns = transactions.filter((t) => {
    const d = t.date.split('T')[0];
    return d >= startDateStr && d <= endDateStr;
  });

  const incomeTxns = weeklyTxns.filter((t) => t.type === 'income' || t.type === 'refund');
  const expenseTxns = weeklyTxns.filter((t) => t.type === 'expense');

  const totalIncome = incomeTxns.reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpenses = expenseTxns.reduce((sum, t) => sum + Number(t.amount), 0);
  const netCashFlow = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

  // Filter previous period transactions for comparison
  const prevWeeklyTxns = transactions.filter((t) => {
    const d = t.date.split('T')[0];
    return d >= prevStartDateStr && d <= prevEndDateStr;
  });

  const prevIncomeTxns = prevWeeklyTxns.filter((t) => t.type === 'income' || t.type === 'refund');
  const prevExpenseTxns = prevWeeklyTxns.filter((t) => t.type === 'expense');

  const prevTotalIncome = prevIncomeTxns.reduce((sum, t) => sum + Number(t.amount), 0);
  const prevTotalExpenses = prevExpenseTxns.reduce((sum, t) => sum + Number(t.amount), 0);
  const prevNetCashFlow = prevTotalIncome - prevTotalExpenses;

  const categorySpending = calculateCategoryBreakdown(weeklyTxns, categories).map((c) => ({
    category: c.category,
    amount: c.amount,
    percentage: c.percentage,
  }));

  const topExpenses = [...expenseTxns]
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, 5)
    .map((t) => ({
      description: t.description || 'No description',
      amount: Number(t.amount),
      category: t.category?.name || 'General',
      date: t.date,
    }));

  const accountList = accounts.map((a) => ({
    name: a.name,
    balance: Number(a.current_balance),
  }));

  return {
    startDate: startDateStr,
    endDate: endDateStr,
    recipientEmail,
    totalIncome,
    totalExpenses,
    netCashFlow,
    savingsRate,
    categorySpending,
    topExpenses,
    accounts: accountList,
    transactionCount: weeklyTxns.length,
    prevWeek: {
      startDate: prevStartDateStr,
      endDate: prevEndDateStr,
      totalIncome: prevTotalIncome,
      totalExpenses: prevTotalExpenses,
      netCashFlow: prevNetCashFlow,
      incomeChange: totalIncome - prevTotalIncome,
      expenseChange: totalExpenses - prevTotalExpenses,
    },
  };
}

/**
 * Generate formatted HTML email template for weekly financial digest.
 */
export function generateWeeklyHtmlEmail(data: WeeklyReportData): string {
  const dateFormatted = `${formatDate(data.startDate, 'MMM dd')} - ${formatDate(data.endDate, 'MMM dd, yyyy')}`;

  const categoryRows = data.categorySpending.length > 0
    ? data.categorySpending
        .map(
          (c) => `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #334155;">${c.category}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; font-weight: 600; text-align: right; color: #0f172a;">${formatCurrency(c.amount)}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; text-align: right; color: #64748b;">${c.percentage.toFixed(1)}%</td>
      </tr>`
        )
        .join('')
    : `<tr><td colspan="3" style="padding: 14px; text-align: center; color: #94a3b8; font-size: 12px;">চলতি সপ্তাহে কোনো ব্যয়ের রেকর্ড নেই</td></tr>`;

  const topExpenseRows = data.topExpenses.length > 0
    ? data.topExpenses
        .map(
          (t) => `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #1e293b; font-weight: 500;">${t.description}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 12px; color: #64748b;">${t.category}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8;">${formatDate(t.date, 'MMM dd')}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; font-weight: 600; text-align: right; color: #e11d48;">-${formatCurrency(t.amount)}</td>
      </tr>`
        )
        .join('')
    : `<tr><td colspan="4" style="padding: 14px; text-align: center; color: #94a3b8; font-size: 12px;">কোনো বড় লেনদেন নেই</td></tr>`;

  const accountRows = data.accounts
    .map(
      (a) => `
      <div style="display: inline-block; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 14px; margin: 4px; font-size: 12px;">
        <span style="color: #64748b;">${a.name}:</span>
        <strong style="color: #0f172a; margin-left: 4px;">${formatCurrency(a.balance)}</strong>
      </div>`
    )
    .join('');

  const prevComp = data.prevWeek;
  const incomeTrendColor = prevComp && prevComp.incomeChange >= 0 ? '#059669' : '#e11d48';
  const expenseTrendColor = prevComp && prevComp.expenseChange <= 0 ? '#059669' : '#e11d48';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>সাপ্তাহিক আর্থিক রিপোর্ট - My Money</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px 12px; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); padding: 28px 24px; color: #ffffff;">
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <h1 style="margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">৳ My Money</h1>
        <span style="background: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600;">সাপ্তাহিক ডাইজেস্ট</span>
      </div>
      <p style="margin: 8px 0 0; font-size: 14px; opacity: 0.9;">আপনার সম্পূর্ণ সোমবার-রবিবার সপ্তাহের আর্থিক সারসংক্ষেপ</p>
      <p style="margin: 4px 0 0; font-size: 12px; opacity: 0.8;">তারিখ: ${dateFormatted}</p>
    </div>

    <!-- Main Summary Cards -->
    <div style="padding: 24px 20px 12px;">
      <table style="width: 100%; border-collapse: separate; border-spacing: 8px;">
        <tr>
          <td style="width: 33%; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 14px 10px; text-align: center;">
            <div style="font-size: 11px; color: #059669; font-weight: 600; text-transform: uppercase;">মোট আয়</div>
            <div style="font-size: 17px; font-weight: 700; color: #047857; margin-top: 4px;">+${formatCurrency(data.totalIncome)}</div>
            ${prevComp ? `<div style="font-size: 10px; color: ${incomeTrendColor}; margin-top: 3px;">${prevComp.incomeChange >= 0 ? '▲ +' : '▼ -'}${formatCurrency(Math.abs(prevComp.incomeChange))} vs পূর্বের সপ্তাহ</div>` : ''}
          </td>
          <td style="width: 33%; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 12px; padding: 14px 10px; text-align: center;">
            <div style="font-size: 11px; color: #e11d48; font-weight: 600; text-transform: uppercase;">মোট ব্যয়</div>
            <div style="font-size: 17px; font-weight: 700; color: #be123c; margin-top: 4px;">-${formatCurrency(data.totalExpenses)}</div>
            ${prevComp ? `<div style="font-size: 10px; color: ${expenseTrendColor}; margin-top: 3px;">${prevComp.expenseChange <= 0 ? '▼ -' : '▲ +'}${formatCurrency(Math.abs(prevComp.expenseChange))} vs পূর্বের সপ্তাহ</div>` : ''}
          </td>
          <td style="width: 33%; background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 12px; padding: 14px 10px; text-align: center;">
            <div style="font-size: 11px; color: #0d9488; font-weight: 600; text-transform: uppercase;">নীট ক্যাশফ্লো</div>
            <div style="font-size: 17px; font-weight: 700; color: #0f766e; margin-top: 4px;">${formatCurrency(data.netCashFlow)}</div>
            <div style="font-size: 10px; color: #0d9488; margin-top: 3px;">সঞ্চয় হার: ${data.savingsRate.toFixed(1)}%</div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Category Breakdown Table -->
    <div style="padding: 12px 20px;">
      <h3 style="margin: 0 0 10px; font-size: 14px; font-weight: 700; color: #0f172a;">📊 খাতভিত্তিক খরচের বিবরণী</h3>
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #f1f5f9; border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background: #f8fafc;">
            <th style="padding: 10px 12px; text-align: left; font-size: 11px; color: #64748b; font-weight: 600;">খাত</th>
            <th style="padding: 10px 12px; text-align: right; font-size: 11px; color: #64748b; font-weight: 600;">পরিমাণ</th>
            <th style="padding: 10px 12px; text-align: right; font-size: 11px; color: #64748b; font-weight: 600;">শতাংশ</th>
          </tr>
        </thead>
        <tbody>
          ${categoryRows}
        </tbody>
      </table>
    </div>

    <!-- Major Transactions (Top 5) -->
    <div style="padding: 12px 20px;">
      <h3 style="margin: 0 0 10px; font-size: 14px; font-weight: 700; color: #0f172a;">🔝 প্রধান ব্যয়সমূহ (Major Transactions)</h3>
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #f1f5f9; border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background: #f8fafc;">
            <th style="padding: 10px 12px; text-align: left; font-size: 11px; color: #64748b; font-weight: 600;">বিবরণ</th>
            <th style="padding: 10px 12px; text-align: left; font-size: 11px; color: #64748b; font-weight: 600;">খাত</th>
            <th style="padding: 10px 12px; text-align: left; font-size: 11px; color: #64748b; font-weight: 600;">তারিখ</th>
            <th style="padding: 10px 12px; text-align: right; font-size: 11px; color: #64748b; font-weight: 600;">পরিমাণ</th>
          </tr>
        </thead>
        <tbody>
          ${topExpenseRows}
        </tbody>
      </table>
    </div>

    <!-- Current Account Balances -->
    <div style="padding: 12px 20px 20px;">
      <h3 style="margin: 0 0 10px; font-size: 14px; font-weight: 700; color: #0f172a;">💳 বর্তমান অ্যাকাউন্ট ও ওয়ালেট ব্যালেন্স</h3>
      <div>
        ${accountRows}
      </div>
    </div>

    <!-- Footer -->
    <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 20px; text-align: center; font-size: 12px; color: #64748b;">
      <p style="margin: 0;">এই রিপোর্টটি প্রতি সোমবার সকাল ৯:০০ টায় স্বয়ংক্রিয়ভাবে <strong>${data.recipientEmail}</strong>-এ পাঠানো হয়।</p>
      <p style="margin: 6px 0 0; font-size: 11px; color: #94a3b8;">My Money — Personal Finance Tracker & Smart Money Manager</p>
    </div>

  </div>
</body>
</html>`;
}

/**
 * Generate plain text version of the weekly summary (useful for mailto / plain emails).
 */
export function generateWeeklyPlainText(data: WeeklyReportData): string {
  const dateFormatted = `${data.startDate} to ${data.endDate}`;

  let breakdownText = '';
  if (data.categorySpending.length > 0) {
    breakdownText = data.categorySpending
      .map((c) => `- ${c.category}: ${formatCurrency(c.amount)} (${c.percentage.toFixed(1)}%)`)
      .join('\n');
  } else {
    breakdownText = '- কোনো খরচের রেকর্ড নেই';
  }

  let accountsText = data.accounts
    .map((a) => `- ${a.name}: ${formatCurrency(a.balance)}`)
    .join('\n');

  return `৳ My Money — সাপ্তাহিক আর্থিক রিপোর্ট (${dateFormatted})
প্রাপক: ${data.recipientEmail}

=============================
আর্থিক সারসংক্ষেপ:
=============================
- মোট আয়: +${formatCurrency(data.totalIncome)}
- মোট ব্যয়: -${formatCurrency(data.totalExpenses)}
- নীট ব্যালেন্স: ${formatCurrency(data.netCashFlow)}
- সঞ্চয় হার: ${data.savingsRate.toFixed(1)}%
- মোট লেনদেন: ${data.transactionCount}টি

=============================
খাতভিত্তিক খরচ:
=============================
${breakdownText}

=============================
বর্তমান ওয়ালেট ব্যালেন্স:
=============================
${accountsText}

-----------------------------
My Money — Personal Finance Tracker
`;
}
