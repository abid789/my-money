import { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency, formatDate } from '@/lib/utils';
import { calculateCategoryBreakdown } from '@/lib/calculations';
import { MonthSelector } from '@/components/dashboard/MonthSelector';
import { Button } from '@/components/ui/Button';
import {
  FileBarChart,
  Printer,
  Download,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  PiggyBank,
  Mail,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';
import { WeeklyEmailModal } from '@/components/reports/WeeklyEmailModal';

export default function ReportsPage() {
  const { transactions, categories, selectedMonth, selectedYear } = useData();
  const { user, profile } = useAuth();
  const { language } = useLanguage();
  const [reportType, setReportType] = useState<'monthly' | 'yearly'>('monthly');
  const [weeklyModalOpen, setWeeklyModalOpen] = useState(false);

  const displayName = profile?.full_name || user?.user_metadata?.full_name || 'Abid';

  // Filter transactions for report
  const reportTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const d = new Date(t.date);
      if (reportType === 'monthly') {
        return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
      }
      return d.getFullYear() === selectedYear;
    });
  }, [transactions, reportType, selectedMonth, selectedYear]);

  // Totals
  const incomeTransactions = reportTransactions.filter((t) => t.type === 'income' || t.type === 'refund');
  const expenseTransactions = reportTransactions.filter((t) => t.type === 'expense');

  const totalIncome = incomeTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpense = expenseTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
  const netCashFlow = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

  // Category breakdown
  const categorySpending = useMemo(() => {
    return calculateCategoryBreakdown(reportTransactions, categories);
  }, [reportTransactions, categories]);

  // Top 5 largest expenses
  const topExpenses = useMemo(() => {
    return [...expenseTransactions]
      .sort((a, b) => Number(b.amount) - Number(a.amount))
      .slice(0, 5);
  }, [expenseTransactions]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      const periodLabel =
        reportType === 'monthly'
          ? `${selectedMonth}/${selectedYear}`
          : `Annual ${selectedYear}`;

      // ── Statement Header Bar ──
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 210, 24, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.text('MY MONEY - OFFICIAL FINANCIAL STATEMENT', 14, 16);

      // Statement Metadata Info
      doc.setTextColor(51, 65, 85);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Account Holder: ${displayName}`, 14, 32);
      doc.text(`Statement Period: ${periodLabel}`, 14, 37);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 130, 32);
      doc.text(`Currency: Bangladeshi Taka (BDT / Tk.)`, 130, 37);

      // Dividing Line
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.5);
      doc.line(14, 41, 196, 41);

      // ── 1. Financial Summary & Cash Flow ──
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('1. Financial Summary & Cash Flow', 14, 48);

      autoTable(doc, {
        startY: 51,
        head: [['Financial Metric', 'Amount (BDT)', 'Performance / Share']],
        body: [
          ['Total Inflows (Income & Refunds)', `Tk. ${totalIncome.toFixed(2)}`, '100.0% Inflow'],
          [
            'Total Outflows (Expenses)',
            `Tk. ${totalExpense.toFixed(2)}`,
            totalIncome > 0 ? `${((totalExpense / totalIncome) * 100).toFixed(1)}% of Income` : '0.0%',
          ],
          [
            'Net Cash Flow (Surplus / Deficit)',
            `Tk. ${netCashFlow.toFixed(2)}`,
            netCashFlow >= 0 ? 'Net Surplus (+)' : 'Net Deficit (-)',
          ],
          [
            'Net Savings Rate',
            `${savingsRate.toFixed(1)}%`,
            savingsRate >= 20 ? 'Optimal (>=20%)' : 'Caution (<20%)',
          ],
        ],
        theme: 'striped',
        headStyles: { fillColor: [13, 148, 136] }, // teal-600
        styles: { fontSize: 8.5 },
      });

      // ── 2. Expense Category Breakdown ──
      let currentY = (doc as any).lastAutoTable.finalY + 8;
      if (categorySpending.length > 0) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text('2. Spending Breakdown by Category', 14, currentY);

        autoTable(doc, {
          startY: currentY + 3,
          head: [['Category', 'Amount (BDT)', 'Percentage of Total']],
          body: categorySpending.map((c) => [
            c.category,
            `Tk. ${c.amount.toFixed(2)}`,
            `${c.percentage.toFixed(1)}%`,
          ]),
          theme: 'striped',
          headStyles: { fillColor: [79, 70, 229] }, // indigo-600
          styles: { fontSize: 8.5 },
        });
        currentY = (doc as any).lastAutoTable.finalY + 8;
      }

      // ── 3. Largest Outflows in Period ──
      if (topExpenses.length > 0) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text('3. Largest Outflows in Period', 14, currentY);

        autoTable(doc, {
          startY: currentY + 3,
          head: [['#', 'Date', 'Description', 'Category', 'Amount (BDT)']],
          body: topExpenses.map((t, idx) => {
            const cat = categories.find((c) => c.id === t.category_id)?.name || 'General';
            return [
              String(idx + 1),
              t.date,
              t.description,
              cat,
              `Tk. ${Number(t.amount).toFixed(2)}`,
            ];
          }),
          theme: 'striped',
          headStyles: { fillColor: [225, 29, 72] }, // rose-600
          styles: { fontSize: 8.5 },
        });
        currentY = (doc as any).lastAutoTable.finalY + 8;
      }

      // ── 4. Full Detailed Transaction Ledger ──
      if (reportTransactions.length > 0) {
        if (currentY > 235) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text('4. Complete Transaction Ledger', 14, currentY);

        autoTable(doc, {
          startY: currentY + 3,
          head: [['Date', 'Type', 'Description', 'Category', 'Payment Method', 'Amount (BDT)']],
          body: reportTransactions.map((t) => {
            const isInc = t.type === 'income' || t.type === 'refund';
            const cat = categories.find((c) => c.id === t.category_id)?.name || '-';
            const sign = isInc ? '+' : '-';
            return [
              t.date,
              t.type.toUpperCase(),
              t.description,
              cat,
              t.payment_method || '-',
              `${sign}Tk. ${Number(t.amount).toFixed(2)}`,
            ];
          }),
          theme: 'striped',
          headStyles: { fillColor: [30, 41, 59] }, // slate-800
          styles: { fontSize: 8 },
        });
      }

      // Page numbers and footer on each page
      const totalPages = (doc.internal as any).getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(
          `Page ${i} of ${totalPages} • Computer-Generated Bank-Grade Financial Statement`,
          14,
          290
        );
        doc.text('My Money Personal Finance System', 145, 290);
      }

      doc.save(`Financial_Statement_${selectedYear}_${reportType === 'monthly' ? selectedMonth : 'Annual'}.pdf`);
      toast.success('Official Bank-Statement-Style PDF downloaded successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate PDF');
    }
  };

  return (
    <div className="space-y-6">
      {/* Printable Bank Statement Header (Visible only when printed via window.print) */}
      <div className="hidden print:block pb-6 mb-6 border-b border-gray-400">
        <h1 className="text-2xl font-bold tracking-tight text-black">MY MONEY FINANCIAL STATEMENT</h1>
        <div className="mt-2 grid grid-cols-2 text-xs text-gray-800">
          <div>
            <p><strong>Account Holder:</strong> {displayName}</p>
            <p><strong>Statement Period:</strong> {reportType === 'monthly' ? `${selectedMonth}/${selectedYear}` : `Annual ${selectedYear}`}</p>
          </div>
          <div className="text-right">
            <p><strong>Date Issued:</strong> {new Date().toLocaleString()}</p>
            <p><strong>Currency:</strong> Bangladeshi Taka (BDT / ৳)</p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between no-print">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
            Financial Reports
          </h1>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Comprehensive monthly and annual performance summaries.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
            <button
              onClick={() => setReportType('monthly')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                reportType === 'monthly'
                  ? 'bg-white text-gray-900 shadow-xs dark:bg-gray-700 dark:text-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setReportType('yearly')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                reportType === 'yearly'
                  ? 'bg-white text-gray-900 shadow-xs dark:bg-gray-700 dark:text-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Annual ({selectedYear})
            </button>
          </div>

          {reportType === 'monthly' && <MonthSelector />}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeeklyModalOpen(true)}
            leftIcon={<Mail className="h-4 w-4 text-teal-600 dark:text-teal-400" />}
          >
            সাপ্তাহিক রিপোর্ট ইমেইল
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            leftIcon={<Printer className="h-4 w-4" />}
          >
            Print
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleExportPDF}
            leftIcon={<Download className="h-4 w-4" />}
          >
            Export PDF
          </Button>
        </div>
      </div>

      {/* 7-Day Auto Digest Notification Banner */}
      <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50 to-emerald-50/60 p-4 shadow-xs dark:border-teal-900/50 dark:from-teal-950/30 dark:to-emerald-950/20 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white shadow-xs dark:bg-teal-500">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-900 dark:text-white">
                স্বয়ংক্রিয় সাপ্তাহিক হিসাব সক্রিয় (প্রতি ৭ দিন)
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                <CheckCircle2 className="h-3 w-3" /> abidasset@gmail.com
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-gray-600 dark:text-gray-300">
              আপনার কম্পিউটার বন্ধ থাকলেও GitHub Actions ও Vercel Cron প্রতি রবিবার সকাল ৯:০০ টায় গত ৭ দিনের হিসাব ইমেইলে পাঠিয়ে দেয়।
            </p>
          </div>
        </div>

        <button
          onClick={() => setWeeklyModalOpen(true)}
          className="shrink-0 rounded-lg border border-teal-300 bg-white px-3 py-1.5 text-xs font-semibold text-teal-700 shadow-xs transition-colors hover:bg-teal-50 dark:border-teal-800 dark:bg-gray-800 dark:text-teal-300 dark:hover:bg-gray-700"
        >
          রিপোর্ট প্রিভিউ ও তাৎক্ষণিক প্রেরণ &rarr;
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-800/90">
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="h-4 w-4" /> Total Income
          </div>
          <div className="mt-2 text-xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(totalIncome)}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-800/90">
          <div className="flex items-center gap-2 text-xs font-medium text-rose-600 dark:text-rose-400">
            <TrendingDown className="h-4 w-4" /> Total Expenses
          </div>
          <div className="mt-2 text-xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(totalExpense)}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-800/90">
          <div className="flex items-center gap-2 text-xs font-medium text-teal-600 dark:text-teal-400">
            <ArrowUpDown className="h-4 w-4" /> Net Cash Flow
          </div>
          <div className="mt-2 text-xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(netCashFlow)}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-800/90">
          <div className="flex items-center gap-2 text-xs font-medium text-indigo-600 dark:text-indigo-400">
            <PiggyBank className="h-4 w-4" /> Savings Rate
          </div>
          <div className="mt-2 text-xl font-bold text-gray-900 dark:text-white">
            {savingsRate.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Category Breakdown Table */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800/90">
        <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
          Spending Breakdown by Category
        </h3>

        {categorySpending.length === 0 ? (
          <p className="py-6 text-center text-xs text-gray-400">
            No expenses recorded for this reporting period.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-100 bg-gray-50/70 text-gray-400 uppercase tracking-wider dark:border-gray-800 dark:bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-right">Amount (BDT)</th>
                  <th className="px-4 py-3 text-right">Percentage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {categorySpending.map((item) => (
                  <tr key={item.category}>
                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                      {item.category}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                      {formatCurrency(item.amount)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">
                      {item.percentage.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top 5 Expenses */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800/90">
        <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
          Largest Transactions in Period
        </h3>

        {topExpenses.length === 0 ? (
          <p className="py-6 text-center text-xs text-gray-400">
            No expenses found in this period.
          </p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {topExpenses.map((txn, idx) => (
              <div key={txn.id} className="flex items-center justify-between py-2.5 text-xs">
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 font-bold text-gray-500 dark:bg-gray-700">
                    {idx + 1}
                  </span>
                  <div>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {txn.description}
                    </span>
                    <span className="ml-2 text-gray-400">({formatDate(txn.date)})</span>
                  </div>
                </div>
                <div className="font-bold text-rose-600 dark:text-rose-400">
                  {formatCurrency(Number(txn.amount))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <WeeklyEmailModal
        isOpen={weeklyModalOpen}
        onClose={() => setWeeklyModalOpen(false)}
        defaultEmail="abidasset@gmail.com"
      />
    </div>
  );
}
