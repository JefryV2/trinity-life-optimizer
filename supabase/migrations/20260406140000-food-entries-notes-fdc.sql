-- Optional metadata for meal logging (MealCreator uses notes JSON; search can set fdc_id)

ALTER TABLE public.food_entries
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS fdc_id INTEGER;

COMMENT ON COLUMN public.food_entries.notes IS 'Free text or JSON extras (e.g. micronutrients from meal builder)';
COMMENT ON COLUMN public.food_entries.fdc_id IS 'USDA FoodData Central fdcId when logged from food search';
