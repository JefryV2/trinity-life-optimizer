import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { RefreshControl, View } from 'react-native';

import { ScoreRing } from '@/components/charts/score-ring';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { Switch } from '@/components/ui/switch';
import { TextField } from '@/components/ui/text-field';
import { useHealth } from '@/features/health/use-health';
import { useReminders } from '@/features/health/use-reminders';
import { formatNumber } from '@/lib/format';
import { space, useTheme } from '@/theme';

const TARGET_KEY = 'trinity.hydration.target';

export default function HydrationScreen() {
  const { colors } = useTheme();
  const { data, isPending, isError, error, refetch, isRefetching, addWater, setWaterTarget } = useHealth();
  const reminderState = useReminders();
  const [targetText, setTargetText] = useState('2500');
  const [message, setMessage] = useState<string | null>(null);

  const water = data?.hydration?.water_intake_ml ?? 0;
  const target = data?.hydration?.target_ml ?? (Number(targetText) || 2500);
  const percent = target > 0 ? Math.round((water / target) * 100) : 0;

  useEffect(() => {
    void AsyncStorage.getItem(TARGET_KEY).then((storedTarget) => {
      if (storedTarget) setTargetText(storedTarget);
    });
  }, []);

  useEffect(() => {
    if (data?.hydration?.target_ml) setTargetText(String(data.hydration.target_ml));
  }, [data?.hydration?.target_ml]);

  const add = (amount: number) => {
    addWater.mutate(amount, {
      onSuccess: () => {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
    });
  };

  const saveTarget = async () => {
    const next = Number(targetText);
    if (!Number.isFinite(next) || next < 500 || next > 8000) {
      setMessage('Choose a target between 500 and 8000 ml.');
      return;
    }
    await AsyncStorage.setItem(TARGET_KEY, String(next));
    setWaterTarget.mutate(next, {
      onSuccess: () => {
        setMessage('Target saved.');
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
      onError: (err) => setMessage(err.message),
    });
  };

  const toggleReminders = (value: boolean) => {
    void (value ? reminderState.schedule() : reminderState.disable());
  };

  return (
    <Screen
      safeAreaTop={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => {
            void refetch();
          }}
          tintColor={colors.primary}
        />
      }
    >
      {isPending ? <LoadingState rows={3} /> : null}
      {isError ? <ErrorState message={error.message} onRetry={refetch} /> : null}

      <Card raised style={{ alignItems: 'center', gap: space.lg }}>
        <ScoreRing score={Math.min(percent, 100)} size={150} stroke={12} color={colors.accent} label="Hydrated" />
        <View style={{ alignItems: 'center', gap: 2 }}>
          <AppText variant="numeric" selectable style={{ fontSize: 34 }}>
            {formatNumber(water)} ml
          </AppText>
          <AppText variant="footnote" tone="secondary">
            Target {formatNumber(target)} ml · {percent}%
          </AppText>
        </View>
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <Button label="+250" variant="soft" onPress={() => add(250)} loading={addWater.isPending} />
          <Button label="+500" variant="soft" onPress={() => add(500)} loading={addWater.isPending} />
          <Button label="+1000" variant="soft" onPress={() => add(1000)} loading={addWater.isPending} />
        </View>
      </Card>

      <SectionHeader title="Daily target" caption="Saved locally and to today's hydration record" />
      <Card style={{ gap: space.lg }}>
        <TextField label="Target ml" value={targetText} onChangeText={setTargetText} keyboardType="number-pad" maxLength={4} />
        <Button label="Save target" onPress={saveTarget} loading={setWaterTarget.isPending} />
      </Card>

      <SectionHeader title="Reminders" caption="Daily nudges at 10:00, 13:00, 16:00 and 19:00" />
      <Card style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="callout">Hydration reminders</AppText>
            <AppText variant="caption" tone="tertiary">
              Keep this on if you want scheduled water nudges.
            </AppText>
          </View>
          <Switch value={reminderState.enabled} onValueChange={toggleReminders} accessibilityLabel="Hydration reminders" />
        </View>
        {reminderState.enabled ? (
          <Button label="Send test notification" variant="soft" size="small" onPress={() => void reminderState.test()} />
        ) : null}
        {reminderState.message ? (
          <AppText variant="footnote" tone="secondary">
            {reminderState.message}
          </AppText>
        ) : null}
      </Card>

      {message ? (
        <AppText variant="footnote" tone="secondary">
          {message}
        </AppText>
      ) : null}
    </Screen>
  );
}