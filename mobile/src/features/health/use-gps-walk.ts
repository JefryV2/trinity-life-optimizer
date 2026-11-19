import { useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Pedometer } from 'expo-sensors';
import * as TaskManager from 'expo-task-manager';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { useHealth } from '@/features/health/use-health';
import { useProfile } from '@/features/profile/use-profile';
import { isoDate } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

import {
  clearSession,
  compactRoute,
  createSession,
  loadSession,
  saveSession,
  sessionDurationMs,
  WALK_TASK,
  type WalkSession,
  type WalkSessionStatus,
} from './walk-session';

export type WalkStatus = 'idle' | WalkSessionStatus;

const DEFAULT_STRIDE_M = 0.72;
const MIN_SAVE_M = 20;
const SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;
const STEP_SAVE_INTERVAL_MS = 10_000;

const START_OPTIONS: Location.LocationTaskOptions = {
  accuracy: Location.Accuracy.High,
  distanceInterval: 3,
  timeInterval: 2000,
  activityType: Location.ActivityType.Fitness,
  pausesUpdatesAutomatically: false,
  showsBackgroundLocationIndicator: true,
  foregroundService: {
    notificationTitle: 'Walk in progress',
    notificationBody: 'Auxo is recording your route.',
    notificationColor: '#C6F24E',
    killServiceOnDestroy: false,
  },
};

/**
 * A walk is a persisted session, not component state. The background task
 * appends fixes even when this screen is gone; the hook restores it, polls the
 * persisted copy while the app is open, and owns the pedometer subscription.
 */
