import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Minimal activation telemetry.
 *
 * Events are counters, never record contents. They are always kept locally so
 * development builds can inspect them, and are only sent if an endpoint is
 * configured via EXPO_PUBLIC_ANALYTICS_ENDPOINT.
 */
export type AnalyticsEvent =
  | 'onboarding_completed'
  | 'first_signal_logged'
  | 'import_connected'
  | 'weekly_review_opened'
  | 'reminder_enabled'
  | 'barcode_food_logged'
  | 'screen_error';

interface LocalEvent {
  event: AnalyticsEvent;
  at: string;
  props?: Record<string, string | number | boolean>;
}

const KEY = 'auxo.analytics.events';
const ONCE_PREFIX = 'auxo.analytics.once.';

const read = async (): Promise<LocalEvent[]> => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LocalEvent[]) : [];
  } catch {
    return [];
  }
};

export const track = async (
  event: AnalyticsEvent,
  props?: Record<string, string | number | boolean>,
): Promise<void> => {
  const entry: LocalEvent = { event, at: new Date().toISOString(), props };
  try {
    const events = await read();
    events.push(entry);
    await AsyncStorage.setItem(KEY, JSON.stringify(events.slice(-500)));
  } catch {
    // Telemetry must never break the app.
  }

  const endpoint = process.env.EXPO_PUBLIC_ANALYTICS_ENDPOINT;
  if (!endpoint) return;
  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
  } catch {
    // Offline is expected; the local counter remains.
  }
};

export const trackOnce = async (
  event: AnalyticsEvent,
  props?: Record<string, string | number | boolean>,
): Promise<void> => {
  const key = `${ONCE_PREFIX}${event}`;
  try {
    if (await AsyncStorage.getItem(key)) return;
    await AsyncStorage.setItem(key, '1');
  } catch {
    return;
  }
  await track(event, props);
};

export const readAnalytics = read;
