import { useState } from 'react';
import { View } from 'react-native';

import { FormFrame } from '@/components/form-frame';
import { Card } from '@/components/ui/card';
import { Chips } from '@/components/ui/chips';
import { DateTimeField } from '@/components/ui/date-time-field';
import { TextField } from '@/components/ui/text-field';
import { useWealth } from '@/features/wealth/use-wealth';
import { useFormSubmit } from '@/lib/use-form-submit';
import { space } from '@/theme';

const parseNumber = (text: string): number => Number(text.replace(',', '.'));

const ACCOUNT_TYPES = [
  { value: 'checking', label: 'Checking' },
  { value: 'savings', label: 'Savings' },
  { value: 'cash', label: 'Cash' },
  { value: 'credit', label: 'Credit' },
  { value: 'investment', label: 'Investment' },
];

export const AccountForm = () => {
  const { addAccount } = useWealth();
  const { saving, error, setError, submit } = useFormSubmit();
  const [name, setName] = useState('');
  const [type, setType] = useState('checking');
  const [balance, setBalance] = useState('');
  const [currency, setCurrency] = useState('USD');

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
      subtitle="Net worth is the sum of these balances"
      submitLabel="Add account"
      loading={saving}
      error={error}
      onSubmit={save}
    >
      <Card style={{ gap: space.lg }}>
        <TextField
          label="Account name"
          value={name}
          onChangeText={setName}
          placeholder="Main checking, emergency fund…"
          maxLength={60}
        />
        <Chips options={ACCOUNT_TYPES} value={type} onChange={setType} />
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
      </Card>
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

export const TransactionForm = () => {
  const { data, addTransaction } = useWealth();
  const { saving, error, setError, submit } = useFormSubmit();
  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState<'in' | 'out'>('out');
  const [category, setCategory] = useState('Food');
  const [accountId, setAccountId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date());

  const accounts = data?.accounts ?? [];

  const save = () => {
    const value = parseNumber(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }
    void submit(() =>
      addTransaction.mutateAsync({
        accountId,
        amount: value,
        direction,
        category,
        note,
        occurredAt: date.toISOString(),
      }),
    );
  };

  return (
    <FormFrame
      title="Add transaction"
      subtitle="The account balance updates automatically"
      submitLabel="Save transaction"
      loading={saving}
      error={error}
      onSubmit={save}
    >
      <Card style={{ gap: space.lg }}>
        <Chips
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
      </Card>
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
      subtitle="Spending in this category counts against the limit"
      submitLabel="Create budget"
      loading={saving}
      error={error}
      onSubmit={save}
    >
      <Card style={{ gap: space.lg }}>
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
          options={[
            { value: 'monthly', label: 'Monthly' },
            { value: 'weekly', label: 'Weekly' },
          ]}
          value={period}
          onChange={setPeriod}
        />
      </Card>
    </FormFrame>
  );
};

export const InvestmentForm = () => {
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
      subtitle="Track what you hold and what it's worth"
      submitLabel="Add position"
      loading={saving}
      error={error}
      onSubmit={save}
    >
      <Card style={{ gap: space.lg }}>
        <TextField
          label="Instrument"
          value={instrument}
          onChangeText={setInstrument}
          placeholder="VWCE, AAPL, Bitcoin…"
          maxLength={40}
        />
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <View style={{ flex: 1 }}>
            <TextField
              label="Units"
              value={units}
              onChangeText={setUnits}
              placeholder="10"
              keyboardType="decimal-pad"
              maxLength={10}
            />
          </View>
          <View style={{ flex: 1 }}>
            <TextField
              label="Avg cost / unit"
              value={avgCost}
              onChangeText={setAvgCost}
              placeholder="95.20"
              keyboardType="decimal-pad"
              maxLength={12}
            />
          </View>
        </View>
        <TextField
          label="Current market value (optional)"
          value={marketValue}
          onChangeText={setMarketValue}
          placeholder="Defaults to units × avg cost"
          keyboardType="decimal-pad"
          maxLength={12}
        />
      </Card>
    </FormFrame>
  );
};