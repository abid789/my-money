import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Plus, X, ArrowUpRight, ArrowDownLeft, ArrowLeftRight } from 'lucide-react';
import clsx from 'clsx';

export function MobileQuickAddFab() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { language } = useLanguage();

  const handleAction = (type: 'income' | 'expense' | 'transfer') => {
    setIsOpen(false);
    navigate(`/add-transaction?type=${type}`);
  };

  return (
    <div className="fixed bottom-20 right-4 z-40 lg:hidden no-print">
      {/* Backdrop when speed dial is open */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Speed dial buttons */}
      <div
        className={clsx(
          'relative z-40 flex flex-col items-end gap-2.5 transition-all duration-300',
          isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        )}
      >
        {/* Income Button */}
        <button
          type="button"
          onClick={() => handleAction('income')}
          className="flex items-center gap-2.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-lg active:scale-95 transition-all"
        >
          <span>{language === 'bn' ? '+ আয় যোগ করুন' : '+ Add Income'}</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-700/60">
            <ArrowDownLeft className="h-4 w-4" />
          </div>
        </button>

        {/* Expense Button */}
        <button
          type="button"
          onClick={() => handleAction('expense')}
          className="flex items-center gap-2.5 rounded-full bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-lg active:scale-95 transition-all"
        >
          <span>{language === 'bn' ? '- ব্যয় যোগ করুন' : '- Add Expense'}</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-700/60">
            <ArrowUpRight className="h-4 w-4" />
          </div>
        </button>

        {/* Transfer Button */}
        <button
          type="button"
          onClick={() => handleAction('transfer')}
          className="flex items-center gap-2.5 rounded-full bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-lg active:scale-95 transition-all"
        >
          <span>{language === 'bn' ? '⇆ মানি ট্রান্সফার' : '⇆ Transfer'}</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-700/60">
            <ArrowLeftRight className="h-4 w-4" />
          </div>
        </button>
      </div>

      {/* Main Trigger Button */}
      <div className="relative z-40 mt-3 flex justify-end">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={clsx(
            'flex h-13 w-13 items-center justify-center rounded-full text-white shadow-xl transition-all duration-300 active:scale-95 focus:outline-none',
            isOpen
              ? 'bg-gray-800 rotate-45 ring-4 ring-gray-700/50'
              : 'bg-teal-600 hover:bg-teal-700 ring-4 ring-teal-500/20'
          )}
          aria-label={isOpen ? 'Close quick menu' : 'Open quick add menu'}
        >
          {isOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
        </button>
      </div>
    </div>
  );
}
