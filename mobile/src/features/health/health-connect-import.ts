import { Platform } from 'react-native';

import { isoDate } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

export interface ImportSummary {
  steps: number;
  sleep: number;
  heart: number;
  days: number;
}

const DAYS = 14;

const since = () => new Date(Date.now() - DAYS * 86_400_000);

export const importHealthConnect = async (userId: string): Promise<ImportSummary> => {
  if (Platform.OS !== 'android') {
    throw new Error('Health Connect is Android-only. Apple Health import needs the iOS build.');
  }

  const health = await import('react-native-health-connect');
  const available = await health.getSdkStatus();
  if (available !== health.SdkAvailabilityStatus.SDK_AVAILABLE) {
    throw new Error('Health Connect is not available on this device. Install or update it first.');
  }
  await health.initialize();
  const granted = await health.requestPermission([
    { accessType: 'read', recordType: 'Steps' },
    { accessType: 'read', recordType: 'SleepSession' },
    { accessType: 'read', recordType: 'HeartRate' },
  ]);
  if (granted.length === 0) throw new Error('Health Connect permission was not granted.');

  const start = since();
  const end = new Date();
  const range = {
    operator: 'between' as const,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
  };

  const [stepsResult, sleepResult, heartResult] = await Promise.all([
    health.readRecords('Steps', { timeRangeFilter: range }),
    health.readRecords('SleepSession', { timeRangeFilter: range }),
    health.readRecords('HeartRate', { timeRangeFilter: range }),
  ]);

  // Steps: one Auxo row per calendar day, replacing any previous import.
  const stepsByDay = new Map<string, number>();
  for (const record of stepsResult.records) {
    const day = isoDate(new Date(record.startTime));
    stepsByDay.set(day, (stepsByDay.get(day) ?? 0) + Number(record.count ?? 0));
  }

  for (const [day, count] of stepsByDay) {
    const existing = await supabase
      .from('step_records')
      .select('id')
      .eq('user_id', userId)
      .eq('date', day)
      .maybeSingle();

    if (existing.data?.id) continue;
    const { error } = await supabase
      .from('step_records')
      .insert({ user_id: userId, date: day, steps: Math.round(count) });
    if (error) throw new Error(error.message);
  }

  // Sleep: replace the last imported window, leaving manual entries untouched.
  await supabase
    .from('sleep_records')
    .delete()
    .eq('user_id', userId)
    .eq('notes', 'Imported from Health Connect')
    .gte('created_at', start.toISOString());

  const sleepRows = sleepResult.records
    .map((record) => {
      const hours = (new Date(record.endTime).getTime() - new Date(record.startTime).getTime()) / 3_600_000;
      if (!Number.isFinite(hours) || hours <= 0) return null;
      return {
        user_id: userId,
        sleep_duration_hours: Math.round(Math.min(24, hours) * 10) / 10,
        sleep_quality: 3,
        bedtime: record.startTime,
        wake_time: record.endTime,
        notes: 'Imported from Health Connect',
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .slice(0, 30);

  if (sleepRows.length > 0) {
    const { error } = await supabase.from('sleep_records').insert(sleepRows);
    if (error) throw new Error(error.message);
  }

  // Heart: replace previous imports, then keep the latest samples only.
  await supabase
    .from('heart_rate_data')
    .delete()
    .eq('user_id', userId)
    .eq('source_device', 'health-connect')
    .gte('timestamp', start.toISOString());

  const heartRows = heartResult.records
    .flatMap((record) =>
      record.samples.map((sample) => ({
        user_id: userId,
        heart_rate: Math.round(sample.beatsPerMinute),
        timestamp: sample.time,
        source_device: 'health-connect',
        activity_type: null,
        confidence: null,
      })),
    )
    .filter((row) => row.heart_rate > 0)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 500);

  if (heartRows.length > 0) {
    const { error } = await supabase.from('heart_rate_data').insert(heartRows);
    if (error) throw new Error(error.message);
  }

  return {
    steps: stepsByDay.size,
    sleep: sleepRows.length,
    heart: heartRows.length,
    days: DAYS,
  };
};

export const useHealthImport = () => {
  const { user } = useAuth();
  return {
    userId: user?.id,
    importHealth: () => {
      if (!user?.id) throw new Error('Sign in before importing.');
      return importHealthConnect(user.id);
    },
  };
};
