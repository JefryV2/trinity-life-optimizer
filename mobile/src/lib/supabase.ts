import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import type { Database } from '@/lib/database.types';

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

export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    storage: hasRuntimeWindow ? AsyncStorage : undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Supabase's refresh timer only runs while the JS runtime is alive. Mobile
// apps are suspended constantly, so refresh when the app returns to the
// foreground instead of trusting a timer that may have slept through expiry.
if (hasRuntimeWindow) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      void supabase.auth.startAutoRefresh();
    } else {
      void supabase.auth.stopAutoRefresh();
    }
  });
}
