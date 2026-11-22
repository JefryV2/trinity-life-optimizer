import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import type { Session, User } from '@supabase/supabase-js';
import type { StoredSession } from '@nhost/nhost-js';
import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { clearSession, WALK_TASK } from '@/features/health/walk-session';
import { getDemoSession, resetDemoDatabase } from '@/lib/demo/demo-client';
import { isDemoMode, loadDemoMode, setDemoMode } from '@/lib/demo/demo-mode';
import { getStoredSession, initNhost } from '@/lib/nhost';
import { signInWithOAuth, type OAuthProvider } from '@/lib/oauth';
import {
  applyOnboardingDraft,
  clearOnboardingDraft,
  profileCompletedOnboarding,
  readOnboardingDraft,
} from '@/features/onboarding/onboarding-draft';

interface AuthValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  /** True when the app is running on local demo data with no backend. */
  demo: boolean;
  /** Whether this account has finished onboarding (per-device cache). */
  onboarded: boolean;
  /** Whether this install has seen the pre-auth onboarding at least once. */
  seenOnboarding: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithProvider: (provider: OAuthProvider) => Promise<void>;
  signUp: (email: string, password: string, firstName: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resetWithTicket: (ticket: string, newPassword: string) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  /** Enter the offline demo with seeded sample data. */
  enterDemo: () => Promise<void>;
  /** Restore the demo dataset to its original seeded state. */
  resetDemo: () => Promise<void>;
  /** Flip the onboarding gate (used by onboarding and the More test hook). */
  markOnboarded: (value: boolean) => Promise<void>;
  /** Remember that the intro has been seen on this install. */
  markOnboardingSeen: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

const stopWalkTracking = async () => {
  await Location.stopLocationUpdatesAsync(WALK_TASK).catch(() => {});
  await clearSession();
};

const onboardedKey = (userId: string) => `trinity.onboarded.${userId}`;
const ONBOARDING_SEEN_KEY = 'auxo.onboarding.seen.v1';

const readOnboarded = async (userId: string | undefined): Promise<boolean> => {
  if (!userId) return false;
  try {
    return (await AsyncStorage.getItem(onboardedKey(userId))) === '1';
  } catch {
    return false;
  }
};

const readOnboardingSeen = async (): Promise<boolean> => {
  try {
    return (await AsyncStorage.getItem(ONBOARDING_SEEN_KEY)) === '1';
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

/** Nhost throws FetchError, which keeps the parsed auth response on `.body`. */
const thrownMessage = (caught: unknown, fallback: string) => {
  const body = (caught as { body?: unknown })?.body;
  if (body) return errorMessage(body, fallback);
  return caught instanceof Error ? caught.message : fallback;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [demo, setDemo] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [seenOnboarding, setSeenOnboarding] = useState(false);

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | null = null;

    const boot = async () => {
      const demoEnabled = await loadDemoMode();
      if (!mounted) return;

      if (demoEnabled) {
        setDemo(true);
        setOnboarded(true);
        setSeenOnboarding(true);
        setSession(getDemoSession());
        setLoading(false);
        return;
      }

      const client = await initNhost();
      if (!mounted) return;
      const stored = client.sessionStorage.get() ?? getStoredSession();
      const next = toSession(stored);
      const seen = (await readOnboardingSeen()) || Boolean(next);
      const localFlag = await readOnboarded(stored?.user?.id ?? next?.user?.id);
      let flag = localFlag;
      if (next && !flag) {
        try {
          flag = await profileCompletedOnboarding(next.user.id);
        } catch {
          // Offline or local-only session: keep the local result.
        }
      }
      if (!mounted) return;

      setSession(next);
      setOnboarded(flag);
      setSeenOnboarding(seen);
      setLoading(false);

      unsubscribe = client.sessionStorage.onChange(async (changed) => {
        const mapped = toSession(changed);
        let nextFlag = await readOnboarded(changed?.user?.id ?? mapped?.user?.id);
        if (mapped && !nextFlag) {
          try {
            nextFlag = await profileCompletedOnboarding(mapped.user.id);
          } catch {
            // Keep the local result when the profile check fails.
          }
        }
        if (!mounted) return;
        setSession(mapped);
        setOnboarded(nextFlag);
        if (mapped) setSeenOnboarding(true);
      });
    };

    void boot();

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, []);

  const markOnboardingSeen = useCallback(async () => {
    setSeenOnboarding(true);
    try {
      await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, '1');
    } catch {
      // Best-effort local flag.
    }
  }, []);

  const resolveOnboarded = useCallback(
    async (userId: string | undefined, applied: boolean): Promise<boolean> => {
      if (applied) return true;
      if (await readOnboarded(userId)) return true;
      if (!userId) return false;
      try {
        return await profileCompletedOnboarding(userId);
      } catch {
        return false;
      }
    },
    [],
  );

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

  /**
   * Onboarding is completed before auth. Once Nhost returns a session, write
   * those local answers to the account before the guard renders the tabs.
   */
  const applyPendingDraft = useCallback(async (userId: string, existingAccount: boolean) => {
    const draft = await readOnboardingDraft();
    if (!draft) return false;

    // Do not overwrite a profile that was already completed on another device.
    if (existingAccount && (await profileCompletedOnboarding(userId))) {
      await clearOnboardingDraft();
      return false;
    }

    try {
      await applyOnboardingDraft(userId, draft);
      await clearOnboardingDraft();
      await AsyncStorage.setItem(onboardedKey(userId), '1');
      return true;
    } catch (caught) {
      console.warn('Could not apply onboarding draft', caught);
      return false;
    }
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      demo,
      onboarded,
      seenOnboarding,
      signIn: async (email, password) => {
        const client = await initNhost();
        const response = await client.auth.signInEmailPassword({ email: email.trim(), password });
        if (response.status >= 400) {
          throw new Error(errorMessage(response.body, 'Could not sign in.'));
        }
        const stored = client.sessionStorage.get();
        const next = toSession(stored);
        if (!next) throw new Error('Signed in, but no session was returned.');
        const userId = stored?.user?.id ?? next.user.id;
        const applied = await applyPendingDraft(userId, true);
        await markOnboardingSeen();
        setOnboarded(await resolveOnboarded(userId, applied));
        setSession(next);
      },
      signInWithProvider: async (provider) => {
        const client = await initNhost();
        const completed = await signInWithOAuth(client, provider);
        if (!completed) return;
        const stored = client.sessionStorage.get();
        const next = toSession(stored);
        if (!next) throw new Error('Sign-in succeeded but no session was returned.');
        const userId = stored?.user?.id ?? next.user.id;
        const applied = await applyPendingDraft(userId, true);
        await markOnboardingSeen();
        setOnboarded(await resolveOnboarded(userId, applied));
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
        await markOnboardingSeen();
        const stored = client.sessionStorage.get();
        if (stored) {
          const userId = stored.user?.id;
          const applied = userId ? await applyPendingDraft(userId, false) : false;
          setOnboarded(await resolveOnboarded(userId, applied));
          setSession(toSession(stored));
        }
        // When email confirmation is on, no session comes back yet.
        return Boolean(response.body?.session);
      },
      resetPassword: async (email) => {
        const client = await initNhost();
        const address = email.trim();
        const send = (redirect: boolean) =>
          client.auth.sendPasswordResetEmail({
            email: address,
            ...(redirect ? { options: { redirectTo: 'trinity://reset' } } : {}),
          });

        try {
          await send(true);
          return;
        } catch (caught) {
          const code = (caught as { body?: { error?: string } })?.body?.error;
          const message = caught instanceof Error ? caught.message : '';
          if (code !== 'redirectTo-not-allowed' && !message.toLowerCase().includes('redirect')) {
            throw new Error(thrownMessage(caught, 'Could not send the reset email.'));
          }
        }

        // The app deep link is not in Nhost's allowed redirect list yet. Still
        // send the email; the link falls back to Nhost's default page.
        try {
          await send(false);
        } catch (caught) {
          throw new Error(thrownMessage(caught, 'Could not send the reset email.'));
        }
      },
      resetWithTicket: async (ticket, newPassword) => {
        const client = await initNhost();
        try {
          await client.auth.changeUserPassword({ newPassword, ticket });
        } catch (caught) {
          throw new Error(thrownMessage(caught, 'Could not reset the password.'));
        }
        client.sessionStorage.remove();
        setOnboarded(false);
        setSession(null);
      },
      changePassword: async (newPassword) => {
        const client = await initNhost();
        const email = session?.user?.email;

        try {
          await client.auth.changeUserPassword({ newPassword });
        } catch (caught) {
          throw new Error(thrownMessage(caught, 'Could not change the password.'));
        }

        if (!email) {
          client.sessionStorage.remove();
          setSession(null);
          throw new Error('Password changed. Sign in again with your new password.');
        }

        try {
          const response = await client.auth.signInEmailPassword({ email, password: newPassword });
          if (response.status >= 400) {
            throw new Error(errorMessage(response.body, 'Password changed. Sign in again.'));
          }
          const stored = client.sessionStorage.get();
          const next = toSession(stored);
          if (!next) throw new Error('Password changed. Sign in again.');
          const userId = stored?.user?.id ?? next.user.id;
          setOnboarded(await resolveOnboarded(userId, false));
          setSession(next);
        } catch (caught) {
          client.sessionStorage.remove();
          setOnboarded(false);
          setSession(null);
          throw new Error(thrownMessage(caught, 'Password changed. Sign in again.'));
        }
      },
      deleteAccount: async () => {
        if (isDemoMode()) {
          throw new Error('Account deletion is not available in the demo.');
        }
        const client = await initNhost();

        try {
          const response = await client.graphql.request({
            query: 'mutation DeleteMyAccount { delete_my_account { id } }',
          });
          if (response.body.errors?.length) {
            throw new Error(response.body.errors.map((error) => error.message).join('; '));
          }
        } catch (caught) {
          throw new Error(thrownMessage(caught, 'Could not delete the account.'));
        }

        await stopWalkTracking();
        try {
          await client.auth.signOut(
            session?.refresh_token ? { refreshToken: session.refresh_token } : {},
          );
        } catch {
          // The auth identity is already gone.
        }
        client.sessionStorage.remove();
        const userId = session?.user?.id;
        if (userId) {
          try {
            await AsyncStorage.removeItem(onboardedKey(userId));
          } catch {
            // Best-effort local cleanup.
          }
        }
        setOnboarded(false);
        setSession(null);
      },
      signOut: async () => {
        await stopWalkTracking();
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
        await markOnboardingSeen();
        setOnboarded(true);
        setSession(getDemoSession());
      },
      resetDemo: async () => {
        await resetDemoDatabase();
        setSession(getDemoSession());
      },
      markOnboarded,
      markOnboardingSeen,
    }),
    [
      session,
      loading,
      demo,
      onboarded,
      seenOnboarding,
      markOnboarded,
      markOnboardingSeen,
      applyPendingDraft,
      resolveOnboarded,
    ],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
};

export const useAuth = (): AuthValue => {
  const value = use(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
};
