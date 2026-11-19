import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

import { FormFrame } from '@/components/form-frame';
import { CalendarSheet } from '@/components/ui/calendar-sheet';
import { Screen } from '@/components/ui/screen';
import { Sheet } from '@/components/ui/sheet';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icon';
import { Chips } from '@/components/ui/chips';
import { TextField } from '@/components/ui/text-field';
import { useSettings } from '@/features/settings/use-settings';
import { useWealth } from '@/features/wealth/use-wealth';
import { formatDate, formatNumber } from '@/lib/format';
import { useFormSubmit } from '@/lib/use-form-submit';
import { fonts, radius, space, useTheme } from '@/theme';

const parseNumber = (text: string): number => Number(text.replace(',', '.'));

const ACCOUNT_TYPES: Array<{ value: string; label: string; icon: IconName }> = [
  { value: 'checking', label: 'Checking', icon: 'bank' },
  { value: 'savings', label: 'Savings', icon: 'wallet' },
  { value: 'cash', label: 'Cash', icon: 'cash' },
  { value: 'credit', label: 'Credit', icon: 'card' },
  { value: 'investment', label: 'Invest', icon: 'arrowUp' },
];

export const AccountForm = () => {
  const { colors } = useTheme();
  const { addAccount } = useWealth();
  const { currency: preferredCurrency } = useSettings();
  const { saving, error, setError, submit } = useFormSubmit();
  const [name, setName] = useState('');
  const [type, setType] = useState('checking');
  const [balance, setBalance] = useState('');
  const [currency, setCurrency] = useState(preferredCurrency);

  const save = () => {
    const amount = parseNumber(balance);
    if (!name.trim()) {
      setError('Name the account.');
      return;
    }
    if (!Number.isFinite(amount)) {
      setError('Enter the current balance.');
      return;
    }
    void submit(() =>
      addAccount.mutateAsync({
        name,
        type,
        balance: amount,
        currency: currency.trim().toUpperCase() || 'USD',
      }),
    );
  };

  return (
    <FormFrame
      title="Add account"
      submitLabel="Add account"
      loading={saving}
      error={error}
      onSubmit={save}
    >
      <View style={{ gap: space.xl }}>
        <TextField
          label="Account name"
          value={name}
          onChangeText={setName}
          placeholder="Main checking, emergency fund…"
          maxLength={60}
        />

        <View style={{ gap: space.sm }}>
          <AppText variant="caption" tone="secondary" style={{ letterSpacing: 0.8 }}>
            TYPE
          </AppText>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {ACCOUNT_TYPES.map((option) => {
              const selected = type === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => setType(option.value)}
                  style={({ pressed }) => ({
                    width: 64,
                    alignItems: 'center',
                    gap: 6,
                    opacity: pressed ? 0.65 : 1,
                  })}
                >
                  <View
                    style={{
                      width: 62,
                      height: 62,
                      borderRadius: radius.pill,
                      backgroundColor: selected ? colors.primary : colors.surfaceAlt,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon
                      name={option.icon}
                      size={26}
                      color={selected ? colors.onPrimary : colors.textSecondary}
                    />
                  </View>
                  <AppText
                    variant="footnote"
                    tone={selected ? 'primary' : 'secondary'}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                    style={{ fontWeight: selected ? '800' : '500', textAlign: 'center' }}
                  >
                    {option.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: space.md }}>
          <View style={{ flex: 2 }}>
            <TextField
              label="Balance"
              value={balance}
              onChangeText={setBalance}
              placeholder="1250.00"
              keyboardType="decimal-pad"
              maxLength={12}
            />
          </View>
          <View style={{ flex: 1 }}>
            <TextField
              label="Currency"
              value={currency}
              onChangeText={setCurrency}
              placeholder="USD"
              autoCapitalize="characters"
              maxLength={3}
            />
          </View>
        </View>
      </View>
    </FormFrame>
  );
};

const CATEGORIES = [
  { value: 'Food', label: 'Food' },
  { value: 'Transport', label: 'Transport' },
  { value: 'Shopping', label: 'Shopping' },
  { value: 'Bills', label: 'Bills' },
  { value: 'Health', label: 'Health' },
  { value: 'Fun', label: 'Fun' },
  { value: 'Salary', label: 'Salary' },
  { value: 'Other', label: 'Other' },
];

export const TransactionForm = ({ recordId }: { recordId?: string }) => {
  const { colors } = useTheme();
  const { data, addTransaction, updateTransaction } = useWealth();
  const { saving, error, setError, submit } = useFormSubmit();
  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState<'in' | 'out'>('out');
  const [category, setCategory] = useState('Food');
  const [accountId, setAccountId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date());
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [noteVisible, setNoteVisible] = useState(false);
  const [accountsVisible, setAccountsVisible] = useState(false);

  const accounts = data?.accounts ?? [];
  const existing = data?.transactions.find((record) => record.id === recordId);
  const accountName = accounts.find((account) => account.id === accountId)?.name ?? 'No account';
  const today = date.toDateString() === new Date().toDateString();

  useEffect(() => {
    if (!existing) return;
    setAmount(existing.amount.toFixed(2));
    setDirection(existing.direction === 'in' ? 'in' : 'out');
    setCategory(existing.category ?? 'Other');
    setAccountId(existing.account_id);
    setNote(existing.note ?? '');
    setDate(new Date(existing.occurred_at));
  }, [existing?.id]);

  const recent = Array.from(
    new Map(
      (data?.transactions ?? []).map((entry) => [
        `${entry.category ?? 'Other'}|${entry.amount}|${entry.note ?? ''}`,
        entry,
      ]),
    ).values(),
  ).slice(0, 6);

  const save = () => {
    const value = parseNumber(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }
    const input = {
      accountId,
      amount: value,
      direction,
      category,
      note,
      occurredAt: date.toISOString(),
    };
    void submit(() =>
      existing
        ? updateTransaction.mutateAsync({ id: existing.id, ...input })
        : addTransaction.mutateAsync(input),
    );
  };

  const pressKey = (key: string) => {
    setError(null);
    if (key === 'back') {
      setAmount((current) => (current.length <= 1 ? '' : current.slice(0, -1)));
      return;
    }
    if (key === '.') {
      setAmount((current) => (current.includes('.') ? current : current ? `${current}.` : '0.'));
      return;
    }
    setAmount((current) => {
      if (current.includes('.') && current.split('.')[1]?.length >= 2) return current;
      if (current.replace(/\D/g, '').length >= 7) return current;
      return current === '0' ? key : `${current}${key}`;
    });
  };

  return (
    <Screen contentContainerStyle={{ paddingTop: space.lg, paddingBottom: space.xxl, flexGrow: 1 }}>
      <View
        style={{
          alignSelf: 'center',
          width: 40,
          height: 4,
          borderRadius: 2,
          backgroundColor: colors.border,
          marginBottom: space.sm,
        }}
      />

      <AppText style={{ fontSize: 32, lineHeight: 38, fontFamily: fonts.black, letterSpacing: -1.2 }}>
        {existing ? 'Edit transaction' : 'Add transaction'}
      </AppText>

      <View
        style={{
          flexDirection: 'row',
          gap: 2,
          padding: 4,
          borderRadius: radius.pill,
          backgroundColor: colors.surfaceAlt,
        }}
      >
        {[
          { value: 'out' as const, label: 'Expense' },
          { value: 'in' as const, label: 'Income' },
        ].map((option) => {
          const selected = direction === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => setDirection(option.value)}
              style={({ pressed }) => ({
                flex: 1,
                minHeight: 48,
                borderRadius: radius.pill,
                backgroundColor: selected ? colors.primary : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <AppText
                tone={selected ? 'onPrimary' : 'secondary'}
                style={{ fontSize: 15, fontFamily: selected ? fonts.bold : fonts.medium }}
              >
                {option.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <View style={{ alignItems: 'center', gap: 2, paddingVertical: space.sm }}>
        <AppText variant="caption" tone="tertiary">
          Amount
        </AppText>
        <AppText
          style={{
            fontSize: 60,
            lineHeight: 66,
            fontFamily: fonts.black,
            letterSpacing: -3,
            fontVariant: ['tabular-nums'],
          }}
          numberOfLines={1}
          adjustsFontSizeToFit
          selectable
        >
          {amount || '0'}
        </AppText>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: space.sm }}
      >
        {recent.map((entry, index) => (
          <Pressable
            key={`${entry.id}-${index}`}
            accessibilityRole="button"
            onPress={() => {
              setAmount(entry.amount.toFixed(2));
              setDirection(entry.direction === 'in' ? 'in' : 'out');
              setCategory(entry.category ?? 'Other');
              setAccountId(entry.account_id);
              setNote(entry.note ?? '');
              setDate(new Date());
              setError(null);
            }}
            style={({ pressed }) => ({
              minHeight: 46,
              borderRadius: radius.pill,
              backgroundColor: colors.surfaceAlt,
              paddingHorizontal: space.lg,
              justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <AppText variant="callout" numberOfLines={1}>
              {entry.note || entry.category || 'Expense'} · {formatNumber(entry.amount)}
            </AppText>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: space.sm }}
      >
        {CATEGORIES.map((option) => {
          const selected = option.value === category;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => setCategory(option.value)}
              style={({ pressed }) => ({
                minHeight: 44,
                borderRadius: radius.pill,
                backgroundColor: selected ? colors.primarySoft : colors.surfaceAlt,
                borderWidth: 1,
                borderColor: selected ? colors.primary : 'transparent',
                paddingHorizontal: space.lg,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <AppText
                tone={selected ? 'primary' : 'secondary'}
                style={{ fontFamily: selected ? fonts.bold : fonts.medium }}
              >
                {option.label}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Choose account"
          onPress={() => setAccountsVisible(true)}
          style={({ pressed }) => ({
            flex: 1,
            minHeight: 48,
            borderRadius: radius.pill,
            backgroundColor: colors.surfaceAlt,
            paddingHorizontal: space.lg,
            justifyContent: 'center',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <AppText variant="callout" numberOfLines={1}>
            {accountName}
          </AppText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Choose date"
          onPress={() => setCalendarVisible(true)}
          style={({ pressed }) => ({
            minHeight: 48,
            borderRadius: radius.pill,
            backgroundColor: colors.surfaceAlt,
            paddingHorizontal: space.lg,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Icon name="calendar" size={16} color={colors.textSecondary} />
          <AppText variant="callout">{today ? 'Today' : formatDate(date)}</AppText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add a note"
          onPress={() => setNoteVisible(true)}
          style={({ pressed }) => ({
            width: 48,
            height: 48,
            borderRadius: radius.pill,
            backgroundColor: colors.surfaceAlt,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Icon name="edit" size={18} color={colors.primary} />
        </Pressable>
      </View>

      <View style={{ gap: space.sm }}>
        {[
          ['1', '2', '3'],
          ['4', '5', '6'],
          ['7', '8', '9'],
          ['.', '0', 'back'],
        ].map((row) => (
          <View key={row.join('-')} style={{ flexDirection: 'row', gap: space.sm }}>
            {row.map((key) => (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityLabel={key === 'back' ? 'Delete' : key}
                onPress={() => pressKey(key)}
                style={({ pressed }) => ({
                  flex: 1,
                  height: 58,
                  borderRadius: radius.inner,
                  backgroundColor: colors.surfaceAlt,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.62 : 1,
                })}
              >
                {key === 'back' ? (
                  <Icon name="backspace" size={23} color={colors.textSecondary} />
                ) : (
                  <AppText style={{ fontSize: 24, lineHeight: 30, fontFamily: fonts.bold }}>
                    {key}
                  </AppText>
                )}
              </Pressable>
            ))}
          </View>
        ))}
      </View>

      {error ? (
        <AppText variant="footnote" tone="danger" selectable>
          {error}
        </AppText>
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.md,
          marginTop: 'auto',
          paddingTop: space.md,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel"
          onPress={() => router.back()}
          style={({ pressed }) => ({
            width: 54,
            height: 54,
            borderRadius: radius.pill,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Icon name="back" size={21} color={colors.textSecondary} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={save}
          disabled={saving}
          style={({ pressed }) => ({
            flex: 1,
            minHeight: 58,
            borderRadius: radius.pill,
            backgroundColor: saving ? colors.surfaceSunken : colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <AppText
            tone={saving ? 'tertiary' : 'onPrimary'}
            style={{ fontSize: 17, fontFamily: fonts.bold }}
          >
            {existing ? 'Save changes' : 'Save transaction'}
          </AppText>
        </Pressable>
      </View>

      <CalendarSheet
        visible={calendarVisible}
        value={date}
        onClose={() => setCalendarVisible(false)}
        onSelect={setDate}
      />

      <Sheet
        compact
        visible={noteVisible}
        title="Note"
        subtitle="Optional"
        onClose={() => setNoteVisible(false)}
        footer={<Button label="Done" onPress={() => setNoteVisible(false)} />}
      >
        <TextField
          label="Note"
          value={note}
          onChangeText={setNote}
          placeholder="What was it for?"
          maxLength={140}
        />
      </Sheet>

      <Sheet
        compact
        visible={accountsVisible}
        title="Account"
        subtitle="Where the money moved"
        onClose={() => setAccountsVisible(false)}
      >
        <View>
          {[{ id: null, name: 'No account' }, ...accounts].map((account, index) => {
            const selected = account.id === accountId;
            return (
              <Pressable
                key={account.id ?? 'none'}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => {
                  setAccountId(account.id);
                  setAccountsVisible(false);
                }}
                style={{
                  minHeight: 54,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.md,
                  borderBottomWidth: index === accounts.length ? 0 : 1,
                  borderBottomColor: colors.separator,
                }}
              >
                <AppText variant="callout" style={{ flex: 1 }}>
                  {account.name}
                </AppText>
                {selected ? <Icon name="check" size={18} color={colors.primary} /> : null}
              </Pressable>
            );
          })}
        </View>
      </Sheet>
    </Screen>
  );
};

export const BudgetForm = () => {
  const { addBudget } = useWealth();
  const { saving, error, setError, submit } = useFormSubmit();
  const [category, setCategory] = useState('');
  const [limit, setLimit] = useState('');
  const [period, setPeriod] = useState('monthly');

  const save = () => {
    const value = parseNumber(limit);
    if (!category.trim()) {
      setError('Which category does this budget cover?');
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      setError('Set a limit greater than zero.');
      return;
    }
    void submit(() => addBudget.mutateAsync({ category, limit: value, period }));
  };

  return (
    <FormFrame
      title="New budget"
      submitLabel="Create budget"
      loading={saving}
      error={error}
      onSubmit={save}
    >
      <View style={{ gap: space.xl }}>
        <TextField
          label="Category"
          value={category}
          onChangeText={setCategory}
          placeholder="Food, Transport, Shopping…"
          maxLength={40}
        />
        <TextField
          label="Limit"
          value={limit}
          onChangeText={setLimit}
          placeholder="400"
          keyboardType="decimal-pad"
          maxLength={10}
        />
        <Chips
          label="Period"
          options={[
            { value: 'monthly', label: 'Monthly' },
            { value: 'weekly', label: 'Weekly' },
          ]}
          value={period}
          onChange={setPeriod}
        />
      </View>
    </FormFrame>
  );
};

export const InvestmentForm = () => {
  const { colors } = useTheme();
  const { addInvestment } = useWealth();
  const { saving, error, setError, submit } = useFormSubmit();
  const [instrument, setInstrument] = useState('');
  const [units, setUnits] = useState('');
  const [avgCost, setAvgCost] = useState('');
  const [marketValue, setMarketValue] = useState('');

  const save = () => {
    const unitCount = parseNumber(units);
    const cost = parseNumber(avgCost);
    const value = parseNumber(marketValue);
    if (!instrument.trim()) {
      setError('Name the instrument (ticker, fund, asset).');
      return;
    }
    if (!Number.isFinite(unitCount) || unitCount <= 0 || !Number.isFinite(cost) || cost < 0) {
      setError('Enter units and average cost.');
      return;
    }
    void submit(() =>
      addInvestment.mutateAsync({
        instrument,
        units: unitCount,
        avgCost: cost,
        marketValue: Number.isFinite(value) ? value : unitCount * cost,
      }),
    );
  };

  return (
    <FormFrame
      title="Add position"
      submitLabel="Add position"
      loading={saving}
      error={error}
      onSubmit={save}
    >
      <View style={{ gap: space.xl }}>
        <View style={{ gap: 6 }}>
          <AppText variant="caption" tone="secondary" style={{ letterSpacing: 0.8 }}>
            INSTRUMENT
          </AppText>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.sm,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
              paddingBottom: space.sm,
            }}
          >
            <TextInput
              value={instrument}
              onChangeText={setInstrument}
              placeholder="VWCE, AAPL, Bitcoin…"
              placeholderTextColor={colors.textFaint}
              maxLength={40}
              style={{
                flex: 1,
                color: colors.text,
                fontSize: 24,
                padding: 0,
              }}
            />
            <Icon name="search" size={21} color={colors.textTertiary} />
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: space.lg }}>
          <View style={{ flex: 1 }}>
            <TextField
              label="Units"
              value={units}
              onChangeText={setUnits}
              placeholder="0"
              keyboardType="decimal-pad"
              maxLength={10}
            />
          </View>
          <View style={{ flex: 1 }}>
            <TextField
              label="Avg cost / unit"
              value={avgCost}
              onChangeText={setAvgCost}
              placeholder="0.00"
              keyboardType="decimal-pad"
              maxLength={12}
            />
          </View>
        </View>

        <View
          style={{
            backgroundColor: colors.surfaceAlt,
            borderRadius: radius.inner,
            paddingHorizontal: space.lg,
            paddingVertical: space.md,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: space.md,
          }}
        >
          <AppText variant="callout" tone="secondary">
            {`Cost basis · ${units || 0} × ${avgCost || 0}`}
          </AppText>
          <AppText variant="headline" tone="primary" style={{ fontVariant: ['tabular-nums'] }}>
            {(parseNumber(units) * parseNumber(avgCost) || 0).toFixed(2)}
          </AppText>
        </View>

        <TextField
          label="Current market value (optional)"
          value={marketValue}
          onChangeText={setMarketValue}
          placeholder="Defaults to units × avg cost"
          keyboardType="decimal-pad"
          maxLength={12}
        />
      </View>
    </FormFrame>
  );
};
