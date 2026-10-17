import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ── Check if a key is a secret service_role key ─────────────────────────────
export function isServiceRoleKey(key: string): boolean {
  if (!key) return false;
  const trimmed = key.trim();
  if (trimmed.startsWith('sb_secret_')) return true;
  if (trimmed.toLowerCase().includes('secret')) return true;
  try {
    const parts = trimmed.split('.');
    if (parts.length >= 2) {
      const payload = JSON.parse(atob(parts[1]));
      return payload?.role === 'service_role';
    }
  } catch {
    // ignore
  }
  return false;
}

// ── Normalize and validate Supabase URL ───────────────────────────────────────
export function normalizeSupabaseUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  let url = rawUrl.trim();

  // If user pasted dashboard URL: https://supabase.com/dashboard/project/abcdefghijk...
  const dashboardMatch = url.match(/supabase\.com\/dashboard\/project\/([a-zA-Z0-9_-]+)/i);
  if (dashboardMatch && dashboardMatch[1]) {
    return `https://${dashboardMatch[1]}.supabase.co`;
  }

  // If it contains <project-ref>.supabase.co anywhere in the string
  const refMatch = url.match(/([a-zA-Z0-9_-]+)\.supabase\.co/i);
  if (refMatch && refMatch[1]) {
    return `https://${refMatch[1]}.supabase.co`;
  }

  // Prepend https:// if missing
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  // Strip trailing slashes and API subpaths like /rest/v1 or /auth/v1
  url = url.replace(/\/+$/, '');
  url = url.replace(/\/(rest|auth)\/v[0-9]+$/i, '');

  return url;
}

// ── Check if pairing configuration exists in URL or LocalStorage ────────────────
function getStoredCloudConfig(): { url: string; key: string } {
  if (typeof window === 'undefined') return { url: '', key: '' };

  // 1. Check if device pairing token is present in the URL (?sync_config=... or ?pair_sync=...)
  try {
    const params = new URLSearchParams(window.location.search);
    const syncToken = params.get('sync_config');
    if (syncToken) {
      const decoded = JSON.parse(decodeURIComponent(escape(atob(syncToken))));
      if (decoded.url && decoded.key && !isServiceRoleKey(decoded.key)) {
        const cleanUrl = normalizeSupabaseUrl(decoded.url);
        localStorage.setItem('my-money-cloud-url', cleanUrl);
        localStorage.setItem('my-money-cloud-key', decoded.key);
        // Clean URL parameter without reloading
        const cleanPath = window.location.pathname;
        window.history.replaceState({}, document.title, cleanPath);
        return { url: cleanUrl, key: decoded.key };
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
      if (decoded.cloud?.url && decoded.cloud?.key && !isServiceRoleKey(decoded.cloud.key)) {
        const cleanUrl = normalizeSupabaseUrl(decoded.cloud.url);
        localStorage.setItem('my-money-cloud-url', cleanUrl);
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
      const cleanPath = window.location.pathname;
      window.history.replaceState({}, document.title, cleanPath);
      if (decoded.cloud?.url && decoded.cloud?.key && !isServiceRoleKey(decoded.cloud.key)) {
        return { url: normalizeSupabaseUrl(decoded.cloud.url), key: decoded.cloud.key };
      }
    }
  } catch (err) {
    console.warn('Failed to parse sync URL parameter:', err);
  }

  // 2. Check localStorage
  try {
    const savedUrlRaw = localStorage.getItem('my-money-cloud-url');
    const savedKey = localStorage.getItem('my-money-cloud-key');
    if (savedUrlRaw && savedKey) {
      if (isServiceRoleKey(savedKey)) {
        console.warn('Detected forbidden service_role secret key in browser. Removing.');
        localStorage.removeItem('my-money-cloud-key');
        localStorage.removeItem('my-money-cloud-url');
        return { url: '', key: '' };
      }
      const savedUrl = normalizeSupabaseUrl(savedUrlRaw);
      if (savedUrl !== savedUrlRaw) {
        localStorage.setItem('my-money-cloud-url', savedUrl);
      }
      return { url: savedUrl, key: savedKey };
    }
  } catch {
    // ignore
  }

  return { url: '', key: '' };
}

const defaultCloudUrl = 'https://usjdkevnxamztgdyzyxn.supabase.co';
const defaultCloudKey = 'sb_publishable_wqZXq9HO7vszUDNW7MCqDg_PE2Hz-0N';

const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const storedConfig = getStoredCloudConfig();

export const activeSupabaseUrl: string =
  storedConfig.url ||
  (envUrl && envUrl !== 'your-supabase-project-url' ? envUrl : '') ||
  defaultCloudUrl;

export const activeSupabaseAnonKey: string =
  storedConfig.key ||
  (envKey && envKey !== 'your-supabase-anon-key' ? envKey : '') ||
  defaultCloudKey;

export const isSupabaseConfigured = (): boolean => {
  return (
    !!activeSupabaseUrl &&
    !!activeSupabaseAnonKey &&
    activeSupabaseUrl.startsWith('http') &&
    !activeSupabaseUrl.includes('placeholder.supabase.co') &&
    activeSupabaseUrl !== 'your-supabase-project-url' &&
    activeSupabaseAnonKey !== 'your-supabase-anon-key' &&
    !isServiceRoleKey(activeSupabaseAnonKey)
  );
};

// Safe fallback credentials so createClient doesn't crash before credentials exist
const fallbackUrl = 'https://placeholder.supabase.co';
const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy';

function initSupabaseClient(): SupabaseClient {
  const configured = isSupabaseConfigured();
  try {
    return createClient(
      configured ? activeSupabaseUrl : fallbackUrl,
      configured ? activeSupabaseAnonKey : fallbackKey,
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
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err);
    return createClient(fallbackUrl, fallbackKey, {
      auth: {
        persistSession: false,
      },
    });
  }
}

export const supabase: SupabaseClient = initSupabaseClient();

/**
 * Save user-entered cloud database configuration and re-pair devices.
 */
export function saveSupabaseCloudConfig(url: string, key: string) {
  if (!url || !key) throw new Error('URL and Key are required');
  if (isServiceRoleKey(key)) {
    throw new Error(
      "আপনি ভুলবশত 'SECRET_KEY' (বা service_role) দিয়েছেন! ব্রাউজারের জন্য অনুগ্রহ করে 'SUPABASE_PUBLISHABLE_KEY' (বা anon public key) কপি করে দিন।"
    );
  }
  const cleanUrl = normalizeSupabaseUrl(url);
  localStorage.setItem('my-money-cloud-url', cleanUrl);
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
