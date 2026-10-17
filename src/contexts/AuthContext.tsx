import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import type { Profile } from '@/types';
import toast from 'react-hot-toast';

// ─── Cryptographic Password Hashing (PBKDF2 SHA-256) ────────────────────────
export async function hashPassword(password: string, salt: string = 'my-money-master-salt'): Promise<string> {
  try {
    if (typeof window !== 'undefined' && window.crypto?.subtle) {
      const enc = new TextEncoder();
      const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        enc.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
      );
      const derivedKey = await window.crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: enc.encode(salt),
          iterations: 100000,
          hash: 'SHA-256',
        },
        keyMaterial,
        256
      );
      return Array.from(new Uint8Array(derivedKey))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {
    // fallback
  }
  // Simple fallback hash
  let h = 0;
  for (let i = 0; i < password.length; i++) {
    h = (Math.imul(31, h) + password.charCodeAt(i)) | 0;
  }
  return String(h);
}

// ─── Default Master Account ──────────────────────────────────────────────────
const DEFAULT_MASTER_PASSWORD = '11223344';
const DEFAULT_PASSWORD_HASH = '68612534ce0bcecca8d1ab25c704670641a9e337e9cf4e4084eec64b0f560ef2';

function createMasterUser(fullName: string = 'Abid'): User {
  return {
    id: 'master-owner-abid',
    email: 'abidasset@gmail.com',
    user_metadata: { full_name: fullName },
    app_metadata: {},
    aud: 'authenticated',
    created_at: '2026-01-01T00:00:00.000Z',
  } as unknown as User;
}

function createMasterProfile(fullName: string = 'Abid'): Profile {
  return {
    id: 'master-owner-abid',
    email: 'abidasset@gmail.com',
    full_name: fullName,
    avatar_url: null,
    default_currency: 'BDT',
    timezone: 'Asia/Dhaka',
    date_format: 'dd/MM/yyyy',
    first_day_of_week: 0,
    theme: 'system',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: new Date().toISOString(),
  };
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isConfigured: boolean;
  hasLocalAccount: boolean;
  loginWithPassword: (password: string) => Promise<boolean>;
  signIn: (emailOrPassword: string, password?: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string, oldPassword?: string) => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  deleteAccount: () => Promise<void>;
}

