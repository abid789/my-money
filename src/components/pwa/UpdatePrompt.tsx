import { useState } from 'react';
import { usePwaInstall } from '@/lib/pwa';
import { useLanguage } from '@/contexts/LanguageContext';
import { Sparkles, RefreshCw, X } from 'lucide-react';

export function UpdatePrompt() {
  const { isUpdateAvailable, updateApp } = usePwaInstall();
  const { language } = useLanguage();
  const [dismissed, setDismissed] = useState(false);
  const [updating, setUpdating] = useState(false);

  if (!isUpdateAvailable || dismissed) {
    return null;
  }

  const handleUpdate = () => {
    setUpdating(true);
    updateApp();
  };

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-md animate-bounce-subtle sm:bottom-6 sm:right-6 sm:left-auto">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-teal-200 bg-white/95 p-3.5 shadow-xl backdrop-blur-md dark:border-teal-800 dark:bg-gray-900/95">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-white shadow-md shadow-teal-500/20">
            <Sparkles className="h-5 w-5 animate-pulse text-white" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-gray-900 dark:text-white">
              {language === 'bn' ? '🚀 নতুন আপডেট পাওয়া গেছে!' : '🚀 New Update Available!'}
            </p>
            <p className="truncate text-[11px] text-gray-500 dark:text-gray-400">
              {language === 'bn'
                ? 'নতুন ফিচার পেতে এখনই অ্যাপটি রিলোড করুন'
                : 'Refresh now to get the latest features & fixes'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleUpdate}
            disabled={updating}
            className="flex items-center gap-1.5 rounded-xl bg-teal-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-teal-600 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${updating ? 'animate-spin' : ''}`} />
            <span>{language === 'bn' ? 'আপডেট করুন' : 'Update Now'}</span>
          </button>

          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            title="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
