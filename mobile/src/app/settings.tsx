import { useEffect, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Icon, type IconName } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';
import { PillSegmented } from '@/components/ui/pill-segmented';
import { Screen } from '@/components/ui/screen';
import {
  useSettings,
  setCurrency,
  setHeightUnit,
  setWeightUnit,
  type HeightUnit,
  type WeightUnit,
} from '@/features/settings/use-settings';
import { formatStamp } from '@/lib/format';
import { fonts, radius, space, useTheme } from '@/theme';

const PRESETS = [
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
  { value: 'GBP', label: 'GBP' },
] as const;

type CurrencyChoice = 'USD' | 'EUR' | 'GBP' | 'CUSTOM';

const symbolFor = (code: string) => {
  if (code === 'EUR') return '€';
  if (code === 'GBP') return '£';
  return '$';
};

const SectionTitle = ({ icon, title }: { icon: IconName; title: string }) => {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: radius.pill,
          backgroundColor: colors.surfaceAlt,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} size={21} color={colors.textSecondary} />
      </View>
      <AppText variant="headline" style={{ fontSize: 25, lineHeight: 29 }}>
        {title}
      </AppText>
    </View>
  );
};

const InfoLine = ({ children }: { children: string }) => {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.sm }}>
      <View style={{ paddingTop: 2 }}>
        <Icon name="info" size={18} color={colors.textTertiary} />
      </View>
      <AppText variant="footnote" tone="tertiary" style={{ flex: 1, lineHeight: 21 }}>
        {children}
      </AppText>
    </View>
  );
};

export default function SettingsScreen() {
  const { colors } = useTheme();
  const settings = useSettings();
  const [currencyText, setCurrencyText] = useState(settings.currency);
  const [customMode, setCustomMode] = useState(
    !PRESETS.some((option) => option.value === settings.currency),
  );
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setCurrencyText(settings.currency);
    setCustomMode(!PRESETS.some((option) => option.value === settings.currency));
  }, [settings.currency]);

  const displayCurrency = /^[A-Z]{3}$/.test(currencyText)
    ? currencyText
    : settings.currency;
  const selectedCurrency: CurrencyChoice = customMode
    ? 'CUSTOM'
    : (displayCurrency as 'USD' | 'EUR' | 'GBP');

  const chooseCurrency = (choice: CurrencyChoice) => {
    if (choice === 'CUSTOM') {
      setCustomMode(true);
      setEditing(true);
      setSaved(false);
      return;
    }
    setCurrencyText(choice);
    setCustomMode(false);
    setEditing(false);
    setSaved(true);
    void setCurrency(choice);
  };

  const saveCurrency = () => {
    if (!/^[A-Z]{3}$/.test(currencyText)) return;
    void setCurrency(currencyText);
    setEditing(false);
    setSaved(true);
  };

  return (
    <Screen
      contentContainerStyle={{
        paddingTop: space.lg,
        paddingBottom: space.xxl,
        gap: space.xl,
      }}
    >
      <PageHeader
        back="/(tabs)/more"
        title="Units & currency"
        date={formatStamp()}
        rule={false}
      />

      <SectionTitle icon="cash" title="Money" />

      <View style={{ gap: space.sm }}>
        <AppText variant="caption" tone="secondary" style={{ letterSpacing: 1.2 }}>
          CURRENCY CODE
        </AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          {editing ? (
            <TextInput
              accessibilityLabel="Currency code"
              value={currencyText}
              onChangeText={(value) => {
                setCurrencyText(value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3));
                setSaved(false);
              }}
              onSubmitEditing={saveCurrency}
              placeholder="USD"
              placeholderTextColor={colors.textFaint}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={3}
              autoFocus
              style={{
                flex: 1,
                color: colors.text,
                fontFamily: fonts.black,
                fontSize: 54,
                lineHeight: 60,
                letterSpacing: -2,
                padding: 0,
              }}
            />
          ) : (
            <AppText
              selectable
              style={{
                flex: 1,
                fontFamily: fonts.black,
                fontSize: 54,
                lineHeight: 60,
                letterSpacing: -2,
              }}
            >
              {displayCurrency}
            </AppText>
          )}

          <View
            style={{
              width: 54,
              height: 54,
              borderRadius: radius.pill,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AppText
              style={{
                fontFamily: fonts.black,
                fontSize: 26,
                lineHeight: 30,
                color: colors.onPrimary,
              }}
            >
              {symbolFor(displayCurrency)}
            </AppText>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={editing ? 'Save currency' : 'Edit currency'}
            onPress={editing ? saveCurrency : () => setEditing(true)}
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
            <Icon name={editing ? 'check' : 'edit'} size={19} color={colors.textSecondary} />
          </Pressable>
        </View>
        <AppText variant="footnote" tone="tertiary">
          Three-letter code, e.g. USD, EUR, GBP.
        </AppText>
      </View>

      <PillSegmented
        options={[
          ...PRESETS.map((option) => ({ value: option.value, label: option.label })),
          { value: 'CUSTOM' as const, label: 'Custom' },
        ]}
        value={selectedCurrency}
        onChange={chooseCurrency}
      />

      <InfoLine>
        Used for every amount in Auxo. Existing accounts keep their own currency. Tap Custom
        to save your own code.
      </InfoLine>
      {saved ? (
        <AppText variant="footnote" tone="success">
          Saved.
        </AppText>
      ) : null}

      <SectionTitle icon="body" title="Body" />

      <View style={{ gap: space.sm }}>
        <AppText variant="headline" style={{ fontSize: 20, lineHeight: 24 }}>
          Weight
        </AppText>
        <PillSegmented
          options={[
            { value: 'kg' as WeightUnit, label: 'Kilograms' },
            { value: 'lb' as WeightUnit, label: 'Pounds' },
          ]}
          value={settings.weightUnit}
          onChange={(value) => void setWeightUnit(value)}
        />
      </View>

      <View style={{ gap: space.sm }}>
        <AppText variant="headline" style={{ fontSize: 20, lineHeight: 24 }}>
          Height
        </AppText>
        <PillSegmented
          options={[
            { value: 'cm' as HeightUnit, label: 'Centimetres' },
            { value: 'in' as HeightUnit, label: 'Inches' },
          ]}
          value={settings.heightUnit}
          onChange={(value) => void setHeightUnit(value)}
        />
      </View>

      <InfoLine>Stored values are converted automatically; nothing is rewritten.</InfoLine>
    </Screen>
  );
}
