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
  /** Recent fixes, used to prove movement before distance is credited. */
  recent: Array<{ lat: number; lng: number; t: number }>;
  accuracy: number | null;
  /** Sensor steps persisted so a killed app can restore the count. */
  steps: number;
  saved: boolean;
  background: boolean;
  updatedAt: number;
};

export const MAX_ACCURACY_M = 25;
const MIN_SEGMENT_M = 8;
// A brisk walk is under 3 m/s. Anything faster is a jump, not a walk.
const MAX_SPEED_MPS = 3.2;
// GPS drift at walking pace is common while standing still. Reject fixes that
// do not clear a small, accuracy-scaled distance floor.
const MIN_SPEED_MPS = 0.45;
// A fix only counts once the recent window shows sustained, direct movement.
const MOTION_WINDOW_MS = 8_000;
const MOTION_LOOKBACK_MS = 12_000;
const MIN_STRAIGHTNESS = 0.55;
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
  recent: [],
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

  const point = { lat: latitude, lng: longitude };
  const recent = [...(session.recent ?? []), { ...point, t: now }].filter(
    (entry) => now - entry.t <= MOTION_LOOKBACK_MS,
  );
  const last = session.lastPoint;

  if (!last) {
    return {
      ...session,
      accuracy: reading,
      lastPoint: { ...point, t: now },
      recent,
      segments: [...session.segments, [point]],
      updatedAt: now,
    };
  }

  const segment = haversine(last, point);
  const seconds = Math.max(0.5, (now - last.t) / 1000);
  const speed = segment / seconds;
  const floor = Math.max(MIN_SEGMENT_M, Math.min(14, (reading ?? 0) * 0.55));

  if (
    segment < floor ||
    speed > MAX_SPEED_MPS ||
    (speed < MIN_SPEED_MPS && segment < 12)
  ) {
    return { ...session, accuracy: reading, recent, updatedAt: now };
  }

  const first = recent[0];
  const windowMs = Math.max(0, now - first.t);
  const net = haversine(first, point);
  const path = recent
    .slice(1)
    .reduce((sum, entry, index) => sum + haversine(recent[index], entry), 0);
  const straightness = path > 0 ? net / path : 0;
  const averageSpeed = windowMs > 0 ? net / (windowMs / 1000) : 0;
  const motionFloor = Math.max(9, Math.min(12, (reading ?? 8) * 0.5));

  // A seated phone still jitters around a point. Real walking covers ground
  // in one direction, so credit nothing until the window shows a direct,
  // sustained move — not a pile of random little jumps.
  if (
    windowMs < MOTION_WINDOW_MS ||
    net < motionFloor ||
    path < motionFloor * 1.1 ||
    straightness < MIN_STRAIGHTNESS ||
    averageSpeed < 0.5 ||
    averageSpeed > MAX_SPEED_MPS
  ) {
    return { ...session, accuracy: reading, recent, updatedAt: now };
  }

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
    recent,
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
    // Sessions from before the movement-window filter can contain drift that
    // was already credited. Start clean rather than carrying those numbers in.
    if (!Array.isArray(parsed.recent)) {
      await AsyncStorage.removeItem(WALK_SESSION_KEY);
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
