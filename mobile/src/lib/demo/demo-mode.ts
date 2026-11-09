import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'trinity.demo.enabled';

// Read synchronously from anywhere (including the Supabase facade), so the
// flag lives in module state and is hydrated once at boot.
let enabled = false;
let hydrated = false;

export const isDemoMode = (): boolean => enabled;

export const loadDemoMode = async (): Promise<boolean> => {
  if (hydrated) return enabled;
  try {
    enabled = (await AsyncStorage.getItem(KEY)) === '1';
  } catch {
    enabled = false;
  }
  hydrated = true;
  return enabled;
};

export const setDemoMode = async (value: boolean): Promise<void> => {
  enabled = value;
  hydrated = true;
  try {
    if (value) await AsyncStorage.setItem(KEY, '1');
    else await AsyncStorage.removeItem(KEY);
  } catch {
    // Storage is best-effort; the in-memory flag still drives this session.
  }
};