export const useGpsWalk = () => {
  const { data: health, saveSteps } = useHealth();
  const { data: profile } = useProfile();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [session, setSession] = useState<WalkSession | null>(null);
  const [sensorSteps, setSensorSteps] = useState(0);
  const [backgroundGranted, setBackgroundGranted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());

  const sessionRef = useRef<WalkSession | null>(null);
  const pedometerRef = useRef<{ remove: () => void } | null>(null);
  const carryStepsRef = useRef(0);
  const liveStepsRef = useRef(0);
  const stepsRef = useRef(0);

  const heightCm = profile?.health?.height_cm ?? null;
  const strideM = heightCm ? (heightCm * 0.415) / 100 : DEFAULT_STRIDE_M;

  const applySession = useCallback((next: WalkSession | null) => {
    sessionRef.current = next;
    setSession(next);
  }, []);

  const persist = useCallback(async (next: WalkSession) => {
    sessionRef.current = next;
    setSession(next);
    await saveSession(next);
  }, []);

  const startPedometer = useCallback((carry: number) => {
    pedometerRef.current?.remove();
    pedometerRef.current = null;
    carryStepsRef.current = carry;
    liveStepsRef.current = 0;
    setSensorSteps(carry);
    try {
      pedometerRef.current = Pedometer.watchStepCount(({ steps }) => {
        liveStepsRef.current = steps;
        const next = carryStepsRef.current + steps;
        stepsRef.current = next;
        setSensorSteps(next);
      });
    } catch {
      // No step sensor: the GPS distance / stride estimate is the fallback.
    }
  }, []);

  const stopPedometer = useCallback(() => {
    pedometerRef.current?.remove();
    pedometerRef.current = null;
    carryStepsRef.current += liveStepsRef.current;
    liveStepsRef.current = 0;
    setSensorSteps(carryStepsRef.current);
  }, []);

  const startUpdates = useCallback(async () => {
    const already = await Location.hasStartedLocationUpdatesAsync(WALK_TASK).catch(() => false);
    if (already) return;
    await Location.startLocationUpdatesAsync(WALK_TASK, START_OPTIONS);
  }, []);

  const stopUpdates = useCallback(async () => {
    const already = await Location.hasStartedLocationUpdatesAsync(WALK_TASK).catch(() => false);
    if (already) await Location.stopLocationUpdatesAsync(WALK_TASK).catch(() => {});
  }, []);

  // Restore a session after a backgrounded/killed app.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = await loadSession();
      if (cancelled || !stored) return;
      if (Date.now() - stored.startedAt > SESSION_MAX_AGE_MS) {
        await clearSession();
        return;
      }
      if (stored.userId && user?.id && stored.userId !== user.id) {
        await stopUpdates();
        await clearSession();
        applySession(null);
        setSensorSteps(0);
        return;
      }

      sessionRef.current = stored;
      setSession(stored);
      setBackgroundGranted(stored.background);
      setSensorSteps(stored.steps);
      carryStepsRef.current = stored.steps;
      setNow(Date.now());

      if (stored.status !== 'tracking') return;

      const already = await Location.hasStartedLocationUpdatesAsync(WALK_TASK).catch(() => false);
      if (!already) await startUpdates().catch(() => {});

      const available = await Pedometer.isAvailableAsync().catch(() => false);
      if (available) startPedometer(stored.steps);
    })();
    return () => {
      cancelled = true;
    };
  }, [startPedometer, startUpdates, stopUpdates, user?.id]);

  useEffect(() => {
    if (!session || session.status === 'finished') return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [session?.status]);

  // The task writes the route; this keeps the screen in step with it.
  useEffect(() => {
    if (!session || session.status !== 'tracking') return;
    let cancelled = false;
    const timer = setInterval(async () => {
      const stored = await loadSession();
      if (cancelled || !stored) return;
      if (stored.status !== 'tracking' || stored.updatedAt !== sessionRef.current?.updatedAt) {
        sessionRef.current = stored;
        setSession(stored);
      }
    }, 1000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [session?.status]);

  // Persist the sensor count periodically so a killed app can restore it.
  useEffect(() => {
    if (!session || session.status !== 'tracking') return;
    const timer = setInterval(async () => {
      const stored = await loadSession();
      if (!stored || stored.status !== 'tracking') return;
      await saveSession({ ...stored, steps: stepsRef.current, updatedAt: Date.now() });
    }, STEP_SAVE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [session?.status]);

  useEffect(
    () => () => {
      pedometerRef.current?.remove();
      pedometerRef.current = null;
    },
    [],
  );

  const start = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      if (!TaskManager.isTaskDefined(WALK_TASK)) {
        throw new Error('The walk tracker is not ready. Restart Auxo and try again.');
      }

      const foreground = await Location.requestForegroundPermissionsAsync();
      if (!foreground.granted) {
        throw new Error('Location permission is needed to record a walk.');
      }

      let background = await Location.getBackgroundPermissionsAsync();
      if (!background.granted) background = await Location.requestBackgroundPermissionsAsync();
      setBackgroundGranted(background.granted);

      try {
        const notification = await Notifications.getPermissionsAsync();
        if (!notification.granted) await Notifications.requestPermissionsAsync();
      } catch {
        // The foreground service can still run without the notification banner.
      }

      const available = await Pedometer.isAvailableAsync().catch(() => false);
      if (available) {
        const permission = await Pedometer.getPermissionsAsync().catch(() => null);
        if (permission && !permission.granted) {
          await Pedometer.requestPermissionsAsync().catch(() => {});
        }
      }

      const startedAt = Date.now();
      const next = createSession(startedAt, background.granted, user?.id ?? null);
      await persist(next);
      setNow(startedAt);
      carryStepsRef.current = 0;
      liveStepsRef.current = 0;
      setSensorSteps(0);
      if (available) startPedometer(0);

      await startUpdates();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not start the walk.');
      pedometerRef.current?.remove();
      pedometerRef.current = null;
      await clearSession();
      applySession(null);
    } finally {
      setBusy(false);
    }
  }, [applySession, busy, persist, startPedometer, startUpdates, user?.id]);

  const pause = useCallback(async () => {
    const current = sessionRef.current;
    if (!current || current.status !== 'tracking') return;
    setBusy(true);
    try {
      await stopUpdates();
      const at = Date.now();
      const steps = stepsRef.current;
      stopPedometer();
      carryStepsRef.current = steps;
      setSensorSteps(steps);

      await persist({
        ...current,
        status: 'paused',
        pausedAt: at,
        pauses: [...current.pauses, { start: at, end: null }],
        lastPoint: null,
        recent: [],
        steps,
        updatedAt: at,
      });
      setNow(at);
    } finally {
      setBusy(false);
    }
  }, [persist, stopPedometer, stopUpdates]);

  const resume = useCallback(async () => {
    const current = sessionRef.current;
    if (!current || current.status !== 'paused') return;
    setBusy(true);
    try {
      const at = Date.now();
      const pausedAt = current.pausedAt ?? at;
      const pauses = current.pauses.map((entry, index) =>
        index === current.pauses.length - 1 && entry.end === null
          ? { ...entry, end: at }
          : entry,
      );

      await persist({
        ...current,
        status: 'tracking',
        pausedAt: null,
        pausedMs: current.pausedMs + Math.max(0, at - pausedAt),
        pauses,
        lastPoint: null,
        recent: [],
        updatedAt: at,
      });
      setNow(at);
      await startUpdates();
      startPedometer(stepsRef.current);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not resume the walk.');
    } finally {
      setBusy(false);
    }
  }, [persist, startPedometer, startUpdates]);

  const finish = useCallback(async () => {
    const current = sessionRef.current;
    if (!current || current.status === 'finished') return;
    setBusy(true);
    try {
      await stopUpdates();
      const at = Date.now();
      const finalPauseMs =
        current.status === 'paused' && current.pausedAt
          ? Math.max(0, at - current.pausedAt)
          : 0;
      const pauses = current.pauses.map((entry) =>
        entry.end === null ? { ...entry, end: at } : entry,
      );

      const gpsFallback = Math.round(current.distanceM / strideM);
      // If the hardware sensor produced a count, trust it. GPS distance is
      // only a fallback for devices without a step counter; using it whenever
      // it is larger turns drift into imaginary steps.
      let steps = stepsRef.current > 0 ? stepsRef.current : gpsFallback;
      stopPedometer();

      // iOS can query the pedometer for the whole period, including the time
      // the JS was suspended. Android has no range query; use the live count.
      if (Platform.OS === 'ios') {
        try {
          const total = await Pedometer.getStepCountAsync(
            new Date(current.startedAt),
            new Date(at),
          );
          let pausedSteps = 0;
          for (const entry of pauses) {
            const paused = await Pedometer.getStepCountAsync(
              new Date(entry.start),
              new Date(entry.end ?? at),
            );
            pausedSteps += paused.steps;
          }
          steps = Math.max(0, total.steps - pausedSteps);
        } catch {
          // Keep the live count.
        }
      }

      await persist({
        ...current,
        status: 'finished',
        finishedAt: at,
        pausedAt: null,
        pausedMs: current.pausedMs + finalPauseMs,
        pauses,
        steps,
        lastPoint: null,
        recent: [],
        updatedAt: at,
      });
      setSensorSteps(steps);
      setNow(at);
    } finally {
      setBusy(false);
    }
  }, [persist, stopPedometer, stopUpdates, strideM]);

  const reset = useCallback(async () => {
    await stopUpdates();
    pedometerRef.current?.remove();
    pedometerRef.current = null;
    carryStepsRef.current = 0;
    liveStepsRef.current = 0;
    setSensorSteps(0);
    await clearSession();
    applySession(null);
    setBackgroundGranted(false);
    setError(null);
    setNow(Date.now());
  }, [applySession, stopUpdates]);

  const todaySteps = health?.steps.find((row) => row.date === isoDate())?.steps ?? 0;
  const weightKg = profile?.health?.weight_kg ?? 70;
  const distanceM = session?.distanceM ?? 0;
  const durationS = session ? Math.round(sessionDurationMs(session, now) / 1000) : 0;
  const gpsSteps = distanceM > 0 ? Math.round(distanceM / strideM) : 0;
  const steps = sensorSteps > 0 ? sensorSteps : gpsSteps;
  stepsRef.current = steps;
  const paceSPerKm = distanceM > 30 && durationS > 0 ? durationS / (distanceM / 1000) : 0;
  const calories = Math.round(0.53 * weightKg * (distanceM / 1000));

  const save = useCallback(async () => {
    const current = sessionRef.current;
    if (!current || current.status !== 'finished') return;
    if (current.distanceM < MIN_SAVE_M) {
      setError(`Walk at least ${MIN_SAVE_M} m before saving.`);
      return;
    }

    setError(null);
    const finalSteps = current.steps || Math.round(current.distanceM / strideM);
    const durationSeconds = Math.max(1, Math.round(sessionDurationMs(current) / 1000));
    const minutes = Math.max(1, Math.round(durationSeconds / 60));
    const km = current.distanceM / 1000;

    try {
      await saveSteps.mutateAsync(todaySteps + finalSteps);
      if (user?.id) {
        const { error: insertError } = await supabase.from('exercise_records').insert({
          user_id: user.id,
          exercise_type: 'cardio',
          exercise_name: 'Walk (GPS)',
          duration_minutes: minutes,
          calories_burned: calories,
          intensity: 'moderate',
          notes: `${km.toFixed(2)} km · ${finalSteps} steps`,
          route: compactRoute(current.segments),
          completed_at: new Date().toISOString(),
        });
        if (insertError) throw new Error(insertError.message);
      }
      await queryClient.invalidateQueries({ queryKey: ['health'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      await persist({ ...current, saved: true, steps: finalSteps, updatedAt: Date.now() });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save the walk.');
    }
  }, [calories, persist, queryClient, saveSteps, strideM, todaySteps, user?.id]);

  return {
    status: (session?.status ?? 'idle') as WalkStatus,
    steps,
    todaySteps,
    distanceM,
    durationS,
    paceSPerKm,
    calories,
    accuracy: session?.accuracy ?? null,
    strideM,
    route: session?.segments ?? [],
    backgroundGranted,
    busy,
    error,
    saved: session?.saved ?? false,
    saving: saveSteps.isPending,
    start,
    pause,
    resume,
    finish,
    save,
    reset,
  };
};
