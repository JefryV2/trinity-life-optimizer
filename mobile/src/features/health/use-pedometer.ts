import { Pedometer } from 'expo-sensors';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { useHealth } from '@/features/health/use-health';
import { isoDate } from '@/lib/format';

export const usePedometer = () => {
  const { data, saveSteps } = useHealth();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [liveSteps, setLiveSteps] = useState(0);
  const [tracking, setTracking] = useState(false);
  const baseRef = useRef(0);
  const subscriptionRef = useRef<{ remove: () => void } | null>(null);
  const todaySteps = data?.steps.find((row) => row.date === isoDate())?.steps ?? 0;

  const stop = useCallback(() => {
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
    setTracking(false);
  }, []);

  const start = useCallback(async () => {
    stop();
    setMessage(null);
    const supported = await Pedometer.isAvailableAsync();
    setAvailable(supported);
    if (!supported) {
      setMessage('Step sensor is unavailable on this device. Manual step entry still works.');
      return;
    }
    const permission = await Pedometer.requestPermissionsAsync();
    if (!permission.granted) {
      setMessage('Motion permission was denied. Manual step entry still works.');
      return;
    }

    baseRef.current = todaySteps;
    if (Platform.OS === 'ios') {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const result = await Pedometer.getStepCountAsync(start, new Date());
      baseRef.current = Math.max(todaySteps, result.steps);
      setLiveSteps(baseRef.current);
    }

    subscriptionRef.current = Pedometer.watchStepCount((result) => {
      const next = Platform.OS === 'android' ? baseRef.current + result.steps : result.steps;
      setLiveSteps(next);
      saveSteps.mutate(next);
    });
    setTracking(true);
    setMessage('Counting steps while Trinity is open.');
  }, [saveSteps, stop, todaySteps]);

  useEffect(() => stop, [stop]);

  return { available, tracking, message, liveSteps: liveSteps || todaySteps, start, stop, saving: saveSteps.isPending };
};