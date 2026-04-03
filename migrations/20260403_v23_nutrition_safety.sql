ALTER TABLE public.user_dietary_constraints
  ADD COLUMN IF NOT EXISTS allergy_status TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS medical_status TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS medical_conditions TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS medications TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS nutrition_safety_completed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.user_dietary_constraints
  DROP CONSTRAINT IF EXISTS user_dietary_constraints_allergy_status_check;

ALTER TABLE public.user_dietary_constraints
  ADD CONSTRAINT user_dietary_constraints_allergy_status_check
  CHECK (allergy_status IN ('unknown', 'none', 'has_allergies'));

ALTER TABLE public.user_dietary_constraints
  DROP CONSTRAINT IF EXISTS user_dietary_constraints_medical_status_check;

ALTER TABLE public.user_dietary_constraints
  ADD CONSTRAINT user_dietary_constraints_medical_status_check
  CHECK (medical_status IN ('unknown', 'none', 'has_conditions'));

UPDATE public.user_dietary_constraints
SET allergy_status = CASE
  WHEN coalesce(array_length(allergies, 1), 0) > 0 THEN 'has_allergies'
  ELSE allergy_status
END
WHERE allergy_status = 'unknown';

COMMENT ON COLUMN public.user_dietary_constraints.allergy_status IS 'Whether the user has explicitly answered allergy screening for nutrition advice.';
COMMENT ON COLUMN public.user_dietary_constraints.medical_status IS 'Whether the user has explicitly answered medical-health screening for nutrition advice.';
COMMENT ON COLUMN public.user_dietary_constraints.medical_conditions IS 'Medical conditions or illnesses the user says should be considered before nutrition advice.';
COMMENT ON COLUMN public.user_dietary_constraints.medications IS 'Regular medications that could affect fueling, hydration, or supplement safety.';
COMMENT ON COLUMN public.user_dietary_constraints.nutrition_safety_completed_at IS 'Timestamp of the last completed allergy + medical nutrition safety screening.';
