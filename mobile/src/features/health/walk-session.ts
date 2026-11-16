import AsyncStorage from '@react-native-async-storage/async-storage';

export const WALK_TASK = 'trinity-walk-location';
export const WALK_SESSION_KEY = 'trinity.walk.session';

export type WalkSessionStatus = 'tracking' | 'paused' | 'finished';
export type WalkPoint = { lat: number; lng: number };
export type WalkPause = { start: number; end: number | null };
export type WalkFix = {
  coords: { latitude: number; longitude: number; accuracy: number | null };
  timestamp: number;
};

export type WalkSession = {
  id: string;
  userId: string | null;
  status: WalkSessionStatus;
  startedAt: number;
  finishedAt: number | null;
  pausedAt: number | null;
  pausedMs: number;
  pauses: WalkPause[];
  distanceM: number;
  segments: WalkPoint[][];
  lastPoint: { lat: number; lng: number; t: number } | null;
  accuracy: number | null;
  /** Sensor steps persisted so a killed app can restore the count. */
  steps: number;
  saved: boolean;
  background: boolean;
  updatedAt: number;
};

export const MAX_ACCURACY_M = 35;
const MIN_SEGMENT_M = 1.5;
// Anything faster than a sprint is a GPS jump, not a step.
const MAX_SPEED_MPS = 7;
// A long silence means a new segment, never a straight line across the gap.
const MAX_GAP_MS = 60_000;

const toRad = (value: number) => (value * Math.PI) / 180;

export const haversine = (a: WalkPoint, b: WalkPoint) => {
  const earth = 6_371_000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earth * Math.asin(Math.min(1, Math.sqrt(h)));
};

export const createSession = (
  startedAt: number,
  background: boolean,
  userId: string | null = null,
): WalkSession => ({
  id: `${startedAt}-${Math.random().toString(36).slice(2, 8)}`,
  userId,
  status: 'tracking',
  startedAt,
  finishedAt: null,
  pausedAt: null,
  pausedMs: 0,
  pauses: [],
  distanceM: 0,
  segments: [],
  lastPoint: null,
  accuracy: null,
  steps: 0,
  saved: false,
  background,
  updatedAt: startedAt,
});

/**
 * One accepted fix at a time. Pure, so the foreground UI and the background
 * task apply exactly the same filters and produce exactly the same route.
 */
export const appendFix = (session: WalkSession, fix: WalkFix): WalkSession => {
  if (session.status !== 'tracking') return session;

  const { latitude, longitude, accuracy } = fix.coords;
  const now = fix.timestamp || Date.now();
  const reading = accuracy ?? null;

  if (reading != null && reading > MAX_ACCURACY_M) {
    return { ...session, accuracy: reading, updatedAt: now };
  }

  const last = session.lastPoint;
  if (!last) {
    return {
      ...session,
      accuracy: reading,
      lastPoint: { lat: latitude, lng: longitude, t: now },
      segments: [...session.segments, [{ lat: latitude, lng: longitude }]],
      updatedAt: now,
    };
  }

  const segment = haversine(last, { lat: latitude, lng: longitude });
  const seconds = Math.max(0.5, (now - last.t) / 1000);

  if (segment < MIN_SEGMENT_M || segment / seconds > MAX_SPEED_MPS) {
    return { ...session, accuracy: reading, updatedAt: now };
  }

  const point = { lat: latitude, lng: longitude };
  const gap = now - last.t > MAX_GAP_MS;
  const segments =
    gap || session.segments.length === 0
      ? [...session.segments, [point]]
      : session.segments.map((part, index) =>
          index === session.segments.length - 1 ? [...part, point] : part,
        );

  return {
    ...session,
    accuracy: reading,
    lastPoint: { ...point, t: now },
    distanceM: session.distanceM + segment,
    segments,
    updatedAt: now,
  };
};

const roundPoint = (point: WalkPoint): WalkPoint => ({
  lat: Math.round(point.lat * 1e5) / 1e5,
  lng: Math.round(point.lng * 1e5) / 1e5,
});

/** Most of a walk's shape survives in a few hundred points. */
export const compactRoute = (segments: WalkPoint[][], maxPoints = 320): WalkPoint[][] => {
  const lines = segments.filter((segment) => segment.length > 0);
  const total = lines.reduce((sum, segment) => sum + segment.length, 0);
  const step = Math.max(1, Math.ceil(total / maxPoints));
  return lines.map((segment) => {
    if (segment.length <= 2) return segment.map(roundPoint);
    return segment
      .filter((_point, index) => index % step === 0 || index === segment.length - 1)
      .map(roundPoint);
  });
};

export const sessionDurationMs = (session: WalkSession, now = Date.now()) => {
  const end =
    session.status === 'finished'
      ? (session.finishedAt ?? now)
      : session.status === 'paused'
        ? (session.pausedAt ?? now)
        : now;
  return Math.max(0, end - session.startedAt - session.pausedMs);
};

export const loadSession = async (): Promise<WalkSession | null> => {
  try {
    const raw = await AsyncStorage.getItem(WALK_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WalkSession;
    if (!parsed || typeof parsed.startedAt !== 'number' || !Array.isArray(parsed.segments)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export const saveSession = async (session: WalkSession) => {
  try {
    await AsyncStorage.setItem(WALK_SESSION_KEY, JSON.stringify(session));
  } catch {
    // A failed persistence write must not stop the walk.
  }
};

export const clearSession = async () => {
  try {
    await AsyncStorage.removeItem(WALK_SESSION_KEY);
  } catch {
    // ignore
  }
};
