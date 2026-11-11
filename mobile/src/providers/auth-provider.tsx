import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session, User } from '@supabase/supabase-js';
import type { StoredSession } from '@nhost/nhost-js';
import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { getDemoSession, resetDemoDatabase } from '@/lib/demo/demo-client';
import { isDemoMode, loadDemoMode, setDemoMode } from '@/lib/demo/demo-mode';
import { getStoredSession, initNhost } from '@/lib/nhost';

interface AuthValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  /** True when the app is running on local demo data with no backend. */
  demo: boolean;
  /** Whether this account has finished onboarding (per-device cache). */
  onboarded: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, firstName: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  /** Enter the offline demo with seeded sample data. */
  enterDemo: () => Promise<void>;
  /** Restore the demo dataset to its original seeded state. */
  resetDemo: () => Promise<void>;
  /** Flip the onboarding gate (used by onboarding and the More test hook). */
  markOnboarded: (value: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

const onboardedKey = (userId: string) => `trinity.onboarded.${userId}`;

const readOnboarded = async (userId: string | undefined): Promise<boolean> => {
  if (!userId) return false;
  try {
    return (await AsyncStorage.getItem(onboardedKey(userId))) === '1';
  } catch {
    return false;
  }
};

/** Map Nhost's session onto the Supabase-shaped session the screens already use. */
const toSession = (stored: StoredSession | null): Session | null => {
  if (!stored) return null;
  const nhostUser = stored.user;
  return {
    access_token: stored.accessToken,
    refresh_token: stored.refreshToken,
    token_type: 'bearer',
    expires_in: stored.accessTokenExpiresIn,
    expires_at: Math.floor(Date.now() / 1000) + stored.accessTokenExpiresIn,
    user: {
      id: nhostUser?.id ?? '',
      email: nhostUser?.email,
      user_metadata: nhostUser?.metadata ?? {},
      app_metadata: { provider: 'email' },
      aud: 'authenticated',
      created_at: nhostUser?.createdAt ?? new Date().toISOString(),
    },
  } as unknown as Session;
};

const errorMessage = (body: unknown, fallback: string) => {
  if (body && typeof body === 'object' && 'message' in body) {
    const message = (body as { message?: unknown }).message;
    if (typeof message === 'string' && message) return message;
  }
  return fallback;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [demo, setDemo] = useState(false);
  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | null = null;

    const boot = async () => {
      const demoEnabled = await loadDemoMode();
      if (!mounted) return;

      if (demoEnabled) {
        setDemo(true);
        setOnboarded(true);
        setSession(getDemoSession());
        setLoading(false);
        return;
      }

      const client = await initNhost();
      if (!mounted) return;
      const stored = client.sessionStorage.get() ?? getStoredSession();
      const next = toSession(stored);
      const flag = await readOnboarded(stored?.user?.id ?? next?.user?.id);
      if (!mounted) return;

      setSession(next);
      setOnboarded(flag);
      setLoading(false);

      unsubscribe = client.sessionStorage.onChange(async (changed) => {
        const mapped = toSession(changed);
        const nextFlag = await readOnboarded(changed?.user?.id ?? mapped?.user?.id);
        if (!mounted) return;
        setSession(mapped);
        setOnboarded(nextFlag);
      });
    };

    void boot();

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, []);

  const markOnboarded = useCallback(
    async (value: boolean) => {
      const userId = session?.user?.id;
      setOnboarded(value);
      if (!userId) return;
      try {
        if (value) await AsyncStorage.setItem(onboardedKey(userId), '1');
        else await AsyncStorage.removeItem(onboardedKey(userId));
      } catch {
        // Local flag is best-effort.
      }
    },
    [session?.user?.id],
  );

  const value = useMemo<AuthValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      demo,
      onboarded,
      signIn: async (email, password) => {
        const client = await initNhost();
        const response = await client.auth.signInEmailPassword({ email: email.trim(), password });
        if (response.status >= 400) {
          throw new Error(errorMessage(response.body, 'Could not sign in.'));
        }
        const stored = client.sessionStorage.get();
        const next = toSession(stored);
        if (!next) throw new Error('Signed in, but no session was returned.');
        const flag = await readOnboarded(stored?.user?.id ?? next.user.id);
        setOnboarded(flag);
        setSession(next);
      },
      signUp: async (email, password, firstName) => {
        const client = await initNhost();
        const response = await client.auth.signUpEmailPassword({
          email: email.trim(),
          password,
          options: {
            displayName: firstName.trim(),
            metadata: { first_name: firstName.trim() },
          },
        });
        if (response.status >= 400) {
          throw new Error(errorMessage(response.body, 'Could not create the account.'));
        }
        const stored = client.sessionStorage.get();
        if (stored) {
          setOnboarded(await readOnboarded(stored.user?.id));
          setSession(toSession(stored));
        }
        // When email confirmation is on, no session comes back yet.
        return Boolean(response.body?.session);
      },
      resetPassword: async (email) => {
        const client = await initNhost();
        const response = await client.auth.sendPasswordResetEmail({
          email: email.trim(),
          options: { redirectTo: 'trinity://reset' },
        });
        if (response.status >= 400) {
          throw new Error(errorMessage(response.body, 'Could not send the reset email.'));
        }
      },
      signOut: async () => {
        if (isDemoMode()) {
          await setDemoMode(false);
          setDemo(false);
          setOnboarded(false);
          setSession(null);
          return;
        }
        const client = await initNhost();
        try {
          await client.auth.signOut(
            session?.refresh_token ? { refreshToken: session.refresh_token } : {},
          );
        } finally {
          setOnboarded(false);
          setSession(null);
        }
      },
      enterDemo: async () => {
        await setDemoMode(true);
        setDemo(true);
        setOnboarded(true);
        setSession(getDemoSession());
      },
      resetDemo: async () => {
        await resetDemoDatabase();
        setSession(getDemoSession());
      },
      markOnboarded,
    }),
    [session, loading, demo, onboarded, markOnboarded],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
};

export const useAuth = (): AuthValue => {
  const value = use(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
};
