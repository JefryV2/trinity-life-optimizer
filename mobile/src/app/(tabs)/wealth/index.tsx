import { useLocalSearchParams } from 'expo-router';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, TextInput, useWindowDimensions, View } from 'react-native';

import { Donut } from '@/components/charts/donut';
import { LineChart } from '@/components/charts/line-chart';
import { AppText } from '@/components/ui/app-text';
import { Icon, type IconName } from '@/components/ui/icon';
import { ListRow } from '@/components/ui/list-row';
import { PageHeader } from '@/components/ui/page-header';
import { Progress } from '@/components/ui/progress';
import { Screen } from '@/components/ui/screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { SwipeSteps } from '@/components/ui/swipe';
import { useSectionNav } from '@/features/navigation/section-nav';
import { useSettings } from '@/features/settings/use-settings';
import { useWealth, type Account, type Budget, type Investment, type Transaction } from '@/features/wealth/use-wealth';
import { useNetWorthHistory, type NetWorthPoint } from '@/features/wealth/use-net-worth-history';
import {
  formatDate,
  formatMoney,
  formatMoneyCents,
  formatNumber,
  formatStamp,
} from '@/lib/format';
import { openAdd, openEdit, WEALTH_SECTIONS, type WealthTab } from '@/lib/navigation';
import { buildSmartSpendingGroups } from '@/lib/spending-smart-groups';
import { fonts, radius, space, useTheme } from '@/theme';

const isWealthTab = (value: string): value is WealthTab =>
  WEALTH_SECTIONS.some((option) => option.value === value);

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

const money = (value: number) => formatMoneyCents(value);

const signedMoney = (value: number) =>
  `${value >= 0 ? '+' : ''}${formatMoneyCents(value)}`;

const wholeMoney = (value: number) => formatMoneyCents(value).replace(/\.00$/, '');

const splitMoney = (value: number) => {
  const formatted = formatMoneyCents(value);
  const dot = formatted.lastIndexOf('.');
  if (dot < 0) return { main: formatted, cents: '' };
  return { main: formatted.slice(0, dot), cents: formatted.slice(dot) };
};

const dayLabel = (value: string) => {
  const date = new Date(value);
  const today = new Date();
  return date.toDateString() === today.toDateString()
    ? `Today, ${formatDate(value)}`
    : formatDate(value);
};

type BudgetStatus = 'over' | 'near' | 'track';

const budgetStatus = (percent: number): BudgetStatus =>
  percent > 100 ? 'over' : percent >= 85 ? 'near' : 'track';

const txIcon = (category: string | null, note: string | null): IconName => {
  const blob = `${category ?? ''} ${note ?? ''}`.toLowerCase();
  if (/(grocer|market|supermarket|whole foods|trader joe|costco|safeway)/.test(blob)) return 'cart';
  if (/(food|dining|restaurant|coffee|cafe|lunch|dinner|takeout)/.test(blob)) return 'food';
  if (/(utility|utilities|electric|internet|wifi|bill|water|gas)/.test(blob)) return 'bolt';
  if (/(transport|uber|lyft|ride|car|fuel|metro|transit|train|flight)/.test(blob)) return 'car';
  if (/(shop|amazon|store|clothing|retail|target|walmart)/.test(blob)) return 'cart';
  if (/(income|salary|pay|refund|deposit)/.test(blob)) return 'arrowDown';
  return 'wallet';
};

const MoneyHero = ({
  value,
  cents = true,
  color,
  centsColor,
  size = 40,
}: {
  value: number;
  cents?: boolean;
  color?: string;
  centsColor?: string;
  size?: number;
}) => {
  const { colors } = useTheme();
  const parts = splitMoney(value);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 1 }}>
      <AppText
        variant="numeric"
        selectable
        style={{
          color: color ?? colors.text,
          fontSize: size,
          lineHeight: size + 4,
          fontWeight: '800',
        }}
      >
        {parts.main}
      </AppText>
      {cents && parts.cents ? (
        <AppText
          variant="numeric"
          selectable
          style={{
            color: centsColor ?? colors.textTertiary,
            fontSize: Math.round(size * 0.46),
            lineHeight: Math.round(size * 0.62),
            fontWeight: '700',
          }}
        >
          {parts.cents}
        </AppText>
      ) : null}
    </View>
  );
};

