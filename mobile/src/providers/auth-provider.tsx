import type { Session, User } from '@supabase/supabase-js';
import { createContext, use, useEffect, useMemo, useState, type ReactNode } from 'react';

import { getDemoSession, resetDemoDatabase } from '@/lib/demo/demo-client';
import { isDemoMode, loadDemoMode, setDemoMode } from '@/lib/demo/demo-mode';
import { supabase } from '@/lib/supabase';

interface AuthValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  /** True when the app is running on local demo data with no backend. */
  demo: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, firstName: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  /** Enter the offline demo with seeded sample data. */
  enterDemo: () => Promise<void>;
  /** Restore the demo dataset to its original seeded state. */
  resetDemo: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | null = null;

    const boot = async () => {
      const demoEnabled = await loadDemoMode();
      if (!mounted) return;

      if (demoEnabled) {
        setDemo(true);
        setSession(getDemoSession());
        setLoading(false);
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);

      const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => {
        setSession(next);
      });
      unsubscribe = () => subscription.subscription.unsubscribe();
    };

    void boot();

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      demo,
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
        if (isDemoMode()) {
          await setDemoMode(false);
          setDemo(false);
          setSession(null);
          return;
        }
        const { error } = await supabase.auth.signOut();
        if (error) throw new Error(error.message);
      },
      enterDemo: async () => {
        await setDemoMode(true);
        setDemo(true);
        setSession(getDemoSession());
      },
      resetDemo: async () => {
        await resetDemoDatabase();
      },
    }),
    [session, loading, demo],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
};

export const useAuth = (): AuthValue => {
  const value = use(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
};
