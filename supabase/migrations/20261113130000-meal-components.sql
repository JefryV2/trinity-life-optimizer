-- Keep the structured parts of a built meal so it can be repeated or edited
-- without parsing the human-readable notes.
alter table public.food_entries
  add column if not exists components jsonb;
