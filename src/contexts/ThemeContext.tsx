import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import toast from 'react-hot-toast';

// ─── Types ──────────────────────────────────────────────────────────────────

export type BuiltInTheme = 'basic' | 'iphone' | 'one-ui';

export type LayoutDensity = 'compact' | 'comfortable' | 'spacious';
export type FontSize = 'small' | 'normal' | 'large';
export type CardRadius = 'sharp' | 'rounded' | 'extra-rounded';

export interface ThemeMeta {
  id: BuiltInTheme;
  nameEn: string;
  nameBn: string;
  descriptionEn: string;
  descriptionBn: string;
  badge: string;
  accentColor: string;
  surfaceColor: string;
  isDarkDefault?: boolean;
}

export const BUILT_IN_THEMES: ThemeMeta[] = [
  {
    id: 'basic',
    nameEn: 'Basic Theme',
    nameBn: 'বেসিক থিম',
    descriptionEn: 'Clean, lightweight, and responsive layout with classic balance and high speed.',
    descriptionBn: 'পরিচ্ছন্ন, হালকা ও দ্রুততম ইন্টারফেস—স্বাভাবিক ও নির্ভরযোগ্য ডিজাইন।',
    badge: 'Theme 1 • Clean & Fast',
    accentColor: '#14b8a6',
    surfaceColor: '#ffffff',
    isDarkDefault: false,
  },
  {
    id: 'iphone',
    nameEn: 'iPhone Liquid Glass (iOS 27)',
    nameBn: 'আইফোন লিকুইড গ্লাস',
    descriptionEn: 'Apple-inspired translucent liquid glass surfaces, dynamic backdrop blur, specular borders, and refined depth.',
    descriptionBn: 'অ্যাপল-অনুপ্রাণিত লিকুইড গ্লাস, ডায়নামিক ব্লার ও প্রিমিয়াম কাঁচের রিফ্লেকশন।',
    badge: 'Theme 2 • Liquid Glass',
    accentColor: '#0071e3',
    surfaceColor: '#ffffff90',
    isDarkDefault: false,
  },
  {
    id: 'one-ui',
    nameEn: 'Samsung One UI',
    nameBn: 'স্যামসাং ওয়ান ইউআই',
    descriptionEn: 'Samsung signature electric blue, squircle rounded cards, ergonomic spacing, and high contrast.',
    descriptionBn: 'স্যামসাং স্কোয়ার্কল রাউন্ডেড কার্ড, আরামদায়ক বাটন ও পরিষ্কার স্পেসিং।',
    badge: 'Theme 3 • One UI',
    accentColor: '#0c66e4',
    surfaceColor: '#f7f9fc',
    isDarkDefault: false,
  },
];

type BaseTheme = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  // Existing Base Theme (Light / Dark / System)
  theme: BaseTheme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: BaseTheme) => void;
  toggleTheme: () => void;

  // 7 Built-In Themes
  activeTheme: BuiltInTheme;
  setActiveTheme: (theme: BuiltInTheme) => void;

  // Appearance Personalization
  density: LayoutDensity;
  setDensity: (density: LayoutDensity) => void;
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  cardRadius: CardRadius;
  setCardRadius: (radius: CardRadius) => void;

  // Privacy Balance Blur
  isPrivacyBlurEnabled: boolean;
  togglePrivacyBlur: () => void;

  // Quick PIN Privacy Lock
  isPinEnabled: boolean;
  isAppLocked: boolean;
  setupPin: (pin: string) => Promise<boolean>;
  disablePin: (currentPin: string) => Promise<boolean>;
  unlockApp: (pin: string) => Promise<boolean>;
  lockApp: () => void;

  // Reset Appearance
  restoreDefaultAppearance: () => void;
}

// ─── Storage Keys ───────────────────────────────────────────────────────────

const BASE_THEME_KEY = 'my-money-theme';
const ACTIVE_PRESET_KEY = 'my-money-preset-theme';
const DENSITY_KEY = 'my-money-density';
const FONT_SIZE_KEY = 'my-money-font-size';
const CARD_RADIUS_KEY = 'my-money-card-radius';
const PRIVACY_BLUR_KEY = 'my-money-privacy-blur';
const PIN_HASH_KEY = 'my-money-pin-hash';
const PIN_ENABLED_KEY = 'my-money-pin-enabled';

