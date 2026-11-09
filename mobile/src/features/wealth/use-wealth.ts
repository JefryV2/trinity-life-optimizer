import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { endOfMonth, startOfMonth } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

export interface Account {
  id: string;
  name: string;
  type: string | null;
  balance: number | null;
  currency: string | null;
}

export interface Transaction {
  id: string;
  account_id: string | null;
  amount: number;
  category: string | null;
  direction: string;
  occurred_at: string;
  note: string | null;
}

export interface Budget {
  id: string;
  category: string;
  period: string | null;
  limit_amount: number;
  spent_amount: number | null;
  period_start: string;
  period_end: string | null;
}

export interface Investment {
  id: string;
  instrument: string;
  units: number | null;
  avg_cost: number | null;
  market_value: number | null;
}

export interface WealthData {
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
  investments: Investment[];
}

const invalidate = async (queryClient: ReturnType<typeof useQueryClient>) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['wealth'] }),
    queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    queryClient.invalidateQueries({ queryKey: ['insights'] }),
  ]);
};

export const useWealth = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const query = useQuery({
    queryKey: ['wealth', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<WealthData> => {
      const [accounts, transactions, budgets, investments] = await Promise.all([
        supabase
          .from('finance_accounts')
          .select('id,name,type,balance,currency')
          .eq('user_id', userId!)
          .order('created_at', { ascending: true }),
        supabase
          .from('transactions')
          .select('id,account_id,amount,category,direction,occurred_at,note')
          .eq('user_id', userId!)
          .gte('occurred_at', startOfMonth().toISOString())
          .lte('occurred_at', endOfMonth().toISOString())
          .order('occurred_at', { ascending: false }),
        supabase
          .from('budgets')
          .select('id,category,period,limit_amount,spent_amount,period_start,period_end')
          .eq('user_id', userId!)
          .order('created_at', { ascending: true }),
        supabase
          .from('investments')
          .select('id,instrument,units,avg_cost,market_value')
          .eq('user_id', userId!)
          .order('created_at', { ascending: true }),
      ]);

      const failure = [accounts, transactions, budgets, investments].find(
        (result) => result.error,
      );
      if (failure?.error) throw new Error(failure.error.message);

      return {
        accounts: (accounts.data ?? []) as Account[],
        transactions: (transactions.data ?? []) as Transaction[],
        budgets: (budgets.data ?? []) as Budget[],
        investments: (investments.data ?? []) as Investment[],
      };
    },
  });

  const addAccount = useMutation({
    mutationFn: async (input: {
      name: string;
      type: string;
      balance: number;
      currency: string;
    }) => {
      const { error } = await supabase.from('finance_accounts').insert({
        user_id: userId!,
        name: input.name.trim(),
        type: input.type,
        balance: input.balance,
        currency: input.currency,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => invalidate(queryClient),
  });

  const addTransaction = useMutation({
    mutationFn: async (input: {
      accountId: string | null;
      amount: number;
      direction: 'in' | 'out';
      category: string;
      note?: string;
      occurredAt: string;
    }) => {
      const { error } = await supabase.from('transactions').insert({
        user_id: userId!,
        account_id: input.accountId,
        amount: input.amount,
        direction: input.direction,
        category: input.category.trim() || 'Uncategorized',
        note: input.note?.trim() || null,
        occurred_at: input.occurredAt,
      });
      if (error) throw new Error(error.message);

      if (input.accountId) {
        const account = await supabase
          .from('finance_accounts')
          .select('balance')
          .eq('id', input.accountId)
          .maybeSingle();
        if (account.data) {
          const delta = input.direction === 'in' ? input.amount : -input.amount;
          await supabase
            .from('finance_accounts')
            .update({
              balance: Number(account.data.balance ?? 0) + delta,
              updated_at: new Date().toISOString(),
            })
            .eq('id', input.accountId);
        }
      }
    },
    onSuccess: () => invalidate(queryClient),
  });

  const addBudget = useMutation({
    mutationFn: async (input: { category: string; limit: number; period: string }) => {
      const { error } = await supabase.from('budgets').insert({
        user_id: userId!,
        category: input.category.trim(),
        limit_amount: input.limit,
        spent_amount: 0,
        period: input.period,
        period_start: startOfMonth().toISOString(),
        period_end: endOfMonth().toISOString(),
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => invalidate(queryClient),
  });

  const addInvestment = useMutation({
    mutationFn: async (input: {
      instrument: string;
      units: number;
      avgCost: number;
      marketValue: number;
    }) => {
      const { error } = await supabase.from('investments').insert({
        user_id: userId!,
        instrument: input.instrument.trim(),
        units: input.units,
        avg_cost: input.avgCost,
        market_value: input.marketValue,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => invalidate(queryClient),
  });

  const removeTransaction = useMutation({
    mutationFn: async (transaction: Transaction) => {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transaction.id);
      if (error) throw new Error(error.message);

      if (transaction.account_id) {
        const account = await supabase
          .from('finance_accounts')
          .select('balance')
          .eq('id', transaction.account_id)
          .maybeSingle();
        if (account.data) {
          const delta = transaction.direction === 'in' ? -transaction.amount : transaction.amount;
          await supabase
            .from('finance_accounts')
            .update({
              balance: Number(account.data.balance ?? 0) + delta,
              updated_at: new Date().toISOString(),
            })
            .eq('id', transaction.account_id);
        }
      }
    },
    onSuccess: () => invalidate(queryClient),
  });

  const removeInvestment = useMutation({
    mutationFn: async (investment: Investment) => {
      const { error } = await supabase.from('investments').delete().eq('id', investment.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => invalidate(queryClient),
  });

  const removeBudget = useMutation({
    mutationFn: async (budget: Budget) => {
      const { error } = await supabase.from('budgets').delete().eq('id', budget.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => invalidate(queryClient),
  });

  return {
    ...query,
    addAccount,
    addTransaction,
    addBudget,
    addInvestment,
    removeTransaction,
    removeInvestment,
    removeBudget,
  };
};
