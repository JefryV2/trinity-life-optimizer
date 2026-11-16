-- Indexes for the queries the app reads on every dashboard/tab load.
-- All are idempotent so this migration is safe to re-run.

create index if not exists idx_sleep_records_user_created
  on public.sleep_records(user_id, created_at desc);

create index if not exists idx_food_entries_user_consumed
  on public.food_entries(user_id, consumed_at desc);

create index if not exists idx_exercise_records_user_completed
  on public.exercise_records(user_id, completed_at desc);

create index if not exists idx_mental_health_user_logged
  on public.mental_health_logs(user_id, logged_at desc);

create index if not exists idx_menstrual_cycles_user_start
  on public.menstrual_cycles(user_id, cycle_start_date desc);

create index if not exists idx_health_goals_user_created
  on public.health_goals(user_id, created_at desc);

create index if not exists idx_health_daily_scores_user_date
  on public.health_daily_scores(user_id, date desc);

create index if not exists idx_wealth_daily_scores_user_date
  on public.wealth_daily_scores(user_id, date desc);

create index if not exists idx_relations_daily_scores_user_date
  on public.relations_daily_scores(user_id, date desc);

create index if not exists idx_finance_accounts_user_created
  on public.finance_accounts(user_id, created_at);

create index if not exists idx_investments_user_created
  on public.investments(user_id, created_at);

create index if not exists idx_gratitude_entries_user_created
  on public.gratitude_entries(user_id, created_at desc);

create index if not exists idx_quality_time_goals_user_period
  on public.quality_time_goals(user_id, period_start desc);