const Panel = ({
  children,
  style,
  padded = true,
  background,
}: {
  children: React.ReactNode;
  style?: object;
  padded?: boolean;
  background?: string;
}) => {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: background ?? colors.surfaceAlt,
          borderRadius: radius.group,
          padding: padded ? space.xl : 0,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const PlusCircle = ({
  onPress,
  label,
}: {
  onPress: () => void;
  label: string;
}) => {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.55 : 1,
      })}
    >
      <Icon name="plus" size={20} color={colors.text} />
    </Pressable>
  );
};

const PanelHeader = ({
  title,
  caption,
  action,
  onAction,
  onAdd,
  addLabel,
}: {
  title: string;
  caption?: string;
  action?: string;
  onAction?: () => void;
  onAdd?: () => void;
  addLabel?: string;
}) => (
  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md }}>
    <View style={{ flex: 1, gap: 1 }}>
      <AppText variant="headline">{title}</AppText>
      {caption ? (
        <AppText variant="footnote" tone="tertiary">
          {caption}
        </AppText>
      ) : null}
    </View>
    {action && onAction ? (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={action}
        onPress={onAction}
        hitSlop={8}
      >
        <AppText variant="callout" tone="primary" style={{ fontWeight: '600' }}>
          {action}
        </AppText>
      </Pressable>
    ) : null}
    {onAdd && addLabel ? <PlusCircle onPress={onAdd} label={addLabel} /> : null}
  </View>
);

const StatusPill = ({
  label,
  status,
}: {
  label: string;
  status: BudgetStatus | 'income';
}) => {
  const { colors } = useTheme();
  const tone = {
    over: {
      color: colors.danger,
      background: 'rgba(255,107,90,0.12)',
    },
    near: {
      color: colors.amber,
      background: 'rgba(255,176,32,0.12)',
    },
    track: {
      color: colors.primary,
      background: 'rgba(198,242,78,0.12)',
    },
    income: {
      color: colors.success,
      background: 'rgba(60,233,194,0.12)',
    },
  }[status];
  return (
    <View
      style={{
        minHeight: 28,
        paddingHorizontal: 12,
        borderRadius: 999,
        justifyContent: 'center',
        backgroundColor: tone.background,
      }}
    >
      <AppText variant="footnote" style={{ color: tone.color, fontWeight: '600' }}>
        {label}
      </AppText>
    </View>
  );
};

const TransactionRow = ({
  transaction,
  subtitle,
  last = false,
  onPress,
  onDelete,
}: {
  transaction: Transaction;
  subtitle: string;
  last?: boolean;
  onPress?: () => void;
  onDelete?: () => void;
}) => {
  const { colors } = useTheme();
  const income = transaction.direction === 'in';
  const row = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        paddingVertical: space.md,
        minHeight: 64,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.separator,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surfaceSunken,
        }}
      >
        <Icon
          name={txIcon(transaction.category, transaction.note)}
          size={18}
          color={colors.textSecondary}
        />
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <AppText variant="callout" numberOfLines={1}>
          {transaction.note?.trim() || transaction.category || 'Transaction'}
        </AppText>
        <AppText variant="footnote" tone="tertiary" numberOfLines={1}>
          {subtitle}
        </AppText>
      </View>
      <AppText
        variant="footnote"
        selectable
        style={{
          color: income ? colors.primary : colors.text,
          fontVariant: ['tabular-nums'],
        }}
      >
        {`${income ? '+' : '-'}${money(transaction.amount)}`}
      </AppText>
    </View>
  );

  if (!onPress && !onDelete) return row;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={onDelete ? 'Long press to delete' : undefined}
      onPress={onPress}
      onLongPress={onDelete}
      delayLongPress={350}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      {row}
    </Pressable>
  );
};

