import { useEffect, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { FormFrame } from '@/components/form-frame';
import { AppText } from '@/components/ui/app-text';
import { Icon, type IconName } from '@/components/ui/icon';
import { Chips } from '@/components/ui/chips';
import { DateTimeField } from '@/components/ui/date-time-field';
import { RecentChips } from '@/components/ui/recent-chips';
import { TextField } from '@/components/ui/text-field';
import { useSettings } from '@/features/settings/use-settings';
import { useWealth } from '@/features/wealth/use-wealth';
import { useFormSubmit } from '@/lib/use-form-submit';
import { radius, space, useTheme } from '@/theme';

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
  const { data, addTransaction, updateTransaction } = useWealth();
  const { saving, error, setError, submit } = useFormSubmit();
  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState<'in' | 'out'>('out');
  const [category, setCategory] = useState('Food');
  const [accountId, setAccountId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date());

  const accounts = data?.accounts ?? [];
  const existing = data?.transactions.find((record) => record.id === recordId);

  useEffect(() => {
    if (!existing) return;
    setAmount(String(existing.amount));
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
  ).slice(0, 4);

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

  return (
    <FormFrame
      title={existing ? 'Edit transaction' : 'Add transaction'}
      submitLabel={existing ? 'Save changes' : 'Save transaction'}
      loading={saving}
      error={error}
      onSubmit={save}
    >
      <View style={{ gap: space.xl }}>
        <RecentChips
          options={recent.map((entry) => ({
            key: `${entry.category ?? 'Other'}|${entry.amount}|${entry.note ?? ''}`,
            label: `${entry.note || entry.category || 'Expense'} · ${entry.amount}`,
            onPress: () => {
              setAmount(String(entry.amount));
              setDirection(entry.direction === 'in' ? 'in' : 'out');
              setCategory(entry.category ?? 'Other');
              setAccountId(entry.account_id);
              setNote(entry.note ?? '');
              setDate(new Date());
            },
          }))}
        />
        <Chips
          label="Direction"
          options={[
            { value: 'out', label: 'Expense' },
            { value: 'in', label: 'Income' },
          ]}
          value={direction}
          onChange={setDirection}
        />
        <TextField
          label="Amount"
          value={amount}
          onChangeText={setAmount}
          placeholder="24.50"
          keyboardType="decimal-pad"
          maxLength={12}
        />
        <View style={{ gap: space.sm }}>
          <TextField
            label="Category"
            value={category}
            onChangeText={setCategory}
            placeholder="Food, Rent, Freelance…"
            maxLength={40}
          />
          <Chips options={CATEGORIES} value={category} onChange={setCategory} />
        </View>
        {accounts.length > 0 ? (
          <View style={{ gap: space.sm }}>
            <Chips
              label="Account"
              options={[
                { value: 'none', label: 'No account' },
                ...accounts.map((account) => ({ value: account.id, label: account.name })),
              ]}
              value={accountId ?? 'none'}
              onChange={(value) => setAccountId(value === 'none' ? null : value)}
            />
          </View>
        ) : null}
        <DateTimeField label="Date" value={date} onChange={setDate} />
        <TextField
          label="Note (optional)"
          value={note}
          onChangeText={setNote}
          placeholder="What was it for?"
          maxLength={140}
        />
      </View>
    </FormFrame>
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
