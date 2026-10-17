import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import toast from 'react-hot-toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Transaction, Category } from '@/types';

export interface StatementPDFOptions {
  periodLabel: string;
  accountHolder: string;
  totalIncome: number;
  totalExpense: number;
  netCashFlow: number;
  savingsRate: number;
  categorySpending: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  topExpenses: Transaction[];
  transactions: Transaction[];
  categories: Category[];
  language?: 'bn' | 'en';
  filename?: string;
}

export interface TransactionsLedgerPDFOptions {
  title?: string;
  subtitle?: string;
  accountHolder: string;
  transactions: Transaction[];
  categories: Category[];
  totalIncome: number;
  totalExpense: number;
  netCashFlow: number;
  language?: 'bn' | 'en';
  filename?: string;
}

/**
 * Generates an official, bank-statement-style PDF with 100% correct Bengali
 * font glyph shaping, complex conjuncts, vowel signs, and currency symbol (৳).
 */
export async function generateStatementPDF(options: StatementPDFOptions): Promise<void> {
  const isBn = options.language === 'bn';
  const toastId = toast.loading(
    isBn ? 'বাংলা ফন্ট প্রসেস করে PDF তৈরি হচ্ছে...' : 'Generating bank-grade PDF statement...'
  );

  try {
    // 1. Ensure fonts are ready
    if (document.fonts) {
      await document.fonts.ready;
    }

    // 2. Create the offscreen print container
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '794px'; // Standard A4 width in px at 96 DPI
    container.style.padding = '32px';
    container.style.backgroundColor = '#ffffff';
    container.style.color = '#0f172a';
    container.style.fontFamily = "'Noto Sans Bengali', Inter, -apple-system, sans-serif";
    container.style.boxSizing = 'border-box';
    container.style.lineHeight = '1.45';

    // Build the statement HTML
    container.innerHTML = `
      <div style="font-family: 'Noto Sans Bengali', Inter, sans-serif; color: #0f172a; background: #ffffff;">
        <!-- Header Banner -->
        <div style="background-color: #0f172a; color: #ffffff; padding: 18px 24px; border-radius: 8px; margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h1 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">
                ${isBn ? 'আমার টাকা • অফিসিয়াল আর্থিক বিবরণী' : 'MY MONEY • OFFICIAL FINANCIAL STATEMENT'}
              </h1>
              <p style="margin: 4px 0 0 0; font-size: 11px; color: #94a3b8;">
                ${isBn ? 'ব্যক্তিগত আয়-ব্যয় ও ক্যাশ ফ্লো অ্যাকাউন্ট স্টেটমেন্ট' : 'Personal Income & Expense Bank-Grade Statement'}
              </p>
            </div>
            <div style="text-align: right;">
              <span style="display: inline-block; background-color: #14b8a6; color: #ffffff; font-size: 11px; font-weight: bold; padding: 4px 10px; border-radius: 6px;">
                ${options.periodLabel}
              </span>
            </div>
          </div>
        </div>

        <!-- Metadata Grid -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 14px 18px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 24px; font-size: 11px; background: #f8fafc;">
          <div>
            <div style="color: #64748b; margin-bottom: 3px;">${isBn ? 'অ্যাকাউন্ট হোল্ডার (Account Holder)' : 'Account Holder'}:</div>
            <div style="font-weight: 700; font-size: 13px; color: #0f172a;">${options.accountHolder}</div>
            <div style="color: #64748b; margin-top: 8px; margin-bottom: 3px;">${isBn ? 'হিসাবের সময়কাল (Statement Period)' : 'Statement Period'}:</div>
            <div style="font-weight: 600; color: #0f172a;">${options.periodLabel}</div>
          </div>
          <div style="text-align: right;">
            <div style="color: #64748b; margin-bottom: 3px;">${isBn ? 'বিবরণী তৈরির তারিখ (Issue Date)' : 'Generated On'}:</div>
            <div style="font-weight: 600; color: #0f172a;">${new Date().toLocaleString()}</div>
            <div style="color: #64748b; margin-top: 8px; margin-bottom: 3px;">${isBn ? 'মুদ্রা (Currency)' : 'Currency'}:</div>
            <div style="font-weight: 700; color: #0d9488;">${isBn ? 'বাংলাদেশী টাকা (BDT / ৳)' : 'Bangladeshi Taka (BDT / ৳)'}</div>
          </div>
        </div>

        <!-- 1. Financial Summary Block -->
        <div style="margin-bottom: 24px;">
          <h2 style="font-size: 13px; font-weight: 800; color: #0f172a; margin: 0 0 10px 0; border-bottom: 2px solid #0d9488; padding-bottom: 4px; display: flex; justify-content: space-between;">
            <span>${isBn ? '১. সারসংক্ষেপ ও নগদ প্রবাহ (Financial Summary)' : '1. Financial Summary & Cash Flow'}</span>
          </h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #cbd5e1;">
            <thead>
              <tr style="background-color: #0d9488; color: #ffffff;">
                <th style="padding: 8px 12px; text-align: left; font-weight: 700;">${isBn ? 'আর্থিক মেট্রিক (Metric)' : 'Financial Metric'}</th>
                <th style="padding: 8px 12px; text-align: right; font-weight: 700;">${isBn ? 'পরিমাণ (টাকা)' : 'Amount (BDT)'}</th>
                <th style="padding: 8px 12px; text-align: right; font-weight: 700;">${isBn ? 'অনুপাত / অবস্থা' : 'Performance / Ratio'}</th>
              </tr>
            </thead>
            <tbody>
              <tr style="background-color: #ffffff; border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px 12px; font-weight: 600; color: #047857;">${isBn ? 'মোট আয় ও রিফান্ড (Total Inflows)' : 'Total Inflows (Income & Refunds)'}</td>
                <td style="padding: 8px 12px; text-align: right; font-weight: 700; color: #047857;">${formatCurrency(options.totalIncome)}</td>
                <td style="padding: 8px 12px; text-align: right; color: #64748b;">100.0% ${isBn ? 'ইনফ্লো' : 'Inflow'}</td>
              </tr>
              <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px 12px; font-weight: 600; color: #be123c;">${isBn ? 'মোট খরচ (Total Outflows)' : 'Total Outflows (Expenses)'}</td>
                <td style="padding: 8px 12px; text-align: right; font-weight: 700; color: #be123c;">${formatCurrency(options.totalExpense)}</td>
                <td style="padding: 8px 12px; text-align: right; color: #64748b;">
                  ${options.totalIncome > 0 ? ((options.totalExpense / options.totalIncome) * 100).toFixed(1) + '%' : '0.0%'} ${isBn ? 'আয়ের অংশ' : 'of Inflow'}
                </td>
              </tr>
              <tr style="background-color: #ffffff; border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px 12px; font-weight: 700; color: #0f172a;">${isBn ? 'নেট ক্যাশ ফ্লো (উদ্বৃত্ত / ঘাটতি)' : 'Net Cash Flow (Surplus / Deficit)'}</td>
                <td style="padding: 8px 12px; text-align: right; font-weight: 800; color: ${options.netCashFlow >= 0 ? '#047857' : '#be123c'};">
                  ${formatCurrency(options.netCashFlow)}
                </td>
                <td style="padding: 8px 12px; text-align: right; font-weight: 600; color: ${options.netCashFlow >= 0 ? '#047857' : '#be123c'};">
                  ${options.netCashFlow >= 0 ? (isBn ? 'উদ্বৃত্ত (+)' : 'Net Surplus (+)') : (isBn ? 'ঘাটতি (-)' : 'Net Deficit (-)')}
                </td>
              </tr>
              <tr style="background-color: #f8fafc;">
                <td style="padding: 8px 12px; font-weight: 600; color: #4338ca;">${isBn ? 'নেট সঞ্চয় হার (Savings Rate)' : 'Net Savings Rate'}</td>
                <td style="padding: 8px 12px; text-align: right; font-weight: 700; color: #4338ca;">${options.savingsRate.toFixed(1)}%</td>
                <td style="padding: 8px 12px; text-align: right; font-weight: 600; color: ${options.savingsRate >= 20 ? '#047857' : '#d97706'};">
                  ${options.savingsRate >= 20 ? (isBn ? 'সন্তোষজনক (>=২০%)' : 'Healthy (>=20%)') : (isBn ? 'সতর্কতা (<২০%)' : 'Needs Attention')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 2. Expense Category Breakdown -->
        ${
          options.categorySpending.length > 0
            ? `
        <div style="margin-bottom: 24px;">
          <h2 style="font-size: 13px; font-weight: 800; color: #0f172a; margin: 0 0 10px 0; border-bottom: 2px solid #4f46e5; padding-bottom: 4px;">
            ${isBn ? '২. খাত অনুযায়ী ব্যয়ের বিভাজন (Category Breakdown)' : '2. Spending Breakdown by Category'}
          </h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #cbd5e1;">
            <thead>
              <tr style="background-color: #4f46e5; color: #ffffff;">
                <th style="padding: 7px 12px; text-align: left; font-weight: 700;">${isBn ? 'ক্যাটাগরি / খাত' : 'Expense Category'}</th>
                <th style="padding: 7px 12px; text-align: right; font-weight: 700;">${isBn ? 'ব্যয় (টাকা)' : 'Amount (BDT)'}</th>
                <th style="padding: 7px 12px; text-align: right; font-weight: 700;">${isBn ? 'মোট ব্যয়ের অংশ' : 'Percentage'}</th>
              </tr>
            </thead>
            <tbody>
              ${options.categorySpending
                .map(
                  (c, idx) => `
                <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}; border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 6px 12px; font-weight: 600; color: #1e293b;">${c.category}</td>
                  <td style="padding: 6px 12px; text-align: right; font-weight: 700; color: #0f172a;">${formatCurrency(c.amount)}</td>
                  <td style="padding: 6px 12px; text-align: right; color: #64748b; font-weight: 600;">${c.percentage.toFixed(1)}%</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>
        `
            : ''
        }

        <!-- 3. Top Largest Outflows -->
        ${
          options.topExpenses.length > 0
            ? `
        <div style="margin-bottom: 24px;">
          <h2 style="font-size: 13px; font-weight: 800; color: #0f172a; margin: 0 0 10px 0; border-bottom: 2px solid #e11d48; padding-bottom: 4px;">
            ${isBn ? '৩. সময়কালের শীর্ষ বৃহত্তম খরচসমূহ (Largest Outflows)' : '3. Largest Outflows in Period'}
          </h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 10.5px; border: 1px solid #cbd5e1;">
            <thead>
              <tr style="background-color: #e11d48; color: #ffffff;">
                <th style="padding: 7px 10px; width: 30px; text-align: center; font-weight: 700;">#</th>
                <th style="padding: 7px 10px; text-align: left; font-weight: 700;">${isBn ? 'তারিখ' : 'Date'}</th>
                <th style="padding: 7px 10px; text-align: left; font-weight: 700;">${isBn ? 'বিবরণ' : 'Description'}</th>
                <th style="padding: 7px 10px; text-align: left; font-weight: 700;">${isBn ? 'খাত' : 'Category'}</th>
                <th style="padding: 7px 10px; text-align: right; font-weight: 700;">${isBn ? 'পরিমাণ (টাকা)' : 'Amount (BDT)'}</th>
              </tr>
            </thead>
            <tbody>
              ${options.topExpenses
                .map((t, idx) => {
                  const cat = options.categories.find((c) => c.id === t.category_id)?.name || (isBn ? 'সাধারণ' : 'General');
                  return `
                <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}; border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 6px 10px; text-align: center; color: #64748b; font-weight: 600;">${idx + 1}</td>
                  <td style="padding: 6px 10px; color: #475569;">${formatDate(t.date)}</td>
                  <td style="padding: 6px 10px; font-weight: 600; color: #0f172a;">${t.description}</td>
                  <td style="padding: 6px 10px; color: #475569;">${cat}</td>
                  <td style="padding: 6px 10px; text-align: right; font-weight: 700; color: #be123c;">${formatCurrency(Number(t.amount))}</td>
                </tr>
              `;
                })
                .join('')}
            </tbody>
          </table>
        </div>
        `
            : ''
        }

        <!-- 4. Complete Transaction Ledger -->
        ${
          options.transactions.length > 0
            ? `
        <div style="margin-bottom: 24px;">
          <h2 style="font-size: 13px; font-weight: 800; color: #0f172a; margin: 0 0 10px 0; border-bottom: 2px solid #334155; padding-bottom: 4px;">
            ${isBn ? '৪. সম্পূর্ণ লেনদেন খতিয়ান (Complete Transaction Ledger)' : '4. Complete Transaction Ledger'}
          </h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 10px; border: 1px solid #cbd5e1;">
            <thead>
              <tr style="background-color: #1e293b; color: #ffffff;">
                <th style="padding: 6px 8px; text-align: left; font-weight: 700;">${isBn ? 'তারিখ' : 'Date'}</th>
                <th style="padding: 6px 8px; text-align: center; font-weight: 700;">${isBn ? 'ধরন' : 'Type'}</th>
                <th style="padding: 6px 8px; text-align: left; font-weight: 700;">${isBn ? 'বিবরণ' : 'Description'}</th>
                <th style="padding: 6px 8px; text-align: left; font-weight: 700;">${isBn ? 'ক্যাটাগরি' : 'Category'}</th>
                <th style="padding: 6px 8px; text-align: left; font-weight: 700;">${isBn ? 'অ্যাকাউন্ট / মাধ্যম' : 'Account/Method'}</th>
                <th style="padding: 6px 8px; text-align: right; font-weight: 700;">${isBn ? 'পরিমাণ (টাকা)' : 'Amount (BDT)'}</th>
              </tr>
            </thead>
            <tbody>
              ${options.transactions
                .map((t, idx) => {
                  const isInc = t.type === 'income' || t.type === 'refund';
                  const cat = options.categories.find((c) => c.id === t.category_id)?.name || '-';
                  const typeLabel = isBn
                    ? t.type === 'income'
                      ? 'আয়'
                      : t.type === 'expense'
                      ? 'ব্যয়'
                      : t.type === 'transfer'
                      ? 'ট্রান্সফার'
                      : 'রিফান্ড'
                    : t.type.toUpperCase();
                  return `
                <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}; border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 5px 8px; color: #475569; white-space: nowrap;">${formatDate(t.date)}</td>
                  <td style="padding: 5px 8px; text-align: center; font-weight: 700; color: ${isInc ? '#047857' : '#be123c'};">
                    ${typeLabel}
                  </td>
                  <td style="padding: 5px 8px; font-weight: 600; color: #0f172a;">${t.description}</td>
                  <td style="padding: 5px 8px; color: #475569;">${cat}</td>
                  <td style="padding: 5px 8px; color: #475569;">${t.payment_method || '-'}</td>
                  <td style="padding: 5px 8px; text-align: right; font-weight: 700; color: ${isInc ? '#047857' : '#be123c'}; white-space: nowrap;">
                    ${isInc ? '+' : '-'}${formatCurrency(Number(t.amount))}
                  </td>
                </tr>
              `;
                })
                .join('')}
            </tbody>
          </table>
        </div>
        `
            : ''
        }

        <!-- Footer / Certification -->
        <div style="border-top: 1px solid #cbd5e1; padding-top: 14px; margin-top: 30px; display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #64748b;">
          <div>
            ${isBn ? '© আমার টাকা (My Money) ফিন্যান্সিয়াল ট্র্যাকার সিস্টেম দ্বারা স্বয়ংক্রিয়ভাবে প্রস্তুতকৃত।' : '© Computer-generated statement from My Money Personal Finance System.'}
          </div>
          <div style="font-weight: 600; color: #0d9488;">
            ${isBn ? 'গোপনীয় ও যাচাইকৃত ব্যক্তিগত রেকর্ড' : 'Confidential Verified Personal Statement'}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(container);

    // 3. Render container to high-res canvas (scale 2 for Retina sharpness)
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    // Remove offscreen container
    document.body.removeChild(container);

    // 4. Create jsPDF and split into A4 pages cleanly
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = 210; // A4 width mm
    const pdfHeight = 297; // A4 height mm
    const margin = 8;
    const contentWidth = pdfWidth - margin * 2;
    const contentHeight = (canvas.height * contentWidth) / canvas.width;

    const pageContentHeightMm = pdfHeight - margin * 2;
    const totalPages = Math.ceil(contentHeight / pageContentHeightMm);

    // Canvas drawing chunking
    const canvasPageHeightPx = (canvas.width * pageContentHeightMm) / contentWidth;

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) {
        pdf.addPage();
      }

      // Create a page canvas slice
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      const sliceHeight = Math.min(canvasPageHeightPx, canvas.height - page * canvasPageHeightPx);
      pageCanvas.height = sliceHeight;

      const pageCtx = pageCanvas.getContext('2d');
      if (pageCtx) {
        pageCtx.fillStyle = '#ffffff';
        pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        pageCtx.drawImage(
          canvas,
          0,
          page * canvasPageHeightPx,
          canvas.width,
          sliceHeight,
          0,
          0,
          canvas.width,
          sliceHeight
        );
      }

      const sliceHeightMm = (sliceHeight * contentWidth) / canvas.width;
      const imgData = pageCanvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, sliceHeightMm);

      // Page numbering footer
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      pdf.text(
        isBn
          ? `পৃষ্ঠা ${page + 1} / ${totalPages} • অফিসিয়াল আর্থিক খতিয়ান`
          : `Page ${page + 1} of ${totalPages} • Official Financial Ledger`,
        margin,
        pdfHeight - 4
      );
    }

    const defaultFilename = `Financial_Statement_${options.periodLabel.replace(/[\s/]/g, '_')}.pdf`;
    pdf.save(options.filename || defaultFilename);

    toast.dismiss(toastId);
    toast.success(
      isBn
        ? 'বাংলা ফন্টসহ PDF সফলভাবে ডাউনলোড হয়েছে!'
        : 'Bank-grade PDF downloaded successfully!'
    );
  } catch (error: any) {
    console.error('PDF Generation Error:', error);
    toast.dismiss(toastId);
    toast.error(
      isBn ? 'PDF তৈরি করতে ব্যর্থ হয়েছে: ' + (error?.message || '') : 'Failed to generate PDF'
    );
  }
}