export default function WealthHub() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  useSettings();

  const params = useLocalSearchParams<{ tab?: string }>();
  const { wealth: tab, setWealth: setTab } = useSectionNav();
  const {
    data,
    isPending,
    isError,
    error,
    refetch,
    isRefetching,
    removeTransaction,
    removeInvestment,
    removeBudget,
  } = useWealth();

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
      investments.map(
        (investment) => Number(investment.units ?? 0) * Number(investment.avg_cost ?? 0),
      ),
    );
    const netWorth = cash + portfolio;
    const savingsRate = income > 0 ? Math.round(((income - expenses) / income) * 100) : 0;
    const safeToSpend = Math.max(0, income - expenses - income * 0.2);
    return { income, expenses, cash, portfolio, cost, netWorth, savingsRate, safeToSpend };
  }, [data]);

  const accountNameMap = useMemo(
    () => new Map(data?.accounts.map((account) => [account.id, account.name]) ?? []),
    [data?.accounts],
  );
  const accountLabel = (transaction: Transaction) =>
    transaction.account_id ? accountNameMap.get(transaction.account_id) ?? 'Account' : 'No account';

  const title =
    tab === 'investments'
      ? 'Investing'
      : tab === 'expenses'
        ? 'Expenses'
        : tab === 'goals'
          ? 'Budgets'
          : 'Wealth';

  const deleteTransaction = (transaction: Transaction) =>
    removeTransaction.mutate(transaction);
  const deleteInvestment = (investment: Investment) =>
    removeInvestment.mutate(investment);
  const deleteBudget = (budget: Budget) => removeBudget.mutate(budget);

  return (
    <Screen
      header={<PageHeader title={title} date={formatStamp()} rule={false} />}
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
      <SwipeSteps
        index={Math.max(0, WEALTH_SECTIONS.findIndex((option) => option.value === tab))}
        count={WEALTH_SECTIONS.length}
        onChange={(next) => setTab(WEALTH_SECTIONS[next].value)}
      >
        {isPending ? <LoadingState rows={4} /> : null}
        {isError ? <ErrorState message={error.message} onRetry={refetch} /> : null}

        {data && tab === 'overview' ? (
          <Overview
            accounts={data.accounts}
            transactions={data.transactions}
            metrics={metrics}
            history={history.data ?? []}
            chartWidth={Math.min(720, width) - 80}
            accountLabel={accountLabel}
            onSeeAll={() => setTab('expenses')}
            onAddAccount={() => openAdd('account')}
            onOpenTransaction={(id) => openEdit('transaction', id)}
            onDeleteTransaction={deleteTransaction}
          />
        ) : null}

        {data && tab === 'investments' ? (
          <Investing
            investments={data.investments}
            portfolio={metrics.portfolio}
            cost={metrics.cost}
            onDelete={deleteInvestment}
          />
        ) : null}

        {data && tab === 'expenses' ? (
          <Expenses
            transactions={data.transactions}
            income={metrics.income}
            expenses={metrics.expenses}
            accountLabel={accountLabel}
            onOpenTransaction={(id) => openEdit('transaction', id)}
            onDelete={deleteTransaction}
          />
        ) : null}

        {data && tab === 'goals' ? (
          <Budgets
            budgets={data.budgets}
            transactions={data.transactions}
            onDelete={deleteBudget}
            onEdit={(id) => openEdit('budget', id)}
          />
        ) : null}
      </SwipeSteps>
    </Screen>
  );
}

