import * as Haptics from 'expo-haptics';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { RefreshControl, View } from 'react-native';

import { BarChart } from '@/components/charts/bar-chart';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DeletableRow } from '@/components/ui/deletable-row';
import { Icon } from '@/components/ui/icon';
import { ListRow } from '@/components/ui/list-row';
import { Progress } from '@/components/ui/progress';
import { Screen } from '@/components/ui/screen';
import { ScrollTabs } from '@/components/ui/scroll-tabs';
import { SectionHeader } from '@/components/ui/section-header';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { Stat, StatRow } from '@/components/ui/stat';
import { useWealth, type Budget, type Investment, type Transaction } from '@/features/wealth/use-wealth';
import { formatDate, formatMoney, formatNumber } from '@/lib/format';
import { openAdd, type WealthTab } from '@/lib/navigation';
import { buildSmartSpendingGroups } from '@/lib/spending-smart-groups';
import { space, useTheme } from '@/theme';

const OPTIONS: Array<{ value: WealthTab; label: string }> = [
  { value: 'overview', label: 'Overview' },
  { value: 'investments', label: 'Invest' },
  { value: 'expenses', label: 'Expenses' },
  { value: 'goals', label: 'Goals' },
];

const isWealthTab = (value: string): value is WealthTab =>
  OPTIONS.some((option) => option.value === value);

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

const accountName = (transactions: Transaction[], accounts: ReturnType<typeof useWealth>['data']) => {
  const map = new Map(accounts?.accounts.map((account) => [account.id, account.name]) ?? []);
  return (transaction: Transaction) =>
    transaction.account_id ? map.get(transaction.account_id) ?? 'Account' : 'No account';
};

export default function WealthHub() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<WealthTab>('overview');
  const { data, isPending, isError, error, refetch, isRefetching, removeTransaction, removeInvestment, removeBudget } =
    useWealth();

  useEffect(() => {
    if (params.tab && isWealthTab(params.tab)) setTab(params.tab);
  }, [params.tab]);

  const monthLabel = new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const metrics = useMemo(() => {
    const accounts = data?.accounts ?? [];
    const transactions = data?.transactions ?? [];
    const investments = data?.investments ?? [];
    const income = sum(transactions.filter((row) => row.direction === 'in').map((row) => row.amount));
    const expenses = sum(transactions.filter((row) => row.direction === 'out').map((row) => row.amount));
    const cash = sum(accounts.map((account) => Number(account.balance ?? 0)));
    const portfolio = sum(investments.map((investment) => Number(investment.market_value ?? 0)));
    const cost = sum(
      investments.map((investment) => Number(investment.units ?? 0) * Number(investment.avg_cost ?? 0)),
    );
    const netWorth = cash + portfolio;
    const savingsRate = income > 0 ? Math.round(((income - expenses) / income) * 100) : 0;
    return { income, expenses, cash, portfolio, cost, netWorth, savingsRate };
  }, [data]);

  const deleteTransaction = (transaction: Transaction) => {
    removeTransaction.mutate(transaction, {
      onSuccess: () => {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
    });
  };

  const deleteInvestment = (investment: Investment) => {
    removeInvestment.mutate(investment, {
      onSuccess: () => {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
    });
  };

  const deleteBudget = (budget: Budget) => {
    removeBudget.mutate(budget, {
      onSuccess: () => {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
    });
  };

  const getAccountName = accountName(data?.transactions ?? [], data);

  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => {
            void refetch();
          }}
          tintColor={colors.primary}
        />
      }
    >
      <View style={{ gap: 2 }}>
        <AppText variant="title">Wealth</AppText>
        <AppText variant="footnote" tone="secondary">
          Accounts, spending, investments, and goals for {monthLabel}.
        </AppText>
      </View>

      <ScrollTabs options={OPTIONS} value={tab} onChange={setTab} />

      {isPending ? <LoadingState rows={4} /> : null}
      {isError ? <ErrorState message={error.message} onRetry={refetch} /> : null}

      {data && tab === 'overview' ? (
        <>
          <Card raised style={{ gap: space.lg }}>
            <View style={{ gap: 2 }}>
              <AppText variant="caption" tone="tertiary">
                Net worth
              </AppText>
              <AppText variant="numeric" selectable style={{ fontSize: 40, lineHeight: 44 }}>
                {formatMoney(metrics.netWorth)}
              </AppText>
              <AppText variant="footnote" tone="secondary">
                Cash balances plus current investment market value.
              </AppText>
            </View>
            <StatRow>
              <Stat value={formatMoney(metrics.income)} label="Income" tone="success" />
              <Stat value={formatMoney(metrics.expenses)} label="Expenses" tone="danger" />
              <Stat value={`${metrics.savingsRate}%`} label="Savings rate" tone="primary" />
            </StatRow>
          </Card>

          <View style={{ flexDirection: 'row', gap: space.md }}>
            <View style={{ flex: 1 }}>
              <Button label="Transaction" variant="primary" onPress={() => openAdd('transaction')} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="Account" variant="secondary" onPress={() => openAdd('account')} />
            </View>
          </View>

          <SectionHeader title="Accounts" caption={`${data.accounts.length} tracked`} actionLabel="Add" onAction={() => openAdd('account')} />
          {data.accounts.length === 0 ? (
            <EmptyState
              icon="wallet"
              title="No accounts yet"
              message="Add your checking, savings, cash, or credit balances to calculate net worth."
              actionLabel="Add account"
              onAction={() => openAdd('account')}
            />
          ) : (
            <Card padded={false} style={{ paddingHorizontal: space.lg }}>
              {data.accounts.map((account, index) => (
                <ListRow
                  key={account.id}
                  icon="wallet"
                  title={account.name}
                  subtitle={account.type ?? 'Account'}
                  value={formatMoney(Number(account.balance ?? 0), account.currency ?? 'USD')}
                  last={index === data.accounts.length - 1}
                />
              ))}
            </Card>
          )}
        </>
      ) : null}

      {data && tab === 'investments' ? (
        <InvestmentsSegment
          investments={data.investments}
          portfolio={metrics.portfolio}
          cost={metrics.cost}
          onDelete={deleteInvestment}
        />
      ) : null}

      {data && tab === 'expenses' ? (
        <ExpensesSegment
          transactions={data.transactions}
          income={metrics.income}
          expenses={metrics.expenses}
          accountLabel={getAccountName}
          onDelete={deleteTransaction}
        />
      ) : null}

      {data && tab === 'goals' ? (
        <GoalsSegment budgets={data.budgets} transactions={data.transactions} onDelete={deleteBudget} />
      ) : null}
    </Screen>
  );
}

