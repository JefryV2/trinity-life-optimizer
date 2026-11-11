-- Net worth history
-- score_snapshots already stores one row per user per day; net worth just needs
-- a column so the wealth screen can draw a trend instead of a single number.

alter table public.score_snapshots
  add column if not exists net_worth numeric;

comment on column public.score_snapshots.net_worth is
  'Cash + investments at the time the day was captured.';
