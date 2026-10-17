import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import toast from 'react-hot-toast';

// ─── Types ──────────────────────────────────────────────────────────────────

export type BuiltInTheme =
  | 'classic'
  | 'one-ui-light'
  | 'one-ui-amoled'
  | 'ocean-blue'
  | 'pastel-premium'
  | 'minimal-mono'
  | 'ios-glass';

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
    id: 'classic',
    nameEn: 'Classic Original',
    nameBn: 'ক্লাসিক অরিজিনাল',
    descriptionEn: 'The original clean teal & slate aesthetic with classic balance.',
    descriptionBn: 'আসল টিল ও স্লেট ডিজাইন—পূর্বে যা ছিল তা সম্পূর্ণ সংরক্ষিত।',
    badge: 'Theme 1 • Original',
    accentColor: '#14b8a6',
    surfaceColor: '#ffffff',
    isDarkDefault: false,
  },
  {
    id: 'one-ui-light',
    nameEn: 'Samsung One UI Light',
    nameBn: 'স্যামসাং ওয়ান ইউআই লাইট',
    descriptionEn: 'Crisp white surfaces, Samsung One UI signature blue, and rounded squircle cards.',
    descriptionBn: 'সাদা ও হালকা ধূসর সারফেস, স্যামসাংয়ের স্বাক্ষর ব্লু এবং রাউন্ডেড কার্ড।',
    badge: 'Theme 2 • One UI',
    accentColor: '#0c66e4',
    surfaceColor: '#f7f9fc',
    isDarkDefault: false,
  },
  {
    id: 'one-ui-amoled',
    nameEn: 'Samsung One UI AMOLED Dark',
    nameBn: 'স্যামসাং ওয়ান ইউআই এমোলেড ডার্ক',
    descriptionEn: 'Deep pure-black (#000000) AMOLED surfaces with vivid electric blue accents.',
    descriptionBn: 'সম্পূর্ণ নিখুঁত কালো ব্যাকগ্রাউন্ড—ব্যাটারি সেভিং ও চোখে আরামদায়ক।',
    badge: 'Theme 3 • AMOLED',
    accentColor: '#2680eb',
    surfaceColor: '#101010',
    isDarkDefault: true,
  },
  {
    id: 'ocean-blue',
    nameEn: 'Ocean Blue Premium',
    nameBn: 'ওশান ব্লু প্রিমিয়াম',
    descriptionEn: 'Deep maritime navy, oceanic gradients, and vivid cyan highlights.',
    descriptionBn: 'গভীর সমুদ্রের নেভি ব্লু ও সায়ান হাইলাইটসহ আকর্ষণীয় ফিন্যান্সিয়াল লুক।',
    badge: 'Theme 4 • Ocean',
    accentColor: '#0284c7',
    surfaceColor: '#0f172a',
    isDarkDefault: true,
  },
  {
    id: 'pastel-premium',
    nameEn: 'Pastel Premium',
    nameBn: 'প্যাস্টেল প্রিমিয়াম',
    descriptionEn: 'Soft lavender, mint, and blush accents on soothing clean surfaces.',
    descriptionBn: 'ল্যাভেন্ডার, মিন্ট ও সফট পিংক প্যালেট—শান্ত ও দৃষ্টি-বান্ধব ইন্টারফেস।',
    badge: 'Theme 5 • Pastel',
    accentColor: '#8b5cf6',
    surfaceColor: '#faf8ff',
    isDarkDefault: false,
  },
  {
    id: 'minimal-mono',
    nameEn: 'Minimal Monochrome',
    nameBn: 'মিনিমাল মনোক্রোম',
    descriptionEn: 'Distraction-free high-contrast black, white, and neutral grays.',
    descriptionBn: 'সম্পূর্ণ নিউট্রাল ব্ল্যাক-অ্যান্ড-হোয়াইট—ফোকাস ও প্রডাক্টিভিটির জন্য সেরা।',
    badge: 'Theme 6 • Monochrome',
    accentColor: '#18181b',
    surfaceColor: '#ffffff',
    isDarkDefault: false,
  },
  {
    id: 'ios-glass',
    nameEn: 'Apple iOS 27-Inspired',
    nameBn: 'অ্যাপল আইওএস গ্লাস',
    descriptionEn: 'Frosted glassmorphism, dynamic blur, specular borders, and Cupertino elegance.',
    descriptionBn: 'ফ্রস্টেড গ্লাস, ডায়নামিক ব্লার ও প্রিমিয়াম আইওএস স্টাইলের কাঁচের এফেক্ট।',
    badge: 'Theme 7 • Glass',
    accentColor: '#0071e3',
    surfaceColor: '#ffffff90',
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

  // 2. 7 Built-In Theme Presets
  const [activeTheme, setActiveThemeState] = useState<BuiltInTheme>(() => {
    try {
      const stored = localStorage.getItem(ACTIVE_PRESET_KEY) as BuiltInTheme;
      if (BUILT_IN_THEMES.some((t) => t.id === stored)) return stored;
    } catch {}
    return 'classic';
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
    activeTheme === 'one-ui-amoled' || activeTheme === 'ocean-blue'
      ? 'dark'
      : activeTheme === 'one-ui-light' || activeTheme === 'pastel-premium'
      ? 'light'
      : theme === 'system'
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
    setActiveTheme('classic');
    setTheme('system');
    setDensity('comfortable');
    setFontSize('normal');
    setCardRadius('rounded');
    setIsPrivacyBlurEnabled(false);
    toast.success('ক্লাসিক অরিজিনাল থিম ও অ্যাপিয়ারেন্স পুনরুদ্ধার করা হয়েছে');
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