const InvestmentsSegment = ({
  investments,
  portfolio,
  cost,
  onDelete,
}: {
  investments: Investment[];
  portfolio: number;
  cost: number;
  onDelete: (investment: Investment) => void;
}) => {
  const { colors } = useTheme();
  const gain = portfolio - cost;
  const gainPct = cost > 0 ? Math.round((gain / cost) * 100) : 0;

  return (
    <>
      <Card raised style={{ gap: space.lg }}>
        <StatRow>
          <Stat value={formatMoney(portfolio)} label="Market value" tone="primary" />
          <Stat value={formatMoney(gain)} label={gain >= 0 ? 'Unrealized gain' : 'Unrealized loss'} tone={gain >= 0 ? 'success' : 'danger'} />
          <Stat value={`${gainPct}%`} label="Return" tone={gainPct >= 0 ? 'success' : 'danger'} />
        </StatRow>
        <Button label="Add holding" onPress={() => openAdd('investment')} icon={<Icon name="plus" size={18} color={colors.onPrimary} />} />
      </Card>

      <SectionHeader title="Holdings" caption="Long press a holding to remove it" />
      {investments.length === 0 ? (
        <EmptyState
          icon="chart"
          title="No holdings yet"
          message="Track units, average cost, and market value to see portfolio performance."
          actionLabel="Add investment"
          onAction={() => openAdd('investment')}
        />
      ) : (
        <Card padded={false} style={{ paddingHorizontal: space.lg }}>
          {investments.map((investment, index) => {
            const positionCost = Number(investment.units ?? 0) * Number(investment.avg_cost ?? 0);
            const value = Number(investment.market_value ?? 0);
            const positionGain = value - positionCost;
            return (
              <DeletableRow
                key={investment.id}
                icon="chart"
                title={investment.instrument}
                subtitle={`${formatNumber(Number(investment.units ?? 0))} units · avg ${formatMoney(Number(investment.avg_cost ?? 0))}`}
                value={`${formatMoney(value)} (${positionGain >= 0 ? '+' : ''}${formatMoney(positionGain)})`}
                last={index === investments.length - 1}
                onDelete={() => onDelete(investment)}
              />
            );
          })}
        </Card>
      )}
    </>
  );
};

