import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Icon, type IconName } from '@/components/ui/icon';
import { Sheet } from '@/components/ui/sheet';
import { openAdd } from '@/lib/navigation';
import { space, useTheme } from '@/theme';

interface QuickLogProps {
  visible: boolean;
  onClose: () => void;
}

const ACTIONS: Array<{
  key: string;
  label: string;
  caption: string;
  icon: IconName;
  open: () => void;
}> = [
  {
    key: 'water',
    label: 'Water',
    caption: 'Open hydration',
    icon: 'water',
    open: () => router.push('/hydration' as never),
  },
  {
    key: 'mood',
    label: 'Mood check-in',
    caption: 'Mood, stress, energy, anxiety',
    icon: 'brain',
    open: () => openAdd('mental'),
  },
  {
    key: 'food',
    label: 'Food',
    caption: 'Search, scan, or build a meal',
    icon: 'food',
    open: () => router.push('/meal-builder' as never),
  },
  {
    key: 'expense',
    label: 'Expense',
    caption: 'Log money in or out',
    icon: 'wallet',
    open: () => openAdd('transaction'),
  },
  {
    key: 'contact',
    label: 'Contact',
    caption: 'Log time with someone',
    icon: 'message',
    open: () => openAdd('interaction'),
  },
  {
    key: 'sleep',
    label: 'Sleep',
    caption: 'Hours and quality',
    icon: 'bed',
    open: () => openAdd('sleep'),
  },
];

/** The one-tap entry point shared by every tab. */
export const QuickLog = ({ visible, onClose }: QuickLogProps) => {
  const { colors } = useTheme();

  return (
    <Sheet
      compact
      visible={visible}
      title="Quick log"
      subtitle="Add one thing without leaving the day."
      onClose={onClose}
    >
      <View>
        {ACTIONS.map((action, index) => (
          <Pressable
            key={action.key}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            onPress={() => {
              onClose();
              action.open();
            }}
            style={({ pressed }) => ({
              minHeight: 56,
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.md,
              borderTopWidth: index === 0 ? 0 : 1,
              borderTopColor: colors.separator,
              opacity: pressed ? 0.65 : 1,
            })}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: colors.surfaceSunken,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name={action.icon} size={18} color={colors.textSecondary} />
            </View>
            <View style={{ flex: 1, gap: 1 }}>
              <AppText variant="callout">{action.label}</AppText>
              <AppText variant="footnote" tone="tertiary">
                {action.caption}
              </AppText>
            </View>
            <Icon name="chevron" size={14} color={colors.textTertiary} />
          </Pressable>
        ))}
      </View>
    </Sheet>
  );
};
