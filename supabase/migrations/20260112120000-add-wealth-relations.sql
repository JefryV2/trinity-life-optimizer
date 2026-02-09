-- Wealth tables
create table if not exists public.finance_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text check (type in ('cash','checking','savings','brokerage','retirement','credit','loan','other')) default 'checking',
  balance numeric(14,2) default 0,
  currency text default 'USD',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references public.finance_accounts(id) on delete set null,
  amount numeric(14,2) not null,
  category text,
  direction text check (direction in ('in','out')) not null default 'out',
  occurred_at timestamp with time zone not null default now(),
  note text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  period text check (period in ('monthly','weekly','yearly')) default 'monthly',
  limit_amount numeric(14,2) not null,
  spent_amount numeric(14,2) default 0,
  period_start date not null default current_date,
  period_end date,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  instrument text not null,
  units numeric(14,4) default 0,
  avg_cost numeric(14,4) default 0,
  market_value numeric(14,2) default 0,
  updated_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now()
);

-- Relations tables
create table if not exists public.relationships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  relation_type text,
  importance integer check (importance between 1 and 5) default 3,
  last_contact_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  relationship_id uuid references public.relationships(id) on delete cascade,
  channel text check (channel in ('call','text','video','in_person','email','other')) default 'other',
  duration_minutes integer default 0,
  mood_rating integer check (mood_rating between 1 and 10),
  occurred_at timestamp with time zone not null default now(),
  notes text,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.gratitude_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.quality_time_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_minutes_per_week integer not null default 120,
  completed_minutes integer not null default 0,
  period_start date not null default current_date,
  period_end date,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- RLS
alter table public.finance_accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.investments enable row level security;
alter table public.relationships enable row level security;
alter table public.interactions enable row level security;
alter table public.gratitude_entries enable row level security;
alter table public.quality_time_goals enable row level security;

-- Policies: owner-only access
do $$
declare
  tbl text;
begin
  for tbl in select unnest(array[
    'finance_accounts',
    'transactions',
    'budgets',
    'investments',
    'relationships',
    'interactions',
    'gratitude_entries',
    'quality_time_goals'
  ])
  loop
    execute format('
      create policy if not exists %I_select on public.%I
      for select using (auth.uid() = user_id);
    ', tbl || '_select', tbl);

    execute format('
      create policy if not exists %I_insert on public.%I
      for insert with check (auth.uid() = user_id);
    ', tbl || '_insert', tbl);

    execute format('
      create policy if not exists %I_update on public.%I
      for update using (auth.uid() = user_id);
    ', tbl || '_update', tbl);
  end loop;
end$$;

-- Useful indexes
create index if not exists idx_transactions_user_date on public.transactions(user_id, occurred_at desc);
create index if not exists idx_interactions_user_date on public.interactions(user_id, occurred_at desc);
create index if not exists idx_relationships_user_last_contact on public.relationships(user_id, last_contact_at desc);
create index if not exists idx_budgets_user_period on public.budgets(user_id, period_start, period_end);

