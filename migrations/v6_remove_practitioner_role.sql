-- Migration: Remove Practitioner Role and Tables

BEGIN;

-- 1. Drop Practitioner Tables
DROP TABLE IF EXISTS public.platform_practitioners CASCADE;
DROP TABLE IF EXISTS public.practitioner_profiles CASCADE;

-- 2. Cleanup existing users gracefully BEFORE enforcing new constraint
UPDATE public.profiles 
SET role = 'individual' 
WHERE role = 'practitioner';

-- 3. Update Role Constraints
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('athlete', 'coach', 'individual'));

COMMIT;
