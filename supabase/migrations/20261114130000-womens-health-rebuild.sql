-- Cycle preferences live with the health profile so predictions use the same
-- source of truth on every device.
ALTER TABLE public.user_profiles_health
  ADD COLUMN IF NOT EXISTS cycle_length_days INTEGER DEFAULT 28
    CHECK (cycle_length_days BETWEEN 21 AND 45),
  ADD COLUMN IF NOT EXISTS period_length_days INTEGER DEFAULT 5
    CHECK (period_length_days BETWEEN 2 AND 10);

-- The UI has always called medium flow "Medium"; the old constraints only
-- allowed "moderate". Normalise old values and accept the user-facing name.
ALTER TABLE public.menstrual_cycles
  DROP CONSTRAINT IF EXISTS menstrual_cycles_flow_intensity_check;
ALTER TABLE public.womens_health_daily_logs
  DROP CONSTRAINT IF EXISTS womens_health_daily_logs_flow_intensity_check;

UPDATE public.menstrual_cycles
SET flow_intensity = 'moderate'
WHERE flow_intensity = 'medium';

UPDATE public.womens_health_daily_logs
SET flow_intensity = 'moderate'
WHERE flow_intensity = 'medium';

ALTER TABLE public.menstrual_cycles
  ADD CONSTRAINT menstrual_cycles_flow_intensity_check
  CHECK (flow_intensity IN ('light', 'moderate', 'heavy'));

ALTER TABLE public.womens_health_daily_logs
  ADD CONSTRAINT womens_health_daily_logs_flow_intensity_check
  CHECK (flow_intensity IN ('light', 'moderate', 'heavy'));
