ALTER TABLE public.user_dietary_constraints
  ADD COLUMN IF NOT EXISTS budget_tier TEXT,
  ADD COLUMN IF NOT EXISTS food_setup TEXT,
  ADD COLUMN IF NOT EXISTS cooking_access TEXT,
  ADD COLUMN IF NOT EXISTS india_region TEXT;

ALTER TABLE public.user_dietary_constraints
  DROP CONSTRAINT IF EXISTS user_dietary_constraints_budget_tier_check;

ALTER TABLE public.user_dietary_constraints
  ADD CONSTRAINT user_dietary_constraints_budget_tier_check
  CHECK (budget_tier IS NULL OR budget_tier IN ('budget', 'standard', 'performance'));

ALTER TABLE public.user_dietary_constraints
  DROP CONSTRAINT IF EXISTS user_dietary_constraints_food_setup_check;

ALTER TABLE public.user_dietary_constraints
  ADD CONSTRAINT user_dietary_constraints_food_setup_check
  CHECK (food_setup IS NULL OR food_setup IN ('home_kitchen', 'hostel_canteen', 'mixed', 'travel_heavy'));

ALTER TABLE public.user_dietary_constraints
  DROP CONSTRAINT IF EXISTS user_dietary_constraints_cooking_access_check;

ALTER TABLE public.user_dietary_constraints
  ADD CONSTRAINT user_dietary_constraints_cooking_access_check
  CHECK (cooking_access IS NULL OR cooking_access IN ('full_kitchen', 'basic_reheat', 'minimal'));

ALTER TABLE public.user_dietary_constraints
  DROP CONSTRAINT IF EXISTS user_dietary_constraints_india_region_check;

ALTER TABLE public.user_dietary_constraints
  ADD CONSTRAINT user_dietary_constraints_india_region_check
  CHECK (india_region IS NULL OR india_region IN ('north', 'south', 'west', 'east', 'central', 'north_east'));

COMMENT ON COLUMN public.user_dietary_constraints.budget_tier IS 'Optional budget lens for India-native meal generation.';
COMMENT ON COLUMN public.user_dietary_constraints.food_setup IS 'Optional real-world setup like home kitchen, hostel or canteen, mixed, or travel-heavy.';
COMMENT ON COLUMN public.user_dietary_constraints.cooking_access IS 'Optional cooking access level for meal practicality.';
COMMENT ON COLUMN public.user_dietary_constraints.india_region IS 'Optional India region used to bias meals toward familiar staple patterns.';
