import { useState, useRef, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { ChevronLeft, ChevronRight, Calendar, Check } from 'lucide-react';
import clsx from 'clsx';

const MONTH_NAMES = [
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

export function MonthSelector() {
  const { selectedMonth, selectedYear, setSelectedMonth, setSelectedYear } = useData();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePrev = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNext = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const handleSelectMonth = (monthIndex: number) => {
    setSelectedMonth(monthIndex + 1);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-flex items-center rounded-xl bg-white p-1 shadow-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700" ref={dropdownRef}>
      <button
        onClick={handlePrev}
        className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
        title="Previous month"
        aria-label="Previous month"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-gray-800 hover:text-teal-600 dark:text-gray-200 dark:hover:text-teal-400"
      >
        <Calendar className="h-4 w-4 text-teal-600 dark:text-teal-400" />
        <span>
          {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
        </span>
      </button>

      <button
        onClick={handleNext}
        className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
        title="Next month"
        aria-label="Next month"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-2 w-64 rounded-2xl border border-gray-100 bg-white p-3 shadow-xl ring-1 ring-black/5 dark:border-gray-700 dark:bg-gray-800 dark:ring-white/10">
          <div className="mb-2 flex items-center justify-between border-b border-gray-100 pb-2 dark:border-gray-700">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Select Month ({selectedYear})
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setSelectedYear(selectedYear - 1)}
                className="rounded px-2 py-0.5 text-xs font-medium hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {selectedYear - 1}
              </button>
              <button
                onClick={() => setSelectedYear(selectedYear + 1)}
                className="rounded px-2 py-0.5 text-xs font-medium hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {selectedYear + 1}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1">
            {MONTH_NAMES.map((name, idx) => {
              const isSelected = selectedMonth === idx + 1;
              return (
                <button
                  key={name}
                  onClick={() => handleSelectMonth(idx)}
                  className={clsx(
                    'flex items-center justify-between rounded-lg px-2 py-1.5 text-xs font-medium transition-colors',
                    isSelected
                      ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300'
                      : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
                  )}
                >
                  <span>{name.slice(0, 3)}</span>
                  {isSelected && <Check className="h-3 w-3 text-teal-600 dark:text-teal-400" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
