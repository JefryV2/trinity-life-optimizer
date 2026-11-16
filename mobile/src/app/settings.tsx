import { useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { BackLink } from '@/components/ui/back-link';
import { Card } from '@/components/ui/card';
import { Chips } from '@/components/ui/chips';
import { PageHeader } from '@/components/ui/page-header';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { TextField } from '@/components/ui/text-field';
import {
  useSettings,
  setCurrency,
  setHeightUnit,
  setWeightUnit,
  type HeightUnit,
  type WeightUnit,
} from '@/features/settings/use-settings';
import { isoDate, formatStamp } from '@/lib/format';
import { space } from '@/theme';

export default function SettingsScreen() {
  const settings = useSettings();
  const [currencyText, setCurrencyText] = useState(settings.currency);
  const [saved, setSaved] = useState(false);

  const saveCurrency = async () => {
    await setCurrency(currencyText);
    setSaved(true);
  };

  return (
    <Screen contentContainerStyle={{ paddingTop: space.xl }}>
      <BackLink />
      <PageHeader title="Units & currency" date={formatStamp()} />

      <SectionHeader title="Money" />
      <Card style={{ gap: space.md }}>
        <TextField
          label="Currency code"
          value={currencyText}
          onChangeText={(value) => {
            setCurrencyText(value.toUpperCase());
            setSaved(false);
          }}
          placeholder="USD"
          autoCapitalize="characters"
          maxLength={3}
          helper="Three-letter code, e.g. USD, EUR, GBP."
        />
        <Chips
          options={[
            { value: 'USD', label: 'USD' },
            { value: 'EUR', label: 'EUR' },
            { value: 'GBP', label: 'GBP' },
          ]}
          value={currencyText}
          onChange={(value) => {
            setCurrencyText(value);
            void setCurrency(value);
            setSaved(true);
          }}
        />
        <AppText variant="footnote" tone="tertiary">
          Used for every amount in Auxo. Existing accounts keep their own currency.
        </AppText>
        <AppText
          variant="footnote"
          tone={saved ? 'secondary' : 'tertiary'}
          onPress={() => void saveCurrency()}
          selectable
        >
          {saved ? 'Saved.' : 'Tap to save a custom code.'}
        </AppText>
      </Card>

      <SectionHeader title="Body" />
      <Card style={{ gap: space.lg }}>
        <View style={{ gap: space.sm }}>
          <AppText variant="callout">Weight</AppText>
          <Chips
            options={[
              { value: 'kg', label: 'Kilograms' },
              { value: 'lb', label: 'Pounds' },
            ]}
            value={settings.weightUnit}
            onChange={(value) => void setWeightUnit(value as WeightUnit)}
          />
        </View>
        <View style={{ gap: space.sm }}>
          <AppText variant="callout">Height</AppText>
          <Chips
            options={[
              { value: 'cm', label: 'Centimetres' },
              { value: 'in', label: 'Inches' },
            ]}
            value={settings.heightUnit}
            onChange={(value) => void setHeightUnit(value as HeightUnit)}
          />
        </View>
        <AppText variant="footnote" tone="tertiary">
          Stored values are converted automatically; nothing is rewritten.
        </AppText>
      </Card>
    </Screen>
  );
}
