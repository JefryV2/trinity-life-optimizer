import * as Location from 'expo-location';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useHealth } from '@/features/health/use-health';
import { useProfile } from '@/features/profile/use-profile';
import { isoDate } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

export type WalkStatus = 'idle' | 'tracking' | 'paused' | 'finished';

const MAX_ACCURACY_M = 35;
const MIN_SEGMENT_M = 1.5;
// Anything faster than a sprint is a GPS jump, not a step.
const MAX_SPEED_MPS = 7;
const MIN_SAVE_M = 20;
const DEFAULT_STRIDE_M = 0.72;

const toRad = (value: number) => (value * Math.PI) / 180;

const haversine = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const earth = 6_371_000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earth * Math.asin(Math.min(1, Math.sqrt(h)));
};

/**
 * Steps from GPS. The phone cannot count steps from location, so this measures
 * distance and converts it with the user's stride (≈0.415 × height), which is
 * the same estimate most walking apps use. Keep the app open while walking.
 */
export const useGpsWalk = () => {
  const { data: health, saveSteps } = useHealth();
  const { data: profile } = useProfile();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<WalkStatus>('idle');
  const [distanceM, setDistanceM] = useState(0);
  const [durationS, setDurationS] = useState(0);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const lastRef = useRef<{ lat: number; lng: number; t: number } | null>(null);
  const startedAtRef = useRef(0);
  const pausedAtRef = useRef<number | null>(null);
  const pausedMsRef = useRef(0);
  const distanceRef = useRef(0);

  const heightCm = profile?.health?.height_cm ?? null;
  const strideM = heightCm ? (heightCm * 0.415) / 100 : DEFAULT_STRIDE_M;
  const steps = Math.round(distanceM / strideM);
  const todaySteps = health?.steps.find((row) => row.date === isoDate())?.steps ?? 0;
  const paceSPerKm = distanceM > 30 && durationS > 0 ? durationS / (distanceM / 1000) : 0;
  const weightKg = profile?.health?.weight_kg ?? 70;
  const calories = Math.round(0.53 * weightKg * (distanceM / 1000));

  const stopWatch = useCallback(() => {
    watchRef.current?.remove();
    watchRef.current = null;
  }, []);

  const handlePosition = useCallback((position: Location.LocationObject) => {
    const { latitude, longitude, accuracy: reading } = position.coords;
    setAccuracy(reading ?? null);
    if (!reading || reading > MAX_ACCURACY_M) return;

    const now = position.timestamp ?? Date.now();
    const previous = lastRef.current;
    if (!previous) {
      lastRef.current = { lat: latitude, lng: longitude, t: now };
      return;
    }

    const segment = haversine(previous, { lat: latitude, lng: longitude });
    const seconds = Math.max(0.5, (now - previous.t) / 1000);
    if (segment < MIN_SEGMENT_M) return;
    if (segment / seconds > MAX_SPEED_MPS) return;

    distanceRef.current += segment;
    lastRef.current = { lat: latitude, lng: longitude, t: now };
    setDistanceM(distanceRef.current);
  }, []);

  const beginWatch = useCallback(async () => {
    watchRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        distanceInterval: 3,
        timeInterval: 2000,
      },
      handlePosition,
    );
  }, [handlePosition]);

  const start = useCallback(async () => {
    setError(null);
    setSaved(false);
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      setError('Location permission is needed to count steps from GPS.');
      return;
    }

    stopWatch();
    distanceRef.current = 0;
    lastRef.current = null;
    pausedMsRef.current = 0;
    pausedAtRef.current = null;
    startedAtRef.current = Date.now();
    setDistanceM(0);
    setDurationS(0);
    setStatus('tracking');
    await beginWatch();
  }, [beginWatch, stopWatch]);

  const pause = useCallback(() => {
    if (status !== 'tracking') return;
    stopWatch();
    pausedAtRef.current = Date.now();
    setStatus('paused');
  }, [status, stopWatch]);

  const resume = useCallback(async () => {
    if (status !== 'paused') return;
    if (pausedAtRef.current) {
      pausedMsRef.current += Date.now() - pausedAtRef.current;
      pausedAtRef.current = null;
    }
    lastRef.current = null;
    setStatus('tracking');
    await beginWatch();
  }, [beginWatch, status]);

  const finish = useCallback(() => {
    stopWatch();
    if (pausedAtRef.current) {
      pausedMsRef.current += Date.now() - pausedAtRef.current;
      pausedAtRef.current = null;
    }
    setDurationS(
      Math.max(0, Math.round((Date.now() - startedAtRef.current - pausedMsRef.current) / 1000)),
    );
    setStatus('finished');
  }, [stopWatch]);

  const reset = useCallback(() => {
    stopWatch();
    distanceRef.current = 0;
    lastRef.current = null;
    pausedMsRef.current = 0;
    pausedAtRef.current = null;
    setDistanceM(0);
    setDurationS(0);
    setAccuracy(null);
    setError(null);
    setSaved(false);
    setStatus('idle');
  }, [stopWatch]);

  const save = useCallback(async () => {
    if (distanceRef.current < MIN_SAVE_M) {
      setError(`Walk at least ${MIN_SAVE_M} m before saving.`);
      return;
    }
    setError(null);
    const walkSteps = Math.round(distanceRef.current / strideM);
    const minutes = Math.max(1, Math.round(durationS / 60));
    const km = distanceRef.current / 1000;

    try {
      await saveSteps.mutateAsync(todaySteps + walkSteps);
      if (user?.id) {
        const { error: insertError } = await supabase.from('exercise_records').insert({
          user_id: user.id,
          exercise_type: 'cardio',
          exercise_name: 'Walk (GPS)',
          duration_minutes: minutes,
          calories_burned: calories,
          intensity: 'moderate',
          notes: `${km.toFixed(2)} km · ${walkSteps} steps`,
          completed_at: new Date().toISOString(),
        });
        if (insertError) throw new Error(insertError.message);
      }
      await queryClient.invalidateQueries({ queryKey: ['health'] });
      setSaved(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save the walk.');
    }
  }, [
    calories,
    durationS,
    queryClient,
    saveSteps,
    strideM,
    todaySteps,
    user?.id,
  ]);

  useEffect(() => {
    if (status !== 'tracking') return;
    const tick = setInterval(() => {
      setDurationS(
        Math.max(
          0,
          Math.round((Date.now() - startedAtRef.current - pausedMsRef.current) / 1000),
        ),
      );
    }, 1000);
    return () => clearInterval(tick);
  }, [status]);

  useEffect(() => stopWatch, [stopWatch]);

  return {
    status,
    steps,
    todaySteps,
    distanceM,
    durationS,
    paceSPerKm,
    calories,
    accuracy,
    strideM,
    error,
    saved,
    saving: saveSteps.isPending,
    start,
    pause,
    resume,
    finish,
    save,
    reset,
  };
};
