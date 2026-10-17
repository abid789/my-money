import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ── Check if pairing configuration exists in URL or LocalStorage ────────────────
function getStoredCloudConfig(): { url: string; key: string } {
  if (typeof window === 'undefined') return { url: '', key: '' };

  // 1. Check if device pairing token is present in the URL (?sync_config=... or ?pair_sync=...)
  try {
    const params = new URLSearchParams(window.location.search);
    const syncToken = params.get('sync_config');
    if (syncToken) {
      const decoded = JSON.parse(decodeURIComponent(escape(atob(syncToken))));
      if (decoded.url && decoded.key) {
        localStorage.setItem('my-money-cloud-url', decoded.url);
        localStorage.setItem('my-money-cloud-key', decoded.key);
        // Clean URL parameter without reloading
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        return { url: decoded.url, key: decoded.key };
      }
    }

    const pairSync = params.get('pair_sync');
    if (pairSync) {
      const decoded = JSON.parse(decodeURIComponent(escape(atob(pairSync))));
      if (decoded.auth) {
        localStorage.setItem('my-money-local-auth', JSON.stringify(decoded.auth));
        const sessionRecord = {
          token: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
          userId: decoded.auth.user.id,
          email: decoded.auth.email,
          expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
        };
        localStorage.setItem('my-money-local-session', JSON.stringify(sessionRecord));
      }
      if (decoded.cloud?.url && decoded.cloud?.key) {
        localStorage.setItem('my-money-cloud-url', decoded.cloud.url);
        localStorage.setItem('my-money-cloud-key', decoded.cloud.key);
      }
      if (decoded.data?.transactions?.length) {
        localStorage.setItem('my-money-transactions', JSON.stringify(decoded.data.transactions));
      }
      if (decoded.data?.accounts?.length) {
        localStorage.setItem('my-money-accounts', JSON.stringify(decoded.data.accounts));
      }
      if (decoded.data?.categories?.length) {
        localStorage.setItem('my-money-categories', JSON.stringify(decoded.data.categories));
      }
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
      if (decoded.cloud?.url && decoded.cloud?.key) {
        return { url: decoded.cloud.url, key: decoded.cloud.key };
      }
    }
  } catch (err) {
    console.warn('Failed to parse sync URL parameter:', err);
  }

  // 2. Check localStorage
  try {
    const savedUrl = localStorage.getItem('my-money-cloud-url');
    const savedKey = localStorage.getItem('my-money-cloud-key');
    if (savedUrl && savedKey) {
      return { url: savedUrl, key: savedKey };
    }
  } catch {
    // ignore
  }

  return { url: '', key: '' };
}

const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const storedConfig = getStoredCloudConfig();

export const activeSupabaseUrl: string =
  envUrl && envUrl !== 'your-supabase-project-url'
    ? envUrl
    : storedConfig.url;

export const activeSupabaseAnonKey: string =
  envKey && envKey !== 'your-supabase-anon-key'
    ? envKey
    : storedConfig.key;

export const isSupabaseConfigured = (): boolean => {
  return (
    !!activeSupabaseUrl &&
    !!activeSupabaseAnonKey &&
    activeSupabaseUrl.startsWith('http') &&
    activeSupabaseUrl !== 'your-supabase-project-url' &&
    activeSupabaseAnonKey !== 'your-supabase-anon-key'
  );
};

// Safe fallback credentials so createClient doesn't crash before credentials exist
const fallbackUrl = 'https://placeholder.supabase.co';
const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy';

export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured() ? activeSupabaseUrl : fallbackUrl,
  isSupabaseConfigured() ? activeSupabaseAnonKey : fallbackKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

/**
 * Save user-entered cloud database configuration and re-pair devices.
 */
export function saveSupabaseCloudConfig(url: string, key: string) {
  if (!url || !key) throw new Error('URL and Key are required');
  localStorage.setItem('my-money-cloud-url', url.trim());
  localStorage.setItem('my-money-cloud-key', key.trim());
  window.location.reload();
}

/**
 * Remove stored cloud credentials and revert to local fallback.
 */
export function clearSupabaseCloudConfig() {
  localStorage.removeItem('my-money-cloud-url');
  localStorage.removeItem('my-money-cloud-key');
  window.location.reload();
}

/**
 * Generate a 1-click pairing URL that can be opened on Computer or Phone
 * to instantly synchronize to the exact same cloud database!
 */
export function getDevicePairingUrl(): string {
  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://my-money-tau.vercel.app';

  if (isSupabaseConfigured()) {
    const payload = JSON.stringify({
      url: activeSupabaseUrl,
      key: activeSupabaseAnonKey,
    });
    const token = btoa(unescape(encodeURIComponent(payload)));
    return `${origin}/?sync_config=${token}`;
  }

  // Local Device Pairing: Encode master account & existing data to pair phone with PC
  try {
    const authRaw = localStorage.getItem('my-money-local-auth');
    const txnsRaw = localStorage.getItem('my-money-transactions');
    const accsRaw = localStorage.getItem('my-money-accounts');
    const catsRaw = localStorage.getItem('my-money-categories');

    if (!authRaw) return '';

    const payload = {
      auth: JSON.parse(authRaw),
      data: {
        transactions: txnsRaw ? JSON.parse(txnsRaw) : [],
        accounts: accsRaw ? JSON.parse(accsRaw) : [],
        categories: catsRaw ? JSON.parse(catsRaw) : [],
      },
    };

    const token = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    return `${origin}/?pair_sync=${token}`;
  } catch {
    return '';
  }
}
