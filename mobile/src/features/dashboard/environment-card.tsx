import { useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SectionHeader } from '@/components/ui/section-header';
import { Stat, StatRow } from '@/components/ui/stat';
import { useEnvironment } from '@/features/dashboard/use-environment';
import { aqiColor, pm25Color, uvColor, uvLabel } from '@/lib/health-colors';
import { space } from '@/theme';

/**
 * Local conditions are useful, not essential. Nothing asks for location until
 * the user chooses to check; Today no longer triggers a permission prompt on
 * first launch.
 */
export const EnvironmentCard = () => {
  const [enabled, setEnabled] = useState(false);
  const environment = useEnvironment(enabled);

  return (
    <View style={{ gap: space.md }}>
      <SectionHeader title="Around you" caption="Air and UV where you are" />
      <Card style={{ gap: space.lg }}>
        {!enabled ? (
          <>
            <AppText variant="footnote" tone="secondary">
              Check local air quality and UV. Auxo only asks for location when you
              choose this.
            </AppText>
            <Button
              label="Check local conditions"
              variant="secondary"
              size="small"
              onPress={() => setEnabled(true)}
            />
          </>
        ) : environment.isPending ? (
          <AppText variant="footnote" tone="secondary">
            Reading the air…
          </AppText>
        ) : environment.isError ? (
          <AppText variant="footnote" tone="danger">
            {environment.error.message}
          </AppText>
        ) : environment.data ? (
          <StatRow>
            <Stat
              value={environment.data.uv !== null ? environment.data.uv.toFixed(1) : '—'}
              label={`UV · ${uvLabel(environment.data.uv)}`}
              color={uvColor(environment.data.uv)}
            />
            <Stat
              value={environment.data.aqi !== null ? String(environment.data.aqi) : '—'}
              label={`Air · ${environment.data.label}`}
              color={aqiColor(environment.data.aqi)}
            />
            <Stat
              value={environment.data.pm25 !== null ? environment.data.pm25.toFixed(1) : '—'}
              label="PM2.5 µg/m³"
              color={pm25Color(environment.data.pm25)}
            />
          </StatRow>
        ) : null}
      </Card>
    </View>
  );
};
