-- Minimal, Supabase-compatible auth schema.
--
-- The app's migrations are plain Postgres except for two things: they reference
-- `auth.users` (foreign keys + the signup trigger) and call `auth.uid()` in
-- every RLS policy. Hosts that already provide those (Nhost, Supabase) skip
-- this file; plain Postgres (Neon, Railway, RDS) runs it first.
--
-- `auth.uid()` reads the request-scoped JWT claim that your API layer sets:
--   select set_config('request.jwt.claim.sub', '<user-uuid>', true);
-- This is the same convention PostgREST/Hasura use, so RLS keeps working
-- unchanged when you swap the host.

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

create or replace function auth.role()
returns text
language sql
stable
as $$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon')
$$;

create or replace function auth.email()
returns text
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.email', true), '')
$$;

grant usage on schema auth to public;
grant select, insert, update, delete on auth.users to public;
