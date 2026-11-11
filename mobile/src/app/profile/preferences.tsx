import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { Switch } from '@/components/ui/switch';
import { useProfile } from '@/features/profile/use-profile';
import { FEATURE_FLAGS, readFeatureFlags, type FeatureFlagKey } from '@/lib/feature-flags';
import { space, useTheme } from '@/theme';

export default function PreferencesScreen() {
  const { colors } = useTheme();
  const { data, isPending, isError, error, refetch, savePreferences } = useProfile();
  const [flags, setFlags] = useState<Record<FeatureFlagKey, boolean>>(() => readFeatureFlags(null));
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setFlags(readFeatureFlags(data?.profile?.data_preferences));
  }, [data?.profile?.data_preferences]);

  const update = (key: FeatureFlagKey, value: boolean) => {
    setFlags((current) => ({ ...current, [key]: value }));
    setMessage(null);
  };

  const save = async () => {
    try {
      await savePreferences.mutateAsync(flags);
      setMessage('Preferences saved.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not save preferences.');
    }
  };

  return (
    <Screen safeAreaTop={false}>
      {isPending ? <LoadingState rows={4} /> : null}
      {isError ? <ErrorState message={error.message} onRetry={refetch} /> : null}

      <SectionHeader title="What to track" />
      <Card padded={false} style={{ paddingHorizontal: space.xl }}>
        {FEATURE_FLAGS.map((flag, index) => (
          <View
            key={flag.key}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.md,
              paddingVertical: space.md,
              minHeight: 56,
              borderBottomWidth: index === FEATURE_FLAGS.length - 1 ? 0 : 1,
              borderBottomColor: colors.separator,
            }}
          >
            <View style={{ flex: 1, gap: 1 }}>
              <AppText variant="callout">{flag.label}</AppText>
              <AppText variant="footnote" tone="tertiary">
                {flag.caption}
              </AppText>
            </View>
            <Switch
              accessibilityLabel={flag.label}
              value={flags[flag.key]}
              onValueChange={(value) => update(flag.key, value)}
            />
          </View>
        ))}
      </Card>

      {message ? (
        <AppText variant="footnote" tone={message === 'Preferences saved.' ? 'secondary' : 'danger'}>
          {message}
        </AppText>
      ) : null}
      <Button label="Save changes" onPress={save} loading={savePreferences.isPending} />
    </Screen>
  );
}