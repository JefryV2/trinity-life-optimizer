-- Saved GPS walks keep a compact route so the workout list can draw the trail.
ALTER TABLE public.exercise_records ADD COLUMN IF NOT EXISTS route JSONB;

COMMENT ON COLUMN public.exercise_records.route IS
  'Array of {lat,lng} segments for GPS walks; null for manual workouts.';
