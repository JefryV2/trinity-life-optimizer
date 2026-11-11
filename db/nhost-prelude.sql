-- Nhost's SQL role cannot write the `auth` schema, so nothing here references it.
-- Hasura still supplies the verified JWT; this function reads it from whichever
-- session variable the engine sets.
--
-- The migrations' policies call auth.uid(); the Nhost bundle rewrites those
-- calls to public.app_uid() before it is applied.

create or replace function public.app_uid()
returns uuid
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub',
    nullif(current_setting('hasura.user', true), '')::jsonb ->> 'x-hasura-user-id'
  )::uuid
$$;

grant execute on function public.app_uid() to public;