/**
 * Quick export for Transactions ledger with full Bengali text shaping support.
 */
export async function generateTransactionsLedgerPDF(
  options: TransactionsLedgerPDFOptions
): Promise<void> {
  const isBn = options.language === 'bn';
  const toastId = toast.loading(
    isBn ? 'লেনদেন তালিকা PDF তৈরি হচ্ছে...' : 'Generating Transactions PDF...'
  );

  try {
    if (document.fonts) {
      await document.fonts.ready;
    }

    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '794px';
    container.style.padding = '32px';
    container.style.backgroundColor = '#ffffff';
    container.style.color = '#0f172a';
    container.style.fontFamily = "'Noto Sans Bengali', Inter, -apple-system, sans-serif";
    container.style.boxSizing = 'border-box';

    container.innerHTML = `
      <div style="font-family: 'Noto Sans Bengali', Inter, sans-serif; color: #0f172a; background: #ffffff;">
        <!-- Header -->
        <div style="border-bottom: 2px solid #0d9488; padding-bottom: 12px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: flex-end;">
          <div>
            <h1 style="margin: 0; font-size: 18px; font-weight: 800; color: #0f172a;">
              ${options.title || (isBn ? 'আমার টাকা — লেনদেন তালিকা ও হিসাব খতিয়ান' : 'My Money — Transaction Ledger')}
            </h1>
            <p style="margin: 3px 0 0 0; font-size: 11px; color: #64748b;">
              ${options.subtitle || (isBn ? 'অ্যাকাউন্ট হোল্ডার: ' + options.accountHolder : 'Account: ' + options.accountHolder)}
            </p>
          </div>
          <div style="text-align: right; font-size: 10px; color: #64748b;">
            <div>${isBn ? 'তারিখ:' : 'Date:'} ${new Date().toLocaleDateString()}</div>
            <div style="font-weight: 700; color: #0d9488;">${isBn ? 'মুদ্রা: BDT (৳)' : 'Currency: BDT (৳)'}</div>
          </div>
        </div>

        <!-- Summary Strip -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; font-size: 11px;">
          <div style="border: 1px solid #d1fae5; background: #ecfdf5; padding: 10px 14px; border-radius: 6px;">
            <div style="color: #065f46; font-size: 10px; font-weight: 600;">${isBn ? 'মোট আয় (Total Income)' : 'Total Inflows'}</div>
            <div style="color: #047857; font-size: 14px; font-weight: 800; margin-top: 2px;">${formatCurrency(options.totalIncome)}</div>
          </div>
          <div style="border: 1px solid #ffe4e6; background: #fff1f2; padding: 10px 14px; border-radius: 6px;">
            <div style="color: #9f1239; font-size: 10px; font-weight: 600;">${isBn ? 'মোট ব্যয় (Total Expenses)' : 'Total Outflows'}</div>
            <div style="color: #be123c; font-size: 14px; font-weight: 800; margin-top: 2px;">${formatCurrency(options.totalExpense)}</div>
          </div>
          <div style="border: 1px solid #e0e7ff; background: #eef2ff; padding: 10px 14px; border-radius: 6px;">
            <div style="color: #3730a3; font-size: 10px; font-weight: 600;">${isBn ? 'নেট ক্যাশ ফ্লো (Net Cash Flow)' : 'Net Cash Flow'}</div>
            <div style="color: #4338ca; font-size: 14px; font-weight: 800; margin-top: 2px;">${formatCurrency(options.netCashFlow)}</div>
          </div>
        </div>

        <!-- Ledger Table -->
        <table style="width: 100%; border-collapse: collapse; font-size: 10px; border: 1px solid #cbd5e1;">
          <thead>
            <tr style="background-color: #0f172a; color: #ffffff;">
              <th style="padding: 7px 8px; text-align: left; font-weight: 700;">${isBn ? 'তারিখ' : 'Date'}</th>
              <th style="padding: 7px 8px; text-align: center; font-weight: 700;">${isBn ? 'ধরন' : 'Type'}</th>
              <th style="padding: 7px 8px; text-align: left; font-weight: 700;">${isBn ? 'বিবরণ' : 'Description'}</th>
              <th style="padding: 7px 8px; text-align: left; font-weight: 700;">${isBn ? 'ক্যাটাগরি' : 'Category'}</th>
              <th style="padding: 7px 8px; text-align: left; font-weight: 700;">${isBn ? 'মাধ্যম' : 'Method'}</th>
              <th style="padding: 7px 8px; text-align: right; font-weight: 700;">${isBn ? 'পরিমাণ (টাকা)' : 'Amount (BDT)'}</th>
            </tr>
          </thead>
          <tbody>
            ${options.transactions
              .map((t, idx) => {
                const isInc = t.type === 'income' || t.type === 'refund';
                const cat = options.categories.find((c) => c.id === t.category_id)?.name || '-';
                const typeLabel = isBn
                  ? t.type === 'income'
                    ? 'আয়'
                    : t.type === 'expense'
                    ? 'ব্যয়'
                    : t.type === 'transfer'
                    ? 'ট্রান্সফার'
                    : 'রিফান্ড'
                  : t.type.toUpperCase();
                return `
              <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}; border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 6px 8px; color: #475569; white-space: nowrap;">${formatDate(t.date)}</td>
                <td style="padding: 6px 8px; text-align: center; font-weight: 700; color: ${isInc ? '#047857' : '#be123c'};">
                  ${typeLabel}
                </td>
                <td style="padding: 6px 8px; font-weight: 600; color: #0f172a;">${t.description}</td>
                <td style="padding: 6px 8px; color: #475569;">${cat}</td>
                <td style="padding: 6px 8px; color: #475569;">${t.payment_method || '-'}</td>
                <td style="padding: 6px 8px; text-align: right; font-weight: 700; color: ${isInc ? '#047857' : '#be123c'}; white-space: nowrap;">
                  ${isInc ? '+' : '-'}${formatCurrency(Number(t.amount))}
                </td>
              </tr>
            `;
              })
              .join('')}
          </tbody>
        </table>

        <!-- Footer -->
        <div style="border-top: 1px solid #cbd5e1; padding-top: 12px; margin-top: 24px; display: flex; justify-content: space-between; font-size: 9px; color: #64748b;">
          <span>${isBn ? 'মোট লেনদেন: ' + options.transactions.length + 'টি' : 'Total records: ' + options.transactions.length}</span>
          <span>${isBn ? 'আমার টাকা (My Money) ফিন্যান্সিয়াল ট্র্যাকার' : 'My Money Personal Finance System'}</span>
        </div>
      </div>
    `;

    document.body.appendChild(container);

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    document.body.removeChild(container);

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = 210;
    const pdfHeight = 297;
    const margin = 8;
    const contentWidth = pdfWidth - margin * 2;
    const contentHeight = (canvas.height * contentWidth) / canvas.width;
    const pageContentHeightMm = pdfHeight - margin * 2;
    const totalPages = Math.ceil(contentHeight / pageContentHeightMm);
    const canvasPageHeightPx = (canvas.width * pageContentHeightMm) / contentWidth;

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) pdf.addPage();

      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      const sliceHeight = Math.min(canvasPageHeightPx, canvas.height - page * canvasPageHeightPx);
      pageCanvas.height = sliceHeight;

      const pageCtx = pageCanvas.getContext('2d');
      if (pageCtx) {
        pageCtx.fillStyle = '#ffffff';
        pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        pageCtx.drawImage(
          canvas,
          0,
          page * canvasPageHeightPx,
          canvas.width,
          sliceHeight,
          0,
          0,
          canvas.width,
          sliceHeight
        );
      }

      const sliceHeightMm = (sliceHeight * contentWidth) / canvas.width;
      const imgData = pageCanvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, sliceHeightMm);

      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      pdf.text(`Page ${page + 1} of ${totalPages}`, margin, pdfHeight - 4);
    }

    const defaultFilename = `Transactions_Ledger_${new Date().toISOString().slice(0, 10)}.pdf`;
    pdf.save(options.filename || defaultFilename);

    toast.dismiss(toastId);
    toast.success(isBn ? 'লেনদেন PDF সফলভাবে ডাউনলোড হয়েছে' : 'Transactions PDF downloaded successfully');
  } catch (err: any) {
    console.error('Ledger PDF Error:', err);
    toast.dismiss(toastId);
    toast.error('Failed to generate PDF');
  }
}
