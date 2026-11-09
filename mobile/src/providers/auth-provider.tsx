import type { Session, User } from '@supabase/supabase-js';
import { createContext, use, useEffect, useMemo, useState, type ReactNode } from 'react';

import { supabase } from '@/lib/supabase';

interface AuthValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, firstName: string) => Promise<boolean>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (mounted) setSession(data.session);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw new Error(error.message);
      },
      signUp: async (email, password, firstName) => {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { first_name: firstName.trim() } },
        });
        if (error) throw new Error(error.message);
        // When email confirmation is on, no session comes back yet.
        return Boolean(data.session);
      },
      signOut: async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw new Error(error.message);
      },
    }),
    [session, loading],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
};

export const useAuth = (): AuthValue => {
  const value = use(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
};
