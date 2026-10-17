import { useState, useRef } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  Download,
  Upload,
  FileSpreadsheet,
  Database,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import Papa from 'papaparse';
import toast from 'react-hot-toast';

export default function DataPage() {
  const {
    transactions,
    categories,
    accounts,
    budgets,
    savingsGoals,
    recurringTransactions,
    addTransaction,
    refreshData,
    resetToZero,
    loadDemoData,
  } = useData();
  const { user } = useAuth();
  const { language } = useLanguage();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // CSV Import State
  const [csvPreviewRows, setCsvPreviewRows] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Reset Confirmation State
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // 1. Export All Transactions to CSV
  const handleExportCSV = () => {
    if (transactions.length === 0) {
      toast.error(
        language === 'bn'
          ? 'এক্সপোর্ট করার মতো কোনো লেনদেন নেই'
          : 'No transactions available to export'
      );
      return;
    }

    const rows = transactions.map((t) => ({
      Date: t.date,
      Type: t.type,
      Amount_BDT: t.amount,
      Description: t.description,
      Category: t.category?.name || '',
      Account: t.account?.name || '',
      PaymentMethod: t.payment_method || '',
      Merchant: t.merchant || '',
      Notes: t.notes || '',
      Tags: t.tags ? t.tags.join(', ') : '',
    }));

    const csv = Papa.unparse(rows);
    downloadFile(
      csv,
      `My_Money_Transactions_${new Date().toISOString().slice(0, 10)}.csv`,
      'text/csv'
    );
    toast.success(
      language === 'bn' ? 'সকল লেনদেনের CSV ডাউনলোড সম্পন্ন' : 'Transactions CSV exported'
    );
  };

  // 2. Export Complete JSON Backup
  const handleExportJSON = () => {
    const backupData = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      user_id: user?.id,
      currency: 'BDT',
      accounts,
      categories,
      transactions,
      budgets,
      savingsGoals,
      recurringTransactions,
    };

    const json = JSON.stringify(backupData, null, 2);
    downloadFile(
      json,
      `My_Money_Backup_${new Date().toISOString().slice(0, 10)}.json`,
      'application/json'
    );
    toast.success(
      language === 'bn' ? 'সম্পূর্ণ JSON ব্যাকআপ ডাউনলোড হয়েছে' : 'Complete JSON backup downloaded'
    );
  };

  // 3. Download CSV Template
  const handleDownloadTemplate = () => {
    const sample = [
      {
        Date: '2026-10-17',
        Type: 'expense',
        Amount: '1200.00',
        Description: 'Weekly grocery shopping at Shwapno',
        Category: 'Groceries and Food',
        Account: accounts[0]?.name || 'Cash',
        PaymentMethod: 'bKash',
        Notes: 'Bought fruits and vegetables',
      },
      {
        Date: '2026-10-16',
        Type: 'income',
        Amount: '50000.00',
        Description: 'Monthly software consultancy fee',
        Category: 'Salary',
        Account: accounts[0]?.name || 'Bank',
        PaymentMethod: 'Bank Transfer',
        Notes: 'Direct bank transfer',
      },
    ];

    const csv = Papa.unparse(sample);
    downloadFile(csv, 'My_Money_Transaction_Template.csv', 'text/csv');
  };

  // 4. Handle CSV File Selection
  const handleCSVSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as any[];
        const errors: string[] = [];
        const validated: any[] = [];

        rows.forEach((row, idx) => {
          const rowNum = idx + 2; // header is row 1
          const amount = parseFloat(row.Amount || row.Amount_BDT);
          const date = row.Date;
          const description = row.Description;
          const type = (row.Type || 'expense').toLowerCase();

          if (!date) {
            errors.push(`Row ${rowNum}: Missing Date`);
            return;
          }
          if (isNaN(amount) || amount <= 0) {
            errors.push(`Row ${rowNum}: Invalid Amount "${row.Amount || row.Amount_BDT}"`);
            return;
          }
          if (!description) {
            errors.push(`Row ${rowNum}: Missing Description`);
            return;
          }

          validated.push({
            date,
            type: ['income', 'expense', 'transfer', 'refund'].includes(type)
              ? type
              : 'expense',
            amount,
            description,
            categoryName: row.Category || 'Other',
            accountName: row.Account || 'Cash',
            paymentMethod: row.PaymentMethod || 'Cash',
            notes: row.Notes || null,
          });
        });

        setCsvPreviewRows(validated);
        setImportErrors(errors);
        setIsImportModalOpen(true);

        if (fileInputRef.current) fileInputRef.current.value = '';
      },
      error: () => {
        toast.error('Failed to parse CSV file. Please verify format.');
      },
    });
  };

  // 5. Commit Validated CSV Import
  const handleCommitImport = async () => {
    if (csvPreviewRows.length === 0) return;
    try {
      setIsImporting(true);
      const defaultAccount = accounts[0] || { id: 'acc-cash', name: 'Cash' };
      let successCount = 0;

      for (const row of csvPreviewRows) {
        const cat = categories.find(
          (c) => c.name.toLowerCase() === (row.categoryName || '').toLowerCase()
        );

        const acc =
          accounts.find(
            (a) => a.name.toLowerCase() === (row.accountName || '').toLowerCase()
          ) || defaultAccount;

        await addTransaction({
          date: row.date,
          type: row.type,
          amount: row.amount,
          description: row.description,
          category_id: cat ? cat.id : null,
          account_id: acc.id,
          payment_method: row.paymentMethod,
          notes: row.notes,
        });
        successCount++;
      }

      await refreshData();
      toast.success(
        language === 'bn'
          ? `${successCount}টি লেনদেন সফলভাবে যুক্ত হয়েছে!`
          : `Successfully imported ${successCount} transactions!`
      );
      setIsImportModalOpen(false);
      setCsvPreviewRows([]);
    } catch {
      toast.error('Encountered an error while importing rows');
    } finally {
      setIsImporting(false);
    }
  };

  // 6. Handle Reset to Zero
  const handleConfirmReset = async () => {
    try {
      setIsResetting(true);
      await resetToZero();
      setResetDialogOpen(false);
    } catch {
      toast.error('রিসেট করতে ব্যর্থ হয়েছে');
    } finally {
      setIsResetting(false);
    }
  };

  const downloadFile = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: `${mime};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
          {language === 'bn' ? 'ডাটা ব্যাকআপ ও রিসেট ব্যবস্থাপনা' : 'Data Portability & Backup'}
        </h1>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          {language === 'bn'
            ? 'আপনার সকল আর্থিক তথ্য আপনার নিয়ন্ত্রণেই থাকে। CSV/JSON ব্যাকআপ নিন অথবা সম্পূর্ণ নতুন ও শূন্য থেকে শুরু করুন।'
            : 'Your records belong to you. Export CSV spreadsheets, full JSON archives, or start completely from scratch.'}
        </p>
      </div>

      {/* START FROM ZERO (FRESH CLEAN SLATE) CARD */}
      <div className="rounded-2xl border-2 border-rose-200 bg-rose-50/70 p-6 shadow-sm dark:border-rose-900/60 dark:bg-rose-950/20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-900/60 dark:text-rose-400">
                <RotateCcw className="h-4 w-4" />
              </div>
              <h2 className="text-base font-bold text-rose-900 dark:text-rose-200">
                {language === 'bn'
                  ? 'একদম শূন্য থেকে শুরু করুন (Start From Zero)'
                  : 'Start Completely From Scratch (Zero Data)'}
              </h2>
            </div>
            <p className="text-xs text-rose-700 dark:text-rose-300 sm:max-w-xl">
              {language === 'bn'
                ? 'পূর্বের সকল ডেমো ও পরীক্ষামূলক লেনদেন মুছে ফেলতে চান? এটি চাপলে সকল লেনদেন মুছে যাবে, অ্যাকাউন্ট ব্যালেন্স শূন্য (৳০) হয়ে যাবে এবং আপনি আপনার নিজের প্রকৃত হিসাব একদম শুরু থেকে লিখতে পারবেন।'
                : 'Want to clear all past demo/test data? This will clear all transactions, reset accounts to ৳0, and give you a completely clean ledger to start recording your real finances.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="danger"
              size="sm"
              onClick={() => setResetDialogOpen(true)}
              leftIcon={<RotateCcw className="h-4 w-4" />}
            >
              {language === 'bn' ? 'সব মুছে শূন্য করুন' : 'Reset All to ৳0'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={loadDemoData}
              leftIcon={<Sparkles className="h-4 w-4 text-amber-500" />}
            >
              {language === 'bn' ? 'নমুনা ডেটা লোড' : 'Load Demo Data'}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Export Data Card */}
        <div className="flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800/90">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-teal-50 p-2.5 text-teal-600 dark:bg-teal-950/60 dark:text-teal-300">
                <Download className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  {language === 'bn' ? 'হিসাব এক্সপোর্ট করুন' : 'Export Financial Data'}
                </h3>
                <span className="text-xs text-gray-400">CSV spreadsheet & JSON archive</span>
              </div>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-gray-600 dark:text-gray-300">
              {language === 'bn'
                ? 'আপনার সকল লেনদেন Excel সমর্থিত CSV ফাইলে ডাউনলোড করুন, অথবা ক্যাটাগরি, বাজেট ও অ্যাকাউন্টসহ সম্পূর্ণ JSON ব্যাকআপ সংরক্ষণ করুন।'
                : 'Download your complete transaction ledger as an Excel-compatible CSV file, or generate a complete JSON snapshot containing all categories, budgets, and accounts.'}
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-2.5">
            <Button
              variant="outline"
              onClick={handleExportCSV}
              leftIcon={<FileSpreadsheet className="h-4 w-4 text-teal-600" />}
              fullWidth
            >
              {language === 'bn'
                ? `সকল লেনদেন ডাউনলোড (${transactions.length}টি)`
                : `Export All Transactions (${transactions.length})`}
            </Button>

            <Button
              variant="outline"
              onClick={handleExportJSON}
              leftIcon={<Database className="h-4 w-4 text-indigo-600" />}
              fullWidth
            >
              {language === 'bn' ? 'সম্পূর্ণ JSON ব্যাকআপ নিন' : 'Export Full JSON Backup'}
            </Button>
          </div>
        </div>

        {/* Import CSV Card */}
        <div className="flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800/90">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300">
                <Upload className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  {language === 'bn' ? 'CSV স্টেটমেন্ট ইম্পোর্ট' : 'Import CSV Statements'}
                </h3>
                <span className="text-xs text-gray-400">Validated bulk transaction upload</span>
              </div>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-gray-600 dark:text-gray-300">
              {language === 'bn'
                ? 'ব্যাংক বা মোবাইল ওয়ালেটের স্টেটমেন্ট CSV ফাইল আপলোড করে এক ক্লিকে বহু লেনদেন একসাথে রেকর্ড করুন।'
                : 'Bulk import transactions from bank or mobile wallet CSV files. We validate each row and let you preview everything before saving to the database.'}
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-2.5">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleCSVSelect}
              accept=".csv"
              className="hidden"
            />

            <Button
              variant="primary"
              onClick={() => fileInputRef.current?.click()}
              leftIcon={<Upload className="h-4 w-4" />}
              fullWidth
            >
              {language === 'bn' ? 'CSV ফাইল নির্বাচন করুন' : 'Choose CSV File to Import'}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownloadTemplate}
              leftIcon={<Download className="h-3.5 w-3.5" />}
              fullWidth
            >
              {language === 'bn' ? 'নমুনা CSV টেমপ্লেট ডাউনলোড' : 'Download Sample CSV Template'}
            </Button>
          </div>
        </div>
      </div>

      {/* CSV Preview & Confirmation Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title={language === 'bn' ? 'CSV ইম্পোর্ট প্রিভিউ' : 'CSV Import Preview'}
        size="lg"
      >
        <div className="space-y-4">
          {importErrors.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span>Found {importErrors.length} validation issue(s):</span>
              </div>
              <ul className="mt-1 list-disc pl-5 space-y-0.5">
                {importErrors.slice(0, 5).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-xs text-gray-500">
            Previewing {csvPreviewRows.length} valid rows ready to be recorded to your database:
          </p>

          <div className="max-h-64 overflow-y-auto rounded-xl border border-gray-100 text-xs dark:border-gray-800">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="p-2">Date</th>
                  <th className="p-2">Type</th>
                  <th className="p-2">Description</th>
                  <th className="p-2 text-right">Amount (৳)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {csvPreviewRows.map((r, i) => (
                  <tr key={i}>
                    <td className="p-2">{r.date}</td>
                    <td className="p-2 capitalize">{r.type}</td>
                    <td className="p-2 font-medium">{r.description}</td>
                    <td className="p-2 text-right font-bold">
                      ৳{r.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsImportModalOpen(false)}
            >
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button
              variant="primary"
              onClick={handleCommitImport}
              loading={isImporting}
              leftIcon={<CheckCircle2 className="h-4 w-4" />}
            >
              {language === 'bn'
                ? `${csvPreviewRows.length}টি লেনদেন ইম্পোর্ট করুন`
                : `Import ${csvPreviewRows.length} Transactions`}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirm Reset Dialog */}
      <ConfirmDialog
        isOpen={resetDialogOpen}
        onClose={() => setResetDialogOpen(false)}
        onConfirm={handleConfirmReset}
        title={language === 'bn' ? 'সব হিসেব মুছে শূন্য করবেন?' : 'Reset All to ৳0?'}
        message={
          language === 'bn'
            ? 'আপনি কি নিশ্চিত যে পূর্বের সকল ডেমো ও লেনদেন মুছে ফেলতে চান? এর ফলে সকল লেনদেন মুছে যাবে এবং অ্যাকাউন্ট ব্যালেন্স শূন্য (৳০) হয়ে যাবে। এটি পূর্বাবস্থায় ফেরানো যাবে না।'
            : 'Are you sure you want to erase all transactions and reset balances to zero? You will start completely from scratch.'
        }
        confirmText={language === 'bn' ? 'হ্যাঁ, শূন্য থেকে শুরু করব' : 'Yes, Reset to Zero'}
        variant="danger"
        loading={isResetting}
      />
    </div>
  );
}
