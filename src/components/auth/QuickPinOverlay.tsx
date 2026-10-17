import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Lock, Delete, Shield, LogOut } from 'lucide-react';
import clsx from 'clsx';

export function QuickPinOverlay() {
  const { isPinEnabled, isAppLocked, unlockApp } = useTheme();
  const { signOut } = useAuth();
  const { language } = useLanguage();
  const [pin, setPin] = useState<string>('');
  const [errorShake, setErrorShake] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleDigit = useCallback((digit: string) => {
    setPin((prev) => {
      if (prev.length >= 4) return prev;
      return prev + digit;
    });
  }, []);

  const handleBackspace = useCallback(() => {
    setPin((prev) => prev.slice(0, -1));
  }, []);

  const handleClear = useCallback(() => {
    setPin('');
  }, []);

  // Check pin when it reaches 4 digits
  useEffect(() => {
    if (pin.length === 4) {
      let isMounted = true;
      const verify = async () => {
        setIsVerifying(true);
        const success = await unlockApp(pin);
        if (isMounted) {
          setIsVerifying(false);
          if (!success) {
            setErrorShake(true);
            setTimeout(() => {
              setErrorShake(false);
              setPin('');
            }, 600);
          } else {
            setPin('');
          }
        }
      };
      verify();
      return () => {
        isMounted = false;
      };
    }
  }, [pin, unlockApp]);

  // Keyboard navigation
  useEffect(() => {
    if (!isAppLocked || !isPinEnabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAppLocked, isPinEnabled, handleDigit, handleBackspace, handleClear]);

  if (!isPinEnabled || !isAppLocked) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/85 backdrop-blur-xl p-4 select-none">
      <div
        className={clsx(
          'w-full max-w-sm rounded-3xl border border-gray-800 bg-gray-900/95 p-8 text-center shadow-2xl transition-transform duration-200',
          errorShake && 'animate-shake'
        )}
      >
        {/* Lock Icon */}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-400 ring-1 ring-teal-500/30">
          <Lock className="h-7 w-7" />
        </div>

        <h2 className="mt-4 text-xl font-bold tracking-tight text-white">
          {language === 'bn' ? 'কুইক পিন দিয়ে আনলক করুন' : 'Unlock with Quick PIN'}
        </h2>
        <p className="mt-1 text-xs text-gray-400">
          {language === 'bn'
            ? 'আর্থিক ব্যালেন্স ও তথ্যের নিরাপত্তার জন্য ৪-সংখ্যার পিন দিন'
            : 'Enter your 4-digit PIN to access your financial records'}
        </p>

        {/* 4 Animated PIN Dots */}
        <div className="my-7 flex justify-center gap-4">
          {[0, 1, 2, 3].map((index) => {
            const isFilled = pin.length > index;
            return (
              <div
                key={index}
                className={clsx(
                  'h-4 w-4 rounded-full transition-all duration-200',
                  isFilled
                    ? 'scale-110 bg-teal-400 shadow-md shadow-teal-500/50'
                    : 'bg-gray-700/80 ring-1 ring-gray-600'
                )}
              />
            );
          })}
        </div>

        {/* Numeric Keypad (1-9, Clear, 0, Backspace) */}
        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              disabled={isVerifying}
              onClick={() => handleDigit(digit)}
              className="flex h-14 items-center justify-center rounded-2xl bg-gray-800/80 text-lg font-semibold text-white shadow-xs transition-all active:scale-95 active:bg-gray-700 hover:bg-gray-700/80 focus:outline-none"
            >
              {digit}
            </button>
          ))}

          {/* Clear */}
          <button
            type="button"
            disabled={isVerifying}
            onClick={handleClear}
            className="flex h-14 items-center justify-center rounded-2xl bg-gray-800/40 text-xs font-semibold text-gray-400 transition-all active:scale-95 hover:bg-gray-800 hover:text-white focus:outline-none"
          >
            {language === 'bn' ? 'মুছুন' : 'Clear'}
          </button>

          {/* Zero */}
          <button
            type="button"
            disabled={isVerifying}
            onClick={() => handleDigit('0')}
            className="flex h-14 items-center justify-center rounded-2xl bg-gray-800/80 text-lg font-semibold text-white shadow-xs transition-all active:scale-95 active:bg-gray-700 hover:bg-gray-700/80 focus:outline-none"
          >
            0
          </button>

          {/* Backspace */}
          <button
            type="button"
            disabled={isVerifying}
            onClick={handleBackspace}
            className="flex h-14 items-center justify-center rounded-2xl bg-gray-800/40 text-gray-400 transition-all active:scale-95 hover:bg-gray-800 hover:text-rose-400 focus:outline-none"
          >
            <Delete className="h-5 w-5" />
          </button>
        </div>

        {/* Footer actions */}
        <div className="mt-6 flex items-center justify-between border-t border-gray-800/80 pt-4 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-teal-500" />
            <span>{language === 'bn' ? 'ডিভাইস প্রটেকশন' : 'Device Protection'}</span>
          </div>

          <button
            type="button"
            onClick={() => signOut()}
            className="flex items-center gap-1 text-gray-400 transition-colors hover:text-rose-400"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>{language === 'bn' ? 'মাস্টার লগআউট' : 'Sign Out'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
