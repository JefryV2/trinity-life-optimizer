import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

const IDS_KEY = 'trinity.hydration.notificationIds';
const ENABLED_KEY = 'trinity.hydration.reminders';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export const useReminders = () => {
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void AsyncStorage.getItem(ENABLED_KEY).then((value) => setEnabled(value === 'true'));
  }, []);

  const cancel = useCallback(async () => {
    const stored = await AsyncStorage.getItem(IDS_KEY);
    const ids = stored ? (JSON.parse(stored) as string[]) : [];
    await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
    await AsyncStorage.removeItem(IDS_KEY);
  }, []);

  const schedule = useCallback(async () => {
    setMessage(null);
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('hydration', {
        name: 'Hydration',
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: '#C6F24E',
      });
    }
    const permission = await Notifications.requestPermissionsAsync();
    if (!permission.granted) {
      setEnabled(false);
      await AsyncStorage.setItem(ENABLED_KEY, 'false');
      setMessage('Notification permission was denied.');
      return;
    }
    await cancel();
    const ids: string[] = [];
    for (const hour of [10, 13, 16, 19]) {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Hydration check',
          body: 'Take a water break and log it in Trinity.',
          sound: false,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute: 0,
          channelId: 'hydration',
        },
      });
      ids.push(id);
    }
    await AsyncStorage.setItem(IDS_KEY, JSON.stringify(ids));
    await AsyncStorage.setItem(ENABLED_KEY, 'true');
    setEnabled(true);
    setMessage('Daily hydration reminders scheduled.');
  }, [cancel]);

  const disable = useCallback(async () => {
    await cancel();
    await AsyncStorage.setItem(ENABLED_KEY, 'false');
    setEnabled(false);
    setMessage('Hydration reminders disabled.');
  }, [cancel]);

  const test = useCallback(async () => {
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Trinity reminder test', body: 'Notifications are working.', sound: false },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 60, channelId: 'hydration' },
    });
    setMessage('Test notification scheduled for about one minute from now.');
  }, []);

  return { enabled, message, schedule, disable, test };
};