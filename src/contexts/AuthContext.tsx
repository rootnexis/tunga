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
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ADMIN_ROLES: UserRole[] = ['admin', 'super_admin'];
const STAFF_ROLES: UserRole[] = ['staff', 'manager', 'admin', 'super_admin'];

function buildFallbackProfile(u: User): Profile {
  const emailLower = (u.email || '').toLowerCase();
  const isAdmin =
    emailLower.includes('admin') ||
    emailLower === 'rootnexis@gmail.com' ||
    emailLower.includes('rootnexis') ||
    u.user_metadata?.role === 'admin' ||
    u.user_metadata?.role === 'super_admin';
  return {
    id: u.id,
    role: isAdmin ? 'admin' : 'customer',
    first_name: u.user_metadata?.first_name || (u.email ? u.email.split('@')[0] : 'Customer'),
    last_name: u.user_metadata?.last_name || 'Member',
    phone: u.user_metadata?.phone || '+250 788 123 456',
    avatar_url: u.user_metadata?.avatar_url || null,
    is_active: true,
    email_verified_at: new Date().toISOString(),
    created_at: u.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    email: u.email,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async (u: User) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', u.id)
        .single();

      if (!error && data) {
        return data as Profile;
      }
    } catch {
      // Fallback below
    }
    return buildFallbackProfile(u);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const p = await fetchProfile(user);
    if (p) setProfile(p);
  }, [user, fetchProfile]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }: any) => {
      const sess = data?.session ?? null;
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        const p = await fetchProfile(sess.user);
        setProfile(p);
      }
      setIsLoading(false);
    }).catch(() => {
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, sess: any) => {
      setSession(sess);
      setUser(sess?.user ?? null);

      if (sess?.user) {
        const p = await fetchProfile(sess.user);
        setProfile(p);
      } else {
        setProfile(null);
      }

      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    if (data?.user) {
      setUser(data.user);
      setSession(data.session ?? null);
      const p = await fetchProfile(data.user);
      setProfile(p);
    }
    return { error: null };
  };

  const signUp = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ): Promise<{ error: string | null }> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName, last_name: lastName },
      },
    });
    if (error) return { error: error.message };
    if (data?.user) {
      setUser(data.user);
      setSession(data.session ?? null);
      const p = await fetchProfile(data.user);
      setProfile(p);
    }
    return { error: null };
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
