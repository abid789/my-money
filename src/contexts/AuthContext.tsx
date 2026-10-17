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
async function hashPassword(password: string, salt: string): Promise<string> {
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

function generateSalt(): string {
  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isConfigured: boolean;
  hasLocalAccount: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
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
  const [hasLocalAccount, setHasLocalAccount] = useState(false);

  // ── Fetch Profile from Supabase ───────────────────────────────────────────

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error.message);
        return;
      }

      setProfile(data as Profile);
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  }, []);

  // Check if a local account is saved
  const checkLocalAccountExists = useCallback(() => {
    try {
      const savedAuthRaw = localStorage.getItem('my-money-local-auth');
      return !!savedAuthRaw;
    } catch {
      return false;
    }
  }, []);

  // ── Auth State Listener & Persistent Session Restoration ──────────────────

  useEffect(() => {
    setHasLocalAccount(checkLocalAccountExists());

    // 1. Supabase Cloud Configured
    if (isSupabaseConfigured()) {
      supabase.auth
        .getSession()
        .then(({ data: { session: initialSession } }) => {
          if (initialSession?.user) {
            setSession(initialSession);
            setUser(initialSession.user);
            fetchProfile(initialSession.user.id);
          } else {
            setSession(null);
            setUser(null);
            setProfile(null);
          }
          setLoading(false);
        })
        .catch(() => {
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
        });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
        if (newSession?.user) {
          setSession(newSession);
          setUser(newSession.user);
          await fetchProfile(newSession.user.id);
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      });

      return () => {
        subscription.unsubscribe();
      };
    }

    // 2. Local Mode: Check persistent 30-day session
    try {
      const savedSessionRaw = localStorage.getItem('my-money-local-session');
      const savedAuthRaw = localStorage.getItem('my-money-local-auth');

      if (savedSessionRaw && savedAuthRaw) {
        const localSession = JSON.parse(savedSessionRaw);
        const localAuth = JSON.parse(savedAuthRaw);

        // Verify session validity and expiration
        if (localSession?.expiresAt && localSession.expiresAt > Date.now()) {
          setUser(localAuth.user);
          setProfile(localAuth.profile);
        } else {
          // Session expired: require login
          localStorage.removeItem('my-money-local-session');
          setUser(null);
          setProfile(null);
        }
      } else {
        // No active session: require login
        setUser(null);
        setProfile(null);
      }
    } catch {
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }

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
  }, [fetchProfile, checkLocalAccountExists]);

  // ── Sign Up ───────────────────────────────────────────────────────────────

  const signUp = useCallback(
    async (email: string, password: string, fullName: string) => {
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              data: {
                full_name: fullName.trim(),
              },
            },
          });

          if (error) {
            throw error;
          }

          if (data.session && data.user) {
            setSession(data.session);
            setUser(data.user);
            await fetchProfile(data.user.id);
          }
          toast.success('Account created successfully!');
          return;
        } catch (cloudErr: any) {
          const errMsg = cloudErr?.message || '';
          const isNetworkError =
            errMsg.includes('Failed to fetch') ||
            errMsg.includes('NetworkError') ||
            cloudErr?.name === 'TypeError';

          if (isNetworkError) {
            throw new Error(
              'Failed to fetch: ক্লাউড সার্ভারের সাথে সংযোগ করা সম্ভব হয়নি। আপনার Supabase URL সঠিক কিনা দেখুন অথবা নিচে "লোকাল মোডে ফিরুন" বাটনে চাপ দিন।'
            );
          }
          throw cloudErr;
        }
      }

      // Local Mode: Hash password with PBKDF2 and save credentials
      const salt = generateSalt();
      const passwordHash = await hashPassword(password, salt);

      // Preserve existing user ID if transactions already exist
      let existingUserId = 'personal-user-abid';
      try {
        const oldDemo = localStorage.getItem('my-money-demo-user');
        if (oldDemo) {
          const parsed = JSON.parse(oldDemo);
          if (parsed.user?.id) existingUserId = parsed.user.id;
        }
      } catch {
        // ignore
      }

      const normalizedEmail = email.trim().toLowerCase();
      const newUser = {
        id: existingUserId,
        email: normalizedEmail,
        user_metadata: { full_name: fullName.trim() },
        app_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      } as unknown as User;

      const newProfile: Profile = {
        id: existingUserId,
        email: normalizedEmail,
        full_name: fullName.trim(),
        avatar_url: null,
        default_currency: 'BDT',
        timezone: 'Asia/Dhaka',
        date_format: 'dd/MM/yyyy',
        first_day_of_week: 0,
        theme: 'system',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      localStorage.setItem(
        'my-money-local-auth',
        JSON.stringify({
          email: newUser.email,
          salt,
          passwordHash,
          user: newUser,
          profile: newProfile,
        })
      );

      // Establish persistent 30-day session
      const sessionRecord = {
        token: crypto.randomUUID(),
        userId: newUser.id,
        email: newUser.email,
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      };
      localStorage.setItem('my-money-local-session', JSON.stringify(sessionRecord));
      setUser(newUser);
      setProfile(newProfile);
      setHasLocalAccount(true);
      toast.success('Account created and secured!');
    },
    [fetchProfile]
  );

  // ── Sign In ───────────────────────────────────────────────────────────────

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });

          if (error) {
            throw error;
          }

          if (data.session && data.user) {
            setSession(data.session);
            setUser(data.user);
            await fetchProfile(data.user.id);
          }
          toast.success('Welcome back!');
          return;
        } catch (cloudErr: any) {
          const errMsg = cloudErr?.message || '';
          const isNetworkError =
            errMsg.includes('Failed to fetch') ||
            errMsg.includes('NetworkError') ||
            cloudErr?.name === 'TypeError';

          if (isNetworkError) {
            // Check if local account exists and matches entered credentials
            try {
              const savedAuthRaw = localStorage.getItem('my-money-local-auth');
              if (savedAuthRaw) {
                const localAuth = JSON.parse(savedAuthRaw);
                if (localAuth.email?.toLowerCase() === email.trim().toLowerCase()) {
                  const inputHash = await hashPassword(password, localAuth.salt);
                  if (inputHash === localAuth.passwordHash) {
                    const sessionRecord = {
                      token: crypto.randomUUID(),
                      userId: localAuth.user.id,
                      email: localAuth.email,
                      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
                    };
                    localStorage.setItem('my-money-local-session', JSON.stringify(sessionRecord));
                    setUser(localAuth.user);
                    setProfile(localAuth.profile);
                    toast.success('ক্লাউড ডাটাবেজ অফলাইন থাকায় লোকাল অ্যাকাউন্টে লগইন করা হয়েছে!');
                    return;
                  }
                }
              }
            } catch {
              // ignore
            }

            throw new Error(
              'Failed to fetch: ক্লাউড সার্ভারের সাথে সংযোগ করা সম্ভব হয়নি। আপনার Supabase URL সঠিক কিনা দেখুন অথবা নিচে "লোকাল মোডে ফিরুন" বাটনে চাপ দিন।'
            );
          }
          throw cloudErr;
        }
      }

      // Local Mode: Verify against stored PBKDF2 hash
      const savedAuthRaw = localStorage.getItem('my-money-local-auth');
      if (!savedAuthRaw) {
        // First-time sign-in on this device: securely initialize master account with entered credentials
        await signUp(email, password, email.split('@')[0]);
        return;
      }

      const localAuth = JSON.parse(savedAuthRaw);
      if (localAuth.email.toLowerCase() !== email.trim().toLowerCase()) {
        throw new Error('Invalid email or password. Please try again.');
      }

      const inputHash = await hashPassword(password, localAuth.salt);
      if (inputHash !== localAuth.passwordHash) {
        throw new Error('Invalid email or password. Please try again.');
      }

      // Authentication successful: issue persistent 30-day session token
      const sessionRecord = {
        token: crypto.randomUUID(),
        userId: localAuth.user.id,
        email: localAuth.email,
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      };
      localStorage.setItem('my-money-local-session', JSON.stringify(sessionRecord));
      setUser(localAuth.user);
      setProfile(localAuth.profile);
      toast.success('Welcome back!');
    },
    [fetchProfile, signUp]
  );

  // ── Google OAuth ──────────────────────────────────────────────────────────

  const signInWithGoogle = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      throw new Error('Google Sign-In requires Supabase Cloud Database connection.');
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (error) {
      throw error;
    }
  }, []);

  // ── Sign Out ──────────────────────────────────────────────────────────────

  const signOut = useCallback(async () => {
    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error('Supabase sign out error:', err);
      }
    }

    // Completely destroy local persistent session
    localStorage.removeItem('my-money-local-session');
    setUser(null);
    setSession(null);
    setProfile(null);
    toast.success('Signed out successfully');
  }, []);

  // ── Reset Password ────────────────────────────────────────────────────────

  const resetPassword = useCallback(async (email: string) => {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success('Password reset email sent. Check your inbox.');
      return;
    }

    // Local Mode: check if account exists
    const savedAuthRaw = localStorage.getItem('my-money-local-auth');
    if (!savedAuthRaw) {
      throw new Error('No local account registered with this email.');
    }
    const localAuth = JSON.parse(savedAuthRaw);
    if (localAuth.email.toLowerCase() !== email.trim().toLowerCase()) {
      throw new Error('No local account registered with this email.');
    }

    toast.success(
      'Password reset request received. Please reset your password using the security settings.'
    );
  }, []);

  // ── Update Password ───────────────────────────────────────────────────────

  const updatePassword = useCallback(async (password: string) => {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success('Password updated successfully');
      return;
    }

    // Local Mode: update hash
    const savedAuthRaw = localStorage.getItem('my-money-local-auth');
    if (!savedAuthRaw) throw new Error('No account found.');

    const localAuth = JSON.parse(savedAuthRaw);
    const newSalt = generateSalt();
    const newHash = await hashPassword(password, newSalt);
    localAuth.salt = newSalt;
    localAuth.passwordHash = newHash;
    localStorage.setItem('my-money-local-auth', JSON.stringify(localAuth));
    toast.success('Password updated successfully');
  }, []);

  // ── Update Profile ────────────────────────────────────────────────────────

  const updateProfile = useCallback(
    async (updates: Partial<Profile>) => {
      if (!user) throw new Error('Not authenticated');

      if (!isSupabaseConfigured()) {
        const updated = {
          ...profile,
          ...updates,
          updated_at: new Date().toISOString(),
        } as Profile;
        setProfile(updated);

        let updatedUser = user;
        if (updates.full_name) {
          updatedUser = {
            ...user,
            user_metadata: { ...user.user_metadata, full_name: updates.full_name },
          } as User;
          setUser(updatedUser);
        }

        // Update local auth record
        const savedAuthRaw = localStorage.getItem('my-money-local-auth');
        if (savedAuthRaw) {
          try {
            const authRecord = JSON.parse(savedAuthRaw);
            authRecord.user = updatedUser;
            authRecord.profile = updated;
            localStorage.setItem('my-money-local-auth', JSON.stringify(authRecord));
          } catch {
            // ignore
          }
        }

        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel('my-money-profile-channel');
          bc.postMessage({ type: 'SYNC_PROFILE', user: updatedUser, profile: updated });
          bc.close();
        }

        toast.success('Profile updated');
        return;
      }

      if (updates.full_name) {
        try {
          await supabase.auth.updateUser({
            data: { full_name: updates.full_name },
          });
        } catch {
          // ignore auth metadata update error if offline
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      await fetchProfile(user.id);

      if (updates.full_name) {
        setUser((prev) =>
          prev
            ? ({
                ...prev,
                user_metadata: { ...prev.user_metadata, full_name: updates.full_name },
              } as User)
            : prev
        );
      }

      toast.success('Profile updated');
    },
    [user, profile, fetchProfile]
  );

  // ── Delete Account ────────────────────────────────────────────────────────

  const deleteAccount = useCallback(async () => {
    if (!user) throw new Error('Not authenticated');

    if (!isSupabaseConfigured()) {
      localStorage.removeItem('my-money-local-auth');
      localStorage.removeItem('my-money-local-session');
      localStorage.removeItem('my-money-demo-user');
      setUser(null);
      setSession(null);
      setProfile(null);
      setHasLocalAccount(false);
      toast.success('Account deleted.');
      return;
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', user.id);

    if (profileError) {
      throw profileError;
    }

    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    toast.success('Account deleted.');
  }, [user]);

  // ── Value ─────────────────────────────────────────────────────────────────

  const value: AuthContextValue = {
    user,
    session,
    profile,
    loading,
    isConfigured: isSupabaseConfigured(),
    hasLocalAccount,
    signUp,
    signIn,
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
