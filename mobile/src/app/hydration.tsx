import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { AppText } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';
import { Panel } from '@/components/ui/panel';
import { Screen } from '@/components/ui/screen';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { Switch } from '@/components/ui/switch';
import { useHealth } from '@/features/health/use-health';
import { useReminders } from '@/features/health/use-reminders';
import { formatNumber } from '@/lib/format';
import { fonts, radius, space, useTheme } from '@/theme';

const TARGET_KEY = 'trinity.hydration.target';
const REMINDER_TIMES = ['10:00', '13:00', '16:00', '19:00'];

const HydrationRing = ({ value, target }: { value: number; target: number }) => {
  const { colors } = useTheme();
  const size = 224;
  const stroke = 14;
  const r = size / 2 - stroke / 2 - 1;
  const circumference = 2 * Math.PI * r;
  const ratio = Math.max(0, Math.min(1, target > 0 ? value / target : 0));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.surfaceSunken}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.primary}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference - ratio * circumference}
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={{ alignItems: 'center', gap: 1 }}>
        <AppText variant="caption" tone="tertiary">
          Water today
        </AppText>
        <AppText
          style={{
            fontSize: 50,
            lineHeight: 54,
            fontFamily: fonts.black,
            letterSpacing: -2.5,
            fontVariant: ['tabular-nums'],
          }}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {formatNumber(value)}
        </AppText>
        <AppText variant="callout" tone="secondary">
          of {formatNumber(target)} ml
        </AppText>
      </View>
    </View>
  );
};

export default function HydrationScreen() {
  const { colors } = useTheme();
  const { data, isPending, isError, error, refetch, isRefetching, addWater, setWaterTarget } =
    useHealth();
  const reminderState = useReminders();
  const [targetText, setTargetText] = useState('2500');

  const water = data?.hydration?.water_intake_ml ?? 0;
  const target = data?.hydration?.target_ml ?? (Number(targetText) || 2500);
  const percent = target > 0 ? Math.round((water / target) * 100) : 0;
  const remaining = Math.max(0, target - water);

  useEffect(() => {
    void AsyncStorage.getItem(TARGET_KEY).then((storedTarget) => {
      if (storedTarget) setTargetText(storedTarget);
    });
  }, []);

  useEffect(() => {
    if (data?.hydration?.target_ml) setTargetText(String(data.hydration.target_ml));
  }, [data?.hydration?.target_ml]);

  const add = (amount: number) => {
    addWater.mutate(amount);
  };

  const adjustTarget = (delta: number) => {
    const next = Math.min(8000, Math.max(500, (Number(targetText) || target) + delta));
    setTargetText(String(next));
    void AsyncStorage.setItem(TARGET_KEY, String(next));
    setWaterTarget.mutate(next);
  };

  const toggleReminders = (value: boolean) => {
    void (value ? reminderState.schedule() : reminderState.disable());
  };

  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => {
            void refetch();
          }}
          tintColor={colors.primary}
        />
      }
      contentContainerStyle={{ paddingTop: space.lg, paddingBottom: space.section, flexGrow: 1 }}
    >
      {isPending ? <LoadingState rows={3} /> : null}
      {isError ? <ErrorState message={error.message} onRetry={refetch} /> : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          hitSlop={10}
          style={{ width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="back" size={24} color={colors.text} />
        </Pressable>
        <AppText style={{ fontSize: 30, lineHeight: 36, fontFamily: fonts.black, letterSpacing: -1 }}>
          Hydration
        </AppText>
      </View>

      <View style={{ alignItems: 'center', gap: space.sm }}>
        <HydrationRing value={water} target={target} />
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <View
            style={{
              borderRadius: radius.pill,
              backgroundColor: 'rgba(198,242,78,0.14)',
              paddingHorizontal: space.lg,
              paddingVertical: 9,
            }}
          >
            <AppText variant="footnote" tone="primary" style={{ fontFamily: fonts.bold }}>
              {percent}% of target
            </AppText>
          </View>
          <View
            style={{
              borderRadius: radius.pill,
              backgroundColor: colors.surfaceAlt,
              paddingHorizontal: space.lg,
              paddingVertical: 9,
            }}
          >
            <AppText variant="footnote" tone="secondary" style={{ fontFamily: fonts.semibold }}>
              {formatNumber(remaining)} ml left
            </AppText>
          </View>
        </View>
      </View>

      <Panel style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Decrease daily target"
          onPress={() => adjustTarget(-250)}
          style={{
            width: 46,
            height: 46,
            borderRadius: radius.pill,
            backgroundColor: colors.surfaceSunken,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppText style={{ fontSize: 22, lineHeight: 24, fontFamily: fonts.medium }}>−</AppText>
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center', gap: 1 }}>
          <AppText variant="caption" tone="tertiary">
            Daily target
          </AppText>
          <AppText
            style={{ fontSize: 30, lineHeight: 34, fontFamily: fonts.black, letterSpacing: -1 }}
          >
            {formatNumber(target)}
            <AppText variant="footnote" tone="secondary">
              {' '}
              ml
            </AppText>
          </AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Increase daily target"
          onPress={() => adjustTarget(250)}
          style={{
            width: 46,
            height: 46,
            borderRadius: radius.pill,
            backgroundColor: colors.surfaceSunken,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppText style={{ fontSize: 22, lineHeight: 24, fontFamily: fonts.medium }}>+</AppText>
        </Pressable>
      </Panel>

      <Panel style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: radius.inner,
              backgroundColor: colors.surfaceSunken,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="bell" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1, gap: 1 }}>
            <AppText variant="callout" style={{ fontFamily: fonts.bold }}>
              Hydration reminders
            </AppText>
            <AppText variant="footnote" tone="tertiary">
              Four reminders a day
            </AppText>
          </View>
          <Switch
            value={reminderState.enabled}
            onValueChange={toggleReminders}
            accessibilityLabel="Hydration reminders"
          />
        </View>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          {REMINDER_TIMES.map((time) => (
            <View
              key={time}
              style={{
                flex: 1,
                minHeight: 38,
                borderRadius: radius.pill,
                backgroundColor: colors.surfaceSunken,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AppText variant="footnote" tone="tertiary" style={{ fontFamily: fonts.semibold }}>
                {time}
              </AppText>
            </View>
          ))}
        </View>
        {reminderState.message ? (
          <AppText variant="footnote" tone="secondary">
            {reminderState.message}
          </AppText>
        ) : null}
      </Panel>

      <View style={{ marginTop: 'auto', gap: space.sm, paddingTop: space.xxl }}>
        <AppText variant="caption" tone="tertiary" style={{ textAlign: 'center' }}>
          Quick add
        </AppText>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          {[
            { amount: 250, label: '+250 ml' },
            { amount: 500, label: '+500 ml' },
            { amount: 1000, label: '+1 L' },
          ].map((option, index) => (
            <Pressable
              key={option.amount}
              accessibilityRole="button"
              accessibilityLabel={`Add ${option.label}`}
              onPress={() => add(option.amount)}
              disabled={addWater.isPending}
              style={({ pressed }) => ({
                flex: 1,
                minHeight: 58,
                borderRadius: radius.pill,
                backgroundColor: index === 0 ? colors.primary : colors.surfaceAlt,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed || addWater.isPending ? 0.7 : 1,
              })}
            >
              <AppText
                tone={index === 0 ? 'onPrimary' : 'default'}
                style={{ fontSize: 17, fontFamily: fonts.bold }}
              >
                {option.label}
              </AppText>
            </Pressable>
          ))}
        </View>
      </View>
    </Screen>
  );
}