// ─── Helpers ────────────────────────────────────────────────────────────────

async function hashPin(pin: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const enc = new TextEncoder();
    const buf = await window.crypto.subtle.digest('SHA-256', enc.encode(`${pin}_quick_pin_salt_v1`));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  let h = 0;
  for (let i = 0; i < pin.length; i++) {
    h = (Math.imul(31, h) + pin.charCodeAt(i)) | 0;
  }
  return String(h);
}

function normalizeThemePreset(saved: string | null): BuiltInTheme {
  if (saved === 'basic' || saved === 'classic') return 'basic';
  if (saved === 'iphone' || saved === 'ios-glass') return 'iphone';
  if (saved === 'one-ui' || saved === 'one-ui-light' || saved === 'one-ui-amoled') return 'one-ui';
  return 'basic';
}

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

// ─── Context ────────────────────────────────────────────────────────────────

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // 1. Base theme (light/dark/system)
  const [theme, setThemeState] = useState<BaseTheme>(() => {
    try {
      const stored = localStorage.getItem(BASE_THEME_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
    } catch {}
    return 'system';
  });

  // 2. 3 Built-In Theme Presets (Basic, iPhone Liquid Glass, Samsung One UI)
  const [activeTheme, setActiveThemeState] = useState<BuiltInTheme>(() => {
    try {
      const stored = localStorage.getItem(ACTIVE_PRESET_KEY);
      return normalizeThemePreset(stored);
    } catch {}
    return 'basic';
  });

  // 3. Layout Density
  const [density, setDensityState] = useState<LayoutDensity>(() => {
    try {
      const stored = localStorage.getItem(DENSITY_KEY) as LayoutDensity;
      if (stored === 'compact' || stored === 'comfortable' || stored === 'spacious') return stored;
    } catch {}
    return 'comfortable';
  });

  // 4. Font Size
  const [fontSize, setFontSizeState] = useState<FontSize>(() => {
    try {
      const stored = localStorage.getItem(FONT_SIZE_KEY) as FontSize;
      if (stored === 'small' || stored === 'normal' || stored === 'large') return stored;
    } catch {}
    return 'normal';
  });

  // 5. Card Radius
  const [cardRadius, setCardRadiusState] = useState<CardRadius>(() => {
    try {
      const stored = localStorage.getItem(CARD_RADIUS_KEY) as CardRadius;
      if (stored === 'sharp' || stored === 'rounded' || stored === 'extra-rounded') return stored;
    } catch {}
    return 'rounded';
  });

  // 6. Privacy Blur
  const [isPrivacyBlurEnabled, setIsPrivacyBlurEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem(PRIVACY_BLUR_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // 7. Quick PIN Lock
  const [isPinEnabled, setIsPinEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem(PIN_ENABLED_KEY) === 'true' && Boolean(localStorage.getItem(PIN_HASH_KEY));
    } catch {
      return false;
    }
  });
  const [isAppLocked, setIsAppLocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem(PIN_ENABLED_KEY) === 'true' && Boolean(localStorage.getItem(PIN_HASH_KEY));
    } catch {
      return false;
    }
  });

  // Resolved dark/light
  const resolvedTheme: 'light' | 'dark' =
    theme === 'system'
      ? getSystemTheme()
      : theme;

  // ─── Setters with LocalStorage ──────────────────────────────────────────────

  const setTheme = useCallback((newTheme: BaseTheme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(BASE_THEME_KEY, newTheme);
    } catch {}
  }, []);

  const setActiveTheme = useCallback((newPreset: BuiltInTheme) => {
    setActiveThemeState(newPreset);
    try {
      localStorage.setItem(ACTIVE_PRESET_KEY, newPreset);
    } catch {}
  }, []);

  const setDensity = useCallback((newDensity: LayoutDensity) => {
    setDensityState(newDensity);
    try {
      localStorage.setItem(DENSITY_KEY, newDensity);
    } catch {}
  }, []);

  const setFontSize = useCallback((newSize: FontSize) => {
    setFontSizeState(newSize);
    try {
      localStorage.setItem(FONT_SIZE_KEY, newSize);
    } catch {}
  }, []);

  const setCardRadius = useCallback((newRadius: CardRadius) => {
    setCardRadiusState(newRadius);
    try {
      localStorage.setItem(CARD_RADIUS_KEY, newRadius);
    } catch {}
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(BASE_THEME_KEY, next);
      } catch {}
      return next;
    });
  }, []);

  const togglePrivacyBlur = useCallback(() => {
    setIsPrivacyBlurEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(PRIVACY_BLUR_KEY, String(next));
      } catch {}
      return next;
    });
  }, []);

  // ─── Quick PIN Methods ──────────────────────────────────────────────────────

  const setupPin = useCallback(async (pin: string): Promise<boolean> => {
    if (!/^\d{4}$/.test(pin)) {
      toast.error('PIN অবশ্যই ঠিক ৪ সংখ্যার হতে হবে');
      return false;
    }
    const hash = await hashPin(pin);
    try {
      localStorage.setItem(PIN_HASH_KEY, hash);
      localStorage.setItem(PIN_ENABLED_KEY, 'true');
      setIsPinEnabled(true);
      toast.success('Quick PIN লক সফলভাবে চালু করা হয়েছে');
      return true;
    } catch {
      toast.error('PIN সংরক্ষণ করতে সমস্যা হয়েছে');
      return false;
    }
  }, []);

  const disablePin = useCallback(async (currentPin: string): Promise<boolean> => {
    const storedHash = localStorage.getItem(PIN_HASH_KEY);
    const inputHash = await hashPin(currentPin);
    if (storedHash && storedHash !== inputHash) {
      toast.error('বর্তমান PIN সঠিক নয়');
      return false;
    }
    try {
      localStorage.removeItem(PIN_HASH_KEY);
      localStorage.removeItem(PIN_ENABLED_KEY);
      setIsPinEnabled(false);
      setIsAppLocked(false);
      toast.success('Quick PIN লক নিষ্ক্রিয় করা হয়েছে');
      return true;
    } catch {
      return false;
    }
  }, []);

  const unlockApp = useCallback(async (pin: string): Promise<boolean> => {
    const storedHash = localStorage.getItem(PIN_HASH_KEY);
    if (!storedHash) {
      setIsAppLocked(false);
      return true;
    }
    const inputHash = await hashPin(pin);
    if (inputHash === storedHash) {
      setIsAppLocked(false);
      toast.success('আনলক সম্পন্ন হয়েছে');
      return true;
    }
    toast.error('ভুল PIN! পুনরায় চেষ্টা করুন');
    return false;
  }, []);

  const lockApp = useCallback(() => {
    if (isPinEnabled) {
      setIsAppLocked(true);
    }
  }, [isPinEnabled]);

  const restoreDefaultAppearance = useCallback(() => {
    setActiveTheme('basic');
    setTheme('system');
    setDensity('comfortable');
    setFontSize('normal');
    setCardRadius('rounded');
    setIsPrivacyBlurEnabled(false);
    toast.success('বেসিক থিম ও অ্যাপিয়ারেন্স পুনরুদ্ধার করা হয়েছে');
  }, [setActiveTheme, setTheme, setDensity, setFontSize, setCardRadius]);

  // ─── Apply to DOM Root ──────────────────────────────────────────────────────

  useEffect(() => {
    const root = document.documentElement;

    // Apply dark class
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Apply built-in theme attribute
    root.setAttribute('data-theme', activeTheme);

    // Apply density attribute
    root.setAttribute('data-density', density);

    // Apply font-size attribute
    root.setAttribute('data-font-size', fontSize);

    // Apply card-radius attribute
    root.setAttribute('data-card-radius', cardRadius);

    // Apply privacy blur attribute
    root.setAttribute('data-privacy-blur', String(isPrivacyBlurEnabled));
  }, [resolvedTheme, activeTheme, density, fontSize, cardRadius, isPrivacyBlurEnabled]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        setTheme,
        toggleTheme,
        activeTheme,
        setActiveTheme,
        density,
        setDensity,
        fontSize,
        setFontSize,
        cardRadius,
        setCardRadius,
        isPrivacyBlurEnabled,
        togglePrivacyBlur,
        isPinEnabled,
        isAppLocked,
        setupPin,
        disablePin,
        unlockApp,
        lockApp,
        restoreDefaultAppearance,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
