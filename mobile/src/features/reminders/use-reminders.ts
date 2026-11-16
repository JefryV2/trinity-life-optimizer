import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { track } from '@/lib/analytics';

const CHECKIN_KEY = 'auxo.reminders.checkin';
const WEEKLY_KEY = 'auxo.reminders.weekly';
const HOUR_KEY = 'auxo.reminders.hour';
const IDS_KEY = 'auxo.reminders.ids';
const CHANNEL = 'reminders';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const readIds = async (): Promise<string[]> => {
  try {
    const stored = await AsyncStorage.getItem(IDS_KEY);
    return stored ? (JSON.parse(stored) as string[]) : [];
  } catch {
    return [];
  }
};

const cancelIds = async (ids: string[]) => {
  await Promise.all(
    ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined)),
  );
  await AsyncStorage.removeItem(IDS_KEY);
};

const ensureChannel = async () => {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: 'Reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: '#C6F24E',
  });
};

const ensurePermission = async (): Promise<boolean> => {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
};

export interface ReminderState {
  checkin: boolean;
  weekly: boolean;
  hour: number;
  loading: boolean;
  message: string | null;
  toggleCheckin: (value: boolean) => Promise<void>;
  toggleWeekly: (value: boolean) => Promise<void>;
  setHour: (hour: number) => Promise<void>;
  test: () => Promise<void>;
}

export const useReminders = (): ReminderState => {
  const [checkin, setCheckin] = useState(false);
  const [weekly, setWeekly] = useState(false);
  const [hour, setHourState] = useState(20);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(CHECKIN_KEY),
      AsyncStorage.getItem(WEEKLY_KEY),
      AsyncStorage.getItem(HOUR_KEY),
    ])
      .then(([checkinValue, weeklyValue, hourValue]) => {
        setCheckin(checkinValue === 'true');
        setWeekly(weeklyValue === 'true');
        const parsed = Number(hourValue);
        if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 23) setHourState(parsed);
      })
      .finally(() => setLoading(false));
  }, []);

  const reschedule = useCallback(
    async (next: { checkin: boolean; weekly: boolean; hour: number }) => {
      const ids = await readIds();
      await cancelIds(ids);
      const scheduled: string[] = [];

      if (next.checkin) {
        scheduled.push(
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "Today's check-in",
              body: 'One minute: sleep, one expense, one person. Then close the app.',
              sound: false,
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DAILY,
              hour: next.hour,
              minute: 0,
              channelId: CHANNEL,
            },
          }),
        );
      }

      if (next.weekly) {
        scheduled.push(
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Your week in three rings',
              body: 'Open the weekly review and pick one lever for next week.',
              sound: false,
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
              weekday: 1,
              hour: 18,
              minute: 0,
              channelId: CHANNEL,
            },
          }),
        );
      }

      await AsyncStorage.setItem(IDS_KEY, JSON.stringify(scheduled));
    },
    [],
  );

  const toggleCheckin = useCallback(
    async (value: boolean) => {
      setMessage(null);
      if (value && !(await ensurePermission())) {
        setMessage('Notifications are off for Auxo in this device’s settings.');
        return;
      }
      const next = { checkin: value, weekly, hour };
      await ensureChannel();
      await reschedule(next);
      await AsyncStorage.setItem(CHECKIN_KEY, String(value));
      setCheckin(value);
      if (value) void track('reminder_enabled', { kind: 'checkin', hour });
      setMessage(value ? 'Evening check-in scheduled.' : 'Evening check-in turned off.');
    },
    [hour, reschedule, weekly],
  );

  const toggleWeekly = useCallback(
    async (value: boolean) => {
      setMessage(null);
      if (value && !(await ensurePermission())) {
        setMessage('Notifications are off for Auxo in this device’s settings.');
        return;
      }
      const next = { checkin, weekly: value, hour };
      await ensureChannel();
      await reschedule(next);
      await AsyncStorage.setItem(WEEKLY_KEY, String(value));
      setWeekly(value);
      if (value) void track('reminder_enabled', { kind: 'weekly' });
      setMessage(value ? 'Sunday review scheduled.' : 'Sunday review turned off.');
    },
    [checkin, hour, reschedule],
  );

  const setHour = useCallback(
    async (nextHour: number) => {
      setHourState(nextHour);
      await AsyncStorage.setItem(HOUR_KEY, String(nextHour));
      if (checkin) {
        await reschedule({ checkin, weekly, hour: nextHour });
        setMessage(`Check-in moved to ${String(nextHour).padStart(2, '0')}:00.`);
      }
    },
    [checkin, reschedule, weekly],
  );

  const test = useCallback(async () => {
    if (!(await ensurePermission())) {
      setMessage('Notifications are off for Auxo in this device’s settings.');
      return;
    }
    await ensureChannel();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Auxo reminder test',
        body: 'Notifications are working.',
        sound: false,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 60,
        channelId: CHANNEL,
      },
    });
    setMessage('Test notification scheduled for about one minute from now.');
  }, []);

  return { checkin, weekly, hour, loading, message, toggleCheckin, toggleWeekly, setHour, test };
};
