import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';
import { fonts, radius, space, useTheme } from '@/theme';

type BackButtonProps = {
  fallback?: string;
  label?: string;
};

/** The single back affordance used at the top of every page. */
export const BackButton = ({ fallback = '/(tabs)', label = 'Back' }: BackButtonProps) => {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={10}
      onPress={() => {
        if (router.canGoBack()) router.back();
        else router.replace(fallback as never);
      }}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceAlt,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.55 : 1,
      })}
    >
      <Icon name="back" size={20} color={colors.textSecondary} />
    </Pressable>
  );
};

/** The same back affordance, sized to sit beside a primary footer button. */
export const FooterBackButton = ({ fallback = '/(tabs)', label = 'Back' }: BackButtonProps) => {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={() => {
        if (router.canGoBack()) router.back();
        else router.replace(fallback as never);
      }}
      style={({ pressed }) => ({
        width: 56,
        height: 56,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceAlt,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Icon name="back" size={22} color={colors.textSecondary} />
    </Pressable>
  );
};

type DetailHeaderProps = {
  title: string;
  subtitle?: string;
  fallback?: string;
  right?: React.ReactNode;
};

/** Fixed height and typography so detail page titles never drift up or down. */
export const DetailHeader = ({ title, subtitle, fallback, right }: DetailHeaderProps) => {
  return (
    <View style={{ gap: space.sm }}>
      <View
        style={{
          minHeight: 44,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: space.md,
        }}
      >
        <BackButton fallback={fallback} />
        {right}
      </View>
      <View style={{ gap: 1 }}>
        <AppText
          numberOfLines={1}
          style={{
            fontSize: 30,
            lineHeight: 36,
            fontFamily: fonts.black,
            letterSpacing: -1,
          }}
        >
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="footnote" tone="tertiary" numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
    </View>
  );
};
