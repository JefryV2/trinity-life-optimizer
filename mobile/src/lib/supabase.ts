import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import type { Database } from '@/lib/database.types';
import { demoClient } from '@/lib/demo/demo-client';
import { isDemoMode } from '@/lib/demo/demo-mode';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to .env.',
  );
}

// Expo Router evaluates the root layout in Node when it builds its server
// manifest. AsyncStorage's web build touches window.localStorage, so fall
// back to Supabase's in-memory storage when there is no browser/native runtime.
const hasRuntimeWindow = typeof window !== 'undefined';

const realClient = createClient<Database>(url, anonKey, {
  auth: {
    storage: hasRuntimeWindow ? AsyncStorage : undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

type TrinityClient = typeof realClient;

/**
 * Offline demo mode routes every data/auth call to the in-memory demo client,
 * so the app is fully usable with no backend. In normal mode the proxy is a
 * transparent pass-through to the Supabase client.
 */
export const supabase: TrinityClient = new Proxy(realClient, {
  get(target, property) {
    if (isDemoMode()) {
      if (property === 'from') return demoClient.from;
      if (property === 'auth') return demoClient.auth;
      if (property === 'functions') return demoClient.functions;
    }
    const value = Reflect.get(target, property, target);
    return typeof value === 'function' ? value.bind(target) : value;
  },
}) as TrinityClient;

// Supabase's refresh timer only runs while the JS runtime is alive. Mobile
// apps are suspended constantly, so refresh when the app returns to the
// foreground instead of trusting a timer that may have slept through expiry.
if (hasRuntimeWindow) {
  AppState.addEventListener('change', (state) => {
    if (isDemoMode()) return;
    if (state === 'active') {
      void realClient.auth.startAutoRefresh();
    } else {
      void realClient.auth.stopAutoRefresh();
    }
  });
}