const ExpensesSegment = ({
  transactions,
  income,
  expenses,
  accountLabel,
  onDelete,
}: {
  transactions: Transaction[];
  income: number;
  expenses: number;
  accountLabel: (transaction: Transaction) => string;
  onDelete: (transaction: Transaction) => void;
}) => {
  const { colors } = useTheme();
  const expenseRows = transactions.filter((row) => row.direction === 'out');
  const groups = buildSmartSpendingGroups(expenseRows);
  const topGroups = groups.slice(0, 7).map((group) => ({ label: group.label.split(' ')[0], value: group.total }));

  return (
    <>
      <Card raised style={{ gap: space.lg }}>
        <StatRow>
          <Stat value={formatMoney(income)} label="Income" tone="success" />
          <Stat value={formatMoney(expenses)} label="Expenses" tone="danger" />
          <Stat value={formatMoney(income - expenses)} label="Net cash flow" tone={income - expenses >= 0 ? 'success' : 'danger'} />
        </StatRow>
        <Button label="Add transaction" onPress={() => openAdd('transaction')} icon={<Icon name="plus" size={18} color={colors.onPrimary} />} />
      </Card>

      {groups.length > 0 ? (
        <Card style={{ gap: space.lg }}>
          <SectionHeader title="Smart spending groups" caption="Keyword grouping from category and note" />
          <BarChart data={topGroups} color={colors.amber} height={150} formatValue={(value) => formatMoney(value)} />
          <View style={{ gap: space.md }}>
            {groups.slice(0, 5).map((group) => (
              <View key={group.groupKey} style={{ gap: space.xs }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md }}>
                  <AppText variant="callout">{group.label}</AppText>
                  <AppText variant="footnote" tone="secondary">
                    {formatMoney(group.total)}
                  </AppText>
                </View>
                <Progress value={expenses > 0 ? (group.total / expenses) * 100 : 0} color={colors.amber} />
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      <SectionHeader title="Transactions" caption="Long press to delete and restore account balance" actionLabel="Add" onAction={() => openAdd('transaction')} />
      {transactions.length === 0 ? (
        <EmptyState
          icon="wallet"
          title="No transactions this month"
          message="Log income and expenses to see cash flow, smart groups, and budget usage."
          actionLabel="Add transaction"
          onAction={() => openAdd('transaction')}
        />
      ) : (
        <Card padded={false} style={{ paddingHorizontal: space.lg }}>
          {transactions.map((transaction, index) => (
            <DeletableRow
              key={transaction.id}
              icon={transaction.direction === 'in' ? 'arrowDown' : 'arrowUp'}
              title={transaction.note?.trim() || transaction.category || 'Transaction'}
              subtitle={`${transaction.category || 'Uncategorized'} · ${accountLabel(transaction)} · ${formatDate(transaction.occurred_at)}`}
              value={`${transaction.direction === 'in' ? '+' : '-'}${formatMoney(transaction.amount)}`}
              last={index === transactions.length - 1}
              onDelete={() => onDelete(transaction)}
            />
          ))}
        </Card>
      )}
    </>
  );
};

const GoalsSegment = ({
  budgets,
  transactions,
  onDelete,
}: {
  budgets: Budget[];
  transactions: Transaction[];
  onDelete: (budget: Budget) => void;
}) => {
  const { colors } = useTheme();
  const spentByCategory = new Map<string, number>();
  for (const transaction of transactions) {
    if (transaction.direction !== 'out') continue;
    const category = (transaction.category || 'Uncategorized').toLowerCase();
    spentByCategory.set(category, (spentByCategory.get(category) ?? 0) + transaction.amount);
  }

  return (
    <>
      <Card raised style={{ gap: space.lg }}>
        <AppText variant="headline">Budget goals</AppText>
        <AppText variant="footnote" tone="secondary">
          Set category limits and watch this month's spending update automatically.
        </AppText>
        <Button label="New budget" onPress={() => openAdd('budget')} icon={<Icon name="target" size={18} color={colors.onPrimary} />} />
      </Card>

      {budgets.length === 0 ? (
        <EmptyState
          icon="target"
          title="No budgets yet"
          message="Create a monthly or weekly category limit to keep spending intentional."
          actionLabel="Create budget"
          onAction={() => openAdd('budget')}
        />
      ) : (
        <View style={{ gap: space.lg }}>
          {budgets.map((budget) => {
            const spent = Math.max(Number(budget.spent_amount ?? 0), spentByCategory.get(budget.category.toLowerCase()) ?? 0);
            const percent = budget.limit_amount > 0 ? (spent / budget.limit_amount) * 100 : 0;
            const over = percent > 100;
            return (
              <Card key={budget.id} style={{ gap: space.md }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <AppText variant="headline">{budget.category}</AppText>
                    <AppText variant="caption" tone="tertiary">
                      {budget.period ?? 'monthly'} budget · long press row below to remove
                    </AppText>
                  </View>
                  <AppText variant="footnote" tone={over ? 'danger' : 'secondary'}>
                    {Math.round(percent)}%
                  </AppText>
                </View>
                <Progress value={percent} color={over ? colors.danger : colors.success} />
                <DeletableRow
                  title={`${formatMoney(spent)} spent`}
                  subtitle={`Limit ${formatMoney(budget.limit_amount)}`}
                  value={over ? `${formatMoney(spent - budget.limit_amount)} over` : `${formatMoney(budget.limit_amount - spent)} left`}
                  last
                  onDelete={() => onDelete(budget)}
                />
              </Card>
            );
          })}
        </View>
      )}
    </>
  );
};