const Overview = ({
  accounts,
  transactions,
  metrics,
  history,
  chartWidth,
  accountLabel,
  onSeeAll,
  onAddAccount,
  onOpenTransaction,
  onDeleteTransaction,
}: {
  accounts: Account[];
  transactions: Transaction[];
  metrics: {
    income: number;
    expenses: number;
    cash: number;
    portfolio: number;
    netWorth: number;
    savingsRate: number;
    safeToSpend: number;
  };
  history: NetWorthPoint[];
  chartWidth: number;
  accountLabel: (transaction: Transaction) => string;
  onSeeAll: () => void;
  onAddAccount: () => void;
  onOpenTransaction: (id: string) => void;
  onDeleteTransaction: (transaction: Transaction) => void;
}) => {
  const { colors } = useTheme();
  const [accountsOpen, setAccountsOpen] = useState(false);
  const values = history.map((point) => point.netWorth);
  const hasHistory = values.length > 1;
  const delta = hasHistory ? values[values.length - 1] - values[0] : 0;

  return (
    <>
      <Panel style={{ gap: space.sm }}>
        <AppText variant="footnote" tone="secondary">
          Safe to spend
        </AppText>
        <MoneyHero value={metrics.safeToSpend} color={colors.primary} centsColor={colors.primary} />
        <AppText variant="footnote" tone="secondary">
          After bills + 20%
        </AppText>
        <Progress value={metrics.savingsRate} color={colors.primary} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: space.lg, rowGap: space.xs }}>
          <AppText variant="footnote" tone="secondary">
            {`Income ${formatMoney(metrics.income)}`}
          </AppText>
          <AppText variant="footnote" tone="secondary">
            {`Spent ${formatMoney(metrics.expenses)}`}
          </AppText>
          <View style={{ flexDirection: 'row', gap: 2 }}>
            <AppText variant="footnote" tone="secondary">
              Saved
            </AppText>
            <AppText variant="footnote" style={{ color: colors.primary }}>
              {`${metrics.savingsRate}%`}
            </AppText>
          </View>
        </View>
      </Panel>

      <Panel style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md }}>
          <View style={{ flex: 1, gap: 1 }}>
            <AppText variant="footnote" tone="secondary">
              Net worth
            </AppText>
            <MoneyHero value={metrics.netWorth} cents={false} size={34} />
          </View>
          {hasHistory ? (
            <View style={{ alignItems: 'flex-end', gap: 1 }}>
              <AppText
                variant="callout"
                style={{ color: delta >= 0 ? colors.primary : colors.danger }}
              >
                {`${delta >= 0 ? '+' : ''}${wholeMoney(delta)}`}
              </AppText>
              <AppText variant="footnote" tone="tertiary">
                Last 30 days
              </AppText>
            </View>
          ) : null}
        </View>
        {hasHistory ? (
          <LineChart
            values={values}
            color={colors.primary}
            width={chartWidth}
            height={132}
            minValue={Math.min(...values)}
            maxValue={Math.max(...values)}
            startLabel={formatDate(history[0].date)}
            endLabel={formatDate(history[history.length - 1].date)}
            fill
            grid={false}
          />
        ) : (
          <AppText variant="footnote" tone="tertiary">
            Net worth history appears after a couple of days of readings.
          </AppText>
        )}
      </Panel>

      <Panel>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${accounts.length} accounts`}
            accessibilityHint="Shows or hides accounts"
            onPress={() => setAccountsOpen((open) => !open)}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md }}
          >
            <View style={{ flex: 1, gap: 1 }}>
              <AppText variant="headline">Accounts</AppText>
              <AppText variant="footnote" tone="tertiary">
                {`${accounts.length} account${accounts.length === 1 ? '' : 's'}`}
              </AppText>
            </View>
            <View
              style={{
                transform: [{ rotate: accountsOpen ? '90deg' : '0deg' }],
              }}
            >
              <Icon name="chevron" size={18} color={colors.textTertiary} />
            </View>
          </Pressable>
          <PlusCircle onPress={onAddAccount} label="Add account" />
        </View>
      </Panel>

      {accountsOpen ? (
        <Panel padded={false} style={{ paddingHorizontal: space.xl }}>
          {accounts.length === 0 ? (
            <AppText variant="footnote" tone="tertiary" style={{ paddingVertical: space.lg }}>
              No accounts yet.
            </AppText>
          ) : (
            accounts.map((account, index) => (
              <ListRow
                key={account.id}
                title={account.name}
                subtitle={
                  account.type
                    ? account.type[0].toUpperCase() + account.type.slice(1)
                    : 'Account'
                }
                value={formatMoney(Number(account.balance ?? 0), account.currency ?? 'USD')}
                last={index === accounts.length - 1}
              />
            ))
          )}
        </Panel>
      ) : null}

      <Panel>
        <PanelHeader
          title="Recent transactions"
          action="See all"
          onAction={onSeeAll}
        />
        <View style={{ marginTop: space.sm }}>
          {transactions.length === 0 ? (
            <AppText variant="footnote" tone="tertiary" style={{ paddingVertical: space.md }}>
              No transactions this month.
            </AppText>
          ) : (
            transactions.slice(0, 3).map((transaction, index, rows) => (
              <TransactionRow
                key={transaction.id}
                transaction={transaction}
                subtitle={`${transaction.category || 'Uncategorized'} · ${formatDate(transaction.occurred_at)}`}
                last={index === rows.length - 1}
                onPress={() => onOpenTransaction(transaction.id)}
                onDelete={() => onDeleteTransaction(transaction)}
              />
            ))
          )}
        </View>
      </Panel>
    </>
  );
};

const Investing = ({
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
  const palette: string[] = [
    colors.primary,
    colors.textSecondary,
    colors.textTertiary,
    '#5A5A61',
    '#3A3A40',
  ];
  const sorted = [...investments].sort(
    (a, b) => Number(b.market_value ?? 0) - Number(a.market_value ?? 0),
  );
  const allocation = sorted.slice(0, 4).map((investment, index) => ({
    key: investment.id,
    label: investment.instrument,
    value: Number(investment.market_value ?? 0),
    color: palette[index] ?? colors.textTertiary,
  }));
  if (sorted.length > 4) {
    const rest = sorted.slice(4).reduce((total, row) => total + Number(row.market_value ?? 0), 0);
    allocation.push({ key: 'other', label: 'Other', value: rest, color: colors.textTertiary });
  }
  const gainColor = gain >= 0 ? colors.primary : colors.danger;

  return (
    <>
      <Panel style={{ gap: space.sm }}>
        <AppText variant="footnote" tone="secondary">
          Market value
        </AppText>
        <MoneyHero value={portfolio} />
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space.sm }}>
          <AppText variant="callout" style={{ color: gainColor }}>
            {signedMoney(gain)}
          </AppText>
          <View
            style={{
              minHeight: 26,
              paddingHorizontal: 10,
              borderRadius: 999,
              justifyContent: 'center',
              backgroundColor: gain >= 0 ? 'rgba(198,242,78,0.12)' : 'rgba(255,107,90,0.12)',
            }}
          >
            <AppText variant="footnote" style={{ color: gainColor, fontWeight: '600' }}>
              {`${gainPct >= 0 ? '+' : ''}${gainPct}%`}
            </AppText>
          </View>
        </View>
        <AppText variant="footnote" tone="tertiary">
          Unrealized gain and return
        </AppText>
      </Panel>

      <Panel style={{ gap: space.md }}>
        <PanelHeader
          title="Holdings"
          caption={`${investments.length} position${investments.length === 1 ? '' : 's'}, largest first`}
          onAdd={() => openAdd('investment')}
          addLabel="Add holding"
        />
        {investments.length === 0 ? (
          <AppText variant="footnote" tone="tertiary" style={{ paddingVertical: space.md }}>
            No holdings yet. Add your first position to see allocation.
          </AppText>
        ) : (
          <View>
            {sorted.map((investment, index) => {
              const positionCost =
                Number(investment.units ?? 0) * Number(investment.avg_cost ?? 0);
              const value = Number(investment.market_value ?? 0);
              const positionGain = value - positionCost;
              const dot = palette[index] ?? colors.textTertiary;
              return (
                <Pressable
                  key={investment.id}
                  accessibilityRole="button"
                  accessibilityHint="Long press to delete this holding"
                  onLongPress={() => onDelete(investment)}
                  delayLongPress={350}
                  style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: space.md,
                      paddingVertical: space.md,
                      minHeight: 64,
                      borderBottomWidth: index === sorted.length - 1 ? 0 : 1,
                      borderBottomColor: colors.separator,
                    }}
                  >
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: dot,
                      }}
                    />
                    <View style={{ flex: 1, gap: 1 }}>
                      <AppText variant="callout" numberOfLines={1}>
                        {investment.instrument}
                      </AppText>
                      <AppText variant="footnote" tone="tertiary">
                        {`${formatNumber(Number(investment.units ?? 0))} units · avg ${money(
                          Number(investment.avg_cost ?? 0),
                        )}`}
                      </AppText>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 1 }}>
                      <AppText variant="callout" selectable>
                        {money(value)}
                      </AppText>
                      <AppText
                        variant="footnote"
                        style={{
                          color:
                            positionGain >= 0 ? colors.primary : colors.danger,
                          fontVariant: ['tabular-nums'],
                        }}
                      >
                        {signedMoney(positionGain)}
                      </AppText>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </Panel>

      {investments.length > 0 ? (
        <Panel style={{ gap: space.md }}>
          <PanelHeader title="Allocation" caption="Share of market value" />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
            <Donut
              size={124}
              stroke={16}
              segments={allocation}
              centerValue={`${investments.length}`}
              centerLabel="positions"
            />
            <View style={{ flex: 1, gap: space.sm }}>
              {allocation.map((row) => (
                <View
                  key={row.key}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}
                >
                  <View
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 4,
                      backgroundColor: row.color,
                    }}
                  />
                  <AppText variant="footnote" style={{ flex: 1 }} numberOfLines={2}>
                    {row.label}
                  </AppText>
                  <AppText
                    variant="footnote"
                    style={{ color: colors.textSecondary, fontVariant: ['tabular-nums'] }}
                  >
                    {portfolio > 0 ? `${Math.round((row.value / portfolio) * 100)}%` : '—'}
                  </AppText>
                </View>
              ))}
            </View>
          </View>
        </Panel>
      ) : null}
    </>
  );
};

const Expenses = ({
  transactions,
  income,
  expenses,
  accountLabel,
  onOpenTransaction,
  onDelete,
}: {
  transactions: Transaction[];
  income: number;
  expenses: number;
  accountLabel: (transaction: Transaction) => string;
  onOpenTransaction: (id: string) => void;
  onDelete: (transaction: Transaction) => void;
}) => {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const expenseRows = transactions.filter((row) => row.direction === 'out');
  const groups = buildSmartSpendingGroups(expenseRows);
  const top = groups.slice(0, 4);
  const rest = groups.slice(4).reduce((total, group) => total + group.total, 0);
  const spending = [
    ...top,
    ...(rest > 0
      ? [{ groupKey: 'other', label: 'Other', total: rest }]
      : []),
  ];
  const spentPct = income > 0 ? Math.min(100, (expenses / income) * 100) : 0;
  const net = income - expenses;
  const filtered = transactions.filter((transaction) =>
    `${transaction.note ?? ''} ${transaction.category ?? ''} ${accountLabel(transaction)}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  const visible = showAll ? filtered : filtered.slice(0, 4);
  let lastDate = '';

  return (
    <>
      <Panel style={{ gap: space.sm }}>
        <AppText variant="footnote" tone="secondary">
          Spent this month
        </AppText>
        <MoneyHero value={expenses} />
        <View
          style={{
            height: 6,
            borderRadius: 3,
            overflow: 'hidden',
            backgroundColor: colors.primary,
          }}
        >
          <View
            style={{
              width: `${spentPct}%`,
              height: '100%',
              backgroundColor: colors.textTertiary,
            }}
          />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: space.md }}>
          <AppText variant="footnote" tone="secondary">
            {`Income ${formatMoney(income)}`}
          </AppText>
          <AppText
            variant="footnote"
            style={{ color: net >= 0 ? colors.primary : colors.danger }}
          >
            {`Net cash flow ${net >= 0 ? '+' : ''}${formatMoney(net)}`}
          </AppText>
        </View>
      </Panel>

      {spending.length > 0 ? (
        <Panel style={{ gap: space.md }}>
          <PanelHeader title="Spending" caption="By category this month" />
          <View style={{ gap: space.md }}>
            {spending.map((group, index) => {
              const percent = expenses > 0 ? Math.round((group.total / expenses) * 100) : 0;
              return (
                <View key={group.groupKey} style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.md }}>
                    <AppText variant="callout" style={{ flex: 1 }}>
                      {group.label}
                    </AppText>
                    <AppText variant="footnote" tone="secondary">
                      {money(group.total)}
                    </AppText>
                    <AppText
                      variant="footnote"
                      tone="tertiary"
                      style={{ width: 38, textAlign: 'right' }}
                    >
                      {`${percent}%`}
                    </AppText>
                  </View>
                  <Progress
                    value={percent}
                    height={4}
                    color={index === 0 ? colors.primary : colors.textSecondary}
                  />
                </View>
              );
            })}
          </View>
        </Panel>
      ) : null}

      <Panel style={{ gap: space.md }}>
        <PanelHeader
          title="Transactions"
          caption={`${transactions.length} this month`}
        />
        <View
          style={{
            height: 44,
            borderRadius: 999,
            backgroundColor: colors.surfaceSunken,
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.sm,
            paddingHorizontal: space.lg,
          }}
        >
          <Icon name="search" size={18} color={colors.textTertiary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search notes, categories, account"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
            style={{
              flex: 1,
              paddingVertical: 0,
              color: colors.text,
              fontFamily: fonts.medium,
              fontSize: 15,
            }}
          />
        </View>

        {visible.length === 0 ? (
          <AppText variant="footnote" tone="tertiary" style={{ paddingVertical: space.md }}>
            {query.trim() ? 'No matching transactions.' : 'No transactions this month.'}
          </AppText>
        ) : (
          <View>
            {visible.map((transaction, index) => {
              const date = dayLabel(transaction.occurred_at);
              const header = date !== lastDate;
              lastDate = date;
              return (
                <Fragment key={transaction.id}>
                  {header ? (
                    <AppText
                      variant="footnote"
                      tone="tertiary"
                      style={{ marginTop: index === 0 ? 0 : space.md, marginBottom: space.xs }}
                    >
                      {date}
                    </AppText>
                  ) : null}
                  <TransactionRow
                    transaction={transaction}
                    subtitle={`${transaction.category || 'Uncategorized'} · ${accountLabel(transaction)}`}
                    last={index === visible.length - 1}
                    onPress={() => onOpenTransaction(transaction.id)}
                    onDelete={() => onDelete(transaction)}
                  />
                </Fragment>
              );
            })}
          </View>
        )}

        {filtered.length > 4 ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowAll((value) => !value)}
            style={{ paddingTop: space.sm, alignItems: 'center' }}
          >
            <AppText variant="callout" tone="primary" style={{ fontWeight: '600' }}>
              {showAll
                ? 'Show less'
                : `See all ${filtered.length} transaction${filtered.length === 1 ? '' : 's'}`}
            </AppText>
          </Pressable>
        ) : null}
      </Panel>
    </>
  );
};

