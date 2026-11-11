-- Weekly experiments + daily score snapshots
--
-- A snapshot is one row per user per day: the score and the raw inputs that
-- produced it. Experiments are evaluated against these rows, so the verdict can
-- be recomputed later instead of being stored as a claim.

create table if not exists public.score_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  total integer not null check (total between 0 and 100),
  health integer not null check (health between 0 and 100),
  wealth integer not null check (wealth between 0 and 100),
  bonds integer not null check (bonds between 0 and 100),
  sleep_hours numeric,
  steps integer,
  water_ml integer,
  exercise_min integer,
  savings_rate numeric,
  interactions integer,
  mood numeric,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists score_snapshots_user_date_idx
  on public.score_snapshots (user_id, date desc);

alter table public.score_snapshots enable row level security;

drop policy if exists "score snapshots are private" on public.score_snapshots;
create policy "score snapshots are private"
  on public.score_snapshots for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.experiments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  lever text not null,
  target_label text not null,
  started_on date not null default current_date,
  ends_on date not null,
  status text not null default 'running' check (status in ('running', 'done', 'abandoned')),
  outcome text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists experiments_user_status_idx
  on public.experiments (user_id, status);

alter table public.experiments enable row level security;

drop policy if exists "experiments are private" on public.experiments;
create policy "experiments are private"
  on public.experiments for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
