import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { radius, space, useTheme } from '@/theme';

export interface RecentOption {
  key: string;
  label: string;
  onPress: () => void;
}

export const RecentChips = ({ options }: { options: RecentOption[] }) => {
  const { colors } = useTheme();
  if (options.length === 0) return null;

  return (
    <View style={{ gap: space.sm }}>
      <AppText variant="caption" tone="tertiary" style={{ letterSpacing: 0.8 }}>
        RECENT
      </AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {options.map((option) => (
          <Pressable
            key={option.key}
            accessibilityRole="button"
            onPress={option.onPress}
            style={({ pressed }) => ({
              paddingHorizontal: space.md,
              paddingVertical: 7,
              borderRadius: radius.pill,
              borderWidth: 1,
              borderColor: colors.separator,
              backgroundColor: colors.surface,
              opacity: pressed ? 0.6 : 1,
              maxWidth: '100%',
            })}
          >
            <AppText variant="footnote" numberOfLines={1}>
              {option.label}
            </AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
};