const Budgets = ({
  budgets,
  transactions,
  onDelete,
  onEdit,
}: {
  budgets: Budget[];
  transactions: Transaction[];
  onDelete: (budget: Budget) => void;
  onEdit: (id: string) => void;
}) => {
  const { colors } = useTheme();
  const spentByCategory = new Map<string, number>();
  for (const transaction of transactions) {
    if (transaction.direction !== 'out') continue;
    const category = (transaction.category || 'Uncategorized').toLowerCase();
    spentByCategory.set(category, (spentByCategory.get(category) ?? 0) + transaction.amount);
  }

  const rows = budgets
    .map((budget) => {
      const spent = Math.max(
        Number(budget.spent_amount ?? 0),
        spentByCategory.get(budget.category.toLowerCase()) ?? 0,
      );
      const limit = Number(budget.limit_amount ?? 0);
      const percent = limit > 0 ? (spent / limit) * 100 : 0;
      return {
        budget,
        spent,
        limit,
        percent,
        status: budgetStatus(percent),
      };
    })
    .sort((a, b) => b.percent - a.percent);

  const over = rows.filter((row) => row.status === 'over');
  const within = rows.filter((row) => row.status !== 'over');
  const totalSpent = rows.reduce((total, row) => total + row.spent, 0);
  const totalLimit = rows.reduce((total, row) => total + row.limit, 0);
  const nearCount = rows.filter((row) => row.status === 'near').length;
  const trackCount = rows.filter((row) => row.status === 'track').length;

  if (budgets.length === 0) {
    return (
      <EmptyState
        icon="target"
        title="No budgets yet"
        message="Create a monthly or weekly category limit to keep spending intentional."
        actionLabel="Create budget"
        onAction={() => openAdd('budget')}
      />
    );
  }

  return (
    <>
      <Panel style={{ gap: space.sm }}>
        <AppText variant="footnote" tone="secondary">
          {`Spent across ${budgets.length} budget${budgets.length === 1 ? '' : 's'}`}
        </AppText>
        <MoneyHero value={totalSpent} />
        <AppText variant="footnote" tone="secondary">
          {`of ${money(totalLimit)} budgeted`}
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.xs }}>
          {over.length > 0 ? (
            <StatusPill label={`${over.length} over`} status="over" />
          ) : null}
          {nearCount > 0 ? (
            <StatusPill label={`${nearCount} near limit`} status="near" />
          ) : null}
          {trackCount > 0 ? (
            <StatusPill label={`${trackCount} on track`} status="track" />
          ) : null}
        </View>
      </Panel>

      {over.map((row) => (
        <Pressable
          key={row.budget.id}
          accessibilityRole="button"
          accessibilityHint="Opens this budget. Long press to delete."
          onPress={() => onEdit(row.budget.id)}
          onLongPress={() => onDelete(row.budget)}
          delayLongPress={350}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <Panel
            background="rgba(255,107,90,0.08)"
            style={{ gap: space.sm }}
          >
            <AppText variant="footnote" style={{ color: colors.danger, fontWeight: '600' }}>
              Over budget
            </AppText>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.md }}>
              <AppText variant="callout" style={{ flex: 1 }}>
                {row.budget.category}
              </AppText>
              <AppText variant="footnote" style={{ color: colors.danger }}>
                {`${money(row.spent - row.limit)} over`}
              </AppText>
            </View>
            <Progress
              value={Math.min(100, (row.limit / Math.max(1, row.spent)) * 100)}
              color={colors.danger}
              trackColor="rgba(255,107,90,0.22)"
              height={6}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md }}>
              <AppText variant="footnote" tone="secondary">
                {`${money(row.spent)} of ${money(row.limit)}`}
              </AppText>
              <AppText variant="footnote" tone="secondary">
                {`${Math.round(row.percent)}%`}
              </AppText>
            </View>
          </Panel>
        </Pressable>
      ))}

      <Panel style={{ gap: space.md }}>
        <PanelHeader
          title="Within budget"
          caption={`${within.length} budget${within.length === 1 ? '' : 's'}`}
          onAdd={() => openAdd('budget')}
          addLabel="New budget"
        />
        {within.map((row, index) => {
          const tone =
            row.status === 'near' ? colors.amber : colors.primary;
          return (
            <Pressable
              key={row.budget.id}
              accessibilityRole="button"
              accessibilityHint="Opens this budget. Long press to delete."
              onPress={() => onEdit(row.budget.id)}
              onLongPress={() => onDelete(row.budget)}
              delayLongPress={350}
              style={({ pressed }) => ({
                gap: space.sm,
                paddingTop: index === 0 ? 0 : space.md,
                borderTopWidth: index === 0 ? 0 : 1,
                borderTopColor: colors.separator,
                opacity: pressed ? 0.65 : 1,
              })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.md }}>
                <AppText variant="callout" style={{ flex: 1 }}>
                  {row.budget.category}
                </AppText>
                <AppText variant="footnote" style={{ color: tone }}>
                  {`${money(row.limit - row.spent)} left`}
                </AppText>
              </View>
              <Progress value={Math.min(100, row.percent)} color={tone} height={6} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md }}>
                <AppText variant="footnote" tone="tertiary">
                  {`${money(row.spent)} of ${money(row.limit)}`}
                </AppText>
                <AppText variant="footnote" tone="tertiary">
                  {`${Math.round(row.percent)}%`}
                </AppText>
              </View>
            </Pressable>
          );
        })}
        {within.length === 0 ? (
          <AppText variant="footnote" tone="tertiary">
            Every budget is over its limit this month.
          </AppText>
        ) : null}
      </Panel>
    </>
  );
};
