import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'en' | 'bn';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Nav
    'nav.dashboard': 'Dashboard',
    'nav.transactions': 'Transactions',
    'nav.add_transaction': 'Add Transaction',
    'nav.budgets': 'Budgets',
    'nav.categories': 'Categories',
    'nav.accounts': 'Accounts',
    'nav.insights': 'Smart Insights',
    'nav.reports': 'Reports & PDF',
    'nav.savings': 'Savings Goals',
    'nav.calendar': 'Calendar',
    'nav.recurring': 'Recurring',
    'nav.settings': 'Settings',
    'nav.data': 'Data & Backup',

    // Dashboard
    'dash.welcome': 'Welcome back,',
    'dash.tagline': "Here's your real-time financial snapshot",
    'dash.total_income': 'Total Income',
    'dash.total_expenses': 'Total Expenses',
    'dash.net_cashflow': 'Net Cash Flow',
    'dash.available_balance': 'Available Balance',
    'dash.total_savings': 'Total Savings',
    'dash.remaining_budget': 'Remaining Budget',
    'dash.vs_prev_month': 'vs last month',
    'dash.income_vs_expense': 'Income vs Expenses',
    'dash.spending_trend': 'Daily Spending Trend',
    'dash.category_breakdown': 'Expense Breakdown',
    'dash.budget_status': 'Budget Utilization',
    'dash.recent_transactions': 'Recent Transactions',
    'dash.view_all': 'View All',
    'dash.quick_add': 'Quick Add',

    // Transactions
    'txn.income': 'Income',
    'txn.expense': 'Expense',
    'txn.transfer': 'Transfer',
    'txn.refund': 'Refund',
    'txn.amount': 'Amount',
    'txn.date': 'Date',
    'txn.category': 'Category',
    'txn.account': 'Account',
    'txn.to_account': 'Transfer To',
    'txn.description': 'Description',
    'txn.notes': 'Notes',
    'txn.actions': 'Actions',
    'txn.add_new': 'Add Transaction',
    'txn.edit': 'Edit',
    'txn.delete': 'Delete',
    'txn.search_placeholder': 'Search description, merchant, or notes...',
    'txn.filter_all': 'All Types',
    'txn.no_records': 'No transactions found',

    // Buttons & Common
    'btn.save': 'Save',
    'btn.cancel': 'Cancel',
    'btn.confirm': 'Confirm',
    'btn.export_pdf': 'Export PDF',
    'btn.export_csv': 'Export CSV',
    'btn.filter': 'Filter',
    'btn.clear_filter': 'Clear Filters',
    'btn.dark_mode': 'Dark Mode',
    'btn.light_mode': 'Light Mode',

    // Accounts
    'acc.cash': 'Cash in Hand',
    'acc.bank': 'Bank Account',
    'acc.bkash': 'bKash Wallet',
    'acc.nagad': 'Nagad Wallet',
    'acc.rocket': 'Rocket Wallet',
  },
  bn: {
    // Nav
    'nav.dashboard': 'ড্যাশবোর্ড',
    'nav.transactions': 'লেনদেন তালিকা',
    'nav.add_transaction': 'নতুন লেনদেন',
    'nav.budgets': 'বাজেট পরিকল্পনা',
    'nav.categories': 'ক্যাটাগরি',
    'nav.accounts': 'অ্যাকাউন্ট ও ওয়ালেট',
    'nav.insights': 'স্মার্ট ইনসাইটস',
    'nav.reports': 'রিপোর্ট ও PDF',
    'nav.savings': 'সঞ্চয় লক্ষ্য',
    'nav.calendar': 'ক্যালেন্ডার',
    'nav.recurring': 'নিয়মিত খরচ',
    'nav.settings': 'সেটিংস',
    'nav.data': 'ডাটা ব্যাকআপ',

    // Dashboard
    'dash.welcome': 'স্বাগতম,',
    'dash.tagline': 'আপনার বর্তমান আর্থিক হিসাব-নিকাশ ও ব্যালেন্স',
    'dash.total_income': 'মোট আয়',
    'dash.total_expenses': 'মোট খরচ',
    'dash.net_cashflow': 'নীট ক্যাশ ফ্লো',
    'dash.available_balance': 'মোট জমা ব্যালেন্স',
    'dash.total_savings': 'মোট সঞ্চয়',
    'dash.remaining_budget': 'অবশিষ্ট বাজেট',
    'dash.vs_prev_month': 'গত মাসের তুলনায়',
    'dash.income_vs_expense': 'আয় ও খরচের তুলনা',
    'dash.spending_trend': 'দৈনিক খরচের ধারা',
    'dash.category_breakdown': 'খাতভিত্তিক খরচ বণ্টন',
    'dash.budget_status': 'বাজেট ব্যবহার শতাংশ',
    'dash.recent_transactions': 'সাম্প্রতিক লেনদেনসমূহ',
    'dash.view_all': 'সবগুলো দেখুন',
    'dash.quick_add': 'নতুন যোগ করুন',

    // Transactions
    'txn.income': 'আয়',
    'txn.expense': 'খরচ',
    'txn.transfer': 'ট্রান্সফার',
    'txn.refund': 'রিফান্ড',
    'txn.amount': 'পরিমাণ (৳)',
    'txn.date': 'তারিখ',
    'txn.category': 'খাত / ক্যাটাগরি',
    'txn.account': 'অ্যাকাউন্ট',
    'txn.to_account': 'গ্রহীতা অ্যাকাউন্ট',
    'txn.description': 'বিবরণ',
    'txn.notes': 'নোটস',
    'txn.actions': 'অ্যাকশন',
    'txn.add_new': 'লেনদেন যোগ করুন',
    'txn.edit': 'সম্পাদনা',
    'txn.delete': 'মুছে ফেলুন',
    'txn.search_placeholder': 'বিবরণ, মার্চেন্ট অথবা নোটস খুঁজুন...',
    'txn.filter_all': 'সব ধরন',
    'txn.no_records': 'কোনো লেনদেন পাওয়া যায়নি',

    // Buttons & Common
    'btn.save': 'সংরক্ষণ করুন',
    'btn.cancel': 'বাতিল',
    'btn.confirm': 'নিশ্চিত করুন',
    'btn.export_pdf': 'PDF ডাউনলোড',
    'btn.export_csv': 'CSV এক্সপোর্ট',
    'btn.filter': 'ফিল্টার',
    'btn.clear_filter': 'ফিল্টার মুছুন',
    'btn.dark_mode': 'ডার্ক মোড',
    'btn.light_mode': 'লাইট মোড',

    // Accounts
    'acc.cash': 'হাতের ক্যাশ',
    'acc.bank': 'ব্যাংক অ্যাকাউন্ট',
    'acc.bkash': 'বিকাশ (bKash)',
    'acc.nagad': 'নগদ (Nagad)',
    'acc.rocket': 'রকেট (Rocket)',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('my-money-lang');
      return saved === 'bn' || saved === 'en' ? saved : 'bn'; // Default to Bangla as requested
    } catch {
      return 'bn';
    }
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('my-money-lang', lang);
    } catch {
      // ignore
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'bn' ? 'en' : 'bn');
  };

  const t = (key: string): string => {
    return translations[language][key] || translations['en'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
