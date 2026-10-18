import { useState, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePwaInstall } from '@/lib/pwa';
import {
  Download,
  Smartphone,
  Laptop,
  Share,
  PlusSquare,
  MoreVertical,
  CheckCircle2,
  Sparkles,
  Zap,
  ShieldCheck,
  Check,
} from 'lucide-react';
import clsx from 'clsx';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InstallAppModal({ isOpen, onClose }: InstallAppModalProps) {
  const { language } = useLanguage();
  const { canInstall, isInstalled, promptInstall } = usePwaInstall();
  const [isInstalling, setIsInstalling] = useState(false);

  // Detect user's current operating system
  const defaultTab = useMemo<'ios' | 'android' | 'desktop'>(() => {
    if (typeof window === 'undefined') return 'android';
    const ua = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) return 'ios';
    if (/android/.test(ua)) return 'android';
    return 'desktop';
  }, []);

  const [activeTab, setActiveTab] = useState<'ios' | 'android' | 'desktop'>(defaultTab);

  const handleInstallClick = async () => {
    setIsInstalling(true);
    try {
      const accepted = await promptInstall();
      if (accepted) {
        onClose();
      }
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="p-1 sm:p-2 space-y-5">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-white shadow-lg shadow-teal-500/25">
            <span className="text-3xl font-black">৳</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center justify-center gap-1.5">
              <span>My Money — অ্যাপ ডাউনলোড</span>
              <Sparkles className="h-4 w-4 text-amber-500" />
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {language === 'bn'
                ? 'মোবাইল ও পিসিতে সরাসরি অ্যাপের মতো ব্যবহার করুন (PWA)'
                : 'Install as a lightweight app on your phone or PC'}
            </p>
          </div>
        </div>

        {/* 1-Click Direct Install Button (If supported by browser) */}
        {canInstall && !isInstalled && (
          <div className="rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50 via-emerald-50 to-teal-50 p-4 text-center dark:border-teal-900/60 dark:from-teal-950/40 dark:via-emerald-950/30 dark:to-teal-950/40 shadow-xs">
            <p className="text-xs font-semibold text-teal-900 dark:text-teal-200 mb-2.5">
              {language === 'bn'
                ? '⚡ আপনার ব্রাউজারে ১-ক্লিকে ইনস্টল করার সুবিধা সক্রিয় আছে!'
                : '⚡ Direct 1-Click installation is ready in your browser!'}
            </p>
            <Button
              type="button"
              variant="primary"
              size="md"
              fullWidth
              loading={isInstalling}
              onClick={handleInstallClick}
              leftIcon={<Download className="h-4 w-4" />}
            >
              {language === 'bn' ? 'এখনই অ্যাপ ইনস্টল করুন' : 'Install App Now'}
            </Button>
          </div>
        )}

        {/* Already Installed Notice */}
        {isInstalled && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>
              {language === 'bn'
                ? 'অ্যাপটি আপনার ডিভাইসে সফলভাবে ইনস্টল করা আছে!'
                : 'App is already installed and running on your device!'}
            </span>
          </div>
        )}

        {/* Device Guide Tabs */}
        <div>
          <div className="flex rounded-xl bg-gray-100 p-1 dark:bg-gray-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('android')}
              className={clsx(
                'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 transition-all',
                activeTab === 'android'
                  ? 'bg-white text-teal-600 shadow-xs dark:bg-gray-700 dark:text-teal-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
              )}
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>Android</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ios')}
              className={clsx(
                'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 transition-all',
                activeTab === 'ios'
                  ? 'bg-white text-teal-600 shadow-xs dark:bg-gray-700 dark:text-teal-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
              )}
            >
              <span>🍎 iPhone / iPad</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('desktop')}
              className={clsx(
                'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 transition-all',
                activeTab === 'desktop'
                  ? 'bg-white text-teal-600 shadow-xs dark:bg-gray-700 dark:text-teal-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
              )}
            >
              <Laptop className="h-3.5 w-3.5" />
              <span>Computer / PC</span>
            </button>
          </div>

          {/* Guide Steps per Tab */}
          <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-gray-800/40 text-xs space-y-3">
            {activeTab === 'android' && (
              <div className="space-y-3">
                <p className="font-bold text-gray-800 dark:text-gray-200">
                  {language === 'bn'
                    ? 'Android ফোনে ইনস্টল করার সহজ নিয়ম (Chrome / Samsung Internet):'
                    : 'How to install on Android (Chrome / Samsung Internet):'}
                </p>
                <div className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 font-bold text-teal-700 dark:bg-teal-950 dark:text-teal-300 text-[11px]">
                    1
                  </span>
                  <div className="text-gray-600 dark:text-gray-300">
                    {language === 'bn' ? (
                      <>
                        ব্রাউজারের উপরে ডানে থাকা <strong>৩-ডট (⋮)</strong> মেনুতে ট্যাপ করুন।
                      </>
                    ) : (
                      <>
                        Tap the <strong>3-dots (⋮)</strong> menu at the top right of your browser.
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 font-bold text-teal-700 dark:bg-teal-950 dark:text-teal-300 text-[11px]">
                    2
                  </span>
                  <div className="text-gray-600 dark:text-gray-300">
                    {language === 'bn' ? (
                      <>
                        মেনু থেকে <strong>"Install app"</strong> বা <strong>"Add to Home screen"</strong> (হোম স্ক্রিনে যোগ করুন) সিলেক্ট করুন।
                      </>
                    ) : (
                      <>
                        Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 font-bold text-teal-700 dark:bg-teal-950 dark:text-teal-300 text-[11px]">
                    3
                  </span>
                  <div className="text-gray-600 dark:text-gray-300">
                    {language === 'bn' ? (
                      <>
                        <strong>"Install"</strong> বাটনে ক্লিক করলেই আপনার ফোনের অ্যাপ ড্রয়ারে মাই মানি অ্যাপ যুক্ত হয়ে যাবে!
                      </>
                    ) : (
                      <>
                        Confirm <strong>"Install"</strong>, and My Money will appear as a native app icon on your phone!
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'ios' && (
              <div className="space-y-3">
                <p className="font-bold text-gray-800 dark:text-gray-200">
                  {language === 'bn'
                    ? 'iPhone বা iPad (Safari)-তে ইনস্টল করার নিয়ম:'
                    : 'How to install on iPhone / iPad (Safari):'}
                </p>
                <div className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 font-bold text-teal-700 dark:bg-teal-950 dark:text-teal-300 text-[11px]">
                    1
                  </span>
                  <div className="text-gray-600 dark:text-gray-300">
                    {language === 'bn' ? (
                      <span className="flex items-center gap-1.5 flex-wrap">
                        Safari ব্রাউজারের নিচে মাঝখানে থাকা <strong>Share (শেয়ার)</strong> বাটনে ট্যাপ করুন:
                        <Share className="inline h-3.5 w-3.5 text-blue-500" />
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 flex-wrap">
                        Tap the <strong>Share</strong> button at the bottom of Safari:
                        <Share className="inline h-3.5 w-3.5 text-blue-500" />
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 font-bold text-teal-700 dark:bg-teal-950 dark:text-teal-300 text-[11px]">
                    2
                  </span>
                  <div className="text-gray-600 dark:text-gray-300">
                    {language === 'bn' ? (
                      <span className="flex items-center gap-1.5 flex-wrap">
                        শেয়ার মেনুটি নিচে স্ক্রোল করে <strong>"Add to Home Screen"</strong> অপশনে চাপ দিন:
                        <PlusSquare className="inline h-3.5 w-3.5 text-teal-600" />
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 flex-wrap">
                        Scroll down and tap <strong>"Add to Home Screen"</strong>:
                        <PlusSquare className="inline h-3.5 w-3.5 text-teal-600" />
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 font-bold text-teal-700 dark:bg-teal-950 dark:text-teal-300 text-[11px]">
                    3
                  </span>
                  <div className="text-gray-600 dark:text-gray-300">
                    {language === 'bn' ? (
                      <>
                        উপরে ডানের <strong>"Add"</strong> বাটনে ক্লিক করুন। সাথে সাথেই অ্যাপটি হোমস্ক্রিনে চলে আসবে!
                      </>
                    ) : (
                      <>
                        Tap <strong>"Add"</strong> in the top-right corner. The app will appear on your Home Screen!
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'desktop' && (
              <div className="space-y-3">
                <p className="font-bold text-gray-800 dark:text-gray-200">
                  {language === 'bn'
                    ? 'কম্পিউটার বা ল্যাপটপে ইনস্টল করার নিয়ম (Chrome / Edge):'
                    : 'How to install on Computer / Laptop (Chrome / Edge):'}
                </p>
                <div className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 font-bold text-teal-700 dark:bg-teal-950 dark:text-teal-300 text-[11px]">
                    1
                  </span>
                  <div className="text-gray-600 dark:text-gray-300">
                    {language === 'bn' ? (
                      <>
                        ব্রাউজারের অ্যাড্রেস বারের (URL bar) ডানে থাকা <strong>Install Icon (⊕ বা কম্পিউটার আইকন)</strong>-এ ক্লিক করুন।
                      </>
                    ) : (
                      <>
                        Look at the right side of the address/URL bar and click the <strong>Install Icon (⊕)</strong>.
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 font-bold text-teal-700 dark:bg-teal-950 dark:text-teal-300 text-[11px]">
                    2
                  </span>
                  <div className="text-gray-600 dark:text-gray-300">
                    {language === 'bn' ? (
                      <>
                        অথবা ব্রাউজার মেনু <strong>(⋮) ➔ "Save and share" ➔ "Install My Money"</strong> সিলেক্ট করুন।
                      </>
                    ) : (
                      <>
                        Or click the 3 dots <strong>(⋮) ➔ "Save and share" ➔ "Install My Money"</strong>.
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 font-bold text-teal-700 dark:bg-teal-950 dark:text-teal-300 text-[11px]">
                    3
                  </span>
                  <div className="text-gray-600 dark:text-gray-300">
                    {language === 'bn' ? (
                      <>
                        <strong>"Install"</strong> বাটনে চাপ দিলেই উইন্ডোজ/ম্যাকে ফুল-স্ক্রিন ডেস্কটপ অ্যাপ তৈরি হবে।
                      </>
                    ) : (
                      <>
                        Click <strong>"Install"</strong> to create a standalone desktop app window with high performance.
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Key Features Pill */}
        <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-semibold text-gray-500 dark:text-gray-400">
          <div className="flex flex-col items-center gap-1 rounded-xl bg-gray-50 p-2 dark:bg-gray-800/60">
            <Zap className="h-4 w-4 text-amber-500" />
            <span>{language === 'bn' ? 'সুপার ফাস্ট' : 'Lightning Fast'}</span>
          </div>
          <div className="flex flex-col items-center gap-1 rounded-xl bg-gray-50 p-2 dark:bg-gray-800/60">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>{language === 'bn' ? '১০০% অফলাইন' : 'Works Offline'}</span>
          </div>
          <div className="flex flex-col items-center gap-1 rounded-xl bg-gray-50 p-2 dark:bg-gray-800/60">
            <Sparkles className="h-4 w-4 text-teal-500" />
            <span>{language === 'bn' ? 'বিজ্ঞাপনমুক্ত' : 'No Ads'}</span>
          </div>
        </div>

        {/* Close Button */}
        <div className="pt-1">
          <Button type="button" variant="secondary" size="sm" fullWidth onClick={onClose}>
            {language === 'bn' ? 'বুঝেছি / বন্ধ করুন' : 'Got it / Close'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
