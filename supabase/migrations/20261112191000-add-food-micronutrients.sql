-- Vitamins and minerals captured from Open Food Facts, per serving (100 g).
ALTER TABLE public.food_entries ADD COLUMN IF NOT EXISTS micronutrients JSONB;

COMMENT ON COLUMN public.food_entries.micronutrients IS
  'Per-serving micronutrients keyed by vitaminA, vitaminC, ..., calcium, iron, magnesium, potassium, zinc.';
