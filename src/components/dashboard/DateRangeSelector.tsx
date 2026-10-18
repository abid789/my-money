import { useState, useRef, useEffect } from 'react';
import { useData, type DateRangePreset } from '@/contexts/DataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Check,
  CalendarRange,
  Clock,
  Filter,
} from 'lucide-react';
import clsx from 'clsx';

const MONTH_NAMES_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const MONTH_NAMES_BN = [
  'জানুয়ারি',
  'ফেব্রুয়ারি',
  'মার্চ',
  'এপ্রিল',
  'মে',
  'জুন',
  'জুলাই',
  'আগস্ট',
  'সেপ্টেম্বর',
  'অক্টোবর',
  'নভেম্বর',
  'ডিসেম্বর',
];

export function DateRangeSelector() {
  const {
    selectedMonth,
    selectedYear,
    setSelectedMonth,
    setSelectedYear,
    dateRangePreset,
    customStartDate,
    customEndDate,
    effectiveDateRange,
    setDateRangePreset,
  } = useData();
  const { language } = useLanguage();

  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [tempStart, setTempStart] = useState(customStartDate);
  const [tempEnd, setTempEnd] = useState(customEndDate);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const monthNames = language === 'bn' ? MONTH_NAMES_BN : MONTH_NAMES_EN;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsMonthDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const handleSelectMonth = (monthIndex: number) => {
    setSelectedMonth(monthIndex + 1);
    setIsMonthDropdownOpen(false);
  };

  const presets: Array<{ id: DateRangePreset; labelBn: string; labelEn: string }> = [
    { id: 'this-month', labelBn: 'চলতি মাস', labelEn: 'This Month' },
    { id: 'today', labelBn: 'আজ', labelEn: 'Today' },
    { id: 'yesterday', labelBn: 'গতকাল', labelEn: 'Yesterday' },
    { id: 'this-week', labelBn: 'চলতি সপ্তাহ', labelEn: 'This Week' },
    { id: 'last-week', labelBn: 'গত সপ্তাহ', labelEn: 'Last Week' },
    { id: 'last-month', labelBn: 'গত মাস', labelEn: 'Last Month' },
    { id: 'this-year', labelBn: 'চলতি বছর', labelEn: 'This Year' },
    { id: 'all-time', labelBn: 'সব সময়', labelEn: 'All Time' },
    { id: 'custom', labelBn: 'কাস্টম রেঞ্জ', labelEn: 'Custom Range' },
  ];

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempStart && tempEnd) {
      setDateRangePreset('custom', tempStart, tempEnd);
      setShowCustomModal(false);
    }
  };

  return (
    <div className="w-full space-y-3">
      {/* Preset Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
        <div className="flex items-center gap-1 pr-1 text-gray-400 font-semibold uppercase tracking-wider shrink-0 text-[10px]">
          <Filter className="h-3 w-3" />
          <span>{language === 'bn' ? 'ফিল্টার:' : 'Filter:'}</span>
        </div>

        {presets.map((p) => {
          const isActive = dateRangePreset === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                if (p.id === 'custom') {
                  setShowCustomModal(true);
                } else {
                  setDateRangePreset(p.id);
                }
              }}
              className={clsx(
                'whitespace-nowrap rounded-xl px-3 py-1.5 font-medium transition-all shrink-0 active:scale-95',
                isActive
                  ? 'bg-teal-600 text-white shadow-sm font-semibold dark:bg-teal-500'
                  : 'bg-white/70 text-gray-600 hover:bg-gray-100 dark:bg-gray-800/80 dark:text-gray-300 dark:hover:bg-gray-700/80 border border-gray-200/60 dark:border-gray-700/50'
              )}
            >
              {language === 'bn' ? p.labelBn : p.labelEn}
            </button>
          );
        })}
      </div>

      {/* Dynamic Sub-Controls for Month or Custom Selection */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        {dateRangePreset === 'this-month' && (
          <div
            className="relative inline-flex items-center rounded-xl bg-white p-1 shadow-xs border border-gray-200 dark:bg-gray-800 dark:border-gray-700"
            ref={dropdownRef}
          >
            <button
              type="button"
              onClick={handlePrevMonth}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
              title="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsMonthDropdownOpen(!isMonthDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1 font-semibold text-gray-800 hover:text-teal-600 dark:text-gray-200 dark:hover:text-teal-400"
            >
              <Calendar className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
              <span>
                {monthNames[selectedMonth - 1]} {selectedYear}
              </span>
            </button>

            <button
              type="button"
              onClick={handleNextMonth}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
              title="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            {isMonthDropdownOpen && (
              <div className="absolute left-0 top-full z-50 mt-2 w-64 rounded-2xl border border-gray-100 bg-white p-3 shadow-xl ring-1 ring-black/5 dark:border-gray-700 dark:bg-gray-800 dark:ring-white/10">
                <div className="mb-2 flex items-center justify-between border-b border-gray-100 pb-2 dark:border-gray-700">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {language === 'bn' ? `মাস নির্বাচন (${selectedYear})` : `Select Month (${selectedYear})`}
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setSelectedYear(selectedYear - 1)}
                      className="rounded px-2 py-0.5 text-xs font-medium hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      {selectedYear - 1}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedYear(selectedYear + 1)}
                      className="rounded px-2 py-0.5 text-xs font-medium hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      {selectedYear + 1}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1">
                  {monthNames.map((name, idx) => {
                    const isSelected = selectedMonth === idx + 1;
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => handleSelectMonth(idx)}
                        className={clsx(
                          'flex items-center justify-between rounded-lg px-2 py-1.5 text-xs font-medium transition-colors',
                          isSelected
                            ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300'
                            : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
                        )}
                      >
                        <span className="truncate">{language === 'bn' ? name : name.slice(0, 3)}</span>
                        {isSelected && <Check className="h-3 w-3 shrink-0 text-teal-600 dark:text-teal-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Active Range Summary Pill */}
        <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 bg-gray-100/70 dark:bg-gray-800/70 px-3 py-1.5 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
          <Clock className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
          <span className="font-medium">
            {language === 'bn' ? 'সক্রিয় সময়কাল:' : 'Active Range:'}
          </span>
          <span className="font-semibold text-gray-900 dark:text-white">
            {effectiveDateRange.startDate} {language === 'bn' ? 'থেকে' : 'to'} {effectiveDateRange.endDate}
          </span>
        </div>
      </div>

      {/* Custom Range Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl border border-gray-100 bg-white p-5 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-2 mb-4">
              <CalendarRange className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                {language === 'bn' ? 'কাস্টম তারিখ সীমা নির্বাচন' : 'Custom Date Range'}
              </h3>
            </div>

            <form onSubmit={handleApplyCustom} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'bn' ? 'শুরুর তারিখ (Start Date)' : 'Start Date'}
                </label>
                <input
                  type="date"
                  value={tempStart}
                  onChange={(e) => setTempStart(e.target.value)}
                  required
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-teal-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'bn' ? 'শেষ তারিখ (End Date)' : 'End Date'}
                </label>
                <input
                  type="date"
                  value={tempEnd}
                  onChange={(e) => setTempEnd(e.target.value)}
                  required
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-teal-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  {language === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-teal-600 hover:bg-teal-700 px-4 py-2 text-xs font-bold text-white shadow-md transition-all active:scale-95"
                >
                  {language === 'bn' ? 'প্রয়োগ করুন' : 'Apply Filter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
