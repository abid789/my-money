import React, { useState, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useData } from '@/contexts/DataContext';
import {
  generateWeeklyReportData,
  generateWeeklyHtmlEmail,
  generateWeeklyPlainText,
} from '@/lib/emailReport';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Mail,
  Send,
  ExternalLink,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Wallet,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface WeeklyEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEmail?: string;
}

export function WeeklyEmailModal({
  isOpen,
  onClose,
  defaultEmail,
}: WeeklyEmailModalProps) {
  const { transactions, categories, accounts } = useData();
  const [recipientEmail, setRecipientEmail] = useState(defaultEmail || 'abidhossain52003@gmail.com');
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'preview'>('overview');

  React.useEffect(() => {
    fetch('/api/test-email')
      .then((r) => r.json())
      .then((cfg) => {
        if (cfg?.configuredRecipient) {
          setRecipientEmail(cfg.configuredRecipient);
        }
      })
      .catch(() => {});
  }, []);

  const reportData = useMemo(() => {
    return generateWeeklyReportData(transactions, categories, accounts, recipientEmail);
  }, [transactions, categories, accounts, recipientEmail]);

  const htmlEmail = useMemo(() => {
    return generateWeeklyHtmlEmail(reportData);
  }, [reportData]);

  const plainTextEmail = useMemo(() => {
    return generateWeeklyPlainText(reportData);
  }, [reportData]);

  const handleSendViaApi = async () => {
    if (!recipientEmail || !recipientEmail.includes('@')) {
      toast.error('দয়া করে সঠিক ইমেইল এড্রেস লিখুন');
      return;
    }

    try {
      setIsSending(true);
      const subject = `৳ [My Money] সাপ্তাহিক আর্থিক রিপোর্ট (${formatDate(reportData.startDate, 'dd MMM')} - ${formatDate(reportData.endDate, 'dd MMM yyyy')})`;

      const res = await fetch('/api/send-weekly-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: recipientEmail,
          subject,
          html: htmlEmail,
          htmlContent: htmlEmail,
        }),
      });

      const result = await res.json().catch(() => ({}));
      if (res.ok && result.success) {
        toast.success(result.message || `রিপোর্ট ${recipientEmail}-এ সফলভাবে পাঠানো হয়েছে!`);
        onClose();
      } else {
        const errorDetail = result.reason || result.message || result.error?.message || 'ইমেইল পাঠাতে সমস্যা হয়েছে';
        toast.error(errorDetail, { duration: 6000 });
      }
    } catch (err: any) {
      toast.error(err?.message || 'সার্ভারে সংযোগ করা যায়নি');
    } finally {
      setIsSending(false);
    }
  };

  const handleOpenInGmail = () => {
    const subject = `৳ [My Money] সাপ্তাহিক আর্থিক হিসাব (${reportData.startDate} to ${reportData.endDate})`;
    const mailtoUrl = `mailto:${recipientEmail}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(plainTextEmail)}`;
    window.open(mailtoUrl, '_blank');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" title="সাপ্তাহিক আর্থিক ডাইজেস্ট (Weekly Digest)">
      <div className="space-y-5">
        {/* Recipient Input & Automation Badge */}
        <div className="rounded-xl border border-teal-100 bg-teal-50/70 p-4 dark:border-teal-900/50 dark:bg-teal-950/30">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-teal-950 dark:text-teal-200">
                প্রাপক ইমেইল (Recipient Email)
              </label>
              <div className="mt-1 flex items-center gap-2">
                <Input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="bg-white text-xs dark:bg-gray-800"
                />
              </div>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-teal-100 px-3 py-1.5 text-[11px] font-semibold text-teal-800 dark:bg-teal-900/60 dark:text-teal-200">
              <ShieldCheck className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              <span>প্রতি ৭ দিন পর পর অটোমেটিক</span>
            </div>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-teal-700 dark:text-teal-300">
            <Clock className="h-3.5 w-3.5" />
            <span>
              নির্ধারিত সময়: <strong>প্রতি রবিবার সকাল ৯:০০ টা (বাংলাদেশ সময়)</strong> — পিসি বন্ধ থাকলেও স্বয়ংক্রিয়ভাবে ক্লাউড থেকে পাঠানো হবে।
            </span>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-gray-100 dark:border-gray-800">
          <button
            onClick={() => setActiveTab('overview')}
            className={`border-b-2 px-4 py-2 text-xs font-semibold transition-colors ${
              activeTab === 'overview'
                ? 'border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            সারসংক্ষেপ (গত ৭ দিন)
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`border-b-2 px-4 py-2 text-xs font-semibold transition-colors ${
              activeTab === 'preview'
                ? 'border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            ইমেইল প্রিভিউ (HTML Template)
          </button>
        </div>

        {activeTab === 'overview' ? (
          <div className="space-y-4">
            {/* Metric Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 text-center dark:border-emerald-900/40 dark:bg-emerald-950/20">
                <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                  <TrendingUp className="h-3 w-3" /> মোট আয়
                </div>
                <div className="mt-1 text-sm font-bold text-emerald-800 dark:text-emerald-200">
                  +{formatCurrency(reportData.totalIncome)}
                </div>
              </div>

              <div className="rounded-xl border border-rose-100 bg-rose-50/70 p-3 text-center dark:border-rose-900/40 dark:bg-rose-950/20">
                <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-rose-700 dark:text-rose-300">
                  <TrendingDown className="h-3 w-3" /> মোট ব্যয়
                </div>
                <div className="mt-1 text-sm font-bold text-rose-800 dark:text-rose-200">
                  -{formatCurrency(reportData.totalExpenses)}
                </div>
              </div>

              <div className="rounded-xl border border-teal-100 bg-teal-50/70 p-3 text-center dark:border-teal-900/40 dark:bg-teal-950/20">
                <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-teal-700 dark:text-teal-300">
                  <ArrowUpDown className="h-3 w-3" /> নীট ব্যালেন্স
                </div>
                <div className="mt-1 text-sm font-bold text-teal-800 dark:text-teal-200">
                  {formatCurrency(reportData.netCashFlow)}
                </div>
              </div>
            </div>

            {/* Category breakdown */}
            <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3.5 dark:border-gray-800 dark:bg-gray-800/40">
              <div className="mb-2 text-xs font-semibold text-gray-900 dark:text-white">
                📊 বিগত ৭ দিনের খাতভিত্তিক খরচ
              </div>
              {reportData.categorySpending.length === 0 ? (
                <div className="py-3 text-center text-xs text-gray-400">
                  গত ৭ দিনে কোনো খরচের রেকর্ড পাওয়া যায়নি
                </div>
              ) : (
                <div className="space-y-1.5">
                  {reportData.categorySpending.slice(0, 5).map((c) => (
                    <div
                      key={c.category}
                      className="flex items-center justify-between text-xs text-gray-700 dark:text-gray-300"
                    >
                      <span>{c.category}</span>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(c.amount)}{' '}
                        <span className="font-normal text-gray-400">
                          ({c.percentage.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Accounts balances */}
            <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3.5 dark:border-gray-800 dark:bg-gray-800/40">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-gray-900 dark:text-white">
                <Wallet className="h-3.5 w-3.5 text-teal-600" />
                <span>বর্তমান ওয়ালেট ও ব্যাংক ব্যালেন্স</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {reportData.accounts.map((a) => (
                  <span
                    key={a.name}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  >
                    <span className="text-gray-500">{a.name}:</span>
                    <strong className="text-teal-600 dark:text-teal-400">
                      {formatCurrency(a.balance)}
                    </strong>
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Preview Tab */
          <div className="max-h-80 overflow-y-auto rounded-xl border border-gray-200 bg-white p-4 text-xs dark:border-gray-700 dark:bg-gray-900">
            <div
              className="prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: htmlEmail }}
            />
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="ghost" size="sm" onClick={onClose}>
            বন্ধ করুন (Close)
          </Button>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenInGmail}
              leftIcon={<ExternalLink className="h-4 w-4" />}
            >
              Gmail-এ ড্রাফট খুলুন
            </Button>

            <Button
              variant="primary"
              size="sm"
              loading={isSending}
              onClick={handleSendViaApi}
              leftIcon={<Send className="h-4 w-4" />}
            >
              এখনই ইমেইল পাঠান
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
