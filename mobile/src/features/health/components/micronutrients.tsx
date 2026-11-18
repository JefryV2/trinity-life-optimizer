import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Panel } from '@/components/ui/panel';
import { Progress } from '@/components/ui/progress';
import type { FoodEntry } from '@/features/health/use-health';
import type { HealthProfile } from '@/features/profile/use-profile';
import { dailyNeeds, sumMicronutrients, type NutrientKey } from '@/lib/nutrition';
import { space, useTheme } from '@/theme';

const SHOWN: NutrientKey[] = [
  'vitaminA',
  'vitaminC',
  'vitaminD',
  'vitaminB12',
  'iron',
  'calcium',
  'magnesium',
  'zinc',
];

/**
 * Today's vitamins and minerals from food, against the needs for this profile.
 * Two columns, eight rows, one quiet bar each. A missing reading is shown as a
 * dash rather than a fabricated zero.
 */
export const MicronutrientPanel = ({
  entries,
  profile,
}: {
  entries: FoodEntry[];
  profile: HealthProfile | null;
}) => {
  const { colors } = useTheme();
  const needs = dailyNeeds(profile);
  const totals = sumMicronutrients(entries);
  const items = SHOWN.map((key) => needs.items.find((nutrient) => nutrient.key === key)).filter(
    (nutrient): nutrient is NonNullable<typeof nutrient> => Boolean(nutrient),
  );

  return (
    <Panel style={{ gap: space.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <AppText variant="headline">Micronutrients</AppText>
        <AppText variant="footnote" tone="tertiary">
          % of daily value
        </AppText>
      </View>

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          rowGap: space.lg,
        }}
      >
        {items.map((nutrient) => {
          const value = totals[nutrient.key] ?? 0;
          const known = value > 0;
          const percent = known ? Math.round((value / nutrient.target) * 100) : 0;
          return (
            <View key={nutrient.key} style={{ width: '48%', gap: 5 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  gap: 6,
                }}
              >
                <AppText variant="footnote" tone="secondary" numberOfLines={1} style={{ flex: 1 }}>
                  {nutrient.label}
                </AppText>
                <AppText
                  variant="footnote"
                  tone={known ? 'default' : 'tertiary'}
                  style={{ fontVariant: ['tabular-nums'] }}
                >
                  {known ? `${percent}%` : '—'}
                </AppText>
              </View>
              <Progress
                value={percent}
                height={4}
                color={known ? colors.primary : colors.surfaceSunken}
                trackColor={colors.surfaceSunken}
              />
            </View>
          );
        })}
      </View>
    </Panel>
  );
};
