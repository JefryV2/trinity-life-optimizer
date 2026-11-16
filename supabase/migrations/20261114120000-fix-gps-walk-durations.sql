-- GPS walks were saved with elapsed milliseconds divided by 60, making a
-- 2.2-minute walk appear as 2,200 minutes. Correct the historical rows.
-- A valid session is capped at 12 hours, so anything above 720 minutes is
-- the millisecond bug, not a real walk.
UPDATE public.exercise_records
SET duration_minutes = GREATEST(1, ROUND(duration_minutes / 1000.0)::integer)
WHERE exercise_name = 'Walk (GPS)'
  AND duration_minutes > 720;
