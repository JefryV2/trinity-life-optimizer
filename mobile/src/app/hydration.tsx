import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { RefreshControl, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
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

      <View style={{ gap: space.sm }}>
        <AppText variant="caption" tone="secondary" style={{ letterSpacing: 0.6 }}>
          WATER TODAY
        </AppText>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.sm }}>
          <AppText variant="display" selectable>
            {formatNumber(water)}
          </AppText>
          <AppText variant="callout" tone="secondary">
            of {formatNumber(target)} ml
          </AppText>
        </View>
        <Progress value={percent} height={8} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <AppText variant="footnote" tone="tertiary">
            {percent}% of target
          </AppText>
          <AppText variant="footnote" tone="tertiary">
            {formatNumber(Math.max(0, target - water))} ml left
          </AppText>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: space.md }}>
        <View style={{ flex: 1 }}>
          <Button label="+250 ml" onPress={() => add(250)} loading={addWater.isPending} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label="+500 ml" variant="secondary" onPress={() => add(500)} loading={addWater.isPending} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label="+1 L" variant="secondary" onPress={() => add(1000)} loading={addWater.isPending} />
        </View>
      </View>

      <SectionHeader title="Daily target" />
      <View style={{ gap: space.lg }}>
        <TextField label="Target ml" value={targetText} onChangeText={setTargetText} keyboardType="number-pad" maxLength={4} />
        <Button label="Save target" onPress={saveTarget} loading={setWaterTarget.isPending} />
      </View>

      <SectionHeader title="Reminders" caption="Daily nudges at 10:00, 13:00, 16:00 and 19:00" />
      <View style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="callout">Hydration reminders</AppText>
            <AppText variant="footnote" tone="tertiary">
              Four reminders a day
            </AppText>
          </View>
          <Switch value={reminderState.enabled} onValueChange={toggleReminders} accessibilityLabel="Hydration reminders" />
        </View>
        {reminderState.enabled ? (
          <Button label="Send test notification" variant="secondary" size="small" onPress={() => void reminderState.test()} />
        ) : null}
        {reminderState.message ? (
          <AppText variant="footnote" tone="secondary">
            {reminderState.message}
          </AppText>
        ) : null}
      </View>

      {message ? (
        <AppText variant="footnote" tone="secondary">
          {message}
        </AppText>
      ) : null}
    </Screen>
  );
}
