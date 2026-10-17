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

// ─── Types ──────────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isConfigured: boolean;
  enterDemoMode: () => void;
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

  // ── Fetch Profile ─────────────────────────────────────────────────────

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

  const personalUser = {
    id: 'personal-user-abid',
    email: 'abidasset@gmail.com',
    user_metadata: { full_name: 'Abid Hasan' },
    app_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  } as unknown as User;

  const personalProfile: Profile = {
    id: 'personal-user-abid',
    email: 'abidasset@gmail.com',
    full_name: 'Abid Hasan',
    avatar_url: null,
    default_currency: 'BDT',
    timezone: 'Asia/Dhaka',
    date_format: 'dd/MM/yyyy',
    first_day_of_week: 0,
    theme: 'system',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const enterDemoMode = useCallback(() => {
    setUser(personalUser);
    setProfile(personalProfile);
    localStorage.setItem(
      'my-money-demo-user',
      JSON.stringify({ user: personalUser, profile: personalProfile })
    );
  }, []);

  // ── Auth State Listener ───────────────────────────────────────────────

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      const savedUser = localStorage.getItem('my-money-demo-user');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          setUser(parsed.user);
          setProfile(parsed.profile);
        } catch {
          setUser(personalUser);
          setProfile(personalProfile);
        }
      } else {
        setUser(personalUser);
        setProfile(personalProfile);
        localStorage.setItem(
          'my-money-demo-user',
          JSON.stringify({ user: personalUser, profile: personalProfile })
        );
      }
      setLoading(false);
      return;
    }

    // Get the initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (initialSession?.user) {
        setSession(initialSession);
        setUser(initialSession.user);
        fetchProfile(initialSession.user.id);
      } else {
        // Auto-initialize personal profile so login is never forced
        setUser(personalUser);
        setProfile(personalProfile);
      }
      setLoading(false);
    }).catch(() => {
      setUser(personalUser);
      setProfile(personalProfile);
      setLoading(false);
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (newSession?.user) {
        setSession(newSession);
        setUser(newSession.user);
        await fetchProfile(newSession.user.id);
      } else {
        setUser(personalUser);
        setProfile(personalProfile);
      }
      setLoading(false);
    });

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
      subscription.unsubscribe();
      if (bc) bc.close();
    };
  }, [fetchProfile]);

  // ── Sign Up ───────────────────────────────────────────────────────────

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      throw error;
    }

    toast.success('Account created! Please check your email to verify.');
  }, []);

  // ── Sign In ───────────────────────────────────────────────────────────

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    toast.success('Welcome back!');
  }, []);

  // ── Google OAuth ──────────────────────────────────────────────────────

  const signInWithGoogle = useCallback(async () => {
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

  // ── Sign Out ──────────────────────────────────────────────────────────

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }

    setUser(null);
    setSession(null);
    setProfile(null);
    toast.success('Signed out successfully');
  }, []);

  // ── Reset Password ───────────────────────────────────────────────────

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      throw error;
    }

    toast.success('Password reset email sent. Check your inbox.');
  }, []);

  // ── Update Password ──────────────────────────────────────────────────

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      throw error;
    }

    toast.success('Password updated successfully');
  }, []);

  // ── Update Profile ───────────────────────────────────────────────────

  const updateProfile = useCallback(
    async (updates: Partial<Profile>) => {
      if (!user) throw new Error('Not authenticated');

      if (!isSupabaseConfigured()) {
        const updated = { ...profile, ...updates, updated_at: new Date().toISOString() } as Profile;
        setProfile(updated);

        let updatedUser = user;
        if (updates.full_name) {
          updatedUser = {
            ...user,
            user_metadata: { ...user.user_metadata, full_name: updates.full_name },
          } as User;
          setUser(updatedUser);
        }

        try {
          localStorage.setItem(
            'my-money-demo-user',
            JSON.stringify({ user: updatedUser, profile: updated })
          );
          if (typeof BroadcastChannel !== 'undefined') {
            const bc = new BroadcastChannel('my-money-profile-channel');
            bc.postMessage({ type: 'SYNC_PROFILE', user: updatedUser, profile: updated });
            bc.close();
          }
        } catch {
          // ignore
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
          // ignore auth metadata update error if network fails
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      // Refresh profile data
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

  // ── Delete Account ────────────────────────────────────────────────────

  const deleteAccount = useCallback(async () => {
    if (!user) throw new Error('Not authenticated');

    if (!isSupabaseConfigured()) {
      localStorage.removeItem('my-money-demo-user');
      setUser(null);
      setSession(null);
      setProfile(null);
      toast.success('Account deleted. We are sorry to see you go.');
      return;
    }

    // Delete profile (cascade will handle related data)
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', user.id);

    if (profileError) {
      throw profileError;
    }

    // Sign out
    await supabase.auth.signOut();

    setUser(null);
    setSession(null);
    setProfile(null);
    toast.success('Account deleted. We are sorry to see you go.');
  }, [user]);

  // ── Value ─────────────────────────────────────────────────────────────

  const value: AuthContextValue = {
    user,
    session,
    profile,
    loading,
    isConfigured: isSupabaseConfigured(),
    enterDemoMode,
    signUp,
    signIn,
    signInWithGoogle,
    signOut: async () => {
      localStorage.removeItem('my-money-demo-user');
      if (isSupabaseConfigured()) {
        try {
          await signOut();
        } catch {
          // ignore
        }
      }
      setUser(null);
      setSession(null);
      setProfile(null);
      toast.success('Signed out');
    },
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