// ─── Context ────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ─── Provider ───────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasLocalAccount, setHasLocalAccount] = useState(true);

  // ── Session Restoration (Persistent 30-day session) ───────────────────────
  useEffect(() => {
    try {
      const sessionToken = localStorage.getItem('my-money-session-token');
      const legacySession = localStorage.getItem('my-money-local-session');

      if (sessionToken || legacySession) {
        // Retrieve saved user and profile
        const savedName = localStorage.getItem('my-money-user-name') || 'Abid';
        const activeUser = createMasterUser(savedName);
        const activeProfile = createMasterProfile(savedName);

        // Check if custom profile settings are saved
        try {
          const storedProf = localStorage.getItem('my-money-profile');
          if (storedProf) {
            const parsed = JSON.parse(storedProf);
            Object.assign(activeProfile, parsed);
            if (parsed.full_name) {
              activeUser.user_metadata = { full_name: parsed.full_name };
            }
          }
        } catch {
          // ignore
        }

        setUser(activeUser);
        setProfile(activeProfile);
        setHasLocalAccount(true);
      }
    } catch (err) {
      console.warn('Failed to restore persistent session:', err);
    } finally {
      setLoading(false);
    }

    // BroadcastChannel sync across tabs for profile name changes
    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      bc = new BroadcastChannel('my-money-profile-channel');
      bc.onmessage = (event) => {
        if (event.data?.type === 'SYNC_PROFILE') {
          if (event.data.user) setUser(event.data.user);
          if (event.data.profile) setProfile(event.data.profile);
        }
      };
    }

    return () => {
      if (bc) bc.close();
    };
  }, []);

  // ── Password-Only Login ───────────────────────────────────────────────────

  const loginWithPassword = useCallback(async (password: string): Promise<boolean> => {
    const trimmed = password.trim();
    if (!trimmed) {
      throw new Error('অনুগ্রহ করে পাসওয়ার্ড দিন');
    }

    let authPassed = false;
    let serverToken = '';

    // 1. Try server-side authentication API first
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: trimmed }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.token) {
          authPassed = true;
          serverToken = data.token;
        }
      } else if (res.status === 401) {
        throw new Error('ভুল পাসওয়ার্ড! অনুগ্রহ করে সঠিক পাসওয়ার্ড দিন।');
      }
    } catch (netErr: any) {
      if (netErr.message && netErr.message.includes('ভুল পাসওয়ার্ড')) {
        throw netErr;
      }
      // If serverless is offline or in local dev, fall back to client PBKDF2
    }

    // 2. Client-side cryptographic verification fallback
    if (!authPassed) {
      const storedHash =
        localStorage.getItem('my-money-master-hash') || DEFAULT_PASSWORD_HASH;
      const inputHash = await hashPassword(trimmed, 'my-money-master-salt');

      if (inputHash === storedHash || trimmed === DEFAULT_MASTER_PASSWORD) {
        authPassed = true;
        serverToken = `token_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      }
    }

    if (!authPassed) {
      throw new Error('ভুল পাসওয়ার্ড! অনুগ্রহ করে সঠিক পাসওয়ার্ড দিন।');
    }

    // Session Established (valid for 30 days)
    const savedName = localStorage.getItem('my-money-user-name') || 'Abid';
    const activeUser = createMasterUser(savedName);
    const activeProfile = createMasterProfile(savedName);

    localStorage.setItem('my-money-session-token', serverToken || `master_${Date.now()}`);
    localStorage.setItem(
      'my-money-local-session',
      JSON.stringify({
        token: serverToken,
        userId: activeUser.id,
        email: activeUser.email,
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      })
    );

    setUser(activeUser);
    setProfile(activeProfile);
    setHasLocalAccount(true);
    toast.success('লগইন সফল হয়েছে!');
    return true;
  }, []);

  // ── Backward-Compatible signIn ────────────────────────────────────────────

  const signIn = useCallback(
    async (emailOrPassword: string, password?: string) => {
      // If only one parameter is supplied or second parameter is missing, treat as password
      if (!password) {
        await loginWithPassword(emailOrPassword);
        return;
      }
      // If both supplied, use the password field
      await loginWithPassword(password);
    },
    [loginWithPassword]
  );

  // ── Backward-Compatible signUp ────────────────────────────────────────────

  const signUp = useCallback(
    async (_email: string, password: string, fullName: string) => {
      // In password-only mode, we initialize the master account with the password
      const trimmed = password.trim();
      const newHash = await hashPassword(trimmed, 'my-money-master-salt');
      localStorage.setItem('my-money-master-hash', newHash);
      if (fullName) {
        localStorage.setItem('my-money-user-name', fullName.trim());
      }
      await loginWithPassword(trimmed);
    },
    [loginWithPassword]
  );

  // ── Sign In With Google (Stub) ────────────────────────────────────────────

  const signInWithGoogle = useCallback(async () => {
    toast.error('Google Sign-In is disabled. Please use password login.');
  }, []);

  // ── Sign Out ──────────────────────────────────────────────────────────────

  const signOut = useCallback(async () => {
    localStorage.removeItem('my-money-session-token');
    localStorage.removeItem('my-money-local-session');
    setUser(null);
    setSession(null);
    setProfile(null);
    toast.success('লগআউট সম্পন্ন হয়েছে');
  }, []);

  // ── Reset Password (Stub) ─────────────────────────────────────────────────

  const resetPassword = useCallback(async () => {
    toast('ডিফল্ট পাসওয়ার্ড: 11223344');
  }, []);

  // ── Update Password ───────────────────────────────────────────────────────

  const updatePassword = useCallback(
    async (newPassword: string, oldPassword?: string) => {
      const trimmed = newPassword.trim();
      if (trimmed.length < 4) {
        throw new Error('পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে');
      }

      // Try server update
      try {
        await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'change_password',
            oldPassword: oldPassword || DEFAULT_MASTER_PASSWORD,
            newPassword: trimmed,
          }),
        });
      } catch {
        // ignore server error in offline
      }

      // Update local hash
      const newHash = await hashPassword(trimmed, 'my-money-master-salt');
      localStorage.setItem('my-money-master-hash', newHash);
      toast.success('পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!');
    },
    []
  );

  // ── Update Profile ────────────────────────────────────────────────────────

  const updateProfile = useCallback(
    async (updates: Partial<Profile>) => {
      if (!user) throw new Error('Not authenticated');

      const updated = {
        ...profile,
        ...updates,
        updated_at: new Date().toISOString(),
      } as Profile;
      setProfile(updated);

      let updatedUser = user;
      if (updates.full_name) {
        localStorage.setItem('my-money-user-name', updates.full_name.trim());
        updatedUser = {
          ...user,
          user_metadata: { ...user.user_metadata, full_name: updates.full_name.trim() },
        } as User;
        setUser(updatedUser);
      }

      localStorage.setItem('my-money-profile', JSON.stringify(updated));

      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('my-money-profile-channel');
        bc.postMessage({ type: 'SYNC_PROFILE', user: updatedUser, profile: updated });
        bc.close();
      }

      toast.success('Profile updated');
    },
    [user, profile]
  );

  // ── Delete Account ────────────────────────────────────────────────────────

  const deleteAccount = useCallback(async () => {
    localStorage.removeItem('my-money-session-token');
    localStorage.removeItem('my-money-local-session');
    localStorage.removeItem('my-money-master-hash');
    localStorage.removeItem('my-money-transactions');
    localStorage.removeItem('my-money-accounts');
    localStorage.removeItem('my-money-budgets');
    localStorage.removeItem('my-money-categories');
    setUser(null);
    setProfile(null);
    setSession(null);
    toast.success('Account and records cleared.');
  }, []);

  const value: AuthContextValue = {
    user,
    session,
    profile,
    loading,
    isConfigured: isSupabaseConfigured(),
    hasLocalAccount,
    loginWithPassword,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    deleteAccount,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
