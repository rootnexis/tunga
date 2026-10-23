import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile, UserRole } from '@/types';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: UserRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error: string | null }>;
  signInWithGoogle: (email?: string, name?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ADMIN_ROLES: UserRole[] = ['admin', 'super_admin'];
const STAFF_ROLES: UserRole[] = ['staff', 'manager', 'admin', 'super_admin'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Failed to fetch profile:', error.message);
      return null;
    }
    return data as Profile;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user?.id) return;
    const p = await fetchProfile(user.id);
    if (p) setProfile(p);
  }, [user?.id, fetchProfile]);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data }: any) => {
      const session = data?.session ?? null;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const p = await fetchProfile(session.user.id);
        setProfile(p);
      }
      setIsLoading(false);
    }).catch(() => {
      setIsLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const p = await fetchProfile(session.user.id);
        setProfile(p);
      } else {
        setProfile(null);
      }

      if (event === 'INITIAL_SESSION') {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signUp = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName, last_name: lastName },
        emailRedirectTo: `${window.location.origin}/auth/verify-email`,
      },
    });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signInWithGoogle = async (googleEmail?: string, displayName?: string): Promise<{ error: string | null }> => {
    try {
      if (!googleEmail || !googleEmail.trim()) {
        return { error: 'Please provide a valid Google account email.' };
      }
      const email = googleEmail.trim();
      let firstName = '';
      let lastName = '';
      if (displayName?.trim()) {
        const parts = displayName.trim().split(' ');
        firstName = parts[0] || 'Google';
        lastName = parts.slice(1).join(' ') || 'User';
      } else {
        const localPart = email.split('@')[0] || 'User';
        const nameParts = localPart.replace(/[._-]+/g, ' ').split(' ');
        firstName = nameParts[0] ? nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1) : 'Google';
        lastName = nameParts.length > 1 ? nameParts.slice(1).map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ') : 'User';
      }

      if (typeof supabase.auth.signInWithOAuth === 'function') {
        const res = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            email,
            data: { first_name: firstName, last_name: lastName },
            redirectTo: window.location.origin,
          },
        });
        if (res?.error) return { error: res.error.message || 'Google sign in failed' };
      } else if (typeof supabase.auth.signInWithGoogle === 'function') {
        const res = await supabase.auth.signInWithGoogle({ email, firstName, lastName });
        if (res?.error) return { error: res.error.message || 'Google sign in failed' };
      } else {
        const res = await supabase.auth.signInWithPassword({ email, password: 'google_oauth' });
        if (res?.error) return { error: res.error.message };
      }
      return { error: null };
    } catch (err: any) {
      return { error: err?.message || 'Google authentication failed' };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const role = profile?.role ?? null;

  const value: AuthContextValue = {
    user,
    session,
    profile,
    role,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: role ? ADMIN_ROLES.includes(role) : false,
    isStaff: role ? STAFF_ROLES.includes(role) : false,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
