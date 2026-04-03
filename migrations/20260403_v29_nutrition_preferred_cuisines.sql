ALTER TABLE public.user_dietary_constraints
  ADD COLUMN IF NOT EXISTS preferred_cuisines TEXT[] NOT NULL DEFAULT '{}';

UPDATE public.user_dietary_constraints
SET preferred_cuisines = CASE
  WHEN india_region = 'north' THEN ARRAY['north_indian']
  WHEN india_region = 'south' THEN ARRAY['south_indian']
  WHEN india_region = 'west' THEN ARRAY['west_indian']
  WHEN india_region = 'east' THEN ARRAY['east_indian']
  WHEN india_region = 'north_east' THEN ARRAY['north_east_indian']
  WHEN india_region = 'central' THEN ARRAY['north_indian']
  ELSE preferred_cuisines
END
WHERE coalesce(array_length(preferred_cuisines, 1), 0) = 0;

COMMENT ON COLUMN public.user_dietary_constraints.preferred_cuisines IS 'Preferred cuisine styles used to personalize practical meal recommendations (multiple allowed).';
