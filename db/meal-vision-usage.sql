-- Meal photo reads are server-side only. The app never holds a Gemini key.
-- One row is reserved before the provider call, so a failed request still
-- counts against the quota and cannot be used to hammer the provider.

CREATE TABLE IF NOT EXISTS public.ai_usage_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  feature TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_usage_events_user_feature_time_idx
  ON public.ai_usage_events (user_id, feature, created_at DESC);

CREATE INDEX IF NOT EXISTS ai_usage_events_feature_time_idx
  ON public.ai_usage_events (feature, created_at DESC);

ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own AI usage" ON public.ai_usage_events;
CREATE POLICY "Users can read their own AI usage"
  ON public.ai_usage_events
  FOR SELECT
  USING (public.app_uid() = user_id);

/*
 * Atomically checks the user's daily/monthly quota and the project-wide daily
 * ceiling, then reserves one read. The transaction-scoped advisory lock keeps
 * two simultaneous photo requests from both passing the last free slot.
 */
CREATE OR REPLACE FUNCTION public.consume_ai_scan(
  p_user UUID,
  p_feature TEXT,
  p_daily_limit INTEGER,
  p_monthly_limit INTEGER,
  p_global_daily_limit INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_day_start TIMESTAMPTZ := date_trunc('day', now() AT TIME ZONE 'utc') AT TIME ZONE 'utc';
  v_month_start TIMESTAMPTZ := date_trunc('month', now() AT TIME ZONE 'utc') AT TIME ZONE 'utc';
  v_used_today INTEGER;
  v_used_month INTEGER;
  v_used_global INTEGER;
BEGIN
  IF p_user IS NULL OR p_feature IS NULL OR btrim(p_feature) = '' THEN
    RAISE EXCEPTION 'user and feature are required';
  END IF;
  IF p_daily_limit < 1 OR p_monthly_limit < 1 OR p_global_daily_limit < 1 THEN
    RAISE EXCEPTION 'limits must be positive';
  END IF;

  -- One short critical section for the quota check + reservation. At this
  -- volume the cost is negligible and it makes the limits exact.
  PERFORM pg_advisory_xact_lock(hashtextextended('auxo:ai:' || p_feature, 0));

  SELECT count(*)::INTEGER
    INTO v_used_global
    FROM public.ai_usage_events
   WHERE feature = p_feature
     AND created_at >= v_day_start;

  IF v_used_global >= p_global_daily_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'global_limit',
      'usedToday', 0,
      'remainingToday', 0,
      'usedMonth', 0,
      'remainingMonth', 0,
      'globalRemaining', 0
    );
  END IF;

  SELECT count(*)::INTEGER
    INTO v_used_today
    FROM public.ai_usage_events
   WHERE user_id = p_user
     AND feature = p_feature
     AND created_at >= v_day_start;

  SELECT count(*)::INTEGER
    INTO v_used_month
    FROM public.ai_usage_events
   WHERE user_id = p_user
     AND feature = p_feature
     AND created_at >= v_month_start;

  IF v_used_today >= p_daily_limit OR v_used_month >= p_monthly_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', CASE WHEN v_used_month >= p_monthly_limit THEN 'monthly_limit' ELSE 'daily_limit' END,
      'usedToday', v_used_today,
      'remainingToday', greatest(p_daily_limit - v_used_today, 0),
      'usedMonth', v_used_month,
      'remainingMonth', greatest(p_monthly_limit - v_used_month, 0),
      'globalRemaining', greatest(p_global_daily_limit - v_used_global, 0)
    );
  END IF;

  INSERT INTO public.ai_usage_events (user_id, feature)
  VALUES (p_user, p_feature);

  RETURN jsonb_build_object(
    'allowed', true,
    'reason', NULL,
    'usedToday', v_used_today + 1,
    'remainingToday', greatest(p_daily_limit - v_used_today - 1, 0),
    'usedMonth', v_used_month + 1,
    'remainingMonth', greatest(p_monthly_limit - v_used_month - 1, 0),
    'globalRemaining', greatest(p_global_daily_limit - v_used_global - 1, 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.consume_ai_scan(UUID, TEXT, INTEGER, INTEGER, INTEGER) FROM PUBLIC;
