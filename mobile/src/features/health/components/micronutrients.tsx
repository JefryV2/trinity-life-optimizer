import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Progress } from '@/components/ui/progress';
import { SectionHeader } from '@/components/ui/section-header';
import type { FoodEntry } from '@/features/health/use-health';
import type { HealthProfile } from '@/features/profile/use-profile';
import {
  dailyNeeds,
  formatNutrientValue,
  hasMicronutrientData,
  sumMicronutrients,
} from '@/lib/nutrition';
import { space, useTheme } from '@/theme';

/**
 * Today's vitamins and minerals from food, against the needs for this profile.
 * A quiet two-column grid; the amount and the percentage both stay visible.
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
  const items = needs.items.filter((nutrient) => nutrient.featured);
  const hasData = hasMicronutrientData(entries);

  if (!hasData) return null;

  return (
    <View style={{ gap: space.sm }}>
      <SectionHeader title="Vitamins & minerals" caption={needs.label} />
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
          const percent = Math.round((value / nutrient.target) * 100);
          const met = percent >= 100;
          return (
            <View key={nutrient.key} style={{ width: '48%', gap: 4 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  gap: 6,
                }}
              >
                <AppText
                  variant="footnote"
                  tone="secondary"
                  numberOfLines={1}
                  style={{ flex: 1 }}
                >
                  {nutrient.label}
                </AppText>
                <AppText
                  variant="footnote"
                  style={{
                    fontVariant: ['tabular-nums'],
                    color: met ? colors.success : colors.text,
                  }}
                >
                  {percent}%
                </AppText>
              </View>
              <Progress
                value={percent}
                height={3}
                color={met ? colors.success : colors.primary}
              />
              <AppText
                variant="caption"
                tone="tertiary"
                style={{ fontVariant: ['tabular-nums'], textTransform: 'none', letterSpacing: 0 }}
              >
                {formatNutrientValue(value)} / {formatNutrientValue(nutrient.target)}{' '}
                {nutrient.unit}
              </AppText>
            </View>
          );
        })}
      </View>
    </View>
  );
};
