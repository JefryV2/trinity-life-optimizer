import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, useWindowDimensions, View } from 'react-native';

import { Donut } from '@/components/charts/donut';
import { RingMeter } from '@/components/charts/ring-meter';
import { LineChart } from '@/components/charts/line-chart';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DeletableRow } from '@/components/ui/deletable-row';
import { ListRow } from '@/components/ui/list-row';
import { PageHeader } from '@/components/ui/page-header';
import { Progress } from '@/components/ui/progress';
import { Screen } from '@/components/ui/screen';
import { ScrollTabs } from '@/components/ui/scroll-tabs';
import { SwipeSteps } from '@/components/ui/swipe';
import { SectionHeader } from '@/components/ui/section-header';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { Stat, StatRow } from '@/components/ui/stat';
import { useWealth, type Budget, type Investment, type Transaction } from '@/features/wealth/use-wealth';
import { useNetWorthHistory } from '@/features/wealth/use-net-worth-history';
import { formatDate, formatMoney, formatNumber, formatStamp } from '@/lib/format';
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
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<WealthTab>('overview');
  const { data, isPending, isError, error, refetch, isRefetching, removeTransaction, removeInvestment, removeBudget } =
    useWealth();

  useEffect(() => {
    if (params.tab && isWealthTab(params.tab)) setTab(params.tab);
  }, [params.tab]);

  const history = useNetWorthHistory();

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
    const safeToSpend = Math.max(0, income - expenses - income * 0.2);
    return { income, expenses, cash, portfolio, cost, netWorth, savingsRate, safeToSpend };
  }, [data]);

  const deleteTransaction = (transaction: Transaction) => {
    removeTransaction.mutate(transaction, {
      onSuccess: () => {
      },
    });
  };

  const deleteInvestment = (investment: Investment) => {
    removeInvestment.mutate(investment, {
      onSuccess: () => {
      },
    });
  };

  const deleteBudget = (budget: Budget) => {
    removeBudget.mutate(budget, {
      onSuccess: () => {
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
      <PageHeader
        title="Wealth"
        date={formatStamp()}
        subtitle="Accounts, spending, investments and goals"
      />

      <ScrollTabs options={OPTIONS} value={tab} onChange={setTab} />

      <SwipeSteps
        index={Math.max(0, OPTIONS.findIndex((option) => option.value === tab))}
        count={OPTIONS.length}
        onChange={(next) => setTab(OPTIONS[next].value)}
      >
      {isPending ? <LoadingState rows={4} /> : null}
      {isError ? <ErrorState message={error.message} onRetry={refetch} /> : null}

      {data && tab === 'overview' ? (
        <>
          <Card raised style={{ gap: space.xl }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: space.md }}>
              <View style={{ gap: space.xs }}>
                <AppText variant="footnote" tone="secondary">
                  Net worth
                </AppText>
                <AppText variant="numeric" selectable>
                  {formatMoney(metrics.netWorth)}
                </AppText>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 2 }}>
                <AppText variant="caption" tone="tertiary">
                  SAFE TO SPEND
                </AppText>
                <AppText variant="headline" style={{ color: colors.primary }}>
                  {formatMoney(metrics.safeToSpend)}
                </AppText>
              </View>
            </View>
            <View style={{ height: 1, backgroundColor: colors.separator }} />
            <StatRow>
              <Stat value={formatMoney(metrics.income)} label="Income" />
              <Stat value={formatMoney(metrics.expenses)} label="Expenses" />
              <Stat value={`${metrics.savingsRate}%`} label="Savings rate" tone="primary" />
            </StatRow>
          </Card>

          {(history.data?.length ?? 0) > 1 ? (
            <Card style={{ gap: space.md }}>
              <SectionHeader title="Net worth" caption="Last 30 days" />
              <LineChart
                values={(history.data ?? []).map((point) => point.netWorth)}
                width={Math.min(720, width) - 80}
                height={150}
                maxValue={Math.max(1, ...(history.data ?? []).map((point) => point.netWorth))}
              />
            </Card>
          ) : null}

          <View style={{ flexDirection: 'row', gap: space.md }}>
            <View style={{ flex: 1 }}>
              <Button label="Add transaction" onPress={() => openAdd('transaction')} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="Add account" variant="secondary" onPress={() => openAdd('account')} />
            </View>
          </View>

          <SectionHeader title="Accounts" actionLabel="Add" onAction={() => openAdd('account')} />
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
                  title={account.name}
                  subtitle={account.type ? account.type[0].toUpperCase() + account.type.slice(1) : 'Account'}
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
      </SwipeSteps>
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
      <Card raised style={{ gap: space.xl }}>
        <StatRow>
          <Stat value={formatMoney(portfolio)} label="Market value" />
          <Stat
            value={formatMoney(gain)}
            label={gain >= 0 ? 'Unrealized gain' : 'Unrealized loss'}
            tone={gain >= 0 ? 'success' : 'danger'}
          />
          <Stat
            value={`${gainPct}%`}
            label="Return"
            tone={gainPct >= 0 ? 'success' : 'danger'}
          />
        </StatRow>
        <Button label="Add holding" onPress={() => openAdd('investment')} />
      </Card>

      <SectionHeader title="Holdings" />
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
  const donutColors = [colors.primary, colors.amber, colors.bonds, colors.success, colors.danger];

  return (
    <>
      <Card raised style={{ gap: space.xl }}>
        <StatRow>
          <Stat value={formatMoney(income)} label="Income" />
          <Stat value={formatMoney(expenses)} label="Expenses" />
          <Stat
            value={formatMoney(income - expenses)}
            label="Net cash flow"
            tone={income - expenses >= 0 ? 'success' : 'danger'}
          />
        </StatRow>
        <Button label="Add transaction" onPress={() => openAdd('transaction')} />
      </Card>

      {groups.length > 0 ? (
        <>
          <SectionHeader title="Spending" />
          <Card style={{ gap: space.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
              <Donut
                size={150}
                stroke={18}
                segments={groups.slice(0, 5).map((group, index) => ({
                  key: group.groupKey,
                  label: group.label,
                  value: group.total,
                  color: donutColors[index % donutColors.length],
                }))}
                centerValue={formatMoney(expenses)}
                centerLabel="total"
              />
              <View style={{ flex: 1, gap: 7 }}>
                {groups.slice(0, 5).map((group, index) => (
                  <View
                    key={group.groupKey}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                  >
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: donutColors[index % donutColors.length],
                      }}
                    />
                    <AppText variant="footnote" tone="secondary" style={{ flex: 1 }}>
                      {group.label}
                    </AppText>
                    <AppText variant="footnote" style={{ fontVariant: ['tabular-nums'] }}>
                      {formatMoney(group.total)}
                    </AppText>
                  </View>
                ))}
              </View>
            </View>
          </Card>
        </>
      ) : null}

      <SectionHeader
        title="Transactions"
        actionLabel="Add"
        onAction={() => openAdd('transaction')}
      />
      {transactions.length === 0 ? (
        <EmptyState
          icon="wallet"
          title="No transactions this month"
          message="Log income and expenses to see cash flow and budget usage."
          actionLabel="Add transaction"
          onAction={() => openAdd('transaction')}
        />
      ) : (
        <Card padded={false} style={{ paddingHorizontal: space.lg }}>
          {transactions.map((transaction, index) => (
            <DeletableRow
              key={transaction.id}
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
      <SectionHeader title="Budgets" actionLabel="New" onAction={() => openAdd('budget')} />

      {budgets.length === 0 ? (
        <EmptyState
          icon="target"
          title="No budgets yet"
          message="Create a monthly or weekly category limit to keep spending intentional."
          actionLabel="Create budget"
          onAction={() => openAdd('budget')}
        />
      ) : (
        <View style={{ gap: space.md }}>
          {budgets.map((budget) => {
            const spent = Math.max(
              Number(budget.spent_amount ?? 0),
              spentByCategory.get(budget.category.toLowerCase()) ?? 0,
            );
            const percent = budget.limit_amount > 0 ? (spent / budget.limit_amount) * 100 : 0;
            const over = percent > 100;
            return (
              <Pressable
                key={budget.id}
                accessibilityRole="button"
                accessibilityHint="Long press to delete this budget"
                onLongPress={() => onDelete(budget)}
                delayLongPress={350}
              >
                <Card style={{ gap: space.sm }}>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.md }}>
                    <AppText variant="callout" style={{ flex: 1 }}>
                      {budget.category}
                    </AppText>
                    <AppText variant="footnote" tone="secondary" style={{ fontVariant: ['tabular-nums'] }}>
                      {formatMoney(spent)} / {formatMoney(budget.limit_amount)}
                    </AppText>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                    <RingMeter
                      value={Math.min(percent, 100)}
                      max={100}
                      size={48}
                      stroke={5}
                      color={over ? colors.danger : colors.primary}
                      center={`${Math.round(percent)}%`}
                    />
                    <AppText variant="footnote" tone={over ? 'danger' : 'tertiary'} style={{ flex: 1 }}>
                      {over
                        ? `${formatMoney(spent - budget.limit_amount)} over`
                        : `${formatMoney(budget.limit_amount - spent)} left`}
                    </AppText>
                  </View>
                </Card>
              </Pressable>
            );
          })}
        </View>
      )}
    </>
  );
};
