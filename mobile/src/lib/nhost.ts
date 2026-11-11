import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createNhostClient,
  withClientSideSessionMiddleware,
  type NhostClient,
  type StoredSession,
} from '@nhost/nhost-js';

const SUBDOMAIN = process.env.EXPO_PUBLIC_NHOST_SUBDOMAIN;
const REGION = process.env.EXPO_PUBLIC_NHOST_REGION;

if (!SUBDOMAIN || !REGION) {
  throw new Error(
    'Missing EXPO_PUBLIC_NHOST_SUBDOMAIN / EXPO_PUBLIC_NHOST_REGION. Add them to mobile/.env.',
  );
}

const SESSION_KEY = 'trinity.nhost.session';

// The SDK's storage interface is synchronous, so the session lives in memory
// and is mirrored to AsyncStorage in the background.
let memorySession: StoredSession | null = null;
let client: NhostClient | null = null;

const storage = {
  get: () => memorySession,
  set: (value: StoredSession) => {
    memorySession = value;
    void AsyncStorage.setItem(SESSION_KEY, JSON.stringify(value)).catch(() => undefined);
  },
  remove: () => {
    memorySession = null;
    void AsyncStorage.removeItem(SESSION_KEY).catch(() => undefined);
  },
};

/**
 * Hydrates the stored session, then creates the client. Must run before any
 * data or auth call; the auth provider calls it during boot.
 */
export const initNhost = async (): Promise<NhostClient> => {
  if (client) return client;
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    memorySession = raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    memorySession = null;
  }
  client = createNhostClient({
    subdomain: SUBDOMAIN,
    region: REGION,
    storage,
    configure: [withClientSideSessionMiddleware],
  });
  return client;
};

export const getNhost = (): NhostClient => {
  if (!client) throw new Error('Nhost has not been initialised yet.');
  return client;
};

export const getStoredSession = (): StoredSession | null => memorySession;
