-- Add daily_step_goal column to user_profiles_health table

ALTER TABLE public.user_profiles_health
ADD COLUMN IF NOT EXISTS daily_step_goal INTEGER DEFAULT 10000 CHECK (daily_step_goal > 0 AND daily_step_goal <= 100000);

-- Add comment
COMMENT ON COLUMN public.user_profiles_health.daily_step_goal IS 'Daily step goal for the user (default: 10000)';

