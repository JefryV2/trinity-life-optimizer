import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { RefreshControl, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Screen } from '@/components/ui/screen';
import { ScrollTabs } from '@/components/ui/scroll-tabs';
import { FitnessSegment } from '@/features/health/components/segments/fitness';
import { HeartSegment } from '@/features/health/components/segments/heart';
import { MentalSegment } from '@/features/health/components/segments/mental';
import { NutritionSegment } from '@/features/health/components/segments/nutrition';
import { OverviewSegment } from '@/features/health/components/segments/overview';
import { SleepSegment } from '@/features/health/components/segments/sleep';
import { WomenSegment } from '@/features/health/components/segments/women';
import { useHealth } from '@/features/health/use-health';
import { useProfile } from '@/features/profile/use-profile';
import type { HealthTab } from '@/lib/navigation';
import { useTheme } from '@/theme';

const BASE_OPTIONS: Array<{ value: HealthTab; label: string }> = [
  { value: 'overview', label: 'Overview' },
  { value: 'nutrition', label: 'Nutrition' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'sleep', label: 'Sleep' },
  { value: 'mental', label: 'Mental' },
  { value: 'heart', label: 'Heart' },
];

const isHealthTab = (value: string): value is HealthTab =>
  BASE_OPTIONS.some((option) => option.value === value) || value === 'women';

export default function HealthHub() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<HealthTab>('overview');
  const { data: profileData } = useProfile();
  const { refetch, isRefetching } = useHealth();

  const female = profileData?.health?.gender === 'female';

  useEffect(() => {
    if (params.tab && isHealthTab(params.tab)) setTab(params.tab);
  }, [params.tab]);

  const options = female
    ? [...BASE_OPTIONS, { value: 'women' as const, label: "Women's" }]
    : BASE_OPTIONS;
  const active = tab === 'women' && !female ? 'overview' : tab;

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
    >
      <View style={{ gap: 2 }}>
        <AppText variant="title">Health</AppText>
        <AppText variant="footnote" tone="secondary">
          Body and mind, one pillar.
        </AppText>
      </View>

      <ScrollTabs options={options} value={active} onChange={setTab} />

      {active === 'overview' ? <OverviewSegment /> : null}
      {active === 'nutrition' ? <NutritionSegment /> : null}
      {active === 'fitness' ? <FitnessSegment /> : null}
      {active === 'sleep' ? <SleepSegment /> : null}
      {active === 'mental' ? <MentalSegment /> : null}
      {active === 'heart' ? <HeartSegment /> : null}
      {active === 'women' ? <WomenSegment /> : null}
    </Screen>
  );
}