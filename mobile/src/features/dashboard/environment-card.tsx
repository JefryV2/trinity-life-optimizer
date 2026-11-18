import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Panel } from '@/components/ui/panel';
import { useEnvironment } from '@/features/dashboard/use-environment';
import { aqiColor, uvColor, uvLabel } from '@/lib/health-colors';
import { radius, space, useTheme } from '@/theme';

/**
 * Local conditions are useful, not essential. Nothing asks for location until
 * the user chooses to check; the empty tiles keep the promise visible.
 */
export const EnvironmentCard = () => {
  const { colors } = useTheme();
  const [enabled, setEnabled] = useState(false);
  const environment = useEnvironment(enabled);

  const check = () => {
    if (enabled) void environment.refetch();
    else setEnabled(true);
  };

  const data = environment.data;
  const air = data?.aqi != null ? `${data.aqi} · ${data.label}` : '—';
  const uv = data?.uv != null ? `${data.uv.toFixed(1)} · ${uvLabel(data.uv)}` : '—';

  const Tile = ({
    label,
    value,
    color,
  }: {
    label: string;
    value: string;
    color: string;
  }) => (
    <View
      style={{
        flex: 1,
        minHeight: 46,
        justifyContent: 'center',
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: colors.border,
        borderRadius: radius.inner,
        paddingHorizontal: space.md,
      }}
    >
      <View style={{ gap: 2 }}>
        <AppText variant="footnote" tone="secondary" numberOfLines={1}>
          {label}
        </AppText>
        <AppText
          variant="callout"
          style={{ color: value === '—' ? colors.textTertiary : color, fontWeight: '600' }}
          numberOfLines={1}
        >
          {value}
        </AppText>
      </View>
    </View>
  );

  return (
    <Panel style={{ gap: space.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md }}>
        <View style={{ flex: 1, gap: 1 }}>
          <AppText variant="headline">Around you</AppText>
          <AppText variant="footnote" tone="tertiary">
            Location only when you tap
          </AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Check local conditions"
          onPress={check}
          style={({ pressed }) => ({
            minHeight: 40,
            paddingHorizontal: space.lg,
            borderRadius: radius.pill,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.72 : 1,
          })}
        >
          <AppText variant="callout" style={{ color: colors.onPrimary, fontWeight: '700' }}>
            Check
          </AppText>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <Tile label="Air quality" value={air} color={aqiColor(data?.aqi ?? null)} />
        <Tile label="UV index" value={uv} color={uvColor(data?.uv ?? null)} />
      </View>

      {environment.isError ? (
        <AppText variant="footnote" tone="danger">
          {environment.error.message}
        </AppText>
      ) : null}
    </Panel>
  );
};
