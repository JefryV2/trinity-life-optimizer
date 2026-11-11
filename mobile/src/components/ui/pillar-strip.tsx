import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { radius, space, useTheme } from '@/theme';

export interface PillarItem {
  label: string;
  value: number;
  color: string;
}

/**
 * Health / Wealth / Bonds as three measured bars. Same encoding as the web
 * dashboard, so the colour means the same thing on every screen.
 */
export const PillarStrip = ({ items }: { items: PillarItem[] }) => {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {items.map((item) => {
        const value = Math.max(3, Math.min(100, Math.round(item.value)));
        return (
          <View key={item.label} style={{ flex: 1, gap: 6 }}>
            <View
              style={{
                height: 6,
                borderRadius: radius.pill,
                backgroundColor: colors.surfaceSunken,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  width: `${value}%`,
                  height: '100%',
                  borderRadius: radius.pill,
                  backgroundColor: item.color,
                }}
              />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <AppText variant="caption" tone="tertiary">
                {item.label}
              </AppText>
              <AppText variant="footnote" style={{ color: item.color }}>
                {value}
              </AppText>
            </View>
          </View>
        );
      })}
    </View>
  );
};

/** The one action worth taking next, chosen from the weakest pillar. */
export const Nudge = ({
  title,
  body,
  actionLabel,
  onPress,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  onPress?: () => void;
}) => {
  const { colors } = useTheme();
  return (
    <View style={{ gap: space.sm }}>
      <AppText variant="caption" tone="tertiary">
        ONE THING
      </AppText>
      <AppText variant="headline">{title}</AppText>
      <AppText variant="footnote" tone="secondary">
        {body}
      </AppText>
      {actionLabel && onPress ? (
        <AppText variant="footnote" tone="primary" onPress={onPress} style={{ paddingTop: 2 }}>
          {actionLabel} →
        </AppText>
      ) : null}
      <View style={{ height: 1, backgroundColor: colors.separator }} />
    </View>
  );
};
