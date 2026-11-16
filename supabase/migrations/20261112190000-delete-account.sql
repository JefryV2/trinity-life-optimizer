-- Owner-scoped account deletion. SECURITY DEFINER is required to remove the
-- auth identity; the function only ever acts on auth.uid(), so a caller cannot
-- delete another account. It removes every personal row first, then the auth
-- user. If any row cannot be removed the whole transaction rolls back.
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS SETOF public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  account uuid := auth.uid();
  table_row record;
  pass_deleted integer;
  remaining integer;
BEGIN
  IF account IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Tables have dependencies in places, so retry passes until nothing moves.
  LOOP
    pass_deleted := 0;
    FOR table_row IN
      SELECT c.table_name
      FROM information_schema.columns c
      JOIN information_schema.tables t
        ON t.table_schema = c.table_schema AND t.table_name = c.table_name
      WHERE c.table_schema = 'public'
        AND c.column_name = 'user_id'
        AND t.table_type = 'BASE TABLE'
    LOOP
      BEGIN
        EXECUTE format('DELETE FROM public.%I WHERE user_id = $1', table_row.table_name)
          USING account;
        GET DIAGNOSTICS remaining = ROW_COUNT;
        pass_deleted := pass_deleted + remaining;
      EXCEPTION WHEN foreign_key_violation THEN
        NULL;
      END;
    END LOOP;
    EXIT WHEN pass_deleted = 0;
  END LOOP;

  -- Refuse to delete the sign-in while any personal row survived.
  FOR table_row IN
    SELECT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND c.column_name = 'user_id'
      AND t.table_type = 'BASE TABLE'
  LOOP
    EXECUTE format('SELECT count(*) FROM public.%I WHERE user_id = $1', table_row.table_name)
      INTO remaining USING account;
    IF remaining > 0 THEN
      RAISE EXCEPTION 'Could not delete % row(s) from %', remaining, table_row.table_name;
    END IF;
  END LOOP;

  DELETE FROM auth.users WHERE id = account;
  RETURN;
END;
$$;

COMMENT ON FUNCTION public.delete_my_account() IS
  'Deletes the calling user''s account and all personal rows. Owner-scoped only.';
